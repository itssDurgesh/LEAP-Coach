import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { quotePrice } from "@/lib/payments/server";
import { isClerkConfigured } from "@/lib/clerk/config";
import { parseJson } from "@/lib/api/validate";
import { apiError, logError } from "@/lib/api/errors";
import { enforceRate } from "@/lib/api/rate-limit";

export const runtime = "nodejs";

const OrderSchema = z.object({
  plan: z.enum(["course", "bundle", "all"]),
  courseId: z.string().max(100).optional(),
  categories: z.array(z.enum(["student", "professional", "entrepreneur"])).max(3).optional(),
  couponCode: z.string().max(64).optional(),
});

export async function POST(req: NextRequest) {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  // Not configured → client uses its mock checkout.
  if (!keyId || !keySecret) return NextResponse.json({ fallback: true });

  // Bind the order to the signed-in user, so the webhook can grant for the right
  // person even if the browser never reaches /verify.
  let userId: string | null = null;
  if (isClerkConfigured) {
    try {
      ({ userId } = await auth());
    } catch {
      userId = null;
    }
    if (!userId) return apiError(401, "Please sign in to continue.");
  }

  // Throttle order creation per user (or per IP) to curb payment-endpoint abuse.
  const limited = enforceRate(req, "payment", userId);
  if (limited) return limited;

  const parsed = await parseJson(req, OrderSchema);
  if (!parsed.ok) return apiError(400, parsed.error);
  const body = parsed.data;

  // Authoritative pricing (base price from DB + optional coupon) — never trust the client.
  const q = await quotePrice({
    plan: body.plan,
    courseId: body.courseId,
    categories: body.categories,
    couponCode: body.couponCode,
    userId: userId ?? undefined, // enables pay-the-difference upgrade pricing
  });
  if (!q.ok) return NextResponse.json({ error: q.reason ?? "Invalid order." }, { status: 400 });
  if (q.finalAmountInr <= 0) return NextResponse.json({ error: "Amount must be greater than zero." }, { status: 400 });

  const rzpAuth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  try {
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${rzpAuth}` },
      body: JSON.stringify({
        amount: q.finalAmountInr * 100, // Razorpay expects paise
        currency: "INR",
        // Razorpay caps receipt at 40 chars; details live in `notes` (read by verify + webhook).
        receipt: `leap_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
        notes: {
          userId: userId ?? "",
          plan: body.plan,
          courseId: body.courseId ?? "",
          categories: (q.categories ?? []).join(","),
          couponCode: q.couponCode ?? "",
        },
      }),
    });
    if (!res.ok) {
      logError("payments/order", `razorpay ${res.status}: ${await res.text().catch(() => "")}`);
      return NextResponse.json({ error: "Could not create payment order." }, { status: 502 });
    }
    const order = (await res.json()) as { id: string; amount: number; currency: string };
    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
      discountPercent: q.discountPercent,
      couponCode: q.couponCode,
      baseAmountInr: q.baseAmountInr,
      finalAmountInr: q.finalAmountInr,
    });
  } catch (e) {
    logError("payments/order", e);
    return NextResponse.json({ error: "Could not create payment order." }, { status: 502 });
  }
}

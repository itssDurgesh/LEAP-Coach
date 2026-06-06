import { NextRequest, NextResponse } from "next/server";
import { quotePrice, type Plan } from "@/lib/payments/server";
import type { Role } from "@/lib/types";

export const runtime = "nodejs";

interface OrderBody {
  plan: Plan;
  courseId?: string;
  categories?: Role[];
  couponCode?: string;
}

export async function POST(req: NextRequest) {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  // Not configured → client uses its mock checkout.
  if (!keyId || !keySecret) return NextResponse.json({ fallback: true });

  let body: OrderBody;
  try {
    body = (await req.json()) as OrderBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Authoritative pricing (base price from DB + optional coupon) — never trust the client.
  const q = await quotePrice({
    plan: body.plan,
    courseId: body.courseId,
    categories: body.categories,
    couponCode: body.couponCode,
  });
  if (!q.ok) return NextResponse.json({ error: q.reason ?? "Invalid order." }, { status: 400 });
  if (q.finalAmountInr <= 0) return NextResponse.json({ error: "Amount must be greater than zero." }, { status: 400 });

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  try {
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
      body: JSON.stringify({
        amount: q.finalAmountInr * 100, // Razorpay expects paise
        currency: "INR",
        // Razorpay caps receipt at 40 chars; details live in `notes` (read by verify).
        receipt: `leap_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
        notes: {
          plan: body.plan,
          courseId: body.courseId ?? "",
          categories: (q.categories ?? []).join(","),
          couponCode: q.couponCode ?? "",
        },
      }),
    });
    if (!res.ok) {
      console.error("[razorpay] order failed", res.status, await res.text().catch(() => ""));
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
    console.error("[razorpay] order request error", e);
    return NextResponse.json({ error: "Could not create payment order." }, { status: 502 });
  }
}

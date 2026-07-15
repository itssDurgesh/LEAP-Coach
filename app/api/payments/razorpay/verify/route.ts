import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { processPayment } from "@/lib/payments/grant";
import { parseJson } from "@/lib/api/validate";
import { logError } from "@/lib/api/errors";
import { enforceRate } from "@/lib/api/rate-limit";

export const runtime = "nodejs";

const VerifySchema = z.object({
  razorpay_order_id: z.string().min(1).max(100),
  razorpay_payment_id: z.string().min(1).max(100),
  razorpay_signature: z.string().min(1).max(256),
});

export async function POST(req: NextRequest) {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return NextResponse.json({ ok: false, fallback: true });

  // Throttle to curb abuse of the signature-verify + Razorpay-fetch path.
  const limited = enforceRate(req, "payment", null, { ok: false });
  if (limited) return limited;

  const parsed = await parseJson(req, VerifySchema);
  if (!parsed.ok) return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

  // 1) Verify the Razorpay signature: HMAC-SHA256(order_id|payment_id, key_secret).
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");
  const ea = Buffer.from(expected);
  const sa = Buffer.from(razorpay_signature);
  if (ea.length !== sa.length || !crypto.timingSafeEqual(ea, sa)) {
    return NextResponse.json({ ok: false, error: "Signature mismatch." }, { status: 400 });
  }

  // 2) Identify the authenticated user from their Clerk session (cookie supplied
  //    by clerkMiddleware). The Clerk user id is the profiles primary key.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) {
    return NextResponse.json({ ok: false, error: "Server not configured." }, { status: 500 });
  }
  let userId: string | null = null;
  try {
    ({ userId } = await auth());
  } catch {
    return NextResponse.json({ ok: false, error: "Auth not configured." }, { status: 500 });
  }
  if (!userId) return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });

  // 3) Confirm with Razorpay that the payment is real, captured/authorized, and matches the order.
  const rzpAuth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  let plan: string | undefined;
  let courseId: string | undefined;
  let categories: string[] = [];
  let couponCode: string | undefined;
  let amountInr = 0;
  try {
    const [orderRes, payRes] = await Promise.all([
      fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
        headers: { Authorization: `Basic ${rzpAuth}` },
        cache: "no-store",
      }),
      fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
        headers: { Authorization: `Basic ${rzpAuth}` },
        cache: "no-store",
      }),
    ]);
    if (!orderRes.ok || !payRes.ok) return NextResponse.json({ ok: false, error: "Could not confirm payment." }, { status: 502 });
    const order = (await orderRes.json()) as {
      amount: number;
      notes?: { plan?: string; courseId?: string; categories?: string; couponCode?: string };
    };
    const payment = (await payRes.json()) as { order_id: string; status: string; amount: number };

    const valid =
      payment.order_id === razorpay_order_id &&
      payment.amount === order.amount &&
      (payment.status === "captured" || payment.status === "authorized");
    if (!valid) return NextResponse.json({ ok: false, error: "Payment not completed." }, { status: 400 });

    // The plan/courseId/categories/coupon come from the server-created order's notes — not the client.
    plan = order.notes?.plan;
    courseId = order.notes?.courseId || undefined;
    categories = (order.notes?.categories || "").split(",").filter(Boolean);
    couponCode = order.notes?.couponCode || undefined;
    amountInr = Math.round((order.amount ?? 0) / 100);
  } catch (e) {
    logError("payments/verify", e);
    return NextResponse.json({ ok: false, error: "Could not confirm payment." }, { status: 502 });
  }

  // 4) Record the receipt + fulfil the purchase, idempotently (shared with the webhook).
  const admin = createClient(url, service, { auth: { persistSession: false } });
  try {
    const result = await processPayment(admin, {
      userId,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      amountInr,
      plan,
      courseId,
      categories,
      couponCode,
      source: "verify",
    });
    // A captured payment whose grant failed is NOT lost — it's recorded with
    // grant_status='grant_failed' and flagged for admin. Surface the receipt + the
    // grant outcome so the client shows the right message (don't fake access).
    return NextResponse.json({
      ok: true,
      granted: result.grantStatus === "granted",
      grantStatus: result.grantStatus,
      paymentId: result.paymentId,
      amountInr: result.amountInr,
      plan,
      courseId,
    });
  } catch (e) {
    logError("payments/verify", e);
    // Captured at Razorpay but we couldn't record it — the webhook will reconcile.
    return NextResponse.json({
      ok: true,
      granted: false,
      grantStatus: "pending",
      paymentId: null,
      amountInr,
      plan,
      courseId,
    });
  }
}

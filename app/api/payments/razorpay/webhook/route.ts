import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { processPayment } from "@/lib/payments/grant";

export const runtime = "nodejs";

// Server-to-server safety net. Razorpay calls this on every payment.captured /
// order.paid, INDEPENDENT of the browser — so a payment is recorded + granted even
// if the user closed the tab before /verify ran. Idempotent via razorpay_payment_id.
export async function POST(req: NextRequest) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Read the RAW body (signature is computed over the exact bytes Razorpay sent).
  const raw = await req.text();

  if (!secret || !keyId || !keySecret || !url || !service) {
    console.error("[razorpay webhook] not configured");
    return NextResponse.json({ ignored: true }, { status: 200 });
  }

  // 1) Verify the webhook signature: HMAC-SHA256(rawBody, webhook_secret).
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const ea = Buffer.from(expected);
  const sa = Buffer.from(signature);
  if (ea.length !== sa.length || !crypto.timingSafeEqual(ea, sa)) {
    return NextResponse.json({ ok: false, error: "Invalid signature." }, { status: 400 });
  }

  let event: {
    event?: string;
    payload?: { payment?: { entity?: { id?: string; order_id?: string; amount?: number; status?: string } } };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "Bad payload." }, { status: 400 });
  }

  const payment = event?.payload?.payment?.entity;
  // Only act on a real captured payment; acknowledge everything else so Razorpay
  // doesn't retry events we don't handle.
  if (!payment?.id || !payment.order_id || payment.status !== "captured") {
    return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
  }

  try {
    // The authoritative plan/user live in the ORDER notes (set server-side at creation).
    const rzpAuth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${payment.order_id}`, {
      headers: { Authorization: `Basic ${rzpAuth}` },
      cache: "no-store",
    });
    if (!orderRes.ok) throw new Error(`order fetch ${orderRes.status}`);
    const order = (await orderRes.json()) as {
      notes?: { userId?: string; plan?: string; courseId?: string; categories?: string; couponCode?: string };
    };
    const notes = order.notes ?? {};
    const userId = notes.userId;
    // No user attribution → can't grant. Acknowledge (verify path / manual recon handles it).
    if (!userId) return NextResponse.json({ ok: true, unattributed: true }, { status: 200 });

    const admin = createClient(url, service, { auth: { persistSession: false } });
    await processPayment(admin, {
      userId,
      razorpayOrderId: payment.order_id,
      razorpayPaymentId: payment.id,
      amountInr: Math.round((payment.amount ?? 0) / 100),
      plan: notes.plan,
      courseId: notes.courseId || undefined,
      categories: (notes.categories || "").split(",").filter(Boolean),
      couponCode: notes.couponCode || undefined,
      source: "webhook",
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[razorpay webhook] process error", e);
    // 500 → Razorpay retries; processPayment is idempotent, so retries are safe.
    return NextResponse.json({ ok: false, error: "Processing error." }, { status: 500 });
  }
}

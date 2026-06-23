import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// Owner-only manual refund. Issuing a refund moves money, so it requires the owner
// (admin with no scoped permissions), is confirmed in the UI, and is idempotent
// (a payment already 'refunded' is a no-op).
export async function POST(req: NextRequest) {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!keyId || !keySecret || !url || !service)
    return NextResponse.json({ ok: false, error: "Server not configured." }, { status: 500 });

  let userId: string | null = null;
  try {
    ({ userId } = await auth());
  } catch {
    userId = null;
  }
  if (!userId) return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });

  let body: { paymentId?: string };
  try {
    body = (await req.json()) as { paymentId?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }
  if (!body.paymentId) return NextResponse.json({ ok: false, error: "Missing payment id." }, { status: 400 });

  const admin = createClient(url, service, { auth: { persistSession: false } });

  // Owner = admin with no scoped permissions.
  const { data: me } = await admin.from("profiles").select("is_admin, permissions").eq("id", userId).maybeSingle();
  const isOwner = !!me?.is_admin && (me.permissions === null || me.permissions === undefined);
  if (!isOwner) return NextResponse.json({ ok: false, error: "Owner access required." }, { status: 403 });

  const { data: pay } = await admin.from("payments").select("*").eq("id", body.paymentId).maybeSingle();
  if (!pay) return NextResponse.json({ ok: false, error: "Payment not found." }, { status: 404 });
  if (pay.status === "refunded") return NextResponse.json({ ok: true, alreadyRefunded: true });
  if (!pay.razorpay_payment_id)
    return NextResponse.json({ ok: false, error: "No Razorpay payment to refund." }, { status: 400 });

  try {
    const rzpAuth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const res = await fetch(`https://api.razorpay.com/v1/payments/${pay.razorpay_payment_id}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${rzpAuth}` },
      body: JSON.stringify({}), // full refund
    });
    if (!res.ok) {
      console.error("[razorpay refund] failed", res.status, await res.text().catch(() => ""));
      return NextResponse.json({ ok: false, error: "Refund failed at Razorpay." }, { status: 502 });
    }
  } catch (e) {
    console.error("[razorpay refund] error", e);
    return NextResponse.json({ ok: false, error: "Refund request failed." }, { status: 502 });
  }

  await admin
    .from("payments")
    .update({ status: "refunded", refunded_at: new Date().toISOString() })
    .eq("id", body.paymentId);
  return NextResponse.json({ ok: true });
}

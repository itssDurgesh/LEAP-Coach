import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { parseJson } from "@/lib/api/validate";
import { logError } from "@/lib/api/errors";
import { enforceRate } from "@/lib/api/rate-limit";

export const runtime = "nodejs";

const PaymentIdSchema = z.object({ paymentId: z.string().min(1).max(100) });

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

  const limited = enforceRate(req, "admin", userId, { ok: false });
  if (limited) return limited;

  const parsed = await parseJson(req, PaymentIdSchema);
  if (!parsed.ok) return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  const body = parsed.data;

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
      logError("payments/refund", `razorpay ${res.status}: ${await res.text().catch(() => "")}`);
      return NextResponse.json({ ok: false, error: "Refund failed at Razorpay." }, { status: 502 });
    }
  } catch (e) {
    logError("payments/refund", e);
    return NextResponse.json({ ok: false, error: "Refund request failed." }, { status: 502 });
  }

  await admin
    .from("payments")
    .update({ status: "refunded", refunded_at: new Date().toISOString() })
    .eq("id", body.paymentId);
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { grantAccess } from "@/lib/payments/grant";
import { notifyPaymentGranted } from "@/lib/payments/notify";
import { parseJson } from "@/lib/api/validate";
import { enforceRate } from "@/lib/api/rate-limit";

export const runtime = "nodejs";

const PaymentIdSchema = z.object({ paymentId: z.string().min(1).max(100) });

// Admin resolution for a flagged (grant_failed) payment: re-run the grant so the
// buyer gets what they paid for. Any admin (owner or sub-admin) may do this — it only
// grants already-paid-for access, it doesn't move money.
export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) return NextResponse.json({ ok: false, error: "Server not configured." }, { status: 500 });

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

  // The owner, or a sub-admin holding the "payments" permission (the screen this
  // button is on). It used to accept any admin, whatever their permissions.
  const { data: me } = await admin.from("profiles").select("is_admin, permissions").eq("id", userId).maybeSingle();
  const allowed = !!me?.is_admin && (me.permissions == null || (me.permissions as string[]).includes("payments"));
  if (!allowed) return NextResponse.json({ ok: false, error: "Payments access required." }, { status: 403 });

  const { data: pay } = await admin.from("payments").select("*").eq("id", body.paymentId).maybeSingle();
  if (!pay) return NextResponse.json({ ok: false, error: "Payment not found." }, { status: 404 });
  if (!pay.user_id) return NextResponse.json({ ok: false, error: "Payment has no user." }, { status: 400 });

  const g = await grantAccess(admin, pay.user_id as string, {
    plan: (pay.plan as string) ?? undefined,
    courseId: (pay.course_id as string) ?? undefined,
    categories: (pay.categories as string[]) ?? [],
  });
  await admin
    .from("payments")
    .update({ grant_status: g.ok ? "granted" : "grant_failed" })
    .eq("id", body.paymentId);

  // The buyer finally has what they paid for — send their receipt now (it wasn't
  // sent when the grant originally failed). No-throw, best-effort, skips demo rows.
  const isDemo = !!(pay.notes as Record<string, unknown> | null)?.demo;
  if (g.ok && pay.grant_status !== "granted" && !isDemo) {
    await notifyPaymentGranted(admin, {
      userId: pay.user_id as string,
      paymentId: pay.id as string,
      amountInr: (pay.amount_inr as number) ?? 0,
      plan: (pay.plan as string) ?? undefined,
      courseId: (pay.course_id as string) ?? undefined,
      categories: (pay.categories as string[]) ?? [],
    });
  }

  return NextResponse.json({ ok: g.ok, grantStatus: g.ok ? "granted" : "grant_failed", error: g.error });
}

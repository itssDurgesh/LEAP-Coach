import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { grantAccess } from "@/lib/payments/grant";

export const runtime = "nodejs";

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

  let body: { paymentId?: string };
  try {
    body = (await req.json()) as { paymentId?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }
  if (!body.paymentId) return NextResponse.json({ ok: false, error: "Missing payment id." }, { status: 400 });

  const admin = createClient(url, service, { auth: { persistSession: false } });

  const { data: me } = await admin.from("profiles").select("is_admin").eq("id", userId).maybeSingle();
  if (!me?.is_admin) return NextResponse.json({ ok: false, error: "Admin access required." }, { status: 403 });

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
  return NextResponse.json({ ok: g.ok, grantStatus: g.ok ? "granted" : "grant_failed", error: g.error });
}

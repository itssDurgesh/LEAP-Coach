import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { quotePrice } from "@/lib/payments/server";
import { processPayment } from "@/lib/payments/grant";
import { isClerkConfigured } from "@/lib/clerk/config";
import { parseJson } from "@/lib/api/validate";
import { logError } from "@/lib/api/errors";
import { enforceRate } from "@/lib/api/rate-limit";

export const runtime = "nodejs";

// ─────────────────────────────────────────────────────────────────────────────
// Demo / dev grant — persists a purchase WITHOUT a real Razorpay charge, via the
// service role (so it survives a refresh; client writes are blocked by RLS by design).
//
// SAFETY: allowed ONLY when Razorpay is NOT in LIVE mode — i.e. no key configured, or
// a test key (rzp_test_…). With live keys this route refuses (403), so it can never be
// used to self-grant paid access in production. Used by the checkout's mock fallback.
// ─────────────────────────────────────────────────────────────────────────────
function demoAllowed(): boolean {
  const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
  return key === "" || key.startsWith("rzp_test");
}

const GrantSchema = z.object({
  plan: z.enum(["course", "bundle", "all"]),
  courseId: z.string().max(100).optional(),
  categories: z.array(z.enum(["student", "professional", "entrepreneur"])).max(3).optional(),
  couponCode: z.string().max(64).optional(),
});

export async function POST(req: NextRequest) {
  if (!demoAllowed()) {
    return NextResponse.json({ ok: false, error: "Demo grants are disabled in live mode." }, { status: 403 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) {
    // No Supabase (pure local mock) → tell the client to grant locally instead.
    return NextResponse.json({ ok: false, fallback: true });
  }

  let userId: string | null = null;
  if (isClerkConfigured) {
    try {
      ({ userId } = await auth());
    } catch {
      userId = null;
    }
  }
  if (!userId) return NextResponse.json({ ok: false, error: "Please sign in to continue." }, { status: 401 });

  // Throttle per user to prevent scripted self-grant hammering (test-mode only anyway).
  const limited = enforceRate(req, "payment", userId, { ok: false });
  if (limited) return limited;

  const parsed = await parseJson(req, GrantSchema);
  if (!parsed.ok) return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  const body = parsed.data;

  // Price + validate exactly like a real order (DB price, pay-the-difference, coupon).
  const q = await quotePrice({
    plan: body.plan,
    courseId: body.courseId,
    categories: body.categories,
    couponCode: body.couponCode,
    userId,
  });
  if (!q.ok) return NextResponse.json({ ok: false, error: q.reason ?? "Invalid order." }, { status: 400 });

  const admin = createClient(url, service, { auth: { persistSession: false } });
  try {
    const r = await processPayment(admin, {
      userId,
      razorpayOrderId: `demo_${Date.now().toString(36)}`,
      razorpayPaymentId: `demo_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
      amountInr: q.finalAmountInr,
      plan: body.plan,
      courseId: body.courseId,
      categories: q.categories ?? [],
      couponCode: q.couponCode,
      source: "verify",
      notes: { demo: true },
    });
    return NextResponse.json({ ok: true, granted: r.grantStatus === "granted", grantStatus: r.grantStatus });
  } catch (e) {
    logError("payments/demo-grant", e);
    return NextResponse.json({ ok: false, error: "Could not grant access." }, { status: 500 });
  }
}

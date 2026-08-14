import "server-only"; // payment fulfilment — service-role only, never client
import type { SupabaseClient } from "@supabase/supabase-js";
import { incrementCouponRedemption } from "./server";
import { notifyGrantFailed, notifyPaymentGranted } from "./notify";
import { ACCESS_DURATION_DAYS } from "@/lib/access";

// Shared, idempotent payment fulfilment used by BOTH the browser-driven /verify
// route and the server-to-server Razorpay webhook, so neither can double-grant and
// a payment is never silently lost.

const CATS = ["student", "professional", "entrepreneur"] as const;
const ACCESS_MS = ACCESS_DURATION_DAYS * 86_400_000;

export interface GrantInput {
  plan?: string; // 'course' | 'bundle' | 'all'
  courseId?: string;
  categories?: string[];
}

/** Generate our receipt id, e.g. rcpt_lt3k9f2a. */
function receiptId(): string {
  return `rcpt_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/** Grant the purchased access. Idempotent (all upserts). Does NOT touch payments/coupons. */
export async function grantAccess(
  admin: SupabaseClient,
  userId: string,
  input: GrantInput,
): Promise<{ ok: boolean; error?: string }> {
  const { plan, courseId } = input;
  const categories = (input.categories ?? []).filter((c) => (CATS as readonly string[]).includes(c));
  const now = new Date().toISOString();

  const setAllAccess = async () => {
    const validUntil = new Date();
    validUntil.setFullYear(validUntil.getFullYear() + 1);
    await admin
      .from("profiles")
      .update({ subscription_plan: "all_access", subscription_valid_until: validUntil.toISOString() })
      .eq("id", userId);
  };

  // Grant/refresh a catalog pass, stamping granted_at=now so a re-purchase of an
  // expired catalog restarts its 1-year window (the DB default only fires on insert).
  const grantPasses = (cats: readonly string[]) =>
    admin.from("category_passes").upsert(
      cats.map((c) => ({ user_id: userId, category: c, granted_at: now })),
      { onConflict: "user_id,category" },
    );

  try {
    if (plan === "all") {
      await grantPasses(CATS);
      await setAllAccess();
      if (courseId)
        await admin
          .from("enrollments")
          .upsert({ user_id: userId, course_id: courseId, enrolled_at: now }, { onConflict: "user_id,course_id" });
    } else if (plan === "bundle") {
      if (!categories.length) return { ok: false, error: "Nothing to grant." };
      await grantPasses(categories);
      // Promote to all-access only when all THREE catalogs are currently active
      // (an expired pass mustn't grant blanket access — the learner must re-buy it).
      const { data: owned } = await admin
        .from("category_passes")
        .select("category, granted_at")
        .eq("user_id", userId);
      const cutoff = Date.now() - ACCESS_MS;
      const active = new Set(
        (owned ?? [])
          .filter((r) => !r.granted_at || Date.parse(r.granted_at as string) >= cutoff)
          .map((r) => r.category as string),
      );
      if (CATS.every((c) => active.has(c))) await setAllAccess();
    } else if (courseId) {
      // Stamp purchased_at=now so re-buying an expired topic restarts its 1-year window.
      await admin
        .from("course_purchases")
        .upsert({ user_id: userId, course_id: courseId, purchased_at: now }, { onConflict: "user_id,course_id" });
      await admin
        .from("enrollments")
        .upsert({ user_id: userId, course_id: courseId, enrolled_at: now }, { onConflict: "user_id,course_id" });
    } else {
      return { ok: false, error: "Nothing to grant." };
    }
    return { ok: true };
  } catch (e) {
    console.error("[grant] error", e);
    return { ok: false, error: "Could not grant access." };
  }
}

export interface ProcessInput extends GrantInput {
  userId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amountInr: number;
  couponCode?: string;
  source: "verify" | "webhook";
  notes?: Record<string, unknown>;
}

export interface ProcessResult {
  ok: boolean;
  paymentId: string;
  grantStatus: "granted" | "grant_failed" | "pending";
  amountInr: number;
  error?: string;
}

/**
 * Record a captured payment + fulfil it, idempotently. Safe to call from both /verify
 * and the webhook (and on webhook retries): the unique razorpay_payment_id means the
 * payment is recorded once; if it's already granted we no-op. A failed grant is stored
 * as grant_status='grant_failed' (flagged for admin) — the payment is never lost.
 */
export async function processPayment(admin: SupabaseClient, input: ProcessInput): Promise<ProcessResult> {
  const {
    userId, razorpayOrderId, razorpayPaymentId, amountInr, plan, courseId,
    categories = [], couponCode, source, notes = {},
  } = input;

  // 1) Record (idempotent on razorpay_payment_id). ignoreDuplicates → [] if it existed.
  const newId = receiptId();
  const { data: inserted } = await admin
    .from("payments")
    .upsert(
      {
        id: newId,
        user_id: userId,
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        plan: plan ?? null,
        course_id: courseId || null,
        categories,
        coupon_code: couponCode || null,
        amount_inr: amountInr,
        currency: "INR",
        status: "captured",
        grant_status: "pending",
        source,
        notes,
      },
      { onConflict: "razorpay_payment_id", ignoreDuplicates: true },
    )
    .select("id, grant_status");

  let paymentId: string;
  let existed: boolean;
  let grantStatus: ProcessResult["grantStatus"];
  if (inserted && inserted.length) {
    paymentId = inserted[0].id as string;
    grantStatus = (inserted[0].grant_status as ProcessResult["grantStatus"]) ?? "pending";
    existed = false;
  } else {
    const { data: existing } = await admin
      .from("payments")
      .select("id, grant_status")
      .eq("razorpay_payment_id", razorpayPaymentId)
      .maybeSingle();
    paymentId = (existing?.id as string) ?? newId;
    grantStatus = (existing?.grant_status as ProcessResult["grantStatus"]) ?? "pending";
    existed = true;
  }

  // Already fully processed (e.g. verify + webhook both fired) → idempotent success.
  if (existed && grantStatus === "granted") {
    return { ok: true, paymentId, grantStatus: "granted", amountInr };
  }

  // 2) Grant access, then record the outcome.
  const g = await grantAccess(admin, userId, { plan, courseId, categories });
  const finalStatus: ProcessResult["grantStatus"] = g.ok ? "granted" : "grant_failed";
  await admin.from("payments").update({ grant_status: finalStatus }).eq("id", paymentId);

  // 3) Count the coupon once, only on the first successful fulfilment.
  if (g.ok && !existed && couponCode) {
    await incrementCouponRedemption(admin, couponCode);
  }

  // 4) Best-effort emails (they never fail or slow-fail the payment; both no-throw):
  //    a receipt to the buyer on the FIRST successful grant, an owner alert when a
  //    payment NEWLY lands in grant_failed (webhook retries won't re-alert). Demo
  //    grants (no real charge) stay silent.
  if (!notes.demo) {
    const emailInput = { userId, paymentId, amountInr, plan, courseId, categories };
    if (finalStatus === "granted") await notifyPaymentGranted(admin, emailInput);
    else if (grantStatus !== "grant_failed") await notifyGrantFailed(admin, emailInput);
  }

  return { ok: g.ok, paymentId, grantStatus: finalStatus, amountInr, error: g.error };
}

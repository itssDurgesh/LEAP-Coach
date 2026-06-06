import { Coupon, Role } from "@/lib/types";

// What a coupon is being applied to at checkout.
export type CouponTarget =
  | { type: "course"; category: Role }
  | { type: "bundle"; categories: Role[] } // a category pass of 1–3 categories
  | { type: "all" }; // the top all-access plan (= all 3 categories)

export interface CouponCheck {
  ok: boolean;
  reason?: string;
}

/** Structural validity: active, not expired, redemptions remaining. */
export function couponValid(c: Coupon, now: number = Date.now()): CouponCheck {
  if (!c.active) return { ok: false, reason: "This coupon is no longer active." };
  if (c.expiresAt && Date.parse(c.expiresAt) < now) return { ok: false, reason: "This coupon has expired." };
  if (c.maxRedemptions != null && c.redemptions >= c.maxRedemptions)
    return { ok: false, reason: "This coupon has reached its redemption limit." };
  return { ok: true };
}

/** Eligibility for the thing being purchased. */
export function couponApplies(c: Coupon, target: CouponTarget): boolean {
  if (c.category === "all") return true; // all-categories coupon → everything incl. max plan
  if (target.type === "course") return target.category === c.category;
  // A category-scoped coupon only applies to a single-category pass for that category.
  if (target.type === "bundle") return target.categories.length === 1 && target.categories[0] === c.category;
  return false; // category-scoped coupon can't apply to the all-access plan
}

/** Full check (validity + eligibility). */
export function evaluateCoupon(c: Coupon, target: CouponTarget, now: number = Date.now()): CouponCheck {
  const v = couponValid(c, now);
  if (!v.ok) return v;
  if (!couponApplies(c, target)) return { ok: false, reason: "This coupon isn't valid for this purchase." };
  return { ok: true };
}

/** Apply a percentage discount to an INR amount (rounded to whole rupees, never below 0). */
export function applyDiscount(amountInr: number, discountPercent: number): number {
  const pct = Math.max(0, Math.min(100, discountPercent));
  return Math.max(0, Math.round(amountInr * (1 - pct / 100)));
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

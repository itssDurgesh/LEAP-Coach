"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Crown, BookOpen, ShieldCheck, Smartphone, CreditCard, Ticket, X, Layers, ClipboardList, ArrowRight } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Course, Role, ROLES, bundlePrice, upgradePrice, isProfileComplete, missingProfileFields } from "@/lib/types";
import { activeCategoryCount } from "@/lib/access";
import { useApp } from "@/lib/store/AppProvider";
import { cn, formatINR } from "@/lib/utils";
import { ALL_ACCESS_PRICE, RAZORPAY_KEY_ID } from "@/lib/payments/config";

export { ALL_ACCESS_PRICE };

const RAZORPAY_LIVE = !!RAZORPAY_KEY_ID;
const RAZORPAY_TEST = RAZORPAY_KEY_ID.startsWith("rzp_test");

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (e: string, cb: () => void) => void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

interface CheckoutModalProps {
  course?: Course;
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
  /** force the all-access plan (used by the pricing page) */
  forcePlan?: "course" | "all";
  /** category-pass mode: the selected categories to buy (1–3) */
  bundleCategories?: Role[];
}

export function CheckoutModal({ course, open, onClose, onComplete, forcePlan, bundleCategories }: CheckoutModalProps) {
  const { currentUser, purchaseCourse, subscribeAllAccess, enrollFree, purchaseBundle, pricing } = useApp();
  const profileComplete = isProfileComplete(currentUser);
  // Pay-the-difference credits only ACTIVE catalogs (an expired one is charged again),
  // mirroring the authoritative server price in lib/payments/server.ts.
  const ownedCount = activeCategoryCount(currentUser);
  const isBundle = !!bundleCategories && bundleCategories.length > 0;
  const [plan, setPlan] = React.useState<"course" | "all">(forcePlan ?? "course");
  const [status, setStatus] = React.useState<"idle" | "processing" | "done">("idle");
  // What the "done" screen says:
  //  success     — verified + access granted.
  //  finalizing  — payment captured, receipt saved, grant pending/failed (admin flagged).
  //  unconfirmed — Razorpay reported success but our verify didn't confirm; the charge
  //                almost certainly exists, so we must NOT offer an instant re-pay —
  //                the webhook reconciles it. Honest copy, no fake access.
  const [outcome, setOutcome] = React.useState<"success" | "finalizing" | "unconfirmed">("success");
  const [couponInput, setCouponInput] = React.useState("");
  const [applying, setApplying] = React.useState(false);
  const [couponError, setCouponError] = React.useState("");
  const [applied, setApplied] = React.useState<{ code: string; discountPercent: number; finalAmountInr: number } | null>(null);

  React.useEffect(() => {
    if (open) {
      setStatus("idle");
      setOutcome("success");
      setPlan(forcePlan ?? (course ? "course" : "all"));
      setCouponInput("");
      setApplied(null);
      setCouponError("");
    }
  }, [open, forcePlan, course]);

  // A coupon's eligibility depends on the selected plan/topic, so clear it on change.
  React.useEffect(() => {
    setApplied(null);
    setCouponError("");
  }, [plan, course?.id, (bundleCategories ?? []).join(",")]);

  async function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setApplying(true);
    setCouponError("");
    try {
      const res = await fetch("/api/payments/coupon/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          plan: isBundle ? "bundle" : plan,
          courseId: course?.id,
          categories: isBundle ? bundleCategories : undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setApplied({ code: data.code, discountPercent: data.discountPercent, finalAmountInr: data.finalAmountInr });
      } else {
        setApplied(null);
        setCouponError(data.error ?? "Invalid coupon code.");
      }
    } catch {
      setCouponError("Couldn't validate the coupon. Try again.");
    }
    setApplying(false);
  }

  // Update access state. `serverGranted` = the verify route already persisted it
  // server-side (after a real, verified payment), so skip the client Supabase write.
  function grantAccess(serverGranted = false) {
    if (isBundle) {
      purchaseBundle(bundleCategories!, serverGranted);
    } else if (plan === "all") {
      subscribeAllAccess(serverGranted);
      if (course) enrollFree(course.id);
    } else if (course) {
      purchaseCourse(course.id, serverGranted);
    }
    setOutcome("success");
    setStatus("done");
    setTimeout(() => {
      onComplete?.();
      onClose();
    }, 1300);
  }

  // Fallback when Razorpay can't run (no keys, or the order/script failed). In real mode
  // a browser grant can't persist (the purchase tables are server-write-only under RLS),
  // so persist it through the demo-grant server route (service role, test/dev only). When
  // there's no server (pure local mock) we grant locally and localStorage keeps it.
  async function mockPay() {
    try {
      const res = await fetch("/api/payments/demo-grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: isBundle ? "bundle" : plan,
          courseId: course?.id,
          categories: isBundle ? bundleCategories : undefined,
          couponCode: applied?.code,
        }),
      });
      const r = await res.json().catch(() => null);
      if (r?.ok && r.granted) {
        grantAccess(true); // persisted server-side → just sync local state
        return;
      }
      if (r?.ok) {
        // Recorded but grant pending/failed — flagged for admin; don't fake access.
        setOutcome("finalizing");
        setStatus("done");
        setTimeout(() => {
          onComplete?.();
          onClose();
        }, 2800);
        return;
      }
      // No server (pure mock) or route refused (live mode) → local-only grant.
      grantAccess(false);
    } catch {
      grantAccess(false);
    }
  }

  async function pay() {
    if (!profileComplete) return; // gate below blocks this, but guard anyway
    setStatus("processing");

    if (!RAZORPAY_LIVE) return mockPay();

    // 1) Create a real order server-side (amount is authoritative there).
    let order: { orderId?: string; amount?: number; currency?: string; keyId?: string; fallback?: boolean } | null;
    try {
      const res = await fetch("/api/payments/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: isBundle ? "bundle" : plan,
          courseId: course?.id,
          categories: isBundle ? bundleCategories : undefined,
          couponCode: applied?.code,
        }),
      });
      order = await res.json();
    } catch {
      order = null;
    }
    if (!order || order.fallback || !order.orderId) return mockPay();

    const ready = await loadRazorpayScript();
    if (!ready || !window.Razorpay) return mockPay();

    // 2) Open Razorpay Checkout; 3) verify the signature server-side before granting.
    const rzp = new window.Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: "LEAP Coach",
      description: isBundle
        ? `${bundleCategories!.length}-category pass`
        : plan === "all"
          ? "All-Access Pass"
          : course?.title,
      theme: { color: "#E0B43C" },
      handler: async (resp: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        try {
          // The Clerk session cookie rides along automatically (same-origin); the
          // server verifies the signature, identifies the buyer, and grants access.
          const v = await fetch("/api/payments/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(resp),
          });
          const vr = await v.json();
          if (vr.ok && vr.granted) {
            // Verified + access granted server-side.
            grantAccess(true);
          } else if (vr.ok) {
            // Payment captured but the grant didn't complete — it's recorded and
            // flagged for admin (and the webhook will retry). Don't fake access.
            setOutcome("finalizing");
            setStatus("done");
            setTimeout(() => {
              onComplete?.();
              onClose();
            }, 3200);
          } else {
            // Razorpay's checkout reported success but verify couldn't confirm it —
            // the charge almost certainly exists, so DON'T return to a live Pay
            // button (that's how double-charges happen). The webhook reconciles.
            setOutcome("unconfirmed");
            setStatus("done");
            setTimeout(() => {
              onComplete?.();
              onClose();
            }, 5000);
          }
        } catch {
          // Network died between the charge and our confirmation — same rule: the
          // money likely moved, so surface "being confirmed", never an instant re-pay.
          setOutcome("unconfirmed");
          setStatus("done");
          setTimeout(() => {
            onComplete?.();
            onClose();
          }, 5000);
        }
      },
      modal: { ondismiss: () => setStatus("idle") },
    } as Record<string, unknown>);
    rzp.on("payment.failed", () => setStatus("idle"));
    rzp.open();
  }

  // Pay-the-difference: bundle/all upgrades only charge for what the buyer doesn't own yet.
  const baseAmount = isBundle
    ? upgradePrice(pricing, ownedCount, bundleCategories!.length)
    : plan === "all"
      ? upgradePrice(pricing, ownedCount, Math.max(1, 3 - ownedCount))
      : course?.price ?? 0;
  const amount = applied ? applied.finalAmountInr : baseAmount;
  // Free topics need no coupon entry.
  const showCoupon = RAZORPAY_LIVE && !(!isBundle && plan === "course" && baseAmount === 0);

  return (
    <Modal open={open} onClose={onClose} title="Complete your enrollment">
      <div className="p-6">
        {!profileComplete ? (
          <div className="py-6 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gold-100 text-gold-600">
              <ClipboardList className="h-8 w-8" />
            </div>
            <p className="mt-4 font-heading text-xl font-bold leading-tight text-heading">Complete your profile first</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
              Please add a few details before your first purchase, so we can issue a valid receipt and personalise your coaching.
            </p>
            <ul className="mt-3 flex flex-wrap justify-center gap-1.5">
              {missingProfileFields(currentUser).map((m) => (
                <li key={m} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-heading">
                  {m}
                </li>
              ))}
            </ul>
            <Link href="/account" onClick={onClose} className={buttonClasses({ variant: "primary", size: "md", className: "mt-5" })}>
              Complete profile <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : status === "done" ? (
          outcome === "finalizing" ? (
            <div className="py-8 text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-amber-100 text-amber-600">
                <ShieldCheck className="h-8 w-8" strokeWidth={2.5} />
              </div>
              <p className="mt-4 font-heading text-xl font-bold leading-tight text-heading">Payment received</p>
              <p className="mx-auto mt-1 max-w-xs text-sm text-muted">
                We&apos;re finalizing your access. If it doesn&apos;t appear in a moment, our team has
                been notified — your receipt is saved under Account. You won&apos;t be charged twice.
              </p>
            </div>
          ) : outcome === "unconfirmed" ? (
            <div className="py-8 text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-amber-100 text-amber-600">
                <ShieldCheck className="h-8 w-8" strokeWidth={2.5} />
              </div>
              <p className="mt-4 font-heading text-xl font-bold leading-tight text-heading">Payment being confirmed</p>
              <p className="mx-auto mt-1 max-w-xs text-sm text-muted">
                Razorpay accepted your payment, but we couldn&apos;t confirm it just yet. Your access
                and receipt will appear automatically within a few minutes — please don&apos;t pay
                again. You won&apos;t be charged twice.
              </p>
            </div>
          ) : (
            <div className="py-8 text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green-100 text-green-600">
                <Check className="h-8 w-8" strokeWidth={3} />
              </div>
              <p className="mt-4 font-heading text-xl font-bold leading-tight text-heading">Payment successful!</p>
              <p className="mt-1 text-sm text-muted">You now have access. Your receipt is saved under Account.</p>
            </div>
          )
        ) : (
          <>
            <div className="space-y-3">
              {isBundle ? (
                <div className="flex items-start gap-3.5 rounded-3xl border-2 border-gold-400 bg-gold-50 p-5 dark:bg-gold-500/10">
                  <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold-100 text-gold-600">
                    <Layers className="h-5 w-5" />
                  </span>
                  <span className="flex-1">
                    <span className="flex items-center justify-between">
                      <span className="font-heading font-semibold text-heading">
                        {bundleCategories!.length === 3
                          ? "All-Access (all 3 categories)"
                          : `${bundleCategories!.length}-category pass`}
                      </span>
                      <span className="font-heading font-bold text-heading">{formatINR(baseAmount)}</span>
                    </span>
                    <span className="mt-1.5 flex flex-wrap gap-1.5">
                      {bundleCategories!.map((c) => (
                        <span key={c} className="rounded-full bg-card px-2 py-0.5 text-xs font-medium text-heading ring-1 ring-hair">
                          {ROLES.find((r) => r.id === c)?.label ?? c}
                        </span>
                      ))}
                    </span>
                    <span className="mt-1.5 block text-sm text-muted">
                      Unlock every topic in {bundleCategories!.length === 1 ? "this category" : "these categories"}.
                    </span>
                  </span>
                </div>
              ) : (
                <>
                  {course && (
                    <button
                      onClick={() => setPlan("course")}
                      disabled={!!forcePlan}
                      className={cn(
                        "flex w-full items-start gap-3.5 rounded-3xl border-2 p-5 text-left transition-all duration-200",
                        plan === "course" ? "border-gold-400 bg-gold-50 dark:bg-gold-500/10" : "border-hair hover:border-gold-300",
                      )}
                    >
                      <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-heading">
                        <BookOpen className="h-5 w-5" />
                      </span>
                      <span className="flex-1">
                        <span className="flex items-center justify-between">
                          <span className="font-heading font-semibold text-heading">This topic</span>
                          <span className="font-heading font-bold text-heading">{formatINR(course.price)}</span>
                        </span>
                        <span className="mt-0.5 block text-sm text-muted">
                          One year of access to &ldquo;{course.title}&rdquo;.
                        </span>
                      </span>
                    </button>
                  )}

                  <button
                    onClick={() => setPlan("all")}
                    disabled={!!forcePlan}
                    className={cn(
                      "relative flex w-full items-start gap-3.5 rounded-3xl border-2 p-5 text-left transition-all duration-200",
                      plan === "all" ? "border-gold-400 bg-gold-50 dark:bg-gold-500/10" : "border-hair hover:border-gold-300",
                    )}
                  >
                    <span className="absolute right-3 top-3">
                      <span className="rounded-full bg-gradient-to-r from-gold-500 to-navy-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                        BEST VALUE
                      </span>
                    </span>
                    <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold-100 text-gold-600">
                      <Crown className="h-5 w-5" />
                    </span>
                    <span className="flex-1">
                      <span className="flex items-center justify-between pr-20">
                        <span className="font-heading font-semibold text-heading">All-Access Pass</span>
                      </span>
                      <span className="font-heading font-bold text-heading">
                        {formatINR(pricing.cat3)}
                        <span className="text-sm font-medium text-faint"> / year</span>
                      </span>
                      <span className="mt-0.5 block text-sm text-muted">Every coaching topic on LEAP Coach for a year.</span>
                    </span>
                  </button>
                </>
              )}
            </div>

            {/* Coupon */}
            {showCoupon && (
              <div className="mt-4">
                {applied ? (
                  <div className="flex items-center justify-between rounded-2xl border border-green-200 bg-green-50 p-3.5 dark:border-green-500/30 dark:bg-green-500/10">
                    <span className="flex items-center gap-2 text-sm font-medium text-green-700">
                      <Ticket className="h-4 w-4" />
                      <span className="font-mono font-semibold">{applied.code}</span> · {applied.discountPercent}% off applied
                    </span>
                    <button
                      onClick={() => {
                        setApplied(null);
                        setCouponInput("");
                      }}
                      className="grid h-7 w-7 place-items-center rounded-lg text-green-700 hover:bg-green-100"
                      aria-label="Remove coupon"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <input
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            applyCoupon();
                          }
                        }}
                        placeholder="Coupon code"
                        className="flex-1 rounded-xl border border-hair bg-card px-3.5 py-2.5 font-mono text-sm uppercase text-heading transition-colors duration-200 placeholder:font-sans placeholder:normal-case placeholder:text-faint focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/40"
                      />
                      <Button type="button" variant="outline" onClick={applyCoupon} loading={applying} disabled={!couponInput.trim()}>
                        Apply
                      </Button>
                    </div>
                    {couponError && <p className="mt-1.5 text-xs text-red-600">{couponError}</p>}
                  </>
                )}
              </div>
            )}

            {/* Mock payment method */}
            <div className="mt-6 rounded-3xl border border-hair bg-surface-2 p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-heading">Pay with</span>
                <span className="flex items-center gap-1 text-xs font-semibold text-muted">
                  <ShieldCheck className="h-4 w-4 text-green-600" />{" "}
                  {RAZORPAY_LIVE ? (RAZORPAY_TEST ? "Razorpay (test)" : "Razorpay") : "Razorpay (demo)"}
                </span>
              </div>
              <div className="mt-3 flex gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-hair bg-card px-3 py-2 text-sm text-heading">
                  <Smartphone className="h-4 w-4" /> UPI
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-hair bg-card px-3 py-2 text-sm text-heading">
                  <CreditCard className="h-4 w-4" /> Card
                </span>
              </div>
            </div>

            <Button onClick={pay} loading={status === "processing"} className="mt-5 w-full" size="lg">
              {status === "processing" ? (
                "Processing…"
              ) : applied ? (
                <>
                  Pay {formatINR(amount)}{" "}
                  <span className="text-sm font-normal text-navy-900/60 line-through">{formatINR(baseAmount)}</span>
                </>
              ) : (
                <>Pay {formatINR(amount)}</>
              )}
            </Button>
            <p className="mt-3 text-center text-xs text-faint">
              {RAZORPAY_LIVE
                ? RAZORPAY_TEST
                  ? "Test mode — use Razorpay test cards. No real charge is made."
                  : "Secure payment processed by Razorpay."
                : "Demo checkout — no real payment is processed."}
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}

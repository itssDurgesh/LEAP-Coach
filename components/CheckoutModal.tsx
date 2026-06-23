"use client";

import * as React from "react";
import { Check, Crown, BookOpen, ShieldCheck, Loader2, Smartphone, CreditCard, Ticket, X, Layers } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Course, Role, ROLES, bundlePrice } from "@/lib/types";
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
  const { purchaseCourse, subscribeAllAccess, enrollFree, purchaseBundle, pricing } = useApp();
  const isBundle = !!bundleCategories && bundleCategories.length > 0;
  const [plan, setPlan] = React.useState<"course" | "all">(forcePlan ?? "course");
  const [status, setStatus] = React.useState<"idle" | "processing" | "done">("idle");
  // Payment captured but access not yet granted (recorded + flagged for admin).
  const [flagged, setFlagged] = React.useState(false);
  const [couponInput, setCouponInput] = React.useState("");
  const [applying, setApplying] = React.useState(false);
  const [couponError, setCouponError] = React.useState("");
  const [applied, setApplied] = React.useState<{ code: string; discountPercent: number; finalAmountInr: number } | null>(null);

  React.useEffect(() => {
    if (open) {
      setStatus("idle");
      setFlagged(false);
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
    setStatus("done");
    setTimeout(() => {
      onComplete?.();
      onClose();
    }, 1300);
  }

  // Mock fallback (no real payment) — used when Razorpay isn't configured.
  function mockPay() {
    setTimeout(() => grantAccess(false), 1000);
  }

  async function pay() {
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
            setFlagged(true);
            setStatus("done");
            setTimeout(() => {
              onComplete?.();
              onClose();
            }, 3200);
          } else {
            // Verification itself failed — let them retry.
            setStatus("idle");
          }
        } catch {
          setStatus("idle");
        }
      },
      modal: { ondismiss: () => setStatus("idle") },
    } as Record<string, unknown>);
    rzp.on("payment.failed", () => setStatus("idle"));
    rzp.open();
  }

  const baseAmount = isBundle
    ? bundlePrice(pricing, bundleCategories!.length)
    : plan === "all"
      ? pricing.cat3
      : course?.price ?? 0;
  const amount = applied ? applied.finalAmountInr : baseAmount;
  // Free topics need no coupon entry.
  const showCoupon = RAZORPAY_LIVE && !(!isBundle && plan === "course" && baseAmount === 0);

  return (
    <Modal open={open} onClose={onClose} title="Complete your enrollment">
      <div className="p-6">
        {status === "done" ? (
          flagged ? (
            <div className="py-8 text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-amber-100 text-amber-600">
                <ShieldCheck className="h-8 w-8" strokeWidth={2.5} />
              </div>
              <p className="mt-4 font-heading text-xl font-bold text-heading">Payment received</p>
              <p className="mx-auto mt-1 max-w-xs text-sm text-muted">
                We&apos;re finalizing your access. If it doesn&apos;t appear in a moment, our team has
                been notified — your receipt is saved under Account. You won&apos;t be charged twice.
              </p>
            </div>
          ) : (
            <div className="py-8 text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green-100 text-green-600">
                <Check className="h-8 w-8" strokeWidth={3} />
              </div>
              <p className="mt-4 font-heading text-xl font-bold text-heading">Payment successful!</p>
              <p className="mt-1 text-sm text-muted">You now have access. Your receipt is saved under Account.</p>
            </div>
          )
        ) : (
          <>
            <div className="space-y-3">
              {isBundle ? (
                <div className="flex items-start gap-3 rounded-2xl border-2 border-gold-400 bg-gold-50 dark:bg-gold-500/10 p-4">
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
                        "flex w-full items-start gap-3 rounded-2xl border-2 p-4 text-left transition-colors",
                        plan === "course" ? "border-gold-400 bg-gold-50 dark:bg-gold-500/10" : "border-hair hover:border-faint",
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
                          Lifetime access to &ldquo;{course.title}&rdquo;.
                        </span>
                      </span>
                    </button>
                  )}

                  <button
                    onClick={() => setPlan("all")}
                    disabled={!!forcePlan}
                    className={cn(
                      "relative flex w-full items-start gap-3 rounded-2xl border-2 p-4 text-left transition-colors",
                      plan === "all" ? "border-gold-400 bg-gold-50 dark:bg-gold-500/10" : "border-hair hover:border-faint",
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
                  <div className="flex items-center justify-between rounded-2xl border border-green-200 bg-green-50 p-3">
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
                        className="flex-1 rounded-xl border border-hair bg-card px-3.5 py-2.5 font-mono text-sm uppercase text-heading placeholder:font-sans placeholder:normal-case placeholder:text-faint focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/40"
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
            <div className="mt-5 rounded-2xl border border-hair bg-surface-2 p-4">
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

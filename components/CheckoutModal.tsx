"use client";

import * as React from "react";
import { Check, Crown, BookOpen, ShieldCheck, Loader2, Smartphone, CreditCard } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Course } from "@/lib/types";
import { useApp } from "@/lib/store/AppProvider";
import { cn, formatINR } from "@/lib/utils";

export const ALL_ACCESS_PRICE = 10000;

interface CheckoutModalProps {
  course?: Course;
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
  /** force the all-access plan (used by the pricing page) */
  forcePlan?: "course" | "all";
}

export function CheckoutModal({ course, open, onClose, onComplete, forcePlan }: CheckoutModalProps) {
  const { purchaseCourse, subscribeAllAccess, enrollFree } = useApp();
  const [plan, setPlan] = React.useState<"course" | "all">(forcePlan ?? "course");
  const [status, setStatus] = React.useState<"idle" | "processing" | "done">("idle");

  React.useEffect(() => {
    if (open) {
      setStatus("idle");
      setPlan(forcePlan ?? (course ? "course" : "all"));
    }
  }, [open, forcePlan, course]);

  function pay() {
    setStatus("processing");
    setTimeout(() => {
      if (plan === "all") {
        subscribeAllAccess();
        if (course) enrollFree(course.id);
      } else if (course) {
        purchaseCourse(course.id);
      }
      setStatus("done");
      setTimeout(() => {
        onComplete?.();
        onClose();
      }, 1300);
    }, 1000);
  }

  const amount = plan === "all" ? ALL_ACCESS_PRICE : course?.price ?? 0;

  return (
    <Modal open={open} onClose={onClose} title="Complete your enrollment">
      <div className="p-6">
        {status === "done" ? (
          <div className="py-8 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green-100 text-green-600">
              <Check className="h-8 w-8" strokeWidth={3} />
            </div>
            <p className="mt-4 font-heading text-xl font-bold text-navy-800">Payment successful!</p>
            <p className="mt-1 text-sm text-ink-soft">You now have access. Redirecting to your topic…</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {course && (
                <button
                  onClick={() => setPlan("course")}
                  disabled={!!forcePlan}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-2xl border-2 p-4 text-left transition-colors",
                    plan === "course" ? "border-gold-400 bg-gold-50" : "border-cream-200 hover:border-cream-300",
                  )}
                >
                  <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy-100 text-navy-700">
                    <BookOpen className="h-5 w-5" />
                  </span>
                  <span className="flex-1">
                    <span className="flex items-center justify-between">
                      <span className="font-heading font-semibold text-navy-800">This topic</span>
                      <span className="font-heading font-bold text-navy-800">{formatINR(course.price)}</span>
                    </span>
                    <span className="mt-0.5 block text-sm text-ink-soft">
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
                  plan === "all" ? "border-gold-400 bg-gold-50" : "border-cream-200 hover:border-cream-300",
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
                    <span className="font-heading font-semibold text-navy-800">All-Access Pass</span>
                  </span>
                  <span className="font-heading font-bold text-navy-800">
                    {formatINR(ALL_ACCESS_PRICE)}
                    <span className="text-sm font-medium text-ink-faint"> / year</span>
                  </span>
                  <span className="mt-0.5 block text-sm text-ink-soft">Every coaching topic on Leap Coach for a year.</span>
                </span>
              </button>
            </div>

            {/* Mock payment method */}
            <div className="mt-5 rounded-2xl border border-cream-200 bg-cream-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-navy-700">Pay with</span>
                <span className="flex items-center gap-1 text-xs font-semibold text-navy-600">
                  <ShieldCheck className="h-4 w-4 text-green-600" /> Razorpay (demo)
                </span>
              </div>
              <div className="mt-3 flex gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm text-navy-700">
                  <Smartphone className="h-4 w-4" /> UPI
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm text-navy-700">
                  <CreditCard className="h-4 w-4" /> Card
                </span>
              </div>
            </div>

            <Button onClick={pay} loading={status === "processing"} className="mt-5 w-full" size="lg">
              {status === "processing" ? (
                "Processing…"
              ) : (
                <>Pay {formatINR(amount)}</>
              )}
            </Button>
            <p className="mt-3 text-center text-xs text-ink-faint">
              Demo checkout — no real payment is processed.
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}

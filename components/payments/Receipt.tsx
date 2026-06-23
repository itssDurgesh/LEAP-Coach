"use client";

import { CheckCircle2, AlertTriangle, RotateCcw } from "lucide-react";
import { Payment } from "@/lib/types";
import { formatINR } from "@/lib/utils";

/** Human label for what a payment bought. */
export function paymentItemLabel(p: Payment, courseTitle?: string): string {
  if (p.plan === "all") return "All-Access Pass";
  if (p.plan === "bundle")
    return `Category Pass — ${p.categories.length} ${p.categories.length === 1 ? "category" : "categories"}`;
  return courseTitle ? courseTitle : "Coaching topic";
}

function StatusPill({ payment }: { payment: Payment }) {
  if (payment.status === "refunded")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-500/10">
        <RotateCcw className="h-3.5 w-3.5" /> Refunded
      </span>
    );
  if (payment.grantStatus === "grant_failed")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-500/10">
        <AlertTriangle className="h-3.5 w-3.5" /> Access pending
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 dark:bg-green-500/10">
      <CheckCircle2 className="h-3.5 w-3.5" /> Paid
    </span>
  );
}

/** A printable payment receipt. Used on checkout success and in the account list. */
export function Receipt({ payment, courseTitle }: { payment: Payment; courseTitle?: string }) {
  const date = new Date(payment.createdAt).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return (
    <div className="rounded-2xl border border-hair bg-card p-5 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-heading text-lg font-bold text-heading">LEAP Coach</p>
          <p className="text-xs text-faint">Payment receipt</p>
        </div>
        <StatusPill payment={payment} />
      </div>

      <dl className="mt-4 space-y-2">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Receipt no.</dt>
          <dd className="font-mono text-heading">{payment.id}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Date</dt>
          <dd className="text-heading">{date}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Item</dt>
          <dd className="text-right font-medium text-heading">{paymentItemLabel(payment, courseTitle)}</dd>
        </div>
        {payment.couponCode && (
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Coupon</dt>
            <dd className="text-heading">{payment.couponCode}</dd>
          </div>
        )}
        {payment.razorpayPaymentId && (
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Payment ID</dt>
            <dd className="font-mono text-xs text-heading">{payment.razorpayPaymentId}</dd>
          </div>
        )}
      </dl>

      <div className="mt-4 flex items-center justify-between border-t border-hair pt-3">
        <span className="font-heading font-semibold text-heading">Amount paid</span>
        <span className="font-heading text-xl font-bold text-heading">{formatINR(payment.amountInr)}</span>
      </div>

      {payment.grantStatus === "grant_failed" && payment.status !== "refunded" && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/10">
          Your payment was received but access is still being finalized. Our team has been notified and
          will resolve it shortly — you won&apos;t be charged twice.
        </p>
      )}
    </div>
  );
}

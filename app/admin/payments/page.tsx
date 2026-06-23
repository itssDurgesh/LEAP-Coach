"use client";

import * as React from "react";
import { AlertTriangle, RotateCcw, RefreshCw, IndianRupee, CheckCircle2 } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useApp } from "@/lib/store/AppProvider";
import { isOwner } from "@/lib/types";
import { paymentItemLabel } from "@/components/payments/Receipt";
import { formatINR } from "@/lib/utils";

export default function AdminPaymentsPage() {
  return (
    <AdminShell title="Payments" subtitle="Receipts, revenue, and flagged payments needing action" requires="payments">
      <Payments />
    </AdminShell>
  );
}

function Payments() {
  const { payments, users, getCourse, currentUser, refundPayment, retryGrant } = useApp();
  const owner = isOwner(currentUser);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState("");

  const userName = (id: string) => {
    const u = users.find((x) => x.id === id);
    return u ? `${u.name}${u.email ? ` · ${u.email}` : ""}` : id;
  };

  // Flagged (captured but not granted, not refunded) first, then newest.
  const sorted = [...payments].sort((a, b) => {
    const fa = a.grantStatus === "grant_failed" && a.status !== "refunded" ? 1 : 0;
    const fb = b.grantStatus === "grant_failed" && b.status !== "refunded" ? 1 : 0;
    if (fa !== fb) return fb - fa;
    return a.createdAt < b.createdAt ? 1 : -1;
  });

  const flagged = payments.filter((p) => p.grantStatus === "grant_failed" && p.status !== "refunded");
  const revenue = payments.filter((p) => p.status === "captured").reduce((s, p) => s + p.amountInr, 0);
  const refunded = payments.filter((p) => p.status === "refunded").length;

  async function onRetry(id: string) {
    setError("");
    setBusy(id);
    const r = await retryGrant(id);
    setBusy(null);
    if (!r.ok) setError(r.error ?? "Retry failed.");
  }

  async function onRefund(id: string) {
    setError("");
    if (!confirm("Refund this payment in full via Razorpay? This cannot be undone.")) return;
    setBusy(id);
    const r = await refundPayment(id);
    setBusy(null);
    if (!r.ok) setError(r.error ?? "Refund failed.");
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card padded>
          <p className="text-xs font-medium uppercase tracking-wide text-faint">Captured revenue</p>
          <p className="mt-1 flex items-center gap-1 font-heading text-2xl font-bold text-heading">
            <IndianRupee className="h-5 w-5" /> {formatINR(revenue).replace("₹", "")}
          </p>
        </Card>
        <Card padded>
          <p className="text-xs font-medium uppercase tracking-wide text-faint">Needs attention</p>
          <p className={`mt-1 font-heading text-2xl font-bold ${flagged.length ? "text-red-600" : "text-heading"}`}>
            {flagged.length}
          </p>
        </Card>
        <Card padded>
          <p className="text-xs font-medium uppercase tracking-wide text-faint">Refunded</p>
          <p className="mt-1 font-heading text-2xl font-bold text-heading">{refunded}</p>
        </Card>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {flagged.length > 0 && (
        <p className="text-sm text-muted">
          <span className="font-semibold text-red-600">{flagged.length} payment(s)</span> were captured but
          access wasn&apos;t granted. <strong>Retry grant</strong> gives the buyer what they paid for;{" "}
          {owner ? "use Refund only if you can't fulfil it." : "ask an owner to refund if it can't be fulfilled."}
        </p>
      )}

      {!payments.length ? (
        <Card padded>
          <p className="text-sm text-muted">No payments yet.</p>
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-hair">
            {sorted.map((p) => {
              const title = p.courseId ? getCourse(p.courseId)?.title : undefined;
              const isFlagged = p.grantStatus === "grant_failed" && p.status !== "refunded";
              return (
                <li
                  key={p.id}
                  className={`flex flex-wrap items-center gap-3 px-4 py-3 ${isFlagged ? "bg-red-50/60 dark:bg-red-500/5" : ""}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-heading">{paymentItemLabel(p, title)}</p>
                    <p className="truncate text-xs text-faint">{userName(p.userId)}</p>
                    <p className="mt-0.5 text-xs text-faint">
                      {new Date(p.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                      {p.razorpayPaymentId ? ` · ${p.razorpayPaymentId}` : ""}
                    </p>
                  </div>

                  <span className="font-heading font-semibold text-heading">{formatINR(p.amountInr)}</span>

                  {p.status === "refunded" ? (
                    <Badge variant="outline"><RotateCcw className="h-3 w-3" /> Refunded</Badge>
                  ) : isFlagged ? (
                    <Badge variant="warning"><AlertTriangle className="h-3 w-3" /> Not granted</Badge>
                  ) : (
                    <Badge variant="success"><CheckCircle2 className="h-3 w-3" /> Granted</Badge>
                  )}

                  <div className="flex items-center gap-2">
                    {isFlagged && (
                      <Button size="sm" variant="outline" loading={busy === p.id} onClick={() => onRetry(p.id)}>
                        <RefreshCw className="h-3.5 w-3.5" /> Retry grant
                      </Button>
                    )}
                    {owner && p.status !== "refunded" && (
                      <Button size="sm" variant="ghost" loading={busy === p.id} onClick={() => onRefund(p.id)}>
                        Refund
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

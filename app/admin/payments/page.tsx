"use client";

import * as React from "react";
import {
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  IndianRupee,
  CheckCircle2,
  Search,
  CreditCard,
  Crown,
  Users as UsersIcon,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Input, Select } from "@/components/ui/Field";
import { PlanBadge } from "@/components/app/PlanBadge";
import { useApp } from "@/lib/store/AppProvider";
import { isOwner, planFor, ROLES, Role } from "@/lib/types";
import { paymentItemLabel } from "@/components/payments/Receipt";
import { formatINR, timeAgo } from "@/lib/utils";

export default function AdminPaymentsPage() {
  return (
    <AdminShell
      title="Payments & subscriptions"
      subtitle="Live revenue, receipts, subscriptions & failed-grant recovery"
      requires="payments"
    >
      <Dashboard />
    </AdminShell>
  );
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

function Dashboard() {
  const { payments, users, getCourse, currentUser, refundPayment, retryGrant, refreshPayments } = useApp();
  const owner = isOwner(currentUser);

  const [tab, setTab] = React.useState<"payments" | "subscriptions">("payments");
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState("");
  const [q, setQ] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [updatedAt, setUpdatedAt] = React.useState<number>(() => Date.now());

  // ── Live refresh: poll payments every 25s + whenever the tab regains focus ──
  React.useEffect(() => {
    let active = true;
    const tick = async () => {
      await refreshPayments();
      if (active) setUpdatedAt(Date.now());
    };
    const id = setInterval(tick, 25_000);
    const onFocus = () => tick();
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshPayments]);

  const userOf = (id: string) => users.find((x) => x.id === id);

  // ── Stats ──
  const captured = payments.filter((p) => p.status === "captured");
  const revenue = captured.reduce((s, p) => s + p.amountInr, 0);
  const refundedList = payments.filter((p) => p.status === "refunded");
  const flagged = payments.filter((p) => p.grantStatus === "grant_failed" && p.status !== "refunded");
  const subscribers = users.filter((u) => !u.isAdmin && planFor(u).tier !== "free");

  const stats = [
    { label: "Captured revenue", value: formatINR(revenue), icon: IndianRupee, tone: "text-heading" },
    { label: "Active subscriptions", value: String(subscribers.length), icon: Crown, tone: "text-heading" },
    { label: "Refunded", value: `${refundedList.length}`, icon: RotateCcw, tone: "text-heading" },
    { label: "Needs attention", value: String(flagged.length), icon: AlertTriangle, tone: flagged.length ? "text-red-600" : "text-heading" },
  ];

  // ── Payments table data ──
  const filteredPayments = [...payments]
    .filter((p) => {
      const isFlagged = p.grantStatus === "grant_failed" && p.status !== "refunded";
      if (statusFilter === "granted" && !(p.grantStatus === "granted" && p.status !== "refunded")) return false;
      if (statusFilter === "flagged" && !isFlagged) return false;
      if (statusFilter === "refunded" && p.status !== "refunded") return false;
      if (q.trim()) {
        const u = userOf(p.userId);
        const hay = `${u?.name ?? ""} ${u?.email ?? ""} ${p.razorpayPaymentId ?? ""}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const fa = a.grantStatus === "grant_failed" && a.status !== "refunded" ? 1 : 0;
      const fb = b.grantStatus === "grant_failed" && b.status !== "refunded" ? 1 : 0;
      if (fa !== fb) return fb - fa;
      return a.createdAt < b.createdAt ? 1 : -1;
    });

  const filteredSubs = subscribers
    .filter((u) => {
      if (!q.trim()) return true;
      return `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase());
    })
    .sort((a, b) => planFor(b).categories - planFor(a).categories);

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

  const catLabel = (r: Role) => ROLES.find((x) => x.id === r)?.label ?? r;

  return (
    <div className="space-y-5">
      {/* Live status + manual refresh */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-xs text-muted">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500/70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          Live · updated {timeAgo(new Date(updatedAt).toISOString())}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            await refreshPayments();
            setUpdatedAt(Date.now());
          }}
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} padded>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-faint">{s.label}</p>
              <s.icon className={`h-4 w-4 ${s.tone === "text-red-600" ? "text-red-500" : "text-gold-600"}`} />
            </div>
            <p className={`mt-1 font-heading text-2xl font-bold ${s.tone}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {flagged.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50/70 px-4 py-3 text-sm text-heading dark:bg-red-500/5">
          <span className="font-semibold text-red-600">{flagged.length} payment(s)</span> were captured but access
          wasn&apos;t granted. <strong>Retry grant</strong> gives the buyer what they paid for;{" "}
          {owner ? "use Refund only if it can't be fulfilled." : "ask an owner to refund if it can't be fulfilled."}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-hair">
        {[
          { id: "payments" as const, label: "Payments", icon: CreditCard, count: payments.length },
          { id: "subscriptions" as const, label: "Subscriptions", icon: UsersIcon, count: subscribers.length },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.id ? "border-gold-500 text-heading" : "border-transparent text-muted hover:text-heading"
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
            <span className="rounded-full bg-surface-2 px-1.5 text-xs text-muted">{t.count}</span>
          </button>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email, or payment id…" className="pl-10" />
        </div>
        {tab === "payments" && (
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-48">
            <option value="all">All statuses</option>
            <option value="granted">Granted</option>
            <option value="flagged">Needs attention</option>
            <option value="refunded">Refunded</option>
          </Select>
        )}
      </div>

      {/* ── Payments tab ── */}
      {tab === "payments" &&
        (filteredPayments.length === 0 ? (
          <Card padded>
            <p className="text-sm text-muted">No payments match your filters.</p>
          </Card>
        ) : (
          <Card>
            <ul className="divide-y divide-hair">
              {filteredPayments.map((p) => {
                const u = userOf(p.userId);
                const title = p.courseId ? getCourse(p.courseId)?.title : undefined;
                const isFlagged = p.grantStatus === "grant_failed" && p.status !== "refunded";
                return (
                  <li
                    key={p.id}
                    className={`flex flex-wrap items-center gap-3 px-4 py-3 ${isFlagged ? "bg-red-50/60 dark:bg-red-500/5" : ""}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-heading">{paymentItemLabel(p, title)}</p>
                      <p className="truncate text-xs text-faint">
                        {u ? `${u.name} · ${u.email}` : p.userId}
                      </p>
                      <p className="mt-0.5 text-xs text-faint">
                        {fmtDate(p.createdAt)}
                        {p.razorpayPaymentId ? ` · ${p.razorpayPaymentId}` : ""}
                        {p.couponCode ? ` · coupon ${p.couponCode}` : ""}
                        {p.source === "webhook" ? " · webhook" : ""}
                      </p>
                    </div>

                    <span className="font-heading font-semibold text-heading">{formatINR(p.amountInr)}</span>

                    {p.status === "refunded" ? (
                      <Badge variant="outline">
                        <RotateCcw className="h-3 w-3" /> Refunded
                      </Badge>
                    ) : isFlagged ? (
                      <Badge variant="warning">
                        <AlertTriangle className="h-3 w-3" /> Not granted
                      </Badge>
                    ) : (
                      <Badge variant="success">
                        <CheckCircle2 className="h-3 w-3" /> Granted
                      </Badge>
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
        ))}

      {/* ── Subscriptions tab ── */}
      {tab === "subscriptions" &&
        (filteredSubs.length === 0 ? (
          <Card padded>
            <p className="text-sm text-muted">No active subscriptions yet.</p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-hair text-left text-xs uppercase tracking-wide text-faint">
                    <th className="px-5 py-3 font-medium">Learner</th>
                    <th className="px-5 py-3 font-medium">Plan</th>
                    <th className="px-5 py-3 font-medium">Catalogs</th>
                    <th className="px-5 py-3 font-medium">Topics owned</th>
                    <th className="px-5 py-3 font-medium">Validity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hair">
                  {filteredSubs.map((u) => {
                    const cats = u.ownedCategories ?? [];
                    const allAccess = u.subscriptionPlan === "all_access";
                    return (
                      <tr key={u.id} className="hover:bg-surface-2">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar src={u.avatarUrl} name={u.name} size={34} />
                            <div className="min-w-0">
                              <p className="font-medium text-heading">{u.name}</p>
                              <p className="truncate text-xs text-faint">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <PlanBadge user={u} />
                        </td>
                        <td className="px-5 py-3 text-muted">
                          {allAccess ? "All 3" : cats.length ? cats.map(catLabel).join(", ") : "—"}
                        </td>
                        <td className="px-5 py-3 text-muted">{u.ownedCourseIds.length}</td>
                        <td className="px-5 py-3 text-muted">
                          {allAccess
                            ? u.subscriptionValidUntil
                              ? `Until ${new Date(u.subscriptionValidUntil).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
                              : "Active"
                            : cats.length
                              ? "Lifetime passes"
                              : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ))}

      <p className="text-xs text-faint">
        Payments stream in live (auto-refresh every 25s). Subscription details refresh when you reload the panel.
      </p>
    </div>
  );
}

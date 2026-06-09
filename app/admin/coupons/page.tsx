"use client";

import * as React from "react";
import { Ticket, Trash2, Plus, Eye, EyeOff, IndianRupee } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { useApp } from "@/lib/store/AppProvider";
import { Coupon, Role } from "@/lib/types";
import { normalizeCode } from "@/lib/coupons";

const CATEGORY_LABELS: Record<Coupon["category"], string> = {
  all: "All categories",
  student: "Student",
  professional: "Professional",
  entrepreneur: "Entrepreneur",
};

export default function CouponsPage() {
  return (
    <AdminShell title="Plans & Coupons" subtitle="Create discount coupons and control eligibility" requires="owner">
      <Coupons />
    </AdminShell>
  );
}

function PricingEditor() {
  const { pricing, savePricing } = useApp();
  const [form, setForm] = React.useState(pricing);
  const [saved, setSaved] = React.useState(false);

  // Keep the form in sync if pricing loads/changes from the server.
  React.useEffect(() => setForm(pricing), [pricing.cat1, pricing.cat2, pricing.cat3, pricing.perTopicFrom]);

  const dirty =
    form.cat1 !== pricing.cat1 ||
    form.cat2 !== pricing.cat2 ||
    form.cat3 !== pricing.cat3 ||
    form.perTopicFrom !== pricing.perTopicFrom;
  const tiers: { key: "cat1" | "cat2" | "cat3"; label: string; hint: string }[] = [
    { key: "cat1", label: "1 category", hint: "Single-category pass" },
    { key: "cat2", label: "2 categories", hint: "Any two categories" },
    { key: "cat3", label: "3 categories", hint: "All-Access" },
  ];

  return (
    <Card padded>
      <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-heading">
        <IndianRupee className="h-5 w-5 text-gold-600" /> Plan prices (category bundles)
      </h2>
      <p className="mt-1 text-sm text-muted">
        Bundle price is by the number of categories a learner picks. Individual topic prices are set on each topic.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {tiers.map((t) => (
          <div key={t.key}>
            <label className="mb-1 block text-xs font-medium text-muted">
              {t.label} <span className="text-faint">· {t.hint}</span>
            </label>
            <Input
              type="number"
              min={0}
              value={form[t.key]}
              onChange={(e) => setForm((f) => ({ ...f, [t.key]: Number(e.target.value) }))}
            />
          </div>
        ))}
      </div>
      <div className="mt-4 max-w-xs border-t border-hair pt-4">
        <label className="mb-1 block text-xs font-medium text-muted">
          Per-topic &ldquo;starting from&rdquo; price <span className="text-faint">· shown on the Pricing page</span>
        </label>
        <Input
          type="number"
          min={0}
          value={form.perTopicFrom}
          onChange={(e) => setForm((f) => ({ ...f, perTopicFrom: Number(e.target.value) }))}
        />
      </div>
      <div className="mt-4 flex items-center justify-end gap-3">
        {saved && <span className="text-sm font-medium text-green-600">Saved ✓</span>}
        <Button
          disabled={!dirty}
          onClick={() => {
            savePricing({ cat1: form.cat1, cat2: form.cat2, cat3: form.cat3, perTopicFrom: form.perTopicFrom });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          }}
        >
          Save prices
        </Button>
      </div>
    </Card>
  );
}

function Coupons() {
  const { coupons, saveCoupon, deleteCoupon } = useApp();
  const [form, setForm] = React.useState({
    code: "",
    discountPercent: 10,
    category: "all" as Coupon["category"],
    maxRedemptions: "",
    expiresAt: "",
  });
  const [error, setError] = React.useState("");

  function create(e: React.FormEvent) {
    e.preventDefault();
    const code = normalizeCode(form.code);
    if (!code) return setError("Enter a coupon code.");
    if (coupons.some((c) => c.code === code)) return setError("A coupon with that code already exists.");
    if (form.discountPercent < 1 || form.discountPercent > 100) return setError("Discount must be 1–100%.");
    setError("");
    saveCoupon({
      code,
      discountPercent: Math.round(form.discountPercent),
      category: form.category,
      active: true,
      maxRedemptions: form.maxRedemptions ? Math.max(1, Number(form.maxRedemptions)) : null,
      redemptions: 0,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      createdAt: new Date().toISOString(),
    });
    setForm({ code: "", discountPercent: 10, category: "all", maxRedemptions: "", expiresAt: "" });
  }

  const isExpired = (c: Coupon) => !!c.expiresAt && Date.parse(c.expiresAt) < Date.now();
  const isMaxed = (c: Coupon) => c.maxRedemptions != null && c.redemptions >= c.maxRedemptions;

  return (
    <div className="space-y-6">
      {/* Plan prices */}
      <PricingEditor />

      {/* Create */}
      <Card padded>
        <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-heading">
          <Plus className="h-5 w-5 text-gold-600" /> Create a coupon
        </h2>
        <form onSubmit={create} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <label className="mb-1 block text-xs font-medium text-muted">Code</label>
            <Input
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="WELCOME10"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Discount %</label>
            <Input
              type="number"
              min={1}
              max={100}
              value={form.discountPercent}
              onChange={(e) => setForm((f) => ({ ...f, discountPercent: Number(e.target.value) }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Eligible for</label>
            <Select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Coupon["category"] }))}
            >
              <option value="all">All categories</option>
              <option value="student">Student</option>
              <option value="professional">Professional</option>
              <option value="entrepreneur">Entrepreneur</option>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Max redemptions</label>
            <Input
              type="number"
              min={1}
              value={form.maxRedemptions}
              onChange={(e) => setForm((f) => ({ ...f, maxRedemptions: e.target.value }))}
              placeholder="∞"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Expires</label>
            <Input
              type="date"
              value={form.expiresAt}
              onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-5 flex items-center justify-between">
            {error ? <p className="text-sm text-red-600">{error}</p> : <span />}
            <Button type="submit">
              <Plus className="h-4 w-4" /> Create coupon
            </Button>
          </div>
        </form>
      </Card>

      {/* List */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-hair px-5 py-4">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-heading">
            <Ticket className="h-5 w-5 text-gold-600" /> Coupons · {coupons.length}
          </h2>
        </div>
        {coupons.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-faint">No coupons yet. Create one above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hair text-left text-xs uppercase tracking-wide text-faint">
                  <th className="px-5 py-3 font-medium">Code</th>
                  <th className="px-5 py-3 font-medium">Discount</th>
                  <th className="px-5 py-3 font-medium">Eligible for</th>
                  <th className="px-5 py-3 font-medium">Used</th>
                  <th className="px-5 py-3 font-medium">Expires</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hair">
                {coupons.map((c) => {
                  const expired = isExpired(c);
                  const maxed = isMaxed(c);
                  return (
                    <tr key={c.code} className="hover:bg-surface-2">
                      <td className="px-5 py-3 font-mono font-semibold text-heading">{c.code}</td>
                      <td className="px-5 py-3 text-muted">{c.discountPercent}% off</td>
                      <td className="px-5 py-3 text-muted">{CATEGORY_LABELS[c.category]}</td>
                      <td className="px-5 py-3 text-muted">
                        {c.redemptions}
                        {c.maxRedemptions != null ? ` / ${c.maxRedemptions}` : ""}
                      </td>
                      <td className="px-5 py-3 text-muted">
                        {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td className="px-5 py-3">
                        {!c.active ? (
                          <Badge variant="neutral">Inactive</Badge>
                        ) : expired ? (
                          <Badge variant="warning">Expired</Badge>
                        ) : maxed ? (
                          <Badge variant="warning">Limit reached</Badge>
                        ) : (
                          <Badge variant="success">Active</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => saveCoupon({ ...c, active: !c.active })}
                            title={c.active ? "Deactivate" : "Activate"}
                            className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-surface-2 hover:text-heading"
                          >
                            {c.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete coupon "${c.code}"? This cannot be undone.`)) deleteCoupon(c.code);
                            }}
                            title="Delete"
                            className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

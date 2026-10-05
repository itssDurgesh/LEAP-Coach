"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Crown, BookOpen, Sparkles, ShieldCheck, Layers } from "lucide-react";
import { SiteNav } from "@/components/marketing/SiteNav";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { CARD, SectionHead, Tag } from "@/components/marketing/SectionHead";
import { v2Button } from "@/components/v2/button";
import { CheckoutModal } from "@/components/CheckoutModal";
import { useApp } from "@/lib/store/AppProvider";
import { Role, ROLES, bundlePrice, PricingTiers } from "@/lib/types";
import { activeCategories } from "@/lib/access";
import { cn, formatINR } from "@/lib/utils";

const faqs = [
  { q: "Can I buy more categories later?", a: "Yes. Buy one category now and add others any time. Owning all three is the All-Access Pass." },
  { q: "What does a category pass include?", a: "Every coaching topic in that category, current and future, plus the LEAP AI tutor and AI-graded checkpoints." },
  { q: "Do I get the LEAP Coach AI tutor on every plan?", a: "Yes. The AI tutor and AI-graded checkpoints are included with every enrolled topic." },
  { q: "What payment methods are supported?", a: "UPI, cards, and netbanking via Razorpay." },
];

/**
 * `initialPricing` is fetched on the server (see app/pricing/page.tsx) so the correct
 * admin-set price is in the first paint — no client round-trip, no flash of a default.
 * Once the client store hydrates we prefer its `pricing` (identical value, but also picks
 * up an in-session admin change without a reload).
 */
export function PricingClient({ initialPricing }: { initialPricing: PricingTiers }) {
  const { currentUser, hydrated, courses, pricing: storePricing } = useApp();
  const pricing = hydrated ? storePricing : initialPricing;
  const [selected, setSelected] = React.useState<Role[]>([]);
  const [checkoutBundle, setCheckoutBundle] = React.useState<Role[] | null>(null);

  const paid = courses.filter((c) => c.price > 0);
  const minPrice = paid.length ? Math.min(...paid.map((c) => c.price)) : 0;
  // Admin-set "starting from" price wins; fall back to the cheapest paid topic.
  const fromPrice = pricing.perTopicFrom || minPrice;
  const isLearner = hydrated && currentUser && !currentUser.isAdmin;
  // Only ACTIVE catalogs show as owned — a lapsed one is buyable again (access is 1-year).
  const owned = [...activeCategories(currentUser)];
  const allAccess = owned.length >= 3;

  const toggle = (r: Role) => setSelected((s) => (s.includes(r) ? s.filter((x) => x !== r) : [...s, r]));
  const bundleAmount = selected.length ? bundlePrice(pricing, selected.length) : 0;

  const perCourseIncludes = [
    "One year of access to the topic",
    "LEAP AI tutor & checkpoints",
    "Class notes, transcripts & resources",
    "Certificate-ready progress tracking",
  ];

  return (
    <div className="app-v2 min-h-screen bg-surface font-sans text-heading">
      <SiteNav />

      <section className="mx-auto max-w-7xl px-5 pb-12 pt-14 text-center sm:px-8 lg:pt-20">
        <SectionHead
          center
          as="h1"
          tag="Pricing"
          title="Simple, transparent pricing"
          text="Buy a single topic, unlock a whole category, or get everything with the All-Access Pass."
        />
        {allAccess && (
          <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full bg-lv-orgs-tint px-4 py-2 text-sm font-semibold text-lv-orgs-dark">
            <ShieldCheck className="h-4 w-4" /> Your All-Access Pass is active
          </div>
        )}
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-20 sm:px-8">
        <div className="grid items-start gap-5 md:grid-cols-2">
          {/* Per-topic */}
          <div className={cn(CARD, "p-8")}>
            <span className="grid h-12 w-12 place-items-center rounded-full bg-lv-peers-tint text-lv-peers-dark">
              <BookOpen className="h-6 w-6" />
            </span>
            <h2 className="mt-5 font-heading text-xl font-semibold tracking-[-0.01em] text-heading">Per-Topic</h2>
            <p className="mt-1 text-sm text-v2-body">Buy a topic, keep it for a year.</p>
            <p className="mt-5">
              <span className="font-heading text-4xl font-bold tracking-[-0.02em] text-heading">
                {fromPrice ? `from ${formatINR(fromPrice)}` : "Free topics"}
              </span>
              {fromPrice ? <span className="text-sm font-medium text-muted"> / topic</span> : null}
            </p>
            <Link href="/courses" className={v2Button("outline", "md", "mt-6 w-full")}>
              Browse topics
            </Link>
            <ul className="mt-6 space-y-3 text-sm text-v2-body">
              {perCourseIncludes.map((f) => (
                <li key={f} className="flex items-center gap-2.5">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-v2-gold-soft text-v2-gold-text">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Category pass / bundle */}
          <div className="relative rounded-[24px] bg-card p-8 shadow-v2-lift ring-2 ring-[#E9B93E]">
            <Tag className="absolute -top-3.5 left-8 bg-[#E9B93E] text-navy-800">
              <Sparkles className="h-3 w-3" /> Best value
            </Tag>
            <span className="grid h-12 w-12 place-items-center rounded-full bg-v2-gold-soft text-v2-gold-text">
              {selected.length >= 3 ? <Crown className="h-6 w-6" /> : <Layers className="h-6 w-6" />}
            </span>
            <h2 className="mt-5 font-heading text-xl font-semibold tracking-[-0.01em] text-heading">Category Pass</h2>
            <p className="mt-1 text-sm text-v2-body">
              Unlock every topic in a category. Pick all three for the All-Access Pass.
            </p>

            <div className="mt-5 space-y-2">
              {ROLES.map((r) => {
                const on = selected.includes(r.id);
                const ownedAlready = owned.includes(r.id) || allAccess;
                return (
                  <button
                    key={r.id}
                    onClick={() => toggle(r.id)}
                    disabled={ownedAlready}
                    className={cn(
                      "flex w-full items-center justify-between rounded-[14px] border px-4 py-3 text-left text-sm transition-colors duration-200",
                      ownedAlready
                        ? "cursor-default border-lv-orgs bg-lv-orgs-tint text-lv-orgs-dark"
                        : on
                          ? "border-[#E9B93E] bg-v2-gold-soft text-heading ring-1 ring-[#E9B93E]"
                          : "border-v2-line-strong text-heading hover:border-heading",
                    )}
                  >
                    <span className="font-medium">{r.label}</span>
                    {ownedAlready ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold">
                        <Check className="h-3.5 w-3.5" /> Owned
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "grid h-5 w-5 place-items-center rounded-full border-[1.5px]",
                          on ? "border-[#E9B93E] bg-[#E9B93E] text-navy-800" : "border-v2-line-strong",
                        )}
                      >
                        {on && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <p className="mt-5 font-heading text-display-sm font-bold leading-none text-heading">
              {selected.length ? formatINR(bundleAmount) : formatINR(pricing.cat1)}
              <span className="font-sans text-sm font-medium tracking-normal text-muted">
                {" "}
                {selected.length >= 3 ? "· all categories" : selected.length === 2 ? "· 2 categories" : "/ category"}
              </span>
            </p>

            {allAccess ? (
              <button type="button" disabled className={v2Button("primary", "md", "mt-5 w-full")}>
                <Check className="h-4 w-4" /> You have All-Access
              </button>
            ) : isLearner ? (
              <button
                type="button"
                onClick={() => setCheckoutBundle(selected)}
                disabled={selected.length === 0}
                className={v2Button("primary", "md", "mt-5 w-full")}
              >
                {selected.length === 0
                  ? "Select a category"
                  : `Get ${selected.length === 3 ? "All-Access" : `${selected.length}-category pass`}`}
              </button>
            ) : (
              <Link href="/signup" className={v2Button("primary", "md", "mt-5 w-full")}>
                Start your journey
              </Link>
            )}
          </div>
        </div>

        {/* FAQ */}
        <div className="mx-auto mt-16 max-w-3xl">
          <h2 className="text-center font-heading text-2xl font-bold tracking-[-0.015em] text-heading">Frequently asked questions</h2>
          <div className="mt-6 space-y-3">
            {faqs.map((f) => (
              <div key={f.q} className="rounded-[20px] bg-card p-5 shadow-v2-soft sm:px-6">
                <p className="font-heading font-semibold text-heading">{f.q}</p>
                <p className="mt-1.5 text-sm leading-5 text-v2-body">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />

      <CheckoutModal
        open={!!checkoutBundle}
        bundleCategories={checkoutBundle ?? undefined}
        onClose={() => setCheckoutBundle(null)}
        onComplete={() => setSelected([])}
      />
    </div>
  );
}

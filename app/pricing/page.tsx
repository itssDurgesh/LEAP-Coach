"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Crown, BookOpen, Sparkles, ShieldCheck, Layers } from "lucide-react";
import { SiteNav } from "@/components/marketing/SiteNav";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { CheckoutModal } from "@/components/CheckoutModal";
import { useApp } from "@/lib/store/AppProvider";
import { Role, ROLES, bundlePrice } from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";

const faqs = [
  { q: "Can I buy more categories later?", a: "Yes — buy one category now and add others any time. Owning all three is the All-Access Pass." },
  { q: "What does a category pass include?", a: "Every coaching topic in that category — current and future — plus the LEAP AI tutor and AI-graded checkpoints." },
  { q: "Do I get the LEAP AI tutor on every plan?", a: "Yes — the AI tutor and AI-graded checkpoints are included with every enrolled topic." },
  { q: "What payment methods are supported?", a: "UPI, cards, and netbanking via Razorpay." },
];

export default function PricingPage() {
  const { currentUser, hydrated, courses, pricing } = useApp();
  const [selected, setSelected] = React.useState<Role[]>([]);
  const [checkoutBundle, setCheckoutBundle] = React.useState<Role[] | null>(null);

  const paid = courses.filter((c) => c.price > 0);
  const minPrice = paid.length ? Math.min(...paid.map((c) => c.price)) : 0;
  // Admin-set "starting from" price wins; fall back to the cheapest paid topic.
  const fromPrice = pricing.perTopicFrom || minPrice;
  const isLearner = hydrated && currentUser && !currentUser.isAdmin;
  const allAccess = currentUser?.subscriptionPlan === "all_access";
  const owned = currentUser?.ownedCategories ?? [];

  const toggle = (r: Role) => setSelected((s) => (s.includes(r) ? s.filter((x) => x !== r) : [...s, r]));
  const bundleAmount = selected.length ? bundlePrice(pricing, selected.length) : 0;

  const perCourseIncludes = [
    "Lifetime access to the topic",
    "LEAP AI tutor & checkpoints",
    "Class notes, transcripts & resources",
    "Certificate-ready progress tracking",
  ];

  return (
    <div className="min-h-screen bg-surface">
      <SiteNav />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 right-10 h-80 w-80 rounded-full bg-gold-300/30 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 py-16 text-center sm:px-8">
          <Badge variant="gold">Pricing</Badge>
          <h1 className="mt-4 font-heading text-4xl font-bold text-heading">Simple, transparent pricing</h1>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Buy a single topic, unlock a whole category, or get everything with the All-Access Pass.
          </p>
          {allAccess && (
            <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
              <ShieldCheck className="h-4 w-4" /> Your All-Access Pass is active
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-20 sm:px-8">
        <div className="grid items-start gap-6 md:grid-cols-2">
          {/* Per-topic */}
          <div className="rounded-3xl border border-hair bg-card p-8 shadow-card">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-heading">
              <BookOpen className="h-6 w-6" />
            </span>
            <h2 className="mt-5 font-heading text-xl font-bold text-heading">Per-Topic</h2>
            <p className="mt-1 text-sm text-muted">Pay once, own it for life.</p>
            <p className="mt-5">
              <span className="font-heading text-4xl font-bold text-heading">
                {fromPrice ? `from ${formatINR(fromPrice)}` : "Free topics"}
              </span>
              {fromPrice ? <span className="text-sm text-faint"> / topic</span> : null}
            </p>
            <Link href="/courses" className={buttonClasses({ variant: "outline", size: "lg", className: "mt-6 w-full" })}>
              Browse topics
            </Link>
            <ul className="mt-6 space-y-3 text-sm text-muted">
              {perCourseIncludes.map((f) => (
                <li key={f} className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 shrink-0 text-green-600" /> {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Category pass / bundle */}
          <div className="relative rounded-3xl border-2 border-gold-400 bg-card p-8 shadow-gold">
            <span className="absolute -top-3 left-8">
              <Badge variant="trending">
                <Sparkles className="h-3 w-3" /> Best value
              </Badge>
            </span>
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold-100 text-gold-600">
              {selected.length >= 3 ? <Crown className="h-6 w-6" /> : <Layers className="h-6 w-6" />}
            </span>
            <h2 className="mt-5 font-heading text-xl font-bold text-heading">Category Pass</h2>
            <p className="mt-1 text-sm text-muted">
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
                      "flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 text-left text-sm transition-colors",
                      ownedAlready
                        ? "cursor-default border-green-200 bg-green-50 text-green-700"
                        : on
                          ? "border-gold-400 bg-gold-50 dark:bg-gold-500/10 text-heading"
                          : "border-hair text-heading hover:border-faint",
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
                          "grid h-5 w-5 place-items-center rounded-md border-2",
                          on ? "border-gold-500 bg-gold-500 text-white" : "border-hair",
                        )}
                      >
                        {on && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <p className="mt-5 font-heading text-3xl font-bold text-heading">
              {selected.length ? formatINR(bundleAmount) : formatINR(pricing.cat1)}
              <span className="text-sm font-medium text-faint">
                {" "}
                {selected.length >= 3 ? "· all categories" : selected.length === 2 ? "· 2 categories" : "/ category"}
              </span>
            </p>

            {allAccess ? (
              <Button disabled className="mt-5 w-full" size="lg">
                <Check className="h-4 w-4" /> You have All-Access
              </Button>
            ) : isLearner ? (
              <Button
                onClick={() => setCheckoutBundle(selected)}
                disabled={selected.length === 0}
                className="mt-5 w-full"
                size="lg"
              >
                {selected.length === 0
                  ? "Select a category"
                  : `Get ${selected.length === 3 ? "All-Access" : `${selected.length}-category pass`}`}
              </Button>
            ) : (
              <Link href="/signup" className={buttonClasses({ variant: "primary", size: "lg", className: "mt-5 w-full" })}>
                Start your journey
              </Link>
            )}
          </div>
        </div>

        {/* FAQ */}
        <div className="mx-auto mt-16 max-w-3xl">
          <h2 className="text-center font-heading text-2xl font-bold text-heading">Frequently asked questions</h2>
          <div className="mt-6 space-y-3">
            {faqs.map((f) => (
              <div key={f.q} className="rounded-2xl border border-hair bg-card p-5">
                <p className="font-heading font-semibold text-heading">{f.q}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.a}</p>
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

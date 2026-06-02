"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Crown, BookOpen, Sparkles, ShieldCheck } from "lucide-react";
import { SiteNav } from "@/components/marketing/SiteNav";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { CheckoutModal, ALL_ACCESS_PRICE } from "@/components/CheckoutModal";
import { useApp } from "@/lib/store/AppProvider";
import { cn, formatINR } from "@/lib/utils";

const faqs = [
  { q: "Can I switch from per-topic to All-Access later?", a: "Yes. Upgrade any time and your purchased topics stay yours forever." },
  { q: "Is the All-Access Pass recurring?", a: "It's an annual pass. You'll be reminded before it renews — no surprises." },
  { q: "Do I get the LEAP AI tutor on every plan?", a: "Yes — the AI tutor and AI-graded checkpoints are included with every enrolled topic." },
  { q: "What payment methods are supported?", a: "In production: UPI, cards, and netbanking via Razorpay. (This prototype uses a demo checkout.)" },
];

export default function PricingPage() {
  const { currentUser, hydrated, courses } = useApp();
  const [checkout, setCheckout] = React.useState(false);

  const minPrice = Math.min(...courses.filter((c) => c.price > 0).map((c) => c.price));
  const isLearner = hydrated && currentUser && !currentUser.isAdmin;
  const allAccess = currentUser?.subscriptionPlan === "all_access";

  const allAccessIncludes = [
    "Every coaching topic on Leap Coach",
    "LEAP AI tutor on every lesson",
    "All AI-graded checkpoints & credits",
    "Live sessions & community access",
    "New topics added free",
  ];
  const perCourseIncludes = [
    "Lifetime access to the topic",
    "LEAP AI tutor & checkpoints",
    "Class notes, transcripts & resources",
    "Certificate-ready progress tracking",
  ];

  return (
    <div className="min-h-screen bg-cream-50">
      <SiteNav />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 right-10 h-80 w-80 rounded-full bg-gold-300/30 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 py-16 text-center sm:px-8">
          <Badge variant="gold">Pricing</Badge>
          <h1 className="mt-4 font-heading text-4xl font-bold text-navy-800">Simple, transparent pricing</h1>
          <p className="mx-auto mt-3 max-w-xl text-ink-soft">
            Invest in your growth. Buy a single topic for life, or unlock everything with the
            All-Access Pass.
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
          {/* Per-course */}
          <div className="rounded-3xl border border-cream-200 bg-white p-8 shadow-card">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-navy-50 text-navy-700">
              <BookOpen className="h-6 w-6" />
            </span>
            <h2 className="mt-5 font-heading text-xl font-bold text-navy-800">Per-Topic</h2>
            <p className="mt-1 text-sm text-ink-soft">Pay once, own it for life.</p>
            <p className="mt-5">
              <span className="font-heading text-4xl font-bold text-navy-800">from {formatINR(minPrice)}</span>
              <span className="text-sm text-ink-faint"> / topic</span>
            </p>
            <Link href="/courses" className={buttonClasses({ variant: "outline", size: "lg", className: "mt-6 w-full" })}>
              Browse topics
            </Link>
            <ul className="mt-6 space-y-3 text-sm text-ink-soft">
              {perCourseIncludes.map((f) => (
                <li key={f} className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 shrink-0 text-green-600" /> {f}
                </li>
              ))}
            </ul>
          </div>

          {/* All-Access */}
          <div className="relative rounded-3xl border-2 border-gold-400 bg-white p-8 shadow-gold">
            <span className="absolute -top-3 left-8">
              <Badge variant="trending">
                <Sparkles className="h-3 w-3" /> Best value
              </Badge>
            </span>
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold-100 text-gold-600">
              <Crown className="h-6 w-6" />
            </span>
            <h2 className="mt-5 font-heading text-xl font-bold text-navy-800">All-Access Pass</h2>
            <p className="mt-1 text-sm text-ink-soft">Everything, all year.</p>
            <p className="mt-5">
              <span className="font-heading text-4xl font-bold text-navy-800">{formatINR(ALL_ACCESS_PRICE)}</span>
              <span className="text-sm text-ink-faint"> / year</span>
            </p>
            {allAccess ? (
              <Button disabled className="mt-6 w-full" size="lg">
                <Check className="h-4 w-4" /> Current plan
              </Button>
            ) : isLearner ? (
              <Button onClick={() => setCheckout(true)} className="mt-6 w-full" size="lg">
                Get All-Access
              </Button>
            ) : (
              <Link href="/signup" className={buttonClasses({ variant: "primary", size: "lg", className: "mt-6 w-full" })}>
                Start your journey
              </Link>
            )}
            <ul className="mt-6 space-y-3 text-sm text-ink-soft">
              {allAccessIncludes.map((f) => (
                <li key={f} className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 shrink-0 text-green-600" /> {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* FAQ */}
        <div className="mx-auto mt-16 max-w-3xl">
          <h2 className="text-center font-heading text-2xl font-bold text-navy-800">Frequently asked questions</h2>
          <div className="mt-6 space-y-3">
            {faqs.map((f) => (
              <div key={f.q} className="rounded-2xl border border-cream-200 bg-white p-5">
                <p className="font-heading font-semibold text-navy-800">{f.q}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />

      <CheckoutModal open={checkout} onClose={() => setCheckout(false)} forcePlan="all" />
    </div>
  );
}

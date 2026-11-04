"use client";

import * as React from "react";
import Link from "next/link";
import NumberFlow from "@number-flow/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, Crown, BookOpen, Sparkles, ShieldCheck, Layers } from "lucide-react";
import { SiteNav } from "@/components/marketing/SiteNav";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { FaqList } from "@/components/marketing/FaqList";
import { CARD, SectionHead, Tag } from "@/components/marketing/SectionHead";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { v2Button } from "@/components/v2/button";
import { CheckoutModal } from "@/components/CheckoutModal";
import { useApp } from "@/lib/store/AppProvider";
import { Role, ROLES, bundlePrice, PricingTiers } from "@/lib/types";
import { activeCategories } from "@/lib/access";
import { cn, formatINR } from "@/lib/utils";

const faqs = [
  { id: "more-later", question: "Can I buy more categories later?", answer: "Yes. Buy one category now and add others any time. Owning all three is the All-Access Pass." },
  { id: "includes", question: "What does a category pass include?", answer: "Every coaching topic in that category, current and future, plus the LEAP AI tutor and AI-graded checkpoints." },
  { id: "tutor", question: "Do I get the LEAP Coach AI tutor on every plan?", answer: "Yes. The AI tutor and AI-graded checkpoints are included with every enrolled topic." },
  { id: "payment", question: "What payment methods are supported?", answer: "UPI, cards, and netbanking via Razorpay." },
];

const EASE = [0.16, 1, 0.3, 1] as const;
// Rupees that roll to the new amount, formatted like formatINR.
const INR = { style: "currency", currency: "INR", maximumFractionDigits: 0 } as const;

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

  const reduce = useReducedMotion();
  const toggle = (r: Role) => setSelected((s) => (s.includes(r) ? s.filter((x) => x !== r) : [...s, r]));
  const bundleAmount = selected.length ? bundlePrice(pricing, selected.length) : 0;
  // Bundling saves against buying the same categories one at a time.
  const savings = selected.length >= 2 ? Math.max(0, selected.length * pricing.cat1 - bundleAmount) : 0;
  const buyable = ROLES.filter((r) => !owned.includes(r.id) && !allAccess).map((r) => r.id);
  const allPicked = buyable.length > 0 && buyable.every((r) => selected.includes(r));

  const perCourseIncludes = [
    "One year of access to the topic",
    "LEAP AI tutor & checkpoints",
    "Class notes, transcripts & resources",
    "Certificate-ready progress tracking",
  ];

  return (
    // overflow-x-clip: the sideways entrances would otherwise widen the page mid-animation.
    <div className="app-v2 min-h-screen overflow-x-clip bg-surface font-sans text-heading">
      {/* Momentum scrolling, as on the home page. */}
      <SmoothScroll />
      <SiteNav />

      <section className="mx-auto max-w-7xl px-5 pb-12 pt-14 text-center sm:px-8 lg:pt-20">
        <Reveal>
          <SectionHead
            center
            as="h1"
            tag="Pricing"
            title="Simple, transparent pricing"
            text="Buy a single topic, unlock a whole category, or get everything with the All-Access Pass."
          />
        </Reveal>
        {allAccess && (
          <Reveal delay={0.1}>
            <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full bg-lv-orgs-tint px-4 py-2 text-sm font-semibold text-lv-orgs-dark">
              <ShieldCheck className="h-4 w-4" /> Your All-Access Pass is active
            </div>
          </Reveal>
        )}
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-20 sm:px-8">
        <Stagger className="grid items-start gap-5 md:grid-cols-2" gap={0.12}>
          {/* Per-topic */}
          <StaggerItem>
            <div className={cn(CARD, "group p-8 transition-all duration-300 ease-out-expo hover:-translate-y-1 hover:shadow-v2-lift")}>
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
              <Link href="/courses" className={v2Button("outline", "md", "group/cta mt-6 w-full")}>
                Browse topics <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out-expo group-hover/cta:translate-x-1" />
              </Link>
              <ul className="mt-6 space-y-3 text-sm text-v2-body">
                {perCourseIncludes.map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-v2-gold-soft text-v2-gold-text transition-transform duration-300 ease-out-expo group-hover:scale-110">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </StaggerItem>

          {/* Category pass / bundle */}
          <StaggerItem>
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
              {buyable.length > 1 && (
                <button
                  type="button"
                  onClick={() => setSelected(allPicked ? [] : buyable)}
                  className="mt-3 text-xs font-semibold text-v2-gold-text underline-offset-2 hover:underline"
                >
                  {allPicked ? "Clear selection" : buyable.length === 3 ? "Select all three (All-Access)" : "Select all remaining"}
                </button>
              )}

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
                            "grid h-5 w-5 place-items-center rounded-full border-[1.5px] transition-colors duration-200",
                            on ? "border-[#E9B93E] bg-[#E9B93E] text-navy-800" : "border-v2-line-strong",
                          )}
                        >
                          <AnimatePresence initial={false}>
                            {on && (
                              <motion.span
                                initial={reduce ? false : { scale: 0, rotate: -45 }}
                                animate={{ scale: 1, rotate: 0 }}
                                exit={reduce ? undefined : { scale: 0 }}
                                transition={{ type: "spring", stiffness: 500, damping: 26 }}
                                className="grid place-items-center"
                              >
                                <Check className="h-3 w-3" strokeWidth={3} />
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="mt-5 font-heading text-display-sm font-bold leading-none text-heading">
                {/* Rolls to the new total as categories are picked. */}
                <NumberFlow value={selected.length ? bundleAmount : pricing.cat1} format={INR} locales="en-IN" animated={!reduce} />
                <span className="font-sans text-sm font-medium tracking-normal text-muted">
                  {" "}
                  {selected.length >= 3 ? "· all categories" : selected.length === 2 ? "· 2 categories" : "/ category"}
                </span>
              </p>
              <div className="mt-2 min-h-6">
                <AnimatePresence initial={false}>
                  {savings > 0 && (
                    <motion.span
                      key="save"
                      initial={reduce ? false : { opacity: 0, y: 6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={reduce ? undefined : { opacity: 0, y: -4 }}
                      transition={{ duration: 0.3, ease: EASE }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-lv-orgs-tint px-3 py-1 text-xs font-semibold text-lv-orgs-dark"
                    >
                      <Sparkles className="h-3.5 w-3.5" /> You save {formatINR(savings)} vs. one at a time
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

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
                <Link href="/signup" className={v2Button("primary", "md", "group/cta mt-5 w-full")}>
                  Start your journey <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out-expo group-hover/cta:translate-x-1" />
                </Link>
              )}
            </div>
          </StaggerItem>
        </Stagger>

        {/* FAQ: questions open one at a time */}
        <Reveal className="mx-auto mt-16 max-w-3xl">
          <h2 className="text-center font-heading text-2xl font-bold tracking-[-0.015em] text-heading">Frequently asked questions</h2>
          <div className="mt-6">
            <FaqList items={faqs} defaultOpen={faqs[0].id} />
          </div>
        </Reveal>
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

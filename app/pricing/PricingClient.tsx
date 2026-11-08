"use client";

import * as React from "react";
import Link from "next/link";
import NumberFlow from "@number-flow/react";
import { ArrowRight, BookOpen, Check, Crown, Layers, Minus, ShieldCheck, Sparkles, Wand2 } from "lucide-react";
import { SiteNav } from "@/components/marketing/SiteNav";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { CARD, SectionHead, Tag } from "@/components/marketing/SectionHead";
import { FaqList } from "@/components/marketing/FaqList";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { v2Button } from "@/components/v2/button";
import { CheckoutModal } from "@/components/CheckoutModal";
import { useApp } from "@/lib/store/AppProvider";
import { Role, ROLES, bundlePrice, courseCategories, upgradePrice, PricingTiers } from "@/lib/types";
import { activeCategories } from "@/lib/access";
import { cn, formatINR } from "@/lib/utils";

const faqs = [
  { q: "Can I buy more categories later?", a: "Yes. Buy one category now and add others any time; you pay only the difference. Owning all three is the All-Access Pass." },
  { q: "What does a category pass include?", a: "Every coaching topic in that category, current and future, plus the LEAP AI tutor and AI-graded checkpoints." },
  { q: "Do I get the LEAP Coach AI tutor on every plan?", a: "Yes. The AI tutor and AI-graded checkpoints are included with every enrolled topic." },
  { q: "How long does access last?", a: "Every purchase gives one full year of access from the day you buy it." },
  { q: "What payment methods are supported?", a: "UPI, cards, and netbanking via Razorpay." },
];

// Animated rupee amounts.
const INR = { style: "currency", currency: "INR", maximumFractionDigits: 0 } as const;
const Price = ({ value, className }: { value: number; className?: string }) => (
  <NumberFlow value={value} format={INR} locales="en-IN" className={className} />
);

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
  const planRef = React.useRef<HTMLDivElement>(null);

  const paid = courses.filter((c) => c.price > 0 && c.published);
  const minPrice = paid.length ? Math.min(...paid.map((c) => c.price)) : 0;
  // Admin-set "starting from" price wins; fall back to the cheapest paid topic.
  const fromPrice = pricing.perTopicFrom || minPrice;
  const isLearner = hydrated && currentUser && !currentUser.isAdmin;
  // Only ACTIVE catalogs show as owned — a lapsed one is buyable again (access is 1-year).
  const owned = [...activeCategories(currentUser)];
  const allAccess = owned.length >= 3;

  const toggle = (r: Role) => setSelected((s) => (s.includes(r) ? s.filter((x) => x !== r) : [...s, r]));
  const bundleAmount = selected.length ? bundlePrice(pricing, selected.length) : pricing.cat1;
  // Paying the difference when the learner already holds a pass.
  const payNow = selected.length && owned.length ? upgradePrice(pricing, owned.length, selected.length) : bundleAmount;
  // What the same categories would cost as separate single-category passes.
  const separately = selected.length * pricing.cat1;
  const saving = selected.length > 1 ? Math.max(0, separately - bundleAmount) : 0;

  /** The plan finder hands its suggestion to the pass card and brings it into view. */
  function choosePaths(paths: Role[]) {
    setSelected(paths.filter((p) => !owned.includes(p)));
    planRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const perCourseIncludes = [
    "One year of access to the topic",
    "LEAP AI tutor & checkpoints",
    "Class notes, transcripts & resources",
    "Certificate-ready progress tracking",
  ];

  return (
    <div className="app-v2 min-h-screen overflow-x-clip bg-surface font-sans text-heading">
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
          <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full bg-lv-orgs-tint px-4 py-2 text-sm font-semibold text-lv-orgs-dark">
            <ShieldCheck className="h-4 w-4" /> Your All-Access Pass is active
          </div>
        )}
        <Reveal delay={0.1} className="mt-6 flex flex-wrap justify-center gap-2">
          <a href="#finder" className={v2Button("outline", "sm", "group")}>
            <Wand2 className="h-3.5 w-3.5" /> Help me choose
          </a>
          <a href="#compare" className={v2Button("ghost", "sm")}>
            Compare plans
          </a>
        </Reveal>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-16 sm:px-8">
        <Stagger className="grid items-start gap-5 md:grid-cols-2" gap={0.1}>
          {/* Per-topic */}
          <StaggerItem>
            <div className={cn(CARD, "p-8 transition-all duration-300 ease-out-expo hover:-translate-y-1 hover:shadow-v2-lift")}>
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
              <Link href="/courses" className={v2Button("outline", "md", "group mt-6 w-full")}>
                Browse topics <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out-expo group-hover:translate-x-1" />
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
          </StaggerItem>

          {/* Category pass / bundle */}
          <StaggerItem>
            <div ref={planRef} id="plans" className="relative scroll-mt-28 rounded-[24px] bg-card p-8 shadow-v2-lift ring-2 ring-[#E9B93E] transition-transform duration-300 ease-out-expo hover:-translate-y-1">
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
                  const count = courses.filter((c) => c.published && courseCategories(c).includes(r.id)).length;
                  return (
                    <button
                      key={r.id}
                      onClick={() => toggle(r.id)}
                      disabled={ownedAlready}
                      aria-pressed={on}
                      className={cn(
                        "flex w-full items-center justify-between rounded-[14px] border px-4 py-3 text-left text-sm transition-all duration-200",
                        ownedAlready
                          ? "cursor-default border-lv-orgs bg-lv-orgs-tint text-lv-orgs-dark"
                          : on
                            ? "border-[#E9B93E] bg-v2-gold-soft text-heading ring-1 ring-[#E9B93E]"
                            : "border-v2-line-strong text-heading hover:-translate-y-px hover:border-heading",
                      )}
                    >
                      <span>
                        <span className="block font-medium">{r.label}</span>
                        {count > 0 && <span className="block text-xs text-muted">{count} {count === 1 ? "topic" : "topics"} today, plus every new one</span>}
                      </span>
                      {ownedAlready ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold">
                          <Check className="h-3.5 w-3.5" /> Owned
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "grid h-5 w-5 shrink-0 place-items-center rounded-full border-[1.5px] transition-colors duration-200",
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
                <Price value={owned.length && selected.length ? payNow : bundleAmount} />
                <span className="font-sans text-sm font-medium tracking-normal text-muted">
                  {" "}
                  {owned.length && selected.length
                    ? "· the difference from your pass"
                    : selected.length >= 3
                      ? "· all categories"
                      : selected.length === 2
                        ? "· 2 categories"
                        : "/ category"}
                </span>
              </p>
              <p aria-live="polite" className="mt-2 min-h-5 text-sm font-semibold text-lv-orgs-dark">
                {saving > 0 && (
                  <>
                    You save {formatINR(saving)} compared with {selected.length} separate passes
                  </>
                )}
              </p>

              {allAccess ? (
                <button type="button" disabled className={v2Button("primary", "md", "mt-3 w-full")}>
                  <Check className="h-4 w-4" /> You have All-Access
                </button>
              ) : isLearner ? (
                <button
                  type="button"
                  onClick={() => setCheckoutBundle(selected)}
                  disabled={selected.length === 0}
                  className={v2Button("primary", "md", "mt-3 w-full")}
                >
                  {selected.length === 0
                    ? "Select a category"
                    : `Get ${selected.length + owned.length >= 3 ? "All-Access" : `${selected.length}-category pass`}`}
                </button>
              ) : (
                <Link href="/signup" className={v2Button("primary", "md", "mt-3 w-full")}>
                  Start your journey
                </Link>
              )}
            </div>
          </StaggerItem>
        </Stagger>
      </section>

      {/* ── Which plan fits? ── */}
      <section id="finder" className="mx-auto max-w-5xl scroll-mt-24 px-5 pb-16 sm:px-8">
        <Reveal>
          <PlanFinder pricing={pricing} owned={owned} defaultPath={currentUser?.role ?? null} onChoose={choosePaths} />
        </Reveal>
      </section>

      {/* ── Compare ── */}
      <section id="compare" className="mx-auto max-w-5xl scroll-mt-24 px-5 pb-16 sm:px-8">
        <Reveal>
          <h2 className="text-center font-heading text-2xl font-bold tracking-[-0.015em] text-heading">Compare plans</h2>
          <p className="mt-2 text-center text-sm text-v2-body">Every plan includes the professor&rsquo;s lessons and the LEAP AI tutor.</p>
        </Reveal>
        <Reveal delay={0.1}>
          <CompareTable pricing={pricing} fromPrice={fromPrice} />
        </Reveal>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-5 pb-20 sm:px-8">
        <Reveal>
          <h2 className="text-center font-heading text-2xl font-bold tracking-[-0.015em] text-heading">Frequently asked questions</h2>
        </Reveal>
        <Reveal delay={0.1} className="mt-6">
          <FaqList items={faqs.map((f, i) => ({ id: `pricing-faq-${i}`, question: f.q, answer: f.a }))} defaultOpen="pricing-faq-0" />
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

/**
 * "Which plan fits?": pick paths and how many topics you want this year; it
 * compares buying them one by one (at the real average price of those topics)
 * with a category pass, and says which is cheaper and from how many topics a
 * pass pays off.
 */
function PlanFinder({
  pricing,
  owned,
  defaultPath,
  onChoose,
}: {
  pricing: PricingTiers;
  owned: Role[];
  defaultPath: Role | null;
  onChoose: (paths: Role[]) => void;
}) {
  const { courses } = useApp();
  const [paths, setPaths] = React.useState<Role[]>(() => [defaultPath ?? "professional"]);
  const [wanted, setWanted] = React.useState(4);

  const inPaths = courses.filter((c) => c.published && courseCategories(c).some((r) => paths.includes(r)));
  const paidInPaths = inPaths.filter((c) => c.price > 0);
  // The real average price of these paths' paid topics; topics that are all free
  // cost nothing one by one; with no topics listed yet, the advertised starting price.
  const avg = paidInPaths.length
    ? Math.round(paidInPaths.reduce((s, c) => s + c.price, 0) / paidInPaths.length)
    : inPaths.length
      ? 0
      : pricing.perTopicFrom || 0;
  const maxTopics = Math.max(8, inPaths.length);
  const topics = Math.min(wanted, maxTopics);
  const oneByOne = topics * avg;
  const pass = paths.length ? bundlePrice(pricing, paths.length) : 0;
  const passWins = pass > 0 && pass < oneByOne;
  const breakEven = avg > 0 ? Math.ceil(pass / avg) : 0;
  const top = Math.max(oneByOne, pass, 1);
  const togglePath = (r: Role) => setPaths((p) => (p.includes(r) ? (p.length > 1 ? p.filter((x) => x !== r) : p) : [...p, r]));

  return (
    <div className={cn(CARD, "p-7 sm:p-9")}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Tag>
            <Wand2 className="h-3 w-3" /> Plan finder
          </Tag>
          <h2 className="mt-3 font-heading text-2xl font-bold tracking-[-0.015em] text-heading">Which plan fits you?</h2>
          <p className="mt-1 text-sm text-v2-body">Tell us what you want to learn this year; we work out the cheaper way.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold text-heading">Your paths</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {ROLES.map((r) => {
                const on = paths.includes(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => togglePath(r.id)}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-200",
                      on ? "border-transparent bg-v2-strong text-v2-on-strong" : "border-v2-line-strong text-heading hover:border-heading",
                    )}
                  >
                    {on && <Check className="mr-1 inline h-3.5 w-3.5" strokeWidth={3} />}
                    {r.label}
                    {owned.includes(r.id) && <span className="ml-1 text-xs opacity-75">(owned)</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="topics-wanted" className="flex items-baseline justify-between text-sm font-semibold text-heading">
              Topics you want this year
              <span className="font-heading text-2xl font-bold tabular-nums">
                <NumberFlow value={topics} />
              </span>
            </label>
            <input
              id="topics-wanted"
              type="range"
              min={1}
              max={maxTopics}
              value={topics}
              onChange={(e) => setWanted(Number(e.target.value))}
              className="mt-3 w-full accent-[#E9B93E]"
            />
            <p className="mt-1 text-xs text-muted">
              {inPaths.length > 0
                ? `${inPaths.length} ${inPaths.length === 1 ? "topic is" : "topics are"} in ${paths.length === 1 ? "this path" : "these paths"} today${avg ? `, at about ${formatINR(avg)} each` : ", free to start"}.`
                : avg
                  ? `Single topics start at about ${formatINR(avg)} each.`
                  : "New topics for this path are on the way."}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {[
            { label: `${topics} ${topics === 1 ? "topic" : "topics"} one by one`, amount: oneByOne, win: !passWins, look: "bg-lv-peers" },
            {
              label: `${paths.length === 3 ? "All-Access Pass" : `${paths.length}-category pass`} · every topic`,
              amount: pass,
              win: passWins,
              look: "bg-[#E9B93E]",
            },
          ].map((row) => (
            <div key={row.label}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className={cn("font-medium", row.win ? "text-heading" : "text-muted")}>
                  {row.label}
                  {row.win && (
                    <span className="ml-2 rounded-full bg-lv-orgs-tint px-2 py-0.5 text-[11px] font-bold text-lv-orgs-dark">Cheaper</span>
                  )}
                </span>
                <Price value={row.amount} className="font-heading text-lg font-bold tabular-nums text-heading" />
              </div>
              <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-surface-2">
                <div className={cn("h-full rounded-full transition-[width] duration-700 ease-out-expo", row.look)} style={{ width: `${(row.amount / top) * 100}%` }} />
              </div>
            </div>
          ))}

          <div className="rounded-2xl bg-surface p-4 text-sm leading-6 text-heading">
            {passWins ? (
              <>
                The pass is <span className="font-semibold">{formatINR(oneByOne - pass)} cheaper</span>, and every topic added to{" "}
                {paths.length === 1 ? "this path" : "these paths"} during the year is included.
              </>
            ) : avg ? (
              <>
                For {topics} {topics === 1 ? "topic" : "topics"}, buying one by one is cheaper. A pass pays off from about{" "}
                <span className="font-semibold">{breakEven} topics</span>.
              </>
            ) : (
              <>The topics in {paths.length === 1 ? "this path" : "these paths"} are free to start.</>
            )}
          </div>

          {passWins ? (
            <button type="button" onClick={() => onChoose(paths)} className={v2Button("primary", "md", "group w-full")}>
              Choose {paths.length === 3 ? "All-Access" : "these paths"}
              <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out-expo group-hover:translate-x-1" />
            </button>
          ) : (
            <Link href="/courses" className={v2Button("outline", "md", "group w-full")}>
              Browse topics <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out-expo group-hover:translate-x-1" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

type Cell = boolean | string;

/** Features by plan; hovering a column lights it up. */
function CompareTable({ pricing, fromPrice }: { pricing: PricingTiers; fromPrice: number }) {
  const [col, setCol] = React.useState<number | null>(null);
  const plans = [
    { name: "Per-Topic", price: fromPrice ? `from ${formatINR(fromPrice)}` : "Free" },
    { name: "Category Pass", price: `${formatINR(bundlePrice(pricing, 1))} / category` },
    { name: "All-Access", price: formatINR(bundlePrice(pricing, 3)) },
  ];
  const rows: { label: string; cells: Cell[] }[] = [
    { label: "Video lessons by the professor", cells: [true, true, true] },
    { label: "LEAP AI tutor on every video", cells: [true, true, true] },
    { label: "AI-graded checkpoints and feedback", cells: [true, true, true] },
    { label: "Class notes, transcripts & resources", cells: [true, true, true] },
    { label: "Topics included", cells: ["The one you buy", "Every topic in your categories", "Every topic in all three"] },
    { label: "New topics added during the year", cells: [false, true, true] },
    { label: "Upgrade later by paying the difference", cells: [false, true, "Already everything"] },
    { label: "Access", cells: ["1 year", "1 year", "1 year"] },
  ];
  const lit = (i: number) => col === i;

  return (
    <div className={cn(CARD, "mt-6 overflow-x-auto")} onMouseLeave={() => setCol(null)}>
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-hair">
            <th className="w-[34%] px-5 py-4 font-medium text-muted">Plan</th>
            {plans.map((p, i) => (
              <th key={p.name} onMouseEnter={() => setCol(i)} className={cn("px-4 py-4 transition-colors duration-200", lit(i) && "bg-v2-gold-soft", i === 1 && "text-v2-gold-text")}>
                <span className="block font-heading text-base font-semibold text-heading">{p.name}</span>
                <span className="block text-xs font-medium text-muted">{p.price}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-hair">
          {rows.map((r) => (
            <tr key={r.label} className="transition-colors duration-150 hover:bg-surface/60">
              <td className="px-5 py-3 font-medium text-heading">{r.label}</td>
              {r.cells.map((c, i) => (
                <td key={i} onMouseEnter={() => setCol(i)} className={cn("px-4 py-3 transition-colors duration-200", lit(i) && "bg-v2-gold-soft")}>
                  {c === true ? (
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-lv-orgs-tint text-lv-orgs-dark">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                  ) : c === false ? (
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-surface-2 text-faint">
                      <Minus className="h-3.5 w-3.5" />
                    </span>
                  ) : (
                    <span className="text-v2-body">{c}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Container } from "@/components/marketing/Container";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { buttonClasses } from "@/components/ui/button-variants";
import { bundlePrice, type PricingTiers } from "@/lib/types";
import { formatINR } from "@/lib/utils";

/**
 * Landing-page price summary. `pricing` is the SAME server-fetched value the /pricing
 * page uses (app/page.tsx calls the existing fetchPricing()), so an admin price change
 * shows here too. Checkout itself is untouched — every CTA sends people to /pricing,
 * which owns the category picker and the Razorpay modal.
 */
export function HomePricingTeaser({ pricing }: { pricing: PricingTiers }) {
  // An all-zero row means prices haven't been set in Admin → Plans & Coupons yet.
  // Advertising "₹0 / category" reads as broken, so the section hides until there
  // are real numbers — same self-hiding pattern as the mentors and books strips.
  if (!pricing.cat1 && !pricing.cat3 && !pricing.perTopicFrom) return null;

  const tiers = [
    {
      name: "Per-Topic",
      price: pricing.perTopicFrom ? `from ${formatINR(pricing.perTopicFrom)}` : "Free",
      unit: pricing.perTopicFrom ? "/ topic" : "",
      blurb: "Buy a single coaching topic and keep it for a year.",
      features: [
        "One year of access to the topic",
        "LEAP AI tutor & checkpoints",
        "Class notes, transcripts & resources",
      ],
      cta: "Browse topics",
      href: "/courses",
      featured: false,
    },
    {
      name: "Category Pass",
      price: formatINR(bundlePrice(pricing, 1)),
      unit: "/ category",
      blurb: "Every topic in one category — student, professional, or entrepreneur.",
      features: [
        "All current & future topics in it",
        "LEAP AI tutor on every lesson",
        "AI-graded checkpoints & feedback",
        "Upgrade later by paying the difference",
      ],
      cta: "Choose a category",
      href: "/pricing",
      featured: true,
    },
    {
      name: "All-Access",
      price: formatINR(bundlePrice(pricing, 3)),
      unit: "/ all three",
      blurb: "Every topic across all three categories, at the best rate.",
      features: [
        "Everything in Category Pass",
        "All three categories unlocked",
        "Every future topic we publish",
      ],
      cta: "Get all-access",
      href: "/pricing",
      featured: false,
    },
  ];

  return (
    <section className="bg-surface py-16 sm:py-20">
      <Container width="wide">
        <Reveal className="max-w-2xl">
          <p className="font-heading text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-600">
            Pricing
          </p>
          <h2 className="mt-4 text-balance font-heading text-display font-bold text-heading">
            Pay for what you actually want to learn
          </h2>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-muted">
            One topic, one category, or everything. All prices are one-time, for a full year of
            access.
          </p>
        </Reveal>

        <Stagger className="mt-14 grid items-start gap-6 lg:grid-cols-3" gap={0.1}>
          {tiers.map((t) => (
            <StaggerItem key={t.name} className={t.featured ? "lg:-mt-4" : ""}>
              <div
                className={
                  t.featured
                    ? "relative flex h-full flex-col overflow-hidden rounded-3xl bg-navy-950 p-8 shadow-lift ring-1 ring-navy-800 dark:bg-card dark:ring-hair"
                    : "relative flex h-full flex-col rounded-3xl border border-hair bg-card p-8"
                }
              >
                {t.featured && (
                  <>
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 texture-grain opacity-[0.14] mix-blend-overlay"
                    />
                    <span className="relative mb-5 inline-flex w-fit items-center rounded-full bg-gold-500 px-3 py-1 font-heading text-[11px] font-bold uppercase tracking-[0.1em] text-navy-900">
                      Most popular
                    </span>
                  </>
                )}

                <h3
                  className={`relative font-heading text-lg font-bold ${t.featured ? "text-white" : "text-heading"}`}
                >
                  {t.name}
                </h3>
                <p
                  className={`relative mt-1.5 text-sm leading-relaxed ${t.featured ? "text-cream-100/70" : "text-muted"}`}
                >
                  {t.blurb}
                </p>

                <p className="relative mt-7 flex items-baseline gap-1.5">
                  <span
                    className={`font-heading text-display-sm font-bold leading-none tracking-tight ${t.featured ? "text-white" : "text-heading"}`}
                  >
                    {t.price}
                  </span>
                  {t.unit && (
                    <span className={`text-sm ${t.featured ? "text-cream-100/50" : "text-faint"}`}>
                      {t.unit}
                    </span>
                  )}
                </p>

                <ul className="relative mt-7 flex-1 space-y-3">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check
                        className={`mt-0.5 h-4 w-4 shrink-0 ${t.featured ? "text-gold-400" : "text-gold-600"}`}
                        strokeWidth={2.5}
                      />
                      <span
                        className={`text-sm leading-relaxed ${t.featured ? "text-cream-100/85" : "text-muted"}`}
                      >
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={t.href}
                  className={buttonClasses({
                    variant: t.featured ? "primary" : "outline",
                    size: "lg",
                    className: "group relative mt-8 w-full",
                  })}
                >
                  {t.cta}
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out-expo group-hover:translate-x-1" />
                </Link>
              </div>
            </StaggerItem>
          ))}
        </Stagger>

        <Reveal className="mt-8">
          <p className="text-center text-sm text-muted">
            Already own a category?{" "}
            <Link href="/pricing" className="font-semibold text-gold-700 hover:text-gold-600">
              Upgrade by paying only the difference
            </Link>
            .
          </p>
        </Reveal>
      </Container>
    </section>
  );
}

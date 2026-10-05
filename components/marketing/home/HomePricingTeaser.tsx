import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Container } from "@/components/marketing/Container";
import { SectionHead } from "@/components/marketing/SectionHead";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { v2Button } from "@/components/v2/button";
import { bundlePrice, type PricingTiers } from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";

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
    <section className="py-16 sm:py-20">
      <Container width="wide">
        <Reveal>
          <SectionHead
            tag="Pricing"
            title="Pay for what you actually want to learn"
            text="One topic, one category, or everything. All prices are one-time, for a full year of access."
          />
        </Reveal>

        <Stagger className="mt-12 grid items-start gap-5 lg:grid-cols-3" gap={0.1}>
          {tiers.map((t) => (
            <StaggerItem key={t.name} className={t.featured ? "lg:-mt-4" : ""}>
              <div
                className={cn(
                  "relative flex h-full flex-col overflow-hidden rounded-[24px] p-8",
                  t.featured ? "bg-v2-navy shadow-v2-lift" : "bg-card shadow-v2-card",
                )}
              >
                {t.featured && (
                  <>
                    <span aria-hidden className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-gold-400/15" />
                    <span className="relative mb-5 inline-flex w-fit items-center rounded-full bg-[#E9B93E] px-3 py-1.5 text-xs font-semibold text-navy-800">
                      Most popular
                    </span>
                  </>
                )}

                <h3 className={cn("relative font-heading text-xl font-semibold tracking-[-0.01em]", t.featured ? "text-white" : "text-heading")}>
                  {t.name}
                </h3>
                <p className={cn("relative mt-1.5 text-sm leading-5", t.featured ? "text-v2-on-navy-muted" : "text-v2-body")}>
                  {t.blurb}
                </p>

                <p className="relative mt-7 flex items-baseline gap-1.5">
                  {/* Not through `cn`: it would drop `text-display-sm` in favour of the colour class. */}
                  <span className={`font-heading text-display-sm font-bold leading-none ${t.featured ? "text-white" : "text-heading"}`}>
                    {t.price}
                  </span>
                  {t.unit && (
                    <span className={cn("text-sm font-medium", t.featured ? "text-v2-on-navy-muted" : "text-muted")}>
                      {t.unit}
                    </span>
                  )}
                </p>

                <ul className="relative mt-7 flex-1 space-y-3">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <span
                        className={cn(
                          "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full",
                          t.featured ? "bg-white/10 text-gold-400" : "bg-v2-gold-soft text-v2-gold-text",
                        )}
                      >
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      <span className={cn("text-sm leading-5", t.featured ? "text-white" : "text-v2-body")}>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link href={t.href} className={v2Button(t.featured ? "primary" : "outline", "md", "group relative mt-8 w-full")}>
                  {t.cta}
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out-expo group-hover:translate-x-1" />
                </Link>
              </div>
            </StaggerItem>
          ))}
        </Stagger>

        <Reveal className="mt-8">
          <p className="text-center text-sm text-v2-body">
            Already own a category?{" "}
            <Link href="/pricing" className="font-semibold text-v2-gold-text hover:underline">
              Upgrade by paying only the difference
            </Link>
            .
          </p>
        </Reveal>
      </Container>
    </section>
  );
}

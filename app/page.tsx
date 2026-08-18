import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteNav } from "@/components/marketing/SiteNav";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { Container } from "@/components/marketing/Container";
import { Reveal } from "@/components/motion/Reveal";
import { HomeHero } from "@/components/marketing/HomeHero";
import { HomePaths } from "@/components/marketing/HomePaths";
import { HomeHowItWorks } from "@/components/marketing/HomeHowItWorks";
import { FeaturedCourses } from "@/components/marketing/FeaturedCourses";
import { HomeStats } from "@/components/marketing/HomeStats";
import { HomeMentors } from "@/components/marketing/HomeMentors";
import { HomeProfessor } from "@/components/marketing/HomeProfessor";
import { HomeTestimonials } from "@/components/marketing/HomeTestimonials";
import { HomeBooks } from "@/components/marketing/HomeBooks";
import { HomePricingTeaser } from "@/components/marketing/HomePricingTeaser";
import { HomeFaq } from "@/components/marketing/HomeFaq";
import { HomeCta } from "@/components/marketing/HomeCta";
import { buttonClasses } from "@/components/ui/button-variants";
import { fetchSiteContentServer } from "@/lib/supabase/server";
import { fetchPricing } from "@/lib/payments/pricing";

// ISR: regenerate the landing periodically so admin homepage edits appear (within
// ~30s) for fresh visitors, while staying fast/cached under load. In-session admins
// see their edits live via the client store.
export const revalidate = 30;

export default async function Home() {
  // Both read on the server so the hero and the price teaser render real values in the
  // initial HTML (no flash of defaults before the client store hydrates). These are the
  // same functions /pricing and the admin editor already use — unchanged.
  const [initialContent, pricing] = await Promise.all([
    fetchSiteContentServer(),
    fetchPricing(),
  ]);

  return (
    // overflow-x-hidden because the horizontal <Reveal> entrances translate up to
    // 34px sideways; without it, elements near the viewport edge widen the document
    // mid-animation and flash a horizontal scrollbar. The nav is fixed here, so this
    // doesn't interfere with any sticky positioning.
    <div className="min-h-screen overflow-x-hidden bg-surface">
      {/* Momentum scrolling + smoothed #anchor jumps, marketing pages only. */}
      <SmoothScroll />
      <SiteNav overlay />

      <main>
        {/* ── Hero (admin-editable) ── */}
        <HomeHero initialContent={initialContent} />

        {/* ── Three learning paths ── */}
        <HomePaths />

        {/* ── How it works + capabilities ── */}
        <HomeHowItWorks />

        {/* ── Featured programs ── */}
        <section className="bg-surface py-20 sm:py-28">
          <Container width="wide">
            <Reveal className="flex flex-wrap items-end justify-between gap-6">
              <div className="max-w-xl">
                <p className="font-heading text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-600">
                  Featured programs
                </p>
                <h2 className="mt-4 text-balance font-heading text-display font-bold text-heading">
                  Learn from the best minds
                </h2>
              </div>
              <Link
                href="/courses"
                className={buttonClasses({ variant: "outline", size: "md", className: "group" })}
              >
                View all topics
                <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out-expo group-hover:translate-x-1" />
              </Link>
            </Reveal>

            <FeaturedCourses />
          </Container>
        </section>

        {/* ── Platform numbers (admin-editable) ── */}
        <HomeStats initialContent={initialContent} />

        {/* ── Mentors strip (admin-editable, hidden until featured mentors added) ── */}
        <HomeMentors />

        {/* ── Professor spotlight + achievements + pull quote ── */}
        <HomeProfessor />

        {/* ── Testimonials (hidden until real quotes land in lib/testimonials.ts) ── */}
        <HomeTestimonials />

        {/* ── Books (admin-editable, hidden until books added) ── */}
        <HomeBooks />

        {/* ── Pricing teaser (live Supabase prices) ── */}
        <HomePricingTeaser pricing={pricing} />

        {/* ── FAQ (hidden until published FAQs exist) ── */}
        <HomeFaq />

        {/* ── Final CTA ── */}
        <HomeCta />
      </main>

      <SiteFooter />
    </div>
  );
}

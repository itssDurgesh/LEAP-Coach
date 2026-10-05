import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { Container } from "@/components/marketing/Container";
import { SectionHead } from "@/components/marketing/SectionHead";
import { Reveal } from "@/components/motion/Reveal";
import { HomeHero } from "@/components/marketing/home/HomeHero";
import { HomeStory } from "@/components/marketing/home/HomeStory";
import { HomeHowItWorks } from "@/components/marketing/home/HomeHowItWorks";
import { FeaturedCourses } from "@/components/marketing/home/FeaturedCourses";
import { HomeStats } from "@/components/marketing/home/HomeStats";
import { HomeMentors } from "@/components/marketing/home/HomeMentors";
import { HomeProfessor } from "@/components/marketing/home/HomeProfessor";
import { HomeTestimonials } from "@/components/marketing/home/HomeTestimonials";
import { HomeBooks } from "@/components/marketing/home/HomeBooks";
import { HomePricingTeaser } from "@/components/marketing/home/HomePricingTeaser";
import { HomeFaq } from "@/components/marketing/home/HomeFaq";
import { HomeCta } from "@/components/marketing/home/HomeCta";
import { v2Button } from "@/components/v2/button";
import { fetchSiteContentServer } from "@/lib/supabase/server";
import { fetchPricing } from "@/lib/payments/pricing";

// ISR: the landing awaits two Supabase round-trips (site content + pricing), so
// every regeneration makes one visitor pay both queries plus a cold start — which
// is what drove TTFB on `/`. Site content changes rarely, so 10 minutes trades a
// little staleness for far fewer slow first-bytes. Admins still see their own
// edits live via the client store, and /pricing stays force-dynamic.
export const revalidate = 600;

export default async function Home() {
  // Both read on the server so the hero and the price teaser render real values in the
  // initial HTML (no flash of defaults before the client store hydrates). These are the
  // same functions /pricing and the admin editor already use — unchanged.
  const [initialContent, pricing] = await Promise.all([
    fetchSiteContentServer(),
    fetchPricing(),
  ]);

  return (
    // `app-v2` gives the page the version 2 colours and fonts (see globals.css).
    // overflow-x-clip because the horizontal <Reveal> entrances translate up to 34px
    // sideways; without it, elements near the viewport edge widen the document
    // mid-animation and flash a horizontal scrollbar. It must be `clip`, not
    // `hidden`: `hidden` turns this box into a scroll container, and the scroll
    // story's stage could then no longer hold still (position: sticky).
    <div className="app-v2 min-h-screen overflow-x-clip bg-surface font-sans text-heading">
      {/* Momentum scrolling + smoothed #anchor jumps, marketing pages only. */}
      <SmoothScroll />

      <main>
        {/* ── Opening, menu bar and hero (words are admin-editable) ── */}
        <HomeHero initialContent={initialContent} />

        {/* ── How it works: three scenes, including the three learning paths ── */}
        <HomeStory />

        {/* ── What you get ── */}
        <HomeHowItWorks />

        {/* ── Featured programs ── */}
        <section className="py-16 sm:py-20">
          <Container width="wide">
            <Reveal className="flex flex-wrap items-end justify-between gap-6">
              <SectionHead tag="Featured programs" title="Learn from the best minds" />
              <Link href="/courses" className={v2Button("outline", "md", "group")}>
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

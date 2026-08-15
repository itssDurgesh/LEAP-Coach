import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteNav } from "@/components/marketing/SiteNav";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { TeamDirectory } from "@/components/marketing/TeamDirectory";
import { buttonClasses } from "@/components/ui/button-variants";

export const metadata = {
  title: "Our Team | LEAP Coach",
  description:
    "Meet the mentors, researchers, and coaches behind LEAP Coach, led by Prof. Vishal Gupta of IIM Ahmedabad.",
};

export default function TeamPage() {
  return (
    <div className="min-h-screen bg-surface">
      <SiteNav overlay />

      {/* ── Header ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-navy-900 via-navy-900 to-navy-950 dark:from-card dark:via-card dark:to-surface">
        <div className="pointer-events-none absolute -top-24 right-0 h-96 w-96 rounded-full bg-gold-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 top-44 h-80 w-80 rounded-full bg-navy-600/40 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-5 py-20 text-center sm:px-8 lg:py-24">
          <p className="font-heading text-sm font-semibold uppercase tracking-[0.16em] text-gold-400">
            Our Team
          </p>
          <h1 className="mt-4 font-heading text-4xl font-extrabold leading-[1.08] text-white sm:text-5xl">
            The people behind <span className="text-gradient-gold">LEAP</span>
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-cream-100/80">
            Mentors, researchers, and coaches dedicated to building high-performance stars, guided by
            decades of research and a commitment to authentic leadership.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/about" className={buttonClasses({ variant: "primary", size: "lg" })}>
              About LEAP <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/courses"
              className={buttonClasses({
                variant: "outline",
                size: "lg",
                className: "border-white/30 bg-transparent text-white hover:bg-card/10",
              })}
            >
              Explore Topics
            </Link>
          </div>
        </div>
      </section>

      <TeamDirectory />

      <SiteFooter />
    </div>
  );
}

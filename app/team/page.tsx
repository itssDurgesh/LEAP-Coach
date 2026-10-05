import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteNav } from "@/components/marketing/SiteNav";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { TeamDirectory } from "@/components/marketing/TeamDirectory";
import { Tag } from "@/components/marketing/SectionHead";
import { v2Button } from "@/components/v2/button";

export const metadata = {
  title: { absolute: "The LEAP Coach Team — Mentors & Coaches" },
  description:
    "Meet the mentors, researchers, and coaches behind LEAP Coach, led by Prof. Vishal Gupta of IIM Ahmedabad.",
  alternates: { canonical: "/team" },
};

export default function TeamPage() {
  return (
    <div className="app-v2 min-h-screen overflow-x-clip bg-surface font-sans text-heading">
      <SiteNav />

      {/* ── Header ── */}
      <section className="relative">
        <span aria-hidden className="absolute -right-12 top-8 h-44 w-44 rounded-full bg-gold-400/20" />
        <span aria-hidden className="absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-lv-self/20" />
        <div className="relative mx-auto max-w-4xl px-5 pb-6 pt-14 text-center sm:px-8 lg:pt-20">
          <Tag>Our Team</Tag>
          <h1 className="mt-5 text-balance font-heading text-display-lg font-bold text-heading">
            The people behind <span className="text-v2-gold-text">LEAP</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-7 text-v2-body">
            Mentors, researchers, and coaches dedicated to building high-performance stars, guided by
            decades of research and a commitment to authentic leadership.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/about" className={v2Button("primary")}>
              About LEAP <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/courses" className={v2Button("outline")}>
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

import Link from "next/link";
import { Check, ExternalLink, Instagram, Linkedin, Youtube } from "lucide-react";
import { Container } from "@/components/marketing/Container";
import { HomeProfessorStats } from "@/components/marketing/home/HomeProfessorStats";
import { ROUND_BUTTON, SectionHead } from "@/components/marketing/SectionHead";
import { ProfessorPhoto } from "@/components/ProfessorPhoto";
import { Reveal } from "@/components/motion/Reveal";
import { v2Button } from "@/components/v2/button";
import { PROFESSOR } from "@/lib/professor";

const socials = [
  { Icon: Linkedin, href: PROFESSOR.links.linkedin, label: "LinkedIn" },
  { Icon: Youtube, href: PROFESSOR.links.youtube, label: "YouTube" },
  { Icon: Instagram, href: PROFESSOR.links.instagram, label: "Instagram" },
];

export function HomeProfessor() {
  return (
    <section id="about" className="py-16 sm:py-20">
      <Container width="wide">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-14">
          {/* ── Portrait ── */}
          <Reveal from="right" className="lg:col-span-5">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              <span aria-hidden className="absolute -left-6 -top-6 h-32 w-32 rounded-full bg-gold-400/25" />
              <span aria-hidden className="absolute -bottom-6 -right-5 h-24 w-24 rounded-full bg-lv-self/25" />
              <ProfessorPhoto
                className="relative aspect-[4/5] w-full shadow-v2-lift"
                rounded="rounded-[28px]"
                position="top"
                sizes="(max-width: 1024px) 90vw, 420px"
              />
            </div>
          </Reveal>

          {/* ── Bio ── */}
          <Reveal from="left" delay={0.1} className="lg:col-span-7">
            <SectionHead tag="Meet your mentor" title="Learn directly from Prof. Vishal Gupta" />
            <p className="mt-3 font-heading text-base font-medium text-v2-gold-text">{PROFESSOR.title}</p>
            <p className="mt-5 max-w-xl text-base leading-7 text-v2-body">{PROFESSOR.bio}</p>

            <ul className="mt-7 grid gap-3 sm:grid-cols-2">
              {PROFESSOR.highlights.map((h) => (
                <li key={h} className="flex items-start gap-3 rounded-2xl bg-card px-4 py-3.5 text-sm leading-5 text-heading shadow-v2-soft">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-v2-gold-soft text-v2-gold-text">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {h}
                </li>
              ))}
            </ul>

            <div className="mt-7 flex flex-wrap items-center gap-2.5">
              {socials.map(({ Icon, href, label }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} className={ROUND_BUTTON}>
                  <Icon className="h-4 w-4" />
                </a>
              ))}
              <Link href="/team" className={v2Button("outline", "md", "ml-1")}>
                Meet the team <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        </div>

        {/* Admin-editable achievement grid */}
        <HomeProfessorStats />

        {/* ── Pull quote ── */}
        <Reveal className="mt-10">
          <figure className="relative overflow-hidden rounded-[28px] bg-v2-navy px-7 py-12 shadow-v2-card sm:px-14 sm:py-16">
            <span aria-hidden className="absolute -bottom-28 -right-16 h-64 w-64 rounded-full bg-gold-400/15" />
            <span aria-hidden className="block font-heading text-6xl leading-none text-gold-400">
              &ldquo;
            </span>
            <blockquote className="relative mt-1 max-w-4xl text-balance font-heading text-display-sm font-semibold leading-[1.25] text-white">
              The work of a leader is to lead from values — not from fear of judgement.
            </blockquote>
            <figcaption className="relative mt-7 flex items-center gap-3.5">
              <span aria-hidden className="h-0.5 w-8 rounded-full bg-gold-400" />
              <span className="text-sm font-semibold text-v2-on-navy-muted">Prof. Vishal Gupta</span>
            </figcaption>
          </figure>
        </Reveal>
      </Container>
    </section>
  );
}

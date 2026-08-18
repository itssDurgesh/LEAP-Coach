import Link from "next/link";
import { ExternalLink, Instagram, Linkedin, Youtube } from "lucide-react";
import { Container } from "@/components/marketing/Container";
import { HomeProfessorStats } from "@/components/marketing/HomeProfessorStats";
import { ProfessorPhoto } from "@/components/ProfessorPhoto";
import { Reveal } from "@/components/motion/Reveal";
import { buttonClasses } from "@/components/ui/button-variants";
import { PROFESSOR } from "@/lib/professor";

const socials = [
  { Icon: Linkedin, href: PROFESSOR.links.linkedin, label: "LinkedIn" },
  { Icon: Youtube, href: PROFESSOR.links.youtube, label: "YouTube" },
  { Icon: Instagram, href: PROFESSOR.links.instagram, label: "Instagram" },
];

export function HomeProfessor() {
  return (
    <section id="about" className="bg-surface py-20 sm:py-28">
      <Container width="wide">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-14">
          {/* ── Portrait ── */}
          <Reveal from="right" className="lg:col-span-5">
            <div className="relative">
              {/* Offset plate behind the photo — depth from a second plane rather
                  than a blurred glow. */}
              <div
                aria-hidden
                className="absolute -bottom-4 -right-4 h-full w-full rounded-[2rem] border border-gold-300/50 dark:border-gold-500/25"
              />
              <ProfessorPhoto
                className="relative aspect-[4/5] w-full shadow-lift"
                rounded="rounded-[2rem]"
                position="top"
                sizes="(max-width: 1024px) 90vw, 420px"
              />
            </div>
          </Reveal>

          {/* ── Bio ── */}
          <Reveal from="left" delay={0.1} className="lg:col-span-7">
            <p className="font-heading text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-600">
              Meet your mentor
            </p>
            <h2 className="mt-4 text-balance font-heading text-display font-bold text-heading">
              Learn directly from Prof. Vishal Gupta
            </h2>
            <p className="mt-3 font-heading text-base font-medium text-gold-700">
              {PROFESSOR.title}
            </p>
            <p className="mt-6 max-w-xl text-base leading-[1.75] text-muted">{PROFESSOR.bio}</p>

            {/* Credentials as a ruled list — no icon repeated four times. */}
            <ul className="mt-8 border-t border-hair">
              {PROFESSOR.highlights.map((h) => (
                <li
                  key={h}
                  className="border-b border-hair py-3.5 text-sm leading-relaxed text-heading"
                >
                  {h}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap items-center gap-2.5">
              {socials.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  title={label}
                  className="grid h-11 w-11 place-items-center rounded-full border border-hair text-heading transition-all duration-200 hover:border-gold-500 hover:bg-gold-500 hover:text-navy-900"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
              <Link
                href="/team"
                className={buttonClasses({ variant: "outline", size: "md", className: "ml-1" })}
              >
                Meet the team <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        </div>

        {/* Admin-editable achievement grid */}
        <HomeProfessorStats />
      </Container>

      {/* ── Pull quote ──
          Full-bleed dark band at display scale, replacing the gold gradient box. */}
      <Reveal className="mt-20 sm:mt-28">
        <div className="relative overflow-hidden bg-navy-950 py-20 dark:bg-card sm:py-28">
          <div className="pointer-events-none absolute inset-0 texture-grain opacity-[0.16] mix-blend-overlay" aria-hidden />
          <Container width="prose" className="relative">
            <span aria-hidden className="block font-heading text-6xl leading-none text-gold-500">
              &ldquo;
            </span>
            <blockquote className="mt-2 text-balance font-heading text-display-sm font-semibold italic leading-[1.25] text-white">
              The work of a leader is to lead from values — not from fear of judgement.
            </blockquote>
            <figcaption className="mt-8 flex items-center gap-3.5">
              <span className="h-px w-8 bg-gold-500" aria-hidden />
              <span className="font-heading text-sm font-bold uppercase tracking-[0.12em] text-cream-100">
                Prof. Vishal Gupta
              </span>
            </figcaption>
          </Container>
        </div>
      </Reveal>
    </section>
  );
}

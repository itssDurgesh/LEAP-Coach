"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/marketing/Container";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { Avatar } from "@/components/ui/Avatar";
import { buttonClasses } from "@/components/ui/button-variants";
import { useApp } from "@/lib/store/AppProvider";
import { TEAM_GROUPS } from "@/lib/types";

const groupLabel = (g: string) => TEAM_GROUPS.find((x) => x.id === g)?.label ?? g;

export function HomeMentors() {
  const { teamMembers, siteContent } = useApp();
  const c = siteContent;
  // The founder gets a dedicated spotlight section below, so the strip shows the
  // rest of the featured team. It stays hidden until mentors are added.
  const list = teamMembers
    .filter((m) => m.active && m.featured && m.group !== "founder")
    .sort((a, b) => a.order - b.order);

  if (!list.length) return null;

  return (
    <section className="bg-card py-20 sm:py-28">
      <Container width="wide">
        <Reveal className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <p className="font-heading text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-600">
              Our team
            </p>
            <h2 className="mt-4 text-balance font-heading text-display font-bold text-heading">
              {c.mentorsHeading}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted">{c.mentorsSubheading}</p>
          </div>
          <Link href="/team" className={buttonClasses({ variant: "outline", size: "md", className: "group" })}>
            View full team
            <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out-expo group-hover:translate-x-1" />
          </Link>
        </Reveal>

        <Stagger className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4" gap={0.08}>
          {list.map((m) => (
            <StaggerItem key={m.id}>
              <Link
                href="/team"
                className="group flex h-full flex-col rounded-3xl border border-hair bg-surface p-6 transition-all duration-300 ease-out-expo hover:-translate-y-1.5 hover:border-gold-300 hover:shadow-lift"
              >
                <Avatar src={m.photoUrl} name={m.name} size={64} />
                <h3 className="mt-5 font-heading text-base font-bold text-heading transition-colors duration-200 group-hover:text-gold-700">
                  {m.name}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{m.title}</p>
                <p className="mt-auto pt-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">
                  {groupLabel(m.group)}
                </p>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </section>
  );
}

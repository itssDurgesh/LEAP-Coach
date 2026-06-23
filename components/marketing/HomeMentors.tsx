"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
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
    <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <Badge variant="navy">Our Team</Badge>
          <h2 className="mt-4 font-heading text-3xl font-bold text-heading sm:text-4xl">{c.mentorsHeading}</h2>
          <p className="mt-3 text-muted">{c.mentorsSubheading}</p>
        </div>
        <Link href="/team" className={buttonClasses({ variant: "outline", size: "md" })}>
          View full team <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {list.map((m) => (
          <Link
            key={m.id}
            href="/team"
            className="group rounded-2xl border border-hair bg-card p-6 text-center shadow-card transition-all hover:-translate-y-1 hover:shadow-card-hover"
          >
            <Avatar src={m.photoUrl} name={m.name} size={84} className="mx-auto" />
            <h3 className="mt-4 font-heading font-semibold text-heading">{m.name}</h3>
            <p className="mt-0.5 text-sm text-muted">{m.title}</p>
            <span className="mt-3 inline-block">
              <Badge variant="gold">{groupLabel(m.group)}</Badge>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

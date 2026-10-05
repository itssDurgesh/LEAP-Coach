"use client";

import * as React from "react";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/marketing/Container";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { Avatar } from "@/components/ui/Avatar";
import { CARD, SectionHead, Tag } from "@/components/marketing/SectionHead";
import { V2_AVATAR } from "@/components/v2/ui";
import { v2Button } from "@/components/v2/button";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/store/AppProvider";
import { TEAM_GROUPS } from "@/lib/types";

const groupLabel = (g: string) => TEAM_GROUPS.find((x) => x.id === g)?.label ?? g;

export function HomeMentors() {
  const { teamMembers, siteContent , ensureTeamPhotos } = useApp();

  // Portraits are excluded from the bulk store load (2.4MB of base64 on this
  // project); pull them in only on the surfaces that actually render them.
  React.useEffect(() => {
    void ensureTeamPhotos();
  }, [ensureTeamPhotos]);
  const c = siteContent;
  // The founder gets a dedicated spotlight section below, so the strip shows the
  // rest of the featured team. It stays hidden until mentors are added.
  const list = teamMembers
    .filter((m) => m.active && m.featured && m.group !== "founder")
    .sort((a, b) => a.order - b.order);

  if (!list.length) return null;

  return (
    <section className="py-16 sm:py-20">
      <Container width="wide">
        <Reveal className="flex flex-wrap items-end justify-between gap-6">
          <SectionHead tag="Our team" title={c.mentorsHeading} text={c.mentorsSubheading} />
          <Link href="/team" className={v2Button("outline", "md", "group")}>
            View full team
            <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out-expo group-hover:translate-x-1" />
          </Link>
        </Reveal>

        <Stagger className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4" gap={0.08}>
          {list.map((m) => (
            <StaggerItem key={m.id}>
              <Link
                href="/team"
                className={cn(CARD, "flex h-full flex-col items-start p-6 transition-all duration-300 ease-out-expo hover:-translate-y-1 hover:shadow-v2-lift")}
              >
                <Avatar src={m.photoUrl} name={m.name} size={64} className={V2_AVATAR} />
                <h3 className="mt-5 font-heading text-lg font-semibold tracking-[-0.01em] text-heading">{m.name}</h3>
                <p className="mt-1 pb-5 text-sm leading-5 text-v2-body">{m.title}</p>
                <Tag className="mt-auto">{groupLabel(m.group)}</Tag>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </section>
  );
}

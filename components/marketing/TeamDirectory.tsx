"use client";

import * as React from "react";
import { Linkedin, Youtube, Instagram, Globe, Mail, Compass, LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { useApp } from "@/lib/store/AppProvider";
import { resolveTeam } from "@/lib/team";
import { TEAM_GROUPS, TeamLinks } from "@/lib/types";
import { normalizeExternalUrl } from "@/lib/utils";

/**
 * Bio text clamped to a preview with a "See more"/"See less" toggle. The clamp is
 * deterministic (length-based, no effect), so the server renders the SAME truncated
 * text — the full bio is never flashed before collapsing.
 */
function ClampText({ text, limit = 180, className }: { text: string; limit?: number; className?: string }) {
  const [expanded, setExpanded] = React.useState(false);
  if (!text) return null;
  const needsClamp = text.length > limit;
  let preview = text;
  if (needsClamp && !expanded) {
    const slice = text.slice(0, limit);
    const lastSpace = slice.lastIndexOf(" ");
    preview = (lastSpace > limit * 0.6 ? slice.slice(0, lastSpace) : slice).trimEnd() + "…";
  }
  return (
    <p className={className}>
      {expanded ? text : preview}
      {needsClamp && (
        <>
          {" "}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="font-semibold text-gold-600 hover:text-gold-700"
          >
            {expanded ? "See less" : "See more"}
          </button>
        </>
      )}
    </p>
  );
}

function MemberLinks({ links, align = "center" }: { links?: TeamLinks; align?: "center" | "start" }) {
  if (!links) return null;
  // Normalize every admin-entered URL: a value that isn't absolute would resolve
  // relative to leapcoach.in and 404. Un-fixable values drop out entirely.
  const items = (
    [
      { Icon: Linkedin, href: normalizeExternalUrl(links.linkedin) },
      { Icon: Youtube, href: normalizeExternalUrl(links.youtube) },
      { Icon: Instagram, href: normalizeExternalUrl(links.instagram) },
      { Icon: Globe, href: normalizeExternalUrl(links.site) },
      { Icon: Mail, href: links.email?.trim() ? `mailto:${links.email.trim()}` : null },
    ] as { Icon: LucideIcon; href: string | null }[]
  ).filter((x) => x.href) as { Icon: LucideIcon; href: string }[];
  if (!items.length) return null;
  return (
    <div className={`mt-4 flex flex-wrap gap-2 ${align === "start" ? "justify-start" : "justify-center"}`}>
      {items.map(({ Icon, href }, i) => (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="grid h-9 w-9 place-items-center rounded-xl border border-hair bg-card text-heading transition-colors hover:border-gold-300 hover:text-gold-600"
        >
          <Icon className="h-4 w-4" />
        </a>
      ))}
    </div>
  );
}

const groupLabel = (g: string) => TEAM_GROUPS.find((x) => x.id === g)?.label ?? g;

export function TeamDirectory() {
  const { teamMembers } = useApp();
  const members = resolveTeam(teamMembers)
    .filter((m) => m.active)
    .sort((a, b) => a.order - b.order);

  const founders = members.filter((m) => m.group === "founder");
  const rest = members.filter((m) => m.group !== "founder");
  const grouped = TEAM_GROUPS.filter((g) => g.id !== "founder")
    .map((g) => ({ group: g, items: rest.filter((m) => m.group === g.id) }))
    .filter((x) => x.items.length);

  return (
    <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
      {/* ── Founder(s): the root of the hierarchy ── */}
      <div className="flex flex-col items-center gap-10">
        {founders.map((f) => (
          <div
            key={f.id}
            className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-hair bg-card p-8 text-center shadow-card"
          >
            <Avatar src={f.photoUrl} name={f.name} size={150} className="relative mx-auto ring-4 ring-gold-200" />
            <div className="relative mt-4">
              <Badge variant="gold">{groupLabel(f.group)}</Badge>
            </div>
            <h2 className="relative mt-2 font-heading text-2xl font-bold text-heading sm:text-3xl">{f.name}</h2>
            <p className="relative mt-1 font-medium text-gold-700">{f.title}</p>
            <ClampText text={f.bio} limit={260} className="relative mx-auto mt-4 max-w-xl leading-relaxed text-muted" />
            {f.vision && (
              <div className="relative mx-auto mt-5 flex max-w-xl items-start gap-3 rounded-2xl border border-navy-100 bg-navy-50 p-4 text-left dark:border-hair dark:bg-surface-2">
                <Compass className="mt-0.5 h-5 w-5 shrink-0 text-navy-700 dark:text-gold-500" />
                <p className="text-sm leading-relaxed text-heading">
                  <span className="font-semibold">Vision: </span>
                  {f.vision}
                </p>
              </div>
            )}
            <MemberLinks links={f.links} />
          </div>
        ))}
      </div>

      {/* ── Connector down to the team tiers ── */}
      {grouped.length > 0 && (
        <div className="flex justify-center" aria-hidden>
          <div className="my-10 h-12 w-px bg-gradient-to-b from-gold-300 to-hair" />
        </div>
      )}

      {/* ── Tiers ── */}
      <div className="space-y-14">
        {grouped.map(({ group, items }) => (
          <div key={group.id}>
            <div className="flex justify-center">
              <span className="rounded-full bg-navy-800 px-5 py-1.5 font-heading text-sm font-semibold text-white dark:bg-surface-2 dark:text-heading">
                {group.label}
                {items.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="mt-8 grid justify-items-center gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((m) => (
                <div
                  key={m.id}
                  className="w-full max-w-sm rounded-3xl border border-hair bg-card p-6 text-center shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
                >
                  <Avatar src={m.photoUrl} name={m.name} size={96} className="mx-auto" />
                  <h3 className="mt-4 font-heading text-lg font-semibold text-heading">{m.name}</h3>
                  <p className="mt-0.5 text-sm font-medium text-gold-700">{m.title}</p>
                  <ClampText text={m.bio} limit={160} className="mt-3 text-sm leading-relaxed text-muted" />
                  <MemberLinks links={m.links} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

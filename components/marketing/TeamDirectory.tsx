"use client";

import * as React from "react";
import { Linkedin, Youtube, Instagram, Globe, Mail, Compass, LucideIcon } from "lucide-react";
import { Tag } from "@/components/marketing/SectionHead";
import { Avatar } from "@/components/ui/Avatar";
import { V2_AVATAR } from "@/components/v2/ui";
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
            className="font-semibold text-v2-gold-text hover:underline"
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
          className="grid h-9 w-9 place-items-center rounded-full border border-v2-line-strong bg-card text-heading transition-colors duration-200 hover:border-heading"
        >
          <Icon className="h-4 w-4" />
        </a>
      ))}
    </div>
  );
}

const groupLabel = (g: string) => TEAM_GROUPS.find((x) => x.id === g)?.label ?? g;

export function TeamDirectory() {
  const { teamMembers, hydrated , ensureTeamPhotos } = useApp();

  // Portraits are excluded from the bulk store load (2.4MB of base64 on this
  // project); pull them in only on the surfaces that actually render them.
  React.useEffect(() => {
    void ensureTeamPhotos();
  }, [ensureTeamPhotos]);
  const members = resolveTeam(teamMembers)
    .filter((m) => m.active)
    .sort((a, b) => a.order - b.order);

  const founders = members.filter((m) => m.group === "founder");
  const rest = members.filter((m) => m.group !== "founder");
  const grouped = TEAM_GROUPS.filter((g) => g.id !== "founder")
    .map((g) => ({ group: g, items: rest.filter((m) => m.group === g.id) }))
    .filter((x) => x.items.length);

  // The team list lives in the client store, so before hydration this component
  // renders nothing and then injects a full directory — pushing the footer down by
  // hundreds of pixels. That single reflow is what CLS measures. Holding the space
  // with a same-shaped skeleton means the real cards replace it in place.
  if (!hydrated) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8" aria-hidden>
        <div className="flex flex-col items-center">
          <div className="h-[26rem] w-full max-w-2xl animate-pulse rounded-[24px] bg-surface-2" />
        </div>
        <div className="flex justify-center">
          <div className="my-10 h-12 w-0.5 rounded-full bg-v2-line-strong" />
        </div>
        <div className="space-y-14">
          {[0, 1].map((tier) => (
            <div key={tier}>
              <div className="flex justify-center">
                <div className="h-8 w-40 animate-pulse rounded-full bg-surface-2" />
              </div>
              <div className="mt-8 grid justify-items-center gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-72 w-full max-w-sm animate-pulse rounded-[24px] bg-surface-2"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
      {/* ── Founder(s): the root of the hierarchy ── */}
      <div className="flex flex-col items-center gap-10">
        {founders.map((f) => (
          <div
            key={f.id}
            className="relative w-full max-w-2xl overflow-hidden rounded-[28px] bg-card p-8 text-center shadow-v2-card"
          >
            <Avatar src={f.photoUrl} name={f.name} size={150} className={`relative mx-auto ring-4 ring-v2-gold-soft ${V2_AVATAR}`} />
            <div className="relative mt-4">
              <Tag>{groupLabel(f.group)}</Tag>
            </div>
            <h2 className="relative mt-3 font-heading text-2xl font-bold tracking-[-0.015em] text-heading sm:text-3xl">{f.name}</h2>
            <p className="relative mt-1 font-medium text-v2-gold-text">{f.title}</p>
            <ClampText text={f.bio} limit={260} className="relative mx-auto mt-4 max-w-xl leading-7 text-v2-body" />
            {f.vision && (
              <div className="relative mx-auto mt-5 flex max-w-xl items-start gap-3 rounded-[20px] bg-v2-gold-soft p-4 text-left">
                <Compass className="mt-0.5 h-5 w-5 shrink-0 text-v2-gold-text" />
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
          <div className="my-10 h-12 w-0.5 rounded-full bg-v2-line-strong" />
        </div>
      )}

      {/* ── Tiers ── */}
      <div className="space-y-14">
        {grouped.map(({ group, items }) => (
          <div key={group.id}>
            <div className="flex justify-center">
              <span className="rounded-full bg-v2-strong px-5 py-1.5 text-sm font-semibold text-v2-on-strong">
                {group.label}
                {items.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="mt-8 grid justify-items-center gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((m) => (
                <div
                  key={m.id}
                  className="w-full max-w-sm rounded-[24px] bg-card p-6 text-center shadow-v2-card transition-all duration-300 ease-out-expo hover:-translate-y-1 hover:shadow-v2-lift"
                >
                  <Avatar src={m.photoUrl} name={m.name} size={96} className={`mx-auto ${V2_AVATAR}`} />
                  <h3 className="mt-4 font-heading text-lg font-semibold tracking-[-0.01em] text-heading">{m.name}</h3>
                  <p className="mt-0.5 text-sm font-medium text-v2-gold-text">{m.title}</p>
                  <ClampText text={m.bio} limit={160} className="mt-3 text-sm leading-5 text-v2-body" />
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

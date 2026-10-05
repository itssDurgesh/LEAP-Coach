import { Building2, Compass, Globe, Handshake, Layers, TrendingUp, Users, type LucideIcon } from "lucide-react";
import type { LeadershipTrack } from "@/lib/types";

/**
 * Look of each leadership level (track) in the version 2 learner theme: an icon
 * and its three colours. Class names are written out in full so Tailwind's scanner
 * sees them. Tracks are admin-extensible, so an id not listed here falls back to
 * a neutral style rather than breaking.
 */
export interface LevelStyle {
  icon: LucideIcon;
  /** pale background */
  tint: string;
  /** solid colour, as a background (icon circle, progress fill) */
  base: string;
  /** readable text / icon colour on the tint */
  text: string;
  /** icon colour on the solid `base` fill */
  on: string;
}

const STYLES: Record<string, LevelStyle> = {
  leading_self: { icon: Compass, tint: "bg-lv-self-tint", base: "bg-lv-self", text: "text-lv-self-dark", on: "text-white" },
  leading_people: { icon: Users, tint: "bg-lv-people-tint", base: "bg-lv-people", text: "text-lv-people-dark", on: "text-white" },
  leading_upwards: { icon: TrendingUp, tint: "bg-lv-upwards-tint", base: "bg-lv-upwards", text: "text-lv-upwards-dark", on: "text-white" },
  leading_peers: { icon: Handshake, tint: "bg-lv-peers-tint", base: "bg-lv-peers", text: "text-lv-peers-dark", on: "text-white" },
  leading_cultures: { icon: Globe, tint: "bg-lv-cultures-tint", base: "bg-lv-cultures", text: "text-lv-cultures-dark", on: "text-white" },
  leading_organizations: { icon: Building2, tint: "bg-lv-orgs-tint", base: "bg-lv-orgs", text: "text-lv-orgs-dark", on: "text-white" },
};

// `v2-strong` turns light in dark mode, so its icon uses the matching "on" colour, not white.
const FALLBACK: LevelStyle = { icon: Layers, tint: "bg-surface-2", base: "bg-v2-strong", text: "text-v2-body", on: "text-v2-on-strong" };

export function levelStyle(trackId: string | undefined | null): LevelStyle {
  return (trackId && STYLES[trackId]) || FALLBACK;
}

/** "Leading Self" → "Self". Labels that don't start with "Leading" are kept whole. */
export function shortLevelLabel(label: string): string {
  return label.replace(/^Leading\s+/i, "");
}

export function trackLabel(tracks: LeadershipTrack[], trackId: string | undefined | null): string | null {
  if (!trackId) return null;
  return tracks.find((t) => t.id === trackId)?.label ?? null;
}

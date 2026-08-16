"use client";

import * as React from "react";
import { ProfessorPhoto } from "@/components/ProfessorPhoto";
import { cn } from "@/lib/utils";

/**
 * Plays a looping, muted, autoplaying hero clip, falling back to the static
 * professor photo only if the video genuinely fails to load.
 *
 * Video source priority:
 *  1. NEXT_PUBLIC_HERO_VIDEO_URL env var (CDN / Supabase Storage URL)
 *  2. /professor-hero.mp4 in public/ (local dev only — gitignored, too large for git)
 *  3. Falls back to the static professor photo
 */
export function HeroMedia({ className, src }: { className?: string; src?: string }) {
  const videoSrc = src || process.env.NEXT_PUBLIC_HERO_VIDEO_URL || "/professor-hero.mp4";
  const [videoOk, setVideoOk] = React.useState(true);

  if (!videoOk) {
    return <ProfessorPhoto className={className} rounded="rounded-none" position="top" />;
  }

  return (
    // No poster: a still of the professor here read as the real hero on every hard
    // reload (cropped mid-torso) until the clip decoded. Bare, the element stays
    // transparent and the container's own navy gradient covers the load instead.
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <video
      src={videoSrc}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      onError={() => setVideoOk(false)}
      className={cn("h-full w-full object-cover", className)}
    />
  );
}

"use client";

import * as React from "react";
import { ProfessorPhoto } from "@/components/ProfessorPhoto";
import { cn } from "@/lib/utils";

/**
 * Plays a looping, muted, autoplaying hero clip with the professor photo as
 * poster + graceful fallback if no video exists.
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
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <video
      src={videoSrc}
      poster="/professor.jpg"
      autoPlay
      muted
      loop
      playsInline
      onError={() => setVideoOk(false)}
      className={cn("h-full w-full object-cover", className)}
    />
  );
}

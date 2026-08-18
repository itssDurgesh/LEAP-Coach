"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Plays a looping, muted, autoplaying hero clip.
 *
 * Video source priority:
 *  1. NEXT_PUBLIC_HERO_VIDEO_URL env var (CDN / Supabase Storage URL)
 *  2. /professor-hero.mp4 in public/ (local dev only — gitignored, too large for git)
 *
 * There is deliberately NO still-image fallback. If the clip fails to load the
 * element simply stays transparent and the container's own gradient shows through —
 * a frozen photo of the professor read as the real hero on every hard reload
 * (cropped mid-torso) until the video decoded, which looked worse than nothing.
 */
export function HeroMedia({ className, src }: { className?: string; src?: string }) {
  const videoSrc = src || process.env.NEXT_PUBLIC_HERO_VIDEO_URL || "/professor-hero.mp4";

  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <video
      src={videoSrc}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      className={cn("h-full w-full object-cover", className)}
    />
  );
}

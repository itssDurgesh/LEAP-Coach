"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Plays the looping, muted, autoplaying hero clip.
 *
 * The source is the bundled public/professor-hero.mp4, hardcoded on purpose so it
 * starts immediately with no CDN round-trip. The file is laid out faststart (moov
 * before mdat) so playback begins without downloading the whole clip.
 *
 * There is deliberately NO still-image fallback: if the clip fails, the element
 * stays transparent and the container's own gradient shows through.
 */
const HERO_VIDEO = "/professor-hero.mp4";

export function HeroMedia({ className, src }: { className?: string; src?: string }) {
  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <video
      src={src || HERO_VIDEO}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      className={cn("h-full w-full object-cover", className)}
    />
  );
}

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Plays the looping, muted, autoplaying hero clip.
 *
 * The source is the bundled public/professor-hero.mp4, hardcoded on purpose so it
 * starts immediately with no CDN round-trip. It used to read
 * NEXT_PUBLIC_HERO_VIDEO_URL first, but that pointed at a Supabase "public-assets"
 * bucket which does not exist — every request came back NoSuchBucket, the video
 * never loaded, and the old still-image fallback was what actually rendered. That
 * env var is now unused and can be deleted.
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

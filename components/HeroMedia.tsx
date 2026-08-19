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
 * Loading is deferred until after first paint. The clip sits above the fold, and
 * with autoPlay + preload="auto" the browser pulled ~5.7MB in parallel with the
 * resources that decide FCP/LCP — so the hero text painted late while the video
 * hogged bandwidth. `src` is withheld until the main thread is idle, which keeps
 * the video out of the critical path without changing what the user eventually
 * sees (autoplay fires as soon as the source is attached and buffered).
 *
 * There is deliberately NO still-image fallback: if the clip fails, the element
 * stays transparent and the container's own gradient shows through.
 */
const HERO_VIDEO = "/professor-hero.mp4";

export function HeroMedia({ className, src }: { className?: string; src?: string }) {
  const [armed, setArmed] = React.useState(false);

  React.useEffect(() => {
    let idleId: number | undefined;
    let timerId: ReturnType<typeof setTimeout> | undefined;

    const arm = () => setArmed(true);

    // requestIdleCallback where available (Chrome/Edge/Firefox); the timeout keeps
    // it bounded so the clip still starts on a busy page. Safari falls back to a
    // short timer.
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = (window as Window & typeof globalThis).requestIdleCallback(arm, { timeout: 2500 });
    } else {
      timerId = setTimeout(arm, 600);
    }

    return () => {
      if (idleId !== undefined) window.cancelIdleCallback?.(idleId);
      if (timerId !== undefined) clearTimeout(timerId);
    };
  }, []);

  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <video
      // No src until armed — an absent attribute means the browser fetches nothing.
      src={armed ? src || HERO_VIDEO : undefined}
      autoPlay
      muted
      loop
      playsInline
      preload="none"
      className={cn("h-full w-full object-cover", className)}
    />
  );
}

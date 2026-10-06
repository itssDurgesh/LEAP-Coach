"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Plays the looping, muted hero clip.
 *
 * The source is the bundled public/professor-hero.mp4, hardcoded on purpose so it
 * starts immediately with no CDN round-trip. The file is laid out faststart (moov
 * before mdat) so playback begins without downloading the whole clip.
 *
 * Loading is deferred until after first paint. The clip sits above the fold, and
 * with an eager source the browser pulled it in parallel with the resources that
 * decide FCP/LCP — so the hero text painted late while the video hogged bandwidth.
 * The download is withheld until the main thread is idle AND this copy is close to the
 * viewport, so a copy further down the page (or one in a hidden layout) costs
 * nothing until it is needed.
 *
 * Playback is driven from here rather than by the `autoplay` attribute. Browsers
 * disagree on what that attribute means for a muted clip (Chrome plays it only
 * while it is on screen, others play every copy all the time), and each copy ran
 * on its own timeline: the hero paused mid-sentence while the copy in the lesson
 * scene started again from zero. Now a copy plays only while it is on screen and
 * picks up from wherever the previous copy was, so it reads as one video.
 *
 * The clip is downloaded once and every copy plays that one download from memory.
 * When each copy pointed at the file itself, a copy that was paused off screen
 * stopped reading after the first few bytes and kept the download to itself, so
 * the copy on screen waited behind it and its card stayed empty.
 *
 * There is deliberately NO still-image fallback: if the clip fails, the element
 * stays transparent and the container's own background shows through.
 */
const HERO_VIDEO = "/professor-hero.mp4";

// One download per address, shared by every copy. If it cannot be fetched this way
// (a clip on another site that does not allow it), the copy uses the address directly.
const clips = new Map<string, Promise<string>>();
function loadClip(url: string) {
  let clip = clips.get(url);
  if (!clip) {
    clip = fetch(url)
      .then((res) => (res.ok ? res.blob() : Promise.reject(new Error(String(res.status)))))
      .then((blob) => URL.createObjectURL(blob))
      .catch(() => url);
    clips.set(url, clip);
  }
  return clip;
}

// The copy that played most recently. The next copy to come on screen continues from its position.
let lastPlayed: HTMLVideoElement | null = null;

export function HeroMedia({ className, src }: { className?: string; src?: string }) {
  const ref = React.useRef<HTMLVideoElement>(null);
  const onScreen = React.useRef(false);
  const [idle, setIdle] = React.useState(false);
  const [near, setNear] = React.useState(false);
  const armed = idle && near;
  const url = src || HERO_VIDEO;
  const [clip, setClip] = React.useState<{ url: string; play: string } | null>(null);
  const ready = armed && clip?.url === url ? clip.play : undefined;

  const sync = React.useCallback(() => {
    const video = ref.current;
    if (!video || !video.getAttribute("src")) return;
    if (!onScreen.current) {
      video.pause();
      return;
    }
    if (lastPlayed && lastPlayed !== video && lastPlayed.isConnected && Math.abs(video.currentTime - lastPlayed.currentTime) > 0.2) {
      video.currentTime = lastPlayed.currentTime;
    }
    lastPlayed = video;
    // Muted playback needs no user gesture; a rejection only means the copy left the screen again.
    video.play().catch(() => {});
  }, []);

  React.useEffect(() => {
    let idleId: number | undefined;
    let timerId: ReturnType<typeof setTimeout> | undefined;

    const arm = () => setIdle(true);

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

  React.useEffect(() => {
    const video = ref.current;
    if (!video) return;
    // Fetch one screen ahead, so the first frame is ready before the copy scrolls in.
    const loader = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          loader.disconnect();
        }
      },
      { rootMargin: "100% 0px" },
    );
    // Start a little early, so the catch-up seek is over by the time the copy is in view.
    const player = new IntersectionObserver(
      ([entry]) => {
        onScreen.current = entry.isIntersecting;
        sync();
      },
      { rootMargin: "200px 0px" },
    );
    loader.observe(video);
    player.observe(video);
    return () => {
      loader.disconnect();
      player.disconnect();
      if (lastPlayed === video) lastPlayed = null;
    };
  }, [sync]);

  React.useEffect(() => {
    if (!armed) return;
    let live = true;
    loadClip(url).then((play) => {
      if (live) setClip({ url, play });
    });
    return () => {
      live = false;
    };
  }, [armed, url]);

  // The source has just been attached (or swapped): start it if this copy is on screen.
  React.useEffect(() => {
    if (ready) sync();
  }, [ready, sync]);

  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <video
      ref={ref}
      // No src until the clip is in hand: an absent attribute means the browser fetches nothing.
      src={ready}
      muted
      loop
      playsInline
      preload="auto"
      className={cn("h-full w-full object-cover", className)}
    />
  );
}

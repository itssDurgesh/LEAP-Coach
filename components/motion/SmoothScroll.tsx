"use client";

import * as React from "react";
import Lenis from "lenis";

/**
 * Momentum scrolling for the public marketing pages.
 *
 * Mounted per-page rather than in the root layout, so the admin console and the
 * in-app learn/dashboard screens keep native scrolling (Lenis fights the nested
 * scroll containers and video scrubbers in there).
 */
export function SmoothScroll({ headerOffset = -88 }: { headerOffset?: number }) {
  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      // Lenis owns its own rAF loop, and destroy() cancels it — one less thing to
      // get wrong than driving requestAnimationFrame by hand from this effect.
      autoRaf: true,
      // NOT using Lenis's built-in `anchors` — it never calls preventDefault, so the
      // browser's own instant jump lands first and the smooth scroll short-circuits
      // (target already reached), which also drops the header offset. Handled below.
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      // composedPath rather than closest(), so a click on an icon or span nested
      // inside the link still resolves to the anchor.
      const link = e
        .composedPath()
        .find((n): n is HTMLAnchorElement => n instanceof HTMLAnchorElement && !!n.href);
      if (!link || link.target === "_blank") return;

      // Only same-page anchors — everything else stays a normal navigation.
      const url = new URL(link.href);
      if (url.host !== window.location.host) return;
      if (url.pathname !== window.location.pathname || !url.hash) return;

      const target = document.querySelector(decodeURIComponent(url.hash));
      if (!target) return;

      e.preventDefault();
      lenis.scrollTo(target as HTMLElement, { offset: headerOffset });
      window.history.pushState(null, "", url.hash);
    };

    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      lenis.destroy();
    };
  }, [headerOffset]);

  return null;
}

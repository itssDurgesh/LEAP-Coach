"use client";

import * as React from "react";
import { localDay } from "@/lib/ideas";

/**
 * Today's date on the learner's own clock (YYYY-MM-DD), which changes at their
 * midnight while the page stays open, and is checked again whenever the tab comes
 * back into view (a laptop that slept past midnight).
 */
export function useLocalDay(): string {
  const [day, setDay] = React.useState(() => localDay());

  React.useEffect(() => {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2);
    const t = window.setTimeout(() => setDay(localDay()), midnight.getTime() - now.getTime());
    return () => window.clearTimeout(t);
  }, [day]);

  React.useEffect(() => {
    const check = () => {
      if (document.visibilityState === "visible") setDay(localDay());
    };
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, []);

  return day;
}

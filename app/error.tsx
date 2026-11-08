"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { v2Button } from "@/components/v2/button";
import { clearPaintCaches } from "@/lib/store/paint-cache";

/**
 * Shown in place of a page that threw while rendering. Without it, one bad record
 * or a bug in a single component blanked the whole site behind Next's bare
 * "Application error" screen, with no way back but the browser's own reload.
 *
 * The menu bar and the rest of the layout above this segment keep working. The
 * saved paint cache is dropped first: a page that broke on cached data would
 * otherwise repaint the same data on reload, before the fresh copy arrives.
 */
export default function RouteError({
  error,
  unstable_retry,
  reset,
}: {
  error: Error & { digest?: string };
  unstable_retry?: () => void;
  reset?: () => void;
}) {
  React.useEffect(() => {
    console.error("[page error]", error);
    clearPaintCaches();
  }, [error]);

  const retry = unstable_retry ?? reset;

  return (
    <div className="app-v2 grid min-h-screen place-items-center bg-surface px-4 py-16 font-sans text-heading">
      <div className="w-full max-w-md rounded-[24px] bg-card p-8 text-center shadow-v2-card">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-v2-gold-soft text-v2-gold-text">
          <AlertTriangle className="h-6 w-6" />
        </span>
        <h1 className="mt-5 font-heading text-2xl font-bold tracking-[-0.015em]">This page hit a problem</h1>
        <p className="mt-2 text-[15px] leading-6 text-v2-body">
          Something went wrong while showing it. Try again, or reload the page.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {retry && (
            <button type="button" onClick={() => retry()} className={v2Button("primary")}>
              <RotateCcw className="h-4 w-4" /> Try again
            </button>
          )}
          <button type="button" onClick={() => window.location.reload()} className={v2Button("outline")}>
            Reload page
          </button>
        </div>
        <Link href="/" className="mt-5 inline-block text-sm font-semibold text-v2-gold-text hover:underline">
          Go to the home page
        </Link>
        {error.digest && <p className="mt-4 text-xs text-muted">Reference: {error.digest}</p>}
      </div>
    </div>
  );
}

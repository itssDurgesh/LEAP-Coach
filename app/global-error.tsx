"use client";

import * as React from "react";
import { clearPaintCaches } from "@/lib/store/paint-cache";

/**
 * Last line of defence: replaces the ROOT layout when it throws (the auth bridge,
 * the data store or anything else mounted around every page). Because the layout is
 * gone, this renders its own <html> and <body> and styles itself inline, so it does
 * not depend on the stylesheet or fonts that may be part of what failed.
 */
export default function GlobalError({
  error,
  unstable_retry,
  reset,
}: {
  error: Error & { digest?: string };
  unstable_retry?: () => void;
  reset?: () => void;
}) {
  React.useEffect(() => {
    console.error("[app error]", error);
    // A cached snapshot that broke the store would break it again on reload.
    clearPaintCaches();
  }, [error]);

  const retry = unstable_retry ?? reset;

  return (
    <html lang="en">
      <head>
        <title>Something went wrong | LEAP Coach</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          :root { color-scheme: light dark; }
          body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px 16px;
                 background: #F4F3EF; color: #0C1B36; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
          .card { box-sizing: border-box; width: 100%; max-width: 420px; background: #fff; border-radius: 24px; padding: 32px;
                  text-align: center; box-shadow: 0 10px 30px rgba(12, 27, 54, 0.08); }
          h1 { margin: 0; font-size: 22px; line-height: 1.25; }
          p { margin: 10px 0 0; font-size: 15px; line-height: 1.55; color: #3D4861; }
          .row { margin-top: 24px; display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; }
          button, a.btn { font: inherit; font-weight: 600; font-size: 15px; border-radius: 999px; padding: 12px 22px;
                          cursor: pointer; text-decoration: none; }
          .primary { background: #E9B93E; color: #0C1B36; border: 0; }
          .outline { background: transparent; color: #0C1B36; border: 1px solid #CFC9BB; }
          .ref { margin-top: 16px; font-size: 12px; color: #6E7890; }
          @media (prefers-color-scheme: dark) {
            body { background: #1A1611; color: #F4EEE2; }
            .card { background: #241E16; box-shadow: none; }
            p { color: #B6AC99; }
            .outline { color: #F4EEE2; border-color: rgba(244, 238, 226, 0.25); }
          }
        `}</style>
      </head>
      <body>
        <main className="card">
          <h1>LEAP Coach hit a problem</h1>
          <p>Something went wrong while loading the site. Reload to try again.</p>
          <div className="row">
            <button type="button" className="primary" onClick={() => window.location.reload()}>
              Reload
            </button>
            {retry && (
              <button type="button" className="outline" onClick={() => retry()}>
                Try again
              </button>
            )}
            {/* A plain link, not next/link: the router may be what failed. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a className="btn outline" href="/">
              Home
            </a>
          </div>
          {error.digest && <p className="ref">Reference: {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}

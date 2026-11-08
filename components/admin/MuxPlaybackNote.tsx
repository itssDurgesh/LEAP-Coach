"use client";

import * as React from "react";
import { ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import { isClerkConfigured } from "@/lib/clerk/config";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { cn } from "@/lib/utils";

// Content Studio's check of each session's Mux playback id: signed (plays only with
// this site's tokens, for learners who have the topic) or public (anyone who has
// the id can watch it, anywhere). See lib/mux/playback.ts.

type Policy = "public" | "signed" | "missing" | "unknown";

export interface MuxPolicies {
  /** Whether the server can sign tokens (MUX_SIGNING_KEY / MUX_PRIVATE_KEY); null until known. */
  signing: boolean | null;
  policies: Record<string, Policy>;
}

const realMode = isClerkConfigured && isSupabaseConfigured;
/** A real id (not empty, not a seed "mux_…" placeholder), the same test as the server's. */
const looksReal = (id: string) => !!id && !id.startsWith("mux_") && /^[A-Za-z0-9_-]{1,200}$/.test(id);

/** Asks the server about `ids` (after typing stops), remembering answers for the page's life. */
export function useMuxPolicies(ids: string[]): MuxPolicies {
  const [state, setState] = React.useState<MuxPolicies>({ signing: null, policies: {} });
  const known = React.useRef<Record<string, Policy>>({});
  const wanted = Array.from(new Set(ids.map((id) => id.trim()).filter(looksReal))).sort().join(",");

  React.useEffect(() => {
    if (!realMode || !wanted) return;
    const ask = wanted.split(",").filter((id) => !(id in known.current)).slice(0, 100);
    if (!ask.length) return;
    let live = true;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/admin/mux/playback-ids", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: ask }),
        });
        if (!res.ok || !live) return;
        const data = (await res.json()) as { signing?: boolean; policies?: Record<string, Policy> };
        // "unknown" (Mux could not be asked) is not remembered, so it is asked again later.
        for (const [id, p] of Object.entries(data.policies ?? {})) if (p !== "unknown") known.current[id] = p;
        if (live) setState({ signing: !!data.signing, policies: { ...known.current } });
      } catch {
        /* no note is better than a wrong one */
      }
    }, 700);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [wanted]);

  return state;
}

/** One line under a session's playback id saying what kind of id it is. */
export function MuxPlaybackNote({ id, mux }: { id: string; mux: MuxPolicies }) {
  const policy = mux.policies[id.trim()];
  if (!policy || policy === "unknown") return null;
  const line = "flex items-start gap-1.5 text-xs leading-5";
  if (policy === "missing") {
    return (
      <p className={cn(line, "text-red-600")}>
        <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Mux has no video with this playback ID. Check it was copied in full.
      </p>
    );
  }
  if (policy === "signed") {
    return mux.signing ? (
      <p className={cn(line, "text-green-700")}>
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Signed: plays only for learners who have this topic.
      </p>
    ) : (
      <p className={cn(line, "text-red-600")}>
        <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Signed, but this site has no Mux signing key yet (MUX_SIGNING_KEY, MUX_PRIVATE_KEY), so it won&apos;t play.
      </p>
    );
  }
  return (
    <p className={cn(line, mux.signing ? "text-amber-600" : "text-faint")}>
      <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      {mux.signing
        ? "Public: anyone who has this ID can watch. In Mux, add a signed playback ID to this video and paste it here."
        : "Public: anyone who has this ID can watch."}
    </p>
  );
}

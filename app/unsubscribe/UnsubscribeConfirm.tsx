"use client";

import * as React from "react";
import Link from "next/link";
import { MailX, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

type State = "idle" | "sending" | "done" | "error";

/**
 * Client confirm step for /unsubscribe. A manual click (not a bare link) prevents
 * email clients that prefetch links from silently unsubscribing the user.
 */
export function UnsubscribeConfirm({ token }: { token: string }) {
  const [state, setState] = React.useState<State>(token ? "idle" : "error");
  const [error, setError] = React.useState(token ? "" : "This unsubscribe link is missing its token.");

  async function confirm() {
    setState("sending");
    try {
      const res = await fetch(`/api/unsubscribe?token=${encodeURIComponent(token)}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not update your preference.");
      setState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update your preference.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="space-y-3 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
        <h1 className="font-heading text-xl font-semibold text-heading">You're unsubscribed</h1>
        <p className="text-sm text-muted">
          You won't receive announcement or live-session emails from LEAP Coach anymore. You'll still see updates when
          you sign in.
        </p>
        <Link href="/" className="inline-block pt-1 text-sm font-semibold text-gold-600 hover:underline">
          Back to LEAP Coach
        </Link>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="space-y-3 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
        <h1 className="font-heading text-xl font-semibold text-heading">Something went wrong</h1>
        <p className="text-sm text-muted">{error}</p>
        <Link href="/" className="inline-block pt-1 text-sm font-semibold text-gold-600 hover:underline">
          Back to LEAP Coach
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center">
      <MailX className="mx-auto h-10 w-10 text-gold-600" />
      <h1 className="font-heading text-xl font-semibold text-heading">Unsubscribe from LEAP Coach emails?</h1>
      <p className="text-sm text-muted">
        You'll stop receiving announcement and live-session emails. You can still catch everything by signing in to your
        account.
      </p>
      <Button onClick={confirm} loading={state === "sending"} disabled={state === "sending"} className="w-full">
        Unsubscribe me
      </Button>
      <Link href="/" className="inline-block text-sm text-muted hover:text-heading">
        No thanks, keep me subscribed
      </Link>
    </div>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AppHeader } from "@/components/app/AppHeader";
import { useApp } from "@/lib/store/AppProvider";

/**
 * Authenticated learner layout: route guard + header + page container.
 * `signedOutTo` is where a signed-out visitor is sent (the lesson pages use "/login").
 */
export function AppShell({ children, signedOutTo = "/signup" }: { children: React.ReactNode; signedOutTo?: string }) {
  const { currentUser, hydrated } = useApp();
  const router = useRouter();

  React.useEffect(() => {
    if (!hydrated) return;
    // Signed-out visitors arriving from the public nav (e.g. "Topics") get the
    // signup page — they are far more likely to be new than returning.
    if (!currentUser) router.replace(signedOutTo);
    else if (currentUser.isAdmin) router.replace("/admin");
    else if (!currentUser.role) router.replace("/select-role");
  }, [hydrated, currentUser, router, signedOutTo]);

  // `app-v2` scopes the version 2 learner theme (colours and fonts, see globals.css)
  // to the signed-in learner pages only.
  if (!hydrated || !currentUser || currentUser.isAdmin || !currentUser.role) {
    return (
      <div className="app-v2 grid min-h-screen place-items-center bg-surface">
        <Loader2 className="h-6 w-6 animate-spin text-gold-500" />
      </div>
    );
  }

  return (
    <div className="app-v2 min-h-screen bg-surface font-sans text-heading">
      <AppHeader />
      <main className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 xl:px-[72px]">{children}</main>
    </div>
  );
}

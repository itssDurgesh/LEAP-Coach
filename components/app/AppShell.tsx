"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AppHeader } from "@/components/app/AppHeader";
import { useApp } from "@/lib/store/AppProvider";

/** Authenticated learner layout: route guard + header + page container. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { currentUser, hydrated } = useApp();
  const router = useRouter();

  React.useEffect(() => {
    if (!hydrated) return;
    // Signed-out visitors arriving from the public nav (e.g. "Topics") get the
    // signup page — they are far more likely to be new than returning.
    if (!currentUser) router.replace("/signup");
    else if (currentUser.isAdmin) router.replace("/admin");
    else if (!currentUser.role) router.replace("/select-role");
  }, [hydrated, currentUser, router]);

  if (!hydrated || !currentUser || currentUser.isAdmin || !currentUser.role) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface">
        <Loader2 className="h-6 w-6 animate-spin text-gold-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <AppHeader />
      <main className="mx-auto max-w-[88rem] px-5 py-8 sm:px-8">{children}</main>
    </div>
  );
}

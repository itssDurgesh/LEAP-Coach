"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store/AppProvider";

/** Client guard for learner-only pages. Redirects admins / unauthenticated / role-less users. */
export function useRequireLearner() {
  const { currentUser, hydrated } = useApp();
  const router = useRouter();

  React.useEffect(() => {
    if (!hydrated) return;
    if (!currentUser) router.replace("/login");
    else if (currentUser.isAdmin) router.replace("/admin");
    else if (!currentUser.role) router.replace("/select-role");
  }, [hydrated, currentUser, router]);

  return {
    ready: hydrated && !!currentUser && !currentUser.isAdmin && !!currentUser.role,
    currentUser,
    hydrated,
  };
}

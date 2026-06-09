"use client";

import { AppShell } from "@/components/app/AppShell";
import { DiscussionBoard } from "@/components/discussion/DiscussionBoard";

export default function DiscussionPage() {
  return (
    <AppShell>
      <DiscussionBoard />
    </AppShell>
  );
}

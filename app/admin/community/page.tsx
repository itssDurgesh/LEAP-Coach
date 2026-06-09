"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { DiscussionBoard } from "@/components/discussion/DiscussionBoard";

export default function AdminDiscussionPage() {
  return (
    <AdminShell
      title="Discussion Board"
      subtitle="Post, reply, tag and moderate — the same board your learners use"
      requires="discussion"
    >
      <DiscussionBoard showHeader={false} />
    </AdminShell>
  );
}

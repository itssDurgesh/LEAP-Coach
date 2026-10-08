"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { CourseWizard } from "@/components/admin/CourseWizard";

export default function NewCoursePage() {
  return (
    <AdminShell title="New Coaching Topic" subtitle="Create a topic in 7 guided steps" requires="content">
      <CourseWizard />
    </AdminShell>
  );
}

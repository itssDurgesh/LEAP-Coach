"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { CourseWizard } from "@/components/admin/CourseWizard";
import { buttonClasses } from "@/components/ui/button-variants";
import { useApp } from "@/lib/store/AppProvider";

export default function EditCoursePage() {
  const params = useParams<{ id: string }>();
  const { getCourse, fresh } = useApp();
  const course = getCourse(params.id);

  return (
    <AdminShell title="Edit Coaching Topic" subtitle={course?.title ?? "Topic"} requires="content">
      {!fresh ? (
        // The first paint can come from a saved copy that leaves transcripts out. The
        // editor copies the topic once when it opens, so opening it on that copy and
        // saving would write the transcripts back empty. Wait for the database's copy.
        <div className="grid place-items-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-gold-500" />
        </div>
      ) : course ? (
        <CourseWizard key={course.id} initial={course} />
      ) : (
        <div className="py-16 text-center">
          <p className="font-heading text-lg font-semibold text-heading">Topic not found</p>
          <Link href="/admin/courses" className={buttonClasses({ variant: "primary", size: "md", className: "mt-4" })}>
            Back to Content Studio
          </Link>
        </div>
      )}
    </AdminShell>
  );
}

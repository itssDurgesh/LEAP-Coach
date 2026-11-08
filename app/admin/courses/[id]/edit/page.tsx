"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { CourseWizard } from "@/components/admin/CourseWizard";
import { buttonClasses } from "@/components/ui/button-variants";
import { useApp } from "@/lib/store/AppProvider";
import type { Course } from "@/lib/types";

export default function EditCoursePage() {
  const params = useParams<{ id: string }>();
  const { getCourse, loadCourseForEdit, hydrated } = useApp();
  const listed = getCourse(params.id);
  // The page load carries topics without their transcripts. The editor saves every
  // session back, so it opens on a copy read straight from the database with
  // every transcript in it, never on the page load's copy.
  const [state, setState] = React.useState<{ course: Course | null; error?: string } | null>(null);

  React.useEffect(() => {
    if (!hydrated) return;
    let active = true;
    setState(null);
    loadCourseForEdit(params.id).then(
      (course) => active && setState({ course }),
      (e: unknown) => active && setState({ course: null, error: e instanceof Error ? e.message : "The topic could not be loaded." }),
    );
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, hydrated]);

  return (
    <AdminShell title="Edit Coaching Topic" subtitle={state?.course?.title ?? listed?.title ?? "Topic"} requires="content">
      {!state ? (
        <div className="grid place-items-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-gold-500" />
        </div>
      ) : state.course ? (
        <CourseWizard key={state.course.id} initial={state.course} />
      ) : (
        <div className="py-16 text-center">
          <p className="font-heading text-lg font-semibold text-heading">{state.error ? "The topic could not be loaded" : "Topic not found"}</p>
          {state.error && <p className="mt-1 text-sm text-muted">{state.error}</p>}
          <Link href="/admin/courses" className={buttonClasses({ variant: "primary", size: "md", className: "mt-4" })}>
            Back to Content Studio
          </Link>
        </div>
      )}
    </AdminShell>
  );
}

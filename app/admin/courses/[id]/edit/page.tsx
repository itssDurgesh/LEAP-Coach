"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { CourseWizard } from "@/components/admin/CourseWizard";
import { buttonClasses } from "@/components/ui/button-variants";
import { useApp } from "@/lib/store/AppProvider";
import { withTranscripts } from "@/lib/transcripts";
import type { Course } from "@/lib/types";

export default function EditCoursePage() {
  const params = useParams<{ id: string }>();
  const { getCourse, fresh } = useApp();
  const course = getCourse(params.id);

  // The editor copies the topic once when it opens, so it must open on a complete
  // copy: the database's (not the paint cache's, so wait for `fresh`), with the
  // session transcripts, which the bulk load leaves out. Opening without them and
  // saving would have written the transcripts back empty.
  const [loaded, setLoaded] = React.useState<{ id: string; course: Course } | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);
  const courseId = course?.id;
  React.useEffect(() => {
    if (!fresh || !course) return;
    let active = true;
    setFailed(false);
    withTranscripts(course).then(
      (full) => active && setLoaded({ id: full.id, course: full }),
      (e) => {
        console.error("[supabase] transcripts", e);
        if (active) setFailed(true);
      },
    );
    return () => {
      active = false;
    };
    // Once per topic (and per retry): later store updates must not reset the copy.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fresh, courseId, attempt]);

  const ready = loaded && loaded.id === courseId ? loaded.course : null;

  return (
    <AdminShell title="Edit Coaching Topic" subtitle={course?.title ?? "Topic"} requires="content">
      {fresh && !course ? (
        <div className="py-16 text-center">
          <p className="font-heading text-lg font-semibold text-heading">Topic not found</p>
          <Link href="/admin/courses" className={buttonClasses({ variant: "primary", size: "md", className: "mt-4" })}>
            Back to Content Studio
          </Link>
        </div>
      ) : failed ? (
        <div className="py-16 text-center">
          <p className="font-heading text-lg font-semibold text-heading">The session transcripts could not be loaded</p>
          <p className="mt-1 text-sm text-muted">The editor stays closed so a save cannot overwrite them. Check your connection.</p>
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className={buttonClasses({ variant: "primary", size: "md", className: "mt-4" })}
          >
            Try again
          </button>
        </div>
      ) : ready ? (
        <CourseWizard key={ready.id} initial={ready} />
      ) : (
        <div className="grid place-items-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-gold-500" />
        </div>
      )}
    </AdminShell>
  );
}

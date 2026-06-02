"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { CourseWizard } from "@/components/admin/CourseWizard";
import { buttonClasses } from "@/components/ui/button-variants";
import { useApp } from "@/lib/store/AppProvider";

export default function EditCoursePage() {
  const params = useParams<{ id: string }>();
  const { getCourse } = useApp();
  const course = getCourse(params.id);

  return (
    <AdminShell title="Edit Coaching Topic" subtitle={course?.title ?? "Topic"}>
      {course ? (
        <CourseWizard initial={course} />
      ) : (
        <div className="py-16 text-center">
          <p className="font-heading text-lg font-semibold text-navy-800">Topic not found</p>
          <Link href="/admin/courses" className={buttonClasses({ variant: "primary", size: "md", className: "mt-4" })}>
            Back to Content Studio
          </Link>
        </div>
      )}
    </AdminShell>
  );
}

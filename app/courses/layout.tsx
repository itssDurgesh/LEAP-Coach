import type { Metadata } from "next";
import type { ReactNode } from "react";

// The catalog page is a client component, so its metadata lives here in a server
// layout. Applies to /courses and, as a sensible default, to /courses/[slug].
export const metadata: Metadata = {
  title: "Coaching Topics & Courses",
  description:
    "Browse LEAP Coach's leadership coaching topics for students, professionals, and entrepreneurs — video lessons from Prof. Vishal Gupta with an AI tutor on every one.",
  alternates: { canonical: "/courses" },
};

export default function CoursesLayout({ children }: { children: ReactNode }) {
  return children;
}

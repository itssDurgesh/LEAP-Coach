import type { Metadata } from "next";
import type { ReactNode } from "react";

// The FAQ page is a client component, so its metadata lives here in a server layout.
export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Answers to common questions about LEAP Coach: how the AI tutor works, pricing, courses, and getting started with Prof. Vishal Gupta's leadership coaching.",
  alternates: { canonical: "/faq" },
};

export default function FaqLayout({ children }: { children: ReactNode }) {
  return children;
}

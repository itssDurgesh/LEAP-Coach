import type { Metadata } from "next";
import type { ReactNode } from "react";

// The articles list is a client component, so its metadata lives here in a server layout.
export const metadata: Metadata = {
  title: "Articles & Insights",
  description:
    "Leadership, motivation, and authentic-performance insights from LEAP Coach and Prof. Vishal Gupta of IIM Ahmedabad.",
  alternates: { canonical: "/articles" },
};

export default function ArticlesLayout({ children }: { children: ReactNode }) {
  return children;
}

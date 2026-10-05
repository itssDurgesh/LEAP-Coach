import * as React from "react";
import { cn } from "@/lib/utils";

/* Shared heading pieces of the public pages (version 2 look). No hooks, so both
   server and client components can use them. */

/** Small gold pill above a title. */
export function Tag({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-v2-gold-soft px-3 py-1.5 text-xs font-semibold text-v2-gold-text", className)}>
      {children}
    </span>
  );
}

/** Tag, title and a line of text at the top of a section. `as="h1"` for a page's own title. */
export function SectionHead({
  tag,
  title,
  text,
  center,
  as: Heading = "h2",
  className,
}: {
  tag?: React.ReactNode;
  title: React.ReactNode;
  text?: React.ReactNode;
  center?: boolean;
  as?: "h1" | "h2";
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", center && "mx-auto text-center", className)}>
      {tag && <Tag>{tag}</Tag>}
      {/* Not through `cn`: its class merging takes `text-display` (a size) and
          `text-heading` (a colour) for the same thing and drops the first. */}
      <Heading className={`text-balance font-heading text-display font-bold text-heading ${tag ? "mt-4" : ""}`}>{title}</Heading>
      {text && <p className={cn("mt-4 text-base leading-6 text-v2-body", !center && "max-w-lg")}>{text}</p>}
    </div>
  );
}

/** Class string for the white rounded card used across the public pages. */
export const CARD = "rounded-[24px] bg-card shadow-v2-card";

/** Round icon button (carousel arrows, social links). */
export const ROUND_BUTTON =
  "grid h-11 w-11 place-items-center rounded-full border border-v2-line-strong bg-card text-heading transition-colors duration-200 hover:border-heading disabled:pointer-events-none disabled:opacity-35";

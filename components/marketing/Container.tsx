import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Page gutter + measure.
 *
 * Deliberately offers several widths: the old landing wrapped every single section
 * in `max-w-7xl`, which is a big part of why it read as templated. Alternating a
 * narrow editorial column against full-width and bleeding sections is what gives the
 * page a rhythm.
 */
const WIDTHS = {
  narrow: "max-w-3xl", // editorial / pull-quote column
  prose: "max-w-5xl",
  default: "max-w-7xl",
  wide: "max-w-[88rem]",
  full: "max-w-none",
} as const;

export function Container({
  width = "default",
  className,
  children,
}: {
  width?: keyof typeof WIDTHS;
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("mx-auto w-full px-5 sm:px-8", WIDTHS[width], className)}>{children}</div>;
}

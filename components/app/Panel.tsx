import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The standard in-app surface: rounded-3xl, hairline border, card background.
 * Replaces the older <Card> across the redesigned learner pages so radii and
 * borders stay consistent with the marketing side.
 */
export function Panel({
  className,
  padded = true,
  children,
}: {
  className?: string;
  padded?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn("rounded-3xl border border-hair bg-card", padded && "p-5", className)}>
      {children}
    </div>
  );
}

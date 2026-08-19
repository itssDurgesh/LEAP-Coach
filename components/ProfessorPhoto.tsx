"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface ProfessorPhotoProps {
  className?: string;
  rounded?: string;
  /** object-position, e.g. "top" to keep the face in frame on wide crops */
  position?: string;
  /** Passed to next/image so it picks a sensible source width per breakpoint. */
  sizes?: string;
  priority?: boolean;
}

/**
 * Prof. Vishal Gupta's photo (public/professor.jpg) with a graceful
 * "VG" gradient fallback if the file isn't present yet.
 *
 * Uses next/image `fill`, so the caller's `className` supplies the box (the wrapper
 * is what gets sized) and the image reserves its space — no layout shift.
 */
export function ProfessorPhoto({
  className,
  rounded = "rounded-2xl",
  position = "center",
  sizes = "(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 480px",
  priority = false,
}: ProfessorPhotoProps) {
  const [ok, setOk] = React.useState(true);

  if (!ok) {
    return (
      <div
        className={cn(
          "grid place-items-center bg-gradient-to-br from-gold-400 to-gold-600 font-heading font-bold text-navy-900",
          rounded,
          className,
        )}
      >
        VG
      </div>
    );
  }

  return (
    <span className={cn("relative block overflow-hidden", rounded, className)}>
      <Image
        src="/professor.jpg"
        alt="Prof. Vishal Gupta"
        fill
        sizes={sizes}
        priority={priority}
        style={{ objectPosition: position }}
        className="object-cover"
        onError={() => setOk(false)}
      />
    </span>
  );
}

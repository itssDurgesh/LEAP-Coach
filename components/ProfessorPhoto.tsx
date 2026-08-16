"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ProfessorPhotoProps {
  className?: string;
  rounded?: string;
  /** object-position, e.g. "top" to keep the face in frame on wide crops */
  position?: string;
}

/**
 * Prof. Vishal Gupta's photo (public/professor.jpg) with a graceful
 * "VG" gradient fallback if the file isn't present yet.
 */
export function ProfessorPhoto({ className, rounded = "rounded-2xl", position = "center" }: ProfessorPhotoProps) {
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
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/professor.jpg"
      alt="Prof. Vishal Gupta"
      width={640}
      height={800}
      loading="lazy"
      decoding="async"
      style={{ objectPosition: position }}
      className={cn("h-full w-full object-cover", rounded, className)}
      onError={() => setOk(false)}
    />
  );
}

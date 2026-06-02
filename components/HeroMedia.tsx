"use client";

import * as React from "react";
import { ProfessorPhoto } from "@/components/ProfessorPhoto";
import { cn } from "@/lib/utils";

/**
 * Plays a looping, muted, autoplaying hero clip (public/professor-hero.mp4)
 * with the professor photo as poster + graceful fallback if no video exists.
 * Drop a file at public/professor-hero.mp4 and it auto-plays.
 */
export function HeroMedia({ className, src = "/professor-hero.mp4" }: { className?: string; src?: string }) {
  const [videoOk, setVideoOk] = React.useState(true);

  if (!videoOk) {
    return <ProfessorPhoto className={className} rounded="rounded-none" position="top" />;
  }

  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <video
      src={src}
      poster="/professor.jpg"
      autoPlay
      muted
      loop
      playsInline
      onError={() => setVideoOk(false)}
      className={cn("h-full w-full object-cover", className)}
    />
  );
}

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TypewriterProps {
  text: string;
  className?: string;
  speed?: number; // ms per character
  startDelay?: number;
}

/**
 * Types `text` out character-by-character with a blinking cursor.
 *
 * Layout stability: the visible text is overlaid on an invisible copy of the FULL
 * string, stacked in the same grid cell. Without that sizer the element grows one
 * character at a time, so on narrower viewports the line re-wraps mid-animation and
 * shoves everything below it down — a large, entirely avoidable CLS contribution on
 * the landing hero. The box now occupies its final size from the first frame.
 */
export function Typewriter({ text, className, speed = 25, startDelay = 450 }: TypewriterProps) {
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    setCount(0);
    let i = 0;
    let interval: ReturnType<typeof setInterval>;
    const start = setTimeout(() => {
      interval = setInterval(() => {
        i += 1;
        setCount(i);
        if (i >= text.length) clearInterval(interval);
      }, speed);
    }, startDelay);
    return () => {
      clearTimeout(start);
      clearInterval(interval);
    };
  }, [text, speed, startDelay]);

  const done = count >= text.length;

  return (
    <span className={cn("inline-grid align-bottom", className)} aria-label={text}>
      {/* Sizer — reserves the final width and line count, never painted. */}
      <span aria-hidden className="invisible col-start-1 row-start-1">
        {text}
      </span>
      <span aria-hidden className="col-start-1 row-start-1">
        {text.slice(0, count)}
        <span
          className={cn(
            "ml-[1px] inline-block h-[1em] w-[2px] -translate-y-[1px] align-middle bg-gold-500",
            done ? "animate-pulse" : "",
          )}
        />
      </span>
    </span>
  );
}

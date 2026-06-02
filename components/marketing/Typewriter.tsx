"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TypewriterProps {
  text: string;
  className?: string;
  speed?: number; // ms per character
  startDelay?: number;
}

/** Types `text` out character-by-character with a blinking cursor. */
export function Typewriter({ text, className, speed = 42, startDelay = 350 }: TypewriterProps) {
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
    <span className={className} aria-label={text}>
      <span aria-hidden>{text.slice(0, count)}</span>
      <span
        aria-hidden
        className={cn(
          "ml-[1px] inline-block h-[1em] w-[2px] -translate-y-[1px] align-middle bg-gold-500",
          done ? "animate-pulse" : "",
        )}
      />
    </span>
  );
}

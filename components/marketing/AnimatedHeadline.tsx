"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface AnimatedHeadlineProps {
  text: string;
  className?: string;
  delay?: number;
}

/**
 * Reveals a headline word-by-word, "writing in motion" — used for the
 * brand tagline on the landing hero (rendered in the gold logo color).
 * Note: the gold gradient must live on each word span (not the parent),
 * or the clipped gradient won't paint over inline-block children.
 */
export function AnimatedHeadline({ text, className, delay = 0.1 }: AnimatedHeadlineProps) {
  const words = text.split(" ");
  return (
    <h1 className={cn("font-heading", className)} aria-label={text}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="text-gradient-gold mr-[0.26em] inline-block"
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.55, delay: delay + i * 0.16, ease: [0.16, 1, 0.3, 1] }}
        >
          {word}
        </motion.span>
      ))}
    </h1>
  );
}

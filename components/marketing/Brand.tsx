"use client";

import Image from "next/image";
import { motion } from "motion/react";

export const BRAND = "LEAP Coach";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Logo mark and wordmark in the two brand colours. Every size is in `em`, so the
 * large version in the home page intro and the small one in the menu bar have the
 * same proportions and one can glide into the other without stretching.
 *
 * `typed` shows only that many letters. `intro` pops the mark in and draws the
 * gold line under the name (home page intro only).
 */
export function Brand({ typed, intro }: { typed?: number; intro?: boolean }) {
  const shown = typed === undefined ? BRAND : BRAND.slice(0, typed);
  return (
    <span className="inline-flex items-center gap-[0.42em] font-heading font-bold leading-none tracking-[-0.02em] text-heading">
      <motion.span
        initial={intro ? { scale: 0, rotate: -50 } : false}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 190, damping: 13, delay: 0.5 }}
        className="block h-[1.9em] w-[1.9em] shrink-0 overflow-hidden rounded-[0.42em] bg-white ring-1 ring-hair"
      >
        <Image src="/logo-mark.png" alt="" width={256} height={256} priority className="h-full w-full object-contain" />
      </motion.span>
      <span className="relative inline-grid">
        {/* Sizer: reserves the full width so the lockup does not grow while typing. */}
        <span aria-hidden className="invisible col-start-1 row-start-1 whitespace-pre">
          {BRAND}
        </span>
        <span className="col-start-1 row-start-1 whitespace-pre" aria-label={BRAND}>
          <span aria-hidden>{shown.slice(0, 4)}</span>
          <span aria-hidden className="text-gold-500">
            {shown.slice(4)}
          </span>
        </span>
        {intro && (
          <svg aria-hidden viewBox="0 0 300 18" preserveAspectRatio="none" className="absolute -bottom-[0.3em] left-0 h-[0.2em] w-full overflow-visible">
            <motion.path
              d="M4 12 C 80 2, 210 2, 296 10"
              fill="none"
              stroke="#E9B93E"
              strokeWidth="5"
              strokeLinecap="round"
              // Hidden until it starts to draw: an undrawn round-capped line shows as two stray dots.
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ pathLength: { duration: 0.6, ease: EASE, delay: 1.75 }, opacity: { duration: 0.01, delay: 1.75 } }}
            />
          </svg>
        )}
      </span>
    </span>
  );
}

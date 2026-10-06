"use client";

import * as React from "react";
import { motion, useReducedMotion, type TargetAndTransition } from "motion/react";

/** Shared easing — matches the `out-expo` timing function in tailwind.config.ts. */
const EASE = [0.16, 1, 0.3, 1] as const;

type From = "up" | "down" | "left" | "right" | "none";

const OFFSETS: Record<From, { x: number; y: number }> = {
  up: { x: 0, y: 28 },
  down: { x: 0, y: -28 },
  left: { x: 34, y: 0 },
  right: { x: -34, y: 0 },
  none: { x: 0, y: 0 },
};

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  from?: From;
  /** Fraction of the element that must be visible before it animates. */
  amount?: number;
  once?: boolean;
  blur?: boolean;
}

/**
 * Fades/slides a block in when it scrolls into view.
 *
 * Honours `prefers-reduced-motion` by showing the block at once. It stays a
 * motion.div: the server sends it hidden, and swapping it for a plain <div> on the
 * client left that hidden style in place, so the block never appeared.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  duration = 0.7,
  from = "up",
  amount = 0.2,
  once = true,
  blur = false,
}: RevealProps) {
  const reduce = useReducedMotion();
  const { x, y } = OFFSETS[from];
  const hidden: TargetAndTransition = { opacity: 0, x, y, ...(blur && { filter: "blur(10px)" }) };
  const shown: TargetAndTransition = { opacity: 1, x: 0, y: 0, ...(blur && { filter: "blur(0px)" }) };

  return (
    <motion.div
      className={className}
      initial={hidden}
      {...(reduce ? { animate: shown } : { whileInView: shown })}
      viewport={{ once, amount }}
      transition={reduce ? { duration: 0 } : { duration, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

interface StaggerProps {
  children: React.ReactNode;
  className?: string;
  /** Seconds between each child. */
  gap?: number;
  delay?: number;
  amount?: number;
  once?: boolean;
}

/** Parent for a grid/list whose children should cascade in. Pair with <StaggerItem>. */
export function Stagger({
  children,
  className,
  gap = 0.09,
  delay = 0,
  amount = 0.15,
  once = true,
}: StaggerProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial="hidden"
      {...(reduce ? { animate: "show" } : { whileInView: "show" })}
      viewport={{ once, amount }}
      variants={{ hidden: {}, show: { transition: reduce ? {} : { staggerChildren: gap, delayChildren: delay } } }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  from = "up",
  duration = 0.65,
}: {
  children: React.ReactNode;
  className?: string;
  from?: From;
  duration?: number;
}) {
  const reduce = useReducedMotion();
  const { x, y } = OFFSETS[from];
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, x, y },
        show: { opacity: 1, x: 0, y: 0, transition: { duration: reduce ? 0 : duration, ease: EASE } },
      }}
    >
      {children}
    </motion.div>
  );
}

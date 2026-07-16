"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  href?: string | null;
  variant?: "default" | "light";
  size?: "sm" | "md" | "lg";
}

const markSize = { sm: "h-8 w-8", md: "h-10 w-10", lg: "h-14 w-14" };
const iconSize = { sm: "h-5 w-5", md: "h-6 w-6", lg: "h-8 w-8" };
const textSize = { sm: "text-base", md: "text-lg", lg: "text-[1.7rem]" };

export function Logo({ className, href = "/", variant = "default", size = "md" }: LogoProps) {
  const [imgOk, setImgOk] = React.useState(true);
  const onDark = variant === "light";

  const mark = (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-xl",
        markSize[size],
        !imgOk
          ? "bg-gradient-to-br from-gold-400 to-gold-600 shadow-gold"
          : onDark
            ? "ring-1 ring-white/25"
            : "ring-1 ring-hair",
      )}
    >
      {imgOk ? (
        // object-contain, not cover: the mark is square with its own white plate, so
        // covering a non-square box would crop the ring and the star off the edges.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/logo-mark.png"
          alt="LEAP Coach"
          width={256}
          height={256}
          className="h-full w-full rounded-xl bg-white object-contain"
          onError={() => setImgOk(false)}
        />
      ) : (
        <Sparkles className={cn("text-white", iconSize[size])} strokeWidth={2.5} />
      )}
    </span>
  );

  const content = (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {mark}
      <span className={cn("font-heading font-bold leading-none tracking-tight", textSize[size])}>
        <span className={cn("tracking-wide", onDark ? "text-white" : "text-heading")}>LEAP</span>
        <span className="text-gold-500"> Coach</span>
      </span>
    </span>
  );

  if (href === null) return content;
  return (
    <Link href={href} className="inline-flex shrink-0">
      {content}
    </Link>
  );
}

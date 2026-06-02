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

const markSize = { sm: "h-9 w-9", md: "h-11 w-11", lg: "h-16 w-16" };
const iconSize = { sm: "h-5 w-5", md: "h-6 w-6", lg: "h-8 w-8" };
const textSize = { sm: "text-base", md: "text-xl", lg: "text-[1.7rem]" };

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
            ? "bg-white p-1 ring-1 ring-white/20"
            : "",
      )}
    >
      {imgOk ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/logo.png"
          alt="Leap Coach"
          className="h-full w-full object-contain"
          onError={() => setImgOk(false)}
        />
      ) : (
        <Sparkles className={cn("text-white", iconSize[size])} strokeWidth={2.5} />
      )}
    </span>
  );

  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {mark}
      <span className={cn("font-heading font-bold leading-none", textSize[size])}>
        <span className={onDark ? "text-white" : "text-navy-800"}>Leap</span>
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

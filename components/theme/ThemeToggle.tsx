"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { cn } from "@/lib/utils";

/**
 * Sun/Moon theme switch. Styled with semantic tokens so it themes itself.
 * `tone="onDark"` for placement on always-dark chrome (e.g. admin sidebar).
 */
export function ThemeToggle({
  className,
  tone = "default",
}: {
  className?: string;
  tone?: "default" | "onDark";
}) {
  const { theme, toggle } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className={cn(
        "grid h-10 w-10 place-items-center rounded-xl transition-colors",
        tone === "onDark"
          ? "text-cream-100/70 hover:bg-white/10 hover:text-white"
          : "text-muted hover:bg-surface-2 hover:text-heading",
        className,
      )}
    >
      {/* Avoid hydration mismatch: render a stable icon until mounted. */}
      {mounted && isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

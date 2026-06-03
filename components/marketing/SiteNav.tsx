"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X, ArrowRight, LayoutDashboard } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { buttonClasses } from "@/components/ui/button-variants";
import { useApp } from "@/lib/store/AppProvider";
import { cn } from "@/lib/utils";

const links = [
  { label: "Learning Paths", href: "/#paths" },
  { label: "How it Works", href: "/#how" },
  { label: "Topics", href: "/courses" },
  { label: "Pricing", href: "/pricing" },
];

/** `overlay` = the page has a dark hero behind the header (transparent at top, solid on scroll). */
export function SiteNav({ overlay = false }: { overlay?: boolean }) {
  const { currentUser, hydrated } = useApp();
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Solid (white) header unless we're overlaying a dark hero and still at the top.
  const solid = scrolled || !overlay || open;

  const signedIn = hydrated && currentUser;
  const dashHref = currentUser?.isAdmin ? "/admin" : currentUser?.role ? "/dashboard" : "/select-role";

  return (
    <header
      className={cn(
        "z-50 transition-all duration-300 w-full",
        solid
          ? "sticky top-0 border-b border-cream-200 bg-white/95 shadow-sm backdrop-blur-md"
          : "absolute top-0 border-b border-white/10 bg-transparent",
      )}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Logo size="lg" variant={solid ? "default" : "light"} />

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                solid
                  ? "text-ink-soft hover:bg-cream-100 hover:text-navy-800"
                  : "text-cream-100 hover:bg-white/10 hover:text-white",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {signedIn ? (
            <Link href={dashHref} className={buttonClasses({ variant: "primary", size: "md" })}>
              <LayoutDashboard className="h-4 w-4" />
              {currentUser?.isAdmin ? "Control Center" : "Dashboard"}
              <Avatar name={currentUser?.name} size={22} className="ml-1" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(
                  "rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors",
                  solid ? "text-navy-700 hover:bg-cream-100" : "text-white hover:bg-white/10",
                )}
              >
                Sign in
              </Link>
              <Link href="/signup" className={buttonClasses({ variant: "primary", size: "md" })}>
                Start Your Journey <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "grid h-10 w-10 place-items-center rounded-xl md:hidden",
            solid ? "text-navy-800 hover:bg-cream-100" : "text-white hover:bg-white/10",
          )}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-cream-200 bg-white px-5 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-navy-800 hover:bg-cream-100"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-2">
            {signedIn ? (
              <Link href={dashHref} className={buttonClasses({ variant: "navy", size: "md" })}>
                Go to {currentUser?.isAdmin ? "Control Center" : "Dashboard"}
              </Link>
            ) : (
              <>
                <Link href="/login" className={buttonClasses({ variant: "outline", size: "md" })}>
                  Sign in
                </Link>
                <Link href="/signup" className={buttonClasses({ variant: "primary", size: "md" })}>
                  Start Your Journey <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

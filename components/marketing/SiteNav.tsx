"use client";

import * as React from "react";
import Link from "next/link";
import { Drawer } from "vaul";
import { Menu, X, ArrowRight, LayoutDashboard } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { buttonClasses } from "@/components/ui/button-variants";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { PlanBadge } from "@/components/app/PlanBadge";
import { useApp } from "@/lib/store/AppProvider";
import { cn } from "@/lib/utils";

const links = [
  { label: "About", href: "/about" },
  { label: "Team", href: "/team" },
  { label: "Topics", href: "/courses" },
  { label: "How it Works", href: "/#how" },
  { label: "Pricing", href: "/pricing" },
];

/** `overlay` = the page has a dark hero behind the header (transparent at top, pill on scroll). */
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

  // The bar is wide and transparent only while it overlays a dark hero at the very
  // top of the page; everywhere else it is the condensed floating pill.
  const pill = scrolled || !overlay;
  const onDark = !pill;

  const signedIn = hydrated && currentUser;
  const dashHref = currentUser?.isAdmin ? "/admin" : currentUser?.role ? "/dashboard" : "/select-role";

  return (
    <>
      <header
        className={cn(
          "z-50 w-full",
          // Fixed over a dark hero so morphing into the pill never reflows the page;
          // sticky elsewhere so it still occupies its row of layout as before.
          overlay ? "fixed top-0" : "sticky top-0",
        )}
      >
        <div
          className={cn(
            "mx-auto flex items-center justify-between gap-3 transition-all duration-500 ease-out-expo",
            pill
              ? "mt-2.5 h-14 max-w-[62rem] rounded-2xl border border-hair bg-card/80 px-3 shadow-pill backdrop-blur-xl sm:mt-3 sm:px-4"
              : "mt-0 h-16 max-w-7xl rounded-none border border-transparent px-5 sm:h-20 sm:px-8",
          )}
        >
          <Logo size={pill ? "sm" : "md"} variant={onDark ? "light" : "default"} priority />

          <nav className="hidden items-center gap-0.5 lg:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "group relative px-3 py-2 text-sm font-medium transition-colors duration-200",
                  onDark ? "text-cream-100 hover:text-white" : "text-muted hover:text-heading",
                )}
              >
                {l.label}
                {/* Hairline underline that draws in from the left — an editorial cue
                    in place of the usual hover pill. */}
                <span className="pointer-events-none absolute inset-x-3 bottom-1 h-px origin-left scale-x-0 bg-gold-500 transition-transform duration-200 ease-out-expo group-hover:scale-x-100" />
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 lg:flex">
              {signedIn ? (
                <>
                  {!currentUser?.isAdmin && <PlanBadge user={currentUser} href="/pricing" />}
                  <Link href={dashHref} className={buttonClasses({ variant: "primary", size: pill ? "sm" : "md" })}>
                    <LayoutDashboard className="h-4 w-4" />
                    {currentUser?.isAdmin ? "Control Center" : "Dashboard"}
                    <Avatar name={currentUser?.name} size={22} className="ml-1" />
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className={cn(
                      "rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors duration-200",
                      onDark ? "text-white hover:bg-white/10" : "text-heading hover:bg-surface-2",
                    )}
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    className={buttonClasses({
                      variant: "primary",
                      size: pill ? "sm" : "md",
                      className: "group",
                    })}
                  >
                    Start Your Journey
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out-expo group-hover:translate-x-0.5" />
                  </Link>
                </>
              )}
            </div>

            <ThemeToggle tone={onDark ? "onDark" : "default"} className="hidden lg:grid" />

            {/* The drawer covers everything below lg — the previous breakpoints left
                tablets (768–1023px) with no nav links and no hamburger at all. */}
            <button
              onClick={() => setOpen(true)}
              className={cn(
                "grid h-10 w-10 place-items-center rounded-xl transition-colors duration-200 lg:hidden",
                onDark ? "text-white hover:bg-white/10" : "text-heading hover:bg-surface-2",
              )}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <Drawer.Root open={open} onOpenChange={setOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[60] bg-navy-950/60 backdrop-blur-sm" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-[60] flex max-h-[90vh] flex-col rounded-t-3xl border-t border-hair bg-card outline-none">
            <Drawer.Title className="sr-only">Navigation menu</Drawer.Title>
            <Drawer.Description className="sr-only">
              Links to the main sections of LEAP Coach.
            </Drawer.Description>

            <div className="mx-auto mt-3 h-1.5 w-11 shrink-0 rounded-full bg-hair" />

            <div className="flex items-center justify-between px-5 pb-2 pt-4">
              <Logo size="sm" />
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="grid h-9 w-9 place-items-center rounded-xl text-muted transition-colors duration-200 hover:bg-surface-2 hover:text-heading"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              {/* Numbered, rule-separated rows rather than another stack of cards. */}
              <nav className="mt-2 border-t border-hair">
                {links.map((l, i) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="group flex items-baseline gap-4 border-b border-hair py-4"
                  >
                    <span className="font-heading text-xs font-semibold tabular-nums text-faint">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-heading text-xl font-semibold text-heading transition-colors duration-200 group-hover:text-gold-600">
                      {l.label}
                    </span>
                    <ArrowRight className="ml-auto h-4 w-4 self-center text-faint transition-transform duration-200 ease-out-expo group-hover:translate-x-1 group-hover:text-gold-600" />
                  </Link>
                ))}
              </nav>

              <div className="mt-5 flex items-center justify-between">
                <span className="text-sm font-medium text-muted">Theme</span>
                <ThemeToggle />
              </div>

              <div className="mt-5 flex flex-col gap-2.5">
                {signedIn ? (
                  <>
                    {!currentUser?.isAdmin && (
                      <div className="flex items-center gap-2 pb-1 text-sm text-muted">
                        Your plan: <PlanBadge user={currentUser} href="/pricing" />
                      </div>
                    )}
                    <Link
                      href={dashHref}
                      onClick={() => setOpen(false)}
                      className={buttonClasses({ variant: "primary", size: "lg", className: "w-full" })}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Go to {currentUser?.isAdmin ? "Control Center" : "Dashboard"}
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/signup"
                      onClick={() => setOpen(false)}
                      className={buttonClasses({ variant: "primary", size: "lg", className: "w-full" })}
                    >
                      Start Your Journey <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/login"
                      onClick={() => setOpen(false)}
                      className={buttonClasses({ variant: "outline", size: "lg", className: "w-full" })}
                    >
                      Sign in
                    </Link>
                  </>
                )}
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { Drawer } from "vaul";
import { motion } from "motion/react";
import { Menu, X, ArrowRight, LayoutDashboard } from "lucide-react";
import { Brand } from "@/components/marketing/Brand";
import { Avatar } from "@/components/ui/Avatar";
import { v2Button } from "@/components/v2/button";
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

/**
 * `overlay`: the bar floats over the page (wide and clear at the very top, a pill
 * once scrolled) instead of taking a row of its own.
 *
 * `intro`: set only by the home page while its opening plays. "intro" keeps the
 * brand's place empty and the rest hidden; from "open" the brand is the landing
 * spot of the large lockup; "done" shows everything.
 */
export function SiteNav({ overlay = false, intro }: { overlay?: boolean; intro?: "intro" | "open" | "done" }) {
  const { currentUser, hydrated } = useApp();
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Wide and clear only at the very top of an overlay page; everywhere else it is
  // the condensed floating pill.
  const pill = scrolled || !overlay;

  const signedIn = hydrated && currentUser;
  const dashHref = currentUser?.isAdmin ? "/admin" : currentUser?.role ? "/dashboard" : "/select-role";
  // Links and buttons wait for the home page opening to finish, then fade in.
  const rest = intro ? cn("transition-opacity duration-700", intro !== "done" && "pointer-events-none opacity-0") : undefined;

  const brand = (
    <Link href="/" className="inline-flex shrink-0">
      <Brand />
    </Link>
  );

  return (
    <>
      <header
        // Marks a public page for the "start at the top after a refresh" script in app/layout.tsx.
        data-public-nav
        className={cn(
          "z-50 w-full",
          // Fixed on overlay pages so morphing into the pill never reflows the page;
          // sticky elsewhere so it still occupies its row of layout.
          overlay ? "fixed top-0" : "sticky top-0",
          // A little air beside the pill on narrow screens.
          pill && "px-2.5 sm:px-4",
        )}
      >
        <div
          className={cn(
            "mx-auto flex items-center justify-between gap-3 transition-all duration-500 ease-out-expo",
            pill
              ? "mt-2.5 h-14 max-w-[62rem] rounded-full bg-card/85 pl-4 pr-2.5 shadow-v2-card backdrop-blur-xl sm:mt-3"
              : "mt-0 h-[72px] max-w-[88rem] rounded-none px-5 sm:px-8",
          )}
        >
          {intro === "intro" ? (
            // Holds the brand's place while the large lockup of the intro is on screen.
            <div aria-hidden className="invisible text-[18px]">
              <Brand />
            </div>
          ) : intro ? (
            // `layoutDependency`: glide in once from the intro, then stay out of the
            // way of the bar's own morph on scroll.
            <motion.div layoutId="brand" layoutDependency={intro} transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1] }} className="text-[18px]">
              {brand}
            </motion.div>
          ) : (
            <div className="text-[18px]">{brand}</div>
          )}

          <nav className={cn("hidden items-center gap-0.5 lg:flex", rest)}>
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-full px-3.5 py-2 text-sm font-medium text-v2-body transition-colors duration-200 hover:bg-surface-2 hover:text-heading"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className={cn("flex items-center gap-1.5", rest)}>
            <div className="hidden items-center gap-2 lg:flex">
              {signedIn ? (
                <>
                  {!currentUser?.isAdmin && <PlanBadge user={currentUser} href="/pricing" />}
                  <Link href={dashHref} className={v2Button("strong", "sm")}>
                    <LayoutDashboard className="h-4 w-4" />
                    {currentUser?.isAdmin ? "Control Center" : "Dashboard"}
                    <Avatar name={currentUser?.name} size={22} className="ml-0.5" />
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login" className={v2Button("ghost", "sm")}>
                    Sign in
                  </Link>
                  <Link href="/signup" className={v2Button("strong", "sm", "group")}>
                    Start Your Journey
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out-expo group-hover:translate-x-0.5" />
                  </Link>
                </>
              )}
            </div>

            <ThemeToggle className="hidden rounded-full lg:grid" />

            {/* The drawer covers everything below lg. */}
            <button
              onClick={() => setOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-full text-heading transition-colors duration-200 hover:bg-surface-2 lg:hidden"
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
          {/* The drawer is rendered outside the page, so it carries the theme class itself. */}
          <Drawer.Content className="app-v2 fixed inset-x-0 bottom-0 z-[60] flex max-h-[90vh] flex-col rounded-t-[28px] bg-card font-sans text-heading outline-none">
            <Drawer.Title className="sr-only">Navigation menu</Drawer.Title>
            <Drawer.Description className="sr-only">
              Links to the main sections of LEAP Coach.
            </Drawer.Description>

            <div className="mx-auto mt-3 h-1.5 w-11 shrink-0 rounded-full bg-surface-2" />

            <div className="flex items-center justify-between px-5 pb-2 pt-4 text-[17px]">
              <Brand />
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="grid h-9 w-9 place-items-center rounded-full text-muted transition-colors duration-200 hover:bg-surface-2 hover:text-heading"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <nav className="mt-2 space-y-1">
                {links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="group flex items-center justify-between rounded-2xl px-4 py-3.5 transition-colors duration-200 hover:bg-surface"
                  >
                    <span className="font-heading text-xl font-semibold text-heading">{l.label}</span>
                    <ArrowRight className="h-4 w-4 text-muted transition-transform duration-200 ease-out-expo group-hover:translate-x-1" />
                  </Link>
                ))}
              </nav>

              <div className="mt-4 flex items-center justify-between px-4">
                <span className="text-sm font-medium text-muted">Theme</span>
                <ThemeToggle className="rounded-full" />
              </div>

              <div className="mt-5 flex flex-col gap-2.5">
                {signedIn ? (
                  <>
                    {!currentUser?.isAdmin && (
                      <div className="flex items-center gap-2 px-4 pb-1 text-sm text-muted">
                        Your plan: <PlanBadge user={currentUser} href="/pricing" />
                      </div>
                    )}
                    <Link href={dashHref} onClick={() => setOpen(false)} className={v2Button("primary", "md", "w-full")}>
                      <LayoutDashboard className="h-4 w-4" />
                      Go to {currentUser?.isAdmin ? "Control Center" : "Dashboard"}
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/signup" onClick={() => setOpen(false)} className={v2Button("primary", "md", "w-full")}>
                      Start Your Journey <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link href="/login" onClick={() => setOpen(false)} className={v2Button("outline", "md", "w-full")}>
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

"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Drawer } from "vaul";
import {
  LayoutDashboard,
  BookOpen,
  BookMarked,
  Newspaper,
  Megaphone,
  Video,
  Menu,
  X,
  LogOut,
  Layers,
  Settings,
  SunMoon,
  User as UserIcon,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { NotificationBell } from "@/components/app/NotificationBell";
import { PlanBadge } from "@/components/app/PlanBadge";
import { CreditBadge } from "@/components/app/CreditBadge";
import { V2_AVATAR } from "@/components/v2/ui";
import { useApp } from "@/lib/store/AppProvider";
import { planFor, tierForCredits } from "@/lib/types";
import { cn } from "@/lib/utils";

const MENU_CHIP = "rounded-full px-2.5 py-1 text-xs font-semibold leading-[18px]";

const navLinks = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My topics", href: "/my-topics", icon: BookMarked },
  { label: "Catalog", href: "/courses", icon: BookOpen },
  { label: "Articles", href: "/articles", icon: Newspaper },
  { label: "Announcements", href: "/announcements", icon: Megaphone },
  { label: "Sessions", href: "/sessions", icon: Video },
];

export function AppHeader() {
  const { currentUser, signOut } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  if (!currentUser) return null;
  const tier = tierForCredits(currentUser.learningCredits);

  async function doSignOut() {
    await signOut();
    router.push("/");
  }

  // Lessons and checkpoints belong to a topic the learner owns, so "My topics" stays lit there.
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/") || (href === "/my-topics" && pathname.startsWith("/learn/"));

  return (
    <>
      {/* Solid, not blurred: a backdrop filter would trap the menus' full-screen
          click-away layers inside the header, so a click on the page would not close them. */}
      <header className="sticky top-0 z-40 border-b border-hair bg-card">
        {/* Three columns on wide screens, so the menu sits in the exact centre of the bar
            whatever the widths of the logo and the account controls beside it. */}
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8 lg:grid lg:grid-cols-[1fr_auto_1fr] xl:px-[72px]">
          <div className="flex min-w-0">
            <Logo href="/dashboard" priority plain />
          </div>
          <nav className="hidden items-center gap-1 lg:flex">
            {navLinks.map((l) => {
              const active = isActive(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "whitespace-nowrap rounded-full px-3 py-2 text-sm transition-colors duration-200 xl:px-3.5",
                    // The current section is a filled pill; the rest fill softly on hover.
                    active
                      ? "bg-v2-strong font-semibold text-v2-on-strong"
                      : "font-medium text-v2-body hover:bg-surface-2 hover:text-heading",
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2 lg:justify-self-end">
            <CreditBadge user={currentUser} className="hidden sm:block" />
            <NotificationBell buttonClassName="h-9 w-9 rounded-full bg-surface [&>svg]:h-[18px] [&>svg]:w-[18px]" />

            {/* Avatar menu: profile links, plan, theme and sign out */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="block rounded-full transition-opacity duration-200 hover:opacity-85"
                aria-label="Account menu"
                aria-haspopup="true"
                aria-expanded={menuOpen}
              >
                <Avatar src={currentUser.avatarUrl} name={currentUser.name} size={36} ring={false} className={V2_AVATAR} />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-[20px] border border-hair bg-card shadow-v2-lift">
                    <div className="border-b border-hair p-4">
                      <p className="font-heading font-bold text-heading">{currentUser.name}</p>
                      <p className="truncate text-xs text-muted">{currentUser.email}</p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <span className={cn(MENU_CHIP, "bg-surface capitalize text-v2-body")}>{currentUser.role}</span>
                        <span className={cn(MENU_CHIP, "bg-v2-gold-soft text-v2-gold-text")}>{tier.label} tier</span>
                      </div>
                    </div>
                    <div className="p-2">
                      {[
                        { href: "/dashboard", icon: LayoutDashboard, label: "My dashboard" },
                        {
                          href: `/u/${currentUser.username ?? currentUser.id}`,
                          icon: UserIcon,
                          label: "My profile",
                        },
                        { href: "/account", icon: Settings, label: "Account settings" },
                        { href: "/pricing", icon: Layers, label: `Your plan: ${planFor(currentUser).label}` },
                      ].map((item) => (
                        <Link
                          key={item.label}
                          href={item.href}
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-heading transition-colors duration-200 hover:bg-surface"
                        >
                          <item.icon className="h-4 w-4 text-muted" /> {item.label}
                        </Link>
                      ))}
                      <div className="flex items-center justify-between rounded-xl py-0.5 pl-3 pr-1 text-sm font-medium text-heading">
                        <span className="flex items-center gap-3">
                          <SunMoon className="h-4 w-4 text-muted" /> Theme
                        </span>
                        <ThemeToggle className="h-9 w-9 rounded-full" />
                      </div>
                      <button
                        onClick={doSignOut}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-colors duration-200 hover:bg-red-50 dark:hover:bg-red-500/10"
                      >
                        <LogOut className="h-4 w-4" /> Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setMobileOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-xl text-heading transition-colors duration-200 hover:bg-surface-2 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav — same bottom sheet the marketing nav uses, so the two halves of
          the product feel like one app. */}
      <Drawer.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[60] bg-navy-950/60 backdrop-blur-sm" />
          <Drawer.Content className="app-v2 font-sans text-heading fixed inset-x-0 bottom-0 z-[60] flex max-h-[90vh] flex-col rounded-t-3xl border-t border-hair bg-card outline-none">
            <Drawer.Title className="sr-only">Navigation menu</Drawer.Title>
            <Drawer.Description className="sr-only">
              Links to your dashboard, topics, catalog and account.
            </Drawer.Description>

            <div className="mx-auto mt-3 h-1.5 w-11 shrink-0 rounded-full bg-hair" />

            <div className="flex items-center justify-between px-5 pb-2 pt-4">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar src={currentUser.avatarUrl} name={currentUser.name} size={38} ring={false} className={V2_AVATAR} />
                <div className="min-w-0">
                  <p className="truncate font-heading text-sm font-bold text-heading">
                    {currentUser.name}
                  </p>
                  <p className="truncate text-xs text-muted">{currentUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted transition-colors duration-200 hover:bg-surface-2 hover:text-heading"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <CreditBadge user={currentUser} align="left" />
                <PlanBadge user={currentUser} href="/pricing" />
              </div>

              <nav className="mt-4 border-t border-hair">
                {navLinks.map((l) => {
                  const active = isActive(l.href);
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3.5 border-b border-hair py-3.5 font-heading text-base font-semibold transition-colors duration-200",
                        active ? "text-gold-700" : "text-heading hover:text-gold-700",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-colors duration-200",
                          active ? "bg-gold-500 text-navy-900" : "bg-surface-2 text-muted",
                        )}
                      >
                        <l.icon className="h-4 w-4" />
                      </span>
                      {l.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm font-medium text-muted">Theme</span>
                <ThemeToggle />
              </div>

              <div className="mt-4 space-y-1">
                <Link
                  href={`/u/${currentUser.username ?? currentUser.id}`}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-heading transition-colors duration-200 hover:bg-surface-2"
                >
                  <UserIcon className="h-4 w-4 text-muted" /> My profile
                </Link>
                <Link
                  href="/account"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-heading transition-colors duration-200 hover:bg-surface-2"
                >
                  <Settings className="h-4 w-4 text-muted" /> Account settings
                </Link>
                <button
                  onClick={doSignOut}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-colors duration-200 hover:bg-red-50 dark:hover:bg-red-500/10"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}

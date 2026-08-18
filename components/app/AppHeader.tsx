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
  ChevronDown,
  Settings,
  User as UserIcon,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { NotificationBell } from "@/components/app/NotificationBell";
import { PlanBadge } from "@/components/app/PlanBadge";
import { CreditBadge } from "@/components/app/CreditBadge";
import { useApp } from "@/lib/store/AppProvider";
import { tierForCredits } from "@/lib/types";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Topics", href: "/my-topics", icon: BookMarked },
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

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-hair bg-surface/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[88rem] items-center justify-between gap-4 px-5 sm:px-8">
          <div className="flex min-w-0 items-center gap-5 xl:gap-8">
            <Logo href="/dashboard" priority />
            <nav className="hidden items-center gap-1 lg:flex">
              {navLinks.map((l) => {
                const active = isActive(l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={cn(
                      "group relative flex items-center gap-1.5 whitespace-nowrap px-2.5 py-2 text-sm font-medium transition-colors duration-200",
                      active ? "text-heading" : "text-muted hover:text-heading",
                    )}
                  >
                    <l.icon className="h-4 w-4 shrink-0" />
                    {l.label}
                    {/* Gold rule marks the active section; hover draws it in from the left. */}
                    <span
                      className={cn(
                        "pointer-events-none absolute inset-x-2.5 bottom-0.5 h-0.5 origin-left rounded-full bg-gold-500 transition-transform duration-200 ease-out-expo",
                        active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                      )}
                    />
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <PlanBadge user={currentUser} withMenu className="hidden sm:inline-flex" />
            <CreditBadge user={currentUser} className="hidden sm:block" />
            <ThemeToggle />
            <NotificationBell />

            {/* Avatar menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-full p-0.5 pr-1.5 transition-colors duration-200 hover:bg-surface-2"
                aria-haspopup="true"
                aria-expanded={menuOpen}
              >
                <Avatar src={currentUser.avatarUrl} name={currentUser.name} size={34} />
                <ChevronDown
                  className={cn(
                    "hidden h-4 w-4 text-muted transition-transform duration-200 sm:block",
                    menuOpen && "rotate-180",
                  )}
                />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-3xl border border-hair bg-card shadow-lift">
                    <div className="border-b border-hair p-4">
                      <p className="font-heading font-bold text-heading">{currentUser.name}</p>
                      <p className="truncate text-xs text-muted">{currentUser.email}</p>
                      <div className="mt-2.5 flex items-center gap-2">
                        <Badge variant="navy" className="capitalize">{currentUser.role}</Badge>
                        <Badge variant={tier.color}>{tier.label}</Badge>
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
                      ].map((item) => (
                        <Link
                          key={item.label}
                          href={item.href}
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-heading transition-colors duration-200 hover:bg-surface-2"
                        >
                          <item.icon className="h-4 w-4 text-muted" /> {item.label}
                        </Link>
                      ))}
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
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-[60] flex max-h-[90vh] flex-col rounded-t-3xl border-t border-hair bg-card outline-none">
            <Drawer.Title className="sr-only">Navigation menu</Drawer.Title>
            <Drawer.Description className="sr-only">
              Links to your dashboard, topics, catalog and account.
            </Drawer.Description>

            <div className="mx-auto mt-3 h-1.5 w-11 shrink-0 rounded-full bg-hair" />

            <div className="flex items-center justify-between px-5 pb-2 pt-4">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar src={currentUser.avatarUrl} name={currentUser.name} size={38} />
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
                <PlanBadge user={currentUser} href="/pricing" />
                <CreditBadge user={currentUser} />
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

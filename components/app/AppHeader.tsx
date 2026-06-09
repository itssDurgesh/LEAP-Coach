"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  MessageSquare,
  Video,
  Award,
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
import { useApp } from "@/lib/store/AppProvider";
import { tierForCredits } from "@/lib/types";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Topics", href: "/courses", icon: BookOpen },
  { label: "Discussion", href: "/community", icon: MessageSquare },
  { label: "Live Sessions", href: "/sessions", icon: Video },
];

export function AppHeader() {
  const { currentUser, signOut } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  if (!currentUser) return null;
  const tier = tierForCredits(currentUser.learningCredits);

  function doSignOut() {
    signOut();
    router.push("/");
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-40 border-b border-hair bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <div className="flex items-center gap-7">
          <Logo href="/dashboard" />
          <nav className="hidden items-center gap-1 lg:flex">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive(l.href)
                    ? "bg-navy-800 text-white"
                    : "text-muted hover:bg-surface-2 hover:text-heading",
                )}
              >
                <l.icon className="h-4 w-4" />
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/dashboard"
            className="hidden items-center gap-1.5 rounded-full border border-gold-200 bg-gold-50 px-3 py-1.5 text-sm font-semibold text-gold-700 sm:inline-flex"
            title={`${tier.label} · ${currentUser.learningCredits} credits`}
          >
            <Award className="h-4 w-4" />
            {currentUser.learningCredits}
            <span className="text-gold-500">cr</span>
          </Link>

          <ThemeToggle />

          <NotificationBell />

          {/* Avatar menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-full p-0.5 pr-1.5 transition-colors hover:bg-surface-2"
            >
              <Avatar src={currentUser.avatarUrl} name={currentUser.name} size={34} />
              <ChevronDown className="hidden h-4 w-4 text-muted sm:block" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-2xl border border-hair bg-card shadow-card-hover">
                  <div className="border-b border-hair p-4">
                    <p className="font-heading font-semibold text-heading">{currentUser.name}</p>
                    <p className="truncate text-xs text-muted">{currentUser.email}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="navy" className="capitalize">{currentUser.role}</Badge>
                      <Badge variant={tier.color}>{tier.label}</Badge>
                    </div>
                  </div>
                  <div className="p-1.5">
                    <Link
                      href="/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-heading hover:bg-surface-2"
                    >
                      <LayoutDashboard className="h-4 w-4" /> My dashboard
                    </Link>
                    <Link
                      href={`/u/${currentUser.username ?? currentUser.id}`}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-heading hover:bg-surface-2"
                    >
                      <UserIcon className="h-4 w-4" /> My profile
                    </Link>
                    <Link
                      href="/account"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-heading hover:bg-surface-2"
                    >
                      <Settings className="h-4 w-4" /> Account settings
                    </Link>
                    <button
                      onClick={doSignOut}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-xl text-heading hover:bg-surface-2 lg:hidden"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t border-hair bg-surface px-5 py-3 lg:hidden">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium",
                isActive(l.href) ? "bg-navy-800 text-white" : "text-heading hover:bg-surface-2",
              )}
            >
              <l.icon className="h-4 w-4" />
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Video,
  Award,
  Bell,
  Menu,
  X,
  LogOut,
  ChevronDown,
  User as UserIcon,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { useApp } from "@/lib/store/AppProvider";
import { tierForCredits } from "@/lib/types";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Topics", href: "/courses", icon: BookOpen },
  { label: "Community", href: "/community", icon: Users },
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
    <header className="sticky top-0 z-40 border-b border-cream-200 bg-cream-50/90 backdrop-blur-md">
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
                    : "text-ink-soft hover:bg-cream-100 hover:text-navy-800",
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

          <button className="relative grid h-10 w-10 place-items-center rounded-xl text-navy-700 hover:bg-cream-100">
            <Bell className="h-5 w-5" />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-gold-500 ring-2 ring-cream-50" />
          </button>

          {/* Avatar menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-full p-0.5 pr-1.5 transition-colors hover:bg-cream-100"
            >
              <Avatar name={currentUser.name} size={34} />
              <ChevronDown className="hidden h-4 w-4 text-ink-soft sm:block" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-card-hover">
                  <div className="border-b border-cream-200 p-4">
                    <p className="font-heading font-semibold text-navy-800">{currentUser.name}</p>
                    <p className="truncate text-xs text-ink-soft">{currentUser.email}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="navy" className="capitalize">{currentUser.role}</Badge>
                      <Badge variant={tier.color}>{tier.label}</Badge>
                    </div>
                  </div>
                  <div className="p-1.5">
                    <Link
                      href="/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-navy-700 hover:bg-cream-100"
                    >
                      <UserIcon className="h-4 w-4" /> My dashboard
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
            className="grid h-10 w-10 place-items-center rounded-xl text-navy-700 hover:bg-cream-100 lg:hidden"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t border-cream-200 bg-cream-50 px-5 py-3 lg:hidden">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium",
                isActive(l.href) ? "bg-navy-800 text-white" : "text-navy-700 hover:bg-cream-100",
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

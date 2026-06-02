"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  ListChecks,
  BarChart3,
  Users,
  Video,
  MessageSquare,
  LogOut,
  ExternalLink,
  Menu,
  X,
  Loader2,
  LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { useApp } from "@/lib/store/AppProvider";
import { cn } from "@/lib/utils";

const nav: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Content Studio", href: "/admin/courses", icon: BookOpen },
  { label: "Question Bank", href: "/admin/questions", icon: ListChecks },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Live Sessions", href: "/admin/sessions", icon: Video },
  { label: "Community", href: "/admin/community", icon: MessageSquare },
];

export function AdminShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { currentUser, hydrated, signOut } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!hydrated) return;
    if (!currentUser || !currentUser.isAdmin) router.replace("/admin/login");
  }, [hydrated, currentUser, router]);

  if (!hydrated || !currentUser || !currentUser.isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-navy-950">
        <Loader2 className="h-6 w-6 animate-spin text-gold-400" />
      </div>
    );
  }

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const sidebar = (
    <div className="flex h-full flex-col bg-navy-950 text-cream-100">
      <div className="px-5 py-5">
        <Logo variant="light" href="/admin" />
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {nav.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              isActive(n.href)
                ? "bg-gold-500 text-navy-900"
                : "text-cream-100/70 hover:bg-white/10 hover:text-white",
            )}
          >
            <n.icon className="h-4.5 w-4.5" />
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <Link
          href="/dashboard"
          className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-cream-100/70 hover:bg-white/10 hover:text-white"
        >
          <ExternalLink className="h-4 w-4" /> View learner site
        </Link>
        <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5">
          <Avatar name={currentUser.name} size={34} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{currentUser.name}</p>
            <p className="truncate text-xs text-cream-100/50">Administrator</p>
          </div>
          <button
            onClick={() => {
              signOut();
              router.push("/");
            }}
            className="grid h-8 w-8 place-items-center rounded-lg text-cream-100/60 hover:bg-white/10 hover:text-white"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream-100 lg:grid lg:grid-cols-[260px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen lg:block">{sidebar}</aside>

      {/* Mobile sidebar */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/50" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64">{sidebar}</div>
        </div>
      )}

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-cream-200 bg-white px-5 py-3.5 sm:px-7">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-xl text-navy-700 hover:bg-cream-100 lg:hidden"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="font-heading text-xl font-bold text-navy-800">{title}</h1>
              {subtitle && <p className="text-sm text-ink-soft">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>

        <main className="flex-1 p-5 sm:p-7">{children}</main>
      </div>
    </div>
  );
}

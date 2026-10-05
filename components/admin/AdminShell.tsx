"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  Users,
  Video,
  Ticket,
  ReceiptIndianRupee,
  LayoutTemplate,
  Contact,
  ClipboardCheck,
  Newspaper,
  Megaphone,
  HelpCircle,
  ShieldCheck,
  LogOut,
  ExternalLink,
  Menu,
  Loader2,
  Lock,
  LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { NotificationBell } from "@/components/app/NotificationBell";
import { useApp } from "@/lib/store/AppProvider";
import { hasPermission, isOwner, Permission } from "@/lib/types";
import { cn } from "@/lib/utils";

/** `requires` undefined = any admin; a Permission or "owner" gates the section. */
type Access = Permission | "owner";

const nav: { label: string; href: string; icon: LucideIcon; requires?: Access }[] = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Homepage", href: "/admin/homepage", icon: LayoutTemplate, requires: "homepage" },
  { label: "Team", href: "/admin/team", icon: Contact, requires: "team" },
  { label: "Content Studio", href: "/admin/courses", icon: BookOpen, requires: "content" },
  { label: "Articles", href: "/admin/articles", icon: Newspaper, requires: "articles" },
  { label: "Announcements", href: "/admin/announcements", icon: Megaphone, requires: "announcements" },
  { label: "FAQ", href: "/admin/faq", icon: HelpCircle, requires: "homepage" },
  { label: "Privacy Policy", href: "/admin/privacy", icon: ShieldCheck, requires: "homepage" },
  { label: "Approvals", href: "/admin/approvals", icon: ClipboardCheck, requires: "owner" },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3, requires: "owner" },
  { label: "Users & Access", href: "/admin/users", icon: Users, requires: "owner" },
  { label: "Live Sessions", href: "/admin/sessions", icon: Video, requires: "sessions" },
  { label: "Plans & Coupons", href: "/admin/coupons", icon: Ticket, requires: "owner" },
  { label: "Payments", href: "/admin/payments", icon: ReceiptIndianRupee, requires: "payments" },
];

export function AdminShell({
  title,
  subtitle,
  actions,
  requires,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  requires?: Access;
  children: React.ReactNode;
}) {
  const { currentUser, hydrated, signOut, courses } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!hydrated) return;
    if (!currentUser || !currentUser.isAdmin) router.replace("/admin/login");
  }, [hydrated, currentUser, router]);

  if (!hydrated || !currentUser || !currentUser.isAdmin) {
    return (
      <div className="app-v2 grid min-h-screen place-items-center bg-surface">
        <Loader2 className="h-6 w-6 animate-spin text-gold-500" />
      </div>
    );
  }

  const owner = isOwner(currentUser);
  const can = (a?: Access) => !a || (a === "owner" ? owner : hasPermission(currentUser, a));
  const allowed = can(requires);
  const pendingCount = courses.filter((c) => c.pendingApproval).length;
  const visibleNav = nav.filter((n) => can(n.requires));

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  // A navy card that floats on the page, in light and in dark (see `--v2-navy`).
  const sidebar = (
    <div className="flex h-full flex-col rounded-[28px] bg-v2-navy px-3 pb-3 pt-5 text-white">
      <div className="px-2">
        <Logo variant="light" href="/admin" plain />
      </div>
      <nav className="mt-4 flex-1 min-h-0 space-y-0.5 overflow-y-auto">
        {visibleNav.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
              isActive(n.href)
                ? "bg-[#E9B93E] text-navy-900"
                : "text-v2-on-navy-muted hover:bg-white/10 hover:text-white",
            )}
          >
            <n.icon className="h-[18px] w-[18px] shrink-0" />
            <span className="flex-1 truncate">{n.label}</span>
            {n.href === "/admin/approvals" && pendingCount > 0 && (
              <span
                className={cn(
                  "grid min-h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-bold",
                  isActive(n.href) ? "bg-navy-900 text-white" : "bg-[#E9B93E] text-navy-900",
                )}
              >
                {pendingCount}
              </span>
            )}
          </Link>
        ))}
      </nav>
      <div className="mt-3 border-t border-white/[0.12] pt-1">
        {/* The public site: the signed-in learner pages send admins straight back here (AppShell). */}
        <Link
          href="/"
          target="_blank"
          className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-v2-on-navy-muted hover:bg-white/10 hover:text-white"
        >
          <ExternalLink className="h-4 w-4" /> View learner site
        </Link>
        <div className="flex items-center gap-2.5 py-2 pl-3 pr-2">
          <Avatar
            src={currentUser.avatarUrl}
            name={currentUser.name}
            size={34}
            ring={false}
            className="ui-avatar-gold bg-[#E9B93E] font-sans font-bold text-navy-900"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{currentUser.name}</p>
            <p className="truncate text-xs text-v2-on-navy-muted">{owner ? "Owner" : "Sub-admin"}</p>
          </div>
          <button
            onClick={async () => {
              await signOut();
              router.push("/");
            }}
            className="grid h-8 w-8 place-items-center rounded-[10px] text-v2-on-navy-muted hover:bg-white/10 hover:text-white"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    // `app-v2` gives the version 2 colours and fonts; `admin-v2` restyles the shared
    // Card / Button / Badge / field primitives for the admin panel (see globals.css).
    <div className="app-v2 admin-v2 min-h-screen bg-surface font-sans text-heading lg:grid lg:grid-cols-[264px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen py-4 pl-4 lg:block">{sidebar}</aside>

      {/* Mobile sidebar */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/50" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[272px] p-3">{sidebar}</div>
        </div>
      )}

      <div className="flex min-h-screen min-w-0 flex-col">
        <header className="flex items-center justify-between gap-4 px-5 pb-1 pt-7 sm:px-6 lg:pr-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-card text-heading shadow-v2-soft lg:hidden"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="font-heading text-2xl font-bold leading-tight tracking-[-0.015em] text-heading sm:text-[32px] sm:leading-[38px]">
                {title}
              </h1>
              {subtitle && <p className="mt-0.5 text-sm text-muted sm:text-[15px] sm:leading-6">{subtitle}</p>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            {allowed && actions}
            <NotificationBell buttonClassName="rounded-full bg-card shadow-v2-soft hover:bg-card" />
          </div>
        </header>

        <main className="flex-1 px-5 pb-8 pt-5 sm:px-6 lg:pr-8">
          {allowed ? (
            children
          ) : (
            <div className="mx-auto mt-10 max-w-md text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-surface-2 text-faint">
                <Lock className="h-7 w-7" />
              </span>
              <h2 className="mt-4 font-heading text-xl font-bold text-heading">No access to this section</h2>
              <p className="mt-2 text-sm text-muted">
                Your sub-admin account doesn&apos;t have permission for this area. Ask the owner if you need it.
              </p>
              <Link href="/admin" className="mt-5 inline-block">
                <Button variant="outline">Back to overview</Button>
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

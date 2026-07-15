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
  X,
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
      <div className="grid min-h-screen place-items-center bg-navy-950">
        <Loader2 className="h-6 w-6 animate-spin text-gold-400" />
      </div>
    );
  }

  const owner = isOwner(currentUser);
  const can = (a?: Access) => !a || (a === "owner" ? owner : hasPermission(currentUser, a));
  const allowed = can(requires);
  const pendingCount = courses.filter((c) => c.pendingApproval).length;
  const visibleNav = nav.filter((n) => can(n.requires));

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const sidebar = (
    <div className="flex h-full flex-col bg-navy-950 dark:bg-[#15100a] text-cream-100">
      <div className="px-5 py-5">
        <Logo variant="light" href="/admin" />
      </div>
      <nav className="flex-1 min-h-0 space-y-1 overflow-y-auto px-3">
        {visibleNav.map((n) => (
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
            <span className="flex-1">{n.label}</span>
            {n.href === "/admin/approvals" && pendingCount > 0 && (
              <span className="grid min-h-[18px] min-w-[18px] place-items-center rounded-full bg-gold-500 px-1 text-[10px] font-bold text-navy-900">
                {pendingCount}
              </span>
            )}
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
          <Avatar src={currentUser.avatarUrl} name={currentUser.name} size={34} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{currentUser.name}</p>
            <p className="truncate text-xs text-cream-100/50">{owner ? "Owner" : "Sub-admin"}</p>
          </div>
          <button
            onClick={async () => {
              await signOut();
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
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-[260px_1fr]">
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
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-hair bg-card px-5 py-3.5 sm:px-7">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-xl text-heading hover:bg-surface-2 lg:hidden"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="font-heading text-xl font-bold text-heading">{title}</h1>
              {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {allowed && actions}
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 p-5 sm:p-7">
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

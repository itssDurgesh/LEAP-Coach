import Link from "next/link";
import { Mail, Phone, MapPin, Youtube, Linkedin, Instagram, ArrowRight, Lock } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

const columns = [
  {
    title: "Navigate",
    links: [
      { label: "Home", href: "/" },
      { label: "About", href: "/#about" },
      { label: "Topics", href: "/courses" },
      { label: "Trainings", href: "/#paths" },
    ],
  },
  {
    title: "Explore",
    links: [
      { label: "Research", href: "#" },
      { label: "Digital Avatar", href: "/#how" },
      { label: "Books", href: "#" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-navy-900 text-cream-100">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr_1fr_1.4fr]">
          {/* Brand + contact */}
          <div>
            <Logo variant="light" href={null} />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-cream-100/70">
              AI-enhanced, avatar-led learning. Scale human wisdom — creating high performance stars.
            </p>
            <div className="mt-5 space-y-2 text-sm text-cream-100/80">
              <p className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-gold-400" /> vishal@iima.ac.in
              </p>
              <p className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-gold-400" /> +91-79-7152-4935
              </p>
              <p className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
                502, Forum Tower, IIMA New Campus, Vastrapur
              </p>
            </div>
          </div>

          {/* Nav columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="font-heading text-sm font-semibold uppercase tracking-wide text-cream-100">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-cream-100/70 transition-colors hover:text-gold-400"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Connect + subscribe */}
          <div>
            <h4 className="font-heading text-sm font-semibold uppercase tracking-wide text-cream-100">
              Connect
            </h4>
            <div className="mt-4 flex gap-2.5">
              {[Youtube, Linkedin, Instagram].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-cream-100 transition-colors hover:bg-gold-500 hover:text-navy-900"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
            <p className="mt-5 text-sm font-medium text-cream-100">Subscribe for the latest</p>
            <form className="mt-2 flex overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/15">
              <input
                type="email"
                placeholder="you@email.com"
                className="w-full bg-transparent px-3.5 py-2.5 text-sm text-cream-100 placeholder:text-cream-100/40 focus:outline-none"
              />
              <button
                type="button"
                className="grid w-11 shrink-0 place-items-center bg-gold-500 text-navy-900 transition-colors hover:bg-gold-400"
                aria-label="Subscribe"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-sm text-cream-100/60 md:flex-row md:items-center md:justify-between">
          <p>© 2026 Prof. Vishal Gupta. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/#about" className="hover:text-gold-400">About</Link>
            <Link href="#" className="hover:text-gold-400">Terms of Service</Link>
            <Link href="#" className="hover:text-gold-400">Privacy</Link>
            <Link href="#" className="hover:text-gold-400">Contact Support</Link>
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-1 text-cream-100/80 hover:border-gold-400 hover:text-gold-400"
            >
              <Lock className="h-3 w-3" /> Admin Access
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

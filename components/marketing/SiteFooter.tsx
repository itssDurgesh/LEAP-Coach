import Link from "next/link";
import { ArrowRight, Linkedin, Lock, Mail, MapPin, Phone, Youtube } from "lucide-react";
import { Container } from "@/components/marketing/Container";
import { Logo } from "@/components/ui/Logo";

const socials = [
  { Icon: Youtube, href: "https://www.youtube.com/@ProfVishalGupta/videos", label: "YouTube" },
  { Icon: Linkedin, href: "https://www.linkedin.com/in/gvishal/", label: "LinkedIn" },
];

const columns = [
  {
    title: "Learn",
    links: [
      { label: "Topics", href: "/courses" },
      { label: "How it works", href: "/#how" },
      { label: "Pricing", href: "/pricing" },
      { label: "Articles", href: "/articles" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Team", href: "/team" },
      { label: "FAQ", href: "/faq" },
      { label: "Privacy", href: "/privacy" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-navy-900 text-cream-100 dark:bg-card">
      <Container width="wide" className="py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          {/* ── Brand ── */}
          <div className="lg:col-span-4">
            <Logo variant="light" href={null} />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-cream-100/65">
              High-quality, evidence-based learning that scales human wisdom and creates high
              performance stars.
            </p>
            <div className="mt-6 flex gap-2.5">
              {socials.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  title={label}
                  className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-cream-100 transition-all duration-200 hover:border-gold-500 hover:bg-gold-500 hover:text-navy-900"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* ── Nav columns ── */}
          {columns.map((col) => (
            <div key={col.title} className="lg:col-span-2">
              <h4 className="font-heading text-[11px] font-semibold uppercase tracking-[0.14em] text-cream-100/50">
                {col.title}
              </h4>
              <ul className="mt-5 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-cream-100/80 transition-colors duration-200 hover:text-gold-400"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* ── Contact ── */}
          <div className="lg:col-span-4">
            <h4 className="font-heading text-[11px] font-semibold uppercase tracking-[0.14em] text-cream-100/50">
              Contact
            </h4>
            <div className="mt-5 space-y-3 text-sm text-cream-100/80">
              {/* suppressHydrationWarning so a browser extension that rewrites email
                  text can't trip React hydration. */}
              <p className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 shrink-0 text-gold-400" />
                <a
                  href="mailto:info.leapcoach@gmail.com"
                  suppressHydrationWarning
                  className="font-medium text-cream-100 transition-colors duration-200 hover:text-gold-400"
                >
                  info.leapcoach@gmail.com
                </a>
              </p>
              <p className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 shrink-0 text-gold-400" />
                <a
                  href="mailto:vishal@iima.ac.in"
                  suppressHydrationWarning
                  className="transition-colors duration-200 hover:text-gold-400"
                >
                  vishal@iima.ac.in
                </a>
              </p>
              <p className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 shrink-0 text-gold-400" />
                <span suppressHydrationWarning>+91-79-7152-4935</span>
              </p>
              <p className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
                502, Forum Tower, IIMA New Campus, Vastrapur
              </p>
            </div>

            <p className="mt-7 font-heading text-sm font-semibold text-cream-100">
              Subscribe for the latest
            </p>
            <form className="mt-3 flex overflow-hidden rounded-full bg-white/[0.07] ring-1 ring-white/15 transition-colors duration-200 focus-within:ring-gold-500/60">
              <input
                type="email"
                placeholder="you@email.com"
                aria-label="Email address"
                className="w-full bg-transparent px-4 py-2.5 text-sm text-cream-100 placeholder:text-cream-100/35 focus:outline-none"
              />
              <button
                type="button"
                className="grid w-12 shrink-0 place-items-center bg-gold-500 text-navy-900 transition-colors duration-200 hover:bg-gold-400"
                aria-label="Subscribe"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-7 text-sm text-cream-100/55 md:flex-row md:items-center md:justify-between">
          <p>© 2026 Prof. Vishal Gupta. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <a
              href="mailto:info.leapcoach@gmail.com"
              className="transition-colors duration-200 hover:text-gold-400"
            >
              Contact support
            </a>
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 text-cream-100/75 transition-colors duration-200 hover:border-gold-400 hover:text-gold-400"
            >
              <Lock className="h-3 w-3" /> Admin access
            </Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}

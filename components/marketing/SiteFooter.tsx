import Link from "next/link";
import { ArrowRight, Linkedin, Mail, MapPin, Phone, Youtube } from "lucide-react";
import { Container } from "@/components/marketing/Container";
import { Logo } from "@/components/ui/Logo";

const socials = [
  { Icon: Youtube, href: "https://www.youtube.com/@ProfVishalGupta/videos", label: "YouTube" },
  { Icon: Linkedin, href: "https://www.linkedin.com/in/gvishal/", label: "LinkedIn" },
];

// Public routes only. /articles and /sessions are behind AppShell, so linking them
// from a public footer just bounces signed-out visitors to /login.
const columns = [
  {
    title: "Explore",
    links: [
      { label: "Topics", href: "/courses" },
      { label: "How it works", href: "/#how" },
      { label: "Pricing", href: "/pricing" },
      { label: "Get started", href: "/signup" },
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

const HEADING = "text-[13px] font-semibold leading-5 text-heading";
const LINK = "text-sm font-medium text-v2-body transition-colors duration-200 hover:text-heading";

/**
 * One white card on the tinted page, like the rest of the version 2 look. Most
 * public pages end on a navy call-to-action card, so a navy footer right under it
 * read as two slabs; the card keeps the two apart.
 */
export function SiteFooter() {
  return (
    <footer className="pb-5 sm:pb-8">
      <Container width="wide">
        <div className="rounded-[28px] bg-card px-6 py-8 shadow-v2-card sm:px-10 sm:py-10">
          {/* ── Columns: the two link lists sit side by side on phones, which halves the height there ── */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-9 lg:grid-cols-12">
            <div className="col-span-2 lg:col-span-4">
              <Logo href={null} />
              <p className="mt-4 max-w-xs text-sm leading-6 text-v2-body">
                High-quality, evidence-based learning that scales human wisdom and creates high
                performance stars.
              </p>
              <div className="mt-5 flex gap-2">
                {socials.map(({ Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    title={label}
                    className="grid h-9 w-9 place-items-center rounded-full bg-surface text-heading transition-colors duration-200 hover:bg-[#E9B93E] hover:text-navy-900"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>

            {columns.map((col) => (
              <div key={col.title} className="lg:col-span-2">
                <h4 className={HEADING}>{col.title}</h4>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className={LINK}>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="col-span-2 lg:col-span-4">
              <h4 className={HEADING}>Contact</h4>
              <div className="mt-4 space-y-2.5 text-sm font-medium text-v2-body">
                {/* suppressHydrationWarning so a browser extension that rewrites email
                    text can't trip React hydration. */}
                <p className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 shrink-0 text-v2-gold-text" />
                  <a
                    href="mailto:info.leapcoach@gmail.com"
                    suppressHydrationWarning
                    className="text-heading transition-colors duration-200 hover:text-v2-gold-text"
                  >
                    info.leapcoach@gmail.com
                  </a>
                </p>
                <p className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 shrink-0 text-v2-gold-text" />
                  <a
                    href="mailto:vishal@iima.ac.in"
                    suppressHydrationWarning
                    className="transition-colors duration-200 hover:text-heading"
                  >
                    vishal@iima.ac.in
                  </a>
                </p>
                <p className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 shrink-0 text-v2-gold-text" />
                  <span suppressHydrationWarning>+91-79-7152-4935</span>
                </p>
                <p className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-v2-gold-text" />
                  502, Forum Tower, IIMA New Campus, Vastrapur
                </p>
              </div>
            </div>
          </div>

          {/* ── Newsletter strip ── */}
          <div className="mt-9 flex flex-col gap-4 rounded-[20px] bg-surface px-5 py-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm leading-6 text-v2-body">
              <span className="font-heading text-base font-semibold text-heading">Subscribe for the latest</span>
              <span className="mt-0.5 block md:ml-2.5 md:mt-0 md:inline">
                Occasional notes on leadership research and new topics.
              </span>
            </p>
            <form className="flex w-full shrink-0 items-center gap-1 rounded-full bg-card py-1 pl-5 pr-1 ring-1 ring-hair transition-shadow duration-200 focus-within:ring-heading md:max-w-sm">
              <input
                type="email"
                placeholder="you@email.com"
                aria-label="Email address"
                className="min-w-0 flex-1 bg-transparent py-2 text-sm text-heading placeholder:text-muted focus:outline-none"
              />
              <button
                type="button"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#E9B93E] text-navy-900 transition-colors duration-200 hover:bg-[#F4CB5B]"
                aria-label="Subscribe"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>

          {/* ── Bottom bar ── */}
          <div className="mt-6 flex flex-col gap-2 text-[13px] font-medium text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 Prof. Vishal Gupta. All rights reserved.</p>
            <a href="mailto:info.leapcoach@gmail.com" className="transition-colors duration-200 hover:text-heading">
              Contact support
            </a>
          </div>
        </div>
      </Container>
    </footer>
  );
}

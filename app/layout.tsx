import type { Metadata } from "next";
import { Outfit, Inter, Bricolage_Grotesque, Figtree } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { ClerkAuthBridge } from "@/lib/auth/ClerkAuthBridge";
import { MockAuthBridge } from "@/lib/auth/MockAuthBridge";
import { isClerkConfigured } from "@/lib/clerk/config";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-outfit",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

// Signed-in learner pages (the `.app-v2` scope in globals.css) swap the two
// families above for these; public and admin pages keep Outfit + Inter.
// `preload: false` because this layout also serves the public pages, which do not
// use them: they are fetched only when a learner page asks for them.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
  preload: false,
  variable: "--font-bricolage",
});

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
  variable: "--font-figtree",
});

// Runs before paint: re-applies a remembered dark choice so there's no flash.
// Default is light, so we only add the class when the user previously chose dark.
const themeScript = `(function(){try{if(localStorage.getItem('leap-theme')==='dark'){document.documentElement.classList.add('dark')}}catch(e){}})();`;

// Runs before paint. After a refresh, a public page (one with the public menu bar,
// marked `data-public-nav`) starts at the top instead of where it was left: each
// time the browser puts the old scroll position back while the page loads, this
// undoes it. It stops as soon as the visitor scrolls, taps or presses a key, and
// shortly after loading ends. Only a refresh is handled, so the Back button still
// returns people to where they were; learner and admin pages are not affected.
const topOnRefreshScript = `(function(){try{var n=performance.getEntriesByType('navigation')[0];if(!n||n.type!=='reload')return;var top=function(){if(window.scrollY>0&&document.querySelector('[data-public-nav]'))window.scrollTo({top:0,behavior:'instant'})};var ev=['wheel','touchstart','keydown','mousedown'];var stop=function(){window.removeEventListener('scroll',top);ev.forEach(function(e){window.removeEventListener(e,stop,true)})};window.addEventListener('scroll',top);ev.forEach(function(e){window.addEventListener(e,stop,{capture:true,passive:true})});window.addEventListener('load',function(){top();setTimeout(function(){top();stop()},400)})}catch(e){}})();`;

// Canonical host — keep in sync with NEXT_PUBLIC_SITE_URL, robots.ts and sitemap.ts.
const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.leapcoach.in"
).replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    // Home uses this verbatim; child pages get "%s | LEAP Coach".
    default: "LEAP Coach — Leadership Coaching by Prof. Vishal Gupta (IIM Ahmedabad)",
    template: "%s | LEAP Coach",
  },
  description:
    "Learn leadership from Prof. Vishal Gupta of IIM Ahmedabad: video lessons, an AI tutor on every lesson, and assessments that give real feedback. Built for students, professionals, and entrepreneurs.",
  applicationName: "LEAP Coach",
  keywords: [
    "LEAP Coach",
    "leapcoach",
    "Vishal Gupta",
    "Prof. Vishal Gupta",
    "IIM Ahmedabad leadership",
    "leadership coaching",
    "leadership development India",
    "authentic performance",
    "AI tutor",
    "online leadership course",
  ],
  authors: [{ name: "Prof. Vishal Gupta", url: "https://www.profvishalgupta.com" }],
  creator: "LEAP Coach",
  publisher: "LEAP Coach",
  category: "education",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "LEAP Coach",
    title: "LEAP Coach — Leadership Coaching by Prof. Vishal Gupta (IIM Ahmedabad)",
    description:
      "An AI-enhanced leadership coaching platform built on the work of Prof. Vishal Gupta (IIM Ahmedabad): video lessons, a personal AI tutor, and assessments that teach as well as test.",
    url: siteUrl,
    locale: "en_IN",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "LEAP Coach" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "LEAP Coach — Leadership Coaching by Prof. Vishal Gupta",
    description:
      "AI-enhanced leadership coaching built on the work of Prof. Vishal Gupta (IIM Ahmedabad).",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: { icon: "/logo-mark.png", apple: "/logo-mark.png" },
};

// Machine-readable identity so Google (and AI answer engines) can resolve what
// "LEAP Coach" is, who is behind it, and which external profiles are the same
// entity. This is the highest-leverage signal for winning the brand-name query.
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name: "LEAP Coach",
      url: siteUrl,
      inLanguage: "en-IN",
      publisher: { "@id": `${siteUrl}/#organization` },
    },
    {
      "@type": "EducationalOrganization",
      "@id": `${siteUrl}/#organization`,
      name: "LEAP Coach",
      alternateName: ["LeapCoach", "LEAP Coach India"],
      url: siteUrl,
      logo: `${siteUrl}/logo.png`,
      description:
        "AI-enhanced leadership coaching platform built on the teaching of Prof. Vishal Gupta of IIM Ahmedabad, for students, professionals, and entrepreneurs.",
      founder: { "@id": `${siteUrl}/#vishalgupta` },
      sameAs: [
        "https://www.profvishalgupta.com",
        "https://www.linkedin.com/in/gvishal/",
        "https://www.youtube.com/@ProfVishalGupta",
      ],
    },
    {
      "@type": "Person",
      "@id": `${siteUrl}/#vishalgupta`,
      name: "Prof. Vishal Gupta",
      jobTitle: "Professor of Organizational Behaviour",
      worksFor: {
        "@type": "CollegeOrUniversity",
        name: "Indian Institute of Management Ahmedabad",
      },
      url: `${siteUrl}/about`,
      sameAs: [
        "https://www.profvishalgupta.com",
        "https://www.linkedin.com/in/gvishal/",
        "https://www.youtube.com/@ProfVishalGupta",
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${inter.variable} ${bricolage.variable} ${figtree.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: topOnRefreshScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {/* Framer Motion renders its `initial` state into the HTML, so scroll-reveal
            elements (the hero h1 among ~37 of them) ship as opacity:0 and only become
            visible once JS animates them. With scripting unavailable that content
            would never appear, so force it visible in that case. */}
        <noscript>
          <style
            dangerouslySetInnerHTML={{
              __html: '[style*="opacity:0"]{opacity:1!important;transform:none!important;filter:none!important}',
            }}
          />
        </noscript>
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>
          {isClerkConfigured ? (
            // Real auth: Clerk owns sessions/OAuth; the bridge feeds AppProvider.
            <ClerkProvider
              signInUrl="/login"
              signUpUrl="/signup"
              // Default post-auth landing for BOTH sign-in and sign-up (Google or
              // email). Without these, Clerk falls back to "/" (the hero) — the
              // /select-role redirect set on the OAuth call is lost in the new-user
              // sign-up transfer. /select-role self-routes to /admin, /dashboard, or
              // the role picker, so it's the correct universal destination.
              signInFallbackRedirectUrl="/select-role"
              signUpFallbackRedirectUrl="/select-role"
              afterSignOutUrl="/"
            >
              <ClerkAuthBridge>{children}</ClerkAuthBridge>
            </ClerkProvider>
          ) : (
            // Mock auth: app runs entirely on localStorage demo data, no keys needed.
            <MockAuthBridge>{children}</MockAuthBridge>
          )}
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

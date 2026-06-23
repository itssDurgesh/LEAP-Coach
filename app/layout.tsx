import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { ClerkAuthBridge } from "@/lib/auth/ClerkAuthBridge";
import { MockAuthBridge } from "@/lib/auth/MockAuthBridge";
import { isClerkConfigured } from "@/lib/clerk/config";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

// Runs before paint: re-applies a remembered dark choice so there's no flash.
// Default is light, so we only add the class when the user previously chose dark.
const themeScript = `(function(){try{if(localStorage.getItem('leap-theme')==='dark'){document.documentElement.classList.add('dark')}}catch(e){}})();`;

export const metadata: Metadata = {
  title: "LEAP Coach — Scale Human Wisdom",
  description:
    "High-quality, evidence-based learning for Students, Professionals, and Entrepreneurs. Leadership Excellence and Authentic Performance.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
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
      </body>
    </html>
  );
}

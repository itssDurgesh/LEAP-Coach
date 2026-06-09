import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/lib/store/AppProvider";
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
          <AppProvider>{children}</AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

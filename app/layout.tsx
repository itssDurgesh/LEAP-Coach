import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/lib/store/AppProvider";

export const metadata: Metadata = {
  title: "Leap Coach — Scale Human Wisdom",
  description:
    "AI-enhanced, avatar-led learning for Students, Professionals, and Entrepreneurs. Leadership Excellence and Authentic Performance.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
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
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}

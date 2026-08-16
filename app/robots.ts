import type { MetadataRoute } from "next";

// Canonical host — keep in sync with NEXT_PUBLIC_SITE_URL (www is primary).
const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.leapcoach.in"
).replace(/\/$/, "");

// Tell crawlers to index the public marketing pages and stay out of the
// signed-in app, the admin CMS, and API routes (nothing there to rank, and
// crawling it just wastes crawl budget).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api/",
          "/dashboard",
          "/learn/",
          "/account",
          "/my-topics",
          "/notifications",
          "/select-role",
          "/sso-callback",
          "/forgot-password",
          "/unsubscribe",
          "/u/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}

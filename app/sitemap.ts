import type { MetadataRoute } from "next";

// Canonical host — keep in sync with NEXT_PUBLIC_SITE_URL (www is primary).
const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.leapcoach.in"
).replace(/\/$/, "");

// The public, indexable marketing routes. Signed-in app routes are intentionally
// excluded (they're blocked in robots.ts). To also surface individual course and
// article pages, make this async and fetch their published slugs from Supabase.
const routes: Array<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}> = [
  { path: "", priority: 1.0, changeFrequency: "weekly" },
  { path: "courses", priority: 0.9, changeFrequency: "weekly" },
  { path: "about", priority: 0.8, changeFrequency: "monthly" },
  { path: "pricing", priority: 0.8, changeFrequency: "monthly" },
  { path: "articles", priority: 0.7, changeFrequency: "weekly" },
  { path: "team", priority: 0.7, changeFrequency: "monthly" },
  { path: "faq", priority: 0.6, changeFrequency: "monthly" },
  { path: "privacy", priority: 0.3, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return routes.map((r) => ({
    url: r.path ? `${siteUrl}/${r.path}` : `${siteUrl}/`,
    lastModified,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}

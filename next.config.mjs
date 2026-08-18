/**
 * Admin-uploaded media (course covers, book jackets, team photos) lives in Supabase
 * Storage, so next/image needs that host allow-listed before it will optimize it.
 * Derived from the same env var the client already reads, so pointing the app at a
 * different Supabase project can't silently break every image on the site.
 *
 * Anything NOT on this list still renders — see lib/images.ts, which flips those to
 * `unoptimized` rather than letting next/image throw on an admin-pasted URL.
 */
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname || null;
  } catch {
    return null;
  }
})();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost }]
      : [],
  },
};

export default nextConfig;

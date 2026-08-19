/**
 * next/image throws at render time on a remote host that isn't in
 * `images.remotePatterns` (next.config.mjs). Book covers, course thumbnails and team
 * photos are admin-pasted URLs that can point anywhere, so a strict allow-list would
 * turn one bad paste into a crashed page.
 *
 * `canOptimize` decides per-src: local /public assets and our own Supabase Storage
 * bucket go through the optimizer; everything else renders `unoptimized`, which still
 * gives us lazy-loading and reserved layout space (so no CLS), just no resizing.
 */
const OPTIMIZED_HOSTS = new Set(
  [
    (() => {
      try {
        return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
      } catch {
        return "";
      }
    })(),
  ].filter(Boolean),
);

export function canOptimize(src?: string | null): boolean {
  if (!src) return false;
  if (src.startsWith("/")) return true; // bundled /public asset
  try {
    return OPTIMIZED_HOSTS.has(new URL(src).hostname);
  } catch {
    return false;
  }
}

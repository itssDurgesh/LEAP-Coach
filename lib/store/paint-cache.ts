/**
 * The per-user "paint cache": a slimmed copy of the store that AppProvider keeps in
 * localStorage (Supabase mode only), so a reload paints at once from the last
 * snapshot and refreshes in the background.
 *
 * The version is part of the key. Bump it whenever the snapshot's contents change
 * meaning, so a browser holding an older snapshot ignores it instead of painting
 * data the current code no longer expects.
 */
const PREFIX = "leap-sb-cache-";
export const PAINT_CACHE_VERSION = "v2";

export function paintCacheKey(userId: string): string {
  return `${PREFIX}${PAINT_CACHE_VERSION}:${userId}`;
}

/**
 * Remove every paint-cache entry except `keepKey`: older versions, and other
 * accounts that signed in on this browser. Each can be megabytes, and they share
 * the ~5MB localStorage quota with everything else the site saves (video
 * positions, theme). Called with no argument by the error screens, so a reload
 * after a crash starts from the database rather than from a snapshot that may be
 * what broke the page.
 */
export function clearPaintCaches(keepKey?: string): void {
  try {
    const stale: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PREFIX) && key !== keepKey) stale.push(key);
    }
    for (const key of stale) localStorage.removeItem(key);
  } catch {
    /* storage blocked: nothing cached, nothing to clear */
  }
}

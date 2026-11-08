/**
 * The place a learner left a video, as remembered by this browser.
 *
 * Saved continuously while playing (cheap, local), next to the copy the store keeps
 * in the database (written on pause, on leaving and every half minute, so it reaches
 * the learner's other devices). Each carries the time it was saved; the player starts
 * from whichever is newer.
 */

export interface SavedPlace {
  seconds: number;
  /** When it was saved, ms since epoch (0 = unknown: an entry from before this format). */
  at: number;
}

export const placeKey = (learnerId: string | undefined, videoId: string) => `leap-video-pos:${learnerId ?? "anon"}:${videoId}`;

/** Nothing worth resuming in the opening seconds or the closing ones. */
export function resumable(seconds: number, duration: number): boolean {
  return seconds >= 5 && !(Number.isFinite(duration) && duration > 0 && seconds > duration - 5);
}

export function readPlace(key: string): SavedPlace | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    // Older entries are a bare number of seconds.
    const parsed: unknown = raw.trim().startsWith("{") ? JSON.parse(raw) : { seconds: Number(raw), at: 0 };
    const { seconds, at } = parsed as Partial<SavedPlace>;
    return typeof seconds === "number" && Number.isFinite(seconds) && seconds >= 0
      ? { seconds, at: typeof at === "number" && Number.isFinite(at) ? at : 0 }
      : null;
  } catch {
    return null; // storage blocked or the entry unreadable: start from the beginning
  }
}

export function writePlace(key: string, seconds: number): void {
  try {
    if (seconds > 0) localStorage.setItem(key, JSON.stringify({ seconds: Math.floor(seconds), at: Date.now() }));
    else localStorage.removeItem(key);
  } catch {
    /* storage blocked or full: resuming is a convenience, not a requirement */
  }
}

/** The newer of this browser's place and the database's (`remote`); 0 = from the start. */
export function startingPlace(local: SavedPlace | null, remote: SavedPlace | null): number {
  const pick = !local ? remote : !remote ? local : remote.at > local.at ? remote : local;
  return pick && pick.seconds > 0 ? pick.seconds : 0;
}

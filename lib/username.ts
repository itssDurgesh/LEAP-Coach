// Helpers for unique @usernames used to identify people in the discussion board.

/** Normalise any string into a valid handle: lowercase, a–z 0–9 and underscores. */
export function normalizeUsername(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 20);
}

/** A starting handle derived from the person's name (falling back to their email). */
export function baseUsername(name: string, email: string): string {
  const fromName = normalizeUsername(name);
  if (fromName) return fromName;
  const fromEmail = normalizeUsername((email || "").split("@")[0] || "");
  return fromEmail || "user";
}

/** Make `base` unique against a set of taken handles by appending a number. */
export function uniqueUsername(base: string, taken: Set<string>): string {
  const b = base || "user";
  if (!taken.has(b)) return b;
  let n = 1;
  while (taken.has(`${b}${n}`)) n++;
  return `${b}${n}`;
}

/** True when `candidate` is a valid handle not already taken by someone else. */
export function isUsernameAvailable(candidate: string, users: { id: string; username?: string }[], selfId?: string): boolean {
  const c = normalizeUsername(candidate);
  if (c.length < 3) return false;
  return !users.some((u) => u.id !== selfId && (u.username ?? "").toLowerCase() === c);
}

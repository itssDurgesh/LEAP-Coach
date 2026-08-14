import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names, resolving conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format an INR amount, e.g. 10000 -> "₹10,000". */
export function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format seconds as "Hh Mm" or "Mm" for course/video durations. */
export function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes > 0 ? `${minutes}m` : ""}`.trim();
  return `${minutes}m`;
}

/** Format seconds as a clock "MM:SS" for the video scrubber. */
export function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Coerce an admin-entered link into a safe absolute URL, or null if it can't be one.
 *
 * Admins paste links from all over ("Linkedin: https://…", ": https://…", a bare
 * "linkedin.com/in/x"). A value without a scheme is treated by the browser as a
 * RELATIVE path, so `href` lands on leapcoach.in/<garbage> → a 404 on our own site.
 * Returning null instead lets callers hide the icon rather than ship a broken link.
 */
export function normalizeExternalUrl(input?: string | null): string | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;

  // Prefer a real URL found anywhere in the string — strips pasted labels/prefixes.
  const found = raw.match(/https?:\/\/\S+/i);
  // Otherwise drop a leading "Label:" / ":" and any protocol-relative "//".
  let candidate = found ? found[0] : raw.replace(/^[^:/?#]{0,20}:\s*/, "").trim();
  if (!candidate) return null;
  if (candidate.startsWith("//")) candidate = `https:${candidate}`;
  // Bare domain ("linkedin.com/in/x") → assume https.
  if (!/^https?:\/\//i.test(candidate)) {
    if (!/^[^\s/]+\.[^\s/]{2,}/.test(candidate)) return null;
    candidate = `https://${candidate}`;
  }

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null; // no javascript:/data:
    return url.toString();
  } catch {
    return null;
  }
}

/** Relative "time ago" label from an ISO date string. */
export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

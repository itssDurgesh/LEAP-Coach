// Client-side downloads that keep a file's own bytes, type and name.
//
// Uploads live in the public Supabase Storage bucket (lib/supabase/storage.ts),
// which is a different origin from the site. Browsers ignore the `download`
// attribute on cross-origin links, so a plain <a download> just opens the file in
// place: the learner is taken off the page and the file keeps Storage's object key
// as its name. In the local demo, uploads are inline `data:` URLs instead.
// Both kinds are handled here.

const MIME_BY_EXT: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".txt": "text/plain",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
};

const EXT_RE = /\.[a-z0-9]{1,5}$/i;

/** Best-effort type for a file whose `type` the browser left blank. */
export function mimeForFilename(name: string): string {
  const ext = name.match(EXT_RE)?.[0].toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

function extForMime(type: string): string {
  const t = type.split(";")[0].trim().toLowerCase();
  if (t === "image/jpeg") return ".jpg";
  return Object.keys(MIME_BY_EXT).find((ext) => MIME_BY_EXT[ext] === t) ?? "";
}

/** `name`, plus an extension when it has none: from the URL's path, else from the type. */
function withExtension(name: string, url: string, type = ""): string {
  if (EXT_RE.test(name)) return name;
  let ext = "";
  if (!url.startsWith("data:")) {
    try {
      ext = new URL(url, window.location.href).pathname.match(EXT_RE)?.[0].toLowerCase() ?? "";
    } catch {
      /* not a parseable URL: fall back to the type */
    }
  }
  return name + (ext || extForMime(type));
}

/** Decode a `data:` URL into a Blob, keeping its declared type and raw bytes. */
function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) throw new Error("Malformed data URL");
  const header = dataUrl.slice("data:".length, comma);
  const payload = dataUrl.slice(comma + 1);
  const isBase64 = /;base64/i.test(header);
  const type = header.replace(/;base64/i, "").trim() || "application/octet-stream";
  if (!isBase64) return new Blob([decodeURIComponent(payload)], { type });
  // atob gives a binary string; copy it out byte by byte so the file stays intact.
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

function clickLink(href: string, filename?: string) {
  const a = document.createElement("a");
  a.href = href;
  if (filename) a.download = filename;
  a.rel = "noopener";
  // Firefox only starts the download when the link is in the document.
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Hand a Blob to the browser as a saved file called `filename`. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  clickLink(url, filename);
  // Revoking straight away cancels the download in Safari and Firefox.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** A public object in Supabase Storage, which can be asked to serve itself as a download. */
function storageObjectUrl(url: string): URL | null {
  try {
    const u = new URL(url);
    return u.pathname.includes("/storage/v1/object/public/") ? u : null;
  } catch {
    return null;
  }
}

/**
 * Save the file at `url` (a data URL or a remote file) as `filename`, without
 * leaving the page. Resolves once the browser has the download.
 *
 * - Supabase Storage files are requested with `?download=<name>`, which makes
 *   Storage send them as an attachment under that name. The browser streams the
 *   file into its own downloads, so a large workbook is never held in memory.
 * - Any other remote file is fetched into a Blob first. If that is blocked
 *   (no CORS), the file opens in a new tab rather than nothing happening.
 */
export async function downloadUrl(url: string, filename: string): Promise<void> {
  if (url.startsWith("data:")) {
    const blob = dataUrlToBlob(url);
    saveBlob(blob, withExtension(filename, url, blob.type));
    return;
  }
  const name = withExtension(filename, url);
  const storage = storageObjectUrl(url);
  if (storage) {
    storage.searchParams.set("download", name);
    clickLink(storage.toString());
    return;
  }
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    saveBlob(blob, withExtension(filename, url, blob.type));
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

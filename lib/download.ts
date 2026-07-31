// Client-side file downloads that preserve the original bytes and MIME type.
// Admin uploads are stored as base64 `data:` URLs (see CourseWizard), but the
// same fields may hold an http(s) CDN/storage URL — both are handled here.

/** Decode a `data:` URL into a Blob, keeping its declared MIME type and raw bytes. */
function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) throw new Error("Malformed data URL");
  const header = dataUrl.slice("data:".length, comma);
  const payload = dataUrl.slice(comma + 1);
  const isBase64 = /;base64/i.test(header);
  const type = header.replace(/;base64/i, "").trim() || "application/octet-stream";

  if (!isBase64) return new Blob([decodeURIComponent(payload)], { type });

  // atob gives a binary string — copy it out byte by byte so the PDF stays intact.
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

/** Hand a Blob to the browser as a file save, under `filename`. */
function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  // Firefox only fires the download if the anchor is in the document.
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking synchronously cancels the download in Safari/Firefox — let it start first.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Download whatever `url` points at (data URL or remote file) as `filename`.
 * Remote files are fetched into a Blob first, because the `download` attribute
 * is ignored on cross-origin links; if that fetch is blocked by CORS we open
 * the file in a new tab instead of failing silently.
 */
export async function downloadUrl(url: string, filename: string): Promise<void> {
  if (url.startsWith("data:")) {
    saveBlob(dataUrlToBlob(url), filename);
    return;
  }
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    saveBlob(await res.blob(), filename);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

/** Download a string as a UTF-8 text file. */
export function downloadText(text: string, filename: string): void {
  saveBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), filename);
}

/** Best-effort MIME type for a file whose `type` the browser left blank. */
export function mimeForFilename(name: string): string {
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
  switch (ext) {
    case ".pdf":
      return "application/pdf";
    case ".doc":
      return "application/msword";
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

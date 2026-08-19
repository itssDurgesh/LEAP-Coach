"use client";

import { getSupabase } from "@/lib/supabase/client";

const BUCKET = "media";

/** Strip anything that would make an awkward object key, keep the extension. */
function safeName(name: string): string {
  const dot = name.lastIndexOf(".");
  const stem = (dot > 0 ? name.slice(0, dot) : name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const ext = dot > 0 ? name.slice(dot).toLowerCase().replace(/[^a-z0-9.]/g, "") : "";
  const rand = Math.random().toString(36).slice(2, 8);
  return `${stem || "file"}-${Date.now().toString(36)}-${rand}${ext}`;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export interface UploadResult {
  /** Public URL when the file reached Storage, otherwise a base64 data URL. */
  url: string;
  name: string;
  /** False when we fell back to a data URL (mock mode, or the upload failed). */
  stored: boolean;
}

/**
 * Upload a file to the public `media` bucket and return its URL.
 *
 * Replaces the previous FileReader.readAsDataURL approach, which base64-encoded
 * every upload straight into a Postgres text column — so a 2MB PDF became ~2.7MB
 * in the row, and loadAll() shipped all of them to every user on every page load.
 *
 * Falls back to a data URL when Supabase isn't configured (mock/demo mode) or the
 * upload fails, so the admin console keeps working offline rather than losing the
 * file. Callers can check `stored` if they want to warn.
 */
export async function uploadMedia(file: File, folder: string): Promise<UploadResult> {
  const sb = getSupabase();
  const name = file.name;

  if (!sb) return { url: await readAsDataUrl(file), name, stored: false };

  const key = `${folder.replace(/^\/|\/$/g, "")}/${safeName(name)}`;
  try {
    const { error } = await sb.storage.from(BUCKET).upload(key, file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: file.type || undefined,
    });
    if (error) throw error;

    const { data } = sb.storage.from(BUCKET).getPublicUrl(key);
    if (!data?.publicUrl) throw new Error("No public URL returned");
    return { url: data.publicUrl, name, stored: true };
  } catch (e) {
    console.error("[storage] upload failed, falling back to data URL", e);
    return { url: await readAsDataUrl(file), name, stored: false };
  }
}

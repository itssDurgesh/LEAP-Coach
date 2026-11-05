import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SiteContent, DEFAULT_SITE_CONTENT } from "@/lib/types";
import { isSupabaseConfigured, SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

/**
 * Server reads of public tables, with the anon key: what any visitor's browser could
 * read too, so there is no reason to give these paths the service role.
 */
let anon: SupabaseClient | null = null;
function anonClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  anon ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  return anon;
}

/** A parent row embedded by PostgREST: an object, or (some versions) a one-item array. */
function one<T>(v: T | T[] | null | undefined): T | null {
  return (Array.isArray(v) ? v[0] : v) ?? null;
}

/** "missing": no such row. "error": the read failed, so nothing is known either way. */
export type ServerRead<T> = { ok: true; value: T } | { ok: false; reason: "missing" | "error" };

export interface LessonContext {
  courseTitle: string;
  title: string;
  transcript: string;
}

/**
 * One session's tutoring material, by video id: its title, its topic's title and
 * its transcript (the tutor's only source).
 *
 * The tutor's prompt is built from this, never from the request body. When it came
 * from the body, any signed-in caller could post an arbitrary "transcript" and steer
 * the system instruction, which made the route a general-purpose Gemini proxy.
 */
export async function fetchLessonContextServer(videoId: string): Promise<ServerRead<LessonContext>> {
  const sb = anonClient();
  if (!sb) return { ok: false, reason: "error" };
  try {
    const { data, error } = await sb
      .from("videos")
      .select("title, transcript, courses(title)")
      .eq("id", videoId)
      .maybeSingle();
    if (error) {
      console.error("[tutor] lesson read failed", error.message);
      return { ok: false, reason: "error" };
    }
    if (!data) return { ok: false, reason: "missing" };
    const course = one(data.courses as { title?: string } | { title?: string }[] | null);
    return {
      ok: true,
      value: { courseTitle: course?.title ?? "", title: data.title ?? "", transcript: data.transcript ?? "" },
    };
  } catch (e) {
    console.error("[tutor] lesson read failed", e instanceof Error ? e.message : e);
    return { ok: false, reason: "error" };
  }
}

export interface QuestionContext {
  courseTitle: string;
  type: string;
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

/**
 * One checkpoint question, by id, for a hint. Same reason as above: the prompt,
 * including the correct answer and explanation the model is told not to reveal,
 * comes from the database, not from the request body.
 */
export async function fetchQuestionContextServer(questionId: string): Promise<ServerRead<QuestionContext>> {
  const sb = anonClient();
  if (!sb) return { ok: false, reason: "error" };
  try {
    const { data, error } = await sb
      .from("questions")
      .select("type, prompt, options, correct_answer, explanation, assignments(courses(title))")
      .eq("id", questionId)
      .maybeSingle();
    if (error) {
      console.error("[hint] question read failed", error.message);
      return { ok: false, reason: "error" };
    }
    if (!data) return { ok: false, reason: "missing" };
    const assignment = one(data.assignments as { courses?: unknown } | { courses?: unknown }[] | null);
    const course = one(assignment?.courses as { title?: string } | { title?: string }[] | null | undefined);
    return {
      ok: true,
      value: {
        courseTitle: course?.title ?? "",
        type: data.type ?? "",
        prompt: data.prompt ?? "",
        options: Array.isArray(data.options) ? (data.options as unknown[]).map(String) : [],
        correctAnswer: data.correct_answer ?? "",
        explanation: data.explanation ?? "",
      },
    };
  } catch (e) {
    console.error("[hint] question read failed", e instanceof Error ? e.message : e);
    return { ok: false, reason: "error" };
  }
}

/**
 * Server-side read of the admin-edited homepage content (public RLS read, anon key).
 * The landing page passes this into the hero components so the SAVED content is in the
 * initial server-rendered HTML — no flash of default text before the client store
 * hydrates. Returns null in mock mode (then components fall back to the store/defaults).
 */
export async function fetchSiteContentServer(): Promise<SiteContent | null> {
  const sb = anonClient();
  if (!sb) return null;
  try {
    const { data } = await sb.from("site_content").select("content").eq("id", 1).maybeSingle();
    if (!data?.content) return null;
    // Merge with defaults exactly like the client load, so SSR and post-hydration
    // render identical objects (no React hydration mismatch).
    return { ...DEFAULT_SITE_CONTENT, ...(data.content as Partial<SiteContent>) };
  } catch {
    return null;
  }
}

import { createClient } from "@supabase/supabase-js";
import { SiteContent, DEFAULT_SITE_CONTENT } from "@/lib/types";
import { isSupabaseConfigured, SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

/**
 * Server-side read of the admin-edited homepage content (public RLS read, anon key).
 * The landing page passes this into the hero components so the SAVED content is in the
 * initial server-rendered HTML — no flash of default text before the client store
 * hydrates. Returns null in mock mode (then components fall back to the store/defaults).
 */
export interface LessonContext {
  courseTitle: string;
  title: string;
  summary: string;
  transcript: string;
}

/**
 * Server-side read of one lesson's grounding material, by video id.
 *
 * The AI tutor prompt is built from THIS, never from the request body — otherwise any
 * signed-in caller could post an arbitrary "transcript" and steer the system instruction
 * (prompt injection / free LLM proxy). `videos` and `courses` are public-RLS reads, so
 * the anon key is enough; no service role needed. Returns null in mock mode or when the
 * video doesn't exist.
 */
export async function fetchLessonContextServer(videoId: string): Promise<LessonContext | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const { data } = await sb
      .from("videos")
      .select("title, summary, transcript, courses(title)")
      .eq("id", videoId)
      .maybeSingle();
    if (!data) return null;
    // PostgREST returns an embedded parent as an object; some versions wrap it in an array.
    const parent = Array.isArray(data.courses) ? data.courses[0] : data.courses;
    return {
      courseTitle: (parent as { title?: string } | null)?.title ?? "",
      title: data.title ?? "",
      summary: data.summary ?? "",
      transcript: data.transcript ?? "",
    };
  } catch {
    return null;
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
 * Server-side read of one checkpoint question, by id — same reasoning as
 * `fetchLessonContextServer`: the hint prompt (including the "do not reveal" correct
 * answer and explanation) must come from the database, not from the request body.
 * `questions` is a public-RLS read, so the anon key is enough.
 */
export async function fetchQuestionContextServer(questionId: string): Promise<QuestionContext | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const { data } = await sb
      .from("questions")
      .select("type, prompt, options, correct_answer, explanation, assignments(courses(title))")
      .eq("id", questionId)
      .maybeSingle();
    if (!data) return null;
    // Unwrap the two-level embed (PostgREST may hand back objects or single-item arrays).
    const one = <T,>(v: T | T[] | null | undefined): T | null =>
      (Array.isArray(v) ? v[0] : v) ?? null;
    const assignment = one(data.assignments as unknown);
    const course = one((assignment as { courses?: unknown } | null)?.courses);
    return {
      courseTitle: (course as { title?: string } | null)?.title ?? "",
      type: data.type ?? "",
      prompt: data.prompt ?? "",
      options: Array.isArray(data.options) ? (data.options as string[]) : [],
      correctAnswer: data.correct_answer ?? "",
      explanation: data.explanation ?? "",
    };
  } catch {
    return null;
  }
}

export async function fetchSiteContentServer(): Promise<SiteContent | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const { data } = await sb.from("site_content").select("content").eq("id", 1).maybeSingle();
    if (!data?.content) return null;
    // Merge with defaults exactly like the client load, so SSR and post-hydration
    // render identical objects (no React hydration mismatch).
    return { ...DEFAULT_SITE_CONTENT, ...(data.content as Partial<SiteContent>) };
  } catch {
    return null;
  }
}

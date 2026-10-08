"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Video as VideoIcon,
  FileText,
  ScrollText,
  ClipboardList,
  Info,
  Eye,
  Upload,
  ImageIcon,
  BookMarked,
  Headphones,
  Loader2,
  Paperclip,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select, Field } from "@/components/ui/Field";
import { useApp } from "@/lib/store/AppProvider";
import { Course, Question, Resource, Role, ROLES, courseCategories, isOwner } from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";
import { uploadMedia } from "@/lib/supabase/storage";
import { isClerkConfigured } from "@/lib/clerk/config";
import { isSupabaseConfigured } from "@/lib/supabase/config";

interface DraftQuestion {
  tmpId: string;
  /** The saved question's id; absent until its first save. Kept so learners' past answers still match it. */
  id?: string;
  type: "mcq" | "fill_blank";
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}
interface DraftVideo {
  tmpId: string;
  /**
   * The saved session's id; absent until its first save. A session keeps its id for
   * life: learners' progress, notes and discussion hang off it, so it must not move
   * to another session when one above it is removed.
   */
  id?: string;
  title: string;
  muxPlaybackId: string;
  /** What the learner gets for this session: a Mux video or an uploaded audio recording. */
  media: "video" | "audio";
  audioUrl: string | null;
  audioName: string;
  durationMins: number;
  summary: string;
  notesPdfName: string;
  /** undefined = not loaded (leave stored file alone) · null = clear it · string = set it. */
  notesPdfUrl?: string | null;
  transcript: string;
  resources: Resource[];
}
interface DraftAssignment {
  tmpId: string;
  /** The saved checkpoint's id; absent until its first save. Learners' submissions hang off it. */
  id?: string;
  /** tmpId of the session this checkpoint follows. A link, not a position, so it stays with its session. */
  sessionTmpId: string;
  title: string;
  questions: DraftQuestion[];
}
interface Draft {
  id: string;
  title: string;
  description: string;
  categories: Role[];
  instructorName: string;
  instructorTitle: string;
  instructorBio: string;
  level: Course["level"];
  price: number;
  accessDurationDays: number; // 0 = standard 1 year (per-topic override for à-la-carte)
  accent: number;
  thumbnailUrl: string | null;
  workbookName: string | null;
  workbookUrl: string | null;
  hashtags: string[];
  tracks: string[];
  videos: DraftVideo[];
  assignments: DraftAssignment[];
  published: boolean;
}

const tmp = () => Math.random().toString(36).slice(2, 9);
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Uploads to the `media` bucket and hands the short public URL to `onDone`; a failed upload is reported, not stored. */
function uploadThen(file: File, folder: string, onDone: (url: string, name: string) => void) {
  return uploadFile(file, folder).then((r) => {
    if (r) onDone(r.url, r.name);
  });
}

/**
 * uploadMedia falls back to a base64 data URL when Storage rejects a file. In a
 * database row that is megabytes every learner downloads on every page load, so a
 * failed upload is reported instead. In the local demo (no sign-in, so Storage
 * refuses everything) the data URL is all there is, so it is kept.
 */
async function uploadFile(file: File, folder: string): Promise<{ url: string; name: string } | null> {
  const r = await uploadMedia(file, folder);
  if (!r.stored && isClerkConfigured && isSupabaseConfigured) {
    window.alert(`“${file.name}” could not be uploaded. It may be over the storage size limit, or the connection dropped. Please try again.`);
    return null;
  }
  return r;
}

/** The recording's length in whole minutes, read from the file itself (null if the browser can't tell). */
function audioMinutes(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const done = (mins: number | null) => {
      URL.revokeObjectURL(url);
      resolve(mins);
    };
    audio.onloadedmetadata = () => done(Number.isFinite(audio.duration) ? Math.max(1, Math.round(audio.duration / 60)) : null);
    audio.onerror = () => done(null);
    audio.src = url;
  });
}

function newVideo(): DraftVideo {
  return { tmpId: tmp(), title: "", muxPlaybackId: "", media: "video", audioUrl: null, audioName: "", durationMins: 20, summary: "", notesPdfName: "", notesPdfUrl: null, transcript: "", resources: [] };
}

function blankDraft(): Draft {
  return {
    id: `c_${tmp()}`,
    title: "",
    description: "",
    categories: ["professional"],
    instructorName: "",
    instructorTitle: "",
    instructorBio: "",
    level: "Beginner",
    price: 0,
    accessDurationDays: 0,
    accent: 0,
    thumbnailUrl: null,
    workbookName: null,
    workbookUrl: null,
    hashtags: ["", "", "", ""],
    tracks: [],
    videos: [newVideo()],
    assignments: [],
    published: false,
  };
}

/** `base`, or `base-2`, `base-3`… when another topic already has it (slugs are unique in the database). */
function uniqueSlug(base: string, taken: Set<string>): string {
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

/** Older saves filled in this made-up name for a session with no notes file; it is not an upload. */
const isAutoNotesName = (courseId: string, name?: string) =>
  !!name && name.startsWith(`${courseId}-session-`) && name.endsWith("-notes.pdf");

/** A session learners can actually play: a real Mux id (not the `mux_…` placeholder) or an uploaded recording. */
const hasMedia = (v: DraftVideo) =>
  v.media === "audio" ? !!v.audioUrl : !!v.muxPlaybackId.trim() && !v.muxPlaybackId.startsWith("mux_");

/** What must be fixed before this draft can be saved, or (with `publish`) go live. Empty = nothing. */
function blockersFor(d: Draft, publish: boolean): string[] {
  const out: string[] = [];
  if (!d.title.trim()) out.push("Give the topic a title (Basic Info).");
  if (!publish) return out;
  for (const a of d.assignments) {
    const session = d.videos.findIndex((v) => v.tmpId === a.sessionTmpId) + 1;
    a.questions
      .filter((q) => q.prompt.trim())
      .forEach((q, i) => {
        const options = q.options.filter((o) => o.trim());
        // Without a marked answer among the options, no learner can ever get it right.
        if (options.length < 2 || !options.includes(q.correctAnswer))
          out.push(`Checkpoint after session ${session}, question ${i + 1}: add at least two options and mark the correct one (Assignments).`);
      });
  }
  return out;
}

function toDraft(c: Course): Draft {
  const sessions = c.videos.slice().sort((a, b) => a.order - b.order);
  const videos: DraftVideo[] = sessions.map((v) => ({
    tmpId: tmp(),
    id: v.id,
    title: v.title,
    muxPlaybackId: v.muxPlaybackId,
    media: v.audioUrl ? "audio" : "video",
    audioUrl: v.audioUrl ?? null,
    audioName: v.audioName ?? "",
    durationMins: Math.round(v.durationSeconds / 60),
    summary: v.summary,
    notesPdfName: isAutoNotesName(c.id, v.notesPdfName) ? "" : (v.notesPdfName ?? ""),
    notesPdfUrl: v.notesPdfUrl, // keep undefined as-is — see DraftVideo
    transcript: v.transcript,
    resources: v.resources ?? [],
  }));
  const sessionAt = new Map(sessions.map((v, i) => [v.order, videos[i].tmpId]));
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    categories: courseCategories(c),
    instructorName: c.instructorName,
    instructorTitle: c.instructorTitle,
    instructorBio: c.instructorBio,
    level: c.level,
    price: c.price,
    accessDurationDays: c.accessDurationDays ?? 0,
    accent: c.accent,
    thumbnailUrl: c.thumbnailUrl ?? null,
    workbookName: c.workbookName ?? null,
    workbookUrl: c.workbookUrl ?? null,
    hashtags: [...c.hashtags, "", "", "", ""].slice(0, 4),
    tracks: c.tracks,
    videos,
    assignments: c.assignments
      .slice()
      .sort((a, b) => a.afterVideoOrder - b.afterVideoOrder)
      // A checkpoint with no session to follow can never be opened by a learner.
      .filter((a) => sessionAt.has(a.afterVideoOrder))
      .map((a) => ({
        tmpId: tmp(),
        id: a.id,
        sessionTmpId: sessionAt.get(a.afterVideoOrder)!,
        title: a.title,
        questions: a.questions.map((q) => ({
          tmpId: tmp(),
          id: q.id,
          type: q.type,
          prompt: q.prompt,
          options: [...q.options, "", "", "", ""].slice(0, 4),
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
        })),
      })),
    published: c.published,
  };
}

function toCourse(d: Draft, existing: Course | undefined, takenSlugs: Set<string>): Course {
  const categories = d.categories.length ? d.categories : ["professional" as Role];
  const videos = d.videos.map((v, i) => ({
    // Never derived from the position: see DraftVideo.id.
    id: v.id ?? `${d.id}_v_${v.tmpId}`,
    courseId: d.id,
    title: v.title || `Session ${i + 1}`,
    order: i + 1,
    durationSeconds: Math.round((v.durationMins || 0) * 60),
    muxPlaybackId: v.muxPlaybackId || `mux_${d.id}_v${i + 1}`,
    // The Mux id is kept when a session is switched to audio, so switching back loses nothing.
    audioUrl: v.media === "audio" ? v.audioUrl : null,
    audioName: v.media === "audio" && v.audioUrl ? v.audioName : null,
    transcript: v.transcript,
    summary: v.summary,
    notesPdfName: v.notesPdfName.trim(),
    notesPdfUrl: v.notesPdfUrl,
    resources: v.resources.map((r) => ({ ...r, title: r.title.trim() || "Resource" })),
  }));
  const orderOf = new Map(d.videos.map((v, i) => [v.tmpId, i + 1]));
  const assignments = d.assignments
    .filter((a) => orderOf.has(a.sessionTmpId))
    .map((a) => ({
      id: a.id ?? `${d.id}_a_${a.tmpId}`,
      courseId: d.id,
      afterVideoOrder: orderOf.get(a.sessionTmpId)!,
      title: a.title || `Checkpoint after session ${orderOf.get(a.sessionTmpId)}`,
      questions: a.questions
        .filter((q) => q.prompt.trim())
        .map<Question>((q) => ({
          id: q.id ?? `${d.id}_q_${q.tmpId}`,
          type: q.type,
          prompt: q.prompt,
          options: q.options.filter((o) => o.trim()),
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
        })),
    }))
    .filter((a) => a.questions.length > 0);

  return {
    id: d.id,
    slug: existing?.slug ?? uniqueSlug(slugify(d.title) || d.id, takenSlugs),
    title: d.title || "Untitled topic",
    description: d.description,
    category: categories[0],
    categories,
    instructorName: d.instructorName || "LEAP Coach Faculty",
    instructorTitle: d.instructorTitle || "Instructor",
    instructorBio: d.instructorBio,
    instructorInitials:
      (d.instructorName || "LC")
        .split(/\s+/)
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
    hashtags: d.hashtags.filter((h) => h.trim()),
    tracks: d.tracks,
    level: d.level,
    rating: existing?.rating ?? 0,
    ratingCount: existing?.ratingCount ?? 0,
    enrolledCount: existing?.enrolledCount ?? 0,
    purchaseCount: existing?.purchaseCount ?? 0,
    price: d.price,
    trending: existing?.trending ?? false,
    published: d.published,
    accent: d.accent,
    accessDurationDays: d.accessDurationDays && d.accessDurationDays > 0 ? d.accessDurationDays : null,
    thumbnailUrl: d.thumbnailUrl,
    workbookName: d.workbookName,
    workbookUrl: d.workbookUrl,
    pendingApproval: existing?.pendingApproval ?? false,
    submittedBy: existing?.submittedBy ?? null,
    videos,
    assignments,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
}

const STEPS = [
  { label: "Basic Info", icon: Info },
  { label: "Sessions", icon: VideoIcon },
  { label: "Notes", icon: FileText },
  { label: "Resources", icon: Paperclip },
  { label: "Transcripts", icon: ScrollText },
  { label: "Assignments", icon: ClipboardList },
  { label: "Review & Publish", icon: Eye },
];

export function CourseWizard({ initial }: { initial?: Course }) {
  const { saveCourse, tracks, currentUser, courses } = useApp();
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [draft, setDraft] = React.useState<Draft>(() => (initial ? toDraft(initial) : blankDraft()));
  const owner = isOwner(currentUser);
  const [saving, setSaving] = React.useState(false);
  const [problem, setProblem] = React.useState<{ title: string; items: string[] } | null>(null);
  // Files still on their way up. Saving before they land would save the topic without them.
  const [uploading, setUploading] = React.useState(0);
  const trackUpload = React.useCallback((busy: boolean) => setUploading((n) => Math.max(0, n + (busy ? 1 : -1))), []);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const setVideo = (i: number, patch: Partial<DraftVideo>) =>
    setDraft((d) => ({ ...d, videos: d.videos.map((v, idx) => (idx === i ? { ...v, ...patch } : v)) }));
  // By tmpId and from the latest state: several files upload one after another, and
  // a session can be removed while one is still on its way.
  const patchVideo = (tmpId: string, patch: (v: DraftVideo) => Partial<DraftVideo>) =>
    setDraft((d) => ({ ...d, videos: d.videos.map((v) => (v.tmpId === tmpId ? { ...v, ...patch(v) } : v)) }));
  const setAssignment = (i: number, patch: Partial<DraftAssignment>) =>
    setDraft((d) => ({ ...d, assignments: d.assignments.map((a, idx) => (idx === i ? { ...a, ...patch } : a)) }));

  const toggleCategory = (r: Role) =>
    setDraft((d) => ({
      ...d,
      categories: d.categories.includes(r) ? d.categories.filter((x) => x !== r) : [...d.categories, r],
    }));

  // One checkpoint per session: the lesson page only ever looks for the first.
  const freeSession = draft.videos.find((v) => !draft.assignments.some((a) => a.sessionTmpId === v.tmpId));

  function addAssignment() {
    if (!freeSession) return;
    set({ assignments: [...draft.assignments, { tmpId: tmp(), sessionTmpId: freeSession.tmpId, title: "", questions: [] }] });
  }

  /** Removes a session together with its checkpoint. Says first what learners lose when it was already saved. */
  function removeSession(v: DraftVideo, i: number) {
    const checkpoint = draft.assignments.find((a) => a.sessionTmpId === v.tmpId);
    if (v.id || checkpoint) {
      const lost = v.id
        ? `When you save, learners' progress, notes and discussion for this session are deleted${
            checkpoint ? ", along with its checkpoint and their results for it" : ""
          }.`
        : "Its checkpoint is removed too.";
      if (!window.confirm(`Remove session ${i + 1}${v.title ? ` “${v.title}”` : ""}?\n\n${lost}`)) return;
    }
    setDraft((d) => ({
      ...d,
      videos: d.videos.filter((x) => x.tmpId !== v.tmpId),
      assignments: d.assignments.filter((a) => a.sessionTmpId !== v.tmpId),
    }));
  }

  function removeAssignment(a: DraftAssignment) {
    if (a.id && !window.confirm("Remove this checkpoint?\n\nWhen you save, learners' results for it are deleted.")) return;
    setDraft((d) => ({ ...d, assignments: d.assignments.filter((x) => x.tmpId !== a.tmpId) }));
  }

  async function save(publish: boolean) {
    const blockers = blockersFor(draft, publish);
    if (blockers.length) {
      setProblem({ title: publish ? "Fix these before it can go live:" : "Fix this before saving:", items: blockers });
      return;
    }
    if (publish) {
      const empty = draft.videos.map((v, i) => (hasMedia(v) ? 0 : i + 1)).filter(Boolean);
      const which = empty.length === 1 ? `Session ${empty[0]} has` : `Sessions ${empty.join(", ")} have`;
      if (empty.length && !window.confirm(`${which} no video or audio yet. Learners would see a placeholder player there.\n\nContinue anyway?`)) return;
    }
    // A sub-admin's save always goes to the main admin for approval, which unpublishes the topic until then.
    if (!owner && initial?.published && !window.confirm("This topic is live. Saving sends it to the main admin for approval, and learners cannot open it until it is approved.\n\nSave anyway?")) return;

    setProblem(null);
    setSaving(true);
    const takenSlugs = new Set(courses.filter((c) => c.id !== draft.id).map((c) => c.slug));
    const result = await saveCourse(toCourse({ ...draft, published: publish }, initial, takenSlugs));
    if (!result.ok) {
      setSaving(false);
      setProblem({ title: "The topic was not saved. Your edits are still here; try again.", items: [result.error ?? "The database did not accept it."] });
      return;
    }
    router.push("/admin/courses");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      {/* Stepper */}
      <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <ol className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-1">
          {STEPS.map((s, i) => (
            <li key={s.label}>
              <button
                onClick={() => setStep(i)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors",
                  i === step ? "bg-v2-strong text-v2-on-strong" : i < step ? "text-heading hover:bg-surface-2" : "text-faint hover:bg-surface-2",
                )}
              >
                <span
                  className={cn(
                    "grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs",
                    i < step ? "bg-lv-orgs text-white" : i === step ? "bg-[#E9B93E] text-navy-900" : "bg-surface-2 text-faint",
                  )}
                >
                  {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="whitespace-nowrap">{s.label}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      {/* Step content */}
      <div className="min-w-0">
        <Card padded>
          <h2 className="font-heading text-xl font-bold text-heading">{STEPS[step].label}</h2>

          {step === 0 && (
            <div className="mt-5 space-y-4">
              <Field label="Topic title" required>
                <Input value={draft.title} onChange={(e) => set({ title: e.target.value })} placeholder="The Authentic Leader" />
              </Field>
              <Field label="Description">
                <Textarea value={draft.description} onChange={(e) => set({ description: e.target.value })} placeholder="What learners will gain…" />
              </Field>

              {/* Multi-category */}
              <Field label="Categories" hint="A topic can belong to more than one path. Pick all that apply.">
                <div className="flex flex-wrap gap-2">
                  {ROLES.map((r) => {
                    const on = draft.categories.includes(r.id);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => toggleCategory(r.id)}
                        className={cn(
                          "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                          on ? "border-gold-400 bg-v2-gold-soft text-v2-gold-text" : "border-v2-line-strong text-muted hover:border-heading",
                        )}
                      >
                        {on && <Check className="mr-1 inline h-3.5 w-3.5" />}
                        {r.label}
                      </button>
                    );
                  })}
                </div>
              </Field>

              {/* Thumbnail */}
              <Field label="Thumbnail" hint="Upload a cover image, or pick a brand style below.">
                <div className="flex items-center gap-4">
                  <div className="h-20 w-32 shrink-0 overflow-hidden rounded-lg border border-hair bg-surface-2">
                    {draft.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={draft.thumbnailUrl} alt="cover" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-faint">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <UploadButton
                      onBusy={trackUpload}
                      accept="image/*"
                      label="Upload image"
                      onFile={(f) => uploadThen(f, "course-thumbnails", (url) => set({ thumbnailUrl: url }))}
                    />
                    {draft.thumbnailUrl && (
                      <button type="button" onClick={() => set({ thumbnailUrl: null })} className="block text-xs text-faint hover:text-red-600">
                        Remove image
                      </button>
                    )}
                  </div>
                </div>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Level">
                  <Select value={draft.level} onChange={(e) => set({ level: e.target.value as Course["level"] })}>
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                  </Select>
                </Field>
                <Field label="Thumbnail style (no image)">
                  <Select value={draft.accent} onChange={(e) => set({ accent: Number(e.target.value) })}>
                    {[0, 1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>Style {n + 1}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Instructor name">
                  <Input value={draft.instructorName} onChange={(e) => set({ instructorName: e.target.value })} placeholder="Prof. Vishal Gupta" />
                </Field>
                <Field label="Instructor title">
                  <Input value={draft.instructorTitle} onChange={(e) => set({ instructorTitle: e.target.value })} placeholder="Professor, IIM Ahmedabad" />
                </Field>
              </div>
              <Field label="Instructor bio">
                <Textarea value={draft.instructorBio} onChange={(e) => set({ instructorBio: e.target.value })} className="min-h-[72px]" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Price (INR, 0 = free)">
                  <Input type="number" min={0} value={draft.price} onChange={(e) => set({ price: Number(e.target.value) })} />
                </Field>
                <Field label="Access duration (days)" hint="Optional override for an à-la-carte purchase of this topic. Blank / 0 = the standard 1 year after purchase. Catalog passes & all-access always run 1 year.">
                  <Input
                    type="number"
                    min={0}
                    value={draft.accessDurationDays}
                    onChange={(e) => set({ accessDurationDays: Math.max(0, Number(e.target.value)) })}
                    placeholder="365"
                  />
                </Field>
              </div>
              <Field label="Hashtags (4)" hint="Shown on the topic card and power recommendations.">
                <div className="grid grid-cols-2 gap-2">
                  {draft.hashtags.map((h, i) => (
                    <Input
                      key={i}
                      value={h}
                      onChange={(e) => set({ hashtags: draft.hashtags.map((x, idx) => (idx === i ? e.target.value : x)) })}
                      placeholder={`#Hashtag${i + 1}`}
                    />
                  ))}
                </div>
              </Field>
              <Field label="Leadership tracks">
                <div className="flex flex-wrap gap-2">
                  {tracks.map((t) => {
                    const on = draft.tracks.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => set({ tracks: on ? draft.tracks.filter((x) => x !== t.id) : [...draft.tracks, t.id] })}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-sm font-medium",
                          on ? "border-gold-400 bg-v2-gold-soft text-v2-gold-text" : "border-v2-line-strong text-muted hover:border-heading",
                        )}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="mt-5 space-y-4">
              <p className="text-sm text-muted">
                Each session is either a video (Mux playback ID) or an audio recording you upload. Order defines the roadmap.
              </p>
              {draft.videos.map((v, i) => (
                <div key={v.tmpId} className="rounded-xl border border-hair p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-heading text-sm font-semibold text-heading">Session {i + 1}</span>
                    {draft.videos.length > 1 && (
                      <button type="button" title="Remove session" onClick={() => removeSession(v, i)} className="text-faint hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-2.5">
                    <Input value={v.title} onChange={(e) => setVideo(i, { title: e.target.value })} placeholder="Session title" />
                    <div className="inline-flex rounded-full bg-surface-2 p-1" role="group" aria-label={`Session ${i + 1} format`}>
                      {(["video", "audio"] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          aria-pressed={v.media === m}
                          onClick={() => setVideo(i, { media: m })}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium capitalize transition-colors",
                            v.media === m ? "bg-v2-strong text-v2-on-strong" : "text-muted hover:text-heading",
                          )}
                        >
                          {m === "video" ? <VideoIcon className="h-3.5 w-3.5" /> : <Headphones className="h-3.5 w-3.5" />}
                          {m}
                        </button>
                      ))}
                    </div>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {v.media === "video" ? (
                        <Input value={v.muxPlaybackId} onChange={(e) => setVideo(i, { muxPlaybackId: e.target.value })} placeholder="Mux playback ID" />
                      ) : (
                        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                          <UploadButton
                            onBusy={trackUpload}
                            accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac"
                            label={v.audioUrl ? "Replace audio" : "Upload audio"}
                            onFile={async (f) => {
                              const [up, mins] = await Promise.all([uploadFile(f, "session-audio"), audioMinutes(f)]);
                              if (up) patchVideo(v.tmpId, () => ({ audioUrl: up.url, audioName: up.name, ...(mins ? { durationMins: mins } : {}) }));
                            }}
                          />
                          {v.audioUrl && (
                            <span className="inline-flex min-w-0 items-center gap-2 text-sm text-heading">
                              <span className="truncate">{v.audioName || "Audio file"}</span>
                              <button
                                type="button"
                                title="Remove audio"
                                onClick={() => setVideo(i, { audioUrl: null, audioName: "" })}
                                className="shrink-0 text-faint hover:text-red-600"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          )}
                        </div>
                      )}
                      <Input type="number" min={1} value={v.durationMins} onChange={(e) => setVideo(i, { durationMins: Number(e.target.value) })} placeholder="Duration (mins)" />
                    </div>
                    {v.media === "audio" &&
                      (v.audioUrl ? (
                        <audio controls preload="none" src={v.audioUrl} className="h-10 w-full" />
                      ) : (
                        <p className="text-xs text-faint">MP3, M4A, WAV or OGG. Learners hear this in place of a video.</p>
                      ))}
                    <Input value={v.summary} onChange={(e) => setVideo(i, { summary: e.target.value })} placeholder="One-line summary (shown under the session title)" />
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={() => set({ videos: [...draft.videos, newVideo()] })}>
                <Plus className="h-4 w-4" /> Add session
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="mt-5 space-y-3">
              <p className="text-sm text-muted">Upload a notes file per session (PDF). Learners can download it on the lesson page.</p>
              {draft.videos.map((v, i) => (
                <div key={v.tmpId} className="flex flex-wrap items-center gap-3 rounded-xl border border-hair p-3">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-surface-2 text-muted">
                    <FileText className="h-4 w-4" />
                  </span>
                  <span className="w-24 shrink-0 text-sm font-medium text-heading">Session {i + 1}</span>
                  <Input
                    value={v.notesPdfName}
                    onChange={(e) => setVideo(i, { notesPdfName: e.target.value })}
                    placeholder="session-notes.pdf"
                    className="min-w-[160px] flex-1"
                  />
                  <UploadButton
                    onBusy={trackUpload}
                    accept=".pdf,.doc,.docx,application/pdf"
                    // notesPdfUrl is not in the bulk read any more; the stored file NAME is,
                    // so use that to decide whether a file already exists.
                    label={v.notesPdfName ? "Replace" : "Upload"}
                    onFile={(f) => uploadThen(f, "class-notes", (url, name) => setVideo(i, { notesPdfUrl: url, notesPdfName: name }))}
                  />
                  {v.notesPdfName && (
                    <>
                      <Badge variant="success"><Check className="h-3 w-3" /> Uploaded</Badge>
                      <button
                        type="button"
                        title="Remove notes file"
                        onClick={() => setVideo(i, { notesPdfUrl: null, notesPdfName: "" })}
                        className="text-faint hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="mt-5 space-y-4">
              <p className="text-sm text-muted">
                Add as many files as you like to each session (PDF or Word). Learners find them in the Resources tab of that lesson.
              </p>
              {draft.videos.map((v, i) => (
                <div key={v.tmpId} className="rounded-xl border border-hair p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="min-w-0 truncate font-heading text-sm font-semibold text-heading">
                      Session {i + 1}
                      {v.title ? ` · ${v.title}` : ""}
                    </span>
                    <UploadButton
                      onBusy={trackUpload}
                      multiple
                      accept=".pdf,.doc,.docx,application/pdf"
                      label="Add files"
                      onFile={async (f) => {
                        const up = await uploadFile(f, "resources");
                        if (!up) return;
                        const resource: Resource = {
                          id: `r_${tmp()}`,
                          title: up.name.replace(/\.[a-z0-9]+$/i, ""),
                          type: /\.pdf$/i.test(up.name) ? "pdf" : "doc",
                          url: up.url,
                        };
                        patchVideo(v.tmpId, (cur) => ({ resources: [...cur.resources, resource] }));
                      }}
                    />
                  </div>
                  {v.resources.length === 0 ? (
                    <p className="mt-2 text-xs text-faint">No files yet.</p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {v.resources.map((r) => (
                        <li key={r.id} className="flex items-center gap-2.5">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted">
                            <FileText className="h-4 w-4" />
                          </span>
                          <Input
                            value={r.title}
                            aria-label="Resource name"
                            onChange={(e) =>
                              patchVideo(v.tmpId, (cur) => ({
                                resources: cur.resources.map((x) => (x.id === r.id ? { ...x, title: e.target.value } : x)),
                              }))
                            }
                            className="min-w-0 flex-1 py-2 text-sm"
                          />
                          <Badge variant="neutral" className="shrink-0 uppercase">{r.type}</Badge>
                          <a href={r.url} target="_blank" rel="noopener noreferrer" title="Open file" className="shrink-0 text-faint hover:text-heading">
                            <Eye className="h-4 w-4" />
                          </a>
                          <button
                            type="button"
                            title="Remove"
                            onClick={() => patchVideo(v.tmpId, (cur) => ({ resources: cur.resources.filter((x) => x.id !== r.id) }))}
                            className="shrink-0 text-faint hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="mt-5 space-y-4">
              <p className="text-sm text-muted">Paste each session&rsquo;s transcript. The LEAP AI tutor answers only from this text, so a session with no transcript has no tutor.</p>
              {draft.videos.map((v, i) => (
                <Field key={v.tmpId} label={`Session ${i + 1}${v.title ? ` · ${v.title}` : ""}`}>
                  <Textarea value={v.transcript} onChange={(e) => setVideo(i, { transcript: e.target.value })} placeholder="Full transcript…" />
                </Field>
              ))}
            </div>
          )}

          {step === 5 && (
            <div className="mt-5 space-y-5">
              <p className="text-sm text-muted">
                Add checkpoints wherever you like — choose the session each one unlocks after. Mark the correct option per question.
              </p>
              {draft.assignments.length === 0 && (
                <p className="text-sm text-faint">No checkpoints yet. Add one below — they&rsquo;re optional.</p>
              )}
              {draft.assignments.map((a, i) => (
                <AssignmentEditor
                  key={a.tmpId}
                  assignment={a}
                  sessions={draft.videos.map((v) => ({
                    tmpId: v.tmpId,
                    taken: draft.assignments.some((x) => x !== a && x.sessionTmpId === v.tmpId),
                  }))}
                  onChange={(patch) => setAssignment(i, patch)}
                  onRemove={() => removeAssignment(a)}
                />
              ))}
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" onClick={addAssignment} disabled={!freeSession}>
                  <Plus className="h-4 w-4" /> Add checkpoint
                </Button>
                {!freeSession && draft.assignments.length > 0 && (
                  <span className="text-xs text-faint">Every session already has a checkpoint.</span>
                )}
              </div>

              {/* Final workbook */}
              <div className="rounded-xl border border-hair p-4">
                <div className="flex items-center gap-2">
                  <BookMarked className="h-5 w-5 text-gold-600" />
                  <h3 className="font-heading text-sm font-semibold text-heading">Final workbook (optional)</h3>
                </div>
                <p className="mt-1 text-sm text-muted">
                  Upload a workbook as the final assignment. Learners download it as a PDF or editable DOCX.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <UploadButton
                    onBusy={trackUpload}
                    accept=".pdf,.doc,.docx,application/pdf"
                    label={draft.workbookUrl ? "Replace workbook" : "Upload workbook"}
                    onFile={(f) => uploadThen(f, "workbooks", (url, name) => set({ workbookUrl: url, workbookName: name }))}
                  />
                  {draft.workbookName && (
                    <span className="inline-flex items-center gap-2 text-sm text-heading">
                      <FileText className="h-4 w-4 text-gold-600" /> {draft.workbookName}
                      <button type="button" onClick={() => set({ workbookUrl: null, workbookName: null })} className="text-faint hover:text-red-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="mt-5 space-y-4">
              <div className="rounded-xl border border-hair bg-surface-2 p-4">
                <p className="font-heading text-lg font-bold text-heading">{draft.title || "Untitled topic"}</p>
                <p className="mt-1 whitespace-pre-line text-sm text-muted">{draft.description || "No description."}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  {draft.categories.map((c) => (
                    <Badge key={c} variant="navy" className="capitalize">{c}</Badge>
                  ))}
                  <Badge variant="neutral">{draft.level}</Badge>
                  <Badge variant="gold">{draft.price === 0 ? "Free" : formatINR(draft.price)}</Badge>
                </div>
                <ul className="mt-3 space-y-1 text-sm text-muted">
                  <li>• {draft.videos.length} sessions ({draft.videos.reduce((s, v) => s + (v.durationMins || 0), 0)} mins)</li>
                  <li>• {draft.assignments.filter((a) => a.questions.some((q) => q.prompt.trim())).length} checkpoints</li>
                  <li>• {draft.videos.filter((v) => v.media === "audio" && v.audioUrl).length} audio sessions</li>
                  <li>• {draft.videos.reduce((s, v) => s + v.resources.length, 0)} resource files</li>
                  <li>• Workbook: {draft.workbookName ?? "none"}</li>
                  <li>• Access: {draft.accessDurationDays > 0 ? `${draft.accessDurationDays} days after purchase` : "1 year after purchase"}</li>
                  <li>• Instructor: {draft.instructorName || "—"}</li>
                </ul>
              </div>

              {problem && (
                <div role="alert" className="rounded-[14px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <p className="font-semibold">{problem.title}</p>
                  <ul className="mt-1.5 list-disc space-y-1 pl-5">
                    {problem.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {!owner && (
                <div className="rounded-[14px] bg-v2-gold-soft p-4 text-sm text-heading">
                  As a sub-admin, your topic is sent to the main admin for approval before it goes live.
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <Button onClick={() => save(true)} disabled={saving || uploading > 0}>
                  <Check className="h-4 w-4" /> {saving ? "Saving…" : owner ? "Publish topic" : "Submit for approval"}
                </Button>
                <Button variant="outline" onClick={() => save(false)} disabled={saving || uploading > 0}>
                  Save as draft
                </Button>
                {uploading > 0 && (
                  <span className="self-center text-sm text-muted">Waiting for {uploading === 1 ? "an upload" : "uploads"} to finish…</span>
                )}
              </div>
            </div>
          )}

          {/* Nav */}
          <div className="mt-7 flex items-center justify-between border-t border-hair pt-5">
            <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            {step < STEPS.length - 1 && (
              <Button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function UploadButton({
  accept,
  label,
  onFile,
  multiple,
  onBusy,
}: {
  accept: string;
  label: string;
  /** Called once per chosen file, one after another; the button waits for a returned promise. */
  onFile: (f: File) => void | Promise<void>;
  multiple?: boolean;
  /** Told when an upload starts (true) and when it has finished (false). */
  onBusy?: (busy: boolean) => void;
}) {
  const ref = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (!files.length) return;
          setBusy(true);
          onBusy?.(true);
          try {
            for (const f of files) await onFile(f);
          } finally {
            setBusy(false);
            onBusy?.(false);
          }
        }}
      />
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => ref.current?.click()}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {busy ? "Uploading…" : label}
      </Button>
    </>
  );
}

function AssignmentEditor({
  assignment,
  sessions,
  onChange,
  onRemove,
}: {
  assignment: DraftAssignment;
  /** Every session in roadmap order; `taken` = another checkpoint already follows it. */
  sessions: { tmpId: string; taken: boolean }[];
  onChange: (patch: Partial<DraftAssignment>) => void;
  onRemove: () => void;
}) {
  const questions = assignment.questions;
  const setQuestions = (qs: DraftQuestion[]) => onChange({ questions: qs });

  function add(type: "mcq" | "fill_blank") {
    setQuestions([
      ...questions,
      { tmpId: tmp(), type, prompt: "", options: ["", "", "", ""], correctAnswer: "", explanation: "" },
    ]);
  }
  function update(i: number, patch: Partial<DraftQuestion>) {
    setQuestions(questions.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }

  return (
    <div className="rounded-xl border border-hair p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-heading">Checkpoint after session</span>
          <Select
            value={assignment.sessionTmpId}
            onChange={(e) => onChange({ sessionTmpId: e.target.value })}
            className="w-20 py-1.5"
          >
            {sessions.map((s, i) => (
              <option key={s.tmpId} value={s.tmpId} disabled={s.taken}>{i + 1}</option>
            ))}
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="subtle" onClick={() => add("mcq")}>
            <Plus className="h-3.5 w-3.5" /> MCQ
          </Button>
          <Button size="sm" variant="subtle" onClick={() => add("fill_blank")}>
            <Plus className="h-3.5 w-3.5" /> Fill-blank
          </Button>
          <button onClick={onRemove} title="Remove checkpoint" className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-red-50 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Input
        value={assignment.title}
        onChange={(e) => onChange({ title: e.target.value })}
        placeholder={`Checkpoint title (optional)`}
        className="mt-3 py-2 text-sm"
      />

      <div className="mt-3 space-y-4">
        {questions.length === 0 && <p className="text-xs text-faint">No questions yet — add an MCQ or fill-blank.</p>}
        {questions.map((q, i) => (
          <div key={q.tmpId} className="rounded-xl border border-hair p-3">
            <div className="mb-2 flex items-center justify-between">
              <Badge variant="neutral">{q.type === "mcq" ? "Multiple choice" : "Fill in the blank"}</Badge>
              <button onClick={() => setQuestions(questions.filter((_, idx) => idx !== i))} className="text-faint hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <Textarea
              value={q.prompt}
              onChange={(e) => update(i, { prompt: e.target.value })}
              placeholder={q.type === "fill_blank" ? "Sentence with ____ for the blank" : "Question prompt"}
              className="min-h-[56px] text-sm"
            />
            <div className="mt-2 grid grid-cols-2 gap-2">
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => update(i, { correctAnswer: opt })}
                    title="Mark correct"
                    className={cn(
                      "grid h-5 w-5 shrink-0 place-items-center rounded-full border",
                      opt && q.correctAnswer === opt ? "border-green-500 bg-green-500 text-white" : "border-hair",
                    )}
                  >
                    {opt && q.correctAnswer === opt && <Check className="h-3 w-3" strokeWidth={3} />}
                  </button>
                  <Input
                    value={opt}
                    onChange={(e) => {
                      const options = q.options.map((o, idx) => (idx === oi ? e.target.value : o));
                      const patch: Partial<DraftQuestion> = { options };
                      // Keeps the marked answer in step when its text is edited. `opt &&`: an
                      // empty option equals the empty "no answer marked yet", which made the
                      // first option typed into a new question the correct answer by itself.
                      if (opt && q.correctAnswer === opt) patch.correctAnswer = e.target.value;
                      update(i, patch);
                    }}
                    placeholder={`Option ${oi + 1}`}
                    className="py-2 text-sm"
                  />
                </div>
              ))}
            </div>
            <Input
              value={q.explanation}
              onChange={(e) => update(i, { explanation: e.target.value })}
              placeholder="Explanation (shown after grading)"
              className="mt-2 py-2 text-sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

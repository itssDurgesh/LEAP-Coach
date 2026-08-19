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
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select, Field } from "@/components/ui/Field";
import { useApp } from "@/lib/store/AppProvider";
import { Course, Question, Role, ROLES, courseCategories, isOwner } from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";
import { uploadMedia } from "@/lib/supabase/storage";

interface DraftQuestion {
  tmpId: string;
  type: "mcq" | "fill_blank";
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}
interface DraftVideo {
  tmpId: string;
  title: string;
  muxPlaybackId: string;
  durationMins: number;
  summary: string;
  notesPdfName: string;
  notesPdfUrl: string | null;
  transcript: string;
}
interface DraftAssignment {
  tmpId: string;
  afterVideoOrder: number;
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

/**
 * Uploads to the `media` bucket and hands back a short public URL. Previously
 * base64'd the file into the row, which loadAll then shipped to every user.
 */
function uploadThen(file: File, folder: string, onDone: (url: string, name: string) => void) {
  void uploadMedia(file, folder).then((r) => onDone(r.url, r.name));
}

function newVideo(): DraftVideo {
  return { tmpId: tmp(), title: "", muxPlaybackId: "", durationMins: 20, summary: "", notesPdfName: "", notesPdfUrl: null, transcript: "" };
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

function toDraft(c: Course): Draft {
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
    videos: c.videos
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((v) => ({
        tmpId: tmp(),
        title: v.title,
        muxPlaybackId: v.muxPlaybackId,
        durationMins: Math.round(v.durationSeconds / 60),
        summary: v.summary,
        notesPdfName: v.notesPdfName ?? "",
        notesPdfUrl: v.notesPdfUrl ?? null,
        transcript: v.transcript,
      })),
    assignments: c.assignments
      .slice()
      .sort((a, b) => a.afterVideoOrder - b.afterVideoOrder)
      .map((a) => ({
        tmpId: tmp(),
        afterVideoOrder: a.afterVideoOrder,
        title: a.title,
        questions: a.questions.map((q) => ({
          tmpId: tmp(),
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

function toCourse(d: Draft, existing?: Course): Course {
  const categories = d.categories.length ? d.categories : ["professional" as Role];
  const videos = d.videos.map((v, i) => ({
    id: `${d.id}_v${i + 1}`,
    courseId: d.id,
    title: v.title || `Session ${i + 1}`,
    order: i + 1,
    durationSeconds: Math.round((v.durationMins || 0) * 60),
    muxPlaybackId: v.muxPlaybackId || `mux_${d.id}_v${i + 1}`,
    transcript: v.transcript,
    summary: v.summary,
    notesPdfName: v.notesPdfName || `${d.id}-session-${i + 1}-notes.pdf`,
    notesPdfUrl: v.notesPdfUrl,
    resources: existing?.videos.find((x) => x.order === i + 1)?.resources ?? [],
  }));
  const assignments = d.assignments
    .filter((a) => a.afterVideoOrder >= 1 && a.afterVideoOrder <= videos.length)
    .map((a) => ({
      id: `${d.id}_a${a.afterVideoOrder}`,
      courseId: d.id,
      afterVideoOrder: a.afterVideoOrder,
      title: a.title || `Checkpoint after session ${a.afterVideoOrder}`,
      questions: a.questions
        .filter((q) => q.prompt.trim())
        .map<Question>((q) => ({
          id: `${d.id}_q${a.afterVideoOrder}_${q.tmpId}`,
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
    slug: existing?.slug ?? (slugify(d.title) || d.id),
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
  { label: "Videos", icon: VideoIcon },
  { label: "Notes", icon: FileText },
  { label: "Transcripts", icon: ScrollText },
  { label: "Assignments", icon: ClipboardList },
  { label: "Review & Publish", icon: Eye },
];

export function CourseWizard({ initial }: { initial?: Course }) {
  const { saveCourse, tracks, currentUser } = useApp();
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [draft, setDraft] = React.useState<Draft>(() => (initial ? toDraft(initial) : blankDraft()));
  const owner = isOwner(currentUser);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const setVideo = (i: number, patch: Partial<DraftVideo>) =>
    setDraft((d) => ({ ...d, videos: d.videos.map((v, idx) => (idx === i ? { ...v, ...patch } : v)) }));
  const setAssignment = (i: number, patch: Partial<DraftAssignment>) =>
    setDraft((d) => ({ ...d, assignments: d.assignments.map((a, idx) => (idx === i ? { ...a, ...patch } : a)) }));

  const toggleCategory = (r: Role) =>
    setDraft((d) => ({
      ...d,
      categories: d.categories.includes(r) ? d.categories.filter((x) => x !== r) : [...d.categories, r],
    }));

  function addAssignment() {
    const used = new Set(draft.assignments.map((a) => a.afterVideoOrder));
    const nextOrder = draft.videos.map((_, i) => i + 1).find((o) => !used.has(o)) ?? draft.videos.length;
    set({
      assignments: [...draft.assignments, { tmpId: tmp(), afterVideoOrder: Math.max(1, nextOrder), title: "", questions: [] }],
    });
  }

  function save(publish: boolean) {
    saveCourse(toCourse({ ...draft, published: publish }, initial));
    router.push("/admin/courses");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      {/* Stepper */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <ol className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-1">
          {STEPS.map((s, i) => (
            <li key={s.label}>
              <button
                onClick={() => setStep(i)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors",
                  i === step ? "bg-navy-800 text-white" : i < step ? "text-heading hover:bg-surface-2" : "text-faint hover:bg-surface-2",
                )}
              >
                <span
                  className={cn(
                    "grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs",
                    i < step ? "bg-green-500 text-white" : i === step ? "bg-gold-500 text-navy-900" : "bg-surface-2 text-faint",
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
      <div>
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
                          on ? "border-gold-300 bg-gold-50 text-gold-700 dark:bg-gold-500/10" : "border-hair text-muted hover:border-navy-200",
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
                          on ? "border-gold-300 bg-gold-50 text-gold-700 dark:bg-gold-500/10" : "border-hair text-muted hover:border-navy-200",
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
              <p className="text-sm text-muted">Add a video per session (Mux playback ID + duration). Order defines the roadmap.</p>
              {draft.videos.map((v, i) => (
                <div key={v.tmpId} className="rounded-xl border border-hair p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-heading text-sm font-semibold text-heading">Session {i + 1}</span>
                    {draft.videos.length > 1 && (
                      <button onClick={() => set({ videos: draft.videos.filter((_, idx) => idx !== i) })} className="text-faint hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-2.5">
                    <Input value={v.title} onChange={(e) => setVideo(i, { title: e.target.value })} placeholder="Session title" />
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      <Input value={v.muxPlaybackId} onChange={(e) => setVideo(i, { muxPlaybackId: e.target.value })} placeholder="Mux playback ID" />
                      <Input type="number" min={1} value={v.durationMins} onChange={(e) => setVideo(i, { durationMins: Number(e.target.value) })} placeholder="Duration (mins)" />
                    </div>
                    <Input value={v.summary} onChange={(e) => setVideo(i, { summary: e.target.value })} placeholder="One-line summary (used by the LEAP AI tutor)" />
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
                    accept=".pdf,.doc,.docx,application/pdf"
                    label={v.notesPdfUrl ? "Replace" : "Upload"}
                    onFile={(f) => uploadThen(f, "class-notes", (url, name) => setVideo(i, { notesPdfUrl: url, notesPdfName: name }))}
                  />
                  {v.notesPdfUrl && <Badge variant="success"><Check className="h-3 w-3" /> Uploaded</Badge>}
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="mt-5 space-y-4">
              <p className="text-sm text-muted">Paste each session&rsquo;s transcript. The LEAP AI tutor is grounded strictly in this text.</p>
              {draft.videos.map((v, i) => (
                <Field key={v.tmpId} label={`Session ${i + 1}${v.title ? ` · ${v.title}` : ""}`}>
                  <Textarea value={v.transcript} onChange={(e) => setVideo(i, { transcript: e.target.value })} placeholder="Full transcript…" />
                </Field>
              ))}
            </div>
          )}

          {step === 4 && (
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
                  videoCount={draft.videos.length}
                  onChange={(patch) => setAssignment(i, patch)}
                  onRemove={() => set({ assignments: draft.assignments.filter((_, idx) => idx !== i) })}
                />
              ))}
              <Button variant="outline" onClick={addAssignment} disabled={draft.videos.length === 0}>
                <Plus className="h-4 w-4" /> Add checkpoint
              </Button>

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

          {step === 5 && (
            <div className="mt-5 space-y-4">
              <div className="rounded-xl border border-hair bg-surface-2 p-4">
                <p className="font-heading text-lg font-bold text-heading">{draft.title || "Untitled topic"}</p>
                <p className="mt-1 text-sm text-muted">{draft.description || "No description."}</p>
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
                  <li>• Workbook: {draft.workbookName ?? "none"}</li>
                  <li>• Access: {draft.accessDurationDays > 0 ? `${draft.accessDurationDays} days after purchase` : "1 year after purchase"}</li>
                  <li>• Instructor: {draft.instructorName || "—"}</li>
                </ul>
              </div>

              {!owner && (
                <div className="rounded-xl border border-gold-200 bg-gold-50 p-4 text-sm text-heading dark:bg-gold-500/10">
                  As a sub-admin, your topic is sent to the main admin for approval before it goes live.
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <Button onClick={() => save(true)}>
                  <Check className="h-4 w-4" /> {owner ? "Publish topic" : "Submit for approval"}
                </Button>
                <Button variant="outline" onClick={() => save(false)}>
                  Save as draft
                </Button>
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

function UploadButton({ accept, label, onFile }: { accept: string; label: string; onFile: (f: File) => void }) {
  const ref = React.useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()}>
        <Upload className="h-4 w-4" /> {label}
      </Button>
    </>
  );
}

function AssignmentEditor({
  assignment,
  videoCount,
  onChange,
  onRemove,
}: {
  assignment: DraftAssignment;
  videoCount: number;
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
            value={assignment.afterVideoOrder}
            onChange={(e) => onChange({ afterVideoOrder: Number(e.target.value) })}
            className="w-20 py-1.5"
          >
            {Array.from({ length: Math.max(1, videoCount) }, (_, i) => i + 1).map((o) => (
              <option key={o} value={o}>{o}</option>
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
          <div key={q.tmpId} className="rounded-lg bg-surface-2 p-3">
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
                      if (q.correctAnswer === opt) patch.correctAnswer = e.target.value;
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

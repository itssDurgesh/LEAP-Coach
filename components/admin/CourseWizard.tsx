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
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select, Field } from "@/components/ui/Field";
import { useApp } from "@/lib/store/AppProvider";
import { Course, Question, Role } from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";

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
  transcript: string;
}
interface Draft {
  id: string;
  title: string;
  description: string;
  category: Role;
  instructorName: string;
  instructorTitle: string;
  instructorBio: string;
  level: Course["level"];
  price: number;
  accent: number;
  hashtags: string[];
  tracks: string[];
  videos: DraftVideo[];
  questionsByOrder: Record<number, DraftQuestion[]>;
  published: boolean;
}

const tmp = () => Math.random().toString(36).slice(2, 9);
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function blankDraft(): Draft {
  return {
    id: `c_${tmp()}`,
    title: "",
    description: "",
    category: "professional",
    instructorName: "",
    instructorTitle: "",
    instructorBio: "",
    level: "Beginner",
    price: 0,
    accent: 0,
    hashtags: ["", "", "", ""],
    tracks: [],
    videos: [{ tmpId: tmp(), title: "", muxPlaybackId: "", durationMins: 20, summary: "", notesPdfName: "", transcript: "" }],
    questionsByOrder: {},
    published: false,
  };
}

function toDraft(c: Course): Draft {
  const questionsByOrder: Record<number, DraftQuestion[]> = {};
  c.assignments.forEach((a) => {
    questionsByOrder[a.afterVideoOrder] = a.questions.map((q) => ({
      tmpId: tmp(),
      type: q.type,
      prompt: q.prompt,
      options: [...q.options, "", "", "", ""].slice(0, 4),
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
    }));
  });
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    category: c.category,
    instructorName: c.instructorName,
    instructorTitle: c.instructorTitle,
    instructorBio: c.instructorBio,
    level: c.level,
    price: c.price,
    accent: c.accent,
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
        transcript: v.transcript,
      })),
    questionsByOrder,
    published: c.published,
  };
}

function toCourse(d: Draft, existing?: Course): Course {
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
    resources: existing?.videos.find((x) => x.order === i + 1)?.resources ?? [],
  }));
  const assignments = Object.entries(d.questionsByOrder)
    .filter(([, qs]) => qs.length > 0)
    .map(([order, qs]) => ({
      id: `${d.id}_a${order}`,
      courseId: d.id,
      afterVideoOrder: Number(order),
      title: `Checkpoint after session ${order}`,
      questions: qs
        .filter((q) => q.prompt.trim())
        .map<Question>((q) => ({
          id: `${d.id}_q${order}_${q.tmpId}`,
          type: q.type,
          prompt: q.prompt,
          options: q.options.filter((o) => o.trim()),
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
        })),
    }))
    .filter((a) => a.questions.length > 0 && a.afterVideoOrder <= videos.length);

  return {
    id: d.id,
    slug: existing?.slug ?? (slugify(d.title) || d.id),
    title: d.title || "Untitled topic",
    description: d.description,
    category: d.category,
    instructorName: d.instructorName || "Leap Coach Faculty",
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
  const { saveCourse, tracks } = useApp();
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [draft, setDraft] = React.useState<Draft>(() => (initial ? toDraft(initial) : blankDraft()));

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const setVideo = (i: number, patch: Partial<DraftVideo>) =>
    setDraft((d) => ({ ...d, videos: d.videos.map((v, idx) => (idx === i ? { ...v, ...patch } : v)) }));

  const evenOrders = draft.videos.map((_, i) => i + 1).filter((o) => o % 2 === 0);

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
                  i === step ? "bg-navy-800 text-white" : i < step ? "text-navy-700 hover:bg-cream-100" : "text-ink-faint hover:bg-cream-100",
                )}
              >
                <span
                  className={cn(
                    "grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs",
                    i < step ? "bg-green-500 text-white" : i === step ? "bg-gold-500 text-navy-900" : "bg-cream-200 text-ink-faint",
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
          <h2 className="font-heading text-xl font-bold text-navy-800">{STEPS[step].label}</h2>

          {step === 0 && (
            <div className="mt-5 space-y-4">
              <Field label="Topic title" required>
                <Input value={draft.title} onChange={(e) => set({ title: e.target.value })} placeholder="The Authentic Leader" />
              </Field>
              <Field label="Description">
                <Textarea value={draft.description} onChange={(e) => set({ description: e.target.value })} placeholder="What learners will gain…" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Category">
                  <Select value={draft.category} onChange={(e) => set({ category: e.target.value as Role })}>
                    <option value="student">Student</option>
                    <option value="professional">Professional</option>
                    <option value="entrepreneur">Entrepreneur</option>
                  </Select>
                </Field>
                <Field label="Level">
                  <Select value={draft.level} onChange={(e) => set({ level: e.target.value as Course["level"] })}>
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
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
                <Field label="Thumbnail style">
                  <Select value={draft.accent} onChange={(e) => set({ accent: Number(e.target.value) })}>
                    {[0, 1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>Style {n + 1}</option>
                    ))}
                  </Select>
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
                          on ? "border-gold-300 bg-gold-50 text-gold-700" : "border-cream-300 text-ink-soft hover:border-navy-200",
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
              <p className="text-sm text-ink-soft">Add a video per session (Mux playback ID + duration). Order defines the roadmap.</p>
              {draft.videos.map((v, i) => (
                <div key={v.tmpId} className="rounded-xl border border-cream-200 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-heading text-sm font-semibold text-navy-800">Session {i + 1}</span>
                    {draft.videos.length > 1 && (
                      <button
                        onClick={() => set({ videos: draft.videos.filter((_, idx) => idx !== i) })}
                        className="text-ink-faint hover:text-red-600"
                      >
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
              <Button
                variant="outline"
                onClick={() => set({ videos: [...draft.videos, { tmpId: tmp(), title: "", muxPlaybackId: "", durationMins: 20, summary: "", notesPdfName: "", transcript: "" }] })}
              >
                <Plus className="h-4 w-4" /> Add session
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="mt-5 space-y-3">
              <p className="text-sm text-ink-soft">Attach a notes PDF per session (enter the file name — uploads are mocked).</p>
              {draft.videos.map((v, i) => (
                <div key={v.tmpId} className="flex items-center gap-3 rounded-xl border border-cream-200 p-3">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-cream-100 text-navy-600">
                    <FileText className="h-4 w-4" />
                  </span>
                  <span className="w-24 shrink-0 text-sm font-medium text-navy-700">Session {i + 1}</span>
                  <Input value={v.notesPdfName} onChange={(e) => setVideo(i, { notesPdfName: e.target.value })} placeholder="session-notes.pdf" className="flex-1" />
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="mt-5 space-y-4">
              <p className="text-sm text-ink-soft">Paste each session&rsquo;s transcript. The LEAP AI tutor is grounded strictly in this text.</p>
              {draft.videos.map((v, i) => (
                <Field key={v.tmpId} label={`Session ${i + 1}${v.title ? ` · ${v.title}` : ""}`}>
                  <Textarea value={v.transcript} onChange={(e) => setVideo(i, { transcript: e.target.value })} placeholder="Full transcript…" />
                </Field>
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="mt-5 space-y-5">
              <p className="text-sm text-ink-soft">Add an AI-graded checkpoint after every 2nd session. Mark the correct option for each question.</p>
              {evenOrders.length === 0 && <p className="text-sm text-ink-faint">Add at least 2 sessions to create a checkpoint.</p>}
              {evenOrders.map((order) => (
                <AssignmentEditor
                  key={order}
                  order={order}
                  questions={draft.questionsByOrder[order] ?? []}
                  onChange={(qs) => set({ questionsByOrder: { ...draft.questionsByOrder, [order]: qs } })}
                />
              ))}
            </div>
          )}

          {step === 5 && (
            <div className="mt-5 space-y-4">
              <div className="rounded-xl border border-cream-200 bg-cream-50 p-4">
                <p className="font-heading text-lg font-bold text-navy-800">{draft.title || "Untitled topic"}</p>
                <p className="mt-1 text-sm text-ink-soft">{draft.description || "No description."}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <Badge variant="navy" className="capitalize">{draft.category}</Badge>
                  <Badge variant="neutral">{draft.level}</Badge>
                  <Badge variant="gold">{draft.price === 0 ? "Free" : formatINR(draft.price)}</Badge>
                </div>
                <ul className="mt-3 space-y-1 text-sm text-ink-soft">
                  <li>• {draft.videos.length} sessions ({draft.videos.reduce((s, v) => s + (v.durationMins || 0), 0)} mins)</li>
                  <li>• {Object.values(draft.questionsByOrder).filter((q) => q.length).length} checkpoints</li>
                  <li>• Instructor: {draft.instructorName || "—"}</li>
                  <li>• Tracks: {draft.tracks.length ? draft.tracks.join(", ") : "none"}</li>
                </ul>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => save(true)}>
                  <Check className="h-4 w-4" /> Publish topic
                </Button>
                <Button variant="outline" onClick={() => save(false)}>
                  Save as draft
                </Button>
              </div>
            </div>
          )}

          {/* Nav */}
          <div className="mt-7 flex items-center justify-between border-t border-cream-200 pt-5">
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

function AssignmentEditor({
  order,
  questions,
  onChange,
}: {
  order: number;
  questions: DraftQuestion[];
  onChange: (qs: DraftQuestion[]) => void;
}) {
  function add(type: "mcq" | "fill_blank") {
    onChange([
      ...questions,
      { tmpId: tmp(), type, prompt: "", options: ["", "", "", ""], correctAnswer: "", explanation: "" },
    ]);
  }
  function update(i: number, patch: Partial<DraftQuestion>) {
    onChange(questions.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }

  return (
    <div className="rounded-xl border border-cream-200 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-sm font-semibold text-navy-800">Checkpoint after session {order}</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="subtle" onClick={() => add("mcq")}>
            <Plus className="h-3.5 w-3.5" /> MCQ
          </Button>
          <Button size="sm" variant="subtle" onClick={() => add("fill_blank")}>
            <Plus className="h-3.5 w-3.5" /> Fill-blank
          </Button>
        </div>
      </div>

      <div className="mt-3 space-y-4">
        {questions.length === 0 && <p className="text-xs text-ink-faint">No questions yet.</p>}
        {questions.map((q, i) => (
          <div key={q.tmpId} className="rounded-lg bg-cream-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <Badge variant="neutral">{q.type === "mcq" ? "Multiple choice" : "Fill in the blank"}</Badge>
              <button onClick={() => onChange(questions.filter((_, idx) => idx !== i))} className="text-ink-faint hover:text-red-600">
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
                      opt && q.correctAnswer === opt ? "border-green-500 bg-green-500 text-white" : "border-cream-300",
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

"use client";

import * as React from "react";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Lightbulb,
  Loader2,
  Pencil,
  Plus,
  RotateCw,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { addDays, formatDay, ideaForDay, ideaProblems, nextFreeDays, scheduledUntil } from "@/lib/ideas";
import { useApp } from "@/lib/store/AppProvider";
import { ROLES, type DailyIdea, type IdeaOption, type LeadershipTrack, type Role } from "@/lib/types";
import { useLocalDay } from "@/lib/useLocalDay";
import { cn } from "@/lib/utils";

export default function AdminIdeasPage() {
  return (
    <AdminShell
      title="Idea of the Day"
      subtitle="Plan the short idea and question learners see on their dashboard, one per day"
      requires="content"
    >
      <IdeasAdmin />
    </AdminShell>
  );
}

/** How many ideas the planner holds at once. */
const MIN_SLOTS = 1;
const DEFAULT_SLOTS = 3;
const MAX_SLOTS = 5;
const MAX_OPTIONS = 5;
/** Days shown in the schedule strip. */
const STRIP_DAYS = 14;

type Draft = Omit<DailyIdea, "createdAt" | "updatedAt" | "createdBy">;

const newId = () => `idea_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const blankOption = (good = false): IdeaOption => ({ text: "", good, feedback: "" });
const blankDraft = (showOn: string | null): Draft => ({
  id: newId(),
  title: "",
  body: "",
  question: "",
  options: [blankOption(true), blankOption(), blankOption()],
  trackId: null,
  audience: "all",
  showOn,
  active: true,
});
const isBlank = (d: Draft) => !d.title.trim() && !d.question.trim() && !d.body.trim() && d.options.every((o) => !o.text.trim());
const audienceLabel = (a: DailyIdea["audience"]) => (a === "all" ? "Everyone" : ROLES.find((r) => r.id === a)?.label ?? a);

function IdeasAdmin() {
  const { tracks, currentUser, loadIdeas, saveIdeas, deleteIdea } = useApp();
  const today = useLocalDay();
  const [ideas, setIdeas] = React.useState<DailyIdea[] | null>(null);
  const [responses, setResponses] = React.useState<Record<string, number[]>>({});
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<DailyIdea | null>(null);
  // A fresh planner after each successful save (and only then: editing or deleting
  // an idea in the list must not wipe a plan being written).
  const [planKey, setPlanKey] = React.useState(0);

  const reload = React.useCallback(async () => {
    try {
      const r = await loadIdeas();
      setIdeas(r.ideas);
      setResponses(r.responses);
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "The ideas could not be loaded.");
      setIdeas([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  React.useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  if (!ideas) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-gold-500" />
      </div>
    );
  }

  async function persist(list: DailyIdea[], message: string) {
    const r = await saveIdeas(list);
    if (!r.ok) return r;
    const byId = new Map(list.map((i) => [i.id, i]));
    setIdeas((cur) => [...(cur ?? []).filter((i) => !byId.has(i.id)), ...list]);
    setNotice(message);
    return r;
  }

  async function savePlan(drafts: Draft[]) {
    const now = Date.now();
    // A few milliseconds apart, so the rotation order inside a batch is the order they were written in.
    const list: DailyIdea[] = drafts.map((d, i) => ({
      ...d,
      options: d.options.filter((o) => o.text.trim()),
      createdBy: currentUser?.id ?? null,
      createdAt: new Date(now + i).toISOString(),
      updatedAt: new Date(now + i).toISOString(),
    }));
    const r = await persist(list, `${list.length} ${list.length === 1 ? "idea" : "ideas"} scheduled.`);
    if (r.ok) setPlanKey((k) => k + 1);
    return r;
  }

  async function remove(idea: DailyIdea) {
    const votes = (responses[idea.id] ?? []).reduce((s, n) => s + (n ?? 0), 0);
    const warn = votes ? `\n\n${votes} learner ${votes === 1 ? "answer" : "answers"} to it will be deleted too.` : "";
    if (!window.confirm(`Delete “${idea.title}”?${warn}`)) return;
    const r = await deleteIdea(idea.id);
    if (!r.ok) {
      window.alert(r.error ?? "It could not be deleted.");
      return;
    }
    setIdeas((cur) => (cur ?? []).filter((i) => i.id !== idea.id));
    setNotice("Idea deleted.");
  }

  const strip = Array.from({ length: STRIP_DAYS }, (_, i) => addDays(today, i));
  const until = scheduledUntil(ideas, today);
  const daysLeft = until ? Math.round((Date.parse(until) - Date.parse(today)) / 86_400_000) + 1 : 0;
  const upcoming = ideas.filter((i) => i.showOn && i.showOn >= today).sort((a, b) => (a.showOn! < b.showOn! ? -1 : 1));
  const pool = ideas
    .filter((i) => !i.showOn || i.showOn < today)
    .sort((a, b) => ((a.showOn ?? "") < (b.showOn ?? "") ? 1 : -1));

  return (
    <div className="space-y-6">
      {notice && (
        <div role="status" className="flex items-center gap-2 rounded-2xl bg-lv-orgs-tint px-4 py-3 text-sm font-semibold text-lv-orgs-dark">
          <CheckCircle2 className="h-4 w-4" /> {notice}
        </div>
      )}
      {loadError && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {/* ── Today and the next two weeks ── */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card padded>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-heading">
              <CalendarDays className="h-5 w-5 text-gold-600" /> Schedule · next {STRIP_DAYS} days
            </h2>
            <span className="text-xs font-medium text-muted">Learners see the idea for their own date; it changes at their midnight.</span>
          </div>

          {daysLeft < 3 && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-v2-gold-soft px-3.5 py-3 text-sm text-heading">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
              <span>
                {until
                  ? `Ideas are planned up to ${formatDay(until)}. After that, earlier ideas come round again in rotation.`
                  : "Nothing is planned from today. Learners see earlier ideas in rotation until you plan new ones."}{" "}
                Plan the next {DEFAULT_SLOTS}–{MAX_SLOTS} days below.
              </span>
            </div>
          )}

          <ol className="mt-4 grid gap-2 sm:grid-cols-2">
            {strip.map((day) => {
              const pick = ideaForDay(ideas, null, day);
              const planned = !!pick && pick.showOn === day;
              const pathOnly = ideas.filter((i) => i.active && i.showOn === day && i.audience !== "all");
              return (
                <li
                  key={day}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border px-3 py-2.5",
                    day === today ? "border-gold-400 bg-v2-gold-soft" : "border-hair",
                  )}
                >
                  <span className="w-[74px] shrink-0">
                    <span className="block text-xs font-semibold text-heading">{day === today ? "Today" : formatDay(day, { weekday: "short" })}</span>
                    <span className="block text-xs text-muted">{formatDay(day, { day: "numeric", month: "short" })}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    {pick ? (
                      <button
                        type="button"
                        onClick={() => setEditing(pick)}
                        className={cn("block w-full truncate text-left text-sm hover:underline", planned ? "font-semibold text-heading" : "italic text-muted")}
                        title={planned ? "Planned for this day" : "Nothing planned: an earlier idea comes round again"}
                      >
                        {planned ? pick.title : `Rotation · ${pick.title}`}
                      </button>
                    ) : (
                      <span className="text-sm italic text-faint">No idea yet</span>
                    )}
                    {pathOnly.length > 0 && (
                      <span className="mt-0.5 block truncate text-xs text-muted">
                        + for {pathOnly.map((i) => audienceLabel(i.audience)).join(", ")}
                      </span>
                    )}
                  </span>
                  {planned ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-lv-orgs-dark" /> : pick ? <RotateCw className="mt-0.5 h-3.5 w-3.5 shrink-0 text-faint" /> : null}
                </li>
              );
            })}
          </ol>
        </Card>

        <TodayPreview idea={ideaForDay(ideas, null, today)} tracks={tracks} votes={responses} />
      </div>

      {/* ── Plan 3–5 ideas at a time ── */}
      <PlanComposer key={planKey} ideas={ideas} today={today} tracks={tracks} onSave={savePlan} />

      {/* ── Every idea ── */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hair px-5 py-4">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-heading">
            <Lightbulb className="h-5 w-5 text-gold-600" /> All ideas · {ideas.length}
          </h2>
          <span className="text-xs text-muted">{upcoming.length} planned ahead · {pool.length} in the rotation</span>
        </div>
        {ideas.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-faint">No ideas yet. Plan the first few above.</p>
        ) : (
          <div className="divide-y divide-hair">
            {upcoming.length > 0 && <ListHeading>Planned ahead</ListHeading>}
            {upcoming.map((i) => (
              <IdeaRow key={i.id} idea={i} today={today} tracks={tracks} votes={responses[i.id]} onEdit={() => setEditing(i)} onDelete={() => remove(i)}
                onToggle={() => persist([{ ...i, active: !i.active, updatedAt: new Date().toISOString() }], i.active ? "Idea hidden from learners." : "Idea shown to learners again.")} />
            ))}
            {pool.length > 0 && <ListHeading>Shown before, or unscheduled · these come round again in rotation</ListHeading>}
            {pool.map((i) => (
              <IdeaRow key={i.id} idea={i} today={today} tracks={tracks} votes={responses[i.id]} onEdit={() => setEditing(i)} onDelete={() => remove(i)}
                onToggle={() => persist([{ ...i, active: !i.active, updatedAt: new Date().toISOString() }], i.active ? "Idea hidden from learners." : "Idea shown to learners again.")} />
            ))}
          </div>
        )}
      </Card>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit idea" className="max-w-2xl">
        {editing && (
          <EditIdea
            idea={editing}
            tracks={tracks}
            onCancel={() => setEditing(null)}
            onSave={async (d) => {
              const r = await persist([{ ...editing, ...d, options: d.options.filter((o) => o.text.trim()), updatedAt: new Date().toISOString() }], "Idea saved.");
              if (r.ok) setEditing(null);
              return r;
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function ListHeading({ children }: { children: React.ReactNode }) {
  return <p className="bg-surface-2 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-faint">{children}</p>;
}

/** What learners see today (everyone's idea), with how they answered it. */
function TodayPreview({ idea, tracks, votes }: { idea: DailyIdea | null; tracks: LeadershipTrack[]; votes: Record<string, number[]> }) {
  const counts = idea ? votes[idea.id] ?? [] : [];
  const total = counts.reduce((s, n) => s + (n ?? 0), 0);
  return (
    <Card padded className="flex flex-col">
      <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-heading">
        <Eye className="h-5 w-5 text-gold-600" /> Learners see today
      </h2>
      {idea ? (
        <div className="mt-4 flex-1 rounded-2xl bg-v2-idea p-5">
          <p className="text-xs font-semibold text-muted">{tracks.find((t) => t.id === idea.trackId)?.label ?? "Idea of the day"}</p>
          <p className="mt-1 font-heading text-lg font-bold leading-tight text-heading">{idea.title}</p>
          {idea.body && <p className="mt-2 line-clamp-3 text-sm text-v2-body">{idea.body}</p>}
          <p className="mt-3 text-sm font-semibold text-heading">{idea.question}</p>
          <ul className="mt-2 space-y-1.5">
            {idea.options.map((o, i) => {
              const share = total ? Math.round(((counts[i] ?? 0) / total) * 100) : 0;
              return (
                <li key={i} className="relative overflow-hidden rounded-xl bg-card px-3 py-2 text-sm text-heading">
                  <span aria-hidden className={cn("absolute inset-y-0 left-0", o.good ? "bg-lv-orgs-tint" : "bg-v2-gold-soft")} style={{ width: `${share}%` }} />
                  <span className="relative flex items-center gap-2">
                    {o.good && <Check className="h-3.5 w-3.5 shrink-0 text-lv-orgs-dark" strokeWidth={3} />}
                    <span className="min-w-0 flex-1">{o.text}</span>
                    {total > 0 && <span className="shrink-0 text-xs font-semibold tabular-nums text-muted">{share}%</span>}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-muted">
            <Users className="h-3.5 w-3.5" /> {total} {total === 1 ? "answer" : "answers"} so far
          </p>
        </div>
      ) : (
        <p className="mt-4 rounded-2xl bg-surface-2 p-5 text-sm text-muted">
          Nothing to show yet. Learners see a friendly placeholder until the first idea is planned.
        </p>
      )}
    </Card>
  );
}

function IdeaRow({
  idea,
  today,
  tracks,
  votes,
  onEdit,
  onDelete,
  onToggle,
}: {
  idea: DailyIdea;
  today: string;
  tracks: LeadershipTrack[];
  votes?: number[];
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const total = (votes ?? []).reduce((s, n) => s + (n ?? 0), 0);
  const goodVotes = idea.options.reduce((s, o, i) => s + (o.good ? votes?.[i] ?? 0 : 0), 0);
  const track = tracks.find((t) => t.id === idea.trackId);
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5", !idea.active && "opacity-60")}>
      <span
        className={cn(
          "w-[92px] shrink-0 rounded-lg px-2 py-1 text-center text-xs font-semibold",
          idea.showOn === today ? "bg-[#E9B93E] text-navy-900" : idea.showOn && idea.showOn > today ? "bg-v2-gold-soft text-v2-gold-text" : "bg-surface-2 text-muted",
        )}
      >
        {idea.showOn ? (idea.showOn === today ? "Today" : formatDay(idea.showOn)) : "Rotation"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-heading">{idea.title}</p>
        <p className="truncate text-xs text-muted">{idea.question}</p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant={idea.audience === "all" ? "neutral" : "navy"}>{audienceLabel(idea.audience)}</Badge>
        {track && <Badge variant="outline">{track.label}</Badge>}
        {!idea.active && <Badge variant="warning">Hidden</Badge>}
      </div>
      <span className="w-[120px] shrink-0 text-xs text-muted" title={total ? `${goodVotes} of ${total} picked a good answer` : undefined}>
        {total ? (
          <>
            <span className="font-semibold text-heading">{total}</span> {total === 1 ? "answer" : "answers"} · {Math.round((goodVotes / total) * 100)}% good
          </>
        ) : (
          "No answers yet"
        )}
      </span>
      <div className="flex items-center gap-1">
        <button type="button" onClick={onToggle} title={idea.active ? "Hide from learners" : "Show to learners"} className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-surface-2 hover:text-heading">
          {idea.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
        <button type="button" onClick={onEdit} title="Edit" className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-surface-2 hover:text-heading">
          <Pencil className="h-4 w-4" />
        </button>
        <button type="button" onClick={onDelete} title="Delete" className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-red-50 hover:text-red-600">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/** Plan several ideas at once; each goes on the next free day unless another date is chosen. */
function PlanComposer({
  ideas,
  today,
  tracks,
  onSave,
}: {
  ideas: DailyIdea[];
  today: string;
  tracks: LeadershipTrack[];
  onSave: (drafts: Draft[]) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [drafts, setDrafts] = React.useState<Draft[]>(() => nextFreeDays(ideas, DEFAULT_SLOTS, today).map((d) => blankDraft(d)));
  const [problems, setProblems] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);

  const patch = (id: string, p: Partial<Draft>) => setDrafts((list) => list.map((d) => (d.id === id ? { ...d, ...p } : d)));

  function addSlot() {
    if (drafts.length >= MAX_SLOTS) return;
    const taken = [...ideas, ...drafts.map((d) => ({ ...d, createdAt: "", updatedAt: "" }))];
    const [day] = nextFreeDays(taken as DailyIdea[], 1, today);
    setDrafts((list) => [...list, blankDraft(day)]);
  }

  async function submit() {
    const filled = drafts.filter((d) => !isBlank(d));
    const issues: string[] = [];
    if (!filled.length) issues.push("Write at least one idea.");
    filled.forEach((d) => {
      const missing = ideaProblems({ ...d, options: d.options.filter((o) => o.text.trim()) });
      if (missing.length) issues.push(`Idea ${drafts.indexOf(d) + 1}${d.title ? ` (“${d.title}”)` : ""} needs ${missing.join(", ")}.`);
    });
    const days = filled.filter((d) => d.audience === "all" && d.showOn).map((d) => d.showOn);
    if (new Set(days).size !== days.length) issues.push("Two ideas for everyone are on the same date; give each its own day.");
    setProblems(issues);
    if (issues.length) return;
    setSaving(true);
    const r = await onSave(filled);
    setSaving(false);
    if (!r.ok) setProblems([r.error ?? "The ideas could not be saved."]);
  }

  return (
    <Card padded>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-heading">
            <Plus className="h-5 w-5 text-gold-600" /> Plan the next {drafts.length === 1 ? "day" : `${drafts.length} days`}
          </h2>
          <p className="mt-1 text-sm text-muted">
            Write {DEFAULT_SLOTS} to {MAX_SLOTS} ideas at a time. Each one goes on the next free day and the dashboard switches to it automatically when that day starts.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={addSlot} disabled={drafts.length >= MAX_SLOTS}>
          <Plus className="h-4 w-4" /> Another idea {drafts.length >= MAX_SLOTS ? `(max ${MAX_SLOTS})` : ""}
        </Button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {drafts.map((d, i) => (
          <div key={d.id} className="rounded-2xl border border-hair p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="font-heading text-sm font-semibold text-heading">
                Idea {i + 1}
                {d.showOn && <span className="font-sans font-medium text-muted"> · {formatDay(d.showOn)}</span>}
              </span>
              {drafts.length > MIN_SLOTS && (
                <button type="button" onClick={() => setDrafts((list) => list.filter((x) => x.id !== d.id))} className="text-faint hover:text-red-600" aria-label={`Remove idea ${i + 1}`}>
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <IdeaFields draft={d} tracks={tracks} onChange={(p) => patch(d.id, p)} />
          </div>
        ))}
      </div>

      {problems.length > 0 && (
        <div role="alert" className="mt-4 rounded-[14px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <ul className="list-disc space-y-1 pl-5">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button onClick={submit} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {saving ? "Saving…" : "Schedule these ideas"}
        </Button>
        <span className="text-xs text-muted">Empty cards are skipped.</span>
      </div>
    </Card>
  );
}

function EditIdea({
  idea,
  tracks,
  onSave,
  onCancel,
}: {
  idea: DailyIdea;
  tracks: LeadershipTrack[];
  onSave: (d: Draft) => Promise<{ ok: boolean; error?: string }>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = React.useState<Draft>(() => ({
    ...idea,
    options: idea.options.length ? idea.options : [blankOption(true), blankOption()],
  }));
  const [problem, setProblem] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  async function save() {
    const missing = ideaProblems({ ...draft, options: draft.options.filter((o) => o.text.trim()) });
    if (missing.length) {
      setProblem(`Needs ${missing.join(", ")}.`);
      return;
    }
    setSaving(true);
    const r = await onSave(draft);
    setSaving(false);
    if (!r.ok) setProblem(r.error ?? "It could not be saved.");
  }

  return (
    <div className="space-y-4 p-6">
      <IdeaFields draft={draft} tracks={tracks} onChange={(p) => setDraft((d) => ({ ...d, ...p }))} />
      <label className="flex items-center gap-2 text-sm text-heading">
        <input type="checkbox" checked={draft.active} onChange={(e) => setDraft((d) => ({ ...d, active: e.target.checked }))} className="h-4 w-4 accent-[#E9B93E]" />
        Shown to learners
      </label>
      {problem && <p className="text-sm font-medium text-red-600">{problem}</p>}
      <div className="flex gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

/** The fields of one idea: when and for whom, the idea, the question and its answers. */
function IdeaFields({ draft, tracks, onChange }: { draft: Draft; tracks: LeadershipTrack[]; onChange: (p: Partial<Draft>) => void }) {
  const setOption = (i: number, p: Partial<IdeaOption>) => onChange({ options: draft.options.map((o, j) => (j === i ? { ...o, ...p } : o)) });
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Date">
          <Input type="date" value={draft.showOn ?? ""} onChange={(e) => onChange({ showOn: e.target.value || null })} />
        </Field>
        <Field label="For">
          <Select value={draft.audience} onChange={(e) => onChange({ audience: e.target.value as Role | "all" })}>
            <option value="all">Everyone</option>
            {ROLES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}s only
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Level">
          <Select value={draft.trackId ?? ""} onChange={(e) => onChange({ trackId: e.target.value || null })}>
            <option value="">None</option>
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Input value={draft.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="Title, e.g. Psychological safety" aria-label="Title" />
      <Textarea
        value={draft.body}
        onChange={(e) => onChange({ body: e.target.value })}
        placeholder="The idea in two or three sentences"
        aria-label="The idea"
        className="min-h-[72px] text-sm"
      />
      <Input value={draft.question} onChange={(e) => onChange({ question: e.target.value })} placeholder="A question for the learner" aria-label="Question" />

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted">Answers · tick the good ones, add feedback learners see after picking</p>
        {draft.options.map((o, i) => (
          <div key={i} className="rounded-xl bg-surface-2 p-2.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOption(i, { good: !o.good })}
                title={o.good ? "A good answer" : "Mark as a good answer"}
                aria-pressed={o.good}
                className={cn(
                  "grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-colors",
                  o.good ? "border-green-500 bg-green-500 text-white" : "border-hair bg-card text-transparent hover:text-faint",
                )}
              >
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </button>
              <Input value={o.text} onChange={(e) => setOption(i, { text: e.target.value })} placeholder={`Answer ${i + 1}`} className="py-2 text-sm" aria-label={`Answer ${i + 1}`} />
              {draft.options.length > 2 && (
                <button type="button" onClick={() => onChange({ options: draft.options.filter((_, j) => j !== i) })} className="shrink-0 text-faint hover:text-red-600" aria-label={`Remove answer ${i + 1}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <Input
              value={o.feedback}
              onChange={(e) => setOption(i, { feedback: e.target.value })}
              placeholder="Feedback for this answer"
              className="mt-2 py-2 text-xs"
              aria-label={`Feedback for answer ${i + 1}`}
            />
          </div>
        ))}
        {draft.options.length < MAX_OPTIONS && (
          <button type="button" onClick={() => onChange({ options: [...draft.options, blankOption()] })} className="inline-flex items-center gap-1 text-xs font-semibold text-gold-700 hover:underline">
            <Plus className="h-3.5 w-3.5" /> Add an answer
          </button>
        )}
      </div>
    </div>
  );
}

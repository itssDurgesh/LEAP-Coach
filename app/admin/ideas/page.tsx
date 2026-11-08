"use client";

import * as React from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Check,
  Eye,
  EyeOff,
  Lightbulb,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { getSupabase } from "@/lib/supabase/client";
import * as db from "@/lib/supabase/db";
import { ideaForDay, indiaDateKey, rotation } from "@/lib/ideas";
import { useApp } from "@/lib/store/AppProvider";
import { DailyIdea, IdeaOption, ROLES, Role } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function AdminIdeasPage() {
  return (
    <AdminShell
      title="Idea of the Day"
      subtitle="Write several ideas at once. Each learner's dashboard shows one a day, and it changes by itself at midnight (India time)."
      requires="content"
    >
      <IdeasAdmin />
    </AdminShell>
  );
}

const newId = () => `idea_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const AUDIENCES: { id: Role | "all"; label: string }[] = [{ id: "all", label: "All learners" }, ...ROLES.map((r) => ({ id: r.id, label: `${r.label}s` }))];
const audienceLabel = (id: Role | "all") => AUDIENCES.find((a) => a.id === id)?.label ?? id;

/** "Today", "Tomorrow", then "Thu, 6 Nov" — for a "YYYY-MM-DD" day in India time. */
function dayLabel(key: string, today: string, tomorrow: string) {
  if (key === today) return "Today";
  if (key === tomorrow) return "Tomorrow";
  return new Date(`${key}T12:00:00+05:30`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
}

function IdeasAdmin() {
  const { ideas, tracks, saveIdea, deleteIdea, supabaseMode } = useApp();
  const [editing, setEditing] = React.useState<DailyIdea | null>(null);
  const [composing, setComposing] = React.useState(false);
  // Before the 2026-11-04 database update there is no table to save into: say so
  // plainly instead of letting every save end in the generic "could not be saved".
  const [tableReady, setTableReady] = React.useState<boolean | null>(supabaseMode ? null : true);
  React.useEffect(() => {
    const sb = supabaseMode ? getSupabase() : null;
    if (!sb) return;
    let live = true;
    db.ideasTableReady(sb).then((ok) => live && setTableReady(ok));
    return () => {
      live = false;
    };
  }, [supabaseMode]);

  const now = Date.now();
  const today = indiaDateKey(now);
  const tomorrow = indiaDateKey(now, 1);
  const inRotation = rotation(ideas, "all");
  const paused = ideas.filter((i) => !i.active && !i.showOn);
  const pinned = ideas.filter((i) => i.showOn).sort((a, b) => (a.showOn! < b.showOn! ? -1 : 1));
  // The whole rotation in its order, live and paused, for the order controls.
  const ordered = [...ideas.filter((i) => !i.showOn)].sort((a, b) => a.order - b.order || (a.createdAt < b.createdAt ? -1 : 1));

  const touch = (i: DailyIdea, patch: Partial<DailyIdea>) => saveIdea({ ...i, ...patch, updatedAt: new Date().toISOString() });

  function move(i: DailyIdea, dir: -1 | 1) {
    const idx = ordered.findIndex((x) => x.id === i.id);
    const swap = ordered[idx + dir];
    if (!swap) return;
    // Distinct positions first, so the swap is exact even if two shared an order.
    const a = idx, b = idx + dir;
    touch(i, { order: b });
    touch(swap, { order: a });
    ordered.forEach((x, n) => {
      if (n !== a && n !== b && x.order !== n) touch(x, { order: n });
    });
  }

  const days = Array.from({ length: 7 }, (_, d) => indiaDateKey(now, d));

  return (
    <div className="space-y-5">
      {tableReady === false && (
        <Card padded className="flex gap-3 border-gold-300 bg-gold-50 dark:bg-gold-500/10">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-gold-600" />
          <div className="text-sm text-heading">
            <p className="font-semibold">One database update is needed before ideas can be saved.</p>
            <p className="mt-1 text-muted">
              In Supabase → SQL Editor, run <code className="rounded bg-surface-2 px-1">supabase/migrations/2026-11-04-ideas-resume-thumbnails-leaderboard.sql</code>{" "}
              (or re-run <code className="rounded bg-surface-2 px-1">supabase/database.sql</code>). Until then the dashboard simply hides the card.
            </p>
          </div>
        </Card>
      )}

      {/* What each audience sees over the next week */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hair px-5 py-4">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-heading">
            <CalendarDays className="h-5 w-5 text-gold-600" /> Coming up · next 7 days
          </h2>
          <span className="text-sm text-muted">
            {inRotation.length} in rotation{pinned.length ? ` · ${pinned.length} pinned to a date` : ""}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hair text-left text-xs uppercase tracking-wide text-faint">
                <th className="px-5 py-3 font-medium">Day</th>
                {ROLES.map((r) => (
                  <th key={r.id} className="px-5 py-3 font-medium">
                    {r.label}s
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-hair">
              {days.map((day, d) => (
                <tr key={day} className={cn(day === today && "bg-gold-50/60 dark:bg-gold-500/10")}>
                  <td className="whitespace-nowrap px-5 py-3 font-medium text-heading">{dayLabel(day, today, tomorrow)}</td>
                  {ROLES.map((r) => {
                    const idea = ideaForDay(ideas, r.id, now, d);
                    return (
                      <td key={r.id} className="px-5 py-3">
                        {idea ? (
                          <span className="inline-flex items-center gap-1.5 text-heading">
                            {idea.showOn && <CalendarDays className="h-3.5 w-3.5 shrink-0 text-gold-600" aria-label="Pinned" />}
                            <span className="line-clamp-1">{idea.title}</span>
                          </span>
                        ) : (
                          <span className="text-faint">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {!composing && !editing && (
        <div className="flex justify-end">
          <Button onClick={() => setComposing(true)} disabled={tableReady === false}>
            <Plus className="h-4 w-4" /> New idea
          </Button>
        </div>
      )}

      {(composing || editing) && (
        <IdeaForm
          key={editing?.id ?? "new"}
          initial={editing}
          tracks={tracks}
          today={today}
          nextOrder={ordered.length ? Math.max(...ordered.map((i) => i.order)) + 1 : 0}
          onCancel={() => {
            setComposing(false);
            setEditing(null);
          }}
          onSave={(idea, another) => {
            saveIdea(idea);
            setEditing(null);
            // "Save & add another": keep the form open, empty, for writing several at once.
            setComposing(another);
          }}
        />
      )}

      {/* The rotation, in order */}
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-hair px-5 py-4">
          <Lightbulb className="h-5 w-5 text-gold-600" />
          <h2 className="font-heading text-base font-semibold text-heading">Rotation · {ordered.length}</h2>
          <span className="text-sm text-muted">· one a day, top to bottom, then it starts over</span>
        </div>
        {ordered.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-faint">No ideas yet. Add three or more and the dashboard will cycle through them, a new one each day.</p>
        ) : (
          <ul className="divide-y divide-hair">
            {ordered.map((idea, i) => (
              <IdeaRow
                key={idea.id}
                idea={idea}
                tracks={tracks}
                first={i === 0}
                last={i === ordered.length - 1}
                onMove={(dir) => move(idea, dir)}
                onToggle={() => touch(idea, { active: !idea.active })}
                onEdit={() => {
                  setComposing(false);
                  setEditing(idea);
                }}
                onDelete={() => {
                  if (confirm(`Delete "${idea.title}"?`)) deleteIdea(idea.id);
                }}
              />
            ))}
          </ul>
        )}
        {paused.length > 0 && (
          <p className="border-t border-hair px-5 py-3 text-xs text-muted">Paused ideas keep their place but are skipped until you resume them.</p>
        )}
      </Card>

      {pinned.length > 0 && (
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-hair px-5 py-4">
            <CalendarDays className="h-5 w-5 text-gold-600" />
            <h2 className="font-heading text-base font-semibold text-heading">Pinned to a date · {pinned.length}</h2>
            <span className="text-sm text-muted">· shown on that day instead of the rotation</span>
          </div>
          <ul className="divide-y divide-hair">
            {pinned.map((idea) => (
              <IdeaRow
                key={idea.id}
                idea={idea}
                tracks={tracks}
                past={idea.showOn! < today}
                pinLabel={dayLabel(idea.showOn!, today, tomorrow)}
                onToggle={() => touch(idea, { active: !idea.active })}
                onEdit={() => {
                  setComposing(false);
                  setEditing(idea);
                }}
                onDelete={() => {
                  if (confirm(`Delete "${idea.title}"?`)) deleteIdea(idea.id);
                }}
              />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

const ICON_BTN = "grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-surface-2 hover:text-heading disabled:opacity-30";

function IdeaRow({
  idea,
  tracks,
  first,
  last,
  past,
  pinLabel,
  onMove,
  onToggle,
  onEdit,
  onDelete,
}: {
  idea: DailyIdea;
  tracks: { id: string; label: string }[];
  first?: boolean;
  last?: boolean;
  past?: boolean;
  pinLabel?: string;
  onMove?: (dir: -1 | 1) => void;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const level = tracks.find((t) => t.id === idea.trackId)?.label;
  return (
    <li className={cn("flex flex-wrap items-start gap-3 px-5 py-3", (!idea.active || past) && "opacity-60")}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-heading">{idea.title}</span>
          <Badge variant="navy">{audienceLabel(idea.targetRole)}</Badge>
          {level && <Badge variant="neutral">{level}</Badge>}
          {pinLabel && <Badge variant="gold">{past ? `Was ${pinLabel}` : pinLabel}</Badge>}
          {!idea.active && <Badge variant="warning">Paused</Badge>}
        </div>
        <p className="mt-0.5 line-clamp-1 text-sm text-muted">{idea.question}</p>
      </div>
      <div className="flex items-center gap-1">
        {onMove && (
          <>
            <button onClick={() => onMove(-1)} disabled={first} title="Earlier in the rotation" className={ICON_BTN}>
              <ArrowUp className="h-4 w-4" />
            </button>
            <button onClick={() => onMove(1)} disabled={last} title="Later in the rotation" className={ICON_BTN}>
              <ArrowDown className="h-4 w-4" />
            </button>
          </>
        )}
        <button onClick={onToggle} title={idea.active ? "Pause" : "Resume"} className={ICON_BTN}>
          {idea.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
        <button onClick={onEdit} title="Edit" className={ICON_BTN}>
          <Pencil className="h-4 w-4" />
        </button>
        <button onClick={onDelete} title="Delete" className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-red-50 hover:text-red-600">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

const blankOptions = (): IdeaOption[] => [
  { text: "", good: true, feedback: "" },
  { text: "", good: false, feedback: "" },
  { text: "", good: false, feedback: "" },
];

function IdeaForm({
  initial,
  tracks,
  today,
  nextOrder,
  onSave,
  onCancel,
}: {
  initial: DailyIdea | null;
  tracks: { id: string; label: string }[];
  today: string;
  nextOrder: number;
  onSave: (idea: DailyIdea, addAnother: boolean) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = React.useState(initial?.title ?? "");
  const [body, setBody] = React.useState(initial?.body ?? "");
  const [trackId, setTrackId] = React.useState(initial?.trackId ?? "");
  const [audience, setAudience] = React.useState<Role | "all">(initial?.targetRole ?? "all");
  const [question, setQuestion] = React.useState(initial?.question ?? "");
  const [options, setOptions] = React.useState<IdeaOption[]>(() => {
    const o = initial?.options?.length ? initial.options.map((x) => ({ ...x })) : blankOptions();
    while (o.length < 3) o.push({ text: "", good: false, feedback: "" });
    return o.slice(0, 3);
  });
  const [showOn, setShowOn] = React.useState(initial?.showOn ?? "");

  const filled = options.filter((o) => o.text.trim());
  const best = options.findIndex((o) => o.good);
  const problems = [
    !title.trim() && "a title",
    !question.trim() && "a question",
    filled.length < 2 && "at least two answers",
    (best < 0 || !options[best]?.text.trim()) && "the best answer marked",
  ].filter(Boolean) as string[];

  const setOption = (i: number, patch: Partial<IdeaOption>) =>
    setOptions((list) => list.map((o, j) => (j === i ? { ...o, ...patch } : patch.good ? { ...o, good: false } : o)));

  function submit(active: boolean, another: boolean) {
    if (problems.length) return;
    const now = new Date().toISOString();
    onSave(
      {
        id: initial?.id ?? newId(),
        title: title.trim(),
        body: body.trim(),
        trackId: trackId || null,
        question: question.trim(),
        options: options.filter((o) => o.text.trim()).map((o) => ({ text: o.text.trim(), good: o.good, feedback: o.feedback.trim() })),
        targetRole: audience,
        showOn: showOn || null,
        order: initial?.order ?? nextOrder,
        active,
        createdAt: initial?.createdAt ?? now,
        updatedAt: now,
      },
      another,
    );
  }

  return (
    <Card padded className="space-y-4">
      <h2 className="font-heading text-base font-semibold text-heading">{initial ? "Edit idea" : "New idea"}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" required>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Psychological safety" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Leadership level">
            <Select value={trackId} onChange={(e) => setTrackId(e.target.value)}>
              <option value="">None</option>
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Shown to">
            <Select value={audience} onChange={(e) => setAudience(e.target.value as Role | "all")}>
              {AUDIENCES.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>
      <Field label="The idea" hint="Two or three sentences.">
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="People speak up, ask for help and admit mistakes when…" className="min-h-[80px]" />
      </Field>
      <Field label="Question for the learner" required>
        <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="A teammate tells you about a mistake the day before a deadline. What do you say first?" />
      </Field>

      <div className="space-y-2.5">
        <p className="text-sm font-medium text-heading">
          Answers <span className="font-normal text-muted">· mark the best one; the response appears when a learner picks it</span>
        </p>
        {options.map((o, i) => (
          <div key={i} className={cn("grid gap-2 rounded-xl border p-3 sm:grid-cols-[auto_1fr_1fr] sm:items-center", o.good ? "border-green-300 bg-green-50/50 dark:bg-green-500/10" : "border-hair")}>
            <button
              type="button"
              role="radio"
              aria-checked={o.good}
              aria-label={`Answer ${i + 1} is the best answer`}
              onClick={() => setOption(i, { good: true })}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                o.good ? "bg-green-600 text-white" : "bg-surface-2 text-muted hover:text-heading",
              )}
            >
              <Check className="h-3 w-3" strokeWidth={3} /> {o.good ? "Best" : "Mark best"}
            </button>
            <Input value={o.text} onChange={(e) => setOption(i, { text: e.target.value })} placeholder={`Answer ${i + 1}`} />
            <Input value={o.feedback} onChange={(e) => setOption(i, { feedback: e.target.value })} placeholder="Response shown on picking it" />
          </div>
        ))}
      </div>

      <Field label="Pin to a date (optional)" hint="Leave empty to put it in the daily rotation. A pinned idea shows only on that day.">
        <div className="flex flex-wrap items-center gap-2">
          <Input type="date" value={showOn} min={initial?.showOn && initial.showOn < today ? undefined : today} onChange={(e) => setShowOn(e.target.value)} className="w-auto" />
          {showOn && (
            <button type="button" onClick={() => setShowOn("")} className="text-xs text-faint hover:text-heading">
              Clear date
            </button>
          )}
        </div>
      </Field>

      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
        {problems.length > 0 && <p className="mr-auto text-xs text-muted">Still needed: {problems.join(", ")}.</p>}
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="outline" onClick={() => submit(false, false)} disabled={problems.length > 0}>
          Save paused
        </Button>
        {!initial && (
          <Button variant="outline" onClick={() => submit(true, true)} disabled={problems.length > 0}>
            Save &amp; add another
          </Button>
        )}
        <Button onClick={() => submit(true, false)} disabled={problems.length > 0}>
          {initial ? "Save" : "Save & schedule"}
        </Button>
      </div>
    </Card>
  );
}

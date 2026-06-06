"use client";

import * as React from "react";
import { Plus, Pencil, Trash2, ClipboardList, Check } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea, Select, Field } from "@/components/ui/Field";
import { useApp } from "@/lib/store/AppProvider";
import { Question } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Editing {
  courseId: string;
  assignmentId: string;
  question: Question;
  isNew: boolean;
}

function blankQuestion(): Question {
  return {
    id: `q_${Date.now()}${Math.random().toString(36).slice(2, 5)}`,
    type: "mcq",
    prompt: "",
    options: ["", "", "", ""],
    correctAnswer: "",
    explanation: "",
  };
}

export default function QuestionBankPage() {
  return (
    <AdminShell title="Question Bank" subtitle="Add, edit, and remove assessment questions across all topics">
      <Bank />
    </AdminShell>
  );
}

function Bank() {
  const { courses, deleteQuestion } = useApp();
  const [filter, setFilter] = React.useState("all");
  const [editing, setEditing] = React.useState<Editing | null>(null);

  const withAssignments = courses.filter((c) => c.assignments.length > 0);
  const visible = withAssignments.filter((c) => filter === "all" || c.id === filter);
  const totalQuestions = courses.reduce(
    (n, c) => n + c.assignments.reduce((m, a) => m + a.questions.length, 0),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          <span className="font-semibold text-heading">{totalQuestions}</span> questions across{" "}
          {withAssignments.length} topics
        </p>
        <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-64">
          <option value="all">All topics</option>
          {withAssignments.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </Select>
      </div>

      {visible.map((c) => (
        <Card key={c.id} className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-hair px-5 py-3.5">
            <h2 className="font-heading font-semibold text-heading">{c.title}</h2>
            <Badge variant="neutral" className="capitalize">{c.category}</Badge>
          </div>
          <div className="divide-y divide-hair">
            {c.assignments.map((a) => (
              <div key={a.id} className="p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-heading">
                    <ClipboardList className="h-4 w-4 text-gold-600" /> Checkpoint · after video{" "}
                    {a.afterVideoOrder}
                    <span className="font-normal text-faint">({a.questions.length} questions)</span>
                  </p>
                  <Button
                    size="sm"
                    variant="subtle"
                    onClick={() => setEditing({ courseId: c.id, assignmentId: a.id, question: blankQuestion(), isNew: true })}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add question
                  </Button>
                </div>
                <ul className="space-y-2">
                  {a.questions.map((q, i) => (
                    <li key={q.id} className="flex items-start gap-3 rounded-xl border border-hair p-3">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-navy-800 text-xs font-bold text-white">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <Badge variant="neutral">{q.type === "mcq" ? "MCQ" : "Fill-blank"}</Badge>
                        <p className="mt-1 text-sm text-heading">{q.prompt}</p>
                        <p className="mt-1 text-xs text-muted">
                          Correct: <span className="font-medium text-green-700">{q.correctAnswer}</span>
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditing({ courseId: c.id, assignmentId: a.id, question: q, isNew: false })}
                          className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-surface-2 hover:text-heading"
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Delete this question?")) deleteQuestion(c.id, a.id, q.id);
                          }}
                          className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-red-50 hover:text-red-600"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                  {a.questions.length === 0 && <li className="text-xs text-faint">No questions yet.</li>}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      ))}

      {visible.length === 0 && (
        <Card padded className="text-center text-sm text-muted">
          No topics with checkpoints yet. Add checkpoints in the Course Wizard first.
        </Card>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.isNew ? "Add question" : "Edit question"}>
        {editing && <QuestionForm editing={editing} onClose={() => setEditing(null)} />}
      </Modal>
    </div>
  );
}

function QuestionForm({ editing, onClose }: { editing: Editing; onClose: () => void }) {
  const { saveQuestion } = useApp();
  const [q, setQ] = React.useState<Question>(editing.question);
  const set = (patch: Partial<Question>) => setQ((p) => ({ ...p, ...patch }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    saveQuestion(editing.courseId, editing.assignmentId, q);
    onClose();
  }

  return (
    <form onSubmit={submit} className="space-y-4 p-6">
      <Field label="Type">
        <Select value={q.type} onChange={(e) => set({ type: e.target.value as Question["type"] })}>
          <option value="mcq">Multiple choice</option>
          <option value="fill_blank">Fill in the blank</option>
        </Select>
      </Field>
      <Field label="Prompt" hint={q.type === "fill_blank" ? "Use ____ where the blank should appear." : undefined}>
        <Textarea
          value={q.prompt}
          onChange={(e) => set({ prompt: e.target.value })}
          placeholder={q.type === "fill_blank" ? "Authentic leaders lead from their ____." : "Question prompt"}
        />
      </Field>
      <Field label={q.type === "mcq" ? "Options — tap the circle to mark the correct one" : "Word bank — tap the circle to mark the correct word"}>
        <div className="space-y-2">
          {q.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => set({ correctAnswer: opt })}
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
                  const options = q.options.map((o, idx) => (idx === i ? e.target.value : o));
                  const patch: Partial<Question> = { options };
                  if (q.correctAnswer === opt) patch.correctAnswer = e.target.value;
                  set(patch);
                }}
                placeholder={`Option ${i + 1}`}
                className="py-2 text-sm"
              />
            </div>
          ))}
        </div>
      </Field>
      <Field label="Explanation" hint="Shown to the learner after grading.">
        <Input value={q.explanation} onChange={(e) => set({ explanation: e.target.value })} placeholder="Why this is the correct answer…" />
      </Field>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={!q.prompt.trim() || !q.correctAnswer}>
          Save question
        </Button>
      </div>
    </form>
  );
}

"use client";

import * as React from "react";
import { HelpCircle, Plus, Trash2, Eye, EyeOff, Pencil, ArrowUp, ArrowDown } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";
import { useApp } from "@/lib/store/AppProvider";
import { Faq } from "@/lib/types";

export default function AdminFaqPage() {
  return (
    <AdminShell title="FAQ" subtitle="Manage the questions shown on your public Help Center" requires="homepage">
      <FaqAdmin />
    </AdminShell>
  );
}

const newId = () => `faq_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function FaqAdmin() {
  const { faqs, saveFaq, deleteFaq } = useApp();
  const [editing, setEditing] = React.useState<Faq | null>(null);
  const [composing, setComposing] = React.useState(false);

  const sorted = [...faqs].sort((a, b) => (a.order !== b.order ? a.order - b.order : a.createdAt < b.createdAt ? -1 : 1));

  const touch = (f: Faq, patch: Partial<Faq>) => saveFaq({ ...f, ...patch, updatedAt: new Date().toISOString() });

  function move(f: Faq, dir: -1 | 1) {
    const idx = sorted.findIndex((x) => x.id === f.id);
    const swap = sorted[idx + dir];
    if (!swap) return;
    touch(f, { order: swap.order });
    touch(swap, { order: f.order });
  }

  return (
    <div className="space-y-5">
      {!composing && !editing && (
        <div className="flex justify-end">
          <Button onClick={() => setComposing(true)}>
            <Plus className="h-4 w-4" /> New question
          </Button>
        </div>
      )}

      {(composing || editing) && (
        <Form
          key={editing?.id ?? "new"}
          initial={editing}
          nextOrder={sorted.length ? Math.max(...sorted.map((f) => f.order)) + 1 : 0}
          onCancel={() => {
            setComposing(false);
            setEditing(null);
          }}
          onSave={(f) => {
            saveFaq(f);
            setComposing(false);
            setEditing(null);
          }}
        />
      )}

      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-hair px-5 py-4">
          <HelpCircle className="h-5 w-5 text-gold-600" />
          <h2 className="font-heading text-base font-semibold text-heading">All questions · {faqs.length}</h2>
        </div>
        {sorted.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-faint">No FAQs yet. Add your first above.</p>
        ) : (
          <ul className="divide-y divide-hair">
            {sorted.map((f, i) => (
              <li key={f.id} className="flex flex-wrap items-start gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-heading">{f.question}</span>
                    {!f.published && <Badge variant="neutral">Draft</Badge>}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-sm text-muted">{f.answer}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => move(f, -1)} disabled={i === 0} title="Move up" className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-surface-2 hover:text-heading disabled:opacity-30">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button onClick={() => move(f, 1)} disabled={i === sorted.length - 1} title="Move down" className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-surface-2 hover:text-heading disabled:opacity-30">
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button onClick={() => touch(f, { published: !f.published })} title={f.published ? "Unpublish" : "Publish"} className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-surface-2 hover:text-heading">
                    {f.published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button onClick={() => { setComposing(false); setEditing(f); }} title="Edit" className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-surface-2 hover:text-heading">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => { if (confirm("Delete this FAQ?")) deleteFaq(f.id); }} title="Delete" className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Form({
  initial,
  nextOrder,
  onSave,
  onCancel,
}: {
  initial: Faq | null;
  nextOrder: number;
  onSave: (f: Faq) => void;
  onCancel: () => void;
}) {
  const [question, setQuestion] = React.useState(initial?.question ?? "");
  const [answer, setAnswer] = React.useState(initial?.answer ?? "");

  function submit(publish: boolean) {
    if (!question.trim() || !answer.trim()) return;
    const now = new Date().toISOString();
    onSave({
      id: initial?.id ?? newId(),
      question: question.trim(),
      answer: answer.trim(),
      order: initial?.order ?? nextOrder,
      published: publish,
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    });
  }

  return (
    <Card padded className="space-y-3">
      <h2 className="font-heading text-base font-semibold text-heading">{initial ? "Edit question" : "New question"}</h2>
      <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Question" />
      <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} className="min-h-[120px]" placeholder="Answer… (blank lines separate paragraphs)" />
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button variant="outline" onClick={() => submit(false)} disabled={!question.trim() || !answer.trim()}>Save draft</Button>
        <Button onClick={() => submit(true)} disabled={!question.trim() || !answer.trim()}>
          {initial && initial.published ? "Save & keep live" : "Publish"}
        </Button>
      </div>
    </Card>
  );
}

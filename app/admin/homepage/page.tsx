"use client";

import * as React from "react";
import { Plus, Pencil, Trash2, Check, X, Upload, BookOpen, EyeOff, Save } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea, Field } from "@/components/ui/Field";
import { useApp } from "@/lib/store/AppProvider";
import { Book, SiteContent, SiteStat } from "@/lib/types";

export default function AdminHomepagePage() {
  return (
    <AdminShell title="Homepage" subtitle="Edit the hero, stats, mentors strip & book showcase on the public site" requires="homepage">
      <HomepageAdmin />
    </AdminShell>
  );
}

function HomepageAdmin() {
  const { siteContent, saveSiteContent } = useApp();
  return (
    <div className="max-w-3xl space-y-8">
      <SiteContentForm content={siteContent} onSave={saveSiteContent} />
      <BooksSection />
    </div>
  );
}

/* ───────────────────────── hero / stats / headings ───────────────────────── */

function SiteContentForm({ content, onSave }: { content: SiteContent; onSave: (c: SiteContent) => void }) {
  const [form, setForm] = React.useState<SiteContent>(content);
  const [saved, setSaved] = React.useState(false);
  // Resync if the loaded content changes (e.g. after Supabase load).
  React.useEffect(() => setForm(content), [content]);

  const set = (patch: Partial<SiteContent>) => setForm((f) => ({ ...f, ...patch }));
  const setStat = (i: number, patch: Partial<SiteStat>) =>
    setForm((f) => ({ ...f, stats: f.stats.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));
  const addStat = () => setForm((f) => ({ ...f, stats: [...f.stats, { value: "", label: "" }] }));
  const removeStat = (i: number) => setForm((f) => ({ ...f, stats: f.stats.filter((_, j) => j !== i) }));
  const setPStat = (i: number, patch: Partial<SiteStat>) =>
    setForm((f) => ({ ...f, professorStats: f.professorStats.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));
  const addPStat = () => setForm((f) => ({ ...f, professorStats: [...f.professorStats, { value: "", label: "" }] }));
  const removePStat = (i: number) =>
    setForm((f) => ({ ...f, professorStats: f.professorStats.filter((_, j) => j !== i) }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <form onSubmit={submit}>
      <Card padded className="space-y-5">
        <div>
          <h2 className="font-heading text-lg font-bold text-heading">Hero section</h2>
          <p className="text-sm text-muted">The headline area at the top of the landing page.</p>
        </div>

        <Field label="Eyebrow (animated line after L·E·A·P)">
          <Input value={form.heroEyebrow} onChange={(e) => set({ heroEyebrow: e.target.value })} />
        </Field>

        <Field label="Headline">
          <Input value={form.heroTitle} onChange={(e) => set({ heroTitle: e.target.value })} />
        </Field>

        <Field label="Highlighted phrases" hint="Comma-separated phrases inside the headline to show in gold.">
          <Input
            value={form.heroHighlights.join(", ")}
            onChange={(e) => set({ heroHighlights: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
            placeholder="Human Wisdom, High Performance Stars"
          />
        </Field>

        <Field label="Sub-headline">
          <Textarea value={form.heroSubtitle} onChange={(e) => set({ heroSubtitle: e.target.value })} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Professor name (hero card)">
            <Input value={form.professorName} onChange={(e) => set({ professorName: e.target.value })} />
          </Field>
          <Field label="Professor title (hero card)">
            <Input value={form.professorTitle} onChange={(e) => set({ professorTitle: e.target.value })} />
          </Field>
        </div>

        <Field label="Hero quote">
          <Textarea value={form.heroQuote} onChange={(e) => set({ heroQuote: e.target.value })} className="min-h-[64px]" />
        </Field>

        {/* Stats */}
        <div className="border-t border-hair pt-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading font-semibold text-heading">Stats bar</h3>
              <p className="text-sm text-muted">The counters below the hero (value + label).</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addStat}>
              <Plus className="h-4 w-4" /> Add stat
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            {form.stats.map((s, i) => (
              <div key={i} className="flex items-end gap-3">
                <Field label={i === 0 ? "Value" : undefined} className="w-28">
                  <Input value={s.value} onChange={(e) => setStat(i, { value: e.target.value })} placeholder="40+" />
                </Field>
                <Field label={i === 0 ? "Label" : undefined} className="flex-1">
                  <Input value={s.label} onChange={(e) => setStat(i, { label: e.target.value })} placeholder="Coaching Topics" />
                </Field>
                <button
                  type="button"
                  onClick={() => removeStat(i)}
                  className="mb-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-faint hover:bg-red-50 hover:text-red-600"
                  aria-label="Remove stat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Professor achievement stats */}
        <div className="border-t border-hair pt-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading font-semibold text-heading">Professor achievement stats</h3>
              <p className="text-sm text-muted">The grid in the &ldquo;Meet your mentor&rdquo; section.</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addPStat}>
              <Plus className="h-4 w-4" /> Add stat
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            {form.professorStats.map((s, i) => (
              <div key={i} className="flex items-end gap-3">
                <Field label={i === 0 ? "Value" : undefined} className="w-28">
                  <Input value={s.value} onChange={(e) => setPStat(i, { value: e.target.value })} placeholder="67" />
                </Field>
                <Field label={i === 0 ? "Label" : undefined} className="flex-1">
                  <Input value={s.label} onChange={(e) => setPStat(i, { label: e.target.value })} placeholder="Research publications" />
                </Field>
                <button
                  type="button"
                  onClick={() => removePStat(i)}
                  className="mb-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-faint hover:bg-red-50 hover:text-red-600"
                  aria-label="Remove stat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Section headings */}
        <div className="border-t border-hair pt-5">
          <h3 className="font-heading font-semibold text-heading">Section headings</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Mentors heading">
              <Input value={form.mentorsHeading} onChange={(e) => set({ mentorsHeading: e.target.value })} />
            </Field>
            <Field label="Mentors sub-heading">
              <Input value={form.mentorsSubheading} onChange={(e) => set({ mentorsSubheading: e.target.value })} />
            </Field>
            <Field label="Books heading">
              <Input value={form.booksHeading} onChange={(e) => set({ booksHeading: e.target.value })} />
            </Field>
            <Field label="Books sub-heading">
              <Input value={form.booksSubheading} onChange={(e) => set({ booksSubheading: e.target.value })} />
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-hair pt-4">
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700">
              <Check className="h-4 w-4" /> Saved
            </span>
          )}
          <Button type="submit">
            <Save className="h-4 w-4" /> Save homepage
          </Button>
        </div>
      </Card>
    </form>
  );
}

/* ───────────────────────────── books ───────────────────────────── */

const blankBook = (order: number): Book => ({
  id: `bk_${Date.now()}`,
  title: "",
  author: "",
  coverUrl: "",
  blurb: "",
  link: "",
  order,
  active: true,
});

function BooksSection() {
  const { books, saveBook, deleteBook } = useApp();
  const [editing, setEditing] = React.useState<Book | null>(null);
  const sorted = [...books].sort((a, b) => a.order - b.order);

  return (
    <Card padded className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-lg font-bold text-heading">Book showcase</h2>
          <p className="text-sm text-muted">Books shown on the landing page and About page.</p>
        </div>
        <Button onClick={() => setEditing(blankBook(books.length))}>
          <Plus className="h-4 w-4" /> Add book
        </Button>
      </div>

      {sorted.length === 0 && <p className="text-sm text-muted">No books yet.</p>}

      <div className="space-y-3">
        {sorted.map((b) => (
          <div key={b.id} className="flex items-center gap-4 rounded-xl border border-hair bg-surface p-3">
            <div className="grid h-16 w-12 shrink-0 place-items-center overflow-hidden rounded-md bg-gradient-to-br from-navy-700 to-navy-900">
              {b.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.coverUrl} alt={b.title} className="h-full w-full object-cover" />
              ) : (
                <BookOpen className="h-5 w-5 text-gold-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-heading font-semibold text-heading">{b.title || "Untitled"}</p>
                {!b.active && <Badge variant="neutral"><EyeOff className="h-3 w-3" /> Hidden</Badge>}
              </div>
              <p className="text-sm text-muted">{b.author}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button onClick={() => setEditing(b)} title="Edit" className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-surface-2 hover:text-heading">
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete "${b.title}"?`)) deleteBook(b.id);
                }}
                title="Delete"
                className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing && books.some((b) => b.id === editing.id) ? "Edit book" : "Add book"}
      >
        {editing && (
          <BookForm
            book={editing}
            onSave={(b) => {
              saveBook(b);
              setEditing(null);
            }}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
    </Card>
  );
}

function BookForm({ book, onSave, onCancel }: { book: Book; onSave: (b: Book) => void; onCancel: () => void }) {
  const [form, setForm] = React.useState<Book>(book);
  const set = (patch: Partial<Book>) => setForm((f) => ({ ...f, ...patch }));
  const fileRef = React.useRef<HTMLInputElement>(null);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set({ coverUrl: String(reader.result) });
    reader.readAsDataURL(file);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
      className="space-y-4 p-6"
    >
      <Field label="Title" required>
        <Input value={form.title} onChange={(e) => set({ title: e.target.value })} required />
      </Field>
      <Field label="Author">
        <Input value={form.author} onChange={(e) => set({ author: e.target.value })} placeholder="Prof. Vishal Gupta" />
      </Field>
      <Field label="Cover image URL" hint="Paste a URL, or upload below.">
        <Input value={form.coverUrl ?? ""} onChange={(e) => set({ coverUrl: e.target.value })} placeholder="https://…" />
      </Field>
      <div>
        <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} className="hidden" />
        <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4" /> Upload cover
        </Button>
      </div>
      <Field label="Blurb">
        <Textarea value={form.blurb} onChange={(e) => set({ blurb: e.target.value })} className="min-h-[80px]" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Link">
          <Input value={form.link ?? ""} onChange={(e) => set({ link: e.target.value })} placeholder="https://…" />
        </Field>
        <Field label="Display order">
          <Input type="number" value={form.order} onChange={(e) => set({ order: Number(e.target.value) })} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm font-medium text-heading">
        <input type="checkbox" checked={form.active} onChange={(e) => set({ active: e.target.checked })} className="h-4 w-4 accent-gold-500" />
        Show on the public site
      </label>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save book</Button>
      </div>
    </form>
  );
}

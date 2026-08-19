"use client";

import * as React from "react";
import { Plus, Pencil, Trash2, Upload, EyeOff, Newspaper, CalendarDays, ImagePlus, X, Archive, ArchiveRestore } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea, Field } from "@/components/ui/Field";
import { useApp } from "@/lib/store/AppProvider";
import { Article, ArticleImage, articleExcerpt } from "@/lib/types";
import { uploadMedia } from "@/lib/supabase/storage";

export default function AdminArticlesPage() {
  return (
    <AdminShell
      title="Articles"
      subtitle="Write articles for your learners — published ones appear on their Articles page"
      requires="articles"
    >
      <ArticlesAdmin />
    </AdminShell>
  );
}

function ArticlesAdmin() {
  const { articles, currentUser, saveArticle, deleteArticle } = useApp();
  const [editing, setEditing] = React.useState<Article | null>(null);

  const blank = (): Article => ({
    id: `ar_${Date.now().toString(36)}`,
    title: "",
    excerpt: "",
    content: "",
    coverUrl: null,
    images: [],
    authorId: currentUser?.id ?? "",
    authorName: currentUser?.name ?? "LEAP Coach",
    published: false,
    archived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Active articles first (newest first), then archived ones grouped at the bottom.
  const sorted = [...articles].sort((a, b) => {
    if (!!a.archived !== !!b.archived) return a.archived ? 1 : -1;
    return a.createdAt < b.createdAt ? 1 : -1;
  });
  const archivedCount = articles.filter((a) => a.archived).length;

  const toggleArchive = (a: Article) =>
    saveArticle({ ...a, archived: !a.archived, updatedAt: new Date().toISOString() });

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Use the <Archive className="mb-0.5 inline h-3.5 w-3.5" /> archive button to hide an article from learners
          without deleting it{archivedCount > 0 ? ` · ${archivedCount} archived` : ""}.
        </p>
        <Button onClick={() => setEditing(blank())}>
          <Plus className="h-4 w-4" /> Write article
        </Button>
      </div>

      {sorted.length === 0 && (
        <Card padded>
          <p className="text-sm text-muted">
            No articles yet. Click <span className="font-semibold text-heading">Write article</span> — published
            articles appear instantly on the learners&apos; Articles page.
          </p>
        </Card>
      )}

      <div className="space-y-4">
        {sorted.map((a) => (
          <Card key={a.id} padded className={a.archived ? "opacity-60" : undefined}>
            <div className="flex items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface-2 text-gold-600">
                <Newspaper className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-heading font-semibold text-heading">{a.title || "Untitled"}</h3>
                  {a.archived ? (
                    <Badge variant="neutral">
                      <Archive className="h-3 w-3" /> Archived
                    </Badge>
                  ) : a.published ? (
                    <Badge variant="success">Published</Badge>
                  ) : (
                    <Badge variant="neutral">
                      <EyeOff className="h-3 w-3" /> Draft
                    </Badge>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{articleExcerpt(a)}</p>
                <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-faint">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {a.authorName} · {new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => setEditing(a)}
                  title="Edit"
                  className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-surface-2 hover:text-heading"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => toggleArchive(a)}
                  title={a.archived ? "Unarchive (show to learners again)" : "Archive (hide from learners)"}
                  className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-surface-2 hover:text-heading"
                >
                  {a.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete "${a.title}"? This cannot be undone.`)) deleteArticle(a.id);
                  }}
                  title="Delete"
                  className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing && articles.some((a) => a.id === editing.id) ? "Edit article" : "Write article"}
        className="max-w-2xl"
      >
        {editing && (
          <ArticleForm
            article={editing}
            onSave={(a) => {
              saveArticle(a);
              setEditing(null);
            }}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function ArticleForm({
  article,
  onSave,
  onCancel,
}: {
  article: Article;
  onSave: (a: Article) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = React.useState<Article>(article);
  const set = (patch: Partial<Article>) => setForm((f) => ({ ...f, ...patch }));
  const fileRef = React.useRef<HTMLInputElement>(null);
  const contentRef = React.useRef<HTMLTextAreaElement>(null);
  const imgFileRef = React.useRef<HTMLInputElement>(null);
  const [imgUrl, setImgUrl] = React.useState("");
  const [imgAlt, setImgAlt] = React.useState("");

  const images = form.images ?? [];

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    void uploadMedia(file, "article-covers").then((r) => set({ coverUrl: r.url }));
  }

  // Drop a picture into the body at the caret: store it in `images` and splice a short
  // [[image:id]] token onto its own paragraph (so the textarea stays readable).
  function insertImage(url: string) {
    const trimmed = url.trim();
    if (!trimmed) return;
    const id = `img_${Date.now().toString(36)}`;
    const image: ArticleImage = { id, url: trimmed, alt: imgAlt.trim() || undefined };
    const token = `[[image:${id}]]`;
    setForm((f) => {
      const ta = contentRef.current;
      const pos = ta ? ta.selectionStart : f.content.length;
      const head = f.content.slice(0, pos).replace(/\s+$/, "");
      const tail = f.content.slice(pos).replace(/^\s+/, "");
      const next = [head, token, tail].filter(Boolean).join("\n\n");
      return { ...f, content: next, images: [...(f.images ?? []), image] };
    });
    setImgUrl("");
    setImgAlt("");
  }

  function onPickInlineImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    void uploadMedia(file, "article-images").then((r) => insertImage(r.url));
    e.target.value = ""; // allow re-uploading the same file
  }

  function removeImage(id: string) {
    setForm((f) => ({
      ...f,
      images: (f.images ?? []).filter((im) => im.id !== id),
      content: f.content
        .replace(new RegExp(`\\n*\\[\\[image:${id}\\]\\]\\n*`, "g"), "\n\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim(),
    }));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ ...form, updatedAt: new Date().toISOString() });
      }}
      className="space-y-4 p-6"
    >
      <Field label="Title" required>
        <Input value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="Lead From Your Values…" required />
      </Field>

      <Field label="Excerpt (optional)" hint="Short teaser shown on article cards. Left empty, the first lines of the article are used.">
        <Textarea value={form.excerpt} onChange={(e) => set({ excerpt: e.target.value })} className="min-h-[56px]" />
      </Field>

      <Field label="Article" hint="Plain text — blank line between paragraphs. Use “Insert image” below to drop a picture at your cursor." required>
        <Textarea
          ref={contentRef}
          value={form.content}
          onChange={(e) => set({ content: e.target.value })}
          className="min-h-[260px]"
          placeholder={"Write your article here…\n\nSeparate paragraphs with a blank line."}
          required
        />
      </Field>

      {/* Inline images: insert a picture at the caret (upload → data URL, or paste a URL). */}
      <div className="space-y-3 rounded-xl border border-hair bg-surface-2/60 p-3.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-faint">Insert a picture into the article</p>
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Image URL" className="min-w-[160px] flex-1">
            <Input value={imgUrl} onChange={(e) => setImgUrl(e.target.value)} placeholder="https://… or upload →" />
          </Field>
          <Field label="Caption (optional)" className="min-w-[140px] flex-1">
            <Input value={imgAlt} onChange={(e) => setImgAlt(e.target.value)} placeholder="Shown under the image" />
          </Field>
          <input ref={imgFileRef} type="file" accept="image/*" onChange={onPickInlineImage} className="hidden" />
          <Button type="button" variant="outline" size="md" onClick={() => imgFileRef.current?.click()}>
            <Upload className="h-4 w-4" /> Upload
          </Button>
          <Button type="button" size="md" onClick={() => insertImage(imgUrl)} disabled={!imgUrl.trim()}>
            <ImagePlus className="h-4 w-4" /> Insert
          </Button>
        </div>
        <p className="text-xs text-faint">
          It appears at your cursor as an{" "}
          <code className="rounded bg-surface px-1 py-0.5">[[image:…]]</code> tag here, and as the real picture for readers.
        </p>
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2.5 pt-1">
            {images.map((im) => (
              <div key={im.id} className="group relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={im.url} alt={im.alt ?? ""} className="h-16 w-16 rounded-lg object-cover ring-1 ring-hair" />
                <button
                  type="button"
                  onClick={() => removeImage(im.id)}
                  title="Remove image"
                  className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-red-600 text-white opacity-0 shadow transition-opacity group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-end gap-3">
        <Field label="Cover image URL (optional)" className="flex-1">
          <Input value={form.coverUrl ?? ""} onChange={(e) => set({ coverUrl: e.target.value || null })} placeholder="https://…" />
        </Field>
        <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} className="hidden" />
        <Button type="button" variant="outline" size="md" onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4" /> Upload
        </Button>
      </div>
      {form.coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={form.coverUrl} alt="cover preview" className="h-36 w-full rounded-xl object-cover" />
      )}

      <label className="flex items-center gap-2 text-sm font-medium text-heading">
        <input
          type="checkbox"
          checked={form.published}
          onChange={(e) => set({ published: e.target.checked })}
          className="h-4 w-4 accent-gold-500"
        />
        Published (visible to learners)
      </label>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save article</Button>
      </div>
    </form>
  );
}

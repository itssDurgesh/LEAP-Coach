"use client";

import * as React from "react";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Flame,
  Lightbulb,
  Tags,
  Server,
  CheckCircle2,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { CourseThumb } from "@/components/CourseThumb";
import { useApp } from "@/lib/store/AppProvider";
import { DailyTip, Role, isOwner } from "@/lib/types";
import { formatINR } from "@/lib/utils";

export default function ContentStudioPage() {
  return (
    <AdminShell
      title="Content Curator's Studio"
      subtitle="Manage coaching topics, daily wisdom, and catalog filters"
      requires="content"
      actions={
        <Link href="/admin/courses/new" className={buttonClasses({ variant: "primary", size: "sm" })}>
          <Plus className="h-4 w-4" /> New Topic
        </Link>
      }
    >
      <Studio />
    </AdminShell>
  );
}

function Studio() {
  const { courses, tracks, tips, togglePublish, toggleTrending, deleteCourse, saveTip, deleteTip, addTrack, supabaseMode, seedDemoContent, currentUser } =
    useApp();
  const owner = isOwner(currentUser);

  const [tipForm, setTipForm] = React.useState({ text: "", author: "", targetRole: "all" });
  const [trackInput, setTrackInput] = React.useState("");
  const [seeding, setSeeding] = React.useState(false);

  const ready = courses.filter((c) => c.published).length;
  const totalVideos = courses.reduce((s, c) => s + c.videos.length, 0);
  const realVideos = courses.reduce(
    (s, c) => s + c.videos.filter((v) => v.muxPlaybackId && !v.muxPlaybackId.startsWith("mux_")).length,
    0,
  );

  function addTip(e: React.FormEvent) {
    e.preventDefault();
    if (!tipForm.text.trim()) return;
    saveTip({
      id: `tip_${Date.now()}`,
      text: tipForm.text.trim(),
      author: tipForm.author.trim() || "LEAP Coach",
      targetRole: tipForm.targetRole as DailyTip["targetRole"],
      active: true,
    });
    setTipForm({ text: "", author: "", targetRole: "all" });
  }

  return (
    <div className="space-y-6">
      {supabaseMode && owner && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold-200 bg-gold-50 dark:bg-gold-500/10 p-4">
          <p className="text-sm text-heading">
            <span className="font-semibold">Connected to Supabase.</span> Populate your database with
            the demo topics, tips, sessions &amp; resources.
          </p>
          <Button
            size="sm"
            loading={seeding}
            onClick={async () => {
              if (!confirm("Seed demo content into your Supabase database?")) return;
              setSeeding(true);
              await seedDemoContent();
              setSeeding(false);
            }}
          >
            Seed demo content
          </Button>
        </div>
      )}

      {/* Library at a glance (real) */}
      <Card padded>
        <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-heading">
          <Server className="h-5 w-5 text-gold-600" /> Library at a glance
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { label: "Coaching topics", value: courses.length, tone: "text-navy-600" },
            { label: "Total videos", value: totalVideos, tone: "text-green-600" },
            { label: "Real uploads (Mux)", value: realVideos, tone: "text-gold-600" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-hair bg-surface-2 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`h-4 w-4 ${s.tone}`} />
                <span className={`font-heading text-2xl font-bold ${s.tone}`}>{s.value}</span>
              </div>
              <p className="mt-0.5 text-sm text-muted">{s.label}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Asset library / course table */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-hair px-5 py-4">
          <h2 className="font-heading text-base font-semibold text-heading">
            Asset library · {courses.length} topics
          </h2>
          <span className="text-sm text-muted">{ready} published</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hair text-left text-xs uppercase tracking-wide text-faint">
                <th className="px-5 py-3 font-medium">Topic</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Price</th>
                <th className="px-5 py-3 font-medium">Enrolled</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hair">
              {courses.map((c) => (
                <tr key={c.id} className="hover:bg-surface-2">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <CourseThumb accent={c.accent} category={c.category} src={c.thumbnailUrl} rounded="rounded-lg" className="h-10 w-16" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-heading">{c.title}</span>
                          {c.trending && <Flame className="h-3.5 w-3.5 text-orange-500" />}
                        </div>
                        <span className="text-xs text-faint">{c.instructorName}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 capitalize text-muted">{c.category}</td>
                  <td className="px-5 py-3 text-muted">{c.price === 0 ? "Free" : formatINR(c.price)}</td>
                  <td className="px-5 py-3 text-muted">{c.enrolledCount.toLocaleString("en-IN")}</td>
                  <td className="px-5 py-3">
                    {c.pendingApproval ? (
                      <Badge variant="warning">Pending review</Badge>
                    ) : c.published ? (
                      <Badge variant="success">Published</Badge>
                    ) : (
                      <Badge variant="neutral">Draft</Badge>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {owner && (
                        <button
                          onClick={() => toggleTrending(c.id)}
                          title="Toggle trending"
                          className={`grid h-8 w-8 place-items-center rounded-lg hover:bg-surface-2 ${c.trending ? "text-orange-500" : "text-faint"}`}
                        >
                          <Flame className="h-4 w-4" />
                        </button>
                      )}
                      {owner && (
                        <button
                          onClick={() => togglePublish(c.id)}
                          title={c.published ? "Unpublish" : "Publish"}
                          className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-surface-2 hover:text-heading"
                        >
                          {c.published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>
                      )}
                      <Link
                        href={`/admin/courses/${c.id}/edit`}
                        title="Edit"
                        className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-surface-2 hover:text-heading"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      {owner && (
                        <button
                          onClick={() => {
                            if (confirm(`Delete "${c.title}"? This cannot be undone.`)) deleteCourse(c.id);
                          }}
                          title="Delete"
                          className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Wisdom enrichment */}
        <Card padded>
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-heading">
            <Lightbulb className="h-5 w-5 text-gold-600" /> Wisdom Enrichment · Daily Tips
          </h2>
          <form onSubmit={addTip} className="mt-4 space-y-2.5">
            <Input
              value={tipForm.text}
              onChange={(e) => setTipForm((f) => ({ ...f, text: e.target.value }))}
              placeholder="Tip of the day…"
            />
            <div className="flex gap-2">
              <Input
                value={tipForm.author}
                onChange={(e) => setTipForm((f) => ({ ...f, author: e.target.value }))}
                placeholder="Author"
                className="flex-1"
              />
              <Select
                value={tipForm.targetRole}
                onChange={(e) => setTipForm((f) => ({ ...f, targetRole: e.target.value }))}
                className="w-40"
              >
                <option value="all">All roles</option>
                <option value="student">Student</option>
                <option value="professional">Professional</option>
                <option value="entrepreneur">Entrepreneur</option>
              </Select>
              <Button type="submit" size="md">Add</Button>
            </div>
          </form>
          <ul className="mt-4 space-y-2">
            {tips.map((t) => (
              <li key={t.id} className="group flex items-start gap-2 rounded-xl border border-hair p-3">
                <div className="flex-1">
                  <p className="text-sm text-heading">&ldquo;{t.text}&rdquo;</p>
                  <p className="mt-0.5 text-xs text-faint">
                    {t.author} · <span className="capitalize">{t.targetRole}</span>
                  </p>
                </div>
                <button
                  onClick={() => deleteTip(t.id)}
                  className="text-faint opacity-0 hover:text-red-600 group-hover:opacity-100"
                  aria-label="Delete tip"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </Card>

        {/* Leadership tracks / filters */}
        <Card padded>
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-heading">
            <Tags className="h-5 w-5 text-gold-600" /> Catalog Filters · Leadership Tracks
          </h2>
          <p className="mt-1.5 text-sm text-muted">
            These appear as filters in the course catalog. Add your own categories.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (trackInput.trim()) {
                addTrack(trackInput);
                setTrackInput("");
              }
            }}
            className="mt-4 flex gap-2"
          >
            <Input
              value={trackInput}
              onChange={(e) => setTrackInput(e.target.value)}
              placeholder="e.g. Leading Change"
              className="flex-1"
            />
            <Button type="submit">Add filter</Button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            {tracks.map((t) => (
              <span key={t.id} className="rounded-full border border-hair bg-surface-2 px-3 py-1.5 text-sm font-medium text-heading">
                {t.label}
              </span>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

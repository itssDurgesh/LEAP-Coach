"use client";

import * as React from "react";
import { Plus, Pencil, Trash2, Star, EyeOff, Upload } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea, Select, Field } from "@/components/ui/Field";
import { useApp } from "@/lib/store/AppProvider";
import { resolveTeam } from "@/lib/team";
import { TeamMember, TEAM_GROUPS } from "@/lib/types";
import { normalizeExternalUrl } from "@/lib/utils";

const blank = (order: number): TeamMember => ({
  id: `tm_${Date.now()}`,
  name: "",
  title: "",
  group: "associate",
  photoUrl: "",
  bio: "",
  vision: "",
  links: {},
  featured: false,
  order,
  active: true,
  createdAt: new Date().toISOString(),
});

const groupLabel = (g: string) => TEAM_GROUPS.find((x) => x.id === g)?.label ?? g;
const wordCount = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

export default function AdminTeamPage() {
  return (
    <AdminShell title="Team" subtitle="Add mentors, research associates & interns shown on the Team page" requires="team">
      <TeamAdmin />
    </AdminShell>
  );
}

function TeamAdmin() {
  const { teamMembers, saveTeamMember, deleteTeamMember } = useApp();
  const [editing, setEditing] = React.useState<TeamMember | null>(null);

  const sorted = [...resolveTeam(teamMembers)].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={() => setEditing(blank(teamMembers.length))}>
          <Plus className="h-4 w-4" /> Add team member
        </Button>
      </div>

      {sorted.length === 0 && (
        <Card padded>
          <p className="text-sm text-muted">No team members yet. Add the founder, mentors, research associates, or interns — they appear on the public Team page.</p>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {sorted.map((m) => (
          <Card key={m.id} padded>
            <div className="flex items-start gap-4">
              <Avatar src={m.photoUrl} name={m.name} size={56} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-heading font-semibold text-heading">{m.name || "Untitled"}</h3>
                  <Badge variant="navy">{groupLabel(m.group)}</Badge>
                  {m.featured && (
                    <Badge variant="gold"><Star className="h-3 w-3" /> Featured</Badge>
                  )}
                  {!m.active && (
                    <Badge variant="neutral"><EyeOff className="h-3 w-3" /> Hidden</Badge>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-muted">{m.title}</p>
                <p className="mt-2 line-clamp-3 text-sm text-faint">{m.bio}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button onClick={() => setEditing(m)} title="Edit" className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-surface-2 hover:text-heading">
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Remove ${m.name || "this member"} from the team?`)) deleteTeamMember(m.id);
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
        title={editing && teamMembers.some((m) => m.id === editing.id) ? "Edit team member" : "Add team member"}
      >
        {editing && (
          <MemberForm
            member={editing}
            onSave={(m) => {
              saveTeamMember(m);
              setEditing(null);
            }}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function MemberForm({
  member,
  onSave,
  onCancel,
}: {
  member: TeamMember;
  onSave: (m: TeamMember) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = React.useState<TeamMember>(member);
  const set = (patch: Partial<TeamMember>) => setForm((f) => ({ ...f, ...patch }));
  const setLink = (k: keyof NonNullable<TeamMember["links"]>, v: string) =>
    setForm((f) => ({ ...f, links: { ...f.links, [k]: v } }));
  const fileRef = React.useRef<HTMLInputElement>(null);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set({ photoUrl: String(reader.result) });
    reader.readAsDataURL(file);
  }

  const bioWords = wordCount(form.bio);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // Clean pasted links on the way in ("Linkedin: https://…", bare domains) so a
        // stray label can't be stored as a relative href that 404s on the team page.
        const links = form.links;
        onSave(
          links
            ? {
                ...form,
                links: {
                  ...links,
                  linkedin: normalizeExternalUrl(links.linkedin) ?? undefined,
                  site: normalizeExternalUrl(links.site) ?? undefined,
                  youtube: normalizeExternalUrl(links.youtube) ?? undefined,
                  instagram: normalizeExternalUrl(links.instagram) ?? undefined,
                },
              }
            : form,
        );
      }}
      className="space-y-4 p-6"
    >
      <div className="flex items-center gap-4">
        <Avatar src={form.photoUrl} name={form.name} size={64} />
        <div className="flex-1">
          <Field label="Photo URL" hint="Paste an image URL, or upload a file below.">
            <Input value={form.photoUrl ?? ""} onChange={(e) => set({ photoUrl: e.target.value })} placeholder="/professor.jpg or https://…" />
          </Field>
        </div>
      </div>
      <div>
        <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} className="hidden" />
        <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4" /> Upload photo
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" required>
          <Input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Dr. Jane Doe" required />
        </Field>
        <Field label="Role / title">
          <Input value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="Research Associate" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Group">
          <Select value={form.group} onChange={(e) => set({ group: e.target.value as TeamMember["group"] })}>
            {TEAM_GROUPS.map((g) => (
              <option key={g.id} value={g.id}>{g.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Display order" hint="Lower numbers appear first.">
          <Input type="number" value={form.order} onChange={(e) => set({ order: Number(e.target.value) })} />
        </Field>
      </div>

      <Field label="Write-up (≈150 words)" hint={`${bioWords} word${bioWords === 1 ? "" : "s"}`}>
        <Textarea value={form.bio} onChange={(e) => set({ bio: e.target.value })} className="min-h-[120px]" placeholder="A short, warm bio…" />
      </Field>

      <Field label="Vision (optional)" hint="Shown as a highlighted callout — great for the founder.">
        <Textarea value={form.vision ?? ""} onChange={(e) => set({ vision: e.target.value })} className="min-h-[64px]" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="LinkedIn">
          <Input value={form.links?.linkedin ?? ""} onChange={(e) => setLink("linkedin", e.target.value)} placeholder="https://linkedin.com/in/…" />
        </Field>
        <Field label="Website">
          <Input value={form.links?.site ?? ""} onChange={(e) => setLink("site", e.target.value)} placeholder="https://…" />
        </Field>
        <Field label="YouTube">
          <Input value={form.links?.youtube ?? ""} onChange={(e) => setLink("youtube", e.target.value)} placeholder="https://youtube.com/…" />
        </Field>
        <Field label="Email">
          <Input value={form.links?.email ?? ""} onChange={(e) => setLink("email", e.target.value)} placeholder="name@email.com" />
        </Field>
      </div>

      <div className="flex flex-wrap gap-5 pt-1">
        <label className="flex items-center gap-2 text-sm font-medium text-heading">
          <input type="checkbox" checked={form.featured} onChange={(e) => set({ featured: e.target.checked })} className="h-4 w-4 accent-gold-500" />
          Feature on homepage
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-heading">
          <input type="checkbox" checked={form.active} onChange={(e) => set({ active: e.target.checked })} className="h-4 w-4 accent-gold-500" />
          Visible on Team page
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save member</Button>
      </div>
    </form>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Upload, ExternalLink, Award } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select, Field } from "@/components/ui/Field";
import { useApp } from "@/lib/store/AppProvider";
import { Gender, User, tierForCredits } from "@/lib/types";
import { isUsernameAvailable, normalizeUsername } from "@/lib/username";

const GENDERS: { v: Gender; l: string }[] = [
  { v: "male", l: "Male" },
  { v: "female", l: "Female" },
  { v: "non_binary", l: "Non-binary" },
  { v: "prefer_not", l: "Prefer not to say" },
];

export default function AccountPage() {
  return (
    <AppShell>
      <Account />
    </AppShell>
  );
}

type FormState = {
  name: string;
  username: string;
  headline: string;
  bio: string;
  age: string;
  gender: Gender | "";
  phone: string;
  company: string;
  region: string;
  nationality: string;
  avatarUrl: string;
};

function Account() {
  const { currentUser, users, updateProfileInfo } = useApp();
  const u = currentUser!;
  const tier = tierForCredits(u.learningCredits);

  const [form, setForm] = React.useState<FormState>({
    name: u.name ?? "",
    username: u.username ?? "",
    headline: u.headline ?? "",
    bio: u.bio ?? "",
    age: u.age != null ? String(u.age) : "",
    gender: u.gender ?? "",
    phone: u.phone ?? "",
    company: u.company ?? "",
    region: u.region ?? "",
    nationality: u.nationality ?? "",
    avatarUrl: u.avatarUrl ?? "",
  });
  const [saved, setSaved] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const unameNorm = normalizeUsername(form.username);
  const unameError =
    unameNorm.length > 0 && unameNorm.length < 3
      ? "At least 3 characters."
      : unameNorm && !isUsernameAvailable(unameNorm, users, u.id)
        ? "That handle is taken."
        : "";

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set({ avatarUrl: String(reader.result) });
    reader.readAsDataURL(file);
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (unameError) return;
    const patch: Partial<User> = {
      name: form.name.trim(),
      headline: form.headline.trim(),
      bio: form.bio.trim(),
      age: form.age ? Number(form.age) : undefined,
      gender: form.gender || undefined,
      phone: form.phone.trim(),
      company: form.company.trim(),
      region: form.region.trim(),
      nationality: form.nationality.trim(),
      avatarUrl: form.avatarUrl || null,
    };
    if (unameNorm) patch.username = unameNorm;
    updateProfileInfo(patch);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold text-heading">Account settings</h1>
          <p className="mt-1.5 text-muted">Manage your profile and personal information.</p>
        </div>
        <Link href={`/u/${u.username ?? u.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-gold-600 hover:text-gold-700">
          View public profile <ExternalLink className="h-4 w-4" />
        </Link>
      </header>

      {/* Summary strip */}
      <Card padded>
        <div className="flex flex-wrap items-center gap-4">
          <Avatar src={form.avatarUrl} name={form.name} size={64} />
          <div className="min-w-0 flex-1">
            <p className="font-heading text-lg font-bold text-heading">{form.name || "Your name"}</p>
            <p className="truncate text-sm text-muted">{u.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="navy" className="capitalize">{u.role}</Badge>
            <Badge variant={tier.color}>
              <Award className="h-3 w-3" /> {tier.label}
            </Badge>
            <Badge variant="gold">{u.learningCredits} cr</Badge>
          </div>
        </div>
      </Card>

      <form onSubmit={save}>
        <Card padded className="space-y-5">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <Avatar src={form.avatarUrl} name={form.name} size={72} />
            <div className="flex-1 space-y-2">
              <Field label="Avatar URL" hint="Paste a URL or upload an image.">
                <Input value={form.avatarUrl} onChange={(e) => set({ avatarUrl: e.target.value })} placeholder="https://…" />
              </Field>
              <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} className="hidden" />
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4" /> Upload photo
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" required>
              <Input value={form.name} onChange={(e) => set({ name: e.target.value })} required />
            </Field>
            <Field label="Email" hint="Email can't be changed here.">
              <Input value={u.email} disabled />
            </Field>
          </div>

          <Field label="Username" hint="Your unique @handle, used to tag you in the discussion board." error={unameError || undefined}>
            <Input value={form.username} onChange={(e) => set({ username: e.target.value })} placeholder="yourhandle" />
          </Field>

          <Field label="Headline" hint="A short tagline shown on your profile.">
            <Input value={form.headline} onChange={(e) => set({ headline: e.target.value })} placeholder="Engineering Manager · learning to lead" />
          </Field>

          <Field label="About you">
            <Textarea value={form.bio} onChange={(e) => set({ bio: e.target.value })} className="min-h-[100px]" placeholder="A few lines about yourself…" />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company / College">
              <Input value={form.company} onChange={(e) => set({ company: e.target.value })} />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Age">
              <Input type="number" min={1} value={form.age} onChange={(e) => set({ age: e.target.value })} />
            </Field>
            <Field label="Gender">
              <Select value={form.gender} onChange={(e) => set({ gender: e.target.value as Gender | "" })}>
                <option value="">—</option>
                {GENDERS.map((g) => (
                  <option key={g.v} value={g.v}>{g.l}</option>
                ))}
              </Select>
            </Field>
            <Field label="Region">
              <Input value={form.region} onChange={(e) => set({ region: e.target.value })} />
            </Field>
          </div>

          <Field label="Nationality">
            <Input value={form.nationality} onChange={(e) => set({ nationality: e.target.value })} />
          </Field>

          <div className="flex items-center justify-end gap-3 border-t border-hair pt-4">
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700">
                <Check className="h-4 w-4" /> Saved
              </span>
            )}
            <Button type="submit" disabled={!!unameError}>Save changes</Button>
          </div>
        </Card>
      </form>
    </div>
  );
}

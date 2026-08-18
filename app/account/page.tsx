"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Upload, ExternalLink, Award, ReceiptText, ChevronDown, Send } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea, Select, Field } from "@/components/ui/Field";
import { Receipt, paymentItemLabel } from "@/components/payments/Receipt";
import { useApp } from "@/lib/store/AppProvider";
import { Gender, User, tierForCredits } from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";
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

  // The @handle is the identity used to tag people in discussions (and to bind the
  // Telegram bot), so once a user has one it's permanent. Only a user who somehow has
  // no handle yet may set it once; after that the field is locked.
  const usernameLocked = !!u.username?.trim();
  const unameNorm = normalizeUsername(form.username);
  const unameError =
    usernameLocked
      ? ""
      : unameNorm.length > 0 && unameNorm.length < 3
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
    if (!usernameLocked && unameNorm) patch.username = unameNorm;
    updateProfileInfo(patch);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-display-sm font-bold leading-tight text-heading">Account settings</h1>
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

          <Field
            label="Username"
            hint={
              usernameLocked
                ? "Your permanent @handle, used to tag you in discussions. It can't be changed."
                : "Your unique @handle, used to tag you in the discussion board. Choose carefully — it can't be changed later."
            }
            error={unameError || undefined}
          >
            <Input
              value={usernameLocked ? `@${u.username}` : form.username}
              onChange={(e) => set({ username: e.target.value })}
              placeholder="yourhandle"
              disabled={usernameLocked}
            />
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

      <TelegramConnect />

      <PaymentReceipts />
    </div>
  );
}

/**
 * Connect / disconnect the LEAP Coach Telegram bot. Flipping the toggle on opens an
 * Allow/Deny consent dialog; Allow mints a one-time link token (/api/telegram/link)
 * and opens the bot deep link, then polls /api/telegram/status until the user presses
 * Start in Telegram. Flipping off unlinks after a confirm.
 */
function TelegramConnect() {
  const [configured, setConfigured] = React.useState<boolean | null>(null);
  const [linked, setLinked] = React.useState(false);
  const [tgUsername, setTgUsername] = React.useState<string | null>(null);
  const [botUsername, setBotUsername] = React.useState<string>("LeapCoachbot");
  const [askLink, setAskLink] = React.useState(false);
  const [askUnlink, setAskUnlink] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [pending, setPending] = React.useState(false); // opened deep link, waiting for /start
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async (): Promise<boolean> => {
    try {
      const r = await fetch("/api/telegram/status");
      if (!r.ok) return false;
      const d = await r.json();
      setConfigured(!!d.configured);
      setLinked(!!d.linked);
      setTgUsername(d.telegramUsername ?? null);
      if (d.botUsername) setBotUsername(d.botUsername);
      return !!d.linked;
    } catch {
      setConfigured(false);
      return false;
    }
  }, []);

  React.useEffect(() => { void refresh(); }, [refresh]);

  // While waiting for the user to press Start in Telegram, poll until linked (~1 min).
  React.useEffect(() => {
    if (!pending) return;
    let n = 0;
    const id = setInterval(async () => {
      n += 1;
      const isLinked = await refresh();
      if (isLinked || n > 20) { setPending(false); clearInterval(id); }
    }, 3000);
    return () => clearInterval(id);
  }, [pending, refresh]);

  async function allow() {
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/telegram/link", { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d.error || "Could not start linking."); return; }
      window.open(d.deepLink, "_blank", "noopener,noreferrer");
      setAskLink(false);
      setPending(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function unlink() {
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/telegram/unlink", { method: "POST" });
      if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.error || "Could not unlink."); return; }
      setLinked(false); setTgUsername(null); setAskUnlink(false);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const disabled = configured === false; // mock mode / not signed in to a real backend

  return (
    <Card padded className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-600">
            <Send className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-heading text-lg font-bold text-heading">LEAP Coach on Telegram</h2>
            <p className="mt-0.5 text-sm text-muted">
              Link your account to chat with your personal LEAP Coach bot. Ask about your courses, marks,
              plan &amp; credits, and get notified about announcements, new topics, and mentions. It is
              read-only and never changes your account.
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={linked}
          aria-label="Link Telegram"
          disabled={disabled || busy}
          onClick={() => { setError(null); if (!linked) setAskLink(true); else setAskUnlink(true); }}
          className={cn(
            "relative mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50",
            linked ? "bg-green-600" : "bg-surface-2",
          )}
        >
          <span
            className={cn(
              "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
              linked ? "translate-x-5" : "translate-x-0.5",
            )}
          />
        </button>
      </div>

      {disabled && (
        <p className="text-xs text-faint">Telegram linking becomes available once you&apos;re signed in and the app is connected to its database.</p>
      )}
      {linked && !pending && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700">
            <Check className="h-4 w-4" /> Connected{tgUsername ? ` as @${tgUsername}` : ""}.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.open(`https://t.me/${botUsername}`, "_blank", "noopener,noreferrer")}
          >
            <Send className="h-4 w-4" /> Open chat
          </Button>
        </div>
      )}
      {pending && !linked && (
        <p className="text-sm text-muted">Opened Telegram — press <b>Start</b> in the chat to finish linking…</p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Allow / Deny consent dialog */}
      <Modal open={askLink} onClose={() => setAskLink(false)} title="Link Telegram?">
        <div className="space-y-4 px-6 py-5">
          <p className="text-sm text-muted">
            Allow LEAP Coach to link your account with Telegram so the bot can:
          </p>
          <ul className="space-y-1.5 text-sm text-heading">
            <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-green-600" /> Notify you about announcements, new topics &amp; mentions</li>
            <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-green-600" /> Answer questions about your courses, marks, plan &amp; credits</li>
            <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-green-600" /> Solve doubts from your lecture notes</li>
          </ul>
          <p className="text-xs text-faint">
            Read-only access to your own account data. You can disconnect anytime from this page.
          </p>
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => setAskLink(false)} disabled={busy}>Deny</Button>
            <Button type="button" onClick={allow} disabled={busy}>{busy ? "Opening…" : "Allow & open Telegram"}</Button>
          </div>
        </div>
      </Modal>

      {/* Disconnect confirm */}
      <Modal open={askUnlink} onClose={() => setAskUnlink(false)} title="Disconnect Telegram?">
        <div className="space-y-4 px-6 py-5">
          <p className="text-sm text-muted">
            The bot will stop sending you notifications and can no longer answer questions about your
            account. You can reconnect anytime.
          </p>
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => setAskUnlink(false)} disabled={busy}>Cancel</Button>
            <Button type="button" onClick={unlink} disabled={busy}>{busy ? "Disconnecting…" : "Disconnect"}</Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

/** The signed-in learner's payment receipts (RLS scopes them to their own rows). */
function PaymentReceipts() {
  const { payments, currentUser, getCourse } = useApp();
  const mine = payments.filter((p) => p.userId === currentUser?.id);
  const [openId, setOpenId] = React.useState<string | null>(null);

  return (
    <Card padded className="space-y-3">
      <div className="flex items-center gap-2">
        <ReceiptText className="h-5 w-5 text-gold-600" />
        <h2 className="font-heading text-lg font-bold text-heading">Payment receipts</h2>
      </div>
      {!mine.length ? (
        <p className="text-sm text-muted">Your receipts will appear here after a purchase.</p>
      ) : (
        <ul className="divide-y divide-hair">
          {mine.map((p) => {
            const title = p.courseId ? getCourse(p.courseId)?.title : undefined;
            const open = openId === p.id;
            return (
              <li key={p.id} className="py-3">
                <button
                  onClick={() => setOpenId(open ? null : p.id)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-heading">{paymentItemLabel(p, title)}</span>
                    <span className="block text-xs text-faint">
                      {new Date(p.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-heading font-semibold text-heading">{formatINR(p.amountInr)}</span>
                    <ChevronDown className={`h-4 w-4 text-faint transition-transform ${open ? "rotate-180" : ""}`} />
                  </span>
                </button>
                {open && (
                  <div className="mt-3">
                    <Receipt payment={p} courseTitle={title} />
                    <div className="mt-2 text-right">
                      <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
                        Print / Save PDF
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

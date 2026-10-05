"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Check, ChevronDown, ReceiptText, Send, Trophy, Upload } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea, Select, Field } from "@/components/ui/Field";
import { Receipt, paymentItemLabel } from "@/components/payments/Receipt";
import { PageHead, V2Card, V2_AVATAR, v2Button } from "@/components/v2/ui";
import { useApp } from "@/lib/store/AppProvider";
import { Gender, User, tierForCredits } from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";
import { isUsernameAvailable, normalizeUsername } from "@/lib/username";
import { uploadMedia } from "@/lib/supabase/storage";

const GENDERS: { v: Gender; l: string }[] = [
  { v: "male", l: "Male" },
  { v: "female", l: "Female" },
  { v: "non_binary", l: "Non-binary" },
  { v: "prefer_not", l: "Prefer not to say" },
];

// Version 2 look for the shared form fields: filled, softly rounded, no shadow.
const FIELD = "rounded-[14px] bg-surface py-[11px] shadow-none";
const CHIP = "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold leading-[18px]";
const HEADING = "font-heading text-lg font-semibold leading-[23px] tracking-[-0.01em] text-heading";

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
    void uploadMedia(file, "avatars").then((r) => set({ avatarUrl: r.url }));
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
    <div className="space-y-7">
      <PageHead
        title="Account settings"
        description="Manage your profile and personal information."
        actions={
          <Link href={`/u/${u.username ?? u.id}`} className={v2Button("outline", "sm")}>
            View public profile <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_416px] lg:items-start">
        <form onSubmit={save} className="min-w-0">
          <V2Card className="space-y-5 p-6 sm:p-7">
            <div className="flex flex-wrap items-center gap-4">
              <Avatar src={form.avatarUrl} name={form.name} size={72} ring={false} className={V2_AVATAR} />
              <div className="min-w-0 flex-1">
                <p className={HEADING}>{form.name || "Your name"}</p>
                <p className="mt-1 truncate text-[13px] font-medium text-muted">{u.email}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className={cn(CHIP, "bg-surface capitalize text-v2-body")}>{u.role}</span>
                  <span className={cn(CHIP, "bg-v2-gold-soft text-v2-gold-text")}>
                    <Trophy className="h-3.5 w-3.5" /> {tier.label} tier
                  </span>
                  <span className={cn(CHIP, "bg-surface text-v2-body")}>{u.learningCredits} credits</span>
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} className="hidden" />
              <div className="flex flex-wrap items-center gap-2">
                {form.avatarUrl && (
                  <button type="button" onClick={() => set({ avatarUrl: "" })} className={v2Button("ghost", "sm")}>
                    Remove photo
                  </button>
                )}
                <button type="button" onClick={() => fileRef.current?.click()} className={v2Button("outline", "sm")}>
                  <Upload className="h-3.5 w-3.5" /> Upload image
                </button>
              </div>
            </div>

            <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
              <Field label="Full name" required>
                <Input value={form.name} onChange={(e) => set({ name: e.target.value })} required className={FIELD} />
              </Field>
              <Field label="Email" hint="Email can't be changed here.">
                <Input value={u.email} disabled className={FIELD} />
              </Field>

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
                  className={FIELD}
                />
              </Field>
              <Field label="Headline" hint="A short tagline shown on your profile.">
                <Input
                  value={form.headline}
                  onChange={(e) => set({ headline: e.target.value })}
                  placeholder="Engineering Manager · learning to lead"
                  className={FIELD}
                />
              </Field>

              <Field label="About you" className="sm:col-span-2">
                <Textarea
                  value={form.bio}
                  onChange={(e) => set({ bio: e.target.value })}
                  className={cn(FIELD, "min-h-[88px]")}
                  placeholder="A few lines about yourself…"
                />
              </Field>

              <Field label="Company / College">
                <Input value={form.company} onChange={(e) => set({ company: e.target.value })} className={FIELD} />
              </Field>
              <Field label="Phone">
                <Input value={form.phone} onChange={(e) => set({ phone: e.target.value })} className={FIELD} />
              </Field>

              <Field label="Age">
                <Input type="number" min={1} value={form.age} onChange={(e) => set({ age: e.target.value })} className={FIELD} />
              </Field>
              <Field label="Gender">
                <Select value={form.gender} onChange={(e) => set({ gender: e.target.value as Gender | "" })} className={FIELD}>
                  <option value="">—</option>
                  {GENDERS.map((g) => (
                    <option key={g.v} value={g.v}>{g.l}</option>
                  ))}
                </Select>
              </Field>

              <Field label="Region">
                <Input value={form.region} onChange={(e) => set({ region: e.target.value })} className={FIELD} />
              </Field>
              <Field label="Nationality">
                <Input value={form.nationality} onChange={(e) => set({ nationality: e.target.value })} className={FIELD} />
              </Field>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <span role="status" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-lv-orgs-dark">
                {saved && (
                  <>
                    <Check className="h-4 w-4" /> Saved
                  </>
                )}
              </span>
              <button type="submit" disabled={!!unameError} className={v2Button("primary")}>
                Save changes
              </button>
            </div>
          </V2Card>
        </form>

        <div className="min-w-0 space-y-6">
          <TelegramConnect />
          <PaymentReceipts />
        </div>
      </div>
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
    <V2Card className="space-y-3.5 p-6">
      <div className="flex items-start gap-3.5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-lv-peers-tint text-lv-peers-dark">
          <Send className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className={HEADING}>LEAP Coach on Telegram</h2>
          <span className={cn(CHIP, "mt-1.5", linked ? "bg-lv-orgs-tint text-lv-orgs-dark" : "bg-surface text-v2-body")}>
            {linked ? (
              <>
                <Check className="h-3.5 w-3.5" strokeWidth={3} /> Linked{tgUsername ? ` as @${tgUsername}` : ""}
              </>
            ) : (
              "Not linked"
            )}
          </span>
        </div>
      </div>

      <p className="text-sm leading-5 text-v2-body">
        Get reminders and answers about your account from the LEAP Coach bot. It is read-only and never changes your account.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        {linked ? (
          <>
            <button
              type="button"
              onClick={() => window.open(`https://t.me/${botUsername}`, "_blank", "noopener,noreferrer")}
              className={v2Button("strong", "sm")}
            >
              <Send className="h-3.5 w-3.5" /> Open chat
            </button>
            <button type="button" disabled={busy} onClick={() => { setError(null); setAskUnlink(true); }} className={v2Button("ghost", "sm")}>
              Disconnect
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => { setError(null); setAskLink(true); }}
            className={v2Button("strong", "sm")}
          >
            <Send className="h-3.5 w-3.5" /> Link Telegram
          </button>
        )}
        <span className="text-[13px] font-medium text-muted">@{botUsername}</span>
      </div>

      {disabled && (
        <p className="text-xs font-medium text-muted">Telegram linking becomes available once you&apos;re signed in and the app is connected to its database.</p>
      )}
      {pending && !linked && (
        <p className="text-sm text-v2-body">Opened Telegram — press <b>Start</b> in the chat to finish linking…</p>
      )}
      {error && <p className="text-sm font-medium text-lv-people-dark">{error}</p>}

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
            <button type="button" onClick={() => setAskLink(false)} disabled={busy} className={v2Button("outline", "sm")}>Deny</button>
            <button type="button" onClick={allow} disabled={busy} className={v2Button("primary", "sm")}>{busy ? "Opening…" : "Allow & open Telegram"}</button>
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
            <button type="button" onClick={() => setAskUnlink(false)} disabled={busy} className={v2Button("outline", "sm")}>Cancel</button>
            <button type="button" onClick={unlink} disabled={busy} className={v2Button("primary", "sm")}>{busy ? "Disconnecting…" : "Disconnect"}</button>
          </div>
        </div>
      </Modal>
    </V2Card>
  );
}

/** The signed-in learner's payment receipts (RLS scopes them to their own rows). */
function PaymentReceipts() {
  const { payments, currentUser, getCourse } = useApp();
  const mine = payments.filter((p) => p.userId === currentUser?.id);
  const [openId, setOpenId] = React.useState<string | null>(null);

  return (
    <V2Card className="p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className={HEADING}>Payment receipts</h2>
        {mine.length > 0 && (
          <span className="text-[13px] font-medium text-muted">
            {mine.length} {mine.length === 1 ? "receipt" : "receipts"}
          </span>
        )}
      </div>
      {!mine.length ? (
        <p className="mt-3 text-sm text-v2-body">Your receipts will appear here after a purchase.</p>
      ) : (
        <>
          <ul className="mt-3 space-y-1">
            {mine.map((p) => {
              const title = p.courseId ? getCourse(p.courseId)?.title : undefined;
              const open = openId === p.id;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : p.id)}
                    aria-expanded={open}
                    className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3.5 rounded-[14px] p-2 text-left transition-colors duration-200 hover:bg-surface"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface text-heading">
                      <ReceiptText className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold leading-5 text-heading">{paymentItemLabel(p, title)}</span>
                      <span className="block text-xs font-medium text-muted">
                        {new Date(p.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                      </span>
                    </span>
                    <span className="font-heading text-[15px] font-bold tracking-[-0.015em] text-heading">{formatINR(p.amountInr)}</span>
                    <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted transition-transform duration-200", open && "rotate-180")} />
                  </button>
                  {open && (
                    <div className="mt-2 pb-2">
                      <Receipt payment={p} courseTitle={title} />
                      <div className="mt-2 text-right">
                        <button type="button" onClick={() => window.print()} className={v2Button("outline", "sm")}>
                          Print / Save PDF
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs font-medium text-muted">Open a receipt to print it or save it as a PDF.</p>
        </>
      )}
    </V2Card>
  );
}

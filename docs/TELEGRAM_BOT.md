# LEAP Coach — Telegram bot

A standalone Telegram chatbot (`@LeapCoachbot`) that lets each learner chat with a
personal LEAP Coach assistant: ask about their **courses, marks, plan & credits and
progress**, solve **doubts from their lecture material**, and receive **realtime
notifications** (announcements, new topics, @mentions).

It is **read-only** over learner/LMS data, and every answer is scoped to the **one
signed-in user** who linked the chat. Answers are phrased by **Gemini**; personal
facts come straight from Supabase (Gemini never makes them up).

---

## Architecture

```
Telegram  ⇄  bot/ (Node + grammY, long polling)  ──►  Supabase (service-role, READ)
                         │                                  ▲
                         ├── Gemini API (phrasing + RAG)     │ Realtime (announcements,
                         └── account snapshot + transcripts  │  courses, notifications)
Website (Next.js)  ──►  /api/telegram/{link,unlink,status}  ─┘  (writes link tokens)
```

- **No public URL needed.** The bot uses Telegram **long polling** and a Supabase
  Realtime **websocket** — both outbound — so it runs fine on `localhost`.
- **Account linking** is a one-tap deep-link handshake (details below). The website
  and the bot share state through two Supabase tables.

## Files

| Path | Purpose |
| --- | --- |
| `bot/index.ts` | Bot entry: commands (`/start`, `/me`, `/help`, `/unlink`) + free-text Q&A |
| `bot/supabase.ts` | Service-role client + read queries (account snapshot, lecture RAG, linking) |
| `bot/gemini.ts` | Gemini call + the grounding system prompt |
| `bot/notify.ts` | Supabase Realtime → push announcements / new topics / mentions |
| `bot/env.ts` | Loads `.env.local`, validates required vars |
| `app/api/telegram/link/route.ts` | Mint a one-time token + bot deep link (Clerk-authed) |
| `app/api/telegram/unlink/route.ts` | Remove the binding |
| `app/api/telegram/status/route.ts` | Is this user linked? (drives the toggle) |
| `lib/supabase/admin.ts` | Service-role client for the Next API routes |
| `supabase/database.sql` §8 | The linking tables (part of the single schema file) |

## How linking works (toggle → Allow → deep link)

1. In **Account settings** the learner flips the **Telegram** toggle on.
2. An **Allow / Deny** dialog appears. On **Allow**, the site calls
   `POST /api/telegram/link`, which mints a fresh single-use token (10-min expiry,
   bound to their Clerk user id) and returns `https://t.me/LeapCoachbot?start=<token>`.
3. Telegram opens the bot; `/start <token>` redeems it and stores the binding
   `chat_id ↔ user_id` in `telegram_links`. The token is marked used.
4. The website polls `/api/telegram/status` and flips the toggle to **Connected**.
5. **Unlink** (toggle off) deletes the binding; relinking mints a brand-new token.

The user's `@username` (used for discussion @mentions) is **locked** in Account
settings — it can't be changed once set.

---

## Setup

### 1. Environment (`.env.local`)

```ini
TELEGRAM_BOT_TOKEN=...        # from @BotFather → /newbot (or /token)
TELEGRAM_BOT_USERNAME=LeapCoachbot

# already present for the web app — reused by the bot:
GEMINI_API_KEY=...            # ONE Gemini key for the whole project (bot + in-app tutor)
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...

# optional bot-only overrides (leave unset to share the web app's key/model):
# BOT_GEMINI_API_KEY=...             # separate key/quota just for the bot
# BOT_GEMINI_MODEL=gemini-2.5-flash  # different model just for the bot
```

> ⚠️ **Never commit `.env.local`** (it's gitignored). If a token/key is ever exposed,
> rotate it: `@BotFather → /revoke` for Telegram; recreate the Gemini key in Google AI
> Studio. Update `.env.local` and restart the bot.

### 2. Database

Nothing extra to run — the two linking tables (RLS closed, service-role only) and the
Realtime publication on `announcements`, `courses`, and `notifications` are part of the
single **`supabase/database.sql`** (section 8). If you haven't run it yet, run that one
file in the Supabase SQL editor; it's idempotent.

### 3. Run the bot

```bash
npm run bot        # production-style (long polling)
npm run bot:dev    # auto-restart on file changes
```

You should see:

```
[bot] @LeapCoachbot is live (long polling). Ctrl+C to stop.
[bot] realtime notifications: live
```

The Next.js app (`npm run dev`) serves the toggle + link routes. With both running,
link from Account settings and start chatting.

---

## Security model

- **Per-user scoping.** The bot resolves the chat to exactly one `user_id` and every
  query filters by it. It never returns another learner's data.
- **Read-only on LMS data.** The bot performs no writes to courses, marks, profiles,
  etc. Its only writes are to its own `telegram_links` / `telegram_link_tokens`
  (connection state).
- **Closed tables.** `telegram_*` tables have RLS enabled with **no** anon/authenticated
  policies — only the service-role key (server + bot) can touch them.
- **Service key stays server-side.** Used only by the bot process and the Next API
  route handlers; never shipped to the browser.
- **Gemini grounding.** The system prompt restricts answers to the supplied account
  facts + the user's accessible lecture material, forbids inventing data, and refuses
  questions about other users or admin internals.
- **Paid-content guard.** Lecture RAG only pulls transcripts from topics the user owns
  (purchase / category pass) or is enrolled in.

## Deploying later (e.g. Hostinger)

Long polling works anywhere a Node process can run continuously (a **VPS** or a
Node-capable plan; shared PHP hosting can't keep a process alive). Options:

- **Keep long polling** under a process manager (`pm2 start npm --name leap-bot -- run bot`).
- **Switch to webhooks** once you have a public HTTPS URL: replace `bot.start()` in
  `bot/index.ts` with grammY's `webhookCallback` mounted on an HTTPS endpoint, then
  `setWebhook` to that URL. Everything else (queries, notifications, linking) is
  unchanged. Set `TELEGRAM_BOT_USERNAME` and the same env vars in the host.

## Limitations / notes

- New-topic notifications are deduped **in memory** per process run (the bot stays
  read-only, so it doesn't persist a "notified" flag). A restart could re-announce a
  topic once. Announcements are the canonical broadcast channel.
- Conversation memory is in-memory (last few turns per chat) and resets on restart.
- Only one polling consumer can run per bot token at a time.

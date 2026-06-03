# Supabase setup

The app uses a **dual-mode** data layer: it runs on the built-in mock data until
the Supabase env vars are present, then automatically switches to real Supabase.
Follow these steps to go live.

## 1. Create a project
Create a project at [supabase.com](https://supabase.com). Wait for it to finish provisioning.

## 2. Run the schema
Open **SQL Editor** → paste the contents of [`schema.sql`](./schema.sql) → **Run**.
This creates all tables, row-level-security policies, and the trigger that
auto-creates a `profiles` row whenever someone signs up.

## 3. Add your keys
In the project, go to **Settings → API** and copy:
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (server-only, for seeding)

Copy `.env.local.example` to `.env.local` and paste them in. Restart `npm run dev`.

## 4. Enable auth providers
**Authentication → Providers**:
- **Email** — on by default.
- **Google** / **LinkedIn (OIDC)** — enable and add each provider's client ID/secret,
  then add `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback` as the redirect URL
  in the provider's console.

Add your local URL under **Authentication → URL Configuration → Redirect URLs**:
`http://localhost:3000/**`.

## 5. Seed the demo content (optional)
With the env vars set, populate the demo topics/videos/assignments/tips/sessions:
```bash
npm run seed:db
```
(Coming with the data-layer phase — uses the service-role key.)

## 6. Make yourself an admin
Sign up once with your admin email, then in the SQL Editor run:
```sql
update public.profiles set is_admin = true, role = null where email = 'you@admin.com';
```

---

**Status:** schema + browser client + env wiring are in place. Next we wire
`AppProvider` auth and queries to Supabase (behind `isSupabaseConfigured`), so the
moment your keys land, real auth and data take over with no code changes.

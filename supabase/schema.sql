-- ════════════════════════════════════════════════════════════════
-- Leap Coach — Supabase schema (run in the SQL Editor)
-- Content/app-created tables use TEXT ids (the app generates its own
-- ids like "c_…", "sub_…"); auth-linked rows use uuid.
-- ════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ─────────────────────────── PROFILES ───────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  email text unique,
  role text check (role in ('student','professional','entrepreneur')),
  avatar_url text,
  age int,
  gender text check (gender in ('male','female','non_binary','prefer_not')),
  phone text,
  phone_verified boolean default false,
  company text,
  nationality text,
  region text,
  learning_credits int default 0,
  subscription_plan text default 'none' check (subscription_plan in ('none','all_access','per_course')),
  subscription_valid_until timestamptz,
  banned boolean default false,
  is_admin boolean default false,
  created_at timestamptz default now(),
  last_active_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ─────────────────────────── CONTENT ───────────────────────────
create table if not exists public.leadership_tracks (
  id text primary key,
  label text not null
);

create table if not exists public.courses (
  id text primary key,
  slug text unique not null,
  title text not null,
  description text,
  category text check (category in ('student','professional','entrepreneur')),
  instructor_name text,
  instructor_title text,
  instructor_bio text,
  instructor_initials text,
  hashtags text[] default '{}',
  tracks text[] default '{}',
  level text,
  rating numeric default 0,
  rating_count int default 0,
  enrolled_count int default 0,
  purchase_count int default 0,
  price int default 0,
  trending boolean default false,
  published boolean default false,
  accent int default 0,
  created_at timestamptz default now()
);

create table if not exists public.videos (
  id text primary key,
  course_id text references public.courses (id) on delete cascade,
  title text,
  order_index int,
  duration_seconds int,
  mux_playback_id text,
  transcript text,
  summary text,
  notes_pdf_url text,
  resources jsonb default '[]'
);

create table if not exists public.assignments (
  id text primary key,
  course_id text references public.courses (id) on delete cascade,
  after_video_order int,
  title text
);

create table if not exists public.questions (
  id text primary key,
  assignment_id text references public.assignments (id) on delete cascade,
  type text check (type in ('mcq','fill_blank')),
  prompt text,
  options jsonb default '[]',
  correct_answer text,
  explanation text
);

create table if not exists public.daily_tips (
  id text primary key,
  text text not null,
  author text,
  target_role text default 'all',
  active boolean default true
);

create table if not exists public.recommended_resources (
  id text primary key,
  title text,
  type text,
  author text,
  blurb text,
  target_role text default 'all',
  accent int default 0
);

create table if not exists public.live_sessions (
  id text primary key,
  title text,
  course_title text,
  instructor_name text,
  starts_at timestamptz,
  duration_mins int,
  meet_link text,
  description text,
  target_role text default 'all',
  capacity int default 100,
  created_at timestamptz default now()
);

-- ─────────────────────── PER-USER STATE ───────────────────────
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  course_id text references public.courses (id) on delete cascade,
  enrolled_at timestamptz default now(),
  completed_at timestamptz,
  unique (user_id, course_id)
);

create table if not exists public.course_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  course_id text references public.courses (id) on delete cascade,
  purchased_at timestamptz default now(),
  unique (user_id, course_id)
);

create table if not exists public.video_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  video_id text references public.videos (id) on delete cascade,
  course_id text references public.courses (id) on delete cascade,
  completed boolean default false,
  watch_seconds int default 0,
  completed_at timestamptz,
  unique (user_id, video_id)
);

create table if not exists public.submissions (
  id text primary key,
  user_id uuid references public.profiles (id) on delete cascade,
  assignment_id text references public.assignments (id) on delete cascade,
  course_id text references public.courses (id) on delete cascade,
  answers jsonb default '{}',
  score numeric default 0,
  passed boolean default false,
  feedback jsonb default '[]',
  attempt_number int default 1,
  submitted_at timestamptz default now()
);

create table if not exists public.user_notes (
  id text primary key,
  user_id uuid references public.profiles (id) on delete cascade,
  video_id text references public.videos (id) on delete cascade,
  text text,
  created_at timestamptz default now()
);

create table if not exists public.session_attendees (
  session_id text references public.live_sessions (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  primary key (session_id, user_id)
);

create table if not exists public.community_posts (
  id text primary key,
  user_id uuid references public.profiles (id) on delete cascade,
  user_name text,
  user_role text,
  text text,
  created_at timestamptz default now(),
  edited_at timestamptz
);

create table if not exists public.post_likes (
  post_id text references public.community_posts (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  primary key (post_id, user_id)
);

-- ════════════════════════════ RLS ════════════════════════════
alter table public.profiles              enable row level security;
alter table public.leadership_tracks     enable row level security;
alter table public.courses               enable row level security;
alter table public.videos                enable row level security;
alter table public.assignments           enable row level security;
alter table public.questions             enable row level security;
alter table public.daily_tips            enable row level security;
alter table public.recommended_resources enable row level security;
alter table public.live_sessions         enable row level security;
alter table public.enrollments           enable row level security;
alter table public.course_purchases      enable row level security;
alter table public.video_progress        enable row level security;
alter table public.submissions           enable row level security;
alter table public.user_notes            enable row level security;
alter table public.session_attendees     enable row level security;
alter table public.community_posts       enable row level security;
alter table public.post_likes            enable row level security;

-- Profiles: readable by all; users edit own; admins manage all.
create policy "profiles read"        on public.profiles for select using (true);
create policy "profiles update self" on public.profiles for update using (auth.uid() = id or public.is_admin());
create policy "profiles admin all"   on public.profiles for all   using (public.is_admin()) with check (public.is_admin());

-- Content: readable by everyone; writable only by admins.
do $$ declare t text; begin
  foreach t in array array['leadership_tracks','courses','videos','assignments','questions','daily_tips','recommended_resources','live_sessions'] loop
    execute format('create policy "%1$s read" on public.%1$I for select using (true);', t);
    execute format('create policy "%1$s admin write" on public.%1$I for all using (public.is_admin()) with check (public.is_admin());', t);
  end loop;
end $$;

-- Private per-user tables: owner CRUD; admins read all.
do $$ declare t text; begin
  foreach t in array array['enrollments','course_purchases','video_progress','submissions','user_notes'] loop
    execute format('create policy "%1$s owner" on public.%1$I for all using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
    execute format('create policy "%1$s admin read" on public.%1$I for select using (public.is_admin());', t);
  end loop;
end $$;

-- Likes & attendees: counts are public (everyone reads); only the owner writes their own row.
do $$ declare t text; begin
  foreach t in array array['session_attendees','post_likes'] loop
    execute format('create policy "%1$s read" on public.%1$I for select using (true);', t);
    execute format('create policy "%1$s insert" on public.%1$I for insert with check (auth.uid() = user_id);', t);
    execute format('create policy "%1$s delete" on public.%1$I for delete using (auth.uid() = user_id);', t);
  end loop;
end $$;

-- Community posts: everyone reads; author inserts; author or admin edits/deletes.
create policy "posts read"   on public.community_posts for select using (true);
create policy "posts insert" on public.community_posts for insert with check (auth.uid() = user_id);
create policy "posts update" on public.community_posts for update using (auth.uid() = user_id or public.is_admin());
create policy "posts delete" on public.community_posts for delete using (auth.uid() = user_id or public.is_admin());

-- ── After signing up, grant yourself admin:
--    update public.profiles set is_admin = true, role = null where email = 'you@admin.com';

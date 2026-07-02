-- Taxi Tracker — initial schema
-- Reconstructed from the live Supabase project (ref: omjafjppimusyafkjuhy).
-- Run in the Supabase SQL editor or via `supabase db push`.

-- ---------------------------------------------------------------------------
-- entries: one row per user per worked day
-- ---------------------------------------------------------------------------
create table if not exists public.entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  work_date  date not null,
  gross      numeric not null default 0,
  tips       numeric not null default 0,
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, work_date)         -- required by the app's upsert onConflict
);

-- ---------------------------------------------------------------------------
-- settings: one row per user, holds their cut percentage
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  cut_percent numeric not null default 30,
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row-Level Security — every query in the app omits an explicit user_id
-- filter and relies on these policies to scope rows to the signed-in user.
-- ---------------------------------------------------------------------------
alter table public.entries  enable row level security;
alter table public.settings enable row level security;

create policy "Users manage own entries"
  on public.entries
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own settings"
  on public.settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

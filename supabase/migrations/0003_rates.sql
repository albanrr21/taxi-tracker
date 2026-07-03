-- Feature 3: Rate history — a percentage change must not rewrite the past.
-- Each row is the cut percentage effective from a given date. All take-home
-- math resolves the rate in effect on each entry's work_date.

create table if not exists public.rates (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  effective_from date not null,
  percent        numeric not null,
  created_at     timestamptz not null default now(),
  unique (user_id, effective_from)
);

alter table public.rates enable row level security;

create policy "Users manage own rates"
  on public.rates
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Migrate each existing settings.cut_percent into an initial rate effective far
-- in the past, so every historical entry resolves to the rate already in use.
insert into public.rates (user_id, effective_from, percent)
select user_id, date '2000-01-01', cut_percent
from public.settings
where cut_percent is not null
on conflict (user_id, effective_from) do nothing;

-- settings.cut_percent is now superseded by rates and no longer read by the app.
-- It is kept (not dropped) so no historical value is lost.

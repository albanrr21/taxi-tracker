-- Feature 2: Paydays (settlements)
-- Cash the company hands the driver against what he has earned.

create table if not exists public.payments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  paid_date  date not null,
  amount     numeric not null default 0,
  note       text,
  created_at timestamptz not null default now()
);

create index if not exists payments_user_date_idx on public.payments (user_id, paid_date);

alter table public.payments enable row level security;

create policy "Users manage own payments"
  on public.payments
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

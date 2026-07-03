-- Feature 5: optional shift hours. Both nullable — hours are never required.
-- The €/hour insights only appear for days where both times are present.

alter table public.entries add column if not exists shift_start time;
alter table public.entries add column if not exists shift_end   time;

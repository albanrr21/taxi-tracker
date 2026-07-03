-- Feature 4: optional monthly take-home goal (null = no goal set).

alter table public.settings add column if not exists monthly_goal numeric;

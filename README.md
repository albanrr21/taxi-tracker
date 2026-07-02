# Taxi Meter — Earnings Tracker

A mobile-first web app for taxi drivers to log daily **gross fares** and **tips** and
see their real take-home pay: a configurable percentage cut of gross fares plus 100%
of tips. Styled like a taxi meter — amber on asphalt, monospace numerals.

## Tech stack

- **Next.js 15** (App Router) + **React 19**
- **Supabase** — email/password auth and Postgres storage
- **Recharts** — daily take-home bar chart
- Plain JavaScript, inline styles, CSS variables (no UI framework)

## How it works

- **Auth** — email/password via Supabase (`AuthScreen`).
- **Calendar** — tap any day of the month to enter that day's gross and tips.
- **Meter** — shows month-to-date take-home = `gross × cut% + tips`.
- **Insights** — average take-home/day, best day, tips share, and a projected
  month total (average/day × days in month) for the current month.
- **Settings** — set your cut percentage (default 30%), stored per user.

## Data model

Two tables in the `public` schema, both owned per user and protected by
Row-Level Security (`auth.uid() = user_id`). See
[`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).

| Table      | Key                     | Columns |
|------------|-------------------------|---------|
| `entries`  | `unique (user_id, work_date)` | `gross`, `tips`, `note` |
| `settings` | `user_id` (PK)          | `cut_percent` |

## Getting started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment** — create `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-or-publishable-key>
   ```

3. **Apply the database schema** — run
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
   in the Supabase SQL editor (or `supabase db push`).

4. **Run the dev server**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000.

## Scripts

| Command         | Description               |
|-----------------|---------------------------|
| `npm run dev`   | Start the dev server      |
| `npm run build` | Production build          |
| `npm run start` | Serve the production build |

## Project structure

```
app/
  layout.js      Root layout, fonts, metadata
  page.js        Entire app: Page → AuthScreen / Tracker
  globals.css    Theme (CSS variables) and resets
lib/
  supabase.js    Supabase client
supabase/
  migrations/    Database schema
```

## Security notes

- All data access relies on Supabase **Row-Level Security**; the client
  intentionally omits `user_id` filters in its queries, so the policies in the
  migration are load-bearing — don't disable them.
- Consider enabling **leaked-password protection** in Supabase Auth
  (Authentication → Policies) for extra sign-up hardening.

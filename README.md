# Taxi Meter — Earnings Tracker

A mobile-first web app for taxi drivers who work informally for a company: no
contract, no payslip, paid a **percentage of gross fares plus 100% of tips**, all
in cash, all in euros. The company covers the car and all expenses, so there is
**no expense tracking** — the app is the driver's private notebook, his only
record of what he earned and what he was paid.

Built for a tired driver at midnight in a parked car: big touch targets, number
pads, one-handed use, and a distinctive taxi-meter look (amber on asphalt,
monospace numerals). Default language **Albanian** (Serbian and English also
available).

## Tech stack

- **Next.js 15** (App Router) + **React 19**
- **Supabase** — email/password auth and Postgres storage (Row-Level Security)
- **Recharts** — daily take-home chart
- Canvas API — shareable month statement image (no image-export dependency)
- Plain JavaScript, inline styles, CSS variables; own lightweight i18n

## Features

1. **Fast home** — month meter (take-home so far), running balance, big
   **End shift** (full-screen: gross → tips → save, editable date for logging
   yesterday) and **+ Tip** (one tap, instant save). Calendar below for review/edit.
2. **Paydays** — log the cash the company hands over; running balance
   ("Company owes you €X" / "Settled" / "€X ahead") and a day-by-day
   reconciliation table to show the boss.
3. **Rate history** — change your percentage effective from a chosen date; past
   days keep the rate that applied then (take-home resolves the rate per work_date).
4. **Monthly goal + honest pace** — optional goal with progress and "€X/day for
   the remaining N days"; projection based on actual pace (to-date ÷ days elapsed
   × days in month).
5. **Optional shift hours** — Start shift stamps the start, End shift the end;
   where hours exist, insights show €/hour and the best weekday. Never nags.
6. **Weekly recap + share** — plain-language weekly summary and a downloadable /
   shareable month statement card (PNG).
7. **i18n + trust + PWA** — Albanian/Serbian/English, privacy line, forgot-password
   flow, and installable as a PWA. Fully private: no data is shared with anyone.
8. **Native-feel install on iPhone & Android** — safe-area handling (Dynamic
   Island, home indicator, gesture nav), iOS startup images, maskable Android
   icon, launcher shortcuts (End shift / + Tip via `/?action=…`), a minimal
   service worker with a branded offline page, and keyboard-safe layouts
   (16px inputs, action buttons never hidden behind the iOS decimal pad).

## Architecture

```
app/
  layout.js        Root layout, fonts, PWA metadata
  page.js          Thin entry — renders <App/>
  globals.css      Theme (CSS variables) and resets
components/
  App.js           Session + providers + tab routing + toast
  AuthScreen.js    Login / signup / reset
  UpdatePassword.js  Set new password after recovery link
  Home.js          Meter, balance, End shift / + Tip, calendar, chart, insights
  EndShiftFlow.js  Full-screen gross → tips
  QuickTip.js      One-tap tip
  DayEditor.js     Edit a past day
  Paydays.js       Payments CRUD + balance + reconciliation
  PaymentEditor.js Add / edit / delete a payment
  Settings.js      Language, rate history, monthly goal, logout
  BottomNav.js     Home / Paydays / Settings
  ui.js            Shared styles + primitives (Sheet, Toast, Card, …)
lib/
  supabase.js      Supabase client
  store.js         Single data store (entries/rates/payments/settings) with
                   optimistic updates + rollback
  money.js         Money/date helpers, per-work_date rate resolution, balance
  i18n.js          sq/sr/en dictionary + provider + t()
  shareCard.js     Canvas month-statement renderer
supabase/
  migrations/      Numbered schema migrations
public/
  manifest.json      PWA manifest (id, lang sq, shortcuts, maskable icons)
  sw.js              Minimal service worker (offline page + static cache;
                     no write-queueing or push by design)
  offline.html       Branded offline fallback
  icon-*.png         any + maskable + apple-touch (all generated)
  splash/            10 iOS startup images (device-matched via media queries)
```

## Data model

All tables are per-user and protected by Row-Level Security (`auth.uid() = user_id`).
The client intentionally omits `user_id` filters on reads — the policies are the
only access control, so do not disable them.

| Table      | Key                       | Columns |
|------------|---------------------------|---------|
| `entries`  | unique `(user_id, work_date)` | `gross`, `tips`, `note`, `shift_start`, `shift_end` |
| `payments` | `id`                      | `paid_date`, `amount`, `note` |
| `rates`    | unique `(user_id, effective_from)` | `percent` |
| `settings` | `user_id`                 | `monthly_goal` (legacy `cut_percent`, superseded by `rates`) |

Migrations (apply in order via the Supabase SQL editor or `supabase db push`):

- `0001_init.sql` — entries, settings
- `0002_payments.sql` — payments
- `0003_rates.sql` — rates (+ migrate existing `cut_percent`)
- `0004_goal.sql` — `settings.monthly_goal`
- `0005_shift_hours.sql` — `entries.shift_start` / `shift_end`

## Getting started

1. `npm install`
2. Create `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-or-publishable-key>
   ```
3. Apply the migrations in `supabase/migrations/` (in numeric order).
4. `npm run dev` → http://localhost:3000

## Scripts

| Command         | Description                |
|-----------------|----------------------------|
| `npm run dev`   | Start the dev server       |
| `npm run build` | Production build           |
| `npm run start` | Serve the production build |

## Money & rate rules

- Money is rounded to 2 decimals and shown with tabular figures.
- **Tips** are 100% the driver's and excluded from the company balance (paid in
  cash instantly). The balance is *cuts owed − cash received*.
- **Take-home** for a day = `gross × rate(work_date)% + tips`, where the rate is
  the one in effect on that date — changing your percentage never rewrites the past.

## Security notes

- Access control is entirely Supabase **Row-Level Security** — keep the policies
  in the migrations enabled.
- Consider enabling **leaked-password protection** in Supabase Auth for extra
  sign-up hardening.

## Out of scope (by design)

Expense tracking, company/fleet dashboards, GPS or ride-level tracking, OTP auth,
push notifications, offline write-queueing, payments processing, and anything that
shares driver data with anyone.

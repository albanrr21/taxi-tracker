// Shared money + date helpers. All money is rounded to 2 decimals.

export const pad = (n) => String(n).padStart(2, "0");
export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// Format a euro amount. dp = decimal places (default 2). Pair with
// fontVariantNumeric: "tabular-nums" in the meter styles.
export const eur = (n, dp = 2) => `€${round2(n).toFixed(dp)}`;

// Date key helpers — work_date is stored as 'YYYY-MM-DD'.
export const keyFor = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
export const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
// Monday-first weekday index (0 = Monday … 6 = Sunday) of the 1st of the month.
export const firstWeekdayMon = (y, m) => (new Date(y, m, 1).getDay() + 6) % 7;

export const todayISO = () => {
  const d = new Date();
  return keyFor(d.getFullYear(), d.getMonth(), d.getDate());
};

// Current wall-clock time as 'HH:MM' (for stamping shift start/end).
export const nowHM = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Worked hours for an entry, or null if either time is missing. Handles a
// shift that crosses midnight (end earlier than start).
export function shiftHours(e) {
  if (!e || !e.shift_start || !e.shift_end) return null;
  const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  let d = toMin(e.shift_end) - toMin(e.shift_start);
  if (d <= 0) d += 24 * 60;
  return round2(d / 60);
}

// Parse 'YYYY-MM-DD' into {y, m (0-based), d} without timezone surprises.
export const parseISO = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m: m - 1, d };
};

// Day-of-week for an ISO date, Monday-first (0 = Monday … 6 = Sunday).
export const dowMon = (iso) => {
  const { y, m, d } = parseISO(iso);
  return (new Date(y, m, d).getDay() + 6) % 7;
};

/* ---------- Rate resolution (never rewrite the past) ----------
   rates: array of { effective_from: 'YYYY-MM-DD', percent: number }.
   The percent that applies to a given work_date is the one from the
   latest rate whose effective_from is on or before that date. If the
   date predates every rate, fall back to the earliest rate so old
   entries still resolve. */
export function resolveRate(rates, iso) {
  if (!rates || rates.length === 0) return 0;
  const sorted = [...rates].sort((a, b) =>
    a.effective_from < b.effective_from ? 1 : -1
  ); // newest first
  for (const r of sorted) {
    if (r.effective_from <= iso) return Number(r.percent);
  }
  return Number(sorted[sorted.length - 1].percent); // earliest
}

// Cut (company-share) for one entry, using the rate in effect on its date.
export function entryCut(entry, rates) {
  return round2(Number(entry.gross) * (resolveRate(rates, entry.work_date) / 100));
}

// Take-home = cut + tips (tips are 100% the driver's, paid in cash).
export function entryTakeHome(entry, rates) {
  return round2(entryCut(entry, rates) + Number(entry.tips || 0));
}

/* ---------- Settlement balance ----------
   What the company owes = the sum of daily cuts the driver has earned
   (tips are excluded — they are paid instantly in cash) minus the cash
   the company has already handed over. Positive = company owes the
   driver; negative = the driver has been paid in advance. */
export function earnedToDate(entriesMap, rates) {
  return round2(Object.values(entriesMap).reduce((s, e) => s + entryCut(e, rates), 0));
}
export function totalPaid(payments) {
  return round2(payments.reduce((s, p) => s + Number(p.amount || 0), 0));
}
export function settlementBalance(entriesMap, rates, payments) {
  return round2(earnedToDate(entriesMap, rates) - totalPaid(payments));
}

// Classify a balance for display: settled (~0), owed (company owes driver),
// or advanced (driver paid ahead). amount is always non-negative.
export function balanceState(bal) {
  if (Math.abs(bal) < 0.01) return { kind: "settled", amount: 0 };
  return bal > 0 ? { kind: "owed", amount: bal } : { kind: "advanced", amount: -bal };
}

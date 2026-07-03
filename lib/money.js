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

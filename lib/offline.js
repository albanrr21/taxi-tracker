"use client";

/* Offline mirror + write queue.
   While offline the phone is the source of truth: reads come from a
   localStorage mirror of the driver's data, and writes that failed on a dead
   connection are queued here and replayed when it returns. Every op is an
   idempotent upsert/delete keyed by a natural id (a day, a payment, a rate),
   so a replay can never double-count a shift or a payment.

   This module is pure bookkeeping — it never talks to Supabase itself. The
   store passes its own executor to flushQueue(). */

const mirrorKey = (userId) => `tm_mirror_${userId}`;
const queueKey = (userId) => `tm_queue_${userId}`;

const read = (k) => {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : null;
  } catch { return null; }
};
const write = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
};

/* ---------- mirror ---------- */
export const loadMirror = (userId) => read(mirrorKey(userId));
export const saveMirror = (userId, data) => write(mirrorKey(userId), data);

/* ---------- queue ---------- */
export const loadQueue = (userId) => read(queueKey(userId)) || [];
export const saveQueue = (userId, q) => write(queueKey(userId), q);
export const queueCount = (userId) => loadQueue(userId).length;

// Client-side ids make queued inserts replay-safe (upsert instead of insert).
export const genId = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

// The write failed because the network is gone — as opposed to the server
// rejecting it. Only network failures are queued; rejections roll back.
export function isNetworkError(error) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  return /failed to fetch|load failed|networkerror|network request failed|fetch failed|timed? ?out/i
    .test(error?.message || "");
}

// Server said no, but only transiently (e.g. the auth token expired while
// offline and hasn't refreshed yet) — keep the op for the next flush.
export const isRetryableError = (error) =>
  error?.code === "PGRST301" || /jwt|token|401|503/i.test(error?.message || "");

// One op per logical key; a later op for the same key replaces the earlier
// one (last write wins locally, matching the upsert semantics remotely).
const opKey = (op) => {
  switch (op.type) {
    case "entry_upsert":
    case "entry_delete": return `entry:${op.payload.work_date}`;
    case "payment_upsert":
    case "payment_delete": return `payment:${op.payload.id}`;
    case "rate_upsert": return `rate:${op.payload.effective_from}`;
    case "rate_delete": return `rate_del:${op.payload.id}`;
    case "settings_upsert": return "settings";
    default: return op.type;
  }
};

export function enqueueOp(userId, op) {
  let q = loadQueue(userId);

  // Settings patches merge rather than replace, so two different fields
  // changed offline both survive.
  if (op.type === "settings_upsert") {
    const existing = q.find((x) => opKey(x) === opKey(op));
    if (existing) op = { ...op, payload: { ...existing.payload, ...op.payload } };
  }

  // Deleting a row that only exists in the queue (created offline, never
  // synced): drop its pending upsert and skip the delete — the server has
  // never seen it. Must run BEFORE the same-key filter below, because a
  // payment's upsert and delete share a key. Rows that DO exist remotely
  // (no fresh flag) still get their delete queued.
  if (op.type === "payment_delete" || op.type === "rate_delete") {
    const pendingInsert = q.find(
      (x) => (x.type === "payment_upsert" || x.type === "rate_upsert")
        && x.payload.id === op.payload.id
    );
    if (pendingInsert) {
      q = q.filter((x) => x !== pendingInsert);
      if (pendingInsert.fresh) {
        saveQueue(userId, q.filter((x) => opKey(x) !== opKey(op)));
        return;
      }
    }
  }

  q = q.filter((x) => opKey(x) !== opKey(op));
  q.push({ ...op, ts: Date.now() });
  saveQueue(userId, q);
}

/* Replay the queue in order through the store's executor.
   - success        → drop the op, keep going
   - network/retryable error → stop, keep this op and everything after it
   - permanent rejection     → drop the op (keeping it would jam the queue
     forever) and continue; the caller reloads server truth afterwards. */
export async function flushQueue(userId, execOp) {
  const q = loadQueue(userId);
  const remaining = [];
  let flushed = 0;
  for (let i = 0; i < q.length; i++) {
    let error = null;
    try {
      ({ error } = await execOp(q[i]));
    } catch (e) {
      error = e;
    }
    if (!error) { flushed++; continue; }
    if (isNetworkError(error) || isRetryableError(error)) {
      remaining.push(...q.slice(i));
      break;
    }
    // permanent rejection: drop and continue
  }
  saveQueue(userId, remaining);
  return { flushed, remaining: remaining.length };
}

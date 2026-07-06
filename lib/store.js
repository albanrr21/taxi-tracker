"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  loadMirror, saveMirror, queueCount, genId,
  enqueueOp, flushQueue, isNetworkError,
} from "@/lib/offline";

// Execute one queued/live op against Supabase. Shared by direct writes and
// queue replay so both paths have identical, idempotent semantics.
async function execOp(op) {
  const p = op.payload;
  switch (op.type) {
    case "entry_upsert":
      return supabase.from("entries").upsert(p, { onConflict: "user_id,work_date" });
    case "entry_delete":
      return supabase.from("entries").delete().eq("user_id", p.user_id).eq("work_date", p.work_date);
    case "payment_upsert":
      return supabase.from("payments").upsert(p);
    case "payment_delete":
      return supabase.from("payments").delete().eq("id", p.id);
    case "rate_upsert":
      return supabase.from("rates").upsert(p, { onConflict: "user_id,effective_from" });
    case "rate_delete":
      return supabase.from("rates").delete().eq("id", p.id);
    case "settings_upsert":
      return supabase.from("settings").upsert(p);
    default:
      return { error: null };
  }
}

// Central data store for the signed-in driver — offline-first:
// - reads hydrate instantly from a localStorage mirror, then refresh from
//   Supabase when the network answers
// - writes are optimistic; a write that fails because the connection is gone
//   is queued (lib/offline.js) and replayed automatically on reconnect
// - a write the server actually rejects still rolls back as before
// Reads never filter by user_id — RLS scopes rows to the user.
export function useStore(userId, callbacks = {}) {
  const cbs = useRef(callbacks);
  cbs.current = callbacks;

  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState({});
  const [rates, setRates] = useState([]);
  const [payments, setPayments] = useState([]);
  const [settings, setSettings] = useState({});
  const [pending, setPending] = useState(0);
  const [offline, setOffline] = useState(false);
  const hydrated = useRef(false);
  const flushing = useRef(false);

  // Persist the mirror on every data change (after first hydration), so the
  // last-known state — including offline edits — survives an app restart.
  useEffect(() => {
    if (hydrated.current) saveMirror(userId, { entries, rates, payments, settings });
  }, [userId, entries, rates, payments, settings]);

  const fetchAll = useCallback(async () => {
    const [e, r, p, s] = await Promise.all([
      supabase.from("entries").select("work_date, gross, tips, shift_start, shift_end"),
      supabase.from("rates").select("id, effective_from, percent"),
      supabase.from("payments").select("id, paid_date, amount, note").order("paid_date", { ascending: false }),
      supabase.from("settings").select("*").eq("user_id", userId).maybeSingle(),
    ]);
    setOffline([e, r, p, s].some((x) => x.error && isNetworkError(x.error)));
    if (!e.error && e.data) {
      const map = {};
      for (const row of e.data) {
        map[row.work_date] = {
          work_date: row.work_date,
          gross: Number(row.gross),
          tips: Number(row.tips),
          shift_start: row.shift_start || null,
          shift_end: row.shift_end || null,
        };
      }
      setEntries(map);
    }
    if (!r.error && r.data) setRates(r.data.map((x) => ({ ...x, percent: Number(x.percent) })));
    if (!p.error && p.data) setPayments(p.data.map((x) => ({ ...x, amount: Number(x.amount) })));
    if (!s.error && s.data) setSettings(s.data);
    hydrated.current = true;
    setLoading(false);
  }, [userId]);

  const flush = useCallback(async () => {
    if (flushing.current || queueCount(userId) === 0) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    flushing.current = true;
    const { flushed, remaining } = await flushQueue(userId, execOp);
    flushing.current = false;
    setPending(remaining);
    if (remaining === 0 && flushed > 0) {
      setOffline(false);
      cbs.current.onSynced?.();
      await fetchAll(); // reconcile with server truth after replay
    }
  }, [userId, fetchAll]);

  // Startup: mirror first (instant/offline UI), flush any leftover queue
  // BEFORE fetching, so server truth never overwrites unsynced local edits.
  useEffect(() => {
    const mirror = loadMirror(userId);
    if (mirror) {
      setEntries(mirror.entries || {});
      setRates(mirror.rates || []);
      setPayments(mirror.payments || []);
      setSettings(mirror.settings || {});
      hydrated.current = true;
      setLoading(false);
    }
    setPending(queueCount(userId));
    (async () => { await flush(); await fetchAll(); })();
  }, [userId, flush, fetchAll]);

  // Replay the queue the moment the connection returns or the app comes back
  // to the foreground (a parked-car dead zone ending, the phone unlocking).
  useEffect(() => {
    const onOnline = () => flush();
    const onVisible = () => { if (document.visibilityState === "visible") flush(); };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [flush]);

  // Optimistic write: local state is already updated; try the server, queue
  // on network failure (keeping the optimistic state), roll back on rejection.
  const attempt = async (op, rollback) => {
    const { error } = await execOp(op);
    if (!error) return { error: null };
    if (isNetworkError(error)) {
      enqueueOp(userId, op);
      setPending(queueCount(userId));
      setOffline(true);
      cbs.current.onQueued?.();
      return { error: null, queued: true };
    }
    rollback();
    return { error };
  };

  /* ---------- entries ---------- */
  const upsertEntry = async (work_date, patch) => {
    const prev = entries;
    const existing = entries[work_date] || { gross: 0, tips: 0 };
    const next = { ...existing, ...patch, work_date };
    setEntries({ ...entries, [work_date]: next });
    return attempt(
      {
        type: "entry_upsert",
        payload: {
          user_id: userId, work_date, gross: next.gross, tips: next.tips,
          shift_start: next.shift_start ?? null, shift_end: next.shift_end ?? null,
        },
      },
      () => setEntries(prev)
    );
  };

  const deleteEntry = async (work_date) => {
    const prev = entries;
    const next = { ...entries }; delete next[work_date];
    setEntries(next);
    return attempt(
      { type: "entry_delete", payload: { user_id: userId, work_date } },
      () => setEntries(prev)
    );
  };

  /* ---------- payments (client-generated ids → replay-safe upserts) ---------- */
  const sortPays = (list) => [...list].sort((a, b) => (a.paid_date < b.paid_date ? 1 : -1));

  const addPayment = async (p) => {
    const prev = payments;
    const row = { id: genId(), user_id: userId, paid_date: p.paid_date, amount: p.amount, note: p.note ?? null };
    setPayments((list) => sortPays([{ id: row.id, paid_date: row.paid_date, amount: Number(row.amount), note: row.note }, ...list]));
    return attempt({ type: "payment_upsert", payload: row, fresh: true }, () => setPayments(prev));
  };

  const updatePayment = async (id, patch) => {
    const prev = payments;
    const merged = { ...payments.find((x) => x.id === id), ...patch };
    setPayments((list) => sortPays(list.map((x) => (x.id === id ? { ...x, ...patch } : x))));
    return attempt(
      {
        type: "payment_upsert",
        payload: { id, user_id: userId, paid_date: merged.paid_date, amount: merged.amount, note: merged.note ?? null },
      },
      () => setPayments(prev)
    );
  };

  const deletePayment = async (id) => {
    const prev = payments;
    setPayments((list) => list.filter((x) => x.id !== id));
    return attempt({ type: "payment_delete", payload: { id } }, () => setPayments(prev));
  };

  /* ---------- rates ---------- */
  const addRate = async (effective_from, percent) => {
    const prev = rates;
    const row = { id: genId(), user_id: userId, effective_from, percent };
    setRates((list) => [
      ...list.filter((x) => x.effective_from !== effective_from),
      { id: row.id, effective_from, percent: Number(percent) },
    ]);
    return attempt({ type: "rate_upsert", payload: row, fresh: true }, () => setRates(prev));
  };

  const deleteRate = async (id) => {
    const prev = rates;
    setRates((list) => list.filter((r) => r.id !== id));
    return attempt({ type: "rate_delete", payload: { id } }, () => setRates(prev));
  };

  /* ---------- settings ---------- */
  const saveSettings = async (patch) => {
    const prev = settings;
    setSettings((s) => ({ ...s, ...patch }));
    return attempt(
      { type: "settings_upsert", payload: { user_id: userId, ...patch } },
      () => setSettings(prev)
    );
  };

  return {
    loading, entries, rates, payments, settings, pending, offline,
    upsertEntry, deleteEntry,
    addPayment, updatePayment, deletePayment,
    addRate, deleteRate, saveSettings,
    reload: fetchAll, flush,
  };
}

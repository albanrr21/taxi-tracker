"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Central data store for the signed-in driver. Loads everything once (entries,
// rates, payments, settings) and exposes optimistic mutations that roll back on
// error. Reads never filter by user_id — Supabase RLS scopes rows to the user.
export function useStore(userId) {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState({}); // 'YYYY-MM-DD' -> { work_date, gross, tips, shift_start, shift_end }
  const [rates, setRates] = useState([]);     // [{ id, effective_from, percent }]
  const [payments, setPayments] = useState([]); // [{ id, paid_date, amount, note }]
  const [settings, setSettings] = useState({}); // { monthly_goal }

  const reload = useCallback(async () => {
    setLoading(true);
    const [e, r, p, s] = await Promise.all([
      supabase.from("entries").select("work_date, gross, tips, shift_start, shift_end"),
      supabase.from("rates").select("id, effective_from, percent"),
      supabase.from("payments").select("id, paid_date, amount, note").order("paid_date", { ascending: false }),
      supabase.from("settings").select("*").eq("user_id", userId).maybeSingle(),
    ]);
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
    setLoading(false);
  }, [userId]);

  useEffect(() => { reload(); }, [reload]);

  /* ---------- entries ---------- */
  const upsertEntry = async (work_date, patch) => {
    const prev = entries;
    const existing = entries[work_date] || { gross: 0, tips: 0 };
    const next = { ...existing, ...patch, work_date };
    setEntries({ ...entries, [work_date]: next });
    const { error } = await supabase.from("entries").upsert(
      { user_id: userId, work_date, gross: next.gross, tips: next.tips,
        shift_start: next.shift_start ?? null, shift_end: next.shift_end ?? null },
      { onConflict: "user_id,work_date" }
    );
    if (error) setEntries(prev);
    return { error };
  };

  const deleteEntry = async (work_date) => {
    const prev = entries;
    const next = { ...entries }; delete next[work_date];
    setEntries(next);
    const { error } = await supabase.from("entries").delete().eq("user_id", userId).eq("work_date", work_date);
    if (error) setEntries(prev);
    return { error };
  };

  /* ---------- payments ---------- */
  const addPayment = async (p) => {
    const { data, error } = await supabase.from("payments")
      .insert({ user_id: userId, ...p }).select().single();
    if (!error && data)
      setPayments((list) => [{ ...data, amount: Number(data.amount) }, ...list]
        .sort((a, b) => (a.paid_date < b.paid_date ? 1 : -1)));
    return { error };
  };

  const updatePayment = async (id, patch) => {
    const prev = payments;
    setPayments((list) => list.map((x) => (x.id === id ? { ...x, ...patch } : x))
      .sort((a, b) => (a.paid_date < b.paid_date ? 1 : -1)));
    const { error } = await supabase.from("payments").update(patch).eq("id", id);
    if (error) setPayments(prev);
    return { error };
  };

  const deletePayment = async (id) => {
    const prev = payments;
    setPayments((list) => list.filter((x) => x.id !== id));
    const { error } = await supabase.from("payments").delete().eq("id", id);
    if (error) setPayments(prev);
    return { error };
  };

  /* ---------- rates ---------- */
  const addRate = async (effective_from, percent) => {
    const { data, error } = await supabase.from("rates")
      .upsert({ user_id: userId, effective_from, percent }, { onConflict: "user_id,effective_from" })
      .select().single();
    if (!error && data)
      setRates((list) => {
        const others = list.filter((x) => x.effective_from !== effective_from);
        return [...others, { ...data, percent: Number(data.percent) }];
      });
    return { error };
  };

  /* ---------- settings ---------- */
  const saveSettings = async (patch) => {
    const prev = settings;
    setSettings((s) => ({ ...s, ...patch }));
    const { error } = await supabase.from("settings").upsert({ user_id: userId, ...patch });
    if (error) setSettings(prev);
    return { error };
  };

  return {
    loading, entries, rates, payments, settings,
    upsertEntry, deleteEntry,
    addPayment, updatePayment, deletePayment,
    addRate, saveSettings, reload,
  };
}

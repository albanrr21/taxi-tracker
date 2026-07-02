"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  BarChart, Bar, ResponsiveContainer, Tooltip, XAxis,
} from "recharts";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW = ["M","T","W","T","F","S","S"];

const pad = (n) => String(n).padStart(2, "0");
const round2 = (n) => Math.round(n * 100) / 100;
const keyFor = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const firstWeekdayMon = (y, m) => (new Date(y, m, 1).getDay() + 6) % 7;

/* ---------- Auth screen ---------- */
function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr(""); setInfo(""); setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onAuthed();
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) onAuthed();
        else setInfo("Check your email to confirm your account, then log in.");
      }
    } catch (e) {
      setErr(e.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.2em", color: "var(--amber-dim)" }}>TAXI METER</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 28, fontWeight: 700, color: "var(--amber)", textShadow: "0 0 18px rgba(255,182,39,0.3)", marginTop: 6 }}>
            €0.00
          </div>
          <div style={{ fontSize: 13, color: "var(--cream-dim)", marginTop: 4 }}>Log in to start the meter</div>
        </div>

        <div style={{ background: "var(--asphalt-2)", border: "1px solid var(--line)", borderRadius: 14, padding: 20 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
            {["login", "signup"].map((m) => (
              <button key={m} onClick={() => { setMode(m); setErr(""); setInfo(""); }}
                style={{
                  flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 13, fontWeight: 700,
                  border: "1px solid var(--line)",
                  background: mode === m ? "var(--amber)" : "transparent",
                  color: mode === m ? "var(--asphalt)" : "var(--cream-dim)",
                }}>
                {m === "login" ? "Log in" : "Sign up"}
              </button>
            ))}
          </div>

          <label style={lbl}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={inp} />

          <label style={{ ...lbl, marginTop: 12 }}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters" style={inp}
            onKeyDown={(e) => e.key === "Enter" && submit()} />

          {err && <div style={{ marginTop: 12, fontSize: 12, color: "var(--rust)" }}>{err}</div>}
          {info && <div style={{ marginTop: 12, fontSize: 12, color: "var(--amber)" }}>{info}</div>}

          <button onClick={submit} disabled={busy}
            style={{ width: "100%", marginTop: 18, padding: "13px 0", borderRadius: 8, border: "none", background: "var(--amber)", color: "var(--asphalt)", fontWeight: 800, fontSize: 14, opacity: busy ? 0.6 : 1 }}>
            {busy ? "…" : mode === "login" ? "Start the meter" : "Create account"}
          </button>
        </div>
      </div>
    </div>
  );
}

const lbl = { display: "block", fontSize: 12, color: "var(--cream-dim)", marginBottom: 5 };
const inp = {
  width: "100%", background: "var(--asphalt)", border: "1px solid var(--line)", borderRadius: 8,
  padding: "11px 12px", color: "var(--cream)", fontSize: 15, outline: "none",
};

/* ---------- Tracker ---------- */
function Tracker({ session }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [entries, setEntries] = useState({}); // { 'YYYY-MM-DD': {gross, tips} }
  const [percent, setPercent] = useState(30);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(null);
  const [grossVal, setGrossVal] = useState("");
  const [tipsVal, setTipsVal] = useState("");
  const [quickTip, setQuickTip] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState("");

  const userId = session.user.id;

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const loadMonth = useCallback(async (y, m) => {
    setLoading(true);
    const start = `${y}-${pad(m + 1)}-01`;
    const end = `${y}-${pad(m + 1)}-${pad(daysInMonth(y, m))}`;
    const { data, error } = await supabase
      .from("entries")
      .select("work_date, gross, tips")
      .gte("work_date", start)
      .lte("work_date", end);
    if (error) { showToast("Couldn't load entries."); setLoading(false); return; }
    const map = {};
    for (const row of data) map[row.work_date] = { gross: Number(row.gross), tips: Number(row.tips) };
    setEntries(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("settings").select("cut_percent").eq("user_id", userId).maybeSingle();
      if (data) setPercent(Number(data.cut_percent));
    })();
  }, [userId]);

  useEffect(() => { loadMonth(viewYear, viewMonth); }, [viewYear, viewMonth, loadMonth]);

  const dim = daysInMonth(viewYear, viewMonth);
  const leadBlanks = firstWeekdayMon(viewYear, viewMonth);
  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  const monthList = useMemo(() =>
    Object.entries(entries)
      .map(([k, v]) => ({ day: Number(k.slice(8)), ...v }))
      .sort((a, b) => a.day - b.day),
  [entries]);

  const grossTotal = monthList.reduce((s, e) => s + e.gross, 0);
  const tipsTotal = monthList.reduce((s, e) => s + e.tips, 0);
  const cutTotal = grossTotal * (percent / 100);
  const takeHome = cutTotal + tipsTotal;
  const daysWorked = monthList.length;
  const avgTakeHome = daysWorked ? takeHome / daysWorked : 0;
  const bestDay = monthList.reduce((b, e) => {
    const t = e.gross * (percent / 100) + e.tips;
    return t > (b?.total ?? -1) ? { day: e.day, total: t } : b;
  }, null);
  const projectedTakeHome = isCurrentMonth && daysWorked ? avgTakeHome * dim : takeHome;

  const chartData = useMemo(() => {
    const arr = [];
    for (let d = 1; d <= dim; d++) {
      const e = entries[keyFor(viewYear, viewMonth, d)];
      arr.push({ day: d, cut: e ? e.gross * (percent / 100) : 0, tips: e ? e.tips : 0 });
    }
    return arr;
  }, [entries, viewYear, viewMonth, dim, percent]);

  function changeMonth(delta) {
    let m = viewMonth + delta, y = viewYear;
    if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
    setViewMonth(m); setViewYear(y); setActiveDay(null);
  }

  function openDay(d) {
    const e = entries[keyFor(viewYear, viewMonth, d)];
    setActiveDay(d);
    setGrossVal(e ? String(e.gross) : "");
    setTipsVal(e && e.tips ? String(e.tips) : "");
    setQuickTip("");
  }

  // Add a single tip to the running total for the active day and save it
  // immediately, so a tip received mid-shift is never lost.
  async function addTip() {
    const amt = parseFloat(quickTip);
    if (!amt) return;
    const k = keyFor(viewYear, viewMonth, activeDay);
    const gross = parseFloat(grossVal) || 0;
    const newTips = round2((parseFloat(tipsVal) || 0) + amt);
    const prevEntries = entries;
    const prevTipsVal = tipsVal;
    setTipsVal(String(newTips));
    setQuickTip("");
    setEntries({ ...entries, [k]: { gross, tips: newTips } });
    const { error } = await supabase.from("entries").upsert(
      { user_id: userId, work_date: k, gross, tips: newTips },
      { onConflict: "user_id,work_date" }
    );
    if (error) {
      setEntries(prevEntries);
      setTipsVal(prevTipsVal);
      showToast("Couldn't add tip — try again.");
    } else {
      showToast(`+€${amt.toFixed(2)} tip added`);
    }
  }

  async function saveDay() {
    const k = keyFor(viewYear, viewMonth, activeDay);
    const gross = parseFloat(grossVal) || 0;
    const tips = parseFloat(tipsVal) || 0;
    if (grossVal.trim() === "" && tipsVal.trim() === "") return clearDay();
    const prev = entries;
    setEntries({ ...entries, [k]: { gross, tips } });
    setActiveDay(null);
    const { error } = await supabase.from("entries").upsert(
      { user_id: userId, work_date: k, gross, tips },
      { onConflict: "user_id,work_date" }
    );
    if (error) { setEntries(prev); showToast("Save failed — try again."); }
  }

  async function clearDay() {
    const k = keyFor(viewYear, viewMonth, activeDay);
    const prev = entries;
    const next = { ...entries }; delete next[k];
    setEntries(next);
    setActiveDay(null);
    const { error } = await supabase.from("entries").delete().eq("user_id", userId).eq("work_date", k);
    if (error) { setEntries(prev); showToast("Delete failed — try again."); }
  }

  async function savePercent(p) {
    setPercent(p);
    await supabase.from("settings").upsert({ user_id: userId, cut_percent: p });
  }

  async function logout() { await supabase.auth.signOut(); }

  return (
    <div style={{ minHeight: "100dvh", maxWidth: 520, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ background: "var(--asphalt-2)", borderBottom: "1px solid var(--line)", padding: "18px 16px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.15em", color: "var(--amber-dim)", fontFamily: "var(--mono)" }}>TAXI METER</div>
            <div style={{ fontSize: 12, color: "var(--cream-dim)", marginTop: 2 }}>{session.user.email}</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setShowSettings(true)} style={chipBtn}>{percent}% ⚙</button>
            <button onClick={logout} style={chipBtn}>Log out</button>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <button onClick={() => changeMonth(-1)} style={navBtn} aria-label="Previous month">‹</button>
          <div style={{ fontFamily: "var(--mono)", fontSize: 14, letterSpacing: "0.08em" }}>
            {MONTHS[viewMonth].toUpperCase()} {viewYear}
          </div>
          <button onClick={() => changeMonth(1)} style={navBtn} aria-label="Next month">›</button>
        </div>

        {/* Meter */}
        <div style={{ background: "var(--asphalt)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px", boxShadow: "inset 0 0 24px rgba(255,182,39,0.04)" }}>
          <div style={{ fontSize: 11, color: "var(--amber-dim)", fontFamily: "var(--mono)", letterSpacing: "0.1em" }}>
            TAKE-HOME ({percent}% + TIPS)
          </div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 38, fontWeight: 700, color: "var(--amber)", textShadow: "0 0 18px rgba(255,182,39,0.35)", fontVariantNumeric: "tabular-nums" }}>
            {loading ? "···" : `€${takeHome.toFixed(2)}`}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
            <Mini label="GROSS" v={`€${grossTotal.toFixed(0)}`} />
            <Mini label={`CUT ${percent}%`} v={`€${cutTotal.toFixed(0)}`} />
            <Mini label="TIPS" v={`€${tipsTotal.toFixed(0)}`} />
            <Mini label="DAYS" v={`${daysWorked}/${dim}`} dimmed />
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div style={{ padding: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6, marginBottom: 6 }}>
          {DOW.map((d, i) => <div key={i} style={{ textAlign: "center", fontSize: 10, color: "var(--cream-dim)", fontFamily: "var(--mono)" }}>{d}</div>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
          {Array.from({ length: leadBlanks }).map((_, i) => <div key={"b" + i} />)}
          {Array.from({ length: dim }).map((_, i) => {
            const d = i + 1;
            const e = entries[keyFor(viewYear, viewMonth, d)];
            const isToday = isCurrentMonth && d === today.getDate();
            const dayTotal = e ? e.gross * (percent / 100) + e.tips : 0;
            return (
              <button key={d} onClick={() => openDay(d)}
                style={{
                  aspectRatio: "1", borderRadius: 8,
                  border: isToday ? "1px solid var(--amber)" : "1px solid var(--line)",
                  background: e ? "rgba(255,182,39,0.10)" : "var(--asphalt-2)",
                  color: e ? "var(--amber)" : "var(--cream-dim)",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 2,
                }}>
                <span style={{ fontSize: 12, fontFamily: "var(--mono)" }}>{d}</span>
                {e && <span style={{ fontSize: 8.5, fontFamily: "var(--mono)", marginTop: 1 }}>{Math.round(dayTotal)}</span>}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 10, color: "var(--cream-dim)", marginTop: 8, textAlign: "center" }}>
          Numbers on days = your take-home for that day
        </div>
      </div>

      {/* Chart */}
      {daysWorked > 0 && (
        <div style={{ padding: "0 16px 8px" }}>
          <Label>DAILY TAKE-HOME</Label>
          <div style={{ height: 120, marginTop: 8 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="day" tick={{ fill: "#9a9488", fontSize: 9 }} axisLine={{ stroke: "#2c2e31" }} tickLine={false} interval={2} />
                <Tooltip
                  contentStyle={{ background: "#1f2124", border: "1px solid #2c2e31", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#efe9de" }}
                  formatter={(v, name) => [`€${Number(v).toFixed(2)}`, name === "cut" ? "Cut" : "Tips"]}
                  labelFormatter={(d) => `Day ${d}`}
                />
                <Bar dataKey="cut" stackId="a" fill="#ffb627" radius={[0, 0, 0, 0]} />
                <Bar dataKey="tips" stackId="a" fill="#c1552e" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 4, fontSize: 10, color: "var(--cream-dim)" }}>
            <span><span style={{ color: "#ffb627" }}>■</span> Cut ({percent}%)</span>
            <span><span style={{ color: "#c1552e" }}>■</span> Tips</span>
          </div>
        </div>
      )}

      {/* Insights */}
      <div style={{ padding: "14px 16px 40px" }}>
        <Label>INSIGHTS</Label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
          <Card label="Avg take-home / day" v={daysWorked ? `€${avgTakeHome.toFixed(0)}` : "—"} />
          <Card label="Best day" v={bestDay ? `€${bestDay.total.toFixed(0)} (${bestDay.day} ${MONTHS[viewMonth].slice(0, 3)})` : "—"} />
          <Card label="Tips share of income" v={takeHome ? `${((tipsTotal / takeHome) * 100).toFixed(0)}%` : "—"} />
          <Card label={isCurrentMonth ? "Projected take-home" : "Month take-home"} v={`€${projectedTakeHome.toFixed(0)}`} accent />
        </div>
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 14, left: "50%", transform: "translateX(-50%)", background: "var(--rust)", color: "var(--cream)", padding: "9px 16px", borderRadius: 8, fontSize: 12, zIndex: 60 }}>
          {toast}
        </div>
      )}

      {/* Day editor */}
      {activeDay !== null && (
        <div style={overlay} onClick={() => setActiveDay(null)}>
          <div onClick={(e) => e.stopPropagation()} style={sheet}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--cream-dim)", marginBottom: 12 }}>
              {MONTHS[viewMonth].toUpperCase()} {activeDay}, {viewYear}
            </div>
            <label style={lbl}>Gross fares (€)</label>
            <input type="number" inputMode="decimal" autoFocus value={grossVal}
              onChange={(e) => setGrossVal(e.target.value)} placeholder="0" style={bigInp} />
            <label style={{ ...lbl, marginTop: 12 }}>Tips total (€) — 100% yours</label>
            <input type="number" inputMode="decimal" value={tipsVal}
              onChange={(e) => setTipsVal(e.target.value)} placeholder="0" style={bigInp} />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input type="number" inputMode="decimal" value={quickTip}
                onChange={(e) => setQuickTip(e.target.value)} placeholder="+ add a tip"
                style={{ ...inp, flex: 1 }}
                onKeyDown={(e) => e.key === "Enter" && addTip()} />
              <button onClick={addTip}
                style={{ padding: "0 18px", borderRadius: 8, border: "1px solid var(--amber)", background: "transparent", color: "var(--amber)", fontWeight: 700, fontFamily: "var(--mono)" }}>
                Add
              </button>
            </div>
            <div style={{ fontSize: 10, color: "var(--cream-dim)", marginTop: 6 }}>
              Tap Add each time you get a tip — it saves right away.
            </div>
            {grossVal && (
              <div style={{ marginTop: 12, fontSize: 12, color: "var(--cream-dim)" }}>
                Your take: <span style={{ color: "var(--amber)", fontFamily: "var(--mono)" }}>
                  €{((parseFloat(grossVal) || 0) * percent / 100 + (parseFloat(tipsVal) || 0)).toFixed(2)}
                </span>
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button onClick={clearDay} style={{ flex: 1, padding: 12, borderRadius: 8, border: "1px solid var(--line)", background: "transparent", color: "var(--cream-dim)" }}>Clear</button>
              <button onClick={saveDay} style={{ flex: 2, padding: 12, borderRadius: 8, border: "none", background: "var(--amber)", color: "var(--asphalt)", fontWeight: 800 }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Settings */}
      {showSettings && (
        <div style={{ ...overlay, alignItems: "center" }} onClick={() => setShowSettings(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...sheet, borderRadius: 16, width: "85%", maxWidth: 340 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--cream-dim)", marginBottom: 12 }}>YOUR CUT PERCENTAGE</div>
            <input type="number" value={percent} onChange={(e) => savePercent(parseFloat(e.target.value) || 0)} style={bigInp} />
            <button onClick={() => setShowSettings(false)} style={{ width: "100%", marginTop: 16, padding: 12, borderRadius: 8, border: "none", background: "var(--amber)", color: "var(--asphalt)", fontWeight: 800 }}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

const chipBtn = { background: "transparent", border: "1px solid var(--line)", color: "var(--cream-dim)", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontFamily: "var(--mono)" };
const navBtn = { background: "transparent", border: "none", color: "var(--cream-dim)", fontSize: 22, padding: "2px 12px" };
const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 };
const sheet = { background: "var(--asphalt-2)", borderTop: "1px solid var(--line)", borderRadius: "16px 16px 0 0", padding: 20, width: "100%", maxWidth: 520 };
const bigInp = { ...inp, fontFamily: "var(--mono)", fontSize: 20, color: "var(--amber)" };

function Mini({ label, v, dimmed }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: "var(--amber-dim)", fontFamily: "var(--mono)", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ fontSize: 14, color: dimmed ? "var(--cream-dim)" : "var(--cream)", fontFamily: "var(--mono)", marginTop: 2 }}>{v}</div>
    </div>
  );
}
function Label({ children }) {
  return <div style={{ fontSize: 11, letterSpacing: "0.12em", color: "var(--amber-dim)", fontFamily: "var(--mono)" }}>{children}</div>;
}
function Card({ label, v, accent }) {
  return (
    <div style={{ background: "var(--asphalt-2)", border: "1px solid var(--line)", borderRadius: 10, padding: 12 }}>
      <div style={{ fontSize: 10, color: "var(--cream-dim)" }}>{label}</div>
      <div style={{ fontSize: 15, marginTop: 4, color: accent ? "var(--amber)" : "var(--cream)", fontFamily: "var(--mono)" }}>{v}</div>
    </div>
  );
}

/* ---------- Root ---------- */
export default function Page() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--amber)", fontFamily: "var(--mono)", letterSpacing: "0.1em", fontSize: 13 }}>LOADING METER…</div>
      </div>
    );
  }

  if (!session) return <AuthScreen onAuthed={() => {}} />;
  return <Tracker session={session} />;
}

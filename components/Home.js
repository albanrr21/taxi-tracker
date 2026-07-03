"use client";

import { useMemo, useState } from "react";
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { useI18n } from "@/lib/i18n";
import {
  pad, keyFor, daysInMonth, firstWeekdayMon, todayISO, nowHM, dowMon,
  eur, round2, resolveRate, entryCut, entryTakeHome, shiftHours,
  earnedToDate, totalPaid, balanceState,
} from "@/lib/money";
import { Mini, Label, Card, monoNum, navBtn, chipBtn, primaryBtn, ghostBtn, amberOutlineBtn } from "@/components/ui";
import DayEditor from "@/components/DayEditor";
import EndShiftFlow from "@/components/EndShiftFlow";
import QuickTip from "@/components/QuickTip";

export default function Home({ store, showToast, onOpenSettings }) {
  const { t, months, dow, weekdaysFull } = useI18n();
  const { entries, rates, payments } = store;

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [activeDayISO, setActiveDayISO] = useState(null);
  const [endShiftOpen, setEndShiftOpen] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);

  const dim = daysInMonth(viewYear, viewMonth);
  const leadBlanks = firstWeekdayMon(viewYear, viewMonth);
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();
  const currentPercent = resolveRate(rates, todayISO());

  const monthEntries = useMemo(() => {
    const prefix = `${viewYear}-${pad(viewMonth + 1)}-`;
    return Object.values(entries).filter((e) => e.work_date.startsWith(prefix));
  }, [entries, viewYear, viewMonth]);

  const grossTotal = round2(monthEntries.reduce((s, e) => s + e.gross, 0));
  const tipsTotal = round2(monthEntries.reduce((s, e) => s + e.tips, 0));
  const cutTotal = round2(monthEntries.reduce((s, e) => s + entryCut(e, rates), 0));
  const takeHome = round2(cutTotal + tipsTotal);
  const daysWorked = monthEntries.length;
  const avgTakeHome = daysWorked ? takeHome / daysWorked : 0;

  const bestDay = useMemo(() => monthEntries.reduce((b, e) => {
    const total = entryTakeHome(e, rates);
    return total > (b?.total ?? -1) ? { iso: e.work_date, total } : b;
  }, null), [monthEntries, rates]);

  // Honest projection: take-home so far / calendar days elapsed x days in month.
  const todayDate = now.getDate();
  const daysElapsed = isCurrentMonth ? todayDate : dim;
  const projected = isCurrentMonth
    ? (daysElapsed ? round2((takeHome / daysElapsed) * dim) : 0)
    : takeHome;

  // Monthly goal progress (current month only).
  const goal = Number(store.settings.monthly_goal) || 0;
  const showGoal = goal > 0 && isCurrentMonth;
  const remainingDays = Math.max(1, dim - todayDate + 1);
  const perDayNeeded = Math.max(0, round2((goal - takeHome) / remainingDays));
  const goalPct = goal ? Math.min(100, Math.round((takeHome / goal) * 100)) : 0;
  const goalReached = goal > 0 && takeHome >= goal;

  // Optional shift hours — never nag, only surface when present.
  const todayEntry = entries[todayISO()];
  const shiftRunning = !!(todayEntry?.shift_start && !todayEntry?.shift_end);
  const canStartShift = !todayEntry?.shift_start;

  async function startShift() {
    const iso = todayISO();
    const ex = entries[iso] || { gross: 0, tips: 0 };
    const { error } = await store.upsertEntry(iso, { gross: ex.gross || 0, tips: ex.tips || 0, shift_start: nowHM() });
    if (error) showToast(t("err.save"));
    else showToast(t("home.shiftStarted"));
  }

  // €/hour + best weekday, computed only from days that have both times.
  const hours = useMemo(() => {
    const withHours = monthEntries
      .map((e) => ({ e, h: shiftHours(e) }))
      .filter((x) => x.h != null && x.h > 0);
    if (withHours.length === 0) return null;
    const totalH = withHours.reduce((s, x) => s + x.h, 0);
    const totalTH = withHours.reduce((s, x) => s + entryTakeHome(x.e, rates), 0);
    const byDow = {};
    for (const x of withHours) {
      const wd = dowMon(x.e.work_date);
      (byDow[wd] ||= { h: 0, th: 0 }).h += x.h;
      byDow[wd].th += entryTakeHome(x.e, rates);
    }
    let best = null;
    for (const [wd, v] of Object.entries(byDow)) {
      const rate = v.th / v.h;
      if (rate > (best?.rate ?? -1)) best = { wd: Number(wd), rate };
    }
    return { perHour: totalH ? totalTH / totalH : 0, best };
  }, [monthEntries, rates]);

  // All-time running balance with the company (cuts owed minus cash received).
  const bal = round2(earnedToDate(entries, rates) - totalPaid(payments));
  const bs = balanceState(bal);
  const balText = bs.kind === "settled" ? t("balance.settled")
    : bs.kind === "owed" ? t("balance.owed", { amount: eur(bs.amount) })
    : t("balance.advanced", { amount: eur(bs.amount) });

  const chartData = useMemo(() => {
    const arr = [];
    for (let d = 1; d <= dim; d++) {
      const e = entries[keyFor(viewYear, viewMonth, d)];
      arr.push({ day: d, cut: e ? entryCut(e, rates) : 0, tips: e ? e.tips : 0 });
    }
    return arr;
  }, [entries, viewYear, viewMonth, dim, rates]);

  function changeMonth(delta) {
    let m = viewMonth + delta, y = viewYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setViewMonth(m); setViewYear(y); setActiveDayISO(null);
  }

  return (
    <div>
      {/* Header + meter */}
      <div style={{ background: "var(--asphalt-2)", borderBottom: "1px solid var(--line)", padding: "18px 16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.15em", color: "var(--amber-dim)", fontFamily: "var(--mono)" }}>
            {t("brand")}
          </div>
          <button onClick={onOpenSettings} style={chipBtn}>{currentPercent}% ⚙</button>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <button onClick={() => changeMonth(-1)} style={navBtn} aria-label="prev">‹</button>
          <div style={{ fontFamily: "var(--mono)", fontSize: 14, letterSpacing: "0.08em" }}>
            {months[viewMonth].toUpperCase()} {viewYear}
          </div>
          <button onClick={() => changeMonth(1)} style={navBtn} aria-label="next">›</button>
        </div>

        {/* Meter */}
        <div style={{ background: "var(--asphalt)", border: "1px solid var(--line)", borderRadius: 12, padding: 16, boxShadow: "inset 0 0 24px rgba(255,182,39,0.04)" }}>
          <div style={{ fontSize: 11, color: "var(--amber-dim)", fontFamily: "var(--mono)", letterSpacing: "0.1em" }}>
            {t("meter.takeHomeFull", { percent: currentPercent })}
          </div>
          <div style={{ fontSize: 38, fontWeight: 700, color: "var(--amber)", textShadow: "0 0 18px rgba(255,182,39,0.35)", ...monoNum }}>
            {store.loading ? "···" : eur(takeHome)}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
            <Mini label={t("meter.gross")} v={eur(grossTotal, 0)} />
            <Mini label={t("meter.cut", { percent: currentPercent })} v={eur(cutTotal, 0)} />
            <Mini label={t("meter.tips")} v={eur(tipsTotal, 0)} />
            <Mini label={t("meter.days")} v={`${daysWorked}/${dim}`} dimmed />
          </div>

          {showGoal && (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                <span style={{ fontSize: 9, color: "var(--amber-dim)", fontFamily: "var(--mono)", letterSpacing: "0.06em" }}>{t("goal.label")}</span>
                <span style={{ fontSize: 11, color: "var(--cream-dim)", ...monoNum }}>{eur(takeHome, 0)} / {eur(goal, 0)}</span>
              </div>
              <div style={{ height: 6, borderRadius: 4, background: "var(--asphalt-2)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${goalPct}%`, background: "var(--amber)", transition: "width .3s" }} />
              </div>
              <div style={{ fontSize: 11, color: goalReached ? "var(--amber)" : "var(--cream-dim)", marginTop: 6 }}>
                {goalReached ? t("goal.reached") : t("goal.needed", { amount: eur(perDayNeeded, 0), days: remainingDays })}
              </div>
            </div>
          )}
        </div>

        {/* Running balance with the company */}
        {!store.loading && (
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "var(--asphalt)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 14px" }}>
            <span style={{ fontSize: 10, color: "var(--amber-dim)", fontFamily: "var(--mono)", letterSpacing: "0.08em" }}>
              {t("balance.label")}
            </span>
            <span style={{ fontSize: 14, ...monoNum, color: bs.kind === "owed" ? "var(--amber)" : "var(--cream)" }}>{balText}</span>
          </div>
        )}

        {/* Primary actions */}
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {shiftRunning && (
            <div style={{ textAlign: "center", fontSize: 12, color: "var(--amber-dim)", fontFamily: "var(--mono)" }}>
              {t("home.shiftSince", { time: todayEntry.shift_start.slice(0, 5) })}
            </div>
          )}
          {canStartShift && (
            <button onClick={startShift} style={{ ...ghostBtn, padding: "11px 0", fontSize: 13 }}>
              {t("home.startShift")}
            </button>
          )}
          <button onClick={() => setEndShiftOpen(true)} style={{ ...primaryBtn, padding: "16px 0", fontSize: 16 }}>
            {t("home.endShift")}
          </button>
          <button onClick={() => setTipOpen(true)} style={{ ...amberOutlineBtn, width: "100%", padding: "14px 0", fontSize: 15 }}>
            {t("home.addTip")}
          </button>
        </div>
      </div>

      {/* Calendar (review / edit surface) */}
      <div style={{ padding: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6, marginBottom: 6 }}>
          {dow.map((d, i) => <div key={i} style={{ textAlign: "center", fontSize: 10, color: "var(--cream-dim)", fontFamily: "var(--mono)" }}>{d}</div>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
          {Array.from({ length: leadBlanks }).map((_, i) => <div key={"b" + i} />)}
          {Array.from({ length: dim }).map((_, i) => {
            const d = i + 1;
            const iso = keyFor(viewYear, viewMonth, d);
            const e = entries[iso];
            const isToday = isCurrentMonth && d === now.getDate();
            const dayTotal = e ? entryTakeHome(e, rates) : 0;
            return (
              <button key={d} onClick={() => setActiveDayISO(iso)}
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
        <div style={{ fontSize: 10, color: "var(--cream-dim)", marginTop: 8, textAlign: "center" }}>{t("home.calendarHint")}</div>
      </div>

      {/* Chart */}
      {daysWorked > 0 && (
        <div style={{ padding: "0 16px 8px" }}>
          <Label>{t("insights.dailyTakeHome")}</Label>
          <div style={{ height: 120, marginTop: 8 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="day" tick={{ fill: "#9a9488", fontSize: 9 }} axisLine={{ stroke: "#2c2e31" }} tickLine={false} interval={2} />
                <Tooltip
                  contentStyle={{ background: "#1f2124", border: "1px solid #2c2e31", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#efe9de" }}
                  formatter={(v, name) => [eur(Number(v)), name === "cut" ? t("insights.cut") : t("insights.tips")]}
                  labelFormatter={(d) => `${d}`}
                />
                <Bar dataKey="cut" stackId="a" fill="#ffb627" />
                <Bar dataKey="tips" stackId="a" fill="#c1552e" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 4, fontSize: 10, color: "var(--cream-dim)" }}>
            <span><span style={{ color: "#ffb627" }}>■</span> {t("insights.cut")} ({currentPercent}%)</span>
            <span><span style={{ color: "#c1552e" }}>■</span> {t("insights.tips")}</span>
          </div>
        </div>
      )}

      {/* Insights */}
      <div style={{ padding: "14px 16px 40px" }}>
        <Label>{t("insights.title")}</Label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
          <Card label={t("insights.avgDay")} v={daysWorked ? eur(avgTakeHome, 0) : "—"} />
          <Card label={t("insights.bestDay")} v={bestDay ? `${eur(bestDay.total, 0)} (${Number(bestDay.iso.slice(8))} ${months[viewMonth].slice(0, 3)})` : "—"} />
          <Card label={t("insights.tipsShare")} v={takeHome ? `${Math.round((tipsTotal / takeHome) * 100)}%` : "—"} />
          <Card label={isCurrentMonth ? t("insights.projected") : t("insights.monthTotal")} v={eur(projected, 0)} accent />
          {hours && <Card label={t("insights.perHour")} v={eur(hours.perHour, 1)} />}
          {hours && hours.best && (
            <Card label={t("insights.bestWeekday")}
              v={t("insights.weekdayRate", { day: weekdaysFull[hours.best.wd], amount: eur(hours.best.rate, 0) })} />
          )}
        </div>
      </div>

      {/* Overlays */}
      {endShiftOpen && (
        <EndShiftFlow
          entries={entries}
          rates={rates}
          onClose={() => setEndShiftOpen(false)}
          upsertEntry={store.upsertEntry}
          showToast={showToast}
        />
      )}
      {tipOpen && (
        <QuickTip
          entries={entries}
          onClose={() => setTipOpen(false)}
          upsertEntry={store.upsertEntry}
          showToast={showToast}
        />
      )}
      {activeDayISO && (
        <DayEditor
          dateISO={activeDayISO}
          entry={entries[activeDayISO]}
          rates={rates}
          onClose={() => setActiveDayISO(null)}
          upsertEntry={store.upsertEntry}
          deleteEntry={store.deleteEntry}
          showToast={showToast}
        />
      )}
    </div>
  );
}

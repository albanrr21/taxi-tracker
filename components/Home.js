"use client";

import { useMemo, useState } from "react";
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { useI18n } from "@/lib/i18n";
import {
  pad, keyFor, daysInMonth, firstWeekdayMon, todayISO,
  eur, round2, resolveRate, entryCut, entryTakeHome,
} from "@/lib/money";
import { Mini, Label, Card, monoNum, navBtn, chipBtn, primaryBtn, amberOutlineBtn } from "@/components/ui";
import DayEditor from "@/components/DayEditor";
import EndShiftFlow from "@/components/EndShiftFlow";
import QuickTip from "@/components/QuickTip";

export default function Home({ store, showToast, onOpenSettings }) {
  const { t, months, dow } = useI18n();
  const { entries, rates } = store;

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

  // Simple projection for now; feature 4 replaces this with honest pace.
  const projected = isCurrentMonth && daysWorked ? avgTakeHome * dim : takeHome;

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
        </div>

        {/* Balance under the meter is added in feature 2. */}

        {/* Primary actions */}
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
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
        </div>
      </div>

      {/* Overlays */}
      {endShiftOpen && (
        <EndShiftFlow
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

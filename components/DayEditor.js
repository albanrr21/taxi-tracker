"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { round2, resolveRate, parseISO, eur } from "@/lib/money";
import { lbl, inp, bigInp, amberOutlineBtn, primaryBtn, ghostBtn, monoNum, Sheet } from "@/components/ui";

// Edit a single day from the calendar. Keeps the original editor behaviour:
// gross + running tips total, instant-save quick tip add, Save / Clear.
export default function DayEditor({ dateISO, entry, rates, onClose, upsertEntry, deleteEntry, showToast }) {
  const { t, months } = useI18n();
  const { y, m, d } = parseISO(dateISO);
  const percent = resolveRate(rates, dateISO);

  const [grossVal, setGrossVal] = useState(entry ? String(entry.gross) : "");
  const [tipsVal, setTipsVal] = useState(entry && entry.tips ? String(entry.tips) : "");
  const [quickTip, setQuickTip] = useState("");

  async function addTip() {
    const amt = parseFloat(quickTip);
    if (!amt) return;
    const prevTipsVal = tipsVal;
    const gross = parseFloat(grossVal) || 0;
    const newTips = round2((parseFloat(tipsVal) || 0) + amt);
    setTipsVal(String(newTips));
    setQuickTip("");
    const { error } = await upsertEntry(dateISO, { gross, tips: newTips });
    if (error) { setTipsVal(prevTipsVal); showToast(t("err.tip")); }
    else showToast(t("tip.added", { amount: eur(amt) }));
  }

  async function save() {
    const gross = parseFloat(grossVal) || 0;
    const tips = parseFloat(tipsVal) || 0;
    if (grossVal.trim() === "" && tipsVal.trim() === "") return clear();
    onClose();
    const { error } = await upsertEntry(dateISO, { gross, tips });
    if (error) showToast(t("err.save"));
  }

  async function clear() {
    onClose();
    const { error } = await deleteEntry(dateISO);
    if (error) showToast(t("err.delete"));
  }

  const take = (parseFloat(grossVal) || 0) * percent / 100 + (parseFloat(tipsVal) || 0);

  return (
    <Sheet onClose={onClose}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--cream-dim)", marginBottom: 12 }}>
        {months[m].toUpperCase()} {d}, {y}
      </div>

      <label style={lbl}>{t("day.gross")}</label>
      <input type="number" inputMode="decimal" autoFocus value={grossVal}
        onChange={(e) => setGrossVal(e.target.value)} placeholder="0" style={bigInp} />

      <label style={{ ...lbl, marginTop: 12 }}>{t("day.tipsTotal")}</label>
      <input type="number" inputMode="decimal" value={tipsVal}
        onChange={(e) => setTipsVal(e.target.value)} placeholder="0" style={bigInp} />
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input type="number" inputMode="decimal" value={quickTip}
          onChange={(e) => setQuickTip(e.target.value)} placeholder={t("day.addTip")}
          style={{ ...inp, flex: 1 }}
          onKeyDown={(e) => e.key === "Enter" && addTip()} />
        <button onClick={addTip} style={amberOutlineBtn}>{t("add")}</button>
      </div>
      <div style={{ fontSize: 10, color: "var(--cream-dim)", marginTop: 6 }}>{t("day.tipHint")}</div>

      {grossVal && (
        <div style={{ marginTop: 12, fontSize: 12, color: "var(--cream-dim)" }}>
          {t("day.yourTake")} <span style={{ color: "var(--amber)", ...monoNum }}>{eur(take)}</span>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button onClick={clear} style={{ ...ghostBtn, flex: 1, color: "var(--cream-dim)" }}>{t("clear")}</button>
        <button onClick={save} style={{ ...primaryBtn, flex: 2 }}>{t("save")}</button>
      </div>
    </Sheet>
  );
}

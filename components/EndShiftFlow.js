"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { round2, resolveRate, eur, todayISO, nowHM, cleanAmount, parseAmount } from "@/lib/money";
import { primaryBtn } from "@/components/ui";

const bigNum = {
  width: "100%", background: "transparent", border: "none",
  borderBottom: "2px solid var(--line)", color: "var(--amber)",
  fontFamily: "var(--mono)", fontVariantNumeric: "tabular-nums",
  fontSize: 52, textAlign: "center", outline: "none", padding: "10px 0",
};
const dateInp = {
  background: "var(--asphalt-2)", border: "1px solid var(--line)", borderRadius: 8,
  padding: "9px 12px", color: "var(--cream)", fontFamily: "var(--mono)", fontSize: 16,
  colorScheme: "dark",
};

// Full-screen shift entry: step 1 gross fares, step 2 tips, then save.
// Defaults to today; the date is editable so yesterday can be logged.
export default function EndShiftFlow({ entries, rates, onClose, upsertEntry, showToast }) {
  const { t } = useI18n();
  const [step, setStep] = useState(1);
  const [dateISO, setDateISO] = useState(todayISO());
  const existing = entries?.[todayISO()];
  const [gross, setGross] = useState(existing ? String(existing.gross) : "");
  const [tips, setTips] = useState(existing && existing.tips ? String(existing.tips) : "");

  async function save() {
    const g = parseAmount(gross);
    const tp = parseAmount(tips);
    const percent = resolveRate(rates, dateISO);
    const take = round2(g * percent / 100 + tp);
    onClose();
    const patch = { gross: g, tips: tp };
    // If a shift was started today, stamp its end time now.
    const dayEntry = entries?.[dateISO];
    if (dateISO === todayISO() && dayEntry?.shift_start) patch.shift_end = nowHM();
    const { error } = await upsertEntry(dateISO, patch);
    if (error) showToast(t("err.save"));
    else showToast(t("endShift.saved", { amount: eur(take) }));
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80, background: "var(--asphalt)", overflowY: "auto" }}>
      <div style={{ maxWidth: 520, margin: "0 auto", minHeight: "100dvh", display: "flex", flexDirection: "column",
        padding: "calc(16px + env(safe-area-inset-top)) 20px calc(16px + env(safe-area-inset-bottom))" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={step === 1 ? onClose : () => setStep(1)}
            style={{ background: "none", border: "none", color: "var(--cream-dim)", fontSize: 26 }}
            aria-label={t("back")}>‹</button>
          <div style={{ fontFamily: "var(--mono)", fontSize: 13, letterSpacing: "0.1em", color: "var(--amber-dim)" }}>
            {t("endShift.title").toUpperCase()}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[1, 2].map((s) => (
              <div key={s} style={{ width: 8, height: 8, borderRadius: "50%", background: step >= s ? "var(--amber)" : "var(--line)" }} />
            ))}
          </div>
        </div>

        {/* date (step 1 only) */}
        {step === 1 && (
          <div style={{ marginTop: 18, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--cream-dim)" }}>{t("endShift.date")}</span>
            <input type="date" value={dateISO} max={todayISO()}
              onChange={(e) => setDateISO(e.target.value)} style={dateInp} />
          </div>
        )}

        {/* body — the action button sits directly under the input, never pinned to
            the screen bottom: the iOS decimal pad has no Return key and would
            otherwise hide the only way forward behind the keyboard. */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center", paddingBottom: "10dvh" }}>
          <div style={{ fontSize: 16, color: "var(--cream)", marginBottom: 24 }}>
            {step === 1 ? t("endShift.grossQ") : t("endShift.tipsQ")}
          </div>
          {step === 1 ? (
            <input key="g" type="text" inputMode="decimal" autoFocus value={gross}
              onChange={(e) => setGross(cleanAmount(e.target.value))} placeholder="0" style={bigNum}
              onKeyDown={(e) => e.key === "Enter" && setStep(2)} />
          ) : (
            <input key="tp" type="text" inputMode="decimal" autoFocus value={tips}
              onChange={(e) => setTips(cleanAmount(e.target.value))} placeholder="0" style={bigNum}
              onKeyDown={(e) => e.key === "Enter" && save()} />
          )}
          <div style={{ margin: "12px 0 24px", fontSize: 12, color: "var(--cream-dim)" }}>€</div>
          {step === 1 ? (
            <button onClick={() => setStep(2)} style={primaryBtn}>{t("next")}</button>
          ) : (
            <button onClick={save} style={primaryBtn}>{t("endShift.save")}</button>
          )}
        </div>
      </div>
    </div>
  );
}

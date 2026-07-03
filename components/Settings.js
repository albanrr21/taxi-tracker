"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useI18n, LANGS } from "@/lib/i18n";
import { resolveRate, todayISO, parseISO } from "@/lib/money";
import { lbl, inp, bigInp, primaryBtn, ghostBtn, chipBtn, monoNum, Sheet } from "@/components/ui";

const dateInp = { ...inp, colorScheme: "dark", fontFamily: "var(--mono)" };

// Settings: language, rate history (change your percentage from a chosen date,
// never rewriting the past), privacy line, logout. Saves on confirm.
export default function Settings({ store, onClose }) {
  const { t, lang, setLang, months } = useI18n();
  const cur = resolveRate(store.rates, todayISO());

  const [percentVal, setPercentVal] = useState(String(cur));
  const [fromDate, setFromDate] = useState(todayISO());
  const [busy, setBusy] = useState(false);

  const history = [...store.rates].sort((a, b) => (a.effective_from < b.effective_from ? 1 : -1));

  async function saveRate() {
    const p = parseFloat(percentVal);
    if (isNaN(p)) return;
    setBusy(true);
    await store.addRate(fromDate, p);
    setBusy(false);
  }

  async function logout() { await supabase.auth.signOut(); }

  return (
    <Sheet onClose={onClose} center>
      <div style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--cream-dim)", marginBottom: 14 }}>
        {t("settings.title").toUpperCase()}
      </div>

      {/* Language */}
      <label style={lbl}>{t("settings.language")}</label>
      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        {LANGS.map((l) => (
          <button key={l.code} onClick={() => setLang(l.code)}
            style={{ ...chipBtn, flex: 1, fontWeight: 700,
              background: lang === l.code ? "var(--amber)" : "transparent",
              color: lang === l.code ? "var(--asphalt)" : "var(--cream-dim)" }}>
            {l.label}
          </button>
        ))}
      </div>

      {/* Current rate */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, color: "var(--cream-dim)" }}>{t("settings.currentRate")}</span>
        <span style={{ fontSize: 22, color: "var(--amber)", ...monoNum }}>{cur}%</span>
      </div>

      {/* Change rate from a date */}
      <label style={{ ...lbl, marginTop: 14 }}>{t("settings.changeRate")}</label>
      <input type="number" inputMode="decimal" value={percentVal}
        onChange={(e) => setPercentVal(e.target.value)} style={bigInp} />
      <label style={{ ...lbl, marginTop: 10 }}>{t("settings.effectiveFrom")}</label>
      <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={dateInp} />
      <div style={{ fontSize: 11, color: "var(--cream-dim)", marginTop: 8 }}>{t("settings.rateNote")}</div>
      <button onClick={saveRate} disabled={busy} style={{ ...primaryBtn, marginTop: 10, opacity: busy ? 0.6 : 1 }}>
        {t("settings.saveRate")}
      </button>

      {/* History */}
      {history.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <label style={lbl}>{t("settings.rateHistory")}</label>
          {history.map((r) => {
            const { d, m, y } = parseISO(r.effective_from);
            return (
              <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                borderTop: "1px solid var(--line)", padding: "9px 0" }}>
                <span style={{ fontSize: 13, color: "var(--amber)", ...monoNum }}>{Number(r.percent)}%</span>
                <span style={{ fontSize: 12, color: "var(--cream-dim)", ...monoNum, flex: 1, textAlign: "right", marginRight: 10 }}>
                  {t("settings.effectiveFrom").toLowerCase()} {d} {months[m].slice(0, 3)} {y}
                </span>
                {history.length > 1 && (
                  <button onClick={() => store.deleteRate(r.id)}
                    style={{ background: "none", border: "none", color: "var(--cream-dim)", fontSize: 16, lineHeight: 1 }}
                    aria-label={t("delete")}>×</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ fontSize: 11, color: "var(--cream-dim)", marginTop: 18, textAlign: "center" }}>{t("settings.private")}</div>
      <button onClick={logout} style={{ ...ghostBtn, marginTop: 12 }}>{t("header.logout")}</button>
    </Sheet>
  );
}

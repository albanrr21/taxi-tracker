"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useI18n, LANGS } from "@/lib/i18n";
import { resolveRate, todayISO } from "@/lib/money";
import { lbl, bigInp, primaryBtn, ghostBtn, chipBtn, Sheet } from "@/components/ui";

// Feature 1 settings: language, cut percentage (saved on confirm — fixes the old
// write-on-every-keystroke bug), privacy line, logout. Setting a percentage adds
// a rate effective today, so past days keep their old rate (feature 3 builds the
// full rate history + effective-date picker on top of this).
export default function Settings({ store, onClose }) {
  const { t, lang, setLang } = useI18n();
  const cur = resolveRate(store.rates, todayISO());
  const [percentVal, setPercentVal] = useState(String(cur));
  const [busy, setBusy] = useState(false);

  async function saveRate() {
    const p = parseFloat(percentVal);
    if (isNaN(p)) return;
    setBusy(true);
    const { error } = await store.addRate(todayISO(), p);
    setBusy(false);
    if (!error) onClose();
  }

  async function logout() { await supabase.auth.signOut(); }

  return (
    <Sheet onClose={onClose} center>
      <div style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--cream-dim)", marginBottom: 14 }}>
        {t("settings.title").toUpperCase()}
      </div>

      <label style={lbl}>{t("settings.language")}</label>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {LANGS.map((l) => (
          <button key={l.code} onClick={() => setLang(l.code)}
            style={{ ...chipBtn, flex: 1, fontWeight: 700,
              background: lang === l.code ? "var(--amber)" : "transparent",
              color: lang === l.code ? "var(--asphalt)" : "var(--cream-dim)" }}>
            {l.label}
          </button>
        ))}
      </div>

      <label style={lbl}>{t("settings.rate")}</label>
      <input type="number" inputMode="decimal" value={percentVal}
        onChange={(e) => setPercentVal(e.target.value)} style={bigInp} />
      <button onClick={saveRate} disabled={busy} style={{ ...primaryBtn, marginTop: 10, opacity: busy ? 0.6 : 1 }}>
        {t("settings.saveRate")}
      </button>

      <div style={{ fontSize: 11, color: "var(--cream-dim)", marginTop: 16, textAlign: "center" }}>
        {t("settings.private")}
      </div>

      <button onClick={logout} style={{ ...ghostBtn, marginTop: 14 }}>{t("header.logout")}</button>
    </Sheet>
  );
}

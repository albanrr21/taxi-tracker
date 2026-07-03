"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { lbl, inp, primaryBtn } from "@/components/ui";

// Shown when Supabase fires PASSWORD_RECOVERY (user opened the reset link).
export default function UpdatePassword({ onDone }) {
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    if (password.length < 6) return;
    setBusy(true); setErr("");
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setErr(error.message);
    else onDone();
  }

  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ background: "var(--asphalt-2)", border: "1px solid var(--line)", borderRadius: 14, padding: 20 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--cream-dim)", marginBottom: 16 }}>
            {t("auth.reset.title").toUpperCase()}
          </div>
          <label style={lbl}>{t("auth.newPassword")}</label>
          <input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder={t("auth.passwordPh")} style={inp}
            onKeyDown={(e) => e.key === "Enter" && save()} />
          {err && <div style={{ marginTop: 12, fontSize: 12, color: "var(--rust)" }}>{err}</div>}
          <button onClick={save} disabled={busy} style={{ ...primaryBtn, marginTop: 18, opacity: busy ? 0.6 : 1 }}>
            {t("auth.updatePassword")}
          </button>
        </div>
      </div>
    </div>
  );
}

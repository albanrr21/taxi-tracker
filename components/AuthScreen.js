"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { lbl, inp, primaryBtn } from "@/components/ui";

export default function AuthScreen() {
  const { t } = useI18n();
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
        // Root's onAuthStateChange picks up the new session.
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) setInfo(t("auth.confirmEmail"));
      }
    } catch (e) {
      setErr(e.message || t("auth.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.2em", color: "var(--amber-dim)" }}>{t("brand")}</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 28, fontWeight: 700, color: "var(--amber)", textShadow: "0 0 18px rgba(255,182,39,0.3)", marginTop: 6 }}>
            €0.00
          </div>
          <div style={{ fontSize: 13, color: "var(--cream-dim)", marginTop: 4 }}>{t("auth.tagline")}</div>
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
                {m === "login" ? t("auth.login") : t("auth.signup")}
              </button>
            ))}
          </div>

          <label style={lbl}>{t("auth.email")}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("auth.emailPh")} style={inp} />

          <label style={{ ...lbl, marginTop: 12 }}>{t("auth.password")}</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder={t("auth.passwordPh")} style={inp}
            onKeyDown={(e) => e.key === "Enter" && submit()} />

          {err && <div style={{ marginTop: 12, fontSize: 12, color: "var(--rust)" }}>{err}</div>}
          {info && <div style={{ marginTop: 12, fontSize: 12, color: "var(--amber)" }}>{info}</div>}

          <button onClick={submit} disabled={busy}
            style={{ ...primaryBtn, marginTop: 18, opacity: busy ? 0.6 : 1 }}>
            {busy ? "…" : mode === "login" ? t("auth.startMeter") : t("auth.createAccount")}
          </button>
        </div>

        <div style={{ marginTop: 18, fontSize: 12, color: "var(--cream-dim)", textAlign: "center", lineHeight: 1.5 }}>
          {t("auth.trust")}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useI18n } from "@/lib/i18n";

// Thumb-reachable bottom tab bar. Home + Paydays switch screens; Settings
// opens the settings sheet.
export default function BottomNav({ tab, setTab, onOpenSettings }) {
  const { t } = useI18n();
  const items = [
    { key: "home", label: t("nav.home"), icon: "🚕", onClick: () => setTab("home") },
    { key: "paydays", label: t("nav.paydays"), icon: "💶", onClick: () => setTab("paydays") },
    { key: "settings", label: t("nav.settings"), icon: "⚙", onClick: onOpenSettings },
  ];
  return (
    <nav style={{
      position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: 520, display: "flex",
      background: "var(--asphalt-2)", borderTop: "1px solid var(--line)", zIndex: 40,
    }}>
      {items.map((it) => {
        const active = tab === it.key;
        return (
          <button key={it.key} onClick={it.onClick}
            style={{
              flex: 1, background: "transparent", border: "none", padding: "9px 0 11px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              color: active ? "var(--amber)" : "var(--cream-dim)",
            }}>
            <span style={{ fontSize: 18, opacity: active ? 1 : 0.7 }}>{it.icon}</span>
            <span style={{ fontSize: 10, fontFamily: "var(--mono)", letterSpacing: "0.05em" }}>{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

"use client";

// Shared style constants and small presentational primitives.
// Colors come from CSS variables defined in app/globals.css.

export const lbl = { display: "block", fontSize: 12, color: "var(--cream-dim)", marginBottom: 5 };
export const inp = {
  width: "100%", background: "var(--asphalt)", border: "1px solid var(--line)", borderRadius: 8,
  padding: "11px 12px", color: "var(--cream)", fontSize: 16, outline: "none", // ≥16px: iOS won't zoom on focus
};
export const bigInp = { ...inp, fontFamily: "var(--mono)", fontSize: 22, color: "var(--amber)", fontVariantNumeric: "tabular-nums" };
export const monoNum = { fontFamily: "var(--mono)", fontVariantNumeric: "tabular-nums" };

export const chipBtn = { background: "transparent", border: "1px solid var(--line)", color: "var(--cream-dim)", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontFamily: "var(--mono)" };
export const navBtn = { background: "transparent", border: "none", color: "var(--cream-dim)", fontSize: 22, padding: "2px 12px" };

export const primaryBtn = { width: "100%", padding: "14px 0", borderRadius: 10, border: "none", background: "var(--amber)", color: "var(--asphalt)", fontWeight: 800, fontSize: 15 };
export const ghostBtn = { width: "100%", padding: "13px 0", borderRadius: 10, border: "1px solid var(--line)", background: "transparent", color: "var(--cream)", fontWeight: 700, fontSize: 14 };
export const amberOutlineBtn = { padding: "0 18px", borderRadius: 8, border: "1px solid var(--amber)", background: "transparent", color: "var(--amber)", fontWeight: 700, fontFamily: "var(--mono)" };

const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", zIndex: 50 };
const sheetBase = { background: "var(--asphalt-2)", border: "1px solid var(--line)", width: "100%", maxWidth: 520, padding: 20, maxHeight: "88dvh", overflowY: "auto" };

export const card = { background: "var(--asphalt-2)", border: "1px solid var(--line)", borderRadius: 10, padding: 12 };

// Bottom sheet (default) or centered dialog (center=true).
export function Sheet({ onClose, children, center }) {
  return (
    <div style={{ ...overlay, alignItems: center ? "center" : "flex-end" }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={center
          ? { ...sheetBase, borderRadius: 16, width: "85%", maxWidth: 360 }
          : { ...sheetBase, borderRadius: "16px 16px 0 0", borderBottom: "none",
              paddingBottom: "calc(20px + env(safe-area-inset-bottom))" }}
      >
        {children}
      </div>
    </div>
  );
}

export function Toast({ children }) {
  return (
    <div style={{ position: "fixed", bottom: "calc(76px + env(safe-area-inset-bottom))", left: "50%", transform: "translateX(-50%)", background: "var(--asphalt-2)", border: "1px solid var(--amber)", color: "var(--cream)", padding: "10px 16px", borderRadius: 10, fontSize: 13, zIndex: 70, maxWidth: "90%", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
      {children}
    </div>
  );
}

export function Label({ children }) {
  return <div style={{ fontSize: 11, letterSpacing: "0.12em", color: "var(--amber-dim)", fontFamily: "var(--mono)" }}>{children}</div>;
}

export function Mini({ label, v, dimmed }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: "var(--amber-dim)", fontFamily: "var(--mono)", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ fontSize: 14, color: dimmed ? "var(--cream-dim)" : "var(--cream)", ...monoNum, marginTop: 2 }}>{v}</div>
    </div>
  );
}

export function Card({ label, v, accent }) {
  return (
    <div style={card}>
      <div style={{ fontSize: 10, color: "var(--cream-dim)" }}>{label}</div>
      <div style={{ fontSize: 15, marginTop: 4, color: accent ? "var(--amber)" : "var(--cream)", ...monoNum }}>{v}</div>
    </div>
  );
}

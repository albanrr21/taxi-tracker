"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  pad, parseISO, eur, round2, entryCut,
  earnedToDate, totalPaid, balanceState,
} from "@/lib/money";
import { Label, Mini, card, monoNum, navBtn, primaryBtn } from "@/components/ui";
import PaymentEditor from "@/components/PaymentEditor";

export default function Paydays({ store, showToast }) {
  const { t, months } = useI18n();
  const { entries, rates, payments } = store;

  const now = new Date();
  const [recYear, setRecYear] = useState(now.getFullYear());
  const [recMonth, setRecMonth] = useState(now.getMonth());
  const [editor, setEditor] = useState(null); // null | {} (new) | payment (edit)

  const earned = earnedToDate(entries, rates);
  const paid = totalPaid(payments);
  const bal = round2(earned - paid);
  const bs = balanceState(bal);
  const balText = bs.kind === "settled" ? t("balance.settled")
    : bs.kind === "owed" ? t("balance.owed", { amount: eur(bs.amount) })
    : t("balance.advanced", { amount: eur(bs.amount) });
  const balColor = bs.kind === "owed" ? "var(--amber)" : "var(--cream)";

  // Day-by-day reconciliation for the selected month.
  const recRows = useMemo(() => {
    const prefix = `${recYear}-${pad(recMonth + 1)}-`;
    const days = Object.values(entries)
      .filter((e) => e.work_date.startsWith(prefix))
      .sort((a, b) => (a.work_date < b.work_date ? -1 : 1));
    let cum = 0;
    return days.map((e) => {
      const cut = entryCut(e, rates);
      cum = round2(cum + cut);
      return { iso: e.work_date, gross: e.gross, cut, cum };
    });
  }, [entries, rates, recYear, recMonth]);

  function changeRecMonth(delta) {
    let m = recMonth + delta, y = recYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setRecMonth(m); setRecYear(y);
  }

  return (
    <div style={{ padding: 16, paddingBottom: 90 }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 14, letterSpacing: "0.08em", color: "var(--amber-dim)", marginBottom: 14 }}>
        {t("paydays.title").toUpperCase()}
      </div>

      {/* Balance summary */}
      <div style={{ ...card, padding: 16 }}>
        <div style={{ fontSize: 11, color: "var(--amber-dim)", fontFamily: "var(--mono)", letterSpacing: "0.1em" }}>
          {t("balance.label")}
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4, color: balColor, ...monoNum }}>{balText}</div>
        <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
          <Mini label={t("paydays.earned")} v={eur(earned, 0)} />
          <Mini label={t("paydays.received")} v={eur(paid, 0)} dimmed />
        </div>
      </div>

      <button onClick={() => setEditor({})} style={{ ...primaryBtn, marginTop: 14 }}>+ {t("paydays.add")}</button>

      {/* Payments list */}
      <div style={{ marginTop: 20 }}>
        {payments.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--cream-dim)", textAlign: "center", padding: "20px 0" }}>{t("paydays.empty")}</div>
        ) : (
          payments.map((p) => {
            const { d, m, y } = parseISO(p.paid_date);
            return (
              <button key={p.id} onClick={() => setEditor(p)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: "var(--asphalt-2)", border: "1px solid var(--line)", borderRadius: 10,
                  padding: "12px 14px", marginBottom: 8, textAlign: "left" }}>
                <div>
                  <div style={{ fontSize: 14, color: "var(--cream)", fontFamily: "var(--mono)" }}>{d} {months[m].slice(0, 3)} {y}</div>
                  {p.note && <div style={{ fontSize: 11, color: "var(--cream-dim)", marginTop: 2 }}>{p.note}</div>}
                </div>
                <div style={{ fontSize: 16, color: "var(--amber)", ...monoNum }}>{eur(p.amount)}</div>
              </button>
            );
          })
        )}
      </div>

      {/* Reconciliation */}
      <div style={{ marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <Label>{t("paydays.reconcile")}</Label>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button onClick={() => changeRecMonth(-1)} style={{ ...navBtn, fontSize: 18 }} aria-label="prev">‹</button>
            <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--cream-dim)" }}>{months[recMonth].slice(0, 3)} {recYear}</span>
            <button onClick={() => changeRecMonth(1)} style={{ ...navBtn, fontSize: 18 }} aria-label="next">›</button>
          </div>
        </div>

        {recRows.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--cream-dim)", padding: "12px 0" }}>—</div>
        ) : (
          <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 10 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--mono)", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
              <thead>
                <tr style={{ color: "var(--amber-dim)", textAlign: "right" }}>
                  <th style={{ ...th, textAlign: "left" }}>{t("rec.date")}</th>
                  <th style={th}>{t("rec.gross")}</th>
                  <th style={th}>{t("rec.cut")}</th>
                  <th style={th}>{t("rec.cumulative")}</th>
                </tr>
              </thead>
              <tbody>
                {recRows.map((r) => (
                  <tr key={r.iso} style={{ borderTop: "1px solid var(--line)", color: "var(--cream)" }}>
                    <td style={{ ...td, textAlign: "left", color: "var(--cream-dim)" }}>{Number(r.iso.slice(8))} {months[recMonth].slice(0, 3)}</td>
                    <td style={td}>{eur(r.gross, 0)}</td>
                    <td style={td}>{eur(r.cut, 0)}</td>
                    <td style={{ ...td, color: "var(--amber)" }}>{eur(r.cum, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editor && (
        <PaymentEditor
          payment={editor.id ? editor : null}
          onClose={() => setEditor(null)}
          store={store}
          showToast={showToast}
        />
      )}
    </div>
  );
}

const th = { padding: "8px 10px", fontWeight: 400, textAlign: "right", whiteSpace: "nowrap" };
const td = { padding: "7px 10px", textAlign: "right", whiteSpace: "nowrap" };

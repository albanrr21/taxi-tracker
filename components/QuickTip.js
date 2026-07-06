"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { round2, eur, todayISO, cleanAmount, parseAmount } from "@/lib/money";
import { bigInp, primaryBtn, Sheet } from "@/components/ui";

// One input, one tap: add a single tip to today and save immediately.
export default function QuickTip({ entries, onClose, upsertEntry, showToast }) {
  const { t } = useI18n();
  const [amt, setAmt] = useState("");
  const today = todayISO();
  const entry = entries[today];

  async function add() {
    const a = parseAmount(amt);
    if (!a) return;
    const gross = entry?.gross || 0;
    const newTips = round2((entry?.tips || 0) + a);
    onClose();
    const { error } = await upsertEntry(today, { gross, tips: newTips });
    if (error) showToast(t("err.tip"));
    else showToast(t("tip.added", { amount: eur(a) }));
  }

  return (
    <Sheet onClose={onClose}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--cream-dim)", marginBottom: 12 }}>
        {t("tip.for")}
      </div>
      <input type="text" inputMode="decimal" autoFocus value={amt}
        onChange={(e) => setAmt(cleanAmount(e.target.value))} placeholder="0" style={bigInp}
        onKeyDown={(e) => e.key === "Enter" && add()} />
      <button onClick={add} style={{ ...primaryBtn, marginTop: 16 }}>{t("add")}</button>
    </Sheet>
  );
}

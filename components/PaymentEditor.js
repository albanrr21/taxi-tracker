"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { todayISO, cleanAmount, parseAmount } from "@/lib/money";
import { lbl, inp, bigInp, primaryBtn, ghostBtn, Sheet } from "@/components/ui";

const dateInp = { ...inp, colorScheme: "dark", fontFamily: "var(--mono)" };

// Add or edit one payment (cash the company handed over).
export default function PaymentEditor({ payment, onClose, store, showToast }) {
  const { t } = useI18n();
  const editing = !!payment;
  const [amount, setAmount] = useState(payment ? String(payment.amount) : "");
  const [date, setDate] = useState(payment ? payment.paid_date : todayISO());
  const [note, setNote] = useState(payment?.note || "");

  async function save() {
    const amt = parseAmount(amount);
    if (!amt) return;
    onClose();
    const patch = { paid_date: date, amount: amt, note: note.trim() || null };
    const { error } = editing
      ? await store.updatePayment(payment.id, patch)
      : await store.addPayment(patch);
    if (error) showToast(t("err.save"));
  }

  async function remove() {
    onClose();
    const { error } = await store.deletePayment(payment.id);
    if (error) showToast(t("err.delete"));
  }

  return (
    <Sheet onClose={onClose}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--cream-dim)", marginBottom: 12 }}>
        {t("paydays.add").toUpperCase()}
      </div>

      <label style={lbl}>{t("paydays.amount")}</label>
      <input type="text" inputMode="decimal" autoFocus value={amount}
        onChange={(e) => setAmount(cleanAmount(e.target.value))} placeholder="0" style={bigInp} />

      <label style={{ ...lbl, marginTop: 12 }}>{t("paydays.date")}</label>
      <input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} style={dateInp} />

      <label style={{ ...lbl, marginTop: 12 }}>{t("paydays.note")}</label>
      <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("paydays.notePh")} style={inp} />

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        {editing && (
          <button onClick={remove} style={{ ...ghostBtn, flex: 1, color: "var(--rust)", borderColor: "var(--rust)" }}>
            {t("delete")}
          </button>
        )}
        <button onClick={save} style={{ ...primaryBtn, flex: 2 }}>{t("save")}</button>
      </div>
    </Sheet>
  );
}

"use client";

import { createContext, useContext, useEffect, useState } from "react";

export const LANGS = [
  { code: "sq", label: "Shqip" },
  { code: "sr", label: "Srpski" },
  { code: "en", label: "English" },
];
const DEFAULT_LANG = "sq";
const STORE_KEY = "tm_lang";

// Month + weekday names per language. Weekdays are Monday-first single letters.
const MONTHS = {
  sq: ["Janar","Shkurt","Mars","Prill","Maj","Qershor","Korrik","Gusht","Shtator","Tetor","Nëntor","Dhjetor"],
  sr: ["Januar","Februar","Mart","April","Maj","Jun","Jul","Avgust","Septembar","Oktobar","Novembar","Decembar"],
  en: ["January","February","March","April","May","June","July","August","September","October","November","December"],
};
const DOW = {
  sq: ["H","M","M","E","P","Sh","D"], // Hënë Martë Mërkurë Enjte Premte Shtunë Diel
  sr: ["P","U","S","Č","P","S","N"],
  en: ["M","T","W","T","F","S","S"],
};
const WEEKDAY_FULL = {
  sq: ["E hënë","E martë","E mërkurë","E enjte","E premte","E shtunë","E diel"],
  sr: ["Ponedeljak","Utorak","Sreda","Četvrtak","Petak","Subota","Nedelja"],
  en: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
};

const DICT = {
  sq: {
    brand: "TAKSIMETRI",
    loading: "PO NGARKOHET…",
    save: "Ruaj", done: "U krye", cancel: "Anulo", delete: "Fshij", clear: "Pastro",
    edit: "Ndrysho", add: "Shto", back: "Kthehu", close: "Mbyll", next: "Vazhdo",

    "auth.tagline": "Hyr për ta nisur matësin",
    "auth.login": "Hyr", "auth.signup": "Regjistrohu",
    "auth.email": "Email", "auth.password": "Fjalëkalimi",
    "auth.emailPh": "ti@shembull.com", "auth.passwordPh": "Së paku 6 karaktere",
    "auth.startMeter": "Nis matësin", "auth.createAccount": "Krijo llogari",
    "auth.confirmEmail": "Kontrollo email-in për ta konfirmuar llogarinë, pastaj hyr.",
    "auth.error": "Diçka shkoi keq.",
    "auth.trust": "Shënimet e tua janë vetëm të tuat — askush tjetër nuk i sheh.",
    "auth.forgot": "Harrove fjalëkalimin?",
    "auth.reset.title": "Rivendos fjalëkalimin",
    "auth.reset.send": "Dërgo linkun", "auth.reset.sent": "Të dërguam një link në email për ta ndryshuar fjalëkalimin.",
    "auth.reset.back": "Kthehu te hyrja",

    "nav.home": "Kryefaqja", "nav.paydays": "Pagesat", "nav.settings": "Cilësimet",
    "header.logout": "Dil",

    "settings.title": "Cilësimet", "settings.rate": "Përqindja jote", "settings.language": "Gjuha",
    "settings.saveRate": "Ruaj përqindjen", "settings.private": "Shënimet e tua i sheh vetëm ti.",
    "settings.currentRate": "Përqindja aktuale", "settings.changeRate": "Ndrysho përqindjen",
    "settings.effectiveFrom": "Vlen prej", "settings.rateHistory": "Historia e përqindjeve",
    "settings.rateNote": "Ditët e kaluara mbajnë përqindjen që ishte atëherë.",

    "paydays.title": "Pagesat", "paydays.add": "Shto pagesë", "paydays.amount": "Shuma (€)",
    "paydays.date": "Data", "paydays.note": "Shënim (opsional)", "paydays.notePh": "p.sh. pagesa e javës",
    "paydays.empty": "Ende s'ka pagesa të regjistruara.",
    "paydays.earned": "Fituar deri tani", "paydays.received": "Marrë",
    "paydays.reconcile": "Dita për ditë", "paydays.deletePayment": "Fshij pagesën",
    "rec.date": "Data", "rec.gross": "Bruto", "rec.cut": "Pjesa ime", "rec.cumulative": "Gjithsej borxh",

    "meter.takeHomeFull": "NË XHEP ({percent}% + BAKSHISH)",
    "meter.gross": "BRUTO", "meter.cut": "PJESA {percent}%", "meter.tips": "BAKSHISH", "meter.days": "DITË",

    "home.endShift": "Mbyll turnin", "home.addTip": "+ Bakshish",
    "home.startShift": "Nis turnin", "home.shiftSince": "Turni nisi në {time}",
    "home.calendarHint": "Numrat te ditët = sa ke marrë atë ditë",
    "home.month": "MUAJI",

    "balance.label": "LLOGARIA ME KOMPANINË",
    "balance.owed": "Kompania të ka borxh {amount}",
    "balance.settled": "Jeni në rregull — s'ka borxh",
    "balance.advanced": "Ke marrë {amount} paradhënie",

    "endShift.title": "Mbyll turnin",
    "endShift.grossQ": "Sa tregoi matësi sot?", "endShift.tipsQ": "Sa bakshish?",
    "endShift.date": "Data", "endShift.save": "Ruaj turnin",
    "endShift.saved": "U ruajt — {amount} në xhep sot",

    "tip.title": "Shto bakshish", "tip.added": "+{amount} bakshish u shtua",
    "tip.for": "Bakshish për sot",

    "day.gross": "Bruto nga matësi (€)", "day.tipsTotal": "Bakshishi gjithsej (€) — 100% yti",
    "day.addTip": "+ shto një bakshish", "day.tipHint": "Shtyp Shto sa herë merr bakshish — ruhet menjëherë.",
    "day.yourTake": "Ti merr:",

    "insights.title": "STATISTIKA",
    "insights.avgDay": "Mesatarja në ditë", "insights.bestDay": "Dita më e mirë",
    "insights.tipsShare": "Bakshishi ndaj të ardhurave",
    "insights.projected": "Parashikim për muajin", "insights.monthTotal": "Gjithsej për muajin",
    "insights.dailyTakeHome": "NË XHEP PËR DITË", "insights.cut": "Pjesa", "insights.tips": "Bakshish",

    "err.load": "S'u ngarkuan të dhënat.", "err.save": "Ruajtja dështoi — provo prapë.",
    "err.delete": "Fshirja dështoi — provo prapë.", "err.tip": "Bakshishi s'u shtua — provo prapë.",
  },

  sr: {
    brand: "TAKSIMETAR",
    loading: "UČITAVANJE…",
    save: "Sačuvaj", done: "Gotovo", cancel: "Otkaži", delete: "Obriši", clear: "Očisti",
    edit: "Izmeni", add: "Dodaj", back: "Nazad", close: "Zatvori", next: "Dalje",

    "auth.tagline": "Prijavi se da pokreneš taksimetar",
    "auth.login": "Prijava", "auth.signup": "Registracija",
    "auth.email": "Email", "auth.password": "Lozinka",
    "auth.emailPh": "ti@primer.com", "auth.passwordPh": "Najmanje 6 znakova",
    "auth.startMeter": "Pokreni taksimetar", "auth.createAccount": "Napravi nalog",
    "auth.confirmEmail": "Proveri email da potvrdiš nalog, pa se prijavi.",
    "auth.error": "Nešto je pošlo naopako.",
    "auth.trust": "Tvoji podaci su samo tvoji — niko drugi ih ne vidi.",
    "auth.forgot": "Zaboravio si lozinku?",
    "auth.reset.title": "Resetuj lozinku",
    "auth.reset.send": "Pošalji link", "auth.reset.sent": "Poslali smo ti link na email za promenu lozinke.",
    "auth.reset.back": "Nazad na prijavu",

    "nav.home": "Početna", "nav.paydays": "Isplate", "nav.settings": "Podešavanja",
    "header.logout": "Odjava",

    "settings.title": "Podešavanja", "settings.rate": "Tvoj procenat", "settings.language": "Jezik",
    "settings.saveRate": "Sačuvaj procenat", "settings.private": "Samo ti vidiš svoje beleške.",
    "settings.currentRate": "Trenutni procenat", "settings.changeRate": "Promeni procenat",
    "settings.effectiveFrom": "Važi od", "settings.rateHistory": "Istorija procenata",
    "settings.rateNote": "Prošli dani zadržavaju procenat koji je tada važio.",

    "paydays.title": "Isplate", "paydays.add": "Dodaj isplatu", "paydays.amount": "Iznos (€)",
    "paydays.date": "Datum", "paydays.note": "Napomena (opciono)", "paydays.notePh": "npr. nedeljna isplata",
    "paydays.empty": "Još nema isplata.",
    "paydays.earned": "Zarađeno do sad", "paydays.received": "Primljeno",
    "paydays.reconcile": "Dan po dan", "paydays.deletePayment": "Obriši isplatu",
    "rec.date": "Datum", "rec.gross": "Bruto", "rec.cut": "Moj deo", "rec.cumulative": "Ukupan dug",

    "meter.takeHomeFull": "U DŽEPU ({percent}% + NAPOJNICE)",
    "meter.gross": "BRUTO", "meter.cut": "DEO {percent}%", "meter.tips": "NAPOJNICE", "meter.days": "DANA",

    "home.endShift": "Završi smenu", "home.addTip": "+ Napojnica",
    "home.startShift": "Počni smenu", "home.shiftSince": "Smena traje od {time}",
    "home.calendarHint": "Brojevi na danima = koliko si zaradio taj dan",
    "home.month": "MESEC",

    "balance.label": "STANJE SA FIRMOM",
    "balance.owed": "Firma ti duguje {amount}",
    "balance.settled": "Izmireno — nema duga",
    "balance.advanced": "Dobio si {amount} avansa",

    "endShift.title": "Završi smenu",
    "endShift.grossQ": "Koliko je taksimetar pokazao danas?", "endShift.tipsQ": "Koliko napojnica?",
    "endShift.date": "Datum", "endShift.save": "Sačuvaj smenu",
    "endShift.saved": "Sačuvano — {amount} u džepu danas",

    "tip.title": "Dodaj napojnicu", "tip.added": "+{amount} napojnica dodata",
    "tip.for": "Napojnica za danas",

    "day.gross": "Bruto sa taksimetra (€)", "day.tipsTotal": "Napojnice ukupno (€) — 100% tvoje",
    "day.addTip": "+ dodaj napojnicu", "day.tipHint": "Pritisni Dodaj svaki put — odmah se čuva.",
    "day.yourTake": "Ti dobijaš:",

    "insights.title": "STATISTIKA",
    "insights.avgDay": "Prosek po danu", "insights.bestDay": "Najbolji dan",
    "insights.tipsShare": "Udeo napojnica",
    "insights.projected": "Projekcija za mesec", "insights.monthTotal": "Ukupno za mesec",
    "insights.dailyTakeHome": "U DŽEPU PO DANU", "insights.cut": "Deo", "insights.tips": "Napojnice",

    "err.load": "Podaci nisu učitani.", "err.save": "Čuvanje nije uspelo — probaj opet.",
    "err.delete": "Brisanje nije uspelo — probaj opet.", "err.tip": "Napojnica nije dodata — probaj opet.",
  },

  en: {
    brand: "TAXI METER",
    loading: "LOADING METER…",
    save: "Save", done: "Done", cancel: "Cancel", delete: "Delete", clear: "Clear",
    edit: "Edit", add: "Add", back: "Back", close: "Close", next: "Next",

    "auth.tagline": "Log in to start the meter",
    "auth.login": "Log in", "auth.signup": "Sign up",
    "auth.email": "Email", "auth.password": "Password",
    "auth.emailPh": "you@example.com", "auth.passwordPh": "At least 6 characters",
    "auth.startMeter": "Start the meter", "auth.createAccount": "Create account",
    "auth.confirmEmail": "Check your email to confirm your account, then log in.",
    "auth.error": "Something went wrong.",
    "auth.trust": "Your notes are yours alone — nobody else can see them.",
    "auth.forgot": "Forgot password?",
    "auth.reset.title": "Reset password",
    "auth.reset.send": "Send reset link", "auth.reset.sent": "We sent a reset link to your email.",
    "auth.reset.back": "Back to login",

    "nav.home": "Home", "nav.paydays": "Paydays", "nav.settings": "Settings",
    "header.logout": "Log out",

    "settings.title": "Settings", "settings.rate": "Your cut percentage", "settings.language": "Language",
    "settings.saveRate": "Save percentage", "settings.private": "Only you can see your notes.",
    "settings.currentRate": "Current rate", "settings.changeRate": "Change your percentage",
    "settings.effectiveFrom": "Effective from", "settings.rateHistory": "Rate history",
    "settings.rateNote": "Past days keep the percentage that applied back then.",

    "paydays.title": "Paydays", "paydays.add": "Add payment", "paydays.amount": "Amount (€)",
    "paydays.date": "Date", "paydays.note": "Note (optional)", "paydays.notePh": "e.g. weekly payment",
    "paydays.empty": "No payments logged yet.",
    "paydays.earned": "Earned to date", "paydays.received": "Received",
    "paydays.reconcile": "Day by day", "paydays.deletePayment": "Delete payment",
    "rec.date": "Date", "rec.gross": "Gross", "rec.cut": "My cut", "rec.cumulative": "Cumulative owed",

    "meter.takeHomeFull": "TAKE-HOME ({percent}% + TIPS)",
    "meter.gross": "GROSS", "meter.cut": "CUT {percent}%", "meter.tips": "TIPS", "meter.days": "DAYS",

    "home.endShift": "End shift", "home.addTip": "+ Tip",
    "home.startShift": "Start shift", "home.shiftSince": "Shift running since {time}",
    "home.calendarHint": "Numbers on days = your take-home for that day",
    "home.month": "MONTH",

    "balance.label": "ACCOUNT WITH COMPANY",
    "balance.owed": "Company owes you {amount}",
    "balance.settled": "You're settled up",
    "balance.advanced": "You're {amount} ahead",

    "endShift.title": "End shift",
    "endShift.grossQ": "What did the meter show today?", "endShift.tipsQ": "How much in tips?",
    "endShift.date": "Date", "endShift.save": "Save shift",
    "endShift.saved": "Saved — {amount} in your pocket today",

    "tip.title": "Add a tip", "tip.added": "+{amount} tip added",
    "tip.for": "Tip for today",

    "day.gross": "Gross fares (€)", "day.tipsTotal": "Tips total (€) — 100% yours",
    "day.addTip": "+ add a tip", "day.tipHint": "Tap Add each time you get a tip — it saves right away.",
    "day.yourTake": "Your take:",

    "insights.title": "INSIGHTS",
    "insights.avgDay": "Avg take-home / day", "insights.bestDay": "Best day",
    "insights.tipsShare": "Tips share of income",
    "insights.projected": "Projected take-home", "insights.monthTotal": "Month take-home",
    "insights.dailyTakeHome": "DAILY TAKE-HOME", "insights.cut": "Cut", "insights.tips": "Tips",

    "err.load": "Couldn't load entries.", "err.save": "Save failed — try again.",
    "err.delete": "Delete failed — try again.", "err.tip": "Couldn't add tip — try again.",
  },
};

const I18nCtx = createContext(null);

function interpolate(str, params) {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (k in params ? params[k] : `{${k}}`));
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(DEFAULT_LANG);

  useEffect(() => {
    const saved = typeof localStorage !== "undefined" && localStorage.getItem(STORE_KEY);
    if (saved && DICT[saved]) setLangState(saved);
  }, []);

  const setLang = (code) => {
    if (!DICT[code]) return;
    setLangState(code);
    try { localStorage.setItem(STORE_KEY, code); } catch {}
  };

  const t = (key, params) => {
    const table = DICT[lang] || DICT[DEFAULT_LANG];
    const str = table[key] ?? DICT.en[key] ?? key;
    return interpolate(str, params);
  };

  const value = {
    lang, setLang, t,
    months: MONTHS[lang] || MONTHS.en,
    dow: DOW[lang] || DOW.en,
    weekdaysFull: WEEKDAY_FULL[lang] || WEEKDAY_FULL.en,
  };
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

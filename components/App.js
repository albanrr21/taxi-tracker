"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { Toast } from "@/components/ui";
import AuthScreen from "@/components/AuthScreen";
import Home from "@/components/Home";
import Settings from "@/components/Settings";

function Loading() {
  const { t } = useI18n();
  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "var(--amber)", fontFamily: "var(--mono)", letterSpacing: "0.1em", fontSize: 13 }}>{t("loading")}</div>
    </div>
  );
}

function Authed({ session }) {
  const store = useStore(session.user.id);
  const [toast, setToast] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const seeded = useRef(false);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(""), 2500); };

  // Seed a default 30% rate for brand-new users so take-home isn't zero.
  useEffect(() => {
    if (!store.loading && store.rates.length === 0 && !seeded.current) {
      seeded.current = true;
      store.addRate("2000-01-01", 30);
    }
  }, [store.loading, store.rates.length, store]);

  return (
    <div style={{ minHeight: "100dvh", maxWidth: 520, margin: "0 auto" }}>
      <Home store={store} showToast={showToast} onOpenSettings={() => setSettingsOpen(true)} />
      {settingsOpen && <Settings store={store} onClose={() => setSettingsOpen(false)} />}
      {toast && <Toast>{toast}</Toast>}
    </div>
  );
}

function Root() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) return <Loading />;
  if (!session) return <AuthScreen />;
  return <Authed session={session} />;
}

export default function App() {
  return (
    <I18nProvider>
      <Root />
    </I18nProvider>
  );
}

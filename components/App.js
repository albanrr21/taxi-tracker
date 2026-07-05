"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { Toast } from "@/components/ui";
import AuthScreen from "@/components/AuthScreen";
import UpdatePassword from "@/components/UpdatePassword";
import Home from "@/components/Home";
import Paydays from "@/components/Paydays";
import Settings from "@/components/Settings";
import BottomNav from "@/components/BottomNav";

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
  const [tab, setTab] = useState("home");
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
    <div style={{ minHeight: "100dvh", maxWidth: 520, margin: "0 auto", paddingBottom: "calc(60px + env(safe-area-inset-bottom))" }}>
      {tab === "home" && <Home store={store} showToast={showToast} onOpenSettings={() => setSettingsOpen(true)} />}
      {tab === "paydays" && <Paydays store={store} showToast={showToast} />}

      <BottomNav tab={tab} setTab={setTab} onOpenSettings={() => setSettingsOpen(true)} />
      {settingsOpen && <Settings store={store} onClose={() => setSettingsOpen(false)} />}
      {toast && <Toast>{toast}</Toast>}
    </div>
  );
}

function Root() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
    });
    // PWA: offline fallback + static-asset caching (production only, so dev
    // never serves stale builds).
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) return <Loading />;
  if (recovering) return <UpdatePassword onDone={() => setRecovering(false)} />;
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

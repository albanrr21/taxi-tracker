/* Taxi Meter service worker.
   v2: full offline boot — the app shell ("/" plus the build assets it
   references) is precached, so the installed app opens and renders from the
   local mirror with no connection. Data writes made offline are queued by
   the app itself (lib/offline.js) and replayed on reconnect.
   Still NOT here (by design): background sync, push. */

const CACHE = "taksimetri-v2";
const STATIC = ["/offline.html", "/manifest.json", "/icon-192.png", "/icon-512.png"];

// Cache the app shell: the HTML of "/" and every build asset it references,
// so a first-visit install is already offline-capable.
async function cacheShell(c) {
  try {
    const res = await fetch("/", { cache: "no-cache" });
    if (!res.ok) return;
    const html = await res.clone().text();
    await c.put("/", res);
    const assets = [...new Set(html.match(/\/_next\/static\/[^"'\\ )>]+/g) || [])];
    await Promise.all(assets.map((u) => c.add(u).catch(() => {})));
  } catch { /* offline install — shell gets cached on the next online visit */ }
}

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then(async (c) => { await c.addAll(STATIC); await cacheShell(c); })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Never intercept cross-origin traffic (Supabase auth/data, fonts).
  if (url.origin !== self.location.origin) return;

  // Navigations: network first; keep the cached shell fresh on every success.
  // Offline: serve the cached shell (the SPA boots from its local mirror);
  // the offline page only appears if the shell was never cached.
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("/", copy));
        }
        return res;
      }).catch(async () =>
        (await caches.match("/")) || caches.match("/offline.html")
      )
    );
    return;
  }

  // Immutable build assets + icons/splash: cache first.
  const cacheable =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/splash/") ||
    url.pathname.startsWith("/icon-") ||
    url.pathname === "/manifest.json";
  if (cacheable) {
    e.respondWith(
      caches.open(CACHE).then(async (c) => {
        const hit = await c.match(e.request);
        if (hit) return hit;
        const res = await fetch(e.request);
        if (res.ok) c.put(e.request, res.clone());
        return res;
      })
    );
  }
});

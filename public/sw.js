/* Taxi Meter service worker — deliberately minimal.
   Scope: offline fallback page + cache-first static assets.
   NOT here (by design): write-queueing, background sync, push. Data writes
   stay online-only; a failed save rolls back and shows a toast in the app. */

const CACHE = "taksimetri-v1";
const PRECACHE = ["/offline.html", "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
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

  // Navigations: network first, branded offline page when the network is gone.
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(() => caches.match("/offline.html")));
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

// Service Worker: App-Hülle offline verfügbar, Daten immer frisch aus dem Netz.
const VERSION = "g2-v6";
const SHELL = ["./", "index.html", "styles.css", "app.js", "data.js", "i18n.js", "config.js", "vendor/supabase.js",
  "manifest.webmanifest", "icons/icon.svg", "icons/apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  // Netz zuerst (immer neueste Version), bei Funkloch aus dem Cache
  e.respondWith(fetch(e.request).then(r => {
    const copy = r.clone();
    caches.open(VERSION).then(c => c.put(e.request, copy));
    return r;
  }).catch(() => caches.match(e.request)));
});

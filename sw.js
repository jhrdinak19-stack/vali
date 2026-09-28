/* =====================================================================
   sw.js — the "service worker" (offline support)
   ---------------------------------------------------------------------
   Runs in the background. It keeps a copy of the app's files on the
   phone, so the app still opens without internet.

   Strategy: "network first". Get the newest file from the internet;
   if there's no signal, use the saved copy. That way your updates
   reach her as soon as she opens the app online.

   When you add a new file to the app, add it to FILES below too.
   ===================================================================== */

const CACHE = "vali-v3"; // keep this number the same as APP_VERSION in js/app.js
const FILES = [
  "./",
  "index.html",
  "manifest.json",
  "css/styles.css",
  "js/cycle.js",
  "js/storage.js",
  "js/personal.js",
  "js/themes.js",
  "js/logConfig.js",
  "js/dailyLog.js",
  "js/app.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
];

// On install: save all the files.
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
  self.skipWaiting();
});

// On activate: delete old caches from previous versions.
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

// On every request: try the network, fall back to the saved copy.
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

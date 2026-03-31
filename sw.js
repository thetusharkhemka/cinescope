/* ============================================================
   CINESCOPE — sw.js (Service Worker)
   PWA: caches app shell for offline access
   ============================================================ */

const CACHE_NAME    = "cinescope-v2";
const DYNAMIC_CACHE = "cinescope-dynamic-v2";

// App shell — files that must be available offline
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700;1,9..40,300&display=swap",
];

// ── INSTALL: pre-cache app shell ──────────────────────────
self.addEventListener("install", event => {
  console.log("[SW] Installing CineScope service worker...");
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("[SW] Caching app shell");
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE: clean up old caches ─────────────────────────
self.addEventListener("activate", event => {
  console.log("[SW] Activating...");
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== DYNAMIC_CACHE)
          .map(k => {
            console.log("[SW] Deleting old cache:", k);
            return caches.delete(k);
          })
      )
    )
  );
  self.clients.claim();
});

// ── FETCH: cache-first for shell, network-first for API ───
self.addEventListener("fetch", event => {
  const url = event.request.url;

  // TMDB API calls: network-first, fallback to cache
  if (url.includes("api.themoviedb.org")) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const cloned = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => cache.put(event.request, cloned));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // TMDB images: cache-first (images don't change)
  if (url.includes("image.tmdb.org")) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          const cloned = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => cache.put(event.request, cloned));
          return response;
        });
      })
    );
    return;
  }

  // App shell: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

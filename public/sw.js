// QuestBoard service worker.
//
// Strategy by request type:
//   - Static immutable assets (`/_next/static/`, /fonts/, /icons/,
//     /audio/, /models/, /textures/, /hdri/) → cacheFirst. These are
//     either hash-named or rarely change; cache-first keeps the app
//     fast and offline-capable.
//   - HTML navigations and the `?q=` invite route → networkFirst.
//     Falls back to cached `/` so a recipient who opens an old link
//     while offline at least sees the shell (the quest bundle lives
//     in the URL itself, so the page can hydrate from there).
//   - Cross-origin (Google Fonts CSS + woff2) → staleWhileRevalidate.
//     Don't block on the network but keep it fresh.
//   - Everything else → fall through to network.
//
// Cache name carries a version. Bump it whenever the strategy or the
// list of precached resources changes; old caches get cleaned on
// activate.

const CACHE = "questboard-v1";
const PRECACHE_URLS = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/icons/icon-maskable.svg",
];

const STATIC_PATH_PREFIXES = [
  "/_next/static/",
  "/fonts/",
  "/icons/",
  "/audio/",
  "/models/",
  "/textures/",
  "/hdri/",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  // Take over as soon as the new SW is installed — fine for an
  // app whose pages are stateless besides localStorage.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;

  // Google Fonts (or any other CORS GET) — stale-while-revalidate.
  if (!isSameOrigin) {
    if (
      url.host === "fonts.googleapis.com" ||
      url.host === "fonts.gstatic.com"
    ) {
      event.respondWith(staleWhileRevalidate(req));
    }
    return;
  }

  // Static immutable assets — cacheFirst.
  if (STATIC_PATH_PREFIXES.some((p) => url.pathname.startsWith(p))) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // HTML navigations — networkFirst with a cached "/" fallback.
  if (
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html")
  ) {
    event.respondWith(networkFirstHtml(req));
    return;
  }
});

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    if (cached) return cached;
    throw err;
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  const network = fetch(req)
    .then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);
  return cached || network || fetch(req);
}

async function networkFirstHtml(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    const cached = await cache.match(req);
    if (cached) return cached;
    // Last resort: serve the cached shell at "/" so the recipient at
    // least sees the app chrome — the bundle is in the URL anyway.
    const shell = await cache.match("/");
    if (shell) return shell;
    return new Response("Offline", { status: 503, statusText: "Offline" });
  }
}

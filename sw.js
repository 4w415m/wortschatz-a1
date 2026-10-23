/* Offline cache. Bump CACHE whenever any cached file changes. */
const CACHE = "wortschatz-a1-v13";
const FILES = [
  "./", "./index.html", "./manifest.webmanifest", "./apple-touch-icon.png",
  "./css/app.css",
  "./js/app.js", "./js/dom.js", "./js/router.js", "./js/config.js",
  "./js/categories.js", "./js/data.js", "./js/state.js", "./js/srs.js",
  "./js/conjugate.js", "./js/perfekt.js", "./js/sync.js",
  "./js/views/home.js", "./js/views/study.js", "./js/views/settings.js",
  "./data/nouns.json", "./data/verbs.json", "./data/adjectives.json",
  "./data/prepositions.json", "./data/function.json", "./data/other.json",
  "./data/legacy-ids.json",
];

/* cache:"reload" bypasses the HTTP cache. Without it a bumped CACHE can be
   filled from stale copies the browser is still holding, and the update
   silently ships the previous version's files. */
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: "reload" }))))
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
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  /* Sync traffic must never be served from, or written to, the offline cache. */
  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) =>
      hit || fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match("./index.html"))
    )
  );
});

// ─── Service Worker — SIMAPRAS PWA ───────────────────────────────────────────
// Minimal service worker untuk memenuhi kriteria installability Android Chrome
// (harus ada SW dengan fetch handler yang ter-register).
//
// Strategi:
//  - Navigasi (HTML pages): network-first, fallback ke cached "/" (offline →
//    shell tetap tampil).
//  - Aset statis & API: network-first, cache optional (tidak agresif supaya
//    data DB selalu segar).
//  - skipWaiting + clients.claim: SW baru langsung aktif tanpa menunggu
//    semua tab ditutup.
//
// File ini disajikan statis dari /sw.js (public folder) — JANGAN di-bundle
// oleh Next.js. Hanya vanilla JS browser-side.

const CACHE_VERSION = "simapras-v1";

self.addEventListener("install", (event) => {
  // Aktifkan SW baru segera tanpa menunggu SW lama unregister.
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.add("/").catch(() => {}))
  );
});

self.addEventListener("activate", (event) => {
  // Klaim semua client supaya SW aktif langsung di tab yang sudah terbuka.
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Bersihkan cache versi lama.
      caches.keys().then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
        )
      ),
    ])
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Hanya tangani GET (POST/PUT/PATCH biarkan ke network).
  if (req.method !== "GET") return;

  // Skip non-http(s) requests (chrome-extension, data:, blob:).
  const url = new URL(req.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  // Navigasi (HTML page request): network-first, fallback ke cached shell.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Cache salinan navigasi supaya offline bisa buka terakhir kali.
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match("/"))
        )
    );
    return;
  }

  // Aset lain (JS/CSS/img/api): network-first, fallback ke cache.
  // API (mis. /api/settings) tetap network-first supaya data DB selalu baru.
  event.respondWith(
    fetch(req)
      .then((res) => {
        // Hanya cache response OK & same-origin (jangan cache cross-origin /
        // opaque yang bisa memenuhi storage).
        if (res.ok && url.origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || Response.error()))
  );
});

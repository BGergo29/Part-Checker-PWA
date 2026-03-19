// ── Part Checker Service Worker ──────────────────────────────────────────
// Bumped to v3 to force re-install after Tesseract v2 migration.
const CACHE = ‘part-checker-v5’;

// App shell — cached immediately on install
const SHELL = [
‘./index.html’,
‘./manifest.json’,
‘./icon.svg’
];

// CDN assets pre-cached on install (best-effort — may fail if no internet
// on very first visit, but will be cached on subsequent online visits).
const CDN_PRECACHE = [
‘https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js’,
// Tesseract.js v5 UMD build — works as a plain <script> tag
‘https://cdn.jsdelivr.net/npm/tesseract.js@5.1.0/dist/tesseract.min.js’,
‘https://cdn.jsdelivr.net/npm/tesseract.js@5.1.0/dist/worker.min.js’,
‘https://cdn.jsdelivr.net/npm/tesseract.js@5.1.0/dist/tesseract-core-simd-lstm.wasm.js’
];

self.addEventListener(‘install’, e => {
e.waitUntil(
caches.open(CACHE).then(cache =>
cache.addAll(SHELL).then(() =>
// CDN files: best-effort (don’t block install if network is slow)
Promise.allSettled(CDN_PRECACHE.map(url => cache.add(url)))
)
).then(() => self.skipWaiting())
);
});

self.addEventListener(‘activate’, e => {
// Delete old cache versions
e.waitUntil(
caches.keys()
.then(keys => Promise.all(
keys.filter(k => k !== CACHE).map(k => caches.delete(k))
))
.then(() => self.clients.claim())
);
});

self.addEventListener(‘fetch’, e => {
// Cache-first strategy: serve from cache, fall back to network and cache result.
// Tesseract language data (tessdata.projectnaptha.com) and WASM files are
// automatically cached on first fetch so they work offline afterwards.
e.respondWith(
caches.match(e.request).then(cached => {
if (cached) return cached;

```
  return fetch(e.request).then(response => {
    // Only cache valid, non-opaque responses
    if (!response || response.status !== 200 || response.type === 'opaque') {
      return response;
    }
    const clone = response.clone();
    caches.open(CACHE).then(cache => cache.put(e.request, clone));
    return response;
  }).catch(() => {
    // Offline fallback for page navigations
    if (e.request.mode === 'navigate') {
      return caches.match('./index.html');
    }
  });
})
```

);
});
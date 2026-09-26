/* Lanckrietchess Training Hub service worker.
   Bump VERSION whenever you upload a new index.html so returning users get it. */
const VERSION = 'lc-hub-3.7.0';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'];
/* [url, mode]: the mode must match how index.html requests the file, or the cached copy is refused. */
const CDN = [
  ['https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js', 'no-cors'],
  ['https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js', 'no-cors'],
  ['https://cdnjs.cloudflare.com/ajax/libs/chessboard-js/1.0.0/chessboard-1.0.0.min.js', 'no-cors'],
  ['https://cdnjs.cloudflare.com/ajax/libs/chessboard-js/1.0.0/chessboard-1.0.0.min.css', 'no-cors'],
  ['https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css', 'cors']
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION)
    // One by one, so a missing icon can't break offline support.
    .then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => null))).then(() => Promise.all(CDN.map(([u, mode]) =>
      fetch(new Request(u, { mode, credentials: 'omit' })).then((res) => (res.ok || res.type === 'opaque') ? c.put(u, res) : null).catch(() => null)))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Pages and published data (content.json, or the extension-less "json" file Vercel serves from the
  // repository): network first, so a new upload is picked up; cached copy when offline.
  // v3.7: stored under the address without its query string. Every data request carries a fresh
  // ?v= (cache busting), and unlock links carry ?lc_token=: keyed by the full URL, each one would
  // pile up as a new cache entry (and a token would sit in the cache).
  // GitHub (raw and the API) and Lichess are not handled here: the hub keeps its own last good copy.
  if (req.mode === 'navigate' || (url.origin === location.origin && /(\.(html?|json)|\/json)$/.test(url.pathname))) {
    const key = url.origin + url.pathname;
    e.respondWith(fetch(req).then((res) => {
      if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(key, copy)); }
      return res;
    }).catch(() => caches.match(key, { ignoreSearch: true }).then((r) => r || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
    return;
  }
  // Libraries, fonts, icons and the Stockfish engine: cache first.
  const cacheable = url.origin === location.origin || /(^|\.)cdnjs\.cloudflare\.com$|(^|\.)fonts\.(googleapis|gstatic)\.com$|^cdn\.tailwindcss\.com$|(^|\.)chesscomfiles\.com$/.test(url.hostname);
  if (!cacheable) return;
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
    return res;
  })));
});

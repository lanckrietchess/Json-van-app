/* Lanckrietchess Training Hub: service worker (v6.1).
   Rules: the course data (content.json / json) is NEVER cached here: the hub does its own cache-busting and
   keeps its last good copy in localStorage. Pages are network-first (an update reaches players at once),
   with the cached page as an offline fallback. Icons and the manifest are cache-first. */
const CACHE = 'lc-shell-v61';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;              // GitHub, Lichess, Chess.com, the Arena server: untouched
  if (/(^|\/)(content\.json|json)$/.test(url.pathname) || url.search.indexOf('v=') >= 0) return;   // course data: always straight from the network
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('index.html', copy)).catch(() => {}); return res; }).catch(() => caches.match('index.html')));
    return;
  }
  if (/\/icons\/|manifest\.webmanifest$/.test(url.pathname)) e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});

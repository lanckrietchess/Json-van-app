/* Lanckrietchess Training Hub: service worker.
   v7.3 cache-busting rules:
   - VERSION below is the cache version. Bump it (and ?v= in CONFIG.pwa.serviceWorker / assetVersion in index.html) on every release.
   - install:  skipWaiting(), so the new worker never sits in "waiting".
   - activate: delete EVERY cache that is not the current one (caches.delete(key)), then clients.claim() so open tabs and the installed
               PWA are controlled by the new worker immediately. index.html then reloads once (see the registration code in index.html).
   - fetch:    own files are network-first (always the newest release when online, the cached copy when offline).
               Third-party libraries from cdnjs are version-pinned, so they are cached after the first load for offline use.
               Everything else (GitHub JSON, Supabase, the Arena server, fonts, analytics-free APIs) is never touched by this worker. */
const VERSION = 'v16';
const CACHE = 'lanckrietchess-hub-' + VERSION;
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png'];
const PINNED_HOSTS = ['cdnjs.cloudflare.com'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    /* one file at a time: a missing icon must not stop the worker from installing */
    await Promise.all(SHELL.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => {})));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));   // purge every older cache version
    await self.clients.claim();                                                                   // take over open tabs and the PWA now
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

async function networkFirst(request, fallbackKey) {
  const cache = await caches.open(CACHE);
  try {
    const fresh = await fetch(request, { cache: 'no-cache' });   // revalidate: never the browser's HTTP-cached copy
    if (fresh && fresh.ok && fresh.type === 'basic' && fresh.status === 200) cache.put(request, fresh.clone()).catch(() => {});
    return fresh;
  } catch (err) {
    const hit = await cache.match(request, { ignoreSearch: true });
    if (hit) return hit;
    if (fallbackKey) { const page = await cache.match(fallbackKey, { ignoreSearch: true }); if (page) return page; }
    throw err;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone()).catch(() => {});
  return res;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    if (request.headers.has('range')) return;                   // video / audio ranges go straight to the network
    event.respondWith(networkFirst(request, request.mode === 'navigate' ? 'index.html' : null));
    return;
  }
  if (PINNED_HOSTS.indexOf(url.hostname) >= 0) event.respondWith(cacheFirst(request));
});

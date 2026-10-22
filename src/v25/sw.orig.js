/* Lanckrietchess Training Hub: service worker.

   ONE version number. index.html registers this file as sw.js?v=X.Y.Z (CONFIG.pwa.serviceWorker). The worker reads that ?v= and
   names its cache after it, so a release is: bump X.Y.Z in three places (CONFIG.pwa.serviceWorker + CONFIG.assetVersion in
   index.html, the ?v= on the manifest and icon links) and in manifest.webmanifest. Nothing in this file needs editing.

   install   precache the app shell into the NEW cache, skipWaiting()
   activate  delete every cache except the current shell cache and the library cache, then clients.claim(); index.html reloads
             once when the new worker takes over (see the registration code in index.html)
   page      "/" and "/index.html": stale-while-revalidate. The installed app opens instantly from the cache, and a conditional
             request (ETag, usually a 304) refreshes the copy in the background.
   static    /icons/* and the manifest: cache-first, the ?v= in the URL is the cache key
   libs      version-pinned third-party files (cdnjs, jsDelivr @x.y.z, /engine/*): cache-first in a separate cache that survives
             releases, so a release never re-downloads jQuery, chess.js or the 7 MB Stockfish engine
   coach     lc-coach-*: the page's saved voice clips; the cleanup above leaves them alone
   never     content.json, /json, GitHub, Supabase, the Arena server, Lichess, fonts: not touched by this worker */
'use strict';
const V = new URL(self.location.href).searchParams.get('v') || 'dev';
const SHELL_CACHE = 'lc-shell-' + V;
const LIB_CACHE = 'lc-lib-v1';
const SCOPE = new URL(self.registration.scope).pathname;               // "/" in production
const SHELL = ['index.html', 'manifest.webmanifest?v=' + V, 'icons/icon-192.png?v=' + V, 'icons/icon-512.png?v=' + V, 'icons/icon-maskable-512.png?v=' + V, 'icons/apple-touch-icon.png?v=' + V];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    /* allSettled: one missing icon must not stop the worker from installing */
    await Promise.allSettled(SHELL.map((url) => cache.add(new Request(url, { cache: 'reload' }))));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL_CACHE, LIB_CACHE]);
    /* lc-coach-*: Coach Lanckriet's saved voice clips (written by the page, not by this worker). They survive releases so a clip is never paid for twice. */
    await Promise.all((await caches.keys()).filter((k) => !keep.has(k) && !k.startsWith('lc-coach-')).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

const cacheable = (res) => res && res.ok && (res.type === 'basic' || res.type === 'cors');

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (cacheable(res)) await cache.put(request, res.clone()).catch(() => {});
  return res;
}

async function page(event) {
  const cache = await caches.open(SHELL_CACHE);
  const hit = await cache.match('index.html');
  const refresh = fetch('index.html', { cache: 'no-cache' }).then(async (res) => {   // conditional request: a 304 costs almost nothing
    if (cacheable(res)) await cache.put('index.html', res.clone());
    return res;
  }).catch(() => null);
  if (hit) { event.waitUntil(refresh); return hit; }
  const fresh = await refresh;
  return fresh || new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title><body style="font:16px system-ui;background:#0f172a;color:#e2e8f0;padding:2rem"><p>You are offline. Open the Training Hub once with a connection and it will work offline afterwards.</p>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

const pinnedLib = (u) =>
  u.hostname === 'cdnjs.cloudflare.com' ||
  (u.hostname === 'cdn.jsdelivr.net' && /@\d+\.\d+\.\d+/.test(u.pathname));

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || request.headers.has('range')) return;       // video / audio ranges go straight to the network
  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    const p = url.pathname;
    if (request.mode === 'navigate' && (p === SCOPE || p === SCOPE + 'index.html')) { event.respondWith(page(event)); return; }
    if (p.startsWith(SCOPE + 'engine/')) { event.respondWith(cacheFirst(request, LIB_CACHE)); return; }
    if (p.startsWith(SCOPE + 'icons/') || p === SCOPE + 'manifest.webmanifest') { event.respondWith(cacheFirst(request, SHELL_CACHE)); return; }
    return;                                                                   // content.json, /json, sw.js, anything else: network
  }
  if (pinnedLib(url)) event.respondWith(cacheFirst(request, LIB_CACHE));
});

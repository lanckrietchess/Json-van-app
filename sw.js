/* Lanckriet Chess Training Hub: service worker (build 9.26.0, "network-first").

   ONE version number. app.html registers this file as sw.js?v=X.Y.Z (CONFIG.pwa.serviceWorker). The worker reads that ?v= and names its
   cache after it. A release is: bump X.Y.Z in app.html (CONFIG.pwa.serviceWorker, CONFIG.assetVersion, CONFIG.version, the ?v= on the
   manifest and icon links), in index.html (the ?v= links), in manifest.webmanifest and in version.json. Nothing in this file needs editing.

   Why network-first: until 9.25.0 the installed app opened app.html from the cache (stale-while-revalidate), so after a release people
   kept seeing the previous build until the second launch, and a stuck worker could hold an old build for days. Now:

   page      "/app.html" (any query: ?fresh=, ?source=pwa, ?ref=): ALWAYS asks Vercel first (a conditional request, so an unchanged
             build costs a 304). The cached copy is only used when there is no connection, or when the network has not answered
             within 8 seconds (the fresh copy is still stored for the next launch). "/" (the landing page) is never touched.
   install   precaches the app shell into the NEW cache, skipWaiting(): a new worker never waits behind an old one.
   activate  deletes EVERY cache except this build's shell, the pinned libraries, the asset cache and the page's own saved data
             (lc-coach-*: paid voice clips, lc-notes-*: saved MSPC notes), then clients.claim().
             app.html reloads once when the new worker takes over (see the registration code in app.html).
   static    /icons/* and the manifest: cache-first, the ?v= in the URL is the cache key.
   libs      version-pinned third-party files (cdnjs, jsDelivr @x.y.z, /engine/*): cache-first in a cache that survives releases,
             so a release never re-downloads jQuery, chess.js or the 7 MB Stockfish engine.
   assets    /assets/*: coach photos, help.json, help audio: opens from cache, refreshed in the background every time.
   push      server-sent Web Push: shows the coach's message (title, body, same-site link) and opens the app on tap.
   never     content.json, /json, version.json, sw.js, reset.html, GitHub, Supabase, the Arena server, Lichess, fonts. */
'use strict';
const V = new URL(self.location.href).searchParams.get('v') || 'dev';
const GEN = 'nf1';                                    /* network-first generation: a new name, so no shell cache from before 9.26.0 survives */
const SHELL_CACHE = 'lc-shell-' + GEN + '-' + V;
const LIB_CACHE = 'lc-lib-v1';
const ASSET_CACHE = 'lc-assets-v1';
const KEEP = new Set([SHELL_CACHE, LIB_CACHE, ASSET_CACHE]);
const KEEP_PREFIX = ['lc-coach-', 'lc-notes-'];       /* written by the page, not by this worker: user data, never thrown away */
const SCOPE = new URL(self.registration.scope).pathname;               // "/" in production
const APP = SCOPE + 'app.html';
const NET_TIMEOUT_MS = 8000;
const SHELL = ['app.html', 'manifest.webmanifest?v=' + V, 'icons/icon-192.png?v=' + V, 'icons/icon-512.png?v=' + V, 'icons/icon-maskable-512.png?v=' + V, 'icons/apple-touch-icon.png?v=' + V];

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
    const old = (await caches.keys()).filter((k) => !KEEP.has(k) && !KEEP_PREFIX.some((p) => k.startsWith(p)));
    await Promise.all(old.map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

const cacheable = (res) => res && res.ok && (res.type === 'basic' || res.type === 'cors' || res.type === 'default');

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (cacheable(res)) await cache.put(request, res.clone()).catch(() => {});
  return res;
}

const OFFLINE = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title><body style="font:16px system-ui;background:#0f172a;color:#e2e8f0;padding:2rem"><p>You are offline. Open the app once with a connection and it will work offline afterwards.</p>';

/* the app page: network first, cache only as a fallback */
async function page(event) {
  const cache = await caches.open(SHELL_CACHE);
  const net = fetch('app.html', { cache: 'no-cache' }).then(async (res) => {   // conditional request: a 304 costs almost nothing
    if (cacheable(res)) await cache.put('app.html', res.clone()).catch(() => {});
    return res && res.ok ? res : null;
  }).catch(() => null);
  event.waitUntil(net.then(() => {}));                                          // the fresh copy is always stored, even after a timeout
  let timer;
  const late = new Promise((resolve) => { timer = setTimeout(() => resolve('late'), NET_TIMEOUT_MS); });
  const first = await Promise.race([net, late]);
  clearTimeout(timer);
  if (first && first !== 'late') return first;
  const hit = await cache.match('app.html');
  if (hit) return hit;
  const fresh = first === 'late' ? await net : null;                           // nothing cached yet: wait for the network after all
  return fresh || new Response(OFFLINE, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

async function assetSwr(event, request) {
  const cache = await caches.open(ASSET_CACHE);
  const hit = await cache.match(request);
  const net = fetch(request).then(async (res) => {
    if (cacheable(res)) await cache.put(request, res.clone()).catch(() => {});   /* a 404 is never stored */
    return res;
  }).catch(() => null);
  if (hit) { event.waitUntil(net); return hit; }
  const res = await net;
  return res || new Response('', { status: 504 });
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
    if (request.mode === 'navigate' && p === APP) { event.respondWith(page(event)); return; }   // the APP. "/" is the landing page and always comes from the network
    if (p.startsWith(SCOPE + 'assets/')) { event.respondWith(assetSwr(event, request)); return; }
    if (p.startsWith(SCOPE + 'engine/')) { event.respondWith(cacheFirst(request, LIB_CACHE)); return; }
    if (p.startsWith(SCOPE + 'icons/') || p === SCOPE + 'manifest.webmanifest') { event.respondWith(cacheFirst(request, SHELL_CACHE)); return; }
    return;                                                                   // content.json, /json, sw.js, version.json, reset.html, anything else: network
  }
  if (pinnedLib(url)) event.respondWith(cacheFirst(request, LIB_CACHE));
});

/* ---- Web Push (coach messages, e.g. after a game). The server sends JSON {title, body, url, tag}. Only same-site links to the app are followed. ---- */
const safeUrl = (u) => {
  try { const x = new URL(String(u || ''), self.registration.scope); if (x.origin === self.location.origin && x.pathname === APP) return x.pathname + x.search + x.hash; } catch (e) {}
  return APP;
};

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { body: event.data ? event.data.text() : '' }; }
  const icon = new URL('icons/icon-192.png', self.registration.scope).href;
  event.waitUntil(self.registration.showNotification(String(d.title || 'Coach Lanckriet').slice(0, 80), {
    body: String(d.body || '').slice(0, 200), icon: icon, badge: icon, tag: String(d.tag || 'lc-coach').slice(0, 40), data: { url: safeUrl(d.url) }
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || safeUrl('');
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if (new URL(c.url).origin === self.location.origin && 'focus' in c) {
        await c.focus();
        if ('navigate' in c) { try { await c.navigate(url); } catch (e) {} }
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});

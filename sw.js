const CACHE_NAME = 'lanckrietchess-cache-v3.9.0';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html'
];

// Install Event: Cache de basisassets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event: Ruim oude caches op
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Bypass cache voor GitHub Raw of JSON bestanden (Network First), stuur de rest uit cache
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Als het om JSON bestanden of GitHub Raw gaat: ALTIJD direct van netwerk halen (geen cache)
  if (url.hostname.includes('raw.githubusercontent.com') || url.pathname.endsWith('.json')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() => {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Voor overige app assets: Standaard Cache Falling Back to Network
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

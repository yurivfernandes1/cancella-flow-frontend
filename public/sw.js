const CACHE_NAME = 'cancella-flow-v2';
const urlsToCache = [
  '/',
  '/manifest.json'
];

// Install event — tolerate missing resources to avoid blocking install
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(urlsToCache.map(async (url) => {
        try {
          const resp = await fetch(url, { cache: 'no-store' });
          if (resp && resp.ok) await cache.put(url, resp.clone());
        } catch (e) {
          // ignore individual failures
          console.warn('SW cache failed for', url, e && e.message);
        }
      }));
    })()
  );
});

// Fetch event — network-first for navigations, cache-first for others
self.addEventListener('fetch', (event) => {
  const req = event.request;
  // For navigation requests, try network then fallback to cache (SPA navigation)
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const networkResponse = await fetch(req);
        return networkResponse;
      } catch (err) {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match('/');
        return cached || new Response('<h1>Offline</h1>', { headers: { 'Content-Type': 'text/html' } });
      }
    })());
    return;
  }

  // For other requests, serve from cache first then network
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});

// Activate event — cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        })
      );
    })
  );
});
const CACHE_NAME = 'cancella-flow-v2';
const urlsToCache = [
  '/',
  '/manifest.json'
];

// Install event — tolerate missing resources to avoid blocking install
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      // Force the waiting service worker to become the active service worker
      // so updates can be applied immediately on installed devices.
      try {
        await self.skipWaiting();
      } catch (e) {
        // skipWaiting may not be necessary in some browsers
      }
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

  // Heurística: trate chamadas de API (JSON / endpoints do backend) como network-first
  const isApiRequest = (() => {
    try {
      const url = new URL(req.url);
      const path = url.pathname || '';
      const accept = (req.headers.get('accept') || '').toLowerCase();

      if (accept.includes('application/json')) return true;
      if (req.method && req.method !== 'GET') return true;
      if (path.startsWith('/api') || path.startsWith('/access') || path.startsWith('/cadastros') || path.startsWith('/media')) return true;
    } catch (e) {
      // se algo falhar no parse, não trate como API
    }
    return false;
  })();

  if (isApiRequest) {
    event.respondWith((async () => {
      try {
        const networkResponse = await fetch(req);
        return networkResponse;
      } catch (err) {
        // Se falhar, tente devolver do cache (se houver), senão resposta JSON de erro offline
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(req);
        if (cached) return cached;
        return new Response(JSON.stringify({ error: 'offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
      }
    })());
    return;
  }

  // Para os demais recursos (assets estáticos), estratégia cache-first
  event.respondWith(caches.match(req).then((cached) => cached || fetch(req)));
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

// Claim clients immediately after activation so pages are controlled
// by the newest service worker.
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      await self.clients.claim();
    } catch (e) {
      // ignore
    }
  })());
});

// Listen for messages from the page (e.g. to trigger skipWaiting)
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (event.data.type === 'CLEAR_CACHES') {
    event.waitUntil((async () => {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
        await self.registration.unregister();
        const clients = await self.clients.matchAll({ includeUncontrolled: true });
        clients.forEach((c) => c.postMessage({ type: 'CACHES_CLEARED' }));
      } catch (e) {
        console.warn('SW clear caches failed', e);
      }
    })());
  }
});
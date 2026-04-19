const CACHE_NAME = 'pxp-v2';
const RUNTIME_CACHE = 'pxp-runtime-v2';

// Core assets — sempre cacheamos o essencial. Ícones e fontes são best-effort.
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/calc.js',
  '/js/api.js',
  '/js/storage.js',
  '/js/app.js',
  '/manifest.json',
];

// Recursos opcionais: não quebram a instalação se não existirem (ex: PNGs ainda não gerados).
const OPTIONAL_ASSETS = [
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Install - cache all assets, tolerando falhas nos opcionais.
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_ASSETS);
    await Promise.allSettled(
      OPTIONAL_ASSETS.map((url) => cache.add(url))
    );
  })());
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => k !== CACHE_NAME && k !== RUNTIME_CACHE)
        .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

// Estratégia de fetch:
//  - BCB API: network-first, cai no cache se offline
//  - Google Fonts: stale-while-revalidate (cache runtime)
//  - Resto: cache-first com atualização em background
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  if (url.hostname === 'api.bcb.gov.br') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const fetchPromise = fetch(req)
          .then((res) => {
            if (res && res.status === 200) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Assets do próprio app: cache-first, preenche cache em miss.
  event.respondWith(
    caches.match(req).then((cached) => {
      return (
        cached ||
        fetch(req)
          .then((response) => {
            if (response && response.status === 200 && response.type === 'basic') {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
            }
            return response;
          })
          .catch(() => cached)
      );
    })
  );
});

/* DIPROCHIL PWA Service Worker (safe: no API caching) */

const CACHE_NAME = 'diprochil-static-v1';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png'
];

const API_PREFIXES = [
  '/auth',
  '/clients',
  '/vehicles',
  '/routes',
  '/pedidos',
  '/incidents',
  '/exports'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache API calls
  if (API_PREFIXES.some((p) => url.pathname.startsWith(p))) {
    event.respondWith(fetch(req));
    return;
  }

  // Navigations: network first, fallback to cached index
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(url.pathname === '/' ? '/index.html' : url.pathname, copy));
          return res;
        })
        .catch(() => caches.match(url.pathname).then((r) => r || caches.match('/index.html')))
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      });
    })
  );
});

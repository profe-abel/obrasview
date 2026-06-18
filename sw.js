const CACHE = 'obraview-v1';
const URLS = [
  '/',
  '/index.html',
  '/src/viewer.js',
  '/src/ifc-loader.js',
  '/src/app.js',
  '/src/properties-panel.js',
  '/src/tree-panel.js',
  '/src/tools.js',
  '/src/storage.js',
  '/lib/web-ifc-api-iife.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});

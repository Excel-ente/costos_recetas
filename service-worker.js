const CACHE_NAME = 'recetas-cache-v2.0';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './logo.png',
  './favicon.png',
  './manifest.json',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

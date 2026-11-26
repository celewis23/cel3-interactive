const CACHE_PREFIX = 'project-bounce-';
const CACHE = `${CACHE_PREFIX}v1`;
const ROOT = '/projectbounce/';
const FILES = ['index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'].map(file => ROOT + file);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(ROOT)) return;

  // Refresh online; fall back only to this app's cache when offline.
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok && (FILES.includes(url.pathname) || event.request.mode === 'navigate')) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request.mode === 'navigate' ? ROOT + 'index.html' : url.pathname, copy)));
    }
    return response;
  }).catch(async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(event.request.mode === 'navigate' ? ROOT + 'index.html' : url.pathname);
    return cached || Response.error();
  }));
});

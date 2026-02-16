const CACHE_NAME = 'nerithys-v1';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/main.js',
  '/js/ui.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  // network-first for html, cache-first for others
  const req = event.request;
  if(req.method !== 'GET') return;
  if(req.destination === 'document'){
    event.respondWith(fetch(req).catch(()=>caches.match('/index.html')));
    return;
  }
  event.respondWith(caches.match(req).then(r => r || fetch(req).then(res => {
    const copy = res.clone();
    caches.open(CACHE_NAME).then(cache=>{ cache.put(req, copy); });
    return res;
  }).catch(()=>caches.match(req))));
});

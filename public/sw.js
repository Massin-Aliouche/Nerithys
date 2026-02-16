const CACHE_VERSION = 'v2';
const CACHE_NAME = `nerithys-${CACHE_VERSION}`;
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/main.js',
  '/js/ui.js'
];

self.addEventListener('install', event => {
  event.waitUntil((async ()=>{
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE_URLS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async ()=>{
    // delete old caches not matching current version
    const keys = await caches.keys();
    await Promise.all(keys.map(k => { if(k !== CACHE_NAME) return caches.delete(k); }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if(req.method !== 'GET') return;

  // network-first for navigation
  if(req.mode === 'navigate' || req.destination === 'document'){
    event.respondWith(fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
      return res;
    }).catch(()=>caches.match('/index.html')));
    return;
  }

  // images: stale-while-revalidate
  if(req.destination === 'image'){
    event.respondWith(caches.match(req).then(async cached => {
      const network = fetch(req).then(res=>{
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c=>c.put(req, copy));
        return res;
      }).catch(()=>null);
      return cached || network;
    }));
    return;
  }

  // other assets: cache-first then network
  event.respondWith(caches.match(req).then(r => r || fetch(req).then(res=>{
    const copy = res.clone();
    caches.open(CACHE_NAME).then(cache=>cache.put(req, copy));
    return res;
  }).catch(()=>caches.match(req))));
});

self.addEventListener('message', event => {
  if(!event.data) return;
  if(event.data === 'skipWaiting') return self.skipWaiting();
  if(event.data === 'clearCaches'){
    event.waitUntil((async ()=>{
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    })());
  }
});

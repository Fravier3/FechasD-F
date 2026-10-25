const CACHE = 'fechasdf-shell-1.0.2';
const FILES = ['./','./index.html','./styles.css?v=1.0.2','./app.js?v=1.0.2','./core.js','./config.js','./manifest.webmanifest','./icon-180.png','./icon-192.png','./icon-512.png'];
self.addEventListener('install', event => {event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));});
self.addEventListener('activate', event => {event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key=>key.startsWith('fechasdf-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method!=='GET' || url.origin!==self.location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  if(url.pathname.endsWith('/version.json')){event.respondWith(fetch(event.request,{cache:'no-store'}));return;}
  event.respondWith(fetch(event.request,{cache:'no-cache'}).then(response=>{if(response.ok){const clone=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,clone)));}return response;}).catch(async()=>{
    const cache=await caches.open(CACHE);
    return await cache.match(event.request) || (event.request.mode==='navigate'?await cache.match('./index.html'):undefined) || Response.error();
  }));
});

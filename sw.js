// Network-first and revalidated: fresh when online, cached copy only when offline.
const CACHE='life-tracker-v3';
const CACHEABLE=[location.origin,'https://cdn.jsdelivr.net','https://fonts.googleapis.com','https://fonts.gstatic.com'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['./','manifest.json','icon-192.png'])));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET'||!CACHEABLE.some(o=>req.url.startsWith(o)))return;
  // no-cache: always revalidate with the server, so a new version shows on the next load
  // (GitHub Pages lets the browser reuse a page for up to 10 minutes otherwise).
  e.respondWith(fetch(req,{cache:'no-cache'}).then(res=>{
    if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));}
    return res;
  }).catch(()=>caches.match(req,{ignoreSearch:true}).then(r=>r||caches.match('./'))));
});

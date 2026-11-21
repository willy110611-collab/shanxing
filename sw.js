// 撅梯?撠摮??Ｙ?敹怠???撘?????雯頝胯仃???典翰???隞交?唳?擐砌???嚗璅?蝷箏??敹怠???const CACHE = 'shanxing-v6';
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const heavy = /\/(audio|icons|art)\//.test(req.url);
  if (heavy) {
    e.respondWith(caches.open(CACHE).then(c => c.match(req).then(hit => hit || fetch(req).then(res => { if (res.ok && res.status === 200) c.put(req, res.clone()); return res; }))));
  } else {
    e.respondWith(fetch(req).then(res => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return res; }).catch(() => caches.match(req)));
  }
});

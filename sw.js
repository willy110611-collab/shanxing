// 山行小日子：離線快取。程式與頁面「先抓網路、失敗才用快取」，所以更新會馬上生效；音樂圖示則先用快取。
const CACHE = 'shanxing-v25';
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const heavy = /\/(audio|icons|art)\//.test(req.url) && !/manifest\.json/.test(req.url);
  if (heavy) {
    e.respondWith(caches.open(CACHE).then(c => c.match(req).then(hit => hit || fetch(req).then(res => { if (res.ok && res.status === 200) c.put(req, res.clone()); return res; }))));
  } else {
    e.respondWith(fetch(req).then(res => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return res; }).catch(() => caches.match(req)));
  }
});
// 推播：伺服器只負責叫醒（不帶內容），這裡用自己的訂閱網址去拿通知內容再顯示
importScripts('js/config.js');
self.addEventListener('push', e => {
  e.waitUntil((async () => {
    let notes = [];
    try { const sub = await self.registration.pushManager.getSubscription(); if (sub) notes = (await (await fetch(self.SX_API + '/push/pending?e=' + encodeURIComponent(sub.endpoint))).json()).notes || []; } catch (x) {}
    if (!notes.length) notes = [{ title: '山行小日子', body: '山上有新消息，打開看看吧。' }];
    for (const n of notes) await self.registration.showNotification(n.title, { body: n.body, tag: n.tag || undefined, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' });
  })());
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => { for (const w of ws) if ('focus' in w) return w.focus(); return clients.openWindow('./'); }));
});

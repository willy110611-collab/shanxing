// 山行小日子：離線快取。程式與頁面「先抓網路、失敗才用快取」，所以更新會馬上生效；音樂圖示則先用快取。
// 兩個快取：CACHE 放程式和頁面，每次改版換新名字；ART_CACHE 放美術圖和聲音，名字永遠不變，改版也不清掉，
// 玩家只會下載有換過的圖和新圖（美術圖網址帶 ?v=檔案指紋，圖換了網址才會變）。
const CACHE = 'shanxing-v86';
const ART_CACHE = 'shanxing-art';
const isArt = u => /\/(audio|art)\//.test(u.pathname) && !/manifest\.json$/.test(u.pathname);
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== ART_CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()).then(() => pruneArt().catch(() => {})));   // 先接手畫面，整理快取慢慢做，網路慢也不會卡住
});
// 美術快取整理：art/ 只留這一版 manifest 還列著的網址（刪掉的圖、舊版的圖清掉）；
// 聲音網址沒有版本號，改版時用 HEAD（不下載內容）問伺服器檔案有沒有換，換了才清掉、下次用到再下載
async function pruneArt(){
  const c = await caches.open(ART_CACHE), keys = await c.keys();
  const list = await (await fetch('art/manifest.json', { cache:'no-store' })).json();
  const keep = new Set(list.map(it => new URL('art/' + it.file + '?v=' + it.v, self.registration.scope).href));
  await Promise.all(keys.map(async req => {
    const u = new URL(req.url);
    if (/\/art\//.test(u.pathname)) { if (!keep.has(u.href)) await c.delete(req); return; }
    const old = await c.match(req), head = await fetch(req.url, { method:'HEAD', cache:'no-store' });
    if (!old || !head.ok) return;
    const tag = r => r.headers.get('etag') || r.headers.get('last-modified') || r.headers.get('content-length');
    if (tag(head) && tag(head) !== tag(old)) await c.delete(req);
  }));
}
// 存新的一張圖時，同一個檔案的舊版本（?v= 不同）一起清掉
async function putArt(c, req, res){
  const u = new URL(req.url);
  await c.put(req, res);
  for (const k of await c.keys()) { const ku = new URL(k.url); if (ku.pathname === u.pathname && ku.href !== u.href) await c.delete(k); }
}
self.addEventListener('fetch', e => {
  const req = e.request, u = new URL(req.url);
  if (req.method !== 'GET' || u.origin !== location.origin) return;
  if (isArt(u)) {
    e.respondWith(caches.open(ART_CACHE).then(c => c.match(req).then(hit => hit || fetch(req).then(res => { if (res.ok && res.status === 200) putArt(c, req, res.clone()).catch(() => {}); return res; }))));
  } else if (/\/icons\//.test(u.pathname)) {
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
    for (const n of notes) await self.registration.showNotification(n.title, { body: n.body, tag: n.tag || undefined, icon: 'icons/shiba-192.png', badge: 'icons/shiba-192.png' });
  })());
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => { for (const w of ws) if ('focus' in w) return w.focus(); return clients.openWindow('./'); }));
});

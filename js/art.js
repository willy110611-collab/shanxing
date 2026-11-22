// 山行小日子：Gemini 美術素材載入
// art/manifest.json 由 art/process.ps1 自動產生，列出已處理好的圖（例如 "tree_pine.png"）。
// 畫面程式用 SX.art.get('名字') 拿圖；圖還沒到就回 null，畫面照舊用程式畫。
// 去背的圖會自動裁掉四周透明處；檔名以 _walk 結尾的是四格連續動作，會切成 4 格並對齊腳底。
(function(){
'use strict';
const SX = window.SX = window.SX || {};
const A = SX.art = {};
const lib = {};            // 名字 → { img, w, h, frames:[{x,y,w,h}] }
const listeners = [];
let loaded = false;

// 掃描不透明範圍（alpha > 24）：d 是整張圖（寬 W）的像素，掃 (x0, y0) 起 w×h 這一塊（直接用去背時讀出來的像素，不再讀一次畫布）
function bounds(d, W, x0, y0, w, h){
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) { const row = ((y0 + y) * W + x0) * 4 + 3; for (let x = 0; x < w; x++) {
    if (d[row + x * 4] > 24) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  } }
  return maxX < 0 ? null : { x:x0 + minX, y:y0 + minY, w:maxX - minX + 1, h:maxY - minY + 1 };
}
// 清掉洋紅殘邊：Gemini 的洋紅底常常不是純 #FF00FF，邊緣會留一圈粉紅
function despill(g, w, h){
  const im = g.getImageData(0, 0, w, h), d = im.data, mg = i => Math.min(d[i], d[i + 2]) - d[i + 1];
  // 把一個帶洋紅的像素：紅、藍往綠拉（去粉紅），並變得較透明
  const despix = (i, m) => { const k = Math.min(1, (m - 25) / 85), gg = d[i + 1]; d[i] -= (d[i] - gg) * k * 0.8; d[i + 2] -= (d[i + 2] - gg) * k * 0.8; d[i + 3] *= 1 - k * 0.7; };
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] && mg(i) > 110 && Math.abs(d[i] - d[i + 2]) < 90) d[i + 3] = 0;   // 幾乎是洋紅：直接透明
  // 貼著透明處的邊緣像素，往內剝三圈
  for (let pass = 0; pass < 3; pass++) {
    const a0 = new Uint8Array(w * h); for (let p = 0; p < w * h; p++) a0[p] = d[p * 4 + 3];
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const p = y * w + x, i = p * 4; if (!a0[p] || (a0[p - 1] && a0[p + 1] && a0[p - w] && a0[p + w])) continue;
      const m = mg(i); if (m > 25) despix(i, m);
    }
  }
  // 紅藍差不多、明顯高於綠的「洋紅混色」：不管在不在邊緣都清（粉紅杜鵑紅遠大於藍，不會被動到）
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] && Math.abs(d[i] - d[i + 2]) < 50) { const m = mg(i); if (m > 40) despix(i, m); }
  g.putImageData(im, 0, 0);
  return d;
}
// 處理完的圖轉成 ImageBitmap 再拿去畫，處理用的畫布馬上釋放：
// 去背用的「常常讀像素」畫布放在 CPU 記憶體，直接拿來畫的話，每格都要把整張圖重新傳給顯示晶片（登山客、地圖每格都在畫）
// 不支援 createImageBitmap 的舊瀏覽器照舊用畫布
function toBitmap(c){
  if (typeof createImageBitmap !== 'function') return Promise.resolve(c);
  return createImageBitmap(c).then(b => { c.width = c.height = 0; return b; }, () => c);
}
function prep(name, img){
  const opaque = /\.jpg$/i.test(name.file);
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext('2d', { willReadFrequently:true }); g.drawImage(img, 0, 0);
  if (opaque) { const e = { img:c, w:c.width, h:c.height, frames:[{ x:0, y:0, w:c.width, h:c.height }], opaque }; return toBitmap(c).then(b => { e.img = b; return e; }); }
  const e = { img:c, w:c.width, h:c.height, frames:[], opaque };
  const px = despill(g, c.width, c.height);
  const n = /_walk$/.test(name.id) ? 4 : 1, cw = Math.floor(c.width / n);
  const fr = [];
  for (let i = 0; i < n; i++) fr.push(bounds(px, c.width, i * cw, 0, cw, c.height) || { x:i * cw, y:0, w:cw, h:c.height });
  // 多格動作：每格用同樣的寬高（取最大），以各自的腳底中心對齊，走路時才不會忽大忽小
  if (n > 1) {
    const W = Math.max.apply(null, fr.map(f => f.w)), H = Math.max.apply(null, fr.map(f => f.h));
    fr.forEach((f, i) => { const cx = f.x + f.w / 2, by = f.y + f.h; f.x = Math.round(clampN(cx - W / 2, i * cw, (i + 1) * cw - W)); f.y = Math.max(0, by - H); f.w = W; f.h = by - f.y; });
  }
  e.frames = fr;
  return toBitmap(c).then(b => { e.img = b; return e; });
}
function clampN(v, a, b){ return b < a ? a : Math.max(a, Math.min(b, v)); }

A.get = function(id){ const e = lib[id]; return e && !e.lazy ? e : null; };   // 用到才下載的插圖不能畫在畫布上
// 給 HTML 用的圖片網址（背包、寵物選擇等）；沒有這張圖回 null
// 去背圖用「裁掉透明邊、清過洋紅殘邊」的版本（第一次用到才產生），不然格子裡的圖會很小、還帶粉紅邊
const urls = {}, trimmed = {};
const OUT = (() => { try { const c = document.createElement('canvas'); c.width = c.height = 1; return c.toDataURL('image/webp').startsWith('data:image/webp') ? 'image/webp' : 'image/png'; } catch (e) { return 'image/png'; } })();
A.url = function(id){
  const e = lib[id]; if (!e || !urls[id]) return null;
  if (e.opaque) return urls[id];
  if (!trimmed[id]) { const c = A.crop(id, 0); trimmed[id] = c.toDataURL(OUT, 0.9); c.width = c.height = 0; }   // 暫用的畫布馬上釋放
  return trimmed[id];
};
// 有圖就回 <img>，沒有就回 fallback（原本程式畫的 SVG）
A.img = function(id, fallback, cls){ const u = A.url(id); return u ? `<img class="${cls || 'artImg'}" src="${u}" alt="" draggable="false">` : fallback; };
A.has = function(id){ return !!lib[id]; };
A.ready = function(){ return loaded; };
// 圖到了之後通知畫面重建（例如步道的樹、石頭貼圖）
A.onLoad = function(fn){ listeners.push(fn); if (loaded && Object.keys(lib).length) fn(); };
// 開場讀取畫面用：whenReady 在圖全部處理完（或沒有圖、清單讀不到）時呼叫一次；onProgress(已完成, 總數)
const readyFns = [], progFns = []; let prog = [0, 0];
A.whenReady = function(fn){ if (loaded) fn(); else readyFns.push(fn); };
A.onProgress = function(fn){ progFns.push(fn); fn(prog[0], prog[1]); };
function setProg(d, t){ prog = [d, t]; progFns.forEach(fn => { try { fn(d, t); } catch (e) {} }); }
function finish(){ loaded = true; readyFns.splice(0).forEach(fn => { try { fn(); } catch (e) {} }); }
// 套了濾鏡（例如換衣服色調的 hue-rotate）的整張圖：第一次用到才做一張存起來
// 每次畫都在畫布上設 ctx.filter 在手機上非常慢（整塊畫面都要多算一次）
function filtered(e, fl){
  const fx = e.fx || (e.fx = {});
  if (!fx[fl]) { const c = document.createElement('canvas'); c.width = e.img.width; c.height = e.img.height; const g = c.getContext('2d'); g.filter = fl; g.drawImage(e.img, 0, 0); fx[fl] = c; }
  return fx[fl];
}
// 給別的畫面用：某張圖套了濾鏡的版本（例如地圖上還不能爬的山路標褪色）；沒有這張圖回 null
A.filtered = function(id, fl){ const e = lib[id]; return e && !e.lazy ? filtered(e, fl) : null; };
// 把某一格畫到 ctx：(cx, by) 是腳底中心，h 是要畫的高度（像素）；fl：要套的濾鏡（可省略）
A.drawFrame = function(ctx, id, i, cx, by, h, flip, fl){
  const e = lib[id]; if (!e) return false;
  const f = e.frames[((i % e.frames.length) + e.frames.length) % e.frames.length], w = h * f.w / f.h, img = fl ? filtered(e, fl) : e.img;
  if (flip) { ctx.save(); ctx.translate(cx, 0); ctx.scale(-1, 1); ctx.drawImage(img, f.x, f.y, f.w, f.h, -w / 2, by - h, w, h); ctx.restore(); }
  else ctx.drawImage(img, f.x, f.y, f.w, f.h, cx - w / 2, by - h, w, h);
  return true;
};
// 把第一格裁成單獨一張 canvas（給需要整張圖的地方）
A.crop = function(id, i){
  const e = lib[id]; if (!e) return null;
  const f = e.frames[i || 0], c = document.createElement('canvas'); c.width = f.w; c.height = f.h;
  c.getContext('2d').drawImage(e.img, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
  return c;
};

function load(){
  fetch('art/manifest.json', { cache:'no-cache' }).then(r => r.ok ? r.json() : []).catch(() => []).then(list => {
    if (!Array.isArray(list) || !list.length) { finish(); return; }
    // lazy：只在卡片上顯示的大插圖（奇遇、登頂），開遊戲時不下載，<img> 顯示時瀏覽器才去拿
    list.filter(it => it.lazy).forEach(it => { const id = it.file.replace(/\.[a-z]+$/i, ''); lib[id] = { img:null, w:0, h:0, frames:[], opaque:true, lazy:true }; urls[id] = 'art/' + it.file + '?v=' + it.v; });
    const todo = list.filter(it => !it.lazy); let done = 0; setProg(0, todo.length);
    return Promise.all(todo.map(it => new Promise(res => {
      const file = it.file, id = file.replace(/\.[a-z]+$/i, ''), img = new Image();
      const u = 'art/' + file + '?v=' + it.v;      // v 是檔案修改時間：圖換新，網址就變，快取不會卡舊圖
      const end = () => { setProg(++done, todo.length); res(); };
      img.onload = () => { let p; try { p = prep({ id, file }, img); } catch (e) { end(); return; }
        p.then(e => { lib[id] = e; e.fit = it.fit || null; urls[id] = u; }, () => {}).then(end); };   // fit：立體地圖的對齊結果（tools/mapfit.js）
      img.onerror = end;
      img.src = u;
    }))).then(() => { listeners.forEach(fn => { try { fn(); } catch (e) {} }); finish(); });   // 先讓各畫面換上美術圖，再收起讀取畫面
  });
}
load();
})();

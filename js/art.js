// 山行小日子：Gemini 美術素材載入
// art/manifest.json 由 art/process.ps1 自動產生，列出已處理好的圖（例如 "tree_pine.png"）。
// 畫面程式用 SX.art.get('名字') 拿圖；圖還沒到就回 null，畫面照舊用程式畫。
// 去背的圖會自動裁掉四周透明處；多格連續動作（走路、爬階梯、小跳）照下面 SHEETS 表切格並對齊腳底。
(function(){
'use strict';
const SX = window.SX = window.SX || {};
const A = SX.art = {};
let loaded = false;
// 多格動作圖怎麼切：名字符合哪一條就切成 欄 × 列 格（由左到右、上排再下排）。新的動作圖只改這張表
// air：有跳起來的格子（hiker_hop4）：每格保留離地的高度、不把腳底拉到同一條線；畫的高度以最後一格（站直）為準
// order：Gemini 畫的格子順序不對（左右腳沒輪流）時，播放順序照這串（0 起算的原圖格號；~i 是第 i 格左右鏡射）
// hiker_walk16 原圖左右腳不平均（左腳在前只有 4 格、右腳在前 12 格）：量了每格兩腳的前後差，挑出「左腳在前 → 右腳跨到最前」的 8 格照順序排，
// 後半步用同樣 8 格左右鏡射（~i 表示第 i 格鏡射）。原圖沒有兩腳並排那一格，換腳時會跳一下：要畫一張只有「一步」8 格、含兩腳並排的圖才會順
const WALK16 = [0, 5, 1, 2, 4, 6, 7, 3, ~0, ~5, ~1, ~2, ~4, ~6, ~7, ~3];
// hiker_stairs16：原圖後半（右腳那步）第 11、13 格抬的其實是左腳，播起來像小碎步。只用前半「左腳上一階」8 格，右腳那步整組鏡射；
// 第 8 格（站齊）挪到最前面，第 7 格（左腳踩穩）落在第 8、16 拍，對齊爬階梯節奏（八格圖是第 4、8 格踩上去）
const STAIRS16 = [7, 0, 1, 2, 3, 4, 5, 6, ~7, ~0, ~1, ~2, ~3, ~4, ~5, ~6];
// hiker_step8：Gemini 只畫「右腳跨一步」8 格，後半步（左腳）整組左右鏡射：兩步一模一樣，換腳有兩腳並排那一格，不會小碎步
const STEP8 = [0, 1, 2, 3, 4, 5, 6, 7, ~0, ~1, ~2, ~3, ~4, ~5, ~6, ~7];
// hiker_tired_step8：第 8 格幾乎就是第 1 格左右對調，照 STEP8 接會有兩格一樣（頓一下），所以每半步只用前 7 格、共 14 格
const TIRED14 = [0, 1, 2, 3, 4, 5, 6, ~0, ~1, ~2, ~3, ~4, ~5, ~6];
// 寵物走路、藍鵲飛行的播放順序（量過每格後挑的，見 INCIDENTS 2026-11-23 寵物新圖）
// 柴犬、黑熊：Gemini 其實畫了「右腳一步＋左腳一步」整個循環（第 6、7、8 格≈第 3、2、1 格鏡射），照原順序播；像登山客那樣鏡射接成 16 格會變成倒著走
// 石虎：尾巴第 3、5、6 格在左、其他在右，照原順序尾巴一直左右閃；改成右腳抬高（1、2、3）→ 放下（5、6）→ 兩腳並排（4）→ 左腳（7、8），尾巴一輪只換邊兩次
// 藍鵲：兩列六格是一整輪拍翅（第 4、10 格、第 5、9 格是同一個姿勢：翅膀往下、再往上經過），照原順序、不鏡射；翅膀往上時身體低一點，保留不拉齊
const PET_ORDER = {
  shiba:[0, 1, 2, 3, 4, 5, 6, 7],
  bear:[0, 1, 2, 3, 4, 5, 6, 7],
  leopardcat:[0, 1, 2, 4, 5, 3, 6, 7],
  magpie:[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
};
const SHEETS = [
  [/_(walk|stairs)8$/, 4, 2],     // hiker_walk8、hiker_stairs8、hiker_tired_walk8、hiker_turn_walk8、hiker_front_walk8、hiker_side_walk8，和各自的雨衣版
  [/_walk$/, 4, 1],               // hiker_walk、hiker_rain_walk、pet_<id>_walk、pet_<id>_rain_walk
  [/_hop4$/, 4, 1, { air:true }],
  [/_jump4$/, 4, 1, { air:true }], // hiker_front_jump4、hiker_side_jump4：廣場面向鏡頭、往旁邊的跳一下 // hiker_hop4：蹲 → 跳起來 → 落地 → 站直
  [/_walk16$/, 8, 2, { order:WALK16 }],  // hiker_walk16、hiker_rain_walk16（兩張姿勢相同）
  [/_tired_step8$/, 8, 1, { order:TIRED14 }],   // hiker_tired_step8、hiker_rain_tired_step8（要排在 _step8 前面）
  // 寵物（要排在 _step8 前面）：PET_ORDER 是每隻的播放順序；air：Gemini 畫的頭頂每格同一高度、腳照遠近上下，身體固定不拉齊腳底（拉齊的話整隻每格上下跳）
  // wide：格子放不下「以身體置中」的寬度時（石虎尾巴一下左一下右），只裁掉格子外面、畫的時候照身體位置放，不把這格往旁邊推
  [/^pet_shiba(_rain)?_step8$/, 8, 1, { order:PET_ORDER.shiba, air:true, wide:true }],
  [/^pet_bear(_rain)?_step8$/, 8, 1, { order:PET_ORDER.bear, air:true, wide:true }],
  [/^pet_leopardcat(_rain)?_step8$/, 8, 1, { order:PET_ORDER.leopardcat, air:true, wide:true }],
  [/^pet_magpie(_rain)?_fly12$/, 6, 2, { order:PET_ORDER.magpie, air:true, wide:true }],
  [/_step8$/, 8, 1, { order:STEP8 }],    // hiker_step8、hiker_rain_step8
  [/_stairs16$/, 8, 2, { order:STAIRS16 }] // hiker_stairs16、hiker_rain_stairs16（兩張姿勢相同）
];
const POSE = /^hiker_/;   // 登山客的圖：單張動作也用上半身置中（見 prep）
function sheetOf(id){ for (let i = 0; i < SHEETS.length; i++) if (SHEETS[i][0].test(id)) return SHEETS[i]; return null; }

// 掃描不透明範圍（alpha > 24）：d 是整張圖（寬 W）的像素，掃 (x0, y0) 起 w×h 這一塊（直接用去背時讀出來的像素，不再讀一次畫布）
function bounds(d, W, x0, y0, w, h){
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) { const row = ((y0 + y) * W + x0) * 4 + 3; for (let x = 0; x < w; x++) {
    if (d[row + x * 4] > 24) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  } }
  return maxX < 0 ? null : { x:x0 + minX, y:y0 + minY, w:maxX - minX + 1, h:maxY - minY + 1 };
}
// 處理完的圖轉成 ImageBitmap 再拿去畫，處理用的畫布馬上釋放：
// 去背用的「常常讀像素」畫布放在 CPU 記憶體，直接拿來畫的話，每格都要把整張圖重新傳給顯示晶片（登山客、地圖每格都在畫）
// 不支援 createImageBitmap 的舊瀏覽器照舊用畫布
function toBitmap(c){
  if (typeof createImageBitmap !== 'function') return Promise.resolve(c);
  return createImageBitmap(c).then(b => { c.width = c.height = 0; return b; }, () => c);
}
const isBitmap = x => typeof ImageBitmap !== 'undefined' && x instanceof ImageBitmap;
// 鏡射補光圖存成 PNG（無損：下次開遊戲解開來跟這次做的一模一樣）
const pngOf = c => new Promise(res => { try { c.toBlob(b => res(b || null), 'image/png'); } catch (e) { res(null); } });
// 量一張圖：每一格的範圍、腳底和身體對齊，要鏡射畫的再做一份補光圖（relit）。
// 只在這張圖第一次載入（或圖換了、這裡的算法改了）時做，結果存起來（見下面「存起來」），之後開遊戲直接用、不再讀像素。
// img：解開的圖（ImageBitmap；不支援的舊瀏覽器是 <img>）。回傳 { img, imgM?, w, h, frames, opaque, hk?, relitPng? }
function prep(name, img){
  const opaque = /\.jpg$/i.test(name.file), bmp = isBitmap(img);
  const c = document.createElement('canvas'); c.width = img.naturalWidth || img.width; c.height = img.naturalHeight || img.height;
  if (opaque) { const e = { img:c, w:c.width, h:c.height, frames:[{ x:0, y:0, w:c.width, h:c.height }], opaque }; if (bmp) { e.img = img; c.width = c.height = 0; return Promise.resolve(e); } c.getContext('2d').drawImage(img, 0, 0); return toBitmap(c).then(b => { e.img = b; return e; }); }
  const g = c.getContext('2d', { willReadFrequently:true }); g.drawImage(img, 0, 0);
  const e = { img:c, w:c.width, h:c.height, frames:[], opaque };
  // 洋紅底在轉檔時（art/despill.js）就清乾淨了，這裡只讀像素來找每格的範圍
  const px = g.getImageData(0, 0, c.width, c.height).data;
  const sh = sheetOf(name.id), cols = sh ? sh[1] : 1, rows = sh ? sh[2] : 1, n = cols * rows, air = !!(sh && sh[3] && sh[3].air);
  const cw = Math.floor(c.width / cols), ch = Math.floor(c.height / rows), fr = [];
  for (let i = 0; i < n; i++) { const x0 = (i % cols) * cw, y0 = Math.floor(i / cols) * ch; fr.push(bounds(px, c.width, x0, y0, cw, ch) || { x:x0, y:y0, w:cw, h:ch }); }
  // 多格動作：每格用同樣的寬高，腳底對齊；左右用「身體（上半身那一段）的重心」對齊，不用整格外框的中心：
  // 外框會跟著登山杖、跨出去的腳變寬變窄，用外框置中的話身體每格左右跳
  // 登山客的單張動作（喘氣、喝水、看風景…）也用身體置中：跟走路圖互換時人不會往旁邊跳（外框被往旁邊伸的登山杖拉偏）
  if (n > 1 || POSE.test(name.id)) {
    const cxs = fr.map(f => torsoX(px, c.width, f));
    // air：地面線取所有格裡腳最低的那個（跳起來那格腳下留空），每格從同一條地面線往上切同樣高度
    const y0s = fr.map((f, i) => Math.floor(i / cols) * ch), gl = air ? Math.max.apply(null, fr.map((f, i) => f.y + f.h - y0s[i])) : 0;
    const bys = fr.map((f, i) => air ? y0s[i] + gl : f.y + f.h), stand = fr[n - 1].h;
    const W = Math.max.apply(null, fr.map((f, i) => Math.ceil(2 * Math.max(cxs[i] - f.x, f.x + f.w - cxs[i])))), H = Math.max.apply(null, fr.map((f, i) => bys[i] - f.y));
    const wide = !!(sh && sh[3] && sh[3].wide);
    fr.forEach((f, i) => {
      const x0 = (i % cols) * cw, w = Math.min(W, cw), by = bys[i];
      if (wide) { const l = Math.max(x0, Math.round(cxs[i] - W / 2)); f.w = Math.min(x0 + cw, Math.round(cxs[i] + W / 2)) - l; f.x = l; f.cx = cxs[i]; }   // f.cx：身體在原圖的位置（put 照這個對齊）
      else { f.x = Math.round(clampN(cxs[i] - w / 2, x0, x0 + cw - w)); f.w = w; }
      f.y = Math.max(y0s[i], by - H); f.h = by - f.y;
    });
    if (air) e.hk = fr[0].h / stand;   // 畫的時候給的高度是「人站直多高」：整格要再放大這麼多倍（多出來的是跳起來的空間）
  }
  e.frames = sh && sh[3] && sh[3].order ? sh[3].order.map(i => i < 0 ? Object.assign({}, fr[~i], { mx:true }) : fr[i]) : fr;
  const m = RELIT.test(name.id) ? relit(c, px, c.width, c.height, fr) : null;
  const mb = m ? pngOf(m).then(p => { e.relitPng = p; return toBitmap(m); }) : null;
  const b0 = bmp ? (c.width = c.height = 0, img) : toBitmap(c);   // 已經是 ImageBitmap：直接用（量完的畫布馬上釋放）
  return Promise.all([b0, mb]).then(([b, bm]) => { e.img = b; if (bm) e.imgM = bm; return e; });
}
// 鏡射畫的時候光要照樣從右上來：Gemini 的人物、寵物光都從右上照，背影右半邊比左半邊亮（約一成，階梯圖約三成）。
// 走路的左腳那步是右腳那步左右鏡射（STEP8、PET_ORDER 的 ~i），直接鏡射亮面就跑到左邊，每一步亮面左右換一次（晚上沒有輪廓光時最明顯）。
// 這裡先做一份「左右鏡射時用」的圖：每一格量身體（外框 15%～65% 高）左右兩半的平均亮度 Lo、Ro，每個像素乘上左右平滑變的倍數 k = c·e^(g·t)
// （t：中線 0、最右 1、最左 −1），g、c 用這一格每一直行的亮度直接解：鏡射畫出來左半平均＝Lo、右半平均＝Ro（左右亮暗、整格亮度都跟原本那格一樣）
// 2026-11-24 晚上爬階梯還是一步左一步右亮：以前變亮那邊是「相加一層灰」（照整格平均估），連墨線、暗處都加亮，
// 階梯圖左右差大，鏡射格整格亮約 6%、右半又多亮約一成。現在是真的「乘倍數」：變暗疊一層黑（source-atop，透明度不動）、變亮把原圖再加一次（lighter）
// 寵物大頭照只在網頁上顯示、不會鏡射畫，不做（2026-11-24 iPhone 記憶體：這份鏡射圖每張都多佔一倍）。廣場的動作會鏡射畫，照樣做（光線才不會跟著人翻過來）
const RELIT = /^(hiker|pet)_(?!.*_face$)/, RELIT_S = 16;   // RELIT_S：左右漸層分幾段
function relit(c, px, Wd, Hd, fr){
  const m = document.createElement('canvas'); m.width = Wd; m.height = Hd; const g = m.getContext('2d'); g.drawImage(c, 0, 0);
  const t = document.createElement('canvas'), seen = {}, blk = v => 'rgba(0,0,0,' + Math.max(0, Math.min(1, v)).toFixed(4) + ')';
  for (const f of fr) {
    const key = f.x + ',' + f.y; if (seen[key]) continue; seen[key] = 1;
    const ctr = f.cx == null ? f.x + f.w / 2 : f.cx, half = Math.max(1, Math.max(ctr - f.x, f.x + f.w - ctr)), tOf = x => Math.max(-1, Math.min(1, (x - ctr) / half));
    const col = new Float64Array(f.w), semi = new Float64Array(f.w);   // 每一直行身體那段的亮度和（semi：半透明的邊，變亮那邊加不上去）
    let L = 0, nl = 0, Rr = 0, nr = 0;
    for (let y = Math.round(f.y + f.h * 0.15), ye = Math.round(f.y + f.h * 0.65); y < ye; y++) for (let x = f.x; x < f.x + f.w; x++) {
      const i = (y * Wd + x) * 4; if (px[i + 3] < 160) continue; const v = px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11;
      (px[i + 3] < 255 ? semi : col)[x - f.x] += v; if (x < ctr) { L += v; nl++; } else { Rr += v; nr++; }
    }
    if (nl < 20 || nr < 20 || !L || !Rr) continue;
    const Lo = L / nl, Ro = Rr / nr, want = Lo / Ro;   // 這張圖（鏡射前）右半要變成 Lo、左半變成 Ro
    const sum = (gg, right, sm) => { let a = 0; for (let x = 0; x < f.w; x++) if ((f.x + x < ctr) !== right) { const k = Math.exp(gg * tOf(f.x + x + 0.5)); a += col[x] * k + semi[x] * (sm ? Math.min(1, k) : k); } return a; };   // sm：照半透明的邊加不上去算（算整格亮度 c 用）
    let lo = -2, hi = 2;   // 右半／左半 隨 g 變大而變大：二分法找 g
    for (let it = 0; it < 30; it++) { const md = (lo + hi) / 2; if ((sum(md, true) / nr) / (sum(md, false) / nl) < want) lo = md; else hi = md; }
    const gg = (lo + hi) / 2, k0 = (Lo * nr / sum(gg, true, 1) + Ro * nl / sum(gg, false, 1)) / 2;
    if (Math.abs(gg) < 0.005) continue;
    t.width = f.w; t.height = f.h; const tg = t.getContext('2d');
    const dk = g.createLinearGradient(f.x, 0, f.x + f.w, 0), up = tg.createLinearGradient(0, 0, f.w, 0);
    for (let s = 0; s <= RELIT_S; s++) { const k = k0 * Math.exp(gg * tOf(f.x + f.w * s / RELIT_S)); dk.addColorStop(s / RELIT_S, blk(1 - k)); up.addColorStop(s / RELIT_S, blk(k - 1)); }
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = dk; g.fillRect(f.x, f.y, f.w, f.h);   // 變暗：顏色 × k
    tg.drawImage(c, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h); tg.globalCompositeOperation = 'destination-in'; tg.fillStyle = up; tg.fillRect(0, 0, f.w, f.h);
    g.globalCompositeOperation = 'lighter'; g.drawImage(t, f.x, f.y);   // 變亮：原圖 ×(k − 1) 再加上去＝顏色 × k
  }
  g.globalCompositeOperation = 'source-over'; t.width = t.height = 0;
  return m;
}
// 一格裡身體的左右重心：只看外框高度 20%～55% 那一段（頭到腰，不含腳和登山杖尖），用不透明度加權
function torsoX(d, Wd, f){
  let s = 0, m = 0;
  for (let y = Math.round(f.y + f.h * 0.2), ye = Math.round(f.y + f.h * 0.55); y < ye; y++) for (let x = f.x; x < f.x + f.w; x++) { const a = d[(y * Wd + x) * 4 + 3]; if (a > 24) { s += a; m += a * x; } }
  return s ? m / s : f.x + f.w / 2;
}
function clampN(v, a, b){ return b < a ? a : Math.max(a, Math.min(b, v)); }

// 解開的圖（e.live）才拿得到；離開畫面一分鐘後放掉的圖拿不到（跟還沒載到一樣），回到那個畫面前會先解開（js/game.js 的 go）
A.get = function(id){ const e = lib[id]; return e && e.live ? e : null; };
// 給 HTML 用的圖片網址（背包、寵物選擇等）；沒有這張圖回 null
// 去背圖用「裁掉透明邊」的版本，不然格子裡的圖會很小。js/artgroups.js 的 HTML 那些圖第一次做好就存起來（見「存起來」），
// 之後開遊戲直接讀，不用為了一個小圖示把整張圖解開；其他的圖第一次用到才做
const urls = {}, trimmed = {};
const OUT = (() => { try { const c = document.createElement('canvas'); c.width = c.height = 1; return c.toDataURL('image/webp').startsWith('data:image/webp') ? 'image/webp' : 'image/png'; } catch (e) { return 'image/png'; } })();
A.url = function(id){
  const e = lib[id]; if (!urls[id]) return null;
  if (e && e.lazy) return urls[id];
  if (trimmed[id]) return trimmed[id];
  if (!e || !e.live) return null;
  if (e.opaque) return urls[id];
  const c = A.crop(id, 0); trimmed[id] = c.toDataURL(OUT, 0.9); c.width = c.height = 0;   // 暫用的畫布馬上釋放
  return trimmed[id];
};
// 有圖就回 <img>，沒有就回 fallback（原本程式畫的 SVG）
A.img = function(id, fallback, cls){ const u = A.url(id); return u ? `<img class="${cls || 'artImg'}" src="${u}" alt="" draggable="false">` : fallback; };
A.has = function(id){ return !!items[id]; };
A.ready = function(){ return loaded; };
// 圖到了之後通知畫面重建（例如步道的樹、石頭貼圖）
// screen 省略：開遊戲的圖處理完時叫一次；給 'map'／'lobby'／'climb'：那個畫面的圖第一次解開好時叫一次（之後再解開不會再叫）
const listeners = [], firstDone = {};
function callL(L){ try { L.fn(); } catch (e) {} }
A.onLoad = function(fn, screen){ const L = { fn, s:screen || null }; listeners.push(L); if (screen ? firstDone[screen] : loaded) callL(L); };
function screenDone(s){ if (firstDone[s]) return; firstDone[s] = true; listeners.filter(L => L.s === s).forEach(callL); }
// 開場讀取畫面用：whenReady 在開遊戲要的圖處理完（或沒有圖、清單讀不到）時呼叫一次；onProgress(已完成, 總數)
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
A.filtered = function(id, fl){ const e = A.get(id); return e ? filtered(e, fl) : null; };
// 把某一格畫到 ctx：(cx, by) 是腳底中心，h 是要畫的高度（像素）；fl：要套的濾鏡（可省略）
function frameOf(e, i){ return e.frames[((i % e.frames.length) + e.frames.length) % e.frames.length]; }
// 畫一格（drawFrame、drawOver 共用，位置、大小、鏡射只算在這裡）：來源圖 img 是「原圖的 k 倍大、往下偏 oy」的同樣排法；
// u0～u1、v0～v1：只畫這一格的一小塊（0～1，以沒鏡射的這一格來算）
function put(ctx, e, f, img, oy, k, cx, by, h, flip, u0, v0, u1, v1){
  h *= e.hk || 1; const w = h * f.w / f.h, c0 = f.cx == null ? w / 2 : (f.cx - f.x) * h / f.h;   // c0：(cx, by) 對到這一格的哪裡（沒有 f.cx 就是正中間）
  const sx = (f.x + f.w * u0) * k, sy = oy + (f.y + f.h * v0) * k, sw = f.w * (u1 - u0) * k, sh = f.h * (v1 - v0) * k;
  const dx = -c0 + w * u0, dy = by - h + h * v0, dw = w * (u1 - u0), dh = h * (v1 - v0);
  if (flip) { ctx.save(); ctx.translate(cx, 0); ctx.scale(-1, 1); ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh); ctx.restore(); }
  else ctx.drawImage(img, sx, sy, sw, sh, cx + dx, dy, dw, dh);
}
A.drawFrame = function(ctx, id, i, cx, by, h, flip, fl){
  const e = A.get(id); if (!e) return false;
  const f = frameOf(e, i), mir = f.mx ? !flip : flip, img = fl ? filtered(e, fl) : mir && e.imgM ? e.imgM : e.img;   // 鏡射畫的用 imgM（光照樣從右邊來，見 relit）
  put(ctx, e, f, img, 0, 1, cx, by, h, mir, 0, 0, 1, 1);   // f.mx：這一格本身是鏡射格（SHEETS 的 order 用 ~i）
  return true;
};
// 這一格畫出來是不是左右鏡射的（自己要鏡射、或這一格本身是鏡射格）：疊光線貼圖時挑「朝哪邊的輪廓光」用
A.mirrored = function(id, i, flip){ const e = lib[id]; return !!(e && e.frames.length && (frameOf(e, i).mx ? !flip : flip)); };
// 在同一格的位置疊一張「跟原圖同樣排法」的圖（trail.js 的光線貼圖：剪影、輪廓光）：img 是原圖的 k 倍大、這一組從 oy 開始；
// part：[u0, v0, u1, v1] 只疊這一格的一小塊（省略＝整格）
A.drawOver = function(ctx, id, i, cx, by, h, flip, img, oy, k, part){
  const e = A.get(id); if (!e || !img) return false;
  const f = frameOf(e, i), p = part || FULL;
  put(ctx, e, f, img, oy, k, cx, by, h, f.mx ? !flip : flip, p[0], p[1], p[2], p[3]);
  return true;
};
const FULL = [0, 0, 1, 1];
// 把第一格裁成單獨一張 canvas（給需要整張圖的地方）
A.crop = function(id, i){
  const e = A.get(id); if (!e) return null;
  const f = e.frames[i || 0], c = document.createElement('canvas'); c.width = f.w; c.height = f.h;
  c.getContext('2d').drawImage(e.img, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
  return c;
};

// ───────── 存起來：量好的格子、鏡射補光圖、網頁用的裁邊小圖（Cache Storage，sw.js 改版時不清掉）─────────
// 2026-11-24：以前每次開遊戲都把 157 張圖讀一次像素、量格子、做補光圖（電腦上約 3 秒 CPU，手機更久、發燙）。
// 現在每張圖只在第一次（或圖換了、這支程式量圖的算法改了）做一次：KEY 是量圖相關程式碼和瀏覽器版本的指紋，
// 圖的指紋是 manifest 的 v，兩個都一樣才用存起來的結果；不一樣就重新量（照樣是 prep、relit 這一套，沒有第二份算法）
const STORE = 'shanxing-prep';
const KEY = (() => {
  const src = [prep, relit, torsoX, bounds, sheetOf, A.crop].map(String).join('\n') + JSON.stringify(SHEETS.map(s => [s[0].source, s[1], s[2], s[3]]))
    + POSE.source + RELIT.source + RELIT_S + OUT + (navigator.userAgent || '');
  let h = 0x811c9dc5; for (let i = 0; i < src.length; i++) { h ^= src.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16);
})();
const sk = (kind, id, v) => 'art-prep/' + KEY + '/' + kind + '/' + id + '?v=' + v;
let storeP = null, meta = {}, metaDirty = 0;
function store(){
  if (!storeP) storeP = (typeof caches !== 'undefined' && caches.open ? caches.open(STORE).catch(() => null) : Promise.resolve(null));
  return storeP;
}
function sGet(k){ return store().then(c => c ? c.match(k) : null).then(r => r ? r.blob() : null).catch(() => null); }
function sPut(k, blob, type){ return store().then(c => c && blob ? c.put(k, new Response(blob, { headers:{ 'Content-Type':type } })) : null).catch(() => null); }
// 量好的格子全部放一份 meta.json：開遊戲讀一次就有全部
function saveMeta(){ if (metaDirty) return; metaDirty = setTimeout(() => { metaDirty = 0; sPut('art-prep/' + KEY + '/meta.json', new Blob([JSON.stringify(meta)]), 'application/json'); }, 800); }

// ───────── 解開、釋放 ─────────
const items = {}, lib = {};    // items：manifest 的每一張圖；lib：量好的圖 { img, imgM, w, h, frames, opaque, hk, fit, live }
let all = [];                  // 開遊戲會用到的圖名（不含 lazy）
const GR = SX.ART_GROUPS;
const IDLE_MS = 60000;         // 不在用的圖放多久才釋放（回到剛剛的畫面不用重新解開）
const st = { prepMs:0, hits:0, miss:0, decodes:0, boot:0, bootAt:0 };
let EMPTY = null;              // 釋放後換上的 1×1 透明圖：手上還拿著舊 e 的畫面畫到也只是什麼都沒有，不會出錯
const frees = [];              // 釋放時通知（trail.js 刪掉 WebGL 貼圖）
A.onFree = function(fn){ frees.push(fn); };
function dropImg(img){ if (!img) return; frees.forEach(fn => { try { fn(img); } catch (e) {} }); if (img.close) img.close(); else { img.width = img.height = 0; } }
function release(id){
  const e = lib[id]; if (!e || !e.live) return;
  dropImg(e.img); dropImg(e.imgM); if (e.fx) for (const k in e.fx) dropImg(e.fx[k]);
  if (!EMPTY) { EMPTY = document.createElement('canvas'); EMPTY.width = EMPTY.height = 1; }
  e.img = EMPTY; e.imgM = null; e.fx = null; e.live = false; e.off = 0;
}
const decodeBlob = b => createImageBitmap(b, { premultiplyAlpha:'premultiply' }).catch(() => createImageBitmap(b));
// 舊瀏覽器（沒有 createImageBitmap）：照以前用 <img> 解
const viaImg = u => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = u; });
function install(id, m, img, imgM){
  const e = lib[id] || (lib[id] = { fit:items[id].fit || null });
  e.w = m.w; e.h = m.h; e.frames = m.frames; e.opaque = m.opaque; if (m.hk) e.hk = m.hk;
  e.img = img; e.imgM = imgM || null; e.fx = null; e.live = true; e.off = needed.has(id) ? 0 : performance.now();
}
// 解開一張圖：量過的直接解開（補光圖也是存好的那張）；沒量過的照 prep 量一次、存起來
function decode1(id){
  const it = items[id], u = urls[id], m0 = meta[id] && meta[id].v === it.v ? meta[id] : null, wantM = RELIT.test(id) && !/\.jpg$/i.test(it.file);
  const bmpOK = typeof createImageBitmap === 'function';
  const src = bmpOK ? fetch(u).then(r => { if (!r.ok) throw 0; return r.blob(); }).then(decodeBlob) : viaImg(u);
  return src.then(img => {
    st.decodes++;
    if (m0 && bmpOK && (!wantM || m0.rel)) {
      const mp = wantM ? sGet(sk('relit', id, it.v)).then(b => b ? decodeBlob(b) : null) : Promise.resolve(null);
      return mp.then(imgM => { if (wantM && !imgM) return measure(id, it, img); st.hits++; install(id, m0, img, imgM); });
    }
    return measure(id, it, img);
  }).then(() => trimFor(id), () => { failed[id] = 1; });
}
function measure(id, it, img){
  const t0 = performance.now(); let p;
  try { p = prep({ id, file:it.file }, img); } finally { st.prepMs += performance.now() - t0; }
  st.miss++;
  return p.then(e => {
    const m = { v:it.v, w:e.w, h:e.h, frames:e.frames, opaque:e.opaque }; if (e.hk) m.hk = e.hk;
    if (e.relitPng) { m.rel = 1; sPut(sk('relit', id, it.v), e.relitPng, 'image/png'); }
    meta[id] = m; saveMeta(); install(id, m, e.img, e.imgM);
  });
}
// 網頁用的裁邊小圖（js/artgroups.js 的 HTML）：做一次存起來
// 就是 A.url 那一個 data: 網址（toDataURL；toBlob 編出來的 webp 跟它不一樣，不用），整串存起來
function trimFor(id){
  const e = lib[id]; if (!GR.HTML.test(id) || trimmed[id] || !e || !e.live || e.opaque) return;
  const t0 = performance.now(), u = A.url(id);
  st.prepMs += performance.now() - t0;
  if (u) sPut(sk('trim', id, items[id].v), new Blob([u]), 'text/plain');
}
// 排隊解開：開遊戲時一次 4 張；進遊戲以後每一格最多開始 2 張（在背景解開，不讓畫面頓一下）
const queue = [], pending = {}, failed = {};
let running = 0, booting = true, rush = 0;   // rush：有畫面停著在等（切畫面、出發），一次多解開幾張
function want(id, hi){
  if (lib[id] && lib[id].live || failed[id] || !items[id] || items[id].lazy) return Promise.resolve();
  let p = pending[id];
  if (!p) { let r; const pr = new Promise(res => { r = res; }); p = pending[id] = { pr, res:r, started:false }; }
  if (!p.started) { const q = queue.indexOf(id); if (q >= 0) queue.splice(q, 1); if (hi) queue.unshift(id); else queue.push(id); }
  pump();
  return p.pr;
}
const later = fn => (booting || rush || document.hidden || typeof requestAnimationFrame !== 'function') ? setTimeout(fn, 0) : requestAnimationFrame(fn);
function pump(){
  while (queue.length && running < (booting || rush ? 6 : 2)) {
    const id = queue.shift(), p = pending[id]; if (!p || p.started) continue; p.started = true; running++;
    decode1(id).then(() => { running--; delete pending[id]; p.res(); later(pump); });
  }
}
// 每一組「要用的圖」（screen：現在的畫面、prefetch：馬上可能要去的畫面、mates：登山畫面上隊友帶的寵物）
const needs = {}; let needed = new Set();
function recompute(){
  const now = performance.now(); needed = new Set();
  for (const k in needs) needs[k].forEach(id => needed.add(id));
  for (const id in lib) { const e = lib[id]; if (!e.live) continue; if (needed.has(id) || GR.WARM.test(id)) e.off = 0; else if (!e.off) e.off = now; }
}
function need(key, ids){
  needs[key] = ids.filter(id => items[id] && !items[id].lazy); recompute();
  return Promise.all(needs[key].map(id => want(id, key !== 'prefetch'))).then(() => {});
}
const isReady = ids => ids.every(id => !items[id] || items[id].lazy || failed[id] || (lib[id] && lib[id].live));
// 不在用、超過 IDLE_MS 的圖放掉（常駐的 WARM 不放）
function sweep(){ const now = performance.now(); for (const id in lib) { const e = lib[id]; if (e.live && e.off && now - e.off > IDLE_MS && !needed.has(id) && !GR.WARM.test(id)) release(id); } }
// ───────── 給畫面用 ─────────
let rainNow = false;
// 某個畫面要解開哪些圖（o：{ pets:[寵物 id], rain }）
A.ids = function(screen, o){ return GR.ids(screen, all, o); };
// 這個畫面的圖都解開好了沒
A.isReady = function(screen, o){ return isReady(A.ids(screen, o)); };
// 切到某個畫面：宣告要用哪些圖（其他的一分鐘後放掉），回傳全部解開好的 Promise。已經好了的話同步通知「第一次好」
A.want = function(screen, o){
  if (screen === 'climb') rainNow = !!(o && o.rain);
  const ids = GR.SCREENS.includes(screen) ? A.ids(screen, o) : [];
  needs.prefetch = []; needs.next = []; const p = need('screen', ids);
  if (isReady(ids)) { if (GR.SCREENS.includes(screen)) screenDone(screen); return Promise.resolve(); }
  return p.then(() => { if (GR.SCREENS.includes(screen)) screenDone(screen); });
};
// 馬上可能要去的畫面：先在背景解開（按下按鈕、打開路線卡時），沒去的話一分鐘後放掉。
// urgent：正在等著切過去（排在最前面）；現在這個畫面的圖照樣留著，等真的切過去（A.want）才開始算一分鐘
A.prefetch = function(screen, o, urgent){
  if (!GR.SCREENS.includes(screen)) return Promise.resolve();
  if (screen === 'climb' && urgent) rainNow = !!(o && o.rain);
  if (!urgent) return need('prefetch', A.ids(screen, o));
  rush++; const p = need('next', A.ids(screen, o)); p.then(() => { rush--; }); return p;
};
// 登山畫面上隊友帶的寵物（js/social.js 給隊友清單時）：解開好才回
A.pets = function(key, pets){ const ids = all.filter(id => GR.petOf(id) && GR.on('climb', id, pets, rainNow)); return { ready:isReady(ids), p:need(key, ids) }; };
// 解開進度（0～1）：登山前的小山讀取畫面用
A.progress = function(screen, o){ const ids = A.ids(screen, o); return ids.length ? ids.filter(id => isReady([id])).length / ids.length : 1; };
// 用到才下載的圖（例如 load_<山>）：下載、解開一張，用完由呼叫的人 close()
A.lazyBitmap = function(id){
  const u = urls[id]; if (!u || typeof createImageBitmap !== 'function') return Promise.resolve(null);
  return fetch(u).then(r => r.ok ? r.blob() : null).then(b => b ? decodeBlob(b) : null).catch(() => null);
};
// 測試、量測用（不顯示在玩家畫面）：解開了多少 MB（原圖＋鏡射補光圖，跟 tools/check.js 同一種算法）、量圖花了多少 CPU
A.stats = function(){
  let mb = 0, n = 0; for (const id in lib) { const e = lib[id]; if (e.live) { n++; mb += e.w * e.h * 4 * (e.imgM ? 2 : 1); } }
  return { live:n, liveMB:Math.round(mb / 1e6), prepMs:Math.round(st.prepMs), hits:st.hits, miss:st.miss, decodes:st.decodes, bootMs:Math.round(st.boot), key:KEY };
};

// 開遊戲：先讀 manifest 和存起來的結果，等 game.js 說要進哪個畫面（A.boot），只解開那個畫面的圖
let bootReq = null, bootGo = null;
A.boot = function(screen, o){ bootReq = { screen, o }; if (bootGo) bootGo(); };
function load(){
  const T0 = performance.now(); try { performance.mark('art-boot-start'); } catch (e) {}
  const man = fetch('art/manifest.json', { cache:'no-cache' }).then(r => r.ok ? r.json() : []).catch(() => []);
  const mp = sGet('art-prep/' + KEY + '/meta.json').then(b => b ? b.text() : null).then(t => { if (t) meta = JSON.parse(t) || {}; }).catch(() => {});
  Promise.all([man, mp]).then(([list]) => {
    if (!Array.isArray(list) || !list.length) { finish(); return; }
    list.forEach(it => { const id = it.file.replace(/\.[a-z]+$/i, ''); items[id] = it; urls[id] = 'art/' + it.file + '?v=' + it.v; });   // v 是檔案內容指紋：圖換了網址才變，沒換的圖手機不用重新下載
    // lazy：只在卡片上顯示的大插圖（奇遇、登頂），開遊戲時不下載，<img> 顯示時瀏覽器才去拿
    list.filter(it => it.lazy).forEach(it => { const id = it.file.replace(/\.[a-z]+$/i, ''); lib[id] = { img:null, w:0, h:0, frames:[], opaque:true, lazy:true }; });
    all = list.filter(it => !it.lazy).map(it => it.file.replace(/\.[a-z]+$/i, ''));
    // 網頁用的裁邊小圖：存過的直接讀；沒存過的開遊戲時解開做一次（做完不在這個畫面用的就馬上放掉）
    const html = all.filter(id => GR.HTML.test(id) && !/\.jpg$/i.test(items[id].file));
    const tr = Promise.all(html.map(id => sGet(sk('trim', id, items[id].v)).then(b => b ? b.text() : null).then(u => { if (u && u.startsWith('data:')) trimmed[id] = u; })));
    return Promise.all([tr, new Promise(res => { bootGo = res; if (bootReq) res(); })]).then(() => {
      const pre = list.filter(it => it.lazy && it.pre), bootIds = A.ids(bootReq.screen, bootReq.o), extra = html.filter(id => !trimmed[id] && bootIds.indexOf(id) < 0);
      if (bootReq.screen === 'climb') rainNow = !!(bootReq.o && bootReq.o.rain);
      const total = bootIds.length + extra.length + pre.length; let done = 0; const tick = () => setProg(++done, total);
      setProg(0, total);
      // pre：介面的按鈕、木框、圖示（lazy 但每個畫面都看得到）：讀取畫面時就先下載進快取（sw.js 的美術快取），只下載、不解開放記憶體，進遊戲時馬上顯示
      const preDone = pre.map(it => fetch('art/' + it.file + '?v=' + it.v).then(r => r.blob(), () => null).catch(() => null).then(tick));
      needs.screen = bootIds.slice(); recompute();
      const a = bootIds.map(id => want(id, true).then(tick));
      const b = extra.map(id => want(id, false).then(() => { if (!needed.has(id)) release(id); tick(); }));
      return Promise.all(preDone.concat(a, b));
    }).then(() => {
      booting = false; st.boot = performance.now() - T0;
      try { performance.mark('art-boot-end'); performance.measure('art-boot', 'art-boot-start', 'art-boot-end'); } catch (e) {}
      firstDone[bootReq.screen] = true;
      listeners.filter(L => !L.s || L.s === bootReq.screen).forEach(callL);   // 先讓各畫面換上美術圖，再收起讀取畫面
      finish();
      setInterval(sweep, 10000);
      idleWork(list);
    });
  });
}
// 進遊戲以後慢慢做：別的畫面的圖先下載進美術快取（離線也看得到、切畫面不用等網路），舊的存檔結果清掉
function idleWork(list){
  const rest = all.filter(id => !lib[id]).map(id => urls[id]);
  const next = () => { const u = rest.shift(); if (!u) return; fetch(u).then(r => r.blob()).catch(() => null).then(() => setTimeout(next, 50)); };
  if (navigator.serviceWorker && navigator.serviceWorker.controller) setTimeout(next, 2000);
  setTimeout(() => store().then(c => c && c.keys().then(ks => {
    const ok = new Set(); all.forEach(id => { ok.add(sk('relit', id, items[id].v)); ok.add(sk('trim', id, items[id].v)); });
    ks.forEach(r => { const u = new URL(r.url), p = u.pathname.slice(u.pathname.indexOf('art-prep/')) + u.search; if (p !== 'art-prep/' + KEY + '/meta.json' && !ok.has(p)) c.delete(r); });
  })).catch(() => {}), 5000);
}
load();
})();

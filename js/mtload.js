// 山行小日子：出發前的「小山慢慢長滿草」讀取畫面
// 按下出發、登山畫面的圖還要等超過半秒（js/game.js 的 ART_WAIT_MS）才出現；圖一下就好了就直接進去，不會閃一下。
// 每座山有自己的山形：照 data.js 這座山的真實資料（海拔、爬升、路線、沿路的點）畫，玉山尖、象山圓。
// 墨線輕輕抖、米色紙底；綠色的草坡像水位一樣從山腳漲上來，頂端是緩緩起伏的波浪；漲到頂，山頂冒出一面小紅旗。
// 有 Gemini 畫的 load_<山> 圖（2:1，左半只有線稿、右半是同一張上好色）就用圖：先放線稿，上色那半從下往上用波浪邊露出來。
(function(){
'use strict';
const SX = window.SX = window.SX || {};
const ML = SX.mtload = {};
const PAPER = '#f6ecd6', INK = '#3a2a20', GRASS_T = '#a9cf72', GRASS_B = '#6e9b4a', GRASS_HI = '#d3e8a4', FLAG = '#e8574a';
const BOX_W = 260, BOX_H = 200;     // 小山畫在多大的框裡（CSS 像素）
// Gemini 讀取圖畫多大（正方形）、四邊淡進紙色多寬（圖的紙色跟讀取畫面的底色才接得起來，看不出一塊方框）、圖上面留給小紅旗的空間
const ART_BOX = 300, ART_FADE = 0.12, ART_TOP = 24;
const EASE = 5;                     // 草坡追上真正進度的快慢（每秒）
const FLAG_MS = 420, HOLD_MS = 260; // 小紅旗彈出來的時間、彈出來以後停一下再進去
const WAVE = { a:3.2, k:0.055, v:2.4, a2:1.6, k2:0.13, v2:-3.1 };   // 草坡頂端的波浪（像素、每像素幾弧度、每秒幾弧度）
const calm = () => SX.motion ? SX.motion.calm : matchMedia('(prefers-reduced-motion: reduce)').matches;   // 系統設定減少動態：波浪不動、旗子直接出現
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
function hash(s){ let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed){ let s = seed || 1; return () => { s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909); s ^= s >>> 16; return (s >>> 0) / 4294967296; }; }

// 這座山的山形（0～1，x 從左到右、y 往上是高）：越高越尖（玉山）、越矮越圓（象山）；
// 山頂偏左偏右照路線最後往哪走；沿路的點（waypoints）在左邊山坡上做出小肩膀
function shape(m){
  const alt = m.alt || 500, gain = Math.max(30, alt - (m.startAlt || 0));
  const hi = clamp((Math.log(alt) - Math.log(150)) / (Math.log(4000) - Math.log(150)), 0, 1);   // 0：郊山、1：最高的百岳
  const steep = clamp(gain / Math.max(300, m.dist || 1000) / 0.25, 0, 1);                          // 爬升 ÷ 距離
  const top = 0.42 + 0.46 * hi;                                     // 山頂高度（框高的幾成）
  const p = 2.3 - 1.45 * clamp(hi * 0.75 + steep * 0.25 + (m.theme && m.theme.alpine ? 0.15 : 0), 0, 1);   // 山坡形狀：2.3 圓、0.85 尖（兩側往內凹）
  const r = m.route || [], sx = clamp(0.5 + (r.length > 1 ? (r[r.length - 1][0] - r[0][0]) * 0.35 : 0), 0.38, 0.62);
  const R = rng(hash(m.id)), bumps = [];
  (m.waypoints || []).forEach(w => { const f = (w.m || 0) / (m.dist || 1); if (f > 0.12 && f < 0.92) bumps.push({ x:sx * f, a:0.035 + 0.03 * R(), w:0.035 + 0.03 * R() }); });
  const rip = [R() * 6.28, R() * 6.28, 2 + R() * 2];
  const N = 96, pts = [];
  for (let i = 0; i <= N; i++) {
    const x = i / N, d = x < sx ? (sx - x) / sx : (x - sx) / (1 - sx);   // 離山頂多遠（0～1）
    let y = top * (1 - Math.pow(d, p)) * (0.92 + 0.08 * (1 - d));
    bumps.forEach(b => { y += b.a * top * Math.exp(-Math.pow((x - b.x) / b.w, 2)) * (1 - d * 0.3); });
    y += 0.012 * Math.sin(x * 9 * rip[2] + rip[0]) * Math.sin(x * 3.14) + 0.008 * Math.sin(x * 23 + rip[1]) * Math.sin(x * 3.14);
    pts.push([x, Math.max(0, y)]);
  }
  let si = 0; pts.forEach((q, i) => { if (q[1] > pts[si][1]) si = i; });
  return { pts, top:pts[si][1], sx:pts[si][0], seed:hash(m.id + '/ink') };
}

// 先開始下載這座山的讀取圖（按下出發就開始；真的要蓋讀取畫面時才用）
ML.prep = function(m){
  // 這座山自己的 load_<山>；沒有就用 load_default（暫時大家共用的那張）；兩張都讀不到才照真實輪廓用程式畫
  const A = SX.art, h = { bmp:null, cancelled:false }, ids = ['load_' + m.id, 'load_default'].filter(id => A && A.has(id) && A.lazyBitmap);
  const next = i => i >= ids.length ? Promise.resolve(null) : A.lazyBitmap(ids[i]).then(b => b || next(i + 1));
  h.p = next(0).then(b => { if (h.cancelled && b) { b.close(); return null; } h.bmp = b; return b; });
  h.cancel = () => { h.cancelled = true; if (h.bmp) { h.bmp.close(); h.bmp = null; } };
  return h;
};

// 蓋上讀取畫面：prog() 回傳真正的進度（0～1）。回傳 { done(進去), cancel() }
ML.show = function(m, prog, pre){
  const app = document.getElementById('app') || document.body;
  const el = document.createElement('div'); el.className = 'mtLoad';
  el.innerHTML = `<div class="mlBox"><canvas class="mlCv"></canvas><div class="mlPct">0%</div><div class="mlTo">前往 ${m.name}…</div></div>`;
  app.appendChild(el);
  const cv = el.querySelector('canvas'), pct = el.querySelector('.mlPct'), dpr = Math.min(2, window.devicePixelRatio || 1);
  const bw = pre && pre.bmp ? ART_BOX : BOX_W, bh = pre && pre.bmp ? ART_BOX + ART_TOP : BOX_H;
  cv.width = Math.round(bw * dpr); cv.height = Math.round(bh * dpr); cv.style.width = bw + 'px'; cv.style.height = bh + 'px';
  const g = cv.getContext('2d'); g.scale(dpr, dpr);
  const art = pre && pre.bmp ? artOf(pre.bmp) : null, sh = art ? null : shape(m), wob = rng(sh ? sh.seed : 1);
  // 墨線的抖動：每個點固定偏一點點（不會每格抖），描兩次，像手畫
  const ink = sh ? [0, 1].map(() => sh.pts.map(q => [q[0], q[1], (wob() - 0.5) * 1.3, (wob() - 0.5) * 1.3])) : null;
  const S = { lv:0, want:0, t0:performance.now(), last:performance.now(), fin:null, flagT:0, raf:0, petA:0, dead:false };
  const petId = (() => { const p = SX.game && SX.game.pet ? SX.game.pet() : null, id = p && 'pet_' + p + '_sit'; return !p ? null : SX.art.has(id) ? id : p === 'shiba' ? 'shiba_sit' : null; })();   // 柴犬第一批的坐姿叫 shiba_sit
  const MO = SX.motion, fade = (a, b) => MO ? MO.run(el, [{ opacity:a }, { opacity:b }], { duration:300, fill:'forwards' }) : Promise.resolve();
  fade(0, 1);
  function frame(now){
    if (S.dead) return;
    const dt = Math.min(0.1, (now - S.last) / 1000); S.last = now;
    S.want = S.fin ? 1 : Math.max(S.want, clamp(prog(), 0, 1) * 0.97);   // 真的好了之前停在 97%，好了才漲滿
    S.lv = calm() ? S.want : S.lv + (S.want - S.lv) * Math.min(1, dt * EASE * (S.fin ? 2.2 : 1));
    if (S.fin && S.lv > 0.995) { S.lv = 1; if (!S.flagT) S.flagT = now; }
    const t = (now - S.t0) / 1000;
    if (art) drawArt(g, art, S.lv, t); else drawShape(g, sh, ink, S.lv, t);
    if (!art) drawPet(g, now, dt);   // Gemini 的讀取圖裡已經畫了柴犬坐在山腳
    const fk = S.flagT ? clamp((now - S.flagT) / (calm() ? 1 : FLAG_MS), 0, 1) : 0;
    if (fk > 0) drawFlag(g, art ? art.flag : summitPx(sh), fk);
    pct.textContent = Math.round(S.lv * 100) + '%';
    if (S.flagT && now - S.flagT > FLAG_MS + HOLD_MS) { const fn = S.fin; S.fin = null; close(); fn(); return; }
    S.raf = requestAnimationFrame(frame);
  }
  // 帶著的寵物坐在山腳（圖解開好了才畫，慢慢淡進來）
  function drawPet(c, now, dt){
    if (!petId || !SX.art.get(petId)) return;
    S.petA = calm() ? 1 : Math.min(1, S.petA + dt * 3);
    c.save(); c.globalAlpha = S.petA; SX.art.drawFrame(c, petId, 0, 34, BOX_H - 6, 46); c.restore();
  }
  function close(){
    S.dead = true; cancelAnimationFrame(S.raf);
    fade(1, 0).then(() => { el.remove(); cv.width = cv.height = 0; if (art) art.free(); if (pre) pre.cancel(); });
  }
  S.raf = requestAnimationFrame(frame);
  return { done(fn){ S.fin = fn; }, cancel(){ close(); } };
};

const BASE = BOX_H - 10, PAD = 14;   // 山腳在哪（像素）、左右留白
const X = x => PAD + x * (BOX_W - PAD * 2), Y = y => BASE - y * (BASE - 26);
function summitPx(sh){ return [X(sh.sx), Y(sh.top)]; }
function path(c, sh, ink){ c.beginPath(); sh.pts.forEach((q, i) => { const x = X(q[0]) + (ink ? ink[i][2] : 0), y = Y(q[1]) + (ink ? ink[i][3] : 0); if (i) c.lineTo(x, y); else c.moveTo(x, y); }); }
function waveY(x, lvY, t){ const k = calm() ? 0 : t; return lvY + WAVE.a * Math.sin(x * WAVE.k + k * WAVE.v) + WAVE.a2 * Math.sin(x * WAVE.k2 + k * WAVE.v2); }
// 草坡的形狀（水位線以下）：lv 0＝山腳、1＝比山頂再高一點（整座山都綠了）
function grassClip(c, lvY, t, x0, x1, yb){ c.beginPath(); c.moveTo(x0, yb); for (let x = x0; x <= x1 + 1; x += 3) c.lineTo(x, waveY(x, lvY, t)); c.lineTo(x1, yb); c.closePath(); }
function drawShape(c, sh, ink, lv, t){
  c.clearRect(0, 0, BOX_W, BOX_H);
  // 紙上淡淡一條遠山（不搶戲）
  c.strokeStyle = 'rgba(58,42,32,.16)'; c.lineWidth = 1.4; c.lineJoin = c.lineCap = 'round';
  c.beginPath(); for (let x = 0; x <= BOX_W; x += 6) { const y = BASE - 30 - 14 * Math.sin(x * 0.021 + 1.3) * Math.sin(x * 0.008 + 0.4); if (x) c.lineTo(x, y); else c.moveTo(x, y); } c.stroke();
  // 山裡面：先塗淡淡的紙色（蓋住遠山），再用水位線切出草坡
  path(c, sh, null); c.closePath(); c.fillStyle = PAPER; c.fill();
  const lvY = BASE + 6 - lv * (BASE - Y(sh.top) + 12);
  c.save(); path(c, sh, null); c.closePath(); c.clip();
  grassClip(c, lvY, t, 0, BOX_W, BOX_H);
  const gr = c.createLinearGradient(0, Y(sh.top), 0, BASE); gr.addColorStop(0, GRASS_T); gr.addColorStop(1, GRASS_B); c.fillStyle = gr; c.fill();
  // 波浪頂端亮一條（像陽光照在草尖）
  c.beginPath(); for (let x = 0; x <= BOX_W; x += 3) { const y = waveY(x, lvY, t); if (x) c.lineTo(x, y); else c.moveTo(x, y); }
  c.strokeStyle = GRASS_HI; c.lineWidth = 2.2; c.stroke();
  c.restore();
  // 墨線：描兩次、每次偏一點點；地平線一條
  c.strokeStyle = INK; c.lineJoin = c.lineCap = 'round';
  ink.forEach((k, i) => { path(c, sh, k); c.lineWidth = i ? 1.1 : 2.2; c.globalAlpha = i ? 0.55 : 1; c.stroke(); });
  c.globalAlpha = 1; c.lineWidth = 2; c.beginPath(); c.moveTo(4, BASE + 0.5); c.quadraticCurveTo(BOX_W / 2, BASE + 2, BOX_W - 4, BASE - 0.5); c.stroke();
}
// Gemini 的讀取圖：左半線稿、右半上色。小紅旗插在山頂：上色那半最高的「有顏色」的點（草、土、岩石的綠褐色；雲和紙是白色、米色，不算）
function artOf(b){
  const B = ART_BOX, hw = b.width / 2, k = Math.min(B / hw, B / b.height), w = hw * k, h = b.height * k, x0 = (B - w) / 2, y0 = ART_TOP + (B - h) / 2;
  const S = 128, sh = Math.max(8, Math.round(S * b.height / hw)), s = document.createElement('canvas'); s.width = S; s.height = sh; const sg = s.getContext('2d');
  sg.drawImage(b, hw, 0, hw, b.height, 0, 0, S, sh);
  const d = sg.getImageData(0, 0, S, sh).data; let fx = S / 2, fy = sh / 2;
  // 最高那一點往下 3 列裡有顏色的點取平均位置（尖頂、圓頂都插在正中間，不會插到最左邊那棵樹尖）
  const col = i => { const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]); return mx - mn > 45 && mx < 235; };
  let top = -1; for (let y = 0; y < sh && top < 0; y++) for (let x = 0; x < S; x++) if (col((y * S + x) * 4)) { top = y; break; }
  if (top >= 0) { let sx = 0, n = 0; for (let y = top; y < Math.min(sh, top + 3); y++) for (let x = 0; x < S; x++) if (col((y * S + x) * 4)) { sx += x; n++; } fx = sx / n + 0.5; fy = top + 0.5; }
  s.width = s.height = 0;
  // 四邊淡進紙色的遮罩（只做一次）
  const m = document.createElement('canvas'); m.width = B; m.height = B + ART_TOP; const mg = m.getContext('2d'); mg.fillStyle = '#000'; mg.fillRect(x0, y0, w, h);
  mg.globalCompositeOperation = 'destination-out';
  const f = B * ART_FADE, edge = (gx0, gy0, gx1, gy1, rx, ry, rw, rh) => { const gr = mg.createLinearGradient(gx0, gy0, gx1, gy1); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); mg.fillStyle = gr; mg.fillRect(rx, ry, rw, rh); };
  edge(x0, 0, x0 + f, 0, x0, y0, f, h); edge(x0 + w, 0, x0 + w - f, 0, x0 + w - f, y0, f, h); edge(0, y0, 0, y0 + f, x0, y0, w, f); edge(0, y0 + h, 0, y0 + h - f, x0, y0 + h - f, w, f);
  return { b, hw, x0, y0, w, h, mask:m, flag:[x0 + fx / S * w, y0 + fy / sh * h], free(){ b.close(); m.width = m.height = 0; } };
}
function drawArt(c, a, lv, t){
  c.clearRect(0, 0, ART_BOX, ART_BOX + ART_TOP);
  c.drawImage(a.b, 0, 0, a.hw, a.b.height, a.x0, a.y0, a.w, a.h);
  const lvY = a.y0 + a.h + 6 - lv * (a.h + 12);
  c.save(); grassClip(c, lvY, t, a.x0, a.x0 + a.w, a.y0 + a.h + 2); c.clip();
  c.drawImage(a.b, a.hw, 0, a.hw, a.b.height, a.x0, a.y0, a.w, a.h); c.restore();
  c.globalCompositeOperation = 'destination-in'; c.drawImage(a.mask, 0, 0); c.globalCompositeOperation = 'source-over';   // 四邊淡進紙色
}
// 小紅旗：旗桿從山頂長出來，旗面彈一下
function drawFlag(c, p, k){
  const e = k < 0.6 ? k / 0.6 * 1.15 : 1.15 - 0.15 * (k - 0.6) / 0.4, x = p[0], y = p[1] + 1;
  c.save(); c.translate(x, y); c.scale(e, e);
  c.strokeStyle = INK; c.lineWidth = 1.8; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -24); c.stroke();
  c.fillStyle = FLAG; c.lineWidth = 1.5; c.lineJoin = 'round'; c.beginPath(); c.moveTo(0.5, -24); c.quadraticCurveTo(9, -22.5, 15, -19.5); c.quadraticCurveTo(8, -17.5, 0.5, -14.5); c.closePath(); c.fill(); c.stroke();
  c.restore();
}
ML.shape = shape;   // 測試用：看某座山的山形
})();

// 山行小日子 — 步道視角渲染器（偽 3D 山徑 + 手繪墨線 + 賽璐璐上色）
// 取代 js/scene.js，對外提供 window.SX.scene。不依賴其他檔案（需在 game.js 之前載入）。
(function(){
'use strict';
const SX = window.SX = window.SX || {};
const S = SX.scene = {};

// ═════════ 常數與狀態 ═════════
const INK = '#3a2a20', TAU = Math.PI * 2;
const SEG = 1.6;        // 每段路長（公尺）
const DRAW = 150;       // 繪製段數（約 240 m）
const HZ = 6;           // 登山客在鏡頭前方幾公尺
const RW = 1.3;         // 步道半寬
const GW = 30;          // 稜線地面半寬
const FOGN = 24;        // 霧色階數
const STRIDE = 1.45;    // 一個完整步伐循環（兩步）的距離
const TWL = 720;        // 背景圖塊邏輯寬度
const FONT = "'Huninn','PingFang TC','Microsoft JhengHei',sans-serif";
const LW = 0.032;       // 道具墨線粗細（公尺）
const HIT = { note:1, btree:1, cairn:1, bench:1, view:1, treasure:1 };
const PXO = { note:RW+0.55, btree:RW+1.9, cairn:RW+0.6, bench:RW+1.0, view:RW+2.3, treasure:RW+0.4, sign:RW+0.7, summit:RW+1.0, mycairn:RW+0.35 };
const DEFWX = { kind:'sunny', time:'day' };

let cv = null, ctx = null, W = 375, H = 812, DPR = 1, F = 450, HOR = 276, CAMH = 5, U = 1;
let M = null, TH = {}, seed = 1, N = 0, total = 1;
let curve = null, elev = null, head = null, stepF = null;
let props = [], cairns = [], AP = [];
let SPR = {}, signSpr = {}, VG = {}, hazeCss = '#dfe6e2', hazeRgb = [223,230,226];
let smallTab = [], treeTab = [];
let PAL = null, tileSets = {}, palA = 'day', palB = 'day', palK = 0;
let LUT = [], lutKey = -1, snowAmt = 0;
let fogD = 300, fogD0 = 36, raysA = 0.5, sunVis = 1, isNight = false, isRain = false, isFog = false, isCloudy = false;
const cSkyT = [0,0,0], cSkyB = [0,0,0], cGrade = [255,255,255], cSun = [0.8,0.12], cSunCol = [255,246,216];
let SHADOW = null, GLOW = null, RAYS = null, FG = [], vig = null, stars = [];
// 投影暫存（每幀重用）
const pC = new Float32Array(DRAW + 3), pW = new Float32Array(DRAW + 3), pZ = new Float32Array(DRAW + 3),
      pS = new Float32Array(DRAW + 3), pX = new Float32Array(DRAW + 3), pY = new Float32Array(DRAW + 3);
let camX = 0, camY = 0, gx = 0, gy = 0, gs = 1, jhG = 3, fhG = 0;
const hits = []; let hitN = 0;
const hero = { ph:0, mv:0, py:0, pv:0, mga:0, mgv:0, lean:0, st:-1, sx:187, sy:650, u:0.75, top:520 };
const parts = [], flyers = []; let pIdx = 0;
let curS = null, curT = 0, heroDone = false;

// ═════════ 小工具 ═════════
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
function rgb(h){ if (typeof h !== 'string') return h; if (h.charCodeAt(0) === 114) { const m = h.match(/[\d.]+/g); return [+m[0], +m[1], +m[2]]; } h = h.replace('#',''); if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2]; const n = parseInt(h, 16); return [n>>16&255, n>>8&255, n&255]; }
function css(c){ return 'rgb(' + (c[0]|0) + ',' + (c[1]|0) + ',' + (c[2]|0) + ')'; }
function mix(a, b, t){ a = rgb(a); b = rgb(b); return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t]; }
function mixs(a, b, t){ return css(mix(a, b, t)); }
function rgba(c, a){ c = rgb(c); return 'rgba(' + (c[0]|0) + ',' + (c[1]|0) + ',' + (c[2]|0) + ',' + a + ')'; }
function LT(c, t){ return mixs(c, '#fff4c8', t == null ? 0.2 : t); }     // 受光色
function SH(c, t){ return mixs(c, '#33305a', t == null ? 0.3 : t); }     // 陰影色（偏藍紫）
function mkrng(s){ s = (s >>> 0) || 1; return function(){ s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function hashStr(str){ let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
// 整數雜湊 → 0..1（不配置記憶體，用於每幀的路旁植物）
function Hh(i, k){ let n = (Math.imul(i, 374761393) + Math.imul(k, 668265263) + seed) | 0; n = Math.imul(n ^ (n >>> 15), 2246822519); n = Math.imul(n ^ (n >>> 13), 3266489917); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }
function vn(x, k){ const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return Hh(i, k) * (1 - u) + Hh(i + 1, k) * u; }
function mk(w, h){ const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
function cAt(i){ return (i < 0 || i > N) ? 0 : curve[i]; }
function eAt(i){ return i <= 0 ? 0 : (i > N + 1 ? elev[N + 1] : elev[i]); }
function sAt(i){ return (i < 0 || i > N) ? 0 : stepF[i]; }
function headAt(d){ const x = clamp(d / SEG, 0, N), i = Math.floor(x); return head[i] + (head[i + 1] - head[i]) * (x - i); }

// Path2D 產生器
function pE(x, y, rx, ry, rot){ const p = new Path2D(); p.ellipse(x, y, rx, ry, rot || 0, 0, TAU); return p; }
function pR(x, y, w, h, r){ const p = new Path2D(); r = Math.min(r, w / 2, h / 2); p.moveTo(x + r, y); p.arcTo(x + w, y, x + w, y + h, r); p.arcTo(x + w, y + h, x, y + h, r); p.arcTo(x, y + h, x, y, r); p.arcTo(x, y, x + w, y, r); p.closePath(); return p; }
function pP(pts){ const p = new Path2D(); p.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]); p.closePath(); return p; }
// 花邊樹叢輪廓
function pBlob(cx, cy, rx, ry, n, r, jit){
  const p = new Path2D(), pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU, k = 1 + (r() - 0.5) * jit; pts.push(cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k); }
  p.moveTo(pts[0], pts[1]);
  for (let i = 0; i < n; i++) { const j = (i + 1) % n, mx = (pts[i*2] + pts[j*2]) / 2, my = (pts[i*2+1] + pts[j*2+1]) / 2; p.quadraticCurveTo(cx + (mx - cx) * 1.38, cy + (my - cy) * 1.38, pts[j*2], pts[j*2+1]); }
  p.closePath(); return p;
}
// 賽璐璐：先鋪陰影色，再把受光色往右上偏移（光從右上來），最後描墨線
function cel(c, p, lt, sh, dx, dy, lw){
  c.fillStyle = sh; c.fill(p);
  c.save(); c.clip(p); c.translate(dx, dy); c.fillStyle = lt; c.fill(p); c.restore();
  if (lw) { c.lineWidth = lw; c.strokeStyle = INK; c.stroke(p); }
}
function dot(c, x, y, r, col){ c.beginPath(); c.ellipse(x, y, r, r, 0, 0, TAU); c.fillStyle = col; c.fill(); }
function seg(c, x1, y1, x2, y2){ c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
function sText(g, txt, x, y, size, col){ g.save(); g.translate(x, y); g.scale(size / 40, size / 40); g.font = '700 40px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col; g.fillText(txt, 0, 0); g.restore(); }

// ═════════ 道具貼圖（預先畫好；另存一份霧化剪影做空氣透視） ═════════
function sprite(wm, hm, ppm, fn){
  const c = mk(wm * ppm, hm * ppm), g = c.getContext('2d');
  g.scale(ppm, ppm); g.translate(wm / 2, hm - 0.03); g.lineJoin = g.lineCap = 'round';
  fn(g);
  // 整體柔和漸層：右上暖光、左下冷影
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop';
  const gr = g.createLinearGradient(c.width, 0, 0, c.height);
  gr.addColorStop(0, 'rgba(255,238,190,0.24)'); gr.addColorStop(0.5, 'rgba(255,238,190,0)'); gr.addColorStop(1, 'rgba(40,36,80,0.2)');
  g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
  const h = mk(c.width / 2, c.height / 2), hg = h.getContext('2d');
  hg.drawImage(c, 0, 0, h.width, h.height); hg.globalCompositeOperation = 'source-atop'; hg.fillStyle = hazeCss; hg.fillRect(0, 0, h.width, h.height);
  return { c:c, h:h, w:wm, hm:hm, ax:0.5 };
}
function blade(g, x, ang, len, wid, col, lw){
  const tx = x + Math.sin(ang) * len, ty = -Math.cos(ang) * len, mx = x + Math.sin(ang * 0.4) * len * 0.55, my = -Math.cos(ang * 0.4) * len * 0.55;
  g.beginPath(); g.moveTo(x - wid, 0); g.quadraticCurveTo(mx - wid, my, tx, ty); g.quadraticCurveTo(mx + wid, my, x + wid, 0); g.closePath();
  g.fillStyle = col; g.fill(); if (lw) { g.lineWidth = lw; g.strokeStyle = INK; g.stroke(); }
}
function flower(g, x, y, s, col){
  dot(g, x, y, s * 1.25, SH(col, 0.35)); g.lineWidth = LW * 0.6; g.strokeStyle = INK; g.stroke();
  for (let k = 0; k < 5; k++) { const a = k / 5 * TAU - 0.4; dot(g, x + Math.cos(a) * s * 0.62, y + Math.sin(a) * s * 0.62, s * 0.55, k === 3 || k === 2 ? SH(col, 0.14) : col); }
  dot(g, x, y, s * 0.3, '#ffe9a0');
}
function pConifer(g, r, lt, sh){
  const hT = 5.2 + r() * 1.1;
  cel(g, pR(-0.14, -1.3, 0.28, 1.3, 0.05), '#8a6648', '#5e4334', 0.07, 0, LW);
  for (let i = 0; i < 5; i++) {
    const t = i / 4, yb = -0.8 - t * (hT - 1.9), w = 1.55 * (1 - t * 0.72) * (0.9 + r() * 0.2), yt = yb - (1.5 - t * 0.5), n = 5;
    const pts = [0, yt, w * 0.55, yb - 0.45, w, yb];
    for (let k = 1; k <= n; k++) { const x = w - 2 * w * k / n; pts.push(x + w / n, yb - 0.2 - r() * 0.08, x, yb + (k < n ? (r() - 0.5) * 0.12 : 0)); }
    pts.push(-w * 0.55, yb - 0.45);
    cel(g, pP(pts), lt, sh, w * 0.24, -0.05, LW);
  }
}
function pBroad(g, r){
  const tr = new Path2D(); tr.moveTo(-0.22, 0); tr.quadraticCurveTo(-0.1, -1.2, -0.16, -2.3); tr.lineTo(0.14, -2.3); tr.quadraticCurveTo(0.12, -1.2, 0.26, 0); tr.closePath();
  cel(g, tr, '#94684a', '#5f4236', 0.08, 0, LW);
  const bl = [[-0.75, -2.5, 0.85, 0.7], [0.8, -2.7, 0.85, 0.72], [0, -3.35, 1.1, 0.9]];
  for (let i = 0; i < 3; i++) { const b = bl[i]; cel(g, pBlob(b[0], b[1], b[2] * (0.9 + r() * 0.2), b[3], 9, r, 0.22), VG.bushL, VG.treeS, 0.2, -0.14, LW); }
  g.strokeStyle = rgba(INK, 0.35); g.lineWidth = LW * 0.7;
  for (let i = 0; i < 8; i++) { const x = (r() - 0.5) * 2.4, y = -2.3 - r() * 1.5; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 0.1, y - 0.12, x + 0.22, y - 0.03); g.stroke(); }
}
function pBigTree(g, r){
  const tr = new Path2D(); tr.moveTo(-1.05, 0); tr.quadraticCurveTo(-0.55, -0.6, -0.6, -3); tr.lineTo(-0.5, -6.2); tr.lineTo(0.5, -6.2); tr.lineTo(0.62, -3); tr.quadraticCurveTo(0.6, -0.6, 1.15, 0); tr.closePath();
  cel(g, tr, '#a8684a', '#6e4038', 0.3, 0, LW * 1.4);
  g.strokeStyle = rgba(INK, 0.45); g.lineWidth = LW;
  for (let i = 0; i < 7; i++) { const x = -0.42 + i * 0.14; seg(g, x, -0.4 - r(), x + (r() - 0.5) * 0.1, -2.4 - r() * 3); }
  const bl = [[-1.3, -6.3, 1.4, 1.05], [1.3, -6.6, 1.4, 1.1], [0, -7.5, 1.9, 1.4], [-0.8, -8.5, 1.25, 0.95], [0.75, -8.8, 1.15, 0.85]];
  for (let i = 0; i < bl.length; i++) { const b = bl[i]; cel(g, pBlob(b[0], b[1], b[2], b[3], 9, r, 0.2), VG.treeL, VG.treeS, 0.3, -0.2, LW * 1.4); }
}
function pSakura(g, r){
  const tr = new Path2D(); tr.moveTo(-0.2, 0); tr.quadraticCurveTo(-0.25, -1, 0.05, -1.9); tr.lineTo(0.3, -1.85); tr.quadraticCurveTo(0.05, -1, 0.22, 0); tr.closePath();
  cel(g, tr, '#7a5a52', '#4e3838', 0.07, 0, LW);
  const bl = [[-0.8, -2.2, 0.9, 0.7], [0.9, -2.3, 0.9, 0.7], [0.1, -3.0, 1.15, 0.9]];
  for (let i = 0; i < 3; i++) { const b = bl[i]; cel(g, pBlob(b[0], b[1], b[2], b[3], 10, r, 0.2), '#fbd3df', '#e79ab8', 0.2, -0.14, LW); }
  for (let i = 0; i < 22; i++) dot(g, (r() - 0.5) * 3, -1.9 - r() * 1.8, 0.05 + r() * 0.04, r() < 0.5 ? '#fff0f4' : '#f3a9c2');
}
function pRhodo(g, r, fl){
  cel(g, pBlob(0, -0.55, 0.8, 0.52, 9, r, 0.25), VG.bushL, VG.bushS, 0.16, -0.12, LW);
  g.strokeStyle = rgba(INK, 0.35); g.lineWidth = LW * 0.7;
  for (let i = 0; i < 6; i++) { const x = (r() - 0.5) * 1.1, y = -0.3 - r() * 0.6; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 0.08, y - 0.1, x + 0.16, y - 0.04); g.stroke(); }
  for (let i = 0; i < 7; i++) flower(g, (r() - 0.5) * 1.3, -0.35 - r() * 0.65, 0.085 + r() * 0.03, fl);
}
function pRock(g, r){
  const n = 7, pts = [], rx = 0.42 + r() * 0.2, ry = 0.3 + r() * 0.12;
  for (let i = 0; i < n; i++) { const a = Math.PI + i / (n - 1) * Math.PI, k = 0.82 + r() * 0.36; pts.push(Math.cos(a) * rx * k, Math.sin(a) * ry * k - 0.02); }
  pts[1] = 0; pts[n * 2 - 1] = 0;
  cel(g, pP(pts), '#cfc6b8', '#8f8794', 0.12, -0.07, LW);
  g.strokeStyle = rgba(INK, 0.4); g.lineWidth = LW * 0.7; seg(g, -0.1, -0.2, 0.02, -0.08); seg(g, 0.02, -0.08, 0.14, -0.1);
  cel(g, pE(rx * 0.85, -0.07, 0.14, 0.09, 0), '#c4baac', '#878090', 0.04, -0.03, LW);
  blade(g, -rx * 0.8, -0.5, 0.2, 0.025, VG.grassL, LW * 0.6); blade(g, -rx * 0.7, 0.3, 0.24, 0.025, VG.grassS, LW * 0.6);
}
function pTuft(g, r, n, hgt, spread, wid, a, b){
  for (let i = 0; i < n; i++) { const t = n > 1 ? i / (n - 1) : 0.5; blade(g, (t - 0.5) * 0.3 + (r() - 0.5) * 0.08, (t - 0.5) * spread + (r() - 0.5) * 0.25, hgt * (0.6 + r() * 0.4), wid, i % 2 ? a : b, LW * 0.6); }
}
function pFern(g, r){
  for (let i = 0; i < 6; i++) {
    const a = (i / 5 - 0.5) * 2.5 + (r() - 0.5) * 0.2, len = 0.5 + r() * 0.2, ex = Math.sin(a) * len, ey = -Math.cos(a) * len * 0.75 - 0.05, mx = ex * 0.35, my = ey * 1.15 - 0.12;
    for (let k = 1; k <= 8; k++) {
      const t = k / 8.5, u = 1 - t, x = 2 * u * t * mx + t * t * ex, y = 2 * u * t * my + t * t * ey, tx = 2 * u * mx + 2 * t * (ex - mx), ty = 2 * u * my + 2 * t * (ey - my), an = Math.atan2(ty, tx), L = 0.1 * (1 - t * 0.7);
      for (let sd = -1; sd <= 1; sd += 2) { g.beginPath(); g.ellipse(x + Math.cos(an + sd * 1.25) * L, y + Math.sin(an + sd * 1.25) * L, L, L * 0.36, an + sd * 1.25, 0, TAU); g.fillStyle = sd * ex > 0 ? VG.grassL : VG.bushS; g.fill(); g.lineWidth = LW * 0.45; g.strokeStyle = rgba(INK, 0.55); g.stroke(); }
    }
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(mx, my, ex, ey); g.lineWidth = LW * 0.8; g.strokeStyle = INK; g.stroke();
  }
}
function pSilver(g, r){
  pTuft(g, r, 9, 1.3, 1.5, 0.028, VG.grassL, VG.grassS);
  for (let i = 0; i < 4; i++) { const a = (i / 3 - 0.5) * 0.9 + (r() - 0.5) * 0.2, L = 1.2 + r() * 0.35, x = Math.sin(a) * L, y = -Math.cos(a) * L; g.strokeStyle = INK; g.lineWidth = LW * 0.7; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(x * 0.3, y * 0.7, x, y); g.stroke(); cel(g, pE(x + Math.sin(a + 0.5) * 0.14, y - 0.1, 0.07, 0.22, a + 0.5), '#fbf1d8', '#d9c4a0', 0.02, -0.02, LW * 0.6); }
}
function pFlowers(g, r, col){
  pTuft(g, r, 5, 0.26, 1.6, 0.02, VG.grassL, VG.grassS);
  for (let i = 0; i < 4; i++) { const x = (r() - 0.5) * 0.5, y = -0.14 - r() * 0.2; g.strokeStyle = INK; g.lineWidth = LW * 0.5; seg(g, x * 0.4, 0, x, y); flower(g, x, y, 0.045, col); }
}
function wood(g, p, lt){ cel(g, p, lt || '#c99a66', '#8a5f42', 0.03, -0.03, LW); }
function pSign(g, txt){
  wood(g, pR(-0.06, -1.4, 0.12, 1.4, 0.03), '#b98a5a');
  wood(g, pP([-0.6, -1.3, 0.52, -1.33, 0.62, -1.12, 0.5, -0.9, -0.58, -0.88]), '#e2bd86');
  g.strokeStyle = rgba(INK, 0.3); g.lineWidth = LW * 0.6; seg(g, -0.5, -1.2, 0.45, -1.22); seg(g, -0.5, -0.98, 0.4, -0.99);
  dot(g, -0.5, -1.1, 0.02, INK); dot(g, 0.47, -1.11, 0.02, INK);
  sText(g, txt, -0.03, -1.1, 0.2, INK);
}
function pSummit(g, name){
  cel(g, pE(-0.25, -0.06, 0.26, 0.11, 0), '#cfc6b8', '#8f8794', 0.06, -0.04, LW); cel(g, pE(0.3, -0.05, 0.2, 0.09, 0), '#c4baac', '#878090', 0.05, -0.03, LW);
  cel(g, pR(-0.2, -1.5, 0.4, 1.5, 0.05), '#e4ddcf', '#a59cab', 0.09, -0.02, LW);
  cel(g, pR(-0.2, -1.5, 0.4, 0.12, 0.04), '#e0664a', '#aa4038', 0.06, -0.02, LW);
  const n = Math.min(4, name.length); for (let i = 0; i < n; i++) sText(g, name[i], 0, -1.2 + i * 0.27, 0.24, INK);
}
function pNote(g){
  wood(g, pR(-0.05, -1.1, 0.1, 1.1, 0.03), '#b98a5a');
  wood(g, pR(-0.3, -1.3, 0.6, 0.5, 0.04), '#d9b27c');
  g.save(); g.translate(0.01, -1.05); g.rotate(-0.07);
  cel(g, pR(-0.2, -0.18, 0.4, 0.34, 0.015), '#fff8e2', '#e6d6b0', 0.03, -0.02, LW * 0.8);
  g.strokeStyle = rgba(INK, 0.5); g.lineWidth = LW * 0.6; seg(g, -0.13, -0.08, 0.12, -0.08); seg(g, -0.13, 0, 0.1, 0); seg(g, -0.13, 0.08, 0.04, 0.08);
  dot(g, 0, -0.15, 0.035, '#e0553f'); g.lineWidth = LW * 0.6; g.strokeStyle = INK; g.stroke();
  g.restore();
}
function pBTree(g, r){
  const tr = new Path2D(); tr.moveTo(-0.24, 0); tr.quadraticCurveTo(-0.05, -0.9, -0.2, -1.7); tr.lineTo(0.12, -1.7); tr.quadraticCurveTo(0.14, -0.9, 0.3, 0); tr.closePath();
  cel(g, tr, '#94684a', '#5f4236', 0.08, 0, LW);
  const bl = [[-0.7, -1.95, 0.75, 0.6], [0.72, -2.05, 0.75, 0.6], [0, -2.6, 1.0, 0.8]];
  for (let i = 0; i < 3; i++) { const b = bl[i]; cel(g, pBlob(b[0], b[1], b[2], b[3], 9, r, 0.2), VG.bushL, VG.treeS, 0.18, -0.12, LW); }
  const cols = ['#e0604a', '#fff3d6', '#f0b44c', '#e98aa8', '#fff3d6', '#e0604a', '#8fc0d8'];
  for (let i = 0; i < 7; i++) {
    const x = -1.05 + i * 0.35 + (r() - 0.5) * 0.1, y = -1.5 - Math.sin(i / 6 * Math.PI) * 0.12 + r() * 0.2, L = 0.18 + r() * 0.16;
    g.strokeStyle = INK; g.lineWidth = LW * 0.5; seg(g, x, y - 0.2, x, y + L);
    g.save(); g.translate(x, y + L); g.rotate((r() - 0.5) * 0.3); cel(g, pR(-0.08, 0, 0.16, 0.22, 0.02), cols[i], SH(cols[i], 0.25), 0.02, -0.02, LW * 0.7); g.restore();
  }
}
function pCairn(g, big){
  const st = big ? [[0, -0.13, 0.36, 0.14], [-0.03, -0.34, 0.28, 0.12], [0.03, -0.53, 0.2, 0.1], [0, -0.68, 0.12, 0.075]] : [[0, -0.07, 0.19, 0.08], [0.01, -0.19, 0.13, 0.065], [-0.01, -0.29, 0.08, 0.05]];
  for (let i = 0; i < st.length; i++) {
    const s = st[i];
    if (big && i === 3) { g.save(); g.translate(0.1, -0.6); g.rotate(0.2); cel(g, pR(-0.02, -0.04, 0.24, 0.16, 0.01), '#fff8e2', '#e6d6b0', 0.02, -0.01, LW * 0.7); g.restore(); }
    cel(g, pE(s[0], s[1], s[2], s[3], (i % 2 ? 0.06 : -0.05)), i % 2 ? '#d6cdbf' : '#c6bcae', '#8a8290', s[2] * 0.2, -s[3] * 0.3, LW);
  }
}
function pBench(g){
  wood(g, pR(-0.72, -0.42, 0.13, 0.42, 0.03), '#a87a52'); wood(g, pR(0.59, -0.42, 0.13, 0.42, 0.03), '#a87a52');
  wood(g, pR(-0.85, -0.52, 1.7, 0.13, 0.03), '#b0845a');
  wood(g, pP([-0.85, -0.52, 0.85, -0.52, 0.76, -0.74, -0.76, -0.74]), '#e2bd86');
  g.strokeStyle = rgba(INK, 0.4); g.lineWidth = LW * 0.6; seg(g, -0.8, -0.63, 0.8, -0.63);
  dot(g, -0.66, -0.57, 0.018, INK); dot(g, 0.66, -0.57, 0.018, INK);
}
function pView(g){
  for (let i = -1; i <= 1; i++) wood(g, pR(i * 1.3 - 0.08, -0.2, 0.16, 0.2, 0.02), '#8f6848');
  const px = [-1.45, -0.72, 0, 0.72, 1.45];
  for (let i = 0; i < 5; i++) wood(g, pR(px[i] - 0.05, -1.5, 0.1, 0.9, 0.02), '#b98a5a');
  wood(g, pR(-1.52, -1.56, 3.04, 0.11, 0.04), '#e2bd86'); wood(g, pR(-1.48, -1.12, 2.96, 0.08, 0.03), '#c99a66');
  wood(g, pR(-1.7, -0.3, 3.4, 0.2, 0.03), '#a87a52');
  wood(g, pP([-1.7, -0.3, 1.7, -0.3, 1.47, -0.68, -1.47, -0.68]), '#e2bd86');
  g.strokeStyle = rgba(INK, 0.4); g.lineWidth = LW * 0.6;
  for (let i = -3; i <= 3; i++) seg(g, i * 0.46, -0.3, i * 0.4, -0.68);
  wood(g, pR(-0.36, -1.44, 0.72, 0.28, 0.03), '#f0d9a8'); sText(g, '觀景台', 0, -1.3, 0.18, INK);
}
function pTreasure(g){
  cel(g, pR(-0.22, -0.26, 0.44, 0.26, 0.04), '#c58a4a', '#8a5a3a', 0.05, -0.03, LW);
  cel(g, pR(-0.245, -0.42, 0.49, 0.2, 0.09), '#e0a858', '#a8703f', 0.05, -0.03, LW);
  g.fillStyle = '#f6d36a'; g.fillRect(-0.04, -0.42, 0.08, 0.42); g.strokeStyle = INK; g.lineWidth = LW * 0.6; g.strokeRect(-0.04, -0.42, 0.08, 0.42);
  cel(g, pR(-0.055, -0.3, 0.11, 0.11, 0.02), '#ffe9a0', '#d9a83f', 0.02, -0.01, LW * 0.7);
}
function mkTab(list){ let sum = 0; for (let i = 0; i < list.length; i++) sum += list[i][1]; let acc = 0; return list.map(function(e){ acc += e[1] / sum; return { p:acc, arr:e[0] }; }); }
function pick(tab, r){ for (let i = 0; i < tab.length; i++) if (r < tab[i].p) return tab[i].arr; return tab[tab.length - 1].arr; }
function getSign(txt){ return signSpr[txt] || (signSpr[txt] = sprite(1.4, 1.5, 80, function(g){ pSign(g, txt); })); }
function buildSprites(){
  const r = mkrng(seed ^ 0x7f4a7c15), th = TH, a = [];
  SPR = {}; signSpr = {};
  const tL = VG.treeL, tS = VG.treeS;
  SPR.conifer = [0, 1, 2].map(function(){ return sprite(3.6, 6.8, 44, function(g){ pConifer(g, r, tL, tS); }); });
  if (th.snow) SPR.coniferS = [0, 1].map(function(){ return sprite(3.6, 6.8, 44, function(g){ pConifer(g, r, '#f4f8fb', mixs(tS, '#9fb4cc', 0.5)); }); });
  SPR.broad = [0, 1].map(function(){ return sprite(4.2, 4.8, 44, function(g){ pBroad(g, r); }); });
  if (th.bigtree) SPR.bigtree = [sprite(7.2, 10.6, 30, function(g){ pBigTree(g, r); })];
  if (th.sakura) SPR.sakura = [sprite(4.6, 4.4, 44, function(g){ pSakura(g, r); })];
  SPR.rhodo = ['#f08fb0', '#f7b4c8', '#e9769e'].map(function(col){ return sprite(2.3, 1.4, 80, function(g){ pRhodo(g, r, col); }); });
  SPR.rock = [0, 1, 2].map(function(){ return sprite(1.7, 0.8, 80, function(g){ pRock(g, r); }); });
  SPR.bamboo = [0, 1].map(function(){ return sprite(1.5, 1.2, 80, function(g){ pTuft(g, r, 13, 1.05, 2.0, 0.03, mixs(VG.grassL, '#e4dc7a', 0.3), VG.grassS); }); });
  SPR.fern = [0, 1].map(function(){ return sprite(1.7, 0.9, 80, function(g){ pFern(g, r); }); });
  SPR.grass = [0, 1].map(function(){ return sprite(0.9, 0.55, 80, function(g){ pTuft(g, r, 7, 0.45, 1.7, 0.024, VG.grassL, VG.grassS); }); });
  SPR.flower = ['#ffe07a', '#ffffff', '#b99ae6'].map(function(col){ return sprite(0.8, 0.5, 80, function(g){ pFlowers(g, r, col); }); });
  SPR.silver = [0, 1].map(function(){ return sprite(1.9, 1.9, 80, function(g){ pSilver(g, r); }); });
  SPR.note = [sprite(0.9, 1.5, 80, pNote)];
  SPR.btree = [sprite(3.6, 3.7, 60, function(g){ pBTree(g, r); })];
  SPR.cairn = [sprite(1.0, 0.95, 80, function(g){ pCairn(g, true); })];
  SPR.mycairn = [sprite(0.6, 0.45, 80, function(g){ pCairn(g, false); })];
  SPR.bench = [sprite(1.9, 0.9, 80, pBench)];
  SPR.view = [sprite(3.7, 1.75, 70, pView)];
  SPR.treasure = [sprite(0.7, 0.55, 80, pTreasure)];
  SPR.summit = [sprite(1.3, 1.7, 80, function(g){ pSummit(g, (M && M.name) || '山頂'); })];
  // 依山的主題決定路旁植物比例
  const al = th.alpine;
  smallTab = mkTab([[SPR.rhodo, al ? 3 : 1.4], [SPR.rock, (al || th.rocks || th.trail === 'scree') ? 3 : 1], [SPR.bamboo, al ? 3 : 0.5], [SPR.fern, al ? 0.3 : 2.5], [SPR.grass, 3], [SPR.flower, 1.5], [SPR.silver, th.grass ? 3 : 0.3]]);
  a.push([SPR.conifer, al ? 3 : 1.6], [SPR.broad, al ? 0.01 : 2.4]);
  if (SPR.bigtree) a.push([SPR.bigtree, 0.5]);
  if (SPR.sakura) a.push([SPR.sakura, 1.3]);
  treeTab = mkTab(a);
}

// ═════════ 世界生成：彎道、坡度、道具位置（每座山固定） ═════════
function buildCurves(m){
  const r = mkrng(seed ^ 0x9e3779b9), rt = m.route; let i;
  if (rt && rt.length >= 3) {
    // 依真實路線折線的轉角決定左右彎，讓 2.5D 山徑和雷達圖一致
    const n = rt.length, cum = [0];
    for (i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(rt[i][0] - rt[i - 1][0], rt[i][1] - rt[i - 1][1]));
    const mpu = total / (cum[n - 1] || 1);
    for (i = 1; i < n - 1; i++) {
      const ax = rt[i][0] - rt[i - 1][0], ay = rt[i][1] - rt[i - 1][1], bx = rt[i + 1][0] - rt[i][0], by = rt[i + 1][1] - rt[i][1];
      const ang = Math.atan2(ax * by - ay * bx, ax * bx + ay * by);      // y 向下：正值 = 右彎
      const lenB = clamp(Math.min(cum[i] - cum[i - 1], cum[i + 1] - cum[i]) * mpu * 0.8, 40, 140);
      const c = clamp(ang / lenB * SEG * SEG, -0.03, 0.03), s0 = Math.floor((cum[i] * mpu - lenB / 2) / SEG), cnt = Math.ceil(lenB / SEG);
      for (let k = 0; k < cnt; k++) { const j = s0 + k; if (j >= 0 && j < N) curve[j] += c * 1.57 * Math.sin((k + 0.5) / cnt * Math.PI); }
    }
    for (i = 0; i < N; i++) curve[i] = clamp(curve[i] + (vn(i * 0.045, 91) - 0.5) * 0.006, -0.032, 0.032);
  } else {
    // 沒有路線資料：固定亂數的 S 彎
    i = 8; let sign = r() < 0.5 ? -1 : 1;
    while (i < N) {
      const len = 20 + Math.floor(r() * 45), amp = sign * (0.004 + r() * 0.016);
      for (let k = 0; k < len && i < N; k++, i++) curve[i] = amp * Math.sin((k + 0.5) / len * Math.PI);
      i += Math.floor(r() * 14); sign = r() < 0.78 ? -sign : sign;
    }
  }
  const e = Math.floor(total / SEG);
  for (i = e; i <= N; i++) curve[i] *= Math.max(0, 1 - (i - e) / 20);   // 山頂之後拉直
  head[0] = 0; for (i = 0; i <= N; i++) head[i + 1] = head[i] + curve[i] / SEG;
}
function buildElev(m){
  const tr = TH.trail, base = clamp(((m.alt || 0) - (m.startAlt || 0)) / total, 0.05, 0.3) * 1.25, e = Math.floor(total / SEG);
  elev[0] = 0;
  for (let i = 0; i <= N; i++) {
    let sl = clamp(base * (0.25 + 1.5 * vn(i * 0.035, 7)) + 0.05 * (vn(i * 0.21, 8) - 0.3), 0.015, 0.42);
    if (i >= e) sl *= Math.max(0, 1 - (i - e) / 12);
    elev[i + 1] = elev[i] + sl * SEG;
    // 階梯只出現在石階型步道，或土路／碎石路上偶爾一小段很陡的地方；其餘都是原始土坡
    const patch = vn(i * 0.06, 11) > 0.62;
    stepF[i] = ((tr === 'stairs' && sl > 0.05) || (tr === 'wood' && sl > 0.16) || (sl > 0.3 && patch)) ? 1 : 0;
  }
}
function buildProps(){
  const r = mkrng(seed ^ 0x51ed27), lim = total - 18, TT = ['note', 'btree', 'cairn']; let m, o;
  props = [];
  function put(type, mm, side){
    mm = Math.round(mm);
    for (let k = 0; k < props.length; k++) if (Math.abs(props[k].m - mm) < 14) { mm += 16; k = -1; }
    if (mm < 25 || mm > lim) return null;
    const p = { type:type, m:mm, side:side, text:'' }; props.push(p); return p;
  }
  for (m = 45 + r() * 60; m < lim; m += 150 + r() * 110) put(TT[Math.floor(r() * 3)], m, r() < 0.5 ? -1 : 1);
  for (m = 160 + r() * 120; m < lim; m += 300 + r() * 150) put('bench', m, r() < 0.5 ? -1 : 1);
  for (m = 420 + r() * 250; m < lim; m += 700 + r() * 300) put('view', m, r() < 0.5 ? -1 : 1);
  for (m = 260 + r() * 400; m < lim; m += 600 + r() * 600) put('treasure', m, r() < 0.5 ? -1 : 1);
  for (m = 500; m < lim; m += 500) { o = put('sign', m, 1); if (o) { const left = total - m; o.text = left >= 1000 ? '山頂 ' + (left / 1000).toFixed(1) + 'K' : '山頂 ' + Math.round(left / 10) * 10 + 'm'; } }
  props.push({ type:'summit', m:total + 3, side:1, text:'' });
  mergeProps();
}
function mergeProps(){ AP = props.concat(cairns); AP.sort(function(a, b){ return a.m - b.m; }); }

// ═════════ 色盤、地面色表、背景圖塊 ═════════
function buildPalettes(){
  const sky = TH.sky || ['#9fd3ee', '#fbe7c6'];
  PAL = {
    day:    { skyT:rgb(sky[0]), skyB:rgb(sky[1]), grade:[255,255,255], sun:[0.80,0.11], sunCol:[255,246,216], rays:0.3,  cloudL:'#ffffff', cloudS:'#c4d4e8', tint:'#ffffff', tk:0 },
    sunset: { skyT:rgb('#6f7fc0'), skyB:rgb('#ffc98a'), grade:[255,222,190], sun:[0.72,0.295], sunCol:[255,214,130], rays:0.55, cloudL:'#ffe2bc', cloudS:'#d294a4', tint:'#8a5f92', tk:0.42 },
    dawn:   { skyT:rgb('#8fa9de'), skyB:rgb('#ffdccc'), grade:[246,226,230], sun:[0.76,0.30], sunCol:[255,240,210], rays:0.4,  cloudL:'#fff2ec', cloudS:'#c9b6d8', tint:'#8f93c4', tk:0.32 },
    dusk:   { skyT:rgb('#565a9a'), skyB:rgb('#f59a68'), grade:[236,190,160], sun:[0.70,0.32], sunCol:[255,160,96],  rays:0.38, cloudL:'#f9c0a0', cloudS:'#8f6ea0', tint:'#5d4c86', tk:0.5 },
    night:  { skyT:rgb('#27306a'), skyB:rgb('#5868a8'), grade:[96,112,170],  sun:[0.78,0.13], sunCol:[244,240,216], rays:0,    cloudL:'#d4dcf6', cloudS:'#8690c4', tint:'#3d4a84', tk:0.45 }
  };
  for (const k in PAL) PAL[k].valley = mixs(PAL[k].cloudS, mix(TH.mid || '#5a8a5f', PAL[k].tint, PAL[k].tk), 0.3);
}
function wxMix(t, r, g, b){ cSkyT[0] = lerp(cSkyT[0], r, t); cSkyT[1] = lerp(cSkyT[1], g, t); cSkyT[2] = lerp(cSkyT[2], b, t); t *= 0.8; cSkyB[0] = lerp(cSkyB[0], r + 18, t); cSkyB[1] = lerp(cSkyB[1], g + 18, t); cSkyB[2] = lerp(cSkyB[2], b + 18, t); }
function updPalette(wx, frac){
  const tm = wx.time, kind = wx.kind; let a, b, k, i;
  if (!PAL[tm] || tm === 'day') {            // 白天：隨爬升比例從午後晴空漸變到雲海夕照
    a = 'day'; b = 'sunset'; k = clamp(frac, 0, 1); if (TH.sunset) k = 0.35 + 0.65 * k;
    k = k * k * (3 - 2 * k); if (k < 0.02) { k = 0; b = 'day'; }
  } else { a = b = tm; k = 0; }
  palA = a; palB = b; palK = k;
  const A = PAL[a], B = PAL[b];
  for (i = 0; i < 3; i++) { cSkyT[i] = lerp(A.skyT[i], B.skyT[i], k); cSkyB[i] = lerp(A.skyB[i], B.skyB[i], k); cGrade[i] = lerp(A.grade[i], B.grade[i], k); cSunCol[i] = lerp(A.sunCol[i], B.sunCol[i], k); }
  cSun[0] = lerp(A.sun[0], B.sun[0], k); cSun[1] = lerp(A.sun[1], B.sun[1], k);
  raysA = lerp(A.rays, B.rays, k); sunVis = 1; fogD = 300;
  isNight = a === 'night'; isRain = kind === 'rain'; isFog = kind === 'fog'; isCloudy = kind === 'cloudy';
  if (isCloudy) { wxMix(0.5, 176, 184, 196); cGrade[0] *= 0.86; cGrade[1] *= 0.88; cGrade[2] *= 0.92; raysA *= 0.25; sunVis = 0.45; fogD = 240; }
  else if (isRain) { wxMix(0.75, 138, 148, 164); cGrade[0] *= 0.7; cGrade[1] *= 0.74; cGrade[2] *= 0.82; raysA = 0; sunVis = 0; fogD = 170; }
  else if (isFog) { wxMix(0.6, 222, 228, 230); cGrade[0] *= 0.95; cGrade[1] *= 0.96; cGrade[2] *= 0.97; raysA *= 0.5; sunVis = 0.5; fogD = 80; }
  fogD0 = fogD * 0.12;
  snowAmt = TH.snow ? clamp((frac - 0.4) / 0.35, 0, 1) * (isRain ? 0.3 : 1) * ((tm === 'night' || tm === 'dawn') ? 1 : 0.85) : 0;
  const key = Math.round(snowAmt * 8);
  if (key !== lutKey) { lutKey = key; buildLUT(key / 8); }
}
// 地面色表：種類(7) × 明暗(3) × 霧階(FOGN)，只在積雪量改變時重建
function buildLUT(sn){
  const th = TH, tr = th.trail || 'dirt', near = th.near || '#86c06a', mid = th.mid || '#5a8a5f';
  const road = tr === 'stairs' ? '#d2c6ae' : tr === 'wood' ? '#c2925e' : tr === 'scree' ? '#bdb5a8' : '#cfad7c';
  const base = [
    mix(near, '#f2f6fa', sn * 0.88), mix(mix(near, mid, 0.22), '#e6eef6', sn * 0.88),             // 0,1 草地
    mix(road, '#eef2f6', sn * 0.5), mix(mix(road, INK, 0.07), '#eef2f6', sn * 0.5),                // 2,3 路面
    mix(road, INK, 0.5),                                                                         // 4 路緣／墨色
    (tr === 'dirt' || tr === 'scree') ? rgb('#8f6644') : mix(road, INK, 0.34),                     // 5 階梯立面
    mix(mid, '#22382f', 0.45)                                                                    // 6 稜線邊坡
  ];
  LUT.length = 0;
  for (let k = 0; k < base.length; k++) for (let lv = 0; lv < 3; lv++) {
    const c = lv === 0 ? mix(base[k], '#2c3560', 0.27) : lv === 2 ? mix(base[k], '#fff0b4', 0.2) : base[k];
    for (let f = 0; f < FOGN; f++) LUT.push(css(mix(c, hazeRgb, f / (FOGN - 1))));
  }
}
function addPoly(L, pts, ox){ L.moveTo(pts[0] + ox, pts[1]); for (let i = 2; i < pts.length; i += 2) L.lineTo(pts[i] + ox, pts[i + 1]); L.closePath(); }
// 遠山圖塊（左右無縫）：右坡受光、左坡陰影、墨線稜線、山腳霧氣
function ridgeTile(k, P){
  const TS = 1.25, hT = [150, 130, 115][k], c = mk(TWL * TS, hT * TS), g = c.getContext('2d'), r = mkrng(seed + k * 7919 + 13), th = TH;
  g.scale(TS, TS); g.lineJoin = 'round';
  let base = k === 0 ? rgb(th.far || '#8fb3a8') : k === 1 ? mix(th.far || '#8fb3a8', th.mid || '#5a8a5f', 0.55) : mix(th.mid || '#5a8a5f', '#2f5a48', 0.3);
  base = mix(base, P.tint, P.tk);
  const hz = mix(P.skyB, P.cloudL, 0.5), bh = mix(base, hz, [0.45, 0.25, 0.08][k]);
  const lt = mixs(bh, '#fff2c4', 0.22), sh = mixs(bh, '#3a3868', 0.26);
  const n = TWL / 4, hs = new Float32Array(n + 1), ph = [], amp = [[34,22,14,9,5],[26,20,13,8,5],[20,16,12,8,5]][k], fr = [2,3,5,8,13];
  let i, mn = 1e9, mx = -1e9;
  for (i = 0; i < 5; i++) ph.push(r() * TAU, r() * Math.PI);
  for (i = 0; i <= n; i++) { const x = i / n; let v = 0; for (let q = 0; q < 5; q++) v += amp[q] * 0.45 * Math.sin(x * TAU * fr[q] + ph[q * 2]) + amp[q] * 0.75 * (1 - Math.abs(Math.sin(x * Math.PI * fr[q] + ph[q * 2 + 1]))); hs[i] = v; if (v < mn) mn = v; if (v > mx) mx = v; }
  for (i = 0; i <= n; i++) hs[i] = lerp(hT * 0.74, 8, (hs[i] - mn) / (mx - mn));
  hs[n] = hs[0];
  const R = new Path2D(); R.moveTo(0, hT); for (i = 0; i <= n; i++) R.lineTo(i * 4, hs[i]); R.lineTo(TWL, hT); R.closePath();
  g.fillStyle = sh; g.fill(R);
  const L = new Path2D();
  for (i = 0; i < n; i++) {
    if (!(hs[i] < hs[(i - 1 + n) % n] && hs[i] <= hs[i + 1])) continue;       // 只處理山峰
    let j = i; const pts = [i * 4, hs[i]];
    while (j - i < n && hs[(j + 1) % n] > hs[j % n]) { j++; pts.push(j * 4, hs[j % n]); }
    if (hs[j % n] - hs[i] < 5) continue;
    pts.push(j * 4 - 2, hT);
    let sx = i * 4, sy = hs[i], q = 0; const sp = [];
    while (sy < hT) { sy += 9 + r() * 8; sx += (q % 2 ? 7 : -9) - 2 + r() * 3; q++; sp.push(sx, sy); }
    for (let q2 = sp.length - 2; q2 >= 0; q2 -= 2) pts.push(sp[q2], sp[q2 + 1]);
    addPoly(L, pts, 0); addPoly(L, pts, -TWL);
  }
  g.save(); g.clip(R); g.fillStyle = lt; g.fill(L);
  if (th.snow && k < 2) {                    // 高山雪線
    const Z = new Path2D(), sl = hT * 0.36;
    Z.moveTo(0, 0); Z.lineTo(TWL, 0); for (let x = TWL; x >= 0; x -= 12) Z.lineTo(x, sl + ((x / 12) % 2 ? 6 : -4)); Z.closePath();
    g.clip(Z); g.fillStyle = mixs('#b4c4e0', hz, 0.2); g.fillRect(0, 0, TWL, hT); g.fillStyle = mixs('#fbfdff', hz, 0.1); g.fill(L);
  }
  g.restore();
  g.beginPath(); g.moveTo(0, hs[0]); for (i = 1; i <= n; i++) g.lineTo(i * 4, hs[i]);
  g.strokeStyle = css(mix(INK, hz, [0.55, 0.35, 0.15][k])); g.lineWidth = [1, 1.3, 1.6][k]; g.stroke();
  const gr = g.createLinearGradient(0, hT * 0.45, 0, hT); gr.addColorStop(0, rgba(hz, 0)); gr.addColorStop(1, rgba(hz, [0.95, 0.9, 0.75][k]));
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = gr; g.fillRect(0, 0, TWL, hT);
  return c;
}
// 雲海圖塊：一球一球的雲頂，上亮下暗
function cloudTile(k, P){
  const TS = 1.25, hT = k ? 120 : 84, c = mk(TWL * TS, hT * TS), g = c.getContext('2d'), r = mkrng(seed + k * 104729 + 77), sc = k ? 1 : 0.62;
  g.scale(TS, TS);
  const line = rgba(mix(INK, P.cloudS, 0.6), 0.5), OX = [0, -TWL, TWL];
  for (let row = 0; row < 3; row++) {
    const by = (28 + row * 20) * sc + (k ? 4 : 2), lit = mixs(P.cloudL, P.cloudS, 0.22 * (2 - row)), sh = mixs(P.cloudS, P.cloudL, 0.15 * row), puffs = [];
    let x = r() * 30;
    while (x < TWL) { const rad = (15 + r() * 17) * sc * (1 + row * 0.12); puffs.push(x, by - rad * 0.25 + (r() - 0.5) * 8 * sc, rad); x += rad * (1.05 + r() * 0.5); }
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < puffs.length; i += 3) for (let o = 0; o < 3; o++) {
      const px = puffs[i] + OX[o], py = puffs[i + 1], rad = puffs[i + 2];
      if (px + rad < 0 || px - rad > TWL) continue;
      if (pass === 0) { dot(g, px, py, rad, sh); g.beginPath(); g.arc(px, py, rad, Math.PI * 1.08, Math.PI * 1.92); g.strokeStyle = line; g.lineWidth = 1; g.stroke(); }
      else dot(g, px + rad * 0.16, py - rad * 0.14, rad * 0.84, lit);
    }
    const gr = g.createLinearGradient(0, by + 8 * sc, 0, hT); gr.addColorStop(0, mixs(lit, sh, 0.45)); gr.addColorStop(1, row === 2 ? mixs(lit, sh, 0.2) : sh);
    g.fillStyle = gr; g.fillRect(0, by + 8 * sc, TWL, hT);
  }
  return c;
}
function getTiles(key){
  let T = tileSets[key]; if (T) return T;
  const ks = Object.keys(tileSets);
  if (ks.length >= 3) for (let i = 0; i < ks.length; i++) if (ks[i] !== palA && ks[i] !== palB) delete tileSets[ks[i]];
  const P = PAL[key];
  T = tileSets[key] = { r:[ridgeTile(0, P), ridgeTile(1, P), ridgeTile(2, P)], c:[cloudTile(0, P), cloudTile(1, P)] };
  return T;
}
function tile(img, off, y, h, a){
  if (a <= 0.01) return;
  const w = TWL * U; let x = -(((off % w) + w) % w);
  ctx.globalAlpha = a; for (; x < W; x += w) ctx.drawImage(img, x, y, w + 1, h); ctx.globalAlpha = 1;
}
function layer(TA, TB, grp, idx, off, y, h){ tile(TA[grp][idx], off, y, h, 1); if (TB) tile(TB[grp][idx], off, y, h, palK); }
function drawBG(t, dist){
  const g = ctx.createLinearGradient(0, 0, 0, HOR + 30 * U);
  g.addColorStop(0, css(cSkyT)); g.addColorStop(1, css(cSkyB)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const sx = cSun[0] * W, sy = cSun[1] * H; let i;
  if (isNight) {
    ctx.fillStyle = '#ffffff';
    for (i = 0; i < stars.length; i += 4) { ctx.globalAlpha = 0.55 + 0.45 * Math.sin(t * 1.7 + stars[i + 3]); ctx.fillRect(stars[i], stars[i + 1], stars[i + 2], stars[i + 2]); }
    ctx.globalAlpha = sunVis;
    dot(ctx, sx, sy, 17 * U, '#f6f2dc'); dot(ctx, sx - 5 * U, sy - 3 * U, 3.2 * U, '#dcd8c4'); dot(ctx, sx + 6 * U, sy + 5 * U, 2.2 * U, '#dcd8c4');
    ctx.globalAlpha = 1;
  } else if (sunVis > 0) {
    const R = 64 * U, gr = ctx.createRadialGradient(sx, sy, 0, sx, sy, R);
    gr.addColorStop(0, '#fffdf2'); gr.addColorStop(0.26, rgba(cSunCol, 1)); gr.addColorStop(0.3, rgba(cSunCol, 0.42)); gr.addColorStop(1, rgba(cSunCol, 0));
    ctx.globalAlpha = sunVis; ctx.fillStyle = gr; ctx.fillRect(sx - R, sy - R, R * 2, R * 2); ctx.globalAlpha = 1;
  }
  const TA = getTiles(palA), TB = (palB !== palA && palK > 0.01) ? getTiles(palB) : null;
  const hd = headAt(dist) * F, hv = Math.sin(t * 0.5) * 3 * U;        // 視差：依累積轉向角平移
  if (isCloudy || isRain) tile(TA.c[1], hd * 0.3 + t * 5, -40 * U, 190 * U, 0.62);   // 高空厚雲
  layer(TA, TB, 'r', 0, hd * 0.5, HOR - 136 * U, 150 * U);
  layer(TA, TB, 'c', 0, hd * 0.6 + t * 3, HOR - 52 * U + hv * 0.5, 84 * U);
  layer(TA, TB, 'r', 1, hd * 0.7, HOR - 92 * U, 130 * U);
  layer(TA, TB, 'r', 2, hd * 0.85, HOR - 56 * U, 115 * U);
  ctx.fillStyle = PAL[palA].valley; ctx.fillRect(0, HOR + 54 * U, W, H);
  layer(TA, TB, 'c', 1, hd + t * 7, HOR - 34 * U - hv, 120 * U);
}

// ═════════ 一次性素材：影子、光點、神光、前景散景葉、暗角 ═════════
function buildStatic(){
  SHADOW = mk(64, 32); let g = SHADOW.getContext('2d'); g.scale(1, 0.5);
  let gr = g.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(50,34,44,0.46)'); gr.addColorStop(0.6, 'rgba(50,34,44,0.22)'); gr.addColorStop(1, 'rgba(50,34,44,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  GLOW = mk(48, 48); g = GLOW.getContext('2d');
  gr = g.createRadialGradient(24, 24, 0, 24, 24, 24); gr.addColorStop(0, 'rgba(255,244,200,1)'); gr.addColorStop(0.25, 'rgba(255,222,140,0.7)'); gr.addColorStop(1, 'rgba(255,200,90,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 48, 48);
}
function buildRays(){
  const w = Math.ceil(W / 2), h = Math.ceil(H / 2), r = mkrng(4242), L = Math.hypot(w, h) * 1.05;
  RAYS = mk(w, h); const g = RAYS.getContext('2d');
  g.translate(w * 1.04, -h * 0.06);
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.6 + i * 0.045 + r() * 0.02), wd = L * (0.02 + r() * 0.035), gr = g.createLinearGradient(0, 0, L, 0);
    gr.addColorStop(0, 'rgba(255,226,150,0.5)'); gr.addColorStop(0.55, 'rgba(255,226,150,0.2)'); gr.addColorStop(1, 'rgba(255,226,150,0)');
    g.save(); g.rotate(a); g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.lineTo(L, -wd); g.lineTo(L, wd); g.closePath(); g.fill(); g.restore();
  }
}
function fgFrond(g, x, y, ang, len){
  const ex = x + Math.sin(ang) * len, ey = y - Math.cos(ang) * len * 0.8, mx = x + Math.sin(ang * 0.5) * len * 0.5, my = y - Math.cos(ang * 0.5) * len * 0.75;
  for (let k = 1; k <= 11; k++) {
    const t = k / 11.5, u = 1 - t, px = u * u * x + 2 * u * t * mx + t * t * ex, py = u * u * y + 2 * u * t * my + t * t * ey, an = Math.atan2(2 * u * (my - y) + 2 * t * (ey - my), 2 * u * (mx - x) + 2 * t * (ex - mx)), L = len * 0.13 * (1 - t * 0.75);
    for (let sd = -1; sd <= 1; sd += 2) { g.beginPath(); g.ellipse(px + Math.cos(an + sd * 1.2) * L, py + Math.sin(an + sd * 1.2) * L, L, L * 0.34, an + sd * 1.2, 0, TAU); g.fillStyle = sd > 0 ? '#3a6a4c' : '#2b5040'; g.fill(); g.lineWidth = 1.6; g.strokeStyle = INK; g.stroke(); }
  }
  g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(mx, my, ex, ey); g.lineWidth = 2.4; g.strokeStyle = INK; g.stroke();
}
function fgWhorl(g, x, y, rad, r, fl){
  const a0 = r() * TAU;
  for (let i = 0; i < 7; i++) { const a = a0 + i / 7 * TAU; g.beginPath(); g.ellipse(x + Math.cos(a) * rad * 0.55, y + Math.sin(a) * rad * 0.55, rad * 0.5, rad * 0.17, a, 0, TAU); g.fillStyle = i % 2 ? '#2f5a44' : '#3f7352'; g.fill(); g.lineWidth = 2; g.strokeStyle = INK; g.stroke(); }
  if (fl) for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; dot(g, x + Math.cos(a) * rad * 0.2, y + Math.sin(a) * rad * 0.2, rad * 0.17, i % 2 ? '#f7b4c8' : '#f08fb0'); g.lineWidth = 1.4; g.strokeStyle = INK; g.stroke(); }
}
function buildFG(){
  FG = []; const r = mkrng(90210), defs = [[0.4, 0.34], [0.36, 0.28], [0.5, 0.17]];
  for (let k = 0; k < 3; k++) {
    const w = Math.ceil(W * defs[k][0]), h = Math.ceil(H * defs[k][1]), big = mk(w, h), g = big.getContext('2d'); let i;
    g.lineJoin = g.lineCap = 'round';
    if (k === 0) {        // 左下：蕨葉 + 杜鵑
      for (i = 0; i < 5; i++) { const an = 0.05 + i * 0.26 + r() * 0.1; fgFrond(g, w * 0.03, h * 1.02, an, Math.min(h * (0.5 + r() * 0.3), w * 0.8 / Math.max(0.3, Math.sin(an)))); }
      fgWhorl(g, w * 0.06, h * 0.34, w * 0.26, r, false); fgWhorl(g, w * 0.14, h * 0.6, w * 0.27, r, true); fgWhorl(g, w * 0.3, h * 0.86, w * 0.25, r, true);
    } else if (k === 1) { // 右下：蕨葉 + 葉叢
      for (i = 0; i < 5; i++) { const an = 0.05 + i * 0.27 + r() * 0.1; fgFrond(g, w * 0.97, h * 1.02, -an, Math.min(h * (0.5 + r() * 0.3), w * 0.8 / Math.max(0.3, Math.sin(an)))); }
      fgWhorl(g, w * 0.86, h * 0.62, w * 0.3, r, true); fgWhorl(g, w * 0.66, h * 0.9, w * 0.26, r, false);
    } else {              // 左上：伸進畫面的枝條
      g.beginPath(); g.moveTo(-6, h * 0.12); g.quadraticCurveTo(w * 0.4, h * 0.1, w * 0.86, h * 0.62);
      g.lineWidth = 8; g.strokeStyle = INK; g.stroke(); g.lineWidth = 4.5; g.strokeStyle = '#6a4a3c'; g.stroke();
      const ts = [0.2, 0.42, 0.64, 0.84];
      for (i = 0; i < 4; i++) { const t = ts[i], u = 1 - t; fgWhorl(g, 2 * u * t * w * 0.4 + t * t * w * 0.86, u * u * h * 0.12 + 2 * u * t * h * 0.1 + t * t * h * 0.62 + h * 0.06, w * (0.17 - i * 0.015), r, i === 2); }
    }
    // 先縮小再放大 → 景深模糊
    const s1 = mk(w / 2, h / 2); s1.getContext('2d').drawImage(big, 0, 0, s1.width, s1.height);
    const s2 = mk(w / 3.4, h / 3.4); s2.getContext('2d').drawImage(s1, 0, 0, s2.width, s2.height);
    FG.push({ c:s2, w:w, h:h });
  }
}
function drawFG(t){
  if (FG.length < 3) return;
  let f = FG[0];
  ctx.save(); ctx.translate(0, H); ctx.rotate(Math.sin(t * 0.8) * 0.018); ctx.drawImage(f.c, -6, -f.h + 6, f.w, f.h); ctx.restore();
  f = FG[1];
  ctx.save(); ctx.translate(W, H); ctx.rotate(Math.sin(t * 0.7 + 1.3) * 0.02); ctx.drawImage(f.c, -f.w + 6, -f.h + 6, f.w, f.h); ctx.restore();
  f = FG[2];
  ctx.save(); ctx.rotate(Math.sin(t * 0.6 + 2.1) * 0.015); ctx.drawImage(f.c, -6, -6, f.w, f.h); ctx.restore();
}

// ═════════ 對外：初始化／尺寸／換山 ═════════
S.init = function(canvas){ cv = canvas; ctx = cv.getContext('2d'); if (!SHADOW) buildStatic(); S.resize(); };
S.resize = function(){
  if (!cv) return;
  const p = cv.parentElement, bw = p ? p.clientWidth : 0, bh = p ? p.clientHeight : 0, rc = (bw && bh) ? null : cv.getBoundingClientRect();
  const w = Math.max(1, Math.round(bw || (rc && rc.width) || 375)), h = Math.max(1, Math.round(bh || (rc && rc.height) || 812));
  const d = Math.min(2, window.devicePixelRatio || 1);
  if (w === W && h === H && d === DPR && RAYS && cv.width === Math.round(w * d)) return;
  W = w; H = h; DPR = d; cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  F = Math.min(W * 1.2, H * 0.62); HOR = Math.round(H * 0.34); CAMH = 0.46 * H * HZ / F; U = H / 812;
  buildRays(); buildFG();
  vig = ctx.createRadialGradient(W / 2, H * 0.5, H * 0.32, W / 2, H * 0.5, H * 0.78);
  vig.addColorStop(0, 'rgba(48,30,24,0)'); vig.addColorStop(1, 'rgba(48,30,24,0.36)');
  const r = mkrng(777); stars = [];
  for (let i = 0; i < 70; i++) stars.push(r() * W, r() * HOR * 0.95, 1 + r() * 1.6, r() * TAU);
};
S.setMountain = function(m){
  if (M === m && curve && PAL && SPR.conifer) { cairns = []; mergeProps(); hero.st = -1; hitN = 0; return; }   // 同一座山：不重畫貼圖和背景
  M = m; TH = m.theme || {}; seed = hashStr(String(m.id || m.name || 'x')); total = Math.max(50, m.dist || 1000);
  N = Math.ceil((total + 320) / SEG);
  curve = new Float32Array(N + 1); elev = new Float32Array(N + 2); head = new Float64Array(N + 2); stepF = new Uint8Array(N + 1);
  const mid = TH.mid || '#5a8a5f', near = TH.near || '#86c06a';
  hazeRgb = mix(TH.far || '#8fb3a8', '#f4f1e6', 0.5); hazeCss = css(hazeRgb);
  VG = { treeL:mixs(mid, '#4f9060', 0.35), treeS:mixs(mid, '#243f4a', 0.55), bushL:mixs(near, '#4f9a58', 0.5), bushS:mixs(mid, '#28484a', 0.45), grassL:mixs(near, '#d8e07a', 0.25), grassS:mixs(near, '#3f6f50', 0.5) };
  buildCurves(m); buildElev(m); cairns = []; buildProps(); buildPalettes(); buildSprites();
  tileSets = {}; lutKey = -1; hero.st = -1; hitN = 0; initFlyers();
};
S.props = function(fromM, toM){
  const out = [];
  for (let i = 0; i < AP.length; i++) { const o = AP[i]; if (o.m >= fromM && o.m <= toM && HIT[o.type]) out.push({ type:o.type, m:o.m, side:o.side }); }
  return out;
};
S.addCairn = function(m, side){ cairns.push({ type:'mycairn', m:Math.max(0, +m || 0), side:side < 0 ? -1 : 1, text:'' }); mergeProps(); };
S.setCairns = function(list){
  cairns = [];
  if (list) for (let i = 0; i < list.length; i++) { const c = list[i]; if (c) cairns.push({ type:'mycairn', m:Math.max(0, +(c.m != null ? c.m : c[0]) || 0), side:(c.side != null ? c.side : c[1]) < 0 ? -1 : 1, text:'' }); }
  mergeProps();
};

// ═════════ 角色：登山客（背影）與柴犬 ═════════
let JK_L = '#ee8458', JK_S = '#bb5540', PANT_L = '#6a8a9c', PANT_S = '#44607a', BOOT_L = '#8a5c40', BOOT_S = '#5a3a2c', SOLE_L = '#57423a', SOLE_S = '#3a2a24';
let BAG_L = '#f4bd58', BAG_S = '#c98a3c', LID_L = '#e9a244', LID_S = '#b9742f', BGP_L = '#f7cf7c', BGP_S = '#cf9a48', MAT_L = '#9cc4ac', MAT_S = '#628e80';
let BOT_L = '#8fd0e4', BOT_S = '#5398b8', MUG_L = '#e2e6e8', MUG_S = '#9aa4b0', HAT_L = '#f7e8c0', HAT_S = '#cfb38a', HAIR_L = '#6a4632', HAIR_S = '#4a2f24', SKIN = '#f6cba6';
const PON_L = '#f6d968', PON_S = '#cba740', DOG_L = '#e9a55c', DOG_S = '#b9743f', CRM_L = '#fff3de', CRM_S = '#dcc3a0';
const LEAFC = ['#8fbf5a', '#d9a441', '#c9703f', '#6fa85a'];

function updHero(s, t, dt, dist, sp){
  const mv = (sp > 0.05 && !s.rest && !s.sleep) ? 1 : 0;
  hero.mv += (mv - hero.mv) * Math.min(1, dt * 8);
  hero.ph = dist / STRIDE * TAU;
  // 背包：阻尼彈簧跟著步伐上下彈
  const tgt = -Math.abs(Math.sin(hero.ph)) * 3 * hero.mv;
  hero.pv += ((tgt - hero.py) * 140 - hero.pv * 14) * dt; hero.py += hero.pv * dt;
  // 鋼杯：單擺
  hero.mgv += (-hero.mga * 60 - hero.mgv * 3 + Math.cos(hero.ph) * 14 * hero.mv + Math.sin(t * 1.3) * 0.6) * dt;
  hero.mga = clamp(hero.mga + hero.mgv * dt, -0.9, 0.9);
  hero.lean += ((s.boost && mv ? 1 : mv ? 0.45 : 0) - hero.lean) * Math.min(1, dt * 5);
  // 每次落腳揚起一點塵土
  const st = Math.floor(hero.ph / Math.PI + 0.5);
  if (st !== hero.st) { if (hero.st !== -1 && mv && !isRain) S.burst(hero.sx + ((st & 1) ? 10 : -10) * hero.u, hero.sy - 2, 'dust', 2); hero.st = st; }
}
function limb(c, x1, y1, qx, qy, x2, y2, w, lt, sh){
  c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo(qx, qy, x2, y2);
  c.strokeStyle = INK; c.lineWidth = w + 3.6; c.stroke(); c.strokeStyle = sh; c.lineWidth = w; c.stroke();
  c.beginPath(); c.moveTo(x1 + w * 0.16, y1); c.quadraticCurveTo(qx + w * 0.16, qy, x2 + w * 0.16, y2); c.strokeStyle = lt; c.lineWidth = w * 0.56; c.stroke();
}
// f：腳往前(+)／往後(-)；lift：擺動中抬起的高度
function leg(c, side, f, lift){
  const hx = side * 9, hy = -64, k = 1 - f * 0.07, fx = side * 10, fy = -f * 9 - lift * 6;
  limb(c, hx, hy, side * (11 + lift * 2), (hy + fy) / 2 - lift * 5 - (f > 0 ? f * 3 : 0), fx, fy - 12 * k, 13 * k, PANT_L, PANT_S);
  if (f < -0.15 && lift > 0.15) {           // 後腳抬起：看得到鞋底
    cel(c, pE(fx, fy - 7, 7.5 * k, 9.5 * k, side * 0.12), SOLE_L, SOLE_S, 1.5, -1.5, 2);
    c.strokeStyle = 'rgba(240,220,190,0.5)'; c.lineWidth = 1.3;
    for (let q = -1; q <= 1; q++) seg(c, fx - 4.5, fy - 7 + q * 4.5, fx + 4.5, fy - 7 + q * 4.5);
  } else cel(c, pR(fx - 7.5 * k, fy - 13 * k, 15 * k, 13 * k, 5 * k), BOOT_L, BOOT_S, 2, -1.5, 2);
}
function pole(c, side, hx, hy, fwd, lift){
  const tx = side * 37, ty = -fwd * 13 - lift * 4 + 1;
  c.strokeStyle = INK; c.lineWidth = 3.6; seg(c, hx, hy, tx, ty); c.strokeStyle = '#cfd4d8'; c.lineWidth = 1.8; seg(c, hx, hy, tx, ty);
  dot(c, tx + (hx - tx) * 0.08, ty + (hy - ty) * 0.08, 2.6, INK);
  c.strokeStyle = INK; c.lineWidth = 5.6; seg(c, hx, hy, hx + (tx - hx) * 0.13, hy + (ty - hy) * 0.13); c.strokeStyle = '#6a4a3c'; c.lineWidth = 3; seg(c, hx, hy, hx + (tx - hx) * 0.13, hy + (ty - hy) * 0.13);
}
function drawHat(c, y, tilt){
  c.save(); c.translate(0, y); c.rotate(tilt);
  cel(c, pE(0, 0, 30, 12.5, 0), HAT_L, HAT_S, 4, -2.5, 2.4);
  cel(c, pE(0, -6, 15.5, 11.5, 0), HAT_L, HAT_S, 3, -2.5, 2.2);
  c.beginPath(); c.ellipse(0, -3.5, 15.6, 8.5, 0, 0.12 * Math.PI, 0.88 * Math.PI);
  c.strokeStyle = INK; c.lineWidth = 5; c.stroke(); c.strokeStyle = '#c8553f'; c.lineWidth = 3; c.stroke();
  c.restore();
}
// 大背包（以背著時的座標畫：頂 -132、底 -49）
function drawPack(c, rain){
  cel(c, pR(-27, -64, 54, 15, 7.5), MAT_L, MAT_S, 2, -2, 2.2);                    // 睡墊
  c.strokeStyle = rgba(INK, 0.6); c.lineWidth = 1.2; c.beginPath(); c.ellipse(-21.5, -56.5, 3.2, 5, 0, 0, TAU); c.stroke();
  c.strokeStyle = INK; c.lineWidth = 4; seg(c, -11, -65, -11, -49.5); seg(c, 11, -65, 11, -49.5);
  c.strokeStyle = '#7a5a44'; c.lineWidth = 2; seg(c, -11, -65, -11, -49.5); seg(c, 11, -65, 11, -49.5);
  if (rain) {                                                                     // 雨衣罩住背包
    const p = new Path2D(); p.moveTo(-17, -134); p.lineTo(17, -134); p.quadraticCurveTo(34, -112, 35, -70); p.quadraticCurveTo(26, -64, 17, -69); p.quadraticCurveTo(8, -63, 0, -68); p.quadraticCurveTo(-9, -63, -18, -69); p.quadraticCurveTo(-27, -64, -35, -70); p.quadraticCurveTo(-34, -112, -17, -134); p.closePath();
    cel(c, p, PON_L, PON_S, 4, -3, 2.4);
    c.strokeStyle = rgba(INK, 0.35); c.lineWidth = 1.4; seg(c, -8, -120, -12, -76); seg(c, 10, -118, 14, -78);
    return;
  }
  cel(c, pR(21, -98, 11, 24, 4), BOT_L, BOT_S, 1.5, -1, 2); cel(c, pR(23, -103, 7, 6, 2), '#eef2f4', '#aab4bc', 1, -1, 1.8);   // 水壺
  cel(c, pR(19.5, -86, 13, 15, 3), BGP_L, BGP_S, 1.5, -1, 2);                     // 側袋
  cel(c, pR(-23, -124, 46, 62, 13), BAG_L, BAG_S, 4, -3, 2.4);                    // 主袋
  cel(c, pR(-24.5, -132, 49, 22, 10), LID_L, LID_S, 4, -2.5, 2.4);                // 頂蓋
  c.strokeStyle = INK; c.lineWidth = 5.4; seg(c, 0, -112, 0, -101); c.strokeStyle = '#7a5a44'; c.lineWidth = 3; seg(c, 0, -112, 0, -101);
  cel(c, pR(-3.5, -108, 7, 5, 1.2), '#d8dde0', '#9aa4ad', 0.8, -0.6, 1.4);
  cel(c, pR(-14, -98, 28, 26, 7), BGP_L, BGP_S, 2.5, -2, 2.2);                    // 前袋
  c.strokeStyle = rgba(INK, 0.55); c.lineWidth = 1.3; c.beginPath(); c.moveTo(-9, -90); c.quadraticCurveTo(0, -93, 9, -90); c.stroke();
  cel(c, pR(-30, -73, 60, 8, 4), '#8a664c', '#5e4436', 2, -1, 2);                 // 腰帶
  c.save(); c.translate(-24, -106); c.rotate(hero.mga);                          // 鋼杯吊飾
  c.strokeStyle = INK; c.lineWidth = 1.4; seg(c, 0, 0, 0, 9);
  c.beginPath(); c.arc(-6.5, 14, 3, Math.PI * 0.5, Math.PI * 1.5); c.lineWidth = 1.8; c.stroke();
  cel(c, pR(-5.5, 9, 11, 10, 2.5), MUG_L, MUG_S, 1.5, -1, 1.8);
  c.restore();
}
function heroWalk(c, t){
  const ph = hero.ph, mv = hero.mv, sn = Math.sin(ph), cs = Math.cos(ph), br = Math.sin(t * 2.2) * (1 - mv), rain = isRain;
  // 遠的（往前伸的）那隻腳先畫
  if (sn > 0) { leg(c, -1, sn * mv, Math.max(0, cs) * mv); leg(c, 1, -sn * mv, Math.max(0, -cs) * mv); }
  else { leg(c, 1, -sn * mv, Math.max(0, -cs) * mv); leg(c, -1, sn * mv, Math.max(0, cs) * mv); }
  c.save(); c.translate(sn * 1.6 * mv, -hero.lean * 3 + br * 0.6 - Math.abs(cs) * 1.6 * mv); c.rotate(sn * 0.022 * mv); c.scale(1, 1 - hero.lean * 0.035);
  const aL = -sn * mv, aR = sn * mv, hyL = -86 - aL * 6, hyR = -86 - aR * 6;     // 手與對側腳同步
  pole(c, -1, -28, hyL, aL, Math.max(0, -cs) * mv); pole(c, 1, 28, hyR, aR, Math.max(0, cs) * mv);
  cel(c, pR(-21, -127, 42, 64, 15), rain ? PON_L : JK_L, rain ? PON_S : JK_S, 4, -3, 2.4);
  limb(c, -19, -119, -28, -104, -28, hyL, 9.5, rain ? PON_L : JK_L, rain ? PON_S : JK_S); dot(c, -28, hyL, 4.4, SKIN); c.lineWidth = 1.6; c.strokeStyle = INK; c.stroke();
  limb(c, 19, -119, 28, -104, 28, hyR, 9.5, rain ? PON_L : JK_L, rain ? PON_S : JK_S); dot(c, 28, hyR, 4.4, SKIN); c.lineWidth = 1.6; c.strokeStyle = INK; c.stroke();
  cel(c, pE(0, -134, 9.5, 8.5, 0), HAIR_L, HAIR_S, 2, -2, 2);
  c.save(); c.translate(0, hero.py); c.rotate(-sn * 0.02 * mv); drawPack(c, rain); c.restore();
  drawHat(c, -147 + br * 0.4, sn * 0.03 * mv);
  c.restore();
}
function sitLegs(c){
  cel(c, pE(-20, -9, 16, 9, -0.2), PANT_L, PANT_S, 2, -2, 2.2); cel(c, pE(20, -9, 16, 9, 0.2), PANT_L, PANT_S, 2, -2, 2.2);
  cel(c, pE(-36, -5, 6.5, 5, 0), BOOT_L, BOOT_S, 1.5, -1, 2); cel(c, pE(36, -5, 6.5, 5, 0), BOOT_L, BOOT_S, 1.5, -1, 2);
}
function heroRest(c, t){
  const br = Math.sin(t * 2) * 0.8, lt = isRain ? PON_L : JK_L, sh = isRain ? PON_S : JK_S;
  c.strokeStyle = INK; c.lineWidth = 3.6; seg(c, -86, -2, -68, -104); seg(c, -92, -2, -80, -100);
  c.strokeStyle = '#cfd4d8'; c.lineWidth = 1.8; seg(c, -86, -2, -68, -104); seg(c, -92, -2, -80, -100);
  c.save(); c.translate(-58, 48); c.rotate(-0.05); drawPack(c, false); c.restore();      // 背包放在旁邊
  sitLegs(c);
  c.save(); c.translate(0, br);
  cel(c, pR(-21, -70, 42, 64, 16), lt, sh, 4, -3, 2.4);
  limb(c, -19, -60, -29, -42, -23, -24, 9.5, lt, sh);
  limb(c, 19, -60, 31, -50, 33, -37, 9.5, lt, sh); dot(c, 33, -37, 4.4, SKIN); c.lineWidth = 1.6; c.strokeStyle = INK; c.stroke();
  cel(c, pR(28, -49, 11, 11, 2.5), MUG_L, MUG_S, 1.5, -1, 1.8);
  for (let k = 0; k < 3; k++) { const yy = (t * 13 + k * 9) % 27; c.globalAlpha = (1 - yy / 27) * 0.55; dot(c, 33.5 + Math.sin(t * 2 + k * 2) * 3, -53 - yy, 2.6 + yy * 0.12, '#ffffff'); }   // 熱氣
  c.globalAlpha = 1;
  cel(c, pE(0, -77, 9.5, 8.5, 0), HAIR_L, HAIR_S, 2, -2, 2);
  drawHat(c, -90, Math.sin(t * 0.7) * 0.04);
  c.restore();
}
function heroSleep(c, t){
  const lt = isRain ? PON_L : JK_L, sh = isRain ? PON_S : JK_S;
  c.save(); c.translate(-44, 48); c.rotate(-0.04); drawPack(c, false); c.restore();      // 靠著背包睡
  sitLegs(c);
  c.save(); c.rotate(-0.24); c.translate(0, Math.sin(t * 1.4) * 0.8);
  cel(c, pR(-21, -70, 42, 64, 16), lt, sh, 4, -3, 2.4);
  limb(c, -19, -60, -28, -40, -21, -22, 9.5, lt, sh); limb(c, 19, -60, 28, -40, 22, -22, 9.5, lt, sh);
  cel(c, pE(0, -77, 9.5, 8.5, 0), HAIR_L, HAIR_S, 2, -2, 2);
  drawHat(c, -88, -0.22);
  c.restore();
  c.font = '700 16px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle';
  for (let k = 0; k < 3; k++) {
    const p = (t * 0.45 + k / 3) % 1, z = 0.6 + p * 0.7;
    c.globalAlpha = Math.sin(p * Math.PI); c.save(); c.translate(8 + p * 30 + Math.sin(t * 2 + k) * 3, -104 - p * 44); c.scale(z, z);
    c.strokeStyle = INK; c.lineWidth = 3; c.strokeText('z', 0, 0); c.fillStyle = '#fff8e6'; c.fillText('z', 0, 0); c.restore();
  }
  c.globalAlpha = 1;
}
function dogLeg(c, x, yb, lift, k){ cel(c, pR(x - 3.4 * k, yb - 17 * k - lift, 6.8 * k, 17 * k, 3), DOG_L, DOG_S, 1.2, -1, 1.8); cel(c, pR(x - 3.8 * k, yb - 5 * k - lift, 7.6 * k, 5 * k, 2.4), CRM_L, CRM_S, 1, -0.8, 1.6); }
function dogBags(c, y){
  c.beginPath(); c.moveTo(-14, y); c.quadraticCurveTo(0, y - 7, 14, y); c.strokeStyle = INK; c.lineWidth = 4.4; c.stroke(); c.strokeStyle = '#7a5a44'; c.lineWidth = 2.4; c.stroke();
  cel(c, pR(-20, y - 3, 8.5, 12, 3), '#e0664a', '#a8433a', 1, -1, 1.8); cel(c, pR(11.5, y - 3, 8.5, 12, 3), '#e0664a', '#a8433a', 1, -1, 1.8);
}
function dogHead(c, y){
  cel(c, pP([-10, y - 3, -9.5, y - 15, -2.5, y - 8]), DOG_L, DOG_S, 1, -1, 1.8); cel(c, pP([10, y - 3, 9.5, y - 15, 2.5, y - 8]), DOG_L, DOG_S, 1, -1, 1.8);
  cel(c, pE(0, y, 10.5, 9.5, 0), DOG_L, DOG_S, 2.5, -2, 2);
  cel(c, pE(-9.5, y + 3.5, 3.2, 3, 0), CRM_L, CRM_S, 0.6, -0.6, 1.5); cel(c, pE(9.5, y + 3.5, 3.2, 3, 0), CRM_L, CRM_S, 0.6, -0.6, 1.5);
}
function drawDog(x, y, u, s, t){
  const c = ctx, mv = hero.mv, wag = Math.sin(t * (mv > 0.5 ? 9 : 13)) * 0.4;
  c.drawImage(SHADOW, x - 27 * u, y - 10 * u, 50 * u, 20 * u);
  c.save(); c.translate(x, y); c.scale(u, u);
  if (s.sleep) {                              // 趴下睡覺
    cel(c, pE(0, -9, 22, 10, 0), DOG_L, DOG_S, 3, -2, 2);
    cel(c, pE(15, -13, 6, 5.5, 0), CRM_L, CRM_S, 1.5, -1, 1.8);
    cel(c, pP([-27, -13, -26, -22, -20, -16]), DOG_L, DOG_S, 1, -1, 1.8); cel(c, pP([-17, -17, -13, -24, -10, -14]), DOG_L, DOG_S, 1, -1, 1.8);
    cel(c, pE(-19, -9, 10, 8.5, 0), DOG_L, DOG_S, 2, -2, 2);
  } else if (mv < 0.3) {                      // 坐下搖尾巴
    c.save(); c.translate(7, -6); c.rotate(wag); cel(c, pE(6, -2, 7.5, 6, 0), CRM_L, CRM_S, 1.5, -1, 1.8); c.restore();
    cel(c, pE(-11, -6, 7.5, 6.5, 0), DOG_L, DOG_S, 1.5, -1, 2); cel(c, pE(11, -6, 7.5, 6.5, 0), DOG_L, DOG_S, 1.5, -1, 2);
    cel(c, pE(0, -18, 13.5, 16, 0), DOG_L, DOG_S, 3, -2.5, 2);
    dogBags(c, -22); dogHead(c, -41 + Math.sin(t * 2.2) * 0.6);
  } else {                                    // 小跑步：對角腳同步
    const a = Math.sin(hero.ph * 2), l1 = Math.max(0, a) * 5, l2 = Math.max(0, -a) * 5, bob = Math.abs(Math.cos(hero.ph * 2)) * 1.4;
    dogHead(c, -43 - bob * 1.2);
    dogLeg(c, -8.5, -5, l2, 0.85); dogLeg(c, 8.5, -5, l1, 0.85);
    cel(c, pE(0, -25 - bob, 13.5, 12.5, 0), DOG_L, DOG_S, 3, -2.5, 2);
    dogLeg(c, -8, 0, l1, 1); dogLeg(c, 8, 0, l2, 1);
    dogBags(c, -28 - bob);
    c.save(); c.translate(1, -35 - bob); c.rotate(wag * 0.7); cel(c, pE(2, -5, 6.5, 6.5, 0), CRM_L, CRM_S, 1.5, -1.2, 1.8);
    c.strokeStyle = rgba(INK, 0.5); c.lineWidth = 1.2; c.beginPath(); c.arc(2, -5, 3, 0.5, 4.2); c.stroke(); c.restore();
  }
  c.restore();
}
// ───────── 一起爬的隊友：換一套衣服顏色，用同一套走路動畫畫在他實際走到的位置 ─────────
let mates = [];
S.setMates = function(list){
  mates = (list || []).map(m => {
    const old = mates.find(o => o.name === m.name), tg = Math.max(0, +m.dist || 0);
    return { name: String(m.name || '山友').slice(0, 12), target: tg, d: old ? old.d : tg, rest: !!m.rest };
  });
};
function stepMates(dt){ for (const mt of mates) mt.d += (mt.target - mt.d) * Math.min(1, dt * 1.5); }
function drawMate(mt, j, f, t, fade){
  const d0 = curS ? curS.dist || 0 : 0, near = Math.abs(mt.d - d0) < 1.6;
  proj(j, f, false);
  const X = gx + (near ? 0.95 : -0.35) * gs, Y = gy, u = gs / 100;
  if (Y > H + 40 || u < 0.08) return;
  const sv = { ph:hero.ph, mv:hero.mv, lean:hero.lean, py:hero.py, mga:hero.mga };
  const cols = [JK_L, JK_S, BAG_L, BAG_S, LID_L, LID_S, HAT_L, HAT_S];
  JK_L = '#5f9fd6'; JK_S = '#3c6f9e'; BAG_L = '#9ac46a'; BAG_S = '#6a9446'; LID_L = '#86b45a'; LID_S = '#5c8a3e'; HAT_L = '#f2c94c'; HAT_S = '#c49a34';
  hero.ph = mt.d / STRIDE * TAU + 1.3; hero.mv = mt.rest ? 0 : 1; hero.lean = mt.rest ? 0 : 0.45; hero.py = 0; hero.mga = Math.sin(t * 2) * 0.3;
  ctx.globalAlpha = fade;
  ctx.drawImage(SHADOW, X - 48 * u, Y - 17 * u, 86 * u, 34 * u);
  ctx.save(); ctx.translate(X, Y); ctx.scale(u, u);
  try { if (mt.rest) heroRest(ctx, t); else heroWalk(ctx, t); } finally {
    ctx.restore();
    [JK_L, JK_S, BAG_L, BAG_S, LID_L, LID_S, HAT_L, HAT_S] = cols; Object.assign(hero, sv);
  }
  // 名牌
  const ty = Y - (mt.rest ? 118 : 182) * u - 6, fs = clamp(22 * u, 9, 14);
  ctx.font = `${fs}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(mt.name).width + 12;
  ctx.fillStyle = 'rgba(255,248,230,.92)'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
  ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(X - w / 2, ty - fs * 0.8, w, fs * 1.6, fs * 0.8); else ctx.rect(X - w / 2, ty - fs * 0.8, w, fs * 1.6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = INK; ctx.fillText(mt.name, X, ty + 0.5);
  ctx.globalAlpha = 1;
}
function drawHero(s, t){
  proj(jhG, fhG, false);
  const X = gx, Y = gy, u = gs / 100, sit = s.rest || s.sleep;     // 角色座標單位：公分
  hero.sx = X; hero.sy = Y; hero.u = u; hero.top = Y - (sit ? 110 : 168) * u;
  ctx.globalAlpha = 1;
  if (s.pet === 'shiba') drawDog(X + 68 * u, Y - 6 * u, u * 0.98, s, t);
  ctx.drawImage(SHADOW, X - 48 * u, Y - 17 * u, 86 * u, 34 * u);
  ctx.save(); ctx.translate(X, Y); ctx.scale(u, u);
  if (s.sleep) heroSleep(ctx, t); else if (s.rest) heroRest(ctx, t); else heroWalk(ctx, t);
  ctx.restore();
}

// ═════════ 世界繪製（由遠到近） ═════════
function proj(j, f, flat){
  const dz = pZ[j] + f * (pZ[j + 1] - pZ[j]); gs = F / dz;
  gx = W / 2 + (pC[j] + (pC[j + 1] - pC[j]) * f - camX) * gs;
  gy = HOR - ((flat ? pW[j] : pW[j] + (pW[j + 1] - pW[j]) * f) - camY) * gs;
}
function quad(x1, y1, x2, y2, x3, y3, x4, y4){ ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.lineTo(x4, y4); ctx.fill(); }
function gwAt(dz){ return GW * (1 - 0.6 * clamp((dz - 40) / 120, 0, 1)); }   // 稜線越遠越窄，兩側露出山谷與雲海
function lvl(i, side){ const v = vn(i * 0.11 + side * 37.7, 21); return v < 0.36 ? 0 : v > 0.64 ? 2 : 1; }   // 世界固定的光影斑塊
function drawSpr(sp, x, y, sc, fq, shadow){
  const dw = sp.w * sc, dh = sp.hm * sc; if (dh < 2.5) return;
  const x0 = x - dw * 0.5; if (x0 > W || x0 + dw < 0 || y - dh > H || y < 0) return;
  if (shadow) { const sw = dw * 0.85, shh = Math.min(sw * 0.34, dh * 0.5); ctx.drawImage(SHADOW, x - sw * 0.58, y - shh * 0.5, sw, shh); }
  if (fq < 0.96) ctx.drawImage(sp.c, x0, y - dh, dw, dh);
  if (fq > 0.04) { const a = ctx.globalAlpha; ctx.globalAlpha = a * fq; ctx.drawImage(sp.h, x0, y - dh, dw, dh); ctx.globalAlpha = a; }
}
function sparkle(x, y, sc, t, m){
  const p = 0.6 + 0.4 * Math.sin(t * 4 + m), r = Math.max(7, sc * 0.5) * p;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(GLOW, x - r, y - r, r * 2, r * 2);
  ctx.strokeStyle = 'rgba(255,246,200,0.9)'; ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.beginPath(); ctx.moveTo(x - r * 0.9, y); ctx.lineTo(x + r * 0.9, y); ctx.moveTo(x, y - r * 0.9); ctx.lineTo(x, y + r * 0.9); ctx.stroke(); ctx.restore();
}
function drawProp(o, j, f, fq, t){
  const sp = o.type === 'sign' ? getSign(o.text) : (SPR[o.type] && SPR[o.type][0]); if (!sp) return;
  proj(j, f, false);
  const x = gx + o.side * PXO[o.type] * gs, y = gy, dw = sp.w * gs, dh = sp.hm * gs; if (dh < 3) return;
  drawSpr(sp, x, y, gs, fq, true);
  if (o.type === 'treasure') sparkle(x, y - dh * 0.6, gs, t, o.m);
  if (HIT[o.type] && dh > 14 && x > -dw && x < W + dw && y > 0 && y - dh < H) {
    const h = hits[hitN] || (hits[hitN] = { o:{ type:'', m:0 }, x:0, y:0, w:0, h:0, cx:0, top:0 }); hitN++;
    const hw = Math.max(dw, 44), hh = Math.max(dh, 44);
    h.o.type = o.type; h.o.m = o.m; h.x = x - hw / 2; h.y = y - dh / 2 - hh / 2; h.w = hw; h.h = hh; h.cx = x; h.top = y - dh;
  }
}
function drawWorld(b, t){
  const s = curS, isWood = TH.trail === 'wood', nPeb = TH.trail === 'scree' ? 4 : 2, al = TH.alpine, treeBase = TH.bigtree ? 0.55 : 0.42;
  const snowTrees = snowAmt > 0.5 && SPR.coniferS;
  let j, k, pi = AP.length - 1;
  hitN = 0; heroDone = false;
  for (j = DRAW - 1; j >= 0; j--) {
    const y2 = pY[j + 1]; if (y2 > H + 80) break;
    if (!heroDone && j < jhG) { drawHero(s, t); heroDone = true; }
    const i = b + j, y1 = pY[j], s1 = pS[j], s2 = pS[j + 1], x1 = pX[j], x2 = pX[j + 1], z0 = i * SEG;
    const fq = clamp((pZ[j] - fogD0) / (fogD - fogD0), 0, 1), fi = (fq * (FOGN - 1)) | 0;
    const fade = j > DRAW - 18 ? (DRAW - j) / 18 : 1;
    ctx.globalAlpha = fade;
    if (y1 - y2 > 0.2) {
      const yb = y1 + 0.7, lvL = lvl(i, 0), lvR = lvl(i, 1), gk = (i >> 1) & 1;
      const g1 = gwAt(pZ[j]) * s1, g2 = gwAt(pZ[j + 1]) * s2, gl1 = x1 - g1, gl2 = x2 - g2, gr1 = x1 + g1, gr2 = x2 + g2;
      // 稜線兩側往下掉的暗坡
      ctx.fillStyle = LUT[19 * FOGN + fi];
      if (gl1 > -10) quad(gl1, yb, gl1 - 10 * s1, yb + 16 * s1, gl2 - 10 * s2, y2 + 16 * s2, gl2, y2);
      if (gr1 < W + 10) quad(gr1, yb, gr1 + 10 * s1, yb + 16 * s1, gr2 + 10 * s2, y2 + 16 * s2, gr2, y2);
      // 草地（左右各一塊，各自的光影）
      ctx.fillStyle = LUT[(gk * 3 + lvL) * FOGN + fi]; quad(gl1, yb, x1 + 1, yb, x2 + 1, y2, gl2, y2);
      ctx.fillStyle = LUT[(gk * 3 + lvR) * FOGN + fi]; quad(x1, yb, gr1, yb, gr2, y2, x2, y2);
      // 步道
      const w1 = RW * s1, w2 = RW * s2, e1 = w1 * 1.07 + 0.6, e2 = w2 * 1.07 + 0.6, rk = 2 + (i & 1), stp = sAt(i) === 1 && j < 70;
      if (stp) {
        const yt = HOR - (pW[j] - camY) * s2;          // 踏面是平的，遠端接一塊立面
        ctx.fillStyle = LUT[(15 + (lvL ? 1 : 0)) * FOGN + fi]; ctx.fillRect(x2 - w2 * 1.04, y2, w2 * 2.08, yt - y2 + 0.7);
        ctx.fillStyle = LUT[13 * FOGN + fi]; quad(x1 - e1, yb, x1 + e1, yb, x2 + e2, yt, x2 - e2, yt);
        ctx.fillStyle = LUT[(rk * 3 + lvL) * FOGN + fi]; quad(x1 - w1, yb, x1 + w1, yb, x2 + w2, yt, x2 - w2, yt);
        if (j < 44) {
          ctx.globalAlpha = 1 - j / 46; ctx.strokeStyle = INK; ctx.lineWidth = clamp(s2 * 0.022, 0.5, 2.2);
          ctx.beginPath(); ctx.moveTo(x2 - w2 * 1.04, y2); ctx.lineTo(x2 + w2 * 1.04, y2); ctx.moveTo(x2 - w2 * 1.04, yt); ctx.lineTo(x2 + w2 * 1.04, yt); ctx.stroke(); ctx.globalAlpha = fade;
        }
      } else {
        ctx.fillStyle = LUT[13 * FOGN + fi]; quad(x1 - e1, yb, x1 + e1, yb, x2 + e2, y2, x2 - e2, y2);
        ctx.fillStyle = LUT[(rk * 3 + lvL) * FOGN + fi]; quad(x1 - w1, yb, x1 + w1, yb, x2 + w2, y2, x2 - w2, y2);
        if (j < 46 && Hh(i, 50) < 0.62) {             // 斷斷續續的手繪墨線路緣
          ctx.globalAlpha = 0.55 * (1 - j / 48); ctx.strokeStyle = INK; ctx.lineWidth = clamp(s1 * 0.02, 0.5, 2);
          ctx.beginPath(); ctx.moveTo(x1 - w1, y1); ctx.lineTo(x2 - w2, y2); ctx.moveTo(x1 + w1, y1); ctx.lineTo(x2 + w2, y2); ctx.stroke(); ctx.globalAlpha = fade;
        }
      }
      if (j < 34) {
        if (isWood) {                                  // 木棧道的木板縫
          ctx.strokeStyle = LUT[13 * FOGN + fi]; ctx.lineWidth = clamp(s1 * 0.018, 0.5, 1.8); ctx.beginPath();
          for (k = 1; k <= 3; k++) { proj(j, k / 4, stp); ctx.moveTo(gx - RW * gs, gy); ctx.lineTo(gx + RW * gs, gy); }
          ctx.stroke();
        } else for (k = 0; k < nPeb; k++) {            // 小石子
          if (Hh(i, 60 + k * 4) > 0.7) continue;
          proj(j, Hh(i, 61 + k * 4), stp);
          const pr = (0.035 + 0.05 * Hh(i, 62 + k * 4)) * gs;
          ctx.fillStyle = LUT[(12 + (k & 1) * 2) * FOGN + fi]; ctx.beginPath(); ctx.ellipse(gx + (Hh(i, 63 + k * 4) - 0.5) * 1.7 * RW * gs, gy, pr, pr * 0.6, 0, 0, TAU); ctx.fill();
        }
        if (isRain && Hh(i, 40) < 0.3) {               // 雨天水窪反光
          proj(j, 0.5, stp); const pr = 0.42 * gs;
          ctx.fillStyle = 'rgba(225,238,255,0.3)'; ctx.beginPath(); ctx.ellipse(gx + (Hh(i, 41) - 0.5) * RW * gs, gy, pr, pr * 0.5 * Math.min(1, CAMH / pZ[j]), 0, 0, TAU); ctx.fill();
        }
      }
    }
    // 路旁植物：每段 4 個固定亂數位置（由遠到近）
    const treeP = al ? lerp(0.5, 0.06, clamp(z0 / total, 0, 1)) : treeBase;
    for (k = 0; k < 4; k++) {
      if (k === 3 && j > 60) break;
      if (Hh(i, k * 8 + 1) > (k === 3 ? 0.75 : 0.62)) continue;
      const side = Hh(i, k * 8 + 2) < 0.5 ? -1 : 1, u = Hh(i, k * 8 + 3), f = (3 - k + Hh(i, k * 8 + 4)) / 4;
      let xo, arr;
      if (k === 3) { xo = RW + 0.3 + u * 2.2; arr = pick(smallTab, Hh(i, k * 8 + 6)); }
      else { xo = RW + 0.5 + u * u * 26; arr = (xo > RW + 2.8 && Hh(i, k * 8 + 5) < treeP) ? pick(treeTab, Hh(i, k * 8 + 6)) : pick(smallTab, Hh(i, k * 8 + 6)); }
      if (xo > gwAt(pZ[j]) - 0.6) continue;
      if (snowTrees && arr === SPR.conifer) arr = SPR.coniferS;
      const sp = arr[(Hh(i, k * 8 + 7) * arr.length) | 0];
      if (!heroDone && j === jhG && f <= fhG) { drawHero(s, t); heroDone = true; ctx.globalAlpha = fade; }
      proj(j, f, false);
      drawSpr(sp, gx + side * xo * gs, gy, gs * (0.8 + 0.45 * Hh(i, k * 8 + 8)), fq, j < 64);
    }
    // 互動道具與路標
    while (pi >= 0 && AP[pi].m >= z0) { const o = AP[pi--]; if (o.m < z0 + SEG) drawProp(o, j, (o.m - z0) / SEG, fq, t); }
    // 一起爬的隊友（在自己這一段畫）
    for (k = 0; k < mates.length; k++) { const mt = mates[k]; if (mt.d >= z0 && mt.d < z0 + SEG && j > 0) drawMate(mt, j, (mt.d - z0) / SEG, t, fade); }
  }
  if (!heroDone) { drawHero(s, t); heroDone = true; }
  ctx.globalAlpha = 1;
}

// ═════════ 氣氛：飛葉／花瓣／光點、神光、雨、霧、粒子 ═════════
function respawn(f, far){ f.z = far ? 22 + Math.random() * 18 : 2 + Math.random() * 38; f.x = (Math.random() - 0.5) * 18; f.y = 0.2 + Math.random() * 4.2; }
function initFlyers(){
  flyers.length = 0;
  const nLeaf = TH.sakura ? 6 : 12, nPet = TH.sakura ? 16 : 0;
  for (let i = 0; i < nLeaf + nPet + 12; i++) {
    const k = i < nLeaf ? 0 : i < nLeaf + nPet ? 1 : 2, f = { x:0, y:0, z:0, k:k, ph:Math.random() * TAU, c:k === 1 ? (i % 2 ? '#f9c4d4' : '#fde4ec') : LEAFC[i % 4] };
    respawn(f, false); flyers.push(f);
  }
}
function drawFlyers(t, dt, sp){
  const snow = snowAmt > 0.6;
  for (let i = 0; i < flyers.length; i++) {
    const f = flyers[i], mote = f.k === 2;
    f.z -= (sp + (mote ? 0.3 : 2.2)) * dt; f.x -= (mote ? 0.1 : 0.9) * dt; f.y += (Math.sin(t * 1.3 + f.ph) * 0.3 - (mote ? -0.04 : 0.12)) * dt;
    const sc = F / Math.max(f.z, 0.5), sx = W / 2 + f.x * sc, sy = HOR + (CAMH - f.y) * sc;
    if (f.z < 1.3 || sy > H + 20 || sx < -30 || f.y > 6) { respawn(f, true); continue; }
    if (mote) continue;
    const rx = Math.max(1.2, 0.07 * sc);
    ctx.fillStyle = snow ? '#ffffff' : f.c; ctx.beginPath();
    ctx.ellipse(sx, sy, rx, rx * (0.2 + 0.6 * Math.abs(Math.sin(t * 3 + f.ph))), t * 2 + f.ph, 0, TAU); ctx.fill();
    if (rx > 3) { ctx.strokeStyle = INK; ctx.lineWidth = 0.8; ctx.stroke(); }
  }
}
function drawLights(t){
  ctx.globalCompositeOperation = 'lighter';
  if (!isNight && sunVis > 0 && raysA > 0.01) { const sx = cSun[0] * W, sy = cSun[1] * H, R = 170 * U; ctx.globalAlpha = clamp(0.2 * sunVis * (0.6 + raysA * 0.5), 0, 1); ctx.drawImage(GLOW, sx - R, sy - R, R * 2, R * 2); }   // 太陽光暈
  if (raysA > 0.01 && RAYS) {                 // 右上方斜射的神光，輕輕搖曳
    ctx.save(); ctx.globalAlpha = clamp(raysA * (0.8 + 0.2 * Math.sin(t * 0.6)), 0, 1); ctx.translate(W, 0); ctx.rotate(Math.sin(t * 0.23) * 0.03); ctx.drawImage(RAYS, -W, 0, W, H); ctx.restore();
  }
  if (!isRain) for (let i = 0; i < flyers.length; i++) {      // 金色光點
    const f = flyers[i]; if (f.k !== 2) continue;
    const sc = F / Math.max(f.z, 0.5), r = Math.max(2.5, 0.1 * sc);
    ctx.globalAlpha = (0.45 + 0.45 * Math.sin(t * 2 + f.ph)) * (isNight ? 1 : 0.75);
    ctx.drawImage(GLOW, W / 2 + f.x * sc - r, HOR + (CAMH - f.y) * sc - r, r * 2, r * 2);
  }
  if (isNight && curS && !curS.sleep) {       // 頭燈光束
    const r = W * 0.36;
    ctx.save(); ctx.translate(hero.sx, hero.sy - H * 0.15); ctx.scale(1, 0.6); ctx.globalAlpha = 0.42; ctx.drawImage(GLOW, -r, -r, r * 2, r * 2); ctx.restore();
    ctx.globalAlpha = 0.9; ctx.drawImage(GLOW, hero.sx - 9 * U, hero.top + 6 * U, 18 * U, 18 * U);
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
function drawRain(t){
  const ww = W + 120, hh = H + 60;
  ctx.strokeStyle = 'rgba(220,234,255,0.42)'; ctx.lineWidth = 1.2; ctx.beginPath();
  for (let i = 0; i < 80; i++) {
    const x = (((i * 97.3 - t * 190) % ww) + ww) % ww - 40, y = ((i * 53.7 + t * (820 + (i * 37 % 7) * 60)) % hh) - 30, L = 14 + (i % 5) * 3;
    ctx.moveTo(x, y); ctx.lineTo(x - L * 0.22, y + L);
  }
  ctx.stroke();
}
function fogBands(t, dist){
  ctx.fillStyle = 'rgba(232,238,238,0.2)'; ctx.fillRect(0, 0, W, H);
  const T = tileSets[palA]; if (!T) return;
  for (let k = 0; k < 3; k++) tile(T.c[0], t * (6 + k * 4) + k * 211 + headAt(dist) * F, HOR - 70 * U + k * 95 * U, 200 * U, 0.3);
}
for (let i = 0; i < 90; i++) parts.push({ on:0, x:0, y:0, vx:0, vy:0, life:0, max:1, kind:0, rot:0, vr:0, sz:4, col:'' });
const PK = { dust:0, leaf:1, star:2, heart:3 };
S.burst = function(x, y, kind, n){
  const kd = PK[kind]; if (kd == null) return;
  n = n || 6;
  for (let q = 0; q < n; q++) {
    const p = parts[pIdx], a = Math.random() * TAU, v = Math.random(); pIdx = (pIdx + 1) % parts.length;
    p.on = 1; p.kind = kd; p.x = x + (Math.random() - 0.5) * 8; p.y = y + (Math.random() - 0.5) * 6; p.rot = a; p.vr = (Math.random() - 0.5) * 8;
    if (kd === 0) { p.vx = Math.cos(a) * 14; p.vy = -8 - v * 16; p.max = 0.55; p.sz = 3 + v * 4; }
    else if (kd === 1) { p.vx = Math.cos(a) * 60; p.vy = -40 - v * 70; p.max = 1.1; p.sz = 4 + v * 3; p.col = LEAFC[(v * 4) | 0]; }
    else if (kd === 2) { p.vx = Math.cos(a) * (30 + v * 60); p.vy = Math.sin(a) * (30 + v * 60) - 20; p.max = 0.7; p.sz = 4 + v * 5; }
    else { p.vx = Math.cos(a) * 18; p.vy = -40 - v * 30; p.max = 1; p.sz = 7 + v * 5; }
    p.life = p.max;
  }
};
function drawParts(dt){
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]; if (!p.on) continue;
    p.life -= dt; if (p.life <= 0) { p.on = 0; continue; }
    const k = p.life / p.max; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    if (p.kind === 0) { ctx.globalAlpha = k * 0.5; dot(ctx, p.x, p.y, p.sz * (1.8 - k), '#e2cda6'); }
    else if (p.kind === 1) {
      p.vy += 160 * dt; ctx.globalAlpha = Math.min(1, k * 2); ctx.fillStyle = p.col;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.sz, p.sz * 0.45, p.rot, 0, TAU); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 0.8; ctx.stroke();
    } else if (p.kind === 2) {
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k; ctx.fillStyle = '#fff2b0'; ctx.beginPath();
      for (let q = 0; q < 8; q++) { const r = (q % 2 ? 0.35 : 1) * p.sz * (0.5 + k * 0.5), an = p.rot + q * Math.PI / 4; ctx.lineTo(p.x + Math.cos(an) * r, p.y + Math.sin(an) * r); }
      ctx.closePath(); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
    } else {
      const z = p.sz / 10 * (1.3 - k * 0.3);
      ctx.globalAlpha = Math.min(1, k * 2); ctx.save(); ctx.translate(p.x, p.y); ctx.scale(z, z);
      ctx.beginPath(); ctx.moveTo(0, 3); ctx.bezierCurveTo(-10, -4, -5, -11, 0, -5); ctx.bezierCurveTo(5, -11, 10, -4, 0, 3); ctx.closePath();
      ctx.fillStyle = '#f58aa5'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
}

// ═════════ 主繪製 ═════════
S.render = function(s){
  if (!ctx || !M || !s) return;
  if (!RAYS) S.resize();
  const t = s.t || 0, dt = clamp(s.dt || 0.016, 0, 0.05), dist = Math.max(0, s.dist || 0), sp = s.speed || 0, wx = s.wx || DEFWX;
  const frac = s.frac != null ? s.frac : dist / total;
  curS = s; curT = t;
  updPalette(wx, frac); updHero(s, t, dt, dist, sp); stepMates(dt);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.lineJoin = ctx.lineCap = 'round';
  // 鏡頭：在登山客後上方，x 對準登山客所在深度的路中心
  const camZ = dist - HZ, b = Math.floor(camZ / SEG), off = camZ / SEG - b;
  let j, x = 0, dx = -off * cAt(b);
  for (j = 0; j <= DRAW + 1; j++) { pC[j] = x; pW[j] = eAt(b + j); x += dx; dx += cAt(b + j); }
  const hj = HZ / SEG + off; jhG = Math.floor(hj); fhG = hj - jhG;
  camX = lerp(pC[jhG], pC[jhG + 1], fhG) + Math.sin(hero.ph) * 0.018 * hero.mv;            // 隨步伐極輕微晃動
  camY = lerp(pW[jhG], pW[jhG + 1], fhG) + CAMH + Math.sin(hero.ph * 2) * 0.014 * hero.mv;
  for (j = 0; j <= DRAW + 1; j++) {
    const dz = Math.max((j - off) * SEG, 1.2), sc = F / dz;
    pZ[j] = dz; pS[j] = sc; pX[j] = W / 2 + (pC[j] - camX) * sc; pY[j] = HOR - (pW[j] - camY) * sc;
  }
  drawBG(t, dist);
  drawWorld(b, t);
  drawFlyers(t, dt, sp);
  if (isFog) fogBands(t, dist);
  drawFG(t);
  // 整體調色（時間／天氣），之後再疊發光的東西
  if (cGrade[0] < 250 || cGrade[1] < 250 || cGrade[2] < 250) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = css(cGrade); ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; }
  drawLights(t);
  if (isRain) drawRain(t);
  drawParts(dt);
  if (vig) { ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H); }
};

// ═════════ 對外：查詢與互動 ═════════
S.hitTest = function(x, y){
  for (let i = hitN - 1; i >= 0; i--) { const h = hits[i]; if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return { o:{ type:h.o.type, m:h.o.m } }; }
  return null;
};
S.nearby = function(){
  const d = curS ? (curS.dist || 0) : 0; let best = null;
  for (let i = 0; i < hitN; i++) {
    const h = hits[i], ty = h.o.type;
    if (ty !== 'bench' && ty !== 'view' && ty !== 'treasure') continue;
    if (h.o.m < d - 1.5 || h.cx < 12 || h.cx > W - 12 || h.top < HOR - 60 || h.top > H - 40) continue;
    if (!best || h.o.m < best.o.m) best = h;
  }
  return best ? { type:best.o.type, m:best.o.m, x:best.cx, y:best.top } : null;
};
S.charPos = function(){ return { x:hero.sx, y:hero.top }; };
S.snapshot = function(){
  if (!cv) return '';
  try {
    const sw = cv.width, sh = cv.height, ch = Math.min(sh, Math.round(sw * 4 / 3));
    const bottom = Math.min(sh, Math.round((hero.sy + H * 0.07) * DPR)), top = clamp(bottom - ch, 0, sh - ch);
    const ow = Math.min(600, sw), oh = Math.round(ow * ch / sw), c = mk(ow, oh);
    c.getContext('2d').drawImage(cv, 0, top, sw, ch, 0, 0, ow, oh);
    return c.toDataURL('image/jpeg', 0.74);
  } catch (e) { return ''; }
};
S.SEG = SEG;
})();

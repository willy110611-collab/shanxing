// 山行小日子 — 2.5D 傾斜攝影「迷你模型」世界地圖（Canvas 2D）
// 資料驅動：海岸線(coast) + 山脊(ridge) + 山列表(mountains)，之後可換成其他地區。
(function(){
'use strict';
window.SX = window.SX || {};
const TAU = Math.PI * 2;
const INK = '#3a2a20';
const WW = 560, WH = 800;     // 世界座標（單位）
const LIFT = 74;              // h=1 時的畫面抬升
const SLAB = 18;              // 模型底座厚度
const CELL = 1.6;             // 高度場格距
const DIFFC = ['#8fcf6e','#f2cf5b','#f3a35a','#ee7e6b','#b98ad9'];
const FONT = 'Huninn, "Noto Sans TC", "PingFang TC", sans-serif';

const clamp = (v,a,b) => v < a ? a : v > b ? b : v;
const lerp = (a,b,t) => a + (b - a) * t;
const sstep = (a,b,v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function hash2(x, y){ let h = (Math.imul(x|0, 374761393) + Math.imul(y|0, 668265263))|0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function vnoise(x, y){ const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf*xf*(3-2*xf), v = yf*yf*(3-2*yf);
  return lerp(lerp(hash2(xi,yi), hash2(xi+1,yi), u), lerp(hash2(xi,yi+1), hash2(xi+1,yi+1), u), v); }
const fbm = (x, y) => vnoise(x,y)*.5 + vnoise(x*2.1,y*2.1)*.25 + vnoise(x*4.3,y*4.3)*.15 + vnoise(x*8.7,y*8.7)*.1;
function rng(seed){ let s = seed|0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223)|0; return (s >>> 0) / 4294967296; }; }
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };

// ───────── 狀態 ─────────
const S = {
  host:null, cv:null, ctx:null, dpr:1, vw:0, vh:0, base:1,
  cam:{x:280,y:400,z:1}, tgt:{x:280,y:400,z:1}, camInit:false,
  data:{ mountains:[], coast:[], ridge:[], done:{}, prog:{}, current:null, locked:{}, photos:{}, pet:null },
  T:null, dirty:true, running:false, raf:0, last:0, t:0,
  cb:null, bgCb:null, hits:[], pos:{}, hover:null, sel:null, anim:{}, tw:{},
  sprites:null, shadowSp:null, rays:null, tb1:null, tb2:null,
  ripples:[], puffs:[], drift:[], ro:null, lastTap:{t:0,x:0,y:0},
  bx:{x0:0, x1:WW, y0:0, y1:WH}      // 相機可以看的範圍（有立體地圖美術圖時＝圖的範圍）
};

// ───────── 小工具：手繪圓角、雲朵精靈 ─────────
function irr(c, x, y, w, h, r, sd){
  const j = k => (hash2(sd, k) - .5) * 1.1;
  c.beginPath(); c.moveTo(x+r+j(1), y+j(2)); c.lineTo(x+w-r+j(3), y+j(4));
  c.quadraticCurveTo(x+w+j(5), y+j(6), x+w+j(7), y+r+j(8)); c.lineTo(x+w+j(9), y+h-r+j(10));
  c.quadraticCurveTo(x+w+j(11), y+h+j(12), x+w-r, y+h+j(13)); c.lineTo(x+r, y+h+j(14));
  c.quadraticCurveTo(x+j(15), y+h+j(16), x+j(17), y+h-r); c.lineTo(x+j(18), y+r);
  c.quadraticCurveTo(x+j(19), y+j(20), x+r, y+j(2)); c.closePath();
}
function puffSprite(seed, W, H){
  const c = mk(W, H), g = c.getContext('2d'), r = rng(seed), n = 6 + (r() * 3 | 0), cs = [];
  for (let i = 0; i < n; i++){ const t = (i + .5) / n, rad = H * (.24 + .22 * Math.sin(Math.PI * t) * (.7 + r() * .5));
    cs.push([W * (.16 + .68 * t), H * .66 - rad * .6 + (r() - .5) * H * .08, rad]); }
  const pass = (dx, dy, dr, col) => { g.fillStyle = col; g.beginPath(); cs.forEach(p => { const rr = Math.max(1, p[2] + dr); g.moveTo(p[0]+dx+rr, p[1]+dy); g.arc(p[0]+dx, p[1]+dy, rr, 0, TAU); }); g.fill(); };
  pass(0, 0, 2.4, 'rgba(105,118,140,.75)');   // 淡墨藍輪廓
  pass(0, 0, 0, '#bfd2e4');                    // 陰影
  pass(W*.012, -H*.05, -H*.012, '#f5f8fb');    // 受光面
  pass(W*.035, -H*.11, -H*.04, '#fffbe9');     // 暖色高光
  return c;
}
// 雲朵：有 map_cloud 美術圖就用（正、反、正三種），沒有就用程式畫的
const CLOUD_ART = 'map_cloud';
function flipX(src){ const c = mk(src.width, src.height), g = c.getContext('2d'); g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0); return c; }
function makeSprites(){
  const cl = SX.art && SX.art.get(CLOUD_ART) ? SX.art.crop(CLOUD_ART, 0) : null;
  S.sprites = cl ? [cl, flipX(cl), cl] : [puffSprite(11, 256, 140), puffSprite(23, 256, 140), puffSprite(37, 256, 140)];
  const c = mk(128, 128), g = c.getContext('2d'), gr = g.createRadialGradient(64,64,0,64,64,64);
  gr.addColorStop(0, 'rgba(28,48,92,.55)'); gr.addColorStop(.6, 'rgba(28,48,92,.25)'); gr.addColorStop(1, 'rgba(28,48,92,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); S.shadowSp = c;
}
// 畫一朵雲：寬 w，高度照圖的比例；(x, y) 是雲底偏上的中心
function drawCloud(c, v, x, y, w){
  const sp = S.sprites[v % S.sprites.length], h = w * sp.height / sp.width;
  c.drawImage(sp, x - w / 2, y - h * .6, w, h);
}

// ───────── 地形建置（靜態，預先畫到離屏） ─────────
function makeProj(coast){
  let a = 1e9, b = -1e9, c = 1e9, d = -1e9;
  coast.forEach(p => { a = Math.min(a,p[0]); b = Math.max(b,p[0]); c = Math.min(c,p[1]); d = Math.max(d,p[1]); });
  const lonC = (a+b)/2, latC = (c+d)/2, cs = Math.cos(latC * Math.PI / 180);
  const u = Math.min(250 / (((b-a) * cs) || 1), 380 / (((d-c) * .82) || 1)), kx = u * cs, ky = u * .82;
  return (lon, lat) => [280 + (lon - lonC) * kx, 412 + (latC - lat) * ky];
}
function densePoly(pts){
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++){
    const p0 = pts[(i+n-1)%n], p1 = pts[i], p2 = pts[(i+1)%n], p3 = pts[(i+2)%n];
    for (let k = 0; k < 6; k++){ const t = k/6, t2 = t*t, t3 = t2*t;
      const f = (a,b,c,d) => .5*((2*b) + (-a+c)*t + (2*a-5*b+4*c-d)*t2 + (-a+3*b-3*c+d)*t3);
      const x = f(p0[0],p1[0],p2[0],p3[0]), y = f(p0[1],p1[1],p2[1],p3[1]);
      out.push([x + (vnoise(x*.35, y*.35) - .5) * 1.8, y + (vnoise(x*.35+9, y*.35+3) - .5) * 1.8]);
    }
  }
  return out;
}
function inPoly(poly, x, y){
  let ins = false;
  for (let k = 0, n = poly.length; k < n; k++){ const a = poly[k], b = poly[(k+1)%n];
    if ((a[1] > y) !== (b[1] > y) && x < (b[0]-a[0]) * (y-a[1]) / (b[1]-a[1]) + a[0]) ins = !ins; }
  return ins;
}
function segDist2(x, y, ax, ay, bx, by){
  const dx = bx-ax, dy = by-ay, l2 = dx*dx + dy*dy; let t = l2 ? ((x-ax)*dx + (y-ay)*dy) / l2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
  const ex = ax + t*dx - x, ey = ay + t*dy - y; return ex*ex + ey*ey;
}
const STOPS = [
  [0,   [172,214,120], [98,156,94]],  [.12, [150,200,112], [84,140,88]],
  [.22, [98,152,94],   [48,100,78]],  [.48, [88,140,88],   [44,92,72]],
  [.58, [168,152,128], [108,96,98]],  [.76, [186,168,142], [120,104,104]],
  [.84, [246,244,236], [164,180,214]],[1.01,[252,250,244], [172,188,220]]
];
const LUT = [];
(function(){ for (let i = 0; i < 64; i++){ const h = i/63; let k = 0; while (k < STOPS.length-2 && h > STOPS[k+1][0]) k++;
  const a = STOPS[k], b = STOPS[k+1], t = clamp((h - a[0]) / (b[0] - a[0]), 0, 1);
  LUT.push([[0,1,2].map(j => lerp(a[1][j], b[1][j], t)), [0,1,2].map(j => lerp(a[2][j], b[2][j], t))]); } })();

function drawTree(L, x, y, s, sd){
  const gv = hash2(sd, 7) * 22 - 8;
  L.fillStyle = 'rgba(30,24,14,.30)'; L.beginPath(); L.ellipse(x + s*.14, y + s*.01, s*.4, s*.11, 0, 0, TAU); L.fill();
  L.fillStyle = '#6b4a30'; L.fillRect(x - s*.05, y - s*.2, s*.1, s*.22);
  L.lineWidth = .42; L.strokeStyle = INK; L.lineJoin = 'round';
  for (let k = 0; k < 3; k++){
    const by = y - s*.15 - k*s*.27, ty = by - s*.44, w = s*(.31 - k*.06);
    L.fillStyle = `rgb(${52+gv|0},${104+gv|0},${80+gv*.5|0})`;
    L.beginPath(); L.moveTo(x, ty); L.lineTo(x + w, by); L.lineTo(x - w, by); L.closePath(); L.fill();
    L.fillStyle = `rgb(${104+gv|0},${166+gv|0},${104+gv*.5|0})`;
    L.beginPath(); L.moveTo(x, ty); L.lineTo(x + w, by); L.lineTo(x + w*.05, by); L.closePath(); L.fill();
    L.beginPath(); L.moveTo(x, ty); L.lineTo(x + w, by); L.lineTo(x - w, by); L.closePath(); L.stroke();
  }
}
function drawRock(L, x, y, s, sd){
  const r = rng(sd * 7 + 1), n = 6; const pts = [];
  for (let i = 0; i < n; i++){ const a = i / n * TAU; pts.push([x + Math.cos(a) * s * (.7 + r()*.5), y - s*.35 + Math.sin(a) * s * (.4 + r()*.3)]); }
  L.fillStyle = 'rgba(30,24,20,.26)'; L.beginPath(); L.ellipse(x + s*.2, y + s*.02, s*.8, s*.2, 0, 0, TAU); L.fill();
  L.beginPath(); pts.forEach((p, i) => i ? L.lineTo(p[0], p[1]) : L.moveTo(p[0], p[1])); L.closePath();
  L.fillStyle = '#8f8280'; L.fill();
  L.beginPath(); L.moveTo(pts[0][0], pts[0][1]); L.lineTo(pts[n-1][0], pts[n-1][1]); L.lineTo(pts[n-2][0], pts[n-2][1]); L.lineTo(pts[1][0], pts[1][1]); L.closePath();
  L.fillStyle = '#d2c6b4'; L.fill();
  L.beginPath(); pts.forEach((p, i) => i ? L.lineTo(p[0], p[1]) : L.moveTo(p[0], p[1])); L.closePath();
  L.lineWidth = .4; L.strokeStyle = INK; L.stroke();
}

// 立體地圖美術圖（map_taiwan）：圖高撐滿世界高度、置中；山的位置用 tools/mapfit.js 算好的投影（manifest 的 fit）換算
const MAP_ART = 'map_taiwan';
const ART_PADT = 90;      // 圖上方再多一條海（把圖頂端鏡射接上去），北部的山才不會卡在頂部按鈕底下
function artMap(){ const e = SX.art && SX.art.get(MAP_ART); return e && e.fit ? e : null; }
function buildArtTerrain(D, e){
  const bh = WH, bw = WH * e.w / e.h, bx0 = (WW - bw) / 2, F = e.fit, p = F.p;
  S.bx = { x0:bx0, x1:bx0 + bw, y0:-ART_PADT, y1:bh };
  const P = (lon, lat) => { const u = lon - F.lon, v = lat - F.lat, z = p[6] * u + p[7] * v + 1; return [bx0 + (p[0] * u + p[1] * v + p[2]) / z * bw, (p[3] * u + p[4] * v + p[5]) / z * bh]; };
  return { art:e, P, hAt:() => 0, poly:D.coast.map(q => P(q[0], q[1])), runs:[], rect:[bx0, 0, bw, bh] };
}
function buildTerrain(D){
  S.bx = { x0:0, x1:WW, y0:0, y1:WH };
  const P = makeProj(D.coast), T = { P };
  const poly = densePoly(D.coast.map(p => P(p[0], p[1])));
  const ridge = D.ridge.map(p => P(p[0], p[1]));
  const ms = D.mountains.map(m => { const p = P(m.lon, m.lat); return { x:p[0], y:p[1], a:.08 + clamp(m.alt / 4000, 0, 1) * .7, s:10 + clamp(m.alt/4000,0,1) * 7 }; });
  let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
  poly.forEach(p => { minx = Math.min(minx,p[0]); maxx = Math.max(maxx,p[0]); miny = Math.min(miny,p[1]); maxy = Math.max(maxy,p[1]); });
  const x0 = minx - 6, y0 = miny - 6, nx = Math.ceil((maxx - minx + 12) / CELL) + 2, ny = Math.ceil((maxy - miny + 12) / CELL) + 2;
  const hg = new Float32Array(nx * ny), dc = new Float32Array(nx * ny), ins = new Uint8Array(nx * ny);
  const N = poly.length;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++){
    const px = x0 + i*CELL, py = y0 + j*CELL, idx = j*nx + i;
    if (!inPoly(poly, px, py)) continue;
    let md = 1e9; for (let k = 0; k < N; k++){ const a = poly[k], b = poly[(k+1)%N], d2 = segDist2(px, py, a[0], a[1], b[0], b[1]); if (d2 < md) md = d2; }
    const d = Math.sqrt(md); ins[idx] = 1; dc[idx] = d;
    let rd = 1e9; for (let k = 0; k + 1 < ridge.length; k++){ const d2 = segDist2(px, py, ridge[k][0], ridge[k][1], ridge[k+1][0], ridge[k+1][1]); if (d2 < rd) rd = d2; }
    let h = ridge.length > 1 ? .42 * Math.exp(-rd / (2 * 28 * 28)) : 0;
    for (const m of ms){ const dx = px - m.x, dy = py - m.y; h += m.a * Math.exp(-(dx*dx + dy*dy) / (2 * m.s * m.s)); }
    h = h < .7 ? h : .7 + (1 - Math.exp(-(h - .7) * 2.2)) * .3;
    h += (fbm(px * .045, py * .045) - .45) * .2 * (.3 + Math.min(1, h)) + sstep(0, 60, d) * .04;
    hg[idx] = Math.max(.01, h) * sstep(0, 12, d);
  }
  T.hAt = (x, y) => { const fx = (x - x0) / CELL, fy = (y - y0) / CELL, i = Math.floor(fx), j = Math.floor(fy);
    if (i < 0 || j < 0 || i >= nx - 1 || j >= ny - 1) return 0; const u = fx - i, v = fy - j, k = j*nx + i;
    return lerp(lerp(hg[k], hg[k+1], u), lerp(hg[k+nx], hg[k+nx+1], u), v); };
  T.poly = poly;

  // 朝南（面向觀眾）的海岸線段
  const runs = []; let cur = null;
  for (let k = 0; k <= N; k++){
    const a = poly[k % N], b = poly[(k+1) % N], dx = b[0]-a[0], dy = b[1]-a[1], l = Math.hypot(dx, dy) || 1;
    let nxn = dy / l, nyn = -dx / l; const mx = (a[0]+b[0])/2, my = (a[1]+b[1])/2;
    if (inPoly(poly, mx + nxn*1.6, my + nyn*1.6)) { nxn = -nxn; nyn = -nyn; }
    if (nyn > -.12) { if (!cur) { cur = [a]; runs.push(cur); } cur.push(b); } else cur = null;
  }
  T.runs = runs;

  // 離屏圖層範圍
  const mg = 34, lox = minx - mg, loy = miny - LIFT - 12, lw = (maxx - minx) + mg*2, lh = (maxy - miny) + LIFT + SLAB + mg + 12;
  let q = S.dpr >= 2 ? 3 : 2.4; q = Math.min(q, 4000 / lw, 4000 / lh);
  const layer = mk(lw * q, lh * q), L = layer.getContext('2d');
  T.layer = layer; T.lox = lox; T.loy = loy; T.lw = lw; T.lh = lh;
  const W2L = () => L.setTransform(q, 0, 0, q, -lox * q, -loy * q), ID = () => L.setTransform(1, 0, 0, 1, 0, 0);
  const polyPath = dy => { L.beginPath(); poly.forEach((p, i) => i ? L.lineTo(p[0], p[1] + dy) : L.moveTo(p[0], p[1] + dy)); L.closePath(); };
  const runPath = dy => { L.beginPath(); runs.forEach(r => r.forEach((p, i) => i ? L.lineTo(p[0], p[1] + dy) : L.moveTo(p[0], p[1] + dy))); };

  // 1) 底座（剖面土層）
  W2L();
  const BANDS = [[0,'#5e4332'],[.14,'#b98556'],[.34,'#a06b43'],[.52,'#c79a68'],[.7,'#8d5d3c'],[.88,'#6f5446']];
  for (let d = SLAB; d >= 0; d -= .5){ const k = d / SLAB; let col = BANDS[0][1]; for (const b of BANDS) if (k >= b[0]) col = b[1]; L.fillStyle = col; polyPath(d); L.fill(); }
  ID(); L.globalCompositeOperation = 'source-atop';
  const sg = L.createLinearGradient(0, 0, layer.width, 0);
  sg.addColorStop(0, 'rgba(40,24,60,.30)'); sg.addColorStop(.5, 'rgba(40,24,60,0)'); sg.addColorStop(1, 'rgba(255,226,160,.26)');
  L.fillStyle = sg; L.fillRect(0, 0, layer.width, layer.height);
  L.globalCompositeOperation = 'source-over'; W2L();
  L.strokeStyle = 'rgba(58,42,32,.32)'; L.lineWidth = .35;
  [.14,.34,.52,.7,.88].forEach(k => { runPath(SLAB * k); L.stroke(); });
  L.lineWidth = .4; L.beginPath();
  runs.forEach(r => r.forEach((p, i) => { if (i % 5 === 2) { L.moveTo(p[0], p[1] + 1.5); L.lineTo(p[0] + (hash2(i, 3) - .5) * .8, p[1] + SLAB - 1); } }));
  L.stroke();
  L.strokeStyle = INK; L.lineWidth = 1.1; L.lineJoin = 'round'; runPath(SLAB); L.stroke();
  // 2) 水中陰影與淺水暈（畫在底座後面）
  L.globalCompositeOperation = 'destination-over';
  [[30,.10],[18,.14],[9,.2]].forEach(a => { L.strokeStyle = `rgba(190,240,236,${a[1]})`; L.lineWidth = a[0]; L.lineJoin = 'round'; polyPath(SLAB); L.stroke(); });
  L.shadowColor = 'rgba(16,52,86,.45)'; L.shadowBlur = 14 * q; L.shadowOffsetY = 5 * q; L.fillStyle = 'rgba(16,52,86,.5)'; polyPath(SLAB); L.fill();
  L.shadowColor = 'transparent'; L.shadowBlur = 0; L.shadowOffsetY = 0; L.globalCompositeOperation = 'source-over';

  // 3) 植被與岩石候選（依畫面列分桶，邊畫地形邊插入，才有正確遮擋）
  const buckets = []; for (let j = 0; j < ny; j++) buckets.push(null);
  const put = (j, o) => { j = clamp(j, 0, ny - 1); (buckets[j] || (buckets[j] = [])).push(o); };
  for (let cy = y0; cy < y0 + ny * CELL - 2; cy += 3.3) for (let cx = x0; cx < x0 + nx * CELL - 2; cx += 3.3){
    const jx = cx + (hash2(cx*10, cy*10) - .5) * 2.6, jy = cy + (hash2(cy*10, cx*10+1) - .5) * 2.6;
    const i = Math.round((jx - x0) / CELL), j = Math.round((jy - y0) / CELL), idx = j * nx + i;
    if (i < 1 || j < 1 || i >= nx - 1 || j >= ny - 1 || !ins[idx] || dc[idx] < 5) continue;
    const h = hg[idx], sl = Math.abs(hg[idx+1] - hg[idx-1]) + Math.abs(hg[idx+nx] - hg[idx-nx]);
    const base = jy - h * LIFT, r = hash2(i * 3, j * 7);
    if (h > .09 && h < .58 && sl < .09 && fbm(jx * .03 + 5, jy * .03) > .4 && r < .9 * (1 - sstep(.4, .58, h))) put(j, { k:0, x:jx, y:base, s:5 + hash2(i, j) * 3.4, sd:i * 131 + j, gi:i, gj:j });
    else if (h > .52 && r < .22) put(j, { k:1, x:jx, y:base, s:1.5 + hash2(j, i) * 1.8, sd:i * 17 + j, gi:i, gj:j });
  }

  // 4) 地形條帶（由後往前）：先畫到獨立圖層，之後柔化，避免一格一格的色塊
  const G = mk(layer.width, layer.height), LG = G.getContext('2d');
  const mainL = L;
  const lowStroke = [];
  for (let j = 1; j < ny - 1; j++){
    const L = LG;
    L.setTransform(1, 0, 0, 1, 0, 0); L.beginPath(); let anyHatch = false;
    for (let i = 1; i < nx - 1; i++){
      const idx = j*nx + i; if (!ins[idx]) continue;
      const h = hg[idx], px = x0 + i*CELL, py = y0 + j*CELL;
      const hx = (hg[idx+1] - hg[idx-1]) / (2*CELL), hy = (hg[idx+nx] - hg[idx-nx]) / (2*CELL), n = hash2(i, j);
      const s = .5 + 22 * (-hx + hy) * .72 + (n - .5) * .1;
      const lit = clamp(sstep(.40, .52, s) * .8 + clamp((s - .5) * .5, -.1, .1) + .12, 0, 1);
      const hh = clamp(h + (fbm(px * .2, py * .2) - .5) * .1, 0, 1), e = LUT[(hh * 63) | 0];
      let Lc = e[0], Sc = e[1];
      if (dc[idx] < 3.2 && h < .1){ const w = 1 - dc[idx] / 3.2; Lc = [lerp(Lc[0],244,w), lerp(Lc[1],226,w), lerp(Lc[2],176,w)]; Sc = [lerp(Sc[0],204,w), lerp(Sc[1],176,w), lerp(Sc[2],128,w)]; }
      const g = (n - .5) * 9;
      const r = lerp(Sc[0], Lc[0], lit) * (1 + .05 * lit) + g, gg = lerp(Sc[1], Lc[1], lit) + g, b = lerp(Sc[2], Lc[2], lit) * (1 - .06 * lit) + g;
      const X = Math.floor((px - lox) * q), Y = Math.floor((py - h * LIFT - loy) * q), wpx = Math.ceil(CELL * q) + 1;
      const hF = ins[idx + nx] ? hg[idx + nx] : h, YF = Math.floor((py + CELL - hF * LIFT - loy) * q);
      L.fillStyle = `rgb(${r|0},${gg|0},${b|0})`; L.fillRect(X, Y, wpx, Math.max(Math.ceil(CELL * q), YF - Y) + 1);
      const hB = ins[idx - nx] ? hg[idx - nx] : 0;
      if (Math.floor(h * 16) !== Math.floor(hB * 16) && h > .04) lowStroke.push(X, Y, wpx);
      if ((h - hB) * LIFT > CELL * 1.1) { L.fillStyle = 'rgba(58,42,32,.5)'; L.fillRect(X, Y - Math.round(.5 * q), wpx, Math.max(1, Math.round(.9 * q))); }
      else if (lowStroke.length) { /* 等高線稍後統一畫 */ }
      if (h > .3 && s < .38 && n < .2){ anyHatch = true; L.moveTo(X + wpx * .2, Y + q * .4); L.lineTo(X + wpx * .9, Y + q * 1.6 + hash2(j, i) * q); }
    }
    if (anyHatch){ L.strokeStyle = 'rgba(58,42,32,.32)'; L.lineWidth = Math.max(1, .3 * q); L.stroke(); }
    if (lowStroke.length){ L.fillStyle = 'rgba(58,42,32,.13)'; for (let k = 0; k < lowStroke.length; k += 3) L.fillRect(lowStroke[k], lowStroke[k+1], lowStroke[k+2], Math.max(1, Math.round(.6 * q))); lowStroke.length = 0; }
  }
  // 柔化：縮小再分段放大（多次雙線性），保留原本清楚的外形透明度
  {
    const W0 = G.width, H0 = G.height, k = Math.max(2.2, CELL * q * .7);
    const a = mk(W0 / k, H0 / k); a.getContext('2d').drawImage(G, 0, 0, a.width, a.height);
    const b = mk(W0 / 2, H0 / 2), bg = b.getContext('2d'); bg.imageSmoothingQuality = 'high'; bg.drawImage(a, 0, 0, b.width, b.height);
    const s2 = mk(W0, H0), sg2 = s2.getContext('2d'); sg2.imageSmoothingQuality = 'high'; sg2.drawImage(b, 0, 0, W0, H0);
    sg2.globalCompositeOperation = 'destination-in'; sg2.drawImage(G, 0, 0);
    mainL.setTransform(1, 0, 0, 1, 0, 0); mainL.drawImage(G, 0, 0); mainL.drawImage(s2, 0, 0);
  }
  // 樹與岩石：統一畫在柔化後的地形上，被前方山稜擋住的就不畫
  {
    const all = []; for (const bk of buckets) if (bk) for (const o of bk) all.push(o);
    all.sort((a, b) => a.y - b.y);
    W2L();
    for (const o of all){
      let hidden = false;
      for (let kk = 1; kk < 46 && !hidden; kk++){
        const jj = o.gj + kk; if (jj >= ny) break; const id2 = jj * nx + o.gi; if (!ins[id2]) continue;
        const yy = y0 + jj * CELL - hg[id2] * LIFT; if (yy < o.y - o.s * .25) hidden = true;
      }
      if (!hidden) o.k ? drawRock(L, o.x, o.y, o.s, o.sd) : drawTree(L, o.x, o.y, o.s, o.sd);
    }
  }
  // 5) 前緣海岸墨線與沙邊
  W2L(); L.lineJoin = 'round'; L.lineCap = 'round';
  L.strokeStyle = 'rgba(250,236,190,.9)'; L.lineWidth = 1.6; runPath(-.4); L.stroke();
  L.strokeStyle = INK; L.lineWidth = 1.1; runPath(0); L.stroke();
  ID();
  return T;
}

// ───────── 資料套用 ─────────
function buildScene(){
  const T = S.T;
  S.pos = {};
  S.data.mountains.forEach(m => { const p = T.P(m.lon, m.lat); S.pos[m.id] = { gx:p[0], gy:p[1], x:p[0], y:p[1] - T.hAt(p[0], p[1]) * LIFT }; });
  // 海面漣漪
  const r = rng(5); S.ripples = [];
  for (let i = 0; i < 240; i++) S.ripples.push({ x:r() * (WW + 40), y:40 + r() * (WH - 40), l:8 + r() * 16, sp:.6 + r() * 1.6, ph:r() * TAU, g:i % 3 ? 0 : 1 });
  // 雲海（churning cloud sea）：離島嶼較遠處才有
  const coarse = T.poly.filter((p, i) => i % 3 === 0); S.puffs = [];
  for (let tries = 0; tries < 900 && S.puffs.length < 210; tries++){
    const x = r() * WW, y = 20 + r() * (WH - 20); let md = 1e9;
    for (const p of coarse){ const d = (p[0] - x) * (p[0] - x) + (p[1] - y) * (p[1] - y); if (d < md) md = d; }
    const d = Math.sqrt(md), edge = Math.min(x, WW - x, y * .5, WH - y) < 70 ? .6 : 0;
    if (r() < clamp(sstep(48, 120, d) + edge, 0, 1)) S.puffs.push({ x, y, w:56 + r() * 62, v:(r() * 3) | 0, ph:r() * TAU, a:.78 + r() * .22 });
  }
  S.puffs.sort((p, q) => p.y - q.y);
  S.drift = []; for (let i = 0; i < 6; i++) S.drift.push({ x:r() * 700 - 80, y:200 + r() * 400, w:60 + r() * 50, v:(r() * 3) | 0, sp:3 + r() * 4 });
  S.dirty = false;
}
function ensure(){
  if (!S.cv || !S.dirty || !S.data.coast.length) return;
  if (!S.sprites) makeSprites();
  const e = artMap(); S.T = e ? buildArtTerrain(S.data, e) : buildTerrain(S.data); buildScene();
}

// ───────── 相機 ─────────
function clampCam(o){
  const s = S.base * o.z, hw = S.vw / (2 * s), hh = S.vh / (2 * s);
  o.z = clamp(o.z, 1, 3.4);
  const B = S.bx, bw = B.x1 - B.x0, bh = B.y1 - B.y0;
  o.x = bw <= 2 * hw ? (B.x0 + B.x1) / 2 : clamp(o.x, B.x0 + hw, B.x1 - hw); o.y = bh <= 2 * hh ? (B.y0 + B.y1) / 2 : clamp(o.y, B.y0 + hh, B.y1 - hh);
}
function homeView(){
  const T = S.T; let z = 1.3, cx = 280, cy = 412;
  if (T){ let a = 1e9, b = -1e9, c = 1e9, d = -1e9; T.poly.forEach(p => { a = Math.min(a,p[0]); b = Math.max(b,p[0]); c = Math.min(c,p[1]); d = Math.max(d,p[1]); });
    const lift = T.art ? 0 : LIFT;   // 美術地圖：山已經畫在圖上，不用預留抬升高度
    cx = (a + b) / 2; cy = (c + d) / 2 - lift * .3 + (T.art ? -ART_PADT * .45 : SLAB * .5); z = Math.min(S.vw * .94 / ((b - a + 16) * S.base), S.vh * .92 / ((d - c + lift + 24) * S.base)); }
  return { x:cx, y:cy, z:clamp(z, 1, 2.2) };
}
function reset(snap){
  const h = homeView(); Object.assign(S.tgt, h); clampCam(S.tgt);
  if (snap) Object.assign(S.cam, S.tgt);
}
function focus(id, snap){
  const p = S.pos[id]; if (!p || !S.vw) return;
  const z = clamp(Math.max(S.tgt.z, 2.2), 1, 3.4), s = S.base * z;
  S.tgt.z = z; S.tgt.x = p.x; S.tgt.y = p.y - 8 + S.vh * .16 / s; clampCam(S.tgt);
  if (snap) Object.assign(S.cam, S.tgt);
}
const w2s = (wx, wy) => { const s = S.base * S.cam.z; return { x:(wx - S.cam.x) * s + S.vw / 2, y:(wy - S.cam.y) * s + S.vh / 2 }; };

// ───────── 繪圖 ─────────
function drawSea(c, t, s){
  const y0 = (0 - S.cam.y) * s + S.vh / 2, y1 = (WH - S.cam.y) * s + S.vh / 2;
  const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#a6d6e2'); g.addColorStop(.4, '#5fb0d2'); g.addColorStop(1, '#2f84bd');
  c.fillStyle = g; c.fillRect(0, 0, S.vw, S.vh);
}
function drawRipples(c, t){
  c.lineCap = 'round';
  for (let g = 0; g < 2; g++){
    c.beginPath();
    for (const r of S.ripples){ if (r.g !== g) continue; const x = ((r.x + t * r.sp * 2) % (WW + 40)) - 20, y = r.y + Math.sin(t * 1.1 + r.ph) * 1.3;
      c.moveTo(x, y); c.quadraticCurveTo(x + r.l / 2, y - 2 - Math.sin(t * .9 + r.ph) * .8, x + r.l, y); }
    c.strokeStyle = g ? 'rgba(255,248,214,.55)' : 'rgba(255,255,255,.34)'; c.lineWidth = g ? 1.3 : .9; c.stroke();
  }
}
function drawPuffs(c, t){
  for (const p of S.puffs){
    const k = 1 + .05 * Math.sin(t * .7 + p.ph), w = p.w * k, x = p.x + Math.cos(t * .25 + p.ph) * 4, y = p.y + Math.sin(t * .5 + p.ph) * 2.2;
    c.globalAlpha = p.a; drawCloud(c, p.v, x, y, w);
  }
  c.globalAlpha = 1;
}
function drawFoam(c, t){
  const T = S.T; if (!T) return;
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.beginPath(); T.runs.forEach(r => r.forEach((p, i) => i ? c.lineTo(p[0], p[1] + SLAB + 1) : c.moveTo(p[0], p[1] + SLAB + 1)));
  c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 3.2 + Math.sin(t * 1.3) * .8; c.stroke();
  c.setLineDash([5, 9]); c.lineDashOffset = -t * 3; c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 1.2; c.stroke(); c.setLineDash([]);
}
function drawDrift(c, t){
  for (const d of S.drift){
    const x = ((d.x + t * d.sp) % 700) - 80;
    c.globalAlpha = .9; const w = d.w;  // 雲影先畫在斜下方（光自右上）
    c.drawImage(S.shadowSp, x - w * .55 - 18, d.y + 14, w * 1.1, w * .5);
  }
  for (const d of S.drift){
    const x = ((d.x + t * d.sp) % 700) - 80;
    c.globalAlpha = .8; drawCloud(c, d.v, x, d.y - 44, d.w);
  }
  c.globalAlpha = 1;
}
function tw(c, name){ if (S.tw[name] == null){ c.font = `11px ${FONT}`; S.tw[name] = c.measureText(name).width; } return S.tw[name]; }

function drawHiker(c, x, y, t){
  const b = Math.abs(Math.sin(t * 4)) * 1.2;
  c.lineWidth = .8; c.strokeStyle = INK; c.lineJoin = 'round';
  c.fillStyle = 'rgba(40,25,10,.3)'; c.beginPath(); c.ellipse(x, y + .5, 6, 1.8, 0, 0, TAU); c.fill();
  c.fillStyle = '#5b8a5a'; irr(c, x - 7, y - 11 - b, 5, 7, 2, 41); c.fill(); c.stroke();       // 背包
  c.fillStyle = '#e8774f'; irr(c, x - 4, y - 11 - b, 8, 8, 2.5, 43); c.fill(); c.stroke();    // 外套
  c.strokeStyle = INK; c.beginPath(); c.moveTo(x - 1.5, y - 3 - b); c.lineTo(x - 1.5, y); c.moveTo(x + 2, y - 3 - b); c.lineTo(x + 2, y); c.stroke(); // 腿
  c.fillStyle = '#f6d3b0'; c.beginPath(); c.arc(x, y - 15 - b, 4, 0, TAU); c.fill(); c.stroke();
  c.fillStyle = '#e9c46a'; c.beginPath(); c.ellipse(x, y - 17.4 - b, 6, 1.7, 0, 0, TAU); c.fill(); c.stroke();
  c.beginPath(); c.arc(x, y - 17.6 - b, 3.2, Math.PI, TAU); c.fill(); c.stroke();
  c.fillStyle = INK; c.beginPath(); c.arc(x + 1.3, y - 14.6 - b, .55, 0, TAU); c.arc(x - 1.2, y - 14.6 - b, .55, 0, TAU); c.fill();
}
function drawShiba(c, x, y, t){
  const b = Math.abs(Math.sin(t * 4 + 1)) * 1;
  c.lineWidth = .7; c.strokeStyle = INK; c.lineJoin = 'round';
  c.fillStyle = 'rgba(40,25,10,.3)'; c.beginPath(); c.ellipse(x, y + .4, 5, 1.4, 0, 0, TAU); c.fill();
  c.fillStyle = '#e69a4c'; c.beginPath(); c.ellipse(x, y - 3.6 - b, 4.6, 3, 0, 0, TAU); c.fill(); c.stroke();
  c.beginPath(); c.arc(x - 5.4, y - 6.6 - b, 2.6, -.4, 4.6); c.stroke();                   // 捲尾
  c.fillStyle = '#e69a4c'; c.beginPath(); c.arc(x + 4.2, y - 6.4 - b, 2.9, 0, TAU); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(x + 2.4, y - 8.4 - b); c.lineTo(x + 3, y - 11 - b); c.lineTo(x + 4.6, y - 8.8 - b); c.moveTo(x + 5, y - 8.8 - b); c.lineTo(x + 6.2, y - 10.6 - b); c.lineTo(x + 6.7, y - 7.8 - b); c.stroke();
  c.fillStyle = '#fff1d6'; c.beginPath(); c.ellipse(x + 5.6, y - 5.4 - b, 1.6, 1.2, 0, 0, TAU); c.fill();
  c.fillStyle = INK; c.beginPath(); c.arc(x + 4.4, y - 6.9 - b, .5, 0, TAU); c.arc(x + 6.4, y - 5.8 - b, .5, 0, TAU); c.fill();
  c.beginPath(); c.moveTo(x - 2, y - 1 - b); c.lineTo(x - 2, y); c.moveTo(x + 2, y - 1 - b); c.lineTo(x + 2, y); c.stroke();
}
// 目前挑戰的山旁邊：登山客和帶著的寵物（有美術圖就用背影走路圖，沒有就用程式畫的）
const MAP_HIKER_H = 22, MAP_PET_H = 10;   // 地圖上登山客、寵物的高度（地圖單位）
const MAP_WALK_FPS = 4;                   // 走路圖每秒換幾格（慢慢走）
let contactSp = null;
function contactShadow(c, x, y, w){       // 腳底接觸影子：柔邊深色橢圓
  if (!contactSp){ contactSp = mk(64, 32); const g = contactSp.getContext('2d'); g.scale(1, .5);
    const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(25,35,20,.45)'); gr.addColorStop(.55, 'rgba(25,35,20,.24)'); gr.addColorStop(1, 'rgba(25,35,20,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
  c.drawImage(contactSp, x - w / 2, y - w / 4, w, w / 2);
}
function petWalkArt(pet){
  const A = SX.art; if (!A || !pet) return null;
  return A.get('pet_' + pet + '_walk') ? 'pet_' + pet + '_walk' : pet === 'shiba' && A.get('shiba_walk') ? 'shiba_walk' : null;
}
function drawWalkers(c, t){
  const A = SX.art, fr = Math.floor(t * MAP_WALK_FPS), pet = S.data.pet, hx = 8, px = 18, y = 1;
  if (A && A.get('hiker_walk')){ contactShadow(c, hx, y, MAP_HIKER_H * .55); A.drawFrame(c, 'hiker_walk', fr, hx, y, MAP_HIKER_H); }
  else drawHiker(c, hx, y, t);
  if (!pet) return;
  const pa = petWalkArt(pet);
  if (pa){ contactShadow(c, px, y, MAP_PET_H * 1.1); A.drawFrame(c, pa, fr, px, y, MAP_PET_H); }
  else drawShiba(c, px, y, t);
}
function drawCrown(c, x, y){
  c.save(); c.lineWidth = .9; c.strokeStyle = INK; c.lineJoin = 'round';
  c.fillStyle = '#f6c945'; c.beginPath(); c.moveTo(x - 6, y); c.lineTo(x - 7, y - 8); c.lineTo(x - 3, y - 4.5); c.lineTo(x, y - 9.5); c.lineTo(x + 3, y - 4.5); c.lineTo(x + 7, y - 8); c.lineTo(x + 6, y); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#e8574a'; c.beginPath(); c.arc(x, y - 2.6, 1.1, 0, TAU); c.fill(); c.restore();
}
function drawCairn(c, x, y){
  c.lineWidth = .8; c.strokeStyle = INK;
  [[0, 0, 5, 2.6, '#a9a29a'], [.4, -4, 3.8, 2.2, '#c2bbb0'], [-.2, -7.4, 2.6, 1.8, '#f2c94c']].forEach(s => { c.fillStyle = s[4]; c.beginPath(); c.ellipse(x + s[0], y + s[1] - s[3] * .5, s[2], s[3], 0, 0, TAU); c.fill(); c.stroke(); });
}
// 還不能爬的山：木牌右端掛一個明顯的鎖頭（有 icon_lock 美術圖就用，沒有就畫黃銅掛鎖）；(x, y) 是鎖的中心，h 是整個鎖的高度
const LOCK_ART = 'icon_lock';
const LOCK_H = 16;           // 鎖頭高度（地圖單位）
const LOCK_HAZE = [[-14, 3, 40], [13, 2, 44]];   // 還不能爬的山腳薄霧：[x, y, 寬]（本地座標）
const LOCK_HAZE_A = .45;     // 薄霧透明度
const LOCK_DIM_A = .85;      // 還不能爬的路標整體淡一點（名字還要看得清楚）
const LOCK_GRAY = 'grayscale(.55)';   // 還不能爬的路標褪色程度
function drawLock(c, x, y, h){
  c.fillStyle = 'rgba(40,25,10,.28)'; c.beginPath(); c.ellipse(x + h * .08, y + h * .5, h * .38, h * .1, 0, 0, TAU); c.fill();   // 小影子
  if (SX.art && SX.art.drawFrame(c, LOCK_ART, 0, x, y + h / 2, h)) return;
  const bw = h * .78, bh = h * .56, bx = x - bw / 2, by = y + h / 2 - bh, sr = bw * .3;
  c.lineCap = 'round'; c.lineJoin = 'round';
  // 鎖環：先粗墨線、再細的鋼色
  c.beginPath(); c.moveTo(x - sr, by + 1); c.lineTo(x - sr, by - sr * .5); c.arc(x, by - sr * .5, sr, Math.PI, TAU); c.lineTo(x + sr, by + 1);
  c.strokeStyle = INK; c.lineWidth = h * .17; c.stroke(); c.strokeStyle = '#c9c3b6'; c.lineWidth = h * .08; c.stroke();
  // 鎖身：黃銅賽璐璐（亮面、暗面、高光）
  irr(c, bx, by, bw, bh, h * .12, 91); c.fillStyle = '#e9b847'; c.fill();
  c.save(); c.clip(); c.fillStyle = '#b9822e'; c.fillRect(x + bw * .12, by, bw, bh); c.fillStyle = 'rgba(255,244,190,.85)'; c.fillRect(bx + bw * .12, by + bh * .14, bw * .12, bh * .6); c.restore();
  irr(c, bx, by, bw, bh, h * .12, 91); c.strokeStyle = INK; c.lineWidth = h * .07; c.stroke();
  // 鑰匙孔
  c.fillStyle = '#4a2f1a'; c.beginPath(); c.arc(x, by + bh * .4, bh * .13, 0, TAU); c.fill();
  c.beginPath(); c.moveTo(x - bh * .07, by + bh * .45); c.lineTo(x + bh * .07, by + bh * .45); c.lineTo(x + bh * .1, by + bh * .75); c.lineTo(x - bh * .1, by + bh * .75); c.closePath(); c.fill();
}
// 路標美術圖 map_pin（裁掉透明邊後量的比例，換圖要重量）
const PIN_ART = 'map_pin';
const PIN_ART_H = 52;        // 整支路標在地圖上的高度（地圖單位）
const PIN_FOOT = .513;       // 木樁底部中心的 x
const PIN_BOARD = { cy:.407, h:.262, pad:.08, tilt:-.144 };   // 木牌：中心 y、高、兩端圓角留白（佔寬）、傾斜（弧度）
const PIN_SLICE = { top:.226, xs:[.136, .401, .605, .867] };   // 木牌以下切五段，第 2、4 段只有木牌，名字長就拉寬這兩段
const PIN_SEAM = .4;         // 拉寬的段多畫一點點蓋住接縫
// 路標各部位位置（本地座標：山頂＝原點、未含偏移）；畫圖、排位置、點擊都用這一份
function pinGeom(c, m){
  const need = tw(c, m.name) + 17, e = SX.art && SX.art.get(PIN_ART);
  if (!e) return { art:null, need, cx:0, py:-24, ph:14, bw:need, tilt:0, x0:-need / 2 - 2, x1:need / 2 + 12, y0:-47, y1:-15 };
  const f = e.frames[0], k = PIN_ART_H / f.h, inner = f.w * k * (1 - 2 * PIN_BOARD.pad), extra = Math.max(0, need - inner);
  const left = -PIN_FOOT * f.w * k - extra / 2, bw = f.w * k + extra, py = -(1 - PIN_BOARD.cy) * PIN_ART_H, ph = PIN_BOARD.h * PIN_ART_H;
  return { art:e, f, k, extra, left, need, cx:(.5 - PIN_FOOT) * f.w * k, py, ph, bw, tilt:Math.atan(Math.tan(PIN_BOARD.tilt) * f.w * k / bw),
    x0:left, x1:left + bw + 4, y0:-PIN_ART_H, y1:py + ph / 2 + 2 };
}
// 畫路標美術圖：腳底在原點；木牌那幾列切段，名字長時只拉寬純木牌的部分（木樁、小旗不變形）
function drawPinArt(c, g){
  const f = g.f, k = g.k, img = g.art.img, ty = PIN_SLICE.top * f.h, x0 = -PIN_FOOT * f.w * k;
  c.drawImage(img, f.x, f.y, f.w, ty, x0, -PIN_ART_H, f.w * k, ty * k);
  const xs = [0].concat(PIN_SLICE.xs.map(v => v * f.w), [f.w]);
  let dx = g.left;
  for (let i = 0; i < 5; i++){
    const sw = xs[i + 1] - xs[i], stretch = i === 1 || i === 3, dw = sw * k + (stretch ? g.extra / 2 : 0);
    c.drawImage(img, f.x + xs[i], f.y + ty, sw, f.h - ty, dx, -PIN_ART_H + ty * k, dw + (stretch ? PIN_SEAM : 0), (f.h - ty) * k);
    dx += dw;
  }
}
// 木牌外框（本地座標，未含偏移），用來避免名字互相重疊
function pinBox(c, m){ const g = pinGeom(c, m); return { w:g.bw, x0:g.x0, x1:g.x1, y0:g.y0, y1:g.y1 }; }
// 讓位的候選位置：[x 偏幾個半寬, y 偏幾個木牌框高]
const PIN_OFFS = [[0,0],[1,-.125],[-1,-.125],[1.9,-.125],[-1.9,-.125],[0,-.625],[1,-.75],[-1,-.75],[1.9,-.75],[-1.9,-.75],[0,-1.25],[1,-1.375],[-1,-1.375]];
function layoutPins(c, order, ps){
  const placed = [], out = {};
  // 目前挑戰的山、選中的山先放，維持在原位
  const pri = o => (o.m.id === S.sel ? 0 : o.m.id === S.data.current ? 1 : 2);
  const list = order.slice().sort((a, b) => pri(a) - pri(b) || b.q.y - a.q.y);
  for (const o of list){
    const s = ps * (S.anim[o.m.id] || 1), b = pinBox(c, o.m); let best = null;
    for (const f of PIN_OFFS){
      const ox = f[0] * (b.w / 2 + 8), oy = f[1] * (b.y1 - b.y0);
      const r = { x0:o.q.x + (b.x0 + ox) * s, x1:o.q.x + (b.x1 + ox) * s, y0:o.q.y + (b.y0 + oy) * s, y1:o.q.y + (b.y1 + oy) * s };
      if (!placed.some(p => r.x0 < p.x1 + 2 && r.x1 > p.x0 - 2 && r.y0 < p.y1 + 2 && r.y1 > p.y0 - 2)){ best = { ox, oy, r }; break; }
    }
    if (!best){ const b0 = b; best = { ox:0, oy:0, r:{ x0:o.q.x + b0.x0 * s, x1:o.q.x + b0.x1 * s, y0:o.q.y + b0.y0 * s, y1:o.q.y + b0.y1 * s } }; }
    placed.push(best.r); out[o.m.id] = best;
  }
  return out;
}
function drawPin(c, m, idx, x, y, ps, t, ox = 0, oy = 0){
  const D = S.data, id = m.id, done = D.done[id] || 0, locked = !!D.locked[id], cur = D.current === id;
  const a = S.anim[id] || (S.anim[id] = 1), want = (S.hover === id || S.sel === id) ? 1.14 : 1; S.anim[id] = a + (want - a) * .2;
  ps *= S.anim[id];
  c.save(); c.translate(x, y); c.scale(ps, ps);
  const name = m.name, G = pinGeom(c, m), w = G.bw, ph = G.ph, py = G.py;
  if (cur){ const r = 28 + Math.sin(t * 2.2) * 5, g = c.createRadialGradient(0, -6, 2, 0, -6, r);
    g.addColorStop(0, 'rgba(255,226,130,.75)'); g.addColorStop(.6, 'rgba(255,214,110,.3)'); g.addColorStop(1, 'rgba(255,214,110,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, -6, r, 0, TAU); c.fill(); }
  c.fillStyle = 'rgba(40,25,10,.22)'; c.beginPath(); c.ellipse(0, 0, 12, 4.4, 0, 0, TAU); c.fill();
  c.fillStyle = 'rgba(40,25,10,.38)'; c.beginPath(); c.ellipse(0, 0, 7, 2.6, 0, 0, TAU); c.fill();
  if (cur) drawWalkers(c, t);
  if (locked) c.globalAlpha = LOCK_DIM_A;
  if (done) drawCairn(c, -9, 0);
  // 木樁（偏移時變成一根斜斜的引線木樁，從山頂連到木牌；美術圖自己有木樁，只在偏移時接到圖的樁底）
  if (!G.art || ox || oy){ c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.lineTo(ox, oy + (G.art ? 0 : py + ph / 2));
    c.strokeStyle = INK; c.lineWidth = 4.6; c.stroke(); c.strokeStyle = '#9a6a3f'; c.lineWidth = 2.6; c.stroke(); }
  c.translate(ox, oy);
  c.lineWidth = 1; c.strokeStyle = INK; c.lineJoin = 'round';
  if (G.art){
    if (locked) c.filter = LOCK_GRAY;   // 還沒解鎖：旗子、木牌褪色
    drawPinArt(c, G); c.filter = 'none';
    c.save(); c.translate(G.cx, py); c.rotate(G.tilt);
    c.fillStyle = DIFFC[clamp(m.diff - 1, 0, 4)]; c.beginPath(); c.arc(-G.need / 2 + 8.4, 0, 2.3, 0, TAU); c.fill(); c.lineWidth = .6; c.strokeStyle = INK; c.stroke();
    c.fillStyle = INK; c.font = `11px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(name, 3, .6);
    c.restore();
    if (done) drawCrown(c, G.cx - w / 4, py - ph / 2 + 2);
  } else {
  // 旗桿與小旗
  const fx = w / 2 - 5, wave = Math.sin(t * 3 + idx) * 1.6;
  c.beginPath(); c.moveTo(fx, py - 1); c.lineTo(fx, py - 15); c.stroke();
  c.fillStyle = locked ? '#a9a39a' : '#e8574a'; c.beginPath(); c.moveTo(fx, py - 15); c.quadraticCurveTo(fx + 6, py - 14 + wave, fx + 10, py - 12.5 + wave * 1.4); c.quadraticCurveTo(fx + 5, py - 11 - wave, fx, py - 9.5); c.closePath(); c.fill(); c.stroke();
  // 木牌
  const gr = c.createLinearGradient(0, py - ph / 2, 0, py + ph / 2); gr.addColorStop(0, '#e2b274'); gr.addColorStop(1, '#b9814a');
  c.fillStyle = gr; irr(c, -w / 2, py - ph / 2, w, ph, 3.4, idx * 17 + 3); c.fill(); c.lineWidth = 1.3; c.stroke();
  c.lineWidth = .35; c.strokeStyle = 'rgba(90,56,30,.55)'; c.beginPath(); c.moveTo(-w / 2 + 3, py - ph / 2 + 2.2); c.quadraticCurveTo(0, py - ph / 2 + 3.4, w / 2 - 3, py - ph / 2 + 2); c.moveTo(-w / 2 + 3, py + ph / 2 - 2); c.quadraticCurveTo(0, py + ph / 2 - 3.2, w / 2 - 3, py + ph / 2 - 2.2); c.stroke();
  c.fillStyle = '#5a3a22'; c.beginPath(); c.arc(-w / 2 + 2.6, py, .8, 0, TAU); c.arc(w / 2 - 2.6, py, .8, 0, TAU); c.fill();
  c.fillStyle = '#fbf0d5'; c.strokeStyle = 'rgba(58,42,32,.7)'; c.lineWidth = .6; irr(c, -w / 2 + 5, py - 5, w - 10, 10, 2.2, idx * 5 + 9); c.fill(); c.stroke();
  c.fillStyle = DIFFC[clamp(m.diff - 1, 0, 4)]; c.beginPath(); c.arc(-w / 2 + 8.4, py, 2.3, 0, TAU); c.fill(); c.lineWidth = .6; c.strokeStyle = INK; c.stroke();
  c.fillStyle = INK; c.font = `11px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(name, 3, py + .6);
  if (done) drawCrown(c, 0, py - ph / 2 + .6);
  }
  const bx = G.cx + w / 2 - 1, byT = py - ph / 2 + Math.tan(G.tilt) * w / 2;   // 照片數徽章：木牌右上角
  const ph2 = D.photos[id]; if (ph2 > 0){ c.fillStyle = '#4f9fd6'; c.beginPath(); c.arc(bx, byT, 4.2, 0, TAU); c.fill(); c.lineWidth = .7; c.strokeStyle = INK; c.stroke(); c.fillStyle = '#fff'; c.font = `bold 6px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ph2 > 99 ? '99+' : ph2, bx, byT + .3); }
  const pg = D.prog[id]; if (pg && pg.dist > 0 && !done && m.dist){ const f = clamp(pg.dist / m.dist, 0, 1);
    c.fillStyle = '#fbf0d5'; irr(c, -11, 4, 22, 3.6, 1.6, 55); c.fill(); c.lineWidth = .6; c.strokeStyle = INK; c.stroke(); c.fillStyle = '#8fcf6e'; c.fillRect(-10, 5, 20 * f, 1.6); }
  c.globalAlpha = 1;
  c.translate(-ox, -oy);
  if (locked){ // 還不能爬：山腳一層淡淡的薄霧，鎖頭掛在木牌右端（鎖才是主要提示，不被霧蓋住）
    LOCK_HAZE.forEach((f, i) => { const dx = Math.sin(t * .5 + i * 1.7) * 3; c.globalAlpha = LOCK_HAZE_A; drawCloud(c, i, f[0] + dx, f[1], f[2]); });
    c.globalAlpha = 1;
    drawLock(c, ox + G.cx + w / 2 - 3, oy + py + ph / 2 - 2, LOCK_H);
  }
  c.restore();
  S.hits.push({ id, x0:x + Math.min(-12, ox + G.x0 - 4) * ps, x1:x + Math.max(cur ? 26 : 12, ox + G.x1) * ps, y0:y + (oy + G.y0) * ps, y1:y + 8 * ps, y });
}

function makeRays(){
  const W = Math.max(2, Math.round(S.vw / 2)), H = Math.max(2, Math.round(S.vh / 2)), c = mk(W, H), g = c.getContext('2d'), r = rng(9);
  const gl = g.createRadialGradient(W * 1.05, -H * .05, 0, W * 1.05, -H * .05, W * 1.1); gl.addColorStop(0, 'rgba(255,224,150,.55)'); gl.addColorStop(1, 'rgba(255,224,150,0)');
  g.fillStyle = gl; g.fillRect(0, 0, W, H);
  const ox = W * 1.1, oy = -H * .12, L = Math.hypot(W, H) * 1.6;
  for (let k = 0; k < 8; k++){
    const a = Math.atan2(.84, -.55) + (k - 3.5) * .12 + (r() - .5) * .04, w = .02 + r() * .04;
    const ex = ox + Math.cos(a) * L, ey = oy + Math.sin(a) * L, gr = g.createLinearGradient(ox, oy, ex, ey);
    gr.addColorStop(0, `rgba(255,228,150,${.26 + r() * .14})`); gr.addColorStop(.7, 'rgba(255,228,150,.06)'); gr.addColorStop(1, 'rgba(255,228,150,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + Math.cos(a - w) * L, oy + Math.sin(a - w) * L); g.lineTo(ox + Math.cos(a + w) * L, oy + Math.sin(a + w) * L); g.closePath(); g.fill();
  }
  S.rays = c;
}
// 移軸模糊：縮小 1/2→1/4→1/8，再一階一階放大回來（每次只放大 2 倍，邊緣才不會有鋸齒）
function tiltBand(top){
  const cv = S.cv, c = S.ctx, W = cv.width, H = cv.height, bh = Math.max(8, Math.round(H * .2)), sy = top ? 0 : H - bh;
  const sizes = [2, 4, 8].map(k => [Math.max(1, Math.ceil(W / k)), Math.max(1, Math.ceil(bh / k))]);
  if (!S.tbs || S.tbs[0].width !== sizes[0][0] || S.tbs[0].height !== sizes[0][1]) S.tbs = sizes.map(s => mk(s[0], s[1])).concat([mk(sizes[1][0], sizes[1][1]), mk(sizes[0][0], sizes[0][1]), mk(W, bh)]);
  const [d2, d4, d8, u4, u2, full] = S.tbs, cx = k => { const x = k.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, k.width, k.height); return x; };
  cx(d2).drawImage(cv, 0, sy, W, bh, 0, 0, d2.width, d2.height);
  cx(d4).drawImage(d2, 0, 0, d4.width, d4.height);
  cx(d8).drawImage(d4, 0, 0, d8.width, d8.height);
  cx(u4).drawImage(d8, 0, 0, u4.width, u4.height);
  cx(u2).drawImage(u4, 0, 0, u2.width, u2.height);
  const f = cx(full); f.drawImage(u2, 0, 0, W, bh);
  const g = f.createLinearGradient(0, top ? 0 : bh, 0, top ? bh : 0); g.addColorStop(0, 'rgba(0,0,0,.95)'); g.addColorStop(.4, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  f.globalCompositeOperation = 'destination-in'; f.fillStyle = g; f.fillRect(0, 0, W, bh); f.globalCompositeOperation = 'source-over';
  c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(full, 0, sy);
}

function render(t){
  const c = S.ctx, dpr = S.dpr, vw = S.vw, vh = S.vh, cam = S.cam, s = S.base * cam.z;
  c.setTransform(dpr, 0, 0, dpr, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  drawSea(c, t, s);
  if (!S.T){ return; }
  const ps = clamp(.72 + .22 * cam.z, .85, 1.5) * (vw < 500 ? 1.05 : 1);
  c.setTransform(dpr * s, 0, 0, dpr * s, dpr * (vw / 2 - cam.x * s), dpr * (vh / 2 - cam.y * s));
  const T = S.T;
  if (T.art){   // 美術圖已經有海浪和雲
    const f = T.art.frames[0], r = T.rect, sh = f.h * ART_PADT / r[3];
    c.drawImage(T.art.img, f.x, f.y, f.w, f.h, r[0], r[1], r[2], r[3]);
    c.save(); c.scale(1, -1); c.drawImage(T.art.img, f.x, f.y, f.w, sh, r[0], 0, r[2], ART_PADT); c.restore();
  }
  else { drawRipples(c, t); drawPuffs(c, t); c.drawImage(T.layer, T.lox, T.loy, T.lw, T.lh); drawFoam(c, t); }
  drawDrift(c, t);
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  S.hits = [];
  const order = S.data.mountains.map((m, i) => ({ m, i, p:S.pos[m.id] })).filter(o => o.p).sort((a, b) => a.p.y - b.p.y);
  order.forEach(o => o.q = w2s(o.p.x, o.p.y));
  const lay = layoutPins(c, order, ps);
  for (const o of order){ const q = o.q; if (q.x < -90 || q.x > vw + 90 || q.y < -60 || q.y > vh + 90) continue; const L2 = lay[o.m.id] || { ox:0, oy:0 }; drawPin(c, o.m, o.i, q.x, q.y, ps, t, L2.ox, L2.oy); }
  // 金色光芒（右上斜射）與暖霧
  if (S.rays){ c.save(); c.globalCompositeOperation = 'screen'; c.globalAlpha = .62 + .22 * Math.sin(t * .6); c.drawImage(S.rays, Math.sin(t * .2) * 6, 0, vw, vh); c.restore(); }
  const hz = c.createLinearGradient(0, 0, 0, vh * .2); hz.addColorStop(0, 'rgba(255,242,214,.32)'); hz.addColorStop(1, 'rgba(255,242,214,0)'); c.fillStyle = hz; c.fillRect(0, 0, vw, vh * .2);
  tiltBand(true); tiltBand(false);
}

// ───────── 主迴圈與輸入 ─────────
function updateCam(dt){
  const k = 1 - Math.exp(-dt * (S.dragging ? 30 : 8)), a = S.cam, b = S.tgt;
  a.x += (b.x - a.x) * k; a.y += (b.y - a.y) * k; a.z += (b.z - a.z) * k;
}
function frame(now){
  if (!S.running) return;
  S.raf = requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - S.last) / 1000 || .016); S.last = now; S.t += dt;
  if (!S.vw) resize(); if (!S.vw) return;
  updateCam(dt); render(S.t);
}
function resize(){
  if (!S.host || !S.cv) return;
  const w = S.host.clientWidth, h = S.host.clientHeight; if (!w || !h) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (w === S.vw && h === S.vh && dpr === S.dpr) return;
  S.vw = w; S.vh = h; S.dpr = dpr; S.cv.width = Math.round(w * dpr); S.cv.height = Math.round(h * dpr);
  S.cv.style.width = w + 'px'; S.cv.style.height = h + 'px';
  S.base = Math.max(w / (S.bx.x1 - S.bx.x0), h / (S.bx.y1 - S.bx.y0)); makeRays();
  ensure();
  if (!S.camInit){ reset(true); S.camInit = true; } else { clampCam(S.tgt); clampCam(S.cam); }
}
function hitAt(x, y){
  let best = null;
  for (const h of S.hits) if (x >= h.x0 && x <= h.x1 && y >= h.y0 && y <= h.y1 && (!best || h.y > best.y)) best = h;
  return best && best.id;
}
function select(id){
  S.sel = id; focus(id);
  clearTimeout(S.selT); S.selT = setTimeout(() => { if (S.cb) S.cb(id); }, 380);
}
function bindInput(cv){
  const ptrs = new Map(); let pinch = null, down = null, moved = 0, vel = { x:0, y:0 }, lastMv = 0;
  const pos = e => { const r = cv.getBoundingClientRect(); return { x:e.clientX - r.left, y:e.clientY - r.top }; };
  const screenToWorld = (sx, sy, cam) => { const s = S.base * cam.z; return { x:(sx - S.vw / 2) / s + cam.x, y:(sy - S.vh / 2) / s + cam.y }; };
  const startPinch = () => { const a = [...ptrs.values()], d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1, mx = (a[0].x + a[1].x) / 2, my = (a[0].y + a[1].y) / 2;
    pinch = { d, z:S.tgt.z, w:screenToWorld(mx, my, S.tgt) }; };
  cv.style.touchAction = 'none';
  cv.addEventListener('pointerdown', e => {
    try { cv.setPointerCapture(e.pointerId); } catch (_) {}
    const p = pos(e); ptrs.set(e.pointerId, p); S.dragging = true; clearTimeout(S.selT);
    if (ptrs.size === 1){ down = { x:p.x, y:p.y, t:performance.now() }; moved = 0; vel.x = vel.y = 0; } else { moved = 99; startPinch(); }
  });
  cv.addEventListener('pointermove', e => {
    const p = pos(e), old = ptrs.get(e.pointerId);
    if (!old){ if (e.pointerType === 'mouse'){ const id = hitAt(p.x, p.y); if (id !== S.hover){ S.hover = id; cv.style.cursor = id ? 'pointer' : 'grab'; } } return; }
    const dx = p.x - old.x, dy = p.y - old.y; old.x = p.x; old.y = p.y;
    if (ptrs.size === 1){
      moved += Math.abs(dx) + Math.abs(dy);
      if (moved > 6){ const s = S.base * S.tgt.z, now = performance.now(), dtm = Math.max(8, now - lastMv) / 1000; lastMv = now;
        S.tgt.x -= dx / s; S.tgt.y -= dy / s; vel.x = lerp(vel.x, -dx / s / dtm, .4); vel.y = lerp(vel.y, -dy / s / dtm, .4); clampCam(S.tgt); }
    } else if (ptrs.size === 2 && pinch){
      const a = [...ptrs.values()], d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1, mx = (a[0].x + a[1].x) / 2, my = (a[0].y + a[1].y) / 2;
      S.tgt.z = clamp(pinch.z * d / pinch.d, 1, 3.4); const s = S.base * S.tgt.z;
      S.tgt.x = pinch.w.x - (mx - S.vw / 2) / s; S.tgt.y = pinch.w.y - (my - S.vh / 2) / s; clampCam(S.tgt);
    }
  });
  const up = e => {
    const p = pos(e), had = ptrs.delete(e.pointerId); if (!had) return;
    if (ptrs.size < 2) pinch = null;
    if (ptrs.size === 0){
      S.dragging = false;
      const dtp = performance.now() - (down ? down.t : 0);
      if (e.type === 'pointerup' && down && moved < 8 && dtp < 450){
        const id = hitAt(p.x, p.y), now = performance.now();
        if (id){ S.lastTap.t = 0; select(id); }
        else {
          if (now - S.lastTap.t < 320 && Math.hypot(p.x - S.lastTap.x, p.y - S.lastTap.y) < 30){ reset(); S.lastTap.t = 0; S.sel = null; }
          else { S.lastTap = { t:now, x:p.x, y:p.y }; S.sel = null; if (S.bgCb) S.bgCb(); }
        }
      } else if (moved >= 8 && performance.now() - lastMv < 80){ S.tgt.x += vel.x * .28; S.tgt.y += vel.y * .28; clampCam(S.tgt); }
    } else if (ptrs.size === 1){ const r = [...ptrs.values()][0]; down = null; moved = 99; r.x = r.x; }
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && S.hover){ S.hover = null; cv.style.cursor = 'grab'; } });
  cv.addEventListener('wheel', e => {
    e.preventDefault(); const p = pos(e), w = screenToWorld(p.x, p.y, S.tgt);
    S.tgt.z = clamp(S.tgt.z * Math.exp(-e.deltaY * .0016), 1, 3.4); const s = S.base * S.tgt.z;
    S.tgt.x = w.x - (p.x - S.vw / 2) / s; S.tgt.y = w.y - (p.y - S.vh / 2) / s; clampCam(S.tgt);
  }, { passive:false });
  cv.addEventListener('click', e => e.stopPropagation());   // 避免觸發 #mapWrap 的舊點擊處理
  cv.addEventListener('contextmenu', e => e.preventDefault());
}

// 美術圖晚一點才載完：雲朵換成美術圖；換成立體地圖，重新算山的位置與相機範圍（路標每格都會重看有沒有圖）
if (SX.art) SX.art.onLoad(() => {
  if (S.sprites) makeSprites();
  if (!artMap() || (S.T && S.T.art)) return;
  S.dirty = true; ensure(); if (S.vw){ S.base = Math.max(S.vw / (S.bx.x1 - S.bx.x0), S.vh / (S.bx.y1 - S.bx.y0)); reset(true); }
});

// ───────── 公開 API ─────────
SX.worldmap = {
  init(host){
    S.host = host; host.innerHTML = '';
    const cv = document.createElement('canvas'); cv.style.cssText = 'display:block;width:100%;height:100%;cursor:grab;touch-action:none;-webkit-user-select:none;user-select:none';
    host.appendChild(cv); S.cv = cv; S.ctx = cv.getContext('2d'); S.vw = 0; S.vh = 0; S.camInit = false;
    bindInput(cv);
    if (window.ResizeObserver){ S.ro = new ResizeObserver(() => resize()); S.ro.observe(host); }
    window.addEventListener('resize', resize);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { S.tw = {}; });
    resize();
  },
  setData(d){
    const o = S.data, n = d || {};
    if (n.mountains && n.mountains !== o.mountains || n.coast && n.coast !== o.coast || n.ridge && n.ridge !== o.ridge) S.dirty = true;
    S.data = { mountains:n.mountains || o.mountains, coast:n.coast || o.coast, ridge:n.ridge || o.ridge,
      done:n.done || {}, prog:n.prog || {}, current:n.current || null, locked:n.locked || {}, photos:n.photos || {}, pet:n.pet || null };
    S.tw = {}; ensure();
  },
  onSelect(fn){ S.cb = fn; },
  onBackground(fn){ S.bgCb = fn; },       // 點到空白處（game.js 用來收起資訊卡）
  focus(id){ S.sel = id; focus(id); },
  reset(){ S.sel = null; reset(); },
  clearSelection(){ S.sel = null; },
  start(){
    if (S.running) return; S.running = true; S.last = performance.now(); resize(); ensure();
    S.raf = requestAnimationFrame(frame);
  },
  stop(){ S.running = false; cancelAnimationFrame(S.raf); clearTimeout(S.selT); },
  pinScreenPos(id){ const p = S.pos[id]; return p ? w2s(p.x, p.y) : null; }
};
})();

// 山行小日子：登山口廣場（山友大廳的「廣場」分頁）
// 大家都是一個登山客，點地面就走過去；說的話在頭上冒 5 秒；可以做打招呼動作。
// 連線（位置、說話、動作的收發）在 social.js，這裡只負責畫面與點擊。
// 廣場座標：x 0～1（左到右），y 0～1（遠到近）。
(function(){
'use strict';
const SX = window.SX = window.SX || {};
const P = SX.plaza = {};
const TAU = Math.PI * 2, INK = '#3a2a20', FONT = getComputedStyle(document.documentElement).getPropertyValue('--fontB').trim() || 'sans-serif';   // 字型在 css/style.css 的 --fontB
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const SPEED = 0.2;           // 每秒走多少廣場寬
const SAY_MS = 5000;         // 頭上冒字停留多久
const PLAZA_ART_TOP = 0.47;   // plaza_bg 美術圖：石板地上緣（山門腳下）在畫面高度的比例；換圖要重量
// 打招呼動作：k 是連線用的代號，ms 是動作長度（坐下會一直坐到下次走動）
// 圖示美術圖是 'emo_' + k；pose 是做動作時換上的背影美術圖，poseCm 是那張圖整張要畫多高（公分，圖裡舉高的手也算進去，人才跟走路時一樣高）
P.EMO = [
  { k:'wave',  label:'揮手', icon:'👋', ms:2200, pose:'hiker_wave',  poseCm:181 },
  { k:'bow',   label:'鞠躬', icon:'🙇', ms:1600, pose:'hiker_bow',   poseCm:176 },
  { k:'jump',  label:'跳一下', icon:'✨', ms:1100 },
  { k:'sit',   label:'坐下', icon:'☕', ms:0 },
  { k:'cheer', label:'歡呼', icon:'🎉', ms:2200, pose:'hiker_cheer', poseCm:186 },
];
const EMO = {}; P.EMO.forEach(e => EMO[e.k] = e);
P.emoArt = k => 'emo_' + k;     // 動作圖示的美術圖名字（選單按鈕也用這個）
const ICON_PX = 24;             // 名牌旁動作圖示的大小
const icons = {};               // 動作圖示：裁好的美術圖（第一次用到才裁）
function emoIcon(k){ if (!icons[k] && SX.art) { const c = SX.art.crop(P.emoArt(k), 0); if (c) icons[k] = c; } return icons[k] || null; }

let host = null, cv = null, ctx = null, W = 0, H = 0, DPR = 1, BG = null, raf = 0, last = 0, ro = null;
let me = null, opt = {}, ppl = new Map(), taps = [];
let gT = 0, gB = 0, bu = 1;   // 廣場地面上緣、下緣（螢幕 y），角色基本比例

// ───────── 座標換算（近大遠小）─────────
const kAt = y => 0.55 + 0.45 * y;
function toScr(x, y){ const k = kAt(y); return { sx: W / 2 + (x - 0.5) * W * 0.98 * k, sy: gT + (gB - gT) * y, u: bu * k }; }
function toWorld(sx, sy){ const y = (sy - gT) / (gB - gT); return { x: 0.5 + (sx - W / 2) / (W * 0.98 * kAt(clamp(y, 0, 1))), y }; }

// ───────── 背景：有 plaza_bg 美術圖就用，沒有就用程式畫 ─────────
function mk(w, h){ const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function buildBG(){
  BG = mk(Math.round(W * DPR), Math.round(H * DPR)); const g = BG.getContext('2d'); g.scale(DPR, DPR);
  const art = SX.art && SX.art.get('plaza_bg');
  if (art) {                       // 美術圖：等比例撐滿（cover）
    const f = art.frames[0], s = Math.max(W / f.w, H / f.h), w = f.w * s, h = f.h * s;
    g.drawImage(art.img, f.x, f.y, f.w, f.h, (W - w) / 2, (H - h) / 2, w, h); return;
  }
  g.lineJoin = g.lineCap = 'round';
  const A = SX.art || { get:() => null };
  const yH = (H - gT) / (gB - gT), a = toScr(0, 0), b = toScr(1, 0), c = toScr(1, yH), d = toScr(0, yH);   // yH：畫面最底下對應的廣場 y（超過 1 的部分是走不到的前景）
  // 遠景：有 sky_day 美術圖就用（底部對齊廣場後緣），沒有就畫三層山
  const sky = A.get('sky_day');
  if (sky) { const f = sky.frames[0], s = Math.max(W / f.w, (gT + 30) / f.h); g.drawImage(sky.img, f.x, f.y, f.w, f.h, (W - f.w * s) / 2, gT + 30 - f.h * s, f.w * s, f.h * s); }
  else {
    let gr = g.createLinearGradient(0, 0, 0, gT); gr.addColorStop(0, '#a9d4ea'); gr.addColorStop(1, '#f3e6cc');
    g.fillStyle = gr; g.fillRect(0, 0, W, gT + 4);
    const ridge = (base, amp, seed, fill) => {
      g.beginPath(); g.moveTo(0, gT + 4);
      for (let x = 0; x <= W; x += 8) g.lineTo(x, base - amp * (0.55 + 0.45 * Math.sin(x * 0.011 + seed) * Math.sin(x * 0.027 + seed * 2)));
      g.lineTo(W, gT + 4); g.closePath(); g.fillStyle = fill; g.fill(); g.strokeStyle = 'rgba(58,42,32,.35)'; g.lineWidth = 1.4; g.stroke();
    };
    ridge(gT - 20, gT * 0.5, 1.3, '#a7c3bd'); ridge(gT - 6, gT * 0.32, 4.1, '#7fa58e'); ridge(gT + 2, gT * 0.16, 7.7, '#5f8a66');
  }
  // 地面貼圖：一條一條橫帶，每條依遠近縮放，貼圖跟著透視（tiles：廣場寬度放幾片貼圖）
  const texRows = (id, tiles, clip) => {
    const e = A.get(id); if (!e) return false;
    const pat = g.createPattern(e.img, 'repeat'), tw = e.w;
    g.save(); if (clip) { clip(); g.clip(); }
    // 直向：整片用同一個縮放（廣場的遠近本來就是直線換算），壓成中段看起來約略方形的石板
    const sv = W * 0.98 * kAt(0.5) * 0.5 / (tiles * tw);
    for (let y = gT; y < H; y += 2) {
      const sc = W * 0.98 * kAt((y - gT) / (gB - gT)) / (tiles * tw);
      pat.setTransform(new DOMMatrix([sc, 0, 0, sv, W / 2 - sc * tiles * tw / 2, gT]));
      g.fillStyle = pat; g.fillRect(0, y, W, 2.6);
    }
    g.restore(); return true;
  };
  const plazaPath = () => { g.beginPath(); g.moveTo(a.sx, a.sy); g.lineTo(b.sx, b.sy); g.lineTo(c.sx, H); g.lineTo(d.sx, H); g.closePath(); };
  // 兩側草地
  if (!texRows('ground_grass', 2)) { g.fillStyle = '#8fbf6a'; g.fillRect(0, gT, W, H - gT); }
  // 石板廣場（梯形）
  if (!texRows('ground_stone', 1.4, plazaPath)) {
    plazaPath(); const gr = g.createLinearGradient(0, gT, 0, H); gr.addColorStop(0, '#cdbb98'); gr.addColorStop(1, '#e4d4b0'); g.fillStyle = gr; g.fill();
    g.save(); g.clip(); g.strokeStyle = 'rgba(58,42,32,.22)'; g.lineWidth = 1;
    for (let i = 1; i < 16; i++) { const y = (i / 16) ** 1.25 * yH, p = toScr(0, y), q = toScr(1, y); g.beginPath(); g.moveTo(p.sx, p.sy); g.lineTo(q.sx, q.sy); g.stroke(); }
    for (let i = -3; i <= 13; i++) { const x = i / 10, p = toScr(x, 0), q = toScr(x, yH); g.beginPath(); g.moveTo(p.sx, p.sy); g.lineTo(q.sx, q.sy); g.stroke(); }
    g.restore();
  }
  plazaPath(); g.strokeStyle = INK; g.lineWidth = 2; g.stroke();  const s = bu;
  // 山屋（左後方）
  const hx = toScr(0.12, 0).sx, hy = gT + 6, hw = 92 * s * 1.1, hh = 56 * s * 1.1;
  g.fillStyle = '#c99862'; g.fillRect(hx - hw / 2, hy - hh, hw, hh); g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(hx - hw / 2, hy - hh, hw, hh);
  g.beginPath(); g.moveTo(hx - hw * 0.62, hy - hh); g.lineTo(hx, hy - hh - hh * 0.75); g.lineTo(hx + hw * 0.62, hy - hh); g.closePath(); g.fillStyle = '#9a4e3c'; g.fill(); g.stroke();
  g.fillStyle = '#6a4432'; g.fillRect(hx - hw * 0.1, hy - hh * 0.62, hw * 0.2, hh * 0.62); g.strokeRect(hx - hw * 0.1, hy - hh * 0.62, hw * 0.2, hh * 0.62);
  g.fillStyle = '#ffe9a8'; g.fillRect(hx + hw * 0.2, hy - hh * 0.7, hw * 0.18, hh * 0.25); g.strokeRect(hx + hw * 0.2, hy - hh * 0.7, hw * 0.18, hh * 0.25);
  g.fillRect(hx - hw * 0.38, hy - hh * 0.7, hw * 0.18, hh * 0.25); g.strokeRect(hx - hw * 0.38, hy - hh * 0.7, hw * 0.18, hh * 0.25);
  // 登山口木牌（正後方）
  const sx = W / 2, sy = gT + 4, bw = 84 * s, bh = 30 * s;
  g.fillStyle = '#7a5238'; g.fillRect(sx - bw * 0.42, sy - bh * 2.1, 5 * s, bh * 2.1); g.fillRect(sx + bw * 0.42 - 5 * s, sy - bh * 2.1, 5 * s, bh * 2.1);
  g.fillStyle = '#d9a86a'; g.fillRect(sx - bw / 2, sy - bh * 2.2, bw, bh); g.strokeStyle = INK; g.strokeRect(sx - bw / 2, sy - bh * 2.2, bw, bh);
  g.fillStyle = INK; g.font = `${Math.round(17 * s)}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('登山口', sx, sy - bh * 1.7);
  // 公告板（右後方）
  const nx = toScr(0.86, 0).sx, nw = 60 * s, nh = 40 * s;
  g.fillStyle = '#7a5238'; g.fillRect(nx - nw * 0.4, gT - nh * 1.6, 4 * s, nh * 1.6 + 4); g.fillRect(nx + nw * 0.4 - 4 * s, gT - nh * 1.6, 4 * s, nh * 1.6 + 4);
  g.fillStyle = '#c9a070'; g.fillRect(nx - nw / 2, gT - nh * 1.7, nw, nh); g.strokeRect(nx - nw / 2, gT - nh * 1.7, nw, nh);
  g.fillStyle = '#fff8e6'; for (let i = 0; i < 3; i++) { g.fillRect(nx - nw * 0.4 + i * nw * 0.28, gT - nh * 1.6, nw * 0.22, nh * 0.6); }
  // 兩側的樹
  const tree = (x, y, h) => {
    g.fillStyle = '#6a4a3c'; g.fillRect(x - h * 0.04, y - h * 0.2, h * 0.08, h * 0.2);
    for (let i = 0; i < 3; i++) { const yy = y - h * (0.18 + i * 0.26), ww = h * (0.36 - i * 0.09); g.beginPath(); g.moveTo(x - ww, yy); g.lineTo(x, yy - h * 0.38); g.lineTo(x + ww, yy); g.closePath(); g.fillStyle = i % 2 ? '#3f7352' : '#2f5a44'; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.6; g.stroke(); }
  };
  // 兩側的樹、杜鵑、長椅：有美術圖就用美術圖
  const prop = (id, x, y, h, draw) => { if (A.drawFrame && A.drawFrame(g, id, 0, x, y, h)) return; if (draw) draw(x, y, h); };
  const sy2 = f => gT + (gB - gT) * f;
  prop('tree_pine', W * 0.02, sy2(0.3), 330 * s, tree); prop('tree_pine', W * 0.98, sy2(0.18), 300 * s, tree);
  prop('bush_rhodo', W * 0.05, sy2(0.7), 110 * s); prop('bush_rhodo', W * 0.95, sy2(0.52), 95 * s);
  prop('bench', toScr(0.03, 0.1).sx, sy2(0.1), 70 * s);
  prop('tree_pine', W * 0.99, sy2(0.95), 420 * s, tree);
}

// ───────── 人物 ─────────
function person(d){
  const pos = d.pos || { x:0.5, y:0.85 };
  return { id:d.id, name:String(d.name || '山友').slice(0, 12), pet:d.pet || null, x:pos.x, y:pos.y, tx:pos.x, ty:pos.y, ph:Math.random() * TAU, mv:0, flip:false,
    tint:d.id === me ? -1 : (SX.scene && SX.scene.hashStr ? SX.scene.hashStr(String(d.id)) % 3 : 0), say:'', sayT:0, emo:null, emoT:0, sit:false };
}
P.reset = function(list, myId){ me = myId; ppl = new Map(); (list || []).forEach(d => { if (d && d.id) ppl.set(d.id, person(d)); }); };
P.join = function(d){ if (!d || !d.id) return; const o = ppl.get(d.id); ppl.set(d.id, Object.assign(person(d), o ? { say:o.say, sayT:o.sayT } : {})); };
P.leave = function(id){ ppl.delete(id); };
P.move = function(id, x, y){ const p = ppl.get(id); if (!p) return; p.tx = clamp(+x || 0, 0, 1); p.ty = clamp(+y || 0, 0, 1); p.sit = false; if (p.emo && p.emo.k === 'sit') p.emo = null; };
P.say = function(id, text){ const p = ppl.get(id); if (!p) return; p.say = String(text || ''); p.sayT = performance.now(); };
P.emote = function(id, k){ const p = ppl.get(id), e = EMO[k]; if (!p || !e) return; p.emo = e; p.emoT = performance.now(); p.sit = k === 'sit'; };
P.count = () => ppl.size;

// ───────── 掛上／拿下畫面 ─────────
// o：{ onMove(x, y) 自己點了地面, onTapPerson({id, name}) 點了別人 }
P.mount = function(el, o){
  P.unmount(); host = el; opt = o || {};
  cv = document.createElement('canvas'); cv.className = 'plzCv'; el.prepend(cv); ctx = cv.getContext('2d');
  cv.addEventListener('pointerdown', onTap);
  ro = new ResizeObserver(resize); ro.observe(el); resize();
  last = performance.now(); raf = requestAnimationFrame(loop);
};
// 離開廣場：畫布和背景圖馬上釋放（iPhone 畫布記憶體有上限，等自動回收太慢，進出大廳幾次就會卡）
P.unmount = function(){ cancelAnimationFrame(raf); raf = 0; if (ro) ro.disconnect(); ro = null; if (cv) { cv.remove(); cv.width = cv.height = 0; } if (BG) BG.width = BG.height = 0; BG = null; cv = ctx = host = null; };
P.redraw = function(){ if (cv) { W = 0; resize(); } };   // 美術圖晚到：地面範圍也要跟著圖重算
if (SX.art) SX.art.onLoad(() => P.redraw());

function resize(){
  if (!host) return;
  const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight), d = Math.min(2, window.devicePixelRatio || 1);
  if (w === W && h === H && d === DPR && BG) return;
  W = w; H = h; DPR = d; cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  // 地面可走範圍的最下緣停在聊天框上方，角色才不會走到聊天框後面看不到
  // 有 plaza_bg 美術圖時，石板地從畫面一半左右（山門）開始；程式畫的版本從四分之一開始
  const art = SX.art && SX.art.get('plaza_bg');
  gT = Math.round(H * (art ? PLAZA_ART_TOP : 0.27)); gB = H - Math.max(120, H * 0.2); bu = Math.min(W / 375, H / 640) * (art ? 0.52 : 0.46);
  buildBG();
}
function onTap(e){
  const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  // 先看有沒有點到人（近的優先）
  const list = [...ppl.values()].sort((a, b) => b.y - a.y);
  for (const p of list) {
    const s = toScr(p.x, p.y), hw = Math.max(22, 34 * s.u), top = s.sy - (p.sit ? 118 : 182) * s.u;
    if (x > s.sx - hw && x < s.sx + hw && y > top - 6 && y < s.sy + 6) { if (p.id !== me && opt.onTapPerson) opt.onTapPerson({ id:p.id, name:p.name }); return; }
  }
  if (y < gT - 4) return;
  const w = toWorld(x, y), tx = clamp(w.x, 0.02, 0.98), ty = clamp(w.y, 0, 1);
  P.move(me, tx, ty); taps.push({ x:tx, y:ty, t:performance.now() });
  if (opt.onMove) opt.onMove(tx, ty);
}

// ───────── 每格畫面 ─────────
function loop(now){
  if (!cv) return;
  raf = requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const t = now / 1000;
  for (const p of ppl.values()) {
    const dx = (p.tx - p.x) * 1.4, dy = p.ty - p.y, dist = Math.hypot(dx, dy), step = SPEED * dt * (0.7 + 0.3 * kAt(p.y));
    if (dist > 0.004) { const k = Math.min(1, step / dist); p.x += (p.tx - p.x) * k; p.y += dy * k; p.ph += step * 26; if (Math.abs(dx) > 0.01) p.flip = dx < 0; p.mv += (1 - p.mv) * Math.min(1, dt * 8); }
    else p.mv += (0 - p.mv) * Math.min(1, dt * 8);
  }
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.drawImage(BG, 0, 0, W, H);
  // 點地面的小圈圈
  taps = taps.filter(k => now - k.t < 700);
  for (const k of taps) { const s = toScr(k.x, k.y), a = (now - k.t) / 700; ctx.strokeStyle = `rgba(255,248,230,${1 - a})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(s.sx, s.sy, 8 + a * 18, (8 + a * 18) * 0.4, 0, 0, TAU); ctx.stroke(); }
  const list = [...ppl.values()].sort((a, b) => a.y - b.y), labels = [];
  for (const p of list) {
    const s = toScr(p.x, p.y);
    let hop = 0, sq = 1, sway = 0;
    const e = p.emo, et = e ? now - p.emoT : 0;
    if (e && e.ms && et > e.ms) p.emo = null;
    const pose = p.emo && p.emo.pose && SX.art && SX.art.get(p.emo.pose) ? p.emo : null;   // 有動作美術圖就換上，沒有才用程式動作
    if (p.emo && !pose) {
      const q = et / (e.ms || 1);
      if (e.k === 'jump') hop = Math.abs(Math.sin(q * Math.PI * 2)) * 26;
      else if (e.k === 'cheer') hop = Math.abs(Math.sin(q * Math.PI * 3)) * 16;
      else if (e.k === 'bow') sq = 1 - Math.sin(Math.min(1, q * 1.3) * Math.PI) * 0.16;
      else if (e.k === 'wave') sway = Math.sin(et / 120) * 0.08;
    }
    // 打招呼的動作圖也交給 drawPerson 畫（寵物、影子、衣服色調都同一套）
    ctx.save(); ctx.translate(s.sx, s.sy); ctx.rotate(sway); ctx.scale(1, sq); ctx.translate(-s.sx, -s.sy - hop * s.u);
    const headCm = SX.scene && SX.scene.drawPerson ? SX.scene.drawPerson(ctx, s.sx, s.sy, s.u, { ph:p.ph, mv:p.mv, sit:p.sit, tint:p.tint, pet:p.pet, flip:p.flip, pose:pose ? { id:pose.pose, cm:pose.poseCm } : null }, t) : 182;
    ctx.restore();
    labels.push({ p, x:s.sx, y:s.sy - (headCm * sq + hop) * s.u - 6 });
  }
  // 名牌、動作圖示、對話框畫在最上層，不會被別人擋住
  for (const L of labels) drawLabel(L.p, L.x, L.y, now);
}
function rr(x, y, w, h, r){ ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
function drawLabel(p, x, y, now){
  const mine = p.id === me;
  ctx.font = `12px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (p._nwFor !== p.name) { p._nwFor = p.name; p._nw = ctx.measureText(p.name).width + 12; }   // 名牌寬度、對話框折行只在文字變了才量（以前每格每個字都量一次）
  const nw = p._nw;
  ctx.fillStyle = mine ? 'rgba(255,224,138,.95)' : 'rgba(255,248,230,.9)'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
  rr(x - nw / 2, y - 9, nw, 18, 9); ctx.fill(); ctx.stroke();
  ctx.fillStyle = INK; ctx.fillText(p.name, x, y + 0.5);
  let top = y - 12;
  if (p.emo && p.emo.icon) {
    const q = p.emo.ms ? (now - p.emoT) / p.emo.ms : 0, a = p.emo.ms ? Math.min(1, (1 - q) * 4) : 1;
    const ix = x + nw / 2 + 8, iy = y - 12 - Math.sin(now / 200) * 2, ic = emoIcon(p.emo.k);
    ctx.globalAlpha = a;
    if (ic) { const k = ICON_PX / Math.max(ic.width, ic.height); ctx.drawImage(ic, ix - ic.width * k / 2, iy - ic.height * k / 2, ic.width * k, ic.height * k); }
    else { ctx.font = `20px ${FONT}`; ctx.fillText(p.emo.icon, ix, iy); }
    ctx.globalAlpha = 1;
  }
  // 說的話：冒在頭上 5 秒，最後半秒淡出
  const age = now - p.sayT;
  if (p.say && age < SAY_MS) {
    ctx.globalAlpha = Math.min(1, (SAY_MS - age) / 500, age / 120);
    ctx.font = `14px ${FONT}`;
    if (p._sayFor !== p.say) { p._sayFor = p.say; p._lines = wrap(p.say, 150); p._bw = Math.max(...p._lines.map(l => ctx.measureText(l).width)) + 18; }
    const lines = p._lines, lh = 18, bw = p._bw, bh = lines.length * lh + 10;
    const bx = clamp(x - bw / 2, 4, W - bw - 4), by = top - bh - 8;
    ctx.fillStyle = mine ? '#eaf6d8' : '#fffdf4'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
    rr(bx, by, bw, bh, 10); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 6, by + bh - 1); ctx.lineTo(x, by + bh + 7); ctx.lineTo(x + 6, by + bh - 1); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 6, by + bh); ctx.lineTo(x, by + bh + 7); ctx.lineTo(x + 6, by + bh); ctx.stroke();
    ctx.fillStyle = INK; lines.forEach((l, i) => ctx.fillText(l, bx + bw / 2, by + 5 + lh * i + lh / 2));
    ctx.globalAlpha = 1;
  }
}
function wrap(s, maxW){
  const out = []; let cur = '';
  for (const ch of s) { if (ctx.measureText(cur + ch).width > maxW && cur) { out.push(cur); cur = ch; } else cur += ch; }
  if (cur) out.push(cur);
  return out;
}
})();

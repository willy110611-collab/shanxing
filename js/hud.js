/* 山行小日子 - 登山 HUD (手繪木框風)
   window.SX.hud = { mount, update, setRoute, setMarks, drawWxArt, wxArt }
   左上：表情臉 + 體力 + 體溫 + 高度跳動數字；右上：天氣圖示 + 圓形等高線雷達小地圖 */
(function () {
  'use strict';
  window.SX = window.SX || {};
  const INK = '#3a2a20';
  const DPR = Math.min(2, window.devicePixelRatio || 1);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ───────── 狀態 ───────── */
  const H = {
    root: null, els: {},
    mood: null, wxKey: null, altStr: '', digits: [],
    route: null, marks: [], seed: 1,
    base: null, world: null, wx0: 0, wy0: 0,
    cum: null, pts: null, total: 1,
    angle: null, lastF: -1, lastDraw: 0, dirty: true
  };
  const WORLD = 720, EXTENT = 500, K = 0.5, RS = 104; // 世界畫布 / 路線範圍 / 世界→CSS 縮放 / 雷達 CSS 尺寸

  function mk(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function cvs(w, h, cssW, cssH) { const c = document.createElement('canvas'); c.width = Math.round(w); c.height = Math.round(h); if (cssW) { c.style.width = cssW + 'px'; c.style.height = cssH + 'px'; } return c; }

  /* ───────── 掛載 ───────── */
  function mount(container) {
    H.root = container;
    container.innerHTML = '';
    const panel = mk('div', 'hudP');
    const face = mk('div', 'hudFace');
    const faceCv = cvs(46 * DPR, 46 * DPR); face.appendChild(faceCv);
    const col = mk('div', 'hudCol');
    const name = mk('div', 'hudName', '');
    const stamBar = mk('div', 'hudBar', '<span>體力</span><div class="hbar"><i></i></div>');
    const tempBar = mk('div', 'hudBar', '<span>體溫</span><div class="hbar warm"><i></i></div>');
    const alt = mk('div', 'hudAlt', '<span class="up">▲</span><span class="digits"></span><small>m</small>');
    const sub = mk('div', 'hudSub', '<span class="dd"></span><span class="ee"></span>');
    [name, stamBar, tempBar, alt, sub].forEach(e => col.appendChild(e));
    panel.appendChild(face); panel.appendChild(col);

    const right = mk('div', 'hudR');
    const wx = mk('div', 'hudWx'); const wxCv = cvs(42 * DPR, 42 * DPR); wx.appendChild(wxCv);
    const rb = mk('div', 'radarBox'); const rCv = cvs(RS * DPR, RS * DPR); rb.appendChild(rCv);
    right.appendChild(wx); right.appendChild(rb);
    container.appendChild(panel); container.appendChild(right);

    H.els = {
      face, faceCv, name, stam: stamBar.querySelector('.hbar'), stamI: stamBar.querySelector('i'),
      temp: tempBar.querySelector('.hbar'), tempI: tempBar.querySelector('i'),
      digits: alt.querySelector('.digits'), dd: sub.querySelector('.dd'), ee: sub.querySelector('.ee'),
      wxCv, rCv, rctx: rCv.getContext('2d'), wxWrap: wx
    };
    H.digits = []; H.altStr = ''; H.mood = null; H.wxKey = null; H.dirty = true;
    drawFace('happy');
    if (H.world) drawRadar(0, true);
  }

  // 美術圖晚一點才載完：重畫一次臉
  if (SX.art) SX.art.onLoad(() => { if (H.els.faceCv) drawFace(H.mood || 'happy'); H.wxKey = null; });   // 天氣圖示下次更新時改畫美術圖

  /* ───────── 表情臉 ───────── */
  function drawFace(mood) {
    const c = H.els.faceCv, g = c.getContext('2d'), S = c.width;
    g.setTransform(S / 46, 0, 0, S / 46, 0, 0);
    g.clearRect(0, 0, 46, 46);
    const cold = mood === 'cold';
    // 美術圖版本：face_happy / face_ok / face_tired / face_cold / face_sleep
    const art = SX.art && SX.art.get('face_' + (['happy', 'tired', 'cold', 'sleep'].includes(mood) ? mood : 'ok'));
    if (art) { const f = art.frames[0], k = Math.min(44 / f.w, 44 / f.h); g.drawImage(art.img, f.x, f.y, f.w, f.h, 23 - f.w * k / 2, 23 - f.h * k / 2, f.w * k, f.h * k); H.els.face.classList.toggle('cold', cold); return; }
    // 臉
    const grd = g.createLinearGradient(0, 0, 46, 46);
    grd.addColorStop(0, cold ? '#d6ecfa' : '#ffeccb'); grd.addColorStop(1, cold ? '#a9cdea' : '#f3c995');
    g.fillStyle = grd; g.beginPath(); g.arc(23, 25, 17.5, 0, 7); g.fill();
    g.strokeStyle = INK; g.lineWidth = 2; g.stroke();
    // 帽子
    g.fillStyle = cold ? '#5b8fd0' : '#d9533f';
    g.beginPath(); g.moveTo(5.5, 19); g.quadraticCurveTo(7, 4, 23, 4); g.quadraticCurveTo(39, 4, 40.5, 19);
    g.quadraticCurveTo(23, 14, 5.5, 19); g.closePath(); g.fill(); g.lineWidth = 2; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(30, 9.5, 5, 2.2, -.4, 0, 7); g.fill();
    g.fillStyle = '#ffe08a'; g.beginPath(); g.arc(23, 9, 2.2, 0, 7); g.fill(); g.lineWidth = 1.3; g.stroke();
    // 腮紅
    if (!cold) { g.fillStyle = 'rgba(240,120,100,.45)'; g.beginPath(); g.arc(11.5, 28, 3, 0, 7); g.arc(34.5, 28, 3, 0, 7); g.fill(); }
    g.strokeStyle = INK; g.lineWidth = 2; g.lineCap = 'round'; g.lineJoin = 'round'; g.fillStyle = INK;
    const eye = (x, y, t) => {
      g.beginPath();
      if (t === 'up') { g.arc(x, y + 1.5, 3.2, Math.PI * 1.08, Math.PI * 1.92); g.stroke(); }
      else if (t === 'dot') { g.arc(x, y, 1.9, 0, 7); g.fill(); }
      else if (t === 'lid') { g.moveTo(x - 3.2, y - .5); g.lineTo(x + 3.2, y - .5); g.stroke(); g.beginPath(); g.arc(x, y + 1.4, 1.5, 0, 7); g.fill(); }
      else if (t === 'x') { g.moveTo(x - 2.6, y - 2.4); g.lineTo(x + 2.6, y + 2.4); g.moveTo(x + 2.6, y - 2.4); g.lineTo(x - 2.6, y + 2.4); g.stroke(); }
      else if (t === 'sleep') { g.arc(x, y - 1.5, 3.2, Math.PI * .1, Math.PI * .9); g.stroke(); }
    };
    if (mood === 'happy') {
      eye(16, 24, 'up'); eye(30, 24, 'up');
      g.beginPath(); g.moveTo(16.5, 30); g.quadraticCurveTo(23, 38, 29.5, 30); g.stroke();
    } else if (mood === 'tired') {
      eye(16, 25, 'lid'); eye(30, 25, 'lid');
      g.beginPath(); g.moveTo(17, 34); g.quadraticCurveTo(20, 31, 23, 34); g.quadraticCurveTo(26, 37, 29, 34); g.stroke();
      // 汗滴
      g.fillStyle = '#8fd0f0'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(39, 18); g.quadraticCurveTo(43.5, 25, 39, 28); g.quadraticCurveTo(34.5, 25, 39, 18); g.fill(); g.stroke();
    } else if (mood === 'cold') {
      eye(16, 25, 'x'); eye(30, 25, 'x');
      g.beginPath(); g.moveTo(15.5, 34); for (let i = 0; i < 6; i++) g.lineTo(15.5 + (i + 1) * 2.5, 34 + (i % 2 ? 0 : 2.6)); g.stroke();
      g.strokeStyle = '#4f7fb5'; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(2, 22); g.lineTo(5, 24); g.lineTo(2, 27); g.moveTo(44, 22); g.lineTo(41, 24); g.lineTo(44, 27); g.stroke();
    } else if (mood === 'sleep') {
      eye(16, 26, 'sleep'); eye(30, 26, 'sleep');
      g.beginPath(); g.ellipse(23, 34, 2.2, 2.6, 0, 0, 7); g.stroke();
      g.fillStyle = INK; g.font = 'bold 9px sans-serif'; g.fillText('z', 35, 15); g.font = 'bold 7px sans-serif'; g.fillText('z', 40, 10);
    } else { // ok
      eye(16, 25, 'dot'); eye(30, 25, 'dot');
      g.beginPath(); g.moveTo(18.5, 33); g.quadraticCurveTo(23, 35.5, 27.5, 33); g.stroke();
    }
    // 高光(右上)
    g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.ellipse(34, 21, 2.2, 3.4, .5, 0, 7); g.fill();
    H.els.face.classList.toggle('cold', cold);
  }

  /* ───────── 天氣圖示 ───────── */
  // 天氣 → 美術圖（晴、多雲的晚上用月亮圖；雨、霧晚上照樣顯示雨霧）
  const WX_ART = { sunny:'wx_sun', cloudy:'wx_cloud', rain:'wx_rain', fog:'wx_fog', snow:'wx_snow' };
  function wxArt(kind, time) { return time === 'night' && (kind === 'sunny' || kind === 'cloudy') ? 'wx_night' : WX_ART[kind] || 'wx_sun'; }
  // 把天氣美術圖畫滿 size×size（圓章已含木框）；沒圖回傳 false，呼叫端改畫手繪版
  function drawWxArt(g, kind, time, size) {
    const id = wxArt(kind, time), e = SX.art && SX.art.get(id); if (!e) return false;
    const f = e.frames[0], k = size / Math.max(f.w, f.h), w = f.w * k, h = f.h * k;
    g.drawImage(e.img, f.x, f.y, f.w, f.h, (size - w) / 2, (size - h) / 2, w, h);
    return true;
  }
  function drawWx(kind, time) {
    const c = H.els.wxCv, g = c.getContext('2d'), S = c.width;
    g.setTransform(S / 42, 0, 0, S / 42, 0, 0); g.clearRect(0, 0, 42, 42);
    const art = drawWxArt(g, kind, time, 42);
    H.els.wxWrap.classList.toggle('art', art);
    if (art) { H.els.wxWrap.style.background = ''; return; }
    g.lineJoin = 'round'; g.lineCap = 'round';
    const night = time === 'night', warm = time === 'dawn' || time === 'dusk';
    H.els.wxWrap.style.background = night ? 'linear-gradient(#34436e,#6a6a9c)' : warm ? 'linear-gradient(#f9c98e,#fbe6b8)' : kind === 'rain' ? 'linear-gradient(#a9bfcb,#d5dde0)' : kind === 'snow' ? 'linear-gradient(#c6d3e0,#eef2f6)' : 'radial-gradient(circle at 40% 35%,#fff6df,#f1dfb6)';   // 晴天：羊皮紙底，跟右上暖陽同色調
    const sun = (x, y, r) => {
      g.strokeStyle = INK; g.lineWidth = 2;
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.beginPath(); g.moveTo(x + Math.cos(a) * (r + 2), y + Math.sin(a) * (r + 2)); g.lineTo(x + Math.cos(a) * (r + 5), y + Math.sin(a) * (r + 5)); g.stroke(); }
      const gr = g.createRadialGradient(x + r * .35, y - r * .35, 1, x, y, r); gr.addColorStop(0, '#fff3a8'); gr.addColorStop(1, warm ? '#f59a4a' : '#f6b83d');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.stroke();
    };
    const moon = (x, y, r) => {
      g.fillStyle = '#fff1b8'; g.strokeStyle = INK; g.lineWidth = 2;
      g.beginPath(); g.arc(x, y, r, Math.PI * .2, Math.PI * 1.8, false); g.arc(x + r * .55, y - r * .1, r * .85, Math.PI * 1.7, Math.PI * .3, true); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#fff'; [[8, 9], [33, 14], [30, 32]].forEach(p => { g.beginPath(); g.arc(p[0], p[1], 1.2, 0, 7); g.fill(); });
    };
    const cloud = (x, y, s, col) => {
      g.fillStyle = col || '#fffdf6'; g.strokeStyle = INK; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x - 11 * s, y + 6 * s);
      g.arc(x - 8 * s, y + 1 * s, 5.5 * s, Math.PI * .6, Math.PI * 1.5);
      g.arc(x - 1 * s, y - 4 * s, 7.5 * s, Math.PI * 1.1, Math.PI * 1.95);
      g.arc(x + 8 * s, y + 1 * s, 5.5 * s, Math.PI * 1.5, Math.PI * .45);
      g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(120,130,160,.35)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x - 9 * s, y + 5 * s); g.lineTo(x + 8 * s, y + 5 * s); g.stroke();
    };
    if (kind === 'rain') {
      cloud(21, 15, 1.1, '#d7dde6');
      g.strokeStyle = '#3d78b8'; g.lineWidth = 2;
      [[12, 26], [20, 29], [28, 26]].forEach(p => { g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[0] - 2, p[1] + 6); g.stroke(); });
    } else if (kind === 'snow') {   // 下雪：灰白雲＋三朵小雪花
      cloud(21, 15, 1.1, '#e4e9f0');
      g.fillStyle = '#ffffff'; g.strokeStyle = INK; g.lineWidth = 1.2;
      [[12, 29], [21, 33], [30, 29]].forEach(p => { g.beginPath(); g.arc(p[0], p[1], 2.4, 0, 7); g.fill(); g.stroke(); });
    } else if (kind === 'fog') {
      cloud(21, 14, 1, '#eef0f0');
      g.strokeStyle = '#8a97a0'; g.lineWidth = 2.2;
      [[8, 28, 30], [12, 34, 34]].forEach(l => { g.beginPath(); g.moveTo(l[0], l[1]); g.quadraticCurveTo(l[0] + 7, l[1] - 3, l[0] + 14, l[1]); g.quadraticCurveTo(l[0] + 21, l[1] + 3, l[2] + 2, l[1]); g.stroke(); });
    } else if (kind === 'cloudy') {
      if (night) moon(15, 14, 8); else sun(14, 14, 7);
      cloud(24, 26, 1, '#fffdf6');
    } else {
      if (night) moon(21, 21, 11); else sun(21, 21, 9);
    }
  }

  /* ───────── 高度數字 ───────── */
  function setAlt(alt) {
    const str = Math.round(alt).toLocaleString('en-US');
    if (str === H.altStr) return;
    const old = H.altStr; H.altStr = str;
    const d = H.els.digits;
    if (H.digits.length !== str.length) { // 位數改變 → 重建
      d.innerHTML = ''; H.digits = [];
      for (let i = 0; i < str.length; i++) { const s = mk('span', 'dg', str[i]); d.appendChild(s); H.digits.push(s); }
      if (old) bump(H.digits[0]);
      return;
    }
    for (let i = 0; i < str.length; i++) {
      if (H.digits[i].textContent !== str[i]) { H.digits[i].textContent = str[i]; bump(H.digits[i]); }
    }
  }
  function bump(s) { s.classList.remove('jump'); void s.offsetWidth; s.classList.add('jump'); }

  /* ───────── 路線 / 世界點陣 ───────── */
  function genRoute() {
    const a = [], n = 44;
    for (let i = 0; i < n; i++) { const t = i / (n - 1); a.push([.5 + .26 * Math.sin(t * 7.2) * (1 - .25 * t) + .06 * Math.sin(t * 19), 1 - t]); }
    return a;
  }
  function setRoute(points) {
    if (points && points === H.src && H.base) { H.angle = null; H.lastF = -1; H.dirty = true; if (H.els.rctx) drawRadar(0, true); return; }   // 同一條路線：底圖不用重畫
    H.src = points || null;
    let p = Array.isArray(points) && points.length >= 2 ? points.filter(q => q && isFinite(q[0]) && isFinite(q[1])) : null;
    if (!p || p.length < 2) p = genRoute();
    // 正規化到世界座標
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    p.forEach(q => { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); });
    const ext = Math.max(x1 - x0, y1 - y0, 1e-6), sc = EXTENT / ext;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const w = p.map(q => [WORLD / 2 + (q[0] - cx) * sc, WORLD / 2 + (q[1] - cy) * sc]);
    const cum = [0];
    for (let i = 1; i < w.length; i++) cum.push(cum[i - 1] + Math.hypot(w[i][0] - w[i - 1][0], w[i][1] - w[i - 1][1]));
    H.pts = w; H.cum = cum; H.total = Math.max(1e-6, cum[cum.length - 1]);
    H.seed = ((Math.round(p[0][0] * 997) * 31 + Math.round(p[p.length - 1][1] * 991) * 17 + p.length * 7) >>> 0) % 9973 + 1;
    H.angle = null; H.lastF = -1;
    renderBase(); renderWorld(); H.dirty = true;
    if (H.els.rctx) drawRadar(H.lastFrac || 0, true);
  }
  function setMarks(list) { H.marks = Array.isArray(list) ? list.filter(m => m && isFinite(m.f)) : []; if (H.base) { renderWorld(); H.dirty = true; } }

  function posAt(f) { // 依弧長取點 → [x,y]
    f = clamp(f, 0, 1); const d = f * H.total, c = H.cum; let lo = 0, hi = c.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m] <= d) lo = m; else hi = m; }
    const seg = c[hi] - c[lo] || 1, t = clamp((d - c[lo]) / seg, 0, 1), a = H.pts[lo], b = H.pts[hi];
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  }

  // 值雜訊
  function hash2(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
  function vnoise(x, y, s) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    return lerp(lerp(hash2(ix, iy, s), hash2(ix + 1, iy, s), u), lerp(hash2(ix, iy + 1, s), hash2(ix + 1, iy + 1, s), u), v);
  }

  // 預先渲染等高線圓盤底圖 (每條路線一次)
  function renderBase() {
    const N = WORLD, s = H.seed;
    const hf = new Float32Array(N * N);
    const sm = H.pts[H.pts.length - 1], st = H.pts[0];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const n = .55 * vnoise(x / 170, y / 170, s) + .3 * vnoise(x / 80, y / 80, s + 3) + .15 * vnoise(x / 36, y / 36, s + 7);
      const ds = Math.hypot(x - sm[0], y - sm[1]) / 330, d0 = Math.hypot(x - st[0], y - st[1]) / 330;
      hf[y * N + x] = n * .8 + 1.0 * Math.exp(-ds * ds * 2.2) - .25 * Math.exp(-d0 * d0 * 2.5);
    }
    const c = cvs(N, N), g = c.getContext('2d'), img = g.createImageData(N, N), D = img.data;
    const L = 20; // 等高線密度
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x;
      const xm = x > 0 ? i - 1 : i, xp = x < N - 1 ? i + 1 : i, ym = y > 0 ? i - N : i, yp = y < N - 1 ? i + N : i;
      const gx = (hf[xp] - hf[xm]) * .5, gy = (hf[yp] - hf[ym]) * .5, gm = Math.hypot(gx, gy) + 1e-5;
      const h = hf[i], lv = h * L, f = lv - Math.floor(lv), idx = (Math.floor(lv) % 5 === 0);
      const hn = clamp(h / 1.2, 0, 1);
      const lit = clamp((gy - gx) * 110, -1, 1); // 光源在右上
      let r = lerp(34, 66, hn), gg = lerp(72, 118, hn), b = lerp(54, 70, hn);
      const sh = 1 + lit * .2; r *= sh; gg *= sh; b *= sh;
      if (lit < -.45 && ((x + y) & 3) === 0) { r *= .84; gg *= .86; b *= .86; } // 淡淡陰影排線
      const dpx = Math.min(f, 1 - f) / (L * gm), hw = idx ? 1.15 : .7;
      if (dpx < hw + .6) {
        const a = clamp((hw + .6 - dpx) / 1.2, 0, 1) * (idx ? .95 : .7);
        const lr = idx ? 214 : 172, lg = idx ? 236 : 214, lb = idx ? 190 : 152;
        r = lerp(r, lr, a); gg = lerp(gg, lg, a); b = lerp(b, lb, a);
      }
      const o = i * 4; D[o] = r; D[o + 1] = gg; D[o + 2] = b; D[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    if (H.base) H.base.width = H.base.height = 0;   // 上一條路線的底圖馬上釋放（iPhone 畫布記憶體有上限）
    H.base = c;
  }

  // 底圖 + 步道 + 標記
  function renderWorld() {
    if (!H.base) return;
    const c = H.world || (H.world = cvs(WORLD, WORLD)), g = c.getContext('2d');
    g.clearRect(0, 0, WORLD, WORLD); g.drawImage(H.base, 0, 0);
    g.lineCap = 'round'; g.lineJoin = 'round';
    const path = () => { g.beginPath(); H.pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); };
    g.strokeStyle = 'rgba(20,34,24,.55)'; g.lineWidth = 8; path(); g.stroke();      // 外緣暗線
    g.strokeStyle = '#f3e4bb'; g.lineWidth = 4.6; path(); g.stroke();               // 米色步道
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.4; path(); g.stroke();   // 亮芯
    H.marks.forEach(m => {
      const p = posAt(m.f);
      g.lineWidth = 1.8; g.strokeStyle = INK;
      if (m.type === 'photo') { g.fillStyle = '#fff'; g.beginPath(); g.arc(p[0], p[1], 5, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#5aa8e0'; g.beginPath(); g.arc(p[0], p[1], 2, 0, 7); g.fill(); }
      else { g.fillStyle = '#ffe08a'; g.fillRect(p[0] - 4.5, p[1] - 4.5, 9, 9); g.strokeRect(p[0] - 4.5, p[1] - 4.5, 9, 9); }
    });
    // 山頂小旗
    const e = H.pts[H.pts.length - 1];
    g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(e[0], e[1]); g.lineTo(e[0], e[1] - 14); g.stroke();
    g.fillStyle = '#d9533f'; g.beginPath(); g.moveTo(e[0], e[1] - 14); g.lineTo(e[0] + 10, e[1] - 10); g.lineTo(e[0], e[1] - 6); g.closePath(); g.fill(); g.lineWidth = 1.5; g.stroke();
  }

  /* ───────── 雷達 ───────── */
  function drawRadar(f, force) {
    const g = H.els.rctx; if (!g || !H.world) return;
    f = clamp(f, 0, 1); H.lastFrac = f;
    const p = posAt(f), pa = posAt(clamp(f - .025, 0, 1)), pb = posAt(clamp(f + .035, 0, 1));
    let tgt = Math.atan2(pb[1] - pa[1], pb[0] - pa[0]);
    if (!isFinite(tgt)) tgt = -Math.PI / 2;
    if (H.angle == null) H.angle = tgt;
    let dA = tgt - H.angle; while (dA > Math.PI) dA -= 2 * Math.PI; while (dA < -Math.PI) dA += 2 * Math.PI;
    H.angle += dA * .12; if (Math.abs(dA) < .002) H.angle = tgt;
    if (!force && !H.dirty && Math.abs(f - H.lastF) < 1e-4 && Math.abs(dA) < .002) return;
    H.lastF = f; H.dirty = false;

    const S = RS, cx = S / 2, R = S / 2 - 6, py = S / 2 + R * .4;   // 外圈留給木框
    g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, S, S);
    g.save(); g.beginPath(); g.arc(cx, S / 2, R, 0, 7); g.clip();
    g.fillStyle = '#3a6a4c'; g.fillRect(0, 0, S, S);
    g.save();
    g.translate(cx, py); g.rotate(-Math.PI / 2 - H.angle); g.scale(K, K); g.translate(-p[0], -p[1]);
    g.imageSmoothingQuality = 'high'; g.drawImage(H.world, 0, 0);
    g.restore();
    // 暈邊 + 右上柔光
    const v = g.createRadialGradient(cx, S / 2, R * .45, cx, S / 2, R);
    v.addColorStop(0, 'rgba(10,30,20,0)'); v.addColorStop(1, 'rgba(10,30,20,.32)');
    g.fillStyle = v; g.fillRect(0, 0, S, S);
    const lg = g.createLinearGradient(S, 0, 0, S); lg.addColorStop(0, 'rgba(255,238,180,.22)'); lg.addColorStop(.5, 'rgba(255,238,180,0)');
    g.fillStyle = lg; g.fillRect(0, 0, S, S);
    // 玩家藍色箭頭
    g.restore();
    g.save(); g.translate(cx, py);
    g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(1.5, 6.5, 6, 2.6, 0, 0, 7); g.fill();
    g.lineJoin = 'round';
    g.beginPath(); g.moveTo(0, -8.5); g.lineTo(6.2, 6.5); g.lineTo(0, 3); g.lineTo(-6.2, 6.5); g.closePath();
    g.fillStyle = '#2f86ee'; g.fill(); g.lineWidth = 2.2; g.strokeStyle = '#fff'; g.stroke();
    g.lineWidth = .9; g.strokeStyle = INK; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.moveTo(0, -6); g.lineTo(3, 2); g.lineTo(0, 0); g.closePath(); g.fill();
    g.restore();
    // 外框：手繪木框（暖木色環＋上方受光細線），內外各一條細墨線
    g.beginPath(); g.arc(cx, S / 2, R + 2.8, 0, 7); g.lineWidth = 5.2; g.strokeStyle = '#a87849'; g.stroke();
    g.beginPath(); g.arc(cx, S / 2, R + 3.4, Math.PI * 1.05, Math.PI * 1.95); g.lineWidth = 1.2; g.strokeStyle = 'rgba(255,226,170,.75)'; g.stroke();
    g.beginPath(); g.arc(cx, S / 2, R + 5.6, 0, 7); g.lineWidth = 1.1; g.strokeStyle = INK; g.stroke();
    g.beginPath(); g.arc(cx, S / 2, R, 0, 7); g.lineWidth = 1.1; g.strokeStyle = INK; g.stroke();
    // 頂端白色三角 (朝下)
    g.beginPath(); g.moveTo(cx - 5.5, 1.2); g.lineTo(cx + 5.5, 1.2); g.lineTo(cx, 9.5); g.closePath();
    g.fillStyle = '#fff'; g.fill(); g.lineWidth = 1.6; g.lineJoin = 'round'; g.strokeStyle = INK; g.stroke();
  }

  /* ───────── 更新 ───────── */
  function update(s) {
    if (!H.root || !s) return;
    const E = H.els;
    if (s.name != null && E.name.textContent !== s.name) E.name.textContent = s.name;
    if (s.stam != null) {
      const v = clamp(s.stam, 0, 100); E.stamI.style.width = v + '%'; E.stam.classList.toggle('low', v < 20);
    }
    if (s.temp != null) {
      const v = clamp(s.temp, 0, 100); E.tempI.style.width = v + '%';
      E.temp.classList.toggle('cold', v < 35); E.temp.classList.toggle('warm', v >= 35);
    }
    if (s.alt != null) setAlt(s.alt);
    if (s.distText != null && E.dd.textContent !== s.distText) E.dd.textContent = s.distText;
    if (s.etaText != null && E.ee.textContent !== s.etaText) E.ee.textContent = s.etaText;
    const mood = s.mood || 'happy';
    if (mood !== H.mood) { H.mood = mood; drawFace(mood); }
    if (s.wx) {
      const key = (s.wx.kind || 'sunny') + '|' + (s.wx.time || 'day');
      if (key !== H.wxKey) { H.wxKey = key; drawWx(s.wx.kind || 'sunny', s.wx.time || 'day'); }
    }
    if (s.frac != null) drawRadar(s.frac, false);
  }

  window.SX.hud = { mount, update, setRoute, setMarks, drawWxArt, wxArt };
})();

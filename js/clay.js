// 山行小日子 — 黏土質感繪圖工具 + 角色
(function(){
  const C = SX.clay = {};

  // 顏色工具
  function hex2rgb(h){ h = h.replace('#',''); if (h.length===3) h = h.split('').map(c=>c+c).join(''); const n = parseInt(h,16); return [n>>16&255, n>>8&255, n&255]; }
  function rgb2hex(r,g,b){ return '#' + [r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join(''); }
  C.shade = (h, amt) => { const [r,g,b] = hex2rgb(h); return amt >= 0 ? rgb2hex(r+(255-r)*amt, g+(255-g)*amt, b+(255-b)*amt) : rgb2hex(r*(1+amt), g*(1+amt), b*(1+amt)); };
  C.mix = (a, b, t) => { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A[0]+(B[0]-A[0])*t, A[1]+(B[1]-A[1])*t, A[2]+(B[2]-A[2])*t); };
  C.rgba = (h, a) => { const [r,g,b] = hex2rgb(h); return `rgba(${r},${g},${b},${a})`; };

  // 固定亂數
  C.rng = seed => { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };
  C.hash = str => { let h = 2166136261; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

  // 黏土上色：漸層填色 + 左上亮邊 + 右下陰影 + 深色描邊
  // path: (ctx) => 建立路徑
  C.blob = (ctx, path, base, o = {}) => {
    const lw = o.lw ?? 2.4, bb = o.box || [0,0,100,100];
    ctx.save();
    if (o.shadow !== false) {
      ctx.save(); ctx.translate(o.sx ?? 2, o.sy ?? 4); path(ctx);
      ctx.fillStyle = 'rgba(70,45,25,' + (o.sa ?? 0.18) + ')'; ctx.fill(); ctx.restore();
    }
    path(ctx);
    const g = ctx.createLinearGradient(bb[0], bb[1], bb[0] + bb[2]*0.35, bb[1] + bb[3]);
    g.addColorStop(0, C.shade(base, o.hi ?? 0.22)); g.addColorStop(0.55, base); g.addColorStop(1, C.shade(base, -(o.lo ?? 0.16)));
    ctx.fillStyle = g; ctx.fill();
    // 內部亮邊與陰影
    ctx.save(); path(ctx); ctx.clip();
    ctx.translate(-2, -2.5); path(ctx); ctx.lineWidth = o.rim ?? 4; ctx.strokeStyle = 'rgba(255,255,255,0.32)'; ctx.stroke();
    ctx.translate(4, 5.5); path(ctx); ctx.lineWidth = (o.rim ?? 4) + 3; ctx.strokeStyle = 'rgba(60,35,15,0.13)'; ctx.stroke();
    ctx.restore();
    if (lw > 0) { path(ctx); ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.strokeStyle = o.line || C.shade(base, -0.42); ctx.stroke(); }
    ctx.restore();
  };
  C.ellipse = (ctx, x, y, rx, ry, base, o = {}) => C.blob(ctx, c => { c.beginPath(); c.ellipse(x, y, rx, ry, o.rot || 0, 0, Math.PI*2); }, base, { box:[x-rx, y-ry, rx*2, ry*2], ...o });
  C.rrect = (ctx, x, y, w, h, r, base, o = {}) => C.blob(ctx, c => { c.beginPath(); c.roundRect(x, y, w, h, r); }, base, { box:[x, y, w, h], ...o });

  // 縫線
  C.stitch = (ctx, path, color = 'rgba(255,248,230,0.75)', w = 2, dash = [5,5]) => {
    ctx.save(); path(ctx); ctx.setLineDash(dash); ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.strokeStyle = color; ctx.stroke(); ctx.restore();
  };

  // 手作壓痕雜訊貼圖
  C.noisePattern = (ctx) => {
    const n = document.createElement('canvas'); n.width = n.height = 160;
    const c = n.getContext('2d'), im = c.createImageData(160, 160);
    for (let i=0;i<im.data.length;i+=4) { const v = 128 + (Math.random()-0.5)*90; im.data[i]=im.data[i+1]=im.data[i+2]=v; im.data[i+3]=255; }
    c.putImageData(im, 0, 0);
    return ctx.createPattern(n, 'repeat');
  };

  // 平滑曲線（Catmull-Rom）
  C.smooth = (ctx, pts, closed, cont) => {
    const n = pts.length; if (n < 2) return;
    const P = i => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n-1, i))];
    cont ? ctx.lineTo(pts[0][0], pts[0][1]) : ctx.moveTo(pts[0][0], pts[0][1]);
    const last = closed ? n : n - 1;
    for (let i=0;i<last;i++) {
      const p0 = P(i-1), p1 = P(i), p2 = P(i+1), p3 = P(i+2);
      ctx.bezierCurveTo(p1[0]+(p2[0]-p0[0])/6, p1[1]+(p2[1]-p0[1])/6, p2[0]-(p3[0]-p1[0])/6, p2[1]-(p3[1]-p1[1])/6, p2[0], p2[1]);
    }
    if (closed) ctx.closePath();
  };

  // ───────── 角色：Q 版三頭身登山客 ─────────
  // x,y = 腳底中心；s = 縮放；st = { t, walk(0~1 步伐相位), moving, sleep, rain, night, look }
  C.hiker = (ctx, x, y, s, st) => {
    const ph = st.walk * Math.PI * 2, mv = st.moving ? 1 : 0;
    const bob = st.sleep ? 0 : -Math.abs(Math.sin(ph)) * 3.2 * mv;
    const sq = st.sleep ? 1 : 1 + Math.sin(ph*2) * 0.025 * mv;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    // 地面影子
    ctx.fillStyle = 'rgba(60,40,20,0.22)'; ctx.beginPath(); ctx.ellipse(0, 0, 22, 5.5, 0, 0, Math.PI*2); ctx.fill();
    if (st.sleep) { drawSitting(ctx, st); ctx.restore(); return; }
    ctx.translate(0, bob); ctx.scale(1/sq, sq);
    const SK = '#f7d3b2', HAIR = '#5a3b2a', JK = '#e8774f', PANT = '#5c7a8c', BAG = '#f0b44c';
    // 後腳
    const l1 = Math.sin(ph) * 7 * mv, l2 = -l1;
    leg(ctx, -4 + l2, PANT, -1);
    // 背包
    C.rrect(ctx, -19, -50, 16, 24, 6, BAG, { lw:2, box:[-19,-50,16,24] });
    C.rrect(ctx, -20, -34, 12, 8, 3, C.shade(BAG,-0.12), { lw:1.6, shadow:false, box:[-20,-34,12,8] });
    if (st.night) { ctx.fillStyle = 'rgba(255,220,120,0.9)'; ctx.beginPath(); ctx.arc(-17,-44,2.6,0,7); ctx.fill(); }
    // 身體
    C.blob(ctx, c => { c.beginPath(); c.moveTo(-10,-46); c.quadraticCurveTo(0,-52,10,-46); c.lineTo(12,-20); c.quadraticCurveTo(0,-15,-12,-20); c.closePath(); }, JK, { lw:2.2, box:[-12,-52,24,36] });
    // 拉鍊縫線
    C.stitch(ctx, c => { c.beginPath(); c.moveTo(2,-46); c.lineTo(3,-21); }, 'rgba(255,240,220,0.8)', 1.4, [2.5,2.5]);
    // 前腳
    leg(ctx, 4 + l1, PANT, 1);
    // 手（擺動）
    const arm = Math.sin(ph) * 0.5 * mv;
    ctx.save(); ctx.translate(8, -42); ctx.rotate(-arm + (st.rain ? -1.2 : 0.15));
    C.rrect(ctx, -3.5, 0, 7, 17, 3.5, JK, { lw:2, shadow:false, box:[-3.5,0,7,17] });
    C.ellipse(ctx, 0, 18, 3.6, 3.6, SK, { lw:1.6, shadow:false });
    if (st.rain) drawLeafUmbrella(ctx);
    ctx.restore();
    // 頭
    ctx.save(); ctx.translate(0, -66);
    // 後髮
    C.ellipse(ctx, -2, -1, 21, 20, HAIR, { lw:2.2 });
    // 臉
    C.ellipse(ctx, 2, 2, 18, 17, SK, { lw:2, shadow:false, hi:0.15 });
    // 瀏海
    C.blob(ctx, c => { c.beginPath(); c.moveTo(-17,-2); c.quadraticCurveTo(-14,-22,4,-19); c.quadraticCurveTo(18,-17,20,-4); c.quadraticCurveTo(12,-10,8,-6); c.quadraticCurveTo(4,-12,-2,-7); c.quadraticCurveTo(-8,-11,-17,-2); c.closePath(); }, HAIR, { lw:2, shadow:false, box:[-17,-22,37,20] });
    // 臉部
    const blink = (Math.floor(st.t * 10) % 37) === 0;
    ctx.fillStyle = '#3b2a20';
    if (blink) { ctx.fillRect(4, 3, 5, 1.6); ctx.fillRect(13, 3, 4, 1.6); }
    else { ctx.beginPath(); ctx.ellipse(6.5, 3.5, 2.1, 2.7, 0, 0, 7); ctx.ellipse(15, 3.5, 2, 2.6, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(7.2, 2.5, 0.8, 0, 7); ctx.arc(15.6, 2.5, 0.7, 0, 7); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,130,120,0.45)'; ctx.beginPath(); ctx.ellipse(3, 9, 3.6, 2.2, 0, 0, 7); ctx.ellipse(18, 9, 2.8, 2, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#7a3e2a'; ctx.lineWidth = 1.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(11, 9, 2.4, 0.2, Math.PI - 0.2); ctx.stroke();
    // 漁夫帽
    C.blob(ctx, c => { c.beginPath(); c.ellipse(1, -13, 25, 6, 0, 0, Math.PI*2); }, '#e9dcb8', { lw:2, box:[-24,-19,50,12] });
    C.blob(ctx, c => { c.beginPath(); c.moveTo(-15,-13); c.quadraticCurveTo(-14,-31,2,-31); c.quadraticCurveTo(17,-31,17,-13); c.closePath(); }, '#e9dcb8', { lw:2, shadow:false, box:[-15,-31,32,18] });
    ctx.fillStyle = '#c9744a'; ctx.fillRect(-14.5, -17, 31, 3.5);
    ctx.restore();
    ctx.restore();
  };

  function leg(ctx, dx, col, side){
    C.rrect(ctx, dx - 4, -22, 8, 16, 3.5, col, { lw:2, shadow:false, box:[dx-4,-22,8,16] });
    C.rrect(ctx, dx - 5, -8, 12, 8, 4, '#6b4a33', { lw:1.8, shadow:false, box:[dx-5,-8,12,8] });
  }
  function drawLeafUmbrella(ctx){
    ctx.save(); ctx.translate(0, 16);
    ctx.strokeStyle = '#4e7a3a'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,-36); ctx.stroke();
    C.blob(ctx, c => { c.beginPath(); c.moveTo(-30,-34); c.quadraticCurveTo(0,-62,30,-34); c.quadraticCurveTo(15,-40,0,-34); c.quadraticCurveTo(-15,-40,-30,-34); c.closePath(); }, '#69b25a', { lw:2, box:[-30,-62,60,28] });
    ctx.strokeStyle = 'rgba(40,90,40,0.45)'; ctx.lineWidth = 1.2; ctx.beginPath();
    for (const a of [-20,-8,8,20]) { ctx.moveTo(0,-48); ctx.lineTo(a,-38); }
    ctx.stroke(); ctx.restore();
  }
  function drawSitting(ctx, st){
    const SK = '#f7d3b2', HAIR = '#5a3b2a', JK = '#e8774f', PANT = '#5c7a8c', BAG = '#f0b44c';
    const br = Math.sin(st.t * 1.6) * 1.2;
    C.rrect(ctx, -26, -30, 16, 22, 6, BAG, { lw:2, box:[-26,-30,16,22] });
    C.rrect(ctx, -6, -10, 26, 9, 4.5, PANT, { lw:2, box:[-6,-10,26,9] });
    C.rrect(ctx, 16, -10, 11, 10, 4, '#6b4a33', { lw:1.8, shadow:false, box:[16,-10,11,10] });
    C.blob(ctx, c => { c.beginPath(); c.moveTo(-12,-34+br); c.quadraticCurveTo(0,-40+br,9,-34+br); c.lineTo(10,-6); c.quadraticCurveTo(0,-2,-13,-6); c.closePath(); }, JK, { lw:2.2, box:[-13,-40,23,36] });
    ctx.save(); ctx.translate(0, -52 + br); ctx.rotate(0.12);
    C.ellipse(ctx, -2, -1, 21, 20, HAIR, { lw:2.2 });
    C.ellipse(ctx, 2, 2, 18, 17, SK, { lw:2, shadow:false, hi:0.15 });
    C.blob(ctx, c => { c.beginPath(); c.moveTo(-17,-2); c.quadraticCurveTo(-14,-22,4,-19); c.quadraticCurveTo(18,-17,20,-4); c.quadraticCurveTo(12,-10,8,-6); c.quadraticCurveTo(4,-12,-2,-7); c.quadraticCurveTo(-8,-11,-17,-2); c.closePath(); }, HAIR, { lw:2, shadow:false, box:[-17,-22,37,20] });
    ctx.strokeStyle = '#3b2a20'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(6.5, 3, 2.2, 0.2, Math.PI-0.2); ctx.moveTo(17.2,3); ctx.arc(15, 3, 2.2, 0.2, Math.PI-0.2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,130,120,0.45)'; ctx.beginPath(); ctx.ellipse(3, 9, 3.6, 2.2, 0, 0, 7); ctx.ellipse(18, 9, 2.8, 2, 0, 0, 7); ctx.fill();
    C.blob(ctx, c => { c.beginPath(); c.ellipse(1, -13, 25, 6, 0, 0, Math.PI*2); }, '#e9dcb8', { lw:2, box:[-24,-19,50,12] });
    C.blob(ctx, c => { c.beginPath(); c.moveTo(-15,-13); c.quadraticCurveTo(-14,-31,2,-31); c.quadraticCurveTo(17,-31,17,-13); c.closePath(); }, '#e9dcb8', { lw:2, shadow:false, box:[-15,-31,32,18] });
    ctx.fillStyle = '#c9744a'; ctx.fillRect(-14.5, -17, 31, 3.5);
    ctx.restore();
  }

  // ───────── 寵物：台灣黑熊寶寶 ─────────
  C.bear = (ctx, x, y, s, st) => {
    const ph = st.walk * Math.PI * 2 + 1.3, mv = st.moving ? 1 : 0;
    const hop = st.sleep ? 0 : -Math.abs(Math.sin(ph)) * 4 * mv;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(60,40,20,0.2)'; ctx.beginPath(); ctx.ellipse(0, 0, 16, 4, 0, 0, 7); ctx.fill();
    ctx.translate(0, hop);
    const B = '#3a3230';
    const lg = Math.sin(ph) * 3 * mv;
    C.rrect(ctx, -11 - lg, -9, 7, 9, 3, B, { lw:1.6, shadow:false, box:[-11,-9,7,9] });
    C.rrect(ctx, 5 + lg, -9, 7, 9, 3, B, { lw:1.6, shadow:false, box:[5,-9,7,9] });
    C.ellipse(ctx, 0, -14, 15, 11, B, { lw:2, hi:0.3 });
    // 胸前 V 字
    ctx.fillStyle = '#f2e6c8'; ctx.beginPath(); ctx.moveTo(4,-18); ctx.quadraticCurveTo(9,-12,13,-18); ctx.quadraticCurveTo(9,-14,4,-18); ctx.fill();
    // 頭
    ctx.save(); ctx.translate(10, -26 + (st.sleep ? 8 : 0));
    C.ellipse(ctx, -8, -9, 4.5, 4.5, B, { lw:1.6, shadow:false });
    C.ellipse(ctx, 6, -10, 4.5, 4.5, B, { lw:1.6, shadow:false });
    C.ellipse(ctx, 0, 0, 12, 10.5, B, { lw:2, shadow:false, hi:0.3 });
    C.ellipse(ctx, 5, 3, 5.5, 4, '#b48a67', { lw:1.3, shadow:false });
    ctx.fillStyle = '#1e1715'; ctx.beginPath(); ctx.ellipse(6.5, 1.5, 2, 1.4, 0, 0, 7); ctx.fill();
    if (st.sleep) { ctx.strokeStyle = '#e8e0d0'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(-2,-2,1.8,0.2,Math.PI-0.2); ctx.stroke(); }
    else { ctx.fillStyle = '#f4ead8'; ctx.beginPath(); ctx.arc(-2, -2, 1.7, 0, 7); ctx.fill(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(-1.7, -2, 1, 0, 7); ctx.fill(); }
    ctx.restore();
    ctx.restore();
  };
})();

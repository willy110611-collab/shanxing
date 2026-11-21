// 山行小日子 — 登山畫面（黏土微縮側視場景）
(function(){
  const C = SX.clay, PXM = 6; // 每公尺幾像素
  const S = SX.scene = { parts:[] };
  let cv, ctx, W = 0, H = 0, DPR = 1, noise = null;
  let M = null, objs = [], tiles = {}, sprites = {}, stars = [], drops = [], clouds = [], flies = [];

  S.PXM = PXM;
  S.init = canvas => { cv = canvas; ctx = cv.getContext('2d'); S.resize(); };
  S.resize = () => {
    const r = cv.getBoundingClientRect();
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    cv.width = W * DPR; cv.height = H * DPR;
    noise = C.noisePattern(ctx);
    tiles = {};
    if (M) buildTiles();
    stars = Array.from({length:70}, (_,i) => ({ x: Math.random()*W, y: Math.random()*H*0.45, r: Math.random()*1.4+0.4, p: Math.random()*6 }));
    drops = Array.from({length:90}, () => ({ x: Math.random()*W, y: Math.random()*H, v: 520 + Math.random()*260, l: 10 + Math.random()*10 }));
    clouds = Array.from({length:5}, (_,i) => ({ x: Math.random()*W*1.5, y: H*(0.07 + i*0.06) + Math.random()*20, s: 0.6 + Math.random()*0.6, v: 4 + Math.random()*6 }));
    flies = Array.from({length:14}, () => ({ x: Math.random()*W, y: H*(0.45 + Math.random()*0.25), p: Math.random()*9 }));
  };
  const G0 = () => Math.round(H * 0.56);

  // ───────── 精靈圖快取 ─────────
  function sprite(key, w, h, ax, ay, draw){
    if (sprites[key]) return sprites[key];
    const c = document.createElement('canvas'); c.width = Math.ceil(w * DPR); c.height = Math.ceil(h * DPR);
    const x = c.getContext('2d'); x.scale(DPR, DPR); x.translate(ax, ay); draw(x);
    return sprites[key] = { c, w, h, ax, ay };
  }
  function blit(sp, x, y, s = 1){ ctx.drawImage(sp.c, x - sp.ax * s, y - sp.ay * s, sp.w * s, sp.h * s); }

  // ───────── 物件畫法（原點在底部中央）─────────
  const DRAW = {
    cairn(x, v){
      const cols = ['#ddd0bd','#cbbca6','#e6dccb','#d4c2ab'];
      const rr = C.rng(v + 7);
      let y = 0; const sizes = [[22,9],[17,8],[13,7],[10,7.5]];
      sizes.forEach((s, i) => { const ox = (rr()-0.5)*4; C.ellipse(x, ox, y - s[1], s[0], s[1], cols[(i+v)%4], { lw:2, sy:2 }); y -= s[1]*1.7; });
      const ty = y + 7.5*1.7 - 7.5; // 最上面那顆
      x.fillStyle = '#5b4636'; x.beginPath(); x.arc(-3.5, ty - 1, 1.4, 0, 7); x.arc(3.5, ty - 1, 1.4, 0, 7); x.fill();
      x.strokeStyle = '#5b4636'; x.lineWidth = 1.4; x.lineCap = 'round'; x.beginPath(); x.arc(0, ty + 1, 3, 0.25, Math.PI - 0.25); x.stroke();
      x.fillStyle = 'rgba(255,140,130,0.5)'; x.beginPath(); x.arc(-6, ty + 1.5, 1.8, 0, 7); x.arc(6, ty + 1.5, 1.8, 0, 7); x.fill();
    },
    btree(x, v){ // 祈福樹
      C.rrect(x, -9, -62, 18, 62, 7, '#9a6a45', { lw:2.2, box:[-9,-62,18,62] });
      const G = '#6fae5f';
      [[-30,-78,26],[26,-80,25],[0,-102,30],[-14,-66,20],[16,-64,20]].forEach(([a,b,r]) => C.ellipse(x, a, b, r, r*0.9, G, { lw:2.2, sy:3 }));
      const cards = ['#f6c94e','#f08f7a','#f7f1df','#f4a9c0','#f6c94e'];
      [[-34,-66],[-14,-58],[6,-62],[24,-56],[38,-70]].forEach(([a,b],i) => {
        x.strokeStyle = '#7a5230'; x.lineWidth = 1; x.beginPath(); x.moveTo(a, b - 10); x.lineTo(a, b); x.stroke();
        C.rrect(x, a - 4.5, b, 9, 13, 2, cards[i], { lw:1.4, shadow:false, box:[a-4.5,b,9,13] });
      });
    },
    note(x, v){ // 便條木牌
      C.rrect(x, -4, -58, 8, 58, 3, '#a2734c', { lw:2, box:[-4,-58,8,58] });
      C.rrect(x, -24, -70, 48, 32, 6, '#c08a5c', { lw:2.2, box:[-24,-70,48,32] });
      x.save(); x.translate(4, -55); x.rotate(-0.08);
      C.rrect(x, -12, -12, 24, 22, 2, '#fff6dc', { lw:1.4, shadow:false, box:[-12,-12,24,22] });
      x.strokeStyle = 'rgba(150,110,70,0.55)'; x.lineWidth = 1; x.beginPath();
      for (let i=0;i<3;i++){ x.moveTo(-8, -5 + i*5); x.lineTo(7 - (i==2?6:0), -5 + i*5); } x.stroke();
      x.fillStyle = '#e8574a'; x.beginPath(); x.arc(0, -10, 2.4, 0, 7); x.fill();
      x.restore();
      C.stitch(x, c => { c.beginPath(); c.roundRect(-20, -66, 40, 24, 4); }, 'rgba(255,240,210,0.7)', 1.3, [3,3]);
    },
    pine(x, v){
      const rr = C.rng(v), h = 80 + rr()*50, G = rr() > 0.5 ? '#3f7a58' : '#4c8a5e';
      C.rrect(x, -5, -18, 10, 18, 3, '#8a5c3c', { lw:2, box:[-5,-18,10,18] });
      for (let i=0;i<3;i++){ const w = 34 - i*8, b = -14 - i*h*0.24, t = b - h*0.42;
        C.blob(x, c => { c.beginPath(); c.moveTo(-w, b); c.quadraticCurveTo(0, b + 8, w, b); c.quadraticCurveTo(w*0.3, t + 12, 0, t); c.quadraticCurveTo(-w*0.3, t + 12, -w, b); c.closePath(); }, G, { lw:2.2, box:[-w, t, w*2, b - t] }); }
    },
    round(x, v){
      const rr = C.rng(v), h = 50 + rr()*30, r = 26 + rr()*10, G = ['#6fae5f','#7cb862','#5f9f5a'][v%3];
      C.rrect(x, -5, -h, 10, h, 4, '#93643f', { lw:2, box:[-5,-h,10,h] });
      C.ellipse(x, 0, -h - r*0.6, r, r*0.95, G, { lw:2.2 });
      C.ellipse(x, -r*0.55, -h - r*0.2, r*0.55, r*0.5, C.shade(G,0.05), { lw:2, shadow:false });
    },
    sakura(x, v){
      C.rrect(x, -6, -56, 12, 56, 5, '#8b5e46', { lw:2, box:[-6,-56,12,56] });
      [[-22,-68,22],[20,-70,22],[0,-88,26]].forEach(([a,b,r]) => C.ellipse(x, a, b, r, r*0.9, '#f4b3c6', { lw:2.2 }));
      x.fillStyle = '#fff'; for (let i=0;i<10;i++){ x.globalAlpha = 0.7; x.beginPath(); x.arc(-30 + (i*13)%60, -60 - (i*17)%45, 1.8, 0, 7); x.fill(); } x.globalAlpha = 1;
    },
    bigtree(x, v){ // 神木
      C.blob(x, c => { c.beginPath(); c.moveTo(-34, 0); c.quadraticCurveTo(-22, -40, -24, -150); c.lineTo(24, -150); c.quadraticCurveTo(20, -40, 36, 0); c.closePath(); }, '#8a5a3b', { lw:2.6, box:[-36,-150,72,150] });
      x.strokeStyle = 'rgba(70,40,20,0.35)'; x.lineWidth = 2; x.beginPath();
      for (const a of [-12,0,12]) { x.moveTo(a, -10); x.quadraticCurveTo(a + 4, -70, a - 2, -140); } x.stroke();
      [[-40,-160,34],[36,-165,34],[0,-195,40]].forEach(([a,b,r]) => C.ellipse(x, a, b, r, r*0.85, '#3f7d55', { lw:2.4 }));
      C.rrect(x, -18, -60, 36, 8, 3, '#d9473b', { lw:1.6, shadow:false, box:[-18,-60,36,8] });
    },
    bush(x, v){
      const G = ['#79b763','#6aa95c','#86c06a'][v%3];
      C.ellipse(x, -12, -10, 14, 11, G, { lw:2 }); C.ellipse(x, 12, -10, 13, 10, G, { lw:2 }); C.ellipse(x, 0, -17, 15, 13, C.shade(G,0.06), { lw:2 });
      if (v % 2) { x.fillStyle = ['#f6d04d','#f39cb2','#fff'][v%3]; for (let i=0;i<5;i++){ x.beginPath(); x.arc(-14 + i*7, -18 + (i%2)*7, 2.2, 0, 7); x.fill(); } }
    },
    azalea(x, v){
      C.ellipse(x, -14, -10, 15, 11, '#5e9b5a', { lw:2 }); C.ellipse(x, 14, -10, 14, 10, '#5e9b5a', { lw:2 }); C.ellipse(x, 0, -18, 16, 13, '#69a65f', { lw:2 });
      for (let i=0;i<9;i++){ C.ellipse(x, -18 + (i*9)%36, -26 + ((i*7)%20), 4, 3.6, i%2 ? '#f27fa6' : '#f9a8c4', { lw:1.2, shadow:false }); }
    },
    flowers(x, v){
      const cols = ['#f6d04d','#f39cb2','#ffffff','#b9a0f0','#f7a35c'];
      for (let i=0;i<5;i++){ const a = -16 + i*8, h = 10 + (i*5 + v)%9;
        x.strokeStyle = '#4f8c48'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(a, 0); x.quadraticCurveTo(a + 2, -h/2, a, -h); x.stroke();
        C.ellipse(x, a, -h, 3.4, 3.2, cols[(i + v)%5], { lw:1.2, shadow:false }); }
    },
    grass(x, v){ // 芒草
      for (let i=0;i<7;i++){ const a = -14 + i*4.5, h = 38 + (i*11 + v*7)%22, lean = (i%3 - 1) * 6;
        x.strokeStyle = '#a9a35a'; x.lineWidth = 2; x.lineCap = 'round'; x.beginPath(); x.moveTo(a, 0); x.quadraticCurveTo(a + lean*0.3, -h*0.6, a + lean, -h); x.stroke();
        C.ellipse(x, a + lean, -h - 6, 3.2, 8, '#efe4c8', { lw:1.2, shadow:false, rot: lean*0.03 }); }
    },
    bamboo(x, v){ // 箭竹草坡
      for (let i=0;i<9;i++){ const a = -18 + i*4.5, h = 16 + (i*7 + v*3)%10;
        x.strokeStyle = i%2 ? '#9bb25a' : '#b7c46a'; x.lineWidth = 2.4; x.lineCap = 'round'; x.beginPath(); x.moveTo(a, 0); x.quadraticCurveTo(a + 3, -h*0.6, a + (i%2?5:-3), -h); x.stroke(); }
    },
    rock(x, v){
      const s = 1 + (v%3)*0.25;
      C.blob(x, c => { c.beginPath(); c.moveTo(-26*s, 0); c.quadraticCurveTo(-30*s, -26*s, -6*s, -34*s); c.quadraticCurveTo(22*s, -38*s, 28*s, -12*s); c.quadraticCurveTo(30*s, 0, 20*s, 0); c.closePath(); }, '#b9ae9f', { lw:2.4, box:[-30*s,-38*s,60*s,38*s] });
      C.ellipse(x, -8*s, -30*s, 9*s, 4*s, '#8cb86a', { lw:1.4, shadow:false });
    },
    pavilion(x, v){ // 涼亭
      for (const a of [-30, 26]) C.rrect(x, a, -58, 6, 58, 2, '#b4553e', { lw:2, box:[a,-58,6,58] });
      C.rrect(x, -26, -26, 52, 6, 2, '#a2734c', { lw:1.8, box:[-26,-26,52,6] });
      C.blob(x, c => { c.beginPath(); c.moveTo(-50, -54); c.quadraticCurveTo(-30, -60, -20, -76); c.lineTo(20, -76); c.quadraticCurveTo(30, -60, 50, -54); c.quadraticCurveTo(54, -62, 46, -64); c.quadraticCurveTo(0, -70, -46, -64); c.quadraticCurveTo(-54, -62, -50, -54); c.closePath(); }, '#3f8a73', { lw:2.4, box:[-54,-76,108,22] });
      C.ellipse(x, 0, -80, 6, 6, '#f0c050', { lw:1.6 });
    },
    shrine(x, v){ // 路邊小祠
      C.rrect(x, -18, -10, 36, 10, 2, '#c9bba6', { lw:2, box:[-18,-10,36,10] });
      C.rrect(x, -14, -38, 28, 28, 3, '#e5d5bd', { lw:2, box:[-14,-38,28,28] });
      const g = x.createRadialGradient(0, -24, 1, 0, -24, 12); g.addColorStop(0, 'rgba(255,220,130,1)'); g.addColorStop(1, 'rgba(230,140,60,0.9)');
      x.fillStyle = g; x.beginPath(); x.roundRect(-8, -32, 16, 20, 7); x.fill(); x.strokeStyle = '#8c4a2f'; x.lineWidth = 1.6; x.stroke();
      roof(x, 0, -38, 26, '#d9473b');
      C.rrect(x, -5, -8, 10, 6, 2, '#b58b4c', { lw:1.4, shadow:false, box:[-5,-8,10,6] });
    },
    sign(x, v){ // 里程木牌
      C.rrect(x, -3.5, -48, 7, 48, 3, '#9a6a45', { lw:2, box:[-3.5,-48,7,48] });
      C.blob(x, c => { c.beginPath(); c.moveTo(-18, -50); c.lineTo(14, -50); c.lineTo(24, -42); c.lineTo(14, -34); c.lineTo(-18, -34); c.closePath(); }, '#d8a86c', { lw:2, box:[-18,-50,42,16] });
      x.fillStyle = '#6b4226'; x.font = 'bold 9px sans-serif'; x.textAlign = 'center'; x.fillText((v/1000).toFixed(1) + 'K', 0, -38.5);
    },
    trig(x, v){ // 三角點＋旗
      C.rrect(x, -10, -22, 20, 22, 3, '#e8e2d6', { lw:2.2, box:[-10,-22,20,22] });
      x.fillStyle = '#c0392b'; x.beginPath(); x.moveTo(-4, -16); x.lineTo(4, -16); x.lineTo(0, -8); x.fill();
      x.strokeStyle = '#6b4a33'; x.lineWidth = 2.4; x.beginPath(); x.moveTo(16, 0); x.lineTo(16, -70); x.stroke();
      C.blob(x, c => { c.beginPath(); c.moveTo(16, -70); c.quadraticCurveTo(34, -66, 46, -60); c.quadraticCurveTo(34, -56, 16, -50); c.closePath(); }, '#f2c14e', { lw:2, box:[16,-70,30,20] });
    },
    temple(x, v){ // 終點福德小祠（原創）
      C.rrect(x, -62, -14, 124, 14, 4, '#cbbba3', { lw:2.2, box:[-62,-14,124,14] });
      C.rrect(x, -46, -74, 92, 60, 4, '#efe2cb', { lw:2.4, box:[-46,-74,92,60] });
      for (const a of [-42, 34]) C.rrect(x, a, -74, 8, 60, 3, '#c94a3a', { lw:2, box:[a,-74,8,60] });
      const g = x.createRadialGradient(0, -44, 2, 0, -44, 26); g.addColorStop(0, 'rgba(255,226,140,1)'); g.addColorStop(1, 'rgba(226,128,56,0.95)');
      x.fillStyle = g; x.beginPath(); x.roundRect(-20, -66, 40, 50, [18,18,3,3]); x.fill(); x.strokeStyle = '#8c4a2f'; x.lineWidth = 2; x.stroke();
      roof(x, 0, -74, 68, '#d9473b');
      for (const a of [-56, 56]) { x.strokeStyle = '#7a5230'; x.lineWidth = 1.4; x.beginPath(); x.moveTo(a, -76); x.lineTo(a, -66); x.stroke(); C.ellipse(x, a, -58, 7, 9, '#e5483a', { lw:1.6 }); x.fillStyle = '#f3c74e'; x.fillRect(a - 7, -59, 14, 2); }
      C.rrect(x, -12, -14, 24, 12, 4, '#b58b4c', { lw:1.8, box:[-12,-14,24,12] });
    },
  };
  function roof(x, cx, by, hw, col){
    C.blob(x, c => { c.beginPath();
      c.moveTo(cx - hw - 10, by - 2); c.quadraticCurveTo(cx - hw - 14, by - 16, cx - hw - 4, by - 18);
      c.quadraticCurveTo(cx, by - 14 - hw*0.25, cx + hw + 4, by - 18); c.quadraticCurveTo(cx + hw + 14, by - 16, cx + hw + 10, by - 2);
      c.quadraticCurveTo(cx, by - 8, cx - hw - 10, by - 2); c.closePath(); }, col, { lw:2.4, box:[cx-hw-14, by-18-hw*0.25, hw*2+28, 18+hw*0.25] });
    C.rrect(x, cx - hw*0.4, by - 26 - hw*0.2, hw*0.8, 6, 3, '#3f8a73', { lw:1.6, shadow:false, box:[cx-hw*0.4, by-26-hw*0.2, hw*0.8, 6] });
  }
  const SIZE = { cairn:[60,80,30,72], btree:[110,140,55,132], note:[60,86,30,80], pine:[80,190,40,182], round:[80,140,40,132], sakura:[90,130,45,122],
    bigtree:[130,250,65,240], bush:[60,44,30,36], azalea:[60,48,30,40], flowers:[48,34,24,28], grass:[56,80,28,72], bamboo:[50,36,25,30],
    rock:[96,64,46,56], pavilion:[120,100,60,92], shrine:[70,70,35,62], sign:[60,64,30,58], trig:[70,84,24,76], temple:[160,140,80,132] };
  function spr(type, v){
    const sz = SIZE[type];
    return sprite(type + ':' + v, sz[0], sz[1], sz[2], sz[3], x => DRAW[type](x, v));
  }
  S.drawObj = (x, type, v, px, py, s) => { const old = ctx; ctx = x; const sp = spr(type, v); x.drawImage(sp.c, px - sp.ax*s, py - sp.ay*s, sp.w*s, sp.h*s); ctx = old; };

  // ───────── 依山生成沿途物件 ─────────
  function genObjects(){
    const t = M.theme, rr = C.rng(C.hash(M.id)), list = [];
    // 主物件（後排，站在步道後緣）
    let m = 22;
    const pool = [];
    const add = (k, n) => { for (let i=0;i<n;i++) pool.push(k); };
    if (t.alpine) { add('pine', 3); add('rock', 2); add('bamboo', 3); }
    else { add('round', 3); add('pine', 2); add('bush', 2); }
    if (t.rocks) add('rock', 3);
    if (t.grass) add('grass', 3);
    if (t.sakura) add('sakura', 3);
    if (t.bigtree) add('bigtree', 1);
    if (M.id === 'hehuan') add('azalea', 3);
    let k = 0;
    while (m < M.dist - 30) {
      let type;
      if (k % 3 === 1) type = ['cairn','btree','note'][Math.floor(rr()*3)];
      else if (k % 9 === 5) type = rr() < 0.5 ? 'pavilion' : 'shrine';
      else type = pool[Math.floor(rr()*pool.length)];
      list.push({ m, type, v: Math.floor(rr()*6), row:'back' });
      m += 32 + rr()*48; k++;
    }
    // 里程牌
    for (let d = 500; d < M.dist; d += 500) list.push({ m: d - 6, type:'sign', v:d, row:'back' });
    // 終點
    list.push({ m: M.dist + 16, type: M.temple ? 'temple' : 'trig', v:0, row:'back', end:true });
    // 背後一排小樹叢（較密）
    for (let d = 4; d < M.dist + 60; d += 7 + rr()*12) {
      const pick = t.alpine ? ['bamboo','bamboo','rock','flowers'] : t.grass ? ['grass','bush','flowers'] : ['bush','bush','flowers'];
      list.push({ m: d, type: pick[Math.floor(rr()*pick.length)], v: Math.floor(rr()*6), row:'far' });
    }
    // 前景花草
    for (let d = 3; d < M.dist + 80; d += 6 + rr()*10) {
      const pick = t.alpine ? ['bamboo','flowers','bamboo'] : t.grass ? ['grass','flowers','bush'] : ['flowers','bush','flowers','bush'];
      list.push({ m: d, type: pick[Math.floor(rr()*pick.length)], v: Math.floor(rr()*6), row:'front' });
    }
    for (let d = 2; d < M.dist + 90; d += 8 + rr()*14) {
      const pick = t.alpine ? ['bamboo','rock','flowers'] : t.grass ? ['grass','bush','flowers'] : ['bush','flowers','bush','rock'];
      list.push({ m: d, type: pick[Math.floor(rr()*pick.length)], v: Math.floor(rr()*6), row:'fore' });
    }
    list.forEach(o => o.interactive = ['cairn','btree','note'].includes(o.type));
    return list.sort((a,b) => a.m - b.m);
  }

  // ───────── 遠景圖塊（低解析放大 → 柔焦）─────────
  function ridgeY(x, TW, base, amps, seed){
    let y = base; const rr = C.rng(seed);
    amps.forEach((a, i) => { y += a * Math.sin(2*Math.PI*(i+1)*x/TW + rr()*6.28); });
    return y;
  }
  function buildTile(name, scale, draw){
    const TW = Math.round(W * 2), c = document.createElement('canvas');
    c.width = Math.ceil(TW * scale); c.height = Math.ceil(H * scale);
    const x = c.getContext('2d'); x.scale(scale, scale); draw(x, TW);
    tiles[name] = { c, TW };
  }
  function buildTiles(){
    const t = M.theme, g0 = G0(), seed = C.hash(M.id);
    const farA = C.mix(t.far, t.sky[1], 0.45), farB = t.far;
    const layer = (x, TW, base, amps, col, sd, snow) => {
      const pts = []; for (let i=0;i<=80;i++){ const px = i*TW/80; pts.push([px, ridgeY(px, TW, base, amps, sd)]); }
      const path = c => { c.beginPath(); c.moveTo(0, H); pts.forEach(p => c.lineTo(p[0], p[1])); c.lineTo(TW, H); c.closePath(); };
      C.blob(x, path, col, { lw:2, box:[0, base - 60, TW, H - base + 60], shadow:false, rim:6, hi:0.12, lo:0.1 });
      if (snow) { x.save(); path(x); x.clip(); x.fillStyle = 'rgba(255,255,255,0.88)';
        x.beginPath(); x.moveTo(0, 0); pts.forEach(p => x.lineTo(p[0], Math.min(p[1] + 16 + Math.sin(p[0]*0.05)*6, base - 14))); x.lineTo(TW, 0); x.closePath(); x.fill(); x.restore(); }
      return pts;
    };
    buildTile('far1', 0.5, (x, TW) => {
      layer(x, TW, H*0.30, [26,18,10,6], farA, seed, t.snow);
    });
    buildTile('far2', 0.65, (x, TW) => {
      const pts = layer(x, TW, H*0.40, [20,14,9,5], farB, seed + 9, t.snow && t.alpine);
      if (t.tower) { // 城市與高樓（原創造型）
        const bx = TW*0.3, by = H*0.47;
        for (let i=0;i<14;i++){ const w = 14 + (i*7)%12, h = 14 + (i*13)%30; C.rrect(x, bx - 120 + i*18, by - h, w, h + 40, 3, i%2 ? '#b9c3cf' : '#a8b4c4', { lw:1.4, shadow:false }); }
        for (let i=0;i<7;i++){ const w = 26 - i*2; C.rrect(x, bx - w/2, by - 30 - i*20, w, 22, 4, '#9fb2c2', { lw:1.6, shadow:false }); }
        x.strokeStyle = '#8193a6'; x.lineWidth = 2; x.beginPath(); x.moveTo(bx, by - 170); x.lineTo(bx, by - 196); x.stroke();
      }
    });
    buildTile('mid', 0.75, (x, TW) => {
      const base = H*0.5, rr = C.rng(seed + 3);
      const pts = []; for (let i=0;i<=60;i++){ const px = i*TW/60; pts.push([px, ridgeY(px, TW, base, [14,8,5], seed + 21)]); }
      // 樹（先畫在山丘後）
      const n = t.alpine ? 10 : 22;
      for (let i=0;i<n;i++){
        const px = (i + rr()*0.6) * TW / n, py = ridgeY(px, TW, base, [14,8,5], seed + 21) + 8;
        x.save(); x.translate(px, py); x.scale(0.55, 0.55);
        const ty = t.alpine || rr() < 0.4 ? 'pine' : (t.sakura && rr() < 0.4 ? 'sakura' : 'round');
        const sp = spr(ty, i % 6); x.drawImage(sp.c, -sp.ax, -sp.ay, sp.w, sp.h); x.restore();
      }
      C.blob(x, c => { c.beginPath(); c.moveTo(0, H); C.smooth(c, pts, false, true); c.lineTo(TW, H); c.closePath(); }, t.mid, { lw:2.2, box:[0, base - 30, TW, H - base], shadow:false, rim:6, hi:0.14 });
      if (t.steam) S.vents = [0.2, 0.55, 0.8].map(f => f * TW);
    });
  }

  S.setMountain = m => {
    M = m; sprites = {}; tiles = {}; S.vents = null;
    objs = genObjects();
    if (W) buildTiles();
  };

  // ───────── 天色 ─────────
  function skyColors(wx){
    let [a, b] = M.theme.sky;
    if (wx.time === 'dawn') { a = '#8fb2dc'; b = '#ffd7b0'; }
    if (wx.time === 'dusk') { a = '#e39b7f'; b = '#ffd9a8'; }
    if (wx.kind === 'cloudy') { a = C.mix(a, '#c4ccd4', 0.45); b = C.mix(b, '#e6e2da', 0.4); }
    if (wx.kind === 'rain') { a = C.mix(a, '#8d9aa8', 0.6); b = C.mix(b, '#c9cdd0', 0.55); }
    if (wx.kind === 'fog') { a = C.mix(a, '#e6ebee', 0.6); b = C.mix(b, '#f3f3ef', 0.6); }
    if (wx.time === 'night') { a = '#1d2b52'; b = '#4b4f7d'; }
    return [a, b];
  }

  // ───────── 主繪製 ─────────
  // st: { dist, t, walk, moving, sleep, wx:{kind,time}, parts }
  S.render = st => {
    if (!M || !W) return;
    if (!tiles.far1) buildTiles();
    const x = ctx; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const g0 = G0(), scroll = st.dist * PXM, wx = st.wx, night = wx.time === 'night';
    const [sa, sb] = skyColors(wx);
    const sky = x.createLinearGradient(0, 0, 0, g0); sky.addColorStop(0, sa); sky.addColorStop(1, sb);
    x.fillStyle = sky; x.fillRect(0, 0, W, H);

    // 星星／太陽
    if (night) { stars.forEach(s => { x.globalAlpha = 0.5 + 0.5*Math.sin(st.t*2 + s.p); x.fillStyle = '#fff8dc'; x.beginPath(); x.arc(s.x, s.y, s.r, 0, 7); x.fill(); }); x.globalAlpha = 1;
      C.ellipse(x, W*0.78, H*0.12, 18, 18, '#fff3c4', { lw:0, shadow:false, hi:0.3 }); }
    else if (wx.kind !== 'rain') {
      const sy = wx.time === 'dusk' || wx.time === 'dawn' ? H*0.3 : H*0.1;
      const gl = x.createRadialGradient(W*0.78, sy, 4, W*0.78, sy, 70); gl.addColorStop(0, 'rgba(255,246,210,0.9)'); gl.addColorStop(1, 'rgba(255,246,210,0)');
      x.fillStyle = gl; x.fillRect(W*0.78 - 70, sy - 70, 140, 140);
      C.ellipse(x, W*0.78, sy, 20, 20, wx.time === 'dusk' ? '#ffb070' : '#ffe08a', { lw:0, shadow:false, hi:0.35 });
    }
    // 雲
    clouds.forEach((c, i) => {
      const cx = ((c.x - scroll*0.03 + st.t*c.v) % (W + 200) + W + 200) % (W + 200) - 100;
      const sp = sprite('cloud' + (i%3), 130, 60, 65, 50, y => {
        const col = '#ffffff';
        C.ellipse(y, -30, -10, 28, 18, col, { lw:0, shadow:false, hi:0.1, lo:0.08 }); C.ellipse(y, 24, -10, 30, 19, col, { lw:0, shadow:false, hi:0.1, lo:0.08 });
        C.ellipse(y, -2, -24, 30, 24, col, { lw:0, shadow:false, hi:0.1, lo:0.1 });
      });
      x.globalAlpha = night ? 0.25 : wx.kind === 'rain' ? 0.9 : 0.85; blit(sp, cx, c.y, c.s); x.globalAlpha = 1;
    });

    // 遠山 → 中景
    const tileDraw = (name, par) => {
      const tl = tiles[name]; if (!tl) return;
      const off = -((scroll * par) % tl.TW);
      x.drawImage(tl.c, off, 0, tl.TW, H); x.drawImage(tl.c, off + tl.TW, 0, tl.TW, H);
    };
    tileDraw('far1', 0.04);
    if (wx.kind === 'fog') { x.fillStyle = 'rgba(245,246,242,0.55)'; x.fillRect(0, 0, W, g0); }
    tileDraw('far2', 0.1);
    // 噴氣孔
    if (S.vents) { const tl = tiles.mid; S.vents.forEach((vx, i) => { let px = vx - (scroll*0.3) % tl.TW; if (px < -60) px += tl.TW; if (px > W + 60) return;
      for (let k=0;k<4;k++){ const ph = (st.t*0.35 + k/4 + i*0.3) % 1; x.globalAlpha = 0.5*(1-ph); x.fillStyle = '#ffffff'; x.beginPath(); x.arc(px + Math.sin(ph*6 + k)*8, H*0.5 - ph*90, 10 + ph*22, 0, 7); x.fill(); } x.globalAlpha = 1; }); }
    tileDraw('mid', 0.3);
    if (wx.kind === 'fog') { const fg = x.createLinearGradient(0, H*0.35, 0, g0 + 20); fg.addColorStop(0, 'rgba(250,250,246,0.15)'); fg.addColorStop(1, 'rgba(250,250,246,0.7)'); x.fillStyle = fg; x.fillRect(0, H*0.35, W, g0 - H*0.35 + 20); }
    // 嘉明湖
    if (M.theme.lake && st.dist > M.dist - 260) { const lx = (M.dist - 60) * PXM - scroll + W*0.42;
      C.ellipse(x, lx, g0 + 4, 150, 26, '#6fb6d8', { lw:2.4, shadow:false, hi:0.35 }); }

    // 地面
    const near = M.theme.near;
    const top = px => g0 + 5*Math.sin((px + scroll)*0.013) + 3*Math.sin((px + scroll)*0.031);
    const gpath = c => { c.beginPath(); c.moveTo(-10, H); for (let px = -10; px <= W + 10; px += 10) c.lineTo(px, top(px)); c.lineTo(W + 10, H); c.closePath(); };
    C.blob(x, gpath, near, { lw:2.4, box:[0, g0 - 10, W, H - g0], shadow:false, rim:7, hi:0.14, lo:0.12 });

    // 後排小樹叢
    const vis = o => { const sx = o.m * PXM - scroll + W*0.42; return sx > -140 && sx < W + 140 ? sx : null; };
    objs.forEach(o => { if (o.row !== 'far') return; const sx = vis(o); if (sx === null) return; const sp = spr(o.type, o.v); blit(sp, sx, g0 + 12, 0.6); });
    // 步道
    drawTrail(x, g0, scroll, st);
    // 後排主物件
    S.hits = [];
    objs.forEach(o => { if (o.row !== 'back') return; const sx = vis(o); if (sx === null) return;
      const sp = spr(o.type, o.v), by = g0 + 26;
      blit(sp, sx, by, 1);
      if (o.interactive) {
        const bob = Math.sin(st.t*3 + o.m) * 2.5;
        x.save(); x.translate(sx, by - sp.ay - 12 + bob);
        C.ellipse(x, 0, 0, 11, 11, '#fffaf0', { lw:2, line:'#b07a4a', shadow:false });
        x.fillStyle = '#b07a4a'; x.font = 'bold 13px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText(o.type === 'note' ? '✎' : o.type === 'btree' ? '♥' : '☺', 0, 1); x.restore();
        S.hits.push({ o, x: sx - sp.ax, y: by - sp.ay - 26, w: sp.w, h: sp.ay + 26 });
      }
      if (o.end) S.endX = sx;
    });

    // 角色與寵物
    const cx = W*0.42, cy = g0 + 54;
    const pst = { t: st.t, walk: st.walk, moving: st.moving, sleep: st.sleep, rain: wx.kind === 'rain', night };
    C.bear(x, cx - 60, cy + 4, 1.05, pst);
    C.hiker(x, cx, cy, 1.25, pst);
    if (st.sleep) { x.save(); x.font = 'bold 18px sans-serif'; x.fillStyle = '#ffffff'; x.strokeStyle = '#6a4a35'; x.lineWidth = 3;
      for (let i=0;i<3;i++){ const ph = (st.t*0.6 + i/3) % 1; x.globalAlpha = 1 - ph; const zx = cx + 26 + ph*24, zy = cy - 110 - ph*40;
        x.font = `bold ${12 + ph*10}px sans-serif`; x.strokeText('z', zx, zy); x.fillText('z', zx, zy); } x.restore(); }

    // 前景花草
    objs.forEach(o => { if (o.row !== 'front') return; const sx = o.m * PXM * 1.1 - scroll * 1.1 + W*0.42; if (sx < -60 || sx > W + 60) return;
      const sp = spr(o.type, o.v); blit(sp, sx, g0 + 100 + (o.v % 3) * 9, 1.05); });
    // 下層草坡（第二層黏土地，視差較快）
    const t2 = g0 + 140, near2 = C.shade(near, -0.1);
    const g2 = c => { c.beginPath(); c.moveTo(-10, H); for (let px = -10; px <= W + 10; px += 10) c.lineTo(px, t2 + 8*Math.sin((px + scroll*1.3)*0.011) + 4*Math.sin((px + scroll*1.3)*0.027)); c.lineTo(W + 10, H); c.closePath(); };
    C.blob(x, g2, near2, { lw:2.4, box:[0, t2 - 10, W, H - t2], shadow:false, rim:7, hi:0.12, lo:0.14 });
    C.stitch(x, c => { c.beginPath(); for (let px = 0; px <= W; px += 10) { const yy = t2 + 12 + 8*Math.sin((px + scroll*1.3)*0.011) + 4*Math.sin((px + scroll*1.3)*0.027); px ? c.lineTo(px, yy) : c.moveTo(px, yy); } }, 'rgba(255,250,225,0.45)', 1.8, [5,6]);
    objs.forEach(o => { if (o.row !== 'fore') return; const sx = o.m * PXM * 1.3 - scroll * 1.3 + W*0.42; if (sx < -90 || sx > W + 90) return;
      const sp = spr(o.type, o.v); blit(sp, sx, t2 + 34 + (o.v % 3) * 14, 1.45); });

    // 粒子
    drawParts(x, st);

    // 天氣覆蓋
    if (wx.kind === 'rain') {
      x.strokeStyle = 'rgba(235,245,255,0.55)'; x.lineWidth = 1.3; x.beginPath();
      drops.forEach(d => { d.y += d.v * st.dt; d.x -= d.v * 0.18 * st.dt; if (d.y > H) { d.y = -20; d.x = Math.random()*W*1.2; } x.moveTo(d.x, d.y); x.lineTo(d.x + d.l*0.18, d.y - d.l); });
      x.stroke(); x.fillStyle = 'rgba(80,100,130,0.12)'; x.fillRect(0, 0, W, H);
    }
    if (night) { x.fillStyle = 'rgba(20,28,70,0.38)'; x.fillRect(0, 0, W, H);
      flies.forEach(f => { const fx = (f.x + Math.sin(st.t*0.5 + f.p)*30), fy = f.y + Math.cos(st.t*0.7 + f.p)*14;
        const a = 0.5 + 0.5*Math.sin(st.t*3 + f.p); const gl = x.createRadialGradient(fx, fy, 0, fx, fy, 9); gl.addColorStop(0, `rgba(255,250,170,${a})`); gl.addColorStop(1, 'rgba(255,250,170,0)');
        x.fillStyle = gl; x.fillRect(fx - 9, fy - 9, 18, 18); }); }
    if (wx.time === 'dusk') { x.fillStyle = 'rgba(255,150,90,0.1)'; x.fillRect(0, 0, W, H); }
    // 手作質感雜訊＋暗角（移軸感）
    x.save(); x.globalAlpha = 0.07; x.globalCompositeOperation = 'overlay'; x.fillStyle = noise; x.fillRect(0, 0, W, H); x.restore();
    const vg = x.createLinearGradient(0, 0, 0, H); vg.addColorStop(0, 'rgba(255,250,235,0.18)'); vg.addColorStop(0.12, 'rgba(255,250,235,0)'); vg.addColorStop(0.85, 'rgba(60,40,20,0)'); vg.addColorStop(1, 'rgba(60,40,20,0.22)');
    x.fillStyle = vg; x.fillRect(0, 0, W, H);
  };

  function drawTrail(x, g0, scroll, st){
    const t = M.theme.trail, y0 = g0 + 26, y1 = g0 + 76;
    const snowy = M.theme.snow && M.theme.alpine && st.wx.kind !== 'rain' && (st.dist / M.dist) > 0.55;
    const base = { stairs:'#d9c6a6', dirt:'#dcbc8c', wood:'#cfa775', scree:'#c6bcae' }[t] || '#dcbc8c';
    const band = c => { c.beginPath(); c.moveTo(-10, y0); for (let px=-10; px<=W+10; px+=20) c.lineTo(px, y0 + 2*Math.sin((px+scroll)*0.02)); c.lineTo(W+10, y1); c.lineTo(-10, y1); c.closePath(); };
    C.blob(x, band, base, { lw:2.2, box:[0, y0, W, y1 - y0], shadow:false, rim:5 });
    x.save(); band(x); x.clip();
    if (t === 'stairs') {
      // 石板步道：上下兩排交錯的圓角石板
      const sp = 36, start = Math.floor((scroll - W) / sp) - 1;
      for (let row = 0; row < 2; row++)
      for (let i = start; i < start + Math.ceil(W*2/sp) + 4; i++) { const sx = i*sp + row*18 - scroll + W*0.42; if (sx < -50 || sx > W + 50) continue;
        const v = (((i + row*3) % 5) + 5) % 5; const s = sprite('slab' + v, 40, 28, 2, 2, y => C.rrect(y, 0, 0, 32 - (v%2)*3, 19, 8, ['#d6c6aa','#cbb99c','#ddd0b8','#cfbfa2','#d9caaf'][v], { lw:1.8, sy:2.5 }));
        blit(s, sx, y0 + 4 + row*22, 1); }
    } else if (t === 'wood') {
      const sp = 16, start = Math.floor((scroll - W) / sp) - 1;
      for (let i = start; i < start + Math.ceil(W*2/sp) + 4; i++) { const sx = i*sp - scroll + W*0.42; if (sx < -20 || sx > W + 20) continue;
        const v = ((i % 3) + 3) % 3; const s = sprite('plank' + v, 18, 52, 1, 1, y => C.rrect(y, 0, 0, 14, 46, 4, ['#c3925f','#b98757','#cc9c69'][v], { lw:1.6, sy:2 }));
        blit(s, sx, y0 + 3, 1); }
    } else {
      const sp = 23, start = Math.floor((scroll - W) / sp) - 1, col = t === 'scree' ? '#a39a8d' : '#b9976a';
      for (let i = start; i < start + Math.ceil(W*2/sp) + 4; i++) { const sx = i*sp - scroll + W*0.42; if (sx < -20 || sx > W + 20) continue;
        const v = ((i % 4) + 4) % 4; const s = sprite('peb' + t + v, 20, 16, 10, 8, y => C.ellipse(y, 0, 0, 4 + v*1.5, 3 + v, col, { lw:1.4, sy:1.5 }));
        blit(s, sx, y0 + 10 + ((i*17) % 30 + 30) % 30, 1); }
    }
    if (snowy) { x.fillStyle = 'rgba(255,255,255,0.75)'; for (let i=0;i<8;i++){ const sx = ((i*137 - scroll) % (W + 100) + W + 100) % (W + 100) - 50; x.beginPath(); x.ellipse(sx, y0 + 14 + (i%3)*12, 30, 6, 0, 0, 7); x.fill(); } }
    if (st.wx.kind === 'rain') { x.fillStyle = 'rgba(150,180,210,0.35)'; for (let i=0;i<5;i++){ const sx = ((i*211 - scroll) % (W + 100) + W + 100) % (W + 100) - 50; x.beginPath(); x.ellipse(sx, y0 + 30, 22, 4, 0, 0, 7); x.fill(); } }
    x.restore();
    C.stitch(x, c => { c.beginPath(); c.moveTo(0, y0 + 5); for (let px=0; px<=W; px+=20) c.lineTo(px, y0 + 5 + 2*Math.sin((px+scroll)*0.02)); }, 'rgba(255,248,228,0.8)', 2, [6,6]);
    C.stitch(x, c => { c.beginPath(); c.moveTo(0, y1 - 5); c.lineTo(W, y1 - 5); }, 'rgba(255,248,228,0.6)', 2, [6,6]);
  }

  // ───────── 粒子 ─────────
  S.burst = (px, py, kind, n = 8) => {
    for (let i=0;i<n;i++) S.parts.push({ x:px, y:py, vx:(Math.random()-0.5)*160, vy:-80 - Math.random()*140, life:1, kind, r:Math.random()*6.28, c:['#ff8fa3','#ffd166','#8fd694','#9ad0f5'][i%4] });
  };
  function drawParts(x, st){
    S.parts = S.parts.filter(p => (p.life -= st.dt * 0.9) > 0);
    S.parts.forEach(p => {
      p.x += p.vx * st.dt; p.y += p.vy * st.dt; p.vy += 220 * st.dt; p.r += st.dt * 3;
      x.save(); x.globalAlpha = Math.min(1, p.life * 1.6); x.translate(p.x, p.y); x.rotate(p.r * 0.3);
      if (p.kind === 'heart') { x.fillStyle = '#ff7b93'; x.beginPath(); x.moveTo(0, 4); x.bezierCurveTo(-8, -2, -4, -9, 0, -4); x.bezierCurveTo(4, -9, 8, -2, 0, 4); x.fill(); x.strokeStyle = '#c44a64'; x.lineWidth = 1.2; x.stroke(); }
      else if (p.kind === 'leaf') { x.fillStyle = p.c === '#ffd166' ? '#e9b949' : '#7cbc62'; x.beginPath(); x.ellipse(0, 0, 6, 3, 0, 0, 7); x.fill(); }
      else if (p.kind === 'dust') { x.fillStyle = 'rgba(200,170,130,0.6)'; x.beginPath(); x.arc(0, 0, 4 * p.life, 0, 7); x.fill(); }
      else { x.fillStyle = p.c; x.beginPath(); for (let k=0;k<5;k++){ const a = k*1.2566 - 1.57, b = a + 0.628; x.lineTo(Math.cos(a)*7, Math.sin(a)*7); x.lineTo(Math.cos(b)*3, Math.sin(b)*3); } x.closePath(); x.fill(); x.strokeStyle = 'rgba(90,60,30,0.5)'; x.lineWidth = 1; x.stroke(); }
      x.restore();
    });
  }

  S.hitTest = (px, py) => (S.hits || []).find(h => px >= h.x && px <= h.x + h.w && py >= h.y && py <= h.y + h.h);
  S.charPos = () => ({ x: W*0.42, y: G0() + 54 });

  // 拍立得：擷取角色附近畫面
  S.snapshot = () => {
    const c = document.createElement('canvas'); c.width = 360; c.height = 260;
    const x = c.getContext('2d'), sw = Math.min(W, H*0.9), sh = sw * 260/360;
    const sx = Math.max(0, W*0.42 - sw*0.45), sy = Math.max(0, G0() + 90 - sh);
    x.drawImage(cv, sx*DPR, sy*DPR, sw*DPR, sh*DPR, 0, 0, 360, 260);
    x.fillStyle = 'rgba(255,220,170,0.12)'; x.fillRect(0, 0, 360, 260);
    return c.toDataURL('image/jpeg', 0.72);
  };
})();

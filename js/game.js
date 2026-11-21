// 山行小日子 — 主程式
(function(){
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const C = SX.clay, A = SX.audio, SC = SX.scene;
  const SPEED = 1.3;          // 自動前進（公尺／秒）
  const DRAIN = 600;          // 走多少公尺用掉全部體力
  const REST = 4;             // 休息時每秒回復體力
  const TAP_M = 4.5;          // 點一下多走幾公尺
  const OFFLINE_CAP = 8 * 3600;
  const KEY = 'shanxing-save-v1';

  // ───────── 存檔 ─────────
  const blank = () => ({ cur:null, prog:{}, done:{}, photos:[], stamps:{}, lots:[], set:{ sound:true, vol:0.7, gps:false, dev:false, devOn:false, fast:false } });
  let SV = blank();
  try { const raw = localStorage.getItem(KEY); if (raw) SV = Object.assign(blank(), JSON.parse(raw)); SV.set = Object.assign(blank().set, SV.set); } catch(e){}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(SV)); } catch(e){ toast('相簿太滿了，存不下新照片'); } };
  A.on = SV.set.sound; A.vol = SV.set.vol;

  const P = id => SV.prog[id] || (SV.prog[id] = { dist:0, stam:100, sleep:false, rest:false, last:Date.now(), ms:0 });

  // ───────── 畫面切換 ─────────
  let screen = 'map', prevScreen = 'map';
  function go(name){
    if (name === screen) return;
    if (name === 'album' || name === 'settings') prevScreen = screen;
    $$('.scr').forEach(s => s.classList.remove('on'));
    $('#scr' + name[0].toUpperCase() + name.slice(1)).classList.add('on');
    screen = name;
    if (name === 'map') renderMap();
    if (name === 'climb') { SC.resize(); }
    if (name === 'album') renderAlbum();
    if (name === 'settings') renderSettings();
    moodNow();
  }
  document.addEventListener('click', e => {
    const g = e.target.closest('[data-go]'); if (g) { A.unlock(); A.pop(); go(g.dataset.go === 'map' ? 'map' : g.dataset.go); }
    const b = e.target.closest('[data-back]'); if (b) { A.pop(); go(prevScreen); }
  });

  function toast(msg, ms = 2000){ const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), ms); }
  function sparks(x, y, n = 10){
    const app = $('#app'), r = app.getBoundingClientRect();
    for (let i=0;i<n;i++){ const s = document.createElement('div'); s.className = 'spark';
      const col = ['#ffd166','#ff8fa3','#8fd694','#9ad0f5'][i%4];
      s.innerHTML = `<svg viewBox="0 0 20 20"><path d="M10 0l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="${col}" stroke="#8a5a33" stroke-width="1"/></svg>`;
      s.style.left = (x - r.left - 7) + 'px'; s.style.top = (y - r.top - 7) + 'px';
      const a = Math.random()*6.28, d = 40 + Math.random()*60; s.style.setProperty('--dx', Math.cos(a)*d + 'px'); s.style.setProperty('--dy', Math.sin(a)*d - 20 + 'px');
      app.appendChild(s); setTimeout(() => s.remove(), 950); }
  }

  // 動態效果：漣漪、按讚、彩紙、交錯出場
  let lastTap = { x: 0, y: 0 };
  document.addEventListener('pointerdown', e => {
    lastTap = { x: e.clientX, y: e.clientY };
    const b = e.target.closest('.cbtn,.dbtn,.tab,.chip'); if (!b || b.disabled) return;
    const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2.2, rp = document.createElement('span');
    rp.className = 'rip'; rp.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s/2}px;top:${e.clientY - r.top - s/2}px`;
    if (getComputedStyle(b).position === 'static') b.style.position = 'relative';
    b.appendChild(rp); setTimeout(() => rp.remove(), 600);
  }, { passive:true });
  function likeAt(x, y){
    const app = $('#app'), r = app.getBoundingClientRect(), lx = x - r.left, ly = y - r.top;
    const h = document.createElement('div'); h.className = 'likeHeart'; h.style.left = lx + 'px'; h.style.top = ly + 'px';
    h.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 21C5 15.5 2 12.5 2 8.5 2 5.4 4.4 3 7.4 3c1.9 0 3.6 1 4.6 2.5C13 4 14.7 3 16.6 3 19.6 3 22 5.4 22 8.5c0 4-3 7-10 12.5z" fill="#ff7b93" stroke="#b8445c" stroke-width="1.6"/><ellipse cx="7.5" cy="7.5" rx="2.2" ry="1.4" fill="#fff" opacity=".6" transform="rotate(-30 7.5 7.5)"/></svg>';
    app.appendChild(h); setTimeout(() => h.remove(), 750);
    for (let i=0;i<10;i++){ const d = document.createElement('div'); d.className = 'likeDot'; const a = i/10*6.283, R = 34 + Math.random()*16;
      d.style.cssText = `left:${lx}px;top:${ly}px;background:${['#ff7b93','#ffd166','#f7a35c'][i%3]};--dx:${Math.cos(a)*R}px;--dy:${Math.sin(a)*R}px`;
      app.appendChild(d); setTimeout(() => d.remove(), 650); }
  }
  function confetti(n = 46){
    const app = $('#app'), W = app.clientWidth, cols = ['#8fcf6e','#f2cf5b','#f3a35a','#ee7e6b','#9ad0f5','#f4b3c6','#fffaf0'];
    for (let i=0;i<n;i++){ const c = document.createElement('div'); c.className = 'confetti';
      c.style.cssText = `left:${Math.random()*W}px;background:${cols[i%cols.length]};--dx:${(Math.random()-0.5)*120}px;--r:${(Math.random()-0.5)*900}deg;--t:${1.6 + Math.random()*1.4}s;animation-delay:${Math.random()*0.4}s`;
      app.appendChild(c); setTimeout(() => c.remove(), 3600); }
  }
  function stagger(root, sel){ [...root.querySelectorAll(sel)].forEach((el, i) => { el.classList.add('stg'); el.style.animationDelay = Math.min(i, 14) * 60 + 'ms'; }); }

  // ───────── 天氣 ─────────
  let wxOverride = null;
  const WX_NAMES = { sunny:'晴', cloudy:'多雲', fog:'起霧', rain:'下雨' };
  const TIME_NAMES = { dawn:'清晨', day:'', dusk:'黃昏', night:'夜晚' };
  function calcWx(){
    const d = new Date(), h = d.getHours() + d.getMinutes()/60;
    const time = h >= 5 && h < 7 ? 'dawn' : h >= 7 && h < 17 ? 'day' : h >= 17 && h < 18.6 ? 'dusk' : 'night';
    const id = SV.cur || 'x', rr = C.rng(C.hash(id + Math.floor(Date.now() / 1200000)))();
    const fogBias = SX.M[id] && SX.M[id].theme.fog ? 0.15 : 0;
    const kind = rr < 0.16 ? 'rain' : rr < 0.3 + fogBias ? 'fog' : rr < 0.52 + fogBias ? 'cloudy' : 'sunny';
    return wxOverride || { kind, time };
  }
  let wx = calcWx();
  const WX_CYCLE = [{kind:'sunny',time:'day'},{kind:'cloudy',time:'day'},{kind:'fog',time:'day'},{kind:'rain',time:'day'},{kind:'sunny',time:'dusk'},{kind:'sunny',time:'night'},{kind:'sunny',time:'dawn'}];
  $('#wxChip').onclick = e => {
    e.stopPropagation(); A.pop();
    let i = WX_CYCLE.findIndex(w => w.kind === wx.kind && w.time === wx.time);
    wxOverride = WX_CYCLE[(i + 1) % WX_CYCLE.length]; wx = wxOverride;
    moodNow(); updateWxChip();
  };
  function moodNow(){
    const sc = screen === 'album' || screen === 'settings' ? prevScreen : screen;
    A.mood({ screen: sc, wx, water: M && (M.theme.lake || M.id === 'taiping') });
  }
  document.addEventListener('pointerdown', () => { A.unlock(); if (!A._mood) moodNow(); }, { passive:true });
  function updateWxChip(){ $('#wxChip').textContent = (TIME_NAMES[wx.time] ? TIME_NAMES[wx.time] + '・' : '') + WX_NAMES[wx.kind]; }

  // ───────── 地圖 ─────────
  const proj = (lon, lat) => [(lon - 119.95) * 130 + 14, (25.45 - lat) * 143 + 14];
  const LAB = { qixing:[-6,-30], guanyin:[-58,-8], xiangshan:[40,8], matcha:[40,22], taiping:[44,4], xueshan:[-62,-14], hehuan:[-62,14], alishan:[-60,4], yushan:[46,10], jiaming:[46,12] };
  const DIFFC = ['#8fcf6e','#f2cf5b','#f3a35a','#ee7e6b','#b98ad9'];
  let selId = null;
  function renderMap(){
    const coast = SX.COAST.map(p => proj(p[0], p[1]));
    const ridge = SX.RIDGE.map(p => proj(p[0], p[1]));
    const tmp = document.createElement('canvas').getContext('2d');
    const d = pts => { let s = ''; const n = pts.length, P = i => pts[(i + n) % n];
      s += `M${P(0)[0].toFixed(1)},${P(0)[1].toFixed(1)}`;
      for (let i=0;i<n;i++){ const p0 = P(i-1), p1 = P(i), p2 = P(i+1), p3 = P(i+2);
        s += `C${(p1[0]+(p2[0]-p0[0])/6).toFixed(1)},${(p1[1]+(p2[1]-p0[1])/6).toFixed(1)} ${(p2[0]-(p3[0]-p1[0])/6).toFixed(1)},${(p2[1]-(p3[1]-p1[1])/6).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`; }
      return s + 'Z'; };
    const open = pts => { let s = `M${pts[0][0]},${pts[0][1]}`; for (let i=1;i<pts.length;i++){ const a = pts[i-1], b = pts[i]; s += `Q${a[0]},${a[1]} ${(a[0]+b[0])/2},${(a[1]+b[1])/2}`; } const l = pts[pts.length-1]; return s + `L${l[0]},${l[1]}`; };
    const isl = d(coast);
    const cx = coast.reduce((a,p)=>a+p[0],0)/coast.length, cy = coast.reduce((a,p)=>a+p[1],0)/coast.length;
    let marks = '';
    SX.MOUNTAINS.forEach(m => {
      const [x, y] = proj(m.lon, m.lat), [lx, ly] = LAB[m.id] || [40, 0];
      const col = DIFFC[m.diff - 1], done = SV.done[m.id], going = SV.prog[m.id] && SV.prog[m.id].dist > 0 && !done;
      marks += `<g class="mk${selId === m.id ? ' sel' : ''}" data-id="${m.id}" style="animation-delay:${SX.MOUNTAINS.indexOf(m)*60}ms">
        <line x1="${x}" y1="${y - 6}" x2="${x + lx}" y2="${y + ly}" stroke="#8a5a33" stroke-width="1.4" stroke-dasharray="2 2"/>
        <g class="blk">
          <rect x="${x - 7}" y="${y - 5}" width="14" height="10" rx="3" fill="${C.shade(col,-0.25)}" stroke="#6b4426" stroke-width="1.5"/>
          <rect x="${x - 7}" y="${y - 11}" width="14" height="10" rx="3" fill="${col}" stroke="#6b4426" stroke-width="1.5"/>
          <rect x="${x - 4.5}" y="${y - 9.5}" width="6" height="2.4" rx="1.2" fill="#fff" opacity=".6"/>
          ${done ? `<path d="M${x+2} ${y-11}V${y-30}" stroke="#6b4426" stroke-width="1.6"/><path d="M${x+2} ${y-30}l12 4-12 4z" fill="#e8574a" stroke="#6b4426" stroke-width="1.2"/>` : ''}
          ${going ? `<circle cx="${x + 9}" cy="${y - 13}" r="4.5" fill="#e8774f" stroke="#fff" stroke-width="1.6"/>` : ''}
        </g>
        <g class="lab"><rect x="${x + lx - 27}" y="${y + ly - 10}" width="54" height="20" rx="10" fill="#fffaf0" stroke="#b07a4a" stroke-width="1.5"/>
        <text x="${x + lx}" y="${y + ly + 4.5}" text-anchor="middle" font-size="12" fill="#5b4030">${m.name}</text></g>
        <circle cx="${x}" cy="${y - 4}" r="22" fill="transparent"/>
      </g>`;
    });
    const cloud = (x, y, s, dl) => `<g class="cloudFloat" style="animation-delay:${dl}s" transform="translate(${x} ${y}) scale(${s})"><g fill="#fff" stroke="#d6e6ee" stroke-width="2"><ellipse cx="-14" cy="0" rx="16" ry="11"/><ellipse cx="14" cy="0" rx="17" ry="11"/><ellipse cx="0" cy="-8" rx="17" ry="13"/></g><ellipse cx="0" cy="4" rx="28" ry="6" fill="#fff"/></g>`;
    $('#mapWrap').innerHTML = `<svg viewBox="-10 0 340 545" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="gIsl" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#b6dc8c"/><stop offset=".6" stop-color="#93c86e"/><stop offset="1" stop-color="#78b05c"/></linearGradient>
        <linearGradient id="gSoil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c99566"/><stop offset="1" stop-color="#9a6a42"/></linearGradient>
        <filter id="fBlur"><feGaussianBlur stdDeviation="6"/></filter>
        <filter id="fTex"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 .3  0 0 0 0 .25  0 0 0 0 .15  0 0 0 .5 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
        <clipPath id="cIsl"><path d="${isl}"/></clipPath>
      </defs>
      ${cloud(40, 70, 1, 0)}${cloud(300, 300, 0.8, 2)}${cloud(50, 400, 0.9, 4)}
      <path d="${isl}" transform="translate(8 20)" fill="rgba(40,90,120,.28)" filter="url(#fBlur)"/>
      <path d="${isl}" transform="translate(0 12)" fill="url(#gSoil)" stroke="#6b4426" stroke-width="2.5"/>
      <path d="${isl}" transform="translate(0 6)" fill="#b98556"/>
      <path d="${isl}" fill="url(#gIsl)" stroke="#557a3d" stroke-width="2.6"/>
      <g clip-path="url(#cIsl)">
        <path d="${isl}" fill="none" stroke="#f2e2b4" stroke-width="12"/>
        <path d="${open(ridge)}" fill="none" stroke="#4f8a4a" stroke-width="30" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>
        <path d="${open(ridge)}" fill="none" stroke="#3f7a45" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="${open(ridge)}" transform="translate(-2 -3)" fill="none" stroke="#7fb86a" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>
        <path d="${open(ridge.slice(1,6))}" transform="translate(-1 -4)" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 9" opacity=".9"/>
        <path d="${isl}" fill="#000" filter="url(#fTex)" opacity=".35"/>
      </g>
      <path d="${isl}" transform="translate(${cx} ${cy}) scale(.965) translate(${-cx} ${-cy})" fill="none" stroke="#fffbe8" stroke-width="1.8" stroke-dasharray="5 5" stroke-linecap="round" opacity=".85"/>
      ${marks}
    </svg>`;
    $$('#mapWrap .mk').forEach(g => g.addEventListener('click', e => { e.stopPropagation(); A.unlock(); A.pop(); selId = g.dataset.id; $$('#mapWrap .mk').forEach(k => k.classList.toggle('sel', k === g)); showRoute(selId); }));
  }
  $('#mapWrap').addEventListener('click', () => { $('#routeCard').classList.remove('on'); selId = null; $$('#mapWrap .mk').forEach(k => k.classList.remove('sel')); });

  const RICE = '<path d="M9 1.5C6 1.5 1.5 9 1.5 12.2c0 1.8 1.4 2.3 7.5 2.3s7.5-.5 7.5-2.3C16.5 9 12 1.5 9 1.5z" fill="#fff" stroke="#8a6a48" stroke-width="1.3"/><rect x="5" y="9.5" width="8" height="5" rx="1" fill="#2f4a32"/>';
  function rice(n){ return `<span class="rice">${[1,2,3,4,5].map(i => `<svg viewBox="0 0 18 16" class="${i <= n ? '' : 'off'}">${RICE}</svg>`).join('')}</span>`; }
  function showRoute(id){
    const m = SX.M[id], p = SV.prog[id], done = SV.done[id] || 0;
    const going = p && p.dist > 0 && p.dist < m.dist;
    const mins = Math.round(m.dist / SPEED / 60 * 1.25);
    $('#routeCard').innerHTML = `<button class="rc-x" id="rcX">✕</button>
      <div class="rc-h"><b>${m.name}</b><span>${m.area}</span></div>
      <div class="rc-stats"><div><small>海拔</small><b>${m.alt} m</b></div><div><small>路程</small><b>${(m.dist/1000).toFixed(1)} km</b></div><div><small>難度</small>${rice(m.diff)}</div></div>
      <div class="rc-feat"><em>沿途：</em>${m.feat}</div>
      <div class="rc-feat"><em>終點：</em>${m.end}${m.temple ? '（可以擲筊、求籤）' : ''}</div>
      <div class="rc-feat"><em>放著自己走：</em>約 ${mins} 分鐘${done ? `　<em>已登頂 ${done} 次</em>` : ''}</div>
      <div class="rc-btns"><button class="cbtn go" id="rcGo">${going ? `繼續（${(p.dist/1000).toFixed(2)} km）` : done ? '再爬一次' : '出發！'}</button></div>`;
    $('#routeCard').classList.add('on');
    $('#rcX').onclick = e => { e.stopPropagation(); $('#routeCard').classList.remove('on'); };
    $('#rcGo').onclick = () => { A.unlock(); A.chime(); startClimb(id); };
  }

  // ───────── 登山 ─────────
  let M = null, st = null, t = 0, walk = 0, boost = 0, lastStep = 0, arrived = false, paused = false;
  let lineT = 8, tapCount = 0;
  function startClimb(id){
    M = SX.M[id]; SV.cur = id; st = P(id);
    if (st.dist >= M.dist) { st.dist = 0; st.ms = 0; st.stam = 100; st.sleep = false; }
    st.last = Date.now(); arrived = false; paused = false;
    $('#routeCard').classList.remove('on');
    $('#hName').textContent = M.name;
    wx = calcWx(); updateWxChip();
    SC.setMountain(M); go('climb'); SC.resize(); A.nextDay();
    const sc = $('#scrClimb'), ar = $('#app').getBoundingClientRect(); sc.style.setProperty('--rx', (lastTap.x - ar.left) + 'px'); sc.style.setProperty('--ry', (lastTap.y - ar.top) + 'px'); sc.classList.remove('reveal'); void sc.offsetWidth; sc.classList.add('reveal');
    buildRadar(); save();
    $('#tapHint').classList.toggle('off', tapCount > 6);
  }

  // 離線前進
  function catchUp(){
    if (!SV.cur) return;
    const p = P(SV.cur), m = SX.M[SV.cur];
    let sec = Math.min(OFFLINE_CAP, (Date.now() - (p.last || Date.now())) / 1000);
    if (sec < 30 || p.dist >= m.dist) return;
    const before = p.dist;
    while (sec > 0 && p.dist < m.dist) { const dt = Math.min(5, sec); sec -= dt; simulate(p, m, dt); }
    p.last = Date.now();
    const gained = p.dist - before;
    if (gained > 1) setTimeout(() => toast(`你不在的時候，自己走了 ${Math.round(gained)} 公尺`, 3200), 600);
  }
  function simulate(p, m, dt){
    if (p.sleep || p.rest) { p.stam = Math.min(100, p.stam + REST * dt); if (p.stam >= 100) { p.sleep = false; p.rest = false; } return 0; }
    const mult = SV.set.devOn && SV.set.fast ? 20 : 1;
    const d = Math.min(m.dist - p.dist, SPEED * dt * mult);
    p.dist += d; p.stam -= d / DRAIN * 100 / mult;
    if (p.stam <= 0) { p.stam = 0; p.sleep = true; }
    return d;
  }

  const cv = $('#cv'); SC.init(cv);
  window.addEventListener('resize', () => { if (screen === 'climb') SC.resize(); });

  cv.addEventListener('pointerdown', e => {
    if (!st || paused) return;
    A.unlock();
    const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const h = SC.hitTest(x, y);
    if (h) { A.pop(); openNote(h.o, e.clientX, e.clientY); return; }
    if (arrived) return;
    if (st.sleep) { say('再讓我睡一下下…'); return; }
    if (st.rest) { st.rest = false; updateRest(); }
    st.dist = Math.min(M.dist, st.dist + TAP_M); st.stam = Math.max(0, st.stam - 0.6);
    if (st.stam <= 0) { st.sleep = true; }
    boost = 0.6; tapCount++;
    if (tapCount > 6) $('#tapHint').classList.add('off');
    const cp = SC.charPos(); SC.burst(cp.x - 10, cp.y - 4, 'dust', 3);
    if (Math.random() < 0.3) SC.burst(x, y, Math.random() < 0.5 ? 'leaf' : 'star', 4);
  });

  $('#restBtn').onclick = () => {
    if (!st || arrived) return; A.pop();
    if (st.sleep) { say('體力回復中，馬上好～'); return; }
    st.rest = !st.rest; updateRest();
    say(st.rest ? '搭個小帳篷休息一下' : '出發囉！');
  };
  function updateRest(){ const b = $('#restBtn'); b.classList.toggle('on', !!(st && (st.rest || st.sleep))); b.querySelector('span').textContent = st && st.rest ? '出發' : '休息'; }

  // 便條
  const notePick = o => SX.NOTES[(C.hash(M.id + o.m) + Math.floor(Date.now() / 86400000 / 3)) % SX.NOTES.length];
  function openNote(o, cx, cy){
    paused = true;
    A.paper();
    const title = o.type === 'note' ? '山友留下的便條' : o.type === 'btree' ? '祈福樹上的小卡' : '笑臉疊石下壓著一張紙條';
    const days = 1 + C.hash(o.m + 'd') % 3;
    modal(`<h3>${title}</h3>
      <div class="noteP">${notePick(o)}<small>— 匿名山友・${days} 天後會風化</small></div>
      <div class="mBtns"><button class="cbtn" id="nHeart">給愛心</button><button class="cbtn" id="nClean">${o.type === 'btree' ? '澆澆水' : '清清泥'}</button></div>
      <div class="mBtns" style="margin-top:10px"><button class="cbtn go" id="nOk">繼續走</button></div>`);
    const give = (btn, kind) => { if (btn.disabled) return; btn.disabled = true; const r = btn.getBoundingClientRect(); sparks(r.left + r.width/2, r.top + r.height/2, 12); A.sparkle(); st.stam = Math.min(100, st.stam + 8); toast(kind === 'heart' ? '愛心送出了，體力 +8' : '步道變乾淨了，體力 +8'); };
    $('#nHeart').onclick = e => { const r = e.currentTarget.getBoundingClientRect(); if (!e.currentTarget.disabled) likeAt(r.left + r.width/2, r.top); give(e.currentTarget, 'heart'); };
    $('#nClean').onclick = e => give(e.currentTarget, 'clean');
    $('#nOk').onclick = () => closeModal();
  }

  function modal(html){ $('#mCard').innerHTML = html; $('#modal').classList.add('on'); }
  function closeModal(){ $('#modal').classList.remove('on'); paused = false; if (st) st.last = Date.now(); }

  // 台詞
  function say(txt, ms = 2600){
    const b = $('#bubble'), cp = SC.charPos();
    b.textContent = txt; b.style.left = cp.x + 'px'; b.style.top = (cp.y - 125) + 'px';
    b.classList.add('on'); clearTimeout(b._h); b._h = setTimeout(() => b.classList.remove('on'), ms);
  }

  // 拍立得
  function takePhoto(m500, quiet){
    const img = SC.snapshot();
    const ph = { id:M.id, m:m500, img, cap:`${M.name}・${(m500/1000).toFixed(1)} km`, wx:(TIME_NAMES[wx.time] || '') + WX_NAMES[wx.kind], date:new Date().toLocaleDateString('zh-TW') };
    SV.photos.push(ph); save();
    if (!quiet) { A.shutter(); paused = true;
      modal(`<h3>走了 ${(m500/1000).toFixed(1)} 公里，拍一張！</h3>
        <div class="pol"><img src="${img}"><p>${ph.cap}・${ph.wx}</p></div>
        <div class="mBtns"><button class="cbtn go" id="pOk">收進相簿</button></div>`);
      $('#pOk').onclick = () => { A.pop(); closeModal(); say(pick(SX.LINES.walk)); };
    }
  }
  const pick = a => a[Math.floor(Math.random() * a.length)];

  function arrive(){
    arrived = true; st.dist = M.dist;
    SV.done[M.id] = (SV.done[M.id] || 0) + 1;
    if (!M.temple) SV.stamps[M.id] = SV.stamps[M.id] || new Date().toLocaleDateString('zh-TW');
    save(); A.yay();
    setTimeout(() => {
      const img = SC.snapshot();
      SV.photos.push({ id:M.id, m:M.dist, img, cap:`${M.name}・登頂`, wx:WX_NAMES[wx.kind], date:new Date().toLocaleDateString('zh-TW') }); save();
      paused = true;
      const r = $('#app').getBoundingClientRect(); sparks(r.left + r.width/2, r.top + r.height*0.4, 24); confetti();
      modal(`<h3>抵達終點！</h3>
        <div class="summitBig"><b>${M.name} ${M.alt} m</b>${M.end}</div>
        <div class="pol"><img src="${img}"><p>${M.name}・登頂紀念</p></div>
        ${M.temple ? '<p class="summitBig">旁邊有一間小小的福德祠，要不要進去拜一下？</p>' : '<p class="summitBig">集印帳蓋上新的章了！</p>'}
        <div class="mBtns">${M.temple ? '<button class="cbtn red" id="aTemple">去福德祠</button>' : ''}<button class="cbtn ${M.temple ? '' : 'go'}" id="aMap">回地圖</button></div>`);
      if (M.temple) $('#aTemple').onclick = () => { closeModal(); openTemple(); };
      $('#aMap').onclick = () => { closeModal(); SV.cur = null; save(); go('map'); };
    }, 1400);
  }

  // 雷達小地圖
  let radarPath = null;
  function buildRadar(){
    const rr = C.rng(C.hash(M.id + 'r'));
    const pts = [[24, 84]]; for (let i=1;i<6;i++) pts.push([24 + i*13 + (rr()-0.5)*8, 84 - i*11 + (rr()-0.5)*12]);
    pts.push([90, 26]);
    let d = `M${pts[0][0]},${pts[0][1]}`; for (let i=1;i<pts.length;i++){ const a = pts[i-1], b = pts[i]; d += ` Q${a[0]},${a[1]} ${(a[0]+b[0])/2},${(a[1]+b[1])/2}`; } d += ` L90,26`;
    const marks = []; for (let k=500;k<M.dist;k+=500) marks.push(k / M.dist);
    $('#radar').innerHTML = `<svg viewBox="0 0 112 112">
      <ellipse cx="57" cy="66" rx="46" ry="32" fill="#a5d48a" stroke="#557a3d" stroke-width="2.2"/>
      <ellipse cx="57" cy="72" rx="46" ry="30" fill="none" stroke="#9a6a42" stroke-width="6" opacity=".55" clip-path="inset(50% 0 0 0)"/>
      <ellipse cx="54" cy="58" rx="34" ry="22" fill="#bfe3a2"/>
      <path d="M70 52 l14 -30 l14 30 z" fill="${C.shade(M.theme.far,-0.05)}" stroke="#557a3d" stroke-width="2" stroke-linejoin="round"/>
      ${M.theme.snow ? '<path d="M79 33 l5 -11 l5 11 l-3 -2 l-2 3 l-2 -3z" fill="#fff"/>' : ''}
      <path id="rPath" d="${d}" fill="none" stroke="#8a5a33" stroke-width="3" stroke-linecap="round" stroke-dasharray="3 4"/>
      <g id="rMarks"></g>
      <rect x="85" y="18" width="10" height="9" rx="2" fill="${M.temple ? '#d9473b' : '#f2c14e'}" stroke="#6b4426" stroke-width="1.4"/>
      <circle id="rDot" r="5" fill="#e8774f" stroke="#fff" stroke-width="2"/>
    </svg>`;
    radarPath = $('#rPath');
    const L = radarPath.getTotalLength();
    $('#rMarks').innerHTML = marks.map(f => { const p = radarPath.getPointAtLength(f * L); return `<rect x="${p.x-3.5}" y="${p.y-3.5}" width="7" height="7" rx="1.6" fill="#ffe08a" stroke="#6b4426" stroke-width="1.2"/>`; }).join('');
  }

  // HUD
  function hud(){
    const f = st.dist / M.dist, alt = Math.round(M.startAlt + (M.alt - M.startAlt) * f);
    $('#hAlt').textContent = alt;
    $('#hFill').style.width = (f*100) + '%'; $('#hWalker').style.left = (f*100) + '%';
    $('#hDist').textContent = `${(st.dist/1000).toFixed(2)} / ${(M.dist/1000).toFixed(1)} km`;
    const left = (M.dist - st.dist) / SPEED / 60;
    $('#hEta').textContent = arrived ? '到了！' : st.sleep ? '打瞌睡中…' : st.rest ? '休息中' : `還要約 ${Math.max(1, Math.round(left * 1.25))} 分`;
    $('#hStam').style.width = st.stam + '%';
    if (radarPath) { const L = radarPath.getTotalLength(), p = radarPath.getPointAtLength(f * L), d = $('#rDot'); d.setAttribute('cx', p.x); d.setAttribute('cy', p.y); }
    updateRest();
  }

  // 主迴圈
  let lastT = performance.now(), hudT = 0, birdT = 4, wxT = 0;
  function loop(now){
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    frame(dt);
  }
  function frame(dt){
    if (screen !== 'climb' || !st) return;
    t += dt;
    let moving = false;
    if (!paused && !arrived) {
      const before = st.dist, wasSleep = st.sleep;
      const d = simulate(st, M, dt);
      moving = d > 0 || boost > 0;
      if (!wasSleep && st.sleep) { say(pick(SX.LINES.tired)); A.yawn(); }
      if (wasSleep && !st.sleep) { say('睡飽了！繼續走～'); }
      // 每 500 公尺
      const ms = Math.floor(st.dist / 500) * 500;
      if (ms > (st.ms || 0) && ms < M.dist) { st.ms = ms; takePhoto(ms); }
      if (st.dist >= M.dist) arrive();
      st.last = Date.now();
    }
    if (boost > 0) boost -= dt;
    const pace = moving ? (boost > 0 ? 3.2 : 1.6) : 0;
    walk = (walk + dt * pace) % 1;
    const snowy = M.theme.snow && M.theme.alpine && wx.kind !== 'rain' && st.dist / M.dist > 0.55;
    A.walk(moving && !paused, snowy ? 'snow' : M.theme.trail, boost > 0);
    // 隨口台詞與環境音
    lineT -= dt;
    if (lineT <= 0 && moving && !paused) { lineT = 18 + Math.random()*16;
      say(pick(wx.time === 'night' ? SX.LINES.night : wx.kind === 'rain' ? SX.LINES.rain : wx.kind === 'fog' ? SX.LINES.fog : SX.LINES.walk)); }
    birdT -= dt;

    wxT += dt; if (wxT > 60) { wxT = 0; if (!wxOverride) { const n = calcWx(); if (n.kind !== wx.kind || n.time !== wx.time) { wx = n; updateWxChip(); moodNow(); } } }
    SC.render({ dist: st.dist, t, dt, walk, moving, sleep: st.sleep || st.rest, wx });
    hudT -= dt; if (hudT <= 0) { hudT = 0.2; hud(); }
  }
  setInterval(() => { if (st) save(); }, 5000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { if (st) { st.last = Date.now(); save(); } A.setOn(false); } else { catchUp(); A.setOn(SV.set.sound); } });

  // ───────── 廟宇 ─────────
  let bwaStreak = 0, lotState = null, incensed = false, busy = false;
  function openTemple(){
    go('temple'); bwaStreak = 0; lotState = null; incensed = false;
    $('#tName').textContent = '象山福德小祠';
    $('#tMsg').innerHTML = '心裡默念自己的名字、住哪裡，還有想問的事，<br>再來擲筊或求籤。';
    drawTemple();
    setTimeout(() => A.bell(), 300);
  }
  $('#tBack').onclick = () => { A.pop(); SV.cur = null; save(); go('map'); };
  function drawTemple(){
    $('#tStage').innerHTML = `<svg viewBox="0 0 360 440">
      <defs>
        <radialGradient id="gGlow" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#fff1b8"/><stop offset=".6" stop-color="#ffc861"/><stop offset="1" stop-color="#e08a3c"/></radialGradient>
        <linearGradient id="gRoof" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ee6a52"/><stop offset="1" stop-color="#c13f2e"/></linearGradient>
        <linearGradient id="gWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbf1df"/><stop offset="1" stop-color="#e9d6b8"/></linearGradient>
        <linearGradient id="gPil" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e0624d"/><stop offset=".4" stop-color="#f08a72"/><stop offset="1" stop-color="#b8402f"/></linearGradient>
        <linearGradient id="gBz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9a64e"/><stop offset="1" stop-color="#9b6a28"/></linearGradient>
      </defs>
      <ellipse cx="180" cy="392" rx="170" ry="26" fill="rgba(120,70,30,.18)"/>
      <rect x="40" y="350" width="280" height="36" rx="10" fill="#d8c6a8" stroke="#8a6a48" stroke-width="3"/>
      <path d="M48 358h264" stroke="#fff" stroke-width="2" stroke-dasharray="6 6" opacity=".6"/>
      <rect x="70" y="170" width="220" height="184" rx="10" fill="url(#gWall)" stroke="#8a6a48" stroke-width="3"/>
      <rect x="118" y="196" width="124" height="150" rx="56" ry="56" fill="url(#gGlow)" stroke="#8c4a2f" stroke-width="3" class="glowPulse"/>
      <ellipse cx="180" cy="262" rx="30" ry="40" fill="#fff6d0" opacity=".7"/>
      <ellipse cx="180" cy="244" rx="16" ry="16" fill="#fff9e2" opacity=".8"/>
      <rect x="140" y="320" width="80" height="26" rx="6" fill="#b5523a" stroke="#7a3322" stroke-width="2.5"/>
      <path d="M148 330h64" stroke="#f5c75b" stroke-width="2" stroke-dasharray="4 4"/>
      <rect x="74" y="170" width="20" height="184" rx="6" fill="url(#gPil)" stroke="#8c3324" stroke-width="2.5"/>
      <rect x="266" y="170" width="20" height="184" rx="6" fill="url(#gPil)" stroke="#8c3324" stroke-width="2.5"/>
      <path d="M84 180c-6 30 6 60 0 90s6 50 0 80" stroke="#f5c75b" stroke-width="2.4" fill="none" stroke-dasharray="3 5"/>
      <path d="M276 180c-6 30 6 60 0 90s6 50 0 80" stroke="#f5c75b" stroke-width="2.4" fill="none" stroke-dasharray="3 5"/>
      <path d="M20 168 Q14 140 34 136 Q180 120 326 136 Q346 140 340 168 Q180 150 20 168Z" fill="url(#gRoof)" stroke="#7e2a1e" stroke-width="3" stroke-linejoin="round"/>
      <path d="M40 136 Q60 96 110 88 L250 88 Q300 96 320 136 Q180 120 40 136Z" fill="url(#gRoof)" stroke="#7e2a1e" stroke-width="3" stroke-linejoin="round"/>
      <path d="M34 136 Q20 110 6 100 Q24 104 40 120" fill="#e8604a" stroke="#7e2a1e" stroke-width="2.6" stroke-linejoin="round"/>
      <path d="M326 136 Q340 110 354 100 Q336 104 320 120" fill="#e8604a" stroke="#7e2a1e" stroke-width="2.6" stroke-linejoin="round"/>
      <rect x="120" y="76" width="120" height="14" rx="7" fill="#3f8a73" stroke="#2a5e4e" stroke-width="2.4"/>
      <circle cx="180" cy="68" r="10" fill="#f3c74e" stroke="#9b6a28" stroke-width="2.4"/>
      <path d="M60 120 Q180 104 300 120" stroke="#ffd7b0" stroke-width="2" fill="none" stroke-dasharray="5 6" opacity=".8"/>
      <rect x="148" y="142" width="64" height="24" rx="5" fill="#2f5e52" stroke="#f3c74e" stroke-width="2"/>
      <text x="180" y="159" text-anchor="middle" font-size="14" fill="#f8d36a" letter-spacing="3">福德祠</text>
      ${[50, 310].map(x => `<line x1="${x}" y1="160" x2="${x}" y2="176" stroke="#7a5230" stroke-width="2"/><ellipse cx="${x}" cy="194" rx="16" ry="20" fill="#e5483a" stroke="#8c2a1e" stroke-width="2.5"/><path d="M${x-15} 194h30" stroke="#f3c74e" stroke-width="2.4"/><rect x="${x-6}" y="172" width="12" height="5" rx="2" fill="#f3c74e"/><rect x="${x-6}" y="211" width="12" height="5" rx="2" fill="#f3c74e"/>`).join('')}
      <g id="burner">
        <path d="M140 372 Q140 400 180 402 Q220 400 220 372Z" fill="url(#gBz)" stroke="#6e4a1a" stroke-width="3"/>
        <rect x="134" y="364" width="92" height="12" rx="6" fill="#e2b45c" stroke="#6e4a1a" stroke-width="2.6"/>
        <path d="M150 400l-6 14M210 400l6 14" stroke="#6e4a1a" stroke-width="4" stroke-linecap="round"/>
      </g>
      <g id="incense"></g>
      <g id="lotTube" transform="translate(292 300)">
        <g id="tubeInner"><path d="M-16 0 L-12 56 L12 56 L16 0Z" fill="#c9853d" stroke="#6e4a1a" stroke-width="2.6"/>
        ${[-10,-5,0,5,10].map((x,i) => `<rect x="${x-1.8}" y="${-22 - (i%2)*6}" width="3.6" height="30" rx="1.5" fill="#e9c27a" stroke="#8a5a2a" stroke-width="1"/>`).join('')}
        <path d="M-16 0 L16 0" stroke="#6e4a1a" stroke-width="2.6"/><path d="M-13 20h26M-12 38h24" stroke="#f3d08a" stroke-width="2" stroke-dasharray="3 3"/></g>
      </g>
      <g id="bwaArea"></g>
    </svg>`;
  }
  function busyWrap(fn){ if (busy) return; busy = true; fn(() => busy = false); }

  $('#bIncense').onclick = () => busyWrap(done => {
    A.unlock(); A.bell();
    $('#incense').innerHTML = [-14, 0, 14].map((dx, i) => `<line x1="${180+dx}" y1="368" x2="${180+dx*1.3}" y2="322" stroke="#a5523a" stroke-width="2.6" stroke-linecap="round"/><circle cx="${180+dx*1.3}" cy="322" r="2.6" fill="#ff7b3a"/>
      <ellipse class="smoke" style="animation-delay:${i*0.7}s" cx="${180+dx*1.3}" cy="310" rx="7" ry="11" fill="#fff" opacity=".6"/>
      <ellipse class="smoke" style="animation-delay:${i*0.7 + 1.5}s" cx="${180+dx*1.3 + 4}" cy="306" rx="6" ry="10" fill="#fff" opacity=".5"/>`).join('');
    $('#tMsg').innerHTML = incensed ? '香還在燒，煙慢慢往上飄。' : '點了三炷香，跟土地公打聲招呼：<br>「今天平平安安上山了，謝謝照顧。」';
    incensed = true; setTimeout(done, 600);
  });

  // 擲筊：flat = 平面朝上（陽），round = 凸面朝上（陰）
  function bwaSvg(i, face, phase){
    const x = 110 + i*140, y = 432;
    const flat = face === 'flat';
    return `<g class="bwa" id="bw${i}" style="transform-origin:${x}px ${y}px">
      <path d="M${x-26} ${y} Q${x} ${flat ? y-30 : y-36} ${x+26} ${y} Q${x} ${y-10} ${x-26} ${y}Z" fill="${flat ? '#e8604a' : '#c43d2c'}" stroke="#7e2a1e" stroke-width="2.6" stroke-linejoin="round"/>
      ${flat ? `<path d="M${x-20} ${y-3} Q${x} ${y-12} ${x+20} ${y-3}" stroke="#f7a08a" stroke-width="2" fill="none"/>` : `<path d="M${x-14} ${y-18} Q${x} ${y-28} ${x+12} ${y-20}" stroke="#ff9a82" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>`}
    </g>`;
  }
  function tossBwa(cb){
    A.unlock();
    const r = Math.random(), res = r < 0.5 ? 'holy' : r < 0.75 ? 'laugh' : 'yin';
    const faces = res === 'holy' ? (Math.random() < 0.5 ? ['flat','round'] : ['round','flat']) : res === 'laugh' ? ['flat','flat'] : ['round','round'];
    const area = $('#bwaArea');
    area.innerHTML = bwaSvg(0, 'round') + bwaSvg(1, 'round');
    [0,1].forEach(i => { const el = $('#bw' + i); el.animate([
      { transform:'translate(0,0) rotate(0)' }, { transform:`translate(${(i?1:-1)*10}px,-150px) rotate(${i ? 540 : -500}deg)`, offset:0.45 },
      { transform:`translate(${(i?1:-1)*18}px,0) rotate(${i ? 1080 : -1000}deg)`, offset:0.85 }, { transform:`translate(${(i?1:-1)*20}px,-8px) rotate(${i ? 1080 : -1000}deg)`, offset:0.92 },
      { transform:`translate(${(i?1:-1)*20}px,0) rotate(${i ? 1080 : -1000}deg)` } ], { duration:1100, easing:'ease-in-out', fill:'forwards' }); });
    A.clack(0.92); A.clack(1.0);
    setTimeout(() => { area.innerHTML = bwaSvg(0, faces[0]).replace(/translate\(0/, '') + bwaSvg(1, faces[1]);
      [0,1].forEach(i => $('#bw' + i).style.transform = `translate(${(i?1:-1)*20}px,0)`);
      cb(res); }, 1120);
  }
  const BWA_TXT = {
    holy:'<b style="color:#c13f2e">聖筊</b>：一平一凸，代表「好喔，可以」。',
    laugh:'<b style="color:#c9853d">笑筊</b>：兩個平面朝上，神明在笑，<br>可能是答案你心裡早就知道了，或問題再想清楚一點。',
    yin:'<b style="color:#6a5040">陰筊</b>：兩個凸面朝上，代表「不太適合」，<br>換個方式或換個時間再問看看。'
  };
  $('#bBwa').onclick = () => busyWrap(done => {
    if (lotState && lotState.need) { confirmLot(done); return; }
    $('#tMsg').textContent = '筊杯丟出去了…';
    tossBwa(res => {
      bwaStreak = res === 'holy' ? bwaStreak + 1 : 0;
      let msg = BWA_TXT[res];
      if (bwaStreak >= 3) { msg += '<br>✦ 連續三個聖筊！今天運氣真的很好 ✦'; A.chime(); const r = $('#bBwa').getBoundingClientRect(); sparks(r.left + r.width/2, r.top - 60, 20); bwaStreak = 0; }
      else if (res === 'holy') A.sparkle();
      $('#tMsg').innerHTML = msg; done();
    });
  });
  $('#bLot').onclick = () => busyWrap(done => {
    A.unlock();
    if (lotState && lotState.need) { $('#tMsg').innerHTML = `已經抽到第 ${lotState.no + 1} 支了，<br>請先擲筊問問看是不是這支。`; done(); return; }
    $('#tMsg').textContent = '搖啊搖…';
    const tube = $('#tubeInner'); tube.classList.remove('shake'); void tube.offsetWidth; tube.classList.add('shake'); A.rattle();
    setTimeout(() => {
      const no = Math.floor(Math.random() * SX.FORTUNES.length);
      lotState = { no, need:true, tries:(lotState ? lotState.tries : 0) };
      $('#tubeInner').insertAdjacentHTML('beforeend', `<g id="stick"><rect x="-2.5" y="-60" width="5" height="40" rx="2" fill="#f2d28d" stroke="#8a5a2a" stroke-width="1.2"/><text x="0" y="-66" text-anchor="middle" font-size="11" fill="#a8362a">${no + 1}</text></g>`);
      $('#tMsg').innerHTML = `掉出一支籤：<b>${SX.FORTUNES[no].no}</b><br>按「擲筊」問問看是不是這支。`;
      tube.classList.remove('shake'); done();
    }, 1300);
  });
  function confirmLot(done){
    $('#tMsg').textContent = '請問是這一支嗎？';
    tossBwa(res => {
      lotState.tries++;
      if (res === 'holy' || lotState.tries >= 3) {
        const f = SX.FORTUNES[lotState.no]; lotState = null; const s = $('#stick'); if (s) s.remove();
        if (!SV.lots.includes(SX.FORTUNES.indexOf(f))) SV.lots.push(SX.FORTUNES.indexOf(f)); save();
        A.chime();
        $('#tMsg').innerHTML = res === 'holy' ? '聖筊！就是這支籤。' : '神明說：就這支吧，好好收著。';
        setTimeout(() => showLot(f), 500);
      } else {
        lotState.need = false; const s = $('#stick'); if (s) s.remove();
        $('#tMsg').innerHTML = BWA_TXT[res] + '<br>不是這支，再求一次籤吧。';
      }
      done();
    });
  }
  function lotHtml(f){ return `<div class="lotCard"><div class="no">${f.no}</div><div class="rk">${f.rank}</div>
    <div class="poem">${f.poem.join('<br>')}</div><div class="say">${f.say}</div><div class="tw">「${f.tw}」</div></div>`; }
  function showLot(f){ modal(`<h3>你的籤詩</h3>${lotHtml(f)}<div class="mBtns"><button class="cbtn go" id="lOk">收進籤詩冊</button></div>`); $('#lOk').onclick = () => { A.pop(); $('#modal').classList.remove('on'); }; }

  function stampSvg(id, date){
    const m = SX.M[id];
    return `<svg viewBox="0 0 100 100"><g transform="rotate(-8 50 50)" opacity=".9">
      <circle cx="50" cy="50" r="44" fill="none" stroke="#c8402f" stroke-width="4"/><circle cx="50" cy="50" r="38" fill="none" stroke="#c8402f" stroke-width="1.5" stroke-dasharray="3 3"/>
      <path d="M22 62 L38 38 L48 50 L60 30 L78 62Z" fill="#c8402f" opacity=".85"/>
      <text x="50" y="80" text-anchor="middle" font-size="15" fill="#c8402f" font-family="Huninn,sans-serif">${m.name}</text>
      <text x="50" y="25" text-anchor="middle" font-size="8.5" fill="#c8402f">${(date || '').replace(/\//g,'.')}</text></g></svg>`;
  }
  $('#bStamp').onclick = () => busyWrap(done => {
    A.unlock(); A.stamp();
    const id = 'xiangshan', date = SV.stamps[id] || new Date().toLocaleDateString('zh-TW');
    SV.stamps[id] = date; save();
    modal(`<h3>集印帳</h3><div style="width:190px;margin:0 auto 14px;animation:pop .4s cubic-bezier(.34,1.8,.5,1)">${stampSvg(id, date)}</div>
      <p class="summitBig">蓋好了！集印帳裡可以看到。</p><div class="mBtns"><button class="cbtn go" id="sOk">好</button></div>`);
    $('#sOk').onclick = () => { A.pop(); $('#modal').classList.remove('on'); };
    done();
  });

  // ───────── 相簿 ─────────
  let albumTab = 'photos';
  $$('.tab').forEach(b => b.onclick = () => { A.pop(); albumTab = b.dataset.tab; $$('.tab').forEach(x => x.classList.toggle('on', x === b)); renderAlbum(); });
  function renderAlbum(){
    const body = $('#albumBody');
    if (albumTab === 'photos') {
      if (!SV.photos.length) { body.innerHTML = '<div class="empty">還沒有照片。<br>每走 500 公尺會自動拍一張拍立得。</div>'; return; }
      let html = '';
      SX.MOUNTAINS.forEach(m => { const ps = SV.photos.filter(p => p.id === m.id); if (!ps.length) return;
        html += `<div class="grp">${m.name}</div><div class="grid">` + ps.map((p, i) => `<div class="pol" style="--rot:${(i%3-1)*1.5}deg;transform:rotate(var(--rot))"><img src="${p.img}"><p>${p.cap}</p></div>`).join('') + '</div>'; });
      body.innerHTML = html; stagger(body, '.pol');
    } else if (albumTab === 'stamps') {
      body.innerHTML = '<div class="stamps">' + SX.MOUNTAINS.map(m => `<div class="stampSlot">${SV.stamps[m.id] ? stampSvg(m.id, SV.stamps[m.id]) : m.name}</div>`).join('') + '</div>'; stagger(body, '.stampSlot');
    } else {
      if (!SV.lots.length) { body.innerHTML = '<div class="empty">還沒有籤詩。<br>爬完象山，到福德祠求一支吧。</div>'; return; }
      body.innerHTML = SV.lots.map(i => { const f = SX.FORTUNES[i]; return `<div class="lotItem" data-lot="${i}"><span><b>${f.no}</b>　${f.poem[0]}</span><span>${f.rank}</span></div>`; }).join(''); stagger(body, '.lotItem');
      $$('.lotItem').forEach(el => el.onclick = () => { A.pop(); const f = SX.FORTUNES[+el.dataset.lot]; modal(`${lotHtml(f)}<div class="mBtns"><button class="cbtn" id="lOk2">關閉</button></div>`); $('#lOk2').onclick = () => $('#modal').classList.remove('on'); });
    }
  }

  // ───────── 設定 ─────────
  let gpsWatch = null, gpsPrev = null, gpsTotal = 0;
  function renderSettings(){
    const s = SV.set;
    $('#setBody').innerHTML = `
      <div class="setRow"><h4>音效<button class="tgl ${s.sound ? 'on' : ''}" id="sSound"></button></h4>
        <input type="range" id="sVol" min="0" max="1" step="0.05" value="${s.vol}"><p>腳步聲、鳥叫、雨聲和廟裡的鐘聲。</p></div>
      <div class="setRow"><h4>真的走路加速<button class="tgl ${s.gps ? 'on' : ''}" id="sGps"></button></h4>
        <p>開啟後會用手機定位，你真的走一公尺，遊戲裡就多走三公尺。只有遊戲畫面開著的時候才會計算，比較耗電。</p></div>
      <div class="setRow"><h4>開發者選項</h4>
        ${s.dev ? `<p>已解鎖</p><div class="devBtns">
          <button class="cbtn sm" id="dFast">${s.devOn && s.fast ? '關閉' : '開啟'}快轉 ×20</button>
          <button class="cbtn sm" id="dNext">跳到下個 500m</button>
          <button class="cbtn sm" id="dTop">直接到終點</button>
          <button class="cbtn sm" id="dFull">體力補滿</button>
          <button class="cbtn sm" id="dTemple">直接去福德祠</button>
          <button class="cbtn sm" id="dReset">清除存檔</button>
          <button class="cbtn sm" id="dLock">鎖回去</button></div>`
        : `<div class="pw"><input id="pw" type="password" inputmode="numeric" placeholder="密碼"><button class="cbtn sm" id="pwOk">解鎖</button></div>`}
      </div>
      <p style="text-align:center;font-size:12px;color:#a08060;margin-top:10px">山行小日子 v0.1・試玩版</p>`;
    $('#sSound').onclick = () => { s.sound = !s.sound; A.setOn(s.sound); save(); renderSettings(); if (s.sound) { A.unlock(); A.pop(); } };
    $('#sVol').oninput = e => { s.vol = +e.target.value; A.setVol(s.vol); save(); };
    $('#sVol').onchange = () => { A.unlock(); A.pop(); };
    $('#sGps').onclick = () => { s.gps = !s.gps; save(); setGps(s.gps); renderSettings(); };
    if (s.dev) {
      $('#dFast').onclick = () => { s.devOn = true; s.fast = !s.fast; save(); renderSettings(); };
      $('#dNext').onclick = () => { if (!st || !M) return toast('先開始爬一座山'); st.dist = Math.min(M.dist - 1, (Math.floor(st.dist / 500) + 1) * 500 - 2); st.stam = 100; st.sleep = false; go('climb'); };
      $('#dTop').onclick = () => { if (!st || !M) return toast('先開始爬一座山'); st.dist = M.dist - 3; st.ms = Math.floor((M.dist - 1) / 500) * 500; st.stam = 100; st.sleep = false; go('climb'); };
      $('#dFull').onclick = () => { if (st) { st.stam = 100; st.sleep = false; st.rest = false; } toast('體力滿了'); };
      $('#dTemple').onclick = () => openTemple();
      $('#dReset').onclick = () => { if (confirm('確定要清除所有存檔嗎？')) { localStorage.removeItem(KEY); location.reload(); } };
      $('#dLock').onclick = () => { s.dev = false; s.devOn = false; s.fast = false; save(); renderSettings(); };
    } else {
      $('#pwOk').onclick = async () => {
        const v = $('#pw').value, h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v + 'sx'));
        const hex = [...new Uint8Array(h)].map(b => b.toString(16).padStart(2,'0')).join('');
        if (hex === DEV_HASH) { s.dev = true; s.devOn = true; save(); renderSettings(); toast('開發者選項已解鎖'); } else { toast('密碼不對喔'); const ip = $('#pw'); ip.classList.add('bad'); ip.parentNode.classList.remove('shakeX'); void ip.offsetWidth; ip.parentNode.classList.add('shakeX'); }
      };
    }
  }
  const DEV_HASH = 'acac170fa5097902002a7e1e522ac96c9838c1193505835d2a990e0cd7917fef';
  function setGps(on){
    if (gpsWatch !== null) { navigator.geolocation.clearWatch(gpsWatch); gpsWatch = null; }
    $('#gpsTag').classList.toggle('on', on);
    if (!on) return;
    if (!navigator.geolocation) { toast('這支手機不支援定位'); return; }
    $('#gpsTag').textContent = '定位中…';
    gpsWatch = navigator.geolocation.watchPosition(pos => {
      const c = pos.coords; if (c.accuracy > 35) { $('#gpsTag').textContent = '定位訊號弱'; return; }
      if (gpsPrev) {
        const R = 6371000, dLa = (c.latitude - gpsPrev.latitude) * Math.PI/180, dLo = (c.longitude - gpsPrev.longitude) * Math.PI/180;
        const a = Math.sin(dLa/2)**2 + Math.cos(c.latitude*Math.PI/180) * Math.cos(gpsPrev.latitude*Math.PI/180) * Math.sin(dLo/2)**2;
        const d = 2 * R * Math.asin(Math.sqrt(a));
        if (d >= 3 && d < 200) { gpsTotal += d; if (st && M && screen === 'climb' && !arrived && !paused) { st.dist = Math.min(M.dist, st.dist + d * 3); } }
        if (d < 3) return;
      }
      gpsPrev = c; $('#gpsTag').textContent = `真的走了 ${Math.round(gpsTotal)} m`;
    }, () => { toast('沒有拿到定位權限'); SV.set.gps = false; save(); $('#gpsTag').classList.remove('on'); }, { enableHighAccuracy:true, maximumAge:5000 });
  }

  // ───────── 啟動 ─────────
  catchUp();
  renderMap();
  if (SV.set.gps) setGps(true);
  if (SV.cur && SX.M[SV.cur]) { const p = P(SV.cur); if (p.dist > 0 && p.dist < SX.M[SV.cur].dist) setTimeout(() => { selId = SV.cur; renderMap(); showRoute(SV.cur); }, 400); }
  requestAnimationFrame(loop);
  document.addEventListener('gesturestart', e => e.preventDefault());
  let lastTouch = 0; document.addEventListener('touchend', e => { const n = Date.now(); if (n - lastTouch < 320) e.preventDefault(); lastTouch = n; }, { passive:false });
  window.SXG = { go, startClimb, openTemple, tick:(n = 30) => { for (let i=0;i<n;i++) frame(0.033); }, get st(){ return st; }, SV };
})();

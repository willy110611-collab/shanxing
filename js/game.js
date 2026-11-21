// 山行小日子 — 主程式（第二版：手繪木框、真實步調、休息點、奇遇、寶物、任務）
(function(){
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const C = SX.clay, A = SX.audio, SC = SX.scene, HUD = SX.hud, WM = SX.worldmap;
  const DRAIN = 700;          // 走多少公尺用掉全部體力
  const REST = 5;             // 休息時每秒回復體力
  const NAP = 4;              // 打瞌睡時每秒回復體力
  const BOOST = 2.2;          // 長按加速倍率
  const HOLD_MS = 180;        // 按多久算長按
  const OFFLINE_CAP = 48 * 3600;
  const KEY = 'shanxing-save-v1';
  const INK = '#3a2a20';
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const today = () => new Date().toLocaleDateString('zh-TW');
  const altAt = (m, f) => m.startAlt + (m.alt - m.startAlt) * clamp(f, 0, 1);
  const fmtMin = n => n >= 60 ? `${Math.floor(n / 60)} 小時${n % 60 ? ` ${n % 60} 分` : ''}` : `${n} 分`;
  const baseSpeed = m => m.dist / (m.recMin * 60);   // 山友實際紀錄的步調（公尺／秒）

  // ───────── 存檔 ─────────
  // 資料形狀先照之後接後端的樣子放：userPhotos、cairns、bag、quests 都是可以直接同步的清單／對照表
  const blank = () => ({ cur:null, prog:{}, done:{}, photos:[], stamps:{}, lots:[],
    bag:{}, quests:{}, titles:[], title:null, pets:['shiba'], pet:null, userPhotos:[], cairns:{}, unlockAll:false,
    stats:{ notes:0, rests:0, cairns:0, fog:0, night:0, rain:0, nofast:0, away:0, deer:0, magpie:{} },
    set:{ sound:true, vol:0.7, gps:false, dev:false, devOn:false, fast:false } });
  let SV = blank();
  const KEY_IMG = KEY + '-img';   // 照片很大，另存一個 key，只有照片變動時才重寫（避免每 10 秒序列化好幾 MB）
  let imgDirty = false;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const b = blank(), o = JSON.parse(raw) || {};
      SV = Object.assign(blank(), o);
      imgDirty = true;   // 舊存檔的照片還在主 key 裡：第一次存檔時搬到 KEY_IMG
      try { const ri = JSON.parse(localStorage.getItem(KEY_IMG) || 'null'); if (ri) { if (Array.isArray(ri.photos)) SV.photos = ri.photos; if (Array.isArray(ri.userPhotos)) SV.userPhotos = ri.userPhotos; imgDirty = false; } } catch(e){}
      SV.set = Object.assign(b.set, o.set); SV.stats = Object.assign(b.stats, o.stats);
      ['photos','lots','titles','pets','userPhotos'].forEach(k => { if (!Array.isArray(SV[k])) SV[k] = b[k]; });
      ['prog','done','stamps','bag','quests','cairns'].forEach(k => { if (!SV[k] || typeof SV[k] !== 'object') SV[k] = {}; });
      if (!SV.stats.magpie || typeof SV.stats.magpie !== 'object') SV.stats.magpie = {};
      if (!SV.pets.includes('shiba')) SV.pets.unshift('shiba');
      if (SV.cur && !SX.M[SV.cur]) SV.cur = null;
    }
  } catch(e){ SV = blank(); }
  let saveWarned = false;
  const skipImg = function(k, v){ return (this === SV && (k === 'photos' || k === 'userPhotos')) ? undefined : v; };
  let resetting = false;
  function save(){
    if (resetting) return;
    for (let i = 0; i < 8; i++) {
      try {
        if (imgDirty) { localStorage.setItem(KEY_IMG, JSON.stringify({ photos:SV.photos, userPhotos:SV.userPhotos })); imgDirty = false; }
        localStorage.setItem(KEY, JSON.stringify(SV, skipImg)); return;
      }
      catch(e){ if (SV.photos.length > 2) { SV.photos.splice(0, 3); imgDirty = true; } else break; }   // 空間不夠：先丟最舊的拍立得
    }
    if (!saveWarned) { saveWarned = true; toast('手機空間滿了，進度可能存不下來'); }
  }
  A.on = SV.set.sound; A.vol = SV.set.vol;

  const newProg = () => ({ dist:0, stam:100, temp:100, sleep:false, rest:false, last:Date.now(), ms:0, fast:false, fin:false, got:{}, stopAt:null, restType:'bench', encT:200 + Math.random() * 160 });
  const P = id => { const p = SV.prog[id] || (SV.prog[id] = newProg()), d = newProg(); for (const k in d) if (p[k] === undefined) p[k] = d[k]; if (!p.got || typeof p.got !== 'object') p.got = {}; ['dist','stam','temp','ms','last','encT'].forEach(k => { if (typeof p[k] !== 'number' || !isFinite(p[k])) p[k] = d[k]; }); return p; };

  // ───────── 畫面切換 ─────────
  let screen = 'map', prevScreen = 'map';
  function go(name){
    if (name === screen) return;
    if (name === 'album' || name === 'settings') prevScreen = screen;
    if (screen === 'map') { try { WM.stop(); } catch(e){} }
    ptrHold = false; keyHold = false;
    $$('.scr').forEach(s => s.classList.remove('on'));
    $('#scr' + name[0].toUpperCase() + name.slice(1)).classList.add('on');
    screen = name;
    if (name === 'map') renderMap();
    if (name === 'climb') { SC.resize(); catchUp(); }
    if (name === 'album') renderAlbum();
    if (name === 'settings') renderSettings();
    moodNow();
  }
  document.addEventListener('click', e => {
    const g = e.target.closest('[data-go]'); if (g) { A.unlock(); A.pop(); if (g.dataset.go === 'bag') openBag(); else go(g.dataset.go); }
    const b = e.target.closest('[data-back]'); if (b) { A.pop(); go(prevScreen === 'climb' && !st ? 'map' : prevScreen); }
  });

  function toast(msg, ms = 2200){ const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), ms); }
  function sparks(x, y, n = 10){
    const app = $('#app'), r = app.getBoundingClientRect();
    for (let i=0;i<n;i++){ const s = document.createElement('div'); s.className = 'spark';
      const col = ['#ffd166','#ff8fa3','#8fd694','#9ad0f5'][i%4];
      s.innerHTML = `<svg viewBox="0 0 20 20"><path d="M10 0l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="${col}" stroke="${INK}" stroke-width="1"/></svg>`;
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
    h.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 21C5 15.5 2 12.5 2 8.5 2 5.4 4.4 3 7.4 3c1.9 0 3.6 1 4.6 2.5C13 4 14.7 3 16.6 3 19.6 3 22 5.4 22 8.5c0 4-3 7-10 12.5z" fill="#ff7b93" stroke="${INK}" stroke-width="1.6"/><ellipse cx="7.5" cy="7.5" rx="2.2" ry="1.4" fill="#fff" opacity=".6" transform="rotate(-30 7.5 7.5)"/></svg>`;
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

  function modal(html){ const c = $('#mCard'); c.innerHTML = html; c.scrollTop = 0; $('#modal').classList.add('on'); paused = true; }
  function closeModal(){ $('#modal').classList.remove('on'); paused = false; if (st && screen === 'climb') st.last = Date.now(); }

  // ───────── 天氣 ─────────
  let wxOverride = null;
  const WX_NAMES = { sunny:'晴', cloudy:'多雲', fog:'起霧', rain:'下雨' };
  const TIME_NAMES = { dawn:'清晨', day:'', dusk:'黃昏', night:'夜晚' };
  const WXD = { sunny:'clear', cloudy:'cloud', fog:'fog', rain:'rain' };   // 對應 data.js 奇遇用的天氣名稱
  const wxText = w => (TIME_NAMES[w.time] ? TIME_NAMES[w.time] + '・' : '') + WX_NAMES[w.kind];
  function calcWx(id){
    const d = new Date(), h = d.getHours() + d.getMinutes()/60;
    const time = h >= 5 && h < 7 ? 'dawn' : h >= 7 && h < 17 ? 'day' : h >= 17 && h < 18.6 ? 'dusk' : 'night';
    id = id || SV.cur || 'x';
    const rr = C.rng(C.hash(id + Math.floor(Date.now() / 1200000)))();
    const fogBias = SX.M[id] && SX.M[id].theme.fog ? 0.15 : 0;
    const kind = rr < 0.16 ? 'rain' : rr < 0.3 + fogBias ? 'fog' : rr < 0.52 + fogBias ? 'cloudy' : 'sunny';
    return { kind, time };
  }
  let wx = calcWx();
  const WX_CYCLE = [{kind:'sunny',time:'day'},{kind:'cloudy',time:'day'},{kind:'fog',time:'day'},{kind:'rain',time:'day'},{kind:'sunny',time:'dusk'},{kind:'sunny',time:'night'},{kind:'rain',time:'night'},{kind:'sunny',time:'dawn'}];
  function cycleWx(){
    const i = WX_CYCLE.findIndex(w => w.kind === wx.kind && w.time === wx.time);
    wxOverride = WX_CYCLE[(i + 1) % WX_CYCLE.length]; wx = wxOverride; moodNow();
    toast('天氣改成：' + (wxText(wx) || '晴'));
  }
  function moodNow(){
    const sc = screen === 'album' || screen === 'settings' ? prevScreen : screen;
    A.mood({ screen: sc, wx, water: M && (M.theme.lake || M.id === 'taiping') });
  }
  document.addEventListener('pointerdown', () => { A.unlock(); if (!A._mood) moodNow(); }, { passive:true });
  // 小天氣圖示（資訊卡用）
  function wxIcon(cv, kind, time){
    const d = Math.min(2, window.devicePixelRatio || 1), s = 34; cv.width = cv.height = s * d;
    const c = cv.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, s, s);
    c.lineJoin = c.lineCap = 'round'; c.strokeStyle = INK; c.lineWidth = 1.8;
    const clear = kind === 'sunny', x = clear ? 17 : 12, y = clear ? 17 : 11, r = clear ? 7.5 : 6;
    if (clear || kind === 'cloudy') {
      if (time === 'night') {
        c.fillStyle = '#ffe9a8'; c.beginPath(); c.arc(x, y, r, 0.7, 5.3);
        c.quadraticCurveTo(x + r * 0.1, y, x + r * Math.cos(0.7), y + r * Math.sin(0.7)); c.closePath(); c.fill(); c.stroke();
      } else {
        c.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.2832; c.moveTo(x + Math.cos(a) * (r + 2.5), y + Math.sin(a) * (r + 2.5)); c.lineTo(x + Math.cos(a) * (r + 5), y + Math.sin(a) * (r + 5)); } c.stroke();
        c.fillStyle = time === 'dusk' ? '#f7a35c' : '#ffd166'; c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill(); c.stroke();
      }
    }
    if (!clear) {
      c.fillStyle = kind === 'rain' ? '#cfd8de' : '#fffaf0'; c.beginPath();
      c.arc(12, 20, 6, Math.PI * 0.5, Math.PI * 1.5); c.arc(17, 15.5, 6.5, Math.PI, Math.PI * 1.9); c.arc(23, 20.5, 5.5, Math.PI * 1.4, Math.PI * 0.5);
      c.closePath(); c.fill(); c.stroke();
      if (kind === 'rain') { c.strokeStyle = '#4f9fd6'; c.beginPath(); [11, 17, 23].forEach(px => { c.moveTo(px, 28.5); c.lineTo(px - 1.5, 32.5); }); c.stroke(); }
      if (kind === 'fog') { c.strokeStyle = '#9aa7ad'; c.beginPath(); c.moveTo(6, 29); c.lineTo(28, 29); c.moveTo(9, 32.5); c.lineTo(25, 32.5); c.stroke(); }
    }
  }

  // ───────── 地圖 ─────────
  let selId = null, mapInit = false;
  // 解鎖規則：難度 1–2 一開始就開放；其他要先登頂任何一座「難度 ≥ 自己 − 1」的山
  const unlocked = m => m.diff <= 2 || SV.unlockAll || SX.MOUNTAINS.some(x => SV.done[x.id] && x.diff >= m.diff - 1);
  function renderMap(){
    const locked = {}, photos = {};
    SX.MOUNTAINS.forEach(m => { if (!unlocked(m)) locked[m.id] = true; });
    SV.userPhotos.forEach(p => { photos[p.mountainId] = (photos[p.mountainId] || 0) + 1; });
    try {
      WM.setData({ mountains:SX.MOUNTAINS, coast:SX.COAST, ridge:SX.RIDGE, done:SV.done, prog:SV.prog, current:SV.cur, locked, photos });
      WM.start(); if (!mapInit) { mapInit = true; WM.reset(); }
    } catch(e){ console.error('worldmap', e); }
  }
  const hideRoute = () => { $('#routeCard').classList.remove('on'); selId = null; try { WM.clearSelection(); } catch(e){} };
  try {
    WM.init($('#mapWrap'));
    WM.onSelect(id => { A.unlock(); A.pop(); selId = id; showRoute(id); });
    WM.onBackground(hideRoute);
  } catch(e){ console.error('worldmap', e); }

  const PET_NONE = { id:'', name:'自己走', desc:'一個人慢慢走，聽自己的腳步聲。', unlocked:true };
  const hasPet = p => !p.id || p.unlocked || SV.pets.includes(p.id);
  function petSvg(id){
    const o = `stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"`, eyes = `<circle cx="20" cy="27" r="1.9" fill="${INK}"/><circle cx="32" cy="27" r="1.9" fill="${INK}"/>`;
    const body = {
      '': `<circle cx="26" cy="30" r="12" fill="#f6cba6" ${o}/><path d="M10 24q16-9 32 0l-3-10q-13-8-26 0z" fill="#f7e8c0" ${o}/>${eyes}<path d="M22 34q4 3 8 0" fill="none" ${o}/>`,
      shiba: `<path d="M11 20l3-12 9 7M41 20l-3-12-9 7" fill="#e9a25a" ${o}/><circle cx="26" cy="28" r="15" fill="#e9a25a" ${o}/><path d="M14 31q12 16 24 0q-4-6-12-2q-8-4-12 2z" fill="#fff4dc" ${o}/>${eyes}<ellipse cx="26" cy="32" rx="2.4" ry="1.7" fill="${INK}"/>`,
      bear: `<circle cx="13" cy="15" r="5.5" fill="#4a4040" ${o}/><circle cx="39" cy="15" r="5.5" fill="#4a4040" ${o}/><circle cx="26" cy="28" r="15" fill="#4a4040" ${o}/><ellipse cx="26" cy="33" rx="7" ry="5.5" fill="#d9c3a0" ${o}/><circle cx="20" cy="25" r="1.9" fill="#fff"/><circle cx="32" cy="25" r="1.9" fill="#fff"/><ellipse cx="26" cy="31.5" rx="2.4" ry="1.7" fill="${INK}"/>`,
      leopardcat: `<path d="M12 20l1-12 9 6M40 20l-1-12-9 6" fill="#c9a26a" ${o}/><circle cx="26" cy="28" r="15" fill="#c9a26a" ${o}/><path d="M23 14v8M29 14v8" stroke="#fff7e4" stroke-width="2.2" stroke-linecap="round"/><circle cx="15" cy="32" r="1.5" fill="${INK}"/><circle cx="37" cy="32" r="1.5" fill="${INK}"/><circle cx="17" cy="37" r="1.3" fill="${INK}"/><circle cx="35" cy="37" r="1.3" fill="${INK}"/>${eyes}<path d="M24 33h4l-2 2.4z" fill="#d9788a" ${o}/>`,
      magpie: `<path d="M34 34q14 4 14 12q-10 0-18-6z" fill="#4f86c8" ${o}/><ellipse cx="25" cy="32" rx="13" ry="11" fill="#5c9ad8" ${o}/><circle cx="19" cy="20" r="9" fill="#3d3a44" ${o}/><path d="M11 20l-8 2 8 3z" fill="#e2573f" ${o}/><circle cx="17" cy="18.5" r="2" fill="#ffe27a" stroke="${INK}" stroke-width="1"/>`
    }[id || ''] || '';
    return `<svg viewBox="0 0 52 52">${body}</svg>`;
  }
  function showRoute(id){
    const m = SX.M[id]; if (!m) return;
    const p = SV.prog[id], done = SV.done[id] || 0, ok = unlocked(m);
    const going = p && p.dist > 0 && p.dist < m.dist && !p.fin;
    const w = wxOverride || calcWx(id), nPh = SV.photos.filter(x => x.id === id).length, nUp = SV.userPhotos.filter(x => x.mountainId === id).length;
    const pet = SX.PETS.find(x => x.id === SV.pet) || PET_NONE;
    const stars = [1,2,3,4,5].map(i => `<i${i <= m.diff ? '' : ' class="off"'}></i>`).join('');
    const card = $('#routeCard');
    card.innerHTML = `<button class="rc-x" id="rcX">✕</button>
      <div class="ic-h"><b>${m.name}</b><span class="ic-alt">${m.area}・${m.alt.toLocaleString('en-US')} m</span><span class="stars">${stars}</span></div>
      <div class="ic-wx paper"><canvas id="rcWx"></canvas><span>現在山上：${wxText(w) || '晴'}${done ? `　已登頂 ${done} 次` : ''}</span></div>
      <div class="ic-meta">
        <div class="paper"><small>路程</small><b>${(m.dist/1000).toFixed(1)} km</b></div>
        <div class="paper"><small>山友實際時間</small><b>${fmtMin(m.recMin)}</b></div>
        <div class="paper"><small>收集的照片</small><b>${nPh} 張${nUp ? `＋${nUp}` : ''}</b></div>
        <div class="paper"><small>沿途地標</small><b>${(m.waypoints || []).length} 處</b></div>
      </div>
      <div class="rc-feat"><em>紀錄：</em>${m.recNote}</div>
      <div class="rc-feat"><em>沿途：</em>${m.feat}</div>
      <div class="rc-feat"><em>終點：</em>${m.end}${m.temple ? '（可以擲筊、求籤）' : ''}</div>
      ${ok ? `<div class="rc-btns"><button class="cbtn sm" id="rcPet">同行夥伴：${pet.name}</button></div>
        <div class="rc-btns"><button class="cbtn go" id="rcGo">${going ? `繼續爬（${(p.dist/1000).toFixed(2)} km）` : done ? '再爬一次' : '出發登山'}</button></div>`
      : `<div class="rc-feat"><em>還沒開放：</em>先登頂任何一座難度 ${m.diff - 1} 顆星以上的山，這裡就會開放。</div>
        <div class="rc-btns"><button class="cbtn go" disabled>尚未解鎖</button></div>`}`;
    card.classList.add('on');
    wxIcon($('#rcWx'), w.kind, w.time);
    $('#rcX').onclick = e => { e.stopPropagation(); hideRoute(); };
    if (ok) {
      $('#rcPet').onclick = () => openPets(id);
      $('#rcGo').onclick = () => { A.unlock(); A.chime(); startClimb(id); };
    }
  }
  function openPets(backId){
    const list = [PET_NONE].concat(SX.PETS);
    modal(`<h3>要帶誰一起走？</h3><div class="petPick">${list.map(p => `<button class="pet${(SV.pet || '') === p.id ? ' on' : ''}" data-pet="${p.id}"${hasPet(p) ? '' : ' style="filter:grayscale(1);opacity:.55"'}>${petSvg(p.id)}${p.name}</button>`).join('')}</div>
      <p class="summitBig" id="petMsg" style="margin-top:12px">${(list.find(p => p.id === (SV.pet || '')) || PET_NONE).desc}</p>
      <div class="mBtns"><button class="cbtn go" id="petOk">決定了</button></div>`);
    $$('#mCard .pet').forEach(b => b.onclick = () => {
      const p = list.find(x => x.id === b.dataset.pet); A.pop();
      if (!hasPet(p)) { $('#petMsg').textContent = `${p.name}還沒來：${p.unlockText || '之後才會遇到'}`; return; }
      SV.pet = p.id || null; save();
      $$('#mCard .pet').forEach(x => x.classList.toggle('on', x === b));
      $('#petMsg').textContent = p.desc + (p.id && p.id !== 'shiba' ? '（牠在步道上的樣子還在畫，先陪你在心裡走）' : '');
    });
    $('#petOk').onclick = () => { A.pop(); closeModal(); if (backId && screen === 'map') showRoute(backId); };
  }

  // ───────── 登山 ─────────
  let M = null, st = null, t = 0, arrived = false, paused = false, ptrHold = false, keyHold = false;
  let lineT = 8, coldT = 0, lastEnc = null;
  function startClimb(id, force){
    const m = SX.M[id]; if (!m) return;
    if (!force && !unlocked(m)) { toast('這座山還沒開放'); return; }
    const switching = SV.cur !== id;
    M = m; SV.cur = id; st = P(id);
    if (st.fin || st.dist >= M.dist) Object.assign(st, newProg());
    if (switching) st.last = Date.now();
    arrived = false; paused = false; ptrHold = false; keyHold = false; t = 0;
    $('#routeCard').classList.remove('on'); $('#modal').classList.remove('on');
    wx = wxOverride || calcWx(id);
    SC.setMountain(M); SC.setCairns(SV.cairns[id] || []);
    try { HUD.setRoute(M.route); buildMarks(); } catch(e){ console.error('hud', e); }
    if (screen === 'climb') catchUp(); else go('climb');
    SC.resize(); A.nextDay();
    const sc = $('#scrClimb'), ar = $('#app').getBoundingClientRect(); sc.style.setProperty('--rx', (lastTap.x - ar.left) + 'px'); sc.style.setProperty('--ry', (lastTap.y - ar.top) + 'px'); sc.classList.remove('reveal'); void sc.offsetWidth; sc.classList.add('reveal');
    $('#tapHint').classList.toggle('off', !!st.fast);
    hudTick(); save();
  }
  function buildMarks(){
    const ms = [];
    SC.props(0, M.dist).forEach(o => { if (o.type === 'bench') ms.push({ f:o.m / M.dist, type:'bench' }); });
    for (let k = 500; k < M.dist; k += 500) ms.push({ f:k / M.dist, type:'photo' });
    HUD.setMarks(ms);
  }

  // 有多冷：海拔、夜晚、雨霧、高山的風
  function chill(m, f, w){
    return Math.max(0, altAt(m, f) - 500) / 3500 * 0.5 + (w.time === 'night' ? 0.35 : w.time === 'dawn' ? 0.15 : 0)
      + (w.kind === 'rain' ? 0.4 : w.kind === 'fog' ? 0.2 : 0) + (m.theme.alpine || m.theme.snow ? 0.2 : 0);
  }
  // 往前模擬 dt 秒，回傳走了幾公尺。offline：離線補走（不會自己登頂，留最後 2 公尺給玩家看）
  function simulate(p, m, dt, boost, offline){
    if (p.sleep) { p.stam = Math.min(100, p.stam + NAP * dt); p.temp = Math.min(100, p.temp + 2 * dt); if (p.stam >= 60 && p.temp >= 50) p.sleep = false; return 0; }
    if (p.rest) { p.stam = Math.min(100, p.stam + REST * dt); p.temp = Math.min(100, p.temp + 4 * dt); if (offline && p.stam >= 100 && p.temp >= 95) p.rest = false; return 0; }
    const dev = SV.set.devOn && SV.set.fast ? 20 : 1;
    let v = baseSpeed(m) * dev; if (p.temp < 25) v *= 0.7; if (boost) v *= BOOST;
    const lim = offline ? Math.max(p.dist, m.dist - 2) : m.dist;
    let d = Math.max(0, Math.min(lim - p.dist, v * dt)), stop = false;
    if (p.stopAt != null && p.stopAt - 1 - p.dist <= d) { d = Math.max(0, p.stopAt - 1 - p.dist); stop = true; }
    p.dist += d; p.stam -= d / DRAIN * 100 / dev * (boost ? 1.8 : 1);
    p.temp = clamp(p.temp + ((boost ? 0.15 : 0) - chill(m, p.dist / m.dist, wx) * 0.08) * dt, 0, 100);
    if (stop) { p.rest = true; p.stopAt = null; p.stam = Math.max(0, p.stam); return d; }
    if (p.stam <= 0 || p.temp <= 0) { p.stam = Math.max(0, p.stam); p.sleep = true; }
    return d;
  }
  // 離線／離開畫面的時間補走（最多 48 小時，兩天一夜的大山也走得完）
  function catchUp(){
    if (!SV.cur || !SX.M[SV.cur]) return;
    const p = P(SV.cur), m = SX.M[SV.cur], now = Date.now();
    if (p.fin || (arrived && st === p)) return;
    let sec = Math.min(OFFLINE_CAP, (now - (p.last || now)) / 1000);
    p.last = now;
    if (sec < 3 || p.dist >= m.dist - 2) return;
    const before = p.dist, total = sec;
    while (sec > 0 && p.dist < m.dist - 2) { const dt = Math.min(5, sec); sec -= dt; simulate(p, m, dt, false, true); }
    if (total >= 60) {
      SV.stats.away = Math.max(SV.stats.away || 0, total / 60);
      const gained = p.dist - before;
      if (gained > 1) setTimeout(() => toast(p.dist >= m.dist - 2.5 ? '你不在的時候，已經走到山頂前面了' : `你不在的時候，自己走了 ${Math.round(gained)} 公尺`, 3200), 600);
      setTimeout(checkQuests, 1500);
    }
    save();
  }

  const cv = $('#cv'); SC.init(cv); cv.style.webkitUserSelect = 'none'; cv.style.webkitTouchCallout = 'none';
  window.addEventListener('resize', () => { if (screen === 'climb') SC.resize(); });

  // 點一下：處理道具；長按：加速
  let press = null, holdTimer = null;
  cv.addEventListener('pointerdown', e => {
    if (!st || paused) return;
    A.unlock();
    const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    press = { cx:e.clientX, cy:e.clientY, hit:SC.hitTest(x, y), long:false };
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => { if (press) { press.long = true; ptrHold = true; $('#tapHint').classList.add('off'); } }, HOLD_MS);
    try { cv.setPointerCapture(e.pointerId); } catch(_){}
  });
  const release = e => {
    clearTimeout(holdTimer);
    const p = press; press = null; ptrHold = false;
    if (!p || p.long || e.type !== 'pointerup' || !st || paused) return;
    if (Math.hypot(e.clientX - p.cx, e.clientY - p.cy) > 14) return;
    if (p.hit && p.hit.o) { A.pop(); useProp(p.hit.o, p.cx, p.cy); }
  };
  cv.addEventListener('pointerup', release); cv.addEventListener('pointercancel', release);
  cv.addEventListener('contextmenu', e => e.preventDefault());
  const isBoostKey = e => e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp';
  document.addEventListener('keydown', e => { if (isBoostKey(e) && screen === 'climb' && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName || '')) { keyHold = true; $('#tapHint').classList.add('off'); e.preventDefault(); } });
  document.addEventListener('keyup', e => { if (isBoostKey(e)) keyHold = false; });
  window.addEventListener('blur', () => { keyHold = false; ptrHold = false; });

  function useProp(o, cx, cy){
    if (!st || !M || arrived) return;
    if (o.type === 'bench' || o.type === 'view') return goRest(o);
    if (o.type === 'treasure') return pickTreasure(o, cx, cy);
    openNote(o);
  }

  // 休息點：走過去坐下，打開休息木牌
  function goRest(o){
    if (st.sleep) return say('再讓我睡一下下…');
    if (st.rest) return;
    if (o.m < st.dist - 4) return say('已經走過了，下一個再休息吧');
    st.stopAt = Math.max(st.dist + 1, o.m); st.restType = o.type;
    say(o.type === 'view' ? '去觀景台看看！' : '去那張長椅坐一下');
  }
  function onRest(){
    SV.stats.rests++; A.chime();
    say(st.restType === 'view' ? '哇，風景好漂亮' : '呼～喝口熱茶');
    $('#rsTitle').textContent = st.restType === 'view' ? '觀景台到了，慢慢看' : '坐下來喝口熱茶';
    $('#restSheet').classList.add('on');
    save(); checkQuests();
  }
  $('#rsGo').onclick = () => { if (!st) return; A.pop(); st.rest = false; $('#restSheet').classList.remove('on'); say('出發囉！'); };
  $('#rsPhoto').onclick = () => { if (st && M) takePhoto(st.dist, false, st.restType === 'view' ? '觀景台' : '休息時光'); };
  $('#rsStone').onclick = () => { if (st && M) { A.pop(); stoneGame(); } };
  $('#rsUp').onclick = () => { if (st && M) { A.pop(); pickUpload(M.id, st.dist); } };

  // 浮在休息點／寶物上方的小木牌
  const tag = $('#propTag'); let tagO = null;
  function updTag(){
    let n = null;
    if (!paused && !arrived && !st.rest && !st.sleep && st.stopAt == null) n = SC.nearby();
    if (n && n.type === 'treasure' && st.got['t' + Math.round(n.m)]) n = null;
    if (!n) { if (tagO) { tagO = null; tag.style.display = 'none'; } return; }
    if (!tagO || tagO.m !== n.m) { tag.textContent = n.type === 'bench' ? '坐一下' : n.type === 'view' ? '看風景' : '有東西！'; tag.style.display = 'block'; }
    tagO = n; tag.style.left = n.x + 'px'; tag.style.top = (n.y - 6) + 'px';
  }
  tag.onclick = e => { e.stopPropagation(); if (!tagO || !st) return; A.unlock(); A.pop(); const r = tag.getBoundingClientRect(); useProp({ type:tagO.type, m:tagO.m }, r.left + r.width / 2, r.top + r.height); };

  // 便條（樹洞）
  const notePick = o => SX.NOTES[(C.hash(M.id + o.m) + Math.floor(Date.now() / 86400000 / 3)) % SX.NOTES.length];
  function openNote(o){
    A.paper();
    const title = o.type === 'note' ? '山友留下的便條' : o.type === 'btree' ? '祈福樹上的小卡' : '笑臉疊石下壓著一張紙條';
    const days = 1 + C.hash(o.m + 'd') % 3;
    SV.stats.notes++;
    modal(`<h3>${title}</h3>
      <div class="noteP">${notePick(o)}<small>— 匿名山友・${days} 天後會風化</small></div>
      <div class="mBtns"><button class="cbtn" id="nHeart">給愛心</button><button class="cbtn" id="nClean">${o.type === 'btree' ? '澆澆水' : '清清泥'}</button></div>
      <div class="mBtns" style="margin-top:10px"><button class="cbtn go" id="nOk">繼續走</button></div>`);
    const give = (btn, kind) => { if (btn.disabled) return; btn.disabled = true; const r = btn.getBoundingClientRect(); sparks(r.left + r.width/2, r.top + r.height/2, 12); A.sparkle(); st.stam = Math.min(100, st.stam + 8); toast(kind === 'heart' ? '愛心送出了，體力 +8' : '步道變乾淨了，體力 +8'); };
    $('#nHeart').onclick = e => { const b = e.currentTarget, r = b.getBoundingClientRect(); if (!b.disabled) likeAt(r.left + r.width/2, r.top); give(b, 'heart'); };
    $('#nClean').onclick = e => give(e.currentTarget, 'clean');
    $('#nOk').onclick = () => { closeModal(); checkQuests(); };
  }

  // 台詞
  function say(txt, ms = 2600){
    const b = $('#bubble'), cp = SC.charPos();
    b.textContent = txt; b.style.left = cp.x + 'px'; b.style.top = (cp.y - 12) + 'px';
    b.classList.add('on'); clearTimeout(b._h); b._h = setTimeout(() => b.classList.remove('on'), ms);
  }

  // ───────── 寶物 ─────────
  const RAR_W = { '普通':70, '稀有':25, '傳說':5 };
  const RAR_BG = { '普通':'', '稀有':'background:linear-gradient(170deg,#eef7ff,#c4def4)', '傳說':'background:linear-gradient(170deg,#fff6cf,#f6d472)' };
  const RAR_COL = { '普通':'#cfe6b0', '稀有':'#bfdcf5', '傳說':'#ffe08a' };
  function trSvg(tr){
    const col = ['#ee8458','#6fae68','#5aa0d8','#f2c35a','#b98ad9','#e88fa8'][C.hash(tr.id) % 6], n = tr.name, o = `stroke="${INK}" stroke-linejoin="round"`;
    if (n.includes('章')) return `<svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="23" fill="#fff7e2" ${o} stroke-width="2.5"/><circle cx="30" cy="30" r="17.5" fill="none" stroke="${col}" stroke-width="2.5" stroke-dasharray="3 3"/><path d="M18 38l8-13 5 6 5-10 8 17z" fill="${col}" ${o} stroke-width="1.6"/></svg>`;
    if (/照片|一瞥|合照|留影|相片/.test(n)) return `<svg viewBox="0 0 60 60"><g transform="rotate(-5 30 30)"><rect x="10" y="8" width="40" height="46" rx="2" fill="#fff" ${o} stroke-width="2.5"/><rect x="14" y="12" width="32" height="28" fill="${col}" opacity=".55"/><path d="M14 40l10-14 7 8 6-11 9 17z" fill="${col}" ${o} stroke-width="1.5"/><circle cx="40" cy="18" r="3.5" fill="#ffe27a" ${o} stroke-width="1.2"/></g></svg>`;
    return `<svg viewBox="0 0 60 60"><g transform="rotate(5 30 30)"><rect x="8" y="14" width="44" height="33" rx="3" fill="#fff7e2" ${o} stroke-width="2.5"/><rect x="8" y="14" width="44" height="9" fill="${col}" ${o} stroke-width="2"/><path d="M14 30h20M14 36h26M14 41h14" stroke="${INK}" stroke-width="1.5" stroke-linecap="round" opacity=".55"/><path d="M43 29l1.6 3.4 3.7.5-2.7 2.6.7 3.7-3.3-1.8-3.3 1.8.7-3.7-2.7-2.6 3.7-.5z" fill="${col}" ${o} stroke-width="1.2"/></g></svg>`;
  }
  function rollTreasure(mid){
    const pool = SX.TREASURES.filter(x => x.drop === 'any' || (Array.isArray(x.drop) && x.drop.includes(mid)));
    let sum = 0; pool.forEach(x => { sum += RAR_W[x.rarity] || 30; });
    let r = Math.random() * sum;
    for (const x of pool) { r -= RAR_W[x.rarity] || 30; if (r <= 0) return x; }
    return pool[pool.length - 1] || SX.TREASURES[0];
  }
  // mode: 'show' 開寶物卡、'toast' 只跳提示、'quiet' 不提示
  function gainTreasure(tr, mode){
    if (!tr) return;
    SV.bag[tr.id] = (SV.bag[tr.id] || 0) + 1;
    if (M && tr.name.includes('紀念章')) SV.stats.magpie[M.id] = 1;
    save();
    if (mode === 'show') {
      A.sparkle(); if (tr.rarity === '傳說') { confetti(30); A.chime(); }
      modal(`<div class="encounter${tr.rarity !== '普通' ? ' rare' : ''}"><div class="ec-pic" style="animation:pop .5s cubic-bezier(.34,1.8,.5,1)">${trSvg(tr)}</div>
        <h3>${tr.name}</h3><p><span class="chip" style="background:${RAR_COL[tr.rarity] || '#fff'}">${tr.rarity}</span></p><p>${tr.desc}</p></div>
        <div class="mBtns" style="margin-top:12px"><button class="cbtn go" id="trOk">收進背包</button></div>`);
      $('#trOk').onclick = () => { A.pop(); closeModal(); checkQuests(); };
    } else if (mode === 'toast') toast(`得到「${tr.name}」`);
  }
  function pickTreasure(o, cx, cy){
    const k = 't' + Math.round(o.m);
    if (st.got[k]) return toast('這裡的寶物已經收進背包了');
    st.got[k] = 1;
    const r = cv.getBoundingClientRect(); SC.burst(cx - r.left, cy - r.top, 'star', 8); sparks(cx, cy, 14);
    gainTreasure(rollTreasure(M.id), 'show');
  }

  // ───────── 奇遇 ─────────
  function encSvg(e){
    const o = `stroke="${INK}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"`, tx = e.text;
    let g;
    if (/山羌|獼猴|帝雉|藍鵲|松鼠|鳥|蝴蝶|黑熊|石虎|狗|貓/.test(tx)) g = `<ellipse cx="60" cy="74" rx="20" ry="16" fill="#c9a26a" ${o}/><ellipse cx="34" cy="52" rx="8" ry="10" fill="#c9a26a" ${o}/><ellipse cx="52" cy="40" rx="8" ry="10" fill="#c9a26a" ${o}/><ellipse cx="70" cy="40" rx="8" ry="10" fill="#c9a26a" ${o}/><ellipse cx="87" cy="52" rx="8" ry="10" fill="#c9a26a" ${o}/>`;
    else if (/雨|霧|雲|風|彩虹|星/.test(tx)) g = `<circle cx="80" cy="42" r="15" fill="#ffd166" ${o}/><path d="M30 84a15 15 0 0 1 4-29a20 20 0 0 1 38-3a16 16 0 0 1 14 32z" fill="#fffaf0" ${o}/><path d="M40 96l-3 8M58 96l-3 8M76 96l-3 8" stroke="#4f9fd6" stroke-width="3" stroke-linecap="round"/>`;
    else if (/山友|阿伯|阿姨|爺爺|奶奶|小朋友|一位|志工|管理員/.test(tx)) g = `<path d="M34 104q0-34 26-34t26 34z" fill="#ee8458" ${o}/><circle cx="60" cy="50" r="17" fill="#f6cba6" ${o}/><path d="M38 44q22-12 44 0l-4-13q-18-11-36 0z" fill="#f7e8c0" ${o}/><circle cx="54" cy="52" r="2" fill="${INK}"/><circle cx="66" cy="52" r="2" fill="${INK}"/><path d="M54 59q6 4 12 0" fill="none" ${o}/>`;
    else g = `<path d="M58 104v-70h6v70z" fill="#a8743f" ${o}/><path d="M30 40h54l10 9-10 9h-54z" fill="#e2b877" ${o}/><path d="M40 49h34" stroke="${INK}" stroke-width="2" stroke-linecap="round" opacity=".5"/><path d="M36 70h50v14h-50l-8-7z" fill="#d7a660" ${o}/><ellipse cx="60" cy="106" rx="26" ry="5" fill="rgba(58,42,32,.22)"/>`;
    return `<svg viewBox="0 0 120 120"><path d="M120 0L70 0 20 120 80 120z" fill="rgba(255,220,130,.3)"/>${g}</svg>`;
  }
  function pickEncounter(){
    const f = st.dist / M.dist, k = WXD[wx.kind];
    const pool = SX.ENCOUNTERS.filter(e => { const w = e.where || {}, ws = e.wx || w.wx, ts = e.time || w.time;
      return e.id !== lastEnc && (!w.mountains || w.mountains.includes(M.id)) && (w.minFrac == null || f >= w.minFrac) && (w.maxFrac == null || f <= w.maxFrac)
        && (!ws || ws.includes(k) || ws.includes(wx.kind)) && (!ts || ts.includes(wx.time)); });
    if (!pool.length) return null;
    let sum = 0; pool.forEach(e => { sum += e.rare ? 0.3 : 1; });
    let r = Math.random() * sum;
    for (const e of pool) { r -= e.rare ? 0.3 : 1; if (r <= 0) return e; }
    return pool[pool.length - 1];
  }
  function applyEffect(ef){
    const out = [];
    if (!ef) return out;
    if (ef.stam) { st.stam = clamp(st.stam + ef.stam, 1, 100); out.push(`體力 ${ef.stam > 0 ? '+' : ''}${ef.stam}`); }
    if (ef.temp) { const v = ef.temp * 4; st.temp = clamp(st.temp + v, 1, 100); out.push(`體溫 ${v > 0 ? '+' : ''}${v}`); }
    if (ef.item) { const tr = SX.TREASURES.find(x => x.id === ef.item); if (tr) { gainTreasure(tr, 'quiet'); out.push(`得到「${tr.name}」`); } }
    if (ef.photo) { takePhoto(st.dist, true, '奇遇'); out.push('拍了一張照片'); }
    return out;
  }
  function openEncounter(e){
    if (!st || !M) return;
    e = e || pickEncounter(); if (!e) return;
    lastEnc = e.id; A.paper(); if (e.rare) A.sparkle();
    const S = SV.stats;
    if (e.text.includes('山羌') && (wx.time === 'night' || wx.time === 'dawn')) S.deer++;
    if (e.text.includes('藍鵲')) S.magpie[M.id] = 1;
    const ch = e.choices || [];
    modal(`<div class="encounter${e.rare ? ' rare' : ''}"><div class="ec-pic">${encSvg(e)}</div><h3>${e.rare ? '難得的奇遇' : '路上的小插曲'}</h3><p id="encTxt">${e.text}</p></div>
      <div class="mBtns" id="encBtns" style="margin-top:12px;flex-direction:column">${ch.length ? ch.map((c, i) => `<button class="cbtn" data-ch="${i}">${c.label}</button>`).join('') : '<button class="cbtn go" id="encOk">繼續走</button>'}</div>`);
    const end = () => { A.pop(); closeModal(); save(); checkQuests(); };
    if (!ch.length) { $('#encOk').onclick = end; return; }
    $$('#encBtns [data-ch]').forEach(b => b.onclick = () => {
      const c = ch[+b.dataset.ch]; A.pop();
      if (e.wx && e.wx.includes('fog') && e.id === 'e10') S.fog++;
      const fx = applyEffect(c.effect);
      $('#encTxt').innerHTML = c.result + (fx.length ? `<br><b>${fx.join('、')}</b>` : '');
      $('#encBtns').innerHTML = '<button class="cbtn go" id="encOk">繼續走</button>'; $('#encOk').onclick = end;
    });
  }

  // ───────── 拍立得與山友照片牆 ─────────
  // 山友照片依「離登山口幾公尺」歸到下一個 500 公尺點：0–500 的照片在 500 那一站看，最後一段在山頂看
  const bandOf = m => Math.ceil(Math.max(1, m) / 500) * 500;
  function wallHtml(list){
    if (!list.length) return '<p class="summitBig">這一段還沒有山友照片，休息時可以上傳一張。</p>';
    return '<div class="grid">' + list.map((p, i) => `<div class="pol" style="margin:4px 0 12px;transform:rotate(${(i % 3 - 1) * 1.5}deg)"><img src="${p.img}"><p>${p.by}・${Math.round(p.alt).toLocaleString('en-US')} m</p></div>`).join('') + '</div>';
  }
  function takePhoto(m, quiet, label, mark){
    const img = SC.snapshot();
    const cap = label ? `${M.name}・${label}` : `${M.name}・${(m/1000).toFixed(1)} km`, wt = wxText(wx) || '晴';
    if (img) { SV.photos.push({ id:M.id, m:Math.round(m), alt:Math.round(altAt(M, m / M.dist)), img, cap, wx:wt, date:today() }); if (SV.photos.length > 60) SV.photos.shift(); imgDirty = true; save(); }
    if (quiet) return;
    if (!img && !mark) { toast('鏡頭起霧了，這張沒拍成'); return; }
    A.shutter();
    const wall = mark ? SV.userPhotos.filter(p => p.mountainId === M.id && bandOf(p.m) === mark) : null;
    modal(`<h3>${mark ? `走了 ${(mark/1000).toFixed(1)} 公里，拍一張！` : '喀嚓！'}</h3>
      ${img ? `<div class="pol"><img src="${img}"><p>${cap}・${wt}</p></div>` : ''}
      ${wall ? `<h3>山友照片牆・${mark - 500}–${mark} m</h3>${wallHtml(wall)}` : ''}
      <div class="mBtns"><button class="cbtn go" id="pOk">${img ? '收進相簿' : '繼續走'}</button></div>`);
    $('#pOk').onclick = () => { A.pop(); closeModal(); if (mark) say(pick(SX.LINES.walk)); };
  }
  // 上傳山上的照片：縮到最長邊 720px 的 JPEG，記下哪座山、離登山口幾公尺、海拔
  let upCtx = null;
  const upFile = $('#upFile');
  function pickUpload(mountainId, m){ upCtx = { mountainId, m }; upFile.value = ''; upFile.click(); }
  upFile.onchange = () => {
    const f = upFile.files && upFile.files[0], ctx = upCtx; upCtx = null;
    if (!f || !ctx || !SX.M[ctx.mountainId]) return;
    const url = URL.createObjectURL(f), im = new Image();
    im.onload = () => {
      const k = Math.min(1, 720 / Math.max(im.width, im.height, 1)), c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k));
      let img = '';
      try { c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); img = c.toDataURL('image/jpeg', 0.72); } catch(e){}
      URL.revokeObjectURL(url);
      if (!img) return toast('這張照片讀不出來');
      const mt = SX.M[ctx.mountainId], m = clamp(Math.round(ctx.m), 0, mt.dist);
      const rec = { id:'u' + Date.now().toString(36), mountainId:mt.id, m, alt:Math.round(altAt(mt, m / mt.dist)), img, date:today(), by:'我' };
      // 之後接後端：在這裡把 rec（img 改成檔案）POST 到伺服器，成功後用回傳的 id 和圖片網址取代本機的 img；
      // 照片牆改成向伺服器要「這座山、這個 500 公尺區段」的清單。
      SV.userPhotos.push(rec); if (SV.userPhotos.length > 24) SV.userPhotos.shift();
      imgDirty = true; save(); A.shutter();
      toast(bandOf(m) >= mt.dist ? `上傳好了，會出現在${mt.name}山頂的照片牆` : `上傳好了，會出現在 ${bandOf(m)} m 的照片牆`, 3000);
      if (screen === 'album') renderAlbum();
    };
    im.onerror = () => { URL.revokeObjectURL(url); toast('這張照片讀不出來'); };
    im.src = url;
  };

  // ───────── 疊石頭許願 ─────────
  const WISHES = ['願今天走過的每一步，都踩得穩穩的。','願家裡的人平平安安，吃飽睡好。','願下一次上山，還是這麼好的天氣。','願累的時候，剛好有一張長椅。','願想念的人，也剛好在想你。','願背包越走越輕，心也是。','願每一位山友都平安下山。','願慢慢來的事，最後都有好結果。','願今晚有熱湯，明天有力氣。','願這座山一直這麼安靜、這麼綠。'];
  function stoneGame(){
    modal(`<h3>疊石頭許願</h3><div class="stoneGame"><div class="sg-top"><span id="sgN">0 / 5</span><span id="sgTip">點一下把石頭放下</span></div><canvas id="sgCv"></canvas></div>
      <div class="mBtns" style="margin-top:12px"><button class="cbtn" id="sgX">下次再疊</button></div>`);
    const c = $('#sgCv'), W = 300, H = 400, d = Math.min(2, window.devicePixelRatio || 1); c.width = W * d; c.height = H * d;
    const g = c.getContext('2d'), base = H - 44, stack = [], COLS = ['#b9b3a6','#c9bfae','#a9aeb0','#cdb9a0','#b4bdb0'], t0 = performance.now();
    let alive = true, cur = null;
    const mk = () => ({ w:100 - stack.length * 11, h:32 - stack.length * 2.5, x:W / 2, y:64, vy:0, vx:0, rot:0, state:'swing', ph:Math.random() * 6.28, sp:1.7 + stack.length * 0.35, col:COLS[stack.length % 5], tilt:(Math.random() - 0.5) * 0.14 });
    const ell = s => { g.beginPath(); g.ellipse(0, 0, s.w / 2, s.h / 2, 0, 0, 6.2832); };
    function drawStone(s){
      g.save(); g.translate(s.x, s.y); g.rotate(s.tilt + s.rot);
      ell(s); g.fillStyle = s.col; g.fill();
      g.save(); ell(s); g.clip();
      g.fillStyle = 'rgba(58,42,32,.24)'; g.beginPath(); g.ellipse(-s.w * 0.12, s.h * 0.34, s.w / 2, s.h / 2, 0, 0, 6.2832); g.fill();
      g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.ellipse(s.w * 0.18, -s.h * 0.26, s.w * 0.2, s.h * 0.13, -0.2, 0, 6.2832); g.fill();
      g.restore();
      ell(s); g.lineWidth = 2.4; g.strokeStyle = INK; g.stroke(); g.restore();
    }
    function finish(){
      alive = false;
      const side = Math.random() < 0.5 ? -1 : 1, m = Math.round(st.dist + 2), wish = pick(WISHES);
      SC.addCairn(m, side); (SV.cairns[M.id] = SV.cairns[M.id] || []).push({ m, side });
      SV.stats.cairns++; save(); A.chime();
      const r = $('#app').getBoundingClientRect(); sparks(r.left + r.width / 2, r.top + r.height * 0.4, 18);
      modal(`<h3>石頭疊好了</h3><div class="noteP">${wish}<small>— 你在${M.name}留下的願望</small></div>
        <p class="summitBig">步道旁多了一座你的小石堆。</p><div class="mBtns"><button class="cbtn go" id="sgOk">好</button></div>`);
      $('#sgOk').onclick = () => { A.pop(); closeModal(); checkQuests(); };
    }
    function tick(now){
      if (!alive || !c.isConnected) return;
      requestAnimationFrame(tick);
      const tt = (now - t0) / 1000;
      g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, W, H); g.lineJoin = 'round';
      const gr = g.createLinearGradient(W, 0, W * 0.3, H * 0.8); gr.addColorStop(0, 'rgba(255,225,150,.5)'); gr.addColorStop(1, 'rgba(255,225,150,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(W, 0); g.lineTo(W * 0.5, 0); g.lineTo(W * 0.05, H); g.lineTo(W * 0.6, H); g.closePath(); g.fill();
      g.fillStyle = '#8fae6e'; g.strokeStyle = INK; g.lineWidth = 2.4; g.beginPath(); g.moveTo(-5, base + 10); g.quadraticCurveTo(W / 2, base - 10, W + 5, base + 10); g.lineTo(W + 5, H + 5); g.lineTo(-5, H + 5); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = 'rgba(58,42,32,.25)'; g.beginPath(); g.ellipse(W / 2, base + 3, 64, 8, 0, 0, 6.2832); g.fill();
      stack.forEach(drawStone);
      if (!cur) return;
      if (cur.state === 'swing') cur.x = W / 2 + Math.sin(tt * cur.sp + cur.ph) * 104;
      else if (cur.state === 'fall') {
        cur.vy += 0.9; cur.y += cur.vy;
        const top = stack[stack.length - 1], ty = (top ? top.y - top.h / 2 : base) - cur.h / 2 + 3;
        if (cur.y >= ty) {
          if (!top || Math.abs(cur.x - top.x) < top.w * 0.42) {
            cur.y = ty; if (!top) cur.x = clamp(cur.x, W / 2 - 40, W / 2 + 40); cur.state = 'set'; stack.push(cur); A.pop();
            $('#sgN').textContent = `${stack.length} / 5`; $('#sgTip').textContent = stack.length < 5 ? '很穩，再一顆' : '疊好了！';
            if (stack.length >= 5) { cur = null; setTimeout(() => { if (alive && c.isConnected) finish(); }, 650); return; }
            cur = mk(); return;
          }
          cur.state = 'slip'; cur.vx = cur.x < top.x ? -2.6 : 2.6; cur.vy = -3; $('#sgTip').textContent = '滑掉了，沒關係再一次';
        }
      } else if (cur.state === 'slip') {
        cur.vy += 0.7; cur.y += cur.vy; cur.x += cur.vx; cur.rot += cur.vx * 0.03;
        if (cur.y > H + 40) { cur = mk(); return; }
      }
      drawStone(cur);
    }
    cur = mk();
    c.addEventListener('pointerdown', e => { e.preventDefault(); if (cur && cur.state === 'swing') cur.state = 'fall'; });
    $('#sgX').onclick = () => { alive = false; A.pop(); closeModal(); };
    requestAnimationFrame(tick);
  }

  // ───────── 任務 ─────────
  function questOk(q){
    const c = q.cond || {}, S = SV.stats, n = c.n || 1, ids = Object.keys(SV.done).filter(k => SV.done[k] > 0 && SX.M[k]);
    switch (c.type) {
      case 'climbs': return c.withFriends ? false : (c.distinct ? ids.length : ids.reduce((a, k) => a + SV.done[k], 0)) >= n;   // withFriends 要等連線功能
      case 'mountain': return c.id ? !!SV.done[c.id] : ids.some(k => SX.M[k].alt >= (c.minAlt || 0));
      case 'time': return S.night >= n;
      case 'wx': return (c.kind === 'rain' ? S.rain : c.kind === 'fog' ? S.fog : c.kind === 'night' ? S.deer : 0) >= n;
      case 'items': return (c.kind === 'magpie' ? Object.keys(S.magpie).length : Object.keys(SV.bag).length) >= n;
      case 'notes': return S.notes >= n;
      case 'cairns': return S.cairns >= n;
      case 'rests': return S.rests >= n;
      case 'nofast': return S.nofast >= n;
      case 'gps': return S.away >= (c.offlineMinutes || 10);
    }
    return false;
  }
  function checkQuests(){
    const msgs = [];
    SX.QUESTS.forEach(q => {
      if (SV.quests[q.id] || !questOk(q)) return;
      SV.quests[q.id] = today();
      const r = q.reward || {}; let txt = '';
      if (r.title) { if (!SV.titles.includes(r.title)) SV.titles.push(r.title); if (!SV.title) SV.title = r.title; txt = `稱號「${r.title}」`; }
      if (r.item) { const tr = SX.TREASURES.find(x => x.id === r.item); if (tr) { SV.bag[tr.id] = (SV.bag[tr.id] || 0) + 1; txt = `寶物「${tr.name}」`; } }
      if (r.pet) { if (!SV.pets.includes(r.pet)) SV.pets.push(r.pet); const p = SX.PETS.find(x => x.id === r.pet); txt = `新夥伴「${p ? p.name : r.pet}」`; }
      msgs.push(`完成隱藏任務「${q.name}」${txt ? '，得到' + txt : ''}`);
    });
    if (!msgs.length) return;
    save(); confetti(34); A.chime();
    msgs.forEach((m, i) => setTimeout(() => toast(m, 2600), i * 2800));
  }

  // ───────── 背包（寶物、稱號、任務）─────────
  function openBag(){
    const have = SX.TREASURES.filter(x => SV.bag[x.id] > 0).length;
    modal(`<h3>背包</h3>
      ${SV.titles.length ? `<div class="grp" style="margin-top:0">稱號（點一個掛在身上）</div><div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">${SV.titles.map(x => `<button class="chip" data-title="${x}"${SV.title === x ? ' style="background:#ffe08a"' : ''}>${x}</button>`).join('')}</div>` : ''}
      <div class="grp" style="margin-top:0">寶物 ${have} / ${SX.TREASURES.length}</div>
      <div class="bag">${SX.TREASURES.map(x => SV.bag[x.id] > 0 ? `<button class="slot${x.rarity !== '普通' ? ' rare' : ''}" data-tr="${x.id}" style="${RAR_BG[x.rarity] || ''}">${trSvg(x)}${SV.bag[x.id] > 1 ? `<b>×${SV.bag[x.id]}</b>` : ''}</button>` : '<div class="slot empty"></div>').join('')}</div>
      <p class="summitBig" id="bagInfo" style="margin-top:10px;min-height:52px">${have ? '點一件寶物，看看它的故事。' : '步道上會閃閃發亮的地方，點一下看看。'}</p>
      <div class="grp">隱藏任務 ${Object.keys(SV.quests).length} / ${SX.QUESTS.length}</div>
      <ul class="quest">${SX.QUESTS.map(q => SV.quests[q.id] ? `<li class="done"><span>${q.name}<small>${q.desc}</small></span></li>` : `<li class="hid"><span>？？？<small>${q.hint}</small></span></li>`).join('')}</ul>
      <div class="mBtns" style="margin-top:14px"><button class="cbtn go" id="bagOk">關上背包</button></div>`);
    $$('#mCard [data-tr]').forEach(b => b.onclick = () => { const x = SX.TREASURES.find(k => k.id === b.dataset.tr); A.pop(); $('#bagInfo').innerHTML = `<span class="chip" style="background:${RAR_COL[x.rarity] || '#fff'}">${x.rarity}</span>　${x.name}<br>${x.desc}`; });
    $$('#mCard [data-title]').forEach(b => b.onclick = () => { A.pop(); SV.title = b.dataset.title; save(); $$('#mCard [data-title]').forEach(k => { k.style.background = k === b ? '#ffe08a' : ''; }); });
    $('#bagOk').onclick = () => { A.pop(); closeModal(); };
  }

  // ───────── 登頂 ─────────
  function arrive(){
    arrived = true; st.dist = M.dist; st.fin = true; st.rest = false; st.stopAt = null;
    $('#restSheet').classList.remove('on');
    SV.done[M.id] = (SV.done[M.id] || 0) + 1;
    if (!M.temple) SV.stamps[M.id] = SV.stamps[M.id] || today();
    const S = SV.stats; if (wx.time === 'night') S.night++; if (wx.kind === 'rain') S.rain++; if (!st.fast) S.nofast++;
    const stamp = SX.TREASURES.find(x => x.id === 't_summit_stamp'); if (stamp) gainTreasure(stamp, 'quiet');
    save(); A.yay();
    const m = M;
    setTimeout(() => {
      if (M !== m) return;
      const img = SC.snapshot();
      if (img) { SV.photos.push({ id:M.id, m:M.dist, alt:M.alt, img, cap:`${M.name}・登頂`, wx:wxText(wx) || '晴', date:today() }); imgDirty = true; save(); }
      const r = $('#app').getBoundingClientRect(); sparks(r.left + r.width/2, r.top + r.height*0.4, 24); confetti();
      const wall = SV.userPhotos.filter(p => p.mountainId === M.id && bandOf(p.m) >= M.dist);
      modal(`<h3>抵達終點！</h3>
        <div class="summitBig"><b>${M.name} ${M.alt.toLocaleString('en-US')} m</b>${M.end}</div>
        ${img ? `<div class="pol"><img src="${img}"><p>${M.name}・登頂紀念</p></div>` : ''}
        ${stamp ? '<p class="summitBig">背包裡多了一枚登頂紀念章。</p>' : ''}
        ${wall.length ? `<h3>山友照片牆・山頂</h3>${wallHtml(wall)}` : ''}
        ${M.temple ? '<p class="summitBig">旁邊有一間小小的福德祠，要不要進去拜一下？</p>' : '<p class="summitBig">集印帳蓋上新的章了！</p>'}
        <div class="mBtns">${M.temple ? '<button class="cbtn red" id="aTemple">去福德祠</button>' : ''}<button class="cbtn ${M.temple ? '' : 'go'}" id="aMap">回地圖</button></div>`);
      if (M.temple) $('#aTemple').onclick = () => { closeModal(); openTemple(); };
      $('#aMap').onclick = () => { closeModal(); SV.cur = null; save(); go('map'); };
      checkQuests();
    }, 1400);
  }

  // ───────── HUD ─────────
  try { HUD.mount($('#hudRoot')); } catch(e){ console.error('hud', e); }
  { const bag = $('.i-bag'); if (bag) bag.style.backgroundImage = 'url("data:image/svg+xml,' + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 26'><path d='M10 7c0-6 10-6 10 0' fill='none' stroke='${INK}' stroke-width='2'/><rect x='6' y='6.5' width='18' height='17.5' rx='5' fill='#f0a444' stroke='${INK}' stroke-width='2'/><path d='M6 12h18' stroke='${INK}' stroke-width='1.4'/><rect x='10' y='14.5' width='10' height='6.5' rx='2' fill='#ffe1a0' stroke='${INK}' stroke-width='1.6'/></svg>`) + '")'; }
  function hudTick(){
    if (!st || !M) return;
    const f = st.dist / M.dist, v = baseSpeed(M) * (st.temp < 25 ? 0.7 : 1) * (SV.set.devOn && SV.set.fast ? 20 : 1), left = Math.max(1, Math.round((M.dist - st.dist) / v / 60));
    try {
      HUD.update({ name:M.name, stam:st.stam, temp:st.temp, alt:Math.round(altAt(M, f)), frac:f,
        distText:`${(st.dist/1000).toFixed(2)} / ${(M.dist/1000).toFixed(1)} km`,
        etaText: arrived ? '到了！' : st.sleep ? '打瞌睡中…' : st.rest ? '休息中' : `還要約 ${fmtMin(left)}`,
        mood: st.sleep ? 'sleep' : st.temp < 25 ? 'cold' : st.stam < 25 ? 'tired' : st.stam < 55 ? 'ok' : 'happy', wx });
    } catch(e){}
    const rs = $('#restSheet'), on = !!st.rest && !arrived;
    if (on && !rs.classList.contains('on')) $('#rsTitle').textContent = st.restType === 'view' ? '觀景台到了，慢慢看' : '坐下來喝口熱茶';
    rs.classList.toggle('on', on);
  }

  // ───────── 主迴圈 ─────────
  let lastT = performance.now(), hudT = 0, wxT = 0;
  function loop(now){
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, Math.max(0, (now - lastT) / 1000)); lastT = now;
    frame(dt);
  }
  function frame(dt){
    if (screen !== 'climb' || !st || !M) return;
    t += dt;
    let d = 0;
    const boost = (ptrHold || keyHold) && !paused && !arrived && !st.sleep && !st.rest;
    if (!paused && !arrived) {
      const wasSleep = st.sleep, wasRest = st.rest;
      d = simulate(st, M, dt, boost, false);
      if (boost) st.fast = true;
      if (!wasSleep && st.sleep) { say(st.temp <= 0 ? '好冷…鑽進睡袋躲一下' : pick(SX.LINES.tired)); A.yawn(); }
      if (wasSleep && !st.sleep) say('睡飽了！繼續走～');
      if (!wasRest && st.rest) onRest();
      coldT -= dt;
      if (st.temp < 25 && !st.sleep && !st.rest && coldT <= 0) { coldT = 45; say('好冷…找張長椅喝口熱茶吧', 3400); }
      // 奇遇：每走 3–6 分鐘一次
      if (d > 0) { st.encT -= dt; if (st.encT <= 0) { st.encT = 180 + Math.random() * 180; openEncounter(); } }
      // 每 500 公尺：拍立得＋山友照片牆
      const ms = Math.floor(st.dist / 500) * 500;
      if (!paused && ms > (st.ms || 0) && ms < M.dist) { st.ms = ms; takePhoto(ms, false, null, ms); }
      if (!paused && st.dist >= M.dist) arrive();
      st.last = Date.now();
    }
    const moving = d > 0;
    const snowy = M.theme.snow && wx.kind !== 'rain' && st.dist / M.dist > 0.55;
    A.walk(moving && !paused, snowy ? 'snow' : M.theme.trail, boost);
    lineT -= dt;
    if (lineT <= 0 && moving && !paused) { lineT = 18 + Math.random()*16;
      say(pick(wx.time === 'night' ? SX.LINES.night : wx.kind === 'rain' ? SX.LINES.rain : wx.kind === 'fog' ? SX.LINES.fog : SX.LINES.walk)); }
    wxT += dt; if (wxT > 60) { wxT = 0; if (!wxOverride) { const n = calcWx(M.id); if (n.kind !== wx.kind || n.time !== wx.time) { wx = n; moodNow(); } } }
    SC.render({ dist:st.dist, total:M.dist, t, dt, speed: dt > 0 ? Math.min(6, d / dt) : 0, boost, rest:!!st.rest, sleep:!!st.sleep, wx, pet:SV.pet || null, frac:st.dist / M.dist });
    updTag();
    hudT -= dt; if (hudT <= 0) { hudT = 0.2; hudTick(); }
  }
  setInterval(() => { if (st && !document.hidden) save(); }, 10000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { ptrHold = false; keyHold = false; if (st && screen === 'climb' && !paused && !arrived) st.last = Date.now(); save(); A.setOn(false); }
    else { catchUp(); A.setOn(SV.set.sound); }
  });

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
      if (!SV.photos.length) { body.innerHTML = '<div class="empty">還沒有照片。<br>每走 500 公尺會自動拍一張拍立得，<br>在長椅和觀景台也可以自己拍。</div>'; return; }
      let html = '';
      SX.MOUNTAINS.forEach(m => { const ps = SV.photos.filter(p => p.id === m.id); if (!ps.length) return;
        html += `<div class="grp">${m.name}</div><div class="grid">` + ps.map((p, i) => `<div class="pol" style="--rot:${(i%3-1)*1.5}deg;transform:rotate(var(--rot))"><img src="${p.img}"><p>${p.cap}</p></div>`).join('') + '</div>'; });
      body.innerHTML = html; stagger(body, '.pol');
    } else if (albumTab === 'wall') {
      const cur = SV.cur && SX.M[SV.cur] ? SV.cur : SX.MOUNTAINS[0].id;
      let html = `<div class="setRow paper photoForm"><h4>上傳山上的照片</h4>
        <div><label>哪一座山</label><select id="upM">${SX.MOUNTAINS.map(m => `<option value="${m.id}"${m.id === cur ? ' selected' : ''}>${m.name}</option>`).join('')}</select></div>
        <div><label>拍照地點的海拔（公尺）</label><input type="number" id="upAlt" inputmode="numeric"></div>
        <div><span class="alt500" id="upBand"></span></div>
        <button class="cbtn go" id="upGo">選一張照片上傳</button>
        <p>照片會依海拔歸到下一個 500 公尺點，走到那裡的山友才看得到，步道不會被照片塞滿。現在先存在這支手機裡。</p></div>`;
      SX.MOUNTAINS.forEach(m => { const ps = SV.userPhotos.filter(p => p.mountainId === m.id).sort((a, b) => a.m - b.m); if (!ps.length) return;
        html += `<div class="grp">${m.name}</div><div class="grid">` + ps.map((p, i) => `<div class="pol" data-up="${p.id}" style="--rot:${(i%3-1)*1.5}deg;transform:rotate(var(--rot))"><img src="${p.img}"><p>${Math.round(p.alt).toLocaleString('en-US')} m・${bandOf(p.m) >= m.dist ? '山頂' : bandOf(p.m) + ' m'}照片牆</p></div>`).join('') + '</div>'; });
      if (!SV.userPhotos.length) html += '<div class="empty" style="padding:30px 20px">還沒有上傳過照片。</div>';
      body.innerHTML = html;
      const selM = $('#upM'), inAlt = $('#upAlt');
      const mOf = () => { const m = SX.M[selM.value], a = clamp(+inAlt.value || m.startAlt, m.startAlt, m.alt); return Math.round((a - m.startAlt) / Math.max(1, m.alt - m.startAlt) * m.dist); };
      const upd = () => { const m = SX.M[selM.value], d = mOf(); $('#upBand').textContent = `${m.name} ${m.startAlt}–${m.alt} m・會出現在${bandOf(d) >= m.dist ? '山頂' : ' ' + bandOf(d) + ' m '}的照片牆`; };
      const reset = () => { const m = SX.M[selM.value]; inAlt.min = m.startAlt; inAlt.max = m.alt; inAlt.value = Math.round(st && M === m && !st.fin ? altAt(m, st.dist / m.dist) : (m.startAlt + m.alt) / 2); upd(); };
      selM.onchange = reset; inAlt.oninput = upd; reset();
      $('#upGo').onclick = () => { A.pop(); pickUpload(selM.value, mOf()); };
      $$('#albumBody [data-up]').forEach(el => el.onclick = () => { if (confirm('要把這張照片從照片牆拿下來嗎？')) { SV.userPhotos = SV.userPhotos.filter(p => p.id !== el.dataset.up); imgDirty = true; save(); renderAlbum(); } });
    } else if (albumTab === 'stamps') {
      body.innerHTML = '<div class="stamps">' + SX.MOUNTAINS.map(m => `<div class="stampSlot">${SV.stamps[m.id] ? stampSvg(m.id, SV.stamps[m.id]) : m.name}</div>`).join('') + '</div>'; stagger(body, '.stampSlot');
    } else {
      if (!SV.lots.length) { body.innerHTML = '<div class="empty">還沒有籤詩。<br>爬完象山，到福德祠求一支吧。</div>'; return; }
      body.innerHTML = SV.lots.map(i => { const f = SX.FORTUNES[i]; return f ? `<div class="lotItem" data-lot="${i}"><span><b>${f.no}</b>　${f.poem[0]}</span><span>${f.rank}</span></div>` : ''; }).join(''); stagger(body, '.lotItem');
      $$('.lotItem').forEach(el => el.onclick = () => { A.pop(); const f = SX.FORTUNES[+el.dataset.lot]; modal(`${lotHtml(f)}<div class="mBtns"><button class="cbtn" id="lOk2">關閉</button></div>`); $('#lOk2').onclick = () => closeModal(); });
    }
  }

  // ───────── 設定 ─────────
  let gpsWatch = null, gpsPrev = null, gpsTotal = 0;
  const DEV_HASH = 'acac170fa5097902002a7e1e522ac96c9838c1193505835d2a990e0cd7917fef';
  function renderSettings(){
    const s = SV.set;
    $('#setBody').innerHTML = `
      <div class="setRow"><h4>音效<button class="tgl ${s.sound ? 'on' : ''}" id="sSound"></button></h4>
        <input type="range" id="sVol" min="0" max="1" step="0.05" value="${s.vol}"><p>腳步聲、鳥叫、雨聲和廟裡的鐘聲。</p></div>
      <div class="setRow"><h4>人在山上，定位加速<button class="tgl ${s.gps ? 'on' : ''}" id="sGps"></button></h4>
        <p>開啟後會用手機定位。你人真的在這座山附近（大約 3 公里內）的時候，真的走一公尺，遊戲裡就多走三公尺。不在山上就沒有作用。只有遊戲畫面開著的時候才會計算，比較耗電。</p></div>
      <div class="setRow"><h4>操作小抄</h4>
        <p>放著不管，角色會照山友實際紀錄的速度慢慢走，關掉遊戲也會繼續。長按畫面（或按住 W／↑）可以走快一點，但比較累。點長椅或觀景台可以休息、拍照、疊石頭。</p></div>
      <div class="setRow"><h4>開發者選項</h4>
        ${s.dev ? `<p>已解鎖</p><div class="devBtns">
          <button class="cbtn sm" id="dFast">${s.devOn && s.fast ? '關閉' : '開啟'}快轉 ×20</button>
          <button class="cbtn sm" id="dNext">跳到下個 500m</button>
          <button class="cbtn sm" id="dTop">直接到終點</button>
          <button class="cbtn sm" id="dFull">體力體溫補滿</button>
          <button class="cbtn sm" id="dEnc">觸發奇遇</button>
          <button class="cbtn sm" id="dTr">給寶物</button>
          <button class="cbtn sm" id="dUnlock">${SV.unlockAll ? '恢復解鎖規則' : '解鎖全部山'}</button>
          <button class="cbtn sm" id="dWx">換天氣</button>
          <button class="cbtn sm" id="dTemple">直接去福德祠</button>
          <button class="cbtn sm" id="dReset">清除存檔</button>
          <button class="cbtn sm" id="dLock">鎖回去</button></div>`
        : `<div class="pw"><input id="pw" type="password" inputmode="numeric" placeholder="密碼"><button class="cbtn sm" id="pwOk">解鎖</button></div>`}
      </div>
      <p style="text-align:center;font-size:12px;color:#fff7e4;opacity:.8;margin-top:10px">山行小日子 v0.2・試玩版</p>`;
    $('#sSound').onclick = () => { s.sound = !s.sound; A.setOn(s.sound); save(); renderSettings(); if (s.sound) { A.unlock(); A.pop(); } };
    $('#sVol').oninput = e => { s.vol = +e.target.value; A.setVol(s.vol); save(); };
    $('#sVol').onchange = () => { A.unlock(); A.pop(); };
    $('#sGps').onclick = () => { s.gps = !s.gps; save(); setGps(s.gps); renderSettings(); };
    if (s.dev) {
      const need = () => { if (!st || !M || st.fin) { toast('先開始爬一座山'); return false; } return true; };
      $('#dFast').onclick = () => { s.devOn = true; s.fast = !s.fast; save(); renderSettings(); };
      $('#dNext').onclick = () => { if (!need()) return; st.dist = Math.min(M.dist - 1, (Math.floor(st.dist / 500) + 1) * 500 - 2); st.stam = 100; st.temp = 100; st.sleep = false; st.rest = false; st.stopAt = null; st.last = Date.now(); go('climb'); };
      $('#dTop').onclick = () => { if (!need()) return; st.dist = M.dist - 3; st.ms = Math.floor((M.dist - 1) / 500) * 500; st.stam = 100; st.temp = 100; st.sleep = false; st.rest = false; st.stopAt = null; st.last = Date.now(); go('climb'); };
      $('#dFull').onclick = () => { if (st) { st.stam = 100; st.temp = 100; st.sleep = false; } toast('體力和體溫都滿了'); };
      $('#dEnc').onclick = () => { if (!need()) return; st.last = Date.now(); go('climb'); openEncounter(); };
      $('#dTr').onclick = () => gainTreasure(rollTreasure(M ? M.id : 'xiangshan'), 'show');
      $('#dUnlock').onclick = () => { SV.unlockAll = !SV.unlockAll; save(); renderSettings(); toast(SV.unlockAll ? '全部的山都開放了' : '恢復原本的解鎖規則'); };
      $('#dWx').onclick = () => cycleWx();
      $('#dTemple').onclick = () => openTemple();
      $('#dReset').onclick = () => { if (confirm('確定要清除所有存檔嗎？')) { resetting = true; localStorage.removeItem(KEY); localStorage.removeItem(KEY_IMG); location.reload(); } };
      $('#dLock').onclick = () => { s.dev = false; s.devOn = false; s.fast = false; save(); renderSettings(); };
    } else {
      $('#pwOk').onclick = async () => {
        const v = $('#pw').value, h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v + 'sx'));
        const hex = [...new Uint8Array(h)].map(b => b.toString(16).padStart(2,'0')).join('');
        if (hex === DEV_HASH) { s.dev = true; s.devOn = true; save(); renderSettings(); toast('開發者選項已解鎖'); } else { toast('密碼不對喔'); const ip = $('#pw'); ip.classList.add('bad'); ip.parentNode.classList.remove('shakeX'); void ip.offsetWidth; ip.parentNode.classList.add('shakeX'); }
      };
    }
  }
  // 定位加速：只有人在這座山附近（約 3 公里內）才有作用
  const hav = (la1, lo1, la2, lo2) => { const R = 6371000, k = Math.PI / 180, dLa = (la2 - la1) * k, dLo = (lo2 - lo1) * k;
    const a = Math.sin(dLa/2)**2 + Math.cos(la1 * k) * Math.cos(la2 * k) * Math.sin(dLo/2)**2; return 2 * R * Math.asin(Math.sqrt(a)); };
  function setGps(on){
    if (gpsWatch !== null) { navigator.geolocation.clearWatch(gpsWatch); gpsWatch = null; }
    $('#gpsTag').classList.toggle('on', on); gpsPrev = null;
    if (!on) return;
    if (!navigator.geolocation) { toast('這支手機不支援定位'); return; }
    $('#gpsTag').textContent = '定位中…';
    gpsWatch = navigator.geolocation.watchPosition(pos => {
      const c = pos.coords, tagEl = $('#gpsTag');
      if (c.accuracy > 60) { tagEl.textContent = '定位訊號弱'; return; }
      const near = !!M && hav(c.latitude, c.longitude, M.lat, M.lon) <= 3000;
      if (gpsPrev) {
        const d = hav(gpsPrev.latitude, gpsPrev.longitude, c.latitude, c.longitude);
        if (d < 3) { if (M && !near) tagEl.textContent = '不在這座山附近，定位加速沒有作用'; return; }
        if (d < 200 && near && st && screen === 'climb' && !arrived && !paused && !st.sleep && !st.rest) { gpsTotal += d; st.dist = Math.min(M.dist, st.dist + d * 3); }
      }
      gpsPrev = { latitude:c.latitude, longitude:c.longitude };
      tagEl.textContent = !M ? '定位好了，選一座山出發吧' : near ? `人在山上！真的走了 ${Math.round(gpsTotal)} m（×3）` : '不在這座山附近，定位加速沒有作用';
    }, () => { toast('沒有拿到定位權限'); SV.set.gps = false; save(); $('#gpsTag').classList.remove('on'); }, { enableHighAccuracy:true, maximumAge:5000 });
  }

  // ───────── 啟動 ─────────
  catchUp();
  renderMap();
  if (SV.set.gps) setGps(true);
  if (SV.cur && SX.M[SV.cur]) { const p = P(SV.cur); if (p.dist > 0 && !p.fin) setTimeout(() => { if (screen !== 'map') return; selId = SV.cur; try { WM.focus(SV.cur); } catch(e){} showRoute(SV.cur); }, 700); }
  requestAnimationFrame(loop);
  document.addEventListener('gesturestart', e => e.preventDefault());
  // 測試用掛鉤
  window.SXG = { go, startClimb, openTemple, openBag, checkQuests,
    tick:(n = 30) => { for (let i=0;i<n;i++) frame(0.033); },
    encounter:id => { if (!st) return null; const e = id ? SX.ENCOUNTERS.find(x => x.id === id) : null; openEncounter(e); return lastEnc; },
    treasure:id => { const tr = id ? SX.TREASURES.find(x => x.id === id) : rollTreasure(M ? M.id : 'xiangshan'); gainTreasure(tr, 'show'); return tr && tr.id; },
    rest:() => { if (st && !st.sleep) { st.stopAt = st.dist + 1; st.restType = 'bench'; } },
    stones:() => { if (st && M) stoneGame(); },
    wx:(kind, time) => { wxOverride = kind ? { kind, time:time || 'day' } : null; wx = wxOverride || calcWx(); moodNow(); return wx; },
    get st(){ return st; }, get M(){ return M; }, get SV(){ return SV; } };
})();

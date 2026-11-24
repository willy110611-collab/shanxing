// 山行小日子 — 主程式（第二版：手繪木框、真實步調、休息點、奇遇、寶物、任務）
(function(){
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const C = SX.clay, A = SX.audio, SC = SX.scene, HUD = SX.hud, WM = SX.worldmap, MO = SX.motion;   // MO：介面動態效果（js/motion.js）
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
  const baseSpeed = SX.baseSpeed;   // 山友實際紀錄的步調（公尺／秒），寫在 data.js

  // ───────── 存檔 ─────────
  // 資料形狀先照之後接後端的樣子放：userPhotos、cairns、bag、quests 都是可以直接同步的清單／對照表
  const blank = () => ({ cur:null, prog:{}, done:{}, photos:[], stamps:{}, bagLog:{},   // bagLog：寶物 id → { first 第一次拿到的日期, mt 在哪座山, last 最近一次 }
    bag:{}, quests:{}, titles:[], title:null, pets:['shiba'], pet:null, userPhotos:[], cairns:{}, unlockAll:false, daily:null,
    born:null,   // 開始登山的日子（個人紀錄用）
    intro:null,  // 第一次出發的玩法小卡看過的日子（只出現一次）
    badges:{}, encSeen:{},   // 徽章：{ 徽章id: { t:等級, d:日期, s:入門級日期 } }；奇遇圖鑑：{ 奇遇id: { n:次數, first:第一次日期 } }
    gifts:{},   // 新手禮物送過了沒：{ 代號: 日期 }（代號見 FIRST_GIFTS）
    likes:{},   // 看大圖時按了「我喜歡」的照片：{ 照片代號: 時間 }（自己的記號：不會告訴拍照的人、別人看不到；有帳號時只跟著自己的雲端存檔備份）
    stats:{ walked:0, withFriends:0, notes:0, rests:0, cairns:0, fog:0, night:0, rain:0, nofast:0, away:0, deer:0, magpie:{}, fogTop:0, snowTop:0, bestStreak:0, walkSec:0 },   // walkSec：真的在走的秒數（個人紀錄用）
    set:{ sound:true, vol:0.5, gps:false, eco:false, dev:false, devOn:false, fast:false, clean:false, hudFull:false } });   // hudFull：登山狀態面板展開成完整的（平常精簡一排）
  let SV = blank();
  // 新手禮物：第一次登頂（summit）、第一次領每日獎勵（daily）、第一次連續上山 3 天簽到（streak3），各保證一件還沒有的寶物，值是稀有度
  const FIRST_GIFTS = { summit:'稀有', daily:'普通', streak3:'稀有' };
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
      ['photos','titles','pets','userPhotos'].forEach(k => { if (!Array.isArray(SV[k])) SV[k] = b[k]; });
      ['prog','done','stamps','bag','bagLog','quests','cairns','badges','encSeen'].forEach(k => { if (!SV[k] || typeof SV[k] !== 'object') SV[k] = {}; });
      // 新手禮物出來前就玩過的存檔（有寶物或登頂過）：當作都送過了，不會突然多拿稀有寶物
      if (!o.gifts || typeof o.gifts !== 'object') SV.gifts = Object.keys(SV.bag).length || Object.keys(SV.done).length ? Object.fromEntries(Object.keys(FIRST_GIFTS).map(k => [k, '舊存檔'])) : {};
      if (!SV.stats.magpie || typeof SV.stats.magpie !== 'object') SV.stats.magpie = {};
      if (!SV.pets.includes('shiba')) SV.pets.unshift('shiba');
      if (SV.cur && !SX.M[SV.cur]) SV.cur = null;
      // 山的全程改短過（玉山、雪山 11000 → 10900 公尺）：還沒登頂的進度停在山頂前一公尺，不能等於全程（出發時會被當成走完、從頭開始）
      for (const id in SV.prog) { const p = SV.prog[id], m = SX.M[id]; if (m && p && !p.fin && p.dist >= m.dist) p.dist = m.dist - 1; }
      // 已經拿掉的舊收集冊（存檔欄位 lots）丟掉；以前象山要另外按一次才蓋得到章，登頂過但沒蓋的補蓋（日期用今天）
      delete SV.lots;
      for (const id in SV.done) if (SX.M[id] && SV.done[id] > 0 && !SV.stamps[id]) SV.stamps[id] = today();
      // 拿掉的寶物、奇遇（例如 t_shrine_card、e60）：背包和奇遇圖鑑只留資料裡還有的，「收集幾種寶物」任務才不會算到不存在的東西
      const TRID = new Set(SX.TREASURES.map(x => x.id)), ENID = new Set(SX.ENCOUNTERS.map(x => x.id));
      for (const k in SV.bag) if (!TRID.has(k)) { delete SV.bag[k]; delete SV.bagLog[k]; }
      for (const k in SV.bagLog) if (!TRID.has(k)) delete SV.bagLog[k];
      for (const k in SV.encSeen) if (!ENID.has(k)) delete SV.encSeen[k];
    }
  } catch(e){ SV = blank(); }
  SX.fitSave = () => SV;   // 體能（data.js 的 SX.fitness）從這份存檔算（登頂次數、算數的重複次數、狀態），登山客的步速跟著變
  // 體能欄位：舊存檔沒有算數的重複次數，把以前重複登頂的次數照舊算進去（最多 20，不套每天一次）；狀態從 100% 開始
  if (!SV.fitRep || typeof SV.fitRep !== 'object') { SV.fitRep = {}; for (const id in SV.done) if (SX.M[id] && SV.done[id] > 0) SV.fitRep[id] = Math.min(SX.FIT.REPEAT_MAX, SV.done[id] - 1); }
  if (!SV.fitDay || typeof SV.fitDay !== 'object') SV.fitDay = {};
  SV.cond = SX.fitCond(SV);
  if (!SV.fitWalk || typeof SV.fitWalk !== 'object') SV.fitWalk = { day:'', m:0, rec:'' };   // 今天親自走了幾公尺、哪天已經恢復過
  // 每天打開一次：離上次打開超過 7 整天就掉狀態。要在離線補走之前做，補走才用新的體能算
  let fitDecayed = false;
  function fitOpen(){
    const t = SX.twDay();
    if (SV.lastSeen === t) return;
    if (SV.lastSeen) {
      const from = SV.followDay > SV.lastSeen ? SV.followDay : SV.lastSeen;   // 好友跟隨：跟著隊伍走的日子也算有在走路
      const c0 = SX.fitCond(SV), away = Math.round((Date.parse(t) - Date.parse(from)) / 864e5), c = SX.fitDecay(c0, away);
      if (c < c0 - 1e-9) { SV.cond = c; fitDecayed = true; SV.fitBase = { day:t, cond:c0, from }; }   // fitBase：今天掉之前的狀態，隊伍資料拿回來後可能要重算
    }
    SV.lastSeen = t;
  }
  fitOpen();
  // 好友跟隨：伺服器說我跟著隊伍走到哪一天。比今天打開時算體能下降用的日子還晚，就照新的日子重算今天掉多少（跟隨也算有在走路）
  function followWalked(day){
    if (!day || (SV.followDay && SV.followDay >= day)) return;
    SV.followDay = day;
    const b = SV.fitBase;
    if (b && b.day === SX.twDay() && day > b.from) { SV.cond = SX.fitDecay(b.cond, Math.max(0, Math.round((Date.parse(b.day) - Date.parse(day)) / 864e5))); b.from = day; }
    save();
  }
  // 舊存檔沒有開始日：用存檔裡最早的日期（集印、寶物、奇遇、照片），都沒有就是今天
  if (!SV.born) { const ds = [...Object.values(SV.stamps), ...Object.values(SV.bagLog).map(x => x && x.first), ...Object.values(SV.encSeen).map(x => x && x.first), ...SV.photos.map(p => p.date)].filter(Boolean).map(d => new Date(d)).filter(d => !isNaN(d)); SV.born = ds.length ? new Date(Math.min(...ds)).toLocaleDateString('zh-TW') : today(); }
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

  const newProg = () => ({ dist:0, stam:100, temp:100, sleep:false, rest:false, last:Date.now(), ms:0, fast:false, fin:false, got:{}, stopAt:null, restType:'bench', encT:200 + Math.random() * 160, away:null, seg:null });   // seg：這次的小目標 { m 在哪, name }
  const P = id => { const p = SV.prog[id] || (SV.prog[id] = newProg()), d = newProg(); for (const k in d) if (p[k] === undefined) p[k] = d[k]; if (!p.got || typeof p.got !== 'object') p.got = {}; ['dist','stam','temp','ms','last','encT'].forEach(k => { if (typeof p[k] !== 'number' || !isFinite(p[k])) p[k] = d[k]; }); return p; };
  // 一次只能爬一座山（跟真實一樣）：onTrail＝正在爬、還沒登頂的那座；舊存檔裡同時爬到一半的別座山只留目前這座
  // 好友跟隨的那一趟（q.team）從隊長出發那一刻就算在路上（還沒打開遊戲、一步都還沒補走也是）
  const onTrail = () => { const id = SV.cur, m = id && SX.M[id], q = m && SV.prog[id]; return q && (q.dist > 0 || q.team) && q.dist < m.dist && !q.fin ? id : null; };
  for (const k in SV.prog) { const q = SV.prog[k]; if (k !== SV.cur && q && q.dist > 0 && !q.fin) SV.prog[k] = newProg(); }
  // 下山：這次的進度歸零，下次從登山口重新出發（路上拿到的寶物、照片都留著）
  function goDown(id){ SV.prog[id] = newProg(); if (SV.cur === id) SV.cur = null; save(); }

  // ───────── 畫面切換 ─────────
  let screen = 'map', prevScreen = 'map';
  // 美術圖：每個畫面只解開自己用得到的圖（js/artgroups.js），切過去之前先解開好，不會先看到程式畫的備用圖。
  // 通常已經好了（剛剛去過、或按下按鈕時就先解開），馬上切；還沒好就先停在原本的畫面，超過 ART_WAIT_MS 才蓋上讀取畫面
  // （登山畫面是那座山的小山讀取畫面 js/mtload.js，地圖、大廳是開場那個讀取畫面）
  const ART_WAIT_MS = 500;
  const RAIN_AHEAD_MS = 3 * 60000;   // 登山畫面：之後這麼久內會下雨就先把雨衣版解開（天氣每分鐘才看一次）
  // pet：要換成哪隻寵物（還沒存進存檔時用），m：要去的山（還沒出發時用）
  function artOpts(name, pet, m){
    const p = pet === undefined ? SV.pet : pet, mm = m || M, pets = p ? [p] : [];
    if (name === 'map') return { pets, rain: wx.kind === 'rain' };
    if (name !== 'climb') return {};
    const f = st && M === mm ? st.dist / mm.dist : 0, now = M === mm ? wx : wxOverride || (mm ? calcWx(mm.id, 0, f) : wx);   // 登山畫面畫的就是 wx
    const soon = !wxOverride && mm ? [calcWx(mm.id, 0, f), calcWx(mm.id, Date.now() + RAIN_AHEAD_MS, f)] : [];
    return { pets, rain: now.kind === 'rain' || soon.some(w => w.kind === 'rain') };
  }
  // 天氣、寵物換了：現在這個畫面要的圖重新算（下雨了／快下雨了先解開雨衣版，雨停一分鐘後放掉）
  const artRefresh = () => { if (!goWait && (screen === 'climb' || screen === 'map')) SX.art.want(screen, artOpts(screen)); };
  let goWait = null;
  function go(name, then){
    if (name === screen && !goWait) { if (then) then(); return; }
    artWait(name, null, () => { goNow(name); if (then) then(); });
  }
  // 等這個畫面的圖解開好再做 run（好了就馬上做）；m：要去爬的山（還沒出發時）
  function artWait(name, m, run){
    if (goWait) { clearTimeout(goWait.t); if (goWait.ld) goWait.ld.cancel(); else if (goWait.pre) goWait.pre.cancel(); }   // 還在等上一個畫面：改去這裡
    goWait = null;
    const o = artOpts(name, undefined, m), sw = () => { SX.art.want(name, o); run(); };
    if (!SX.art.ready() || SX.art.isReady(name, o)) { sw(); return; }   // 開場的圖還沒載完（玩家按了「先進去看看」）：照以前直接進去，圖到了各畫面自己換上
    const my = goWait = { name };
    const mm = m || M, pre = name === 'climb' && mm && SX.mtload ? SX.mtload.prep(mm) : null; my.pre = pre;   // 這座山的讀取圖（load_<山>）現在就開始下載
    my.t = setTimeout(() => { if (goWait === my) my.ld = artLoader(name, m, pre); }, ART_WAIT_MS);
    SX.art.prefetch(name, o, true).then(() => { if (goWait !== my) return; goWait = null; clearTimeout(my.t); if (my.ld) my.ld.done(sw); else { if (pre) pre.cancel(); sw(); } });
  }
  // 切畫面要等美術圖時蓋上的讀取畫面：登山畫面用那座山的小山（js/mtload.js），其他用開場的讀取畫面
  function artLoader(name, m, pre){
    if (name === 'climb' && (m || M) && SX.mtload) return SX.mtload.show(m || M, () => SX.art.progress('climb', artOpts('climb', undefined, m)), pre);
    const L = $('#loading'), f = $('#ldFill'), d = $('#ldDog'); if (!L) return null;
    const set = () => { const p = Math.round(SX.art.progress(name, artOpts(name)) * 100) + '%'; if (f) f.style.width = p; if (d) d.style.left = p; };
    set(); L.classList.remove('done'); const iv = setInterval(set, 100);
    return { done(fn){ clearInterval(iv); set(); L.classList.add('done'); fn(); }, cancel(){ clearInterval(iv); L.classList.add('done'); } };
  }
  function goNow(name){
    if (name === screen) return;
    if (name === 'album' || name === 'settings') prevScreen = screen;
    if (screen === 'map') { try { WM.stop(); } catch(e){} }
    if (screen === 'lobby' && SX.social) SX.social.close();
    ptrHold = false; keyHold = false;
    $$('.scr').forEach(s => s.classList.remove('on'));
    $('#scr' + name[0].toUpperCase() + name.slice(1)).classList.add('on');
    screen = name;
    if (name === 'map') renderMap();
    if (name === 'climb') { SC.resize(); catchUp(); }
    if (name === 'album') renderAlbum();
    if (name === 'settings') renderSettings();
    if (name === 'lobby' && SX.social) SX.social.open();
    moodNow();
  }
  document.addEventListener('click', e => {
    const g = e.target.closest('[data-go]'); if (g) { A.unlock(); A.pop(); if (g.dataset.go === 'bag') openBag(); else if (g.dataset.go === 'daily') openDaily(); else if (g.dataset.go === 'help') openHelp(); else if (g.dataset.go === 'find') findMt(); else go(g.dataset.go); }
    const b = e.target.closest('[data-back]'); if (b) { A.pop(); go(prevScreen === 'climb' && !st ? 'map' : prevScreen); }
  });
  // 手指一按下切畫面的按鈕就先開始解開那個畫面的圖（放開才切過去，多一點時間）
  document.addEventListener('pointerdown', e => {
    const g = e.target.closest && e.target.closest('[data-go],[data-back]'); if (!g) return;
    const n = g.dataset.go || (prevScreen === 'climb' && !st ? 'map' : prevScreen);
    if (n !== screen) SX.art.prefetch(n, artOpts(n));
  }, { passive:true });

  let bgNote = null;   // 正在顯示的那則背景通知 [文字, 毫秒]；玩家按出來的提示是 null
  function toast(msg, ms = 2200){ bgNote = null; MO.toast(msg, ms); }
  // 背景通知（隱藏任務完成、離開時自己走了多遠、這次的小目標）：讀取畫面還沒收、有彈出視窗、或正在跳別的提示時先排隊，
  // 等視窗關掉、上一則提示收起來才一則一則跳出來，不會蓋住「你不在的時候」這類視窗的標題。
  // 已經跳出來的背景通知，碰到視窗打開（modal）就先收起來、排回最前面，視窗關掉再跳
  const noticeQ = [];
  function notice(msg, ms = 2800){ noticeQ.push([msg, ms]); pumpNotice(); }
  function pumpNotice(){
    if (showFollowLog()) return;   // 好友跟隨：「隊長帶你走了什麼」先看
    const L = $('#loading');
    const diary = screen === 'climb' && st && st.away;   // 「你不在的時候」日記等一下就會打開：等它看完
    if (!noticeQ.length || (L && !L.classList.contains('done')) || diary || $('#modal').classList.contains('on') || $('#badgePop') || $('#toast').classList.contains('on')) return;
    const n = noticeQ.shift(); toast(n[0], n[1]); bgNote = n;
  }
  function holdNotice(){ if (!bgNote || !$('#toast').classList.contains('on')) return; noticeQ.unshift(bgNote); bgNote = null; MO.toastOff(); }
  function fitNotice(){ if (!fitDecayed) return; fitDecayed = false; notice('好久沒運動，體能掉了一點，多爬幾趟就會回來', 3600); }
  fitNotice();
  $('#toast').addEventListener('transitionend', e => { if (e.propertyName === 'opacity' && !e.target.classList.contains('on')) pumpNotice(); });
  // 動態效果（漣漪、星星、花瓣、交錯出場…）都在 js/motion.js；這裡只記最後點的位置，出發時的圓形展開從那裡開始
  let lastTap = { x: 0, y: 0 };
  document.addEventListener('pointerdown', e => { lastTap = { x: e.clientX, y: e.clientY }; }, { passive:true });

  // rise：奇遇、登頂、寶物這種卡片，由下面彈上來（一般視窗是放大跳出）
  function modal(html, rise){ holdNotice(); const c = $('#mCard'); c.innerHTML = html; c.scrollTop = 0; c.classList.toggle('rise', !!rise); $('#modal').classList.add('on'); paused = true; if (rise) MO.rise(c); }
  function closeModal(){ $('#modal').classList.remove('on'); paused = false; if (st && screen === 'climb') st.last = Date.now(); queueMicrotask(() => { followSwitch(); pumpNotice(); }); }   // 等這次點擊處理完（可能馬上又開下一個視窗）再看要不要跳排隊的通知

  // ───────── 天氣 ─────────
  let wxOverride = null;
  const WX_NAMES = { sunny:'晴', cloudy:'多雲', fog:'起霧', rain:'下雨', snow:'下雪' };
  const TIME_NAMES = { dawn:'清晨', day:'', dusk:'黃昏', night:'夜晚' };
  const WXD = { sunny:'clear', cloudy:'cloud', fog:'fog', rain:'rain', snow:'snow' };   // 對應 data.js 奇遇用的天氣名稱
  const wxText = w => (TIME_NAMES[w.time] ? TIME_NAMES[w.time] + '・' : '') + WX_NAMES[w.kind];
  // 下雪：只在雪季（SX.SEASONS 的 snow）那幾座山、走到雪線（全程的 SNOW_LINE）以上才會下
  // 雪線以上：本來會下雨的時段一律變成下雪，多雲或起霧的時段有 SNOW_P 的機率變成下雪（合起來約四分之一的時間在下雪）
  const SNOW_LINE = 0.4, SNOW_P = 0.3;
  function calcWx(id, ts, f = 1){   // ts：算某個時間點的天氣（離開時的日記用），不給就是現在；f：走到全程幾成，不給就是山頂
    ts = ts || Date.now();
    const d = new Date(ts), h = d.getHours() + d.getMinutes()/60;
    const time = h >= 5 && h < 7 ? 'dawn' : h >= 7 && h < 17 ? 'day' : h >= 17 && h < 18.6 ? 'dusk' : 'night';
    id = id || SV.cur || 'x';
    const R = C.rng(C.hash(SX.groupOf(id) + Math.floor(ts / 1200000))), rr = R(), rs = R();   // 同一個山群是同一片天空：群峰卡片和每座山的卡片天氣一樣
    const fogBias = SX.M[id] && SX.M[id].theme.fog ? 0.15 : 0;
    let kind = rr < 0.16 ? 'rain' : rr < 0.3 + fogBias ? 'fog' : rr < 0.52 + fogBias ? 'cloudy' : 'sunny';
    if (f >= SNOW_LINE && (kind === 'rain' || ((kind === 'fog' || kind === 'cloudy') && rs < SNOW_P)) && snowSeasonAt(id, ts)) kind = 'snow';
    return { kind, time };
  }
  // ───────── 季節限定（真實日期，台灣時間；資料在 SX.SEASONS）─────────
  let testDate = null;   // 只給測試掛鉤 SXG.date() 用
  const snowSeasonAt = (id, ts) => SX.seasonsAt(testDate || new Date(ts)).some(s => s.id === 'snow' && s.mountains.includes(SX.groupOf(id)));
  let wx = calcWx();
  const seasonNow = (date = testDate || new Date()) => SX.seasonsAt(date);
  // w、date：要判斷的天氣時段和日期（離開時的日記用「當時」的），不給就是現在
  const seasonOk = (sid, mid, w = wx, date) => { const s = seasonNow(date).find(x => x.id === sid); return !!s && s.mountains.includes(SX.groupOf(mid)) && (!s.time || s.time.includes(w.time)); };
  const mdText = md => `${+md.slice(0, 2)}/${+md.slice(3)}`;   // '03-31' → '3/31'
  const seasonEnd = s => mdText(s.to);
  const WX_CYCLE = [{kind:'sunny',time:'day'},{kind:'cloudy',time:'day'},{kind:'fog',time:'day'},{kind:'rain',time:'day'},{kind:'snow',time:'day'},{kind:'sunny',time:'dusk'},{kind:'sunny',time:'night'},{kind:'rain',time:'night'},{kind:'sunny',time:'dawn'}];
  function cycleWx(){
    const i = WX_CYCLE.findIndex(w => w.kind === wx.kind && w.time === wx.time);
    wxOverride = WX_CYCLE[(i + 1) % WX_CYCLE.length]; wx = wxOverride; moodNow(); artRefresh();
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
    if (HUD.drawWxArt(c, kind, time, s)) return;   // 有天氣美術圖就用圖（跟登山畫面同一套對照）
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
      c.fillStyle = kind === 'rain' ? '#cfd8de' : kind === 'snow' ? '#e4e9f0' : '#fffaf0'; c.beginPath();
      c.arc(12, 20, 6, Math.PI * 0.5, Math.PI * 1.5); c.arc(17, 15.5, 6.5, Math.PI, Math.PI * 1.9); c.arc(23, 20.5, 5.5, Math.PI * 1.4, Math.PI * 0.5);
      c.closePath(); c.fill(); c.stroke();
      if (kind === 'rain') { c.strokeStyle = '#4f9fd6'; c.beginPath(); [11, 17, 23].forEach(px => { c.moveTo(px, 28.5); c.lineTo(px - 1.5, 32.5); }); c.stroke(); }
      if (kind === 'snow') { c.fillStyle = '#fff'; c.lineWidth = 1; [11, 17, 23].forEach((px, i) => { c.beginPath(); c.arc(px, 30 + (i % 2) * 2, 1.8, 0, 6.2832); c.fill(); c.stroke(); }); }
      if (kind === 'fog') { c.strokeStyle = '#9aa7ad'; c.beginPath(); c.moveTo(6, 29); c.lineTo(28, 29); c.moveTo(9, 32.5); c.lineTo(25, 32.5); c.stroke(); }
    }
  }

  // ───────── 地圖 ─────────
  let mapInit = false;
  // 解鎖規則：山群裡的山看山群主峰（lead）的難度；難度 1–2 一開始就開放，其他要先登頂任何一座「難度 ≥ 自己 − 1」的山
  // 百岳再加官方分級（跟真實入山申請一樣）：B 級要先登頂過 A 級以上的百岳，C 要 B 以上、C+ 要 C 以上（SX.GRADES 的 need）
  const leadOf = m => (m.group && SX.M[SX.GROUP[m.group].lead]) || m;
  const diffOpen = m => { const L = leadOf(m); return L.diff <= 2 || SX.MOUNTAINS.some(x => SV.done[x.id] && x.diff >= L.diff - 1); };
  const gradeRank = id => SX.GRADE_ORDER.indexOf(SX.gradeOf(id));   // 不是百岳 → -1
  const gradeNeed = m => SX.gradeNeed(m.id);   // 遊戲裡還沒有官方要求那一級的山時，data.js 會往下找一級
  const gradeOpen = m => { const n = gradeNeed(m); return !n || SX.MOUNTAINS.some(x => SV.done[x.id] && gradeRank(x.id) >= SX.GRADE_ORDER.indexOf(n)); };
  const unlocked = m => SV.unlockAll || (diffOpen(m) && gradeOpen(m));
  const lockText = m => { if (!diffOpen(m)) return `登頂任一座 ${leadOf(m).diff - 1} 顆星以上的山，就能挑戰這裡。`;
    const g = SX.gradeOf(m.id), n = gradeNeed(m);
    return `官方分級 ${g} 級：爬過任一座 ${n} 級以上的百岳，就能挑戰。`; };
  // 入山管制（雪季 C+ 要三人以上組隊）：規則只在 SX.permitNeed；卡片和 startClimb 都只問這裡
  // 只在「從登山口出發」時檢查：已經在路上的那座（onTrail）接著走不擋，季節結束或隊友離開都不會把人困在山上
  // 擋住時回 { reason, minParty, have }，可以出發回 null。寵物不算人數
  const partySize = id => SX.social && SX.social.partySize ? SX.social.partySize(id) : 1;
  const permitBlock = id => { if (onTrail() === id) return null; const n = SX.permitNeed(id, testDate || new Date()), have = partySize(id); return n && have < n.minParty ? Object.assign({ have }, n) : null; };
  // 建議挑戰順序：已開放、還沒爬過的山裡，難度最低、時間最短的那座；全都爬過就推爬最少次的。正在爬的那座不推
  function recommendNext(){
    const going = id => { const p = SV.prog[id]; return id === SV.cur && p && p.dist > 0 && !p.fin; };
    const L = SX.MOUNTAINS.filter(m => unlocked(m) && !going(m.id));
    L.sort((a, b) => (SV.done[a.id] ? 1 : 0) - (SV.done[b.id] ? 1 : 0) || (SV.done[a.id] || 0) - (SV.done[b.id] || 0) || a.diff - b.diff || a.recMin - b.recMin);
    return L[0] || null;
  }
  // 這座山對現在的你來說：推薦／適合／有點挑戰（依爬過最難的山）
  function fitText(m){
    const r = recommendNext(); if (r && r.id === m.id) return '下一座就爬這裡吧！難度剛好，時間也不長';
    const top = Math.max(2, ...SX.MOUNTAINS.filter(x => SV.done[x.id]).map(x => x.diff));
    return m.diff <= top ? '適合現在的你' : '有點挑戰，量力而為、多休息';
  }
  // 地圖旗子（SX.PINS）：山群一根旗子，狀態由山群裡的山合起來——有一座登頂就戴皇冠、全部都鎖住才算鎖、正在爬其中一座就算這根
  function renderMap(){
    const done = {}, prog = {}, locked = {}, photos = {};
    SV.userPhotos.forEach(p => { const k = SX.groupOf(p.mountainId); photos[k] = (photos[k] || 0) + 1; });
    SX.PINS.forEach(pin => {
      const ps = pin.isGroup ? SX.peaksOf(pin.id) : [pin];
      done[pin.id] = ps.reduce((a, m) => a + (SV.done[m.id] || 0), 0);
      if (!ps.some(unlocked)) locked[pin.id] = true;
      const f = Math.max(0, ...ps.map(m => { const p = SV.prog[m.id]; return p && !p.fin ? p.dist / m.dist : 0; }));   // 進度條：走最遠、還沒走完的那座
      if (f > 0) prog[pin.id] = { dist:f * pin.dist };
    });
    const cur = SV.cur && SX.M[SV.cur] ? SX.groupOf(SV.cur) : null, rec = recommendNext();
    try {
      WM.setData({ mountains:SX.PINS, coast:SX.COAST, ridge:SX.RIDGE, done, prog, current:cur, locked, photos, pet:SV.pet || null, rain:wx.kind === 'rain', rec:rec ? SX.groupOf(rec.id) : null });
      WM.start(); if (!mapInit) { mapInit = true; WM.reset(); }
    } catch(e){ console.error('worldmap', e); }
  }
  const hideRoute = () => { $('#routeCard').classList.remove('on'); try { WM.clearSelection(); } catch(e){} };
  try {
    WM.init($('#mapWrap'));
    WM.onSelect(id => { A.unlock(); A.pop(); if (SX.GROUP[id]) showGroup(id); else showRoute(id); });   // 旗子是山群：先開群峰卡片
    WM.onBackground(hideRoute);
  } catch(e){ console.error('worldmap', e); }
  $('#mapWrap').addEventListener('pointerdown', () => $('#scrMap .mapHint').classList.add('off'), { once:true });   // 知道怎麼操作了，提示就收起來

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
    return SX.art.img(id ? 'pet_' + id + '_face' : 'face_happy', `<svg viewBox="0 0 52 52">${body}</svg>`);
  }
  function showRoute(id){
    const m = SX.M[id]; if (!m) return;
    const p = SV.prog[id], done = SV.done[id] || 0, ok = unlocked(m);
    const going = p && p.dist > 0 && p.dist < m.dist && !p.fin;
    const tr = onTrail(), busy = ok && tr && tr !== id, trN = tr && SX.M[tr].name;
    if (ok && !busy) SX.art.prefetch('climb', artOpts('climb', undefined, m));   // 打開能爬的山的路線卡：登山畫面的圖先在背景解開，按「出發」通常不用等
    const w = wxOverride || calcWx(id), nPh = SV.photos.filter(x => x.id === id).length, nUp = SV.userPhotos.filter(x => x.mountainId === id).length;
    const pet = SX.PETS.find(x => x.id === SV.pet) || PET_NONE;
    const stars = [1,2,3,4,5].map(i => `<i${i <= m.diff ? '' : ' class="off"'}></i>`).join('');
    const grade = SX.gradeOf(id), g = m.group && SX.GROUP[m.group];
    // 雪季管制：人數不夠時，大綠鈕換成「還差幾人」並多一顆「邀請山友」（還在別座山上也一樣，免得先下山歸零才發現出不了發）
    const permit = ok && permitBlock(id);
    // 「邀請山友」自己一排：跟「回到某某山繼續爬」擠同一排時，375 寬會被擠成兩行
    const permitBtns = lead => `<div class="rc-btns">${lead}</div><div class="rc-btns"><button class="cbtn sm" id="rcInv">邀請山友</button></div>
        <div class="rc-btns"><button class="cbtn go" id="rcNeed" aria-disabled="true">還差 ${permit.minParty - permit.have} 人才能出發</button></div>`;
    const card = $('#routeCard');
    card.innerHTML = `${g ? `<button class="cbtn sm cBack" id="rcBack">← ${g.full}</button>` : '<button class="cbtn sm cBack" id="rcX">← 返回</button>'}
      <div class="ic-h"><b>${m.name}</b><span class="ic-alt">${m.area}・${m.alt.toLocaleString('en-US')} m</span><span class="stars">${stars}</span></div>
      <div class="ic-wx paper"><canvas id="rcWx"></canvas><span>現在山上：${wxText(w) || '晴'}${done ? `　已登頂 ${done} 次` : ''}</span></div>
      ${seasonChips(id)}
      <div class="ic-meta">
        <div class="paper"><small>路程</small><b>${(m.dist/1000).toFixed(1)} km</b></div>
        <div class="paper"><small>山友實際時間</small><b>${fmtMin(m.recMin)}</b></div>
        <div class="paper"><small>收集的照片</small><b>${nPh} 張${nUp ? `＋${nUp}` : ''}</b></div>
        <div class="paper"><small>沿途地標</small><b>${(m.waypoints || []).length} 處</b></div>
      </div>
      ${ok ? `<div class="rc-feat"><em>建議：</em>${fitText(m)}</div>` : ''}
      <div class="rc-feat"><em>紀錄：</em>${m.recNote}</div>
      <div class="rc-feat"><em>沿途：</em>${m.feat}</div>
      <div class="rc-feat"><em>終點：</em>${m.end}</div>
      ${grade ? `<div class="rc-feat"><em>官方分級：</em>${gradeChip(grade)} ${SX.GRADES[grade].text}（百岳第 ${m.by} 名）</div>` : ''}
      ${permit ? `<div class="rc-feat"><em>入山管制：</em>${permit.reason}（目前 ${permit.have} 人）。到山友大廳邀好友一起爬，對方接受就會入隊；寵物不算人數。</div>` : ''}
      ${ok ? '<div class="rc-feat" id="rcQuota" hidden></div>' : ''}
      ${busy ? `<div class="rc-feat"><em>還在山上：</em>你正在爬${trN}，一次只能走一條路線。想改爬${m.name}，要先下山（${trN}的進度會歸零）。</div>
        ${permit ? permitBtns(`<button class="cbtn sm" id="rcBackTo">回到${trN}繼續爬</button>`) : `<div class="rc-btns"><button class="cbtn sm" id="rcBackTo">回到${trN}繼續爬</button></div>
        <div class="rc-btns"><button class="cbtn go" id="rcSwitch">下山，改爬${m.name}</button></div>`}`
      : ok ? (permit ? permitBtns(`<button class="cbtn sm" id="rcPet">同行夥伴：${pet.name}</button>${going ? '<button class="cbtn sm" id="rcDown">下山</button>' : ''}`)
        : `<div class="rc-btns"><button class="cbtn sm" id="rcPet">同行夥伴：${pet.name}</button>${going ? '<button class="cbtn sm" id="rcDown">下山</button>' : ''}</div>
        <div class="rc-btns"><button class="cbtn go" id="rcGo">${going ? `繼續爬（${(p.dist/1000).toFixed(2)} km）` : done ? '再爬一次' : '出發登山'}</button></div>`)
      : `<div class="rc-feat"><em>還不能爬：</em>${lockText(m)}</div>
        <div class="rc-btns"><button class="cbtn go" id="rcLock" aria-disabled="true">還沒解鎖</button></div>`}`;
    card.classList.add('on'); card.scrollTop = 0;
    wxIcon($('#rcWx'), w.kind, w.time);
    if (!g) $('#rcX').onclick = e => { e.stopPropagation(); hideRoute(); };
    if (g) $('#rcBack').onclick = e => { e.stopPropagation(); A.pop(); showGroup(g.id); };
    // 下山要按兩次（第一次換成確認字樣），避免誤按
    const dn = $('#rcDown'); if (dn) dn.onclick = e => { e.stopPropagation(); A.pop(); if (!dn.dataset.arm) { dn.dataset.arm = 1; dn.textContent = '再按一次確定下山（進度歸零）'; return; } goDown(id); hideRoute();
      // 下山插圖卡（scene_descend，還沒畫之前只有文字）
      modal(`${SX.art.img('scene_descend', '', 'artImg summitArt')}<h3>下山了</h3><p class="summitBig">今天先走到這裡。山一直都在，下次從登山口再出發。</p><p class="summitBig">路上的寶物和照片，都收在背包和相簿裡。</p><div class="mBtns"><button class="cbtn go" id="dnOk">好</button></div>`);
      $('#dnOk').onclick = () => { closeModal(); showRoute(id); }; };
    // 這張卡片的大綠鈕（cbtn go）只會出發去這張卡片的山（id）；回到另一座山用小按鈕、寫清楚山名（check 會檢查）
    // 鎖住的大綠鈕：不出發，搖一下並說原因
    const lk = $('#rcLock') || $('#rcNeed'); if (lk) lk.onclick = e => { e.stopPropagation(); MO.shake(lk); toast(ok ? `${permit.reason}（目前 ${permit.have} 人）` : '這座山還不能爬：' + lockText(m), 3000); };
    if (permit) $('#rcInv').onclick = e => { e.stopPropagation(); A.pop(); hideRoute(); if (SX.social && SX.social.openInvite) SX.social.openInvite(id); };
    if (busy) {
      $('#rcBackTo').onclick = () => { A.unlock(); A.chime(); startClimb(tr); };
      const sw = $('#rcSwitch');   // 換山會把另一座的進度歸零：按兩次（第一次換成確認字樣），避免誤按
      // 換山：先登記好入園名額才下山（名額滿了就不會白白把另一座歸零）
      if (sw) sw.onclick = e => { e.stopPropagation(); A.unlock(); if (!sw.dataset.arm) { A.pop(); sw.dataset.arm = 1; sw.textContent = `再按一次確定（${trN}歸零）`; return; } A.chime(); quotaGate(id, () => { goDown(tr); startClimb(id, false, true); }); };
    }
    else if (ok) {
      $('#rcPet').onclick = () => openPets(id);
      if (!permit) $('#rcGo').onclick = e => { A.unlock(); A.chime(); MO.beat(e.currentTarget).then(on => {   // 縮成圓、打勾（不到 0.4 秒）再出發；卡片收起或換掉就不出發
        if (on && card.classList.contains('on')) startClimb(id); }); };
    }
    card.dataset.mt = id;
    if (ok) { paintQuota(id); if (SX.social && SX.social.quotaLoad) SX.social.quotaLoad().then(() => { if (card.dataset.mt === id && card.classList.contains('on')) paintQuota(id); }); }   // 打開卡片時拿今天的人數（一分鐘內拿過就用快取）
  }
  // ───────── 熱門山每日入園名額 ─────────
  // 哪幾座山有名額、每天幾個只在伺服器；這裡只問 SX.social（quotaInfo／quotaClaim）。不在名額表的山一律不擋
  // 已經在這座山上（onTrail）接著走不用名額，永遠不會被趕下山；沒有夜間限制
  const QUOTA_FULL = '今天名額滿了，明天再來';
  const quotaInfo = id => SX.social && SX.social.quotaInfo ? SX.social.quotaInfo(id) : null;
  // 卡片上的「今日入園 5／12」，滿了就把出發的大綠鈕換成不能按
  function paintQuota(id){
    const el = $('#rcQuota'), q = el && quotaInfo(id); if (!el) return;
    el.hidden = !q; if (!q) return;
    const blocked = q.full && onTrail() !== id;
    el.innerHTML = `<em>今日入園 ${q.used}／${q.cap}</em>${q.mine ? '（你今天登記過了）' : blocked ? '（滿了）' : ''}<br>熱門的山每天人數有限，跟真的一樣要排隊。`;
    if (!blocked) return;
    ['#rcGo', '#rcSwitch'].forEach(s => { const b = $(s); if (!b) return;
      b.textContent = QUOTA_FULL; b.setAttribute('aria-disabled', 'true');
      b.onclick = e => { e.stopPropagation(); MO.shake(b); toast('熱門的山每天人數有限，台灣時間半夜 12 點重新開放', 3200); }; });
  }
  // 出發前登記名額，可以出發才跑 go()；滿了說明、沒有帳號就先取個暱稱
  function quotaGate(id, go){
    if (!SX.social || !SX.social.quotaClaim || onTrail() === id) { go(); return; }
    SX.social.quotaClaim(id).then(r => {
      if (r.ok) go();
      else if (r.full) { toast(QUOTA_FULL, 3200); if (screen === 'map') showRoute(id); }
      else if (r.needAcct) askNickname(id, go);
    });
  }
  // 沒有帳號的人要爬有名額的山：入園要登記名字，取個暱稱就好（跟山友大廳一樣的帳號，不用密碼）
  function askNickname(id, go){
    modal(`<h3>入園登記</h3><p class="summitBig">${SX.M[id].name}每天人數有限，跟真的一樣要登記名字才能入園。取個暱稱就好，不用密碼；其他山友也會看到這個名字。</p>
      <label class="fl"><input id="qnIn" class="txtIn" maxlength="12" placeholder=" "><span><b>暱稱（最多 12 個字）</b></span></label>
      <div class="mBtns"><button class="cbtn" id="qnNo">先不要</button><button class="cbtn go" id="qnOk">登記，出發</button></div>`);
    $('#qnNo').onclick = () => { A.pop(); closeModal(); };
    $('#qnOk').onclick = async () => {
      const v = $('#qnIn').value.trim(); if (!v) { toast('先取個暱稱吧'); return; }
      $('#qnOk').disabled = true;
      try { await SX.social.register(v); closeModal(); toast(`歡迎，${v}！`); quotaGate(id, go); }
      catch(e){ toast(e.message, 3200); $('#qnOk').disabled = false; }
    };
  }
  // 正在進行的季節小標籤（山群的山跟著山群的季節走）
  function seasonChips(id){
    const seas = seasonNow().filter(s => s.mountains.includes(SX.groupOf(id)));
    return seas.length ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin:6px 0">${seas.map(s => `<span class="chip" style="background:#ffd9e4;font-size:12px;white-space:nowrap">季節限定：${s.name}${s.time ? '・' + s.time.map(t => TIME_NAMES[t]).join('、') : ''}（到 ${seasonEnd(s)}）</span>`).join('')}</div>` : '';
  }
  const gradeChip = g => `<span class="grd g${SX.GRADE_ORDER.indexOf(g)}">${g}</span>`;   // 官方分級小牌（A 綠、B 藍、C 橘、C+ 紅）
  const LOCK_SVG = `<svg viewBox="0 0 20 22"><path d="M5.5 10V7a4.5 4.5 0 0 1 9 0v3" fill="none" stroke="${INK}" stroke-width="2.2"/><rect x="2.5" y="9.5" width="15" height="11" rx="3" fill="#d9a441" stroke="${INK}" stroke-width="1.8"/><circle cx="10" cy="15" r="1.6" fill="${INK}"/></svg>`;
  // 群峰卡片：點地圖上的山群旗子先開這張，列出每一座山；點一列打開那座山的卡片（卡片裡有「← 群峰」回來）
  // 一座山的一列（山群卡片、找山清單共用）：名字、距離時間、爬到一半的進度、官方分級、登頂打勾／鎖頭／箭頭；where：多寫在哪一區（找山用）
  function peakRow(m, where){
    const p = SV.prog[m.id], d = SV.done[m.id], lk = !unlocked(m), f = p && !p.fin && p.dist > 0 ? p.dist / m.dist : 0, gr = SX.gradeOf(m.id);
    return `<button class="pkRow paper${lk ? ' lk' : ''}" data-pk="${m.id}"><span class="pkN"><b>${m.name}</b><small>${where ? m.area + '・' : ''}${(m.dist / 1000).toFixed(1)} km・${fmtMin(m.recMin)}</small>${f ? `<span class="dyBar"><i style="width:${f * 100}%"></i></span>` : ''}</span>
          ${gr ? gradeChip(gr) : ''}<span class="pkS">${d ? '<i class="pkOk">✓</i>' : lk ? SX.art.img('icon_lock', LOCK_SVG) : '<i class="pkGo">›</i>'}</span></button>`;
  }
  // 找山：跟山群卡片同一張木框卡片、同一種清單；上面一個搜尋框和四個篩選小標籤。點一座山：地圖飛過去、打開那座山的卡片
  const FIND_TABS = [['all', '全部'], ['open', '可以爬'], ['new', '還沒爬過'], ['done', '已登頂']];
  let findTab = 'all', findQ = '';
  function findMt(){
    const card = $('#routeCard');
    card.innerHTML = `<button class="cbtn sm cBack" id="rcX">← 返回</button>
      <div class="ic-h"><b>找山</b><span class="ic-alt">已登頂 ${SX.MOUNTAINS.filter(m => SV.done[m.id]).length}／${SX.MOUNTAINS.length}</span></div>
      <label class="fl findQ"><input id="fdQ" class="txtIn" maxlength="12" placeholder=" " value="${findQ.replace(/"/g, '')}"><span><b>山名或地區</b></span></label>
      <div class="findTabs">${FIND_TABS.map(([k, n]) => `<button class="chip${findTab === k ? ' on' : ''}" data-ft="${k}">${n}</button>`).join('')}</div>
      <div class="pkList" id="fdList"></div>`;
    const list = () => {
      const q = findQ.trim(), L = SX.MOUNTAINS.filter(m => (!q || m.name.includes(q) || m.area.includes(q))
        && (findTab === 'all' || (findTab === 'open' ? unlocked(m) : findTab === 'new' ? !SV.done[m.id] : !!SV.done[m.id])))
        .slice().sort((a, b) => a.recMin - b.recMin);
      $('#fdList').innerHTML = L.length ? L.map(m => peakRow(m, true)).join('') : '<p class="rc-feat">沒有找到符合的山</p>';
      $$('#fdList [data-pk]').forEach(b => b.onclick = e => { e.stopPropagation(); A.pop(); if (SX.worldmap && SX.worldmap.focus) SX.worldmap.focus(b.dataset.pk); showRoute(b.dataset.pk); });
    };
    card.classList.add('on'); card.scrollTop = 0; list();
    $('#rcX').onclick = e => { e.stopPropagation(); hideRoute(); };
    $('#fdQ').oninput = e => { findQ = e.target.value; list(); };
    $$('#routeCard [data-ft]').forEach(b => b.onclick = e => { e.stopPropagation(); A.pop(); findTab = b.dataset.ft; $$('#routeCard [data-ft]').forEach(x => x.classList.toggle('on', x === b)); list(); });
  }
  function showGroup(gid){
    const g = SX.GROUP[gid]; if (!g) return;
    const ps = SX.peaksOf(gid).slice().sort((a, b) => a.recMin - b.recMin), L = SX.M[g.lead], nDone = ps.filter(m => SV.done[m.id]).length;
    const w = wxOverride || calcWx(g.lead), card = $('#routeCard');
    card.innerHTML = `<button class="cbtn sm cBack" id="rcX">← 返回</button>
      <div class="ic-h"><b>${g.full}</b><span class="ic-alt">${L.area}・已登頂 ${nDone}／${ps.length}</span></div>
      <div class="ic-wx paper"><canvas id="rcWx"></canvas><span>現在山上：${wxText(w) || '晴'}</span></div>
      ${seasonChips(gid)}
      <div class="pkList">${ps.map(m => peakRow(m)).join('')}</div>
      <div class="rc-feat"><em>小提醒：</em>點一座山看路線、出發登山。</div>`;
    card.classList.add('on'); card.scrollTop = 0;
    wxIcon($('#rcWx'), w.kind, w.time);
    $('#rcX').onclick = e => { e.stopPropagation(); hideRoute(); };
    $$('#routeCard [data-pk]').forEach(b => b.onclick = e => { e.stopPropagation(); A.pop(); showRoute(b.dataset.pk); });
  }
  function openPets(backId){
    const list = [PET_NONE].concat(SX.PETS);
    modal(`<h3>要帶誰一起走？</h3><div class="petPick">${list.map(p => `<button class="pet${(SV.pet || '') === p.id ? ' on' : ''}" data-pet="${p.id}"${hasPet(p) ? '' : ' style="filter:grayscale(1);opacity:.55"'}>${petSvg(p.id)}${p.name}</button>`).join('')}</div>
      <p class="summitBig" id="petMsg" style="margin-top:12px">${(list.find(p => p.id === (SV.pet || '')) || PET_NONE).desc}</p>
      <div class="mBtns"><button class="cbtn go" id="petOk">決定了</button></div>`);
    $$('#mCard .pet').forEach(b => b.onclick = () => {
      const p = list.find(x => x.id === b.dataset.pet); A.pop();
      if (!hasPet(p)) { $('#petMsg').textContent = `${p.name}還沒來：${p.unlockText || '還在山裡等你'}`; return; }
      // 正在爬山：新寵物的圖先解開好再換（不會先閃一下程式畫的寵物）
      const apply = () => { SV.pet = p.id || null; save(); artRefresh(); $$('#mCard .pet').forEach(x => x.classList.toggle('on', x === b)); $('#petMsg').textContent = p.desc; };
      if (screen === 'climb' && p.id) SX.art.prefetch('climb', artOpts('climb', p.id), true).then(apply); else apply();
    });
    $('#petOk').onclick = () => { A.pop(); closeModal(); if (backId && screen === 'map') showRoute(backId); };
  }

  // ───────── 登山 ─────────
  let M = null, st = null, t = 0, arrived = false, paused = false, ptrHold = false, keyHold = false;
  let lineT = 8, coldT = 0, lastEnc = null;
  // quotaOk：入園名額已經登記好了（quotaGate 登記完再叫回來）
  function startClimb(id, force, quotaOk, artOk){
    const m = SX.M[id]; if (!m) return;
    if (!force && !unlocked(m)) { toast('這座山還不能爬'); return; }
    const tr = onTrail(); if (!force && tr && tr !== id) { toast(`你還在${SX.M[tr].name}上，先登頂或下山`); return; }
    const tb = !force && tr !== id && SX.social && SX.social.teamBlock && SX.social.teamBlock(); if (tb) { toast(tb, 3600); return; }   // 好友跟隨：在隊伍裡就跟著隊長選的山走
    const pb = !force && permitBlock(id); if (pb) { toast(`${pb.reason}（目前 ${pb.have} 人）`, 3200); return; }
    if (!force && !quotaOk && tr !== id) { quotaGate(id, () => startClimb(id, false, true)); return; }   // 熱門山：先登記今天的入園名額
    if (!artOk) { artWait('climb', m, () => startClimb(id, force, quotaOk, true)); return; }   // 登山畫面的圖先解開好（要等的話蓋上這座山的小山讀取畫面）
    const cont = onTrail() === id;   // 只有「正在爬的那座」接著走、補算離開的時間；其他一律從登山口重新出發（不會帶到舊進度、舊日記）
    M = m; SV.cur = id; st = P(id); etaV = 0; etaT = 0;   // 換山：預計時間的平均速度重算
    if (!cont) Object.assign(st, newProg());
    arrived = false; paused = false; ptrHold = false; keyHold = false; t = 0;
    segDoneT = 0; segEl.classList.remove('done');   // 小目標：新的一趟沒有；離開一分鐘以上回來，catchUp 會清掉重新定
    $('#routeCard').classList.remove('on'); $('#modal').classList.remove('on');
    wx = wxOverride || wxHere();
    SC.setMountain(M); SC.setCairns(SV.cairns[id] || []);
    try { HUD.setRoute(M.route, M.routeM); } catch(e){ console.error('hud', e); }
    if (screen === 'climb') catchUp(); else go('climb');
    SC.resize(); A.nextDay();
    const sc = $('#scrClimb'), ar = $('#app').getBoundingClientRect(); sc.style.setProperty('--rx', (lastTap.x - ar.left) + 'px'); sc.style.setProperty('--ry', (lastTap.y - ar.top) + 'px'); sc.classList.remove('reveal'); void sc.offsetWidth; sc.classList.add('reveal');
    $('#tapHint').classList.toggle('off', !!st.fast);
    hudTick();
    if (!SV.intro) firstClimbIntro();
    save();
  }
  // 第一次出發：一張小卡說明怎麼玩（只出現一次，記在存檔 SV.intro；已經走過路的舊存檔直接當看過）
  function firstClimbIntro(){
    SV.intro = today();
    if (SV.stats.walked > 0) return;
    modal(`<h3>開始登山囉</h3>
      <ul class="introL">${tutIntro().map(x => `<li>${x.t}</li>`).join('')}</ul>
      <div class="mBtns"><button class="cbtn go" id="inOk">好，出發！</button></div>`);
    $('#inOk').onclick = () => { A.pop(); closeModal(); };
  }
  // 新手教學（地圖頂列、登山畫面下方的「?」）：內容在 data.js 的 SX.TUTORIAL，一頁一個主題，左右翻頁
  const tutIntro = () => SX.TUTORIAL.flatMap(p => p.items).filter(x => x.intro);
  // from：從哪一頁翻過來（左右滑、按上一頁下一頁），新的一頁從那個方向滑進來、圓點跟著移過去
  function openHelp(page = 0, from = page){
    const P = SX.TUTORIAL, pg = P[page], last = page >= P.length - 1, DOT = 15;   // DOT：圓點 8px＋間距 7px
    modal(`<button class="cbtn sm mBack" id="tuX">← 返回</button><h3>新手教學・${pg.title}</h3>
      <div class="tutPage" id="tutPage"><ul class="awayL tutL">${pg.items.map(x => `<li>${awIco(x.icon)}<span><b>${x.h}</b>${x.t}</span></li>`).join('')}</ul></div>
      <div class="tutDots"><span class="tdW">${P.map(() => '<i></i>').join('')}<b class="tutDot" id="tutDot" style="transform:translateX(${page * DOT}px)"></b></span></div>
      <div class="mBtns">${page ? '<button class="cbtn" id="tuPrev">‹ 上一頁</button>' : ''}<button class="cbtn go" id="tuNext">${last ? '開始登山吧' : '下一頁 ›'}</button></div>`);
    const pageEl = $('#tutPage'), dot = $('#tutDot'), turn = d => { A.pop(); openHelp(page + d, page); };
    if (from === page) MO.stagger($('#mCard'), '.tutL li');
    else { MO.slideIn(pageEl, page > from ? 1 : -1); MO.run(dot, [{ transform:`translateX(${from * DOT}px)` }, { transform:`translateX(${page * DOT}px)` }], { duration:320, easing:MO.SPRING }); }
    // 手指左右滑：這一頁跟著手指走、圓點跟著移；放開時滑超過 50px 就換頁，不然彈回來
    MO.swipe(pageEl, {
      move: dx => { const w = pageEl.offsetWidth || 300, f = clamp(page - dx / w, 0, P.length - 1);
        pageEl.style.transform = `translateX(${(dx < 0 && last) || (dx > 0 && !page) ? dx * 0.3 : dx}px)`; dot.style.transform = `translateX(${f * DOT}px)`; },
      end: dx => {
        if (dx < -50 && !last) return turn(1);
        if (dx > 50 && page) return turn(-1);
        const was = pageEl.style.transform; pageEl.style.transform = ''; dot.style.transform = `translateX(${page * DOT}px)`;
        if (was) MO.run(pageEl, [{ transform:was }, { transform:'none' }], { duration:320, easing:MO.SPRING });
      } });
    $('#tuX').onclick = () => { A.pop(); closeModal(); };
    if (page) $('#tuPrev').onclick = () => turn(-1);
    $('#tuNext').onclick = () => { if (last) { A.pop(); closeModal(); } else turn(1); };
  }
  const wxHere = () => calcWx(M ? M.id : null, 0, st && M ? st.dist / M.dist : 1);   // 登山客現在所在位置的天氣（雪線以下不會下雪）

  // 有多冷：海拔、夜晚、雨雪霧、高山的風
  function chill(m, f, w){
    return Math.max(0, altAt(m, f) - 500) / 3500 * 0.5 + (w.time === 'night' ? 0.35 : w.time === 'dawn' ? 0.15 : 0)
      + (w.kind === 'snow' ? 0.6 : w.kind === 'rain' ? 0.4 : w.kind === 'fog' ? 0.2 : 0) + (m.theme.alpine || m.theme.snow ? 0.2 : 0);
  }
  // 親自看著走（不含離線補走）：今天累積走滿 500 公尺，狀態恢復一點（每天一次）
  function fitWalk(d){
    const t = SX.twDay(), w = SV.fitWalk;
    if (w.day !== t) { w.day = t; w.m = 0; }
    w.m += d;
    if (w.m >= SX.FIT.RECOVER_M && w.rec !== t) { w.rec = t; SV.cond = SX.fitRecover(SX.fitCond(SV)); }
  }
  // 往前模擬 dt 秒，回傳走了幾公尺。offline：離線補走（不會自己登頂，留最後 2 公尺給玩家看）；dry：只是試算（不記里程、不算每日任務）
  function simulate(p, m, dt, boost, offline, dry, pace){   // pace：登山畫面的步態給的速度倍率（累了慢走、停下來喝水時 0），離線補走不用
    if (p.sleep) { p.stam = Math.min(100, p.stam + NAP * dt); p.temp = Math.min(100, p.temp + 2 * dt); if (p.stam >= 60 && p.temp >= 50) p.sleep = false; return 0; }
    if (p.rest) { p.stam = Math.min(100, p.stam + REST * dt); p.temp = Math.min(100, p.temp + 4 * dt); if (offline && p.stam >= 100 && p.temp >= 95) p.rest = false; return 0; }
    const dev = devX();
    let v = baseSpeed(m) * dev; if (p.temp < 25) v *= 0.7; if (boost) v *= BOOST; if (pace != null) v *= pace;
    const lim = offline ? Math.max(p.dist, m.dist - 2) : m.dist;
    let d = Math.max(0, Math.min(lim - p.dist, v * dt)), stop = false;
    if (p.stopAt != null && p.stopAt - 1 - p.dist <= d) { d = Math.max(0, p.stopAt - 1 - p.dist); stop = true; }
    p.dist += d; if (!dry && !offline) fitWalk(d);
    if (!dry) { SV.stats.walked = (SV.stats.walked || 0) + d; if (d > 0) { daily('walk', d); SV.stats.walkSec = (SV.stats.walkSec || 0) + dt; } } p.stam -= d / DRAIN * 100 / dev * (boost ? 1.8 : 1);
    p.temp = clamp(p.temp + ((boost ? 0.15 : 0) - chill(m, p.dist / m.dist, wx) * 0.08) * dt, 0, 100);
    if (stop) { p.rest = true; p.stopAt = null; p.stam = Math.max(0, p.stam); return d; }
    if (p.stam <= 0 || p.temp <= 0) { p.stam = Math.max(0, p.stam); p.sleep = true; }
    return d;
  }
  // 關掉遊戲後，登山客大概什麼時候走到山頂前（給推播「快到山頂了」用）；48 小時內走不到就回 null
  function summitEta(){
    if (!SV.cur || !SX.M[SV.cur]) return null;
    const m = SX.M[SV.cur], p = JSON.parse(JSON.stringify(P(SV.cur)));
    if (p.fin || p.dist >= m.dist - 2.5) return null;
    for (let t = 0; t < OFFLINE_CAP; t += 30) { simulate(p, m, 30, false, true, true); if (p.dist >= m.dist - 2.5) return { mountain:m.id, name:m.name, at:Date.now() + (t + 30) * 1000 }; }
    return null;
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
    let naps = 0, rests = 0;
    while (sec > 0 && p.dist < m.dist - 2) { const dt = Math.min(5, sec), z = p.sleep, r = p.rest; sec -= dt; simulate(p, m, dt, false, true); if (!z && p.sleep) naps++; if (!r && p.rest) rests++; }
    if (total >= 60) {
      SV.stats.away = Math.max(SV.stats.away || 0, total / 60);
      const gained = p.dist - before, sg = segsAway(p, m, before);   // 離開時自己走到的小目標
      if (gained > 1 && total >= AWAY_DIARY) {
        noteAway(p, m, before, total, now, naps, rests, sg);   // 寫進離開時的日記，回到這座山的登山畫面就會打開
        if (!(screen === 'climb' && M === m)) notice(`你不在的時候，自己走了 ${Math.round(gained).toLocaleString('en-US')} 公尺，回山上看看日記吧`, 3200);
      } else if (gained > 1) notice((p.dist >= m.dist - 2.5 ? '你不在的時候，已經走到山頂前了' : `你不在的時候，自己走了 ${Math.round(gained)} 公尺`) + (sg.names.length ? `，到了「${sg.names[sg.names.length - 1]}」` : ''), 3200);   // 字在這裡就決定好（不要等到跳出來時才看進度）
      checkQuests();
    }
    save();
  }

  // ───────── 離開時的日記＋路上的包裹 ─────────
  const AWAY_DIARY = 600;      // 離開幾秒以上才寫日記（短的只跳提示）
  const AWAY_PARCEL = 5;       // 一次包裹最多幾件（保護長期節奏）
  const AWAY_SHOTS = 3;        // 離線經過的 500 公尺點，最多補拍幾張
  // 奇遇圖鑑也用這個：記下看過哪個奇遇、第幾次、第一次是哪天
  function noteEncounterSeen(id){ const s = SV.encSeen || (SV.encSeen = {}), o = s[id] || {}; s[id] = { n:(o.n || 0) + 1, first:o.first || today() }; daily('enc'); }
  // catchUp 補走完：把這段記下來（存在進度裡，關掉再開也不會不見）；連續幾次回來還沒看，就併成同一篇
  function noteAway(p, m, from, sec, now, naps, rests, sg){
    const a = p.away || (p.away = { from, to:from, sec:0, t0:now - sec * 1000, naps:0, rests:0, marks:[], shot:[], parcel:[], enc:null, v:0 });
    a.to = p.dist; a.sec += sec; a.t1 = now; a.naps += naps; a.rests += rests; a.v++;
    a.segs = (a.segs || []).concat(sg.names); a.segItems = (a.segItems || []).concat(sg.items);   // 小目標：走到哪幾個、撿到什麼
    for (let k = Math.floor(from / 500) * 500 + 500; k <= p.dist && k < m.dist; k += 500) if (!a.marks.includes(k)) a.marks.push(k);
    if (a.marks.length) p.ms = Math.max(p.ms || 0, a.marks[a.marks.length - 1]);   // 回來時不要再跳一次「走了 X 公里，拍一張」
  }
  // 登山畫面畫好之後才整理日記（要用到這座山的路旁道具和拍照）；每次打開日記都跑一次：
  // 奇遇只抽一次；補拍、包裹只補「還沒做過的」（日記看到一半又併進新的一段，新經過的路標和寶物也要算到）
  function composeAway(a){
    const m = M;
    if (!a.enc) {
      a.enc = [];
      const n = a.sec >= 4 * 3600 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const ts = a.t0 + Math.random() * (a.t1 - a.t0), f = (a.from + Math.random() * (a.to - a.from)) / m.dist;
        const e = pickEncounterAt(m.id, f, calcWx(m.id, ts, f), a.enc, new Date(ts), true);   // 季節、時段、天氣照「當時」和那時走到的位置算
        if (e) { a.enc.push(e.id); noteEncounterSeen(e.id); }
      }
    }
    a.marks.filter(k => !a.shot.includes(k)).slice(-AWAY_SHOTS).forEach(k => { const n = SV.photos.length; takePhoto(k, true); a.shot.push(k); if (SV.photos.length > n) a.pics = (a.pics || 0) + 1; });
    if (!st.team) SC.props(a.from, a.to).forEach(o => { const k = Math.round(o.m); if (o.type === 'treasure' && !st.got['t' + k] && !a.parcel.includes(k) && a.parcel.length < AWAY_PARCEL) a.parcel.push(k); });   // 好友跟隨：路上的寶物歸全隊，登頂時一起分（teamShare）
    save();
  }
  const awIco = (id, cls) => `<span class="awI${cls ? ' ' + cls : ''}">${SX.art.img(id, `<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="6" fill="#f2c35a" stroke="${INK}" stroke-width="1.8"/></svg>`)}</span>`;
  // 奇遇的第一句：句號可能落在「」引號裡面，切開後要把引號補回來
  const firstSentence = s => { const x = s.split('。')[0], open = (x.match(/「/g) || []).length - (x.match(/」/g) || []).length; return x + '」'.repeat(Math.max(0, open)); };
  // 打瞌睡的說法跟著山走：郊山有涼亭、當天來回的高山找塊避風的大石頭、要過夜的大山才鑽睡袋
  const napText = m => m.alt < 1500 ? '在涼亭打了個盹' : m.recMin <= 360 ? '找塊避風的大石頭靠著打了個盹' : '窩進睡袋睡了一下';
  function awayLines(a){
    const m = M, L = [], km = x => (x / 1000).toFixed(1);
    const up = Math.round(altAt(m, a.to / m.dist) - altAt(m, a.from / m.dist)), summit = a.to >= m.dist - 2.5;
    L.push([ 'sign_wood', `慢慢走了 ${Math.round(a.to - a.from).toLocaleString('en-US')} 公尺${up > 0 ? `，爬升 ${up} 公尺` : ''}，現在在海拔 ${Math.round(altAt(m, a.to / m.dist)).toLocaleString('en-US')} 公尺。` ]);
    const ps = SC.props(a.from, a.to), cnt = t => ps.filter(o => t.includes(o.type)).length, nb = cnt(['bench']), nv = cnt(['view']), nn = cnt(['note', 'btree', 'cairn']);
    if (nb || nv || a.naps) L.push([ nv ? 'deck_view' : nb ? 'bench' : 'icon_rest', [nb > 3 ? '沿路坐了好幾張長椅喝熱茶' : nb ? `在 ${nb} 張長椅坐下來喝口熱茶` : '', nv ? `${nb ? '，' : ''}在觀景台看了好一會兒風景` : '', a.naps ? `${nb || nv ? '，' : ''}走累了${napText(m)}` : ''].join('') + '。' ]);
    if (a.marks.length) L.push([ 'icon_camera', `經過 ${a.marks.slice(-3).map(k => km(k) + ' 公里').join('、')}的路標${a.pics ? `，拍了 ${a.pics} 張照片收進相簿` : ''}。` ]);
    if (nn) L.push([ 'note_post', `路過 ${nn} 處山友留下的便條和疊石，順手拍掉上面的落葉。` ]);
    const seq = [];
    for (let ts = a.t0; ts <= a.t1; ts += 1200000) { const f = (a.from + (a.to - a.from) * (ts - a.t0) / Math.max(1, a.t1 - a.t0)) / m.dist, w = calcWx(m.id, ts, f), s = wxText(w) || '晴'; if (!seq.length || seq[seq.length - 1].s !== s) seq.push({ s, w }); }   // f：那時大概走到哪（照時間平均推算）
    const sh = (seq.length > 3 ? [seq[0], seq[seq.length >> 1], seq[seq.length - 1]] : seq).filter((x, i, l) => !i || l[i - 1].s !== x.s);   // 變很多次：只寫開頭、中間、現在
    if (sh.length > 1) { const w = sh[sh.length - 1].w; L.push([ HUD.wxArt(w.kind, w.time), `山上的天氣：${sh.map(x => x.s).join(' → ')}。` ]); }
    (a.enc || []).forEach(id => { const e = SX.ENCOUNTERS.find(x => x.id === id); if (e) L.push([ 'face_happy', `路上的小插曲：${firstSentence(e.text)}。` ]); });
    const sn = (a.segs || []).length, si = a.segItems || [];
    if (sn) L.push([ 'summit_marker', `完成 ${sn} 個小目標：${a.segs.slice(-3).join('、')}${sn > 3 ? ' 等' : ''}${si.length ? `，順手撿到「${si.join('」「')}」` : ''}。` ]);
    if (summit) L.push([ 'emo_cheer', '已經走到山頂前，就等你一起登頂！' ]);
    // 不超過 6 行，手機一頁看得完：先省便條那一行，再省第二個小插曲，再省小目標（登頂那行一定留著）
    for (const id of ['note_post', 'face_happy', 'summit_marker']) { const i = L.map(x => x[0]).lastIndexOf(id); if (L.length > 6 && i >= 0) L.splice(i, 1); }
    return L;
  }
  let awayShown = null;   // 打開日記那一刻的內容（v 版本、走到哪、多久），收起時拿來判斷有沒有又併進新的一段
  function showAway(){
    const a = st.away; if (!a) return;
    composeAway(a);
    awayShown = { v:a.v, to:a.to, t1:a.t1, sec:a.sec, naps:a.naps, rests:a.rests, segN:(a.segs || []).length, itemN:(a.segItems || []).length }; A.paper();
    const left = a.parcel.filter(k => !st.got['t' + k]), h = Math.floor(a.sec / 3600), mi = Math.round(a.sec % 3600 / 60);
    const pics = a.pics ? SV.photos.filter(p => p.id === M.id && a.shot.includes(p.m)).slice(-3) : [];
    modal(`<h3>你不在的時候</h3><div class="awayD">
      <p class="awayT">${M.name}・離開了 ${h ? `${h} 小時${mi ? ` ${mi} 分` : ''}` : `${mi} 分鐘`}</p>
      <ul class="awayL">${awayLines(a).map(([ic, tx]) => `<li>${awIco(ic)}<span>${tx}</span></li>`).join('')}</ul>
      ${pics.length ? `<div class="awayPics">${pics.map((p, i) => `<img src="${p.img}" alt="" style="transform:rotate(${(i - 1) * 4}deg)">`).join('')}</div>` : ''}
      ${left.length ? `<div class="awayParcel">${awIco('treasure_box', 'big')}<span>路上撿到 <b>${left.length}</b> 件東西，<br>都收在包裹裡了。</span></div>` : ''}</div>
      <div class="mBtns" style="margin-top:12px"><button class="cbtn go" id="awGo">${left.length ? '打開包裹' : '繼續走'}</button></div>`);
    MO.stagger($('#mCard'), '.awayL li');
    $('#awGo').onclick = () => { A.pop(); if (left.length) openParcel(left, 0); else endAway(); };
  }
  // 包裹裡的東西一件一件拿出來（用跟路上撿到一樣的寶物卡）
  function openParcel(list, i){
    const k = list[i]; st.got['t' + k] = 1;
    gainTreasure(rollTreasure(M.id), 'show');
    const b = $('#trOk'), last = i >= list.length - 1;
    if (!b) return endAway();
    if (!last) b.textContent = `下一件（${i + 1}/${list.length}）`;
    b.onclick = () => { A.pop(); if (last) { closeModal(); endAway(); } else openParcel(list, i + 1); };
  }
  function endAway(){
    const a = st.away, s = awayShown; awayShown = null;
    if (a && s && a.v !== s.v) {   // 看日記時又補走了一段：看過的部分拿掉，只留新的那段，等一下再寫一篇
      Object.assign(a, { from:s.to, t0:s.t1, sec:a.sec - s.sec, naps:a.naps - s.naps, rests:a.rests - s.rests, marks:a.marks.filter(k => k > s.to), shot:[], parcel:a.parcel.filter(k => !st.got['t' + k]), enc:null, pics:0, v:1, segs:(a.segs || []).slice(s.segN), segItems:(a.segItems || []).slice(s.itemN) });
    } else if (a) st.away = null;
    closeModal(); save(); checkQuests();
  }

  // ───────── 這次的小目標 ─────────
  // 一趟山常常要一個小時以上：每次開始爬或回到山上，從路上的地標（waypoints）、每 500 公尺拍照點、長椅和觀景台裡，
  // 挑最先走到、照平常速度大約 3～10 分鐘的那一個當「這次的小目標」，畫面下方小小一行顯示
  // 走到了：拍一張那裡的明信片收進相簿、打個勾、有機會撿到一件一般寶物、說一句話，再定下一個；離開時自己走到的寫進日記
  const SEG_MIN = 180, SEG_MAX = 600;   // 秒：比 3 分鐘近的跳過；最先走到的超過 10 分鐘，就在路上另外放一個大約 8 分鐘的點
  const SEG_LUCK = 0.3;                 // 走到小目標時順手撿到一件一般寶物的機會（只有一般寶物，稀有度不變）
  const SEG_AWAY = 3;                   // 離開時自己走到的小目標，最多給幾次寶物機會
  const devX = () => SV.set.devOn && SV.set.fast ? 20 : 1;   // 開發者快速模式的步速倍率
  const segEl = document.createElement('div'); segEl.className = 'segGoal'; $('#scrClimb').appendChild(segEl);
  let segDoneT = 0;   // 打勾停留的秒數（在 frame 裡倒數），倒數完才定下一個
  function segStops(m, from){
    const out = [];
    m.waypoints.forEach(w => { if (w.m > from) out.push({ m:w.m, name:w.name }); });
    for (let k = Math.floor(from / 500) * 500 + 500; k < m.dist; k += 500) if (!out.some(x => x.m === k)) out.push({ m:k, name:`${(k / 1000).toFixed(1)} 公里路標` });
    if (m === M) SC.props(from, m.dist).forEach(o => { const k = Math.round(o.m); if ((o.type === 'bench' || o.type === 'view') && !out.some(x => Math.abs(x.m - k) < 30)) out.push({ m:k, name:o.type === 'view' ? '觀景台' : '路邊的長椅' }); });
    return out.sort((a, b) => a.m - b.m);
  }
  const segMin = () => etaMin(st.seg.m);
  function setSeg(){
    const v = baseSpeed(M) * devX(), eta = x => (x.m - st.dist) / v, L = segStops(M, st.dist + 2);
    let g = L.find(x => eta(x) >= SEG_MIN);
    if (!g || eta(g) > SEG_MAX) {
      const k = Math.round((st.dist + v * 480) / 10) * 10;
      g = L.filter(x => eta(x) < SEG_MIN).pop() || (k < M.dist ? { m:k, name:`${(k / 1000).toFixed(1)} 公里處` } : L[L.length - 1]);
    }
    if (!g) return;
    st.seg = { m:g.m, name:g.name };
    notice(`這次的小目標：${g.name}（約 ${segMin()} 分鐘）`, 3200);
  }
  const segRoll = mid => Math.random() < SEG_LUCK ? rollTreasure(mid, x => x.rarity === '普通' && !AUTO_GIVEN.has(x.id)) : null;   // 不給登頂紀念章這種本來就會拿到的
  function reachSeg(){
    const g = st.seg; st.seg = null;
    if (g.m >= M.dist) return;   // 小目標就是山頂：登頂卡片就是獎勵
    daily('seg');
    const got = [];
    if (g.m % 500) { takePhoto(g.m, true, g.name); got.push('明信片收進相簿'); }   // 500 公尺點本來就會拍一張
    const tr = segRoll(M.id); if (tr) { gainTreasure(tr, 'quiet'); got.push(`撿到「${tr.name}」`); }
    notice(`✓ 到了${g.name}${got.length ? '・' + got.join('・') : ''}`, 3400);
    say(pick(SX.LINES.seg)); A.chime();
    segEl.textContent = `✓ 到了：${g.name}`; segEl.classList.add('on', 'done'); segDoneT = 3;
    save();
  }
  // 每一格：走到就給獎勵；打勾停一下，再定下一個（有對話框時先等）
  function segFrame(dt){
    if (segDoneT > 0) { segDoneT -= dt; if (segDoneT <= 0) segEl.classList.remove('done'); return; }
    if (paused || arrived || st.fin || st.away) return;   // 離開時的日記還沒看：先看日記
    if (st.seg && st.dist >= st.seg.m - 1.5) return reachSeg();
    if (!st.seg) setSeg();
  }
  function segTick(){   // 跟 HUD 一起更新（0.2 秒一次）
    if (segDoneT > 0) return;
    const on = !!(st.seg && !arrived && !st.fin);
    segEl.classList.toggle('on', on);
    const tx = on ? `下一站：${st.seg.name}（約 ${segMin()} 分鐘）` : '';
    if (segEl.textContent !== tx) segEl.textContent = tx;
  }
  // 離開時自己走到的小目標：原本定好的那一個，加上路上經過的地標；寶物機會照給（最多 SEG_AWAY 次），回來時寫進日記，不跳一堆提示
  function segsAway(p, m, from){
    const names = [];
    if (p.seg && p.dist >= p.seg.m - 1.5 && p.seg.m < m.dist) names.push(p.seg.name);
    m.waypoints.forEach(w => { if (w.m > from && w.m <= p.dist && w.m < m.dist && !names.includes(w.name)) names.push(w.name); });
    const items = names.slice(0, SEG_AWAY).map(() => segRoll(m.id)).filter(Boolean);
    items.forEach(tr => gainTreasure(tr, 'quiet'));
    if (names.length) daily('seg', names.length);
    p.seg = null;   // 回來就是新的一次，重新定小目標
    return { names, items:items.map(tr => tr.name) };
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
    if (p.hit && p.hit.who && SX.social) { A.pop(); SX.social.strangerCard(p.hit.who); return; }   // 同山遇見的山友
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
  const restTitle = () => st.restType === 'view' ? '觀景台到了，慢慢看' : st.restType === 'trail' ? '在路邊坐下來，喝口水' : '坐下來喝口熱茶';
  function onRest(){
    if (st.restType !== 'trail') { SV.stats.rests++; daily('rest'); }   // 路邊主動休息不算「長椅常客」和每日任務（不然一直按休息就能刷）
    A.chime();
    const duo = SX.social && SX.social.affNear(M, 'chat');   // 好感 Lv6：好友就在旁邊，一起坐下來聊天
    say(duo ? pick(SX.LINES.duo).replace('{n}', duo.name) : st.restType === 'view' ? '哇，風景好漂亮' : st.restType === 'trail' ? '在路邊坐一下' : '呼～喝口熱茶');
    $('#rsTitle').textContent = restTitle();
    $('#restSheet').classList.add('on');
    save(); checkQuests();
  }
  // 主動休息：在路邊坐下來（不用走到長椅），一樣打開休息木牌、慢慢回體力和體溫，按「出發」繼續走
  $('#restBtn').onclick = () => { if (!st || st.rest || st.sleep || arrived) return; A.unlock(); A.pop(); st.stopAt = null; st.restType = 'trail'; st.rest = true; onRest(); };
  $('#rsGo').onclick = () => { if (!st) return; A.pop(); st.rest = false; $('#restSheet').classList.remove('on'); say('出發囉！'); };
  $('#rsPhoto').onclick = () => { if (st && M) takePhoto(st.dist, false, st.restType === 'view' ? '觀景台' : '休息時光'); };
  $('#rsStone').onclick = () => { if (st && M) { A.pop(); stoneGame(); } };
  $('#rsUp').onclick = e => { if (st && M) { A.pop(); pickUpload(M.id, st.dist, e.currentTarget); } };

  // 浮在休息點／寶物上方的小木牌
  // 收合畫面資訊：狀態面板、小地圖、下方選單一起收起來，只看風景；右下角小鈕再點一次展開
  const hudTog = $('#hudTog');
  const setClean = on => { SV.set.clean = on; $('#scrClimb').classList.toggle('clean', on); hudTog.setAttribute('aria-label', on ? '展開畫面資訊' : '收起畫面資訊'); };
  hudTog.onclick = () => { A.pop(); setClean(!SV.set.clean); save(); };
  setClean(!!SV.set.clean);
  const tag = $('#propTag'); let tagO = null;
  function updTag(){
    let n = null;
    if (!paused && !arrived && !st.rest && !st.sleep && st.stopAt == null) n = SC.nearby();
    if (n && n.type === 'treasure' && st.got['t' + Math.round(n.m)]) n = null;
    if (!n) { if (tagO) { tagO = null; tag.style.display = 'none'; } return; }
    if (!tagO || tagO.m !== n.m) { tag.textContent = n.type === 'bench' ? '坐一下' : n.type === 'view' ? '看風景' : '有東西！'; tag.style.display = 'block'; }
    const x = Math.round(n.x), y = Math.round(n.y - 6);   // 位置沒變就不寫（每格寫樣式會讓瀏覽器重排版面）
    if (!tagO || tag._x !== x || tag._y !== y) { tag._x = x; tag._y = y; tag.style.left = x + 'px'; tag.style.top = y + 'px'; }
    tagO = n;
  }
  tag.onclick = e => { e.stopPropagation(); if (!tagO || !st) return; A.unlock(); A.pop(); const r = tag.getBoundingClientRect(); useProp({ type:tagO.type, m:tagO.m }, r.left + r.width / 2, r.top + r.height); };

  // 便條（樹洞）
  const notePick = o => SX.NOTES[(C.hash(M.id + o.m) + Math.floor(Date.now() / 86400000 / 3)) % SX.NOTES.length];
  // 便條紙（山友便條、許願紙共用）：字包一層，美術圖到了可以讓字跟著紙一起斜
  const noteHtml = (txt, sign) => `<div class="noteP"><div>${txt}<small>${sign}</small></div></div>`;
  function openNote(o){
    A.paper();
    const title = o.type === 'note' ? '山友留下的便條' : o.type === 'btree' ? '祈福樹上的小卡' : '笑臉疊石下壓著一張紙條';
    const days = 1 + C.hash(o.m + 'd') % 3;
    SV.stats.notes++; daily('note');
    modal(`<h3>${title}</h3>
      ${noteHtml(notePick(o), `— 匿名山友・${days} 天後會風化`)}
      <div class="mBtns"><button class="cbtn" id="nHeart">給愛心</button><button class="cbtn" id="nClean">${o.type === 'btree' ? '澆澆水' : '清清泥'}</button></div>
      <div class="mBtns" style="margin-top:10px"><button class="cbtn go" id="nOk">繼續走</button></div>`);
    const give = (btn, kind) => { if (btn.disabled) return; btn.disabled = true; const r = btn.getBoundingClientRect(); MO.sparks(r.left + r.width/2, r.top + r.height/2, 12); A.sparkle(); st.stam = Math.min(100, st.stam + 8); toast(kind === 'heart' ? '愛心送出了，體力 +8' : '步道變乾淨了，體力 +8'); };
    $('#nHeart').onclick = e => { const b = e.currentTarget, r = b.getBoundingClientRect(); if (!b.disabled) MO.like(r.left + r.width/2, r.top); give(b, 'heart'); };
    $('#nClean').onclick = e => give(e.currentTarget, 'clean');
    $('#nOk').onclick = () => { closeModal(); checkQuests(); };
  }

  // 台詞
  const BUB_X = 30, BUB_Y = 18;   // 對話框離頭的中心往旁邊幾像素、從頭頂往下幾像素（框的下緣）
  function say(txt, ms = 2600){
    const b = $('#bubble');
    b.textContent = txt; b._w = b.offsetWidth; placeBubble();
    b.classList.add('on'); clearTimeout(b._h); b._h = setTimeout(() => b.classList.remove('on'), ms);
  }
  // 對話框跟著頭：說話那一刻人可能還沒坐到長椅上（開始休息的下一格才畫在長椅上，2026-11-24 回報泡泡沒對在長椅上的人），所以對話框開著時每一格都重新放
  // 放在頭的旁邊（不擋住前面的路）：預設在右邊，放不下就放左邊；尾巴指向頭
  function placeBubble(){
    const b = $('#bubble'), cp = SC.charPos(), bw = b._w, W0 = b.parentElement.clientWidth, R = cp.x + BUB_X + bw <= W0 - 8 || W0 - cp.x >= cp.x, x = R ? Math.min(cp.x + BUB_X, W0 - 8 - bw) : Math.max(8, cp.x - BUB_X - bw);   // 放得下的那一邊（都放不下就放空間大的那邊）
    b.classList.toggle('left', !R); b.style.left = x + 'px'; b.style.top = (cp.y + BUB_Y) + 'px';
  }

  // ───────── 寶物 ─────────
  const RAR_W = { '普通':70, '稀有':25, '傳說':5 };
  const RAR_BG = { '普通':'', '稀有':'background:linear-gradient(170deg,#eef7ff,#c4def4)', '傳說':'background:linear-gradient(170deg,#fff6cf,#f6d472)' };
  const RAR_COL = { '普通':'#cfe6b0', '稀有':'#bfdcf5', '傳說':'#ffe08a' };
  const RAR_CLS = { '普通':'rar-common', '稀有':'rar-rare', '傳說':'rar-legend' };
  // 介面美術圖：圖到了就用樣式表蓋過程式畫的圖示（之後才開的視窗也會套用）
  SX.art.onLoad(() => {
    const u = id => SX.art.url(id), css = [];
    const icons = { icon_map:'.i-map', icon_bag:'.i-bag', icon_album:'.i-photo', icon_settings:'.i-gear', icon_rest:'.i-tent' };
    for (const id in icons) if (u(id)) css.push(`${icons[id]}{background-image:url("${u(id)}")!important;filter:none!important}`);
    // 休息選單：拍照、上傳照片的按鈕上方加小圖示
    for (const [sel, id] of [['#rsPhoto', 'icon_camera'], ['#rsUp', 'icon_upload'], ['#rsStone', 'cairn']]) if (u(id)) css.push(`${sel}::before{content:"";width:30px;height:30px;background:url("${u(id)}") center/contain no-repeat}`);
    // 完成的隱藏任務：打勾換成任務徽章
    if (u('badge_quest')) css.push(`.quest li.done::before{width:30px;height:30px;border:0;border-radius:0;background:url("${u('badge_quest')}") center/contain no-repeat!important}`);
    // 木框介面（第六、九批）：面板用羊皮紙木框、分頁和開關用木牌、標題用緞帶、對話框用手繪泡泡、選單頁用木桌背景
    // 數字是各張圖裁掉透明邊後量的邊框寬度（像素），換圖要重量
    if (u('ui_panel')) css.push(`.mCard,.infoCard,#restSheet{background:none!important;border-style:solid!important;border-width:18px!important;border-color:transparent!important;border-image:url("${u('ui_panel')}") 50 fill / 18px stretch!important;box-shadow:0 8px 20px rgba(40,25,10,.35)!important;color:var(--ink)!important;text-shadow:none!important}
      .mCard::before,.mCard::after,.infoCard::before,.infoCard::after,#restSheet::before,#restSheet::after{display:none!important}
      .mCard .summitBig,.mCard .tiny,.mCard p,.infoCard .ic-h b,.infoCard .rc-h b,.mCard .grp,.mCard .empty{color:var(--ink)!important;text-shadow:none!important}
      .infoCard .ic-alt,.infoCard .rc-feat em,.mCard .rc-feat em,.infoCard .rc-h span{color:var(--wood2)!important;text-shadow:none!important}
      .mCard .stoneGame .sg-top{color:#fff7e4!important;text-shadow:var(--txo)!important}`);
    // 山的資訊卡用專屬的木框羊皮紙卡（ui_card，頂邊刻小山）；卡裡的小格子不再框一圈，直接寫在紙上，用淡淡的虛線分隔
    if (u('ui_card')) css.push(`.infoCard{border-image:url("${u('ui_card')}") 84 70 88 70 fill / 30px 25px 31px stretch!important;border-width:30px 25px 31px!important;padding:4px 6px 6px!important}
      .infoCard .paper,.infoCard .paperIn{background:none!important;border:0!important;border-bottom:1.5px dashed rgba(120,80,40,.45)!important;border-radius:0!important;box-shadow:none!important}
      .infoCard .ic-meta{gap:2px 14px!important}`);
    // 按鈕用木牌（ui_button）：取代程式畫的漸層亮面按鈕
    // 登山畫面左上狀態面板：柔和羊皮紙＋細木框（跟山資訊卡同一張 ui_card，框畫細一點），字改深棕墨色
    if (u('ui_card')) css.push(`.hudP{background:none!important;border-style:solid!important;border-color:transparent!important;border-width:13px 11px 14px!important;border-image:url("${u('ui_card')}") 84 70 88 70 fill / 13px 11px 14px stretch!important;border-radius:0!important;box-shadow:0 3px 8px rgba(40,25,10,.22)!important;padding:2px 4px 2px!important;color:var(--ink)!important;text-shadow:none!important}
      .hudP::before,.hudP::after{display:none!important}
      .hudP .hudName,.hudP .hudAlt,.hudP .hudBar span{color:var(--ink)!important;text-shadow:none!important}
      .hudP .hudAlt .up,.hudP .hudAlt small{color:#9a6a3f!important}.hudP .hudSub{color:#6b4a2b!important}
      .hudP .hbar{height:9px;border-width:1.4px;background:#e8d9b8;box-shadow:inset 0 1px 1.5px rgba(90,60,30,.3)}
      .hudP .hudFace{border-width:1.6px;box-shadow:0 1px 3px rgba(40,25,10,.3)}`);
    // 下方功能列：淺色木牌（ui_button）細墨線，不再是深色厚底條
    if (u('ui_button')) css.push(`.dock{background:none!important;border-style:solid!important;border-color:transparent!important;border-width:12px 16px!important;border-image:url("${u('ui_button')}") 50 60 fill / 12px 16px stretch!important;border-radius:0!important;box-shadow:0 3px 8px rgba(40,25,10,.25)!important;padding:0 2px!important}
      .dock::before,.dock::after{display:none!important}`);
    if (u('ui_button')) css.push(`.cbtn{background:none!important;border-style:solid!important;border-color:transparent!important;border-width:12px 15px!important;border-image:url("${u('ui_button')}") 50 60 fill / 12px 15px stretch!important;box-shadow:0 3px 4px rgba(40,25,10,.28)!important;border-radius:0!important;padding:0 5px!important;min-height:44px}
      .cbtn.sm{min-height:34px;padding:0!important;border-width:8px 10px!important;border-image-width:8px 10px!important}
      .cbtn:active{box-shadow:0 1px 2px rgba(40,25,10,.28)!important}
      .cbtn[data-badge]::after{top:-22px!important;right:-25px!important}.cbtn.sm[data-badge]::after{top:-17px!important;right:-19px!important}`);   // 紅點的位置從木框內緣算，往外推回按鈕右上角
    if (u('ui_ribbon')) css.push(`.mCard h3{display:block;width:fit-content;max-width:100%;margin:0 auto 12px!important;padding:8px 2px 12px;border-style:solid;border-width:0 26px;border-color:transparent;border-image:url("${u('ui_ribbon')}") 0 130 fill / 0 26px stretch;color:var(--ink)!important;text-shadow:none!important;font-size:16px!important;white-space:nowrap;letter-spacing:0}`);   // 標題一行放完，不准折成兩行
    if (u('ui_tab') && u('ui_tab_on')) css.push(`.tab{background:url("${u('ui_tab')}") center/100% 100% no-repeat!important;border:0!important;box-shadow:none!important;color:var(--ink)!important;text-shadow:0 1px 0 rgba(255,240,210,.6)!important}
      .tab.on{background-image:url("${u('ui_tab_on')}")!important;color:#fff7e4!important;text-shadow:var(--txo)!important}`);
    if (u('ui_toggle_on') && u('ui_toggle_off')) css.push(`.tgl{width:62px!important;height:30px!important;border:0!important;box-shadow:none!important;background:url("${u('ui_toggle_off')}") center/contain no-repeat!important}
      .tgl::before{background:url("${u('ui_toggle_on')}") center/contain no-repeat!important;box-shadow:none!important;border-radius:0!important}.tgl::after{display:none!important}`);   // 打開的圖疊在上面淡入淡出（css 的 .tgl::before）
    if (u('ui_close')) css.push(`.rc-x{background:url("${u('ui_close')}") center/contain no-repeat!important;border:0!important;box-shadow:none!important;color:transparent!important;font-size:0!important}`);
    if (u('ui_bubble')) css.push(`.bubble{background:none!important;border-style:solid!important;border-width:12px 16px 20px!important;border-color:transparent!important;border-image:url("${u('ui_bubble')}") 60 70 90 70 fill / 12px 16px 20px stretch!important;box-shadow:none!important;padding:0 2px!important}.bubble::after{display:none!important}`);
    if (u('ui_page')) css.push(`#scrAlbum,#scrSettings,#scrLobby{background:url("${u('ui_page')}") center/cover no-repeat!important}`);
    for (const k of ['common', 'rare', 'legend']) if (u('rarity_' + k)) css.push(`.bag .slot.rar-${k},.tzFrame.rar-${k}{background:url("${u('rarity_' + k)}") center/100% 100% no-repeat!important;border-color:transparent!important;box-shadow:none!important}`);
    // 天氣圓章已含木框：登山畫面右上角拿掉原本的圓框和底色
    css.push(`.hudWx.art{border:0!important;background:none!important;box-shadow:none!important;overflow:visible!important}`);
    // 登頂插圖（16:9）放在抵達終點視窗最上面
    css.push(`.summitArt{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:12px;border:2px solid var(--ink);margin:0 0 12px}`);
    // 集印帳：紅色印章圖，下緣壓一塊紅框小牌寫山名和日期（字跟著章的大小縮放）；整枚章用「取暗色」混色，米色底會融進紙裡像真的蓋上去
    css.push(`.stampArt{position:relative;width:100%;aspect-ratio:1;container-type:inline-size;transform:rotate(-8deg);mix-blend-mode:darken}
      .stampArt img{display:block;width:100%;height:100%;object-fit:contain}
      .stampArt span{position:absolute;left:50%;bottom:2%;transform:translateX(-50%);padding:1.5cqw 5cqw 2cqw;background:#fbf2df;border:max(1.5px,1.6cqw) solid #b8322a;border-radius:3cqw;color:#b8322a;text-align:center;line-height:1.15;white-space:nowrap;text-shadow:none;font-family:var(--fontB)}
      .stampArt b{display:block;font-size:13cqw;letter-spacing:.08em}.stampArt i{display:block;font-style:normal;font-size:9.5cqw;font-weight:bold}
      .stampSlot:has(.stampArt){padding:2px}`);
    // 便條／許願紙：綁繩小紙卡當底圖，字放在紙的位置、跟紙一樣順時針斜 16°
    // 數字是 note_paper 裁掉透明邊後量的（314×438，紙 168×280，紙中心在 124.75, 275.5），換圖要重量
    if (u('note_paper')) css.push(`.noteP{--p:140px;width:calc(var(--p) * 314 / 168)!important;height:calc(var(--p) * 438 / 168);box-sizing:border-box;margin:0 auto 14px!important;padding:0!important;background:url("${u('note_paper')}") center/100% 100% no-repeat!important;border:0!important;border-radius:0!important;box-shadow:none!important;transform:none!important}
      .noteP::before{display:none!important}
      .noteP>div{position:absolute;left:calc(100% * 124.75 / 314);top:calc(100% * 275.5 / 438);width:var(--p);height:calc(var(--p) * 280 / 168);margin:calc(var(--p) * -140 / 168) 0 0 calc(var(--p) / -2);box-sizing:border-box;padding:34px 9px 10px;font-size:15px;line-height:1.6;transform:rotate(16deg);overflow-wrap:anywhere}
      .noteP small{font-size:10.5px!important;line-height:1.4;margin-top:6px!important;text-wrap:balance}`);   // 署名一行放得下「— 你在嘉明湖留下的願望」，放不下時兩行平均分，不會剩一個字
    if (css.length) { const st = document.createElement('style'); st.textContent = css.join('\n'); document.head.appendChild(st); }
    if (u('title_logo')) { const l = $('.logo'); if (l) { l.classList.add('artLogo'); l.innerHTML = `<img src="${u('title_logo')}" alt="山行小日子">`; } }
  });
  function trSvg(tr){ return SX.art.img(tr.id, trSvgDrawn(tr)); }
  function trSvgDrawn(tr){
    const col = ['#ee8458','#6fae68','#5aa0d8','#f2c35a','#b98ad9','#e88fa8'][C.hash(tr.id) % 6], n = tr.name, o = `stroke="${INK}" stroke-linejoin="round"`;
    if (n.includes('章')) return `<svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="23" fill="#fff7e2" ${o} stroke-width="2.5"/><circle cx="30" cy="30" r="17.5" fill="none" stroke="${col}" stroke-width="2.5" stroke-dasharray="3 3"/><path d="M18 38l8-13 5 6 5-10 8 17z" fill="${col}" ${o} stroke-width="1.6"/></svg>`;
    if (/照片|一瞥|合照|留影|相片/.test(n)) return `<svg viewBox="0 0 60 60"><g transform="rotate(-5 30 30)"><rect x="10" y="8" width="40" height="46" rx="2" fill="#fff" ${o} stroke-width="2.5"/><rect x="14" y="12" width="32" height="28" fill="${col}" opacity=".55"/><path d="M14 40l10-14 7 8 6-11 9 17z" fill="${col}" ${o} stroke-width="1.5"/><circle cx="40" cy="18" r="3.5" fill="#ffe27a" ${o} stroke-width="1.2"/></g></svg>`;
    return `<svg viewBox="0 0 60 60"><g transform="rotate(5 30 30)"><rect x="8" y="14" width="44" height="33" rx="3" fill="#fff7e2" ${o} stroke-width="2.5"/><rect x="8" y="14" width="44" height="9" fill="${col}" ${o} stroke-width="2"/><path d="M14 30h20M14 36h26M14 41h14" stroke="${INK}" stroke-width="1.5" stroke-linecap="round" opacity=".55"/><path d="M43 29l1.6 3.4 3.7.5-2.7 2.6.7 3.7-3.3-1.8-3.3 1.8.7-3.7-2.7-2.6 3.7-.5z" fill="${col}" ${o} stroke-width="1.2"/></g></svg>`;
  }
  // mid 是 null：不限哪座山掉的；only：再多一個條件（例如只要還沒有的），挑不到就回 null
  // rnd、date：好友跟隨分寶物用（固定亂數、那一趟的日期，白天的季節），每支手機挑出同一件；平常不給就是 Math.random 和現在
  const TEAM_WX = { kind:'sunny', time:'day' };
  function rollTreasure(mid, only, rnd, date){
    const pool = SX.TREASURES.filter(x => (mid == null || x.drop === 'any' || (Array.isArray(x.drop) && x.drop.includes(SX.groupOf(mid)))) && (!x.peaks || x.peaks.includes(mid)) &&(!x.season || (date ? seasonOk(x.season, mid, TEAM_WX, date) : seasonOk(x.season, mid))) && (!only || only(x)));
    let sum = 0; pool.forEach(x => { sum += RAR_W[x.rarity] || 30; });
    let r = (rnd || Math.random)() * sum;
    for (const x of pool) { r -= RAR_W[x.rarity] || 30; if (r <= 0) return x; }
    return pool[pool.length - 1] || (only ? null : SX.TREASURES[0]);
  }
  // mode: 'show' 開寶物卡、'toast' 只跳提示、'quiet' 不提示
  // after：按「收進背包」之後要做的事（例如回到每日畫面、領下一件）
  function gainTreasure(tr, mode, after){
    if (!tr) return;
    putInBag(tr);
    if (mode === 'show') { daily('treasure'); showTreasure(tr, after); }
    else if (mode === 'toast') toast(`得到「${tr.name}」`);
  }
  // 收進背包並馬上存檔。卡片只是事後顯示：卡片還沒看完就關掉 App，東西也已經在背包裡
  function putInBag(tr, mt = M ? M.id : null){   // mt：在哪座山拿到的（好友跟隨在背景算的那一趟不是畫面上這座）
    const had = SV.bag[tr.id] > 0;   // 舊存檔：這個功能出來前就拿過的寶物，不知道第一次是哪天，不要記成今天
    SV.bag[tr.id] = (SV.bag[tr.id] || 0) + 1;
    if (!SV.bagLog[tr.id]) SV.bagLog[tr.id] = had ? {} : { first:today(), mt:(screen === 'climb' || mt !== (M && M.id)) ? mt : null };   // 只記第一次拿到的日期和山
    SV.bagLog[tr.id].last = today();
    if (mt && tr.name.includes('紀念章')) SV.stats.magpie[mt] = 1;
    save();
  }
  // 寶物卡（寶物已經在背包裡了，這裡只負責給玩家看）
  function showTreasure(tr, after){
    A.sparkle(); if (tr.rarity === '傳說') A.chime();
    if (tr.rarity === '傳說' || (tr.rarity !== '普通' && SV.bag[tr.id] === 1)) MO.petals(MO.petalKind(M), 32);   // 第一次拿到稀有（或傳說）：花瓣飄下來
    modal(`<div class="encounter${tr.rarity !== '普通' ? ' rare' : ''}"><div class="ec-pic" style="animation:pop .5s cubic-bezier(.34,1.8,.5,1)">${trSvg(tr)}</div>
      <h3>${tr.name}</h3><p><span class="chip" style="background:${RAR_COL[tr.rarity] || '#fff'}">${tr.rarity}</span>${tr.season ? ` <span class="chip" style="background:#ffd9e4">季節限定・${SX.SEASON[tr.season].name}</span>` : ''}</p><p>${tr.desc}</p></div>
      <div class="mBtns" style="margin-top:12px"><button class="cbtn go" id="trOk">${after && after.label ? after.label : '收進背包'}</button></div>`, true);
    $('#trOk').onclick = () => { A.pop(); closeModal(); checkQuests(); if (after) after(); };
  }
  function pickTreasure(o, cx, cy){
    const k = 't' + Math.round(o.m);
    if (st.got[k]) return toast(st.team ? '這裡的寶物已經收進隊伍的寶物袋了' : '這裡的寶物已經收進背包了');
    st.got[k] = 1;
    const r = cv.getBoundingClientRect(); SC.burst(cx - r.left, cy - r.top, 'star', 8); MO.sparks(cx, cy, 14);
    if (st.team) { A.sparkle(); toast('收進隊伍的寶物袋，登頂後全隊一起分', 2800); return; }   // 好友跟隨：路上的寶物歸全隊，登頂時一起分（teamShare）
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
    return SX.art.img('enc_' + e.id, `<svg viewBox="0 0 120 120"><path d="M120 0L70 0 20 120 80 120z" fill="rgba(255,220,130,.3)"/>${g}</svg>`, 'artImg encArt');
  }
  const pickEncounter = () => pickEncounterAt(M.id, st.dist / M.dist, wx, [lastEnc]);
  // 依山、走到幾成、天氣時段挑一個奇遇（skip：這次不要重複的；date：哪一天，不給就是今天）
  // away：關著遊戲時自己走的路上補抽。稀有奇遇（rare）只在玩家開著遊戲時才會遇到，關著遊戲不會抽到
  function pickEncounterAt(mid, f, wx, skip, date, away){
    const k = WXD[wx.kind];
    const pool = SX.ENCOUNTERS.filter(e => { const w = e.where || {}, ws = e.wx || w.wx, ts = e.time || w.time;
      return !skip.includes(e.id) && !(away && e.rare) && (!e.season || seasonOk(e.season, mid, wx, date)) && (!w.mountains || w.mountains.includes(SX.groupOf(mid))) && (!w.peaks || w.peaks.includes(mid)) && (w.minFrac == null || f >= w.minFrac) && (w.maxFrac == null || f <= w.maxFrac)
        && (!ws || ws.includes(k) || ws.includes(wx.kind)) && (!ts || ts.includes(wx.time)); });
    if (!pool.length) return null;
    const wt = e => encWeight(e) * (e.wxPref && e.wxPref.includes(wx.kind) ? WXPREF_X : 1);   // wxPref：在這種天氣比較容易遇到
    let sum = 0; pool.forEach(e => { sum += wt(e); });
    let r = Math.random() * sum;
    for (const e of pool) { r -= wt(e); if (r <= 0) return e; }
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
    noteEnc(e);
    const S = SV.stats;
    if (e.text.includes('山羌') && (wx.time === 'night' || wx.time === 'dawn')) S.deer++;
    if (e.text.includes('藍鵲')) S.magpie[M.id] = 1;
    const ch = e.choices || [];
    modal(`<div class="encounter${e.rare ? ' rare' : ''}"><div class="ec-pic">${encSvg(e)}</div><h3>${e.rare ? '難得的奇遇' : '路上的小插曲'}</h3><p id="encTxt">${e.text}</p></div>
      <div class="mBtns" id="encBtns" style="margin-top:12px;flex-direction:column">${ch.length ? ch.map((c, i) => `<button class="cbtn" data-ch="${i}">${c.label}</button>`).join('') : '<button class="cbtn go" id="encOk">繼續走</button>'}</div>`, true);
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
  // 照片牆的名字：走到哪個路標（離登山口幾公里）的照片牆，跟步道上的「0.5 公里路標」同一種說法；最後一段叫山頂
  // 2026-11-24 回報照片牆數字錯：以前寫「1,234 m・1500 m照片牆」，前面是海拔、後面是離登山口的距離，都寫 m，看起來像海拔算錯（象山最高 183 m 卻寫 500 m 照片牆）
  const wallName = (mt, m) => mt && bandOf(m) >= mt.dist ? '山頂' : `${+(bandOf(m) / 1000).toFixed(1)} 公里路標`;
  // 看大圖用的說明（data-pv-t 標題、data-pv-s 日期・距離・海拔）和「我喜歡」的代號（data-like，記在 SV.likes，只存在這支手機的存檔裡）
  const attr = s => String(s == null ? '' : s).replace(/[&"<>]/g, c => ({ '&':'&amp;', '"':'&quot;', '<':'&lt;', '>':'&gt;' }[c]));
  const pvAttrs = (t, s, like, extra) => ` data-pv-t="${attr(t)}" data-pv-s="${attr(s)}" data-like="${attr(like)}"${extra || ''}`;
  const kmOf = m => (Math.max(0, m || 0) / 1000).toFixed(1) + ' km';
  // 自己拍的拍立得沒有編號：用山、位置、日期和圖檔長度組一個（同一張照片永遠一樣）
  const photoKey = p => `p:${p.id}:${p.m}:${p.date}:${p.img ? p.img.length : 0}`;
  const photoAttrs = p => pvAttrs(p.cap, [p.date, /km/.test(p.cap || '') ? '' : '離登山口 ' + kmOf(p.m), p.alt != null ? `海拔 ${Math.round(p.alt).toLocaleString('en-US')} m` : '', p.wx].filter(Boolean).join('・'), photoKey(p));
  const upAttrs = p => { const m = SX.M[p.mountainId]; return pvAttrs(`${m ? m.name : ''}・${wallName(m, p.m)}的照片牆`, [p.by && p.by !== '我' ? p.by : '', p.date, '離登山口 ' + kmOf(p.m), `海拔 ${Math.round(p.alt).toLocaleString('en-US')} m`].filter(Boolean).join('・'), 'u:' + p.id, p.by === '我' ? ` data-up="${attr(p.id)}"` : ''); };
  function wallHtml(list){
    if (!list.length) return '<p class="summitBig">這一段還沒有山友照片，休息時上傳一張吧。</p>';
    return '<div class="grid">' + list.map((p, i) => `<div class="pol${SV.likes['u:' + p.id] ? ' liked' : ''}"${upAttrs(p)} style="margin:4px 0 12px;transform:rotate(${(i % 3 - 1) * 1.5}deg)"><img src="${p.img}"><p>${p.by}・${Math.round(p.alt).toLocaleString('en-US')} m</p></div>`).join('') + '</div>';
  }
  // 清掉以前存到的全黑照片（舊版在畫面還沒畫出來時拍照，會存成整張黑的）；開遊戲時檢查一次
  function purgeBlackPhotos(){
    let left = SV.photos.length; if (!left) return;
    const done = () => { if (--left) return; const n = SV.photos.length; SV.photos = SV.photos.filter(p => !p.black); if (SV.photos.length !== n) { imgDirty = true; save(); } };
    SV.photos.forEach(p => {
      const im = new Image();
      im.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d'); g.drawImage(im, 0, 0, 16, 16); const d = g.getImageData(0, 0, 16, 16).data; let mx = 0; for (let i = 0; i < d.length; i += 4) mx = Math.max(mx, d[i], d[i + 1], d[i + 2]); if (mx < 24) p.black = true; done(); };
      im.onerror = done; im.src = p.img;
    });
  }
  function takePhoto(m, quiet, label, mark){
    const img = SC.snapshot(m);
    const cap = label ? `${M.name}・${label}` : `${M.name}・${(m/1000).toFixed(1)} km`, wt = wxText(wx) || '晴';
    if (img) { SV.photos.push({ id:M.id, m:Math.round(m), alt:Math.round(altAt(M, m / M.dist)), img, cap, wx:wt, date:today() }); if (SV.photos.length > 60) SV.photos.shift(); imgDirty = true; save(); }
    if (quiet) return;
    if (img) daily('photo');
    if (!img && !mark) { toast('鏡頭起霧了，這張沒拍成'); return; }
    A.shutter();
    const wall = mark ? SV.userPhotos.filter(p => p.mountainId === M.id && bandOf(p.m) === mark) : null;
    modal(`<h3>${mark ? `走了 ${(mark/1000).toFixed(1)} 公里，拍一張！` : '喀嚓！'}</h3>
      ${img ? `<div class="pol"${photoAttrs(SV.photos[SV.photos.length - 1])}><img src="${img}"><p>${cap}・${wt}</p></div>` : ''}
      ${wall ? `<h3>山友照片牆・${wallName(M, mark)}</h3>${wallHtml(wall)}` : ''}
      <div class="mBtns"><button class="cbtn go" id="pOk">${img ? '收進相簿' : '繼續走'}</button></div>`);
    $('#pOk').onclick = () => { A.pop(); closeModal(); if (mark) say(pick(SX.LINES.walk)); };
    if (mark && SX.social) SX.social.fillWall(M.id, mark, $('#mCard'));
  }
  // 上傳山上的照片：縮到最長邊 720px 的 JPEG，記下哪座山、離登山口幾公尺、海拔
  let upCtx = null;
  const upFile = $('#upFile');
  function pickUpload(mountainId, m, btn){ upCtx = { mountainId, m, btn }; upFile.value = ''; upFile.click(); }   // btn：按下去的按鈕，選好照片後轉圈
  upFile.onchange = () => {
    const f = upFile.files && upFile.files[0], ctx = upCtx; upCtx = null;
    if (!f || !ctx || !SX.M[ctx.mountainId]) return;
    const url = URL.createObjectURL(f), im = new Image(), btn = ctx.btn;
    MO.busy(btn);
    im.onload = () => {
      const k = Math.min(1, 720 / Math.max(im.width, im.height, 1)), c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k));
      let img = '';
      try { c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); img = c.toDataURL('image/jpeg', 0.72); } catch(e){}
      URL.revokeObjectURL(url);
      if (!img) { MO.idle(btn); return toast('這張照片讀不出來'); }
      const mt = SX.M[ctx.mountainId], m = clamp(Math.round(ctx.m), 0, mt.dist);
      const rec = { id:'u' + Date.now().toString(36), mountainId:mt.id, m, alt:Math.round(altAt(mt, m / mt.dist)), img, date:today(), by:'我' };
      // 之後接後端：在這裡把 rec（img 改成檔案）POST 到伺服器，成功後用回傳的 id 和圖片網址取代本機的 img；
      // 照片牆改成向伺服器要「這座山、這個 500 公尺區段」的清單。
      SV.userPhotos.push(rec); if (SV.userPhotos.length > 24) SV.userPhotos.shift();
      imgDirty = true; save(); A.shutter();
      daily('photo');
      if (SX.social) SX.social.uploadPhoto(c, rec);   // 有山友帳號就同時分享到伺服器（審核後公開）
      toast(`上傳好了，會出現在${mt.name}${wallName(mt, m)}的照片牆`, 3000);
      MO.done(btn).then(() => { if (screen === 'album') renderAlbum(); });
    };
    im.onerror = () => { URL.revokeObjectURL(url); MO.idle(btn); toast('這張照片讀不出來'); };
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
    // 石頭美術圖：有圖就隨機挑一顆，高度照圖的長寬比算（碰撞也用這個高度）
    const STONE_ART = ['stone_a', 'stone_b', 'stone_c'];
    const mk = () => {
      const n = stack.length, w = 100 - n * 11, art = pick(STONE_ART), e = SX.art.get(art), f = e && e.frames[0];
      return { w, h:f ? w * f.h / f.w : 32 - n * 2.5, art:f ? art : null, x:W / 2, y:64, vy:0, vx:0, rot:0, state:'swing', ph:Math.random() * 6.28, sp:1.7 + n * 0.35, col:COLS[n % 5], tilt:(Math.random() - 0.5) * 0.14 };
    };
    const ell = s => { g.beginPath(); g.ellipse(0, 0, s.w / 2, s.h / 2, 0, 0, 6.2832); };
    function drawStone(s){
      g.save(); g.translate(s.x, s.y); g.rotate(s.tilt + s.rot);
      if (s.art) { SX.art.drawFrame(g, s.art, 0, 0, s.h / 2, s.h); g.restore(); return; }
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
      SV.stats.cairns++; daily('cairn'); save(); A.chime();
      const r = $('#app').getBoundingClientRect(); MO.sparks(r.left + r.width / 2, r.top + r.height * 0.4, 18);
      modal(`<h3>石頭疊好了</h3>${noteHtml(wish, `— 你在${M.name}留下的願望`)}
        <p class="summitBig">步道旁多了一座你的小石堆。</p><div class="mBtns"><button class="cbtn go" id="sgOk">好</button></div>`);
      $('#sgOk').onclick = () => { A.pop(); closeModal(); checkQuests(); };
    }
    function tick(now){
      if (!alive || !c.isConnected || !$('#modal').classList.contains('on')) { alive = false; return; }   // 視窗被別的方式關掉也要停，不在背後一直畫
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
      case 'climbs': return c.withFriends ? (SV.stats.withFriends || 0) >= n : (c.distinct ? ids.length : ids.reduce((a, k) => a + SV.done[k], 0)) >= n;
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
    checkBadges();
    const msgs = [];
    SX.QUESTS.forEach(q => {
      if (SV.quests[q.id] || !questOk(q)) return;
      SV.quests[q.id] = today();
      const r = q.reward || {}; let txt = '';
      if (r.title) { if (!SV.titles.includes(r.title)) SV.titles.push(r.title); if (!SV.title) SV.title = r.title; txt = `稱號「${r.title}」`; }
      if (r.item) { const tr = SX.TREASURES.find(x => x.id === r.item); if (tr) { gainTreasure(tr, 'quiet'); txt = `寶物「${tr.name}」`; } }   // 走 gainTreasure，才會記第一次拿到的日期
      if (r.pet) { if (!SV.pets.includes(r.pet)) SV.pets.push(r.pet); const p = SX.PETS.find(x => x.id === r.pet); txt = `新夥伴「${p ? p.name : r.pet}」`; }
      msgs.push(`完成隱藏任務「${q.name}」${txt ? '，得到' + txt : ''}`);
    });
    if (!msgs.length) return;
    save(); MO.petals(MO.petalKind(M), 30); A.chime();
    msgs.forEach(m => notice(m, 2600));
  }

  // ───────── 背包（寶物、稱號、任務）─────────
  // 還沒找到的寶物：點空格的一句提示。一般寶物說清楚在哪些山；稀有、傳說只說季節或大概的地區，保留神秘感
  function bagHint(x){
    const s = x.season && SX.SEASON[x.season], ms = x.peaks || (x.drop === 'any' ? null : x.drop);
    if (x.rarity === '普通') { const ns = ms && ms.map(id => SX.GROUP[id] ? SX.GROUP[id].name : SX.M[id] ? SX.M[id].name : id);
      return ns ? `可能在${ns.slice(0, 3).join('、')}${ns.length > 3 ? '這些山' : ''}撿到` : '哪座山都撿得到，多走走就會遇到'; }
    const areas = ms ? [...new Set(ms.map(id => (SX.M[id] || {}).area).filter(Boolean))] : [];
    return `？ ${x.rarity === '傳說' ? '傳說中的寶物' : '稀有的寶物'}・${s ? `季節限定：${s.name}` : areas.length ? `聽說在${areas.slice(0, 2).join('、')}一帶的山上` : '聽說藏在某座山上'}`;
  }
  function openBag(back, from){   // back：從寶物放大卡回來時，捲回原本的位置；from：{ id, rect } 大卡片的位置，圖飛回格子
    const have = SX.TREASURES.filter(x => SV.bag[x.id] > 0).length;
    modal(`<button class="cbtn sm mBack" id="bagOk">← 返回</button><h3>背包</h3>
      ${SV.titles.length ? `<div class="grp" style="margin-top:0">稱號（點一個掛在身上）</div><div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">${SV.titles.map(x => `<button class="chip" data-title="${x}"${SV.title === x ? ' style="background:#ffe08a"' : ''}>${x}</button>`).join('')}</div>` : ''}
      <div class="grp" style="margin-top:0">寶物 ${have} / ${SX.TREASURES.length}</div>
      <div class="bag">${SX.TREASURES.map(x => SV.bag[x.id] > 0 ? `<button class="slot${x.rarity !== '普通' ? ' rare' : ''} ${RAR_CLS[x.rarity] || ''}" data-tr="${x.id}" style="${RAR_BG[x.rarity] || ''}">${trSvg(x)}${SV.bag[x.id] > 1 ? `<b>×${SV.bag[x.id]}</b>` : ''}</button>`
        : `<button class="slot empty" data-hint="${x.id}" aria-label="還沒找到的寶物">${x.rarity === '普通' ? `<span class="sil">${trSvg(x)}</span>` : '<i>？</i>'}</button>`).join('')}</div>
      <p class="summitBig" id="bagInfo" style="margin-top:10px;min-height:52px">${have ? '點寶物看故事；點淡淡的影子，看哪裡找得到。' : '步道上閃閃發亮的地方，點一下看看。'}</p>
      <div class="grp">隱藏任務 ${Object.keys(SV.quests).length} / ${SX.QUESTS.length}</div>
      <ul class="quest">${SX.QUESTS.map(q => SV.quests[q.id] ? `<li class="done"><span>${q.name}<small>${q.desc}</small></span></li>` : `<li class="hid"><span>？？？<small>${q.hint}</small></span></li>`).join('')}</ul>`);
    $$('#mCard [data-tr]').forEach(b => b.onclick = () => { A.pop(); treasureCard(b.dataset.tr, $('#mCard').scrollTop, b.getBoundingClientRect()); });
    $$('#mCard [data-hint]').forEach(b => b.onclick = () => {
      A.pop(); $$('#mCard .slot.pick').forEach(k => k.classList.remove('pick')); b.classList.add('pick');
      toast(bagHint(SX.TREASURES.find(x => x.id === b.dataset.hint)), 3000);   // 提示框浮在最上面，格子在背包下面也看得到
    });
    $$('#mCard [data-title]').forEach(b => b.onclick = () => { A.pop(); SV.title = b.dataset.title; save(); $$('#mCard [data-title]').forEach(k => { k.style.background = k === b ? '#ffe08a' : ''; }); });
    $('#bagOk').onclick = () => { A.pop(); closeModal(); };
    if (typeof back === 'number') $('#mCard').scrollTop = back;
    else MO.stagger($('#mCard'), '.bag .slot');
    if (from) MO.flip($(`#mCard [data-tr="${from.id}"]`), from.rect, { lift:true });
  }

  // ───────── 寶物放大卡（背包裡點寶物）─────────
  // 大圖＋稀有度框、名稱、說明、數量、第一次拿到的日期和山；稀有／傳說有流光和跟著手指的傾斜；左右滑或箭頭換下一件
  function treasureCard(id, bagScroll, fromRect){   // fromRect：背包格子的位置，圖從那裡飛過來
    const owned = SX.TREASURES.filter(x => SV.bag[x.id] > 0);
    let i = owned.findIndex(x => x.id === id);
    if (i < 0) return;
    daily('look');
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const show = dir => {
      const tr = owned[i], log = SV.bagLog[tr.id], mt = log && log.mt && SX.M[log.mt];
      const fancy = tr.rarity !== '普通' && !calm, many = owned.length > 1;
      modal(`<h3>${tr.name}</h3>
        <div class="tzWrap${dir ? (dir > 0 ? ' inR' : ' inL') : ''}" id="tzWrap">
          <div class="tzStage${fancy ? ' fancy' : ''}${tr.rarity === '傳說' ? ' leg' : ''}" id="tzStage">
            <div class="tzFrame ${RAR_CLS[tr.rarity] || ''}" style="${RAR_BG[tr.rarity] || ''}">${trSvg(tr)}${fancy ? '<i class="tzSheen"></i>' : ''}</div>
          </div>
        </div>
        <p class="tzTags"><span class="chip" style="background:${RAR_COL[tr.rarity] || '#fff'}">${tr.rarity}</span><span class="chip">× ${SV.bag[tr.id]}</span>${tr.season ? `<span class="chip" style="background:#ffd9e4">季節限定・${SX.SEASON[tr.season].name}</span>` : ''}${many ? `<small>${i + 1} / ${owned.length}</small>` : ''}</p>
        <p class="tzDesc">${tr.desc}</p>
        ${log && log.first ? `<p class="tzFirst">第一次拿到：${log.first}${mt ? `・${mt.name}` : ''}</p>` : ''}
        <div class="mBtns tzBtns">${many ? '<button class="cbtn tzArr" id="tzPrev" aria-label="上一件">‹</button>' : ''}<button class="cbtn go" id="tzBack">回背包</button>${many ? '<button class="cbtn tzArr" id="tzNext" aria-label="下一件">›</button>' : ''}</div>`);
      const wrap = $('#tzWrap'), stage = $('#tzStage');
      const step = d => { A.pop(); i = (i + d + owned.length) % owned.length; show(d); };
      const tilt = e => {   // 手指在卡片上的位置 → 卡片往那邊傾、流光跟著移
        const r = stage.getBoundingClientRect(), px = clamp((e.clientX - r.left) / r.width, 0, 1), py = clamp((e.clientY - r.top) / r.height, 0, 1);
        stage.classList.add('tilting');
        stage.style.setProperty('--rx', ((0.5 - py) * 18).toFixed(1) + 'deg');
        stage.style.setProperty('--ry', ((px - 0.5) * 22).toFixed(1) + 'deg');
        stage.style.setProperty('--sx', (100 - px * 100).toFixed(0) + '%');
      };
      const untilt = () => { stage.classList.remove('tilting'); ['--rx', '--ry', '--sx'].forEach(k => stage.style.removeProperty(k)); };
      let p0 = null;
      wrap.onpointerdown = e => { p0 = { x:e.clientX, y:e.clientY }; try { wrap.setPointerCapture(e.pointerId); } catch(err){} if (fancy) tilt(e); };
      wrap.onpointermove = e => { if (fancy && (p0 || e.pointerType === 'mouse')) tilt(e); };
      wrap.onpointerup = e => {
        if (!p0) return;
        const dx = e.clientX - p0.x, dy = e.clientY - p0.y; p0 = null; untilt();
        if (many && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) step(dx < 0 ? 1 : -1);   // 往左滑看下一件
      };
      wrap.onpointercancel = () => { p0 = null; untilt(); };
      wrap.onpointerleave = () => { if (!p0) untilt(); };
      if (many) { $('#tzPrev').onclick = () => step(-1); $('#tzNext').onclick = () => step(1); }
      $('#tzBack').onclick = () => { A.pop(); const f = $('#mCard .tzFrame'); openBag(bagScroll, { id:owned[i].id, rect:f && f.getBoundingClientRect() }); };
    };
    show(0);
    if (fromRect) { MO.flip($('#mCard .tzFrame'), fromRect); MO.fadeIn($$('#mCard h3, #mCard .tzTags, #mCard .tzDesc, #mCard .tzFirst, #mCard .tzBtns')); }
  }

  // ───────── 每日任務與連續上山天數 ─────────
  // big：主任務，每天照順序換一個；grp：小任務分 0、1 兩組，單數日、雙數日輪流用，連續兩天的小任務一定不一樣
  // 每一種都要 3～10 分鐘做得完（離開時自己走的路也算進走路）；need：要有帳號（acct）或正在一起爬（party）才排得到
  const DAILY_POOL = [
    { id:'walk',  big:true, name:'走 400 公尺', goal:400, unit:'m' },
    { id:'seg',   big:true, name:'完成一個小目標', goal:1 },
    { id:'walk3', big:true, kind:'walk', name:'走 800 公尺', goal:800, unit:'m' },
    { id:'walk2', big:true, kind:'walk', name:'走 1,200 公尺', goal:1200, unit:'m' },
    { id:'rest',  grp:0, name:'在長椅或觀景台休息一次', goal:1 },
    { id:'cairn', grp:0, name:'疊一座許願石堆', goal:1 },
    { id:'treasure', grp:0, name:'撿到一件寶物', goal:1 },
    { id:'look',  grp:0, name:'在背包看一件寶物的故事', goal:1 },
    { id:'cheer', grp:0, need:'party', name:'幫一起爬的好友加油', goal:1 },
    { id:'note',  grp:1, name:'讀一張樹洞便條', goal:1 },
    { id:'photo', grp:1, name:'拍一張風景照', goal:1 },
    { id:'enc',   grp:1, name:'路上遇到一次奇遇', goal:1 },
    { id:'chat',  grp:1, need:'acct', name:'在山友大廳打聲招呼', goal:1 },
    { id:'summit', name:'登頂一座山', goal:1 },   // 不排進每日（一趟常常超過 10 分鐘），舊存檔當天抽到的還要認得
  ];
  const nowMs = () => testDate ? testDate.getTime() : Date.now();   // 測試掛鉤 SXG.date 假裝的日子也會換每日任務
  const dayKey = (t = nowMs()) => { const d = new Date(t); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  const dayNo = k => { const [y, m, d] = k.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 864e5); };
  // 這一天的任務：同一天怎麼算都一樣（用日期當種子），隔天一定換
  function dailyPick(k){
    const n = dayNo(k), r = C.rng(C.hash('daily' + k)), S = SX.social || {};
    const small = DAILY_POOL.filter(x => x.grp === n % 2 && (!x.need || S[x.need])), bigs = DAILY_POOL.filter(x => x.big);
    const pick = []; while (pick.length < 2 && pick.length < small.length) { const x = small[Math.floor(r() * small.length)]; if (!pick.includes(x)) pick.push(x); }
    return [bigs[n % bigs.length], ...pick];
  }
  let dailyNow = 0;
  function dailyState(){
    const t = Date.now();
    if (SV.daily && t - dailyNow < 30000) return SV.daily;   // 每 30 秒才重新檢查一次換日
    dailyNow = t; const k = dayKey();
    if (!SV.daily || SV.daily.day !== k) {
      const prev = SV.daily, streak = prev && prev.day === dayKey(nowMs() - 864e5) ? (prev.streak || 0) + 1 : 1;
      SV.daily = { day:k, streak, streakGot:false, tasks:dailyPick(k).map(x => ({ id:x.id, n:0, done:false, got:false })) };
      save(); setTimeout(updateDailyBadge, 0);
    }
    return SV.daily;
  }
  function daily(kind, amt = 1){
    const D = dailyState();
    for (const tk of D.tasks) {
      if (tk.done) continue;
      const def = DAILY_POOL.find(x => x.id === tk.id); if (!def || (def.kind || def.id) !== kind) continue;
      tk.n = Math.min(def.goal, tk.n + amt);
      if (tk.n >= def.goal) { tk.done = true; toast(`每日任務完成：${def.name}，到「每日」領獎勵`); A.sparkle(); updateDailyBadge(); save(); }
    }
  }
  function updateDailyBadge(){
    const D = SV.daily; if (!D) return;
    const n = D.tasks.filter(t => t.done && !t.got).length + (D.streakGot ? 0 : 1);
    $$('[data-go="daily"]').forEach(b => b.dataset.badge = n ? String(n) : '');
  }
  // 新手禮物：一輩子只送一次的保證寶物（FIRST_GIFTS 寫在存檔那邊），一定是「還沒有的」，有畫好的圖優先
  // 只從一般掉落裡挑：不送季節限定（season）、不送只屬於某幾座山的（peaks），長期的稀有度不變
  // 也不送遊戲本來就會給的（每次登頂的紀念章、隱藏任務的獎勵），不然之後拿到又是重複的
  const SUMMIT_STAMP = 't_summit_stamp', AUTO_GIVEN = new Set([SUMMIT_STAMP, ...SX.QUESTS.map(q => q.reward.item).filter(Boolean)]);
  const freshFor = rar => x => x.rarity === rar && !AUTO_GIVEN.has(x.id) && !(SV.bag[x.id] > 0);   // 這個稀有度、還沒有、不是遊戲本來就會給的
  function giftTreasure(key, mid){
    if (!FIRST_GIFTS[key] || SV.gifts[key]) return null;
    SV.gifts[key] = today();
    const fresh = x => freshFor(FIRST_GIFTS[key])(x) && !x.season && !x.peaks, drawn = x => fresh(x) && SX.art.has(x.id);
    return (mid && rollTreasure(mid, drawn)) || rollTreasure(null, drawn) || (mid && rollTreasure(mid, fresh)) || rollTreasure(null, fresh);
  }
  // 開始登山的頭三天：每日的一般獎勵先給還沒有的一般寶物（稀有、傳說的機率不變）
  const newbie = () => dayNo(dayKey()) - dayNo(dayKey(new Date(SV.born).getTime())) < 3;
  // kind：'rare'（連續第 7 天）、'common'，或新手禮物的代號（第一次領獎不管哪一種，都先送 daily 新手禮物）
  function giveReward(kind){
    const mid = M ? M.id : 'any';
    let tr = giftTreasure(FIRST_GIFTS[kind] ? kind : kind === 'rare' ? null : 'daily', mid);
    if (!tr && kind === 'rare') { const pool = SX.TREASURES.filter(x => x.rarity !== '普通' && !x.season); tr = pool[Math.floor(Math.random() * pool.length)]; }   // 季節限定只能在當季的山上找到
    if (!tr && newbie()) tr = rollTreasure(mid, freshFor('普通')) || rollTreasure(null, freshFor('普通'));   // 這座山的挑完了，就從別座山的一般寶物挑
    return tr || rollTreasure(mid);
  }
  // 領每日獎勵（單領、一鍵領取都走這裡）：呼叫前先把簽到／任務標成已領。
  // 所有寶物一次全部收進背包、跟「已領」一起存檔，之後才一張一張顯示卡片，最後回到每日畫面
  function claimRewards(kinds){
    const trs = kinds.map(k => { const tr = giveReward(k); putInBag(tr); return tr; });   // 一件一件挑：新手禮物才不會挑到同一件
    save(); updateDailyBadge(); closeModal();
    showSeq(trs);
  }
  function showSeq(trs){
    if (!trs.length) { openDaily(); return; }
    const tr = trs.shift(), next = () => showSeq(trs);
    next.label = trs.length ? `下一件（還有 ${trs.length} 件）` : '收進背包';
    showTreasure(tr, next);
  }
  // 連續上山的 7 天：走過的一天是一枚金色小山印章，還沒到的只有淡淡的虛線圈和日子；拿稀有寶物的那天（第 3、7 天）是禮物盒
  const STREAK_PEAK = '<svg viewBox="0 0 20 20"><path d="M2 15.5 7.5 7l3 4.2L13 8.5l5 7z" fill="#fff8e6" stroke="#3a2a20" stroke-width="1.3" stroke-linejoin="round"/><path d="M6.3 8.9 7.5 7l1.3 1.9" fill="none" stroke="#3a2a20" stroke-width="1.1"/></svg>';
  const STREAK_GIFT = '<svg viewBox="0 0 20 20"><rect x="3.5" y="8" width="13" height="9" rx="1.5" fill="#fff8e6" stroke="#3a2a20" stroke-width="1.3"/><rect x="2.5" y="5.5" width="15" height="3.5" rx="1" fill="#fff8e6" stroke="#3a2a20" stroke-width="1.3"/><path d="M10 5.5V17M10 5.5C8 2.5 5.5 3.5 7 5.5M10 5.5c2-3 4.5-2 3 0" fill="none" stroke="#3a2a20" stroke-width="1.3" stroke-linecap="round"/></svg>';
  const streakDay = (i, on, big) => `<i class="${on ? 'on' : ''}${big ? ' big' : ''}">${big ? STREAK_GIFT : on ? STREAK_PEAK : `<span>${i}</span>`}</i>`;
  function openDaily(){
    const D = dailyState(), s = D.streak, wk = ((s - 1) % 7) + 1;
    const g3 = !SV.gifts.streak3 && s <= 3;   // 新手禮物：第一次連續上山 3 天，簽到送稀有寶物
    const signKind = wk === 7 ? 'rare' : g3 && s === 3 ? 'streak3' : 'common';
    const tip = wk === 7 ? '第 7 天了，簽到拿稀有寶物！' : signKind === 'streak3' ? '連續 3 天了！今天簽到送一件稀有寶物' : g3 ? `再 ${3 - s} 天，簽到送一件稀有寶物` : `再 ${7 - wk} 天拿稀有寶物`;
    const nClaim = (D.streakGot ? 0 : 1) + D.tasks.filter(t => t.done && !t.got).length;   // 可以領的件數（一鍵領取用）
    modal(`<h3>每日任務</h3>
      <div class="streakBox"><b>連續上山 ${s} 天</b><div class="streakDots">${[1,2,3,4,5,6,7].map(i => streakDay(i, i <= wk, i === 7 || (i === 3 && g3))).join('')}</div>
        <small>${D.streakGot && signKind !== 'common' ? '今天的禮物領過了' : tip}</small>
        <button class="cbtn ${D.streakGot ? '' : 'go'} sm" id="dyIn" ${D.streakGot ? 'disabled' : ''}>${D.streakGot ? '今天簽到過了' : '簽到'}</button></div>
      ${D.tasks.map((tk, i) => { const def = DAILY_POOL.find(x => x.id === tk.id) || { name:tk.id, goal:1 }; const f = Math.min(1, tk.n / def.goal);
        return `<div class="dyTask${tk.done ? ' done' : ''}"><div><b>${def.name}</b><div class="dyBar"><i style="width:${f * 100}%"></i></div>
          <small><span data-count="${Math.floor(tk.n)}">${Math.floor(tk.n).toLocaleString('en-US')}</span> / ${def.goal.toLocaleString('en-US')}${def.unit ? ' m' : ''}</small></div>
          <button class="cbtn sm ${tk.done && !tk.got ? 'go' : ''}" data-dy="${i}" ${tk.done && !tk.got ? '' : 'disabled'}>${tk.got ? '已領取' : tk.done ? '領取' : '進行中'}</button></div>`; }).join('')}
      <p class="summitBig" style="font-size:12px">每天半夜十二點換新任務，完成就能領一件寶物。</p>
      <div class="mBtns">${nClaim ? `<button class="cbtn go" id="dyAll">一鍵領取 ${nClaim}</button>` : ''}<button class="cbtn" id="dyX">← 返回</button></div>`);
    MO.progress($('#mCard')); MO.stagger($('#mCard'), '.dyTask');
    // 領完都回到每日畫面
    $('#dyIn').onclick = () => { if (D.streakGot) return; D.streakGot = true; claimRewards([signKind]); };
    $$('[data-dy]').forEach(b => b.onclick = () => { const tk = D.tasks[+b.dataset.dy]; if (!tk.done || tk.got) return; tk.got = true; claimRewards(['common']); });
    // 一鍵領取：簽到＋所有完成的任務，一次收進背包，卡片一張一張看
    if (nClaim) $('#dyAll').onclick = e => MO.beat(e.currentTarget).then(on => {   // 轉圈、打勾（不到 0.4 秒）；視窗已經關掉就不領
      if (!on) return;
      const list = [];
      if (!D.streakGot) { D.streakGot = true; list.push(signKind); }
      D.tasks.forEach(tk => { if (tk.done && !tk.got) { tk.got = true; list.push('common'); } });
      claimRewards(list);
    });
    $('#dyX').onclick = () => { A.pop(); closeModal(); };
  }

  // ───────── 個人紀錄（點地圖左上的標題、登山畫面的臉）─────────
  function openProfile(){
    // 走了多久：舊存檔還沒開始記秒數，用距離估（山友平均約每秒 0.7 公尺），前面加「約」
    const S = SV.stats, km = (S.walked || 0) / 1000, est = (S.walked || 0) / 0.7, guess = (S.walkSec || 0) < est * 0.5, sec = guess ? est : S.walkSec;
    const days = Math.max(1, Math.floor((Date.now() - new Date(SV.born)) / 864e5) + 1);
    const tops = Object.values(SV.done).reduce((a, b) => a + (b || 0), 0), peaks = SX.MOUNTAINS.filter(m => SV.done[m.id]);
    const high = peaks.reduce((a, m) => Math.max(a, m.alt), 0);
    const hm = sec >= 3600 ? `${Math.floor(sec / 3600)} 小時 ${Math.floor(sec % 3600 / 60)} 分` : `${Math.floor(sec / 60)} 分`;
    const bTot = SX.BADGES.reduce((a, b) => a + badgeLevels(b).length, 0), bGot = SX.BADGES.reduce((a, b) => a + badgeGot(b), 0);
    const row = (name, n, tot) => `<div class="pfRow"><span>${name}</span><div class="dyBar"><i style="width:${tot ? Math.min(100, n / tot * 100) : 0}%"></i></div><b>${n} / ${tot}</b></div>`;
    const fit = SX.fitness(SV), cond = SX.fitCond(SV), fitTxt = cond < 1 - 1e-9 ? `${fit.toFixed(3)}（狀態 ${Math.round(cond * 100)}%）` : fit.toFixed(3);
    const who = (SX.social && SX.social.acct && SX.social.acct.name) || '山友';
    modal(`<button class="cbtn sm mBack" id="pfX">← 返回</button><h3>我的山行紀錄</h3>
      <div class="pfHead">${petSvg(SV.pet)}<div><b>${who}</b>${SV.title ? `<small>${SV.title}</small>` : ''}<small>${SV.born} 開始登山・第 ${days} 天</small></div></div>
      <div class="ic-meta pfStats">
        <div class="paper"><small>累積步行</small><b>${km >= 100 ? km.toFixed(0) : km.toFixed(1)} km</b></div>
        <div class="paper"><small>走了多久</small><b>${guess && sec ? '約 ' : ''}${hm}</b></div>
        <div class="paper"><small>登頂</small><b>${tops} 次・${peaks.length} 座山</b></div>
        <div class="paper"><small>到過最高</small><b>${high ? high.toLocaleString('en-US') + ' m' : '還沒登頂'}</b></div>
        <div class="paper"><small>連續上山</small><b>${(SV.daily && SV.daily.streak) || 0} 天</b></div>
        <div class="paper"><small>最長連續</small><b>${Math.max(S.bestStreak || 0, (SV.daily && SV.daily.streak) || 0)} 天</b></div>
      </div>
      <div class="paper pfFit"><small>體能</small><b>${fitTxt}</b><div class="dyBar"><i style="width:${(fit - 1) / (SX.fitMax() - 1) * 100}%"></i></div><p>每次登頂都會讓身體慢慢變強，越難的山第一次登頂加得越多；太久沒爬山，體能會慢慢掉一點，多爬幾趟就會回來</p></div>
      <div class="grp">成就</div>
      ${row('徽章', bGot, bTot)}
      ${row('寶物', SX.TREASURES.filter(x => SV.bag[x.id] > 0).length, SX.TREASURES.length)}
      ${row('奇遇圖鑑', SX.ENCOUNTERS.filter(e => SV.encSeen[e.id]).length, SX.ENCOUNTERS.length)}
      ${row('集印帳', SX.MOUNTAINS.filter(m => SV.stamps[m.id]).length, SX.MOUNTAINS.length)}
      ${row('隱藏任務', Object.keys(SV.quests).length, SX.QUESTS.length)}
      <p class="summitBig pfMore">拍了 ${SV.photos.length} 張照片・休息 ${S.rests || 0} 次・疊了 ${S.cairns || 0} 座石堆</p>`);
    $('#pfX').onclick = () => { A.pop(); closeModal(); };
  }

  // ───────── 登頂 ─────────
  const escH = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));   // 山友名字放進畫面前跳脫
  function arrive(){
    arrived = true; st.dist = M.dist; st.fin = true; st.rest = false; st.stopAt = null;
    $('#restSheet').classList.remove('on');
    const fit0 = SX.fitness(SV), day = SX.twDay();
    if (SV.done[M.id] > 0 && SX.fitCanCount(SV, M.id, day)) { SV.fitRep[M.id] = (SV.fitRep[M.id] || 0) + 1; SV.fitDay[M.id] = day; }
    SV.done[M.id] = (SV.done[M.id] || 0) + 1;
    const fit1 = SX.fitness(SV), fitUp = fit1 - fit0 > 1e-9 ? `體能 +${(fit1 - fit0).toFixed(3)}（${fit1.toFixed(3)}）` : '';
    SV.stamps[M.id] = SV.stamps[M.id] || today();
    const S = SV.stats; if (wx.time === 'night') S.night++; if (wx.kind === 'rain') S.rain++; if (!st.fast) S.nofast++;
    if (SX.social && SX.social.party && SX.social.party.mountain === M.id) S.withFriends = (S.withFriends || 0) + 1;
    const amates = SX.social ? SX.social.affMates(M.id) : [];   // 同隊的好友（含好感等級）
    if (SX.social && SX.social.party && SX.social.party.mountain === M.id) SX.social.affTop(M.id);   // 一起登頂：告訴伺服器我登頂了（兩人都登頂才加好感）
    if (wx.kind === 'fog') S.fogTop = (S.fogTop || 0) + 1;   // 霧中登頂（徽章用）
    if (wx.kind === 'snow') S.snowTop = (S.snowTop || 0) + 1;   // 雪中登頂（徽章用）
    daily('summit');
    const stamp = SX.TREASURES.find(x => x.id === SUMMIT_STAMP); if (stamp) gainTreasure(stamp, 'quiet');
    const gift = giftTreasure('summit', M.id); if (gift) gainTreasure(gift, 'quiet');   // 第一次登頂：保證一件還沒有的稀有寶物
    const tq = st.team ? followDone(st.team) : null;   // 好友跟隨：這一趟登頂了，分到全隊寶物裡我的那幾件、告訴伺服器
    st.seg = null;   // 小目標是山頂時，登頂卡片就是它的獎勵
    save(); A.yay();
    const m = M;
    setTimeout(() => {
      if (M !== m) return;
      const img = SC.snapshot();
      if (img) { SV.photos.push({ id:M.id, m:M.dist, alt:M.alt, img, cap:`${M.name}・登頂`, wx:wxText(wx) || '晴', date:today() }); imgDirty = true; save(); }
      // 好感 Lv5：多一張兩人合照（等級最高的那位好友站在旁邊）；Lv10：兩人名字刻在山頂石頭上
      const duoF = amates.filter(f => SX.affHas(f.lv, 'duo')).sort((a, b) => b.lv - a.lv)[0];
      const duoImg = duoF ? SC.snapshot(null, { name:duoF.name, pet:SX.affHas(duoF.lv, 'pet') ? duoF.pet : null }) : '';
      if (duoImg) { SV.photos.push({ id:M.id, m:M.dist, alt:M.alt, img:duoImg, cap:`${M.name}・和${duoF.name}的合照`, wx:wxText(wx) || '晴', date:today() }); imgDirty = true; save(); }
      const me = (SX.social && SX.social.acct && SX.social.acct.name) || '我', carved = amates.filter(f => SX.affHas(f.lv, 'life')).map(f => f.name);
      const r = $('#app').getBoundingClientRect(); MO.sparks(r.left + r.width/2, r.top + r.height*0.4, 24); MO.petals(MO.petalKind(M), 40);
      const wall = SV.userPhotos.filter(p => p.mountainId === M.id && bandOf(p.m) >= M.dist);
      const nx = recommendNext(), nxt = nx && nx.id !== M.id ? nx : null;   // 登頂後推薦下一座
      modal(`${SX.art.img(groupArt('summit_', M.id), '', 'artImg summitArt')}<h3>抵達終點！</h3>
        <div class="summitBig"><b>${M.name} ${M.alt.toLocaleString('en-US')} m</b>${M.end}</div>
        ${img ? `<div class="pol"${photoAttrs(SV.photos[SV.photos.length - (duoImg ? 2 : 1)])}><img src="${img}"><p>${M.name}・登頂紀念</p></div>` : ''}
        ${duoImg ? `<div class="pol"${photoAttrs(SV.photos[SV.photos.length - 1])}><img src="${duoImg}"><p>和${escH(duoF.name)}的合照</p></div>` : ''}
        ${carved.length ? `<p class="summitBig carved">山頂的石頭上刻著：${escH(me)} ＆ ${carved.map(escH).join(' ＆ ')}</p>` : ''}
        ${stamp ? '<p class="summitBig">背包裡多了一枚登頂紀念章。</p>' : ''}
        ${gift ? `<div class="giftRow ${RAR_CLS[gift.rarity] || ''}" style="${RAR_BG[gift.rarity] || ''}">${trSvg(gift)}<span><small>第一次登頂的禮物</small><b>${gift.name}</b><span class="chip" style="background:${RAR_COL[gift.rarity]}">${gift.rarity}</span></span></div>` : ''}
        ${wall.length ? `<h3>山友照片牆・山頂</h3>${wallHtml(wall)}` : ''}
        ${tq && tq.items.length ? `<p class="summitBig">隊伍的寶物袋分到 ${tq.items.length} 件：${tq.items.map(x => `「${x.name}」`).join('')}</p>` : ''}
        <p class="summitBig">集印帳蓋上新的章了！</p>
        ${fitUp ? `<p class="summitBig fitUp">${fitUp}</p>` : ''}
        ${tq ? '<p class="summitBig">先在山頂等隊友，全員登頂後隊長會選下一座山。</p>' : nxt ? `<p class="summitBig">下一座推薦：${nxt.name}（難度 ${'★'.repeat(nxt.diff)}）</p>` : ''}
        <div class="mBtns"><button class="cbtn go" id="aMap">${tq ? '好' : nxt ? '看下一座' : '回地圖'}</button></div>`, true);
      // 好友跟隨：看登頂卡片的時候隊長已經帶大家出發了（SV.cur 換成新的那座），按了就接著走新的那座
      // 好友跟隨：按「好」就留在山頂等隊友（登山畫面上看得到隊友走到哪）；隊長已經選了下一座的話，closeModal 會換過去（followSwitch）
      $('#aMap').onclick = () => { closeModal(); if (SV.cur === m.id && !tq) SV.cur = null; save(); if (tq || onTrail()) return; go('map', () => { if (nxt) { try { WM.focus(SX.groupOf(nxt.id)); } catch(e){} showRoute(nxt.id); } }); };
      checkQuests();
    }, 1400);
  }

  // ───────── 好友跟隨（隊伍）─────────
  // 隊伍的狀態只在伺服器；social.js 拿到後叫 follow()，這裡只管自己的存檔：
  // SV.follow = { trips:{ 趟的代號: { team, trip, mountain, day, members } }, done:[已經算過登頂的趟], log:[還沒看的「隊長帶你走了什麼」] }
  // 這一趟走在路上時，進度 SV.prog[山].team＝趟的代號：從隊長出發那一刻起算在路上（關著遊戲照現有的離開補算走）
  const followOf = () => SV.follow || (SV.follow = { trips:{}, done:[], log:[] });
  // 全隊寶物裡分給我的那幾件（SX.teamSplit：隊伍代號＋山＋日期當種子，每支手機算出一樣的結果）
  function teamShare(info){
    const me = SX.social && SX.social.acct && SX.social.acct.id;
    if (!info || !me || !SX.M[info.mountain]) return [];
    const date = new Date(info.day + 'T12:00:00+08:00');
    return SX.teamSplit(info.team, info.mountain, info.day, info.members, r => rollTreasure(info.mountain, null, r, date))[me] || [];
  }
  // 自己看著登頂（arrive）：記下這一趟算過了、寶物收進背包、告訴伺服器
  function followDone(key){
    const F = followOf(), info = F.trips[key];
    if (!info || F.done.includes(key)) return null;
    F.done.push(key); while (F.done.length > 40) F.done.shift();
    const items = teamShare(info); items.forEach(x => putInBag(x, info.mountain));
    if (SX.social && SX.social.teamTop) SX.social.teamTop(info, false);
    save();
    return { items, info };
  }
  // 隊長帶大家出發了：自己爬到一半的別座山先下山，這座從出發的那一刻開始算（打開登山畫面時照離開補算走到現在）
  function followStart(id, since, key){
    const tr = onTrail(); if (tr && tr !== id) goDown(tr);
    SV.cur = id; SV.prog[id] = Object.assign(newProg(), { last:Math.min(Date.now(), since || Date.now()), team:key });
    save();
    notice(`隊長帶大家出發去${SX.M[id].name}了，你會照自己的速度跟著走`, 3600);
    followSwitch();
  }
  // 正在登山畫面看著別座山（例如在上一座山頂等）而且沒有視窗開著：換到隊伍現在這座
  function followSwitch(){ const tr = onTrail(); if (screen === 'climb' && tr && M && M.id !== tr && !$('#modal').classList.contains('on')) startClimb(tr, true, true); }
  // 關著遊戲（或這支手機還沒走）時隊長帶著走完的那一趟：在背景算登頂（登頂次數、百岳紀錄、集印、體能照自己爬的規則、照片、寶物）
  function followSummit(tr, m, lead){
    const when = Math.min(Date.now(), tr.summited || Date.now()), day = SX.twDay(when), date = new Date(when).toLocaleDateString('zh-TW');
    const fit0 = SX.fitness(SV), F = followOf();
    if (SV.done[m.id] > 0 && SX.fitCanCount(SV, m.id, day)) { SV.fitRep[m.id] = (SV.fitRep[m.id] || 0) + 1; SV.fitDay[m.id] = day; }
    SV.done[m.id] = (SV.done[m.id] || 0) + 1;
    const fresh = !SV.stamps[m.id]; SV.stamps[m.id] = SV.stamps[m.id] || date;
    SV.stats.withFriends = (SV.stats.withFriends || 0) + 1;
    const stamp = SX.TREASURES.find(x => x.id === SUMMIT_STAMP); if (stamp) putInBag(stamp, m.id);
    const gift = giftTreasure('summit', m.id), items = (gift ? [gift] : []).concat(teamShare(F.trips[tr.key]));
    items.forEach(x => putInBag(x, m.id));
    F.done.push(tr.key); while (F.done.length > 40) F.done.shift();
    const img = SX.art.url(groupArt('summit_', m.id));   // 不在這座山的登山畫面上拍不了照：用這座山的山頂插圖當紀念照
    if (img) { SV.photos.push({ id:m.id, m:m.dist, alt:m.alt, img, cap:lead ? `${m.name}・跟著${lead}登頂` : `${m.name}・全隊登頂`, wx:'晴', date }); if (SV.photos.length > 60) SV.photos.shift(); imgDirty = true; }
    if (SX.social && SX.social.teamTop) SX.social.teamTop(F.trips[tr.key], true);
    return { mt:m.id, date, lead, stamp:fresh, photo:img ? SV.photos.length - 1 : -1, items:items.map(x => x.id), fit:Math.round((SX.fitness(SV) - fit0) * 1000) / 1000 };
  }
  // social.js 拿到隊伍後叫這裡。list：我有參加的每一趟（舊到新），lead：隊長名字（我自己是隊長就是空字串）
  // { key, team, trip, mountain, day, started, members, current（隊伍現在這一趟）, summited（伺服器說我登頂的時間，0＝還沒）}
  function follow(list, lead){
    const F = followOf(); let changed = false, walked = null;
    for (const tr of list) {
      const m = SX.M[tr.mountain]; if (!m) continue;
      F.trips[tr.key] = { key:tr.key, team:tr.team, trip:tr.trip, mountain:tr.mountain, day:tr.day, members:tr.members };
      walked = SX.twDay(Math.min(Date.now(), tr.summited || Date.now()));   // 跟著走到哪一天（體能不下降）
      if (F.done.includes(tr.key)) continue;
      const q = SV.prog[m.id], here = SV.cur === m.id && q && q.team === tr.key && !q.fin;   // 這一趟我在這支手機上正在走
      if (tr.current && (!tr.summited || here)) { if (!here) followStart(m.id, tr.started, tr.key); continue; }   // 還在走：接著走（伺服器說我登頂了，也讓我自己走完最後一段看登頂）
      if (here) goDown(m.id);
      F.log.push(followSummit(tr, m, lead)); changed = true;
    }
    const keep = list.map(x => x.key); for (const k in F.trips) if (!keep.includes(k)) delete F.trips[k];   // 只留伺服器還在回的那幾趟
    // 離開隊伍、隊伍解散了：正在走的這座變成自己爬（路上的寶物又是自己的），走過的距離留著
    for (const id in SV.prog) { const q = SV.prog[id]; if (q && q.team && !keep.includes(q.team)) { delete q.team; changed = true; } }
    followWalked(walked);
    if (changed) { save(); checkBadges(); pumpNotice(); }
  }
  // 「隊長帶你走了什麼」：讀取畫面收起來、沒有別的視窗時才打開（打開前的隊伍資料先存在 SV.follow.log，關掉遊戲也不會不見）
  function showFollowLog(){
    const F = SV.follow, L0 = $('#loading');
    if (!F || !F.log || !F.log.length || (L0 && !L0.classList.contains('done')) || $('#modal').classList.contains('on') || $('#badgePop')) return false;
    const L = F.log.splice(0), lead = L[L.length - 1].lead, ids = L.flatMap(x => x.items), pics = L.map(x => SV.photos[x.photo]).filter(p => p && /跟著|全隊登頂/.test(p.cap));
    const trN = ids.map(id => (SX.TREASURES.find(x => x.id === id) || {}).name).filter(Boolean), fit = L.reduce((a, x) => a + (x.fit || 0), 0);
    save(); A.paper();
    modal(`<h3>${lead ? '隊長帶你走了什麼' : '你不在的時候，隊伍走了什麼'}</h3><div class="awayD">
      <p class="awayT">${lead ? `跟著${escH(lead)}的隊伍` : '你帶的隊伍'}・${L.length} 座山</p>
      <ul class="awayL">${L.map(x => `<li>${awIco('summit_marker')}<span>登頂 <b>${SX.M[x.mt].name}</b>（${x.date}）${x.stamp ? '，集印帳蓋上新的章' : ''}。</span></li>`).join('')}
        ${fit > 0 ? `<li>${awIco('emo_cheer')}<span>跟著走也算數：體能 +${fit.toFixed(3)}（${SX.fitness(SV).toFixed(3)}）。</span></li>` : ''}
        ${pics.length ? `<li>${awIco('icon_camera')}<span>相簿多了 ${pics.length} 張山頂的紀念照。</span></li>` : ''}</ul>
      ${pics.length ? `<div class="awayPics">${pics.slice(-3).map((p, i) => `<img src="${p.img}" alt="" style="transform:rotate(${(i - 1) * 4}deg)">`).join('')}</div>` : ''}
      ${trN.length ? `<div class="awayParcel">${awIco('treasure_box', 'big')}<span>分到 <b>${trN.length}</b> 件寶物：<br>${trN.map(n => `「${n}」`).join('')}</span></div>` : ''}</div>
      <div class="mBtns" style="margin-top:12px"><button class="cbtn go" id="flOk">好</button></div>`);
    MO.stagger($('#mCard'), '.awayL li');
    $('#flOk').onclick = () => { A.pop(); closeModal(); checkQuests(); };
    return true;
  }
  // 我能爬哪幾座山（隊長選山時伺服器取全隊交集）：{ 山 id: 關著遊戲自己從登山口走到山頂要幾分鐘 }（伺服器拿來估關著遊戲的隊員幾點登頂）
  // 只有登頂次數、體能、解鎖設定變了才重算（每座山照離線補走的方法試算，一分鐘一步）
  let ulKey = '', ulVal = null;
  function teamUnlocks(){
    const k = Object.keys(SV.done).join() + '|' + SX.fitness(SV).toFixed(3) + '|' + SV.unlockAll;
    if (k === ulKey) return ulVal;
    const out = {};
    SX.MOUNTAINS.forEach(m => { if (!unlocked(m)) return; const p = newProg(); let s = 0; while (s < OFFLINE_CAP && p.dist < m.dist - 2.5) { simulate(p, m, 60, false, true, true); s += 60; } out[m.id] = Math.ceil(s / 60); });
    ulKey = k; ulVal = out; return out;
  }

  // ───────── HUD ─────────
  try { HUD.mount($('#hudRoot')); } catch(e){ console.error('hud', e); }
  // 狀態面板：平常精簡一排（山名＋高度），點面板（臉以外）展開看體力、體溫、距離、時間，再點收回；記在 SV.set.hudFull
  HUD.setFull(!!SV.set.hudFull);
  const flipHud = () => { A.pop(); MO.morph(['.hudP', '.radarBox', '#partyBox.on'].map(s => $(s)), () => { SV.set.hudFull = !SV.set.hudFull; HUD.setFull(SV.set.hudFull); save(); }); };
  $('#hudRoot').addEventListener('click', e => { if (e.target.closest('.hudP') && !e.target.closest('.hudFace')) flipHud(); });
  $('#hudRoot').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('hudP')) { e.preventDefault(); flipHud(); } });
  // 個人紀錄的入口：登山畫面點自己的臉、地圖點左上標題
  document.addEventListener('click', e => { if (e.target.closest('.hudFace') || e.target.closest('#scrMap .logo')) { A.pop(); openProfile(); } });
  { const bag = $('.i-bag'); if (bag) bag.style.backgroundImage = 'url("data:image/svg+xml,' + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 26'><path d='M10 7c0-6 10-6 10 0' fill='none' stroke='${INK}' stroke-width='2'/><rect x='6' y='6.5' width='18' height='17.5' rx='5' fill='#f0a444' stroke='${INK}' stroke-width='2'/><path d='M6 12h18' stroke='${INK}' stroke-width='1.4'/><rect x='10' y='14.5' width='10' height='6.5' rx='2' fill='#ffe1a0' stroke='${INK}' stroke-width='1.6'/></svg>`) + '")'; }
  function hudTick(){
    if (!st || !M) return;
    const f = st.dist / M.dist, left = etaMin(M.dist);
    try {
      HUD.update({ name:M.name, stam:st.stam, temp:st.temp, alt:Math.round(altAt(M, f)), frac:f,
        distText:`${(st.dist/1000).toFixed(2)} / ${(M.dist/1000).toFixed(1)} km`,
        etaText: arrived ? '到了！' : st.sleep ? '打瞌睡中…' : st.rest ? '休息中' : `還要約 ${fmtMin(left)}`,
        mood: st.sleep ? 'sleep' : st.temp < 25 ? 'cold' : st.stam < 25 ? 'tired' : st.stam < 55 ? 'ok' : 'happy', wx });
    } catch(e){}
    const rs = $('#restSheet'), on = !!st.rest && !arrived;
    if (on && !rs.classList.contains('on')) $('#rsTitle').textContent = restTitle();
    rs.classList.toggle('on', on);
    $('#restBtn').classList.toggle('off', !!(st.rest || st.sleep || arrived));
    segTick();
  }

  // ───────── 主迴圈 ─────────
  // 每秒最多畫幾格：走路 60；休息、睡覺、暫停、開著視窗、到山頂 30（畫面幾乎不動，省電、手機不會熱）。120 Hz 的手機也最多 60 格
  const FPS = { walk:60, idle:30 }, ECO_K = 0.5;   // ECO_K：省電模式（設定）每秒畫的次數乘多少，畫質、美術圖不變（2026-11-24 加）
  let lastT = performance.now(), hudT = 0, wxT = 0, ftNow = 0, fpsNow = FPS.walk;
  function loop(now){
    requestAnimationFrame(loop);
    if (SX.maintOn) return;   // 山屋整修中（js/maint.js）：整個遊戲停住；整修完重新打開時照離開的時間補走（跟關掉遊戲一樣）
    fpsNow = (!st || paused || arrived || st.rest || st.sleep ? FPS.idle : FPS.walk) * (SV.set.eco ? ECO_K : 1);
    if (now - lastT < 1000 / fpsNow - 3) return;   // 還沒到下一格：這次跳過（差 3 毫秒內就畫，螢幕每格的時間本來就有一點誤差）
    ftNow = now - lastT;
    const dt = Math.min(0.05, Math.max(0, ftNow / 1000)); lastT = now;
    frame(dt);
  }
  // 預計時間（右上「還要約」、「下一站」、「這次的小目標」）共用：用最近約一分鐘實際走的平均速度估
  // 實際走路會因為階梯、上坡、累了、停下來喝水看風景變慢，只用基本步速估會比真的到達早（2026-11-24 山友回報）
  // 長按快走、休息、睡覺時不算進平均；剛出發還沒走滿 20 秒先用基本步速
  const ETA_TAU = 60, ETA_WARM = 20;
  let etaV = 0, etaT = 0;
  const etaSpeed = () => etaT >= ETA_WARM && etaV > 0 ? etaV : baseSpeed(M) * (st.temp < 25 ? 0.7 : 1) * devX();
  const etaMin = to => Math.max(1, Math.round((to - st.dist) / etaSpeed() / 60));
  function frame(dt){
    if (screen !== 'climb' || !st || !M) return;
    t += dt;
    let d = 0;
    const boost = (ptrHold || keyHold) && !paused && !arrived && !st.sleep && !st.rest;
    if (!paused && !arrived) {
      const wasSleep = st.sleep, wasRest = st.rest;
      d = simulate(st, M, dt, boost, false, false, SC.pace());
      if (boost) st.fast = true;
      if (dt > 0 && !boost && !st.rest && !st.sleep) { const k = Math.min(1, dt / ETA_TAU); etaV += (d / dt - etaV) * (etaT ? k : 1); etaT += dt; }
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
      segFrame(dt);
      st.last = Date.now();
    }
    const moving = d > 0;
    const snowy = wx.kind === 'snow' || (M.theme.snow && wx.kind !== 'rain' && st.dist / M.dist > 0.55);
    A.walk(moving && !paused, snowy ? 'snow' : M.theme.trail, boost);
    lineT -= dt;
    if (lineT <= 0 && moving && !paused) { lineT = 18 + Math.random()*16;
      say(pick(wx.time === 'night' ? SX.LINES.night : wx.kind === 'snow' ? SX.LINES.snow : wx.kind === 'rain' ? SX.LINES.rain : wx.kind === 'fog' ? SX.LINES.fog : SX.LINES.walk)); }
    wxT += dt; if (wxT > 60) { wxT = 0; if (!wxOverride) { const n = wxHere(); if (n.kind !== wx.kind || n.time !== wx.time) { wx = n; moodNow(); } } artRefresh(); }   // 每分鐘看一次之後會不會下雨：會的話先把雨衣版解開
    SC.render({ dist:st.dist, total:M.dist, t, dt, speed: dt > 0 ? Math.min(6, d / dt) : 0, vBase: baseSpeed(M) * devX(), boost, rest:!!st.rest, sleep:!!st.sleep, wx, pet:SV.pet || null, frac:st.dist / M.dist, stam:st.stam, ft:ftNow, fps:fpsNow });   // ft、fps：給自動畫質量真正每格花多久
    if ($('#bubble').classList.contains('on')) placeBubble();
    if (st.away && !paused && !arrived) showAway();   // 離開時的日記：畫面畫好了才打開（補拍照片要用到畫面）
    updTag();
    hudT -= dt; if (hudT <= 0) { hudT = 0.2; hudTick(); }
  }
  setInterval(() => { if (st && !document.hidden) save(); }, 10000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { ptrHold = false; keyHold = false; if (st && screen === 'climb' && !paused && !arrived) st.last = Date.now(); save(); A.setOn(false); }
    else { fitOpen(); fitNotice(); catchUp(); A.setOn(SV.set.sound); checkNewVersion(); }
  });
  // 有新版就自動換上：從主畫面打開的 App（iPhone）會一直留在背景，切回來只是接著跑舊的頁面、不會重新載入，
  // 所以回到前景時（和開著的時候每 10 分鐘）問一次網站現在是第幾版（sw.js 的 CACHE 名字，跟 index.html 的 ?v= 一起加一），
  // 比這一頁新就存檔、重新載入；有視窗開著（拍照、看寶物…）先不打斷，下次再問
  const BUILD = +((($('script[src*="js/game.js"]') || {}).src || '').match(/[?&]v=(\d+)/) || [0, 0])[1];
  const VERSION_CHECK_MS = 10 * 60 * 1000;
  let verAsk = 0;
  function checkNewVersion(){
    if (!BUILD || document.hidden || Date.now() - verAsk < 30000) return;
    verAsk = Date.now();
    fetch('sw.js', { cache:'no-store' }).then(r => r.ok ? r.text() : '').then(t => {
      const v = +((t.match(/shanxing-v(\d+)/) || [0, 0])[1]);
      if (v > BUILD && !$('#modal').classList.contains('on')) { save(); if (navigator.serviceWorker) navigator.serviceWorker.getRegistration().then(r => r && r.update()).catch(() => {}); location.reload(); }
    }).catch(() => {});
  }
  setInterval(checkNewVersion, VERSION_CHECK_MS);

  // 每座山自己的插圖（登頂、集印章）還沒畫的話，先用山群主峰的那張
  const groupArt = (pre, id) => SX.art.has(pre + id) ? pre + id : pre + (SX.GROUP[SX.groupOf(id)] ? SX.GROUP[SX.groupOf(id)].lead : id);
  function stampSvg(id, date){
    const m = SX.M[id], u = SX.art.url(groupArt('stamp_', id));
    // 有印章美術圖：圖上壓一塊紅框小牌寫山名和日期，讀起來還是一枚有日期的章
    if (u) return `<div class="stampArt"><img src="${u}" alt="" draggable="false"><span><b>${m.name}</b><i>${(date || '').replace(/\//g,'.')}</i></span></div>`;
    return `<svg viewBox="0 0 100 100"><g transform="rotate(-8 50 50)" opacity=".9">
      <circle cx="50" cy="50" r="44" fill="none" stroke="#c8402f" stroke-width="4"/><circle cx="50" cy="50" r="38" fill="none" stroke="#c8402f" stroke-width="1.5" stroke-dasharray="3 3"/>
      <path d="M22 62 L38 38 L48 50 L60 30 L78 62Z" fill="#c8402f" opacity=".85"/>
      <text x="50" y="80" text-anchor="middle" font-size="15" fill="#c8402f" style="font-family:var(--fontB)">${m.name}</text>
      <text x="50" y="25" text-anchor="middle" font-size="8.5" fill="#c8402f">${(date || '').replace(/\//g,'.')}</text></g></svg>`;
  }
  // ───────── 相簿 ─────────
  let albumTab = 'photos', likeOnly = false;   // likeOnly：拍立得分頁只看「我喜歡的照片」
  $$('#scrAlbum .tab').forEach(b => b.onclick = () => { A.pop(); albumTab = b.dataset.tab; $$('#scrAlbum .tab').forEach(x => x.classList.toggle('on', x === b)); renderAlbum(); });
  function renderAlbum(){
    const body = $('#albumBody');
    if (albumTab === 'badges') return renderBadges(body);
    if (albumTab === 'enc') return renderEncLog(body);
    if (albumTab === 'baiyue') return renderBaiyue(body);
    if (albumTab === 'photos') {
      if (!SV.photos.length) { body.innerHTML = '<div class="empty">還沒有照片。<br>每走 500 公尺自動拍一張拍立得，<br>在長椅和觀景台也能自己拍。</div>'; return; }
      const nLike = SV.photos.filter(p => SV.likes[photoKey(p)]).length;
      if (!nLike) likeOnly = false;
      let html = nLike ? `<div class="likeBar"><button class="chip${likeOnly ? ' on' : ''}" id="likeOnly">♥ 我喜歡的照片（${nLike}）</button></div>` : '';
      SX.MOUNTAINS.forEach(m => { const ps = SV.photos.filter(p => p.id === m.id && (!likeOnly || SV.likes[photoKey(p)])); if (!ps.length) return;
        html += `<div class="grp">${m.name}</div><div class="grid">` + ps.map((p, i) => `<div class="pol${SV.likes[photoKey(p)] ? ' liked' : ''}"${photoAttrs(p)} style="--rot:${(i%3-1)*1.5}deg;transform:rotate(var(--rot))"><img src="${p.img}"><p>${p.cap}</p></div>`).join('') + '</div>'; });
      body.innerHTML = html; MO.stagger(body, '.pol');
      if ($('#likeOnly')) $('#likeOnly').onclick = () => { A.pop(); likeOnly = !likeOnly; renderAlbum(); };
    } else if (albumTab === 'wall') {
      const cur = SV.cur && SX.M[SV.cur] ? SV.cur : SX.MOUNTAINS[0].id;
      let html = `<div class="setRow paper photoForm"><h4>上傳山上的照片</h4>
        <div><label>哪一座山</label><select id="upM">${SX.MOUNTAINS.map(m => `<option value="${m.id}"${m.id === cur ? ' selected' : ''}>${m.name}</option>`).join('')}</select></div>
        <div><label>拍照地點的海拔（公尺）</label><input type="number" id="upAlt" inputmode="numeric"></div>
        <div><span class="alt500" id="upBand"></span></div>
        <button class="cbtn go" id="upGo">選一張照片上傳</button>
        <p>照片依拍照地點歸到前面最近的公里路標（每 0.5 公里一個），山友走到那裡才看得到，步道不會被照片塞滿。</p></div>`;
      SX.MOUNTAINS.forEach(m => { const ps = SV.userPhotos.filter(p => p.mountainId === m.id).sort((a, b) => a.m - b.m); if (!ps.length) return;
        html += `<div class="grp">${m.name}</div><div class="grid">` + ps.map((p, i) => `<div class="pol${SV.likes['u:' + p.id] ? ' liked' : ''}"${upAttrs(p)} style="--rot:${(i%3-1)*1.5}deg;transform:rotate(var(--rot))"><img src="${p.img}"><p>海拔 ${Math.round(p.alt).toLocaleString('en-US')} m・${wallName(m, p.m)}</p></div>`).join('') + '</div>'; });
      if (!SV.userPhotos.length) html += '<div class="empty" style="padding:30px 20px">還沒有上傳過照片。</div>';
      body.innerHTML = html;
      const selM = $('#upM'), inAlt = $('#upAlt');
      const mOf = () => { const m = SX.M[selM.value], a = clamp(+inAlt.value || m.startAlt, m.startAlt, m.alt); return Math.round((a - m.startAlt) / Math.max(1, m.alt - m.startAlt) * m.dist); };
      const upd = () => { const m = SX.M[selM.value], d = mOf(); $('#upBand').textContent = `海拔 ${m.startAlt}–${m.alt} m・會出現在${wallName(m, d)}的照片牆`; };
      const reset = () => { const m = SX.M[selM.value]; inAlt.min = m.startAlt; inAlt.max = m.alt; inAlt.value = Math.round(st && M === m && !st.fin ? altAt(m, st.dist / m.dist) : (m.startAlt + m.alt) / 2); upd(); };
      selM.onchange = reset; inAlt.oninput = upd; reset();
      $('#upGo').onclick = e => { A.pop(); pickUpload(selM.value, mOf(), e.currentTarget); };
    } else {
      body.innerHTML = '<div class="stamps">' + SX.MOUNTAINS.map(m => `<div class="stampSlot">${SV.stamps[m.id] ? stampSvg(m.id, SV.stamps[m.id]) : m.name}</div>`).join('') + '</div>'; MO.stagger(body, '.stampSlot');
    }
  }

  // ───────── 看大圖：相簿、照片牆、登山時的拍立得和山友照片，點一張就放大 ─────────
  // 同一個格子區（.grid）裡的照片可以左右滑；說明和「我喜歡」的代號寫在格子的 data-pv-t、data-pv-s、data-like（沒寫就用格子下面那行字）
  // 動態（飛進飛出、跟著手指滑、往下拉關掉）都在 js/motion.js：viewOpen、viewClose、pager
  const HEART = `<svg viewBox="0 0 24 24"><path d="M12 21C5 15.5 2 12.5 2 8.5 2 5.4 4.4 3 7.4 3c1.9 0 3.6 1 4.6 2.5C13 4 14.7 3 16.6 3 19.6 3 22 5.4 22 8.5c0 4-3 7-10 12.5z" stroke="${INK}" stroke-width="1.6"/></svg>`;
  const pv = document.createElement('div'); pv.id = 'pv'; pv.className = 'pv'; pv.setAttribute('aria-hidden', 'true');
  pv.innerHTML = `<div class="pvBg"></div><div class="pvStage"><div class="pvTrack"></div></div>
    <header class="pvTop"><button class="cbtn sm" id="pvBack">← 返回</button><span class="chip pvIdx" id="pvIdx"></span></header>
    <div class="pvFoot paper"><div class="pvCap"><b id="pvT"></b><small id="pvS"></small></div><button class="cbtn sm" id="pvDel">拿下來</button><button class="pvLike" id="pvLike" aria-label="我喜歡">${HEART}</button></div>`;
  $('#app').insertBefore(pv, $('#toast'));
  const pvTrack = pv.querySelector('.pvTrack'), pvStage = pv.querySelector('.pvStage'), PV = { list:[], i:0, open:false, busy:false, hid:null };
  const pvText = el => el ? [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim() : '';
  const pvItem = cell => { const d = cell.dataset, img = cell.querySelector('img'); return { cell, src:img.currentSrc || img.src, t:d.pvT || pvText(cell.querySelector('p')), s:d.pvS || '', like:d.like || '', up:d.up || '' }; };
  // 大圖打開時，格子裡原本那張先藏起來（看起來就是同一張照片飛出去）；換張、關掉時換回來
  function pvHide(cell){ if (PV.hid) PV.hid.style.visibility = ''; PV.hid = cell && cell.isConnected ? cell : null; if (PV.hid) PV.hid.style.visibility = 'hidden'; }
  function pvShow(){
    const L = PV.list, i = PV.i, it = L[i];
    pvTrack.textContent = '';
    [-1, 0, 1].forEach(k => { const o = L[i + k]; if (!o) return;
      const s = document.createElement('div'), im = new Image(); s.className = 'pvSlide ' + (k < 0 ? 'prev' : k ? 'next' : 'cur'); im.alt = ''; im.src = o.src; s.appendChild(im); pvTrack.appendChild(s); });
    $('#pvIdx').textContent = `${i + 1} / ${L.length}`; $('#pvIdx').style.visibility = L.length > 1 ? '' : 'hidden';
    $('#pvT').textContent = it.t; $('#pvS').textContent = it.s; $('#pvS').style.display = it.s ? '' : 'none';
    const lk = $('#pvLike'), on = !!(it.like && SV.likes[it.like]);
    lk.style.display = it.like ? '' : 'none'; lk.classList.toggle('on', on); lk.setAttribute('aria-pressed', String(on));
    $('#pvDel').style.display = it.up && screen === 'album' ? '' : 'none';
    pvHide(it.cell);
  }
  function pvOpen(img){
    const cell = img.closest('.pol'), grid = cell.closest('.grid');
    const cells = grid ? [...grid.querySelectorAll('.pol')].filter(c => c.querySelector('img') && c.offsetParent !== null) : [cell];
    PV.list = cells.map(pvItem); PV.i = Math.max(0, cells.indexOf(cell)); PV.open = true; PV.busy = false;
    const from = cell.getBoundingClientRect();
    pvShow(); A.pop();
    pv.style.visibility = 'hidden'; pv.classList.add('on'); pv.setAttribute('aria-hidden', 'false');
    const big = pvTrack.querySelector('.cur img');
    // 等大圖解碼好、量得到最後的大小，才從格子飛出來
    Promise.resolve(big.decode ? big.decode() : null).catch(() => {}).then(() => { if (!PV.open) return; pv.style.visibility = ''; MO.viewOpen(pv, big, from); });
  }
  function pvClose(after){
    if (!PV.open || PV.busy) return; PV.busy = true;
    const it = PV.list[PV.i], c = it && it.cell, big = pvTrack.querySelector('.cur img');
    let to = null;
    if (c && c.isConnected && c.offsetParent !== null && typeof after !== 'function') { c.scrollIntoView({ block:'nearest' }); to = c.getBoundingClientRect(); }   // 滑到別張了：底下的相簿先捲到那張，照片飛回它自己的格子
    A.pop();
    MO.viewClose(pv, big, to).then(() => {
      pv.classList.remove('on'); pv.setAttribute('aria-hidden', 'true'); MO.settle(pv); pvPager.reset(); pvHide(null);
      PV.open = PV.busy = false; PV.list = [];
      if (typeof after === 'function') after();
    });
  }
  function pvGo(d){ if (!PV.list[PV.i + d]) return; PV.i += d; pvShow(); MO.viewSwap(pvTrack.querySelector('.cur')); }
  const pvPager = MO.pager(pvStage, pvTrack, {
    bg:pv.querySelector('.pvBg'), has:d => !!PV.list[PV.i + d], go:pvGo, close:() => pvClose(),
    tap:e => { const im = pvTrack.querySelector('.cur img'), r = im && im.getBoundingClientRect(); if (!r || e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) pvClose(); }   // 點照片旁邊的空白：關掉
  });
  pv.querySelector('.pvBg').onclick = () => pvClose();
  $('#pvBack').onclick = () => pvClose();
  $('#pvLike').onclick = e => {
    const it = PV.list[PV.i]; if (!it || !it.like) return;
    const b = e.currentTarget, on = !SV.likes[it.like];
    if (on) SV.likes[it.like] = Date.now(); else delete SV.likes[it.like];
    if (on && /^s:/.test(it.like) && SX.social) SX.social.affLike(it.like.slice(2));   // 山友分享的照片：是好友的照片就加好感（伺服器判斷是不是好友、每天上限）
    const ks = Object.keys(SV.likes); if (ks.length > 300) ks.sort((a, b2) => SV.likes[a] - SV.likes[b2]).slice(0, ks.length - 300).forEach(k => delete SV.likes[k]);   // 最多記 300 張
    save();
    b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); if (it.cell) it.cell.classList.toggle('liked', on);
    if (on) { const r = b.getBoundingClientRect(); MO.like(r.left + r.width / 2, r.top + r.height / 2); MO.pop(b.querySelector('svg')); }
    A.pop();
  };
  $('#pvDel').onclick = () => {
    const it = PV.list[PV.i]; if (!it || !it.up || !confirm('要把這張照片從照片牆拿下來嗎？')) return;
    SV.userPhotos = SV.userPhotos.filter(p => p.id !== it.up); delete SV.likes['u:' + it.up]; imgDirty = true; save();
    pvClose(() => { if (screen === 'album') renderAlbum(); });
  };
  document.addEventListener('click', e => { const im = e.target.closest('.pol img'); if (im && !PV.open && !im.closest('.skel')) pvOpen(im); });
  document.addEventListener('keydown', e => { if (!PV.open) return; if (e.key === 'Escape') pvClose(); else if (e.key === 'ArrowLeft') pvGo(-1); else if (e.key === 'ArrowRight') pvGo(1); });

  // ───────── 百岳帳（相簿分頁）：100 座百岳照 23 個山群排，登頂過的蓋章、遊戲裡還沒有的變淡 ─────────
  const byPlay = r => SX.MOUNTAINS.find(m => m.by === r);   // 百岳排名 → 遊戲裡的山（連結只寫在山身上的 by）
  function renderBaiyue(body){
    const isDone = r => { const m = byPlay(r); return !!(m && SV.done[m.id]); };
    const n = SX.BAIYUE.filter(p => isDone(p.rank)).length;
    body.innerHTML = `<div class="colHead">百岳 <b>${n}</b>／${SX.BAIYUE.length}</div>` + SX.BAIYUE_GROUPS.map(g => {
      const rs = g.peaks.map(p => SX.BYNAME[p[0]]);
      return `<div class="grp byG">${g.name}<small>${rs.filter(p => isDone(p.rank)).length}／${rs.length}</small></div><div class="byGrid">` + rs.map(p => {
        const s = isDone(p.rank) ? 'done' : byPlay(p.rank) ? 'open' : 'soon';
        return `<button class="byCell ${s}" data-by="${p.rank}"><b>${p.name}</b><span class="byMeta"><small>${p.alt.toLocaleString('en-US')} m</small>${gradeChip(p.grade)}</span>${s === 'soon' ? '<em>敬請期待</em>' : ''}${s === 'done' ? '<i class="byStamp">登頂</i>' : ''}</button>`;
      }).join('') + '</div>';
    }).join('');
    MO.stagger(body, '.byG, .byCell');
    $$('#albumBody [data-by]').forEach(el => el.onclick = () => { A.pop(); openBaiyue(+el.dataset.by); });
  }
  function openBaiyue(rank){
    const p = SX.BY[rank], m = byPlay(rank), G = SX.GRADES[p.grade];
    const state = !m ? '這座山還在路上，敬請期待' : SV.done[m.id] ? `已登頂 ${SV.done[m.id]} 次` : unlocked(m) ? '可以出發，還沒登頂' : '還沒解鎖';
    modal(`<h3>${p.name}</h3><div class="byInfo paper">
        <div><span>百岳排名</span><b>第 ${p.rank} 名</b></div>
        <div><span>海拔</span><b>${p.alt.toLocaleString('en-US')} m</b></div>
        <div><span>官方分級</span><b>${gradeChip(p.grade)}</b></div>
        <p>${p.grade} 級：${G.text}。${G.need ? `要先登頂 ${G.need} 級以上的百岳才能申請。` : '不用先有百岳經驗。'}</p>
        <div><span>山群</span><b>${p.group}</b></div>
        <div><span>狀態</span><b>${state}</b></div></div>
      <div class="mBtns" style="margin-top:12px">${m ? '<button class="cbtn" id="byMap">到地圖看看</button>' : ''}<button class="cbtn go" id="byOk">好</button></div>`);
    $('#byOk').onclick = () => { A.pop(); closeModal(); };
    if (m) $('#byMap').onclick = () => { A.pop(); closeModal(); go('map', () => { try { WM.focus(SX.groupOf(m.id)); } catch(e){} showRoute(m.id); }); };
  }

  // ───────── 徽章與奇遇圖鑑 ─────────
  const encWeight = e => e.weight != null ? e.weight : e.rare ? 0.3 : 1;   // 抽奇遇的權重：一般 1、稀有 0.3、極稀有看 data.js 的 weight
  const WXPREF_X = 6;   // 奇遇的 wxPref 天氣剛好出現時，權重乘幾倍
  const superRare = e => e.weight != null;
  // 遇到奇遇時記進圖鑑（記錄方式只在 noteEncounterSeen 一個地方；第一次遇到才跳提示）
  function noteEnc(e){
    const first = !SV.encSeen[e.id];
    noteEncounterSeen(e.id);
    if (first) toast(e.rare ? '難得的奇遇，記進奇遇圖鑑了！' : '奇遇圖鑑多了一頁');
  }
  // 徽章數值：每個 stat 都要在這裡算（tools/check.js 會檢查 data.js 的 SX.BADGES 用到的 stat 這裡都有）
  function badgeValue(b){
    const S = SV.stats, done = Object.keys(SV.done).filter(k => SX.M[k]).map(k => SV.done[k] || 0);
    switch (b.stat) {
      case 'walked': return (S.walked || 0) / 1000;   // 存檔記公尺，徽章算公里
      case 'summits': return done.reduce((a, n) => a + n, 0);
      case 'favMountain': return Math.max(0, ...done);
      case 'bestStreak': return Math.max(S.bestStreak || 0, (SV.daily && SV.daily.streak) || 0);
      case 'night': return S.night || 0;
      case 'rain': return S.rain || 0;
      case 'fogTop': return S.fogTop || 0;
      case 'snowTop': return S.snowTop || 0;
      case 'rests': return S.rests || 0;
      case 'cairns': return S.cairns || 0;
      case 'treasureKinds': return SX.TREASURES.filter(x => SV.bag[x.id] > 0).length;
      case 'encKinds': return SX.ENCOUNTERS.filter(e => SV.encSeen[e.id]).length;
      case 'stamps': return SX.MOUNTAINS.filter(m => SV.stamps[m.id]).length;
      case 'groupPeaks': return SX.peaksOf(b.group).filter(m => SV.done[m.id]).length;   // 山群徽章：這個山群登頂過幾座
      case 'lifeMates': return SX.lifeMates();   // 一輩子的山友：好感 Lv10 的好友有幾位（好感在伺服器，social.js 拿好友清單時算）
      case 'baiyue': return SX.MOUNTAINS.filter(m => m.by && SV.done[m.id]).length;   // 完百之路：登頂過幾座不同的百岳
    }
    return 0;
  }
  const BADGE_ALL = { treasureKinds:() => SX.TREASURES.length, encKinds:() => SX.ENCOUNTERS.length, stamps:() => SX.MOUNTAINS.length, groupPeaks:b => SX.peaksOf(b.group).length };   // tiers 寫 'all' 時的總數
  const tierGoal = (b, i) => b.tiers[i] === 'all' ? BADGE_ALL[b.stat](b) : b.tiers[i];
  // 一個徽章的每一級：有入門級（data.js 的 starter）就排最前面，後面是銅銀金白金；畫面、計數、拿徽章都用這一份
  const badgeLevels = b => (b.starter ? [{ name:SX.BADGE_STARTER.name, color:SX.BADGE_STARTER.color, goal:b.starter, cls:'tierS' }] : [])
    .concat(b.tiers.map((x, i) => ({ name:SX.BADGE_TIERS[i].name, color:SX.BADGE_TIERS[i].color, goal:tierGoal(b, i), all:x === 'all', cls:'tier' + i })));
  // 拿到幾級：存檔的 t 是銅銀金白金（-1 是還沒有）、d 是那一級的日期；入門級另外記在 s（日期）。拿過銅就一定算拿過入門
  const badgeGot = b => { const g = SV.badges[b.id]; return !g ? 0 : (g.t + 1) + (b.starter && (g.s || g.t >= 0) ? 1 : 0); };
  const levelDate = (b, i) => { const g = SV.badges[b.id] || {}, k = b.starter ? i - 1 : i; return k < 0 ? g.s : k === g.t ? g.d : null; };
  function checkBadges(){
    SV.stats.bestStreak = badgeValue({ stat:'bestStreak' });
    const got = [];
    SX.BADGES.forEach(b => {
      const v = badgeValue(b), L = badgeLevels(b), had = badgeGot(b), off = b.starter ? 1 : 0;
      let n = 0; L.forEach((x, i) => { if (v >= x.goal) n = i + 1; });
      if (n <= had) return;
      const g = SV.badges[b.id] || { t:-1 };
      if (off && !g.s) g.s = today();
      if (n - off - 1 > g.t) { g.t = n - off - 1; g.d = today(); }
      SV.badges[b.id] = g; got.push([b, n - 1]);
    });
    if (!got.length) return;
    save(); badgePop(got);
  }
  // i：第幾級（badgeLevels 的位置），-1 是還沒拿到
  function medalHtml(b, i){
    const lv = badgeLevels(b)[i];
    const art = SX.art.img('badge_quest', `<svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="26" fill="#d9b45a" stroke="${INK}" stroke-width="2.5"/><circle cx="30" cy="30" r="19" fill="none" stroke="${INK}" stroke-width="1.5" opacity=".45"/></svg>`);
    return `<span class="medal ${lv ? lv.cls : 'off'}" style="--tc:${lv ? lv.color : '#8a7d6c'}">${art}<i>${b.glyph}</i></span>`;
  }
  // 拿到徽章：畫面上方跳出一張小卡（不用對話框，才不會蓋掉登頂卡片），點一下或幾秒後自己收起來
  function badgePop(got){
    holdNotice(); const old = $('#badgePop'); if (old) old.remove();   // 徽章卡在畫面上時，背景通知先收起來排隊，卡片收掉再跳
    const el = document.createElement('div'); el.id = 'badgePop'; el.className = 'badgePop';
    const top = got.slice().sort((a, b) => b[1] - a[1]), more = top.length - 3;
    el.innerHTML = `<div class="bpHead">得到新徽章！</div>` + top.slice(0, 3).map(([b, i]) => `<div class="bpRow">${medalHtml(b, i)}<span><b>${b.name}・${badgeLevels(b)[i].name}</b><small>${b.desc}</small></span></div>`).join('')
      + (more > 0 ? `<small class="bpMore">還有 ${more} 枚，到相簿的「徽章」看看</small>` : '');
    const off = () => { el.remove(); queueMicrotask(pumpNotice); };
    el.onclick = off;
    el.addEventListener('animationend', ev => { if (/^bpOut/.test(ev.animationName)) off(); });
    $('#app').appendChild(el);
    // 徽章 0 → 1.3 → 1 彈出來，第一枚爆出一小圈木頭色的葉子
    el.querySelectorAll('.medal').forEach((md, i) => MO.pop(md, 180 + i * 90));
    const m0 = el.querySelector('.medal'); if (m0) { const r = m0.getBoundingClientRect(); MO.burst(r.left + r.width / 2, r.top + r.height / 2, 12); }
    A.chime();
  }
  // 等級小獎牌：拿到的填上那一級的顏色（金屬亮光在 CSS），還沒拿到的只留淡淡的虛線圈；橫排放在徽章名字右邊
  const tierPips = (L, t) => `<span class="bdgPips">${L.map((x, i) => `<i${i <= t ? ` class="on" style="--c:${x.color}"` : ""} title="${x.name}"></i>`).join("")}</span>`;
  function renderBadges(body){
    const earned = SX.BADGES.reduce((a, b) => a + badgeGot(b), 0), all = SX.BADGES.reduce((a, b) => a + badgeLevels(b).length, 0);
    body.innerHTML = `<div class="colHead">徽章 <b>${earned}</b> / ${all} 枚・點徽章看等級</div>` + SX.BADGES.map(b => {
      const L = badgeLevels(b), n = badgeGot(b), t = n - 1, nx = n < L.length ? n : -1;
      const v = badgeValue(b), show = x => Math.floor(x).toLocaleString('en-US');
      const goal = L[nx >= 0 ? nx : t].goal, f = Math.min(1, v / goal);
      return `<button class="bdgRow${t < 0 ? ' off' : ''}" data-bdg="${b.id}">${medalHtml(b, t)}<span class="bdgTxt"><span class="bdgTop"><b>${b.name}${t >= 0 ? `<em style="background:${L[t].color}">${L[t].name}</em>` : ''}</b>${tierPips(L, t)}</span>
        <span class="dyBar"><i style="width:${f * 100}%"></i></span><small><span data-count="${Math.floor(v)}">${show(v)}</span>${nx >= 0 ? ` / ${show(goal)} ${b.unit}・下一級${L[nx].name}` : ` ${b.unit}・全部等級都拿到了`}</small></span></button>`;
    }).join('');
    MO.stagger(body, '.bdgRow'); MO.progress(body);
    $$('#albumBody [data-bdg]').forEach(el => el.onclick = () => { A.pop(); openBadge(SX.BADGES.find(b => b.id === el.dataset.bdg)); });
  }
  function openBadge(b){
    const L = badgeLevels(b), t = badgeGot(b) - 1, v = badgeValue(b);
    modal(`<h3>${b.name}</h3><div class="bdgBig">${medalHtml(b, t)}</div><p class="summitBig" style="font-size:14px">${b.desc}：現在 ${Math.floor(v).toLocaleString('en-US')} ${b.unit}</p>
      <ul class="quest bdgTiers">${L.map((x, i) => `<li class="${i <= t ? 'done' : 'hid'}"><span>${x.name}　${x.goal.toLocaleString('en-US')} ${b.unit}${x.all ? '（全部）' : ''}<small>${i <= t ? (levelDate(b, i) ? levelDate(b, i) + ' 拿到' : '已拿到') : '還沒拿到'}</small></span></li>`).join('')}</ul>
      <div class="mBtns" style="margin-top:12px"><button class="cbtn go" id="bdgOk">好</button></div>`);
    $('#bdgOk').onclick = () => { A.pop(); closeModal(); };
  }
  // 沒遇過的奇遇：從出現條件寫一句提示
  // 季節限定的奇遇：山和時段跟著季節（SX.SEASONS）走，提示也要寫出季節
  function encHint(e){
    const w = e.where || {}, s = e.season && SX.SEASON[e.season], ws = e.wx || w.wx, out = [];
    const both = (a, b) => a && b ? a.filter(x => b.includes(x)) : a || b;   // 奇遇自己和季節都有限制：兩邊都符合才遇得到
    const ts = both(e.time || w.time, s && s.time), mts = both(w.mountains, s && s.mountains);
    const TN = { dawn:'清晨', day:'白天', dusk:'黃昏', night:'夜晚' }, WN = {};
    for (const k in WXD) WN[WXD[k]] = k === 'sunny' ? '晴天' : WX_NAMES[k];   // 天氣名稱只寫在 WX_NAMES 一個地方
    if (s) out.push(`${s.name}（${mdText(s.from)}～${mdText(s.to)}）`);
    if (e.wxPref) out.push(e.wxPref.map(x => WX_NAMES[x] || x).join('或') + '時比較容易遇到');
    if (ts) out.push('只在' + ts.map(x => TN[x] || x).join('或'));
    if (ws) out.push(ws.map(x => WN[x] || x).join('或') + '時');
    if (mts) { const ms = mts.filter(id => SX.M[id]);   // 山群寫的是山群代號，名字用山群名（合歡山），不是主峰名
      out.push(ms.length > 2 && ms.every(id => SX.M[id].alt >= 2000) ? '高山上' : ms.length > 3 ? `${SX.placeName(ms[0])}等 ${ms.length} 座山` : ms.map(SX.placeName).join('、')); }
    if (w.peaks) out.push(w.peaks.length > 2 ? `${SX.M[w.peaks[0]].name}等 ${w.peaks.length} 座山` : w.peaks.map(id => SX.M[id].name).join('、'));   // 只在山群裡某幾座山：寫山名
    if (w.minFrac >= 0.85) out.push('山頂附近'); else if (w.minFrac >= 0.5) out.push('後半段的路上'); else if (w.minFrac >= 0.3) out.push('走了一段路之後'); else if (w.maxFrac != null && w.maxFrac <= 0.3) out.push('登山口附近');
    return out.length ? out.join('・') : '哪座山都可能遇到';
  }
  function renderEncLog(body){
    const L = SX.ENCOUNTERS, seen = L.filter(e => SV.encSeen[e.id]).length, rare = L.filter(e => e.rare), rs = rare.filter(e => SV.encSeen[e.id]).length;
    body.innerHTML = `<div class="colHead">遇見 <b>${seen}</b> / ${L.length}（${Math.floor(seen / L.length * 100)}%）・稀有 <b>${rs}</b> / ${rare.length}</div><div class="encLog">` + L.map((e, i) => {
      const r = SV.encSeen[e.id], no = 'No.' + String(i + 1).padStart(2, '0');
      const mark = superRare(e) ? '<span class="encMk sup">極稀有</span>' : e.rare ? '<span class="encMk">稀有</span>' : '';
      if (!r) return `<div class="encCard hid"><div class="encPic"><span>？</span></div><b>${no}　？？？${mark}</b><small>${encHint(e)}</small></div>`;
      return `<button class="encCard${e.rare ? ' rare' : ''}" data-enc="${e.id}"><div class="encPic">${encSvg(e)}</div><b>${no}${mark}</b><small>${e.text}</small><em>遇過 ${r.n} 次</em></button>`;
    }).join('') + '</div>';
    MO.stagger(body, '.encCard');
    $$('#albumBody [data-enc]').forEach(el => el.onclick = () => {
      A.pop(); const e = L.find(x => x.id === el.dataset.enc), r = SV.encSeen[e.id];
      modal(`<div class="encounter${e.rare ? ' rare' : ''}"><div class="ec-pic">${encSvg(e)}</div><h3>${superRare(e) ? '極稀有的奇遇' : e.rare ? '難得的奇遇' : '路上的小插曲'}</h3><p>${e.text}</p><p style="margin-top:6px;font-size:12px">第一次遇到：${r.first}・遇過 ${r.n} 次</p></div>
        <div class="mBtns" style="margin-top:12px"><button class="cbtn go" id="ecOk">好</button></div>`);
      $('#ecOk').onclick = () => { A.pop(); closeModal(); };
    });
  }

  // ───────── 設定 ─────────
  let gpsWatch = null, gpsPrev = null, gpsTotal = 0;
  const DEV_HASH = 'b1b0ff28963c4288a9c3d0bc3083610789cb0dddd6aa7ba71e4e2345446f095c';
  let devPeek = false, devTaps = 0, devTapT = 0;
  // 資料來源：全部從 SX.SOURCES 畫（網址只寫在 data.js），連結一律開新分頁
  function sourcesHtml(){
    const S = SX.SOURCES;
    const a = (url, name) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${name}</a>`;
    const li = x => `<li>${x.url ? a(x.url, x.name) : x.name}<span>${x.org || ''}</span></li>`;
    return `<div class="setRow srcRow"><h4>資料來源</h4>
        <p>山的距離、海拔和時間，盡量用官方公布的數字；官方沒寫的，沿用山友的紀錄。</p>
        <ul class="srcList">${S.main.map(li).join('')}</ul>
        <ul class="srcList srcCr">${S.credit.map(li).join('')}</ul></div>`;
  }
  function renderSettings(){
    const s = SV.set;
    $('#setBody').innerHTML = `
      <div class="setRow"><h4>音效<button class="tgl ${s.sound ? 'on' : ''}" id="sSound"></button></h4>
        <input type="range" id="sVol" min="0" max="1" step="0.05" value="${s.vol}"><p>腳步聲、鳥叫和雨聲。</p></div>
      <div class="setRow"><h4>省電模式<button class="tgl ${s.eco ? 'on' : ''}" id="sEco"></button></h4>
        <p>畫面每秒畫的次數減半，手機比較不會熱、比較省電；畫面一樣漂亮，走路動作會稍微沒那麼順。</p></div>
      <div class="setRow"><h4>人在山上，定位加速<button class="tgl ${s.gps ? 'on' : ''}" id="sGps"></button></h4>
        <p>開啟後用手機定位：人在這座山附近（約 3 公里內）時，真的走一公尺，步道上就多走三公尺。不在山上沒有作用；只在畫面開著時計算，比較耗電。</p></div>
      <div class="setRow"><h4>通知<button class="tgl ${SX.social && SX.social.pushOn ? 'on' : ''}" id="sPush"></button></h4>
        <p>山友邀你一起爬、對方接受邀請，或關掉遊戲後快到山頂時，手機會跳通知。iPhone 要先「加入主畫面」，從主畫面打開才收得到。</p></div>
      <div class="setRow"><h4 id="tipsH">操作小抄</h4>
        <p>${tutIntro().map(x => x.t).join('')}</p><button class="cbtn sm" data-go="help">看新手教學</button></div>
      ${sourcesHtml()}
      ${s.dev || devPeek ? `<div class="setRow"><h4>開發者選項</h4>
        ${s.dev ? `<p>已解鎖</p><div class="devBtns">
          <button class="cbtn sm" id="dFast">${s.devOn && s.fast ? '關閉' : '開啟'}快轉 ×20</button>
          <button class="cbtn sm" id="dNext">跳到下個 500m</button>
          <button class="cbtn sm" id="dTop">直接到終點</button>
          <button class="cbtn sm" id="dFull">體力體溫補滿</button>
          <button class="cbtn sm" id="dEnc">觸發奇遇</button>
          <button class="cbtn sm" id="dTr">給寶物</button>
          <button class="cbtn sm" id="dUnlock">${SV.unlockAll ? '恢復解鎖規則' : '解鎖全部山'}</button>
          <button class="cbtn sm" id="dWx">換天氣</button>
          <button class="cbtn sm" id="dReview">照片審核</button>
          <button class="cbtn sm" id="dMaint">山屋整修</button>
          <button class="cbtn sm" id="dReset">清除存檔</button>
          <button class="cbtn sm" id="dLock">鎖回去</button></div>`
        : `<div class="pw"><input id="pw" type="password" inputmode="numeric" placeholder="密碼"><button class="cbtn sm" id="pwOk">解鎖</button></div>`}
      </div>` : ''}`;
    // 開發者選項平常藏起來：連點「操作小抄」標題 7 下才出現（進入方式寫在 HANDOFF.md 管理手冊）
    $('#tipsH').onclick = () => { const n = Date.now(); devTaps = n - devTapT < 600 ? devTaps + 1 : 1; devTapT = n; if (devTaps >= 7 && !devPeek) { devPeek = true; renderSettings(); } };
    $('#sSound').onclick = e => { s.sound = !s.sound; A.setOn(s.sound); save(); MO.toggle(e.currentTarget, s.sound); if (s.sound) { A.unlock(); A.pop(); } };
    $('#sVol').oninput = e => { s.vol = +e.target.value; A.setVol(s.vol); save(); };
    $('#sVol').onchange = () => { A.unlock(); A.pop(); };
    $('#sEco').onclick = e => { s.eco = !s.eco; save(); MO.toggle(e.currentTarget, s.eco); };
    $('#sGps').onclick = e => { s.gps = !s.gps; save(); MO.toggle(e.currentTarget, s.gps); setGps(s.gps); };
    $('#sPush').onclick = async () => {
      if (!SX.social) return; const want = !SX.social.pushOn; $('#sPush').disabled = true;
      try { await SX.social.pushSet(want); toast(want ? '通知打開了' : '通知關掉了'); } catch(e){ toast(e.message, 7000); }   // 說明步驟比較長，停久一點
      const b = $('#sPush'); if (b) { b.disabled = false; MO.toggle(b, SX.social.pushOn); }
    };
    if (s.dev) {
      const need = () => { if (!st || !M || st.fin) { toast('先開始爬一座山'); return false; } return true; };
      $('#dFast').onclick = () => { s.devOn = true; s.fast = !s.fast; save(); renderSettings(); };
      $('#dNext').onclick = () => { if (!need()) return; st.dist = Math.min(M.dist - 1, (Math.floor(st.dist / 500) + 1) * 500 - 2); st.stam = 100; st.temp = 100; st.sleep = false; st.rest = false; st.stopAt = null; st.last = Date.now(); go('climb'); };
      $('#dTop').onclick = () => { if (!need()) return; st.dist = M.dist - 3; st.ms = Math.floor((M.dist - 1) / 500) * 500; st.stam = 100; st.temp = 100; st.sleep = false; st.rest = false; st.stopAt = null; st.last = Date.now(); go('climb'); };
      $('#dFull').onclick = () => { if (st) { st.stam = 100; st.temp = 100; st.sleep = false; } toast('體力和體溫都滿了'); };
      $('#dEnc').onclick = () => { if (!need()) return; st.last = Date.now(); go('climb', openEncounter); };
      $('#dTr').onclick = () => gainTreasure(rollTreasure(M ? M.id : 'xiangshan'), 'show');
      $('#dUnlock').onclick = () => { SV.unlockAll = !SV.unlockAll; save(); renderSettings(); toast(SV.unlockAll ? '全部的山都開放了' : '恢復原本的解鎖規則'); };
      $('#dWx').onclick = () => cycleWx();
      $('#dReview').onclick = () => { if (SX.social) SX.social.review(); };
      $('#dMaint').onclick = () => { if (SX.maint) SX.maint.panel(); };
      $('#dReset').onclick = () => { if (confirm('確定要清除所有存檔嗎？')) { resetting = true; localStorage.removeItem(KEY); localStorage.removeItem(KEY_IMG); location.reload(); } };
      $('#dLock').onclick = () => { s.dev = false; s.devOn = false; s.fast = false; save(); renderSettings(); };
    } else if (devPeek) {
      $('#pwOk').onclick = async () => {
        const v = $('#pw').value, h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v + 'sx'));
        const hex = [...new Uint8Array(h)].map(b => b.toString(16).padStart(2,'0')).join('');
        if (hex === DEV_HASH) { s.dev = true; s.devOn = true; save(); renderSettings(); toast('開發者選項已解鎖'); } else { toast('密碼不對喔'); const ip = $('#pw'); ip.classList.add('bad'); MO.shake(ip.parentNode); }
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
    // 之前已經按過「不允許」：瀏覽器不會再問，直接說明怎麼打開
    if (navigator.permissions && navigator.permissions.query) navigator.permissions.query({ name:'geolocation' }).then(p => { if (p.state === 'denied' && SV.set.gps) gpsDenied(); }).catch(() => {});
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
    }, err => {
      // 玩家按「不允許」：整個關掉（停止等待、開關跟著關、說明怎麼重新打開）；只是訊號弱或逾時：繼續等，不關
      if (err && err.code === 1) gpsDenied();
      else $('#gpsTag').textContent = '定位訊號弱，再等一下';
    }, { enableHighAccuracy:true, maximumAge:5000, timeout:30000 });
  }
  function gpsDenied(){
    if (gpsWatch !== null) { navigator.geolocation.clearWatch(gpsWatch); gpsWatch = null; }
    SV.set.gps = false; save(); $('#gpsTag').classList.remove('on');
    if (screen === 'settings') renderSettings();
    toast('沒有定位權限，定位加速先關掉了。想用的話，到手機設定允許這個網站使用位置，再回來打開', 5200);
  }

  // ───────── 啟動 ─────────
  renderMap();
  // 美術圖：只解開開場要進去的那個畫面的圖（正在爬山的人進登山畫面，其他人進山友大廳；跟下面 enterNow 同一個判斷）
  { const tr0 = onTrail(); SX.art.boot(tr0 ? 'climb' : 'lobby', artOpts(tr0 ? 'climb' : 'lobby', undefined, tr0 && SX.M[tr0])); }
  if (SV.set.gps) setGps(true);
  // 開場讀取畫面：美術圖全部載完才收起來（玩家不會看到程式畫的備用圖）
  // 讀取進度：進度條和上面跑的小柴犬用同一個百分比
  // 讀取畫面：小柴犬一定從左跑到右。顯示的進度 = 真正的進度和「跑了多久」取比較小的那個：
  // 圖都在手機裡（一下就讀完）也要跑滿 LD_MIN_MS 才收起；網路慢就照真正的進度慢慢跑。收起畫面等牠跑到最右邊
  // 小柴犬一路從左跑到右：每毫秒最多前進 100 / LD_MIN_MS（%），整段至少跑 2 秒；讀取進度突然跳上去也是一路跑過去，不會瞬移
  const LD_MIN_MS = 2000;
  const ld = { real:0, shown:0, last:performance.now(), want:false };
  const ldSet = p => { ld.real = Math.max(ld.real, p); };
  function ldTick(now){
    if (entered) return;
    const p = Math.min(ld.real, ld.shown + Math.min(50, Math.max(0, now - ld.last)) / LD_MIN_MS * 100); ld.last = now;
    if (p !== ld.shown) { ld.shown = p; const f = $('#ldFill'), d = $('#ldDog'); if (f) f.style.width = p + '%'; if (d) d.style.left = p + '%'; }
    if (ld.want && p >= 100) enterNow(); else requestAnimationFrame(ldTick);
  }
  requestAnimationFrame(ldTick);
  SX.art.onProgress((d, t) => { if (t) ldSet(Math.round(d / t * 100)); });
  // 美術圖和兩套手寫字型都到了才收起讀取畫面（畫布上的字和木牌會用到字型；字型載入失敗也會往下走）
  const fontsReady = document.fonts && document.fonts.load ? Promise.all(['16px Iansui', '16px "LXGW WenKai TC"'].map(f => document.fonts.load(f, '山行').catch(() => {}))) : Promise.resolve();
  // 收起後去哪裡（開場只在這裡決定一次）：正在爬山的人直接回到步道（離開時走的路在進登山畫面時補算、打開日記），其他人先到山友大廳
  // 美術圖還沒到齊就進去（玩家按「先進去看看」）也沒關係：沒到的圖先用程式畫，圖到了各畫面會自己換上
  let entered = false;
  // 讀取好了（或玩家按「先進去看看」）：等小柴犬跑到最右邊才真的進去（ldTick 會呼叫 enterNow）
  function enterGame(){ ldSet(100); ld.want = true; }
  function enterNow(){
    if (entered) return; entered = true; clearTimeout(slowLoadT);
    const L = $('#loading'); if (L) { const f = $('#ldFill'), d = $('#ldDog'); if (f) f.style.width = '100%'; if (d) d.style.left = '100%'; L.classList.add('done'); }
    const tr = onTrail(); if (tr) startClimb(tr, true); else go('lobby');
    pumpNotice();
  }
  // 網路太慢：讀取超過 LOAD_TIMEOUT_MS 還沒好，在讀取畫面告訴玩家，讓他選「再試一次」或「先進去看看」（小柴犬繼續跑）
  const LOAD_TIMEOUT_MS = 30000;
  const slowLoadT = setTimeout(showSlowLoad, LOAD_TIMEOUT_MS);
  SX.art.whenReady(() => fontsReady.then(enterGame));
  function showSlowLoad(){
    const box = $('.ldBox'); if (entered || !box || $('#ldSlow')) return;
    const tip = $('.ldTip'); if (tip) tip.remove();
    box.insertAdjacentHTML('beforeend', `<div id="ldSlow" class="ldSlow"><p>連線好像有點慢，無法順利載入。建議確認網路狀況後再試一次。</p>
      <div class="ldBtns"><button class="cbtn" id="ldRetry">再試一次</button><button class="cbtn go" id="ldGo">先進去看看</button></div></div>`);
    $('#ldRetry').onclick = () => location.reload();
    $('#ldGo').onclick = () => { A.unlock(); enterGame(); };
  }
  requestAnimationFrame(loop);
  document.addEventListener('gesturestart', e => e.preventDefault());
  // 測試用掛鉤
  // 給連線模組用：雲端存檔、每日任務
  SX.game = { daily, updateDailyBadge, follow, teamUnlocks, notice,   // follow、teamUnlocks：好友跟隨（隊伍資料拿回來後補算、我能爬哪幾座山）；notice：背景通知排隊
    getSave:() => JSON.stringify(SV, skipImg), stats:() => SV.stats, summits:() => Object.values(SV.done).reduce((a, b) => a + (b || 0), 0), pet:() => SV.pet || null, summitEta,
    awayPace:m => baseSpeed(m) * devX(),   // 一起爬：遊戲關著時自己走的速度（隊友那邊拿來估離線時走到哪）
    // 好友好感度：好友清單拿回來後，等級到了的稱號（Lv8）收進稱號、一輩子的山友徽章（Lv10）檢查一次；lvs：每位好友的好感等級
    affSync:lvs => {
      const got = SX.AFF_REWARDS.filter(r => r.title && lvs.some(lv => lv >= r.lv) && !SV.titles.includes(r.title)).map(r => r.title);
      got.forEach(t => { SV.titles.push(t); notice(`得到專屬稱號「${t}」，到背包掛上吧`); });
      if (got.length) save();
      checkBadges();
    },
    applySave:txt => { resetting = true; localStorage.setItem(KEY, txt); location.reload(); } };
  setTimeout(() => { dailyState(); updateDailyBadge(); }, 300);
  purgeBlackPhotos();
  window.SXG = { go, startClimb, openBag, openDaily, checkQuests, checkBadges,
    tick:(n = 30) => { for (let i=0;i<n;i++) frame(0.033); },
    encounter:id => { if (!st) return null; const e = id ? SX.ENCOUNTERS.find(x => x.id === id) : null; openEncounter(e); return lastEnc; },
    treasure:id => { const tr = id ? SX.TREASURES.find(x => x.id === id) : rollTreasure(M ? M.id : 'xiangshan'); gainTreasure(tr, 'show'); return tr && tr.id; },
    rest:() => { if (st && !st.sleep) { st.stopAt = st.dist + 1; st.restType = 'bench'; } },
    stones:() => { if (st && M) stoneGame(); },
    date:s => { testDate = s ? new Date(s + 'T12:00:00+08:00') : null; dailyNow = 0; return seasonNow().map(x => x.id); },   // 假裝今天是某一天（台灣時間），不帶參數就回到真實日期
    roll:mid => rollTreasure(mid).id,
    wx:(kind, time) => { wxOverride = kind ? { kind, time:time || 'day' } : null; wx = wxOverride || wxHere(); moodNow(); artRefresh(); return wx; },
    get st(){ return st; }, get M(){ return M; }, get SV(){ return SV; } };
})();

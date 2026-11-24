// 山行小日子 — 聲音：Pixabay 音樂與音效（來源見 audio/SOURCES.txt），載入失敗時用合成音補上
(function(){
  let ctx = null, master = null;
  const A = SX.audio = { on:true, vol:0.5 };
  const BASE = 'audio/';
  const BUF = {}, LOADING = {};
  const ONESHOT = ['sfx_shutter','sfx_sparkle','sfx_pop','sfx_win','sfx_paper','sfx_chime','sfx_yawn'];

  function ensure(){
    if (!A.on) return null;
    try {
      if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain(); master.gain.value = A.vol; master.connect(ctx.destination);
        ONESHOT.forEach(load);
      }
      if (ctx.state !== 'running') { const r = ctx.resume(); if (r && r.catch) r.catch(() => {}); }   // iPhone 切回來時可能是 interrupted，不只 suspended
    } catch(e){ return null; }
    return ctx;
  }
  function load(name){
    if (BUF[name] || LOADING[name]) return;
    LOADING[name] = fetch(BASE + name + '.mp3').then(r => r.arrayBuffer())
      .then(ab => new Promise((ok, no) => ctx.decodeAudioData(ab, ok, no))).then(b => BUF[name] = b).catch(() => {});
  }
  // 播一次音檔；dur 可截短並淡出
  function play(name, { g = 1, rate = 1, at = 0, dur = 0, off = 0 } = {}){
    const c = ensure(); if (!c || !BUF[name]) return false;
    const t = c.currentTime + at, src = c.createBufferSource(), gn = c.createGain();
    src.buffer = BUF[name]; src.playbackRate.value = rate; gn.gain.value = g;
    src.connect(gn); gn.connect(master);
    if (dur) { gn.gain.setValueAtTime(g, t + dur * 0.7); gn.gain.linearRampToValueAtTime(0.0001, t + dur); src.start(t, off, dur + 0.05); }
    else src.start(t, off);
    return true;
  }

  // ───── 長聲音：背景音樂、環境音、腳步（HTMLAudio 串流，循環）─────
  const loops = {};
  function track(slot, name, gain){
    let L = loops[slot];
    if (!L) L = loops[slot] = { el:null, gn:null, name:null, gain:0, k:0, fade:null };
    if (!A.on) name = null;
    if (L.name === name) { L.gain = gain; if (L.el && !L.fade) setLevel(L, 1); return; }
    if (L.el) { if (L.fade) clearInterval(L.fade); if (A.on) { const o = Object.assign({}, L, { fade:null }); fading.add(o); fadeTo(o, 0, true); } else halt(L.el, L.gn); }   // 舊的那首淡出後停掉（用副本，新歌才不會被一起停）；關聲音、切到背景就馬上停（背景時計時器可能被暫停）
    if (L.fade) clearInterval(L.fade);
    L.name = name; L.gain = gain; L.el = null; L.gn = null; L.fade = null; L.k = 0;
    if (!name) return;
    const el = new Audio(BASE + name + '.mp3'); el.loop = true; el.preload = 'auto';
    L.el = el;
    // iPhone 的網頁不能改 <audio> 的音量（設了也沒用），所以音樂接到 Web Audio 的音量旋鈕上，關聲音和調音量才有效
    const c = ensure();
    if (c) { try { L.gn = c.createGain(); L.gn.gain.value = 0; c.createMediaElementSource(el).connect(L.gn); L.gn.connect(master); } catch (e) { L.gn = null; } }
    setLevel(L, 0);
    const p = el.play(); if (p && p.catch) p.catch(() => {});
    fadeTo(L, 1, false);
  }
  // 音量 k（0～1，乘上這條音軌的 gain）；有 Web Audio 就調旋鈕（總音量在 master），沒有才調 <audio> 自己的音量
  function setLevel(L, k){ L.k = k; if (L.gn) L.gn.gain.value = L.gain * k; else if (L.el) L.el.volume = Math.min(1, L.gain * k * A.vol); }
  // 停掉的音軌會把旋鈕拆掉，不然腳步聲一走一停會越積越多
  // 淡入／淡出：固定 15 步（約 0.9 秒）走完，不靠讀回音量判斷，停的時候一定會暫停
  function fadeTo(L, to, stop){
    if (L.fade) clearInterval(L.fade);
    const from = L.k, el = L.el, gn = L.gn; let i = 0;
    const h = L.fade = setInterval(() => { i++; setLevel(L, from + (to - from) * Math.min(1, i / 15));
      if (i >= 15) { clearInterval(h); if (L.fade === h) L.fade = null; if (stop) { halt(el, gn); fading.delete(L); } } }, 60);
  }
  // 正在淡出的舊歌（換畫面、換天氣時）：不在 loops 裡，要另外記著，關聲音、切到背景時才停得到
  // 2026-11-24 測試者：網頁關掉後音樂還在。換歌那一秒剛好切到背景，iPhone 背景會暫停計時器，舊歌就一直以淡出到一半的音量播下去
  const fading = new Set();
  function stopAll(){
    Object.keys(loops).forEach(k => track(k, null, 0));
    fading.forEach(L => { if (L.fade) clearInterval(L.fade); halt(L.el, L.gn); }); fading.clear();
  }
  function halt(el, gn){ el.pause(); el.removeAttribute('src'); el.load(); if (gn) gn.disconnect(); }
  function retry(){ Object.values(loops).forEach(L => { if (L.el && L.el.paused && L.name) { const p = L.el.play(); if (p && p.catch) p.catch(() => {}); } }); }

  A.unlock = () => { const c = ensure(); retry(); return c; };
  A.setVol = v => { A.vol = v; if (master) master.gain.value = v; Object.values(loops).forEach(L => { if (L.el && !L.gn) setLevel(L, L.k); }); };
  // 關聲音／切到背景：所有長聲音（含淡出到一半的舊歌）馬上停，Web Audio 也暫停（短音效、還在路上的聲音一起靜音）
  A.setOn = on => {
    A.on = on;
    if (!on) { stopAll(); if (ctx && ctx.state === 'running') { const r = ctx.suspend(); if (r && r.catch) r.catch(() => {}); } }
    else A.mood(A._mood || {});
  };

  // 依畫面和天氣切換音樂與環境音
  let dayPick = Math.random() < 0.5 ? 'bgm_day' : 'bgm_day2';
  A.mood = m => {
    A._mood = m;
    const { screen, wx } = m;
    let bgm = 'bgm_day', amb = null;   // 地圖也用預設的木吉他長曲（玩家意見選定）
    if (screen === 'climb') {
      bgm = wx.time === 'night' ? 'bgm_night' : wx.kind === 'rain' || wx.kind === 'fog' ? 'bgm_rain' : dayPick;
      amb = wx.kind === 'rain' ? 'amb_rain' : wx.time === 'night' ? 'amb_night' : m.water ? 'amb_stream' : 'amb_forest';
    }
    track('bgm', bgm, screen === 'climb' ? 0.2 : 0.26);   // 背景音樂有點大聲（原本 0.32／0.4）
    track('amb', amb, wx && wx.kind === 'rain' ? 0.5 : 0.35);
    if (screen !== 'climb') track('step', null, 0);
  };
  A.nextDay = () => { dayPick = dayPick === 'bgm_day' ? 'bgm_day2' : 'bgm_day'; };

  // 腳步：走路時循環播放步道材質的腳步錄音
  A.walk = (moving, mat, fast) => {
    const name = !moving ? null : mat === 'stairs' ? 'step_stone' : mat === 'wood' ? 'step_wood' : mat === 'snow' ? 'step_snow' : 'step_dirt';
    track('step', name, 0.28);
    const L = loops.step; if (L && L.el) L.el.playbackRate = fast ? 1.35 : 1;
  };

  // ───── 單次音效（音檔優先，沒有就用合成音）─────
  function noiseBurst(dur, f, q, g, at = 0){
    const c = ensure(); if (!c) return; const t = c.currentTime + at;
    const n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i=0;i<n;i++) d[i] = Math.random()*2-1;
    const s = c.createBufferSource(); s.buffer = b; const fl = c.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = f; fl.Q.value = q;
    const gn = c.createGain(); gn.gain.setValueAtTime(g, t); gn.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(fl); fl.connect(gn); gn.connect(master); s.start(t);
  }
  function tone(f, dur, g, at = 0, type = 'sine'){
    const c = ensure(); if (!c) return; const t = c.currentTime + at;
    const o = c.createOscillator(); o.type = type; o.frequency.value = f; const gn = c.createGain();
    gn.gain.setValueAtTime(0.0001, t); gn.gain.linearRampToValueAtTime(g, t + 0.005); gn.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(gn); gn.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  A.pop     = () => play('sfx_pop', { g:0.5 }) || tone(700, 0.12, 0.08, 0, 'triangle');
  A.sparkle = () => play('sfx_sparkle', { g:0.6 }) || [1318,1568,2093].forEach((f,i) => tone(f, 0.25, 0.05, i*0.06));
  A.chime   = () => play('sfx_chime', { g:0.55, dur:3 }) || [784,988,1175,1568].forEach((f,i) => tone(f, 0.9, 0.06, i*0.12));
  A.shutter = () => play('sfx_shutter', { g:0.8, dur:1.2 }) || noiseBurst(0.05, 2500, 1, 0.2);
  A.yay     = () => play('sfx_win', { g:0.6 }) || [523,659,784,1047].forEach((f,i) => tone(f, 0.35, 0.07, i*0.09, 'triangle'));
  A.paper   = () => play('sfx_paper', { g:0.7 });
  A.yawn    = () => play('sfx_yawn', { g:0.5 });
})();

// 山行小日子 — 聲音：Pixabay 音樂與音效（來源見 audio/SOURCES.txt），載入失敗時用合成音補上
(function(){
  let ctx = null, master = null;
  const A = SX.audio = { on:true, vol:0.7 };
  const BASE = 'audio/';
  const BUF = {}, LOADING = {};
  const ONESHOT = ['sfx_bell','sfx_clack','sfx_rattle','sfx_shutter','sfx_stamp','sfx_sparkle','sfx_pop','sfx_win','sfx_paper','sfx_chime','sfx_yawn'];

  function ensure(){
    if (!A.on) return null;
    try {
      if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain(); master.gain.value = A.vol; master.connect(ctx.destination);
        ONESHOT.forEach(load);
      }
      if (ctx.state === 'suspended') ctx.resume();
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
    if (!L) L = loops[slot] = { el:null, name:null, gain:0, fade:null };
    if (!A.on) name = null;
    if (L.name === name) { L.gain = gain; if (L.el) L.el.volume = Math.min(1, gain * A.vol); return; }
    const old = L.el;
    if (old) fadeOut(old);
    L.name = name; L.gain = gain; L.el = null;
    if (!name) return;
    const el = new Audio(BASE + name + '.mp3'); el.loop = true; el.preload = 'auto'; el.volume = 0;
    L.el = el;
    const p = el.play(); if (p && p.catch) p.catch(() => {});
    fadeIn(el, gain);
  }
  function fadeIn(el, gain){ let v = 0; const tgt = () => Math.min(1, gain * A.vol); const h = setInterval(() => { v = Math.min(tgt(), v + 0.04); el.volume = v; if (v >= tgt()) clearInterval(h); }, 60); }
  function fadeOut(el){ const h = setInterval(() => { el.volume = Math.max(0, el.volume - 0.05); if (el.volume <= 0) { clearInterval(h); el.pause(); el.src = ''; } }, 60); }
  function retry(){ Object.values(loops).forEach(L => { if (L.el && L.el.paused && L.name) { const p = L.el.play(); if (p && p.catch) p.catch(() => {}); } }); }

  A.unlock = () => { const c = ensure(); retry(); return c; };
  A.setVol = v => { A.vol = v; if (master) master.gain.value = v; Object.values(loops).forEach(L => { if (L.el) L.el.volume = Math.min(1, L.gain * v); }); };
  A.setOn = on => { A.on = on; if (!on) Object.keys(loops).forEach(k => track(k, null, 0)); else A.mood(A._mood || {}); };

  // 依畫面和天氣切換音樂與環境音
  let dayPick = Math.random() < 0.5 ? 'bgm_day' : 'bgm_day2';
  A.mood = m => {
    A._mood = m;
    const { screen, wx } = m;
    let bgm = 'bgm_map', amb = null;
    if (screen === 'climb') {
      bgm = wx.time === 'night' ? 'bgm_night' : wx.kind === 'rain' || wx.kind === 'fog' ? 'bgm_rain' : dayPick;
      amb = wx.kind === 'rain' ? 'amb_rain' : wx.time === 'night' ? 'amb_night' : m.water ? 'amb_stream' : 'amb_forest';
    } else if (screen === 'temple') { bgm = 'bgm_temple'; amb = 'amb_forest'; }
    track('bgm', bgm, screen === 'climb' ? 0.32 : 0.4);
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
  A.bell    = () => play('sfx_bell', { g:0.9 }) || [262,524,786].forEach((f,i) => tone(f, 3, 0.1/(i+1)));
  A.clack   = (at = 0) => play('sfx_clack', { g:0.9, at, rate:0.9 + Math.random()*0.2 }) || noiseBurst(0.05, 900, 3, 0.3, at);
  A.rattle  = () => play('sfx_rattle', { g:0.8, dur:1.3, off:0.3 }) || [...Array(10)].forEach((_,i) => noiseBurst(0.04, 1800, 3, 0.1, i*0.09));
  A.stamp   = () => play('sfx_stamp', { g:0.9 }) || noiseBurst(0.12, 500, 0.8, 0.4);
  A.yay     = () => play('sfx_win', { g:0.6 }) || [523,659,784,1047].forEach((f,i) => tone(f, 0.35, 0.07, i*0.09, 'triangle'));
  A.paper   = () => play('sfx_paper', { g:0.7 });
  A.yawn    = () => play('sfx_yawn', { g:0.5 });
})();

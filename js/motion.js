// 山行小日子 — 介面動態效果（全部只寫在這一個檔案；樣式在 css/style.css 的「動態效果」段落）
// 規則：只動 transform 和 opacity；時間交給 CSS 動畫或 Web Animations，播完自己收掉（不用計時器收拾）；
// 手機設定「減少動態」時，只留淡入淡出。登山畫面（trail.js、gl2d.js）不經過這裡。
(function(){
  const SX = window.SX || (window.SX = {});
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const calm = () => RM.matches;
  const EASE = 'cubic-bezier(.2,.8,.2,1)', SPRING = 'cubic-bezier(.34,1.56,.64,1)';
  const INK = '#3a2a20';
  const $ = s => document.querySelector(s);
  const app = () => document.getElementById('app');
  const rnd = (a, b) => a + Math.random() * (b - a);

  // 跑一段 Web Animation；回傳的 Promise 在播完或被取消時都會結束
  function run(el, kf, opt){
    if (!el || !el.animate) return Promise.resolve(null);
    const a = el.animate(kf, Object.assign({ duration:260, easing:EASE }, opt));
    return a.finished.then(() => a, () => a);
  }
  // 臨時的小東西（漣漪、花瓣、星星）：CSS 動畫播完或被取消就自己拿掉
  function temp(el){
    const off = () => el.remove();
    el.addEventListener('animationend', off, { once:true });
    el.addEventListener('animationcancel', off, { once:true });
    return el;
  }
  // 特效層：蓋在整個畫面上、不擋點擊，粒子都放這裡（不會撐開或推動別的東西）
  function layer(){
    let L = document.getElementById('fxLayer');
    if (!L) { L = document.createElement('div'); L.id = 'fxLayer'; app().appendChild(L); }
    return L;
  }
  const local = (x, y) => { const r = app().getBoundingClientRect(); return [x - r.left, y - r.top]; };

  // ───── 漣漪：從手指按下的地方擴散、淡出（木牌按鈕、分頁、小標籤、下方選單）─────
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest('.cbtn,.dbtn,.tab,.chip');
    if (!b || b.disabled || b.getAttribute('aria-disabled') === 'true' || b.classList.contains('mBusy')) return;
    const r = b.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const R = Math.hypot(Math.max(x, r.width - x), Math.max(y, r.height - y)), cx = x - b.clientLeft, cy = y - b.clientTop;
    const rp = document.createElement('span'); rp.className = 'rip';
    // 自己裁成按鈕的形狀：按鈕右上角的紅點數字不會被切掉
    rp.style.cssText = `width:${R * 2}px;height:${R * 2}px;left:${cx - R}px;top:${cy - R}px;clip-path:inset(${R - y}px ${R - (r.width - x)}px ${R - (r.height - y)}px ${R - x}px round 12px)`;
    b.appendChild(temp(rp));
  }, { passive:true });

  // ───── 載入按鈕：按下 → 縮成圓圈轉圈 → 打勾 → 回到原樣 ─────
  // 只在真的要等（讀照片、連線）或不到 0.4 秒的小停頓時用，不拖慢玩家
  function busy(btn){
    if (!btn || btn.classList.contains('mBusy')) return false;
    const w = btn.offsetWidth, h = btn.offsetHeight, k = Math.min(1, h / Math.max(1, w));
    const lb = document.createElement('span'); lb.className = 'mLbl';
    while (btn.firstChild) lb.appendChild(btn.firstChild);
    const sp = document.createElement('span'); sp.className = 'mSpin'; sp.innerHTML = '<i></i><b>✓</b>';
    btn.append(lb, sp); btn.classList.add('mBusy'); btn.setAttribute('aria-busy', 'true');
    if (calm()) { btn._mA = run(sp, [{ opacity:0 }, { opacity:1 }], { duration:120 }); return true; }
    sp.style.transform = `translate(-50%,-50%) scaleX(${1 / k})`;   // 按鈕橫向縮成圓，轉圈反過來拉回正圓
    const a = btn.animate([{ transform:'none' }, { transform:`scaleX(${k})` }], { duration:200, easing:EASE, fill:'forwards' });
    btn._mAnim = a; btn._mA = a.finished.catch(() => {});
    run(sp, [{ opacity:0 }, { opacity:0, offset:.5 }, { opacity:1 }], { duration:200 });
    return true;
  }
  function idle(btn){
    if (!btn || !btn.classList.contains('mBusy')) return;
    if (btn._mAnim) btn._mAnim.cancel(); btn._mAnim = btn._mA = null;
    const lb = btn.querySelector(':scope > .mLbl'), sp = btn.querySelector(':scope > .mSpin');
    if (sp) sp.remove();
    if (lb) { while (lb.firstChild) btn.insertBefore(lb.firstChild, lb); lb.remove(); }
    btn.classList.remove('mBusy'); btn.removeAttribute('aria-busy');
    if (!calm() && btn.isConnected) run(btn, [{ transform:`scaleX(.85)` }, { transform:'none' }], { duration:260, easing:SPRING });
  }
  // 打勾，播完回到原樣；回傳按鈕是不是還在畫面上（視窗被關掉、卡片換掉就是 false）
  function done(btn){
    if (!btn || !btn.classList.contains('mBusy')) return Promise.resolve(false);
    const sp = btn.querySelector(':scope > .mSpin'); sp.classList.add('ok');
    return run(sp.querySelector('b'), calm() ? [{ opacity:0 }, { opacity:1 }] : [{ opacity:0, transform:'scale(.3)' }, { opacity:1, transform:'scale(1.2)', offset:.55 }, { opacity:1, transform:'none' }],
      { duration:calm() ? 120 : 180, easing:calm() ? EASE : SPRING, fill:'forwards' })
      .then(() => { const ok = btn.isConnected && btn.offsetParent !== null; idle(btn); return ok; });
  }
  // 小停頓：縮成圓 → 打勾（合起來不到 0.4 秒），再做事；連按只算一次
  function beat(btn){
    if (!busy(btn)) return Promise.resolve(false);
    return Promise.resolve(btn._mA).then(() => done(btn));
  }

  // ───── 進度條與數字：出現在畫面上時，從 0 長到目前的進度、數字跟著跳 ─────
  const counters = [];
  let ctT = 0;
  const fmtN = v => Math.floor(v).toLocaleString('en-US');
  function countStep(now){
    for (let i = counters.length - 1; i >= 0; i--) {
      const c = counters[i], p = Math.min(1, (now - c.t0) / 600), e = 1 - Math.pow(1 - p, 3);
      if (!c.el.isConnected) { counters.splice(i, 1); continue; }
      const s = fmtN(c.to * e); if (s !== c.last) { c.el.textContent = s; c.last = s; }
      if (p >= 1) counters.splice(i, 1);
    }
    ctT = counters.length ? requestAnimationFrame(countStep) : 0;
  }
  function startOne(el){
    if (el.tagName === 'I') { el.classList.remove('mWait'); el.classList.add('mGrow'); return; }
    const to = +el.dataset.count; if (!(to > 0)) return;
    counters.push({ el, to, t0:performance.now(), last:'' }); if (!ctT) ctT = requestAnimationFrame(countStep);
  }
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { io.unobserve(en.target); startOne(en.target); } })) : null;
  function progress(root){
    if (!root || calm()) return;
    root.querySelectorAll('.dyBar i, [data-count]').forEach(el => {
      if (el.tagName === 'I') el.classList.add('mWait'); else el.textContent = '0';
      if (io) io.observe(el); else startOne(el);
    });
  }

  // ───── 吐司：由下浮上來、停一下、淡掉（排隊在 game.js 的 notice）─────
  function toast(msg, ms){
    const t = $('#toast'); if (!t) return;
    const again = t.classList.contains('on');
    t.textContent = msg; t.classList.add('on');
    if (again && !calm()) run(t, [{ transform:'translate(-50%,0) scale(.94)' }, { transform:'translate(-50%,0)' }], { duration:300, easing:SPRING });
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), ms);   // 停留的時間（不是動畫）
  }

  // ───── 交錯出場：一個接一個淡入上升，每個間隔 40～60 毫秒，全部最多半秒 ─────
  function stagger(root, sel){
    const els = root ? [...root.querySelectorAll(sel)] : []; if (!els.length) return;
    const step = Math.max(40, Math.min(60, 500 / els.length));
    els.forEach((el, i) => { el.classList.add('stg'); el.style.animationDelay = Math.min(500, Math.round(i * step)) + 'ms'; });
  }

  // ───── 搖晃：左右 ±8 px 三次（鎖住的山、復原碼不對）─────
  function shake(el){
    if (!el || !el.animate) return;
    if (el._mShake) el._mShake.cancel();
    el._mShake = el.animate(calm() ? [{ opacity:1 }, { opacity:.45 }, { opacity:1 }] : [0, -8, 8, -8, 8, -8, 8, 0].map(x => ({ transform:`translateX(${x}px)` })), { duration:calm() ? 260 : 420, easing:'ease-in-out' });
  }

  // ───── 彈簧：卡片由下彈上來，超過一點再回來（奇遇、登頂、寶物卡）─────
  function rise(el){
    return run(el, calm() ? [{ opacity:0 }, { opacity:1 }] : [{ opacity:0, transform:'translateY(56px) scale(.96)' }, { opacity:1, offset:.3 }, { opacity:1, transform:'none' }],
      { duration:calm() ? 180 : 480, easing:calm() ? EASE : SPRING });
  }
  function fadeIn(els, delay = 120){
    [...els].forEach((el, i) => run(el, calm() ? [{ opacity:0 }, { opacity:1 }] : [{ opacity:0, transform:'translateY(8px)' }, { opacity:1, transform:'none' }], { duration:240, delay:delay + i * 40, fill:'backwards' }));
  }
  // 左右換頁：新的一頁從滑過來的方向進來
  function slideIn(el, dir){
    return run(el, calm() ? [{ opacity:0 }, { opacity:1 }] : [{ opacity:0, transform:`translateX(${dir * 48}px)` }, { opacity:1, transform:'none' }], { duration:calm() ? 160 : 300 });
  }

  // ───── 共用元素：小格子的圖飛到大卡片的位置（FLIP，只用位移和縮放）─────
  function flip(el, from, opt = {}){
    if (!el || !from || !from.width) return Promise.resolve(null);
    if (calm()) return run(el, [{ opacity:0 }, { opacity:1 }], { duration:180 });
    const to = el.getBoundingClientRect(); if (!to.width) return Promise.resolve(null);
    const t = `translate(${from.left - to.left}px,${from.top - to.top}px) scale(${from.width / to.width},${from.height / to.height})`;
    if (opt.lift) el.style.zIndex = 3;
    return run(el, [{ transformOrigin:'0 0', transform:t }, { transformOrigin:'0 0', transform:'none' }], { duration:340 })
      .then(a => { if (opt.lift) el.style.zIndex = ''; return a; });
  }

  // ───── 手指左右滑（新手教學翻頁）：move 跟著手指、end 決定換不換頁 ─────
  function swipe(el, h){
    let p0 = null;
    el.addEventListener('pointerdown', e => { if (e.button) return; p0 = { x:e.clientX, y:e.clientY, id:e.pointerId, on:false }; });
    el.addEventListener('pointermove', e => {
      if (!p0 || e.pointerId !== p0.id) return;
      const dx = e.clientX - p0.x, dy = e.clientY - p0.y;
      if (!p0.on && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) { p0.on = true; try { el.setPointerCapture(e.pointerId); } catch(err){} }
      if (p0.on) h.move(dx);
    });
    const end = e => { if (!p0 || e.pointerId !== p0.id) return; const on = p0.on, dx = e.clientX - p0.x; p0 = null; if (on) h.end(e.type === 'pointercancel' ? 0 : dx); };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  }

  // ───── 下拉更新（只用在跟伺服器拿資料的清單）─────
  // scroller：會捲動的那一塊；ok()：現在可不可以拉；reload()：回傳 Promise
  function pull(scroller, ok, reload){
    const ind = document.createElement('div'); ind.className = 'mPull'; ind.innerHTML = '<i></i>';
    scroller.parentNode.appendChild(ind);
    const MAX = 96, GO = 58;
    let y0 = null, d = 0, busyNow = false;
    const set = v => {
      d = v; scroller.style.transform = v ? `translateY(${v}px)` : '';
      ind.style.transform = `translate(-50%,${v - 44}px) rotate(${v * 4}deg)`; ind.style.opacity = Math.min(1, v / GO);
    };
    const back = () => {
      const v = d; set(0); if (!v || calm()) return;
      run(scroller, [{ transform:`translateY(${v}px)` }, { transform:'none' }], { duration:380, easing:SPRING });
      run(ind, [{ opacity:1, transform:`translate(-50%,${v - 44}px)` }, { opacity:0, transform:'translate(-50%,-44px)' }], { duration:240 });
    };
    const start = y => { if (busyNow || !ok() || scroller.scrollTop > 0) return; y0 = y; ind.style.top = scroller.offsetTop + 'px'; ind.classList.remove('spin'); };
    const move = (y, e) => { if (y0 == null) return; const dy = y - y0; if (dy <= 0) { if (d) set(0); return; } if (e.cancelable) e.preventDefault(); set(Math.min(MAX, dy * 0.5)); };
    const end = () => {
      if (y0 == null) return; y0 = null;
      if (d < GO) return back();
      busyNow = true; set(GO); ind.classList.add('spin');
      Promise.all([Promise.resolve().then(reload).catch(() => {}), run(ind, [{ opacity:.6 }, { opacity:1 }], { duration:300 })])
        .then(() => { busyNow = false; ind.classList.remove('spin'); back(); });
    };
    scroller.addEventListener('touchstart', e => start(e.touches[0].clientY), { passive:true });
    scroller.addEventListener('touchmove', e => move(e.touches[0].clientY, e), { passive:false });
    scroller.addEventListener('touchend', end); scroller.addEventListener('touchcancel', end);
    scroller.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') start(e.clientY); });   // 電腦上用滑鼠拖也可以
    window.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') move(e.clientY, e); });
    window.addEventListener('pointerup', e => { if (e.pointerType === 'mouse') end(); });
  }

  // ───── 骨架畫面：等伺服器時先放羊皮紙色的輪廓塊，輕輕掃過一道光 ─────
  const skeleton = (n, h = 54) => Array.from({ length:n }, (_, i) => `<div class="skel" style="height:${h}px;margin-bottom:10px;width:${100 - (i % 3) * 8}%"></div>`).join('');
  const skeletonGrid = n => `<div class="grid">${Array.from({ length:n }, () => '<div class="skel" style="aspect-ratio:36/30"></div>').join('')}</div>`;

  // ───── 粒子：星星、按讚愛心、徽章爆開、登頂花瓣 ─────
  function sparks(x, y, n = 10){
    if (calm()) return;
    const [lx, ly] = local(x, y), L = layer();
    for (let i = 0; i < n; i++) {
      const s = document.createElement('div'); s.className = 'spark';
      const col = ['#ffd166','#ff8fa3','#8fd694','#9ad0f5'][i % 4], a = Math.random() * 6.28, d = 40 + Math.random() * 60;
      s.innerHTML = `<svg viewBox="0 0 20 20"><path d="M10 0l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="${col}" stroke="${INK}" stroke-width="1"/></svg>`;
      s.style.cssText = `left:${lx - 7}px;top:${ly - 7}px;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d - 20}px`;
      L.appendChild(temp(s));
    }
  }
  function like(x, y){
    const [lx, ly] = local(x, y), L = layer();
    const h = document.createElement('div'); h.className = 'likeHeart'; h.style.cssText = `left:${lx}px;top:${ly}px`;
    h.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 21C5 15.5 2 12.5 2 8.5 2 5.4 4.4 3 7.4 3c1.9 0 3.6 1 4.6 2.5C13 4 14.7 3 16.6 3 19.6 3 22 5.4 22 8.5c0 4-3 7-10 12.5z" fill="#ff7b93" stroke="${INK}" stroke-width="1.6"/><ellipse cx="7.5" cy="7.5" rx="2.2" ry="1.4" fill="#fff" opacity=".6" transform="rotate(-30 7.5 7.5)"/></svg>`;
    L.appendChild(temp(h));
    if (calm()) return;
    for (let i = 0; i < 10; i++) { const d = document.createElement('div'); d.className = 'likeDot'; const a = i / 10 * 6.283, R = 34 + Math.random() * 16;
      d.style.cssText = `left:${lx}px;top:${ly}px;background:${['#ff7b93','#ffd166','#f7a35c'][i % 3]};--dx:${Math.cos(a) * R}px;--dy:${Math.sin(a) * R}px`;
      L.appendChild(temp(d)); }
  }
  // 葉子、花瓣的種類（形狀和顏色在 css 的 .pt.xxx）
  const KINDS = { sakura:['sakura','sakura','sakura2'], maple:['maple','maple2','ginkgo'], leaf:['leaf','leaf2','ginkgo'], pine:['pine','pine','leaf2'], rhodo:['rhodo','sakura2','leaf'] };
  // 依季節和山決定飄什麼：山上正在櫻花季、楓紅季、杜鵑季就用那一種；不然看月份；3000 公尺以上的高山混一些松針
  function petalKind(m, date = new Date()){
    const ss = m && SX.seasonsAt ? SX.seasonsAt(date).filter(s => s.mountains.includes(SX.groupOf(m.id))).map(s => s.id) : [];
    const on = ['sakura', 'maple', 'rhodo'].find(k => ss.includes(k)); if (on) return on;
    const mo = date.getMonth() + 1;
    if (m && m.alt >= 3000 && (mo === 12 || mo <= 2)) return 'pine';
    return mo >= 2 && mo <= 4 ? 'sakura' : mo >= 9 && mo <= 12 ? 'maple' : 'leaf';
  }
  // 登頂、第一次拿到稀有寶物：從上面飄下來，最多 40 片
  function petals(kind, n = 32){
    if (calm()) return;
    const L = layer(), W = L.clientWidth, H = L.clientHeight + 40, list = KINDS[kind] || KINDS.leaf;
    n = Math.min(n, 40 - L.querySelectorAll('.pt:not(.burst)').length);   // 畫面上同時最多 40 片（登頂和任務完成同時飄也不會加倍）
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i'), k = list[i % list.length];
      p.className = 'pt ' + k;
      p.style.cssText = `left:${rnd(-10, W)}px;--h:${H}px;--sw:${rnd(12, 34) * (i % 2 ? 1 : -1)}px;--dx:${rnd(-60, 60)}px;--r:${rnd(-540, 540)}deg;--t:${rnd(2.4, 3.8).toFixed(2)}s;animation-delay:${rnd(0, .6).toFixed(2)}s`;
      L.appendChild(temp(p));
    }
  }
  // 徽章：從徽章的位置爆出一小圈木頭色的葉子
  function burst(x, y, n = 12){
    if (calm()) return;
    const [lx, ly] = local(x, y), L = layer(), list = ['leaf', 'maple2', 'ginkgo', 'leaf2'];
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i'), a = i / n * 6.283 + rnd(-.2, .2), R = rnd(38, 64);
      p.className = 'pt burst ' + list[i % list.length];
      p.style.cssText = `left:${lx - 6}px;top:${ly - 6}px;--dx:${Math.cos(a) * R}px;--dy:${Math.sin(a) * R}px;--r:${rnd(-260, 260)}deg`;
      L.appendChild(temp(p));
    }
  }
  // 拿到徽章：徽章 0 → 1.3 → 1 彈出來
  function pop(el, delay = 0){
    return run(el, calm() ? [{ opacity:0 }, { opacity:1 }] : [{ transform:'scale(0)' }, { transform:'scale(1.3)', offset:.55 }, { transform:'scale(1)' }], { duration:calm() ? 180 : 520, delay, easing:calm() ? EASE : 'cubic-bezier(.3,1.2,.5,1)', fill:'backwards' });
  }
  // 開關：底圖交叉淡換（css），木牌輕輕彈一下
  function toggle(btn, on){
    if (!btn) return;
    btn.classList.toggle('on', !!on);
    if (!calm()) run(btn, [{ transform:'scale(.9,1.06)' }, { transform:'none' }], { duration:380, easing:SPRING });
  }

  SX.motion = { EASE, SPRING, get calm(){ return calm(); }, run, busy, idle, done, beat, progress, toast, stagger, shake, rise, fadeIn, slideIn, flip, swipe, pull, skeleton, skeletonGrid, sparks, like, petals, petalKind, burst, pop, toggle };
})();

// 山行小日子：維修模式（山屋整修中）
// 規格（2026-11-24 定案）：開發者選項裡選日期、時間預約（可以預約好幾天後）；時間到整個遊戲關閉、不能登入；
// 整修前預告（打開遊戲時一次、開始前 WARN_MS 再一次）；結束後自動換成新版本並說「山屋整修好了」。
// 維修時間只存在伺服器（server/src/index.js 的 maint 表），這裡每 POLL_MS 問一次；時間以伺服器為準（手機時鐘不準也沒關係），顯示用台灣時間。
// 連不上伺服器時不擋（可能是網路不好，一個人照常玩）。這支手機存了管理金鑰（開發者）就不擋，讓開發者整修時先看新版本。
(function(){
  const API = self.SX_API;
  const POLL_MS = 60000;         // 多久問一次有沒有維修
  const WARN_MS = 10 * 60000;    // 開始前多久再提醒一次
  const DONE_KEY = 'sx-maint-done';
  const $ = s => document.querySelector(s);
  let skew = 0, wasOn = false, told = false, warned = false, tick = 0;
  const tNow = () => Date.now() + skew;
  const owner = () => !!(SX.social && SX.social.isAdminDevice && SX.social.isAdminDevice());
  const tw = t => new Date(t + 8 * 3600e3);   // 台灣時間（用 UTC 的欄位讀）
  const p2 = n => String(n).padStart(2, '0');
  const hm = t => { const d = tw(t); return `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`; };
  const day = t => { const d = tw(t); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}（${'日一二三四五六'[d.getUTCDay()]}）`; };
  const sameDay = (a, b) => day(a) === day(b);
  const span = m => `${day(m.start)} ${hm(m.start)}～${sameDay(m.start, m.eta) ? '' : day(m.eta) + ' '}${hm(m.eta)}`;
  const etaText = m => sameDay(tNow(), m.eta) ? hm(m.eta) : `${day(m.eta)} ${hm(m.eta)}`;

  async function poll(){
    try {
      const r = await fetch(API + '/maint', { cache: 'no-store' }); if (!r.ok) return;
      const j = await r.json(); if (j.now) skew = j.now - Date.now();
      apply(j.start ? { start: j.start, eta: j.eta } : null);
    } catch (e) {}
  }
  function apply(m){
    const on = !!m && tNow() >= m.start && !owner();
    if (!on && wasOn) { try { sessionStorage.setItem(DONE_KEY, '1'); } catch (e) {} location.reload(); return; }   // 整修好了：重新打開就是新版本
    wasOn = on; SX.maintOn = on;
    if (on) { show(m); if (SX.social && SX.social.close) SX.social.close(); return; }
    if (m) announce(m);
    // 預約的時間快到了：到點時馬上再問一次（不然最多晚 POLL_MS 才關）
    clearTimeout(tick); if (m && m.start - tNow() < POLL_MS) tick = setTimeout(poll, Math.max(0, m.start - tNow()) + 1500);
  }
  function announce(m){
    const g = SX.game; if (!g || !g.notice) return;
    const left = m.start - tNow();
    if (left <= WARN_MS && !warned) { warned = told = true; g.notice(`山屋 ${hm(m.start)} 要整修，大約 ${etaText(m)} 回來`, 5000); return; }
    if (!told) { told = true; g.notice(`山屋 ${span(m)} 整修，這段時間暫停開放`, 5000); }
  }
  function show(m){
    let el = $('#maint');
    if (!el) { el = document.createElement('div'); el.id = 'maint'; el.className = 'maint'; ($('#app') || document.body).appendChild(el); }
    const late = tNow() > m.eta;
    el.innerHTML = `<div class="maintCard"><div class="maintArt"></div><h2>山屋整修中</h2>
      <p>${late ? '比預計久一點，快好了' : `大約 ${etaText(m)} 回來`}</p><p class="tiny">整修好了會自動打開</p></div>`;
    const u = SX.art && SX.art.url && SX.art.url('hut_paiyun');
    if (u) el.querySelector('.maintArt').style.backgroundImage = `url("${u}")`;
  }

  // ───────── 開發者選項：預約／開始／結束 ─────────
  const toMs = (d, t) => Date.parse(`${d}T${t}:00+08:00`);
  async function panel(){
    const mc = $('#mCard'); $('#modal').classList.add('on');
    const draw = async () => {
      let m = null; try { const r = await fetch(API + '/maint', { cache: 'no-store' }); const j = await r.json(); if (j.now) skew = j.now - Date.now(); m = j.start ? j : null; } catch (e) {}
      const on = m && tNow() >= m.start, d0 = tw(m ? m.start : tNow() + 864e5);
      const dv = `${d0.getUTCFullYear()}-${p2(d0.getUTCMonth() + 1)}-${p2(d0.getUTCDate())}`;
      mc.innerHTML = `<h3>山屋整修</h3>
        <p>${!m ? '現在沒有預約' : on ? `整修中，預計 ${etaText(m)} 好` : `已預約 ${span(m)}`}</p>
        <div class="maintForm"><label>日期<input type="date" id="mtD" value="${dv}"></label>
          <label>開始<input type="time" id="mtS" value="${m ? hm(m.start) : '23:00'}"></label>
          <label>預計好<input type="time" id="mtE" value="${m ? hm(m.eta) : '23:30'}"></label></div>
        <div class="mBtns"><button class="cbtn go sm" id="mtBook">預約</button><button class="cbtn sm" id="mtNow">現在開始</button>
          ${m ? `<button class="cbtn red sm" id="mtEnd">${on ? '結束整修' : '取消預約'}</button>` : ''}</div>
        <div class="mBtns"><button class="cbtn" id="mtX">← 返回</button></div>`;
      const set = async (start, eta) => {
        if (eta <= start) eta += 864e5;   // 預計好的時間比開始早：當成隔天
        try { await SX.social.adminApi('/maint', { json: { start, eta } }); SX.motion.toast('設定好了'); draw(); } catch (e) { SX.motion.toast(e.message, 3000); }
      };
      $('#mtBook').onclick = () => { const d = $('#mtD').value, s = toMs(d, $('#mtS').value); if (!(s > tNow())) { SX.motion.toast('開始時間要在現在之後', 3000); return; } set(s, toMs(d, $('#mtE').value)); };
      $('#mtNow').onclick = () => { const s = tNow(), d = tw(s), e = toMs(`${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`, $('#mtE').value); set(s, e > s ? e : s + 30 * 60000); };
      if ($('#mtEnd')) $('#mtEnd').onclick = async () => { try { await SX.social.adminApi('/maint', { method: 'DELETE' }); SX.motion.toast(on ? '整修結束，玩家會自動換新版' : '預約取消了'); draw(); } catch (e) { SX.motion.toast(e.message, 3000); } };
      $('#mtX').onclick = () => $('#modal').classList.remove('on');
    };
    mc.innerHTML = '<h3>山屋整修</h3><p>讀取中…</p>'; draw();
  }

  SX.maint = { panel, get on(){ return wasOn; } };
  try { if (sessionStorage.getItem(DONE_KEY)) { sessionStorage.removeItem(DONE_KEY); if (SX.game && SX.game.notice) SX.game.notice('山屋整修好了！歡迎回來', 3200); } } catch (e) {}
  poll(); setInterval(poll, POLL_MS);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });
})();

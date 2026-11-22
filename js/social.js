// 山行小日子 — 連線功能：帳號、山友大廳聊天、好友、一起爬、共享照片牆、照片審核
// 後端：Cloudflare Workers（server/ 資料夾）。帳號只存在這支手機上，另外給一組復原碼換手機用。
(function(){
  const API = self.SX_API;                 // 後端網址寫在 js/config.js（sw.js 也要用）
  const WS = API.replace(/^http/, 'ws') + '/ws';
  const KEY = 'shanxing-net-v1', KEY_PARTY = 'shanxing-party-v1', KEY_ADMIN = 'shanxing-admin-key';
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch(e){ return d; } };
  const store = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch(e){} };
  const A = () => SX.audio || {};
  const toast = (msg, ms = 2400) => { const t = $('#toast'); if (!t) return; t.textContent = msg; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), ms); };
  const G = () => window.SXG || {};
  const mName = id => (SX.M[id] && SX.M[id].name) || id || '';
  const km = m => (Math.max(0, m || 0) / 1000).toFixed(2) + ' km';

  let acct = load(KEY, null);          // { id, token, name, code }
  let party = load(KEY_PARTY, null);   // { id, mountain, with:{id,name} }

  // ───────── API ─────────
  async function api(path, opt = {}){
    const h = Object.assign({}, opt.headers || {});
    if (acct && acct.token) h.Authorization = 'Bearer ' + acct.token;
    if (opt.json !== undefined) { h['Content-Type'] = 'application/json'; opt.body = JSON.stringify(opt.json); }
    let r;
    try { r = await fetch(API + path, { method: opt.method || (opt.body ? 'POST' : 'GET'), headers: h, body: opt.body }); }
    catch(e){ throw new Error('連不上伺服器，檢查一下網路'); }
    const d = await r.json().catch(() => ({}));
    if (r.status === 401 && acct) { throw new Error('登入失效，請到「我的帳號」用復原碼重新登入'); }
    if (!r.ok) throw new Error(d.error || ('伺服器錯誤 ' + r.status));
    return d;
  }
  async function register(name){
    const d = await api('/register', { json: { name } });
    acct = { id: d.id, token: d.token, name: d.name, code: d.code }; store(KEY, acct);
    return acct;
  }
  async function restore(token){
    const old = acct; acct = { token: token.trim() };
    try { const me = await api('/me'); acct = { id: me.id, token: token.trim(), name: me.name, code: me.code }; store(KEY, acct); return acct; }
    catch(e){ acct = old; throw new Error('復原碼不對，或帳號已停用'); }
  }

  // ───────── 即時房間（WebSocket，自動重連）─────────
  function room(name, on){
    let ws = null, alive = true, tries = 0, ping = null;
    const R = { send: d => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(d)); }, close: () => { alive = false; clearInterval(ping); if (ws) try { ws.close(); } catch(e){} }, get open(){ return !!ws && ws.readyState === 1; } };
    const connect = () => {
      if (!alive || !acct) return;
      const pet = name === 'lobby' && SX.game && SX.game.pet ? `&pet=${encodeURIComponent(SX.game.pet() || '')}` : '';   // 廣場上帶著現在的寵物
      ws = new WebSocket(`${WS}?room=${encodeURIComponent(name)}&t=${encodeURIComponent(acct.token)}${pet}`);
      ws.onopen = () => { tries = 0; clearInterval(ping); ping = setInterval(() => R.send({ type: 'ping' }), 25000); on({ type: 'open' }); };
      ws.onmessage = e => { let d; try { d = JSON.parse(e.data); } catch(_){ return; } on(d); };
      ws.onclose = () => { clearInterval(ping); on({ type: 'closed' }); if (alive) setTimeout(connect, Math.min(15000, 1000 * 2 ** tries++)); };
      ws.onerror = () => {};
    };
    connect();
    return R;
  }

  // ───────── 大廳畫面 ─────────
  let tab = 'plaza', lobby = null, msgs = [], people = [], friends = [], invites = [], plazaNo = 0, sayMax = 40, logOpen = false;
  const PZ = () => SX.plaza;
  function ensureAccount(then){
    if (acct) return then();
    const mc = $('#mCard'); mc.innerHTML = `<h3>第一次來到山友大廳</h3>
      <p class="summitBig">取一個暱稱，其他山友會看到這個名字。</p>
      <input id="nmIn" class="txtIn" maxlength="12" placeholder="暱稱（最多 12 個字）">
      <div class="mBtns"><button class="cbtn go" id="nmOk">進入大廳</button></div>
      <p class="tiny">已經有帳號（換新手機）？到大廳的「我的帳號」輸入復原碼。</p>`;
    $('#modal').classList.add('on');
    $('#nmOk').onclick = async () => {
      const v = $('#nmIn').value.trim(); if (!v) { toast('先取個暱稱吧'); return; }
      $('#nmOk').disabled = true;
      try { await register(v); showRecovery(true, then); } catch(e){ toast(e.message, 3200); $('#nmOk').disabled = false; }
    };
  }
  function showRecovery(first, then){
    const mc = $('#mCard'); mc.innerHTML = `<h3>${first ? '帳號建好了！' : '我的復原碼'}</h3>
      <p class="summitBig">這是你的<b>復原碼</b>，換手機或清掉瀏覽器資料時，要用它找回帳號。<br>請截圖或抄下來，不要給別人。</p>
      <div class="codeBox" id="rcBox">${esc(acct.token)}</div>
      <div class="mBtns"><button class="cbtn" id="rcCopy">複製</button><button class="cbtn go" id="rcOk">我存好了</button></div>`;
    $('#modal').classList.add('on');
    $('#rcCopy').onclick = () => { navigator.clipboard && navigator.clipboard.writeText(acct.token).then(() => toast('已複製'), () => toast('請長按文字複製')); };
    $('#rcOk').onclick = () => { $('#modal').classList.remove('on'); then && then(); };
  }
  function open(){
    ensureAccount(() => {
      render(); refresh();
      if (!lobby) lobby = room('lobby', onLobby);
      clearInterval(open._t); open._t = setInterval(refresh, 20000);
    });
  }
  function close(){ clearInterval(open._t); if (PZ()) PZ().unmount(); if (lobby) { lobby.close(); lobby = null; } }
  // 登山口廣場：伺服器傳來的事件同步到畫面
  function onLobby(d){
    const pz = PZ();
    if (d.type === 'hello') { msgs = d.history || []; people = d.people || []; plazaNo = d.plaza || 1; sayMax = d.sayMax || sayMax; pz.reset(people, acct.id); }
    else if (d.type === 'chat') { msgs.push(d); if (msgs.length > 80) msgs.shift(); pz.say(d.who.id, d.text); if (d.who.id !== acct.id && A().pop) A().pop(); }
    else if (d.type === 'join') { people = people.filter(p => p.id !== d.who.id); people.push(d.who); pz.join(d.who); }
    else if (d.type === 'leave') { people = people.filter(p => p.id !== d.who.id); pz.leave(d.who.id); }
    else if (d.type === 'move') pz.move(d.who.id, d.x, d.y);
    else if (d.type === 'emote') pz.emote(d.who.id, d.k);
    if (tab === 'plaza' && (d.type === 'chat' || d.type === 'hello')) renderLog();
    onlineTag();
  }
  function onlineTag(){ const on = $('#lbOnline'); if (on) on.textContent = lobby && lobby.open ? `廣場 ${plazaNo}・${people.length} 人` : '連線中…'; }
  async function refresh(){
    if (!acct) return;
    try {
      const [f, i] = await Promise.all([api('/friends'), api('/invites'), report()]);
      friends = f.friends || []; invites = i.invites || [];
      checkParty();
      if (tab === 'friends') renderFriends();
      updateBadge();
    } catch(e){ if (tab !== 'plaza') toast(e.message, 3000); }
  }
  function updateBadge(){
    const n = invites.filter(v => v.guest === (acct && acct.id) && v.status === 'pending').length;
    $$('[data-go="lobby"]').forEach(b => b.dataset.badge = n ? String(n) : '');
  }
  function render(){
    $$('#scrLobby .tab').forEach(b => { b.classList.toggle('on', b.dataset.lt === tab); b.onclick = () => { if (A().pop) A().pop(); tab = b.dataset.lt; render(); if (tab === 'friends') refresh(); }; });
    const body = $('#lobbyBody'); if (body) body.classList.toggle('plazaMode', tab === 'plaza');
    if (tab !== 'plaza' && PZ()) PZ().unmount();
    if (tab === 'plaza') renderPlaza(); else if (tab === 'friends') renderFriends(); else renderMe();
  }
  // 廣場分頁：整塊是廣場畫面，左下角聊天框，右下角打招呼
  function renderPlaza(){
    const body = $('#lobbyBody'); if (!body) return;
    body.innerHTML = `<div class="plzChat${logOpen ? ' open' : ''}" id="plzChat"><div class="plzLog" id="chatList"></div>
        <form class="chatIn" id="chatForm"><input id="chatTxt" maxlength="${sayMax}" placeholder="說點什麼…" autocomplete="off" enterkeyhint="send"><button class="cbtn go sm">送出</button></form></div>
      <button class="plzEmoBtn" id="emoBtn" aria-label="打招呼">👋</button>
      <div class="plzEmoMenu" id="emoMenu">${PZ().EMO.map(e => `<button class="cbtn sm" data-emo="${e.k}"><span>${SX.art ? SX.art.img(PZ().emoArt(e.k), e.icon) : e.icon}</span>${e.label}</button>`).join('')}</div>`;
    PZ().mount(body, {
      onMove: (x, y) => { if (lobby) lobby.send({ type: 'move', x, y }); $('#emoMenu').classList.remove('on'); },
      onTapPerson: personCard,
    });
    $('#chatForm').onsubmit = e => {
      e.preventDefault(); const v = $('#chatTxt').value.trim(); if (!v) return;
      if (!lobby || !lobby.open) { toast('還在連線，等一下'); return; }
      lobby.send({ type: 'chat', text: v }); $('#chatTxt').value = ''; if (SX.game) SX.game.daily('chat');
    };
    $('#chatList').onclick = () => { logOpen = !logOpen; $('#plzChat').classList.toggle('open', logOpen); renderLog(); };
    $('#emoBtn').onclick = () => { if (A().pop) A().pop(); $('#emoMenu').classList.toggle('on'); };
    $$('[data-emo]').forEach(b => b.onclick = () => {
      const k = b.dataset.emo; $('#emoMenu').classList.remove('on');
      PZ().emote(acct.id, k); if (lobby) lobby.send({ type: 'emote', k });
    });
    renderLog(); onlineTag();
  }
  // 聊天紀錄：平常只露最近 3 句，點一下展開看全部
  function renderLog(){
    const L = $('#chatList'); if (!L) return;
    const list = logOpen ? msgs : msgs.slice(-3);
    L.innerHTML = list.length ? list.map(m => `<div class="lg${m.who.id === acct.id ? ' me' : ''}"><b>${esc(m.who.name)}</b>${esc(m.text)}</div>`).join('')
      : '<div class="lg tip">點地面走走，跟山友打聲招呼吧</div>';
    L.scrollTop = L.scrollHeight;
  }
  // 點了廣場上的別人：加好友、邀請一起爬
  function personCard(p){
    const fr = friends.find(f => f.id === p.id), opts = SX.MOUNTAINS.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
    const mc = $('#mCard'); $('#modal').classList.add('on');
    mc.innerHTML = `<h3>${esc(p.name)}</h3>
      ${fr ? `<p class="summitBig">你們是好友。要邀對方一起爬哪座山？</p><select id="pcMt" class="txtIn">${opts}</select>
        <div class="mBtns"><button class="cbtn" id="pcX">先不用</button><button class="cbtn go" id="pcInv">邀請一起爬</button></div>`
      : `<p class="summitBig">加為好友之後，就能邀請對方一起爬山。</p>
        <div class="mBtns"><button class="cbtn" id="pcX">先不用</button><button class="cbtn go" id="pcAdd">加好友</button></div>`}`;
    $('#pcX').onclick = () => $('#modal').classList.remove('on');
    if ($('#pcAdd')) $('#pcAdd').onclick = async () => {
      try { await api('/friends', { json: { id: p.id } }); toast(`和 ${p.name} 成為好友了！`); if (A().sparkle) A().sparkle(); await refresh(); personCard(p); } catch(e){ toast(e.message, 3000); }
    };
    if ($('#pcInv')) $('#pcInv').onclick = async () => {
      try { await api('/invites', { json: { friend: p.id, mountain: $('#pcMt').value } }); toast('邀請送出了，對方接受後就能一起爬'); $('#modal').classList.remove('on'); refresh(); } catch(e){ toast(e.message, 3000); }
    };
  }
  function renderFriends(){
    const body = $('#lobbyBody'); if (!body) return;
    const inc = invites.filter(v => v.guest === acct.id && v.status === 'pending');
    const opts = SX.MOUNTAINS.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
    body.innerHTML = `
      <div class="setRow"><h4>我的好友碼 <span class="codeTag">${esc(acct.code)}</span></h4>
        <p>把好友碼給朋友，對方輸入後就會互相成為好友。</p>
        <form class="pw" id="addF"><input id="fcIn" maxlength="8" placeholder="輸入朋友的好友碼" autocapitalize="characters"><button class="cbtn sm">加好友</button></form></div>
      ${inc.length ? `<div class="setRow"><h4>收到的邀請</h4>${inc.map(v => `<div class="frRow"><span><b>${esc(v.host_name)}</b> 邀你一起爬 <b>${esc(mName(v.mountain))}</b></span>
        <span><button class="cbtn go sm" data-acc="${v.id}">一起去</button><button class="cbtn sm" data-dec="${v.id}">下次</button></span></div>`).join('')}</div>` : ''}
      ${party ? `<div class="setRow"><h4>正在一起爬</h4><div class="frRow"><span>和 <b>${esc(party.with.name)}</b> 爬 <b>${esc(mName(party.mountain))}</b></span>
        <span><button class="cbtn go sm" id="pGo">出發</button><button class="cbtn sm" id="pEnd">結束</button></span></div></div>` : ''}
      ${friends.length ? `<div class="setRow"><h4>本週誰走最多</h4>${[{ id: acct.id, name: acct.name + '（我）', week: myWeek }, ...friends].sort((a, b) => (b.week || 0) - (a.week || 0)).slice(0, 10)
        .map((p, i) => `<div class="rankRow${p.id === acct.id ? ' me' : ''}"><i>${i + 1}</i><b>${esc(p.name)}</b><span>${((p.week || 0) / 1000).toFixed(1)} km</span></div>`).join('')}
        <p class="tiny">每週一凌晨重新計算。</p></div>` : ''}
      <div class="setRow"><h4>好友（${friends.length}）</h4>
        ${friends.length ? friends.map(f => `<div class="frRow"><span><i class="dot${f.online ? ' on' : ''}"></i><b>${esc(f.name)}</b>
          <small>${f.mountain ? `在${esc(mName(f.mountain))}・${km(f.dist)}` : (f.online ? '在線上' : '休息中')}</small></span>
          <span><select data-sel="${f.id}">${opts}</select><button class="cbtn sm" data-inv="${f.id}">邀請</button></span></div>`).join('')
        : '<p>還沒有好友，先把好友碼傳給朋友吧。</p>'}</div>`;
    $('#addF').onsubmit = async e => { e.preventDefault(); const v = $('#fcIn').value.trim(); if (!v) return;
      try { const d = await api('/friends', { json: { code: v } }); toast(`和 ${d.friend.name} 成為好友了！`); if (A().sparkle) A().sparkle(); refresh(); } catch(err){ toast(err.message, 3000); } };
    $$('[data-inv]').forEach(b => b.onclick = async () => { const fid = b.dataset.inv, mt = $(`[data-sel="${fid}"]`).value;
      try { await api('/invites', { json: { friend: fid, mountain: mt } }); toast('邀請送出了，對方接受後就能一起爬'); refresh(); } catch(err){ toast(err.message, 3000); } });
    $$('[data-acc]').forEach(b => b.onclick = () => answer(b.dataset.acc, true));
    $$('[data-dec]').forEach(b => b.onclick = () => answer(b.dataset.dec, false));
    if ($('#pGo')) $('#pGo').onclick = () => { if (G().startClimb) G().startClimb(party.mountain); };
    if ($('#pEnd')) $('#pEnd').onclick = () => { setParty(null); renderFriends(); };
  }
  async function answer(id, yes){
    try {
      const d = await api('/invites/' + id, { json: { accept: yes } });
      const v = invites.find(x => x.id === id);
      if (yes && v) { setParty({ id, mountain: d.mountain, with: { id: v.host, name: v.host_name } }); toast(`出發！和 ${v.host_name} 一起爬${mName(d.mountain)}`); if (G().startClimb) G().startClimb(d.mountain); }
      refresh();
    } catch(e){ toast(e.message, 3000); }
  }
  // 邀請人：看到對方接受了，就自動組隊
  function checkParty(){
    if (!acct || party) return;
    const ok = invites.find(v => v.host === acct.id && v.status === 'accepted' && Date.now() - v.created < 3 * 864e5 && !(load('shanxing-party-done', [])).includes(v.id));
    if (ok) { setParty({ id: ok.id, mountain: ok.mountain, with: { id: ok.guest, name: ok.guest_name } }); toast(`${ok.guest_name} 接受邀請了！一起去爬${mName(ok.mountain)}吧`, 3600); }
  }
  function setParty(p){
    if (!p && party) { const done = load('shanxing-party-done', []); done.push(party.id); store('shanxing-party-done', done.slice(-30)); }
    party = p; store(KEY_PARTY, p); if (pRoom) { pRoom.close(); pRoom = null; } partyBox();
  }
  function renderMe(){
    const body = $('#lobbyBody'); if (!body) return;
    body.innerHTML = `
      <div class="setRow"><h4>暱稱</h4><form class="pw" id="nmF"><input id="nmIn2" maxlength="12" value="${esc(acct.name)}"><button class="cbtn sm">改名</button></form></div>
      <div class="setRow"><h4>復原碼</h4><p>換手機時用來找回帳號，不要給別人。</p><button class="cbtn sm" id="showRc">顯示復原碼</button></div>
      <div class="setRow"><h4>換手機：用復原碼登入</h4><form class="pw" id="rsF"><input id="rsIn" placeholder="貼上復原碼"><button class="cbtn sm">登入</button></form></div>
      <div class="setRow"><h4>雲端存檔</h4><p>有帳號時，進度每 3 分鐘自動備份到雲端（照片不備份）。換手機登入後，可以把進度載回來。</p>
        <div class="mBtns" style="justify-content:flex-start"><button class="cbtn sm" id="cdUp">立刻備份</button><button class="cbtn sm" id="cdDown">從雲端載入</button></div></div>
      <div class="setRow"><h4>我上傳的照片</h4><div id="myPh"><p>讀取中…</p></div></div>`;
    $('#nmF').onsubmit = async e => { e.preventDefault(); const v = $('#nmIn2').value.trim(); if (!v) return;
      try { const d = await api('/me', { json: { name: v } }); acct.name = d.name; store(KEY, acct); toast('改好了'); } catch(err){ toast(err.message, 3000); } };
    $('#showRc').onclick = () => showRecovery(false);
    $('#rsF').onsubmit = async e => { e.preventDefault(); const v = $('#rsIn').value.trim(); if (!v) return;
      try { await restore(v); toast(`歡迎回來，${acct.name}`); if (lobby) { lobby.close(); lobby = room('lobby', onLobby); } refresh(); renderMe(); setTimeout(offerCloudLoad, 600); } catch(err){ toast(err.message, 3000); } };
    $('#cdUp').onclick = () => { lastSaved = ''; cloudSave(false); toast('備份好了'); };
    $('#cdDown').onclick = () => offerCloudLoad();
    api('/photos?mine=1').then(d => {
      const L = d.photos || [], st = { pending: '審核中', ok: '已公開', hidden: '未通過' };
      $('#myPh').innerHTML = L.length ? '<div class="grid">' + L.map(p => `<div class="pol"><img src="${API}/photo/${p.id}?t=${encodeURIComponent(acct.token)}" loading="lazy"><p>${esc(mName(p.mountain))}・${p.alt} m・${st[p.status] || p.status}</p></div>`).join('') + '</div>'
        : '<p>還沒有上傳過。休息時按「上傳這裡的照片」，審核通過後其他山友走到同一段就看得到。</p>';
    }).catch(e => { const el = $('#myPh'); if (el) el.innerHTML = `<p>${esc(e.message)}</p>`; });
  }

  // ───────── 一起爬：登山畫面上的隊友面板 ─────────
  let pRoom = null, mate = null, stateT = 0;
  function partyBox(){
    let el = $('#partyBox');
    const M = G().M, on = party && M && M.id === party.mountain && $('#scrClimb.on');
    if (!on) { if (el) el.classList.remove('on'); if (SX.scene && SX.scene.setMates) SX.scene.setMates([]); return; }
    if (!el) {
      el = document.createElement('div'); el.id = 'partyBox'; el.className = 'partyBox'; $('#scrClimb').appendChild(el);
      el.innerHTML = '<b id="pbName"></b><span id="pbInfo"></span><button class="cbtn sm" id="cheerBtn">幫他加油</button>';
      $('#cheerBtn').onclick = () => {
        if (!party) return; const t = Date.now(); if (t - (partyBox._c || 0) < 3000) { toast('剛剛才加油過，等一下下'); return; } partyBox._c = t;
        if (pRoom) pRoom.send({ type: 'cheer', to: party.with.id }); if (A().sparkle) A().sparkle(); toast('加油送出了！'); if (SX.game) SX.game.daily('cheer');
      };
    }
    el.classList.add('on');
    const me = G().st, d = mate && me ? mate.dist - me.dist : null;
    $('#pbName').textContent = `和 ${party.with.name} 一起爬`;
    $('#pbInfo').textContent = !pRoom || !pRoom.open ? '連線中…' : mate ? `${km(mate.dist)}・${d > 5 ? `領先你 ${Math.round(d)} m` : d < -5 ? `落後你 ${Math.round(-d)} m` : '就在你旁邊'}${mate.rest ? '・休息中' : ''}` : '等對方上線…';
    if (SX.scene && SX.scene.setMates) SX.scene.setMates(mate && me ? [{ dist: mate.dist, name: party.with.name, rest: !!mate.rest }] : []);
  }
  function tick(){
    const M = G().M, st = G().st, climbing = M && st && $('#scrClimb.on');
    // 一起爬：連到隊伍房間，每 4 秒回報自己的進度
    if (party && climbing && M.id === party.mountain) {
      if (!pRoom) pRoom = room('party:' + party.id, d => {
        if (d.type === 'hello') { const p = (d.people || []).find(x => x.id !== acct.id && x.state); if (p) mate = p.state; }
        else if (d.type === 'state' && d.who.id !== acct.id) mate = d.state;
        else if (d.type === 'cheer' && d.who.id !== acct.id) { toast(`${d.who.name} 幫你加油！體力 +5`, 2600); if (st) st.stam = Math.min(100, st.stam + 5); if (A().chime) A().chime(); }
        else if (d.type === 'leave' && d.who.id !== acct.id) mate = mate ? Object.assign({}, mate, { rest: true }) : mate;
        partyBox();
      });
      if (Date.now() - stateT > 4000) { stateT = Date.now(); pRoom.send({ type: 'state', mountain: M.id, dist: st.dist, stam: st.stam, rest: !!(st.rest || st.sleep) }); }
    } else if (pRoom && !climbing) { pRoom.close(); pRoom = null; mate = null; }
    partyBox();
  }
  setInterval(tick, 1000);
  // 每分鐘回報一次：在爬哪座山、累積距離、登頂次數（好友列表與週排行用）
  let myWeek = 0;
  function report(){
    if (!acct || !SX.game) return Promise.resolve();
    const M = G().M, st = G().st, climbing = M && st && $('#scrClimb.on');
    const body = { walked: Math.round(SX.game.stats().walked || 0), summits: SX.game.summits() };
    if (climbing) { body.mountain = M.id; body.dist = Math.round(st.dist); }
    return api('/me', { json: body }).then(d => { myWeek = d.week || 0; }).catch(() => {});
  }
  setInterval(report, 60000);

  // ───────── 雲端存檔：有帳號就每 3 分鐘、離開畫面時備份一次（不含照片圖檔）─────────
  let lastSaved = '';
  function cloudSave(keep){
    if (!acct || !SX.game) return;
    const txt = SX.game.getSave(); if (txt === lastSaved || txt.length > 390 * 1024) return;
    lastSaved = txt;
    fetch(API + '/save', { method: 'POST', headers: { Authorization: 'Bearer ' + acct.token, 'Content-Type': 'application/json' }, body: txt, keepalive: !!keep && txt.length < 60000 }).catch(() => { lastSaved = ''; });
  }
  setInterval(() => cloudSave(false), 180000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) cloudSave(true); });
  async function offerCloudLoad(){
    try {
      const d = await api('/save'); if (!d.data) { toast('雲端沒有存檔，從現在開始會自動備份'); return; }
      if (confirm(`雲端有 ${new Date(d.updated).toLocaleString('zh-TW')} 的存檔，要載入嗎？\n（這支手機目前的進度會被取代，照片不會跟著搬過來）`)) SX.game.applySave(d.data);
    } catch(e){ toast(e.message, 3000); }
  }
  setInterval(() => { if (acct && !$('#scrLobby.on')) api('/invites').then(i => { invites = i.invites || []; checkParty(); updateBadge(); }).catch(() => {}); }, 45000);

  // ───────── 共享照片：上傳、500 m 照片牆、檢舉 ─────────
  function uploadPhoto(canvas, rec){
    if (!acct) { toast('照片先存在手機裡；到山友大廳建帳號後，上傳的照片才會分享給其他山友', 3600); return; }
    canvas.toBlob(async blob => {
      if (!blob) return;
      try {
        const q = `?mountain=${encodeURIComponent(rec.mountainId)}&m=${rec.m}&alt=${rec.alt}`;
        await api('/photos' + q, { method: 'POST', body: blob, headers: { 'Content-Type': 'image/jpeg' } });
        toast('照片送出了，審核通過後其他山友走到這一段就看得到', 3600);
      } catch(e){ toast('分享沒成功：' + e.message, 3600); }
    }, 'image/jpeg', 0.75);
  }
  async function fillWall(mountainId, mark, root){
    if (!acct || !root) return;
    try {
      const d = await api(`/photos?mountain=${encodeURIComponent(mountainId)}&band=${Math.max(0, mark / 500 - 1)}`);
      const L = (d.photos || []).filter(p => p.status === 'ok' && p.owner !== acct.id);
      if (!L.length || !root.isConnected) return;
      const box = document.createElement('div');
      box.innerHTML = `<h3>其他山友在這一段拍的</h3><div class="grid">${L.map(p => `<div class="pol"><img src="${API}/photo/${p.id}" loading="lazy"><p>${esc(p.by || '山友')}・${p.alt} m <button class="repBtn" data-rep="${p.id}">檢舉</button></p></div>`).join('')}</div>`;
      const btns = root.querySelector('.mBtns'); btns ? root.insertBefore(box, btns) : root.appendChild(box);
      box.querySelectorAll('[data-rep]').forEach(b => b.onclick = async () => { if (!confirm('這張照片不恰當，要檢舉嗎？')) return; try { await api(`/photos/${b.dataset.rep}/report`, { method: 'POST' }); b.textContent = '已檢舉'; b.disabled = true; } catch(e){ toast(e.message); } });
    } catch(e){}
  }

  // ───────── 照片審核（開發者選項裡）─────────
  async function review(status = 'pending'){
    let k = load(KEY_ADMIN, '');
    if (!k) { k = prompt('輸入審核金鑰（在 server\\.dev.vars 裡的 ADMIN_KEY）') || ''; if (!k) return; store(KEY_ADMIN, k.trim()); k = k.trim(); }
    const mc = $('#mCard'); $('#modal').classList.add('on'); mc.innerHTML = '<h3>照片審核</h3><p>讀取中…</p>';
    try {
      const r = await fetch(`${API}/admin/photos?status=${status}`, { headers: { 'X-Admin-Key': k } });
      if (r.status === 403) { store(KEY_ADMIN, null); throw new Error('審核金鑰不對'); }
      const L = (await r.json()).photos || [];
      mc.innerHTML = `<h3>照片審核</h3><div class="mBtns"><button class="cbtn sm" data-st="pending">待審核</button><button class="cbtn sm" data-st="reported">被檢舉</button><button class="cbtn sm" data-st="hidden">已隱藏</button></div>
        ${L.length ? L.map(p => `<div class="revRow" data-id="${p.id}"><img src="${API}/photo/${p.id}?k=${encodeURIComponent(k)}"><div><b>${esc(mName(p.mountain))}</b>・${p.alt} m・${esc(p.by || '')}${p.reports ? `・檢舉 ${p.reports}` : ''}
          <div class="mBtns"><button class="cbtn go sm" data-a="ok">通過</button><button class="cbtn sm" data-a="hidden">隱藏</button><button class="cbtn red sm" data-a="delete">刪除</button></div></div></div>`).join('') : '<p class="summitBig">沒有要處理的照片。</p>'}
        <div class="mBtns"><button class="cbtn" id="revX">關閉</button></div>`;
      mc.querySelectorAll('[data-st]').forEach(b => b.onclick = () => review(b.dataset.st));
      mc.querySelectorAll('.revRow [data-a]').forEach(b => b.onclick = async () => {
        const row = b.closest('.revRow');
        const r2 = await fetch(`${API}/admin/photo/${row.dataset.id}`, { method: 'POST', headers: { 'X-Admin-Key': k, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: b.dataset.a }) });
        if (r2.ok) row.remove(); else toast('沒成功');
      });
      $('#revX').onclick = () => $('#modal').classList.remove('on');
    } catch(e){ mc.innerHTML = `<h3>照片審核</h3><p>${esc(e.message)}</p><div class="mBtns"><button class="cbtn" id="revX">關閉</button></div>`; $('#revX').onclick = () => $('#modal').classList.remove('on'); }
  }

  // ───────── 推播通知：設定頁的「通知」開關 ─────────
  // 開關狀態只存在這裡（KEY_PUSH）；關掉遊戲時把「登山客快到山頂的時間」告訴伺服器，排程到時間就推播
  const KEY_PUSH = 'shanxing-push-v1';
  let pushOn = !!load(KEY_PUSH, false);
  const b64u8 = s => { const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)); return Uint8Array.from(b, c => c.charCodeAt(0)); };
  // 通知被拒絕時，怎麼到手機設定重新打開
  const PUSH_DENIED_HELP = (ios, home) => ios
    ? '通知被關掉了，手機不會再問。要打開：iPhone「設定」→「通知」→ 找到「山行小日子」→ 允許通知，再回來打開這個開關'
    : '通知被封鎖了，手機不會再問。要打開：點網址列左邊的鎖頭（或「⋮」→ 網站設定）→ 通知 → 允許，再回來打開這個開關';
  async function pushSet(on){
    if (!acct) throw new Error('先到山友大廳取個暱稱建帳號，才能收通知');
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent), home = window.matchMedia && matchMedia('(display-mode: standalone)').matches;
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window))
      throw new Error(ios && !home ? 'iPhone 要先按分享 →「加入主畫面」，從主畫面打開遊戲才能收通知' : '這個瀏覽器不支援通知');
    // 要開：先在按下的這一刻跳出允許視窗（iPhone 規定要緊接著點擊；先等別的東西會卡住）
    // 之前按過「不允許」，手機不會再問，只能到設定裡打開：直接說明步驟
    if (on && Notification.permission === 'denied') throw new Error(PUSH_DENIED_HELP(ios, home));
    const asked = on ? Notification.requestPermission() : null;
    // 用 getRegistration（馬上回答），不用 serviceWorker.ready（背景程式沒裝好時會永遠等下去）
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) throw new Error('遊戲還在準備背景程式，關掉重開一次再試');
    let sub = await reg.pushManager.getSubscription();
    if (!on) {
      if (sub) { await api('/push/sub', { method: 'DELETE', json: { endpoint: sub.endpoint } }).catch(() => {}); await sub.unsubscribe().catch(() => {}); }
      pushOn = false; store(KEY_PUSH, false); return false;
    }
    if (await asked !== 'granted') throw new Error(PUSH_DENIED_HELP(ios, home));
    const key = await api('/push/key').then(d => d.key).catch(() => null); if (!key) throw new Error('通知服務還沒準備好，晚點再試');
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u8(key) });
    await api('/push/sub', { json: { endpoint: sub.endpoint } });
    pushOn = true; store(KEY_PUSH, true); return true;
  }
  function sendEta(leaving){
    if (!acct || !pushOn) return;
    const e = leaving && SX.game && SX.game.summitEta ? SX.game.summitEta() : null;
    fetch(API + '/eta', { method: 'POST', keepalive: true, headers: { Authorization: 'Bearer ' + acct.token, 'Content-Type': 'application/json' }, body: JSON.stringify(e || { at: null }) }).catch(() => {});
  }
  document.addEventListener('visibilitychange', () => sendEta(document.hidden));

  SX.social = { open, close, uploadPhoto, fillWall, review, pushSet, get pushOn(){ return pushOn; }, get acct(){ return acct; }, get party(){ return party; } };
  if (acct) { refresh(); }
})();

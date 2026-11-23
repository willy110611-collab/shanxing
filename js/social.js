// 山行小日子 — 連線功能：帳號、山友大廳聊天、好友、一起爬、共享照片牆、照片審核
// 後端：Cloudflare Workers（server/ 資料夾）。帳號只存在這支手機上，另外給一組復原碼換手機用。
(function(){
  const API = self.SX_API;                 // 後端網址寫在 js/config.js（sw.js 也要用）
  const WS = API.replace(/^http/, 'ws') + '/ws';
  // 連線的節奏都在這裡。心跳字串要跟 server/src/index.js 的 PING／PONG 一字不差（伺服器用 setWebSocketAutoResponse 直接回，不叫醒房間）
  const PING = JSON.stringify({ type: 'ping' }), PONG = JSON.stringify({ type: 'pong' });
  const PING_MS = 25000;            // 心跳間隔
  const LOBBY_REFRESH_MS = 60000;   // 大廳畫面多久重新拿一次好友、邀請（打開大廳、切到好友分頁、加好友、送邀請、回覆邀請時會立刻拿）
  const PARTY_STATE_MS = 10000;     // 一起爬：多久回報一次自己的進度（隊友在登山畫面上照估計的步調慢慢走，不會跳）
  const REPORT_MS = 60000;          // 回報在爬哪座山、累積距離、拿回本週公里數（/me）：只有 report 這一處在送
  const KEY = 'shanxing-net-v1', KEY_PARTY = 'shanxing-party-v1', KEY_ADMIN = 'shanxing-admin-key';
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch(e){ return d; } };
  const store = (k, v) => { if (FAKE && k === KEY) return;   // 假帳號不存進手機
    try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch(e){} };
  const A = () => SX.audio || {};
  const MO = SX.motion;   // 介面動態效果（js/motion.js）：吐司、搖晃、骨架、下拉更新
  const toast = (msg, ms = 2400) => MO.toast(msg, ms);
  // 浮動標籤的輸入框：提示字聚焦時縮小移到框線上（樣式 .fl）
  const flIn = (attrs, label) => `<label class="fl"><input ${attrs} placeholder=" "><span><b>${label}</b></span></label>`;
  // 復原碼不對：輸入框變紅、整排搖一下；再打字就恢復
  const badCode = (form, input) => { input.classList.add('bad'); MO.shake(form); input.addEventListener('input', () => input.classList.remove('bad'), { once:true }); };
  const G = () => window.SXG || {};
  const mName = id => (SX.M[id] && SX.M[id].name) || id || '';
  const km = m => (Math.max(0, m || 0) / 1000).toFixed(2) + ' km';

  // 開發測試用：網址加 ?fakenet=1（或 localStorage 的 sx_fakenet 設成 '1'）就完全不連伺服器，
  // 用一個假帳號和假的好友、邀請、照片（晚 0.8 秒才回來，看得到骨架畫面和下拉更新；加 &fakems=8000 等更久）。玩家看不到入口；進入方式寫在管理手冊
  const FAKE = /[?&]fakenet=1\b/.test(location.search) || (() => { try { return localStorage.getItem('sx_fakenet') === '1'; } catch(e){ return false; } })();
  let acct = FAKE ? { id: 'dev', token: 'dev', name: '測試山友', code: 'TEST0001' } : load(KEY, null);          // { id, token, name, code }（假帳號不存進手機）
  // 一起爬的隊伍：{ id:隊伍房間（同一隊最早的那張邀請）, ids:這隊所有邀請, mountain, host:邀請人, mates:[{id,name}]（不含自己）}
  // 舊存檔只有 with（一位隊友）：換成 mates，host 等下次讀到邀請再補
  let party = load(KEY_PARTY, null);
  if (party && !party.mates) party = party.with ? { id: party.id, ids: [party.id], mountain: party.mountain, host: null, mates: [party.with] } : null;
  let invMt = null;   // 從山的卡片按「邀請山友」來的：好友分頁的山先選好這座

  // ───────── API ─────────
  // 假伺服器（只有 FAKE 時用）：每次拿好友清單，大家本週的公里數都會變一點，看得出下拉更新有重新拿
  let fakeN = 0;
  const FAKE_MS = +(location.search.match(/[?&]fakems=(\d+)/) || [])[1] || 800;   // 網址加 &fakems=8000：假伺服器要等 8 秒才回，慢慢看骨架畫面
  const FAKE_PICS = ['scene_descend', 'summit_alishan', 'summit_hehuan', 'summit_jiaming'];
  async function fakeApi(path, opt){
    await new Promise(r => setTimeout(r, FAKE_MS));   // 假裝網路要等一下（只有開發測試會走到這裡）
    const q = new URLSearchParams(path.split('?')[1] || ''), p = path.split('?')[0];
    if (p === '/friends' && !opt.body) { fakeN++; return { friends: [
      { id: 'f1', name: '阿山', online: true, mountain: 'xiangshan', dist: 820 + fakeN * 40, week: 5200 + fakeN * 130 },
      { id: 'f2', name: '小溪', online: false, week: 1200 + fakeN * 20 },
      { id: 'f3', name: '雲雀', online: true, week: 9800 + fakeN * 60 }] }; }
    if (p === '/friends') return { friend: { name: '新朋友' } };
    if (p === '/invites') return { invites: [] };
    if (p === '/me') return opt.body ? { week: 3400 + fakeN * 50, name: acct.name } : acct;
    if (p === '/photos' && !opt.body) fakeN++;   // 照片也是：每拿一次，海拔、審核狀態變一點
    if (p === '/photos' && q.get('mine')) return { photos: [{ id: 'd1', mountain: 'xiangshan', alt: 183, status: 'ok' }, { id: 'd2', mountain: 'qixing', alt: 1020, status: fakeN % 2 ? 'ok' : 'pending' }] };
    if (p === '/photos' && !opt.body) return { photos: [{ id: 'd3', by: '阿山', alt: 160 + fakeN, status: 'ok', owner: 'f1' }, { id: 'd4', by: '雲雀', alt: 230, status: 'ok', owner: 'f3' }].slice(0, 1 + (fakeN % 2)) };
    return {};
  }
  // 山友分享的照片網址（假伺服器用遊戲裡的插圖代替）
  const photoUrl = (id, mine) => FAKE ? SX.art.url(FAKE_PICS[id.charCodeAt(1) % FAKE_PICS.length]) : `${API}/photo/${id}${mine ? `?t=${encodeURIComponent(acct.token)}` : ''}`;
  async function api(path, opt = {}){
    if (FAKE) { if (opt.json !== undefined) opt.body = JSON.stringify(opt.json); return fakeApi(path, opt); }
    const h = Object.assign({}, opt.headers || {});
    if (acct && acct.token) h.Authorization = 'Bearer ' + acct.token;
    if (opt.json !== undefined) { h['Content-Type'] = 'application/json'; opt.body = JSON.stringify(opt.json); }
    let r;
    try { r = await fetch(API + path, { method: opt.method || (opt.body ? 'POST' : 'GET'), headers: h, body: opt.body }); }
    catch(e){ throw new Error('連不上伺服器，檢查一下網路'); }
    const d = await r.json().catch(() => ({}));
    if (r.status === 401 && acct) { throw new Error('登入失效，請到「我的帳號」用復原碼重新登入'); }
    if (!r.ok) throw new Error(d.error || ('連線出了點狀況（' + r.status + '），晚點再試'));
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
    if (FAKE) { Promise.resolve().then(() => on({ type: 'hello', history: [], people: [], plaza: 1 })); return { send(){}, close(){}, open: true }; }   // 假伺服器：一個空的廣場
    let ws = null, alive = true, tries = 0, ping = null;
    const R = { send: d => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(d)); }, close: () => { alive = false; clearInterval(ping); if (ws) try { ws.close(); } catch(e){} }, get open(){ return !!ws && ws.readyState === 1; } };
    const connect = () => {
      if (!alive || !acct) return;
      const pet = name === 'lobby' && SX.game && SX.game.pet ? `&pet=${encodeURIComponent(SX.game.pet() || '')}` : '';   // 廣場上帶著現在的寵物
      ws = new WebSocket(`${WS}?room=${encodeURIComponent(name)}&t=${encodeURIComponent(acct.token)}${pet}`);
      ws.onopen = () => { tries = 0; clearInterval(ping); ping = setInterval(() => { if (ws && ws.readyState === 1) ws.send(PING); }, PING_MS); on({ type: 'open' }); };
      ws.onmessage = e => { if (e.data === PONG) return; let d; try { d = JSON.parse(e.data); } catch(_){ return; } on(d); };
      ws.onclose = () => { clearInterval(ping); on({ type: 'closed' }); if (alive) setTimeout(connect, Math.min(15000, 1000 * 2 ** tries++)); };
      ws.onerror = () => {};
    };
    connect();
    return R;
  }

  // ───────── 大廳畫面 ─────────
  let netReady = false;   // 好友、邀請第一次從伺服器拿回來了沒（還沒就先放骨架畫面）
  let tab = 'plaza', lobby = null, msgs = [], people = [], friends = [], invites = [], plazaNo = 0, sayMax = 40, logOpen = false, chatHid = false;   // chatHid：廣場聊天框收起來，只剩一顆「聊天」小牌
  const PZ = () => SX.plaza;
  // 還沒有帳號：大廳裡面放一張「取暱稱」的木牌卡（不用蓋住整個畫面的彈出視窗，上面的「← 地圖」永遠按得到）
  // 不想取名字可以按「先不要」回地圖，之後想來再來；換手機的人直接在這張卡貼復原碼
  function renderWelcome(){
    const body = $('#lobbyBody'); if (!body) return;
    if (PZ()) PZ().unmount();
    body.classList.remove('plazaMode');
    body.innerHTML = `<div class="mCard lbWelcome"><h3>第一次來到山友大廳</h3>
      <p class="summitBig">取個暱稱，其他山友會看到這個名字。不急的話，可以先不要。</p>
      ${flIn('id="nmIn" class="txtIn" maxlength="12"', '暱稱（最多 12 個字）')}
      <div class="mBtns"><button class="cbtn" id="nmNo">先不要</button><button class="cbtn go" id="nmOk">進入大廳</button></div>
      <p class="tiny">已經有帳號（換新手機）？貼上復原碼：</p>
      <form class="pw" id="rsF0">${flIn('id="rsIn0"', '貼上復原碼')}<button class="cbtn sm">登入</button></form></div>`;
    $('#nmNo').onclick = () => { if (A().pop) A().pop(); if (G().go) G().go('map'); };
    $('#nmOk').onclick = async () => {
      const v = $('#nmIn').value.trim(); if (!v) { toast('先取個暱稱吧'); return; }
      $('#nmOk').disabled = true;
      try { await register(v); showRecovery(true, open); } catch(e){ toast(e.message, 3200); $('#nmOk').disabled = false; }
    };
    $('#rsF0').onsubmit = async e => { e.preventDefault(); const v = $('#rsIn0').value.trim(); if (!v) return;
      try { await restore(v); toast(`歡迎回來，${acct.name}`); open(); offerCloudLoad(); } catch(err){ toast(err.message, 3000); badCode($('#rsF0'), $('#rsIn0')); } };
  }
  function showRecovery(first, then){
    const mc = $('#mCard'); mc.innerHTML = `<h3>${first ? '帳號建好了！' : '我的復原碼'}</h3>
      <p class="summitBig">這是你的<b>復原碼</b>，換手機或清掉瀏覽器資料時，用它找回帳號。<br>請截圖或抄下來，不要給別人。</p>
      <div class="codeBox" id="rcBox">${esc(acct.token)}</div>
      <div class="mBtns"><button class="cbtn" id="rcCopy">複製</button><button class="cbtn go" id="rcOk">我存好了</button></div>`;
    $('#modal').classList.add('on');
    $('#rcCopy').onclick = () => { navigator.clipboard && navigator.clipboard.writeText(acct.token).then(() => toast('已複製'), () => toast('請長按文字複製')); };
    $('#rcOk').onclick = () => { $('#modal').classList.remove('on'); then && then(); };
  }
  function open(){
    render(); if (!acct) return;
    refresh();
    if (!lobby) lobby = room('lobby', onLobby);
    clearInterval(open._t); open._t = setInterval(refresh, LOBBY_REFRESH_MS);
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
      const [f, i] = await Promise.all([api('/friends'), api('/invites')]);   // 我的本週公里數（/me）由 report 每分鐘拿，這裡不重複拿
      friends = f.friends || []; invites = i.invites || [];
      checkParty();
      if (tab === 'friends') renderFriends();
      updateBadge();
    } catch(e){ if (tab !== 'plaza') toast(e.message, 3000); }
    if (!netReady) { netReady = true; if (tab === 'friends') renderFriends(); }
  }
  function updateBadge(){
    const n = invites.filter(v => v.guest === (acct && acct.id) && v.status === 'pending').length;
    $$('[data-go="lobby"]').forEach(b => b.dataset.badge = n ? String(n) : '');
  }
  function render(){
    $$('#scrLobby .tab').forEach(b => { b.classList.toggle('on', b.dataset.lt === tab); b.onclick = () => { if (A().pop) A().pop(); tab = b.dataset.lt; render(); if (tab === 'friends') refresh(); }; });
    if (!acct) return renderWelcome();   // 沒有帳號時每個分頁都先顯示取暱稱的卡（好友、帳號分頁都要有帳號）
    const body = $('#lobbyBody'); if (body) body.classList.toggle('plazaMode', tab === 'plaza');
    if (tab !== 'plaza' && PZ()) PZ().unmount();
    if (tab === 'plaza') renderPlaza(); else if (tab === 'friends') renderFriends(); else renderMe();
  }
  // 廣場分頁：整塊是廣場畫面，左下角聊天框，右下角打招呼
  function renderPlaza(){
    const body = $('#lobbyBody'); if (!body) return;
    body.innerHTML = `<div class="plzChat${logOpen ? ' open' : ''}${chatHid ? ' hid' : ''}" id="plzChat"><button class="plzChatTog" id="chatTog" type="button">${chatHid ? '聊天 ▴' : '收起 ▾'}</button><div class="plzLog" id="chatList"></div>
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
    $('#chatTog').onclick = () => { chatHid = !chatHid; $('#plzChat').classList.toggle('hid', chatHid); $('#chatTog').textContent = chatHid ? '聊天 ▴' : '收起 ▾'; if (A().pop) A().pop(); };
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
  const mtOpts = () => SX.MOUNTAINS.map(m => `<option value="${m.id}"${m.id === invMt ? ' selected' : ''}>${m.name}</option>`).join('');
  function personCard(p){
    const fr = friends.find(f => f.id === p.id), opts = mtOpts();
    const mc = $('#mCard'); $('#modal').classList.add('on');
    mc.innerHTML = `<h3>${esc(p.name)}</h3>
      ${fr ? `<p class="summitBig">你們是好友。要邀對方一起爬哪座山？</p><select id="pcMt" class="txtIn">${opts}</select>
        <div class="mBtns"><button class="cbtn" id="pcX">先不用</button><button class="cbtn go" id="pcInv">邀請一起爬</button></div>`
      : `<p class="summitBig">加好友後，就能邀對方一起爬山。</p>
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
    if (!netReady) { body.innerHTML = `<div class="setRow">${MO.skeleton(1, 40)}</div><div class="setRow">${MO.skeleton(3, 34)}</div>`; return; }
    const inc = invites.filter(v => v.guest === acct.id && v.status === 'pending');
    const opts = mtOpts();
    body.innerHTML = `${invMt ? `<div class="setRow"><h4>邀山友一起爬${esc(mName(invMt))}</h4><p>在下面的好友旁按「邀請」（山已經選好了），對方接受就會加入你的隊伍。</p></div>` : ''}
      <div class="setRow"><h4>我的好友碼 <span class="codeTag">${esc(acct.code)}</span></h4>
        <p>把好友碼給朋友，對方輸入後就成為好友。</p>
        <form class="pw" id="addF"><input id="fcIn" maxlength="8" placeholder="輸入朋友的好友碼" autocapitalize="characters"><button class="cbtn sm">加好友</button></form></div>
      ${inc.length ? `<div class="setRow"><h4>收到的邀請</h4>${inc.map(v => `<div class="frRow"><span><b>${esc(v.host_name)}</b> 邀你一起爬 <b>${esc(mName(v.mountain))}</b></span>
        <span><button class="cbtn go sm" data-acc="${v.id}">一起去</button><button class="cbtn sm" data-dec="${v.id}">下次</button></span></div>`).join('')}</div>` : ''}
      ${party ? `<div class="setRow"><h4>正在一起爬（${partySize(party.mountain)} 人）</h4><div class="frRow"><span>和 <b>${party.mates.map(x => esc(x.name)).join('、')}</b> 爬 <b>${esc(mName(party.mountain))}</b></span>
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
      if (yes && v) { v.status = 'accepted'; setParty(teamOf(v.host, d.mountain)); toast(`出發！和 ${v.host_name} 一起爬${mName(d.mountain)}`); if (G().startClimb) G().startClimb(d.mountain); }
      refresh();
    } catch(e){ toast(e.message, 3000); }
  }
  // 一隊＝同一位邀請人、同一座山、3 天內已接受的邀請：邀請人邀好幾位好友去同一座山，大家併成一隊（雪季 C+ 的山要三人以上）
  function teamOf(host, mountain){
    const done = load('shanxing-party-done', []);
    const L = invites.filter(v => v.host === host && v.mountain === mountain && v.status === 'accepted' && Date.now() - v.created < 3 * 864e5 && !done.includes(v.id)).sort((a, b) => a.created - b.created);
    if (!L.length) return null;
    const mates = [], add = (id, name) => { if (id !== acct.id && !mates.some(x => x.id === id)) mates.push({ id, name }); };
    add(L[0].host, L[0].host_name); L.forEach(v => add(v.guest, v.guest_name));
    return { id: L[0].id, ids: L.map(v => v.id), mountain, host, mates };
  }
  // 邀請人：看到對方接受了，就自動組隊；已經有隊伍時，又有人接受同一座山的邀請就加進來
  function checkParty(){
    if (!acct) return;
    if (party) {
      const inv = invites.find(v => v.id === party.id), host = party.host || (inv && inv.host), t = host && teamOf(host, party.mountain);
      if (!t || (t.id === party.id && t.mates.length === party.mates.length && party.host)) return;
      const add = t.mates.filter(x => !party.mates.some(y => y.id === x.id));
      setParty(t); if (add.length) toast(`${add.map(x => x.name).join('、')} 加入隊伍了！現在 ${partySize(t.mountain)} 人`, 3600);
      return;
    }
    const ok = invites.find(v => v.host === acct.id && v.status === 'accepted' && Date.now() - v.created < 3 * 864e5 && !(load('shanxing-party-done', [])).includes(v.id));
    if (ok) { setParty(teamOf(acct.id, ok.mountain)); toast(`${ok.guest_name} 接受邀請了！一起去爬${mName(ok.mountain)}吧`, 3600); }
  }
  // 這座山的隊伍有幾個人（自己＋隊友；寵物不算）。雪季管制看這個數字
  const partySize = mid => party && party.mountain === mid ? 1 + party.mates.length : 1;
  // 山的卡片按「邀請山友」：打開山友大廳的好友分頁，邀請的山先選好
  function openInvite(mid){ invMt = mid; tab = 'friends'; if (G().go) G().go('lobby'); }
  function setParty(p){
    if (!p && party) { const done = load('shanxing-party-done', []); done.push(...(party.ids || [party.id])); store('shanxing-party-done', done.slice(-30)); }
    party = p; store(KEY_PARTY, p); if (pRoom) { pRoom.close(); pRoom = null; } partyBox();
  }
  function renderMe(){
    const body = $('#lobbyBody'); if (!body) return;
    body.innerHTML = `
      <div class="setRow"><h4>暱稱</h4><form class="pw" id="nmF">${flIn(`id="nmIn2" maxlength="12" value="${esc(acct.name)}"`, '暱稱')}<button class="cbtn sm">改名</button></form></div>
      <div class="setRow"><h4>復原碼</h4><p>換手機時用來找回帳號，不要給別人。</p><button class="cbtn sm" id="showRc">顯示復原碼</button></div>
      <div class="setRow"><h4>換手機：用復原碼登入</h4><form class="pw" id="rsF">${flIn('id="rsIn"', '貼上復原碼')}<button class="cbtn sm">登入</button></form></div>
      <div class="setRow"><h4>雲端存檔</h4><p>進度每 3 分鐘自動備份到雲端（照片不備份），換手機登入後就能載回來。</p>
        <div class="mBtns" style="justify-content:flex-start"><button class="cbtn sm" id="cdUp">立刻備份</button><button class="cbtn sm" id="cdDown">從雲端載入</button></div></div>
      <div class="setRow"><h4>我上傳的照片</h4><div id="myPh">${MO.skeletonGrid(2)}</div></div>`;
    $('#nmF').onsubmit = async e => { e.preventDefault(); const v = $('#nmIn2').value.trim(); if (!v) return;
      try { const d = await api('/me', { json: { name: v } }); acct.name = d.name; store(KEY, acct); toast('改好了'); } catch(err){ toast(err.message, 3000); } };
    $('#showRc').onclick = () => showRecovery(false);
    $('#rsF').onsubmit = async e => { e.preventDefault(); const v = $('#rsIn').value.trim(); if (!v) return;
      try { await restore(v); toast(`歡迎回來，${acct.name}`); report(); if (lobby) { lobby.close(); lobby = room('lobby', onLobby); } refresh(); renderMe(); setTimeout(offerCloudLoad, 600); } catch(err){ toast(err.message, 3000); badCode($('#rsF'), $('#rsIn')); } };
    $('#cdUp').onclick = () => { lastSaved = ''; cloudSave(false); toast('備份好了'); };
    $('#cdDown').onclick = () => offerCloudLoad();
    myPhotos();
  }
  // 「我上傳的照片」：跟伺服器拿（帳號分頁往下拉也會重新拿）
  function myPhotos(){
    const el0 = $('#myPh'); if (!el0) return Promise.resolve();
    el0.innerHTML = MO.skeletonGrid(2);
    return api('/photos?mine=1').then(d => {
      const L = d.photos || [], st = { pending: '審核中', ok: '已公開', hidden: '未通過' }, el = $('#myPh'); if (!el) return;
      el.innerHTML = L.length ? '<div class="grid">' + L.map(p => `<div class="pol${likedOf('s:' + p.id)}" data-pv-t="${esc(mName(p.mountain))}" data-pv-s="${esc(`我上傳的・海拔 ${p.alt} m・${st[p.status] || p.status}`)}" data-like="s:${esc(p.id)}"><img src="${photoUrl(p.id, true)}" loading="lazy"><p>${esc(mName(p.mountain))}・${p.alt} m・${st[p.status] || p.status}</p></div>`).join('') + '</div>'
        : '<p>還沒有上傳過。休息時按「上傳照片」，審核通過後，走到同一段的山友就看得到。</p>';
    }).catch(e => { const el = $('#myPh'); if (el) el.innerHTML = `<p>${esc(e.message)}</p>`; });
  }
  // 看大圖按過「我喜歡」的照片，格子右上角有小愛心（記號存在遊戲存檔 SV.likes）
  const likedOf = k => { const S = window.SXG && SXG.SV; return S && S.likes && S.likes[k] ? ' liked' : ''; };

  // ───────── 一起爬：登山畫面上的隊友面板 ─────────
  let pRoom = null, mates = {}, stateT = 0;   // mates：隊友 id → 最新進度
  function partyBox(){
    let el = $('#partyBox');
    const M = G().M, on = party && M && M.id === party.mountain && $('#scrClimb.on');
    if (!on) { if (el) el.classList.remove('on'); if (SX.scene && SX.scene.setMates) SX.scene.setMates([]); return; }
    if (!el) {
      el = document.createElement('div'); el.id = 'partyBox'; el.className = 'partyBox'; $('#scrClimb').appendChild(el);
      el.innerHTML = '<b id="pbName"></b><span id="pbInfo"></span><button class="cbtn sm" id="cheerBtn">幫他加油</button>';
      $('#cheerBtn').onclick = () => {
        if (!party) return; const t = Date.now(); if (t - (partyBox._c || 0) < 3000) { toast('剛剛才加油過，等一下下'); return; } partyBox._c = t;
        if (pRoom) pRoom.send({ type: 'cheer' }); if (A().sparkle) A().sparkle(); toast('加油送出了！'); if (SX.game) SX.game.daily('cheer');
      };
    }
    el.classList.add('on');
    // 隊友有好幾位時，面板顯示走最前面的那位；登山畫面上每位隊友都畫出來
    const me = G().st, many = party.mates.length > 1, on2 = party.mates.filter(x => mates[x.id]);
    const lead = on2.slice().sort((a, b) => mates[b.id].dist - mates[a.id].dist)[0], mate = lead && mates[lead.id], d = mate && me ? mate.dist - me.dist : null;
    $('#pbName').textContent = `和 ${party.mates.map(x => x.name).join('、')} 一起爬`;
    $('#cheerBtn').textContent = many ? '幫大家加油' : '幫他加油';
    $('#pbInfo').textContent = !pRoom || !pRoom.open ? '連線中…' : mate ? `${many ? lead.name + ' ' : ''}${km(mate.dist)}・${d > 5 ? `領先你 ${Math.round(d)} m` : d < -5 ? `落後你 ${Math.round(-d)} m` : '就在你旁邊'}${mate.rest ? '・休息中' : ''}` : '等隊友上線…';
    if (SX.scene && SX.scene.setMates) SX.scene.setMates(me ? on2.map(x => ({ dist: mates[x.id].dist, name: x.name, rest: !!mates[x.id].rest })) : []);
  }
  function tick(){
    const M = G().M, st = G().st, climbing = M && st && $('#scrClimb.on');
    // 一起爬：連到隊伍房間，每 PARTY_STATE_MS 回報自己的進度
    if (party && climbing && M.id === party.mountain) {
      if (!pRoom) pRoom = room('party:' + party.id, d => {
        if (d.type === 'hello') (d.people || []).forEach(x => { if (x.id !== acct.id && x.state) mates[x.id] = x.state; });
        else if (d.type === 'state' && d.who.id !== acct.id) mates[d.who.id] = d.state;
        else if (d.type === 'cheer' && d.who.id !== acct.id) { toast(`${d.who.name} 幫你加油！體力 +5`, 2600); if (st) st.stam = Math.min(100, st.stam + 5); if (A().chime) A().chime(); }
        else if (d.type === 'leave' && d.who.id !== acct.id && mates[d.who.id]) mates[d.who.id] = Object.assign({}, mates[d.who.id], { rest: true });
        partyBox();
      });
      if (Date.now() - stateT >= PARTY_STATE_MS) { stateT = Date.now(); pRoom.send({ type: 'state', mountain: M.id, dist: st.dist, stam: st.stam, rest: !!(st.rest || st.sleep) }); }
    } else if (pRoom && !climbing) { pRoom.close(); pRoom = null; mates = {}; }
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
  setInterval(report, REPORT_MS);

  // ───────── 雲端存檔：有帳號就每 3 分鐘、離開畫面時備份一次（不含照片圖檔）─────────
  let lastSaved = '';
  function cloudSave(keep){
    if (!acct || !SX.game || FAKE) return;
    const txt = SX.game.getSave(); if (txt === lastSaved || txt.length > 390 * 1024) return;
    lastSaved = txt;
    fetch(API + '/save', { method: 'POST', headers: { Authorization: 'Bearer ' + acct.token, 'Content-Type': 'application/json' }, body: txt, keepalive: !!keep && txt.length < 60000 }).catch(() => { lastSaved = ''; });
  }
  setInterval(() => cloudSave(false), 180000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) cloudSave(true); });
  async function offerCloudLoad(){
    try {
      const d = await api('/save'); if (!d.data) { toast('雲端沒有存檔，從現在開始會自動備份'); return; }
      if (confirm(`雲端有 ${new Date(d.updated).toLocaleString('zh-TW')} 的存檔，要載入嗎？\n（會取代這支手機的進度，照片不會搬過來）`)) SX.game.applySave(d.data);
    } catch(e){ toast(e.message, 3000); }
  }
  setInterval(() => { if (acct && !$('#scrLobby.on')) api('/invites').then(i => { invites = i.invites || []; checkParty(); updateBadge(); }).catch(() => {}); }, 45000);

  // ───────── 共享照片：上傳、500 m 照片牆、檢舉 ─────────
  function uploadPhoto(canvas, rec){
    if (!acct) { toast('照片存在手機裡；到山友大廳建帳號，上傳的照片才會分享給山友', 3600); return; }
    canvas.toBlob(async blob => {
      if (!blob) return;
      try {
        const q = `?mountain=${encodeURIComponent(rec.mountainId)}&m=${rec.m}&alt=${rec.alt}`;
        await api('/photos' + q, { method: 'POST', body: blob, headers: { 'Content-Type': 'image/jpeg' } });
        toast('照片送出了，審核通過後，走到這一段的山友就看得到', 3600);
      } catch(e){ toast('分享沒成功：' + e.message, 3600); }
    }, 'image/jpeg', 0.75);
  }
  // 拍照視窗裡「其他山友在這一段拍的」：跟伺服器拿；整塊放在 .svWall 裡（沒有照片時是空的），視窗往下拉會重新拿
  async function fillWall(mountainId, mark, root){
    if (!acct || !root) return;
    let box = root.querySelector('.svWall');
    if (!box) { box = document.createElement('div'); box.className = 'svWall'; const at = root.querySelector('.mBtns'); at ? root.insertBefore(box, at) : root.appendChild(box); }
    box.dataset.mt = mountainId; box.dataset.mark = mark;
    box.innerHTML = MO.skeletonGrid(2);
    try {
      const d = await api(`/photos?mountain=${encodeURIComponent(mountainId)}&band=${Math.max(0, mark / 500 - 1)}`);
      const L = (d.photos || []).filter(p => p.status === 'ok' && p.owner !== acct.id);
      if (!box.isConnected) return;
      const mt = SX.M[mountainId], where = mt && mark >= mt.dist ? '山頂' : `${mark - 500}–${mark} m`;
      box.innerHTML = L.length ? `<h3>其他山友在這一段拍的</h3><div class="grid">${L.map(p => `<div class="pol${likedOf('s:' + p.id)}" data-pv-t="${esc(`${mName(mountainId)}・${where}`)}" data-pv-s="${esc(`${p.by || '山友'}・海拔 ${p.alt} m`)}" data-like="s:${esc(p.id)}"><img src="${photoUrl(p.id)}" loading="lazy"><p>${esc(p.by || '山友')}・${p.alt} m <button class="repBtn" data-rep="${p.id}">檢舉</button></p></div>`).join('')}</div>` : '';
      box.querySelectorAll('[data-rep]').forEach(b => b.onclick = async () => { if (!confirm('這張照片不恰當，要檢舉嗎？')) return; try { await api(`/photos/${b.dataset.rep}/report`, { method: 'POST' }); b.textContent = '已檢舉'; b.disabled = true; } catch(e){ toast(e.message); } });
    } catch(e){ if (box.isConnected) box.innerHTML = ''; }
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
        <div class="mBtns"><button class="cbtn" id="revX">← 返回</button></div>`;
      mc.querySelectorAll('[data-st]').forEach(b => b.onclick = () => review(b.dataset.st));
      mc.querySelectorAll('.revRow [data-a]').forEach(b => b.onclick = async () => {
        const row = b.closest('.revRow');
        const r2 = await fetch(`${API}/admin/photo/${row.dataset.id}`, { method: 'POST', headers: { 'X-Admin-Key': k, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: b.dataset.a }) });
        if (r2.ok) row.remove(); else toast('沒成功');
      });
      $('#revX').onclick = () => $('#modal').classList.remove('on');
    } catch(e){ mc.innerHTML = `<h3>照片審核</h3><p>${esc(e.message)}</p><div class="mBtns"><button class="cbtn" id="revX">← 返回</button></div>`; $('#revX').onclick = () => $('#modal').classList.remove('on'); }
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
  // 允許視窗被關掉、沒有選（permission 還是 default）：手機下次還會再問，不是被封鎖
  const PUSH_DISMISSED = '這次沒有允許，下次打開開關時還會再問一次';
  // 跳出允許視窗：新版瀏覽器回傳 Promise，舊版 Safari 只會呼叫 callback，兩種都接
  const askPermission = () => new Promise(res => {
    const p = Notification.requestPermission(res);
    if (p && p.then) p.then(res, () => res(Notification.permission));
  });
  async function pushSet(on){
    if (!acct) throw new Error('先到山友大廳取個暱稱建帳號，才能收通知');
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent), home = window.matchMedia && matchMedia('(display-mode: standalone)').matches;
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window))
      throw new Error(ios && !home ? 'iPhone 要先按分享 →「加入主畫面」，從主畫面打開遊戲才能收通知' : '這個瀏覽器不支援通知');
    // 要開：先在按下的這一刻跳出允許視窗（iPhone 規定要緊接著點擊；先等別的東西會卡住）
    // 之前按過「不允許」，手機不會再問，只能到設定裡打開：直接說明步驟
    if (on && Notification.permission === 'denied') throw new Error(PUSH_DENIED_HELP(ios, home));
    const asked = on ? askPermission() : null;
    // 用 getRegistration（馬上回答），不用 serviceWorker.ready（背景程式沒裝好時會永遠等下去）
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) throw new Error('遊戲還在準備，關掉重開再試一次');
    let sub = await reg.pushManager.getSubscription();
    if (!on) {
      if (sub) { await api('/push/sub', { method: 'DELETE', json: { endpoint: sub.endpoint } }).catch(() => {}); await sub.unsubscribe().catch(() => {}); }
      pushOn = false; store(KEY_PUSH, false); return false;
    }
    const ans = await asked;
    if (ans === 'denied') throw new Error(PUSH_DENIED_HELP(ios, home));
    if (ans !== 'granted') throw new Error(PUSH_DISMISSED);
    const key = await api('/push/key').then(d => d.key).catch(() => null); if (!key) throw new Error('通知服務還沒準備好，晚點再試');
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u8(key) });
    await api('/push/sub', { json: { endpoint: sub.endpoint } });
    pushOn = true; store(KEY_PUSH, true); return true;
  }
  function sendEta(leaving){
    if (!acct || !pushOn || FAKE) return;
    const e = leaving && SX.game && SX.game.summitEta ? SX.game.summitEta() : null;
    fetch(API + '/eta', { method: 'POST', keepalive: true, headers: { Authorization: 'Bearer ' + acct.token, 'Content-Type': 'application/json' }, body: JSON.stringify(e || { at: null }) }).catch(() => {});
  }
  document.addEventListener('visibilitychange', () => sendEta(document.hidden));

  // 下拉更新：好友分頁（好友、邀請）、帳號分頁（我上傳的照片）、拍照視窗裡的山友照片牆，都是跟伺服器拿的
  { const lb = $('#lobbyBody'); if (lb) MO.pull(lb, () => !!acct && (tab === 'friends' || tab === 'me'), () => tab === 'me' ? myPhotos() : refresh()); }
  { const mc = $('#mCard'); if (mc) MO.pull(mc, () => !!acct && !!mc.querySelector('.svWall') && $('#modal').classList.contains('on'), () => { const w = mc.querySelector('.svWall'); return w && fillWall(w.dataset.mt, +w.dataset.mark, mc); }); }
  SX.social = { open, close, uploadPhoto, fillWall, review, pushSet, get pushOn(){ return pushOn; }, get acct(){ return acct; }, get party(){ return party; }, partySize, openInvite };
  if (acct) { refresh(); report(); }
})();

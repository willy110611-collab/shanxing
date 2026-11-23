// 山行小日子 後端（Cloudflare Workers + D1 + Durable Objects）
// 帳號：訪客暱稱＋裝置上的登入碼（token）。token 同時是換手機用的復原碼，伺服器只存它的雜湊。
// 換手機也可以用「登入名＋密碼」（可選）：伺服器只存密碼的 PBKDF2 雜湊，登入後這支手機拿到自己的 token（sessions 表）。
import { DurableObject } from 'cloudflare:workers';

const MAX_PHOTO = 450 * 1024;      // 單張照片上限（遊戲端已縮到 720px）
const DAILY_PHOTOS = 20;           // 每人每天最多上傳幾張
const FRIEND_MAX = 999;            // 好友上限（唯一的定義；好友清單會把它一起回給遊戲端，遊戲端不另外寫死。測試時可用環境變數 FRIEND_MAX 改小）
const PLAZA_CAP = 50;              // 一個登山口廣場最多幾人
const PLAZA_MAX = 40;              // 最多開到第幾個廣場
const SAY_MAX = 40;                // 廣場說話一次最多幾個字（頭上冒字用；hello 會告訴遊戲端，輸入框照這個限制）
const PARTY_SAVE_MS = 60 * 1000;   // 一起爬：隊友最新進度多久最多存一次（存起來給離線時看；斷線時一定再存一次）
const PACE_MAX = 30;               // 一起爬：遊戲端給的步調最多幾公尺／秒（開發者快速模式約 20 倍，再大就是怪資料）
// 心跳：要跟 js/social.js 的 PING／PONG 一字不差。房間用 setWebSocketAutoResponse 直接回 PONG，不叫醒房間、不算錢
const PING = JSON.stringify({ type: 'ping' }), PONG = JSON.stringify({ type: 'pong' });

// ───────── 熱門山每日入園名額 ─────────
// 名額表只寫在這裡（遊戲端打開山的卡片時跟 GET /api/quota 拿）。不在表裡的山一律不限人數。
// 數字照真實世界每天的入園總量，不跟玩家人數縮放。peaks：遊戲裡哪些山（js/data.js 的 id）出發時要佔這個名額
const QUOTA = {
  // 玉山主峰：排雲山莊 136 床（2026-09-01 起由 116 床增加）＋單攻 60 人＝每天 196。來源：udn.com/news/story/7266/9655516
  yushan: { name: '玉山主峰', cap: 196, peaks: ['yushan'] },
  // 嘉明湖（向陽步道：走到嘉明湖、向陽山、三叉山都算）：每天 176。來源：台東林管處較早的總量管制報導 thenewslens.com/article/58242（可能已經過時，要再查新的公告）
  jiaming: { name: '嘉明湖', cap: 176, peaks: ['jiaming', 'xiangyang', 'sancha'] },
  // 雪山主峰：雪山登山口每天 160 人（平日、假日一樣，官方入園總量）。來源：hike.taiwan.gov.tw/bed_1.aspx（宿營地與床位概況）
  xueshan: { name: '雪山主峰', cap: 160, peaks: ['xueshan'] },
};
const QUOTA_OF = {};   // 山 id → 名額代號（由上面的表算出來，不另外寫）
for (const [k, q] of Object.entries(QUOTA)) for (const id of q.peaks) QUOTA_OF[id] = k;
const QUOTA_RL_WINDOW = 10 * 60 * 1000, QUOTA_RL_MAX = 20;   // 登記名額：每人 10 分鐘最多送 20 次（同一天同一座山本來就只算一次，這只是擋亂送）
// 台灣日期（UTC+8），半夜 12 點換日；名額每天重新算
const twDay = t => new Date(t + 8 * 3600e3).toISOString().slice(0, 10);
// 測試用時鐘：只有本機 wrangler dev 加 --var TEST_CLOCK:1 時，才看 X-Test-Now 標頭（正式環境沒有這個變數，永遠用真的時間）
const clock = (env, req) => (env.TEST_CLOCK === '1' && +req.headers.get('X-Test-Now')) || now();
// 登記一個名額：一句有條件的新增（今天人數還沒滿才寫進去；同一人同一天同一座山已經有就不重寫），人數由資料表的 trigger 跟著加一
// 一句 SQL 在 D1 裡是一次做完的，兩個人同時搶最後一格也只會有一個成功
async function quotaClaim(env, key, player, t){
  const day = twDay(t), cap = QUOTA[key].cap;
  const r = await env.DB.prepare('INSERT INTO quota_spots (day, quota, player, at) SELECT ?1, ?2, ?3, ?4 WHERE COALESCE((SELECT n FROM quota_count WHERE day = ?1 AND quota = ?2), 0) < ?5 ON CONFLICT(day, quota, player) DO NOTHING')
    .bind(day, key, player, t, cap).run();
  const c = await env.DB.prepare('SELECT n FROM quota_count WHERE day = ? AND quota = ?').bind(day, key).first();
  const used = c ? c.n : 0;
  if (r.meta.changes) return { ok: true, used, cap };
  const had = await env.DB.prepare('SELECT 1 FROM quota_spots WHERE day = ? AND quota = ? AND player = ?').bind(day, key, player).first();
  return had ? { ok: true, used, cap, again: true } : { ok: false, full: true, used, cap };
}

// ───────── 小工具 ─────────
const now = () => Date.now();
const rid = (n = 16) => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join('');
async function sha(s){ const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join(''); }
const CODE_CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const friendCode = () => [...crypto.getRandomValues(new Uint8Array(6))].map(b => CODE_CH[b % CODE_CH.length]).join('');
const cleanName = s => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 12);
const cleanText = s => String(s || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 200);

// ───────── 換手機用的密碼（登入名＋密碼）─────────
// 伺服器只存 PBKDF2-SHA256 算出來的雜湊：每人一組隨機鹽、反覆算 PW_ITER 次。密碼本身不存、不寫進紀錄。
// PW_ITER = 100000：Workers 的 WebCrypto 最多只准 10 萬次；實測一次約 14 ms CPU，只有登入、設密碼時算一次，
// 又有下面的猜密碼限制（每個登入名 15 分鐘內錯 5 次就鎖），偷到資料庫也要每組密碼各算 10 萬次才猜得到。
const PW_ITER = 100000, PW_MIN = 6, PW_MAX = 64;
const LOGIN_WINDOW = 15 * 60 * 1000;   // 猜密碼限制：這段時間內
const FAIL_NAME = 5;                   // 同一個登入名錯 5 次就鎖到時間到
const FAIL_IP = 20;                    // 同一個網路位址錯 20 次就鎖（手機網路常常很多人共用一個位址，所以放寬一點）
const LOGIN_BAD = '名字或密碼不對';     // 不管是沒有這個名字還是密碼錯，都回同一句話
const LOGIN_LOCK = '試太多次了，請 15 分鐘後再試';
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const unhex = s => new Uint8Array((s.match(/../g) || []).map(h => parseInt(h, 16)));
// 登入名：全形半形統一、英文不分大小寫、拿掉空白（「Ａ山」和「a 山」算同一個）
const loginKey = s => cleanName(String(s || '').normalize('NFKC').toLowerCase().replace(/\s+/g, ''));
async function pbkdf2(pw, salt, iter){
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, k, 256));
}
// 比對雜湊：每個位元組都比完才回答（不會因為前面就不一樣而比較快回）
function sameBytes(a, b){
  let d = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a[i] | 0) ^ (b[i] | 0);
  return d === 0;
}
async function hashPw(pw){
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { pw_hash: hex(await pbkdf2(pw, salt, PW_ITER)), pw_salt: hex(salt), pw_iter: PW_ITER };
}
const DUMMY_SALT = new Uint8Array(16);
async function checkPw(p, pw){
  // 沒有這個人或還沒設密碼：照樣算一次，回答時間跟密碼錯一樣，猜不出名字存不存在
  if (!p || !p.pw_hash) { await pbkdf2(pw, DUMMY_SALT, PW_ITER); return false; }
  return sameBytes(await pbkdf2(pw, unhex(p.pw_salt), p.pw_iter || PW_ITER), unhex(p.pw_hash));
}
// 猜密碼限制：login_fails 每個 key（n:登入名、ip:位址）記錯幾次、從什麼時候開始算
async function loginLocked(env, keys){
  for (const [k, max] of keys) {
    const r = await env.DB.prepare('SELECT n, first FROM login_fails WHERE k = ?').bind(k).first();
    if (r && now() - r.first < LOGIN_WINDOW && r.n >= max) return true;
  }
  return false;
}
async function loginFailed(env, keys){
  const t = now();
  await env.DB.batch(keys.map(([k]) => env.DB.prepare(
    'INSERT INTO login_fails (k, n, first) VALUES (?, 1, ?) ON CONFLICT(k) DO UPDATE SET n = CASE WHEN ? - first >= ? THEN 1 ELSE n + 1 END, first = CASE WHEN ? - first >= ? THEN ? ELSE first END'
  ).bind(k, t, t, LOGIN_WINDOW, t, LOGIN_WINDOW, t)));
}

function cors(env, req){
  const o = req.headers.get('Origin') || '';
  const ok = (env.ALLOW_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const allow = ok.includes(o) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o) ? o : ok[0] || '*';
  return { 'Access-Control-Allow-Origin': allow, 'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Admin-Key', 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS', 'Vary': 'Origin' };
}
const J = (env, req, data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors(env, req) } });
const E = (env, req, msg, status = 400) => J(env, req, { error: msg }, status);

async function auth(env, req, token){
  const t = token || (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!t || t.length < 20) return null;
  const h = await sha(t);
  // 先找帳號本來的登入碼（＝復原碼）；找不到再找「用名字＋密碼登入」的手機各自拿到的登入碼（sessions）
  const p = await env.DB.prepare('SELECT * FROM players WHERE token_hash = ?').bind(h).first()
    || await env.DB.prepare('SELECT p.* FROM sessions s JOIN players p ON p.id = s.player WHERE s.token_hash = ?').bind(h).first();
  if (!p || p.banned) return null;
  p.tokenHash = h;
  return p;
}
const isAdmin = (env, req) => env.ADMIN_KEY && (req.headers.get('X-Admin-Key') === env.ADMIN_KEY || new URL(req.url).searchParams.get('k') === env.ADMIN_KEY);
// 台灣時間每週一 00:00 換週
const weekNo = () => Math.floor((now() + 8 * 3600e3 - 4 * 864e5) / (7 * 864e5));
const friendMax = env => +env.FRIEND_MAX > 0 ? +env.FRIEND_MAX : FRIEND_MAX;
const pub = p => ({ id: p.id, name: p.name, code: p.code, mountain: p.mountain, dist: p.dist, pet: p.pet,
  walked: Math.round(p.walked || 0), summits: p.summits || 0, week: p.wk === weekNo() ? Math.max(0, Math.round((p.walked || 0) - (p.wk_base || 0))) : 0 });
// 「多久以前在線」只給好友看：只有好友清單（friendPub）會帶 ago（距離上次動靜幾毫秒，由伺服器算，不受手機時鐘影響），其他地方（廣場、自己、陌生人）一律不帶
const friendPub = p => ({ ...pub(p), ago: Math.max(0, now() - (p.seen || 0)) });
const MAX_SAVE = 400 * 1024;

// ───────── 推播通知 ─────────
// 推播本身不帶內容（不用做內容加密）：先把通知存進 push_queue，再叫醒手機；手機的 sw.js 收到後用自己的 endpoint 來拿內容。
// VAPID 金鑰：VAPID_PUBLIC（給瀏覽器訂閱用）、VAPID_PRIVATE（JWK，用來簽名），都是 secret。
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
let vapidKey = null;
async function vapidJwt(env, endpoint){
  if (!vapidKey) vapidKey = await crypto.subtle.importKey('jwk', JSON.parse(env.VAPID_PRIVATE), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const enc = o => b64u(new TextEncoder().encode(JSON.stringify(o)));
  const head = enc({ typ: 'JWT', alg: 'ES256' }), body = enc({ aud: new URL(endpoint).origin, exp: Math.floor(now() / 1000) + 12 * 3600, sub: 'https://willy110611-collab.github.io/shanxing/' });
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, vapidKey, new TextEncoder().encode(head + '.' + body));
  return head + '.' + body + '.' + b64u(sig);
}
async function wake(env, endpoint){
  if (!env.VAPID_PRIVATE || !env.VAPID_PUBLIC) return;
  try {
    const r = await fetch(endpoint, { method: 'POST', headers: { TTL: '86400', Urgency: 'normal', Authorization: `vapid t=${await vapidJwt(env, endpoint)}, k=${env.VAPID_PUBLIC}`, 'Content-Length': '0' } });
    if (r.status === 404 || r.status === 410) await env.DB.batch([env.DB.prepare('DELETE FROM push_subs WHERE endpoint = ?').bind(endpoint), env.DB.prepare('DELETE FROM push_queue WHERE endpoint = ?').bind(endpoint)]);   // 手機取消訂閱了
  } catch (e) {}
}
// 通知某位玩家（他所有訂閱過的手機）
async function notify(env, player, title, body, tag){
  const subs = (await env.DB.prepare('SELECT endpoint FROM push_subs WHERE player = ?').bind(player).all()).results;
  for (const s of subs) {
    await env.DB.prepare('INSERT INTO push_queue (endpoint, title, body, tag, created) VALUES (?, ?, ?, ?, ?)').bind(s.endpoint, title, body, tag || null, now()).run();
    await wake(env, s.endpoint);
  }
}

// ───────── 路由 ─────────
export default {
  // 排程（每 5 分鐘）：關掉遊戲的玩家，登山客快走到山頂了就通知；清掉放太久沒人拿的通知
  async scheduled(ev, env){
    const due = (await env.DB.prepare('SELECT * FROM eta WHERE sent = 0 AND at <= ? LIMIT 200').bind(now()).all()).results;
    for (const e of due) {
      await env.DB.prepare('UPDATE eta SET sent = 1 WHERE player = ?').bind(e.player).run();
      await notify(env, e.player, `快到${e.name}山頂了！`, '只差最後幾步了，回來一起見證登頂吧。', 'summit');
    }
    await env.DB.prepare('DELETE FROM push_queue WHERE created < ?').bind(now() - 3 * 864e5).run();
    await env.DB.prepare('DELETE FROM login_fails WHERE first < ?').bind(now() - LOGIN_WINDOW).run();   // 猜密碼紀錄過了時間就清掉
    const old = twDay(now() - 3 * 864e5);   // 入園名額：三天前的紀錄用不到了
    await env.DB.batch([env.DB.prepare('DELETE FROM quota_spots WHERE day < ?').bind(old), env.DB.prepare('DELETE FROM quota_count WHERE day < ?').bind(old), env.DB.prepare('DELETE FROM rate_limits WHERE first < ?').bind(now() - QUOTA_RL_WINDOW)]);
  },
  async fetch(req, env){
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors(env, req) });
    const url = new URL(req.url), path = url.pathname.replace(/\/+$/, ''), M = req.method;
    try {
      if (path === '/api/health') return J(env, req, { ok: true, t: now() });

      // 註冊：給一個暱稱，回傳 token（請存好，換手機用）
      if (path === '/api/register' && M === 'POST') {
        const b = await req.json().catch(() => ({}));
        const name = cleanName(b.name) || '山友';
        const token = rid(24), id = rid(8);
        let code = friendCode();
        for (let i = 0; i < 5; i++) { if (!await env.DB.prepare('SELECT 1 FROM players WHERE code = ?').bind(code).first()) break; code = friendCode(); }
        await env.DB.prepare('INSERT INTO players (id, token_hash, name, code, created, seen) VALUES (?, ?, ?, ?, ?, ?)').bind(id, await sha(token), name, code, now(), now()).run();
        return J(env, req, { id, token, name, code });
      }

      // 換手機：用登入名＋密碼登入，回傳這支手機自己的登入碼（跟用復原碼登入一樣是 token）
      if (path === '/api/login' && M === 'POST') {
        const b = await req.json().catch(() => ({}));
        const login = loginKey(b.name), pw = String(b.password || '');
        const keys = [['ip:' + (req.headers.get('CF-Connecting-IP') || 'local'), FAIL_IP]];
        if (login) keys.unshift(['n:' + login, FAIL_NAME]);
        if (await loginLocked(env, keys)) return E(env, req, LOGIN_LOCK, 429);
        const p = login && pw.length <= PW_MAX ? await env.DB.prepare('SELECT * FROM players WHERE login = ?').bind(login).first() : null;
        const ok = await checkPw(p, pw.slice(0, PW_MAX));
        if (!ok || p.banned) { await loginFailed(env, keys); return E(env, req, LOGIN_BAD, 400); }
        await env.DB.prepare('DELETE FROM login_fails WHERE k = ?').bind('n:' + login).run();
        const token = rid(24);
        await env.DB.batch([
          env.DB.prepare('INSERT INTO sessions (token_hash, player, created) VALUES (?, ?, ?)').bind(await sha(token), p.id, now()),
          // 每個帳號最多留 10 支用密碼登入的手機，太舊的自動登出
          env.DB.prepare('DELETE FROM sessions WHERE player = ? AND token_hash NOT IN (SELECT token_hash FROM sessions WHERE player = ? ORDER BY created DESC LIMIT 10)').bind(p.id, p.id),
        ]);
        return J(env, req, { id: p.id, token, name: p.name, code: p.code, login: p.login });
      }

      // 公開：照片圖檔（通過審核的；審核中的要管理金鑰或擁有者 token）
      let m;
      if ((m = path.match(/^\/api\/photo\/([0-9a-f]{16,40})$/)) && M === 'GET') {
        const ph = await env.DB.prepare('SELECT owner, status FROM photos WHERE id = ?').bind(m[1]).first();
        if (!ph) return E(env, req, 'not found', 404);
        if (ph.status !== 'ok' && !isAdmin(env, req)) {
          const me = await auth(env, req, url.searchParams.get('t'));
          if (!me || me.id !== ph.owner) return E(env, req, 'not found', 404);
        }
        const blob = await env.DB.prepare('SELECT type, data FROM photo_blobs WHERE id = ?').bind(m[1]).first();
        if (!blob) return E(env, req, 'not found', 404);
        return new Response(new Uint8Array(blob.data), { headers: { 'Content-Type': blob.type, 'Cache-Control': ph.status === 'ok' ? 'public, max-age=604800' : 'private, no-store', ...cors(env, req) } });
      }

      // 管理（照片審核）
      if (path.startsWith('/api/admin/')) {
        if (!isAdmin(env, req)) return E(env, req, 'forbidden', 403);
        if (path === '/api/admin/photos' && M === 'GET') {
          const st = url.searchParams.get('status') || 'pending';
          const r = await env.DB.prepare('SELECT p.*, pl.name AS by FROM photos p LEFT JOIN players pl ON pl.id = p.owner WHERE p.status = ? OR (? = \'reported\' AND p.reports > 0 AND p.status = \'ok\') ORDER BY p.created DESC LIMIT 100').bind(st, st).all();
          return J(env, req, { photos: r.results });
        }
        if ((m = path.match(/^\/api\/admin\/photo\/([0-9a-f]+)$/)) && M === 'POST') {
          const b = await req.json().catch(() => ({}));
          if (b.status === 'delete') { await env.DB.batch([env.DB.prepare('DELETE FROM photos WHERE id = ?').bind(m[1]), env.DB.prepare('DELETE FROM photo_blobs WHERE id = ?').bind(m[1])]); return J(env, req, { ok: true }); }
          if (!['ok', 'hidden', 'pending'].includes(b.status)) return E(env, req, 'bad status');
          await env.DB.prepare('UPDATE photos SET status = ?, reports = CASE WHEN ? = \'ok\' THEN 0 ELSE reports END WHERE id = ?').bind(b.status, b.status, m[1]).run();
          return J(env, req, { ok: true });
        }
        if ((m = path.match(/^\/api\/admin\/ban\/([0-9a-f]+)$/)) && M === 'POST') {
          await env.DB.prepare('UPDATE players SET banned = 1 WHERE id = ?').bind(m[1]).run();
          await env.DB.prepare('UPDATE photos SET status = \'hidden\' WHERE owner = ?').bind(m[1]).run();
          return J(env, req, { ok: true });
        }
        return E(env, req, 'not found', 404);
      }

      // 推播：公開金鑰（瀏覽器訂閱用）、手機收到推播後來拿通知內容（用自己的 endpoint 當鑰匙，拿完就刪）
      if (path === '/api/push/key' && M === 'GET') return J(env, req, { key: env.VAPID_PUBLIC || null });
      if (path === '/api/push/pending' && M === 'GET') {
        const ep = url.searchParams.get('e') || '';
        const r = (await env.DB.prepare('SELECT id, title, body, tag FROM push_queue WHERE endpoint = ? ORDER BY id LIMIT 10').bind(ep).all()).results;
        if (r.length) await env.DB.prepare('DELETE FROM push_queue WHERE endpoint = ? AND id <= ?').bind(ep, r[r.length - 1].id).run();
        return J(env, req, { notes: r });
      }

      // 即時房間（大廳／一起爬）：WebSocket
      if (path === '/api/ws') {
        if (req.headers.get('Upgrade') !== 'websocket') return E(env, req, 'need websocket', 426);
        const me = await auth(env, req, url.searchParams.get('t'));
        if (!me) return E(env, req, 'unauthorized', 401);
        const room = (url.searchParams.get('room') || 'lobby').replace(/[^a-z0-9:_-]/gi, '').slice(0, 48);
        if (room.startsWith('party:')) {
          const inv = await env.DB.prepare('SELECT * FROM invites WHERE id = ? AND status = \'accepted\'').bind(room.slice(6)).first();
          // 一隊＝同一位邀請人、同一座山已接受的邀請：同隊的其他隊友也能進這個房間（三人以上一起爬）
          const mate = inv && inv.host !== me.id && inv.guest !== me.id && await env.DB.prepare('SELECT 1 FROM invites WHERE guest = ? AND status = \'accepted\' AND host = ? AND mountain = ?').bind(me.id, inv.host, inv.mountain).first();
          if (!inv || (inv.host !== me.id && inv.guest !== me.id && !mate)) return E(env, req, 'forbidden', 403);
        } else if (room !== 'lobby') return E(env, req, 'bad room');
        const qp = url.searchParams.get('pet'), pet = qp !== null ? (/^[a-z]{1,16}$/.test(qp) ? qp : null) : me.pet;   // 現在帶著的寵物（廣場上跟在身邊）
        const fwd = () => { const f = new Request(req.url, req); f.headers.set('X-Player', JSON.stringify({ id: me.id, name: me.name, pet })); return f; };
        if (room !== 'lobby') return env.ROOM.get(env.ROOM.idFromName(room)).fetch(fwd());
        // 登山口廣場：一個廣場最多 PLAZA_CAP 人，滿了就依序開到廣場 2、3…（房間自己判斷滿了沒，不會兩個人同時擠進最後一格）
        for (let n = 1; n <= PLAZA_MAX; n++) {
          const f = fwd(); f.headers.set('X-Plaza', String(n));
          const r = await env.ROOM.get(env.ROOM.idFromName(n === 1 ? 'lobby' : 'lobby' + n)).fetch(f);
          if (r.status !== 409) return r;
        }
        return E(env, req, '廣場都客滿了，等一下再來', 503);
      }

      // 熱門山入園名額：名額表＋今天用了幾個（不用登入也能看）；有帶登入碼的話多回「我今天已經登記了哪幾座」
      if (path === '/api/quota' && M === 'GET') {
        const t = clock(env, req), day = twDay(t), keys = Object.keys(QUOTA);
        const used = {}; for (const r of (await env.DB.prepare('SELECT quota, n FROM quota_count WHERE day = ?').bind(day).all()).results) used[r.quota] = r.n;
        const who = req.headers.get('Authorization') ? await auth(env, req) : null;
        const mine = who ? (await env.DB.prepare(`SELECT quota FROM quota_spots WHERE day = ? AND player = ? AND quota IN (${keys.map(() => '?').join(',')})`).bind(day, who.id, ...keys).all()).results.map(r => r.quota) : [];
        return J(env, req, { day, quotas: keys.map(k => ({ id: k, name: QUOTA[k].name, cap: QUOTA[k].cap, used: Math.min(used[k] || 0, QUOTA[k].cap), peaks: QUOTA[k].peaks })), mine });
      }

      // 以下都要登入
      const me = await auth(env, req);
      if (!me) return E(env, req, 'unauthorized', 401);

      if (path === '/api/me' && M === 'GET') {
        await env.DB.prepare('UPDATE players SET seen = ? WHERE id = ?').bind(now(), me.id).run();
        return J(env, req, { ...pub(me), login: me.pw_hash ? me.login : null });   // login 只回給自己：有設密碼才有
      }
      // 設定／更改換手機用的密碼：登入名不能跟別人重複（登入時才找得到唯一的帳號）
      if (path === '/api/password' && M === 'POST') {
        const b = await req.json().catch(() => ({}));
        const login = loginKey(b.login), pw = String(b.password || '');
        if (login.length < 2) return E(env, req, '登入名至少 2 個字');
        if (pw.length < PW_MIN) return E(env, req, `密碼至少 ${PW_MIN} 個字`);
        if (pw.length > PW_MAX) return E(env, req, `密碼最多 ${PW_MAX} 個字`);
        if (await env.DB.prepare('SELECT 1 FROM players WHERE login = ? AND id != ?').bind(login, me.id).first()) return E(env, req, '這個登入名已經有人用了，換一個（例如加上數字）', 409);
        const h = await hashPw(pw);
        try {
          await env.DB.batch([
            env.DB.prepare('UPDATE players SET login = ?, pw_hash = ?, pw_salt = ?, pw_iter = ? WHERE id = ?').bind(login, h.pw_hash, h.pw_salt, h.pw_iter, me.id),
            // 改密碼後，其他用密碼登入的手機要重新登入（這支手機和復原碼不受影響）
            env.DB.prepare('DELETE FROM sessions WHERE player = ? AND token_hash != ?').bind(me.id, me.tokenHash),
          ]);
        } catch (e) { if (!/UNIQUE/i.test(String(e && e.message))) throw e; return E(env, req, '這個登入名已經有人用了，換一個（例如加上數字）', 409); }   // 兩個人同時搶同一個名字：資料庫的唯一索引擋下來
        return J(env, req, { ok: true, login });
      }
      if (path === '/api/me' && M === 'POST') {
        const b = await req.json().catch(() => ({}));
        const name = b.name !== undefined ? (cleanName(b.name) || me.name) : me.name;
        // 累積距離只會往上加（避免換手機、清存檔把排行洗掉）；換週時把本週起點設成上週結束時的累積值
        const walked = Math.max(me.walked || 0, Math.min(+b.walked || 0, 5e7)), summits = Math.max(me.summits || 0, Math.min(+b.summits || 0, 1e5));
        const wk = weekNo(), wkBase = me.wk === wk ? (me.wk_base || 0) : (me.walked || 0);
        await env.DB.prepare('UPDATE players SET name = ?, mountain = ?, dist = ?, pet = ?, seen = ?, walked = ?, summits = ?, wk = ?, wk_base = ? WHERE id = ?')
          .bind(name, b.mountain === undefined ? me.mountain : (b.mountain ? String(b.mountain).slice(0, 24) : null), +b.dist >= 0 ? +b.dist : me.dist, b.pet === undefined ? me.pet : (b.pet ? String(b.pet).slice(0, 16) : null), now(), walked, summits, wk, wkBase, me.id).run();
        return J(env, req, { ok: true, name, week: Math.round(walked - wkBase) });
      }

      // 熱門山入園名額：出發時登記（同一天同一座山再出發不會多算）。不在名額表的山直接放行，不寫資料庫
      // 離線時出發的，遊戲端之後補送（帶 day）：只收今天的，滿了就算了
      if (path === '/api/quota/claim' && M === 'POST') {
        const b = await req.json().catch(() => ({}));
        const key = QUOTA_OF[String(b.mountain || '')], t = clock(env, req);
        if (!key) return J(env, req, { ok: true, open: true });
        if (b.day && b.day !== twDay(t)) return J(env, req, { ok: false, stale: true });
        const rl = await env.DB.prepare('INSERT INTO rate_limits (k, n, first) VALUES (?1, 1, ?2) ON CONFLICT(k) DO UPDATE SET n = CASE WHEN ?2 - first >= ?3 THEN 1 ELSE n + 1 END, first = CASE WHEN ?2 - first >= ?3 THEN ?2 ELSE first END RETURNING n')
          .bind('quota:' + me.id, now(), QUOTA_RL_WINDOW).first();
        if (rl && rl.n > QUOTA_RL_MAX) return E(env, req, '按太快了，等幾分鐘再試', 429);
        return J(env, req, Object.assign({ quota: key, name: QUOTA[key].name }, await quotaClaim(env, key, me.id, t)));
      }

      // 雲端存檔（不含照片圖檔）
      if (path === '/api/save' && M === 'GET') {
        const s = await env.DB.prepare('SELECT data, updated FROM saves WHERE id = ?').bind(me.id).first();
        return J(env, req, s ? { data: s.data, updated: s.updated } : { data: null });
      }
      if (path === '/api/save' && M === 'POST') {
        const txt = await req.text();
        if (txt.length > MAX_SAVE) return E(env, req, '存檔太大');
        try { JSON.parse(txt); } catch (e) { return E(env, req, '存檔格式不對'); }
        await env.DB.prepare('INSERT INTO saves (id, data, updated) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated = excluded.updated').bind(me.id, txt, now()).run();
        return J(env, req, { ok: true, updated: now() });
      }

      // 推播訂閱（設定頁的「通知」開關）
      if (path === '/api/push/sub' && (M === 'POST' || M === 'DELETE')) {
        const b = await req.json().catch(() => ({})), ep = String(b.endpoint || '');
        if (!/^https:\/\/[^\s]{10,800}$/.test(ep)) return E(env, req, '訂閱資料不對');
        if (M === 'DELETE') { await env.DB.prepare('DELETE FROM push_subs WHERE endpoint = ? AND player = ?').bind(ep, me.id).run(); return J(env, req, { ok: true }); }
        await env.DB.prepare('INSERT INTO push_subs (endpoint, player, created) VALUES (?, ?, ?) ON CONFLICT(endpoint) DO UPDATE SET player = excluded.player').bind(ep, me.id, now()).run();
        return J(env, req, { ok: true });
      }
      // 關掉遊戲時：登山客預計走到山頂前的時間（at 為空＝取消，例如玩家回到遊戲了）
      if (path === '/api/eta' && M === 'POST') {
        const b = await req.json().catch(() => ({}));
        if (!b.at) { await env.DB.prepare('DELETE FROM eta WHERE player = ?').bind(me.id).run(); return J(env, req, { ok: true }); }
        const at = Math.max(now() + 60e3, Math.min(+b.at || 0, now() + 3 * 864e5));
        await env.DB.prepare('INSERT INTO eta (player, mountain, name, at, sent) VALUES (?, ?, ?, ?, 0) ON CONFLICT(player) DO UPDATE SET mountain = excluded.mountain, name = excluded.name, at = excluded.at, sent = 0')
          .bind(me.id, String(b.mountain || '').slice(0, 24), cleanName(b.name) || '山', at).run();
        return J(env, req, { ok: true });
      }

      // 好友
      if (path === '/api/friends' && M === 'GET') {
        const r = await env.DB.prepare('SELECT p.* FROM friends f JOIN players p ON p.id = f.b WHERE f.a = ? AND p.banned = 0 ORDER BY p.seen DESC').bind(me.id).all();
        return J(env, req, { friends: r.results.map(friendPub), max: friendMax(env) });
      }
      if (path === '/api/friends' && M === 'POST') {
        const b = await req.json().catch(() => ({}));
        // 用好友碼加，或在登山口廣場點對方角色直接加（給對方的 id）
        const code = String(b.code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''), pid = String(b.id || '').replace(/[^0-9a-f]/g, '');
        const f = pid ? await env.DB.prepare('SELECT * FROM players WHERE id = ? AND banned = 0').bind(pid).first()
          : await env.DB.prepare('SELECT * FROM players WHERE code = ? AND banned = 0').bind(code).first();
        if (!f) return E(env, req, pid ? '找不到這位山友' : '找不到這個好友碼', 404);
        if (f.id === me.id) return E(env, req, '這是你自己的好友碼');
        // 好友上限：已經是好友就不再算；兩邊（加的人、被加的人）都要沒滿
        if (!await env.DB.prepare('SELECT 1 FROM friends WHERE a = ? AND b = ?').bind(me.id, f.id).first()) {
          const cnt = await env.DB.prepare('SELECT (SELECT COUNT(*) FROM friends WHERE a = ?) AS mine, (SELECT COUNT(*) FROM friends WHERE a = ?) AS theirs').bind(me.id, f.id).first();
          if (cnt.mine >= friendMax(env) || cnt.theirs >= friendMax(env)) return E(env, req, `好友已經 ${friendMax(env)} 位了，先整理一下再加`, 409);
        }
        await env.DB.batch([
          env.DB.prepare('INSERT OR IGNORE INTO friends (a, b, created) VALUES (?, ?, ?)').bind(me.id, f.id, now()),
          env.DB.prepare('INSERT OR IGNORE INTO friends (a, b, created) VALUES (?, ?, ?)').bind(f.id, me.id, now())
        ]);
        return J(env, req, { friend: friendPub(f) });
      }
      if ((m = path.match(/^\/api\/friends\/([0-9a-f]+)$/)) && M === 'DELETE') {
        // 移除好友：兩個方向一起刪；兩人之間還沒回覆的邀請一併取消。已經接受、正在一起爬的邀請不動（爬到一半隊伍不會散）
        await env.DB.batch([
          env.DB.prepare('DELETE FROM friends WHERE a = ? AND b = ?').bind(me.id, m[1]),
          env.DB.prepare('DELETE FROM friends WHERE a = ? AND b = ?').bind(m[1], me.id),
          env.DB.prepare("DELETE FROM invites WHERE status = 'pending' AND ((host = ? AND guest = ?) OR (host = ? AND guest = ?))").bind(me.id, m[1], m[1], me.id)
        ]);
        return J(env, req, { ok: true });
      }

      // 一起爬：邀請
      if (path === '/api/invites' && M === 'GET') {
        const r = await env.DB.prepare(`SELECT i.*, h.name AS host_name, g.name AS guest_name FROM invites i
          JOIN players h ON h.id = i.host JOIN players g ON g.id = i.guest
          WHERE (i.guest = ? OR i.host = ? OR (i.status = 'accepted' AND EXISTS (SELECT 1 FROM invites j WHERE j.guest = ? AND j.status = 'accepted' AND j.host = i.host AND j.mountain = i.mountain)))
          AND i.created > ? ORDER BY i.created DESC LIMIT 20`).bind(me.id, me.id, me.id, now() - 7 * 864e5).all();   // 也列出同隊其他隊友接受的邀請：被邀的人才知道隊伍有幾個人
        return J(env, req, { invites: r.results });
      }
      if (path === '/api/invites' && M === 'POST') {
        const b = await req.json().catch(() => ({}));
        const fr = await env.DB.prepare('SELECT 1 FROM friends WHERE a = ? AND b = ?').bind(me.id, String(b.friend || '')).first();
        if (!fr) return E(env, req, '只能邀請好友');
        const id = rid(8);
        await env.DB.prepare('INSERT INTO invites (id, host, guest, mountain, created) VALUES (?, ?, ?, ?, ?)').bind(id, me.id, b.friend, String(b.mountain || '').slice(0, 24), now()).run();
        await notify(env, b.friend, `${me.name} 邀你一起爬山`, '打開山友大廳的「好友」看看要不要一起去。', 'invite');
        return J(env, req, { id });
      }
      if ((m = path.match(/^\/api\/invites\/([0-9a-f]+)$/)) && M === 'POST') {
        const b = await req.json().catch(() => ({}));
        const inv = await env.DB.prepare('SELECT * FROM invites WHERE id = ?').bind(m[1]).first();
        if (!inv || inv.guest !== me.id) return E(env, req, 'not found', 404);
        const status = b.accept ? 'accepted' : 'declined';
        await env.DB.prepare('UPDATE invites SET status = ? WHERE id = ?').bind(status, m[1]).run();
        if (b.accept) await notify(env, inv.host, `${me.name} 接受了你的邀請`, '一起出發吧！打開遊戲就能一起爬。', 'invite');
        return J(env, req, { ok: true, status, mountain: inv.mountain });
      }

      // 照片：上傳（原始 jpeg 位元組放在 body，其他資訊放網址參數）
      if (path === '/api/photos' && M === 'POST') {
        const type = req.headers.get('Content-Type') || '';
        if (!/^image\/(jpeg|webp|png)$/.test(type)) return E(env, req, '只接受 jpg / webp / png');
        const buf = await req.arrayBuffer();
        if (buf.byteLength > MAX_PHOTO) return E(env, req, '照片太大了');
        if (buf.byteLength < 2000) return E(env, req, '照片太小了');
        const day = await env.DB.prepare('SELECT COUNT(*) AS n FROM photos WHERE owner = ? AND created > ?').bind(me.id, now() - 864e5).first();
        if (day.n >= DAILY_PHOTOS) return E(env, req, `今天已經上傳 ${DAILY_PHOTOS} 張了，明天再來`);
        const mt = String(url.searchParams.get('mountain') || '').slice(0, 24), mm = Math.max(0, +url.searchParams.get('m') || 0);
        const alt = Math.round(+url.searchParams.get('alt') || 0), cap = cleanText(url.searchParams.get('caption')).slice(0, 40);
        if (!mt) return E(env, req, '缺少山的名稱');
        const id = rid(10), band = Math.floor(mm / 500);
        await env.DB.batch([
          env.DB.prepare('INSERT INTO photos (id, owner, mountain, m, alt, band, caption, status, bytes, created) VALUES (?, ?, ?, ?, ?, ?, ?, \'pending\', ?, ?)').bind(id, me.id, mt, mm, alt, band, cap, buf.byteLength, now()),
          env.DB.prepare('INSERT INTO photo_blobs (id, type, data) VALUES (?, ?, ?)').bind(id, type, buf)
        ]);
        return J(env, req, { id, status: 'pending', band });
      }
      // 照片：某座山某一段（每 500 公尺一組）
      if (path === '/api/photos' && M === 'GET') {
        const mt = String(url.searchParams.get('mountain') || ''), band = url.searchParams.get('band');
        let r;
        if (band !== null) r = await env.DB.prepare('SELECT p.id, p.owner, p.mountain, p.m, p.alt, p.band, p.caption, p.status, p.created, pl.name AS by FROM photos p LEFT JOIN players pl ON pl.id = p.owner WHERE p.mountain = ? AND p.band = ? AND (p.status = \'ok\' OR p.owner = ?) ORDER BY p.created DESC LIMIT 30').bind(mt, +band, me.id).all();
        else if (url.searchParams.get('mine')) r = await env.DB.prepare('SELECT id, mountain, m, alt, band, caption, status, created FROM photos WHERE owner = ? ORDER BY created DESC LIMIT 100').bind(me.id).all();
        else r = await env.DB.prepare('SELECT band, COUNT(*) AS n FROM photos WHERE mountain = ? AND status = \'ok\' GROUP BY band').bind(mt).all();
        return J(env, req, { photos: r.results });
      }
      if ((m = path.match(/^\/api\/photos\/([0-9a-f]+)\/report$/)) && M === 'POST') {
        const ins = await env.DB.prepare('INSERT OR IGNORE INTO reports (photo, reporter, created) VALUES (?, ?, ?)').bind(m[1], me.id, now()).run();
        if (ins.meta.changes) await env.DB.prepare('UPDATE photos SET reports = reports + 1, status = CASE WHEN reports + 1 >= 3 THEN \'pending\' ELSE status END WHERE id = ?').bind(m[1]).run();
        return J(env, req, { ok: true });
      }
      if ((m = path.match(/^\/api\/photos\/([0-9a-f]+)$/)) && M === 'DELETE') {
        const ph = await env.DB.prepare('SELECT owner FROM photos WHERE id = ?').bind(m[1]).first();
        if (!ph || ph.owner !== me.id) return E(env, req, 'not found', 404);
        await env.DB.batch([env.DB.prepare('DELETE FROM photos WHERE id = ?').bind(m[1]), env.DB.prepare('DELETE FROM photo_blobs WHERE id = ?').bind(m[1])]);
        return J(env, req, { ok: true });
      }

      return E(env, req, 'not found', 404);
    } catch (err) {
      return E(env, req, 'server error: ' + (err && err.message || err), 500);
    }
  }
};

// ───────── 即時房間：大廳聊天、一起爬的同步 ─────────
// 用 WebSocket Hibernation，沒人說話時不計費。
export class Room extends DurableObject {
  constructor(ctx, env){
    super(ctx, env);
    // 廣場和一起爬都是這個房間：收到一字不差的 PING，Cloudflare 直接回 PONG，不會叫醒房間（webSocketMessage 不會跑）
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair(PING, PONG));
  }
  async fetch(req){
    const who = JSON.parse(req.headers.get('X-Player') || '{}'), plaza = +req.headers.get('X-Plaza') || 0;
    // 廣場客滿（同一個人重連不算）：回 409，讓外面改試下一個廣場
    if (plaza) { const ppl = this.people(); if (ppl.length >= PLAZA_CAP && !ppl.some(p => p.id === who.id)) return new Response('full', { status: 409 }); }
    const pair = new WebSocketPair(), [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    // 廣場上的起點：入口附近隨機一點（x 0～1 左右，y 0～1 遠到近）
    const pos = { x: 0.3 + Math.random() * 0.4, y: 0.72 + Math.random() * 0.2 };
    server.serializeAttachment({ ...who, last: 0, lastMv: 0, lastEm: 0, state: null, pos, party: !plaza, saved: 0 });
    const hist = plaza ? (await this.ctx.storage.get('hist')) || [] : [];
    // 一起爬：away＝存起來、現在沒連著的隊友最後進度（遊戲端照這個估計離線隊友走到哪）；now 給遊戲端對時
    const away = plaza ? undefined : await this.away();
    server.send(JSON.stringify({ type: 'hello', you: who.id, plaza, sayMax: SAY_MAX, history: hist, people: this.people(), away, now: Date.now() }));
    this.broadcast({ type: 'join', who: { id: who.id, name: who.name, pet: who.pet, pos } }, server);
    return new Response(null, { status: 101, webSocket: client });
  }
  people(){
    const seen = {}, out = [];
    for (const ws of this.ctx.getWebSockets()) { const a = ws.deserializeAttachment() || {}; if (!a.id || seen[a.id]) continue; seen[a.id] = 1; out.push({ id: a.id, name: a.name, pet: a.pet, state: a.state, pos: a.pos }); }
    return out;
  }
  // 一起爬：存起來的隊友最後進度（一人一列 m:<玩家 id>），扣掉現在連著的人
  async away(){
    const on = new Set(this.people().map(p => p.id)), out = [];
    for (const [, v] of await this.ctx.storage.list({ prefix: 'm:' })) if (v && v.id && !on.has(v.id)) out.push(v);
    return out;
  }
  // 一起爬：把這個人的最新進度存起來（只寫他自己那一列；同一筆進度不重複寫）
  async keep(ws, a){
    if (!a.party || !a.id || !a.state || a.saved === a.state.t) return;
    a.saved = a.state.t; try { ws.serializeAttachment(a); } catch (e) {}
    await this.ctx.storage.put('m:' + a.id, { id: a.id, name: a.name, state: a.state });
  }
  // 斷線：一起爬先存最後進度，再告訴隊友他離線了（off＋state）；同一個人還開著別的分頁就只說 stay，不算離線
  // 舊版遊戲只看 type:'leave'，多的欄位不影響
  async gone(ws){
    const a = ws.deserializeAttachment() || {}; try { ws.close(); } catch (e) {}
    await this.keep(ws, a);
    const still = this.ctx.getWebSockets().some(x => x !== ws && (x.deserializeAttachment() || {}).id === a.id);
    this.broadcast({ type: 'leave', who: { id: a.id, name: a.name }, ...(still ? { stay: true } : a.party && a.state ? { off: true, state: a.state, now: Date.now() } : {}) }, ws);
  }
  broadcast(msg, except){ const s = JSON.stringify(msg); for (const ws of this.ctx.getWebSockets()) if (ws !== except) { try { ws.send(s); } catch (e) {} } }
  async webSocketMessage(ws, raw){
    let d; try { d = JSON.parse(raw); } catch (e) { return; }
    const a = ws.deserializeAttachment() || {};
    if (d.type === 'chat') {
      const t = Date.now(); if (t - (a.last || 0) < 900) return;   // 防洗版：每秒最多一句
      const text = cleanText(d.text).slice(0, SAY_MAX); if (!text) return;
      a.last = t; ws.serializeAttachment(a);
      const msg = { type: 'chat', id: rid(6), who: { id: a.id, name: a.name }, text, t };
      const hist = (await this.ctx.storage.get('hist')) || []; hist.push(msg); while (hist.length > 60) hist.shift();
      await this.ctx.storage.put('hist', hist);
      this.broadcast(msg);
    } else if (d.type === 'state') {
      // 一起爬：回報自己的山、距離、體力、是否在休息、遊戲關著時走多快（pace）
      const t = Date.now(), old = a.state, mountain = String(d.mountain || '').slice(0, 24), dist = Math.max(0, +d.dist || 0);
      let pace = +d.pace;
      if (!(pace >= 0 && pace <= PACE_MAX))   // 舊版遊戲沒送 pace：用前後兩筆的距離差÷時間（最多 8 m/s），跟上一次的平均
        pace = old && old.mountain === mountain && t > old.t && t - old.t < 120000 ? Math.min(8, Math.max(0, (dist - old.dist) / ((t - old.t) / 1000))) * 0.5 + (old.pace || 0) * 0.5 : (old && old.pace) || 0;
      a.state = { mountain, dist, stam: +d.stam || 0, rest: !!d.rest, t, pace: Math.round(pace * 1000) / 1000 };
      ws.serializeAttachment(a);
      this.broadcast({ type: 'state', who: { id: a.id, name: a.name }, state: a.state }, ws);
      if (a.party && t - (a.saved || 0) >= PARTY_SAVE_MS) await this.keep(ws, a);   // 存起來最多每分鐘一次，中間的進度只轉給隊友、不寫儲存
    } else if (d.type === 'move') {
      // 廣場：點地面要走去的位置（只在點的那一下傳，不是每格畫面都傳）
      const t = Date.now(); if (t - (a.lastMv || 0) < 150) return;
      const cl = v => Math.max(0, Math.min(1, +v || 0));
      a.lastMv = t; a.pos = { x: cl(d.x), y: cl(d.y) }; ws.serializeAttachment(a);
      this.broadcast({ type: 'move', who: { id: a.id }, x: a.pos.x, y: a.pos.y }, ws);
    } else if (d.type === 'emote') {
      // 廣場：打招呼動作（代號由遊戲端決定，這裡只擋掉怪字和連按）
      const t = Date.now(), k = String(d.k || ''); if (t - (a.lastEm || 0) < 800 || !/^[a-z]{1,10}$/.test(k)) return;
      a.lastEm = t; ws.serializeAttachment(a);
      this.broadcast({ type: 'emote', who: { id: a.id }, k }, ws);
    } else if (d.type === 'cheer') {
      this.broadcast({ type: 'cheer', who: { id: a.id, name: a.name }, to: String(d.to || '').slice(0, 20) }, ws);
    } else if (d.type === 'ping') ws.send(PONG);   // 字串跟 PING 不完全一樣的舊版遊戲（例如多了空白）還是照樣回
  }
  async webSocketClose(ws){ await this.gone(ws); }
  async webSocketError(ws){ await this.gone(ws); }
}

// 山行小日子 後端（Cloudflare Workers + D1 + Durable Objects）
// 帳號：訪客暱稱＋裝置上的登入碼（token）。token 同時是換手機用的復原碼，伺服器只存它的雜湊。
import { DurableObject } from 'cloudflare:workers';

const MAX_PHOTO = 450 * 1024;      // 單張照片上限（遊戲端已縮到 720px）
const DAILY_PHOTOS = 20;           // 每人每天最多上傳幾張
const ONLINE_MS = 3 * 60 * 1000;   // 多久內有動靜算「在線」
const PLAZA_CAP = 50;              // 一個登山口廣場最多幾人
const PLAZA_MAX = 40;              // 最多開到第幾個廣場
const SAY_MAX = 40;                // 廣場說話一次最多幾個字（頭上冒字用；hello 會告訴遊戲端，輸入框照這個限制）

// ───────── 小工具 ─────────
const now = () => Date.now();
const rid = (n = 16) => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join('');
async function sha(s){ const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join(''); }
const CODE_CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const friendCode = () => [...crypto.getRandomValues(new Uint8Array(6))].map(b => CODE_CH[b % CODE_CH.length]).join('');
const cleanName = s => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 12);
const cleanText = s => String(s || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 200);

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
  const p = await env.DB.prepare('SELECT * FROM players WHERE token_hash = ?').bind(await sha(t)).first();
  if (!p || p.banned) return null;
  return p;
}
const isAdmin = (env, req) => env.ADMIN_KEY && (req.headers.get('X-Admin-Key') === env.ADMIN_KEY || new URL(req.url).searchParams.get('k') === env.ADMIN_KEY);
// 台灣時間每週一 00:00 換週
const weekNo = () => Math.floor((now() + 8 * 3600e3 - 4 * 864e5) / (7 * 864e5));
const pub = p => ({ id: p.id, name: p.name, code: p.code, mountain: p.mountain, dist: p.dist, pet: p.pet, online: now() - p.seen < ONLINE_MS, seen: p.seen,
  walked: Math.round(p.walked || 0), summits: p.summits || 0, week: p.wk === weekNo() ? Math.max(0, Math.round((p.walked || 0) - (p.wk_base || 0))) : 0 });
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
          if (!inv || (inv.host !== me.id && inv.guest !== me.id)) return E(env, req, 'forbidden', 403);
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

      // 以下都要登入
      const me = await auth(env, req);
      if (!me) return E(env, req, 'unauthorized', 401);

      if (path === '/api/me' && M === 'GET') {
        await env.DB.prepare('UPDATE players SET seen = ? WHERE id = ?').bind(now(), me.id).run();
        return J(env, req, pub(me));
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
        return J(env, req, { friends: r.results.map(pub) });
      }
      if (path === '/api/friends' && M === 'POST') {
        const b = await req.json().catch(() => ({}));
        // 用好友碼加，或在登山口廣場點對方角色直接加（給對方的 id）
        const code = String(b.code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''), pid = String(b.id || '').replace(/[^0-9a-f]/g, '');
        const f = pid ? await env.DB.prepare('SELECT * FROM players WHERE id = ? AND banned = 0').bind(pid).first()
          : await env.DB.prepare('SELECT * FROM players WHERE code = ? AND banned = 0').bind(code).first();
        if (!f) return E(env, req, pid ? '找不到這位山友' : '找不到這個好友碼', 404);
        if (f.id === me.id) return E(env, req, '這是你自己的好友碼');
        await env.DB.batch([
          env.DB.prepare('INSERT OR IGNORE INTO friends (a, b, created) VALUES (?, ?, ?)').bind(me.id, f.id, now()),
          env.DB.prepare('INSERT OR IGNORE INTO friends (a, b, created) VALUES (?, ?, ?)').bind(f.id, me.id, now())
        ]);
        return J(env, req, { friend: pub(f) });
      }
      if ((m = path.match(/^\/api\/friends\/([0-9a-f]+)$/)) && M === 'DELETE') {
        await env.DB.batch([
          env.DB.prepare('DELETE FROM friends WHERE a = ? AND b = ?').bind(me.id, m[1]),
          env.DB.prepare('DELETE FROM friends WHERE a = ? AND b = ?').bind(m[1], me.id)
        ]);
        return J(env, req, { ok: true });
      }

      // 一起爬：邀請
      if (path === '/api/invites' && M === 'GET') {
        const r = await env.DB.prepare(`SELECT i.*, h.name AS host_name, g.name AS guest_name FROM invites i
          JOIN players h ON h.id = i.host JOIN players g ON g.id = i.guest
          WHERE (i.guest = ? OR i.host = ?) AND i.created > ? ORDER BY i.created DESC LIMIT 20`).bind(me.id, me.id, now() - 7 * 864e5).all();
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
  constructor(ctx, env){ super(ctx, env); }
  async fetch(req){
    const who = JSON.parse(req.headers.get('X-Player') || '{}'), plaza = +req.headers.get('X-Plaza') || 0;
    // 廣場客滿（同一個人重連不算）：回 409，讓外面改試下一個廣場
    if (plaza) { const ppl = this.people(); if (ppl.length >= PLAZA_CAP && !ppl.some(p => p.id === who.id)) return new Response('full', { status: 409 }); }
    const pair = new WebSocketPair(), [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    // 廣場上的起點：入口附近隨機一點（x 0～1 左右，y 0～1 遠到近）
    const pos = { x: 0.3 + Math.random() * 0.4, y: 0.72 + Math.random() * 0.2 };
    server.serializeAttachment({ ...who, last: 0, lastMv: 0, lastEm: 0, state: null, pos });
    const hist = (await this.ctx.storage.get('hist')) || [];
    server.send(JSON.stringify({ type: 'hello', you: who.id, plaza, sayMax: SAY_MAX, history: hist, people: this.people() }));
    this.broadcast({ type: 'join', who: { id: who.id, name: who.name, pet: who.pet, pos } }, server);
    return new Response(null, { status: 101, webSocket: client });
  }
  people(){
    const seen = {}, out = [];
    for (const ws of this.ctx.getWebSockets()) { const a = ws.deserializeAttachment() || {}; if (!a.id || seen[a.id]) continue; seen[a.id] = 1; out.push({ id: a.id, name: a.name, pet: a.pet, state: a.state, pos: a.pos }); }
    return out;
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
      // 一起爬：回報自己的山、距離、體力、是否在休息
      a.state = { mountain: String(d.mountain || '').slice(0, 24), dist: +d.dist || 0, stam: +d.stam || 0, rest: !!d.rest, t: Date.now() };
      ws.serializeAttachment(a);
      this.broadcast({ type: 'state', who: { id: a.id, name: a.name }, state: a.state }, ws);
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
    } else if (d.type === 'ping') ws.send('{"type":"pong"}');
  }
  async webSocketClose(ws){ const a = ws.deserializeAttachment() || {}; try { ws.close(); } catch (e) {} this.broadcast({ type: 'leave', who: { id: a.id, name: a.name } }); }
  async webSocketError(ws){ try { ws.close(); } catch (e) {} }
}

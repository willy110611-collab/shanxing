// 山行小日子 — 步道視角渲染器（偽 3D 山徑 + 手繪墨線 + 賽璐璐上色）
// 取代 js/scene.js，對外提供 window.SX.scene。不依賴其他檔案（需在 game.js 之前載入）。
(function(){
'use strict';
const SX = window.SX = window.SX || {};
const S = SX.scene = {};

// ═════════ 常數與狀態 ═════════
const INK = '#3a2a20', TAU = Math.PI * 2;
const SEG = 1.6;        // 每段路長（公尺）
const DRAW = 150;       // 繪製段數（約 240 m）
const HORF = 0.34, FOOTF = 0.42;   // 地平線在畫面 34% 高、登山客腳底在 34%+42%=76%：鏡頭比較低、接近平視，狀態面板下面留得出一條天空和遠山
const HZ = 4.2;         // 登山客在鏡頭前方幾公尺（鏡頭拉近、整個人要在畫面裡；原本 6）
const RW = 1.3;         // 步道半寬
const GW = 30;          // 稜線地面半寬
const FOGN = 24;        // 霧色階數
const STRIDE = 1.45;    // 一個完整步伐循環（兩步）的距離
const NEAR_Z = 1.2;     // 地面最近畫到鏡頭前幾公尺（畫面最下緣大約是 2.7 公尺，1.2 公尺一定在畫面外）。最近那段的近端被推到這裡時，貼圖要用 zAt() 算真正的世界位置，不然會被擠壓、走路時畫面最下面一段一段跳
const CREST = 0.00045; // 遠處地面往下彎（每公尺平方掉幾公尺，從登山客那裡開始算）：遠方的路像翻過一個坡頂，後面露出天空和遠山，不會一路往上蓋滿畫面
const TWL = 720;        // 背景圖塊邏輯寬度
const FONT = getComputedStyle(document.documentElement).getPropertyValue('--fontB').trim() || 'sans-serif';   // 字型在 css/style.css 的 --fontB
const LW = 0.032;       // 道具墨線粗細（公尺）
const HIT = { note:1, btree:1, cairn:1, bench:1, view:1, treasure:1 };
const PXO = { note:RW+0.55, btree:RW+1.9, cairn:RW+0.6, bench:RW+1.0, view:RW+2.3, treasure:RW+0.4, sign:RW+0.7, summit:RW+1.0, mycairn:RW+0.35, fall:RW+3.2, hut:RW+7.8, hut369:RW+6, hutjm:RW+4, shrine:RW+1.5, station:RW+3.6, rockwall:RW+2.2 };   // 地標放在圖寬一半以外，不會蓋到步道
const DEFWX = { kind:'sunny', time:'day' };

let cv = null, ctx = null, W = 375, H = 812, DPR = 1, F = 450, HOR = 276, CAMH = 5, U = 1;
let M = null, TH = {}, seed = 1, N = 0, total = 1;
let curve = null, elev = null, head = null, stepF = null;
let props = [], cairns = [], AP = [];
let SPR = {}, signSpr = {}, VG = {}, hazeCss = '#dfe6e2', hazeRgb = [223,230,226];
let smallTab = [], treeTab = [], edgeTab = [], hedgeTab = [];
const EDGE_J = 40, EDGE_P = 0.55;   // 路緣草叢：幾段以內畫、每邊每段出現的機率
const PASS_P = 0.035, PASS_IN = 0.9;   // 鏡頭前掠過的芒草／蕨類：每段出現的機率（約 45 公尺一叢）、內緣離路中心至少幾公尺（在登山客那個深度已經在他身邊，不會擋到人）
const HEDGE_J = 38, HEDGE_N = 3, HEDGE_P = 1, TRUNK_P = 0.14;   // TRUNK_P：森林步道每段有貼近鏡頭高樹幹的機率（再乘上 theme.wall）
   // 植物牆：幾段以內畫、每段幾個位置、每個位置出現的機率（再乘上 theme.wall）
// 尺寸表（公尺，畫在畫面上的高度）：全部對照登山客（1.76 公尺）訂的，路旁東西的大小只改這裡（check 會檢查畫圖時沒有另外寫數字）
// 長椅：椅面約 0.45 公尺高（圖裡椅面在圖高 47% 左右）；石頭、路標、欄杆約 1.1 公尺；樹比人高很多
const SCALE = {
  hero:1.76, heroSit:1.0, heroSleep:1.0, heroSummit:1.96, heroBreath:1.5, heroPose:1.74,   // heroBreath：彎腰喘氣比站著矮；heroPose：喝水、擦汗、看風景（站著）
  bench:0.96, benchSeat:0.45, rail:1.1, sign:1.2, summit:1.3, rock:1.1, cairn:0.95, mycairn:0.45, note:1.4, treasure:0.6, view:1.75, fall:4.2,
  pine:8.2, broad:6.4, bigtree:12.5, sakura:5.6, wishtree:4.4,
  rhodo:1.5, bamboo:1.3, fern:0.9, grass:0.55, flower:0.5, silver:1.9,
  railPost:1.16, railBar:0.09,              // 欄杆柱子比扶手高一點點；扶手是一根約 9 公分粗的圓木
  hedgeFern:1.1, bambooTall:2.4, trunk:12,  // 植物牆：蕨類叢約 1 公尺、高的箭竹約 2.4 公尺；貼近鏡頭的樹幹很高（樹冠在畫面上緣以外）
  hut:7.5, shrine:1.2, station:3.6, rockwall:6,   // 路旁地標：排雲山莊（三層木屋）、西峰山神廟、北峰氣象站、東峰岩壁
  hut369:4.5, hutjm:3.0                          // 369 山莊（長長一層、黃屋頂，含屋頂約 4.5 公尺）、嘉明湖避難山屋（一層小屋約 3 公尺）
};
const RAIL_J = 64, RAIL_H = SCALE.rail, RAIL_D = RW + 0.12;   // 欄杆：幾段以內畫、高度、離路中心多遠（公尺）
const RAIL_ART_J = 44;   // 美術圖欄杆畫到幾段（再遠只剩一兩像素的細線，最後 10 段淡出，省效能）
let PAL = null, tileSets = {}, palA = 'day', palB = 'day', palK = 0;
let LUT = [], lutKey = -1, snowAmt = 0, snowFall = 0;   // snowAmt：地上積雪多少；snowFall：正在下的雪有多密（兩個都會慢慢變化）
let fogD = 300, fogD0 = 36, raysA = 0.5, sunVis = 1, isNight = false, isRain = false, isFog = false, isCloudy = false, isSnow = false;
const cSkyT = [0,0,0], cSkyB = [0,0,0], cGrade = [255,255,255], cSun = [0.8,0.12], cSunCol = [255,246,216];
let SHADOW = null, CONTACT = null, CANOPY = [], DAPPLE = null, GLOW = null, RAYS = null, FG = [], vig = null, stars = [], WARM = null;
const SHOW_FG = false;   // 畫面上下兩端的前景花草（frame_top／frame_bottom）：玩家意見先拿掉，想恢復改成 true
const WARM_A = 0.5;     // 午後暖光濾鏡強度（soft-light，再乘上太陽可見度）
const RIM_A = 0.75;     // 前景框（杜鵑、蕨葉）輪廓光強度
let FGRIM = {};         // 前景框輪廓光貼圖快取（依尺寸）
// 投影暫存（每幀重用）
const pC = new Float32Array(DRAW + 3), pW = new Float32Array(DRAW + 3), pZ = new Float32Array(DRAW + 3),
      pS = new Float32Array(DRAW + 3), pX = new Float32Array(DRAW + 3), pY = new Float32Array(DRAW + 3);
let bG = 0, camX = 0, camY = 0, gx = 0, gy = 0, gs = 1, gz = 1, jhG = 3, fhG = 0, offG = 0;
const hits = []; let hitN = 0;
const hero = { ph:0, pd:-1, stair:0, pan:0, mv:0, py:0, pv:0, mga:0, mgv:0, lean:0, turn:0, st:-1, sx:187, sy:650, u:0.75, top:520 };
const TURN_LOOK = 5, TURN_FULL = 0.02, TURN_A = 0.09, TURN_X = 0.07;   // 轉彎傾身：看腳下往前幾段的彎度、彎到多少算全傾、最多傾幾弧度（約 5 度）、腳往內側偏幾公尺
const RMOT = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;   // 系統設定「減少動態」：鏡頭不跟著步伐晃
// 自動畫質：量「真正兩格之間隔了多久」（requestAnimationFrame 到下一次畫的時間，含顯示卡真的把圖畫出來的時間，不是只量程式跑多久）
// 最近 win 格裡慢的那四分之一（p75）超過這個目標格數的預算就降一級；最慢的一成都在順的範圍內、順了一陣子才升一級
// 兩次調整至少隔 gap 秒，升上去又變慢的話下次等久一倍。走路要 60 格、休息 30 格，預算跟著目標格數算
// 第 0 級最好；往下依序：解析度 2→1.5→1.25→1→0.85 倍（畫布小一點、交給瀏覽器放大，手繪風看不太出來；狀態列是網頁文字不受影響）、
// 遠處植物少一點、草叢畫近一點、樹影和光斑不畫。後面三項都是慢慢淡掉，不會一下子不見
const QUAL = {
  slow:1.2, ok:1.06,                  // 慢的四分之一超過「一格該花的時間」的 1.2 倍算太慢；最慢的一成都在 1.06 倍內算順
  win:90, gap:3, upAfter:8, upMax:64, // 看最近幾格、最少隔幾秒、順了幾秒才升一級（最多等幾秒）
  dpr:[2, 1.5, 1.25, 1.25, 1, 0.85],
  plant:[0, 0, 0.5, 1, 1, 1], plantJ:55, // 第 2 級起：55 段（約 90 公尺）以外每段少畫兩個植物位置
  turf:[0, 0, 0, 1, 1, 1], turfCut:10,   // 第 3 級起：草叢少畫 10 段
  light:[0, 0, 0, 0, 1, 1],              // 第 4 級起：樹影、光斑不畫
  phone:1,                            // 手機（觸控＋小螢幕）從第 1 級（1.5 倍）開始，順的話才往上升
  ease:0.8                            // 植物、草叢、光影跟著畫質慢慢變（每秒變多少）
};
const PHONE = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches && Math.min(screen.width || 9999, screen.height || 9999) <= 540;
const qs = { lvl:PHONE ? QUAL.phone : 0, ring:new Float32Array(90), n:0, i:0, chgT:-99, okT:0, wait:8, upT:-99, cnt:0, plant:0, turf:0, light:0, sort:new Float32Array(90), last:0, fps:60 };
function turfJ(){ return TURF_J - qs.turf * QUAL.turfCut; }
function qualSet(l, now){
  if (l === qs.lvl) return;
  if (l > qs.lvl && now - qs.upT < 10) qs.wait = Math.min(QUAL.upMax, qs.wait * 2);   // 剛升上去又變慢：下次等久一點再升
  if (l < qs.lvl) qs.upT = now;
  qs.lvl = l; qs.chgT = now; qs.n = 0; qs.okT = 0;
  S.resize();   // 解析度跟著換（這一格馬上重畫，畫面不會閃）
}
// 每畫一格量一次：離上一次畫隔了幾毫秒（從 requestAnimationFrame 呼叫進來，所以就是真正的畫面間隔）；fps：遊戲現在要的格數（走路 60、休息 30）
function qualTick(fps, dt){
  const nowMs = performance.now(), now = nowMs / 1000, Q = QUAL, ft = qs.last ? nowMs - qs.last : 0;
  qs.last = nowMs;
  qs.plant += (Q.plant[qs.lvl] - qs.plant) * Math.min(1, dt * Q.ease);
  qs.turf += (Q.turf[qs.lvl] - qs.turf) * Math.min(1, dt * Q.ease);
  qs.light += (Q.light[qs.lvl] - qs.light) * Math.min(1, dt * Q.ease);
  if (fps !== qs.fps) { qs.fps = fps; qs.n = 0; qs.okT = 0; }   // 走路和休息的目標不同：換了就重新量
  if (!(ft > 0) || ft > 250) return;   // 切回分頁、暫停後的第一格不算
  qs.ring[qs.i] = ft; qs.i = (qs.i + 1) % Q.win; if (qs.n < Q.win) qs.n++;
  if (++qs.cnt % 15 || qs.n < 60 || now - qs.chgT < Q.gap) return;
  const a = qs.sort.subarray(0, qs.n), per = 1000 / (fps || 60); a.set(qs.ring.subarray(0, qs.n)); a.sort();
  const p75 = a[Math.floor(qs.n * 0.75)], p90 = a[Math.floor(qs.n * 0.9)];
  if (p75 > per * Q.slow && qs.lvl < Q.dpr.length - 1) { qualSet(qs.lvl + 1, now); return; }
  qs.okT = p90 < per * Q.ok ? qs.okT + 15 * ft / 1000 : 0;
  if (qs.okT > qs.wait && qs.lvl > 0) qualSet(qs.lvl - 1, now);
}
// 換山後把用得到的縮圖、合成影子、貼圖縮小版、路標牌子先做好：每格只花 WARM_MS 毫秒慢慢做，走到哪裡第一次看到時不會卡一下
const WARM_MS = 3;
let warmQ = [];
function warmBuild(){
  const q = [], spr = sp => { if (!sp || !sp.c) return; q.push(function(){ mip(sp.c, 1); }); if (sp.h) q.push(function(){ mip(sp.h, 1); }); q.push(function(){ if (!sp.sd) sprShadow(sp); }); };
  for (const k in SPR) { const a = SPR[k]; if (Array.isArray(a)) a.forEach(spr); }
  TURF.forEach(function(n){ n.forEach(function(v){ v.forEach(spr); }); });
  for (const k in TEX) { const T = TEX[k]; if (T && T.lv) for (let nx = 0; nx <= 3; nx++) for (let ny = nx; ny <= 6; ny++) if (nx || ny) q.push(function(){ texLevel(T, nx, ny); }); }
  props.forEach(function(o){ if (o.type === 'sign') q.push(function(){ getSign(o.text); }); });
  warmQ = q.reverse();
}
function warmStep(){ if (!warmQ.length) return; const t0 = performance.now(); while (warmQ.length && performance.now() - t0 < WARM_MS) warmQ.pop()(); }
S.quality = function(l){ if (l != null) { qualSet(l, performance.now() / 1000); qs.plant = QUAL.plant[l]; qs.turf = QUAL.turf[l]; qs.light = QUAL.light[l]; } return { lvl:qs.lvl, dpr:DPR, wait:qs.wait }; };   // 測試掛鉤：看現在在第幾級（給數字就直接換到那一級）
// 自己這個登山客走路的樣子（隊友、廣場的山友照舊）：門檻和頻率只寫在這張表。秒數都是「真的在走路」的時間（停下來、長按快走不算）
const GAIT = {
  tired:50, veryTired:20,               // 體力低於幾 % 換累的走路圖；再低更慢
  pace:[1, 0.8, 0.66],                  // 前進速度倍率：正常／累／很累（步伐頻率跟著慢，腳不會在地上滑）
  stride:[1, 0.92, 0.86],               // 步幅倍率：累的時候步子小一點、拖著走
  breath:[null, [70, 120], [35, 60]],   // 累的時候隔多久停下來喘口氣（秒，最短～最長）
  breathDur:[2.2, 3],
  happy:70, hop:[60, 120], hopDur:1.1,  // 體力 70% 以上：每 1～2 分鐘開心小跳一下（系統設定減少動態就不跳）
  idle:[100, 180], idleDur:[2, 3],      // 偶爾停下來喝口水或擦汗
  wipe:[0.35, 0.3, 0.25],               // 停下來時擦汗的機率：基本＋大太陽＋爬坡（其餘是喝水）
  look:6, lookDur:[2.2, 3],             // 觀景台、路線地標在前面幾公尺內：停下來轉頭看
  turnIn:0.45, turnOut:0.25,            // 轉彎傾身多大換轉身走路圖（換回來的門檻小一點，不會在邊界來回換）
  stairIn:0.45, stairOut:0.25,          // 同上，階梯走路圖
  fade:0.25                             // 換圖時兩張交叉淡換幾秒（不會一下子跳成另一張）
};
const gait = { act:null, at:0, dur:0, aflip:false, sid:'', sf:false, tB:90, tH:90, tI:140, lookM:-1, lvl:0, pace:1, onStair:false, onTurn:false, cur:'', curF:false, prev:'', prevF:false, k:1 };
const parts = [], flyers = []; let pIdx = 0;
let curS = null, curT = 0, heroDone = false;

// ═════════ 小工具 ═════════
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
function rgb(h){ if (typeof h !== 'string') return h; if (h.charCodeAt(0) === 114) { const m = h.match(/[\d.]+/g); return [+m[0], +m[1], +m[2]]; } h = h.replace('#',''); if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2]; const n = parseInt(h, 16); return [n>>16&255, n>>8&255, n&255]; }
function css(c){ return 'rgb(' + (c[0]|0) + ',' + (c[1]|0) + ',' + (c[2]|0) + ')'; }
function mix(a, b, t){ a = rgb(a); b = rgb(b); return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t]; }
function mixs(a, b, t){ return css(mix(a, b, t)); }
function rgba(c, a){ c = rgb(c); return 'rgba(' + (c[0]|0) + ',' + (c[1]|0) + ',' + (c[2]|0) + ',' + a + ')'; }
function LT(c, t){ return mixs(c, '#fff4c8', t == null ? 0.2 : t); }     // 受光色
function SH(c, t){ return mixs(c, '#33305a', t == null ? 0.3 : t); }     // 陰影色（偏藍紫）
function mkrng(s){ s = (s >>> 0) || 1; return function(){ s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function hashStr(str){ let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
// 整數雜湊 → 0..1（不配置記憶體，用於每幀的路旁植物）
function Hh(i, k){ let n = (Math.imul(i, 374761393) + Math.imul(k, 668265263) + seed) | 0; n = Math.imul(n ^ (n >>> 15), 2246822519); n = Math.imul(n ^ (n >>> 13), 3266489917); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }
function vn(x, k){ const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return Hh(i, k) * (1 - u) + Hh(i + 1, k) * u; }
function mk(w, h){ const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
// 縮圖鏈：大圖要縮很小畫的時候，改用預先縮成一半、四分之一…的版本（第一次用到才做），最後一步最多只縮兩倍
// 手機每格要畫上千張貼圖，直接把幾百像素的原圖縮成幾十像素會大量跳著讀記憶體，是步道畫面最慢的地方
function mip(c, px){
  const L = c._mip || (c._mip = [c]);
  let k = 0;
  while (L[k].width >= 16 && L[k].width * 0.5 >= px) {
    if (!L[k + 1]) { const s = L[k], h = mk(s.width / 2, s.height / 2); h.getContext('2d').drawImage(s, 0, 0, h.width, h.height); L[k + 1] = h; }
    k++;
  }
  return L[k];
}
function cAt(i){ return (i < 0 || i > N) ? 0 : curve[i]; }
function eAt(i){ return i <= 0 ? 0 : (i > N + 1 ? elev[N + 1] : elev[i]); }
function sAt(i){ return (i < 0 || i > N) ? 0 : stepF[i]; }
function headAt(d){ const x = clamp(d / SEG, 0, N), i = Math.floor(x); return head[i] + (head[i + 1] - head[i]) * (x - i); }

// Path2D 產生器
function pE(x, y, rx, ry, rot){ const p = new Path2D(); p.ellipse(x, y, rx, ry, rot || 0, 0, TAU); return p; }
function pR(x, y, w, h, r){ const p = new Path2D(); r = Math.min(r, w / 2, h / 2); p.moveTo(x + r, y); p.arcTo(x + w, y, x + w, y + h, r); p.arcTo(x + w, y + h, x, y + h, r); p.arcTo(x, y + h, x, y, r); p.arcTo(x, y, x + w, y, r); p.closePath(); return p; }
function pP(pts){ const p = new Path2D(); p.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]); p.closePath(); return p; }
// 花邊樹叢輪廓
function pBlob(cx, cy, rx, ry, n, r, jit){
  const p = new Path2D(), pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU, k = 1 + (r() - 0.5) * jit; pts.push(cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k); }
  p.moveTo(pts[0], pts[1]);
  for (let i = 0; i < n; i++) { const j = (i + 1) % n, mx = (pts[i*2] + pts[j*2]) / 2, my = (pts[i*2+1] + pts[j*2+1]) / 2; p.quadraticCurveTo(cx + (mx - cx) * 1.38, cy + (my - cy) * 1.38, pts[j*2], pts[j*2+1]); }
  p.closePath(); return p;
}
// 賽璐璐：先鋪陰影色，再把受光色往右上偏移（光從右上來），最後描墨線
function cel(c, p, lt, sh, dx, dy, lw){
  c.fillStyle = sh; c.fill(p);
  c.save(); c.clip(p); c.translate(dx, dy); c.fillStyle = lt; c.fill(p); c.restore();
  if (lw) { c.lineWidth = lw; c.strokeStyle = INK; c.stroke(p); }
}
function dot(c, x, y, r, col){ c.beginPath(); c.ellipse(x, y, r, r, 0, 0, TAU); c.fillStyle = col; c.fill(); }
function seg(c, x1, y1, x2, y2){ c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
function sText(g, txt, x, y, size, col){ g.save(); g.translate(x, y); g.scale(size / 40, size / 40); g.font = '700 40px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col; g.fillText(txt, 0, 0); g.restore(); }

// ═════════ 道具貼圖（預先畫好；另存一份霧化剪影做空氣透視） ═════════
function sprite(wm, hm, ppm, fn, sink){
  const s = sink || 0; let c = mk(wm * ppm, hm * ppm); const g = c.getContext('2d');
  g.scale(ppm, ppm); g.translate(wm / 2, hm - 0.03); g.lineJoin = g.lineCap = 'round';
  fn(g);
  // 整體柔和漸層：右上暖光、左下冷影
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop';
  const gr = g.createLinearGradient(c.width, 0, 0, c.height);
  gr.addColorStop(0, 'rgba(255,238,190,0.24)'); gr.addColorStop(0.5, 'rgba(255,238,190,0)'); gr.addColorStop(1, 'rgba(40,36,80,0.2)');
  g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
  c = sunk(c, s);
  const h = mk(c.width / 2, c.height / 2), hg = h.getContext('2d');
  hg.drawImage(c, 0, 0, h.width, h.height); hg.globalCompositeOperation = 'source-atop'; hg.fillStyle = hazeCss; hg.fillRect(0, 0, h.width, h.height);
  return { c:c, h:h, w:wm, hm:hm * (1 - s), ax:0.5 };
}
// Gemini 美術圖做成同樣格式的貼圖；hm 是實際高度（公尺）。沒有這張圖就回 null
const ART = SX.art || { get(){ return null; }, crop(){ return null; }, drawFrame(){ return false; }, onLoad(){} };
// 跟哪座山無關的貼圖（美術圖裁好、底部壓暗的版本、路面貼圖）只做一次，換山時重複用
// 以前每換一座山就重做一百多張大畫布（約 50 MB），手機要等回收才放掉，越玩越吃記憶體、越卡
const KEEP = {};
function keep(key, make){ let v = KEEP[key]; if (!v) { v = make(); if (v) KEEP[key] = v; } return v; }
// 不再用的畫布馬上釋放（連同縮圖鏈）：iPhone 的畫布記憶體有上限，等自動回收太慢
function free(c){ if (!c || !c.getContext) return; if (c._mip) for (let i = 1; i < c._mip.length; i++) c._mip[i].width = c._mip[i].height = 0; c._mip = null; c.width = c.height = 0; }
// 霧化剪影：跟著這座山的霧色，霧色換了才重做（舊的那張釋放）
function hazed(o){
  if (o.hk !== hazeCss) {
    free(o.h);
    const c = o.c, h = mk(c.width / 2, c.height / 2), hg = h.getContext('2d');
    hg.drawImage(c, 0, 0, h.width, h.height); hg.globalCompositeOperation = 'source-atop'; hg.fillStyle = hazeCss; hg.fillRect(0, 0, h.width, h.height);
    o.h = h; o.hk = hazeCss;
  }
  return o.h;
}
function artSpr(id, hm){
  const o = keep('spr:' + id, function(){ const c0 = ART.crop(id); if (!c0) return null; const k = 1 - (SINK[id] || 0), c = sunk(c0, SINK[id] || 0); groundShade(c); return { c:c, k:k }; });
  return o ? { c:o.c, h:hazed(o), w:hm * o.k * o.c.width / o.c.height, hm:hm * o.k, ax:0.5, shared:true } : null;   // shared：換山時不能釋放；埋進土裡的那截不算高度，寬度照原比例
}
// 樹埋進土裡：Gemini 的樹圖底部畫了一整圈樹根，照圖底貼在地面上，樹根就整片浮在地表上。
// 每張圖往下埋「圖高的幾成」（量的是樹幹和樹根交界往下多少，只留樹幹底和樹根最上面一點點）；沒列的圖不埋。
// 程式畫的樹沒有樹根，只埋一點點（SINK_DEF），樹幹底才不會像切齊的紙片
const SINK = { tree_pine:0.06, tree_pine_snow:0.06, tree_broad:0.13, tree_big:0.12, tree_sakura:0.09, wish_tree:0.03, bush_rhodo:0.03, rock_moss:0.03, trunk_close:0.01 };
const SINK_DEF = 0.03;
const SINK_SOFT = 0.04;   // 切口往上這麼高（佔留下來的高度）慢慢變透明，像被土和草蓋住，不會有一條切齊的線
// 把圖底部 s 那一截切掉（只做一次，存起來；原圖釋放），切口淡出
function sunk(c, s){
  if (!(s > 0)) return c;
  const h = Math.max(2, Math.round(c.height * (1 - s))), d = mk(c.width, h), g = d.getContext('2d'), fh = Math.max(2, h * SINK_SOFT);
  g.drawImage(c, 0, 0);
  const gr = g.createLinearGradient(0, h - fh, 0, h);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.85)');
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = gr; g.fillRect(0, h - fh, c.width, fh);
  free(c);
  return d;
}
// 底部壓暗：物件靠近地面的地方比較暗（環境遮蔽），才不會像貼在地上的紙片
function groundShade(c){
  const g = c.getContext('2d'), gr = g.createLinearGradient(0, c.height, 0, c.height * 0.78);
  gr.addColorStop(0, 'rgba(40,30,46,0.42)'); gr.addColorStop(1, 'rgba(40,30,46,0)');
  g.save(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = gr; g.fillRect(0, c.height * 0.78, c.width, c.height * 0.22); g.restore();
}
// 有美術圖就用圖（一張），沒有就用程式畫的那組
function artOr(id, hm, list){ const a = artSpr(id, hm); return a ? [a] : list; }
// 貼近鏡頭的高樹幹：trunk_close 只畫了一小截（約 2 公尺），去掉上下切口、一截正一截倒疊成整棵樹那麼高（只做一次）
// 樹冠在畫面上緣外面，所以只在樹幹頂端超出畫面上緣時才看得到（畫的時候依頂端位置慢慢淡入）
const TRUNK_TILES = 11;
function trunkSpr(hm){
  const o = keep('trunk:tall', function(){
    const e = ART.get('trunk_close'); if (!e) return null;
    const f = e.frames[0], sy = f.y + f.h * 0.09, sh = f.h * 0.84, w = Math.round(Math.min(160, f.w)), th = Math.round(w * sh / f.w), c = mk(w, th * TRUNK_TILES), g = c.getContext('2d');
    for (let k = 0; k < TRUNK_TILES; k++) { g.save(); g.translate(0, k * th + (k & 1 ? th : 0)); g.scale(1, k & 1 ? -1 : 1); g.drawImage(e.img, f.x, sy, f.w, sh, 0, 0, w, th); g.restore(); }
    return { c:sunk(c, SINK.trunk_close), k:1 - SINK.trunk_close };
  });
  return o ? { c:o.c, h:hazed(o), w:hm * o.k * o.c.width / o.c.height, hm:hm * o.k, ax:0.5, shared:true } : null;
}
// 路面／草地貼圖（俯視、可無縫拼接）：m 是一張圖代表幾公尺
const TRAIL_TEX = { dirt:'ground_dirt', stairs:'ground_stone', scree:'ground_scree' };
let TEX = {};
function mkTex(id, m){
  if (!ctx) return null;
  const T = keep('tex:' + id, function(){ const c = ART.crop(id); if (!c) return null; const p = ctx.createPattern(c, 'repeat'); return p && p.setTransform ? { p:p, w:c.width, c:c, lv:{} } : null; });
  return T ? { p:T.p, w:T.w, m:m, c:T.c, lv:T.lv } : null;
}
// 貼圖的縮小版（橫、直各自縮 2^nx、2^ny 倍；用重複貼圖去縮，接縫才接得起來）：遠處的路面、草地一個像素蓋好幾個貼圖點時用
function texLevel(T, nx, ny){
  const key = nx * 16 + ny; let L = T.lv[key];
  if (!L) {
    // 一次只縮一半（從上一級縮），每一級都是前一級的平均：一次縮很多倍會跳著取樣、顆粒感跟相鄰一級不同，遠處路面換級時會看到一條明暗分界跟著走
    const px = nx > 0 ? nx - 1 : 0, py = nx > 0 ? ny : ny - 1, src = px || py ? texLevel(T, px, py).c : T.c, c = T.c;
    const w = Math.max(1, Math.round(c.width / (1 << nx))), h = Math.max(1, Math.round(c.height / (1 << ny))), d = mk(w, h), g = d.getContext('2d');
    g.scale(w / src.width, h / src.height); g.fillStyle = g.createPattern(src, 'repeat'); g.fillRect(0, 0, src.width, src.height);
    L = T.lv[key] = { p:ctx.createPattern(d, 'repeat'), sx:c.width / w, sy:c.height / h, c:d };
  }
  return L;
}
const TEX_MTX = typeof DOMMatrix === 'function' ? new DOMMatrix() : null;   // 每段路都要對一次貼圖，重複用同一個矩陣不另外配置
// 不能無縫拼接的圖（例如苔蘚石板、木頭階梯）先鏡射拼成可以無縫重複的一張（只做一次，換山時重複用）
// r：要用的那一塊（佔原圖的比例 [x0, y0, x1, y1]）；mx、my：左右、上下要不要鏡射；px：每一塊縮成多寬（像素，省記憶體）
function mirTex(id, m, r, mx, my, px){
  if (!ctx) return null;
  const T = keep('texm:' + id, function(){
    const e = ART.get(id); if (!e) return null;
    const f = e.frames[0], sx = f.x + f.w * r[0], sy = f.y + f.h * r[1], sw = f.w * (r[2] - r[0]), sh = f.h * (r[3] - r[1]);
    const w = Math.round(Math.min(px, sw)), h = Math.round(w * sh / sw), c = mk(w * (mx ? 2 : 1), h * (my ? 2 : 1)), g = c.getContext('2d');
    for (let a = 0; a < (mx ? 2 : 1); a++) for (let b = 0; b < (my ? 2 : 1); b++) {
      g.save(); g.translate(a ? w * 2 : 0, b ? h * 2 : 0); g.scale(a ? -1 : 1, b ? -1 : 1); g.drawImage(e.img, sx, sy, sw, sh, 0, 0, w, h); g.restore();
    }
    const p = ctx.createPattern(c, 'repeat'); return p && p.setTransform ? { p:p, w:c.width, c:c, lv:{} } : null;
  });
  return T ? { p:T.p, w:T.w, m:m, c:T.c, lv:T.lv } : null;
}
// 階梯立面（面對鏡頭那一面）的貼圖：石階用花崗岩石塊（約 5 排石頭）、土路和木棧道的陡段用木頭階梯（約 3 根橫木）
// m：圖寬代表幾公尺（石頭一排約 0.25 公尺高，跟一階差不多）；rows：圖裡有幾排，每階隨機對齊其中一排
const RISER_J = 22;
const RISER = { stairs:{ id:'ground_riser_stone', m:2.2, rows:5 }, wood:{ id:'ground_riser_wood', m:2.6, rows:3, r:[0.16, 0.3, 0.86, 0.95] } };
function buildTex(){
  const tr = TH.trail || 'dirt', rs = tr === 'stairs' ? RISER.stairs : tr === 'scree' ? null : RISER.wood;
  TEX = { road:mkTex(TRAIL_TEX[tr], RW * 2), grass:mkTex('ground_grass', 4), snow:mirTex('ground_snow', RW * 4, [0, 0, 1, 1], true, true, 512),   // 雪地那張上下左右接不起來（每 2.6 公尺一條明暗分界），鏡射拼成無縫的一組
    steps:tr === 'stairs' ? null : mkTex('ground_steps', RW * 2),   // 土路、碎石路偶爾一小段很陡的階梯：木頭階梯（石階步道照舊用石板）
    moss:tr === 'stairs' && !TH.alpine ? mirTex('ground_stone_moss', RW * 4.4, [0, 0, 1, 1], true, true, 512) : null,   // 鏡射拼成的一組 5.7 公尺寬：一半就比路寬，鏡射的對稱軸不會落在踏面中間   // 森林裡的石階：踏面一階石板、一階苔蘚石塊，才不會每階都同一種鋪面
    riser:rs ? (rs.r ? mirTex(rs.id, rs.m, rs.r, true, false, 640) : mkTex(rs.id, rs.m)) : null };
  if (TEX.riser) TEX.riser.rows = rs.rows;
  RSH = roadShade();
  TEX.bank = tr === 'wood' ? null : mirTex('trail_bank', BANK_M, [0.14, 0.32, 0.87, 0.68], true, false, 512);   // 路肩土坎切面：泥土、石頭、樹根（木棧道沒有土坎）
}
// 土坎切面貼圖：圖寬代表沿路 BANK_M 公尺、圖高代表 BANK_H 公尺（土坎約 0.12～0.28 公尺高），BANK_J 段以內才貼（最後 6 段淡入）
const BANK_M = 2.6, BANK_H = 0.32, BANK_J = 12;
// 切面是一片斜斜往遠處延伸的四邊形：貼圖橫向沿著路往前、直向從土坎上緣往下（用這一段近端的兩個點和遠端上緣的點對齊）
function bankFill(T, side, z0, bh, a){
  const ux = (tX2[1] - tX1[1]) / SEG, uy = (tY2[1] - tY1[1]) / SEG, vx = (tX1[0] - tX1[1]) / bh, vy = (tY1[0] - tY1[1]) / bh;
  const kx = BANK_M / T.w, ky = BANK_H / T.c.height;
  const nx = Math.min(6, Math.max(0, Math.floor(-Math.log2(Math.hypot(ux, uy) * kx * DPR)))), ny = Math.min(6, Math.max(0, Math.floor(-Math.log2(Math.hypot(vx, vy) * ky * DPR))));
  const L = nx || ny ? texLevel(T, nx, ny) : null, p = L ? L.p : T.p, sx = L ? L.sx : 1, sy = L ? L.sy : 1, ph = (z0 % BANK_M) / BANK_M * T.w;
  const m = TEX_MTX || new DOMMatrix();
  m.a = ux * kx * sx; m.b = uy * kx * sx; m.c = vx * ky * sy; m.d = vy * ky * sy; m.e = tX1[1] - ph * ux * kx; m.f = tY1[1] - ph * uy * kx;
  p.setTransform(m);
  ctx.fillStyle = p; ctx.globalAlpha = a;
}
// 立面貼圖：xl 左緣、yt 上緣（螢幕座標）、s 這個深度每公尺幾像素；k 決定這一階對齊圖裡第幾排、左右錯開多少
function riserFill(T, xl, yt, s, k, a){
  const kx = s * T.m / T.w, n = Math.min(6, Math.max(0, Math.floor(-Math.log2(kx * DPR))));
  const L = n ? texLevel(T, n, n) : null, p = L ? L.p : T.p, ax = L ? kx * L.sx : kx, ay = L ? kx * L.sy : kx;
  const rowPx = T.c.height / T.rows, row = (Hh(k, 181) * T.rows) | 0, u = Hh(k, 182) * T.w;
  const m = TEX_MTX || new DOMMatrix();
  m.a = ax; m.b = 0; m.c = 0; m.d = ay; m.e = xl - u * kx; m.f = yt - row * rowPx * kx;
  p.setTransform(m);
  ctx.fillStyle = p; ctx.globalAlpha = a;
}
// 連續的地面貼圖（路面、踏面、草地都用這個）：A 近端、B 遠端是中心線在畫面上的 x、y 和那裡每公尺幾像素 s，zA 是近端的世界位置（公尺）
// uc：中心線在貼圖上離貼圖左緣幾公尺（路面＝RW，草地＝0）。path(ta, tb)：畫出這一條（0～1 的畫面比例）的形狀
// 透視下「1/距離」在畫面上是線性的：一段切成幾條約 SUB_PX 高的薄橫條，每條各自算縮放、跟著中心線斜切，
// 相鄰兩條、相鄰兩段在接縫上位置、比例都對得起來（以前一段只用近端的比例貼到底，遠端比下一段大好幾倍，近處一段一段像拼起來的色塊）
// 橫條的上下緣對齊整數像素：半透明的貼圖兩條各蓋半個像素時會透出一條細線
const SUB_PX = 8, SUB_GRASS = 36;   // 路面、踏面每條約 8 像素；草地貼圖本來就亂，切粗一點（省效能）
const TEX_MINPX = 0.8;   // 一段路在畫面上低於這麼多像素時，地面貼圖開始淡掉（再低一倍就不畫）
// 第 q 條分界：對齊整數像素後換回 0～1 的比例（獨立的函式，不在每段路產生新的小函式）
function texSnap(yA, yB, h, q, n){ return h > 0.01 ? (yA - Math.round(lerp(yA, yB, q / n) * DPR) / DPR) / h : q / n; }
function texRun(T, uc, xA, yA, sA, xB, yB, sB, zA, a, path, sub){
  const h = yA - yB;
  a *= clamp((h - TEX_MINPX) / TEX_MINPX, 0, 1);   // 遠處這段在畫面上不到一兩個像素高：貼圖的花紋已經看不出來，慢慢淡掉不畫（省效能）
  if (!T || a < 0.01) return;
  const n = clamp(Math.ceil(h / (sub || SUB_PX)), 1, 24), dzA = F / sA;
  let tp = texSnap(yA, yB, h, 0, n);
  for (let q = 1; q <= n; q++) {
    const t = texSnap(yA, yB, h, q, n);
    const xa = lerp(xA, xB, tp), ya = lerp(yA, yB, tp), sa = lerp(sA, sB, tp), xb = lerp(xA, xB, t), yb = lerp(yA, yB, t), sb = lerp(sA, sB, t);
    const za = zA + F / sa - dzA, zb = zA + F / sb - dzA, w = texAff(T, uc, xa, ya, sa, xb, yb, sb, za, zb, a, 0);
    ctx.beginPath(); path(tp, t); ctx.fill();
    if (w > 0.04) { texAff(T, uc, xa, ya, sa, xb, yb, sb, za, zb, a, 1); ctx.fill(); }   // 縮圖換級的地方兩級交叉淡換（以前在固定的距離有一條明暗分界跟著畫面走）
    tp = t;
  }
}
// 路面的一條（中心線兩邊各 RW）：重複用同一個函式和暫存，不每段產生新的
const RP = new Float32Array(6);
function roadPath(xA, yA, sA, xB, yB, sB){ RP[0] = xA; RP[1] = yA; RP[2] = sA; RP[3] = xB; RP[4] = yB; RP[5] = sB; return roadPathFn; }
function roadPathFn(a, b){
  const xa = lerp(RP[0], RP[3], a), ya = lerp(RP[1], RP[4], a), wa = RW * lerp(RP[2], RP[5], a), xb = lerp(RP[0], RP[3], b), yb = lerp(RP[1], RP[4], b), wb = RW * lerp(RP[2], RP[5], b);
  ctx.moveTo(xa - wa, ya); ctx.lineTo(xa + wa, ya); ctx.lineTo(xb + wb, yb); ctx.lineTo(xb - wb, yb); ctx.closePath();
}
// 路面橫向明暗（左緣暗一點、中間微亮、右緣土坎的影子）：一條 128 像素寬的漸層，貼滿路寬
let RSH = null;
function roadShade(){
  return keep('roadshade', function(){
    if (!ctx) return null;
    const c = mk(128, 2), g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 128, 0);
    gr.addColorStop(0, 'rgba(46,30,24,0.2)'); gr.addColorStop(0.12, 'rgba(46,30,24,0.04)'); gr.addColorStop(0.3, 'rgba(255,240,205,0)'); gr.addColorStop(0.45, 'rgba(255,240,205,0.1)');
    gr.addColorStop(0.62, 'rgba(255,240,205,0.06)'); gr.addColorStop(0.76, 'rgba(46,30,48,0)'); gr.addColorStop(0.9, 'rgba(46,30,48,0.2)'); gr.addColorStop(1, 'rgba(46,30,48,0.3)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 2);
    const p = ctx.createPattern(c, 'repeat'); return p && p.setTransform ? { p:p, w:128, c:c, lv:{}, m:RW * 2 } : null;
  });
}
const mipN = k =>Math.min(6, Math.max(0, Math.floor(-Math.log2(k * DPR))));
// 一條橫條的貼圖對齊：近端中心 (xn, yn) 對到世界位置 zn，遠端 (xf, yf) 對到 zf；橫向比例取兩端平均，跟著中心線斜切
// step：0＝這一級（回傳要跟下一級交叉淡換多少 w），1＝下一級（疊在上面）。兩次的不透明度算好，讓底色露出來的比例跟只畫一次一樣
function texAff(T, uc, xn, yn, sn, xf, yf, sf, zn, zf, a, step){
  const r = T.w / T.m, dv = Math.max(1e-4, (zf - zn) * r), kx = (sn + sf) * 0.5 / r, d = -(yn - yf) / dv, c = (xf - xn) / dv;
  const fy = clamp(-Math.log2(-d * DPR), 0, 6), ny0 = Math.floor(fy), w = ny0 === 0 ? clamp((fy - 0.8) / 0.2, 0, 1) : 0;   // 只有最近那一次換級（原圖→縮一半）交叉淡換：那條分界在登山客腳邊最明顯，更遠的換級只剩幾像素看不出來（省效能）
  const nx = mipN(kx), ny = ny0 + (step ? 1 : 0), L = nx || ny ? texLevel(T, nx, ny) : null, p = L ? L.p : T.p, sx = L ? L.sx : 1, sy = L ? L.sy : 1;
  const v0 = (((zn % T.m) + T.m) % T.m) * r, u0 = uc * r, m = TEX_MTX || new DOMMatrix();
  m.a = kx * sx; m.b = 0; m.c = c * sy; m.d = d * sy; m.e = xn - kx * u0 - c * v0; m.f = yn - d * v0;
  p.setTransform(m);
  ctx.fillStyle = p; ctx.globalAlpha = step ? a * w / (1 - a + a * w) : w > 0.04 ? a * (1 - w) : a;
  return w;
}
// ───────── 立體草叢：一條一條站起來的草葉（預先畫好幾條「草帶」，每幀沿地面蓋章） ─────────
// 平鋪的俯視草地貼圖看起來像地毯；低角度看草地應該看到草葉站起來：根部暗、葉尖亮、邊緣毛毛的
const GRASS_A = 0.62;     // 草地貼圖疊在底色上的不透明度（草葉顏色也照這個比例混，才會跟地面同色）
const TEX_A = 0.85;       // 地面貼圖整體不透明度
const TURF_J = 26;        // 幾段以內蓋草（約 40 公尺；再遠草葉只剩幾個像素，貼圖就夠了，也省手機效能）
const TURF_NEAR = 14;     // 這段以內用近景草帶（草葉大、少），以外用遠景草帶（寬、密）；交界前後各 1.5 段交叉淡換，不會一條線整排換掉
const TURF_R = 4;         // 每段固定 4 排（位置永遠一樣）；遠處排距很擠時，多出來的排慢慢變透明，不是突然少掉
const TURF_RANK = [0, 2, 1, 3];   // 遠處先留第 0、2 排，第 1、3 排先淡掉
let TURF = [];            // [近/遠][明暗 0..2] → 幾張變化
function texAvg(id){ return keep('avg:' + id, function(){ return texAvg0(id); }); }
function texAvg0(id){
  const c = ART.crop(id); if (!c) return null;
  const t = mk(8, 8), g = t.getContext('2d'); g.drawImage(c, 0, 0, 8, 8);
  const d = g.getImageData(0, 0, 8, 8).data, s = [0, 0, 0];
  for (let k = 0; k < d.length; k += 4) { s[0] += d[k]; s[1] += d[k + 1]; s[2] += d[k + 2]; }
  return [s[0] / 64, s[1] / 64, s[2] / 64];
}
// core：草根分布寬度；左右各留 pad 給往外斜的葉尖，才不會在貼圖邊緣被切成直線
function turfSpr(core, hm, ppm, n, base, lv, r){
  const pad = hm * 0.5, wm = core + pad * 2, c = mk(wm * ppm, hm * ppm), g = c.getContext('2d');
  g.scale(ppm, ppm); g.translate(wm / 2, hm); g.lineJoin = g.lineCap = 'round';
  const dk = css(tone(mix(base, '#1d3a34', 0.3), lv)), md = css(tone(base, lv)), lt = css(tone(mix(base, '#f6f0a8', 0.32), lv));
  // 草葉聚成一叢一叢（中間留空隙露出地面），每叢：底下一小片影子 → 後面暗葉 → 前面亮葉，像扇子一樣張開
  const nc = Math.max(2, Math.round(core / (hm * 0.9)));
  for (let c0 = 0; c0 < nc; c0++) {
    const cx = ((c0 + 0.2 + r() * 0.6) / nc - 0.5) * core, sz = 0.65 + r() * 0.35, m = Math.round(n / nc * sz), lean = (r() - 0.5) * 0.3 + 0.1;
    g.fillStyle = 'rgba(36,32,58,0.22)'; g.beginPath(); g.ellipse(cx - hm * 0.04, -hm * 0.02, hm * 0.4 * sz, hm * 0.09, 0, 0, TAU); g.fill();
    for (let p = 0; p < 2; p++) for (let q = 0; q < (p ? Math.round(m * 0.6) : m); q++) {
      const t = (r() - 0.5), x = cx + t * hm * 0.45 * sz, a = lean + t * 1.5, L = hm * sz * (p ? 0.5 + r() * 0.35 : 0.7 + r() * 0.3) * (1 - Math.abs(t) * 0.5);
      blade(g, x, a, L, hm * (0.035 + r() * 0.025), p ? (r() < 0.5 ? md : lt) : dk, p && r() < 0.25 ? hm * 0.012 : 0);
    }
  }
  // 根部壓暗（環境遮蔽），草叢才像從地裡長出來
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop';
  const gr = g.createLinearGradient(0, c.height, 0, c.height * 0.4);
  gr.addColorStop(0, 'rgba(36,32,58,0.42)'); gr.addColorStop(1, 'rgba(36,32,58,0)');
  g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
  return { c:c, w:wm, hm:hm, core:core };
}
function buildTurf(){
  const r = mkrng(seed ^ 0x2b1d), near = TH.near || '#86c06a', av = texAvg('ground_grass');
  const base = av ? mix(near, av, GRASS_A * TEX_A) : rgb(near);
  TURF.forEach(a => a.forEach(b => b.forEach(s => free(s.c))));   // 上一座山的草帶（顏色不同）釋放
  const cl = clumps();
  TURF = [[0.9, 0.3, 240, 26], [2.4, 0.26, 90, 60]].map(function(d, far){
    return [0, 1, 2].map(function(lv){
      const v = [0, 1, 2, 3].map(function(){ return turfSpr(d[0], d[1], d[2], d[3], base, lv, r); });   // 每種明暗 4 種草叢，排起來才不會一直重複
      if (cl && !far) for (let k = 0; k < CLUMP_N; k++) v.push(clumpStrip(cl, d[0], d[1], d[2], base, lv, r));   // 近景再加幾條美術圖草叢
      return v;
    });
  });
}
// 美術圖草叢 grass_clumps：一排好幾叢，照透明的空隙切開（只做一次）
const CLUMP_N = 2;
function clumps(){
  return keep('clumps', function(){
    const c = ART.crop('grass_clumps'); if (!c) return null;
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, col = x => { for (let y = 0; y < c.height; y++) if (d[(y * c.width + x) * 4 + 3] > 40) return true; return false; }, out = [];
    let x0 = -1;
    for (let x = 0; x <= c.width; x++) { const on = x < c.width && col(x); if (on && x0 < 0) x0 = x; if (!on && x0 >= 0) { if (x - x0 > 6) { const s = mk(x - x0, c.height); s.getContext('2d').drawImage(c, x0, 0, x - x0, c.height, 0, 0, x - x0, c.height); out.push(s); } x0 = -1; } }
    free(c);
    return out.length ? out : null;
  });
}
// 跟程式畫的草帶一樣大小的一條：三叢美術圖草排在草根範圍裡，再染上這座山、這個明暗的草色（美術圖顏色才跟地面一致）
function clumpStrip(cl, core, hm, ppm, base, lv, r){
  const pad = hm * 0.5, wm = core + pad * 2, c = mk(wm * ppm, hm * ppm), g = c.getContext('2d');
  for (let k = 0; k < 3; k++) {
    const s = cl[(r() * cl.length) | 0], h = hm * ppm * (0.65 + r() * 0.35), w = h * s.width / s.height, x = (pad + core * (k + 0.2 + r() * 0.6) / 3) * ppm;
    g.drawImage(s, 0, 0, s.width, s.height, x - w / 2, c.height - h, w, h);
  }
  g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.5; g.fillStyle = css(tone(base, lv)); g.fillRect(0, 0, c.width, c.height); g.globalAlpha = 1;
  const gr = g.createLinearGradient(0, c.height, 0, c.height * 0.4);
  gr.addColorStop(0, 'rgba(36,32,58,0.42)'); gr.addColorStop(1, 'rgba(36,32,58,0)');
  g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
  return { c:c, w:wm, hm:hm, core:core };
}
// 一段路兩側蓋草帶：固定 4 排，每排從路邊往外蓋到畫面外或稜線邊；明暗跟著所在那格坡面
// 每一叢的位置、大小、樣式只跟「這段路是第幾段（世界位置）」有關，跟離鏡頭幾段無關，走近時不會重新洗牌
// 近景草帶每個位置一叢；遠景草帶（比較寬）每三個位置一叢、放在三個位置的中間
function drawTurf(i, j, y1, y2, s1, fq, fade, DS, gw){
  const TN = TURF[0], TF = TURF[1], spN = TN[1][0], spF = TF[1][0], step = spN.core * 0.8, nS = DS.length, zj = pZ[j] / SEG;
  const base = fade * (1 - snowAmt) * (1 - fq) * clamp((turfJ() - zj) / 8, 0, 1);   // 遠處草葉跟著霧淡掉、最後 8 段慢慢消失
  if (base < 0.01) return;
  const nw = clamp((TURF_NEAR + 1.5 - zj) / 3, 0, 1), rowsW = (y1 - y2) / (0.6 * spN.hm * s1);   // nw：近景草帶佔幾成；rowsW：這段在畫面上排得下幾排
  for (let q = TURF_R - 1; q >= 0; q--) {
    const rk = TURF_RANK[q], ra = rk ? clamp(rowsW - rk, 0, 1) : 1, aN = base * ra * nw, aF = base * ra * (1 - nw);
    if (aN + aF < 0.01) continue;
    const sn = aN < 0.01 ? 3 : 1;   // 只剩遠景草帶時，只走每三個位置（位置還是同一組）
    for (let side = -1; side <= 1; side += 2) {
      let k = 1, n = 0;
      for (let d0 = RW + BANKW + spN.core * 0.5 - 0.12; d0 < gw - 0.4; d0 += step * sn, n += sn) {
        // 野地的草不整齊：一片密一片疏（patch 每幾段、每兩叢換一次）、有的位置空著露出地面，大小也不一樣；第一叢貼著路邊不跳
        const patch = Hh((i >> 2) * 13 + side, (n >> 1) + 70);
        if (n && Hh(i * 11 + q, n * 3 + side + 90) > 0.4 + 0.5 * patch) continue;
        const sc = 0.6 + 0.75 * Hh(i * 13 + q, n + side * 30), far = aF > 0.01 && n % 3 === 0;
        if (aN < 0.01 && !far) continue;
        proj(j, (q + 0.1 + 0.8 * Hh(i * 3 + q, n + side * 50)) / TURF_R, false);
        const d = d0 + (n ? (Hh(i * 5 + q, n + side * 40) - 0.5) * step : 0), x = gx + side * d * gs, dwN = spN.w * gs * sc, dwF = far ? spF.w * gs * sc : 0;
        if (side < 0 ? x + Math.max(dwN * 0.5, dwF * 0.5 - step * gs) < 0 : x - Math.max(dwN * 0.5, dwF * 0.5 + step * gs) > W) break;
        while (k < nS - 2 && d >= DS[k + 1]) k++;
        const lv = tLvS[(side + 1) * 4 + k], y = gy - terrH(i, side, d) * gs;
        if (aN >= 0.01) {
          const dh = spN.hm * gs * sc, v = TN[lv], sp = v[(Hh(i * 7 + q, n) * v.length) | 0];
          if (y - dh < H && y > 0) { ctx.globalAlpha = aN; ctx.drawImage(mip(sp.c, dwN * DPR), x - dwN * 0.5, y - dh, dwN, dh); }
        }
        if (far) {
          const dF = d + step, xF = gx + side * dF * gs, yF = gy - terrH(i, side, dF) * gs, dh = spF.hm * gs * sc, v = TF[lv], sp = v[(Hh(i * 7 + q, n) * v.length) | 0];
          if (yF - dh < H && yF > 0) { ctx.globalAlpha = aF; ctx.drawImage(mip(sp.c, dwF * DPR), xF - dwF * 0.5, yF - dh, dwF, dh); }
        }
      }
    }
  }
  ctx.globalAlpha = fade;
}
function blade(g, x, ang, len, wid, col, lw){
  const tx = x + Math.sin(ang) * len, ty = -Math.cos(ang) * len, mx = x + Math.sin(ang * 0.4) * len * 0.55, my = -Math.cos(ang * 0.4) * len * 0.55;
  g.beginPath(); g.moveTo(x - wid, 0); g.quadraticCurveTo(mx - wid, my, tx, ty); g.quadraticCurveTo(mx + wid, my, x + wid, 0); g.closePath();
  g.fillStyle = col; g.fill(); if (lw) { g.lineWidth = lw; g.strokeStyle = INK; g.stroke(); }
}
function flower(g, x, y, s, col){
  dot(g, x, y, s * 1.25, SH(col, 0.35)); g.lineWidth = LW * 0.6; g.strokeStyle = INK; g.stroke();
  for (let k = 0; k < 5; k++) { const a = k / 5 * TAU - 0.4; dot(g, x + Math.cos(a) * s * 0.62, y + Math.sin(a) * s * 0.62, s * 0.55, k === 3 || k === 2 ? SH(col, 0.14) : col); }
  dot(g, x, y, s * 0.3, '#ffe9a0');
}
function pConifer(g, r, lt, sh){
  const hT = 5.2 + r() * 1.1;
  cel(g, pR(-0.14, -1.3, 0.28, 1.3, 0.05), '#8a6648', '#5e4334', 0.07, 0, LW);
  for (let i = 0; i < 5; i++) {
    const t = i / 4, yb = -0.8 - t * (hT - 1.9), w = 1.55 * (1 - t * 0.72) * (0.9 + r() * 0.2), yt = yb - (1.5 - t * 0.5), n = 5;
    const pts = [0, yt, w * 0.55, yb - 0.45, w, yb];
    for (let k = 1; k <= n; k++) { const x = w - 2 * w * k / n; pts.push(x + w / n, yb - 0.2 - r() * 0.08, x, yb + (k < n ? (r() - 0.5) * 0.12 : 0)); }
    pts.push(-w * 0.55, yb - 0.45);
    cel(g, pP(pts), lt, sh, w * 0.24, -0.05, LW);
  }
}
function pBroad(g, r){
  const tr = new Path2D(); tr.moveTo(-0.22, 0); tr.quadraticCurveTo(-0.1, -1.2, -0.16, -2.3); tr.lineTo(0.14, -2.3); tr.quadraticCurveTo(0.12, -1.2, 0.26, 0); tr.closePath();
  cel(g, tr, '#94684a', '#5f4236', 0.08, 0, LW);
  const bl = [[-0.75, -2.5, 0.85, 0.7], [0.8, -2.7, 0.85, 0.72], [0, -3.35, 1.1, 0.9]];
  for (let i = 0; i < 3; i++) { const b = bl[i]; cel(g, pBlob(b[0], b[1], b[2] * (0.9 + r() * 0.2), b[3], 9, r, 0.22), VG.bushL, VG.treeS, 0.2, -0.14, LW); }
  g.strokeStyle = rgba(INK, 0.35); g.lineWidth = LW * 0.7;
  for (let i = 0; i < 8; i++) { const x = (r() - 0.5) * 2.4, y = -2.3 - r() * 1.5; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 0.1, y - 0.12, x + 0.22, y - 0.03); g.stroke(); }
}
function pBigTree(g, r){
  const tr = new Path2D(); tr.moveTo(-1.05, 0); tr.quadraticCurveTo(-0.55, -0.6, -0.6, -3); tr.lineTo(-0.5, -6.2); tr.lineTo(0.5, -6.2); tr.lineTo(0.62, -3); tr.quadraticCurveTo(0.6, -0.6, 1.15, 0); tr.closePath();
  cel(g, tr, '#a8684a', '#6e4038', 0.3, 0, LW * 1.4);
  g.strokeStyle = rgba(INK, 0.45); g.lineWidth = LW;
  for (let i = 0; i < 7; i++) { const x = -0.42 + i * 0.14; seg(g, x, -0.4 - r(), x + (r() - 0.5) * 0.1, -2.4 - r() * 3); }
  const bl = [[-1.3, -6.3, 1.4, 1.05], [1.3, -6.6, 1.4, 1.1], [0, -7.5, 1.9, 1.4], [-0.8, -8.5, 1.25, 0.95], [0.75, -8.8, 1.15, 0.85]];
  for (let i = 0; i < bl.length; i++) { const b = bl[i]; cel(g, pBlob(b[0], b[1], b[2], b[3], 9, r, 0.2), VG.treeL, VG.treeS, 0.3, -0.2, LW * 1.4); }
}
function pSakura(g, r){
  const tr = new Path2D(); tr.moveTo(-0.2, 0); tr.quadraticCurveTo(-0.25, -1, 0.05, -1.9); tr.lineTo(0.3, -1.85); tr.quadraticCurveTo(0.05, -1, 0.22, 0); tr.closePath();
  cel(g, tr, '#7a5a52', '#4e3838', 0.07, 0, LW);
  const bl = [[-0.8, -2.2, 0.9, 0.7], [0.9, -2.3, 0.9, 0.7], [0.1, -3.0, 1.15, 0.9]];
  for (let i = 0; i < 3; i++) { const b = bl[i]; cel(g, pBlob(b[0], b[1], b[2], b[3], 10, r, 0.2), '#fbd3df', '#e79ab8', 0.2, -0.14, LW); }
  for (let i = 0; i < 22; i++) dot(g, (r() - 0.5) * 3, -1.9 - r() * 1.8, 0.05 + r() * 0.04, r() < 0.5 ? '#fff0f4' : '#f3a9c2');
}
function pRhodo(g, r, fl){
  cel(g, pBlob(0, -0.55, 0.8, 0.52, 9, r, 0.25), VG.bushL, VG.bushS, 0.16, -0.12, LW);
  g.strokeStyle = rgba(INK, 0.35); g.lineWidth = LW * 0.7;
  for (let i = 0; i < 6; i++) { const x = (r() - 0.5) * 1.1, y = -0.3 - r() * 0.6; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 0.08, y - 0.1, x + 0.16, y - 0.04); g.stroke(); }
  for (let i = 0; i < 7; i++) flower(g, (r() - 0.5) * 1.3, -0.35 - r() * 0.65, 0.085 + r() * 0.03, fl);
}
function pRock(g, r){
  const n = 7, pts = [], rx = 0.42 + r() * 0.2, ry = 0.3 + r() * 0.12;
  for (let i = 0; i < n; i++) { const a = Math.PI + i / (n - 1) * Math.PI, k = 0.82 + r() * 0.36; pts.push(Math.cos(a) * rx * k, Math.sin(a) * ry * k - 0.02); }
  pts[1] = 0; pts[n * 2 - 1] = 0;
  cel(g, pP(pts), '#cfc6b8', '#8f8794', 0.12, -0.07, LW);
  g.strokeStyle = rgba(INK, 0.4); g.lineWidth = LW * 0.7; seg(g, -0.1, -0.2, 0.02, -0.08); seg(g, 0.02, -0.08, 0.14, -0.1);
  cel(g, pE(rx * 0.85, -0.07, 0.14, 0.09, 0), '#c4baac', '#878090', 0.04, -0.03, LW);
  blade(g, -rx * 0.8, -0.5, 0.2, 0.025, VG.grassL, LW * 0.6); blade(g, -rx * 0.7, 0.3, 0.24, 0.025, VG.grassS, LW * 0.6);
}
function pTuft(g, r, n, hgt, spread, wid, a, b){
  for (let i = 0; i < n; i++) { const t = n > 1 ? i / (n - 1) : 0.5; blade(g, (t - 0.5) * 0.3 + (r() - 0.5) * 0.08, (t - 0.5) * spread + (r() - 0.5) * 0.25, hgt * (0.6 + r() * 0.4), wid, i % 2 ? a : b, LW * 0.6); }
}
function pFern(g, r){
  for (let i = 0; i < 6; i++) {
    const a = (i / 5 - 0.5) * 2.5 + (r() - 0.5) * 0.2, len = 0.5 + r() * 0.2, ex = Math.sin(a) * len, ey = -Math.cos(a) * len * 0.75 - 0.05, mx = ex * 0.35, my = ey * 1.15 - 0.12;
    for (let k = 1; k <= 8; k++) {
      const t = k / 8.5, u = 1 - t, x = 2 * u * t * mx + t * t * ex, y = 2 * u * t * my + t * t * ey, tx = 2 * u * mx + 2 * t * (ex - mx), ty = 2 * u * my + 2 * t * (ey - my), an = Math.atan2(ty, tx), L = 0.1 * (1 - t * 0.7);
      for (let sd = -1; sd <= 1; sd += 2) { g.beginPath(); g.ellipse(x + Math.cos(an + sd * 1.25) * L, y + Math.sin(an + sd * 1.25) * L, L, L * 0.36, an + sd * 1.25, 0, TAU); g.fillStyle = sd * ex > 0 ? VG.grassL : VG.bushS; g.fill(); g.lineWidth = LW * 0.45; g.strokeStyle = rgba(INK, 0.55); g.stroke(); }
    }
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(mx, my, ex, ey); g.lineWidth = LW * 0.8; g.strokeStyle = INK; g.stroke();
  }
}
function pSilver(g, r){
  pTuft(g, r, 9, 1.3, 1.5, 0.028, VG.grassL, VG.grassS);
  for (let i = 0; i < 4; i++) { const a = (i / 3 - 0.5) * 0.9 + (r() - 0.5) * 0.2, L = 1.2 + r() * 0.35, x = Math.sin(a) * L, y = -Math.cos(a) * L; g.strokeStyle = INK; g.lineWidth = LW * 0.7; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(x * 0.3, y * 0.7, x, y); g.stroke(); cel(g, pE(x + Math.sin(a + 0.5) * 0.14, y - 0.1, 0.07, 0.22, a + 0.5), '#fbf1d8', '#d9c4a0', 0.02, -0.02, LW * 0.6); }
}
function pFlowers(g, r, col){
  pTuft(g, r, 5, 0.26, 1.6, 0.02, VG.grassL, VG.grassS);
  for (let i = 0; i < 4; i++) { const x = (r() - 0.5) * 0.5, y = -0.14 - r() * 0.2; g.strokeStyle = INK; g.lineWidth = LW * 0.5; seg(g, x * 0.4, 0, x, y); flower(g, x, y, 0.045, col); }
}
function wood(g, p, lt){ cel(g, p, lt || '#c99a66', '#8a5f42', 0.03, -0.03, LW); }
function pSign(g, txt){
  wood(g, pR(-0.06, -1.4, 0.12, 1.4, 0.03), '#b98a5a');
  wood(g, pP([-0.6, -1.3, 0.52, -1.33, 0.62, -1.12, 0.5, -0.9, -0.58, -0.88]), '#e2bd86');
  g.strokeStyle = rgba(INK, 0.3); g.lineWidth = LW * 0.6; seg(g, -0.5, -1.2, 0.45, -1.22); seg(g, -0.5, -0.98, 0.4, -0.99);
  dot(g, -0.5, -1.1, 0.02, INK); dot(g, 0.47, -1.11, 0.02, INK);
  sText(g, txt, -0.03, -1.1, 0.2, INK);
}
function pSummit(g, name){
  cel(g, pE(-0.25, -0.06, 0.26, 0.11, 0), '#cfc6b8', '#8f8794', 0.06, -0.04, LW); cel(g, pE(0.3, -0.05, 0.2, 0.09, 0), '#c4baac', '#878090', 0.05, -0.03, LW);
  cel(g, pR(-0.2, -1.5, 0.4, 1.5, 0.05), '#e4ddcf', '#a59cab', 0.09, -0.02, LW);
  cel(g, pR(-0.2, -1.5, 0.4, 0.12, 0.04), '#e0664a', '#aa4038', 0.06, -0.02, LW);
  const n = Math.min(4, name.length); for (let i = 0; i < n; i++) sText(g, name[i], 0, -1.2 + i * 0.27, 0.24, INK);
}
function pNote(g){
  wood(g, pR(-0.05, -1.1, 0.1, 1.1, 0.03), '#b98a5a');
  wood(g, pR(-0.3, -1.3, 0.6, 0.5, 0.04), '#d9b27c');
  g.save(); g.translate(0.01, -1.05); g.rotate(-0.07);
  cel(g, pR(-0.2, -0.18, 0.4, 0.34, 0.015), '#fff8e2', '#e6d6b0', 0.03, -0.02, LW * 0.8);
  g.strokeStyle = rgba(INK, 0.5); g.lineWidth = LW * 0.6; seg(g, -0.13, -0.08, 0.12, -0.08); seg(g, -0.13, 0, 0.1, 0); seg(g, -0.13, 0.08, 0.04, 0.08);
  dot(g, 0, -0.15, 0.035, '#e0553f'); g.lineWidth = LW * 0.6; g.strokeStyle = INK; g.stroke();
  g.restore();
}
function pBTree(g, r){
  const tr = new Path2D(); tr.moveTo(-0.24, 0); tr.quadraticCurveTo(-0.05, -0.9, -0.2, -1.7); tr.lineTo(0.12, -1.7); tr.quadraticCurveTo(0.14, -0.9, 0.3, 0); tr.closePath();
  cel(g, tr, '#94684a', '#5f4236', 0.08, 0, LW);
  const bl = [[-0.7, -1.95, 0.75, 0.6], [0.72, -2.05, 0.75, 0.6], [0, -2.6, 1.0, 0.8]];
  for (let i = 0; i < 3; i++) { const b = bl[i]; cel(g, pBlob(b[0], b[1], b[2], b[3], 9, r, 0.2), VG.bushL, VG.treeS, 0.18, -0.12, LW); }
  const cols = ['#e0604a', '#fff3d6', '#f0b44c', '#e98aa8', '#fff3d6', '#e0604a', '#8fc0d8'];
  for (let i = 0; i < 7; i++) {
    const x = -1.05 + i * 0.35 + (r() - 0.5) * 0.1, y = -1.5 - Math.sin(i / 6 * Math.PI) * 0.12 + r() * 0.2, L = 0.18 + r() * 0.16;
    g.strokeStyle = INK; g.lineWidth = LW * 0.5; seg(g, x, y - 0.2, x, y + L);
    g.save(); g.translate(x, y + L); g.rotate((r() - 0.5) * 0.3); cel(g, pR(-0.08, 0, 0.16, 0.22, 0.02), cols[i], SH(cols[i], 0.25), 0.02, -0.02, LW * 0.7); g.restore();
  }
}
function pCairn(g, big){
  const st = big ? [[0, -0.13, 0.36, 0.14], [-0.03, -0.34, 0.28, 0.12], [0.03, -0.53, 0.2, 0.1], [0, -0.68, 0.12, 0.075]] : [[0, -0.07, 0.19, 0.08], [0.01, -0.19, 0.13, 0.065], [-0.01, -0.29, 0.08, 0.05]];
  for (let i = 0; i < st.length; i++) {
    const s = st[i];
    if (big && i === 3) { g.save(); g.translate(0.1, -0.6); g.rotate(0.2); cel(g, pR(-0.02, -0.04, 0.24, 0.16, 0.01), '#fff8e2', '#e6d6b0', 0.02, -0.01, LW * 0.7); g.restore(); }
    cel(g, pE(s[0], s[1], s[2], s[3], (i % 2 ? 0.06 : -0.05)), i % 2 ? '#d6cdbf' : '#c6bcae', '#8a8290', s[2] * 0.2, -s[3] * 0.3, LW);
  }
}
function pBench(g){
  wood(g, pR(-0.72, -0.42, 0.13, 0.42, 0.03), '#a87a52'); wood(g, pR(0.59, -0.42, 0.13, 0.42, 0.03), '#a87a52');
  wood(g, pR(-0.85, -0.52, 1.7, 0.13, 0.03), '#b0845a');
  wood(g, pP([-0.85, -0.52, 0.85, -0.52, 0.76, -0.74, -0.76, -0.74]), '#e2bd86');
  g.strokeStyle = rgba(INK, 0.4); g.lineWidth = LW * 0.6; seg(g, -0.8, -0.63, 0.8, -0.63);
  dot(g, -0.66, -0.57, 0.018, INK); dot(g, 0.66, -0.57, 0.018, INK);
}
function pView(g){
  for (let i = -1; i <= 1; i++) wood(g, pR(i * 1.3 - 0.08, -0.2, 0.16, 0.2, 0.02), '#8f6848');
  const px = [-1.45, -0.72, 0, 0.72, 1.45];
  for (let i = 0; i < 5; i++) wood(g, pR(px[i] - 0.05, -1.5, 0.1, 0.9, 0.02), '#b98a5a');
  wood(g, pR(-1.52, -1.56, 3.04, 0.11, 0.04), '#e2bd86'); wood(g, pR(-1.48, -1.12, 2.96, 0.08, 0.03), '#c99a66');
  wood(g, pR(-1.7, -0.3, 3.4, 0.2, 0.03), '#a87a52');
  wood(g, pP([-1.7, -0.3, 1.7, -0.3, 1.47, -0.68, -1.47, -0.68]), '#e2bd86');
  g.strokeStyle = rgba(INK, 0.4); g.lineWidth = LW * 0.6;
  for (let i = -3; i <= 3; i++) seg(g, i * 0.46, -0.3, i * 0.4, -0.68);
  wood(g, pR(-0.36, -1.44, 0.72, 0.28, 0.03), '#f0d9a8'); sText(g, '觀景台', 0, -1.3, 0.18, INK);
}
function pTreasure(g){
  cel(g, pR(-0.22, -0.26, 0.44, 0.26, 0.04), '#c58a4a', '#8a5a3a', 0.05, -0.03, LW);
  cel(g, pR(-0.245, -0.42, 0.49, 0.2, 0.09), '#e0a858', '#a8703f', 0.05, -0.03, LW);
  g.fillStyle = '#f6d36a'; g.fillRect(-0.04, -0.42, 0.08, 0.42); g.strokeStyle = INK; g.lineWidth = LW * 0.6; g.strokeRect(-0.04, -0.42, 0.08, 0.42);
  cel(g, pR(-0.055, -0.3, 0.11, 0.11, 0.02), '#ffe9a0', '#d9a83f', 0.02, -0.01, LW * 0.7);
}
function mkTab(list){ let sum = 0; for (let i = 0; i < list.length; i++) sum += list[i][1]; let acc = 0; return list.map(function(e){ acc += e[1] / sum; return { p:acc, arr:e[0] }; }); }
function pick(tab, r){ for (let i = 0; i < tab.length; i++) if (r < tab[i].p) return tab[i].arr; return tab[tab.length - 1].arr; }
// 美術圖山頂三角點（summit_marker）：石柱正面直寫山名。正面位置是照這張圖量的（裁掉透明邊後的比例）
const SUMMIT_FACE = { x:0.4, y0:0.3, y1:0.8, w:0.34 };
// 路標、三角點的底圖（裁好、底部壓暗）只做一次，每塊牌子再抄一份寫字
function shadedArt(id){ return keep('base:' + id, function(){ const c = ART.crop(id); if (c) groundShade(c); return c; }); }
function artSummitSpr(name){
  const c0 = shadedArt('summit_marker'); if (!c0) return null;
  const c = mk(c0.width, c0.height), g = c.getContext('2d'), B = SUMMIT_FACE, n = Math.min(4, name.length); g.drawImage(c0, 0, 0);
  const fs = Math.min(c.width * B.w * 0.85, (B.y1 - B.y0) * c.height / n * 0.82);
  g.font = '700 ' + fs + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(120,30,26,.85)';
  for (let i = 0; i < n; i++) g.fillText(name[i], c.width * B.x, c.height * B.y0 + fs * (i + 0.6));
  const h = mk(c.width / 2, c.height / 2), hg = h.getContext('2d');
  hg.drawImage(c, 0, 0, h.width, h.height); hg.globalCompositeOperation = 'source-atop'; hg.fillStyle = hazeCss; hg.fillRect(0, 0, h.width, h.height);
  return { c:c, h:h, w:SCALE.summit * c.width / c.height, hm:SCALE.summit, ax:0.5 };
}
function getSign(txt){ return signSpr[txt] || (signSpr[txt] = artSignSpr(txt) || sprite(SCALE.sign * 0.93, SCALE.sign, 80, function(g){ pSign(g, txt); })); }
// 美術圖路標（sign_wood）：上面那塊箭頭木板寫字。木板位置是照這張圖量的（裁掉透明邊後的比例）
const SIGN_BOARD = { x:0.54, y:0.175, w:0.62, h:0.075, rot:-0.07 };
function artSignSpr(txt){
  const c0 = shadedArt('sign_wood'); if (!c0) return null;
  const c = mk(c0.width, c0.height), g = c.getContext('2d'), B = SIGN_BOARD; g.drawImage(c0, 0, 0);
  g.save(); g.translate(c.width * B.x, c.height * B.y); g.rotate(B.rot);
  let fs = c.height * B.h; g.font = '700 ' + fs + 'px ' + FONT; const tw = g.measureText(txt).width; if (tw > c.width * B.w) { fs *= c.width * B.w / tw; g.font = '700 ' + fs + 'px ' + FONT; }
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(58,36,22,.88)'; g.fillText(txt, 0, 0); g.restore();
  const h = mk(c.width / 2, c.height / 2), hg = h.getContext('2d');
  hg.drawImage(c, 0, 0, h.width, h.height); hg.globalCompositeOperation = 'source-atop'; hg.fillStyle = hazeCss; hg.fillRect(0, 0, h.width, h.height);
  return { c:c, h:h, w:SCALE.sign * c.width / c.height, hm:SCALE.sign, ax:0.5 };
}
function buildSprites(){
  const r = mkrng(seed ^ 0x7f4a7c15), th = TH, a = [];
  // 上一座山專用的貼圖（寫了字的路標、三角點、程式畫的植物）用完就釋放；共用的美術圖留著
  const dropSpr = s => { if (s && s.c && !s.shared) { free(s.c); free(s.h); } };
  for (const k in signSpr) dropSpr(signSpr[k]);
  for (const k in SPR) if (Array.isArray(SPR[k])) SPR[k].forEach(dropSpr);
  SPR = {}; signSpr = {};
  const tL = VG.treeL, tS = VG.treeS;
  SPR.conifer = artOr('tree_pine', SCALE.pine, [0, 1, 2].map(function(){ return sprite(SCALE.pine * 0.53, SCALE.pine, 44, function(g){ pConifer(g, r, tL, tS); }, SINK_DEF); }));
  buildTex(); buildTurf();
  if (th.snow) SPR.coniferS = artOr('tree_pine_snow', SCALE.pine, ART.get('tree_pine') ? null : [0, 1].map(function(){ return sprite(SCALE.pine * 0.53, SCALE.pine, 44, function(g){ pConifer(g, r, '#f4f8fb', mixs(tS, '#9fb4cc', 0.5)); }, SINK_DEF); }));
  SPR.broad = artOr('tree_broad', SCALE.broad, [0, 1].map(function(){ return sprite(SCALE.broad * 0.875, SCALE.broad, 44, function(g){ pBroad(g, r); }, SINK_DEF); }));
  if (th.bigtree) SPR.bigtree = artOr('tree_big', SCALE.bigtree, [sprite(SCALE.bigtree * 0.68, SCALE.bigtree, 26, function(g){ pBigTree(g, r); }, SINK_DEF)]);
  if (th.sakura) SPR.sakura = artOr('tree_sakura', SCALE.sakura, [sprite(SCALE.sakura * 1.05, SCALE.sakura, 44, function(g){ pSakura(g, r); }, SINK_DEF)]);
  SPR.rhodo = artOr('bush_rhodo', SCALE.rhodo, ['#f08fb0', '#f7b4c8', '#e9769e'].map(function(col){ return sprite(SCALE.rhodo * 1.64, SCALE.rhodo, 80, function(g){ pRhodo(g, r, col); }); }));
  SPR.rock = artOr('rock_moss', SCALE.rock, [0, 1, 2].map(function(){ return sprite(SCALE.rock * 2.1, SCALE.rock, 80, function(g){ pRock(g, r); }); }));
  SPR.bamboo = artOr('bamboo_dwarf', SCALE.bamboo, [0, 1].map(function(){ return sprite(SCALE.bamboo * 1.25, SCALE.bamboo, 80, function(g){ pTuft(g, r, 13, 1.05, 2.0, 0.03, mixs(VG.grassL, '#e4dc7a', 0.3), VG.grassS); }); }));
  SPR.fern = artOr('fern', SCALE.fern, [0, 1].map(function(){ return sprite(SCALE.fern * 1.9, SCALE.fern, 80, function(g){ pFern(g, r); }); }));
  SPR.grass = artOr('grass_tuft', SCALE.grass, [0, 1].map(function(){ return sprite(SCALE.grass * 1.64, SCALE.grass, 80, function(g){ pTuft(g, r, 7, 0.45, 1.7, 0.024, VG.grassL, VG.grassS); }); }));
  SPR.flower = artOr('flowers', SCALE.flower, ['#ffe07a', '#ffffff', '#b99ae6'].map(function(col){ return sprite(SCALE.flower * 1.6, SCALE.flower, 80, function(g){ pFlowers(g, r, col); }); }));
  SPR.silver = artOr('grass_silver', SCALE.silver, [0, 1].map(function(){ return sprite(SCALE.silver, SCALE.silver, 80, function(g){ pSilver(g, r); }); }));
  SPR.note = artOr('note_post', SCALE.note, [sprite(SCALE.note * 0.6, SCALE.note, 80, pNote)]);
  SPR.btree = artOr('wish_tree', SCALE.wishtree, [sprite(SCALE.wishtree * 0.97, SCALE.wishtree, 60, function(g){ pBTree(g, r); }, SINK_DEF)]);
  SPR.cairn = artOr('cairn', SCALE.cairn, [sprite(SCALE.cairn * 1.05, SCALE.cairn, 80, function(g){ pCairn(g, true); })]);
  SPR.mycairn = artOr('cairn', SCALE.mycairn, [sprite(SCALE.mycairn * 1.33, SCALE.mycairn, 80, function(g){ pCairn(g, false); })]);
  SPR.bench = artOr('bench', SCALE.bench, [sprite(SCALE.bench * 2.1, SCALE.bench, 80, pBench)]);
  SPR.view = artOr('deck_view', SCALE.view, [sprite(SCALE.view * 2.1, SCALE.view, 70, pView)]);
  SPR.fall = artOr('waterfall', SCALE.fall, []);      // 只有美術圖：路旁小瀑布
  SPR.railPost = artOr('rail_post', SCALE.railPost, null); SPR.railBar = artOr('rail_bar', SCALE.railBar, null);   // 兩張都有才用美術圖欄杆，不然照舊程式畫
  SPR.hut = artOr('hut_paiyun', SCALE.hut, null); SPR.hut369 = artOr('hut_369', SCALE.hut369, null); SPR.hutjm = artOr('hut_jiaming', SCALE.hutjm, null); SPR.shrine = artOr('shrine_small', SCALE.shrine, null); SPR.station = artOr('weather_station', SCALE.station, null); SPR.rockwall = artOr('rock_wall', SCALE.rockwall, null);   // 路旁地標（只有美術圖）
  SPR.hedgeFern = artOr('hedge_fern', SCALE.hedgeFern, null); SPR.bambooT = artOr('bamboo_tall', SCALE.bambooTall, null);   // 植物牆：森林的蕨類叢、高山的高箭竹（只有美術圖）
  const tk = TH.alpine ? null : trunkSpr(SCALE.trunk); SPR.trunk = tk ? [tk] : null;   // 森林步道貼近鏡頭的高樹幹
  SPR.treasure = artOr('treasure_box', SCALE.treasure, [sprite(SCALE.treasure * 1.17, SCALE.treasure, 80, pTreasure)]);
  SPR.summit = [artSummitSpr((M && M.name) || '山頂') || sprite(SCALE.summit * 0.76, SCALE.summit, 80, function(g){ pSummit(g, (M && M.name) || '山頂'); })];
  // 依山的主題決定路旁植物比例
  const al = th.alpine;
  smallTab = mkTab([[SPR.rhodo, al ? 3 : 1.4], [SPR.rock, (al || th.rocks || th.trail === 'scree') ? 3 : 1], [SPR.bamboo, al ? 3 : 0.5], [SPR.fern, al ? 0.3 : 2.5], [SPR.grass, 3], [SPR.flower, 1.5], [SPR.silver, th.grass ? 3 : 0.3]]);
  edgeTab = mkTab([[SPR.grass, 3], [SPR.fern, al ? 0.6 : 2], [SPR.flower, 1]]);   // 蓋過路緣的矮草（不放灌木、石頭，才不會擋路）
  // 路旁植物牆：森林是蕨類＋灌木＋箭竹擠成一道綠牆；高山是玉山箭竹＋杜鵑貼著步道
  hedgeTab = mkTab((al ? [[SPR.bamboo, 5], [SPR.bambooT, 2.5], [SPR.rhodo, 2], [SPR.rock, th.trail === 'scree' ? 1.5 : 0.6], [SPR.grass, 1], [SPR.silver, th.grass ? 1.5 : 0]]
    : [[SPR.fern, 4], [SPR.hedgeFern, 3.5], [SPR.bamboo, 1.6], [SPR.rhodo, 1.1], [SPR.silver, th.grass ? 2 : 0.4], [SPR.grass, 1], [SPR.rock, th.rocks ? 0.8 : 0.3]]).filter(e => e[0]));   // 沒有美術圖的那幾種拿掉
  const paintedPine =!!ART.get('tree_pine') && !ART.get('tree_broad');   // 手繪松樹旁邊放太多卡通圓樹會很不搭
  a.push([SPR.conifer, al ? 3 : (paintedPine ? 3 : 1.6)], [SPR.broad, al ? 0.01 : (paintedPine ? 0.5 : 2.4)]);
  if (SPR.bigtree) a.push([SPR.bigtree, 0.5]);
  if (SPR.sakura) a.push([SPR.sakura, 1.3]);
  treeTab = mkTab(a);
}

// ═════════ 世界生成：彎道、坡度、道具位置（每座山固定） ═════════
const BEND_GAP = 260;    // 真實路線的轉彎之間，直線超過這麼長（公尺）就在中間補一個彎
function buildCurves(m){
  const r = mkrng(seed ^ 0x9e3779b9), rt = m.route; let i;
  if (rt && rt.length >= 3) {
    // 依真實路線折線的轉角決定左右彎，讓 2.5D 山徑和雷達圖一致
    const n = rt.length, cum = [0];
    for (i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(rt[i][0] - rt[i - 1][0], rt[i][1] - rt[i - 1][1]));
    const mpu = total / (cum[n - 1] || 1);
    for (i = 1; i < n - 1; i++) {
      const ax = rt[i][0] - rt[i - 1][0], ay = rt[i][1] - rt[i - 1][1], bx = rt[i + 1][0] - rt[i][0], by = rt[i + 1][1] - rt[i][1];
      const ang = Math.atan2(ax * by - ay * bx, ax * bx + ay * by);      // y 向下：正值 = 右彎
      const lenB = clamp(Math.min(cum[i] - cum[i - 1], cum[i + 1] - cum[i]) * mpu * 0.8, 40, 140);
      const c = clamp(ang / lenB * SEG * SEG, -0.03, 0.03), s0 = Math.floor((cum[i] * mpu - lenB / 2) / SEG), cnt = Math.ceil(lenB / SEG);
      for (let k = 0; k < cnt; k++) { const j = s0 + k; if (j >= 0 && j < N) curve[j] += c * 1.57 * Math.sin((k + 0.5) / cnt * Math.PI); }
    }
    // 很長的直線（超過 BEND_GAP）中間補一個明顯的彎：直線就是直線、彎就是彎，不再整條路一直微微左右擺（登山客看起來像斜著走）
    let run = 0, sign = r() < 0.5 ? -1 : 1;
    for (i = 0; i <= N; i++) {
      if (i < N && curve[i] === 0) { run++; continue; }
      if (run * SEG > BEND_GAP) {
        const cnt = Math.round((50 + r() * 40) / SEG), s0 = i - Math.round(run / 2) - (cnt >> 1), amp = sign * (0.008 + r() * 0.008);
        for (let k = 0; k < cnt; k++) curve[s0 + k] = amp * Math.sin((k + 0.5) / cnt * Math.PI);
        sign = -sign;
      }
      run = 0;
    }
    for (i = 0; i < N; i++) curve[i] = clamp(curve[i], -0.032, 0.032);
  } else {
    // 沒有路線資料：固定亂數的彎，彎和彎之間留一段真的直線
    i = 8; let sign = r() < 0.5 ? -1 : 1;
    while (i < N) {
      const len = 20 + Math.floor(r() * 45), amp = sign * (0.006 + r() * 0.014);
      for (let k = 0; k < len && i < N; k++, i++) curve[i] = amp * Math.sin((k + 0.5) / len * Math.PI);
      i += 25 + Math.floor(r() * 40); sign = r() < 0.78 ? -sign : sign;
    }
  }
  const e = Math.floor(total / SEG);
  for (i = e; i <= N; i++) curve[i] *= Math.max(0, 1 - (i - e) / 20);   // 山頂之後拉直
  head[0] = 0; for (i = 0; i <= N; i++) head[i + 1] = head[i] + curve[i] / SEG;
}
// 畫面上的坡度（只影響畫面，不影響海拔數字）：真實平均坡度只有 1～15%，照實畫看起來像平路
// 所以整體坡度乘上 CLIMB，再穿插一長段一長段的陡階梯（STAIR_SL），從背後看才會一階一階往上疊到天空
const CLIMB = 1.7;
// 山頂過後：路再走 road 公尺後花 fade 公尺慢慢長滿草；plat 公尺內是平的山頂，再過去地面往下掉（每公尺掉 drop 公尺），前面只剩天空和遠山
const TOP = { road:3, fade:8, plat:16, drop:1.4 };
function endK(i){ return clamp((i * SEG - total - TOP.road) / TOP.fade, 0, 1); }   // 0＝還在路上、1＝山頂過後已經沒有路
const STAIR_SL = [0.34, 0.6];   // 連續階梯段的坡度範圍（真實石階大約 0.5～0.7）
const STAIR_RUN = { stairs:0.36, wood:0.56, dirt:0.62, scree:0.66 };   // 長段落雜訊超過這個值就是連續階梯（越小＝階梯越多）
function buildElev(m){
  const tr = TH.trail || 'dirt', base = clamp(((m.alt || 0) - (m.startAlt || 0)) / total, 0.05, 0.3) * 1.25 * CLIMB, e = Math.floor(total / SEG);
  elev[0] = 0; let sl = base * 0.5;
  for (let i = 0; i <= N; i++) {
    const stairy = vn(i * 0.028, 11) > STAIR_RUN[tr];          // 約 30～90 公尺一段的連續階梯
    let tg = stairy ? lerp(STAIR_SL[0], STAIR_SL[1], vn(i * 0.05, 12)) : clamp(base * (0.3 + 1.4 * vn(i * 0.035, 7)) + 0.05 * (vn(i * 0.21, 8) - 0.3), 0.04, 0.4);
    const dip = !stairy && i > 20 ? clamp((vn(i * 0.017, 13) - 0.74) * 5, 0, 1) : 0;   // 偶爾一小段往下（約 30～60 公尺）：先下坡再爬，路才有起伏
    if (dip > 0) tg = lerp(tg, -0.09, dip);
    if (i >= e) tg = i * SEG < total + TOP.plat ? 0 : -TOP.drop * clamp((i * SEG - total - TOP.plat) / 12, 0, 1);   // 山頂：平平的一小塊，再過去地面圓圓地往下掉，前面只剩天空和遠山
    sl += (tg - sl) * 0.3;                                       // 坡度慢慢變，階梯段的起訖才不會折成一個尖角
    elev[i + 1] = elev[i] + sl * SEG;
    stepF[i] = ((stairy && sl > 0.16) || sl > 0.3) ? 1 : 0;      // 很陡的土坡也做成階梯（真實步道陡處都有木頭或石頭階梯）
  }
}
function buildProps(){
  const r = mkrng(seed ^ 0x51ed27), lim = total - 18, TT = ['note', 'btree', 'cairn']; let m, o;
  props = [];
  function put(type, mm, side){
    mm = Math.round(mm);
    for (let k = 0; k < props.length; k++) if (Math.abs(props[k].m - mm) < 14) { mm += 16; k = -1; }
    if (mm < 25 || mm > lim) return null;
    const p = { type:type, m:mm, side:side, text:'' }; props.push(p); return p;
  }
  for (m = 45 + r() * 60; m < lim; m += 150 + r() * 110) put(TT[Math.floor(r() * 3)], m, r() < 0.5 ? -1 : 1);
  for (m = 160 + r() * 120; m < lim; m += 300 + r() * 150) put('bench', m, r() < 0.5 ? -1 : 1);
  for (m = 420 + r() * 250; m < lim; m += 700 + r() * 300) put('view', m, r() < 0.5 ? -1 : 1);
  for (m = 260 + r() * 400; m < lim; m += 600 + r() * 600) put('treasure', m, r() < 0.5 ? -1 : 1);
  for (m = 500; m < lim; m += 500) { o = put('sign', m, 1); if (o) { const left = total - m; o.text = left >= 1000 ? '山頂 ' + (left / 1000).toFixed(1) + 'K' : '山頂 ' + Math.round(left / 10) * 10 + 'm'; } }
  // 只有美術圖才有的景物，放在最後（不影響上面固定道具的位置）：小瀑布（中低海拔）。欄杆改成沿路連續畫（railOn）
  if (ART.get('waterfall') && !TH.alpine) for (m = 600 + r() * 400; m < lim; m += 900 + r() * 600) put('fall', m, r() < 0.5 ? -1 : 1);
  props.push({ type:'summit', m:total + 3, side:1, text:'' });
  landmarks();
  mergeProps();
}
// 路旁地標（只有美術圖才放）：位置照這座山的路線地標（SX.REC 的 waypoints）
// hut：排雲山莊的三層木屋，玉山群峰經過排雲山莊時、向陽山屋也用它；hut369：雪山 369 山莊（黃屋頂長長一層）；hutjm：嘉明湖避難山屋（灰綠色一層小屋）
const LANDMARK = {
  hut:{ art:'hut_paiyun', wp:['排雲山莊', '向陽山屋'], side:-1, clear:9 },
  hut369:{ art:'hut_369', wp:['369 山莊'], side:-1, clear:10 },
  hutjm:{ art:'hut_jiaming', wp:['嘉明湖避難山屋'], side:1, clear:6 },
  shrine:{ art:'shrine_small', peak:'yushan_west', wp:['西峰山神廟'], side:1, clear:4 },
  station:{ art:'weather_station', peak:'yushan_north', top:9, side:-1, clear:5 },    // 北峰頂：氣象站在三角點後面一點（站上山頂時看得到）
  rockwall:{ art:'rock_wall', peak:'yushan_east', from:'東峰岩溝', every:30, clear:3, helmet:true }  // 東峰最後一段：岩溝兩邊一塊一塊的岩壁；這段停下來時戴著頭盔
};
let helmetFrom = null;   // 從這裡（公尺）以後停下來站著的登山客戴頭盔（hiker_helmet 只有一個站姿，走路照舊）
let clrS = new Uint8Array(1);   // 地標前面 2.5×clear 到後面 clear 公尺內（前面的會擋住它，留長一點）、那一邊不種路旁植物（不然山神廟會被箭竹整個擋住）：1＝左邊、2＝右邊
function landmarks(){
  const wp = (M && M.waypoints) || [], at = name => { for (let k = 0; k < wp.length; k++) if (wp[k].name === name) return wp[k].m; return null; };
  clrS = new Uint8Array(N + 1); helmetFrom = null;
  const add = (type, m, side, L) => {
    props.push({ type:type, m:m, side:side, text:'' });
    for (let i = Math.max(0, Math.floor((m - L.clear * 2.5) / SEG)); i <= Math.min(N, Math.ceil((m + L.clear) / SEG)); i++) clrS[i] |= side < 0 ? 1 : 2;
  };
  for (const type in LANDMARK) {
    const L = LANDMARK[type]; if (!ART.get(L.art) || (L.peak && M.id !== L.peak)) continue;
    if (L.wp) L.wp.forEach(n => { const m = at(n); if (m != null && m > 0 && m < total) add(type, m, L.side, L); });
    if (L.top) add(type, total + L.top, L.side, L);
    if (L.from) { const m0 = at(L.from); if (m0 != null && L.helmet) helmetFrom = m0; if (m0 != null) for (let m = m0, k = 0; m < total - 8; m += L.every, k++) add(type, m, k & 1 ? 1 : -1, L); }
  }
}
function cleared(i, side){ return i * SEG > total + TOP.plat - 2 || (i >= 0 && i <= N && (clrS[i] & (side < 0 ? 1 : 2)) !== 0); }   // 山頂再過去（往下掉的那面）不種東西
function mergeProps(){ AP = props.concat(cairns); AP.sort(function(a, b){ return a.m - b.m; }); }

// ═════════ 色盤、地面色表、背景圖塊 ═════════
function buildPalettes(){
  const sky = TH.sky || ['#9fd3ee', '#fbe7c6'];
  PAL = {
    day:    { skyT:rgb(sky[0]), skyB:rgb(sky[1]), grade:[255,255,255], sun:[0.80,0.11], sunCol:[255,246,216], rays:0.42, cloudL:'#ffffff', cloudS:'#c4d4e8', tint:'#ffffff', tk:0 },
    sunset: { skyT:rgb('#6f7fc0'), skyB:rgb('#ffc98a'), grade:[255,222,190], sun:[0.72,0.295], sunCol:[255,214,130], rays:0.55, cloudL:'#ffe2bc', cloudS:'#d294a4', tint:'#8a5f92', tk:0.42 },
    dawn:   { skyT:rgb('#8fa9de'), skyB:rgb('#ffdccc'), grade:[246,226,230], sun:[0.76,0.30], sunCol:[255,240,210], rays:0.4,  cloudL:'#fff2ec', cloudS:'#c9b6d8', tint:'#8f93c4', tk:0.32 },
    dusk:   { skyT:rgb('#565a9a'), skyB:rgb('#f59a68'), grade:[236,190,160], sun:[0.70,0.32], sunCol:[255,160,96],  rays:0.38, cloudL:'#f9c0a0', cloudS:'#8f6ea0', tint:'#5d4c86', tk:0.5 },
    night:  { skyT:rgb('#27306a'), skyB:rgb('#5868a8'), grade:[96,112,170],  sun:[0.78,0.13], sunCol:[244,240,216], rays:0,    cloudL:'#d4dcf6', cloudS:'#8690c4', tint:'#3d4a84', tk:0.45 }
  };
  for (const k in PAL) PAL[k].valley = mixs(PAL[k].cloudS, mix(TH.mid || '#5a8a5f', PAL[k].tint, PAL[k].tk), 0.3);
}
function wxMix(t, r, g, b){ cSkyT[0] = lerp(cSkyT[0], r, t); cSkyT[1] = lerp(cSkyT[1], g, t); cSkyT[2] = lerp(cSkyT[2], b, t); t *= 0.8; cSkyB[0] = lerp(cSkyB[0], r + 18, t); cSkyB[1] = lerp(cSkyB[1], g + 18, t); cSkyB[2] = lerp(cSkyB[2], b + 18, t); }
function updPalette(wx, frac, dt){
  const tm = wx.time, kind = wx.kind; let a, b, k, i;
  if (!PAL[tm] || tm === 'day') {            // 白天：隨爬升比例從午後晴空漸變到雲海夕照
    a = 'day'; b = 'sunset'; k = clamp(frac, 0, 1); if (TH.sunset) k = 0.35 + 0.65 * k;
    k = k * k * (3 - 2 * k); if (k < 0.02) { k = 0; b = 'day'; }
  } else { a = b = tm; k = 0; }
  palA = a; palB = b; palK = k;
  const A = PAL[a], B = PAL[b];
  for (i = 0; i < 3; i++) { cSkyT[i] = lerp(A.skyT[i], B.skyT[i], k); cSkyB[i] = lerp(A.skyB[i], B.skyB[i], k); cGrade[i] = lerp(A.grade[i], B.grade[i], k); cSunCol[i] = lerp(A.sunCol[i], B.sunCol[i], k); }
  cSun[0] = lerp(A.sun[0], B.sun[0], k); cSun[1] = lerp(A.sun[1], B.sun[1], k);
  raysA = lerp(A.rays, B.rays, k); sunVis = 1; fogD = 300;
  isNight = a === 'night'; isRain = kind === 'rain'; isFog = kind === 'fog'; isCloudy = kind === 'cloudy'; isSnow = kind === 'snow';
  if (isCloudy) { wxMix(0.5, 176, 184, 196); cGrade[0] *= 0.86; cGrade[1] *= 0.88; cGrade[2] *= 0.92; raysA *= 0.25; sunVis = 0.45; fogD = 240; }
  else if (isRain) { wxMix(0.75, 138, 148, 164); cGrade[0] *= 0.7; cGrade[1] *= 0.74; cGrade[2] *= 0.82; raysA = 0; sunVis = 0; fogD = 170; }
  else if (isFog) { wxMix(0.6, 222, 228, 230); cGrade[0] *= 0.95; cGrade[1] *= 0.96; cGrade[2] *= 0.97; raysA *= 0.5; sunVis = 0.5; fogD = 80; }
  else if (isSnow) { wxMix(0.7, 204, 213, 228); cGrade[0] *= 0.9; cGrade[1] *= 0.93; cGrade[2] *= 0.99; raysA = 0; sunVis = 0.2; fogD = 150; }   // 下雪：灰白偏藍的天空、遠處朦朧
  fogD0 = fogD * 0.12;
  const sAmt = Math.max(TH.snow ? clamp((frac - 0.4) / 0.35, 0, 1) * (isRain ? 0.3 : 1) * ((tm === 'night' || tm === 'dawn') ? 1 : 0.85) : 0,
    isSnow ? clamp((frac - 0.2) / 0.2, 0, 1) : 0);   // 高山本來就有殘雪；正在下雪時整片蓋滿
  const ease = lutKey < 0 ? 1 : Math.min(1, (dt || 0) * 0.5);   // 天氣變了：雪慢慢積起來、慢慢融掉（剛進山直接到位）
  snowAmt += (sAmt - snowAmt) * ease; snowFall += ((isSnow ? 1 : 0) - snowFall) * ease;
  const key = Math.round(snowAmt * 8);
  if (key !== lutKey) { lutKey = key; buildLUT(key / 8); }
}
// 地面色表：種類(7) × 明暗(3) × 霧階(FOGN)，只在積雪量改變時重建
function buildLUT(sn){
  const th = TH, tr = th.trail || 'dirt', near = th.near || '#86c06a', mid = th.mid || '#5a8a5f';
  const road = tr === 'stairs' ? '#d2c6ae' : tr === 'wood' ? '#c2925e' : tr === 'scree' ? '#bdb5a8' : '#cfad7c';
  const base = [
    mix(near, '#f2f6fa', sn * 0.88), mix(mix(near, mid, 0.22), '#e6eef6', sn * 0.88),             // 0,1 草地
    mix(road, '#eef2f6', sn * 0.5), mix(mix(road, INK, 0.07), '#eef2f6', sn * 0.5),                // 2,3 路面
    mix(road, INK, 0.5),                                                                         // 4 路緣／墨色
    (tr === 'dirt' || tr === 'scree') ? rgb('#8f6644') : mix(road, INK, 0.34),                     // 5 階梯立面
    mix(mid, '#22382f', 0.45),                                                                   // 6 稜線邊坡
    mix(tr === 'scree' ? '#968b80' : tr === 'stairs' ? '#86725c' : '#8a6446', '#eef2f6', sn * 0.6), // 7 路肩土坎的切面
    mix('#c8c0b2', '#eef2f6', sn * 0.5),                                                         // 8 路上的石頭
    mix('#b58658', '#eef2f6', sn * 0.4), mix('#7a5238', '#c8d2de', sn * 0.4)                       // 9,10 欄杆木頭（受光／背光）
  ];
  LUT.length = 0;
  for (let k = 0; k < base.length; k++) for (let lv = 0; lv < 3; lv++) {
    const c = tone(base[k], lv);
    for (let f = 0; f < FOGN; f++) LUT.push(css(mix(c, hazeRgb, f / (FOGN - 1))));
  }
  // 草地坡面的連續明暗（-10～10 共 21 階 × 霧階）：背光往暗色、向陽往暖色，越陡越深；底色直接用這個顏色，不用另外蓋一層
  GRS.length = 0;
  const g0 = tone(base[0], 0), g1 = tone(base[0], 1), g2 = tone(base[0], 2);
  for (let f = 0; f < FOGN; f++) for (let q = -10; q <= 10; q++) GRS.push(css(mix(q < 0 ? mix(g1, g0, Math.min(1, -q / 10 * 1.4)) : mix(g1, g2, Math.min(1, q / 10 * 1.4)), hazeRgb, f / (FOGN - 1))));
}
const GRS = [];
// 明暗三階：0 背光（偏藍紫）、1 原色、2 向陽（暖黃）。地面色表和草叢貼圖共用，草才會跟地面同色
function tone(c, lv){ return lv === 0 ? mix(c, '#2c3560', 0.27) : lv === 2 ? mix(c, '#fff0b4', 0.2) : rgb(c); }
function addPoly(L, pts, ox){ L.moveTo(pts[0] + ox, pts[1]); for (let i = 2; i < pts.length; i += 2) L.lineTo(pts[i] + ox, pts[i + 1]); L.closePath(); }
// 遠山圖塊（左右無縫）：右坡受光、左坡陰影、墨線稜線、山腳霧氣
function ridgeTile(k, P){
  const TS = 1.25, hT = [150, 130, 115][k], c = mk(TWL * TS, hT * TS), g = c.getContext('2d'), r = mkrng(seed + k * 7919 + 13), th = TH;
  g.scale(TS, TS); g.lineJoin = 'round';
  let base = k === 0 ? rgb(th.far || '#8fb3a8') : k === 1 ? mix(th.far || '#8fb3a8', th.mid || '#5a8a5f', 0.55) : mix(th.mid || '#5a8a5f', '#2f5a48', 0.3);
  base = mix(base, P.tint, P.tk);
  const hz = mix(P.skyB, P.cloudL, 0.5), bh = mix(base, hz, [0.45, 0.25, 0.08][k]);
  const lt = mixs(bh, '#fff2c4', 0.22), sh = mixs(bh, '#3a3868', 0.26);
  const n = TWL / 4, hs = new Float32Array(n + 1), ph = [], amp = [[34,22,14,9,5],[26,20,13,8,5],[20,16,12,8,5]][k], fr = [2,3,5,8,13];
  let i, mn = 1e9, mx = -1e9;
  for (i = 0; i < 5; i++) ph.push(r() * TAU, r() * Math.PI);
  for (i = 0; i <= n; i++) { const x = i / n; let v = 0; for (let q = 0; q < 5; q++) v += amp[q] * 0.45 * Math.sin(x * TAU * fr[q] + ph[q * 2]) + amp[q] * 0.75 * (1 - Math.abs(Math.sin(x * Math.PI * fr[q] + ph[q * 2 + 1]))); hs[i] = v; if (v < mn) mn = v; if (v > mx) mx = v; }
  for (i = 0; i <= n; i++) hs[i] = lerp(hT * 0.74, 8, (hs[i] - mn) / (mx - mn));
  hs[n] = hs[0];
  const R = new Path2D(); R.moveTo(0, hT); for (i = 0; i <= n; i++) R.lineTo(i * 4, hs[i]); R.lineTo(TWL, hT); R.closePath();
  g.fillStyle = sh; g.fill(R);
  const L = new Path2D();
  for (i = 0; i < n; i++) {
    if (!(hs[i] < hs[(i - 1 + n) % n] && hs[i] <= hs[i + 1])) continue;       // 只處理山峰
    let j = i; const pts = [i * 4, hs[i]];
    while (j - i < n && hs[(j + 1) % n] > hs[j % n]) { j++; pts.push(j * 4, hs[j % n]); }
    if (hs[j % n] - hs[i] < 5) continue;
    pts.push(j * 4 - 2, hT);
    let sx = i * 4, sy = hs[i], q = 0; const sp = [];
    while (sy < hT) { sy += 9 + r() * 8; sx += (q % 2 ? 7 : -9) - 2 + r() * 3; q++; sp.push(sx, sy); }
    for (let q2 = sp.length - 2; q2 >= 0; q2 -= 2) pts.push(sp[q2], sp[q2 + 1]);
    addPoly(L, pts, 0); addPoly(L, pts, -TWL);
  }
  g.save(); g.clip(R); g.fillStyle = lt; g.fill(L);
  if (th.snow && k < 2) {                    // 高山雪線
    const Z = new Path2D(), sl = hT * 0.36;
    Z.moveTo(0, 0); Z.lineTo(TWL, 0); for (let x = TWL; x >= 0; x -= 12) Z.lineTo(x, sl + ((x / 12) % 2 ? 6 : -4)); Z.closePath();
    g.clip(Z); g.fillStyle = mixs('#b4c4e0', hz, 0.2); g.fillRect(0, 0, TWL, hT); g.fillStyle = mixs('#fbfdff', hz, 0.1); g.fill(L);
  }
  g.restore();
  g.beginPath(); g.moveTo(0, hs[0]); for (i = 1; i <= n; i++) g.lineTo(i * 4, hs[i]);
  g.strokeStyle = css(mix(INK, hz, [0.55, 0.35, 0.15][k])); g.lineWidth = [1, 1.3, 1.6][k]; g.stroke();
  const gr = g.createLinearGradient(0, hT * 0.45, 0, hT); gr.addColorStop(0, rgba(hz, 0)); gr.addColorStop(1, rgba(hz, [0.95, 0.9, 0.75][k]));
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = gr; g.fillRect(0, 0, TWL, hT);
  return c;
}
// 雲海圖塊：一球一球的雲頂，上亮下暗
function cloudTile(k, P){
  const TS = 1.25, hT = k ? 120 : 84, c = mk(TWL * TS, hT * TS), g = c.getContext('2d'), r = mkrng(seed + k * 104729 + 77), sc = k ? 1 : 0.62;
  g.scale(TS, TS);
  const line = rgba(mix(INK, P.cloudS, 0.6), 0.5), OX = [0, -TWL, TWL];
  for (let row = 0; row < 3; row++) {
    const by = (28 + row * 20) * sc + (k ? 4 : 2), lit = mixs(P.cloudL, P.cloudS, 0.22 * (2 - row)), sh = mixs(P.cloudS, P.cloudL, 0.15 * row), puffs = [];
    let x = r() * 30;
    while (x < TWL) { const rad = (15 + r() * 17) * sc * (1 + row * 0.12); puffs.push(x, by - rad * 0.25 + (r() - 0.5) * 8 * sc, rad); x += rad * (1.05 + r() * 0.5); }
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < puffs.length; i += 3) for (let o = 0; o < 3; o++) {
      const px = puffs[i] + OX[o], py = puffs[i + 1], rad = puffs[i + 2];
      if (px + rad < 0 || px - rad > TWL) continue;
      if (pass === 0) { dot(g, px, py, rad, sh); g.beginPath(); g.arc(px, py, rad, Math.PI * 1.08, Math.PI * 1.92); g.strokeStyle = line; g.lineWidth = 1; g.stroke(); }
      else dot(g, px + rad * 0.16, py - rad * 0.14, rad * 0.84, lit);
    }
    const gr = g.createLinearGradient(0, by + 8 * sc, 0, hT); gr.addColorStop(0, mixs(lit, sh, 0.45)); gr.addColorStop(1, row === 2 ? mixs(lit, sh, 0.2) : sh);
    g.fillStyle = gr; g.fillRect(0, by + 8 * sc, TWL, hT);
  }
  return c;
}
function freeTiles(T){ if (T) T.r.concat(T.c).forEach(free); }
function getTiles(key){
  let T = tileSets[key]; if (T) return T;
  const ks = Object.keys(tileSets);
  if (ks.length >= 3) for (let i = 0; i < ks.length; i++) if (ks[i] !== palA && ks[i] !== palB) { freeTiles(tileSets[ks[i]]); delete tileSets[ks[i]]; }
  const P = PAL[key];
  T = tileSets[key] = { r:[ridgeTile(0, P), ridgeTile(1, P), ridgeTile(2, P)], c:[cloudTile(0, P), cloudTile(1, P)] };
  return T;
}
function tile(img, off, y, h, a){
  if (a <= 0.01) return;
  const w = TWL * U; let x = -(((off % w) + w) % w);
  ctx.globalAlpha = a; for (; x < W; x += w) ctx.drawImage(img, x, y, w + 1, h); ctx.globalAlpha = 1;
}
function layer(TA, TB, grp, idx, off, y, h){ tile(TA[grp][idx], off, y, h, 1); if (TB) tile(TB[grp][idx], off, y, h, palK); }
// 遠景美術圖：依時段挑一張；左右鏡射接續，轉彎時跟著視差平移
const SKY_ART = { day:'sky_day', sunset:'sky_sunset', dusk:'sky_sunset', dawn:'sky_dawn', night:'sky_night' };
function skyArt(key){ const e = ART.get(SKY_ART[key]); return e && e.frames.length ? e : null; }
// 遠景分三層視差：天空＋最遠的山、中間的山、近的山＋雲海，轉彎時越近的層移得越快，爬得越高近的層越往下沉
// 每層是天空圖的一條（上緣羽化），層與層之間蓋一條霧帶，錯開的山稜線才不會疊成兩條
// [圖高從幾成、到幾成、上緣羽化幾成, 轉彎平移比例, 爬到山頂時往下沉幾像素]
const PLX = [[0, 0.52, 0, 0.16, 0], [0.33, 0.72, 0.1, 0.36, 10], [0.52, 1, 0.1, 0.62, 26]];
let PLXC = {};            // 這座山用的各層圖（依時段），換山時釋放
let MIST = null;          // 霧帶（上下淡、中間濃，用這座山的霧色），換山時重做
function plxLayers(key, e){
  let L = PLXC[key]; if (L) return L;
  const ks = Object.keys(PLXC);
  if (ks.length >= 3) for (const k of ks) if (k !== palA && k !== palB) { PLXC[k].forEach(l => free(l.c)); delete PLXC[k]; }
  const f = e.frames[0];
  L = PLXC[key] = PLX.map(function(p, n){
    if (!n) return { c:null, p:p };   // 最上層直接畫原圖那一段，不另外存一張
    const h = Math.round(f.h * (p[1] - p[0])), d = mk(f.w, h), g = d.getContext('2d'), fh = f.h * p[2];
    g.drawImage(e.img, f.x, f.y + f.h * p[0], f.w, h, 0, 0, f.w, h);
    const gr = g.createLinearGradient(0, 0, 0, fh); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = gr; g.fillRect(0, 0, f.w, fh);
    return { c:d, p:p };
  });
  return L;
}
function freePlx(){ for (const k in PLXC) PLXC[k].forEach(l => free(l.c)); PLXC = {}; free(MIST); MIST = null; }
function mist(){
  if (MIST) return MIST;
  const c = MIST = mk(4, 64), g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 64);
  gr.addColorStop(0, rgba(hazeRgb, 0)); gr.addColorStop(0.5, rgba(hazeRgb, 0.55)); gr.addColorStop(1, rgba(hazeRgb, 0));
  g.fillStyle = gr; g.fillRect(0, 0, 4, 64);
  return c;
}
function drawSkyArt(e, key, hd, a, frac){
  if (a <= 0.01) return;
  const f = e.frames[0], h = HOR + 150 * U, w = Math.max(W * 1.05, h * f.w / f.h), L = plxLayers(key, e), M = mist();
  ctx.globalAlpha = a;
  for (let n = 0; n < L.length; n++) {
    const p = L[n].p, y0 = h * p[0] + p[4] * U * frac, lh = h * (p[1] - p[0]), off = hd * p[3];
    if (n) ctx.drawImage(M, 0, 0, 4, 64, 0, y0 - 6 * U, W, h * p[2] + 20 * U);   // 霧帶蓋在上一層的接縫上
    let k = Math.floor(off / w), x = -(off - k * w);
    for (; x < W; x += w, k++) {
      const src = L[n].c, sx = src ? 0 : f.x, sy = src ? 0 : f.y, sw = src ? src.width : f.w, sh = src ? src.height : f.h * p[1];
      if (k & 1) { ctx.save(); ctx.translate(x + w, 0); ctx.scale(-1, 1); ctx.drawImage(src || e.img, sx, sy, sw, sh, 0, y0, w + 1, lh); ctx.restore(); }
      else ctx.drawImage(src || e.img, sx, sy, sw, sh, x, y0, w + 1, lh);
    }
  }
  ctx.globalAlpha = 1;
}
function drawBG(t, dist){
  const SA = skyArt(palA);
  if (SA) {
    const SB = palB !== palA ? skyArt(palB) : null, hd = headAt(dist) * F, fr = clamp(dist / total, 0, 1);
    ctx.fillStyle = PAL[palA].valley; ctx.fillRect(0, 0, W, H);
    drawSkyArt(SA, palA, hd, 1, fr); if (SB) drawSkyArt(SB, palB, hd, palK, fr);
    if (isCloudy || isRain || isSnow) tile(getTiles(palA).c[1], hd + t * 5, -40 * U, 190 * U, 0.62);
    if (snowFall > 0.02) { ctx.globalAlpha = snowFall * 0.5; ctx.fillStyle = '#d6dee9'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }   // 下雪：天空蓋一層灰白
    return;
  }
  const g = ctx.createLinearGradient(0, 0, 0, HOR + 30 * U);
  g.addColorStop(0, css(cSkyT)); g.addColorStop(1, css(cSkyB)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const sx = cSun[0] * W, sy = cSun[1] * H; let i;
  if (isNight) {
    ctx.fillStyle = '#ffffff';
    for (i = 0; i < stars.length; i += 4) { ctx.globalAlpha = 0.55 + 0.45 * Math.sin(t * 1.7 + stars[i + 3]); ctx.fillRect(stars[i], stars[i + 1], stars[i + 2], stars[i + 2]); }
    ctx.globalAlpha = sunVis;
    dot(ctx, sx, sy, 17 * U, '#f6f2dc'); dot(ctx, sx - 5 * U, sy - 3 * U, 3.2 * U, '#dcd8c4'); dot(ctx, sx + 6 * U, sy + 5 * U, 2.2 * U, '#dcd8c4');
    ctx.globalAlpha = 1;
  } else if (sunVis > 0) {
    const R = 64 * U, gr = ctx.createRadialGradient(sx, sy, 0, sx, sy, R);
    gr.addColorStop(0, '#fffdf2'); gr.addColorStop(0.26, rgba(cSunCol, 1)); gr.addColorStop(0.3, rgba(cSunCol, 0.42)); gr.addColorStop(1, rgba(cSunCol, 0));
    ctx.globalAlpha = sunVis; ctx.fillStyle = gr; ctx.fillRect(sx - R, sy - R, R * 2, R * 2); ctx.globalAlpha = 1;
  }
  const TA = getTiles(palA), TB = (palB !== palA && palK > 0.01) ? getTiles(palB) : null;
  const hd = headAt(dist) * F, hv = Math.sin(t * 0.5) * 3 * U;        // 視差：依累積轉向角平移
  if (isCloudy || isRain || isSnow) tile(TA.c[1], hd * 0.3 + t * 5, -40 * U, 190 * U, 0.62);   // 高空厚雲
  layer(TA, TB, 'r', 0, hd * 0.5, HOR - 136 * U, 150 * U);
  layer(TA, TB, 'c', 0, hd * 0.6 + t * 3, HOR - 52 * U + hv * 0.5, 84 * U);
  layer(TA, TB, 'r', 1, hd * 0.7, HOR - 92 * U, 130 * U);
  layer(TA, TB, 'r', 2, hd * 0.85, HOR - 56 * U, 115 * U);
  ctx.fillStyle = PAL[palA].valley; ctx.fillRect(0, HOR + 54 * U, W, H);
  layer(TA, TB, 'c', 1, hd + t * 7, HOR - 34 * U - hv, 120 * U);
}

// ═════════ 一次性素材：影子、光點、神光、前景散景葉、暗角 ═════════
function buildStatic(){
  SHADOW = mk(64, 32); let g = SHADOW.getContext('2d'); g.scale(1, 0.5);
  let gr = g.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(25,35,20,0.45)'); gr.addColorStop(0.55, 'rgba(25,35,20,0.24)'); gr.addColorStop(1, 'rgba(25,35,20,0)');   // 接觸陰影：深褐綠（跟草地同色系，不會像灰色貼紙）
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  // 接觸陰影：貼著底部、比較小比較深的一片，石頭、灌木、長椅才像壓在地上（不是浮著的貼紙）
  CONTACT = mk(64, 32); g = CONTACT.getContext('2d'); g.scale(1, 0.5);
  gr = g.createRadialGradient(32, 32, 1, 32, 32, 32); gr.addColorStop(0, 'rgba(22,20,18,0.7)'); gr.addColorStop(0.45, 'rgba(22,20,18,0.42)'); gr.addColorStop(1, 'rgba(22,20,18,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  // 樹影：幾團疊在一起的深色橢圓，先畫在小畫布上，畫的時候放大就是柔和的邊（不用濾鏡）
  const rr = mkrng(5150);
  CANOPY = [0, 1, 2].map(function(){
    const c = mk(48, 24), cg = c.getContext('2d');   // 每團都留在畫布裡面（以前貼著邊被切掉，路上的樹影有一條直直的硬邊）
    for (let q = 0; q < 16; q++) { const rx = 3 + rr() * 5, ry = 2 + rr() * 2.5, px = rx + 1 + rr() * (46 - 2 * rx), py = ry + 1 + rr() * (22 - 2 * ry); cg.fillStyle = 'rgba(30,34,52,0.22)'; cg.beginPath(); cg.ellipse(px, py, rx, ry, rr() * 3, 0, TAU); cg.fill(); }
    cg.globalCompositeOperation = 'destination-out';   // 樹葉縫隙透光
    for (let q = 0; q < 5; q++) { cg.fillStyle = 'rgba(0,0,0,0.5)'; cg.beginPath(); cg.ellipse(8 + rr() * 32, 5 + rr() * 14, 1.5 + rr() * 2, 1 + rr() * 1.5, 0, 0, TAU); cg.fill(); }
    return c;
  });
  // 光斑：暖色、邊緣很柔的一小片
  DAPPLE = mk(32, 32); g = DAPPLE.getContext('2d');
  gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,236,170,0.9)'); gr.addColorStop(0.45, 'rgba(255,226,150,0.5)'); gr.addColorStop(1, 'rgba(255,220,140,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  GLOW = mk(48, 48); g = GLOW.getContext('2d');
  gr = g.createRadialGradient(24, 24, 0, 24, 24, 24); gr.addColorStop(0, 'rgba(255,244,200,1)'); gr.addColorStop(0.25, 'rgba(255,222,140,0.7)'); gr.addColorStop(1, 'rgba(255,200,90,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 48, 48);
}
function buildRays(){
  const w = Math.ceil(W / 2), h = Math.ceil(H / 2), r = mkrng(4242), L = Math.hypot(w, h) * 1.05;
  RAYS = mk(w, h); const g = RAYS.getContext('2d');
  g.translate(w * 1.04, -h * 0.06);
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.6 + i * 0.045 + r() * 0.02), wd = L * (0.02 + r() * 0.035), gr = g.createLinearGradient(0, 0, L, 0);
    gr.addColorStop(0, 'rgba(255,226,150,0.5)'); gr.addColorStop(0.55, 'rgba(255,226,150,0.2)'); gr.addColorStop(1, 'rgba(255,226,150,0)');
    g.save(); g.rotate(a); g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.lineTo(L, -wd); g.lineTo(L, wd); g.closePath(); g.fill(); g.restore();
  }
}
function fgFrond(g, x, y, ang, len){
  const ex = x + Math.sin(ang) * len, ey = y - Math.cos(ang) * len * 0.8, mx = x + Math.sin(ang * 0.5) * len * 0.5, my = y - Math.cos(ang * 0.5) * len * 0.75;
  for (let k = 1; k <= 11; k++) {
    const t = k / 11.5, u = 1 - t, px = u * u * x + 2 * u * t * mx + t * t * ex, py = u * u * y + 2 * u * t * my + t * t * ey, an = Math.atan2(2 * u * (my - y) + 2 * t * (ey - my), 2 * u * (mx - x) + 2 * t * (ex - mx)), L = len * 0.13 * (1 - t * 0.75);
    for (let sd = -1; sd <= 1; sd += 2) { g.beginPath(); g.ellipse(px + Math.cos(an + sd * 1.2) * L, py + Math.sin(an + sd * 1.2) * L, L, L * 0.34, an + sd * 1.2, 0, TAU); g.fillStyle = sd > 0 ? '#3a6a4c' : '#2b5040'; g.fill(); g.lineWidth = 1.6; g.strokeStyle = INK; g.stroke(); }
  }
  g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(mx, my, ex, ey); g.lineWidth = 2.4; g.strokeStyle = INK; g.stroke();
}
function fgWhorl(g, x, y, rad, r, fl){
  const a0 = r() * TAU;
  for (let i = 0; i < 7; i++) { const a = a0 + i / 7 * TAU; g.beginPath(); g.ellipse(x + Math.cos(a) * rad * 0.55, y + Math.sin(a) * rad * 0.55, rad * 0.5, rad * 0.17, a, 0, TAU); g.fillStyle = i % 2 ? '#2f5a44' : '#3f7352'; g.fill(); g.lineWidth = 2; g.strokeStyle = INK; g.stroke(); }
  if (fl) for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; dot(g, x + Math.cos(a) * rad * 0.2, y + Math.sin(a) * rad * 0.2, rad * 0.17, i % 2 ? '#f7b4c8' : '#f08fb0'); g.lineWidth = 1.4; g.strokeStyle = INK; g.stroke(); }
}
function buildFG(){
  FG = []; const r = mkrng(90210), defs = [[0.4, 0.34], [0.36, 0.28], [0.5, 0.17]];
  for (let k = 0; k < 3; k++) {
    const w = Math.ceil(W * defs[k][0]), h = Math.ceil(H * defs[k][1]), big = mk(w, h), g = big.getContext('2d'); let i;
    g.lineJoin = g.lineCap = 'round';
    if (k === 0) {        // 左下：蕨葉 + 杜鵑
      for (i = 0; i < 5; i++) { const an = 0.05 + i * 0.26 + r() * 0.1; fgFrond(g, w * 0.03, h * 1.02, an, Math.min(h * (0.5 + r() * 0.3), w * 0.8 / Math.max(0.3, Math.sin(an)))); }
      fgWhorl(g, w * 0.06, h * 0.34, w * 0.26, r, false); fgWhorl(g, w * 0.14, h * 0.6, w * 0.27, r, true); fgWhorl(g, w * 0.3, h * 0.86, w * 0.25, r, true);
    } else if (k === 1) { // 右下：蕨葉 + 葉叢
      for (i = 0; i < 5; i++) { const an = 0.05 + i * 0.27 + r() * 0.1; fgFrond(g, w * 0.97, h * 1.02, -an, Math.min(h * (0.5 + r() * 0.3), w * 0.8 / Math.max(0.3, Math.sin(an)))); }
      fgWhorl(g, w * 0.86, h * 0.62, w * 0.3, r, true); fgWhorl(g, w * 0.66, h * 0.9, w * 0.26, r, false);
    } else {              // 左上：伸進畫面的枝條
      g.beginPath(); g.moveTo(-6, h * 0.12); g.quadraticCurveTo(w * 0.4, h * 0.1, w * 0.86, h * 0.62);
      g.lineWidth = 8; g.strokeStyle = INK; g.stroke(); g.lineWidth = 4.5; g.strokeStyle = '#6a4a3c'; g.stroke();
      const ts = [0.2, 0.42, 0.64, 0.84];
      for (i = 0; i < 4; i++) { const t = ts[i], u = 1 - t; fgWhorl(g, 2 * u * t * w * 0.4 + t * t * w * 0.86, u * u * h * 0.12 + 2 * u * t * h * 0.1 + t * t * h * 0.62 + h * 0.06, w * (0.17 - i * 0.015), r, i === 2); }
    }
    // 先縮小再放大 → 景深模糊
    const s1 = mk(w / 2, h / 2); s1.getContext('2d').drawImage(big, 0, 0, s1.width, s1.height);
    const s2 = mk(w / 3.4, h / 3.4); s2.getContext('2d').drawImage(s1, 0, 0, s2.width, s2.height);
    FG.push({ c:s2, w:w, h:h });
  }
}
// 前景美術圖（frame_top：上方垂下的枝葉；frame_bottom：下方兩角的花草），寬度撐滿畫面
function drawFGArt(id, top, t){
  const e = ART.get(id); if (!e) return false;
  const f = e.frames[0], w = W + 16, h = Math.min(H * (top ? 0.32 : 0.36), w * f.h / f.w);
  ctx.save(); ctx.translate(W / 2, top ? 0 : H); ctx.rotate(Math.sin(t * (top ? 0.6 : 0.8)) * 0.012);
  ctx.drawImage(e.img, f.x, f.y, f.w, f.h, -w / 2, top ? -6 : -h + 6, w, h);
  const ra = isNight ? 0 : RIM_A * sunVis;
  if (ra > 0.02) {                            // 葉子、花瓣朝右上的邊緣加一圈暖色輪廓光，跟主光同方向
    const key = id + w + 'x' + h, rim = FGRIM[key] || (FGRIM[key] = rimOf(e, f, w, h));
    ctx.globalAlpha = ra; ctx.drawImage(rim, -w / 2, top ? -6 : -h + 6, w, h); ctx.globalAlpha = 1;
  }
  ctx.restore();
  return true;
}
// 輪廓光貼圖：圖形本身塗成暖金色，再挖掉「右上方鄰居也有東西」的像素，只剩朝右上那一圈邊（換尺寸才重做）
function rimOf(e, f, w, h){
  const c = mk(w * DPR, h * DPR), g = c.getContext('2d'), d = Math.max(2, 4.5 * U * DPR);
  g.drawImage(e.img, f.x, f.y, f.w, f.h, 0, 0, c.width, c.height);
  g.globalCompositeOperation = 'source-in'; g.fillStyle = 'rgb(255,208,132)'; g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'destination-out'; g.drawImage(e.img, f.x, f.y, f.w, f.h, -d, d, c.width, c.height);
  return c;
}
function drawFG(t){
  if (FG.length < 3) return;
  let f;
  if (!drawFGArt('frame_bottom', false, t)) {
    f = FG[0];
    ctx.save(); ctx.translate(0, H); ctx.rotate(Math.sin(t * 0.8) * 0.018); ctx.drawImage(f.c, -6, -f.h + 6, f.w, f.h); ctx.restore();
    f = FG[1];
    ctx.save(); ctx.translate(W, H); ctx.rotate(Math.sin(t * 0.7 + 1.3) * 0.02); ctx.drawImage(f.c, -f.w + 6, -f.h + 6, f.w, f.h); ctx.restore();
  }
  if (!drawFGArt('frame_top', true, t)) {
    f = FG[2];
    ctx.save(); ctx.rotate(Math.sin(t * 0.6 + 2.1) * 0.015); ctx.drawImage(f.c, -6, -6, f.w, f.h); ctx.restore();
  }
}

// ═════════ 對外：初始化／尺寸／換山 ═════════
S.init = function(canvas){ cv = canvas; ctx = cv.getContext('2d'); if (!SHADOW) buildStatic(); S.resize(); };
S.resize = function(){
  if (!cv) return;
  const p = cv.parentElement, bw = p ? p.clientWidth : 0, bh = p ? p.clientHeight : 0, rc = (bw && bh) ? null : cv.getBoundingClientRect();
  const w = Math.max(1, Math.round(bw || (rc && rc.width) || 375)), h = Math.max(1, Math.round(bh || (rc && rc.height) || 812));
  const d = Math.min(Math.max(QUAL.dpr[qs.lvl], snapDpr), window.devicePixelRatio || 1);   // 解析度：自動畫質那一級的上限（最高 2 倍）；拍照那一格至少 snapDpr
  if (w === W && h === H && d === DPR && RAYS && cv.width === Math.round(w * d)) return;
  W = w; H = h; DPR = d; cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  F = Math.min(W * 1.2, H * 0.62); HOR = Math.round(H * HORF); CAMH = FOOTF * H * HZ / F; U = H / 812;   // 鏡頭高度由「登山客腳底在畫面的位置」反推
  buildRays(); if (SHOW_FG) buildFG(); FGRIM = {};
  // 暗角：中心放在登山客和前方步道之間，四角壓暗一點，視線自然落在人和路上
  vig = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.3, W / 2, H * 0.55, H * 0.74);
  vig.addColorStop(0, 'rgba(48,30,24,0)'); vig.addColorStop(0.6, 'rgba(48,30,24,0.14)'); vig.addColorStop(1, 'rgba(48,30,24,0.46)');
  // 午後暖光：右上最亮的暖金，往左下淡掉
  WARM = ctx.createRadialGradient(W * 0.92, -H * 0.05, 0, W * 0.92, -H * 0.05, H * 1.15);
  WARM.addColorStop(0, 'rgba(255,214,140,1)'); WARM.addColorStop(0.55, 'rgba(255,200,130,0.55)'); WARM.addColorStop(1, 'rgba(255,190,120,0)');
  const r = mkrng(777); stars = [];
  for (let i = 0; i < 70; i++) stars.push(r() * W, r() * HOR * 0.95, 1 + r() * 1.6, r() * TAU);
};
S.setMountain = function(m){
  if (M === m && curve && PAL && SPR.conifer) { cairns = []; mergeProps(); hero.st = -1; hitN = 0; gaitReset(); return; }   // 同一座山：不重畫貼圖和背景
  M = m; TH = m.theme || {}; seed = hashStr(String(m.id || m.name || 'x')); total = Math.max(50, m.dist || 1000);
  N = Math.ceil((total + 320) / SEG);
  curve = new Float32Array(N + 1); elev = new Float32Array(N + 2); head = new Float64Array(N + 2); stepF = new Uint8Array(N + 1);
  const mid = TH.mid || '#5a8a5f', near = TH.near || '#86c06a';
  setHaze();
  VG = { treeL:mixs(mid, '#4f9060', 0.35), treeS:mixs(mid, '#243f4a', 0.55), bushL:mixs(near, '#4f9a58', 0.5), bushS:mixs(mid, '#28484a', 0.45), grassL:mixs(near, '#d8e07a', 0.25), grassS:mixs(near, '#3f6f50', 0.5) };
  buildCurves(m); buildElev(m); buildSlopes(); cairns = []; buildProps(); buildPalettes(); buildSprites();
  for (const k in tileSets) freeTiles(tileSets[k]);
  freePlx();
  tileSets = {}; lutKey = -1; hero.st = -1; hitN = 0; initFlyers(); gaitReset(); warmBuild();
};
// 美術圖晚一點才載完：已經在山上的話，把路旁貼圖換成美術圖
ART.onLoad(function(){ FGRIM = {}; if (M && TH) { setHaze(); freePlx(); lutKey = -1; buildProps(); buildSprites(); warmBuild(); } });
// 空氣透視的霧色：取白天天空圖「地平線那一條」的平均色（暖金／淡青），遠處的樹、草、地面才會融進遠山和雲海
// 沒有天空圖就用這座山的遠山色調淡
function setHaze(){
  const base = mix(TH.far || '#8fb3a8', '#f4f1e6', 0.5), e = ART.get(SKY_ART.day), f = e && e.frames[0];
  let sky = null;
  if (f && e.img && e.img.complete !== false) {
    const t = mk(16, 1), g = t.getContext('2d'), py = HOR / (HOR + 150 * U);
    g.drawImage(e.img, f.x, f.y + f.h * (py - 0.03), f.w, f.h * 0.06, 0, 0, 16, 1);
    const d = g.getImageData(0, 0, 16, 1).data; let a = 0; sky = [0, 0, 0];
    for (let k = 0; k < 64; k += 4) { sky[0] += d[k] / 16; sky[1] += d[k + 1] / 16; sky[2] += d[k + 2] / 16; a += d[k + 3]; }
    if (a < 16 * 200) sky = null;      // 圖還沒解碼好（透明）就先不用，等美術圖載完會再算一次
  }
  hazeRgb = sky ? mix(base, sky, 0.6) : base; hazeCss = css(hazeRgb);
}
S.props = function(fromM, toM){
  const out = [];
  for (let i = 0; i < AP.length; i++) { const o = AP[i]; if (o.m >= fromM && o.m <= toM && HIT[o.type]) out.push({ type:o.type, m:o.m, side:o.side }); }
  return out;
};
S.allProps = function(){ return AP.map(function(o){ return { type:o.type, m:o.m, side:o.side, text:o.text }; }); };   // 測試用：目前這座山所有路旁道具
S.stepAt = function(){ const out = []; for (let i = 0; i < N; i++) if (stepF[i] && !stepF[i - 1]) out.push(i * SEG); return out; };   // 測試用：階梯段起點（公尺）
S.edgeAt = function(){ const out = []; for (let i = 1; i <= N; i++) if (edgeK[i] > 0.5 && !(edgeK[i - 1] > 0.5)) out.push({ m:i * SEG, side:dropS[i] }); return out; };   // 測試用：貼著稜線邊緣那幾段的起點（公尺）與往下掉的那一邊
S.passAt = function(){ const out = []; for (let i = 0; i <= N; i++) if (Hh(i, 300) < PASS_P && !railOn(i)) out.push(Math.round(i * SEG)); return out; };   // 測試用：鏡頭前掠過的芒草／蕨類在哪裡（公尺）
S.curveAt = function(m){ return cAt(Math.floor(m / SEG)); };   // 測試用：某個位置（公尺）的彎度（0＝直線，正的＝右彎）
S.turn = function(){ return hero.turn; };                     // 測試用：登山客現在轉彎傾身多少（-1～1）
S.addCairn = function(m, side){ cairns.push({ type:'mycairn', m:Math.max(0, +m || 0), side:side < 0 ? -1 : 1, text:'' }); mergeProps(); };
S.setCairns = function(list){
  cairns = [];
  if (list) for (let i = 0; i < list.length; i++) { const c = list[i]; if (c) cairns.push({ type:'mycairn', m:Math.max(0, +(c.m != null ? c.m : c[0]) || 0), side:(c.side != null ? c.side : c[1]) < 0 ? -1 : 1, text:'' }); }
  mergeProps();
};

// ═════════ 角色：登山客（背影）與柴犬 ═════════
let JK_L = '#ee8458', JK_S = '#bb5540', PANT_L = '#6a8a9c', PANT_S = '#44607a', BOOT_L = '#8a5c40', BOOT_S = '#5a3a2c', SOLE_L = '#57423a', SOLE_S = '#3a2a24';
let BAG_L = '#f4bd58', BAG_S = '#c98a3c', LID_L = '#e9a244', LID_S = '#b9742f', BGP_L = '#f7cf7c', BGP_S = '#cf9a48', MAT_L = '#9cc4ac', MAT_S = '#628e80';
let BOT_L = '#8fd0e4', BOT_S = '#5398b8', MUG_L = '#e2e6e8', MUG_S = '#9aa4b0', HAT_L = '#f7e8c0', HAT_S = '#cfb38a', HAIR_L = '#6a4632', HAIR_S = '#4a2f24', SKIN = '#f6cba6';
let PON_L = '#f6d968', PON_S = '#cba740', DOG_L = '#e9a55c', DOG_S = '#b9743f', CRM_L = '#fff3de', CRM_S = '#dcc3a0';
const LEAFC = ['#8fbf5a', '#d9a441', '#c9703f', '#6fa85a'];

function updHero(s, t, dt, dist, sp){
  const mv = (sp > 0.05 && !s.rest && !s.sleep) ? 1 : 0;
  hero.mv += (mv - hero.mv) * Math.min(1, dt * 8);
  // 步伐：平路一個循環（兩步）走 STRIDE 公尺；階梯上一步踩一階，步子變短（腳才不會在階梯上滑），身體往前傾一點
  const si = Math.floor(dist / SEG), rise = sAt(si) === 1 ? eAt(si + 1) - eAt(si) : 0, nSt = rise > 0 ? clamp(Math.ceil(rise / STEP_H), 1, 4) : 0;
  const stride = (nSt ? clamp(2 * SEG / nSt, 0.85, STRIDE) : STRIDE) * GAIT.stride[gait.lvl], dd = dist - hero.pd;
  hero.ph = (Math.abs(dd) < 3 && hero.pd >= 0) ? hero.ph + dd / stride * TAU : dist / STRIDE * TAU; hero.pd = dist;   // 一下子跳很遠（換山、補進度）就直接重算
  hero.stair += ((nSt ? clamp(rise / SEG / 0.45, 0.4, 1) : 0) - hero.stair) * Math.min(1, dt * 3);
  // 背包：阻尼彈簧跟著步伐上下彈
  const tgt = -Math.abs(Math.sin(hero.ph)) * 3 * hero.mv;
  hero.pv += ((tgt - hero.py) * 140 - hero.pv * 14) * dt; hero.py += hero.pv * dt;
  // 鋼杯：單擺
  hero.mgv += (-hero.mga * 60 - hero.mgv * 3 + Math.cos(hero.ph) * 14 * hero.mv + Math.sin(t * 1.3) * 0.6) * dt;
  hero.mga = clamp(hero.mga + hero.mgv * dt, -0.9, 0.9);
  hero.lean += ((s.boost && mv ? 1 : mv ? 0.45 + 0.4 * hero.stair : 0) - hero.lean) * Math.min(1, dt * 5);
  // 轉彎：看腳下到前方幾公尺的彎度，身體慢慢往彎的內側傾、腳往內側偏一點；直線上回到正好 0；系統設定減少動態就不傾
  let kc = 0; for (let q = 0; q < TURN_LOOK; q++) kc += cAt(si + q); kc /= TURN_LOOK;
  const tg = RMOT && RMOT.matches ? 0 : clamp(kc / TURN_FULL, -1, 1) * Math.max(mv, 0.4);
  hero.turn += (tg - hero.turn) * Math.min(1, dt * 2.5); if (!tg && Math.abs(hero.turn) < 0.002) hero.turn = 0;
  // 每次落腳揚起一點塵土
  const st = Math.floor(hero.ph / Math.PI + 0.5);
  if (st !== hero.st) { if (hero.st !== -1 && mv && !isRain && !isSnow) S.burst(hero.sx + ((st & 1) ? 10 : -10) * hero.u, hero.sy - 2, 'dust', 2); hero.st = st; }
  updGait(s, dt, dist);
}
// ───────── 步態：累了慢慢走、偶爾停下來喘氣／喝水／擦汗／看風景、開心時小跳、上階梯和轉彎換圖 ─────────
function rnd(r){ return r[0] + Math.random() * (r[1] - r[0]); }
function gaitReset(){ gait.act = null; gait.pace = 1; gait.tB = rnd(GAIT.breath[1]); gait.tH = rnd(GAIT.hop); gait.tI = rnd(GAIT.idle); gait.lookM = -1; gait.cur = ''; gait.prev = ''; gait.k = 1; }
function gaitStart(id, dur, flip){ if (!ART.get(id)) return; gait.act = id; gait.at = 0; gait.dur = dur; gait.aflip = !!flip; }
// 前面幾公尺內有沒有觀景台或路線地標（登山口、終點不算）；每個只看一次
function lookAhead(dist){
  for (let i = 0; i < AP.length; i++) { const o = AP[i]; if (o.m > dist + GAIT.look) break; if (o.type === 'view' && o.m > dist && o.m > gait.lookM) { gait.lookM = o.m; return o.side; } }
  const wp = (M && M.waypoints) || [];
  for (let k = 0; k < wp.length; k++) { const m = wp[k].m; if (m > 30 && m < total - 30 && m > dist && m <= dist + GAIT.look && m > gait.lookM) { gait.lookM = m; return Hh(Math.round(m), 440) < 0.5 ? -1 : 1; } }
  return 0;
}
function updGait(s, dt, dist){
  const G = GAIT, stam = s.stam == null ? 100 : s.stam, lvl = stam < G.veryTired ? 2 : stam < G.tired ? 1 : 0;
  if (lvl !== gait.lvl) { gait.tB = lvl ? Math.min(gait.tB, rnd(G.breath[lvl])) : rnd(G.breath[1]); gait.lvl = lvl; }
  // 長按快走、休息、睡覺、快到山頂、東峰岩溝（戴頭盔那段）都不停下來做動作
  const free = !s.boost && !s.rest && !s.sleep && (s.frac == null || s.frac < 0.985) && !(helmetFrom != null && dist >= helmetFrom) && dist > 15;
  if (gait.act) { gait.at += dt; if (!free || gait.at >= gait.dur) gait.act = null; }
  else if (free && hero.mv > 0.6) {
    gait.tB -= dt; gait.tH -= dt; gait.tI -= dt;
    const hot = !isNight && !isRain && !isSnow && !isFog && sunVis > 0.6, side = lookAhead(dist);
    if (side) gaitStart('hiker_look', rnd(G.lookDur), side < 0);   // 圖是往右看：景在左邊就鏡射
    else if (lvl && gait.tB <= 0) { gaitStart('hiker_breath', rnd(G.breathDur)); gait.tB = rnd(G.breath[lvl]); }
    else if (gait.tI <= 0) { gaitStart(Math.random() < G.wipe[0] + (hot ? G.wipe[1] : 0) + (hero.stair > 0.3 ? G.wipe[2] : 0) ? 'hiker_wipe' : 'hiker_drink', rnd(G.idleDur)); gait.tI = rnd(G.idle); }
    else if (gait.tH <= 0 && stam >= G.happy && hero.stair < 0.2 && Math.abs(hero.turn) < 0.2) { if (!(RMOT && RMOT.matches)) gaitStart('hiker_hop4', G.hopDur); gait.tH = rnd(G.hop); }
  }
  // 前進速度：做動作時停下來，累了慢慢走；長按快走照原本的速度。慢慢變，不會一下子停住
  const tg = gait.act ? 0 : s.boost ? 1 : G.pace[lvl];
  gait.pace += (tg - gait.pace) * Math.min(1, dt * 6);
  if (gait.k < 1) gait.k = Math.min(1, gait.k + dt / G.fade);
}
S.pace = function(){ return gait.pace; };
S.gait = function(){ return { g:gait, stair:hero.stair, turn:hero.turn, mv:hero.mv }; };   // 測試掛鉤：看現在的步態、把計時器歸零來測試各種動作
// 現在要用哪一張走路圖、要不要鏡射（寫在 gait.sid、gait.sf；每格都會跑，不產生新的陣列、字串）
const RAIN_OF = { hiker_stairs8:'hiker_rain_stairs8', hiker_tired_walk8:'hiker_rain_tired_walk8' };   // 下雨天：有穿雨衣的版本就用
function rainy(id){ const r = RAIN_OF[id]; return isRain && r && ART.get(r) ? r : id; }
function gaitSheet(){
  const G = GAIT;
  gait.onStair = hero.stair > (gait.onStair ? G.stairOut : G.stairIn);
  gait.onTurn = Math.abs(hero.turn) > (gait.onTurn ? G.turnOut : G.turnIn);
  gait.sf = false;
  if (gait.act) { gait.sid = gait.act; gait.sf = gait.aflip; return; }
  // 走路一律用「正背面」那張：階梯圖每格身體一下朝左一下朝右、累的圖朝左前方、轉身圖朝右前方，換來換去看起來像左右斜著走（玩家意見：上階梯要直直走）
  // 累了只放慢速度（GAIT.pace）；這三張要等重畫成正背面再加回來
  // 一般走路：有八格版就用八格（走路比較順）；下雨天穿黃色雨衣
  gait.sid = isRain && ART.get('hiker_rain_walk8') ? 'hiker_rain_walk8' : isRain && ART.get('hiker_rain_walk') ? 'hiker_rain_walk' : ART.get('hiker_walk8') ? 'hiker_walk8' : 'hiker_walk';
}
// 某張圖現在畫第幾格、畫多高：走路類跟著步伐相位（換圖時步伐接得上），小跳照動作進度，單張動作只有一格
function gaitDraw(c, id, flip, fl){
  const e = ART.get(id); if (!e) return false;
  let i = 0, h = SCALE.hero * 100, dy = 0;
  if (id === 'hiker_hop4') { i = id === gait.act ? Math.min(3, Math.floor(gait.at / gait.dur * 4)) : 3; h *= e.frames[i].h / e.frames[3].h; }   // 跳起來那格的外框含離地空隙：照站著那格的比例畫，人不會忽大忽小
  else if (id === 'hiker_breath') h = SCALE.heroBreath * 100;
  else if (e.frames.length === 1) h = SCALE.heroPose * 100;
  else { i = walkFrame(e.frames.length); dy = -Math.abs(Math.sin(hero.ph)) * 1.5 * hero.mv; }
  return ART.drawFrame(c, id, i, 0, dy, h, flip, fl);
}
function heroGait(c, s, t, fl){
  gaitSheet();
  if (gait.sid !== gait.cur || gait.sf !== gait.curF) { if (gait.cur) { gait.prev = gait.cur; gait.prevF = gait.curF; gait.k = 0; } gait.cur = gait.sid; gait.curF = gait.sf; }   // 換圖：記下上一張，交叉淡換
  const a0 = c.globalAlpha, k = gait.k;
  if (k < 1 && gait.prev) {   // 上一張慢慢淡掉、這一張很快浮上來（中間不會整個人變半透明）
    c.globalAlpha = a0 * (1 - k); gaitDraw(c, gait.prev, gait.prevF, fl);
    c.globalAlpha = a0 * Math.min(1, k * 2);
  }
  const ok = gaitDraw(c, gait.cur, gait.curF, fl);
  c.globalAlpha = a0;
  return ok;
}
function limb(c, x1, y1, qx, qy, x2, y2, w, lt, sh){
  c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo(qx, qy, x2, y2);
  c.strokeStyle = INK; c.lineWidth = w + 3.6; c.stroke(); c.strokeStyle = sh; c.lineWidth = w; c.stroke();
  c.beginPath(); c.moveTo(x1 + w * 0.16, y1); c.quadraticCurveTo(qx + w * 0.16, qy, x2 + w * 0.16, y2); c.strokeStyle = lt; c.lineWidth = w * 0.56; c.stroke();
}
// f：腳往前(+)／往後(-)；lift：擺動中抬起的高度
function leg(c, side, f, lift){
  const hx = side * 9, hy = -64, k = 1 - f * 0.07, fx = side * 10, fy = -f * 9 - lift * 6;
  limb(c, hx, hy, side * (11 + lift * 2), (hy + fy) / 2 - lift * 5 - (f > 0 ? f * 3 : 0), fx, fy - 12 * k, 13 * k, PANT_L, PANT_S);
  if (f < -0.15 && lift > 0.15) {           // 後腳抬起：看得到鞋底
    cel(c, pE(fx, fy - 7, 7.5 * k, 9.5 * k, side * 0.12), SOLE_L, SOLE_S, 1.5, -1.5, 2);
    c.strokeStyle = 'rgba(240,220,190,0.5)'; c.lineWidth = 1.3;
    for (let q = -1; q <= 1; q++) seg(c, fx - 4.5, fy - 7 + q * 4.5, fx + 4.5, fy - 7 + q * 4.5);
  } else cel(c, pR(fx - 7.5 * k, fy - 13 * k, 15 * k, 13 * k, 5 * k), BOOT_L, BOOT_S, 2, -1.5, 2);
}
function pole(c, side, hx, hy, fwd, lift){
  const tx = side * 37, ty = -fwd * 13 - lift * 4 + 1;
  c.strokeStyle = INK; c.lineWidth = 3.6; seg(c, hx, hy, tx, ty); c.strokeStyle = '#cfd4d8'; c.lineWidth = 1.8; seg(c, hx, hy, tx, ty);
  dot(c, tx + (hx - tx) * 0.08, ty + (hy - ty) * 0.08, 2.6, INK);
  c.strokeStyle = INK; c.lineWidth = 5.6; seg(c, hx, hy, hx + (tx - hx) * 0.13, hy + (ty - hy) * 0.13); c.strokeStyle = '#6a4a3c'; c.lineWidth = 3; seg(c, hx, hy, hx + (tx - hx) * 0.13, hy + (ty - hy) * 0.13);
}
function drawHat(c, y, tilt){
  c.save(); c.translate(0, y); c.rotate(tilt);
  cel(c, pE(0, 0, 30, 12.5, 0), HAT_L, HAT_S, 4, -2.5, 2.4);
  cel(c, pE(0, -6, 15.5, 11.5, 0), HAT_L, HAT_S, 3, -2.5, 2.2);
  c.beginPath(); c.ellipse(0, -3.5, 15.6, 8.5, 0, 0.12 * Math.PI, 0.88 * Math.PI);
  c.strokeStyle = INK; c.lineWidth = 5; c.stroke(); c.strokeStyle = '#c8553f'; c.lineWidth = 3; c.stroke();
  c.restore();
}
// 大背包（以背著時的座標畫：頂 -132、底 -49）
function drawPack(c, rain){
  cel(c, pR(-27, -64, 54, 15, 7.5), MAT_L, MAT_S, 2, -2, 2.2);                    // 睡墊
  c.strokeStyle = rgba(INK, 0.6); c.lineWidth = 1.2; c.beginPath(); c.ellipse(-21.5, -56.5, 3.2, 5, 0, 0, TAU); c.stroke();
  c.strokeStyle = INK; c.lineWidth = 4; seg(c, -11, -65, -11, -49.5); seg(c, 11, -65, 11, -49.5);
  c.strokeStyle = '#7a5a44'; c.lineWidth = 2; seg(c, -11, -65, -11, -49.5); seg(c, 11, -65, 11, -49.5);
  if (rain) {                                                                     // 雨衣罩住背包
    const p = new Path2D(); p.moveTo(-17, -134); p.lineTo(17, -134); p.quadraticCurveTo(34, -112, 35, -70); p.quadraticCurveTo(26, -64, 17, -69); p.quadraticCurveTo(8, -63, 0, -68); p.quadraticCurveTo(-9, -63, -18, -69); p.quadraticCurveTo(-27, -64, -35, -70); p.quadraticCurveTo(-34, -112, -17, -134); p.closePath();
    cel(c, p, PON_L, PON_S, 4, -3, 2.4);
    c.strokeStyle = rgba(INK, 0.35); c.lineWidth = 1.4; seg(c, -8, -120, -12, -76); seg(c, 10, -118, 14, -78);
    return;
  }
  cel(c, pR(21, -98, 11, 24, 4), BOT_L, BOT_S, 1.5, -1, 2); cel(c, pR(23, -103, 7, 6, 2), '#eef2f4', '#aab4bc', 1, -1, 1.8);   // 水壺
  cel(c, pR(19.5, -86, 13, 15, 3), BGP_L, BGP_S, 1.5, -1, 2);                     // 側袋
  cel(c, pR(-23, -124, 46, 62, 13), BAG_L, BAG_S, 4, -3, 2.4);                    // 主袋
  cel(c, pR(-24.5, -132, 49, 22, 10), LID_L, LID_S, 4, -2.5, 2.4);                // 頂蓋
  c.strokeStyle = INK; c.lineWidth = 5.4; seg(c, 0, -112, 0, -101); c.strokeStyle = '#7a5a44'; c.lineWidth = 3; seg(c, 0, -112, 0, -101);
  cel(c, pR(-3.5, -108, 7, 5, 1.2), '#d8dde0', '#9aa4ad', 0.8, -0.6, 1.4);
  cel(c, pR(-14, -98, 28, 26, 7), BGP_L, BGP_S, 2.5, -2, 2.2);                    // 前袋
  c.strokeStyle = rgba(INK, 0.55); c.lineWidth = 1.3; c.beginPath(); c.moveTo(-9, -90); c.quadraticCurveTo(0, -93, 9, -90); c.stroke();
  cel(c, pR(-30, -73, 60, 8, 4), '#8a664c', '#5e4436', 2, -1, 2);                 // 腰帶
  c.save(); c.translate(-24, -106); c.rotate(hero.mga);                          // 鋼杯吊飾
  c.strokeStyle = INK; c.lineWidth = 1.4; seg(c, 0, 0, 0, 9);
  c.beginPath(); c.arc(-6.5, 14, 3, Math.PI * 0.5, Math.PI * 1.5); c.lineWidth = 1.8; c.stroke();
  cel(c, pR(-5.5, 9, 11, 10, 2.5), MUG_L, MUG_S, 1.5, -1, 1.8);
  c.restore();
}
function heroWalk(c, t){
  const ph = hero.ph, mv = hero.mv, sn = Math.sin(ph), cs = Math.cos(ph), br = Math.sin(t * 2.2) * (1 - mv), rain = isRain;
  // 遠的（往前伸的）那隻腳先畫
  if (sn > 0) { leg(c, -1, sn * mv, Math.max(0, cs) * mv); leg(c, 1, -sn * mv, Math.max(0, -cs) * mv); }
  else { leg(c, 1, -sn * mv, Math.max(0, -cs) * mv); leg(c, -1, sn * mv, Math.max(0, cs) * mv); }
  c.save(); c.translate(sn * 1.6 * mv, -hero.lean * 3 + br * 0.6 - Math.abs(cs) * 1.6 * mv); c.rotate(sn * 0.022 * mv); c.scale(1, 1 - hero.lean * 0.035);
  const aL = -sn * mv, aR = sn * mv, hyL = -86 - aL * 6, hyR = -86 - aR * 6;     // 手與對側腳同步
  pole(c, -1, -28, hyL, aL, Math.max(0, -cs) * mv); pole(c, 1, 28, hyR, aR, Math.max(0, cs) * mv);
  cel(c, pR(-21, -127, 42, 64, 15), rain ? PON_L : JK_L, rain ? PON_S : JK_S, 4, -3, 2.4);
  limb(c, -19, -119, -28, -104, -28, hyL, 9.5, rain ? PON_L : JK_L, rain ? PON_S : JK_S); dot(c, -28, hyL, 4.4, SKIN); c.lineWidth = 1.6; c.strokeStyle = INK; c.stroke();
  limb(c, 19, -119, 28, -104, 28, hyR, 9.5, rain ? PON_L : JK_L, rain ? PON_S : JK_S); dot(c, 28, hyR, 4.4, SKIN); c.lineWidth = 1.6; c.strokeStyle = INK; c.stroke();
  cel(c, pE(0, -134, 9.5, 8.5, 0), HAIR_L, HAIR_S, 2, -2, 2);
  c.save(); c.translate(0, hero.py); c.rotate(-sn * 0.02 * mv); drawPack(c, rain); c.restore();
  drawHat(c, -147 + br * 0.4, sn * 0.03 * mv);
  c.restore();
}
function sitLegs(c){
  cel(c, pE(-20, -9, 16, 9, -0.2), PANT_L, PANT_S, 2, -2, 2.2); cel(c, pE(20, -9, 16, 9, 0.2), PANT_L, PANT_S, 2, -2, 2.2);
  cel(c, pE(-36, -5, 6.5, 5, 0), BOOT_L, BOOT_S, 1.5, -1, 2); cel(c, pE(36, -5, 6.5, 5, 0), BOOT_L, BOOT_S, 1.5, -1, 2);
}
function heroRest(c, t){
  const br = Math.sin(t * 2) * 0.8, lt = isRain ? PON_L : JK_L, sh = isRain ? PON_S : JK_S;
  c.strokeStyle = INK; c.lineWidth = 3.6; seg(c, -86, -2, -68, -104); seg(c, -92, -2, -80, -100);
  c.strokeStyle = '#cfd4d8'; c.lineWidth = 1.8; seg(c, -86, -2, -68, -104); seg(c, -92, -2, -80, -100);
  c.save(); c.translate(-58, 48); c.rotate(-0.05); drawPack(c, false); c.restore();      // 背包放在旁邊
  sitLegs(c);
  c.save(); c.translate(0, br);
  cel(c, pR(-21, -70, 42, 64, 16), lt, sh, 4, -3, 2.4);
  limb(c, -19, -60, -29, -42, -23, -24, 9.5, lt, sh);
  limb(c, 19, -60, 31, -50, 33, -37, 9.5, lt, sh); dot(c, 33, -37, 4.4, SKIN); c.lineWidth = 1.6; c.strokeStyle = INK; c.stroke();
  cel(c, pR(28, -49, 11, 11, 2.5), MUG_L, MUG_S, 1.5, -1, 1.8);
  for (let k = 0; k < 3; k++) { const yy = (t * 13 + k * 9) % 27; c.globalAlpha = (1 - yy / 27) * 0.55; dot(c, 33.5 + Math.sin(t * 2 + k * 2) * 3, -53 - yy, 2.6 + yy * 0.12, '#ffffff'); }   // 熱氣
  c.globalAlpha = 1;
  cel(c, pE(0, -77, 9.5, 8.5, 0), HAIR_L, HAIR_S, 2, -2, 2);
  drawHat(c, -90, Math.sin(t * 0.7) * 0.04);
  c.restore();
}
function heroSleep(c, t){
  const lt = isRain ? PON_L : JK_L, sh = isRain ? PON_S : JK_S;
  c.save(); c.translate(-44, 48); c.rotate(-0.04); drawPack(c, false); c.restore();      // 靠著背包睡
  sitLegs(c);
  c.save(); c.rotate(-0.24); c.translate(0, Math.sin(t * 1.4) * 0.8);
  cel(c, pR(-21, -70, 42, 64, 16), lt, sh, 4, -3, 2.4);
  limb(c, -19, -60, -28, -40, -21, -22, 9.5, lt, sh); limb(c, 19, -60, 28, -40, 22, -22, 9.5, lt, sh);
  cel(c, pE(0, -77, 9.5, 8.5, 0), HAIR_L, HAIR_S, 2, -2, 2);
  drawHat(c, -88, -0.22);
  c.restore();
  c.font = '700 16px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle';
  for (let k = 0; k < 3; k++) {
    const p = (t * 0.45 + k / 3) % 1, z = 0.6 + p * 0.7;
    c.globalAlpha = Math.sin(p * Math.PI); c.save(); c.translate(8 + p * 30 + Math.sin(t * 2 + k) * 3, -104 - p * 44); c.scale(z, z);
    c.strokeStyle = INK; c.lineWidth = 3; c.strokeText('z', 0, 0); c.fillStyle = '#fff8e6'; c.fillText('z', 0, 0); c.restore();
  }
  c.globalAlpha = 1;
}
function dogLeg(c, x, yb, lift, k){ cel(c, pR(x - 3.4 * k, yb - 17 * k - lift, 6.8 * k, 17 * k, 3), DOG_L, DOG_S, 1.2, -1, 1.8); cel(c, pR(x - 3.8 * k, yb - 5 * k - lift, 7.6 * k, 5 * k, 2.4), CRM_L, CRM_S, 1, -0.8, 1.6); }
function dogBags(c, y){
  c.beginPath(); c.moveTo(-14, y); c.quadraticCurveTo(0, y - 7, 14, y); c.strokeStyle = INK; c.lineWidth = 4.4; c.stroke(); c.strokeStyle = '#7a5a44'; c.lineWidth = 2.4; c.stroke();
  cel(c, pR(-20, y - 3, 8.5, 12, 3), '#e0664a', '#a8433a', 1, -1, 1.8); cel(c, pR(11.5, y - 3, 8.5, 12, 3), '#e0664a', '#a8433a', 1, -1, 1.8);
}
function dogHead(c, y){
  cel(c, pP([-10, y - 3, -9.5, y - 15, -2.5, y - 8]), DOG_L, DOG_S, 1, -1, 1.8); cel(c, pP([10, y - 3, 9.5, y - 15, 2.5, y - 8]), DOG_L, DOG_S, 1, -1, 1.8);
  cel(c, pE(0, y, 10.5, 9.5, 0), DOG_L, DOG_S, 2.5, -2, 2);
  cel(c, pE(-9.5, y + 3.5, 3.2, 3, 0), CRM_L, CRM_S, 0.6, -0.6, 1.5); cel(c, pE(9.5, y + 3.5, 3.2, 3, 0), CRM_L, CRM_S, 0.6, -0.6, 1.5);
}
function drawDog(x, y, u, s, t){
  const c = ctx, mv = hero.mv, wag = Math.sin(t * (mv > 0.5 ? 9 : 13)) * 0.4;
  c.drawImage(SHADOW, x - 27 * u, y - 10 * u, 50 * u, 20 * u);
  c.save(); c.translate(x, y); c.scale(u, u);
  if (s.sleep) {                              // 趴下睡覺
    cel(c, pE(0, -9, 22, 10, 0), DOG_L, DOG_S, 3, -2, 2);
    cel(c, pE(15, -13, 6, 5.5, 0), CRM_L, CRM_S, 1.5, -1, 1.8);
    cel(c, pP([-27, -13, -26, -22, -20, -16]), DOG_L, DOG_S, 1, -1, 1.8); cel(c, pP([-17, -17, -13, -24, -10, -14]), DOG_L, DOG_S, 1, -1, 1.8);
    cel(c, pE(-19, -9, 10, 8.5, 0), DOG_L, DOG_S, 2, -2, 2);
  } else if (mv < 0.3) {                      // 坐下搖尾巴
    c.save(); c.translate(7, -6); c.rotate(wag); cel(c, pE(6, -2, 7.5, 6, 0), CRM_L, CRM_S, 1.5, -1, 1.8); c.restore();
    cel(c, pE(-11, -6, 7.5, 6.5, 0), DOG_L, DOG_S, 1.5, -1, 2); cel(c, pE(11, -6, 7.5, 6.5, 0), DOG_L, DOG_S, 1.5, -1, 2);
    cel(c, pE(0, -18, 13.5, 16, 0), DOG_L, DOG_S, 3, -2.5, 2);
    dogBags(c, -22); dogHead(c, -41 + Math.sin(t * 2.2) * 0.6);
  } else {                                    // 小跑步：對角腳同步
    const a = Math.sin(hero.ph * 2), l1 = Math.max(0, a) * 5, l2 = Math.max(0, -a) * 5, bob = Math.abs(Math.cos(hero.ph * 2)) * 1.4;
    dogHead(c, -43 - bob * 1.2);
    dogLeg(c, -8.5, -5, l2, 0.85); dogLeg(c, 8.5, -5, l1, 0.85);
    cel(c, pE(0, -25 - bob, 13.5, 12.5, 0), DOG_L, DOG_S, 3, -2.5, 2);
    dogLeg(c, -8, 0, l1, 1); dogLeg(c, 8, 0, l2, 1);
    dogBags(c, -28 - bob);
    c.save(); c.translate(1, -35 - bob); c.rotate(wag * 0.7); cel(c, pE(2, -5, 6.5, 6.5, 0), CRM_L, CRM_S, 1.5, -1.2, 1.8);
    c.strokeStyle = rgba(INK, 0.5); c.lineWidth = 1.2; c.beginPath(); c.arc(2, -5, 3, 0.5, 4.2); c.stroke(); c.restore();
  }
  c.restore();
}
// ───────── 一起爬的隊友：換一套衣服顏色，用同一套走路動畫畫在他實際走到的位置 ─────────
let mates = [];
S.setMates = function(list){
  mates = (list || []).map(m => {
    const old = mates.find(o => o.name === m.name), tg = Math.max(0, +m.dist || 0);
    return { name: String(m.name || '山友').slice(0, 12), target: tg, d: old ? old.d : tg, rest: !!m.rest };
  });
};
function stepMates(dt){ for (const mt of mates) mt.d += (mt.target - mt.d) * Math.min(1, dt * 1.5); }
function drawMate(mt, j, f, t, fade){
  const d0 = curS ? curS.dist || 0 : 0, near = Math.abs(mt.d - d0) < 1.6;
  proj(j, f, false);
  const X = gx + (near ? 0.95 : -0.35) * gs, Y = gy, u = gs / 100, na = clamp((gz - 1.2) / 1.6, 0, 1) * clamp((u - 0.06) / 0.04, 0, 1);   // 走到鏡頭旁邊、或遠到很小的時候慢慢淡掉，不會突然不見
  if (Y - 200 * u > H || na <= 0) return;   // 整個人（含名牌）都在畫面下緣以外才不畫
  fade *= na;
  const sv = { ph:hero.ph, mv:hero.mv, lean:hero.lean, py:hero.py, mga:hero.mga };
  const cols = [JK_L, JK_S, BAG_L, BAG_S, LID_L, LID_S, HAT_L, HAT_S];
  JK_L = '#5f9fd6'; JK_S = '#3c6f9e'; BAG_L = '#9ac46a'; BAG_S = '#6a9446'; LID_L = '#86b45a'; LID_S = '#5c8a3e'; HAT_L = '#f2c94c'; HAT_S = '#c49a34';
  hero.ph = mt.d / STRIDE * TAU + 1.3; hero.mv = mt.rest ? 0 : 1; hero.lean = mt.rest ? 0 : 0.45; hero.py = 0; hero.mga = Math.sin(t * 2) * 0.3;
  ctx.globalAlpha = fade;
  ctx.drawImage(SHADOW, X - 48 * u, Y - 17 * u, 86 * u, 34 * u);
  ctx.save(); ctx.translate(X, Y); ctx.scale(u, u);
  try {
    const drawn = heroArt(ctx, { rest:mt.rest }, t, tintFilter(hashStr(mt.name)));
    if (!drawn) { if (mt.rest) heroRest(ctx, t); else heroWalk(ctx, t); }
  } finally {
    ctx.restore();
    [JK_L, JK_S, BAG_L, BAG_S, LID_L, LID_S, HAT_L, HAT_S] = cols; Object.assign(hero, sv);
  }
  // 名牌
  const ty = Y - (mt.rest ? 118 : 182) * u - 6, fs = clamp(22 * u, 9, 14);
  ctx.font = `${fs}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(mt.name).width + 12;
  ctx.fillStyle = 'rgba(255,248,230,.92)'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
  ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(X - w / 2, ty - fs * 0.8, w, fs * 1.6, fs * 0.8); else ctx.rect(X - w / 2, ty - fs * 0.8, w, fs * 1.6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = INK; ctx.fillText(mt.name, X, ty + 0.5);
  ctx.globalAlpha = 1;
}
// ───────── 寵物：柴犬原樣；黑熊、石虎先用換色的四腳獸，藍鵲畫一隻跳著走的小鳥（之後換成 Gemini 美術） ─────────
const PET_COL = {
  bear:       ['#4a413c', '#2a2422', '#f1e6cf', '#c9b89a'],
  leopardcat: ['#d2a464', '#9a7040', '#fbf0dc', '#d8c2a0'],
};
// 寵物美術圖：pet_<id>_walk（四格）；柴犬也接受第一批的 shiba_walk／shiba_sit。高度單位公分
const PET_H = { shiba:46, bear:58, leopardcat:40, magpie:34 };
function petArt(s, x, y, u, t){
  const id = s.pet, rw = 'pet_' + id + '_rain_walk', walk = isRain && ART.get(rw) ? rw : ART.get('pet_' + id + '_walk') ? 'pet_' + id + '_walk' : (id === 'shiba' && ART.get('shiba_walk') ? 'shiba_walk' : null);   // 下雨天：有穿雨衣的走路圖就用（pet_<id>_rain_walk）
  if (!walk) return false;
  const sitting = hero.mv < 0.3 || s.sleep, h = PET_H[id] || 44;
  const sit = !sitting ? null : ART.get('pet_' + id + '_sit') ? 'pet_' + id + '_sit' : (id === 'shiba' && ART.get('shiba_sit') ? 'shiba_sit' : null);   // 坐姿：pet_<id>_sit，柴犬也接受第一批的 shiba_sit
  ctx.drawImage(SHADOW, x - 27 * u, y - 10 * u, 50 * u, 20 * u);
  ctx.save(); ctx.translate(x, y); ctx.scale(u, u);
  if (sit) ART.drawFrame(ctx, sit, 0, 0, 0, h * 0.95);
  else ART.drawFrame(ctx, walk, sitting ? 0 : Math.floor(hero.ph / TAU * 8), 0, 0, h);   // 小跑步：一個步伐循環跑兩輪
  ctx.restore();
  return true;
}
function drawPet(s, x, y, u, t){
  if (!s.pet) return;
  if (petArt(s, x, y, u, t)) return;
  if (s.pet === 'shiba') { drawDog(x, y, u * 0.98, s, t); return; }
  if (s.pet === 'magpie') { drawBird(x, y, u, s, t); return; }
  const pc = PET_COL[s.pet]; if (!pc) return;
  const keep = [DOG_L, DOG_S, CRM_L, CRM_S];
  [DOG_L, DOG_S, CRM_L, CRM_S] = pc;
  try { drawDog(x, y, u * (s.pet === 'bear' ? 1.12 : 0.92), s, t); } finally { [DOG_L, DOG_S, CRM_L, CRM_S] = keep; }
}
function drawBird(x, y, u, s, t){
  const c = ctx, mv = hero.mv, hop = mv > 0.3 ? Math.abs(Math.sin(hero.ph * 1.5)) * 9 : Math.abs(Math.sin(t * 1.7)) * 2;
  c.drawImage(SHADOW, x - 16 * u, y - 6 * u, 30 * u, 12 * u);
  c.save(); c.translate(x, y - hop * u); c.scale(u, u);
  // 長尾巴（藍色帶白尖）
  c.save(); c.translate(0, -14); c.rotate(0.15 + Math.sin(t * 3) * 0.08);
  cel(c, pR(-3.2, -2, 6.4, 30, 3), '#3f73c9', '#2a4f94', 1, -1, 1.8); cel(c, pR(-3.2, 24, 6.4, 6, 3), '#ffffff', '#cfd6e0', 0.6, -0.6, 1.5);
  c.restore();
  cel(c, pE(0, -16, 10, 9, 0), '#4a84d8', '#2c58a2', 2, -1.5, 2);              // 身體
  cel(c, pE(-7, -16, 4, 7, 0.3), '#2c58a2', '#1f3f78', 1, -1, 1.6);             // 翅膀
  cel(c, pE(0, -27, 7, 6.5, 0), '#22252e', '#111318', 1.5, -1, 1.8);            // 黑色頭
  cel(c, pP([4.5, -27, 11, -25.5, 4.5, -24]), '#e2463a', '#a62c24', 0.6, -0.6, 1.5);   // 紅嘴
  c.fillStyle = '#ffe9a0'; c.beginPath(); c.arc(2.5, -28.5, 1.2, 0, TAU); c.fill();
  c.strokeStyle = '#e2463a'; c.lineWidth = 2.2; seg(c, -2.5, -8, -3.5, -1); seg(c, 2.5, -8, 3.5, -1);   // 紅腳
  c.restore();
}
// 走路循環的第幾格（n 格 = 一個完整步伐循環，四格或八格看美術圖）；停下來時用第一格
function walkFrame(n){ return hero.mv > 0.3 ? Math.floor(hero.ph / TAU * (n || 4)) : 0; }
// 用 Gemini 畫的登山客（以公分為單位畫在 (0,0) 腳底）；沒有圖就回 false
// fl：換衣服色調的濾鏡（隊友、廣場上的山友），自己是 undefined
function heroArt(c, s, t, fl, me){
  if (s.sleep) return ART.drawFrame(c, 'hiker_sleep', 0, 0, 0, SCALE.heroSleep * 100, false, fl);
  if (s.rest) return ART.drawFrame(c, 'hiker_rest', 0, 0, Math.sin(t * 2) * 0.8, SCALE.heroSit * 100, false, fl);
  if (s.frac >= 0.999 && hero.mv < 0.3 && ART.get('hiker_summit')) return ART.drawFrame(c, 'hiker_summit', 0, 0, 0, SCALE.heroSummit * 100, false, fl);   // 站上山頂：舉起登山杖歡呼
  if (me && hero.mv < 0.3 && helmetFrom != null && s.dist >= helmetFrom && ART.get('hiker_helmet')) return ART.drawFrame(c, 'hiker_helmet', 0, 0, 0, SCALE.hero * 100, false, fl);   // 東峰岩溝停下來：戴頭盔站著
  if (me) return heroGait(c, s, t, fl);   // 自己：累了、上階梯、轉彎、停下來喝水看風景、開心小跳（隊友、廣場照舊用一般走路圖）
  const w8 = id => ART.get(id + '8') ? id + '8' : id;   // 有八格版就用八格（走路比較順）
  const fw = s.face === 'front' ? 'hiker_front_walk8' : s.face === 'side' ? 'hiker_side_walk8' : null;   // 廣場：往鏡頭走用正面、往旁邊走用側面（plaza.js 決定方向、往左時整個人鏡射），停下來面向鏡頭
  if (fw && ART.get(fw)) return ART.drawFrame(c, fw, walkFrame(8), 0, -Math.abs(Math.sin(hero.ph)) * 1.5 * hero.mv, SCALE.hero * 100, false, fl);
  const walk = isRain && (ART.get('hiker_rain_walk8') || ART.get('hiker_rain_walk')) ? w8('hiker_rain_walk') : w8('hiker_walk');   // 下雨天穿黃色雨衣
  const e = ART.get(walk);
  return ART.drawFrame(c, walk, walkFrame(e && e.frames.length), 0, -Math.abs(Math.sin(hero.ph)) * 1.5 * hero.mv, SCALE.hero * 100, false, fl);
}
const tintFilter = k => 'hue-rotate(' + (150 + k % 3 * 60) + 'deg)';   // 美術圖版本：隊友換個衣服色調，跟自己分得出來
// 登山客站的地面高度：階梯上踩在踏面上（不是斜坡中間）；走路時快到下一階才慢慢抬上去，坐下時就坐在那一階
function heroGround(){
  const j = jhG, f = fhG, rise = pW[j + 1] - pW[j], base = pW[j] + rise * f;
  if (sAt(bG + j) !== 1 || !(rise > 0)) return base;
  const n = clamp(Math.ceil(rise / STEP_H), 1, 4), x = f * n, k = Math.floor(x), e = x - k;
  const up = curS && (curS.rest || curS.sleep) ? 0 : clamp((e - 0.62) / 0.38, 0, 1);
  return pW[j] + rise * (k + up * up * (3 - 2 * up)) / n;
}
// 休息時坐的長椅：長椅在停下來的地方前面一點（遊戲走到長椅前 1 公尺停），找得到就坐在椅面上
function restBench(s, dist){
  if (!s.rest) return null;
  for (let i = 0; i < AP.length; i++) { const o = AP[i]; if (o.type === 'bench' && o.m >= dist - 0.5 && o.m <= dist + 3) return o; }
  return null;
}
let benchO = null;
// bx、by、bs：坐在長椅上時，椅面中間的畫面位置和那裡的比例（每公尺幾像素）；沒給就站在路中間
function drawHero(s, t, bx, by, bs){
  proj(jhG, fhG, false);
  const onB = bx != null, sit = s.rest || s.sleep, tn = onB || sit ? 0 : hero.turn;   // tn：轉彎傾身（坐著不傾）
  const X = onB ? bx : gx + tn * TURN_X * gs, Y = onB ? by : HOR - (heroGround() - camY) * gs, u = (onB ? bs : gs) / 100;     // 角色座標單位：公分
  hero.sx = X; hero.sy = Y; hero.u = u; hero.top = Y - (sit ? SCALE.heroSit : SCALE.hero) * 95 * u;
  ctx.globalAlpha = 1;
  drawPet(s, X + 68 * u, (onB ? Y + SCALE.benchSeat * 100 * u : Y) - 6 * u, u, t);
  // 腳底影子：跨步時兩腳前後張開，影子前後拉長一點、左右縮一點；再疊一個貼著鞋底的小深影（坐在長椅上就只有椅面上一小片）
  const sd = sit ? 0 : Math.abs(Math.sin(hero.ph)) * hero.mv, sw = 86 * (1 - 0.06 * sd), sh = 34 * (1 + 0.3 * sd);
  if (onB) ctx.drawImage(CONTACT, X - 34 * u, Y - 8 * u, 68 * u, 14 * u);
  else ctx.drawImage(SHADOW, X - sw * 0.56 * u, Y - sh * 0.5 * u, sw * u, sh * u);
  if (!sit) ctx.drawImage(CONTACT, X - 26 * u, Y - 6 * u, 48 * u, 11 * u);
  ctx.save(); ctx.translate(X, Y); if (tn) ctx.rotate(tn * TURN_A); ctx.scale(u, u * (1 - 0.05 * hero.stair * hero.mv));   // 轉彎往內側傾（以腳底為軸）；爬階梯：身體往前傾，從背後看起來矮一點點
  if (!heroArt(ctx, s, t, undefined, true)) { if (s.sleep) heroSleep(ctx, t); else if (s.rest) heroRest(ctx, t); else heroWalk(ctx, t); }
  ctx.restore();
}

// 給登山口廣場用：在別的畫布 c 的 (X, Y) 腳底畫一個登山客（u：每公分幾像素）
// p：{ ph 步伐相位, mv 0～1 走動程度, sit 坐下, tint 衣服色調（-1＝自己原色，0～2＝隊友那三種）, pet, flip }
const TINT_COLS = [['#5f9fd6', '#3c6f9e', '#9ac46a', '#6a9446', '#f2c94c', '#c49a34'], ['#9a7ad0', '#6c519c', '#e88a9a', '#b25a6a', '#f7e8c0', '#cfb38a'], ['#5fbfa0', '#3c8a72', '#e0a050', '#a8723a', '#e88a6a', '#b0583e']];
S.drawPerson = function(c, X, Y, u, p, t){
  if (!SHADOW) buildStatic();
  const keepCtx = ctx, keepRain = isRain, sv = { ph:hero.ph, mv:hero.mv, lean:hero.lean, py:hero.py, mga:hero.mga };
  const cols = [JK_L, JK_S, BAG_L, BAG_S, HAT_L, HAT_S];
  ctx = c; isRain = false;
  hero.ph = p.ph || 0; hero.mv = p.mv || 0; hero.lean = p.mv ? 0.3 : 0; hero.py = -Math.abs(Math.sin(hero.ph)) * 2 * hero.mv; hero.mga = Math.sin(t * 2 + (p.ph || 0)) * 0.3;
  try {
    if (p.tint >= 0) [JK_L, JK_S, BAG_L, BAG_S, HAT_L, HAT_S] = TINT_COLS[p.tint % 3];
    if (p.pet) drawPet({ pet:p.pet, rest:p.sit }, X + (p.flip ? -62 : 62) * u, Y - 4 * u, u * 0.95, t);
    c.drawImage(SHADOW, X - 48 * u, Y - 17 * u, 86 * u, 34 * u);
    c.save(); c.translate(X, Y); c.scale(p.flip ? -u : u, u);
    const fl = p.tint >= 0 ? tintFilter(p.tint) : undefined, s = { rest:!!p.sit, face:p.face };   // 美術圖版本：換衣服色調
    // p.pose：{ id, cm } 廣場打招呼的動作美術圖（揮手、鞠躬、歡呼），寵物和影子照樣畫
    const posed = p.pose && ART.get(p.pose.id) ? ART.drawFrame(c, p.pose.id, 0, 0, 0, p.pose.cm, false, fl) : false;
    const drawn = posed || heroArt(c, s, t, fl);
    if (!drawn) { if (p.sit) heroRest(c, t); else heroWalk(c, t); }
    c.restore();
    if (posed) return p.pose.cm;
  } finally {
    ctx = keepCtx; isRain = keepRain; Object.assign(hero, sv);
    [JK_L, JK_S, BAG_L, BAG_S, HAT_L, HAT_S] = cols;
  }
  return p.sit ? 118 : 182;     // 頭頂高度（公分），給名牌和對話框對位
};
S.hashStr = hashStr;

// ═════════ 世界繪製（由遠到近） ═════════
// 深度用真正的距離算（不用 pZ 那個「最近 1.2 公尺」的下限）：鏡頭旁邊、後面的東西才會一路被推出畫面邊緣，
// 不會卡在 1.2 公尺不動、下一段才突然消失。gz：這個點離鏡頭幾公尺（物件靠太近時拿來淡出）
function proj(j, f, flat){
  const dz = Math.max(0.05, (j - offG + f) * SEG); gz = dz; gs = F / dz;
  gx = W / 2 + (pC[j] + (pC[j + 1] - pC[j]) * f - camX) * gs;
  gy = HOR - ((flat ? pW[j] : pW[j] + (pW[j + 1] - pW[j]) * f) - camY) * gs;
}
function quad(x1, y1, x2, y2, x3, y3, x4, y4){ ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.lineTo(x4, y4); ctx.fill(); }
function gwAt(dz){ return GW * (1 - 0.6 * clamp((dz - 40) / 120, 0, 1)); }   // 稜線越遠越窄，兩側露出山谷與雲海
// 兩側地形（每座山固定）：路邊一圈微微高起的土肩，讓步道像踩出來的凹槽；離路越遠起伏越大
// 振幅負的＝往下掉的山坡、正的＝靠著山壁；高山稜線大多往兩邊掉
// 森林步道（wallAt 高）兩邊大多是往上長的山壁，步道像走在一條凹下去的綠色走廊裡；高山稜線照舊往兩邊掉
function terrAmp(i, side){
  const v = vn(i * 0.016 + (side > 0 ? 71.3 : 13.7), 29), a = TH.alpine ? clamp((v - 0.66) * 16, -9, 2.5) : clamp((v - 0.45) * 13, -7, 4.5), w = wallAt(i);
  const r = w > 0.6 ? lerp(a, 1.2 + 4 * v, (w - 0.6) / 0.4) : a;
  return r > 0 ? r * (1 - endK(i)) : r;   // 山頂過後兩邊沒有比山頂高的山壁
}
// 這一段路兩側被植物包住的程度：theme.wall = [登山口, 山頂]，沿路線性變化
function wallAt(i){ const wl = TH.wall || (TH.alpine ? [0.5, 0.3] : [1, 1]); return lerp(wl[0], wl[1], clamp(i * SEG / total, 0, 1)); }
// 路肩土坎：步道是踩出來的凹槽，兩邊有一道幾乎垂直的土坎（高度沿路慢慢變）。木棧道是鋪在地上的，只留一點點邊
const BANKW = 0.08;
const STEP_H = 0.28;      // 一階最高幾公尺（原本 0.2；遠處橫木太密像百葉窗，間距拉開約 1.4 倍）
const PLANKS = 4;         // 木棧道每段幾片木板
const RISER_DK = 0.3;     // 階梯立面再壓暗多少（立面面對鏡頭、背光，要明顯比踏面暗，階梯才讀得出一階一階）
const WOOD_VAR = 0.5;     // 每塊木頭／石階深淺變化的強度
const WOOD_SH = 0.35;    // 木棧道投在左邊草地上的影子寬（公尺）
function bankH(i, side){ return (TH.trail === 'wood' ? 0.05 : 0.12 + 0.16 * vn(i * 0.13 + (side > 0 ? 5.1 : 0), 53)) * (1 - endK(i)); }   // 山頂過後沒有路，路邊的土坎也跟著消失
function terrH(i, side, d){
  if (d <= RW) return 0;
  const bh = bankH(i, side);
  if (d < RW + BANKW) return bh * (d - RW) / BANKW;
  const u = clamp((d - RW - BANKW) / 9, 0, 1), sm = u * u * (3 - 2 * u), q = i < 0 ? 0 : i > N ? N : i, dd = Math.min(d - RW - BANKW, 14);
  // 橫坡：一邊往上是山壁、一邊往下是山谷；貼著稜線邊緣那幾段，掉下去的那一側離路一公尺外就陡降
  const cr = side * xSlope[q] * dd * Math.min(1, dd / 1.5), dr = side === dropS[q] ? -edgeK[q] * Math.max(0, dd - 0.8) * 1.1 : 0;
  return bh + terrAmp(i, side) * sm + cr + dr + (vn(i * 0.09 + d * 0.21, side > 0 ? 43 : 47) - 0.5) * 0.9 * Math.min(1, (d - RW) / 2);
}
// 每段的橫坡（正的＝右邊往上）、稜線邊緣程度（0～1）、往下掉的是哪一邊：每座山算一次存起來，畫的時候直接查
let xSlope = new Float32Array(1), edgeK = new Float32Array(1), dropS = new Int8Array(1);
function buildSlopes(){
  xSlope = new Float32Array(N + 1); edgeK = new Float32Array(N + 1); dropS = new Int8Array(N + 1);
  const al = !!TH.alpine;
  for (let i = 0; i <= N; i++) {
    xSlope[i] = (vn(i * 0.011, 33) * 2 - 1) * (al ? 0.32 : 0.5);
    edgeK[i] = clamp((vn(i * 0.006, 34) - (al ? 0.6 : 0.72)) * 6, 0, 1);       // 高山稜線比較常走在邊緣上
    dropS[i] = vn(i * 0.003, 35) < 0.5 ? -1 : 1;
    if (edgeK[i] > 0 && Math.sign(xSlope[i]) === dropS[i]) xSlope[i] *= 1 - edgeK[i];   // 掉下去那一側不會同時是往上的山壁
  }
}
const TDN = [RW, RW + BANKW, RW + 0.6, RW + 1.8, RW + 4.5, RW + 10, 0], TDF = [RW, RW + BANKW, RW + 3, RW + 10, 0];   // 第一格＝土坎切面；近處切細、遠處切粗（最後一格＝稜線邊緣）
const tX1 = new Float32Array(8), tY1 = new Float32Array(8), tX2 = new Float32Array(8), tY2 = new Float32Array(8), tSh = new Float32Array(8);
const tLvS = new Int8Array(16);
// 這一邊草地那幾條帶子在 a～b 這一截的形狀（給 texRun；重複用同一個函式，不每段每邊產生新的小函式，少一點記憶體回收的停頓）
let gNS = 0;
function grassPath(a, b){
  for (let k = 1; k < gNS - 1; k++) { ctx.moveTo(lerp(tX1[k], tX2[k], a), lerp(tY1[k], tY2[k], a)); ctx.lineTo(lerp(tX1[k + 1], tX2[k + 1], a), lerp(tY1[k + 1], tY2[k + 1], a)); ctx.lineTo(lerp(tX1[k + 1], tX2[k + 1], b), lerp(tY1[k + 1], tY2[k + 1], b)); ctx.lineTo(lerp(tX1[k], tX2[k], b), lerp(tY1[k], tY2[k], b)); ctx.closePath(); }
}   // 兩側各自的坡面明暗（畫草叢時查）
function lvc(i, side){ return clamp((vn(i * 0.11 + side * 37.7, 21) - 0.5) / 0.14, -1, 1); }   // 世界固定的光影斑塊（-1 暗～1 亮，連續）
// 坡面陰影的顏色（-1～1 分 81 階，先做好不每幀產生字串）：背光偏藍紫、向陽暖黃
const SHC = []; for (let q = -40; q <= 40; q++) SHC.push(q < 0 ? 'rgba(34,40,80,' + (-q / 40 * 0.42).toFixed(3) + ')' : 'rgba(255,236,186,' + (q / 40 * 0.34).toFixed(3) + ')');
// 這一段近端在世界上的位置（公尺）：鏡頭前最近那段的近端被推到 NEAR_Z 時也算對，貼圖才不會在畫面最下面被擠壓、跳動
function zAt(j){ return (bG + offG) * SEG + pZ[j]; }
// 路旁貼圖：a 是整體不透明度（遠處淡入、貼近鏡頭淡出都乘在這裡），sh 是影子的不透明度（0＝不畫）
// 遠處很小的東西不是「小於幾像素就不畫」，而是在 2～4.5 像素之間慢慢淡入；離鏡頭不到 1.5 公尺的慢慢淡出（gz 由 proj 算好）
// 一種東西的地面影子（往左下偏，光從右上來）＋貼著底部的深色接觸陰影（最寬約 1.3 公尺：樹只壓在樹幹底下，石頭、灌木、長椅整個底部都壓著）
// 合成一張存在這張圖上（單位：公尺，畫的時候乘上比例）；影子本來就是模糊的，每公尺 24 像素就夠
const SHD_PPM = 24;
function sprShadow(sp){
  const dw = sp.w, dh = sp.hm, sw = dw * 1.05, shh = Math.min(sw * 0.36, dh * 0.5), cw = Math.min(dw * 0.78, 1.3), ch = Math.min(cw * 0.3, dh * 0.3);
  const x0 = Math.min(-sw * 0.62, -cw * 0.55), y0 = Math.min(-shh * 0.55, -ch * 0.62), x1 = Math.max(sw * 0.38, cw * 0.45), y1 = Math.max(shh * 0.45, ch * 0.38);
  const c = mk((x1 - x0) * SHD_PPM, (y1 - y0) * SHD_PPM), g = c.getContext('2d'), kx = c.width / (x1 - x0), ky = c.height / (y1 - y0);
  g.drawImage(SHADOW, (-sw * 0.62 - x0) * kx, (-shh * 0.55 - y0) * ky, sw * kx, shh * ky);
  g.globalAlpha = 0.85; g.drawImage(CONTACT, (-cw * 0.55 - x0) * kx, (-ch * 0.62 - y0) * ky, cw * kx, ch * ky);
  return (sp.sd = { c:c, x:x0, y:y0, w:x1 - x0, h:y1 - y0 });
}
function drawSpr(sp, x, y, sc, fq, sh, a){
  const dw = sp.w * sc, dh = sp.hm * sc, k = a * clamp((dh - 2) / 2.5, 0, 1) * clamp(gz - 0.5, 0, 1); if (k < 0.01) return;
  const x0 = x - dw * 0.5; if (x0 > W || x0 + dw < 0 || y - dh > H || y < 0) return;
  sh *= 1 - qs.light;
  if (sh > 0.01) {   // 地面影子＋接觸陰影：每種東西先合成一張（sprShadow），一次畫完（以前每棵樹、每叢草都要畫兩次）
    const d = sp.sd || sprShadow(sp);
    ctx.globalAlpha = k * sh; ctx.drawImage(d.c, x + d.x * sc, y + d.y * sc, d.w * sc, d.h * sc);
  }
  const px = dw * DPR;
  ctx.globalAlpha = k;
  if (fq < 0.96) ctx.drawImage(mip(sp.c, px), x0, y - dh, dw, dh);
  if (fq > 0.04) { ctx.globalAlpha = k * fq; ctx.drawImage(mip(sp.h, px), x0, y - dh, dw, dh); }
}
// 遠端淡入：離鏡頭 J 段以外看不到，往內 n 段慢慢出現。用連續的距離（pZ）算，不是用段號：段號每走 1.6 公尺跳一格，淡入也會一格一格跳
// 階梯：第 j 段 f 處的比例（每公尺幾像素）和畫面 x
function stepS(j, f){ return F / (pZ[j] + f * (pZ[j + 1] - pZ[j])); }
function stepX(j, f, s){ return W / 2 + (pC[j] + (pC[j + 1] - pC[j]) * f - camX) * s; }
function farA(j, J, n){ return clamp((J * SEG - pZ[j]) / (n * SEG), 0, 1); }
// 樹影與光斑：右上來的陽光被路邊的樹擋住，路上落下一片一片柔和的樹影（往左下斜）；森林段再有幾個慢慢飄動的光斑
// 位置只跟這段路是第幾段有關（走近時不會重新洗牌）；遠處跟著霧淡掉、70 段外慢慢淡出
function groundLight(i, j, t, fq, a){
  const wl = wallAt(i), al = TH.alpine, A = a * (1 - fq) * farA(j, 70, 10);
  if (A < 0.01) return;
  if (Hh(i, 410) < (al ? 0.08 : 0.14 + 0.3 * wl)) {
    const f0 = Hh(i, 411) * 0.7, f1 = f0 + 0.6 + Hh(i, 412) * 0.8, cx = -0.5 + Hh(i, 413) * 1.3, w = 2.4 + Hh(i, 414) * 1.8;
    proj(j, f1, false); const yF = gy;
    proj(j, f0, false);
    if (gy - yF > 0.5) { ctx.globalAlpha = A * 0.55; ctx.drawImage(CANOPY[(Hh(i, 415) * 3) | 0], gx + (cx - w * 0.5) * gs, yF, w * gs, gy - yF); }
  }
  const da = A * clamp((wl - 0.5) * 3, 0, 1) * (al ? 0 : 1) * farA(j, 40, 8);
  if (da > 0.01) {
    ctx.globalCompositeOperation = 'lighter';
    for (let q = 0; q < 2; q++) {
      if (Hh(i, 420 + q) > 0.4) continue;
      proj(j, Hh(i, 422 + q), false);
      const ph = Hh(i, 426 + q) * TAU, x = gx + ((Hh(i, 424 + q) - 0.5) * 1.8 * RW + Math.sin(t * 0.35 + ph) * 0.14) * gs, r = (0.22 + 0.2 * Hh(i, 428 + q)) * gs, fl = Math.min(1, CAMH / gz);   // 平躺在地上：越遠越扁
      ctx.globalAlpha = da * (0.16 + 0.1 * Math.sin(t * 0.8 + ph)); ctx.drawImage(DAPPLE, x - r, gy - r * fl, r * 2, r * 2 * fl);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.globalAlpha = a;
}
// 土坎細節：上緣一條斷斷續續的墨線（讓切面讀得出來），偶爾露出一顆石頭
function bankDetail(i, j, side, fade, fi){
  const a = fade * clamp(1 - pZ[j] / (52 * SEG), 0, 1), s1 = pS[j];
  if (Hh(i, 51 + side) < 0.8) {
    ctx.globalAlpha = a * 0.6; ctx.strokeStyle = INK; ctx.lineWidth = clamp(s1 * 0.016, 0.5, 1.8);
    ctx.beginPath(); ctx.moveTo(tX1[1], tY1[1]); ctx.lineTo(tX2[1], tY2[1]); ctx.stroke();
  }
  const bh = bankH(i, side);
  const sa = farA(j, 30, 6);   // 土坎上的石頭：30 段以內，最後 6 段淡入
  if (sa > 0 && bh > 0.1 && Hh(i, 55 + side) < 0.3) {
    proj(j, Hh(i, 56 + side), false);
    const r = (0.05 + 0.04 * Hh(i, 57 + side)) * gs, x = gx + side * (RW + BANKW * 0.5) * gs, y = gy - bh * 0.45 * gs;
    ctx.globalAlpha = a * sa; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.7, 0, 0, TAU); ctx.fillStyle = LUT[(24 + (side < 0 ? 2 : 0)) * FOGN + fi]; ctx.fill();
    ctx.lineWidth = clamp(gs * 0.012, 0.5, 1.4); ctx.strokeStyle = INK; ctx.stroke();
  }
  ctx.globalAlpha = fade;
}
// 路面上的石頭：接觸陰影＋石身＋右上受光，近的描墨線（不是平貼在地上的圓點）
function stone(x, y, r, fi){
  ctx.fillStyle = 'rgba(40,28,40,0.3)'; ctx.beginPath(); ctx.ellipse(x - r * 0.2, y + r * 0.1, r * 1.15, r * 0.5, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = LUT[25 * FOGN + fi]; ctx.beginPath(); ctx.ellipse(x, y - r * 0.2, r, r * 0.6, 0, 0, TAU); ctx.fill();
  if (r > 2.5) { ctx.lineWidth = clamp(r * 0.12, 0.5, 1.3); ctx.strokeStyle = INK; ctx.stroke(); }
  ctx.fillStyle = LUT[26 * FOGN + fi]; ctx.beginPath(); ctx.ellipse(x + r * 0.22, y - r * 0.42, r * 0.5, r * 0.25, 0, 0, TAU); ctx.fill();
}
// 木頭／石頭每一塊深淺不一：用固定亂數決定這塊偏亮（暖黃）還是偏暗（深褐），蓋一層淡淡的顏色
// kind：0 階梯橫木、1 階梯踏面、2 棧道木板
function woodTint(id, kind, x1, y1, x2, y2, x3, y3, x4, y4, m){
  const v = Hh(id, 160 + kind) - 0.5, a = Math.abs(v) * WOOD_VAR * (v > 0 ? 0.55 : 1) * (m == null ? 1 : m);   // 變亮的幅度小一點，石階才不會像積雪發白；m：淡入用
  if (a < 0.02) return;
  ctx.fillStyle = v > 0 ? 'rgba(255,226,170,' + a + ')' : 'rgba(60,36,22,' + a + ')'; quad(x1, y1, x2, y2, x3, y3, x4, y4);
}
// 樹根橫過土路：從路邊伸進來一小段，深色根＋上緣受光
function root(i, j, fade){
  proj(j, Hh(i, 81), false);
  const side = Hh(i, 82) < 0.5 ? -1 : 1, L = 0.5 + Hh(i, 83) * 0.7, x0 = gx + side * (RW + 0.1) * gs, x1 = gx + side * (RW - L) * gs, bump = 0.06 * gs;
  ctx.globalAlpha = fade * farA(j, 34, 34); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x0, gy); ctx.quadraticCurveTo((x0 + x1) / 2, gy - bump, x1, gy + bump * 0.3);
  ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.2, 0.07 * gs); ctx.stroke();
  ctx.strokeStyle = '#7a5638'; ctx.lineWidth = Math.max(0.6, 0.045 * gs); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x0, gy - 0.012 * gs); ctx.quadraticCurveTo((x0 + x1) / 2, gy - bump - 0.012 * gs, x1, gy + bump * 0.3 - 0.012 * gs);
  ctx.strokeStyle = 'rgba(232,200,150,0.55)'; ctx.lineWidth = Math.max(0.5, 0.014 * gs); ctx.stroke();
  ctx.globalAlpha = fade;
}
// 連續欄杆：木棧道整條都有、石階步道在階梯段才有，兩邊都架。每段一根柱子，柱頂之間連扶手＋中間一根橫木，跟著坡度往上斜
function railOn(i){ return endK(i) <= 0 && (TH.trail === 'wood' || (TH.trail === 'stairs' && (sAt(i) === 1 || sAt(i + 1) === 1))); }
function drawRail(i, j, fi, fade, fq){
  if (SPR.railPost && SPR.railBar) { railArt(i, j, fade, fq); return; }
  const lit = LUT[28 * FOGN + fi], dk = LUT[31 * FOGN + fi], ink = farA(j, 30, 6), A = fade * farA(j, RAIL_J, 10), AI = A * ink;   // 遠處整道欄杆慢慢淡入，近處才加的墨線也是淡入
  for (let side = -1; side <= 1; side += 2) {
    proj(j + 1, 0, false); const xb = gx + side * RAIL_D * gs, yb = gy - terrH(i + 1, side, RAIL_D) * gs, sb = gs;
    proj(j, 0, false); const xa = gx + side * RAIL_D * gs, ya = gy - terrH(i, side, RAIL_D) * gs, sa = gs;
    if (side < 0 ? Math.max(xa, xb) < -4 : Math.min(xa, xb) > W + 4) continue;
    const ta = Math.max(1, 0.07 * sa), tb = Math.max(0.8, 0.07 * sb);
    for (let q = 0; q < 2; q++) {               // 扶手（亮）＋中間橫木（暗）
      const hk = q ? RAIL_H * 0.5 : RAIL_H, ha = ya - hk * sa, hb = yb - hk * sb;
      ctx.globalAlpha = A; ctx.fillStyle = q ? dk : lit; quad(xa, ha - ta, xb, hb - tb, xb, hb + tb, xa, ha + ta);
      if (AI > 0.01) { ctx.globalAlpha = AI; ctx.strokeStyle = INK; ctx.lineWidth = clamp(sa * 0.012, 0.5, 1.6); ctx.beginPath(); ctx.moveTo(xa, ha + ta); ctx.lineTo(xb, hb + tb); ctx.stroke(); }
    }
    if (!railOn(i + 1)) railPost(xb, yb, sb, lit, dk, A, AI);                 // 欄杆終點
    if (!railOn(i - 1) || (i & 1) === 0) railPost(xa, ya, sa, lit, dk, A, AI); // 每兩段一根；欄杆起點一定有
  }
  ctx.globalAlpha = fade;
}
// 美術圖欄杆：柱子（rail_post）照原本的間距，扶手和中間橫木（rail_bar）從這段起點拉到終點、跟著坡度斜
// 一根橫木從一根柱子拉到下一根柱子（通常跨兩段），整根畫一次
function railArt(i, j, fade, fq){
  const A = fade * farA(j, RAIL_ART_J, 10), P = SPR.railPost[0], B = SPR.railBar[0], half = i & 1;
  const post = !railOn(i - 1) || !half;   // 這段起點有沒有柱子：每兩段一根，欄杆起點一定有
  if (A < 0.01) return;
  for (let side = -1; side <= 1; side += 2) {
    proj(j + 1, 0, false); const x1 = gx + side * RAIL_D * gs, y1 = gy - terrH(i + 1, side, RAIL_D) * gs, s1 = gs;
    proj(j, 0, false); const xa = gx + side * RAIL_D * gs, ya = gy - terrH(i, side, RAIL_D) * gs, sa = gs;
    if (side < 0 ? Math.max(xa, x1) < -4 : Math.min(xa, x1) > W + 4) continue;
    if (post) {   // 從這根柱子拉一整根橫木到下一根柱子（一根圖畫一次，柱子之間是直的）
      const sp = !half && railOn(i + 1) ? 2 : 1;
      proj(j + sp, 0, false); const xb = gx + side * RAIL_D * gs, yb = gy - terrH(i + sp, side, RAIL_D) * gs, sb = gs;
      const th = SCALE.railBar * (sa + sb) * 0.5, len = Math.hypot(xb - xa, yb - ya);
      for (let q = 0; q < 2; q++) {               // 扶手＋中間橫木（中間橫木遠處只剩一條線，30 段以外慢慢淡掉，省效能）
        const hk = q ? RAIL_H * 0.5 : RAIL_H, ha = ya - hk * sa, hb = yb - hk * sb, qa = q ? A * farA(j, 30, 6) : A;
        for (let hz = 0; hz < 2; hz++) {          // 原色＋霧化剪影（遠處融進霧裡）
          if (hz ? fq <= 0.04 : fq >= 0.96) continue;
          const a = hz ? qa * fq : qa; if (a < 0.01) continue;
          const img = mip(hz ? B.h : B.c, len * DPR), sw = img.width, sh = img.height;
          ctx.globalAlpha = a;
          ctx.setTransform(DPR * (xb - xa) / sw, DPR * (hb - ha) / sw, 0, DPR * th / sh, DPR * xa, DPR * (ha - th * 0.5));
          ctx.drawImage(img, 0, 0);
        }
      }
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    const ps = 0.5 * farA(j, 24, 6);   // 柱子的影子只畫近處（遠處柱子細到看不出影子）
    if (!railOn(i + 1)) { proj(j + 1, 0, false); drawSpr(P, x1, y1, s1, fq, ps, A); }   // 欄杆終點
    if (post) { proj(j, 0, false); drawSpr(P, xa, ya, sa, fq, ps, A); }
  }
  ctx.globalAlpha = fade;
}
function railPost(x, y, s, lit, dk, A, AI){
  const pw = Math.max(1, 0.09 * s), top = y - (RAIL_H + 0.06) * s;
  ctx.globalAlpha = A; ctx.fillStyle = dk; ctx.fillRect(x - pw, top, pw * 2, y - top);
  ctx.fillStyle = lit; ctx.fillRect(x - pw * 0.1, top, pw * 1.1, y - top);   // 光從右上：柱子朝右那半邊受光
  if (AI > 0.01) { ctx.globalAlpha = AI; ctx.strokeStyle = INK; ctx.lineWidth = clamp(s * 0.012, 0.5, 1.6); ctx.strokeRect(x - pw, top, pw * 2, y - top); }
}
// 路緣的落葉：堆在路邊內側（被踩過的地方掃到兩邊），讓路面和草地的交界不是一條乾淨的線
function edgeLeaves(i, j, stp){
  for (let q = 0; q < 3; q++) {
    if (Hh(i, 140 + q) > 0.6) continue;
    proj(j, Hh(i, 143 + q), stp);
    const side = Hh(i, 146 + q) < 0.5 ? -1 : 1, x = gx + side * (RW - 0.05 - 0.25 * Hh(i, 149 + q)) * gs, r = Math.max(1, 0.06 * gs), a = Hh(i, 152 + q) * TAU;
    ctx.fillStyle = LEAFC[(Hh(i, 155 + q) * 4) | 0]; ctx.beginPath(); ctx.ellipse(x, gy, r, r * 0.42, a, 0, TAU); ctx.fill();
    if (r > 2.5) { ctx.lineWidth = Math.min(1, r * 0.15); ctx.strokeStyle = INK; ctx.stroke(); }
  }
}
function sparkle(x, y, sc, t, m){
  const p = 0.6 + 0.4 * Math.sin(t * 4 + m), r = Math.max(7, sc * 0.5) * p;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(GLOW, x - r, y - r, r * 2, r * 2);
  ctx.strokeStyle = 'rgba(255,246,200,0.9)'; ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.beginPath(); ctx.moveTo(x - r * 0.9, y); ctx.lineTo(x + r * 0.9, y); ctx.moveTo(x, y - r * 0.9); ctx.lineTo(x, y + r * 0.9); ctx.stroke(); ctx.restore();
}
function drawProp(o, i, j, f, fq, t, fade){
  const sp = o.type === 'sign' ? getSign(o.text) : (SPR[o.type] && SPR[o.type][0]); if (!sp) return;
  proj(j, f, false);
  const x = gx + o.side * PXO[o.type] * gs, y = gy - terrH(i, o.side, PXO[o.type]) * gs, dw = sp.w * gs, dh = sp.hm * gs;
  drawSpr(sp, x, y, gs, fq, 1, fade);
  if (o === benchO && !heroDone) { drawHero(curS, t, x, y - SCALE.benchSeat * 1.12 * gs, gs); heroDone = true; ctx.globalAlpha = fade; }   // 坐在長椅上：畫在長椅前面（椅面在圖高 47%，椅面中間再往後一點）
  ctx.globalAlpha = fade * clamp((dh - 2) / 2.5, 0, 1);
  if (o.type === 'treasure' && ctx.globalAlpha > 0.01) sparkle(x, y - dh * 0.6, gs, t, o.m);
  ctx.globalAlpha = fade;
  if (HIT[o.type] && dh > 14 && x > -dw && x < W + dw && y > 0 && y - dh < H) {
    const h = hits[hitN] || (hits[hitN] = { o:{ type:'', m:0 }, x:0, y:0, w:0, h:0, cx:0, top:0 }); hitN++;
    const hw = Math.max(dw, 44), hh = Math.max(dh, 44);
    h.o.type = o.type; h.o.m = o.m; h.x = x - hw / 2; h.y = y - dh / 2 - hh / 2; h.w = hw; h.h = hh; h.cx = x; h.top = y - dh;
  }
}
// 遠處地面合成兩段畫：暫時把第 j 段的近端換成第 j-1 段的近端（畫完地面馬上換回來）
const LOD_PX = 1.5, LODV = new Float64Array(6); let lodSkip = false;
function lodSave(j){ LODV[0] = pX[j]; LODV[1] = pY[j]; LODV[2] = pS[j]; LODV[3] = pZ[j]; LODV[4] = pC[j]; LODV[5] = pW[j]; pX[j] = pX[j - 1]; pY[j] = pY[j - 1]; pS[j] = pS[j - 1]; pZ[j] = pZ[j - 1]; pC[j] = pC[j - 1]; pW[j] = pW[j - 1]; }
function lodRestore(j){ pX[j] = LODV[0]; pY[j] = LODV[1]; pS[j] = LODV[2]; pZ[j] = LODV[3]; pC[j] = LODV[4]; pW[j] = LODV[5]; }
function drawWorld(b, t){
  const s = curS, isWood = TH.trail === 'wood', nPeb = TH.trail === 'scree' ? 4 : 2, al = TH.alpine, treeBase = TH.bigtree ? 0.55 : 0.42;
  const snowTrees = snowAmt > 0.5 && SPR.coniferS;
  const lightA = (isNight || isRain || isFog || isSnow) ? 0 : clamp((sunVis - 0.3) / 0.5, 0, 1) * (1 - qs.light);   // 樹影、光斑：要有太陽才畫
  let j, k, pi = AP.length - 1;
  hitN = 0; heroDone = false; lodSkip = false;
  for (j = DRAW - 1; j >= 0; j--) {
    // 遠處兩段地面在畫面上加起來不到 LOD_PX 像素高：合成一段畫（在比較遠的那段畫、近的那段跳過），地面的填色少一半，看起來一樣
    const skipG = lodSkip; lodSkip = false;
    const lod = j > 0 && ((b + j) & 1) === 1 && pY[j - 1] - pY[j + 1] < LOD_PX && pY[j - 1] - pY[j + 1] > 0 && sAt(b + j) !== 1 && sAt(b + j - 1) !== 1;
    if (lod) { lodSave(j); lodSkip = true; }
    // 整段地面都在畫面下緣以外：不畫地面，但路旁的樹、草叢照畫（高的樹根部在畫面外、樹冠還看得到），讓它們自己滑出畫面邊緣
    const y2 = pY[j + 1], below = y2 > H + 80;
    if (!heroDone && !benchO && j < jhG) { drawHero(s, t); heroDone = true; }
    const i = b + j, y1 = pY[j], s1 = pS[j], s2 = pS[j + 1], x1 = pX[j], x2 = pX[j + 1], z0 = i * SEG, zj = pZ[j] / SEG;   // zj：這段離鏡頭幾段（連續的，給淡入淡出用）
    const fx = clamp((pZ[j] - fogD0) / (fogD - fogD0), 0, 1), fq = fx * (2 - fx), fi = (fq * (FOGN - 1)) | 0;   // 空氣透視：中景就開始變淡（先快後慢），山坡才會融進遠山
    const fade = farA(j, DRAW - 1, 18);
    if (fade < 0.005) { if (lod) { lodRestore(j); lodSkip = false; } continue; }
    ctx.globalAlpha = fade;
    if (!below && !skipG && y1 - y2 > 0.2) {
      const yb = y1 + 0.7, lvL = lvc(i, -1), lvR = lvc(i, 1), zA = zAt(j);   // 光影斑塊用連續的值（以前每段 0／1／2 三階跳，相鄰兩段亮暗一格一格）；zA：這段近端的世界位置（貼圖接得起來）
      const g1 = gwAt(pZ[j]) * s1, g2 = gwAt(pZ[j + 1]) * s2, gl1 = x1 - g1, gl2 = x2 - g2, gr1 = x1 + g1, gr2 = x2 + g2;
      // 兩側山坡：沿著離路的距離切幾條帶子，每條依地形高度抬升或下降，依坡向（光從右上來）分亮暗
      const ta = fade * (1 - fq) * TEX_A, DS = j < 60 ? TDN : TDF, nS = DS.length, gw1 = gwAt(pZ[j]), gw2 = gwAt(pZ[j + 1]);
      for (let side = -1; side <= 1; side += 2) {
        const lvS = side < 0 ? lvL : lvR;
        for (k = 0; k < nS; k++) {
          const d1 = k === nS - 1 ? gw1 : DS[k], d2 = k === nS - 1 ? gw2 : DS[k];
          tX1[k] = x1 + side * d1 * s1; tY1[k] = yb - terrH(i, side, d1) * s1;
          tX2[k] = x2 + side * d2 * s2; tY2[k] = y2 - terrH(i + 1, side, d2) * s2;
        }
        for (k = 0; k < nS - 1; k++) {           // 坡向：往外升高的那一面朝向哪裡（tSh 連續，地面明暗不分階；tLvS 只給草叢挑顏色）
          const g = (terrH(i, side, k === nS - 2 ? gw1 : DS[k + 1]) - terrH(i, side, DS[k])) / Math.max(0.3, (k === nS - 2 ? gw1 : DS[k + 1]) - DS[k]);
          tSh[k] = clamp(-side * g * 1.8 + lvS * 0.15 + (k === 0 ? -0.5 : 0), -1, 1);
          tLvS[(side + 1) * 4 + k] = clamp(Math.round(1 + lvS * 0.5 - side * g * 2.4), 0, 2);
        }
        // 稜線外緣往下掉的暗坡
        const n1 = nS - 1;
        if (side < 0 ? tX1[n1] > -10 : tX1[n1] < W + 10) { ctx.fillStyle = LUT[19 * FOGN + fi]; quad(tX1[n1], tY1[n1], tX1[n1] + side * 10 * s1, tY1[n1] + 16 * s1, tX2[n1] + side * 10 * s2, tY2[n1] + 16 * s2, tX2[n1], tY2[n1]); }
        // 土坎切面（第 0 格）：土色；左邊那面朝右、迎著右上來的光，右邊那面背光
        ctx.fillStyle = LUT[(21 + (side < 0 ? 2 : 0)) * FOGN + fi]; quad(tX1[0], tY1[0], tX1[1], tY1[1], tX2[1], tY2[1], tX2[0], tY2[0]);
        const bA = TEX.bank ? ta * farA(j, BANK_J, 4) * (1 - snowAmt) * clamp((Math.abs(tX1[0] - tX1[1]) + tY1[0] - tY1[1] - 3) / 3, 0, 1) : 0, bh0 = bankH(i, side);   // 切面在畫面上不到幾像素時慢慢淡掉
        if (bA > 0.03) {   // 土坎切面貼圖；右邊那面背光再壓暗一點
          bankFill(TEX.bank, side, zA, bh0, bA); quad(tX1[0], tY1[0], tX1[1], tY1[1], tX2[1], tY2[1], tX2[0], tY2[0]);
          if (side > 0) { ctx.globalAlpha = bA * 0.35; ctx.fillStyle = '#2c3560'; quad(tX1[0], tY1[0], tX1[1], tY1[1], tX2[1], tY2[1], tX2[0], tY2[0]); }
          ctx.globalAlpha = fade;
        }
        // 草地底色：依坡面明暗連續變（以前每兩段換一次深淺、每格坡面只分三階，一段一段像色塊）
        // 遠端往內縮 1 像素：底色的反鋸齒邊不會蓋到後面那段已經貼好的草地（以前每段交界有一條淡淡的亮線）
        for (k = 1; k < nS - 1; k++) { const e = side * 0.8; ctx.fillStyle = GRS[fi * 21 + Math.round(tSh[k] * 10) + 10]; quad(tX1[k] - e, tY1[k], tX1[k + 1] + e, tY1[k + 1], tX2[k + 1] + e, tY2[k + 1] + 1, tX2[k] - e, tY2[k] + 1); }
        if (TEX.grass && ta > 0.03) {   // 草地貼圖：近處切成薄橫條各自對齊透視，跟前後段接得起來（下雪時淡掉，露出底下積雪的白色坡面）
          gNS = nS; texRun(TEX.grass, 0, x1, y1, s1, x2, y2, s2, zA, ta * GRASS_A * (1 - snowFall * snowAmt * 0.85), grassPath, SUB_GRASS);
          ctx.globalAlpha = fade;
        }
        // 很陡的坡再蓋一層陰影／受光（蓋在貼圖上，從 0.3 開始由 0 慢慢加深，不會突然出現；遠處跟著霧變淡）。緩坡只靠底色，少蓋一層省效能
        ctx.globalAlpha = fade * (1 - fq * 0.8);
        for (k = 1; k < nS - 1; k++) {
          const v = Math.abs(tSh[k]); if (v <= 0.3) continue;
          const q = Math.round((v - 0.3) / 0.7 * 40) * (tSh[k] < 0 ? -1 : 1); if (!q) continue;
          ctx.fillStyle = SHC[q + 40]; quad(tX1[k], tY1[k], tX1[k + 1], tY1[k + 1], tX2[k + 1], tY2[k + 1], tX2[k], tY2[k]);
        }
        ctx.globalAlpha = fade;
        if (isWood && side < 0) {                // 木棧道架在地面上：光從右上來，左邊草地上落一條棧道的影子
          const u = (WOOD_SH - BANKW) / (DS[2] - DS[1]);
          ctx.fillStyle = 'rgba(34,40,70,0.3)'; quad(tX1[0], tY1[0], lerp(tX1[1], tX1[2], u), lerp(tY1[1], tY1[2], u), lerp(tX2[1], tX2[2], u), lerp(tY2[1], tY2[2], u), tX2[0], tY2[0]);
        }
        if (farA(j, 52, 52) > 0) bankDetail(i, j, side, fade, fi);
        // 陡坡上的手繪等高線（斷斷續續、只畫在很陡的地方）
        if (i % 4 === 0 && farA(j, 44, 44) > 0) {
          ctx.strokeStyle = INK; ctx.lineWidth = clamp(s1 * 0.011, 0.4, 1.2); ctx.globalAlpha = fade * 0.16 * farA(j, 44, 44); ctx.beginPath();
          for (k = 1; k < nS - 1; k++) if (Math.abs(tY1[k + 1] - tY1[k]) > 0.35 * s1 && Hh(i, 70 + k) < 0.6) { const mx = (tX1[k] + tX1[k + 1]) / 2, my = (tY1[k] + tY1[k + 1]) / 2; ctx.moveTo(lerp(tX1[k], mx, 0.25), lerp(tY1[k], my, 0.25)); ctx.lineTo(lerp(tX1[k + 1], mx, 0.2), lerp(tY1[k + 1], my, 0.2)); }
          ctx.stroke(); ctx.globalAlpha = fade;
        }
      }
      const RT = snowAmt > 0.5 && TEX.snow ? TEX.snow : TEX.road;
      // 步道
      const w1 = RW * s1, w2 = RW * s2, e1 = w1 * 1.07 + 0.6, e2 = w2 * 1.07 + 0.6, stp = sAt(i) === 1;   // 路面底色整條同一色（以前一段深一段淺，像一格一格的磁磚）
      if (stp) {
        // 一段路切成好幾階（每階最高 STEP_H），由遠到近畫：上一階的立面 → 這一階的踏面
        // 遠處每階立面只剩幾像素時合併成一階（省效能、不糊成百葉窗）。合併不是一下子跳：中間幾階的高度跟著距離慢慢壓扁（tm 1→0），
        // 壓到 0 時跟「整段一階」長得一模一樣，才換成只畫一階
        const rise = pW[j + 1] - pW[j], nMax = clamp(Math.ceil(rise / STEP_H), 1, 4), tm = nMax > 1 ? clamp((rise * s2 / nMax - 3) / 2, 0, 1) : 0, n = tm > 0 ? nMax : 1;   // tm：一階立面 3 像素以下開始壓扁、5 像素以上完整
        const ST = snowAmt > 0.5 || TH.trail === 'scree' || TH.trail === 'stairs' || (TEX.riser && RT) ? RT : (TEX.steps || RT);   // 踏面：石階、碎石用路面貼圖；土路的立面已經是橫木貼圖，踏面就用同一條土路（ground_steps 那張本身畫了好幾根橫木，貼在踏面上會變成階梯裡又有階梯）；木棧道沒有路面貼圖才用木頭階梯
        const RS = snowAmt > 0.5 ? null : TEX.riser, ra = RS ? ta * farA(j, RISER_J, 8) : 0;   // 立面貼圖：積雪時不用；RISER_J 段以外立面只剩幾像素，不貼（最後 8 段淡出，省效能）
        // （這一段 f 處的畫面 x 和比例：stepS 直接算，不每階產生新的陣列）
        const sd = farA(j, 70, 10);   // 遠處只剩幾像素的階梯：每塊深淺、陰影這些細節慢慢淡掉、最後不畫（省效能），階梯本身照畫
        for (let q = n - 1; q >= 0; q--) {
          const fa = q / n, fb = (q + 1) / n, h0 = pW[j] + rise * fa * tm, h1 = q === n - 1 ? pW[j] + rise : pW[j] + rise * fb * tm, mid = q < n - 1 ? tm : 1;   // mid：中間那幾階的細節（墨線、壓暗）跟著高度一起淡出
          const sa = stepS(j, fa), xa = stepX(j, fa, sa), sb = stepS(j, fb), xb = stepX(j, fb, sb);
          const ya = (q === 0 ? yb : HOR - (h0 - camY) * sa), yt = HOR - (h0 - camY) * sb, yr = HOR - (h1 - camY) * sb;
          const wa = RW * sa, wb = RW * sb;
          // 立面（往上的那一階的正面）：比踏面暗，上緣一條受光的邊
          ctx.fillStyle = LUT[16 * FOGN + fi]; quad(xb - wb * 1.04, yr, xb + wb * 1.04, yr, xb + wb * 1.04, yt + 0.7, xb - wb * 1.04, yt + 0.7);
          const rA = ra * mid * clamp((yt - yr - 1.5) / 2, 0, 1);   // 立面矮到兩三像素時慢慢淡掉
          if (rA > 0.03) { riserFill(RS, xb - wb * 1.04, yr, sb, i * 8 + (q + 1) % n, rA); quad(xb - wb * 1.04, yr, xb + wb * 1.04, yr, xb + wb * 1.04, yt + 0.7, xb - wb * 1.04, yt + 0.7); ctx.globalAlpha = fade; }   // 立面貼圖（石塊或橫木），下面照舊壓暗、加唇下陰影
          if (sd > 0) {
            ctx.globalAlpha = fade * sd; ctx.fillStyle = 'rgba(30,22,30,0.22)'; quad(xb - wb * 1.04, yt - (yt - yr) * 0.35, xb + wb * 1.04, yt - (yt - yr) * 0.35, xb + wb * 1.04, yt + 0.7, xb - wb * 1.04, yt + 0.7);
            ctx.globalAlpha = fade; woodTint(i * 8 + (q + 1) % n, 0, xb - wb * 1.04, yr, xb + wb * 1.04, yr, xb + wb * 1.04, yt, xb - wb * 1.04, yt, sd);
            // 上一階踏面的前緣（唇）下面一條深色陰影：光從上面來，唇擋住立面最上面那一截
            ctx.globalAlpha = fade * sd * mid; ctx.fillStyle = 'rgba(24,16,20,0.5)'; ctx.fillRect(xb - wb * 1.04, yr, wb * 2.08, Math.max(0.8, (yt - yr) * 0.24));
          }   // 每根橫木深淺不一（最上面那根不管分幾階都是同一個顏色）
          ctx.globalAlpha = fade * RISER_DK; ctx.fillStyle = '#2a1e22'; quad(xb - wb * 1.04, yr, xb + wb * 1.04, yr, xb + wb * 1.04, yt + 0.7, xb - wb * 1.04, yt + 0.7);   // 立面整面比踏面暗（面對鏡頭、背著光）
          ctx.globalAlpha = fade;
          // 踏面
          ctx.fillStyle = LUT[13 * FOGN + fi]; quad(xa - wa * 1.07 - 0.6, ya, xa + wa * 1.07 + 0.6, ya, xb + wb * 1.07 + 0.6, yt, xb - wb * 1.07 - 0.6, yt);
          ctx.fillStyle = LUT[7 * FOGN + fi]; quad(xa - wa, ya, xa + wa, ya, xb + wb, yt, xb - wb, yt);
          const TT = TEX.moss && ST === TEX.road && Hh(i * 8 + q, 190) < 0.45 ? TEX.moss : ST;   // 森林石階：有的階踏面換成苔蘚石塊
          if (TT && ta > 0.03) { texRun(TT, RW, xa, q === 0 ? y1 : ya, sa, xb, yt, sb, zA + (F / sa - F / s1), ta, roadPath(xa, q === 0 ? y1 : ya, sa, xb, yt, sb)); ctx.globalAlpha = fade; }   // 踏面貼圖（跟路面一樣連續對齊）
          if (sd > 0) {
            if (q) woodTint(i * 8, 1, xa - wa, ya, xa + wa, ya, xb + wb, yt, xb - wb, yt, (1 - tm) * sd);   // 每階踏面深淺不一：剛分出來的那幾階先跟第一階同色，再慢慢換成自己的顏色
            woodTint(i * 8 + q, 1, xa - wa, ya, xa + wa, ya, xb + wb, yt, xb - wb, yt, (q ? tm : 1) * sd);
            // 橫木下緣埋進土裡：踏面靠橫木那一條壓暗，橫木才像嵌在地上而不是浮在上面
            const ye = yt + (ya - yt) * 0.2;
            ctx.globalAlpha = fade * mid * sd; ctx.fillStyle = 'rgba(34,24,16,0.34)'; quad(xb - wb, yt, xb + wb, yt, lerp(xb, xa, 0.2) + lerp(wb, wa, 0.2), ye, lerp(xb, xa, 0.2) - lerp(wb, wa, 0.2), ye);
          }
          if (RSH) { texAff(RSH, RW, xa, ya, sa, xb, yt, sb, 0, 1, fade); quad(xa - wa, ya, xa + wa, ya, xb + wb, yt, xb - wb, yt); }   // 踏面橫向明暗（右邊土坎的影子），跟路面同一條柔和漸層
          const a = farA(j, 52, 52);
          if (a > 0) {
            ctx.globalAlpha = fade * a * 0.5 * (q ? tm : 1); ctx.fillStyle = '#fff3d6'; ctx.fillRect(xa - wa, ya - Math.max(0.8, sa * 0.025), wa * 2, Math.max(0.8, sa * 0.025));   // 踏面前緣受光
            ctx.globalAlpha = fade * a * mid; ctx.strokeStyle = INK; ctx.lineWidth = clamp(sb * 0.02, 0.5, 2.2);
            ctx.beginPath(); ctx.moveTo(xb - wb * 1.04, yr); ctx.lineTo(xb + wb * 1.04, yr); ctx.moveTo(xb - wb * 1.04, yt); ctx.lineTo(xb + wb * 1.04, yt); ctx.stroke(); ctx.globalAlpha = fade;
          }
        }
      } else {
        ctx.fillStyle = LUT[13 * FOGN + fi]; quad(x1 - e1, yb, x1 + e1, yb, x2 + e2, y2 + 1, x2 - e2, y2 + 1);   // 遠端同樣往內縮 1 像素（不蓋到後面那段的路面貼圖）
        ctx.fillStyle = LUT[7 * FOGN + fi]; quad(x1 - w1, yb, x1 + w1, yb, x2 + w2, y2 + 1, x2 - w2, y2 + 1);
        if (RT && ta > 0.03) { texRun(RT, RW, x1, y1, s1, x2, y2, s2, zA, ta, roadPath(x1, y1, s1, x2, y2, s2)); ctx.globalAlpha = fade; }
        const wA = isWood ? farA(j, 60, 10) : 0;
        if (wA > 0) for (k = 0; k < PLANKS; k++) {   // 木棧道：每片木板深淺不一，近處再加幾條木紋（遠處淡入）
          proj(j, k / PLANKS, false); const xa = gx, ya = k ? gy : yb, wa = RW * gs;
          proj(j, (k + 1) / PLANKS, false);
          woodTint(i * PLANKS + k, 2, xa - wa, ya, xa + wa, ya, gx + RW * gs, gy, gx - RW * gs, gy, wA);
          const ga = farA(j, 14, 4);
          if (ga > 0) {
            ctx.globalAlpha = fade * ga; ctx.strokeStyle = 'rgba(70,44,28,0.16)'; ctx.lineWidth = 1; ctx.beginPath();
            for (let q = 0; q < 3; q++) { const u = Hh(i * PLANKS + k, 170 + q) * 1.3 - 0.9, v = 0.25 + 0.5 * Hh(i * PLANKS + k, 173 + q), y = lerp(ya, gy, v), x = lerp(xa, gx, v) + u * lerp(wa, RW * gs, v), L = (0.25 + 0.3 * Hh(i, 176 + q)) * gs; ctx.moveTo(x, y); ctx.lineTo(x + L, y); }
            ctx.stroke(); ctx.globalAlpha = fade;
          }
        }
        const sha = farA(j, 40, 8);   // 路面橫向明暗：40 段以外路窄到看不出來，慢慢淡掉（省效能）
        if (sha > 0 && RSH) {
          // 路面立體感：右邊土坎擋住右上來的光投下影子，左邊貼著土坎暗一點，中間微微受光。用一條橫向漸層（邊緣柔和），以前三塊硬邊色塊會在路上畫出直條紋
          texAff(RSH, RW, x1, y1, s1, x2, y2, s2, zA, zA + SEG, fade * sha); quad(x1 - w1, yb, x1 + w1, yb, x2 + w2, y2, x2 - w2, y2);
          ctx.globalAlpha = fade;
        }
        const ia = farA(j, 48, 48);
        if (ia > 0 && Hh(i, 50) < 0.62) {             // 斷斷續續的手繪墨線路緣
          ctx.globalAlpha = fade * 0.55 * ia; ctx.strokeStyle = INK; ctx.lineWidth = clamp(s1 * 0.02, 0.5, 2);
          ctx.beginPath(); ctx.moveTo(x1 - w1, y1); ctx.lineTo(x2 - w2, y2); ctx.moveTo(x1 + w1, y1); ctx.lineTo(x2 + w2, y2); ctx.stroke(); ctx.globalAlpha = fade;
        }
      }
      const ek = endK(i);
      if (ek > 0) {   // 山頂過後：路慢慢長滿草，融進山頂的草地（蓋一層跟兩旁一樣的草地底色和貼圖），不會一路通到天邊
        ctx.globalAlpha = fade * ek; ctx.fillStyle = GRS[fi * 21 + 10]; quad(x1 - e1, yb, x1 + e1, yb, x2 + e2, y2 + 1, x2 - e2, y2 + 1);
        if (TEX.grass && ta > 0.03) texRun(TEX.grass, 0, x1, y1, s1, x2, y2, s2, zA, ta * ek * GRASS_A * (1 - snowFall * snowAmt * 0.85), roadPath(x1, y1, s1, x2, y2, s2), SUB_GRASS);
        ctx.globalAlpha = fade;
      }
      const dA = fade * farA(j, 34, 8) * (1 - ek);   // 路面小細節（石子、落葉、水窪、木板縫）：遠處慢慢淡入；山頂過後跟著路一起淡掉
      if (dA > 0.01) {
        ctx.globalAlpha = dA;
        if (isWood && !(stp && TEX.steps)) {          // 木棧道的木板縫（陡的那段換成木頭階梯貼圖時不畫）：上緣一條暗縫、下緣一條受光的板邊
          const lw = clamp(s1 * 0.02, 0.6, 2.2);
          ctx.strokeStyle = 'rgba(52,34,24,0.55)'; ctx.lineWidth = lw; ctx.beginPath();
          for (k = 1; k <= PLANKS; k++) { proj(j, k / PLANKS, stp); ctx.moveTo(gx - RW * gs, gy); ctx.lineTo(gx + RW * gs, gy); }
          ctx.stroke();
          ctx.strokeStyle = 'rgba(255,236,196,0.35)'; ctx.lineWidth = lw * 0.6; ctx.beginPath();
          for (k = 1; k <= PLANKS; k++) { proj(j, k / PLANKS, stp); ctx.moveTo(gx - RW * gs, gy + lw); ctx.lineTo(gx + RW * gs, gy + lw); }
          ctx.stroke();
        } else for (k = 0; k < nPeb; k++) {            // 小石子
          if (Hh(i, 60 + k * 4) > 0.7) continue;
          proj(j, Hh(i, 61 + k * 4), stp);
          const pr = (0.035 + 0.05 * Hh(i, 62 + k * 4)) * gs;
          stone(gx + (Hh(i, 63 + k * 4) - 0.5) * 1.7 * RW * gs, gy, pr, fi);
        }
        if (TH.trail === 'dirt' && !stp && Hh(i, 80) < 0.14) { root(i, j, fade); ctx.globalAlpha = dA; }
        if (snowAmt < 0.5) edgeLeaves(i, j, stp);
        if (isRain && Hh(i, 40) < 0.3) {               // 雨天水窪反光
          proj(j, 0.5, stp); const pr = 0.42 * gs;
          ctx.fillStyle = 'rgba(225,238,255,0.3)'; ctx.beginPath(); ctx.ellipse(gx + (Hh(i, 41) - 0.5) * RW * gs, gy, pr, pr * 0.5 * Math.min(1, CAMH / pZ[j]), 0, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = fade;
      }
      if (farA(j, turfJ(), 8) > 0 && TURF.length && snowAmt < 0.9) drawTurf(i, j, y1, y2, s1, fq, fade, DS, Math.min(gw1, RW + lerp(30, 7, wallAt(i)))); if (lightA > 0.01) groundLight(i, j, t, fq, fade * lightA);   // 森林步道外側被植物牆擋住，草叢只蓋到路邊幾公尺（省效能）   // 畫在路面之後：路邊第一排草會垂到土坎上
    }
    if (lod) lodRestore(j);   // 植物、道具照原本這一段的位置畫
    // 路旁植物：每段 4 個固定亂數位置（由遠到近）；森林步道的樹離路比較近、比較密，兩邊像一道樹牆
    const wl = wallAt(i), treeP = al ? lerp(0.5, 0.06, clamp(z0 / total, 0, 1)) : lerp(treeBase, 0.8, wl), spread = 26 * (1 - 0.6 * wl);
    for (k = 0; k < 4; k++) {
      const pa = (k === 3 ? farA(j, 60, 8) : 1) * (k === 1 || k === 2 ? 1 - qs.plant * (1 - farA(j, QUAL.plantJ, 12)) : 1);   // 第 4 個位置的矮灌木只畫到 60 段，最後 8 段慢慢淡入
      if (pa <= 0) continue;
      if (Hh(i, k * 8 + 1) > (k === 3 ? 0.75 : 0.62)) continue;
      const side = Hh(i, k * 8 + 2) < 0.5 ? -1 : 1, u = Hh(i, k * 8 + 3), f = (3 - k + Hh(i, k * 8 + 4)) / 4;
      if (cleared(i, side)) continue;
      let xo, arr;
      if (k === 3) { xo = RW + 0.3 + u * 2.2; arr = pick(smallTab, Hh(i, k * 8 + 6)); }
      else { xo = RW + 0.5 + u * u * spread; arr = (xo > RW + 2.8 - wl && Hh(i, k * 8 + 5) < treeP) ? pick(treeTab, Hh(i, k * 8 + 6)) : pick(smallTab, Hh(i, k * 8 + 6)); }
      const ea = clamp((gwAt(pZ[j]) - 0.6 - xo) / 1.5, 0, 1);   // 稜線越遠越窄：快超出稜線邊的植物跟著稜線寬度慢慢淡入，不是寬度一到就冒出來
      if (ea <= 0) continue;
      if (snowTrees && arr === SPR.conifer) arr = SPR.coniferS;
      const sp = arr[(Hh(i, k * 8 + 7) * arr.length) | 0];
      if (!heroDone && !benchO && j === jhG && f <= fhG) { drawHero(s, t); heroDone = true; ctx.globalAlpha = fade; }
      proj(j, f, false);
      drawSpr(sp, gx + side * xo * gs, gy - terrH(i, side, xo) * gs, gs * (0.8 + 0.45 * Hh(i, k * 8 + 8)), fq, farA(j, 64, 8), fade * pa * ea);   // 種在真正的地面高度；影子 64 段以外不畫（慢慢淡掉）
    }
    // 植物牆：貼著路邊 0.3～4 公尺擠滿蕨類、灌木、箭竹（越包越密），森林步道再夾幾棵貼著路的樹幹，像走在綠色隧道裡
    const hA = fade * farA(j, HEDGE_J, 8);   // 植物牆畫到 HEDGE_J 段，最後 8 段慢慢淡入；靠近鏡頭的不再特別砍掉，讓它自己滑出畫面
    if (hA > 0.005) for (k = HEDGE_N - 1; k >= 0; k--) {
      const h0 = 200 + k * 9;
      if (Hh(i, h0) > wl * HEDGE_P) continue;
      const side = Hh(i, h0 + 1) < 0.5 ? -1 : 1, u = Hh(i, h0 + 2), f = (k + Hh(i, h0 + 3)) / HEDGE_N;
      if (cleared(i, side)) continue;
      const tree = !al && u > 0.5 && Hh(i, h0 + 4) < 0.45 * wl;   // 是樹還是灌木只看這個位置本身，不看它離登山客幾段（以前走近時樹會突然換成蕨類）
      const xo = tree ? RW + 1.1 + u * 2.6 : RW + 0.35 + u * u * 3.6, arr = tree ? pick(treeTab, Hh(i, h0 + 5)) : pick(hedgeTab, Hh(i, h0 + 5));
      const sp = arr[(Hh(i, h0 + 6) * arr.length) | 0], sc = tree ? 0.85 + 0.4 * Hh(i, h0 + 7) : (al ? 0.85 : 1.05) + 0.6 * Hh(i, h0 + 7);
      const front = j < jhG || (j === jhG && f <= fhG);
      if (!heroDone && !benchO && front) { drawHero(s, t); heroDone = true; ctx.globalAlpha = fade; }
      proj(j, f, false);
      // 伸進路面的植物走到登山客旁邊時慢慢變透明（從他身後 1 公尺到身前 0.2 公尺），才不會擋到人；以前是一走到他前面就整株消失
      const intr = clamp((RW + 0.3 - (xo - sp.w * sc * 0.5)) / 0.4, 0, 1), fa = 1 - intr * (1 - clamp((gz - HZ + 0.2) / 1.2, 0, 1));
      drawSpr(sp, gx + side * xo * gs, gy - terrH(i, side, xo) * gs, gs * sc, fq, farA(j, 50, 8), hA * fa);
    }
    // 森林步道貼近鏡頭的高樹幹：樹冠在畫面外，只有樹幹頂端超出畫面上緣時才看得到（依頂端離畫面上緣多遠慢慢淡入，不會突然冒出來）
    if (SPR.trunk && hA > 0.005 && Hh(i, 230) < TRUNK_P * wl && !cleared(i, Hh(i, 231) < 0.5 ? -1 : 1)) {
      const sp = SPR.trunk[0], side = Hh(i, 231) < 0.5 ? -1 : 1, xo = RW + 1.5 + Hh(i, 232) * 2.4, f = Hh(i, 233);
      if (!heroDone && !benchO && (j < jhG || (j === jhG && f <= fhG))) { drawHero(s, t); heroDone = true; ctx.globalAlpha = fade; }
      proj(j, f, false);
      const sc = gs * (0.9 + 0.25 * Hh(i, 234)), y = gy - terrH(i, side, xo) * gs, ta = clamp((sp.hm * sc - y) / (90 * U), 0, 1);
      if (ta > 0.01) drawSpr(sp, gx + side * xo * gs, y, sc, fq, farA(j, 50, 8), hA * ta);
    }
    if (!below && farA(j, RAIL_J, 10) > 0 && railOn(i)) drawRail(i, j, fi, fade, fq);
    // 路緣的草叢／蕨類：故意往路面內側蓋過路緣 15～25% 的寬度，路邊才不會是一條筆直的線
    const eA = cleared(i, 0) && z0 > total ? 0 : fade * farA(j, EDGE_J, 8);   // 路緣草叢：最遠 8 段慢慢淡入；山頂再過去沒有
    if (eA > 0.005) for (let side = -1; side <= 1; side += 2) {
      const h0 = side < 0 ? 120 : 130;
      if (Hh(i, h0) > EDGE_P) continue;
      const arr = pick(edgeTab, Hh(i, h0 + 1)), sp = arr[(Hh(i, h0 + 2) * arr.length) | 0], m = 0.75 + 0.35 * Hh(i, h0 + 3), f = Hh(i, h0 + 4);
      const xo = RW + sp.w * m * (0.5 - (0.15 + 0.1 * Hh(i, h0 + 5)));
      if (!heroDone && !benchO && j === jhG && f <= fhG) { drawHero(s, t); heroDone = true; ctx.globalAlpha = fade; }
      proj(j, f, false);
      drawSpr(sp, gx + side * xo * gs, gy - terrH(i, side, Math.max(xo, RW + BANKW)) * gs, gs * m, fq, 1, eA);
    }
    // 偶爾一叢芒草或蕨類長在路緣、往路面斜：從遠處慢慢靠近，走過時比背景快很多地從畫面邊緣滑出去（離鏡頭很近，大半被畫面切掉）
    const pA = fade * farA(j, 30, 6);
    if (pA > 0.005 && !railOn(i) && z0 < total && Hh(i, 300) < PASS_P) {
      const side = Hh(i, 301) < 0.5 ? -1 : 1, arr = (TH.alpine || TH.grass || Hh(i, 302) < 0.5) ? SPR.silver : SPR.fern, sp = arr[(Hh(i, 303) * arr.length) | 0];
      const sc = 1.1 + 0.35 * Hh(i, 304), xo = PASS_IN + sp.w * sc * 0.5, f = Hh(i, 305);
      if (!heroDone && !benchO && j === jhG && f <= fhG) { drawHero(s, t); heroDone = true; ctx.globalAlpha = fade; }
      proj(j, f, false);
      drawSpr(sp, gx + side * xo * gs, gy - terrH(i, side, Math.max(xo, RW + BANKW)) * gs, gs * sc, fq, 0.6, pA);
    }
    // 互動道具與路標
    while (pi >= 0 && AP[pi].m >= z0) { const o = AP[pi--]; if (o.m < z0 + SEG) drawProp(o, i, j, (o.m - z0) / SEG, fq, t, fade); }
    // 一起爬的隊友（在自己這一段畫）
    for (k = 0; k < mates.length; k++) { const mt = mates[k]; if (mt.d >= z0 && mt.d < z0 + SEG) drawMate(mt, j, (mt.d - z0) / SEG, t, fade); }
  }
  if (!heroDone) { drawHero(s, t); heroDone = true; }
  ctx.globalAlpha = 1;
}

// ═════════ 氣氛：飛葉／花瓣／光點、神光、雨、霧、粒子 ═════════
function respawn(f, far){ f.z = far ? 22 + Math.random() * 18 : 2 + Math.random() * 38; f.x = (Math.random() - 0.5) * 18; f.y = 0.2 + Math.random() * 4.2; }
function initFlyers(){
  flyers.length = 0;
  const nLeaf = TH.sakura ? 6 : 12, nPet = TH.sakura ? 16 : 0;
  for (let i = 0; i < nLeaf + nPet + 12; i++) {
    const k = i < nLeaf ? 0 : i < nLeaf + nPet ? 1 : 2, f = { x:0, y:0, z:0, k:k, ph:Math.random() * TAU, c:k === 1 ? (i % 2 ? '#f9c4d4' : '#fde4ec') : LEAFC[i % 4] };
    respawn(f, false); flyers.push(f);
  }
}
function drawFlyers(t, dt, sp){
  const snow = snowAmt > 0.6;
  for (let i = 0; i < flyers.length; i++) {
    const f = flyers[i], mote = f.k === 2;
    f.z -= (sp + (mote ? 0.3 : 2.2)) * dt; f.x -= (mote ? 0.1 : 0.9) * dt; f.y += (Math.sin(t * 1.3 + f.ph) * 0.3 - (mote ? -0.04 : 0.12)) * dt;
    const sc = F / Math.max(f.z, 0.5), sx = W / 2 + f.x * sc, sy = HOR + (CAMH - f.y) * sc;
    if (f.z < 1.3 || sy > H + 20 || sx < -30 || f.y > 6) { respawn(f, true); continue; }
    if (mote) continue;
    const rx = Math.max(1.2, 0.07 * sc);
    ctx.fillStyle = snow ? '#ffffff' : f.c; ctx.beginPath();
    ctx.ellipse(sx, sy, rx, rx * (0.2 + 0.6 * Math.abs(Math.sin(t * 3 + f.ph))), t * 2 + f.ph, 0, TAU); ctx.fill();
    if (rx > 3) { ctx.strokeStyle = INK; ctx.lineWidth = 0.8; ctx.stroke(); }
  }
}
function drawLights(t){
  ctx.globalCompositeOperation = 'lighter';
  if (!isNight && sunVis > 0 && raysA > 0.01) { const sx = cSun[0] * W, sy = cSun[1] * H, R = 170 * U; ctx.globalAlpha = clamp(0.2 * sunVis * (0.6 + raysA * 0.5), 0, 1); ctx.drawImage(GLOW, sx - R, sy - R, R * 2, R * 2); }   // 太陽光暈
  if (raysA > 0.01 && RAYS) {                 // 右上方斜射的神光，輕輕搖曳
    ctx.save(); ctx.globalAlpha = clamp(raysA * (0.8 + 0.2 * Math.sin(t * 0.6)), 0, 1); ctx.translate(W, 0); ctx.rotate(Math.sin(t * 0.23) * 0.03); ctx.drawImage(RAYS, -W, 0, W, H); ctx.restore();
  }
  if (!isRain && !isSnow) for (let i = 0; i < flyers.length; i++) {      // 金色光點
    const f = flyers[i]; if (f.k !== 2) continue;
    const sc = F / Math.max(f.z, 0.5), r = Math.max(2.5, 0.1 * sc);
    ctx.globalAlpha = (0.45 + 0.45 * Math.sin(t * 2 + f.ph)) * (isNight ? 1 : 0.75);
    ctx.drawImage(GLOW, W / 2 + f.x * sc - r, HOR + (CAMH - f.y) * sc - r, r * 2, r * 2);
  }
  if (isNight && curS && !curS.sleep) {       // 頭燈光束
    const r = W * 0.36;
    ctx.save(); ctx.translate(hero.sx, hero.sy - H * 0.15); ctx.scale(1, 0.6); ctx.globalAlpha = 0.42; ctx.drawImage(GLOW, -r, -r, r * 2, r * 2); ctx.restore();
    ctx.globalAlpha = 0.9; ctx.drawImage(GLOW, hero.sx - 9 * U, hero.top + 6 * U, 18 * U, 18 * U);
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
function drawRain(t){
  const ww = W + 120, hh = H + 60;
  ctx.strokeStyle = 'rgba(220,234,255,0.42)'; ctx.lineWidth = 1.2; ctx.beginPath();
  for (let i = 0; i < 80; i++) {
    const x = (((i * 97.3 - t * 190) % ww) + ww) % ww - 40, y = ((i * 53.7 + t * (820 + (i * 37 % 7) * 60)) % hh) - 30, L = 14 + (i % 5) * 3;
    ctx.moveTo(x, y); ctx.lineTo(x - L * 0.22, y + L);
  }
  ctx.stroke();
}
// 下雪：三層遠近不同的雪花，大的在近處、落得快，左右輕輕飄；a 是雪下得多密（0～1，跟著 snowFall 淡入淡出）
function drawSnow(t, a){
  const ww = W + 40, hh = H + 40, n = Math.round(120 * a);
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < n; i++) {
    const L = i % 3, r = (1.6 + L * 1.6) * U, v = 34 + L * 30 + (i * 13 % 7) * 4;
    const x = (((i * 71.3 + Math.sin(t * (0.6 + L * 0.2) + i) * 18 * U - t * (8 + L * 6)) % ww) + ww) % ww - 20, y = ((i * 47.9 + t * v) % hh) - 20;
    ctx.globalAlpha = (0.55 + L * 0.2) * Math.min(1, a * 1.5); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
function fogBands(t, dist){
  ctx.fillStyle = 'rgba(232,238,238,0.2)'; ctx.fillRect(0, 0, W, H);
  const T = tileSets[palA]; if (!T) return;
  for (let k = 0; k < 3; k++) tile(T.c[0], t * (6 + k * 4) + k * 211 + headAt(dist) * F, HOR - 70 * U + k * 95 * U, 200 * U, 0.3);
}
for (let i = 0; i < 90; i++) parts.push({ on:0, x:0, y:0, vx:0, vy:0, life:0, max:1, kind:0, rot:0, vr:0, sz:4, col:'' });
const PK = { dust:0, leaf:1, star:2, heart:3 };
S.burst = function(x, y, kind, n){
  const kd = PK[kind]; if (kd == null) return;
  n = n || 6;
  for (let q = 0; q < n; q++) {
    const p = parts[pIdx], a = Math.random() * TAU, v = Math.random(); pIdx = (pIdx + 1) % parts.length;
    p.on = 1; p.kind = kd; p.x = x + (Math.random() - 0.5) * 8; p.y = y + (Math.random() - 0.5) * 6; p.rot = a; p.vr = (Math.random() - 0.5) * 8;
    if (kd === 0) { p.vx = Math.cos(a) * 14; p.vy = -8 - v * 16; p.max = 0.55; p.sz = 3 + v * 4; }
    else if (kd === 1) { p.vx = Math.cos(a) * 60; p.vy = -40 - v * 70; p.max = 1.1; p.sz = 4 + v * 3; p.col = LEAFC[(v * 4) | 0]; }
    else if (kd === 2) { p.vx = Math.cos(a) * (30 + v * 60); p.vy = Math.sin(a) * (30 + v * 60) - 20; p.max = 0.7; p.sz = 4 + v * 5; }
    else { p.vx = Math.cos(a) * 18; p.vy = -40 - v * 30; p.max = 1; p.sz = 7 + v * 5; }
    p.life = p.max;
  }
};
function drawParts(dt){
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]; if (!p.on) continue;
    p.life -= dt; if (p.life <= 0) { p.on = 0; continue; }
    const k = p.life / p.max; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    if (p.kind === 0) { ctx.globalAlpha = k * 0.5; dot(ctx, p.x, p.y, p.sz * (1.8 - k), '#e2cda6'); }
    else if (p.kind === 1) {
      p.vy += 160 * dt; ctx.globalAlpha = Math.min(1, k * 2); ctx.fillStyle = p.col;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.sz, p.sz * 0.45, p.rot, 0, TAU); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 0.8; ctx.stroke();
    } else if (p.kind === 2) {
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k; ctx.fillStyle = '#fff2b0'; ctx.beginPath();
      for (let q = 0; q < 8; q++) { const r = (q % 2 ? 0.35 : 1) * p.sz * (0.5 + k * 0.5), an = p.rot + q * Math.PI / 4; ctx.lineTo(p.x + Math.cos(an) * r, p.y + Math.sin(an) * r); }
      ctx.closePath(); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
    } else {
      const z = p.sz / 10 * (1.3 - k * 0.3);
      ctx.globalAlpha = Math.min(1, k * 2); ctx.save(); ctx.translate(p.x, p.y); ctx.scale(z, z);
      ctx.beginPath(); ctx.moveTo(0, 3); ctx.bezierCurveTo(-10, -4, -5, -11, 0, -5); ctx.bezierCurveTo(5, -11, 10, -4, 0, 3); ctx.closePath();
      ctx.fillStyle = '#f58aa5'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
}

// ═════════ 主繪製 ═════════
S.render = function(s){
  if (!ctx || !M || !s) return;
  if (!RAYS) S.resize();
  const t = s.t || 0, dt = clamp(s.dt || 0.016, 0, 0.05), dist = Math.max(0, s.dist || 0), sp = s.speed || 0, wx = s.wx || DEFWX;
  const frac = s.frac != null ? s.frac : dist / total;
  curS = s; curT = t;
  if (s.dt > 0) qualTick(s.fps, dt); else qs.last = 0;   // 拍照時重畫那一格（dt = 0）不算，下一格也不拿來比
  updPalette(wx, frac, dt); updHero(s, t, dt, dist, sp); stepMates(dt);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.lineJoin = ctx.lineCap = 'round';
  // 鏡頭：在登山客後上方，x 對準登山客所在深度的路中心
  const camZ = dist - HZ, b = Math.floor(camZ / SEG), off = camZ / SEG - b; offG = off; bG = b;
  // 坐長椅休息：鏡頭慢慢往長椅那邊移一點，看得到人坐在椅子上；走起來再慢慢移回來
  benchO = restBench(s, dist);
  hero.pan += ((benchO ? benchO.side * PXO.bench * 0.7 : 0) - hero.pan) * Math.min(1, dt * 2); if (!benchO && Math.abs(hero.pan) < 0.002) hero.pan = 0;   // 離開長椅後鏡頭回到正中間：剩一點點就直接歸零（不會永遠偏一點點）
  const bob = RMOT && RMOT.matches ? 0 : hero.mv;   // 鏡頭跟著步伐極輕微上下晃（一步一次）；系統設定減少動態就不晃
  let j, x = 0, dx = -off * cAt(b);
  for (j = 0; j <= DRAW + 1; j++) { const dc = Math.max(0, (j - off) * SEG - HZ); pC[j] = x; pW[j] = eAt(b + j) - CREST * dc * dc; x += dx; dx += cAt(b + j); }
  const hj = HZ / SEG + off; jhG = Math.floor(hj); fhG = hj - jhG;
  camX = lerp(pC[jhG], pC[jhG + 1], fhG) + hero.pan + Math.sin(hero.ph) * 0.012 * bob;
  camY = lerp(pW[jhG], pW[jhG + 1], fhG) + CAMH - Math.abs(Math.sin(hero.ph)) * 0.022 * bob;
  for (j = 0; j <= DRAW + 1; j++) {
    const dz = Math.max((j - off) * SEG, NEAR_Z), sc = F / dz;
    pZ[j] = dz; pS[j] = sc; pX[j] = W / 2 + (pC[j] - camX) * sc; pY[j] = HOR - (pW[j] - camY) * sc;
  }
  drawBG(t, dist);
  drawWorld(b, t);
  drawFlyers(t, dt, sp);
  if (isFog) fogBands(t, dist);
  if (SHOW_FG) drawFG(t);
  // 整體調色（時間／天氣），之後再疊發光的東西
  if (cGrade[0] < 250 || cGrade[1] < 250 || cGrade[2] < 250) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = css(cGrade); ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; }
  // 午後暖光濾鏡：整個世界（含前景框）蓋一層從右上來的暖金柔光，不同批美術圖才會在同一個色溫裡；晚上、雨天不加
  const wa = isNight ? 0 : WARM_A * sunVis;
  if (wa > 0.01 && WARM) { ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = wa; ctx.fillStyle = WARM; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  drawLights(t);
  if (isRain) drawRain(t);
  if (snowFall > 0.02) drawSnow(t, snowFall);
  drawParts(dt);
  if (vig) { ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H); }
  if (s.dt > 0) warmStep();   // 畫完這一格，剩下的時間慢慢預先做之後會用到的圖
};

// ═════════ 對外：查詢與互動 ═════════
S.hitTest = function(x, y){
  for (let i = hitN - 1; i >= 0; i--) { const h = hits[i]; if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return { o:{ type:h.o.type, m:h.o.m } }; }
  return null;
};
S.nearby = function(){
  const d = curS ? (curS.dist || 0) : 0; let best = null;
  for (let i = 0; i < hitN; i++) {
    const h = hits[i], ty = h.o.type;
    if (ty !== 'bench' && ty !== 'view' && ty !== 'treasure') continue;
    if (h.o.m < d - 1.5 || h.cx < 12 || h.cx > W - 12 || h.top < HOR - 60 || h.top > H - 40) continue;
    if (!best || h.o.m < best.o.m) best = h;
  }
  return best ? { type:best.o.type, m:best.o.m, x:best.cx, y:best.top } : null;
};
S.charPos = function(){ return { x:hero.sx, y:hero.top }; };
// 拍立得的比例（寬 / 高）：要跟 css 的 .pol img aspect-ratio 一樣（check 會檢查）
const PHOTO_AR = 36 / 26;
// 構圖：lens 鏡頭焦距倍數（小於 1 是廣角，登山客變小、拍進更多風景）、zw 取景寬度（佔畫面寬的比例）、
//       fx 登山客在照片左右的位置、fy 腳底在照片上下的位置（0 頂、1 底）
const PHOTO_COMPS = [
  { lens:0.55, zw:1, fx:0.5, fy:0.62 },    // 寬景：登山客小小的，多一點天空和遠山（登頂也用這張，山頂標誌拍得進來）
  { lens:0.8, zw:0.8, fx:0.5, fy:0.88 },   // 中景：登山客在正中間
  { lens:0.7, zw:0.75, fx:0.34, fy:0.86 },  // 登山客偏左，右邊留風景
  { lens:0.7, zw:0.75, fx:0.66, fy:0.86 },  // 登山客偏右，左邊留風景
];
// 拍照：先用「這一刻的位置」重畫一格再取畫面（遊戲在背景補進度、或不在登山畫面時，畫布可能是空的 → 拍出全黑）
const SNAP_DPR = 1.5;   // 拍照那一格的解析度至少這麼多倍（自動畫質把畫面降到 1 倍以下時，照片才不會糊）
let snapDpr = 0;
S.snapshot = function(dist){
  if (!cv || !curS) return '';
  const F0 = F;
  try {
    if (DPR < SNAP_DPR) { snapDpr = SNAP_DPR; S.resize(); }
    // 構圖依拍照的位置固定挑一種（同一個地方拍，構圖每次一樣）：寬景、中景、登山客偏左／偏右；登頂用寬景把山頂標誌拍進去
    const d = dist != null ? dist : curS.dist, comp = d >= total - 1 ? PHOTO_COMPS[0] : PHOTO_COMPS[Math.abs(Math.round(d / 100) * 7919) % PHOTO_COMPS.length];
    F = F0 * comp.lens;   // 只為這張照片換鏡頭，下面 finally 一定換回來，下一格畫面照舊
    S.render(Object.assign({}, curS, { dt:0, dist:d, frac:d / total }));
    // 照片比例跟相簿拍立得框（css .pol img 的 aspect-ratio）一樣，框裡才不會再被裁掉、只剩頭和背包
    const sw = cv.width, sh = cv.height;
    const fx = hero.sx * DPR, fy = hero.sy * DPR, hh = (hero.sy - hero.top) * DPR;   // 腳底位置、身高（畫布像素）
    const need = hh * PHOTO_AR / (sw * (comp.fy - 0.08));                              // 整個人（頭頂留 8%）放得進去的最小寬度比例
    const cw = Math.round(sw * clamp(Math.max(comp.zw, need), 0.4, 1)), ch = Math.min(sh, Math.round(cw / PHOTO_AR));
    const left = clamp(Math.round(fx - comp.fx * cw), 0, sw - cw), top = clamp(Math.round(fy - comp.fy * ch), 0, sh - ch);
    const ow = Math.min(600, cw), oh = Math.round(ow / PHOTO_AR), c = mk(ow, oh), g = c.getContext('2d');
    g.drawImage(cv, left, top, cw, ch, 0, 0, ow, oh);
    // 檢查有沒有畫出東西改讀這張小照片，不讀登山畫面本身：一直從主畫布讀像素，瀏覽器可能把它改成較慢的繪製方式
    const px = g.getImageData(ow >> 1, oh >> 2, 1, 1).data;
    const url = px[3] === 0 ? '' : c.toDataURL('image/jpeg', 0.74);   // 還是沒畫出東西：不要存一張黑照片
    free(c);
    return url;
  } catch (e) { return ''; } finally { F = F0; if (snapDpr) { snapDpr = 0; S.resize(); } }
};
S.SEG = SEG;
})();

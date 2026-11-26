// 裝備欄中間的登山客（紙娃娃）：把 Gemini 畫的 7 張「同一個人、只換一件裝備」切成可以任意搭配的圖層
// 用法：node art/gearme.js   （來源在 art/raw/_src_gearme/，輸出到 art/raw/06.介面/gearme_*.png，之後照常跑 art/process.ps1）
// 來源 7 張：doll_base（原本的帽子、背包、登山杖）＋ doll_hat_wool、doll_hat_wind、doll_pack_light、doll_pack_frame、doll_pole_alu、doll_pole_carbon
//   都是在同一個 Gemini 對話裡「其他都不要動，只換某一件」改出來的，所以跟底圖只差那一件，位置完全對得上。
// 做法：每一類（帽子、背包、登山杖）找出「兩款跟底圖不一樣的地方」當那一類的範圍；
//   gearme_rest＝底圖挖掉三類的範圍；gearme_<類>_<款>＝那一款的圖只留那一類的範圍（比挖掉的洞大一圈，疊上去蓋住接縫）。
//   遊戲裡由下往上疊：rest → 背包 → 登山杖 → 帽子。
// 去洋紅底用跟其他圖同一支 art/despill.js（在原圖尺寸做），所以輸出已經是透明圖，process.ps1 對 gearme_ 只縮圖、不再去背、不裁邊（裁了各層就對不齊）。
const { execFileSync } = require('child_process'), fs = require('fs'), path = require('path');
const { clean } = require('./despill.js');
const SRC = path.join(__dirname, 'raw', '_src_gearme'), OUT = path.join(__dirname, 'raw', '06.介面');
const DIFF = 48;      // 跟底圖 RGB 差多少（三色相加）算「不一樣」
const HOLE = { hat:6, pack:6, pole:3 };   // 不一樣的地方往外擴幾像素當挖掉的洞（登山杖很細、旁邊就是背包，擴小一點）
const OVER = 12;      // 圖層比洞再大幾像素（蓋住接縫）
const PAD = 10;       // 裁掉四周空白時留幾像素
const SLOTS = { hat:['wool', 'wind'], pack:['light', 'frame'], pole:['alu', 'carbon'] };

const probe = f => execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', f]).toString().trim().split(',').map(Number);
const decode = (f, w, h) => Buffer.from(execFileSync('ffmpeg', ['-v', 'error', '-i', f, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { maxBuffer:w * h * 4 + (1 << 20) }));
const src = n => path.join(SRC, `doll_${n}.png`);
const [W, H] = probe(src('base')), N = W * H;
const raw = {}, cut = {};
for (const n of ['base', ...Object.entries(SLOTS).flatMap(([s, v]) => v.map(x => `${s}_${x}`))]) {
  const [w, h] = probe(src(n)); if (w !== W || h !== H) throw new Error(`doll_${n} 的尺寸 ${w}x${h} 跟底圖 ${W}x${H} 不一樣：要在同一個 Gemini 對話裡改出來的才對得上`);
  raw[n] = decode(src(n), W, H); cut[n] = Buffer.from(raw[n]); clean(cut[n], W, H, false);
}
// 方形擴張／收縮（r 像素）：先橫再直
function grow(m, r, on = 1){
  let a = m; for (const horiz of [true, false]) { const b = new Uint8Array(N);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = on ? 0 : 1;
      for (let k = -r; k <= r; k++) { const xx = horiz ? x + k : x, yy = horiz ? y : y + k; const q = xx < 0 || yy < 0 || xx >= W || yy >= H ? 0 : a[yy * W + xx]; if (on ? q : !q) { v = on ? 1 : 0; break; } }
      b[y * W + x] = v; }
    a = b; }
  return a;
}
const diffMask = n => { const a = raw.base, b = raw[n], m = new Uint8Array(N); for (let i = 0; i < N; i++) { const k = i * 4; if (Math.abs(a[k] - b[k]) + Math.abs(a[k + 1] - b[k + 1]) + Math.abs(a[k + 2] - b[k + 2]) > DIFF) m[i] = 1; } return grow(grow(m, 1, 0), 1); };   // 先收一圈再擴回來：去掉零星的雜點
const hole = {}, layer = {}, core = {};
for (const s in SLOTS) { const m = new Uint8Array(N); for (const v of SLOTS[s]) { const d = diffMask(`${s}_${v}`); for (let i = 0; i < N; i++) if (d[i]) m[i] = 1; } core[s] = m; hole[s] = grow(m, HOLE[s]); layer[s] = grow(m, HOLE[s] + OVER); }
const count = m => { let n = 0; for (let i = 0; i < N; i++) n += m[i]; return n; };
const both = (a, b) => { let n = 0; for (let i = 0; i < N; i++) n += a[i] & b[i]; return n; };
// 三類的範圍不能互相蓋到太多：蓋到的地方，上層那一類會露出「底圖的」下層裝備（例如換了背包，登山杖旁邊還是舊背包的顏色）
// 所以每一類的圖層避開「別類真的有變的地方」（那裡讓給那一類的圖層畫）；真的兩類都有變的點（core 互相重疊）應該是 0，不是的話印出來看
const near = {}; for (const s in SLOTS) near[s] = grow(core[s], 2);
// 洞裡的每一點只給一類畫：附近真的有變的那一類優先；兩類都有變（背包頂端碰到帽子下緣）就照 PRIO（登山杖在最前面、背包在帽子前面）；都沒變就給 PRIO 高的
const PRIO = { hat:1, pack:2, pole:3 }, ALL = Object.keys(SLOTS);
const owner = i => { const c = ALL.filter(s => hole[s][i]); if (!c.length) return null; const n = c.filter(s => near[s][i]); return (n.length ? n : c).sort((x, y) => PRIO[y] - PRIO[x])[0]; };
const keep = s => i => { if (!layer[s][i]) return false; const o = owner(i); return o === null || o === s; };
const report = { size:`${W}x${H}`, hat:count(hole.hat), pack:count(hole.pack), pole:count(hole.pole), 'core hat∩pack':both(core.hat, core.pack), 'core pole∩pack':both(core.pole, core.pack), 'core hat∩pole':both(core.hat, core.pole) };
// 所有圖層共用同一個裁切框（四周空白裁掉，位置才對得齊）
let x0 = W, y0 = H, x1 = 0, y1 = 0;
for (const n in cut) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (cut[n][(y * W + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
x0 = Math.max(0, x0 - PAD); y0 = Math.max(0, y0 - PAD); x1 = Math.min(W - 1, x1 + PAD); y1 = Math.min(H - 1, y1 + PAD);
const cw = (x1 - x0 + 1) & ~1, ch = (y1 - y0 + 1) & ~1;
function write(name, img, keep){   // keep(i)＝這一點留不留
  const o = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { const i = (y + y0) * W + x + x0, k = i * 4, q = (y * cw + x) * 4; o[q] = img[k]; o[q + 1] = img[k + 1]; o[q + 2] = img[k + 2]; o[q + 3] = keep(i) ? img[k + 3] : 0; }
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${cw}x${ch}`, '-i', '-', path.join(OUT, `gearme_${name}.png`)], { input:o, maxBuffer:1 << 24 });
}
write('rest', cut.base, i => !(hole.hat[i] || hole.pack[i] || hole.pole[i]));
for (const s in SLOTS) { write(`${s}_old`, cut.base, keep(s)); for (const v of SLOTS[s]) write(`${s}_${v}`, cut[`${s}_${v}`], keep(s)); }
report.crop = `${cw}x${ch}`;
console.log(JSON.stringify(report));

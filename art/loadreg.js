// 山行小日子：出發前的小山讀取圖（load_<山>，2:1：左半線稿、右半上色）左右兩半對齊
// 用法：node art/loadreg.js <原圖> <輸出.png>（art/process.ps1 轉 load_ 圖時先跑這支）
// 為什麼：讀取畫面把右半（上色）從下往上蓋在左半（線稿）同一個位置（js/mtload.js），兩半差幾個像素，水位線經過的地方線條就會變成兩條。
// Gemini 畫的兩半常常整張差 2～4 像素（2026-11-24 第一批四張：右半都偏左 2～4 像素）：拿左半的墨線跟右半的邊緣比，找最吻合的平移，
// 把右半挪回去（挪出去的那一小條留原本的像素）。對不太上（構圖不一樣、要放大縮小才對得上）就不轉，請重畫
'use strict';
const { execFileSync } = require('child_process');
const [src, out] = process.argv.slice(2);
if (!src || !out) { console.error('用法：node art/loadreg.js <原圖> <輸出.png>'); process.exit(1); }
const MAX = 8;          // 最多挪幾像素（再多就是畫歪了，要重畫）
const MIN_CORR = 0.7;   // 挪好以後線稿和上色版的吻合度（0～1）低於這個就是構圖不一樣
const o = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', src]).toString().trim().split(',');
const W = +o[0], H = +o[1], HW = W >> 1;
if (W !== HW * 2 || Math.abs(W / H - 2) > 0.02) { console.error(`load_ 圖要 2:1（左半線稿、右半上色），這張是 ${W}×${H}`); process.exit(2); }
const rgb = execFileSync('ffmpeg', ['-v', 'error', '-i', src, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: W * H * 3 + (1 << 20) });
const g = (x, y) => { const i = (y * W + x) * 3; return rgb[i] * 0.3 + rgb[i + 1] * 0.59 + rgb[i + 2] * 0.11; };
// 左半：墨線有多黑；右半：邊緣（顏色交界）＋墨線。各模糊一點，差一兩個像素也算接近
const L = new Float32Array(HW * H), R = new Float32Array(HW * H);
for (let y = 1; y < H - 1; y++) for (let x = 1; x < HW - 1; x++) {
  L[y * HW + x] = Math.max(0, 200 - g(x, y));
  const xr = x + HW, gx = g(xr + 1, y) - g(xr - 1, y), gy = g(xr, y + 1) - g(xr, y - 1);
  R[y * HW + x] = Math.max(Math.hypot(gx, gy), Math.max(0, 140 - g(xr, y)));
}
const blur = a => { const b = new Float32Array(a.length); for (let y = 1; y < H - 1; y++) for (let x = 1; x < HW - 1; x++) { let s = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) s += a[(y + j) * HW + x + i]; b[y * HW + x] = s / 9; } return b; };
const Lb = blur(L), Rb = blur(R);
// 只比中間那一塊（四周留 MAX，挪動時不會比到圖外）
function corr(dx, dy){
  let sa = 0, sb = 0, n = 0;
  for (let y = MAX; y < H - MAX; y++) for (let x = MAX; x < HW - MAX; x++) { sa += Lb[y * HW + x]; sb += Rb[(y - dy) * HW + x - dx]; n++; }
  const ma = sa / n, mb = sb / n; let ab = 0, aa = 0, bb = 0;
  for (let y = MAX; y < H - MAX; y++) for (let x = MAX; x < HW - MAX; x++) { const a = Lb[y * HW + x] - ma, b = Rb[(y - dy) * HW + x - dx] - mb; ab += a * b; aa += a * a; bb += b * b; }
  return ab / Math.sqrt(aa * bb);
}
let best = { c:-1, dx:0, dy:0 };
for (let dy = -MAX; dy <= MAX; dy++) for (let dx = -MAX; dx <= MAX; dx++) { const c = corr(dx, dy); if (c > best.c) best = { c, dx, dy }; }
const msg = `右半挪 (${best.dx}, ${best.dy}) 像素，吻合度 ${best.c.toFixed(2)}（沒挪 ${corr(0, 0).toFixed(2)}）`;
if (best.c < MIN_CORR || Math.abs(best.dx) === MAX || Math.abs(best.dy) === MAX) { console.error(`左右兩半對不上：${msg}。構圖不一樣或差太多，請 Gemini 重畫（右半要跟左半線稿同一張構圖）`); process.exit(3); }
// 整張對齊以後，再一小塊一小塊看（切成 TILE×TILE 格）：某一塊自己要再挪很多才對得上，就是那裡畫的位置不一樣（例如柴犬畫在別的地方），
// 整張挪不回來，水位線經過時那裡會有兩份。照樣轉，但列出來決定要不要請 Gemini 重畫
const TILE = 6, LOCAL = 24, WARN_PX = 6;
const warns = [];
for (let ty = 0; ty < TILE; ty++) for (let tx = 0; tx < TILE; tx++) {
  const x0 = Math.max(LOCAL, Math.round(tx * HW / TILE)), x1 = Math.min(HW - LOCAL, Math.round((tx + 1) * HW / TILE)), y0 = Math.max(LOCAL, Math.round(ty * H / TILE)), y1 = Math.min(H - LOCAL, Math.round((ty + 1) * H / TILE));
  let ink = 0; for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) ink += Lb[y * HW + x] > 40 ? 1 : 0;
  if (ink < (x1 - x0) * (y1 - y0) / 4 * 0.04) continue;   // 這一塊幾乎沒有線（天空、空地）：不看
  const lc = (dx, dy) => { let sa = 0, sb = 0, n = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { sa += Lb[y * HW + x]; sb += Rb[(y - dy) * HW + x - dx]; n++; }
    const ma = sa / n, mb = sb / n; let ab = 0, aa = 0, bb = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const a = Lb[y * HW + x] - ma, b = Rb[(y - dy) * HW + x - dx] - mb; ab += a * b; aa += a * a; bb += b * b; } return ab / Math.sqrt(aa * bb || 1); };
  let lb = { c:-1 }; for (let dy = -LOCAL; dy <= LOCAL; dy += 2) for (let dx = -LOCAL; dx <= LOCAL; dx += 2) { const c = lc(best.dx + dx, best.dy + dy); if (c > lb.c) lb = { c, dx, dy }; }
  const here = lc(best.dx, best.dy), off = Math.hypot(lb.dx, lb.dy);
  if (off > WARN_PX && lb.c - here > 0.15) warns.push(`第 ${ty + 1} 列第 ${tx + 1} 欄（左半約 x ${x0}～${x1}、y ${y0}～${y1}）還差約 ${Math.round(off)} 像素`);
}
// 右半照找到的平移挪：新右半 (x, y) = 原右半 (x − dx, y − dy)；挪出去的邊照原本的像素
const outBuf = Buffer.from(rgb);
for (let y = 0; y < H; y++) for (let x = 0; x < HW; x++) {
  const sx = x - best.dx, sy = y - best.dy; if (sx < 0 || sy < 0 || sx >= HW || sy >= H) continue;
  const s = (sy * W + sx + HW) * 3, d = (y * W + x + HW) * 3; outBuf[d] = rgb[s]; outBuf[d + 1] = rgb[s + 1]; outBuf[d + 2] = rgb[s + 2];
}
execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', W + 'x' + H, '-i', '-', out], { input: outBuf, maxBuffer: 1 << 24 });
console.log(msg + (warns.length ? '\n  注意：有幾塊畫的位置跟線稿不一樣（整張挪不回來，水位線經過那裡會看到兩份），要的話請重畫：\n  ' + warns.join('\n  ') : ''));

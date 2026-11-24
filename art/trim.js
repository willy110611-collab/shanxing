// 山行小日子：把轉好的透明 webp 裁掉四周透明邊（不透明度 > 24 的範圍，跟 js/art.js 的 bounds 同一個門檻）
// 用法：node art/trim.js <圖.webp>（直接覆蓋）
// 為什麼：只在網頁上顯示的圖（寶物卡、集印、介面木框、圖示）改成用到才下載（manifest 標 lazy），遊戲不再先把它解成畫布、在手機上裁邊。
// 2026-11-24 iPhone「重複發生問題」：開遊戲時把 254 張圖全部解開放在記憶體（約 540 MB），Safari 撐不住整頁當掉。
// 介面木框的 border-image 邊框寬度是照「裁掉透明邊後」量的，所以這裡要在縮圖之後才裁（跟以前在遊戲裡裁的結果一樣）
'use strict';
const { execFileSync } = require('child_process');
const f = process.argv[2];
if (!f) { console.error('用法：node art/trim.js <圖.webp>'); process.exit(1); }
const o = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', f]).toString().trim().split(',');
const w = +o[0], h = +o[1];
const d = execFileSync('ffmpeg', ['-v', 'error', '-i', f, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { maxBuffer: w * h * 4 + (1 << 20) });
let x0 = w, y0 = h, x1 = -1, y1 = -1;
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
if (x1 < 0 || (x0 === 0 && y0 === 0 && x1 === w - 1 && y1 === h - 1)) process.exit(0);   // 全透明或本來就沒有透明邊
const cw = x1 - x0 + 1, ch = y1 - y0 + 1, out = new Uint8Array(cw * ch * 4);
for (let y = 0; y < ch; y++) out.set(d.subarray(((y + y0) * w + x0) * 4, ((y + y0) * w + x0 + cw) * 4), y * cw * 4);
const tmp = f + '.trim.webp';
execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', cw + 'x' + ch, '-i', '-', '-c:v', 'libwebp', '-quality', '82', tmp], { input: out, maxBuffer: 1 << 24 });
require('fs').renameSync(tmp, f);
console.log(`${cw}x${ch}`);

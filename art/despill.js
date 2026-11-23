// 山行小日子：洋紅底的圖去背（唯一的去背算法；art/process.ps1 轉檔、角色繪圖包匯出都用這支）
// 用法：node art/despill.js <原圖> <輸出.webp|.png> [長邊上限]
//   .webp：給遊戲用（縮到上限、存透明 webp）；.png：原尺寸透明 png（給人看、給 Gemini 參考）
//   圖的名字（決定是不是粉紅花的圖）取輸出檔名
// 為什麼在轉檔時做、不在遊戲載入時做：
//   1. 縮小圖時，透明處底下的洋紅色會被平均進邊緣（縮圖不管透明度），先清乾淨再縮，邊緣才不會帶粉紅
//   2. webp 的顏色是兩格兩格共用的，透明處底下留洋紅，壓縮後會滲進旁邊一格；這裡把透明處填成最近的圖的顏色
//   3. 原尺寸的邊緣資訊最多；手機載入時也不用再花時間處理
// 算法：邊緣的每一點都當成「圖的顏色」和「洋紅底 M」照比例混出來的。圖的顏色用兩種候選：
//   F：最近的乾淨點的顏色（帽子的卡其、睡墊的橘），K：這張圖的墨線顏色（細細的墨線常常整條都混到洋紅，旁邊找不到乾淨的墨線）
//   解 C − M ＝ α(F − M) ＋ β(K − M)（最小平方），α＋β ＝ 圖占幾成 → 透明度；顏色把混進去的那份洋紅換回圖的顏色
//   （以前只扣「紅、藍各比綠多的部分」，卡其帽沿、橘色睡墊這種紅多藍少的邊，紅色扣不夠，留一圈粉紅褐色）
//   兩種候選都對不上（例如被畫成淡紫的登山杖）：紅、藍一起扣掉高出綠的部分，變回灰色
'use strict';
const { execFileSync } = require('child_process');

// 真的有粉紅花的圖：圖裡面的粉紅是花，不洗；邊緣照樣解混色（花瓣邊的參考色就是旁邊的花瓣）
// 其他圖裡面的粉紅、紫紅一律當成洋紅染到的洗掉（2026-11-24：草叢的粉紫葉尖是洋紅滲進去的，用「粉紅多不多」自動判斷會把它當成花）
const PINK_ART = /^(bush_rhodo|tree_sakura)$/;
// 參數（判斷用的門檻只寫在這裡；像素數以 Gemini 原圖尺寸算）
const BG = 60;        // 跟洋紅底的距離小於這個：就是底，直接透明
const CLEAN_S = 12;   // min(紅, 藍) − 綠 不超過這個：沒有洋紅味（紅格子襯衫、紅安全帽藍很少，不會被當成洋紅）
const CLEAN_D = 150;  // 乾淨的點也要離洋紅底夠遠
const BAND = 5;       // 離底幾像素內算邊緣（只有邊緣會變透明）
const REACH = 8;      // 邊緣的點往內最多找幾像素的乾淨點
const RIM = 4;        // 最外面幾圈：一律解混色、不當參考色（看起來不紫也常混了一點洋紅）
const HOLE_S = 40;    // 圖裡面 min(紅, 藍) − 綠 超過這個：是洋紅透出來（縫隙、光暈），照邊緣的方法解混色
const WARM = 0.5;     // 對不上時假設的顏色：藍比綠少的量 ≥ 紅比綠多的量 × WARM
const FIT = 40;     // 混色算出來跟實際顏色差多少以內才算對得上
const PAD = 16;       // 透明處離圖幾像素內填圖的顏色（縮成 720 寬時，縮圖會用到原圖周圍十來個像素）

function clean(d, w, h, pink){
  const N = w * h;
  const sOf = i => Math.min(d[i], d[i + 2]) - d[i + 1];
  // 1. 洋紅底的實際顏色：四周邊框上像洋紅的點平均（Gemini 的洋紅常常不是純 #FF00FF）
  let mr = 0, mg = 0, mb = 0, mn = 0;
  const eb = Math.max(4, Math.round(Math.min(w, h) * 0.02));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (x >= eb && x < w - eb && y >= eb && y < h - eb) continue;
    const i = (y * w + x) * 4;
    if (d[i] > 120 && d[i + 2] > 120 && sOf(i) > 80) { mr += d[i]; mg += d[i + 1]; mb += d[i + 2]; mn++; }
  }
  const M = mn > 100 ? [mr / mn, mg / mn, mb / mn] : [255, 0, 255];
  const dm = i => Math.hypot(d[i] - M[0], d[i + 1] - M[1], d[i + 2] - M[2]);
  const spill = i => Math.max(0, Math.min((d[i] - d[i + 1]) / (M[0] - M[1]), (d[i + 2] - d[i + 1]) / (M[2] - M[1])));
  // 2. 底：離洋紅很近的點。dist：離底幾像素（BAND＋1 以上算圖裡面）
  const dist = new Uint8Array(N), q = new Int32Array(N); let qh = 0, qt = 0;
  for (let p = 0; p < N; p++) {
    if (d[p * 4 + 3] <= 8 || dm(p * 4) < BG) { dist[p] = 0; q[qt++] = p; } else dist[p] = 255;
  }
  while (qh < qt) {
    const s = q[qh++], k = dist[s] + 1, sx = s % w; if (k > BAND + 1) continue;
    if (sx > 0 && dist[s - 1] > k) { dist[s - 1] = k; q[qt++] = s - 1; }
    if (sx < w - 1 && dist[s + 1] > k) { dist[s + 1] = k; q[qt++] = s + 1; }
    if (s >= w && dist[s - w] > k) { dist[s - w] = k; q[qt++] = s - w; }
    if (s < N - w && dist[s + w] > k) { dist[s + w] = k; q[qt++] = s + w; }
  }
  // 3. 乾淨的點（沒有洋紅味）；墨線顏色 K ＝ 邊緣附近乾淨的深色點平均
  //    最外面 RIM 圈的點就算看起來不紫，也常混了一點洋紅（卡其＋洋紅＝粉紅褐，藍還是比綠少），所以不拿來當參考色、一律解混色
  const has = new Uint8Array(N), F = new Float32Array(N * 3), ok = new Uint8Array(N);
  let kr = 0, kg = 0, kb = 0, kn = 0;
  for (let p = 0; p < N; p++) {
    const i = p * 4; if (!dist[p]) continue;
    if (d[i + 3] > 240 && dm(i) > CLEAN_D && (sOf(i) <= CLEAN_S || (pink && dist[p] > BAND))) {
      ok[p] = 1;
      if (dist[p] <= BAND + 1 && d[i] + d[i + 1] + d[i + 2] < 180) { kr += d[i]; kg += d[i + 1]; kb += d[i + 2]; kn++; }
    }
  }
  const K = kn > 50 ? [kr / kn, kg / kn, kb / kn] : [40, 32, 30];
  // 4. 參考色 F：一圈一圈往外傳，取旁邊已經有 F 的點的平均（最近的乾淨顏色）
  //    先從裡面（離底 RIM 圈以外）的乾淨點傳；細的東西（草葉、登山杖）裡面沒有這種點，再從最外圈的乾淨點補傳
  const grow = front => {
    for (let k = 0; k < REACH && front.length; k++) {
      const next = [];
      for (const s of front) {
        const sx = s % w;
        for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) {
          const p = s + v * w + u; if (sx + u < 0 || sx + u >= w || p < 0 || p >= N || has[p] || !dist[p]) continue;
          has[p] = 2; next.push(p);
        }
      }
      for (const p of next) {
        const px = p % w; let r = 0, g = 0, b = 0, n = 0;
        for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) {
          const s = p + v * w + u; if (px + u < 0 || px + u >= w || s < 0 || s >= N || has[s] !== 1) continue;
          r += F[s * 3]; g += F[s * 3 + 1]; b += F[s * 3 + 2]; n++;
        }
        F[p * 3] = r / n; F[p * 3 + 1] = g / n; F[p * 3 + 2] = b / n;
      }
      for (const p of next) has[p] = 1;
      front = next;
    }
  };
  const seed = deep => { const fr = []; for (let p = 0; p < N; p++) if (ok[p] && !has[p] && (dist[p] > RIM) === deep) { has[p] = 1; const i = p * 4; F[p * 3] = d[i]; F[p * 3 + 1] = d[i + 1]; F[p * 3 + 2] = d[i + 2]; fr.push(p); } return fr; };
  grow(seed(true));
  grow(seed(false));
  // 5. 解混色
  const kv = [K[0] - M[0], K[1] - M[1], K[2] - M[2]], kk = kv[0] * kv[0] + kv[1] * kv[1] + kv[2] * kv[2];
  const set = (i, r, g, b) => { d[i] = Math.max(0, Math.min(255, Math.round(r))); d[i + 1] = Math.max(0, Math.min(255, Math.round(g))); d[i + 2] = Math.max(0, Math.min(255, Math.round(b))); };
  const cover = a => Math.max(0, Math.min(1, (a - 0.06) / 0.88));
  // 暖色假設：圖本來的顏色是「暖色或灰色」——紅比綠多多少，藍就至少比綠少 WARM 倍那麼多（卡其、橘、褐、灰都是；粉紅、紫不是）
  // 紅比綠多、又不合這個假設的點（粉紅、珊瑚色：洋紅混進卡其、橘色光暈）：扣掉剛好讓它變回暖色的洋紅量 t，顏色 ＝ (C − t·M)/(1−t)；alpha 為真時透明度也 ×(1−t)
  const warm = (i, alpha) => {
    if (d[i] <= d[i + 1]) return false;   // 綠比紅多（綠葉、藍天）：不是暖色，不套
    const t = Math.min(0.95, ((d[i + 2] - d[i + 1]) + WARM * (d[i] - d[i + 1])) / ((M[2] - M[1]) + WARM * (M[0] - M[1])));
    if (t <= 0) return false;
    set(i, (d[i] - t * M[0]) / (1 - t), (d[i + 1] - t * M[1]) / (1 - t), (d[i + 2] - t * M[2]) / (1 - t));
    if (alpha) d[i + 3] = Math.round(d[i + 3] * cover(1 - t));
    return true;
  };
  let fit = 0, gray = 0;
  for (let p = 0; p < N; p++) {
    const i = p * 4;
    if (!dist[p]) { d[i + 3] = 0; continue; }
    const s = sOf(i), edge = dist[p] <= BAND;
    if (ok[p] && dist[p] > RIM) continue;                     // 乾淨的點（最外圈以外）不動
    // 圖裡面：洋紅味很重的（葉子縫、光暈透出洋紅底）跟邊緣一樣解混色；淡淡的只洗顏色、不變透明（紅格子襯衫的暗處不會被挖洞）
    // 粉紅花的圖裡面是花，不動
    if (!edge && (pink || s <= HOLE_S)) { if (!pink) warm(i, false); continue; }
    // 圖的顏色用 F、K、F＋K 三種候選，取混出來最接近實際顏色的
    const c0 = d[i] - M[0], c1 = d[i + 1] - M[1], c2 = d[i + 2] - M[2];
    const ck = c0 * kv[0] + c1 * kv[1] + c2 * kv[2];
    const fv = has[p] ? [F[p * 3] - M[0], F[p * 3 + 1] - M[1], F[p * 3 + 2] - M[2]] : [0, 0, 0];
    const ff = fv[0] * fv[0] + fv[1] * fv[1] + fv[2] * fv[2];
    const cands = [[0, ck / kk]];
    if (ff > 1600) {
      const cf = c0 * fv[0] + c1 * fv[1] + c2 * fv[2], fk = fv[0] * kv[0] + fv[1] * kv[1] + fv[2] * kv[2], det = ff * kk - fk * fk;
      cands.push([cf / ff, 0]);
      if (det > 1e-3 * ff * kk) cands.push([(cf * kk - ck * fk) / det, (ff * ck - fk * cf) / det]);
    }
    let best = null;
    for (const cd of cands) {
      let [al, be] = cd; if (al < 0 || be < 0 || al + be <= 0) continue;
      if (al + be > 1) { const t = al + be; al /= t; be /= t; }
      const err = Math.hypot(c0 - al * fv[0] - be * kv[0], c1 - al * fv[1] - be * kv[1], c2 - al * fv[2] - be * kv[2]);
      if (!best || err < best.err) best = { al, be, err };
    }
    if (best && best.err <= FIT) {
      // 圖的顏色 G ＝ (αF＋βK)/(α＋β)；把 (1−α−β) 份洋紅換成 G，透明度 ＝ α＋β
      const a = best.al + best.be, t = 1 - a;
      for (let c = 0; c < 3; c++) d[i + c] = Math.max(0, Math.min(255, Math.round(d[i + c] + t * ((best.al * (fv[c] + M[c]) + best.be * K[c]) / a - M[c]))));
      d[i + 3] = Math.round(d[i + 3] * cover(a));
      if (!pink) warm(i, false);   // 參考色本身帶一點粉（例如最外圈的乾淨點）：顏色再洗一次
      fit++;
    } else if (pink) {
      // 粉紅花的圖對不上：紅藍差很多的是花瓣，不動；紅藍差不多的照洋紅的量變透明一點
      if (s > 0 && Math.abs(d[i] - d[i + 2]) <= 40) { d[i + 3] = Math.round(d[i + 3] * cover(1 - spill(i))); gray++; }
    } else if (warm(i, true)) gray++;   // 對不上（被畫成淡紫的登山杖、光暈透出洋紅底，旁邊沒有同色的乾淨點）
  }
  // 6. 透明處的顏色：靠近圖的 PAD 像素內填成最近的圖的顏色（縮圖、webp 壓縮把透明處混進邊緣時，混進來的是圖自己的顏色，不是洋紅）；
  //    更遠的填黑（縮圖碰不到，整片同色 webp 也比較小）
  qh = qt = 0;
  const far = new Uint8Array(N);
  for (let p = 0; p < N; p++) if (d[p * 4 + 3]) { far[p] = 1; q[qt++] = p; } else { const i = p * 4; d[i] = d[i + 1] = d[i + 2] = 0; }
  while (qh < qt) {
    const s = q[qh++], sx = s % w, si = s * 4; if (far[s] > PAD) continue;
    for (const p of [sx > 0 ? s - 1 : -1, sx < w - 1 ? s + 1 : -1, s - w, s + w]) {
      if (p < 0 || p >= N || far[p]) continue;
      far[p] = far[s] + 1; const i = p * 4; d[i] = d[si]; d[i + 1] = d[si + 1]; d[i + 2] = d[si + 2]; q[qt++] = p;
    }
  }
  return { M:M.map(Math.round), K:K.map(Math.round), pink:!!pink, fit, gray };
}

function probe(f){
  const o = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', f]).toString().trim().split(',');
  return [+o[0], +o[1]];
}
function decode(f, w, h){
  return execFileSync('ffmpeg', ['-v', 'error', '-i', f, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { maxBuffer:w * h * 4 + (1 << 20) });
}
function run(inp, out, max){
  const [w, h] = probe(inp), d = decode(inp, w, h);
  const name = require('path').basename(out).replace(/\.[a-z]+$/i, '');
  const info = clean(d, w, h, PINK_ART.test(name));
  const args = ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', w + 'x' + h, '-i', '-'];
  // webp：縮圖後透明度只留 16 階（幾乎不透明的算全不透明、幾乎透明的算全透明）。邊緣是柔的，透明度一格一格的值很多，
  // webp 的透明度是無損存的，不分階的話每張大三成；16 階在手機上看不出差別
  if (/\.webp$/i.test(out)) args.push('-vf', `scale='min(${max || 720},iw)':-2,lutrgb=a='if(gte(val,240),255,if(lte(val,10),0,round(val/17)*17))'`, '-c:v', 'libwebp', '-quality', '82');
  args.push(out);
  execFileSync('ffmpeg', args, { input:d, maxBuffer:1 << 24 });
  return info;
}
module.exports = { clean, run, PINK_ART };
if (require.main === module) {
  const [inp, out, max] = process.argv.slice(2);
  if (!inp || !out) { console.error('用法：node art/despill.js <原圖> <輸出.webp|.png> [長邊上限]'); process.exit(1); }
  console.log(JSON.stringify(run(inp, out, +max || 0)));
}

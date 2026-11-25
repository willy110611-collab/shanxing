// 山行小日子：登山畫面的 WebGL 繪圖層
// 登山畫面（trail.js）一格要畫上千筆貼圖和色塊，Canvas 2D 每一筆都是單獨叫一次顯示卡，手機吃不消。
// 這裡做一個「長得像 Canvas 2D」的畫筆：trail.js 照舊寫 ctx.drawImage、ctx.fill…，
// 實際上先把每一筆的頂點存進一大塊記憶體，換混色方式或用滿 8 張貼圖才一次送給顯示卡畫（一格約幾十次）。
// 只做 trail.js 主畫面用到的那幾種畫法（API 表；check 會檢查 trail.js 沒有用到表外的）。
// 美術圖、預先畫好的貼圖第一次用到時傳上顯示卡一次（之後重複用），trail.js 的 free() 釋放畫布時一起刪掉。
// 整體調色（時間／天氣的 multiply、午後暖光 soft-light、霧的灰白、飽和度、對比）在 grade() 一次全螢幕處理完。
// 不支援 WebGL2、或建立失敗時 create() 回 null，trail.js 照舊用 Canvas 2D 畫（見 trail.js 的 useGL）。
(function(){
'use strict';
const SX = window.SX = window.SX || {};
const G = SX.gl2d = {};
// trail.js 主畫面 ctx 可以用的方法和屬性：新增 Canvas 2D 畫法前先在這裡做出來、加進這張表
const API = ['drawImage', 'fillRect', 'strokeRect', 'beginPath', 'moveTo', 'lineTo', 'closePath', 'quadraticCurveTo', 'bezierCurveTo', 'arc', 'ellipse', 'rect', 'roundRect',
  'fill', 'stroke', 'save', 'restore', 'translate', 'rotate', 'scale', 'setTransform', 'transform', 'createPattern', 'createLinearGradient', 'createRadialGradient',
  'measureText', 'fillText', 'strokeText', 'fillStyle', 'strokeStyle', 'lineWidth', 'lineCap', 'lineJoin', 'globalAlpha', 'globalCompositeOperation', 'font', 'textAlign', 'textBaseline',
  'gpu', 'begin', 'grade', 'flush', 'drop', 'prep', 'stats', 'lost', 'uvs', 'mesh', 'depthAt', 'depth3', 'hasDepth'];
G.API = API;
const SLOTS = 16;                // 一批最多同時用幾張貼圖（WebGL2 保證至少能同時綁 16 張；換圖不用另外送一批）
const CAP = 1 << 16;             // 一批最多幾個頂點（滿了先送出去）
const STRIDE = 24;               // 每個頂點：x y u v（4 個 float）＋ 顏色 RGBA（4 byte）＋ 第幾張貼圖（1 byte，255＝純色）
const SOLID = 255;
// 小張的圖（寬高都不超過 256：遠處植物的縮小版、接觸陰影、小光斑…）拼進共用的大圖（圖集），一批能畫的圖就多很多（一批只能同時用 16 張）。
// 每張放在一格裡、四周 AT_G 像素照邊緣像素往外延伸（跟單獨一張「超出邊緣取最邊那一排」一樣），格子對齊 16 像素，顯示卡的縮小版不會混到隔壁格
const AT_G = 8, AT_CLS = [32, 64, 128, 256], AT_PAGE = { 32:256, 64:512, 128:1024, 256:1024 };   // 每一級的格子放在多大的一頁（小格子用小頁，少佔記憶體）
// 多久沒畫到的貼圖就從顯示卡卸下（要用時再傳上去）；每隔 TRIM_EVERY 毫秒檢查一次
const TRIM_MS = 30000, TRIM_EVERY = 2000;

const VS = `#version 300 es
in vec2 aP; in vec2 aT; in vec4 aC; in float aS; in float aZ;
uniform vec2 uR;
out vec2 vT; out vec4 vC; flat out int vS;
void main(){ vT = aT; vC = aC; vS = int(aS + 0.5); gl_Position = vec4(aP.x / uR.x * 2.0 - 1.0, 1.0 - aP.y / uR.y * 2.0, aZ * 2.0 - 1.0, 1.0); }`;
// 立體地面（試作，網址加 ?g3d=1 才開）：一整片地形網格用真正的透視畫（顯示卡算遠近、近的山坡擋住後面的東西），
// 每個點（9 個數）：相對鏡頭的位置 (X 右、Y 上、Z 往前)、地面座標（公尺）、路面比例、明暗、不透明度、立面圖哪一排（欄杆：圖的橫向位置）
const MVS = `#version 300 es
in vec3 aP; in vec2 aU; in vec4 aA;
uniform vec3 uK; uniform vec2 uZ;
out vec2 vU; out vec4 vA; out float vD;
void main(){ vU = aU; vA = aA; vD = aP.z; gl_Position = vec4(aP.x * uK.x, aP.y * uK.y + aP.z * uK.z, aP.z * uZ.x + uZ.y, aP.z); }`;
// 著色器裡：近處（40 公尺內，110 公尺外完全不分）草地明暗分成四層色塊（相鄰兩層之間一小段柔邊，像插畫上色，不是電腦的平滑漸層）（路緣不描深色線：2026-11-25 試過，看起來不自然，維持原本柔和的路緣）；
// 最遠那一段（uFar 的 55%～100%）先變霧色、70% 以後再變透明（地平線不會切出一條直的邊，跟 trail.js 舊畫法「最遠幾段先變霧色再淡掉」一樣）；rs＝階梯立面（trail.js 標的，整面暗）；霧照真正的距離（前方和側邊一起算）：兩側地面不變透明，越遠越霧（空氣透視）
// vA.x 大於 3.5：立體欄杆（4 柱子、5 橫木），貼 Gemini 畫的 rail_post／rail_bar（vA.w 橫、vU.y 直）；階梯立面（rs）有立面圖時貼橫木／石塊立面圖（vA.w：這一階用圖上哪一排）
const MFS = `#version 300 es
precision highp float;
in vec2 vU; in vec4 vA; in float vD;
uniform sampler2D tR, tG, tS, tP, tB; uniform vec4 uRS; uniform vec2 uSS; uniform vec4 uFog; uniform vec2 uFD; uniform vec3 uSoil; uniform float uGW; uniform float uFar;
out vec4 o;
void main(){
  vec3 c;
  if (vA.x > 3.5) {
    vec2 tc = vec2(vA.w, vU.y);
    vec4 t = vA.x > 4.5 ? texture(tB, tc) : texture(tP, tc);
    if (t.a < 0.5) discard;
    c = t.rgb / t.a * vA.y;
  } else {
    vec3 r = texture(tR, vec2(vU.x * uRS.x + 0.5, vU.y * uRS.y)).rgb;
    vec3 g = texture(tG, vec2(vU.x * uRS.z, vU.y * uRS.w)).rgb;
    float rs = step(1.5, vA.x), w = clamp(vA.x - 2.0 * rs, 0.0, 1.0), e = clamp(1.0 - abs(w * 2.0 - 1.0), 0.0, 1.0), ts = rs * uSS.y;
    if (ts > 0.5) r = texture(tS, vec2(vU.x * uSS.x + 0.5, vA.w)).rgb;
    c = mix(g, r, w);
    c = mix(c, uSoil * (0.8 + 0.4 * r), e * 0.55 * (1.0 - ts));
    float sb = vA.y * 4.0, sq = (floor(sb) + smoothstep(0.75, 1.0, fract(sb))) / 4.0;
    c *= mix(vA.y, sq, (1.0 - w) * (1.0 - smoothstep(40.0, 110.0, vD)));
  }
  float dd = length(vec2(vD, vU.x)), f = clamp((dd - uFD.x) / (uFD.y - uFD.x), 0.0, 1.0); f = f * (2.0 - f);
  c = mix(c, uFog.rgb, f * uFog.a);
  float fe = smoothstep(0.55 * uFar, uFar, dd); c = mix(c, uFog.rgb, fe);
  float a = vA.z * (1.0 - smoothstep(0.7 * uFar, uFar, vD));
  o = vec4(c * a, a);
}`;
const ZN = 0.3, ZF = 420;   // 立體地面的近、遠裁切面（公尺）
const FS = `#version 300 es
precision highp float;
in vec2 vT; in vec4 vC; flat in int vS;
uniform sampler2D ${Array.from({ length:SLOTS }, (_, i) => 't' + i).join(', ')};
out vec4 o;
// 縮小版挑哪一級：跟 trail.js 的 mip() 一樣挑「縮小不到兩倍」的那一級再線性內插（最接近的一級、往清楚那邊偏半級），
// 不在兩級之間混（那樣比 Canvas 2D 糊）
const float B = -0.5;
void main(){
  if (vS == 255) { o = vC; return; }
  vec4 c;
  ${pick(0, SLOTS)}
  o = c * vC;
}`;
// 第幾張貼圖：對半分的 if（GLSL ES 3.0 不能用變數當貼圖陣列的索引）
function pick(a, b){ if (b - a === 1) return 'c = texture(t' + a + ', vT, B);'; const m = (a + b) >> 1; return 'if (vS < ' + m + ') { ' + pick(a, m) + ' } else { ' + pick(m, b) + ' }'; }
// 整體調色：一張全螢幕的三角形，讀剛畫好的畫面 → 霧的灰白 → 時間天氣的 multiply → 午後暖光 soft-light（公式照 W3C 合成規格）
// → 飽和度、對比（值來自 js/look.js；加對比用「畫面自己 overlay 自己」的 S 曲線、降對比往中灰混，跟 trail.js 的 Canvas 2D 版同一種算法）
const GVS = `#version 300 es
in vec2 aP; void main(){ gl_Position = vec4(aP, 0.0, 1.0); }`;
const GFS = `#version 300 es
precision highp float;
uniform sampler2D uS, uW;
uniform vec2 uR; uniform vec3 uMul; uniform vec4 uFog; uniform float uWA; uniform vec3 uWC; uniform vec2 uSC;
out vec4 o;
float sl(float b, float s){
  if (s <= 0.5) return b - (1.0 - 2.0 * s) * b * (1.0 - b);
  float d = b <= 0.25 ? ((16.0 * b - 12.0) * b + 4.0) * b : sqrt(b);
  return b + (2.0 * s - 1.0) * (d - b);
}
void main(){
  vec3 c = texelFetch(uS, ivec2(gl_FragCoord.xy), 0).rgb;
  c = mix(c, uFog.rgb, uFog.a);
  c *= uMul;
  if (uWA > 0.0) {
    vec2 p = vec2(gl_FragCoord.x, uR.y - gl_FragCoord.y);
    vec4 w = texture(uW, vec2(clamp(length(p - uWC.xy) / uWC.z, 0.0, 1.0) * (255.0 / 256.0) + 0.5 / 256.0, 0.5));
    c = mix(c, vec3(sl(c.r, w.r), sl(c.g, w.g), sl(c.b, w.b)), w.a * uWA);
  }
  if (uSC.x != 1.0) { float l = dot(c, vec3(0.3, 0.59, 0.11)); c = clamp(vec3(l) + (c - vec3(l)) * uSC.x, 0.0, 1.0); }
  if (uSC.y > 1.0) { vec3 ov = mix(2.0 * c * c, 1.0 - 2.0 * (1.0 - c) * (1.0 - c), step(0.5, c)); c = mix(c, ov, uSC.y - 1.0); }
  else if (uSC.y < 1.0) c = mix(vec3(0.5), c, uSC.y);
  o = vec4(c, 1.0);
}`;

// ───────── 顏色字串 → [r, g, b, a]（0～1），常用的存起來 ─────────
const colCache = new Map();
const NAMED = { white:[1, 1, 1, 1], black:[0, 0, 0, 1], transparent:[0, 0, 0, 0] };
function parseColor(s){
  let c = colCache.get(s); if (c) return c;
  if (colCache.size > 4096) colCache.clear();
  const t = String(s).trim().toLowerCase();
  if (t[0] === '#') {
    let h = t.slice(1); if (h.length === 3 || h.length === 4) h = h.split('').map(x => x + x).join('');
    const n = parseInt(h.slice(0, 6), 16); c = [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255, h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1];
  } else if (t.startsWith('rgb')) {
    const m = t.match(/[\d.]+%?/g) || [];
    c = [0, 1, 2].map(i => Math.min(255, +String(m[i] || 0).replace('%', '')) / 255); c.push(m[3] != null ? Math.max(0, Math.min(1, parseFloat(m[3]))) : 1);
  } else c = NAMED[t] || [0, 0, 0, 1];
  colCache.set(s, c);
  return c;
}

// ───────── 建立 ─────────
// host：原本的 #cv。另外做一張同位置的畫布給 WebGL 畫（不接手點擊，點擊照舊在 #cv 上）；
// 這樣 WebGL 失效時 #cv 還沒被拿去用，可以直接換回 Canvas 2D
G.create = function(host, opt){
  let cvs = null, gl = null;
  try {
    cvs = document.createElement('canvas'); cvs.className = 'cvgl';
    cvs.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none';
    gl = cvs.getContext('webgl2', { alpha:false, antialias:true, depth:!!(opt && opt.depth), stencil:false, premultipliedAlpha:true, preserveDrawingBuffer:false, powerPreference:'high-performance' });
    if (!gl) return null;
    const c = new Ctx(cvs, gl); c.hasDepth = !!(opt && opt.depth);
    if (!c.init()) return null;
    host.insertAdjacentElement('afterend', cvs);
    return c;
  } catch (e) { return null; }
};

function Ctx(canvas, gl){
  this.canvas = canvas; this.gl = gl; this.gpu = true; this.lost = false;
  this.buf = new ArrayBuffer(CAP * STRIDE); this.f32 = new Float32Array(this.buf); this.u32 = new Uint32Array(this.buf); this.u8 = new Uint8Array(this.buf);
  this.n = 0; this.slots = []; this.mode = 'source-over'; this.bound = []; this.zq = 0; this.hasDepth = false; this.now = 0; this.trimT = 0; this.bytes = 0;
  this.texs = new WeakMap(); this.grads = new Map(); this.texts = new Map(); this.list = new Set(); this.pages = []; this.pageOf = new Map();
  this.m = [1, 0, 0, 1, 0, 0]; this.stack = []; this.sp = 0;
  this.globalAlpha = 1; this.globalCompositeOperation = 'source-over'; this.fillStyle = '#000'; this.strokeStyle = '#000';
  this.lineWidth = 1; this.lineCap = 'butt'; this.lineJoin = 'miter'; this.font = '10px sans-serif'; this.textAlign = 'start'; this.textBaseline = 'alphabetic';
  this.uvs = null;   // 貼圖填色時每個路徑點自己的貼圖座標（一張圖＝1，跟路徑點同順序）：給了就不用圖案的變換算，見 P.fill
  this.px = new Float64Array(1024); this.pn = 0; this.subs = [0]; this.closed = [false]; this.cx = 0; this.cy = 0;   // 路徑：畫面像素座標
  this.st = { calls:0, batches:0, verts:0, uploads:0, frameBatches:0, frameCalls:0, frameVerts:0 };
  this.meas = document.createElement('canvas').getContext('2d');
  this.onLost = null; this.onRestored = null;
  const self = this;
  canvas.addEventListener('webglcontextlost', function(e){ e.preventDefault(); self.lost = true; if (self.onLost) self.onLost(); });
  canvas.addEventListener('webglcontextrestored', function(){ self.lost = false; self.texs = new WeakMap(); self.grads.clear(); self.texts.clear(); self.list.clear(); self.slots = []; self.n = 0; self.scr = null; self.bound = []; self.pages = []; self.pageOf.clear(); self.bytes = 0; if (self.init() && self.onRestored) self.onRestored(); });
}
const P = Ctx.prototype;

function compile(gl, vs, fs){
  const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return p;
}
P.init = function(){
  const gl = this.gl;
  if (gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) < SLOTS) return false;   // 同時綁不了 16 張（WebGL2 本來就保證有）：用 Canvas 2D
  try {
    this.prog = compile(gl, VS, FS); this.gprog = compile(gl, GVS, GFS);
  } catch (e) { return false; }
  const p = this.prog;
  this.vao = gl.createVertexArray(); gl.bindVertexArray(this.vao);
  this.vbo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo); gl.bufferData(gl.ARRAY_BUFFER, CAP * STRIDE, gl.STREAM_DRAW);
  const at = n => gl.getAttribLocation(p, n);
  gl.enableVertexAttribArray(at('aP')); gl.vertexAttribPointer(at('aP'), 2, gl.FLOAT, false, STRIDE, 0);
  gl.enableVertexAttribArray(at('aT')); gl.vertexAttribPointer(at('aT'), 2, gl.FLOAT, false, STRIDE, 8);
  gl.enableVertexAttribArray(at('aC')); gl.vertexAttribPointer(at('aC'), 4, gl.UNSIGNED_BYTE, true, STRIDE, 16);
  gl.enableVertexAttribArray(at('aS')); gl.vertexAttribPointer(at('aS'), 1, gl.UNSIGNED_BYTE, false, STRIDE, 20);
  gl.enableVertexAttribArray(at('aZ')); gl.vertexAttribPointer(at('aZ'), 1, gl.UNSIGNED_SHORT, true, STRIDE, 22);   // 遠近（立體地面試作才用；平常 0 = 最近、不比遠近）
  gl.useProgram(p);
  for (let i = 0; i < SLOTS; i++) gl.uniform1i(gl.getUniformLocation(p, 't' + i), i);
  this.uR = gl.getUniformLocation(p, 'uR');
  // 調色用的全螢幕三角形
  this.gvao = gl.createVertexArray(); gl.bindVertexArray(this.gvao);
  const gb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, gb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const ga = gl.getAttribLocation(this.gprog, 'aP'); gl.enableVertexAttribArray(ga); gl.vertexAttribPointer(ga, 2, gl.FLOAT, false, 8, 0);
  gl.useProgram(this.gprog);
  this.gu = {}; ['uS', 'uW', 'uR', 'uMul', 'uFog', 'uWA', 'uWC', 'uSC'].forEach(k => { this.gu[k] = gl.getUniformLocation(this.gprog, k); });
  gl.uniform1i(this.gu.uS, 0); gl.uniform1i(this.gu.uW, 1);
  if (this.hasDepth) {
    this.mprog = compile(gl, MVS, MFS); this.mvao = gl.createVertexArray(); gl.bindVertexArray(this.mvao);
    this.mvbo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.mvbo); this.mibo = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.mibo);
    const ma = n => gl.getAttribLocation(this.mprog, n);
    gl.enableVertexAttribArray(ma('aP')); gl.vertexAttribPointer(ma('aP'), 3, gl.FLOAT, false, 36, 0);
    gl.enableVertexAttribArray(ma('aU')); gl.vertexAttribPointer(ma('aU'), 2, gl.FLOAT, false, 36, 12);
    gl.enableVertexAttribArray(ma('aA')); gl.vertexAttribPointer(ma('aA'), 4, gl.FLOAT, false, 36, 20);
    gl.useProgram(this.mprog); this.mu = {}; ['tR', 'tG', 'tS', 'tP', 'tB', 'uSS', 'uRS', 'uFog', 'uFD', 'uK', 'uZ', 'uSoil', 'uGW', 'uFar'].forEach(k => { this.mu[k] = gl.getUniformLocation(this.mprog, k); });
    gl.uniform1i(this.mu.tR, 0); gl.uniform1i(this.mu.tG, 1); gl.uniform1i(this.mu.tS, 2); gl.uniform1i(this.mu.tP, 3); gl.uniform1i(this.mu.tB, 4);
  }
  gl.bindVertexArray(this.vao); gl.useProgram(this.prog);
  gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  this.white = this.upload(null, 's');
  this.mode = 'source-over'; this.scr = null;
  return true;
};

// ───────── 貼圖：每張圖（或畫布）傳上顯示卡一次。kind：s＝一般圖（有縮小版、邊緣不重複）、p＝重複的地面貼圖、g＝漸層 ─────────
P.upload = function(img, kind){
  const gl = this.gl, t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, kind !== 'u');
  if (!img) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
  else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  // 重複的地面貼圖也做縮小版（兩級之間線性混）：草地每個角自己的貼圖座標（trail.js grassUV）在急彎、斜著看過去的坡面上，畫面上下一個像素跨過十幾個貼圖像素，
  // 沒有縮小版時每一列各自跳著取樣，整片坡面變成一條條橫的亮暗細紋（2026-11-24 地面縫掃描：七星山 1100、1400…；Canvas 2D 自己會縮小，沒有這個問題）。
  // 不會斜著看的地方 trail.js 已經挑好縮小不到兩倍的那一級（texLevel），顯示卡用的還是那一級本身
  const rep = kind === 'p' || kind === 'm', mipm = (kind === 's' || rep) && img;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, kind === 'm' ? gl.MIRRORED_REPEAT : rep ? gl.REPEAT : gl.CLAMP_TO_EDGE);   // m：橫向鏡射重複（立體階梯的立面圖：圖左右兩邊接不起來，照原樣重複會在每一階兩端切出一塊顏色不一樣的方塊）
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, rep ? gl.REPEAT : gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mipm ? (rep ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR_MIPMAP_NEAREST) : gl.LINEAR);
  if (mipm) gl.generateMipmap(gl.TEXTURE_2D);
  this.st.uploads++;
  this.slots.length = 0; this.bound[0] = null;   // 綁定換過了：下一批重新綁
  return t;
};
const texBytes = (img, kind) => img ? img.width * img.height * 4 * (kind === 's' || kind === 'p' || kind === 'm' ? 4 / 3 : 1) : 4;
// 拿到某張圖的貼圖（沒有就傳上去）；圖的寬或高是 0（已經釋放）回 null。小張的一般圖放進圖集（e.at：在圖集裡的位置）
P.tex = function(img, kind){
  if (this.lost || !img || !img.width || !img.height) return null;
  let e = this.texs.get(img);
  if (!e) { e = {}; this.texs.set(img, e); }
  e.used = this.now;
  let t = e[kind];
  if (!t) {
    if (this.n) this.flush();
    if (kind === 's' && !img.noAtlas && img.width <= AT_CLS[AT_CLS.length - 1] && img.height <= AT_CLS[AT_CLS.length - 1]) { e.at = this.atPut(img); t = e.s = e.at.pg.t; }
    else { t = e[kind] = this.upload(img, kind); e['b' + kind] = texBytes(img, kind); this.bytes += e['b' + kind]; }
    e.w = img.width; e.h = img.height; this.list.add(img);
  }
  return t;
};
// 預先傳上去（trail.js 換山後每格花一點時間做，第一次看到時不會卡）
P.prep = function(img, rep){ this.tex(img, rep ? 'p' : 's'); };
// 畫布不用了：刪掉它的貼圖（trail.js 的 free() 會呼叫）
P.drop = function(img){
  const e = img && this.texs.get(img); if (!e) return;
  if (this.n) this.flush();
  if (e.at) { this.atFree(e.at); e.s = null; }
  for (const k of ['s', 'p', 'm', 'g', 'u']) if (e[k]) { this.gl.deleteTexture(e[k]); this.bytes -= e['b' + k] || 0; }
  this.texs.delete(img); this.list.delete(img); this.slots.length = 0;
};
// 卸下 age 毫秒以上沒畫到的貼圖（畫布、美術圖本身留著，再用到時重新傳上去；畫面不變）
P.trim = function(age){
  for (const img of this.list) { const e = this.texs.get(img); if (!e || this.now - e.used > age) this.drop(img); }
};
// ───────── 圖集 ─────────
// 一頁只放同一種大小的格子（格子 = 圖的大小級距 + 兩邊延伸），用完的格子放回去給下一張
P.atPut = function(img){
  const gl = this.gl, w = img.width, h = img.height, S = AT_CLS.find(s => w <= s && h <= s), C = S + AT_G * 2, PS = AT_PAGE[S], n = Math.floor(PS / C);
  let pg = this.pages.find(p => p.S === S && p.free.length);
  if (!pg) {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, PS, PS, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    pg = { t, S, C, P:PS, free:[], used:0, dirty:true };
    for (let i = n * n - 1; i >= 0; i--) pg.free.push(i);
    this.pages.push(pg); this.pageOf.set(t, pg); this.bytes += PS * PS * 4 * 4 / 3;
  }
  const i = pg.free.pop(), cx = (i % n) * C, cy = Math.floor(i / n) * C;
  // 先在一張小畫布上排好：圖放在 (AT_G, AT_G)，四邊最外一排像素往外延伸到整格（不平滑，照原像素）
  const st = this.stage || (this.stage = document.createElement('canvas'));
  if (st.width !== C) { st.width = C; st.height = C; }
  const g = st.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.imageSmoothingEnabled = false;   // 延伸的那幾條都畫在透明的地方：source-over 就是照原像素複製
  g.clearRect(0, 0, C, C); g.drawImage(img, AT_G, AT_G);
  g.drawImage(st, AT_G, AT_G, 1, h, 0, AT_G, AT_G, h);
  g.drawImage(st, AT_G + w - 1, AT_G, 1, h, AT_G + w, AT_G, C - AT_G - w, h);
  g.drawImage(st, 0, AT_G, C, 1, 0, 0, C, AT_G);
  g.drawImage(st, 0, AT_G + h - 1, C, 1, 0, AT_G + h, C, C - AT_G - h);
  gl.bindTexture(gl.TEXTURE_2D, pg.t);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, cx, cy, gl.RGBA, gl.UNSIGNED_BYTE, st);
  pg.used++; pg.dirty = true; this.st.uploads++;
  this.slots.length = 0; this.bound[0] = null;
  return { pg, i, x:cx + AT_G, y:cy + AT_G };
};
P.atFree = function(a){
  const pg = a.pg; pg.free.push(a.i); pg.used--;
  if (!pg.used) { this.gl.deleteTexture(pg.t); this.pages.splice(this.pages.indexOf(pg), 1); this.pageOf.delete(pg.t); this.bytes -= pg.P * pg.P * 4 * 4 / 3; this.slots.length = 0; }
};
// 這一批裡第幾張（沒有空位就先送出去）
P.slot = function(t){
  const s = this.slots;
  for (let i = 0; i < s.length; i++) if (s[i] === t) return i;
  if (s.length >= SLOTS) { this.flush(); }
  s.push(t); return s.length - 1;
};

// ───────── 一格的開始與送出 ─────────
P.begin = function(){
  if (this.lost) return false;
  const gl = this.gl, c = this.canvas;
  gl.viewport(0, 0, c.width, c.height);
  gl.bindVertexArray(this.vao); gl.useProgram(this.prog); gl.uniform2f(this.uR, c.width, c.height);
  gl.enable(gl.BLEND); this.setBlend('source-over');
  gl.clearColor(0, 0, 0, 1);
  if (this.hasDepth) { gl.disable(gl.DEPTH_TEST); gl.depthMask(true); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); } else gl.clear(gl.COLOR_BUFFER_BIT);
  this.zq = 0;
  this.n = 0; this.slots.length = 0; this.sp = 0;
  this.now = performance.now();
  if (this.now - this.trimT > TRIM_EVERY) { this.trimT = this.now; this.trim(TRIM_MS); }
  this.st.frameBatches = 0; this.st.frameCalls = 0; this.st.frameVerts = 0;
  this.setTransform(1, 0, 0, 1, 0, 0); this.globalAlpha = 1; this.globalCompositeOperation = 'source-over';
  return true;
};
P.setBlend = function(m){
  const gl = this.gl; this.mode = m;
  if (m === 'multiply') gl.blendFuncSeparate(gl.DST_COLOR, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);
  else if (m === 'screen') gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_COLOR, gl.ZERO, gl.ONE);
  else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);   // source-over；lighter 也用這個（頂點的不透明度給 0，顏色就是直接加上去）
};
P.flush = function(){
  const n = this.n; if (!n) return;
  this.n = 0;
  if (this.lost) { this.slots.length = 0; return; }
  const gl = this.gl, s = this.slots, bd = this.bound;
  // 圖集這一格以後有新圖放進去：重做縮小版（一頁一次）
  for (let i = 0; i < s.length; i++) { const pg = this.pageOf.get(s[i]); if (pg && pg.dirty) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, pg.t); gl.generateMipmap(gl.TEXTURE_2D); pg.dirty = false; bd[0] = pg.t; } }
  // 已經綁在那個位置的貼圖不重綁（驅動程式每次綁定都要花時間）
  let act = -1;
  for (let i = 0; i < s.length; i++) if (bd[i] !== s[i]) { gl.activeTexture(gl.TEXTURE0 + i); act = i; gl.bindTexture(gl.TEXTURE_2D, s[i]); bd[i] = s[i]; }
  if (act) gl.activeTexture(gl.TEXTURE0);
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.u8, 0, n * STRIDE);
  gl.drawArrays(gl.TRIANGLES, 0, n);
  this.st.batches++; this.st.frameBatches++; this.st.verts += n; this.st.frameVerts += n;
  // 綁定留著：下一批如果用到同幾張圖不用重新綁（slots 不清空，只在換圖滿了才換）
  if (s.length >= SLOTS) s.length = 0;
};
// 換混色方式：multiply、screen 要換顯示卡的設定（先送出前面的）；source-over、lighter 同一批
P.blendFor = function(){
  const g = this.globalCompositeOperation, m = g === 'multiply' || g === 'screen' ? g : 'source-over';
  if (m !== this.mode) { this.flush(); this.setBlend(m); }
  return g === 'lighter';
};
P.stats = function(){ const s = this.st; return { batches:s.frameBatches, calls:s.frameCalls, verts:s.frameVerts, textures:this.list.size, uploads:s.uploads, pages:this.pages.length, texMB:Math.round(this.bytes / 1048576) }; };

// ───────── 頂點 ─────────
// 顏色先乘上不透明度（premultiplied）；add：lighter（不透明度欄位給 0，混色時就變成直接加亮）
function pack(r, g, b, a, add){
  return ((r * a * 255 + 0.5) | 0) | (((g * a * 255 + 0.5) | 0) << 8) | (((b * a * 255 + 0.5) | 0) << 16) | ((add ? 0 : ((a * 255 + 0.5) | 0)) << 24) >>> 0;
}
P.room = function(k){ if (this.n + k > CAP) this.flush(); };
P.v = function(x, y, u, v, col, slot){
  const i = this.n++, f = i * 6, f32 = this.f32;
  f32[f] = x; f32[f + 1] = y; f32[f + 2] = u; f32[f + 3] = v; this.u32[f + 4] = col; this.u32[f + 5] = (slot | this.zq) >>> 0;
};

// ───────── 變換 ─────────
P.setTransform = function(a, b, c, d, e, f){ const m = this.m; if (typeof a === 'object') { b = a.b; c = a.c; d = a.d; e = a.e; f = a.f; a = a.a; } m[0] = a; m[1] = b; m[2] = c; m[3] = d; m[4] = e; m[5] = f; };
P.transform = function(a, b, c, d, e, f){ const m = this.m, A = m[0], B = m[1], C = m[2], D = m[3]; m[0] = A * a + C * b; m[1] = B * a + D * b; m[2] = A * c + C * d; m[3] = B * c + D * d; m[4] += A * e + C * f; m[5] += B * e + D * f; };
P.translate = function(x, y){ const m = this.m; m[4] += m[0] * x + m[2] * y; m[5] += m[1] * x + m[3] * y; };
P.scale = function(x, y){ const m = this.m; m[0] *= x; m[1] *= x; m[2] *= y; m[3] *= y; };
P.rotate = function(r){ const c = Math.cos(r), s = Math.sin(r); this.transform(c, s, -s, c, 0, 0); };
const KEYS = ['globalAlpha', 'globalCompositeOperation', 'fillStyle', 'strokeStyle', 'lineWidth', 'lineCap', 'lineJoin', 'font', 'textAlign', 'textBaseline'];
P.save = function(){
  const o = this.stack[this.sp] || (this.stack[this.sp] = { m:[0, 0, 0, 0, 0, 0] }); this.sp++;
  for (let i = 0; i < 6; i++) o.m[i] = this.m[i];
  for (let i = 0; i < KEYS.length; i++) o[KEYS[i]] = this[KEYS[i]];
};
P.restore = function(){
  if (!this.sp) return; const o = this.stack[--this.sp];
  for (let i = 0; i < 6; i++) this.m[i] = o.m[i];
  for (let i = 0; i < KEYS.length; i++) this[KEYS[i]] = o[KEYS[i]];
};
function scaleOf(m){ return Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])); }
// 反矩陣（畫面像素 → 使用者座標）
function inv(m, o){
  const det = m[0] * m[3] - m[1] * m[2]; if (!det) return false;
  const a = m[3] / det, b = -m[1] / det, c = -m[2] / det, d = m[0] / det;
  o[0] = a; o[1] = b; o[2] = c; o[3] = d; o[4] = -(a * m[4] + c * m[5]); o[5] = -(b * m[4] + d * m[5]);
  return true;
}
function mul(A, B, o){   // o = A·B（先 B 再 A）
  const a = A[0] * B[0] + A[2] * B[1], b = A[1] * B[0] + A[3] * B[1], c = A[0] * B[2] + A[2] * B[3], d = A[1] * B[2] + A[3] * B[3];
  const e = A[0] * B[4] + A[2] * B[5] + A[4], f = A[1] * B[4] + A[3] * B[5] + A[5];
  o[0] = a; o[1] = b; o[2] = c; o[3] = d; o[4] = e; o[5] = f; return o;
}
const TM = [0, 0, 0, 0, 0, 0], TI = [0, 0, 0, 0, 0, 0], TU = [0, 0, 0, 0, 0, 0];

// ───────── 貼圖填色（重複貼圖）、漸層 ─────────
function Pattern(img){ this.img = img; this.mt = [1, 0, 0, 1, 0, 0]; }
Pattern.prototype.setTransform = function(m){ const t = this.mt; if (!m) { t[0] = 1; t[1] = 0; t[2] = 0; t[3] = 1; t[4] = 0; t[5] = 0; return; } t[0] = m.a; t[1] = m.b; t[2] = m.c; t[3] = m.d; t[4] = m.e; t[5] = m.f; };
P.createPattern = function(img){ return img && img.width ? new Pattern(img) : null; };
function Grad(type, a){ this.type = type; this.a = a; this.stops = []; this.key = ''; }
Grad.prototype.addColorStop = function(o, c){ this.stops.push([o, c]); this.key = ''; };
P.createLinearGradient = function(x0, y0, x1, y1){ return new Grad('L', [x0, y0, x1, y1]); };
P.createRadialGradient = function(x0, y0, r0, x1, y1, r1){ return new Grad('R', [x0, y0, r0, x1, y1, r1]); };
// 漸層做成一張小貼圖（用 Canvas 2D 自己的漸層畫，顏色內插跟 2D 一模一樣）：直線漸層 256×1，放射漸層 256×256（中心在正中間、半徑 = 外圈）
P.gradTex = function(gd, unpre){
  if (!gd.key) gd.key = gd.type + (gd.type === 'R' ? (gd.a[2] / gd.a[5]).toFixed(4) : '') + JSON.stringify(gd.stops) + (unpre ? 'u' : '');
  let t = this.grads.get(gd.key);
  if (t) { this.grads.delete(gd.key); this.grads.set(gd.key, t); return t; }   // 最近用過的排到後面
  const R = gd.type === 'R', c = document.createElement('canvas'); c.width = 256; c.height = R ? 256 : 1;
  const g = c.getContext('2d'), gr = R ? g.createRadialGradient(128, 128, 128 * gd.a[2] / gd.a[5], 128, 128, 128) : g.createLinearGradient(0, 0, 256, 0);
  gd.stops.forEach(s => gr.addColorStop(s[0], s[1])); g.fillStyle = gr; g.fillRect(0, 0, 256, c.height);
  if (this.n) this.flush();
  t = this.upload(c, unpre ? 'u' : 'g');
  this.grads.set(gd.key, t);
  if (this.grads.size > 24) { const k = this.grads.keys().next().value; this.gl.deleteTexture(this.grads.get(k)); this.grads.delete(k); }   // 每格換顏色的漸層（例如沒有天空圖時的天空）不會一直累積
  return t;
};
// 這一筆的填法：純色回 null（顏色寫在 this.fc），貼圖或漸層回貼圖、並把「畫面像素 → 貼圖 uv」寫進 TU
P.style = function(s){
  const ga = this.globalAlpha;
  if (typeof s === 'string') {   // 同一個顏色、同樣的不透明度（地面一段一段常常連續好幾筆一樣）不重算
    if (s !== this.ls || ga !== this.lga || this.add !== this.la) { const c = parseColor(s); this.lc = pack(c[0], c[1], c[2], c[3] * ga, this.add); this.ls = s; this.lga = ga; this.la = this.add; }
    this.fc = this.lc; return null;
  }
  this.fc = pack(1, 1, 1, ga, this.add);
  if (s instanceof Pattern) {
    const t = this.tex(s.img, 'p'); if (!t) return null;
    // 畫面像素 → 圖案座標 = (目前變換 · 圖案變換)^-1，再除以圖的寬高
    if (!inv(mul(this.m, s.mt, TM), TI)) return null;
    const w = s.img.width, h = s.img.height;
    TU[0] = TI[0] / w; TU[1] = TI[1] / h; TU[2] = TI[2] / w; TU[3] = TI[3] / h; TU[4] = TI[4] / w; TU[5] = TI[5] / h;
    return t;
  }
  if (s instanceof Grad) {
    const t = this.gradTex(s, false); if (!inv(this.m, TI)) return null;
    const a = s.a;
    if (s.type === 'L') {   // t = ((x - x0)·dx + (y - y0)·dy) / |d|²
      const dx = a[2] - a[0], dy = a[3] - a[1], L = dx * dx + dy * dy || 1, kx = dx / L, ky = dy / L, k0 = -(a[0] * kx + a[1] * ky);
      TU[0] = kx * TI[0] + ky * TI[1]; TU[2] = kx * TI[2] + ky * TI[3]; TU[4] = kx * TI[4] + ky * TI[5] + k0; TU[1] = 0; TU[3] = 0; TU[5] = 0.5;
    } else {                // 貼圖蓋住 (中心 ± 外圈半徑)
      const r = a[5] * 2 || 1, ox = a[3] - a[5], oy = a[4] - a[5];
      TU[0] = TI[0] / r; TU[1] = TI[1] / r; TU[2] = TI[2] / r; TU[3] = TI[3] / r; TU[4] = (TI[4] - ox) / r; TU[5] = (TI[5] - oy) / r;
    }
    return t;
  }
  this.fc = pack(0, 0, 0, ga, this.add); return null;
};

// ───────── 填色、畫圖 ─────────
P.fillRect = function(x, y, w, h){
  this.st.calls++; this.st.frameCalls++;
  this.add = this.blendFor();
  const t = this.style(this.fillStyle), m = this.m;
  const x0 = m[0] * x + m[2] * y + m[4], y0 = m[1] * x + m[3] * y + m[5], ax = m[0] * w, ay = m[1] * w, bx = m[2] * h, by = m[3] * h;
  this.quad(x0, y0, x0 + ax, y0 + ay, x0 + ax + bx, y0 + ay + by, x0 + bx, y0 + by, t);
};
// 要寫 k 個頂點：先確定這一批放得下（放不下先送出），再決定用第幾張貼圖（t 沒有＝純色）
P.open = function(k, t){ if (this.n + k > CAP) this.flush(); this.ts = t ? this.slot(t) : SOLID; };
// 寫一個頂點：顏色 this.fc；有貼圖時 uv 用 TU 從畫面像素算
P.pv = function(x, y){
  const f = (this.n++) * 6, f32 = this.f32, s = this.ts;
  f32[f] = x; f32[f + 1] = y;
  if (s === SOLID) { f32[f + 2] = 0; f32[f + 3] = 0; } else { f32[f + 2] = TU[0] * x + TU[2] * y + TU[4]; f32[f + 3] = TU[1] * x + TU[3] * y + TU[5]; }
  this.u32[f + 4] = this.fc; this.u32[f + 5] = (s | this.zq) >>> 0;
};
// 路徑第 p / 2 個點：貼圖座標用 uv 同一個位置的（P.fill 給了 uvs 時）
P.pt2 = function(px, uv, p){
  const f = (this.n++) * 6, f32 = this.f32;
  f32[f] = px[p]; f32[f + 1] = px[p + 1]; f32[f + 2] = uv[p]; f32[f + 3] = uv[p + 1]; this.u32[f + 4] = this.fc; this.u32[f + 5] = (this.ts | this.zq) >>> 0;
};
// 四個畫面像素角（依序）畫成兩個三角形
P.quad = function(x0, y0, x1, y1, x2, y2, x3, y3, t){
  this.open(6, t);
  this.pv(x0, y0); this.pv(x1, y1); this.pv(x2, y2); this.pv(x0, y0); this.pv(x2, y2); this.pv(x3, y3);
};
P.drawImage = function(img, a, b, c, d, e, f, g, h){
  if (!img) return;
  this.st.calls++; this.st.frameCalls++;
  const iw = img.width, ih = img.height; if (!iw || !ih) return;
  let sx = 0, sy = 0, sw = iw, sh = ih, dx, dy, dw, dh;
  if (e !== undefined) { sx = a; sy = b; sw = c; sh = d; dx = e; dy = f; dw = g; dh = h; }
  else if (c !== undefined) { dx = a; dy = b; dw = c; dh = d; }
  else { dx = a; dy = b; dw = iw; dh = ih; }
  if (!(this.globalAlpha > 0)) return;
  const add = this.blendFor(), t = this.tex(img, 's'); if (!t) return;
  if (this.n + 6 > CAP) this.flush();
  const col = pack(1, 1, 1, this.globalAlpha, add), s = this.slot(t), m = this.m, at = this.texs.get(img).at;
  let u0, v0, u1, v1;
  if (at) { const P = at.pg.P; u0 = (at.x + sx) / P; v0 = (at.y + sy) / P; u1 = (at.x + sx + sw) / P; v1 = (at.y + sy + sh) / P; }   // 圖集：換算成在整頁裡的位置
  else { u0 = sx / iw; v0 = sy / ih; u1 = (sx + sw) / iw; v1 = (sy + sh) / ih; }
  const x0 = m[0] * dx + m[2] * dy + m[4], y0 = m[1] * dx + m[3] * dy + m[5], ax = m[0] * dw, ay = m[1] * dw, bx = m[2] * dh, by = m[3] * dh;
  this.v(x0, y0, u0, v0, col, s); this.v(x0 + ax, y0 + ay, u1, v0, col, s); this.v(x0 + ax + bx, y0 + ay + by, u1, v1, col, s);
  this.v(x0, y0, u0, v0, col, s); this.v(x0 + ax + bx, y0 + ay + by, u1, v1, col, s); this.v(x0 + bx, y0 + by, u0, v1, col, s);
};

// ───────── 路徑（存畫面像素座標；曲線、圓弧照大小切成折線） ─────────
P.beginPath = function(){ this.pn = 0; this.subs.length = 1; this.subs[0] = 0; this.closed.length = 1; this.closed[0] = false; };
P.pt = function(x, y){
  if (this.pn + 2 > this.px.length) { const n = new Float64Array(this.px.length * 2); n.set(this.px); this.px = n; }
  const m = this.m; this.px[this.pn++] = m[0] * x + m[2] * y + m[4]; this.px[this.pn++] = m[1] * x + m[3] * y + m[5];
  this.cx = x; this.cy = y;
};
P.moveTo = function(x, y){
  const L = this.subs.length - 1;
  if (this.pn > this.subs[L]) { this.subs.push(this.pn); this.closed.push(false); }
  this.pt(x, y);
};
P.lineTo = function(x, y){ if (this.pn === this.subs[this.subs.length - 1]) { this.pt(x, y); return; } this.pt(x, y); };
P.closePath = function(){
  const L = this.subs.length - 1; if (this.pn === this.subs[L]) return;
  this.closed[L] = true;
  const x = this.px[this.subs[L]], y = this.px[this.subs[L] + 1];
  this.subs.push(this.pn); this.closed.push(false);
  // 下一段從起點接著畫（Canvas 的規則）：記在使用者座標
  inv(this.m, TI); this.cx = TI[0] * x + TI[2] * y + TI[4]; this.cy = TI[1] * x + TI[3] * y + TI[5];
};
function segs(lenPx, lo, hi){ return Math.max(lo, Math.min(hi, Math.ceil(Math.sqrt(Math.max(0, lenPx)) * 1.2))); }
P.quadraticCurveTo = function(qx, qy, x, y){
  const x0 = this.cx, y0 = this.cy, k = scaleOf(this.m), n = segs((Math.hypot(qx - x0, qy - y0) + Math.hypot(x - qx, y - qy)) * k, 4, 32);
  if (this.pn === this.subs[this.subs.length - 1]) this.pt(x0, y0);
  for (let i = 1; i <= n; i++) { const t = i / n, u = 1 - t; this.pt(u * u * x0 + 2 * u * t * qx + t * t * x, u * u * y0 + 2 * u * t * qy + t * t * y); }
};
P.bezierCurveTo = function(ax, ay, bx, by, x, y){
  const x0 = this.cx, y0 = this.cy, k = scaleOf(this.m), n = segs((Math.hypot(ax - x0, ay - y0) + Math.hypot(bx - ax, by - ay) + Math.hypot(x - bx, y - by)) * k, 4, 40);
  if (this.pn === this.subs[this.subs.length - 1]) this.pt(x0, y0);
  for (let i = 1; i <= n; i++) { const t = i / n, u = 1 - t; this.pt(u * u * u * x0 + 3 * u * u * t * ax + 3 * u * t * t * bx + t * t * t * x, u * u * u * y0 + 3 * u * u * t * ay + 3 * u * t * t * by + t * t * t * y); }
};
P.ellipse = function(x, y, rx, ry, rot, a0, a1, ccw){
  if (!(rx >= 0 && ry >= 0)) return;
  let sw = a1 - a0;
  const TAU = Math.PI * 2;
  if (!ccw) { if (sw >= TAU) sw = TAU; else if (sw < 0) sw = (sw % TAU) + TAU; }
  else { if (-sw >= TAU) sw = -TAU; else if (sw > 0) sw = (sw % TAU) - TAU; }
  const k = scaleOf(this.m), n = Math.max(4, Math.min(96, Math.ceil(Math.abs(sw) * Math.sqrt(Math.max(rx, ry) * k) * 0.9))), cr = Math.cos(rot || 0), sr = Math.sin(rot || 0);
  for (let i = 0; i <= n; i++) {
    const a = a0 + sw * i / n, ex = Math.cos(a) * rx, ey = Math.sin(a) * ry, px = x + ex * cr - ey * sr, py = y + ex * sr + ey * cr;
    if (i === 0 && this.pn === this.subs[this.subs.length - 1]) this.pt(px, py); else this.pt(px, py);
  }
};
P.arc = function(x, y, r, a0, a1, ccw){ this.ellipse(x, y, r, r, 0, a0, a1, ccw); };
P.rect = function(x, y, w, h){ this.moveTo(x, y); this.lineTo(x + w, y); this.lineTo(x + w, y + h); this.lineTo(x, y + h); this.closePath(); };
P.roundRect = function(x, y, w, h, r){
  r = Math.max(0, Math.min(Array.isArray(r) ? r[0] || 0 : r || 0, Math.abs(w) / 2, Math.abs(h) / 2));
  const H = Math.PI / 2;
  this.moveTo(x + r, y); this.lineTo(x + w - r, y); this.arc(x + w - r, y + r, r, -H, 0); this.lineTo(x + w, y + h - r); this.arc(x + w - r, y + h - r, r, 0, H);
  this.lineTo(x + r, y + h); this.arc(x + r, y + h - r, r, H, H * 2); this.lineTo(x, y + r); this.arc(x + r, y + r, r, H * 2, H * 3); this.closePath();
};
// 填滿：每一段子路徑各自切成三角形（四個點以內從第一點放射；更多點的從中心點放射：圓、橢圓、星星、愛心都是從中心看得到整圈）
P.fill = function(){
  this.st.calls++; this.st.frameCalls++;
  this.add = this.blendFor();
  const t = this.style(this.fillStyle), px = this.px, subs = this.subs, uv = this.uvs;
  for (let k = 0; k < subs.length; k++) {
    const a = subs[k], b = k + 1 < subs.length ? subs[k + 1] : this.pn, n = (b - a) >> 1;
    if (n < 3) continue;
    this.open(n * 3 + 3, t);
    if (uv && t && n <= 4) {   // 每個點自己的貼圖座標（從第一點放射）：相鄰兩塊共用的那條邊兩端座標一樣，貼圖沿著邊接得起來（一個仿射對不準整片高低不平的坡面）
      for (let i = 1; i < n - 1; i++) { this.pt2(px, uv, a); this.pt2(px, uv, a + i * 2); this.pt2(px, uv, a + i * 2 + 2); }
    } else if (n <= 4) {
      for (let i = 1; i < n - 1; i++) { this.pv(px[a], px[a + 1]); this.pv(px[a + i * 2], px[a + i * 2 + 1]); this.pv(px[a + i * 2 + 2], px[a + i * 2 + 3]); }
    } else {
      let mx = 0, my = 0; for (let i = a; i < b; i += 2) { mx += px[i]; my += px[i + 1]; } mx /= n; my /= n;
      for (let i = 0; i < n; i++) { const p = a + i * 2, q = a + ((i + 1) % n) * 2; this.pv(mx, my); this.pv(px[p], px[p + 1]); this.pv(px[q], px[q + 1]); }
    }
  }
};
// 描線：每一段畫成一條長方形；線比 2 像素粗時，轉角和兩端補圓（lineJoin、lineCap 是 round 時）
P.stroke = function(){
  this.st.calls++; this.st.frameCalls++;
  this.add = this.blendFor();
  const t = this.style(this.strokeStyle), w = this.lineWidth * scaleOf(this.m) * 0.5; if (!(w > 0)) return;
  const px = this.px, subs = this.subs, round = w > 1 && (this.lineCap === 'round' || this.lineJoin === 'round');
  for (let k = 0; k < subs.length; k++) {
    const a = subs[k], b = k + 1 < subs.length ? subs[k + 1] : this.pn, n = (b - a) >> 1;
    if (n < 2) continue;
    const cl = this.closed[k], segN = cl ? n : n - 1;
    for (let i = 0; i < segN; i++) {
      const p = a + i * 2, q = a + ((i + 1) % n) * 2, dx = px[q] - px[p], dy = px[q + 1] - px[p + 1], L = Math.hypot(dx, dy);
      if (L < 1e-6) continue;
      const nx = -dy / L * w, ny = dx / L * w;
      this.quad(px[p] + nx, px[p + 1] + ny, px[q] + nx, px[q + 1] + ny, px[q] - nx, px[q + 1] - ny, px[p] - nx, px[p + 1] - ny, t);
    }
    if (round) for (let i = cl ? 0 : 0; i < n; i++) { if (!cl && (i === 0 || i === n - 1) && this.lineCap !== 'round') continue; if (!cl && i > 0 && i < n - 1 && this.lineJoin !== 'round') continue; this.disc(px[a + i * 2], px[a + i * 2 + 1], w, t); }
  }
};
P.disc = function(x, y, r, t){
  const n = Math.max(6, Math.min(24, Math.ceil(Math.sqrt(r) * 4)));
  this.open(n * 3, t);
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, b = (i + 1) / n * Math.PI * 2; this.pv(x, y); this.pv(x + Math.cos(a) * r, y + Math.sin(a) * r); this.pv(x + Math.cos(b) * r, y + Math.sin(b) * r); }
};
P.strokeRect = function(x, y, w, h){ this.beginPath(); this.rect(x, y, w, h); this.stroke(); this.beginPath(); };

// ───────── 立體地面（試作）─────────
// 接下來畫的東西在離鏡頭 z 公尺的地方（0：最近，不會被地面擋住）；跟網格同一套遠近換算
P.depthAt = function(z){ this.zq = z > ZN ? (Math.max(0, Math.min(65535, Math.round(((ZF + ZN) / (ZF - ZN) - 2 * ZF * ZN / (ZF - ZN) / z) * 0.5 * 65535 + 0.5 * 65535))) << 16) >>> 0 : 0; };
// on：之後畫的東西要比遠近（被比較近的地面擋住，但不寫進遠近）；off：照舊一筆蓋一筆
P.depth3 = function(on){ if (!this.hasDepth || this.lost) return; this.flush(); const gl = this.gl; if (on) { gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(false); } else gl.disable(gl.DEPTH_TEST); };
// 畫一整片地形網格：m = { v:Float32Array（每點 9 個數）, nv, idx:Uint32Array, ni, road, grass（貼圖畫布）, rs:[路面橫, 路面縱, 草地橫, 草地縱]（每公尺幾張）,
//   k:[2F/W, 2F/H, 1−2·地平線/H], fog:[r,g,b,濃度], fd:[霧開始, 霧最濃]（公尺）, soil:[r,g,b] }
P.mesh = function(m){
  if (!this.hasDepth || this.lost) return;
  this.flush();
  const gl = this.gl, tR = this.tex(m.road, 'p'), tG = this.tex(m.grass, 'p'); if (!tR || !tG) return;
  gl.useProgram(this.mprog); gl.bindVertexArray(this.mvao);
  gl.bindBuffer(gl.ARRAY_BUFFER, this.mvbo); gl.bufferData(gl.ARRAY_BUFFER, m.v.subarray(0, m.nv * 9), gl.STREAM_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.mibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.idx.subarray(0, m.ni), gl.STREAM_DRAW);
  const tS = m.riser ? this.tex(m.riser, 'm') : null, tP = m.post ? this.tex(m.post, 'p') : null, tB = m.bar ? this.tex(m.bar, 'p') : null;   // 階梯立面、立體欄杆的圖（沒有就不用）
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tR); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tG);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, tS || this.white); gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, tP || this.white);
  gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, tB || this.white); gl.activeTexture(gl.TEXTURE0);
  const U = this.mu;
  gl.uniform4f(U.uRS, m.rs[0], m.rs[1], m.rs[2], m.rs[3]); gl.uniform2f(U.uSS, m.ss || 1, tS ? 1 : 0); gl.uniform3f(U.uK, m.k[0], m.k[1], m.k[2]); gl.uniform2f(U.uZ, (ZF + ZN) / (ZF - ZN), -2 * ZF * ZN / (ZF - ZN));
  gl.uniform4f(U.uFog, m.fog[0], m.fog[1], m.fog[2], m.fog[3]); gl.uniform2f(U.uFD, m.fd[0], m.fd[1]); gl.uniform3f(U.uSoil, m.soil[0], m.soil[1], m.soil[2]); gl.uniform1f(U.uGW, m.gw || 30); gl.uniform1f(U.uFar, m.far || 240);
  gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.depthMask(true); this.setBlend('source-over');
  gl.drawElements(gl.TRIANGLES, m.ni, gl.UNSIGNED_INT, 0);
  gl.depthMask(false); gl.disable(gl.DEPTH_TEST);
  this.st.frameBatches++; this.st.frameVerts += m.ni;
  gl.useProgram(this.prog); gl.bindVertexArray(this.vao); gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
  this.slots.length = 0; this.bound[0] = this.bound[1] = null;
};

// ───────── 文字：畫在一張小 2D 畫布上（內容一樣就重複用），再當圖貼上 ─────────
P.measureText = function(s){ this.meas.font = this.font; return this.meas.measureText(s); };
P.text = function(s, x, y, stroke){
  const k = Math.max(0.5, Math.round(scaleOf(this.m) * 4) / 4), style = stroke ? this.strokeStyle : this.fillStyle;
  if (typeof style !== 'string') return;
  const key = (stroke ? 'S' + this.lineWidth : 'F') + '|' + this.font + '|' + style + '|' + k + '|' + s;
  let e = this.texts.get(key);
  if (!e) {
    const g = this.meas; g.font = this.font;
    const mt = g.measureText(s), pad = Math.ceil((stroke ? this.lineWidth : 0) + 2), asc = Math.ceil(mt.actualBoundingBoxAscent || 12), dsc = Math.ceil(mt.actualBoundingBoxDescent || 4);
    const L = Math.ceil(mt.actualBoundingBoxLeft || 0), R = Math.ceil(mt.actualBoundingBoxRight || mt.width);
    const c = document.createElement('canvas'); c.noAtlas = true; c.width = Math.ceil((L + R + pad * 2) * k); c.height = Math.ceil((asc + dsc + pad * 2) * k);
    const cg = c.getContext('2d'); cg.scale(k, k); cg.font = this.font; cg.textAlign = 'left'; cg.textBaseline = 'alphabetic';
    if (stroke) { cg.lineWidth = this.lineWidth; cg.strokeStyle = style; cg.lineJoin = 'round'; cg.strokeText(s, L + pad, asc + pad); } else { cg.fillStyle = style; cg.fillText(s, L + pad, asc + pad); }
    e = { c:c, w:c.width / k, h:c.height / k, ox:L + pad, oy:asc + pad, mt:mt };
    if (this.texts.size > 64) { const k0 = this.texts.keys().next().value; this.drop(this.texts.get(k0).c); this.texts.delete(k0); }
    this.texts.set(key, e);
  }
  // 對齊：textAlign、textBaseline 換成左上角
  const mt = e.mt, ta = this.textAlign, tb = this.textBaseline;
  const ax = ta === 'center' ? mt.width / 2 : (ta === 'right' || ta === 'end') ? mt.width : 0;
  const ay = tb === 'middle' ? ((mt.fontBoundingBoxAscent || mt.actualBoundingBoxAscent || 0) - (mt.fontBoundingBoxDescent || mt.actualBoundingBoxDescent || 0)) / 2
    : tb === 'top' || tb === 'hanging' ? (mt.fontBoundingBoxAscent || mt.actualBoundingBoxAscent || 0) : tb === 'bottom' || tb === 'ideographic' ? -(mt.fontBoundingBoxDescent || mt.actualBoundingBoxDescent || 0) : 0;
  this.drawImage(e.c, x - ax - e.ox, y + ay - e.oy, e.w, e.h);
};
P.fillText = function(s, x, y){ this.text(String(s), x, y, false); };
P.strokeText = function(s, x, y){ this.text(String(s), x, y, true); };

// ───────── 整體調色：把畫好的畫面複製一份，一次全螢幕處理 ─────────
// mul：[r,g,b]（0～255，multiply）；fogA：霧的灰白（0～1，顏色 fogC）；warmA：午後暖光強度；warm：暖光的放射漸層（createRadialGradient 做的，中心、半徑照它）；dpr：漸層座標（CSS 像素）換成畫布像素的倍數
// sat、con：飽和度、對比（1＝不變；trail.js 從 js/look.js 照時間天氣算好傳進來）
P.grade = function(mulC, fogA, fogC, warmA, warm, dpr, sat, con){
  if (this.lost) return;
  sat = sat > 0 ? sat : 1; con = con > 0 ? con : 1;
  const doMul = mulC[0] < 250 || mulC[1] < 250 || mulC[2] < 250, doW = warmA > 0.01 && warm, doSC = Math.abs(sat - 1) > 0.004 || Math.abs(con - 1) > 0.004;
  if (!doMul && !(fogA > 0) && !doW && !doSC) return;
  this.flush();
  const gl = this.gl, cw = this.canvas.width, ch = this.canvas.height;
  if (!this.scr || this.scrW !== cw || this.scrH !== ch) {
    if (this.scr) gl.deleteTexture(this.scr);
    this.scr = gl.createTexture(); this.scrW = cw; this.scrH = ch;
    gl.bindTexture(gl.TEXTURE_2D, this.scr); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, cw, ch, 0, gl.RGB, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.scr);
  gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, cw, ch);
  // 暖光是從中心往外的放射漸層（內圈半徑 0）：顏色只跟「離中心多遠 ÷ 外圈半徑」有關，做成一條 256×1 的色帶，著色器自己算距離
  if (doW && !warm.ramp) { warm.ramp = new Grad('L', [0, 0, 1, 0]); warm.ramp.stops = warm.stops; }
  const wt = doW ? this.gradTex(warm.ramp, true) : this.white;
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, wt); gl.activeTexture(gl.TEXTURE0);
  gl.useProgram(this.gprog); gl.bindVertexArray(this.gvao); gl.disable(gl.BLEND);
  const U = this.gu, fc = parseColor(fogC || "#fff"), k = dpr || 1;
  gl.uniform2f(U.uR, cw, ch);
  gl.uniform3f(U.uMul, doMul ? (mulC[0] | 0) / 255 : 1, doMul ? (mulC[1] | 0) / 255 : 1, doMul ? (mulC[2] | 0) / 255 : 1);
  gl.uniform4f(U.uFog, fc[0], fc[1], fc[2], fogA > 0 ? fogA : 0);
  gl.uniform1f(U.uWA, doW ? warmA : 0);
  gl.uniform2f(U.uSC, doSC ? sat : 1, doSC ? con : 1);
  if (doW) { const a = warm.a; gl.uniform3f(U.uWC, a[3] * k, a[4] * k, a[5] * k); }   // 漸層座標是 CSS 像素，乘上目前的解析度倍數
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  this.st.frameBatches++; this.bound[0] = this.bound[1] = null;
  gl.enable(gl.BLEND); gl.useProgram(this.prog); gl.bindVertexArray(this.vao); this.setBlend('source-over');
  this.slots.length = 0;
};
})();

// 山行小日子：美術圖分組——每個畫面要解開哪些圖（只寫在這裡）
// js/art.js 照這裡決定要解開、要釋放哪些圖；tools/check.js 照這裡算每個畫面最多佔多少記憶體（iPhone 記憶體那條規則）
// 2026-11-24：以前開遊戲就把 157 張圖全部解開（約 470 MB），iPhone 很燙、很耗電，還差一點就整頁當掉。
// 現在只解開「現在這個畫面」用得到的圖，離開那個畫面一分鐘後放掉（登山客走路、爬階梯一直留著，每個畫面都看得到）
(function(){
'use strict';
const SX = window.SX = window.SX || {};
const G = SX.ART_GROUPS = {};
// 一直留著、不釋放：登山客平常走路、爬階梯（登山畫面、廣場都在畫）
G.WARM = /^hiker_(step8|stairs16)$/;
// 也會在網頁上顯示（<img>、樣式表、日記小圖示、新手教學）的圖：裁掉透明邊的版本只做一次存起來，
// 不在這個畫面也拿得到（js/art.js 的 A.url）。新的圖要放進網頁（SX.art.img / url）就加在這裡（tools/check.js 會檢查）
G.HTML = /^(gear_|gearme_|icon_coin$|face_|pet_[a-z]+_face$|emo_|wx_|icon_lock$|cairn$|hut_|note_|deck_view$|bench$|treasure_box$|hiker_walk$|sign_wood$|summit_marker$|map_pin$)/;
// 不畫在畫布上的圖：開遊戲的讀取畫面小柴犬（css 直接用檔案）、寵物大頭照（只在網頁上）
G.NONE = /^(shiba_run$|pet_[a-z]+_face$)/;
// 地圖：立體地圖、雲、路標、鎖頭、右上天氣小圖、登山口的人（下雨穿雨衣）＋帶著的寵物走路圖
const MAP = /^(map_|icon_lock$|wx_|hiker_(rain_)?walk$)/;
// 山友大廳：廣場背景、面向鏡頭／往旁邊走的人、坐下和打招呼的動作、頭上的表情
const LOBBY = /^(plaza_bg$|emo_|hiker_(front|side)_|hiker_(back_sit|bow|cheer|wave|hop4|rest)$)/;
// 登山畫面：除了只在地圖、大廳用的圖以外全部（路旁的景物、地面、天空、登山客所有動作、狀態臉、天氣小圖、疊石小遊戲的石頭）
// 天空四張都要：霧色是用四個時段天空圖地平線的顏色算的（trail.js setHaze），少一張霧色就變了
// 同山的山友打招呼會用廣場那套背對鏡頭的揮手、鞠躬、歡呼（trail.js drawMates），所以那幾張登山畫面也要
// 山腰步道（第 28 批：ground_dirt_leaf、ground_gravel、grass_tall_slope、canopy_branch、rock_wall_slope）也在登山畫面這組：只有 theme.contour 的山會畫到
const NOT_CLIMB = /^(map_|plaza_bg$|emo_|icon_lock$|hiker_(front|side)_|hiker_(rain_)?walk$)/;
// 寵物的圖：pet_<寵物>_…，柴犬還有第一批的 shiba_walk、shiba_sit；只解開帶著的寵物（和登山畫面上隊友帶的寵物）
const PET = /^pet_([a-z]+)_|^(shiba)_(walk|sit)$/;
// 雨衣版：只在下雨（或快要下雨）時解開
const RAIN = /_rain_/;
G.SCREENS = ['map', 'lobby', 'climb'];
// 這張圖在這個畫面要不要解開；pets：要哪些寵物的圖，rain：要不要雨衣版
G.on = function(screen, id, pets, rain){
  if (G.WARM.test(id)) return true;
  if (G.NONE.test(id)) return false;
  if (RAIN.test(id) && !rain) return false;
  const pm = id.match(PET);
  if (pm) { if ((pets || []).indexOf(pm[1] || pm[2]) < 0) return false; return screen === 'map' ? /_walk$/.test(id) : screen === 'climb'; }
  if (screen === 'map') return MAP.test(id);
  if (screen === 'lobby') return LOBBY.test(id);
  if (screen === 'climb') return !NOT_CLIMB.test(id);
  return false;
};
// 這張是不是寵物的圖（是的話回寵物 id）
G.petOf = function(id){ if (G.NONE.test(id)) return null; const pm = id.match(PET); return pm ? pm[1] || pm[2] : null; };
// all：manifest 裡開遊戲會用到的圖名（不含 lazy）；o：{ pets:[寵物 id], rain:true/false }
G.ids = function(screen, all, o){ o = o || {}; return all.filter(id => G.on(screen, id, o.pets || [], !!o.rain)); };
})();

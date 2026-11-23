// 山行小日子 — 遊戲資料
window.SX = window.SX || {};

// 每座山：經緯度（畫地圖用）、海拔、遊戲距離（公尺）、難度（飯糰數）、外觀主題
// theme.wall：[登山口, 山頂] 步道兩側被植物包住的程度（1＝森林綠色隧道、0.3＝高山稜線只剩矮箭竹）
// themeOver：同一山群的山沒寫 theme 時用主峰的，只想改幾項就寫在這裡（例如向陽山、三叉山看不到嘉明湖：{ lake:false }），在下面跟主峰的合併
SX.MOUNTAINS = [
  { id:'xiangshan', name:'象山', area:'台北', lon:121.576, lat:25.027, startAlt:40, alt:183, dist:1500, diff:1,
    feat:'城市高樓、步道石階、山頂六顆大石頭', end:'象山頂的六巨石',
    theme:{ sky:['#9fd3ee','#fbe7c6'], far:'#8fb3a8', mid:'#6fa86a', near:'#86c06a', trail:'stairs', wall:[1,0.85], tower:true, rocks:true } },
  { id:'qixing', name:'七星山', area:'陽明山', lon:121.555, lat:25.172, startAlt:780, alt:1120, dist:1650, diff:2,
    feat:'硫磺噴氣孔、整片芒草、火山口', end:'山頂三角點',
    theme:{ sky:['#a9d6e8','#f6e9cf'], far:'#9aae95', mid:'#8aa86a', near:'#b5c46e', trail:'dirt', wall:[0.9,0.35], steam:true, grass:true } },
  { id:'guanyin', name:'觀音山', area:'新北', lon:121.42, lat:25.135, startAlt:120, alt:616, dist:1563, diff:2,
    feat:'淡水河口夕陽、長長石階', end:'硬漢嶺觀景台',
    theme:{ sky:['#f3b98e','#fbe3c0'], far:'#9e9db8', mid:'#71a06a', near:'#8cbc6a', trail:'stairs', wall:[1,0.75], sunset:true } },
  { id:'matcha', name:'抹茶山', area:'宜蘭', lon:121.80, lat:24.84, startAlt:120, alt:720, dist:6000, diff:3,
    feat:'抹茶色草坡、雲霧繚繞、木棧道', end:'山頂草坡觀景處',
    theme:{ sky:['#bfe0e6','#eef2df'], far:'#9fbfae', mid:'#7fb874', near:'#a8d46e', trail:'wood', wall:[0.9,0.3], fog:true, grass:true } },
  { id:'alishan', name:'阿里山', area:'嘉義', lon:120.80, lat:23.51, startAlt:2150, alt:2489, dist:4000, diff:2,
    feat:'千年神木、小火車、日出雲海、櫻花', end:'祝山觀日平台',
    theme:{ sky:['#b4d8ee','#fde8d4'], far:'#8aa7a5', mid:'#4f8a62', near:'#6fae68', trail:'wood', wall:[1,1], bigtree:true, sakura:true } },
  { id:'taiping', name:'太平山', area:'宜蘭', lon:121.53, lat:24.50, startAlt:1890, alt:2000, dist:2200, diff:2,
    feat:'觀雲棧道、見晴懷古步道的舊運材鐵軌、檜木林和雲霧', end:'見晴懷古步道終點',
    theme:{ sky:['#b5d4e0','#eef0e0'], far:'#8faaa3', mid:'#4b7f5d', near:'#6aa665', trail:'wood', wall:[1,1], fog:true, bigtree:true } },
  // 合歡群峰：group 是山群代號（地圖上合成一根旗子，見 SX.GROUPS）；baiyue:true 是百岳，海拔和排名從百岳帳拿（見 SX.BAIYUE）
  // 同一山群沒寫 theme 的山，步道外觀用山群主峰的（在下面 SX.MOUNTAINS.forEach 補上，不另外抄一份）
  { id:'hehuan', name:'合歡主峰', group:'hehuan', baiyue:true, area:'南投', lon:121.27, lat:24.14, startAlt:3150, dist:1795, diff:3,
    feat:'高山杜鵑、滿天星空、冬天會下雪', end:'合歡主峰',
    theme:{ sky:['#7fb6e6','#e6f0f7'], far:'#8f9fb8', mid:'#7e9f78', near:'#a9bf72', trail:'dirt', wall:[0.5,0.35], snow:true, alpine:true } },
  { id:'hh_shimen', name:'石門山', group:'hehuan', baiyue:true, area:'南投', lon:121.287, lat:24.152, startAlt:3060, diff:1,
    feat:'公路旁最好親近的百岳、整片箭竹草坡、回頭就是合歡主峰', end:'石門山三角點' },
  { id:'hh_east', name:'合歡東峰', group:'hehuan', baiyue:true, area:'南投', lon:121.282, lat:24.137, startAlt:3100, diff:3,
    feat:'一路陡上的石階、回頭看松雪樓、東邊是奇萊連峰', end:'合歡東峰頂' },
  { id:'hh_north', name:'合歡北峰', group:'hehuan', baiyue:true, area:'南投', lon:121.262, lat:24.18, startAlt:3000, diff:3,
    feat:'之字形草坡、杜鵑花叢、山頂看奇萊和雪山', end:'合歡北峰三角點' },
  { id:'hh_west', name:'合歡西峰', group:'hehuan', baiyue:true, area:'南投', lon:121.237, lat:24.19, startAlt:3000, diff:4,
    feat:'翻過北峰、長長的箭竹稜線、上上下下好幾個鞍部', end:'合歡西峰三角點' },
  // 嘉明湖線：嘉明湖本身不是百岳（沒有 by），當山群的代表；山群裡的百岳是向陽山、三叉山
  { id:'jiaming', name:'嘉明湖', group:'jiaming', area:'台東', lon:121.02, lat:23.29, startAlt:2327, alt:3310, dist:13000, diff:4,
    feat:'天使的眼淚、高山草原、山羌出沒', end:'嘉明湖畔',
    theme:{ sky:['#78b2e4','#e3f0f6'], far:'#8f9fbc', mid:'#86a56e', near:'#b6c56e', trail:'dirt', wall:[0.6,0.3], alpine:true, lake:true, grass:true } },
  { id:'xiangyang', name:'向陽山', group:'jiaming', baiyue:true, area:'台東・高雄', lon:121.005, lat:23.282, startAlt:2327, diff:4,
    feat:'向陽大崩壁、紅檜松林、黑水塘', end:'向陽山', themeOver:{ lake:false } },
  { id:'sancha', name:'三叉山', group:'jiaming', baiyue:true, area:'台東・花蓮', lon:121.028, lat:23.30, startAlt:2327, diff:5,
    feat:'一等三角點、無邊草原、遠望嘉明湖', end:'三叉山一等三角點', themeOver:{ lake:false } },
  // 雪主東：雪山主峰＋雪山東峰
  { id:'xueshan', name:'雪山主峰', group:'xueshan', baiyue:true, area:'台中', lon:121.23, lat:24.38, startAlt:2140, dist:10900, diff:5,
    feat:'黑森林、雪山圈谷、冰河地形', end:'雪山主峰',
    theme:{ sky:['#6faae0','#e4eef6'], far:'#8a96b6', mid:'#3f6e58', near:'#93b06a', trail:'dirt', wall:[0.95,0.3], snow:true, alpine:true } },
  { id:'xueshan_east', name:'雪山東峰', group:'xueshan', baiyue:true, area:'台中', lon:121.255, lat:24.388, startAlt:2140, diff:4,
    feat:'哭坡、七卡山莊、遠看聖稜線', end:'雪山東峰' },
  // 玉山群峰：主峰、前峰、西峰、北峰（B 級）、東峰（C+ 級，十峻之首）
  { id:'yushan', name:'玉山主峰', group:'yushan', baiyue:true, area:'嘉義・南投', lon:120.957, lat:23.47, startAlt:2610, dist:10900, diff:5,
    feat:'排雲山莊、碎石坡、主峰疊石', end:'玉山主峰',
    theme:{ sky:['#5f9edc','#e2ecf5'], far:'#8790b2', mid:'#6f8f70', near:'#a7b07a', trail:'scree', wall:[0.6,0.3], snow:true, alpine:true } },
  { id:'yushan_front', name:'玉山前峰', group:'yushan', baiyue:true, area:'嘉義・南投', lon:120.913, lat:23.475, startAlt:2610, diff:4,
    feat:'前峰不前、碎石陡坡、俯看塔塔加', end:'玉山前峰' },
  { id:'yushan_west', name:'玉山西峰', group:'yushan', baiyue:true, area:'嘉義・南投', lon:120.925, lat:23.469, startAlt:2610, diff:5,
    feat:'冷杉林、路邊的小石龕、正面看主峰', end:'玉山西峰' },
  { id:'yushan_north', name:'玉山北峰', group:'yushan', baiyue:true, area:'南投', lon:120.96, lat:23.487, startAlt:2610, diff:5,
    feat:'玉山氣象站、看主峰最美的角度', end:'玉山北峰氣象站' },
  { id:'yushan_east', name:'玉山東峰', group:'yushan', baiyue:true, area:'南投', lon:120.967, lat:23.47, startAlt:2610, diff:5,
    feat:'十峻之首、岩壁攀爬、頭盔上陣', end:'玉山東峰' },
];
SX.M = {}; SX.MOUNTAINS.forEach(m => SX.M[m.id] = m);

// 山友便條（系統預寫）
SX.NOTES = [
  '今天老闆很煩，所以我背了半顆西瓜來爬山，誰都別想叫我回去。',
  '走到這裡腳有點抖，但風很涼，值得。',
  '霧好濃，聽著自己的腳步聲，突然沒那麼焦慮了。',
  '給後面的你：慢慢走沒關係，山不會跑掉。',
  '第一次穿藍白拖上山，被路過的阿伯稱讚很有勇氣（應該是稱讚吧）。',
  '剛剛有隻藍鵲對我叫，我決定把它當成加油。',
  '帶了電鍋上來才發現沒有插座，人生就是這樣。',
  '今天也有好好呼吸，幫自己蓋一個章。',
  '下山要去吃烤香腸，這是我繼續走的唯一動力。',
  '把煩惱留在這顆石頭下面，我先走了。',
  '如果你看到這張紙條，代表你今天也很努力。',
  '剛下過雨，石頭有點滑，大家小心喔。',
  '我媽說爬山會長高，我已經爬了二十年。',
  '這裡的風會把壞心情吹走，親測有效。',
  '背包裡的茶葉蛋還是溫的，幸福。',
  '今天一個人來，但好像也不太孤單。',
  '路邊的小花開了，記得抬頭也記得低頭。',
  '有人在前面的涼亭放了一顆橘子，謝謝陌生人。',
  '加班一整週，現在終於聽得到鳥叫聲。',
  '休息不是偷懶，是為了看更多風景。',
  '阿嬤的斗笠真的很好用，防曬又防雨。',
  '遇到下山的山友都說「快到了」，我已經聽了五次。',
  '這張便條是用最後一張衛生紙寫的，請珍惜。',
  '願你下山的時候，比上山的時候輕一點。',
  '我的膝蓋：「你確定？」我：「確定。」',
  '今天的雲很像一碗剉冰。',
  '把手機收起來十分鐘，世界還是好好的。',
  '山頂見！（如果我還走得動的話）',
];

// 隨口台詞
SX.LINES = {
  walk:['這段階梯在考驗我的膝蓋嗎','好想吃烤香腸','風好舒服～','腳步聲好療癒','慢慢走就好','前面好像有涼亭！','空氣是甜的','等下拍一張給阿嬤看'],
  rain:['下雨了，荷葉借我一下','雨聲好好聽','鞋子濕了也沒關係'],
  night:['星星好多','螢火蟲在幫我照路','晚上的山好安靜'],
  tired:['先瞇一下…','呼…休息一下下'],
  fog:['霧好濃，像在雲裡散步','看不到前面，那就看腳下'],
  snow:['下雪了！呼出來的氣都是白的','雪踩起來沙沙響','雪花落在帽子上了','手好冰，等下喝口熱茶'],
  seg:['到了！這一小段走得很棒','打個勾，下一站也慢慢走','原來走到這裡只要一下下','停一下看看，風景剛剛好','小小的一步，也是往山頂的一步'],   // 抵達「這次的小目標」時說的話
};

// 新手教學（地圖右上、登山畫面下方的「?」）：一頁一個主題，每條一兩行；icon 是美術圖名字
// intro:true 的那幾條也是第一次出發的玩法小卡、設定頁「操作小抄」的內容（只寫在這裡）
SX.TUTORIAL = [
  { title:'出發', items:[
    { icon:'icon_map', h:'怎麼開始', t:'在地圖點山上的木牌，看完介紹按「出發登山」。' },
    { icon:'hiker_walk', h:'自己會走', t:'放著不管，角色會照山友的步調自己走；關掉遊戲也會繼續走。', intro:true },
    { icon:'sign_wood', h:'長按走快', t:'長按畫面（或按住 W／↑）走快一點，但比較累。', intro:true } ] },
  { title:'體力與休息', items:[
    { icon:'face_tired', h:'體力與體溫', t:'走路會耗體力，冷會降體溫；見底就打瞌睡，坐下休息就補回來。' },
    { icon:'bench', h:'休息選單', t:'點長椅或觀景台坐下，能拍風景照、疊石許願、上傳照片；累了也可以按左下「休息」，在路邊坐下回體力。', intro:true },
    { icon:'summit_marker', h:'小目標', t:'畫面下方有個幾分鐘就到的小目標，走到常有明信片或寶物。' } ] },
  { title:'路上的驚喜', items:[
    { icon:'treasure_box', h:'奇遇與寶物', t:'路上會遇到奇遇，選一個回應看看；閃閃發亮的地方點一下，有寶物。' },
    { icon:'icon_lock', h:'一次一座山', t:'一次只能爬一座山。想換山要先下山，原本那座的進度會歸零。' },
    { icon:'map_pin', h:'百岳與分級', t:'百岳有官方分級 A、B、C、C+，先爬過簡單的，才能挑戰更難的。' } ] },
  { title:'收集與山友', items:[
    { icon:'badge_quest', h:'每日任務與徽章', t:'「每日」天天有新任務，完成就領寶物；徽章記下你走過的每一步。' },
    { icon:'icon_album', h:'相簿與集印帳', t:'每走 500 公尺自動拍拍立得；登頂在集印帳蓋章，百岳帳記下爬過的百岳。' },
    { icon:'emo_wave', h:'山友大廳', t:'在「大廳」取個暱稱，就能跟山友打招呼、加好友、邀請一起爬。' } ] },
];

// 台灣海岸線（經緯度），畫地圖用
SX.COAST = [
  [121.51,25.29],[121.62,25.23],[121.74,25.15],[121.90,25.11],[122.00,25.01],[121.92,24.92],[121.84,24.83],
  [121.82,24.70],[121.87,24.59],[121.80,24.40],[121.70,24.20],[121.62,24.02],[121.55,23.75],[121.50,23.50],
  [121.40,23.20],[121.30,22.95],[121.18,22.78],[121.02,22.55],[120.91,22.32],[120.86,22.05],[120.86,21.90],
  [120.74,21.94],[120.70,22.10],[120.60,22.35],[120.44,22.50],[120.28,22.62],[120.18,22.85],[120.10,23.05],
  [120.12,23.30],[120.17,23.50],[120.25,23.70],[120.35,23.95],[120.45,24.15],[120.62,24.40],[120.78,24.62],
  [120.92,24.83],[121.05,25.00],[121.22,25.10],[121.40,25.18],
];
SX.RIDGE = [[121.62,24.78],[121.40,24.55],[121.23,24.38],[121.27,24.14],[121.12,23.80],[120.96,23.47],[120.90,23.10],[120.82,22.70],[120.78,22.35]];

// ===== 第二階段資料：實地時間、路線、地標（dist 單位：公尺，recMin 單位：分鐘）=====
// recMin 為山友紀錄約略的「單程步行時間」，遊戲用 速度 = dist / (recMin*60)
SX.REC = {
  xiangshan: { recMin:35, recNote:'一般山友上山約 35 分鐘', dist:1500,
    route:[[0.30,0.93],[0.36,0.87],[0.33,0.81],[0.41,0.75],[0.46,0.70],[0.42,0.64],[0.50,0.58],[0.56,0.52],[0.52,0.46],[0.60,0.40],[0.66,0.34],[0.62,0.28],[0.70,0.21],[0.72,0.14],[0.66,0.07]],
    waypoints:[{m:0,name:'象山步道入口'},{m:600,name:'石階平台'},{m:1500,name:'象山頂的六巨石'}] },
  qixing: { recMin:60, recNote:'小油坑到七星主峰步道 1.65 公里，約 45 分鐘到 1 小時', dist:1650,
    route:[[0.20,0.92],[0.28,0.87],[0.34,0.83],[0.42,0.80],[0.48,0.74],[0.45,0.68],[0.52,0.63],[0.58,0.58],[0.55,0.52],[0.62,0.46],[0.60,0.40],[0.66,0.33],[0.62,0.26],[0.68,0.18],[0.64,0.10]],
    waypoints:[{m:0,name:'小油坑停車場'},{m:380,name:'硫磺噴氣區'},{m:850,name:'面天坪'},{m:1270,name:'七星東峰分岔'},{m:1650,name:'七星主峰三角點'}] },
  guanyin: { recMin:60, recNote:'硬漢嶺步道全長約 1.56 公里，一般約 1 小時到頂', dist:1563,
    route:[[0.18,0.94],[0.25,0.89],[0.30,0.84],[0.38,0.80],[0.42,0.74],[0.50,0.70],[0.48,0.63],[0.56,0.58],[0.60,0.52],[0.66,0.46],[0.70,0.40],[0.66,0.33],[0.74,0.27],[0.78,0.20],[0.72,0.12]],
    waypoints:[{m:0,name:'山腳登山口'},{m:500,name:'石階長坡'},{m:1000,name:'硬漢嶺岔路'},{m:1563,name:'硬漢嶺觀景台'}] },
  matcha: { recMin:200, recNote:'聖母登山步道上山約 3 小時 20 分', dist:6000,
    route:[[0.12,0.94],[0.20,0.90],[0.26,0.86],[0.34,0.84],[0.40,0.79],[0.36,0.73],[0.44,0.68],[0.50,0.64],[0.46,0.57],[0.54,0.52],[0.60,0.47],[0.56,0.40],[0.64,0.34],[0.70,0.28],[0.66,0.20],[0.72,0.12]],
    waypoints:[{m:0,name:'聖母登山步道入口'},{m:2200,name:'木棧道段'},{m:4500,name:'草坡觀景平台'},{m:4800,name:'聖母山莊'},{m:6000,name:'山頂草坡觀景處'}] },
  alishan: { recMin:50, recNote:'阿里山車站到祝山約 50 分鐘', dist:4000,
    route:[[0.14,0.92],[0.22,0.88],[0.30,0.86],[0.36,0.80],[0.44,0.78],[0.50,0.72],[0.46,0.65],[0.54,0.60],[0.62,0.56],[0.58,0.49],[0.66,0.43],[0.72,0.37],[0.68,0.30],[0.76,0.23],[0.80,0.14]],
    waypoints:[{m:0,name:'阿里山車站'},{m:1000,name:'沼平公園'},{m:2200,name:'神木群步道'},{m:3200,name:'眠月線分岔'},{m:4000,name:'祝山觀日平台'}] },
  taiping: { recMin:48, recNote:'觀雲棧道約 25 分鐘，接見晴懷古步道走到底約 23 分鐘', dist:2200,
    route:[[0.22,0.92],[0.30,0.88],[0.36,0.82],[0.44,0.80],[0.42,0.73],[0.50,0.68],[0.56,0.62],[0.52,0.55],[0.60,0.50],[0.66,0.44],[0.62,0.37],[0.70,0.30],[0.74,0.22],[0.70,0.14],[0.76,0.08]],
    waypoints:[{m:0,name:'見晴停車場'},{m:700,name:'觀雲棧道'},{m:1300,name:'見晴懷古步道入口'},{m:2200,name:'見晴懷古步道終點'}] },
  hehuan: { recMin:60, recNote:'武嶺到合歡主峰步道約 1.8 公里，來回約 2 小時，單程約 1 小時', dist:1795,
    route:[[0.20,0.92],[0.28,0.87],[0.34,0.82],[0.42,0.79],[0.48,0.73],[0.56,0.70],[0.52,0.63],[0.60,0.57],[0.66,0.50],[0.60,0.43],[0.68,0.36],[0.72,0.29],[0.66,0.22],[0.70,0.14],[0.64,0.07]],
    waypoints:[{m:0,name:'合歡山遊客中心'},{m:650,name:'杜鵑花徑'},{m:1200,name:'北峰岔路'},{m:1795,name:'合歡主峰'}] },
  hh_shimen: { recMin:30, recNote:'石門山步道約 784 公尺，來回約 1 小時、單程約 30 分鐘，路很短但空氣稀薄，慢慢走', dist:784,
    route:[[0.30,0.92],[0.38,0.84],[0.36,0.74],[0.46,0.66],[0.52,0.56],[0.48,0.46],[0.56,0.38],[0.62,0.28],[0.58,0.18],[0.64,0.09]],
    waypoints:[{m:0,name:'石門山登山口'},{m:300,name:'碎石步道'},{m:600,name:'箭竹草坡'},{m:784,name:'石門山三角點'}] },
  hh_east: { recMin:70, recNote:'松雪樓旁登山口上到東峰約 70 分鐘（下山約 50 分鐘），一路都是很陡的石階', dist:950,
    route:[[0.40,0.94],[0.44,0.86],[0.40,0.78],[0.46,0.70],[0.42,0.62],[0.48,0.54],[0.44,0.46],[0.50,0.38],[0.46,0.30],[0.52,0.22],[0.50,0.14],[0.54,0.07]],
    waypoints:[{m:0,name:'松雪樓旁登山口'},{m:300,name:'陡上石階'},{m:650,name:'碎石坡'},{m:800,name:'稜線觀景點'},{m:950,name:'合歡東峰頂'}] },
  hh_north: { recMin:120, recNote:'小風口登山口到北峰步道約 2.4 公里，來回約 4 小時、單程約 2 小時', dist:2387,
    route:[[0.24,0.93],[0.34,0.88],[0.28,0.81],[0.40,0.76],[0.32,0.69],[0.46,0.63],[0.38,0.56],[0.52,0.50],[0.46,0.42],[0.60,0.36],[0.56,0.27],[0.66,0.20],[0.70,0.11]],
    waypoints:[{m:0,name:'小風口登山口'},{m:700,name:'之字形草坡'},{m:1500,name:'杜鵑花叢'},{m:1900,name:'反射板'},{m:2387,name:'合歡北峰三角點'}] },
  hh_west: { recMin:330, recNote:'小風口經北峰走長長的稜線到西峰，單程約 5 個半小時（到北峰約 2 小時、再 3 個半小時），山友多半天還沒亮就出發', dist:6700,
    route:[[0.12,0.93],[0.20,0.86],[0.18,0.76],[0.26,0.68],[0.34,0.62],[0.42,0.60],[0.50,0.56],[0.58,0.52],[0.64,0.46],[0.70,0.40],[0.68,0.32],[0.76,0.26],[0.82,0.20],[0.80,0.12],[0.86,0.06]],
    waypoints:[{m:0,name:'小風口登山口'},{m:2387,name:'合歡北峰'},{m:3690,name:'華岡岔路'},{m:5160,name:'箭竹稜線鞍部'},{m:6700,name:'合歡西峰三角點'}] },
  jiaming: { recMin:700, recNote:'單程步行約 11 至 12 小時，多數山友兩天一夜', dist:13000,
    route:[[0.14,0.93],[0.22,0.89],[0.28,0.84],[0.36,0.82],[0.42,0.76],[0.50,0.74],[0.56,0.68],[0.52,0.61],[0.60,0.56],[0.66,0.50],[0.62,0.43],[0.70,0.37],[0.76,0.31],[0.70,0.24],[0.78,0.17],[0.84,0.10]],
    waypoints:[{m:0,name:'向陽登山口'},{m:4300,name:'向陽山屋'},{m:8400,name:'嘉明湖避難山屋'},{m:11700,name:'三叉山叉路'},{m:13000,name:'嘉明湖'}] },
  xiangyang: { recMin:330, recNote:'向陽登山口到向陽山約 5 個半小時', dist:8600,
    route:[[0.20,0.93],[0.28,0.87],[0.26,0.79],[0.34,0.72],[0.42,0.68],[0.40,0.60],[0.48,0.54],[0.56,0.50],[0.54,0.42],[0.62,0.36],[0.60,0.27],[0.66,0.19],[0.64,0.10]],
    waypoints:[{m:0,name:'向陽登山口'},{m:2200,name:'松林步道'},{m:4300,name:'向陽山屋'},{m:5800,name:'森林界線'},{m:7400,name:'向陽山叉路'},{m:8600,name:'向陽山'}] },
  sancha: { recMin:540, recNote:'向陽登山口到三叉山約 9 小時，多數山友住嘉明湖山屋', dist:11900,
    route:[[0.12,0.93],[0.20,0.88],[0.26,0.82],[0.34,0.79],[0.40,0.73],[0.48,0.70],[0.54,0.64],[0.52,0.56],[0.60,0.50],[0.68,0.46],[0.74,0.40],[0.72,0.31],[0.80,0.24],[0.86,0.16],[0.84,0.08]],
    waypoints:[{m:0,name:'向陽登山口'},{m:4300,name:'向陽山屋'},{m:7400,name:'向陽山叉路'},{m:8400,name:'嘉明湖避難山屋'},{m:11700,name:'三叉山叉路'},{m:11900,name:'三叉山一等三角點'}] },
  xueshan: { recMin:540, recNote:'雪山登山口到主峰約 9 小時，建議住 369 山莊', dist:10900,
    route:[[0.14,0.93],[0.22,0.88],[0.28,0.84],[0.36,0.80],[0.42,0.74],[0.48,0.70],[0.44,0.63],[0.54,0.60],[0.58,0.53],[0.52,0.46],[0.62,0.42],[0.68,0.35],[0.64,0.28],[0.72,0.21],[0.76,0.14],[0.70,0.07]],
    waypoints:[{m:0,name:'雪山登山口'},{m:2000,name:'七卡山莊'},{m:4000,name:'哭坡觀景台'},{m:5200,name:'雪山東峰'},{m:7000,name:'369 山莊'},{m:8000,name:'黑森林'},{m:9900,name:'圈谷'},{m:10900,name:'雪山主峰'}] },
  xueshan_east: { recMin:270, recNote:'雪山登山口到東峰約 4 個半小時，哭坡最累', dist:5200,
    route:[[0.30,0.93],[0.36,0.86],[0.32,0.78],[0.40,0.71],[0.46,0.64],[0.42,0.56],[0.50,0.49],[0.48,0.40],[0.56,0.33],[0.54,0.24],[0.60,0.16],[0.58,0.08]],
    waypoints:[{m:0,name:'雪山登山口'},{m:2000,name:'七卡山莊'},{m:2800,name:'哭坡起點'},{m:4000,name:'哭坡觀景台'},{m:5200,name:'雪山東峰'}] },
  yushan: { recMin:510, recNote:'塔塔加到玉山主峰約 8 至 9 小時，需住排雲山莊', dist:10900,
    route:[[0.18,0.93],[0.26,0.88],[0.32,0.84],[0.40,0.81],[0.46,0.76],[0.52,0.72],[0.48,0.66],[0.56,0.62],[0.62,0.57],[0.58,0.50],[0.66,0.45],[0.62,0.38],[0.70,0.32],[0.66,0.25],[0.72,0.18],[0.66,0.10],[0.70,0.05]],
    waypoints:[{m:0,name:'塔塔加登山口'},{m:1700,name:'孟祿亭'},{m:2700,name:'前峰登山口'},{m:4400,name:'白木林觀景台'},{m:6700,name:'大峭壁'},{m:8500,name:'排雲山莊'},{m:10500,name:'風口'},{m:10900,name:'玉山主峰'}] },
  yushan_front: { recMin:130, recNote:'塔塔加到前峰登山口約 1 小時 10 分，再上前峰約 1 小時，最後一段很陡', dist:3500,
    route:[[0.24,0.93],[0.32,0.86],[0.40,0.80],[0.46,0.73],[0.42,0.64],[0.50,0.56],[0.46,0.47],[0.54,0.39],[0.50,0.30],[0.56,0.21],[0.54,0.12]],
    waypoints:[{m:0,name:'塔塔加登山口'},{m:1700,name:'孟祿亭'},{m:2700,name:'前峰登山口'},{m:3200,name:'碎石陡坡'},{m:3500,name:'玉山前峰'}] },
  yushan_west: { recMin:480, recNote:'塔塔加經排雲山莊到西峰約 8 小時', dist:11500,
    route:[[0.62,0.93],[0.56,0.88],[0.62,0.82],[0.54,0.77],[0.58,0.70],[0.50,0.66],[0.54,0.59],[0.46,0.54],[0.42,0.47],[0.36,0.42],[0.32,0.35],[0.26,0.29],[0.28,0.21],[0.22,0.14],[0.24,0.07]],
    waypoints:[{m:0,name:'塔塔加登山口'},{m:2700,name:'前峰登山口'},{m:4400,name:'白木林觀景台'},{m:8500,name:'排雲山莊'},{m:10000,name:'西峰冷杉林'},{m:11200,name:'路邊的小石龕'},{m:11500,name:'玉山西峰'}] },
  yushan_north: { recMin:570, recNote:'經排雲、風口到北峰約 9 個半小時', dist:12000,
    route:[[0.18,0.93],[0.26,0.88],[0.32,0.84],[0.40,0.81],[0.46,0.76],[0.52,0.72],[0.48,0.66],[0.56,0.62],[0.62,0.57],[0.58,0.50],[0.66,0.45],[0.62,0.38],[0.60,0.30],[0.54,0.22],[0.50,0.14],[0.44,0.07]],
    waypoints:[{m:0,name:'塔塔加登山口'},{m:4400,name:'白木林觀景台'},{m:8500,name:'排雲山莊'},{m:10500,name:'風口'},{m:11500,name:'北峰碎石坡'},{m:12000,name:'玉山北峰氣象站'}] },
  yushan_east: { recMin:600, recNote:'經風口攀上東峰約 10 小時，岩壁要戴頭盔', dist:12000,
    route:[[0.18,0.93],[0.26,0.88],[0.32,0.84],[0.40,0.81],[0.46,0.76],[0.52,0.72],[0.48,0.66],[0.56,0.62],[0.62,0.57],[0.58,0.50],[0.66,0.45],[0.70,0.38],[0.76,0.31],[0.74,0.22],[0.80,0.14],[0.78,0.06]],
    waypoints:[{m:0,name:'塔塔加登山口'},{m:8500,name:'排雲山莊'},{m:10500,name:'風口'},{m:11000,name:'東峰叉路碎石坡'},{m:11600,name:'東峰岩溝'},{m:12000,name:'玉山東峰'}] },
};
// ===== 資料來源（設定頁「資料來源」只從這裡畫；每座山一定要有一筆，網址是官方頁面，或寫「未查到」）=====
// 步道長度、時間、海拔以官方公布為準；官方沒寫的欄位沿用山友紀錄（見 SX.REC），note 寫清楚哪些是官方、哪些不是
SX.NOSRC = '未查到';
SX.SOURCES = {
  main: [
    { name:'台灣國家公園入園入山線上申請', org:'臺灣登山申請一站式服務網', url:'https://hike.taiwan.gov.tw/web_index.aspx' },
    { name:'玉山國家公園管理處', org:'玉山群峰', url:'https://www.ysnp.gov.tw/' },
    { name:'雪霸國家公園管理處', org:'雪山', url:'https://www.spnp.gov.tw/' },
    { name:'太魯閣國家公園管理處', org:'合歡山', url:'https://www.taroko.gov.tw/' },
    { name:'陽明山國家公園管理處', org:'七星山', url:'https://www.ymsnp.gov.tw/' },
    { name:'林業及自然保育署', org:'台灣山林悠遊網：嘉明湖、合歡東峰、抹茶山、太平山、阿里山', url:'https://recreation.forest.gov.tw/' },
    { name:'交通部觀光署 北觀處', org:'觀音山硬漢嶺', url:'https://www.northguan-nsa.gov.tw/' },
    { name:'臺北旅遊網', org:'象山', url:'https://www.travel.taipei/' },
    { name:'官方版台灣百岳分級', org:'百岳的 A、B、C、C+ 分級與海拔' },
  ],
  credit: [
    { name:'Pixabay', org:'背景音樂與音效', url:'https://pixabay.com/' },
  ],
  // 每座山：url 是官方頁面或 SX.NOSRC；note 一句白話，說哪些數字用官方的
  mountain: {
    xiangshan: { url:'https://www.travel.taipei/en/attraction/details/564', note:'山頂海拔與全長取官方；上山時間官方沒寫單程，沿用山友紀錄' },
    qixing: { url:'https://www.ymsnp.gov.tw/main_ch/docDetail.aspx?uid=2149&pid=19&docid=11683&rn=-3889', note:'小油坑到主峰 1.65 公里、約 45 分鐘到 1 小時取官方' },
    guanyin: { url:'https://www.northguan-nsa.gov.tw/user/article.aspx?Lang=1&SNo=04006757', note:'硬漢嶺步道全長取官方；海拔沿用山友紀錄' },
    matcha: { url:'https://recreation.forest.gov.tw/Trail/RT?tr_id=009', note:'官方只寫聖母登山步道上段（1.6 公里），全程距離與時間沿用山友紀錄' },
    alishan: { url:'https://recreation.forest.gov.tw/forest/ra?typ_id=0500001', note:'祝山步道單程約 50 分鐘取官方；車站走到祝山的距離沿用山友紀錄' },
    taiping: { url:'https://recreation.forest.gov.tw/Trail/RT?tr_id=019', note:'見晴懷古步道 0.9 公里、海拔 1890～2000 公尺、時間取官方；觀雲棧道 1.3 公里' },
    hehuan: { url:'https://taroko.gov.tw/AttractionTrailContent.aspx?n=5701&s=50&sms=11275', note:'步道約 1.8 公里取官方；官方寫來回約 2 小時，單程取一半' },
    hh_shimen: { url:'https://hehuanline.forest.gov.tw/basic/?node=10198', note:'步道 784 公尺取官方；官方寫來回約 1 小時，單程取一半' },
    hh_east: { url:'https://recreation.forest.gov.tw/Trail/RT?tr_id=062', note:'步道 0.95 公里、上山約 70 分鐘、登山口海拔 3100 公尺取官方' },
    hh_north: { url:'https://hehuanline.forest.gov.tw/basic/?node=10198', note:'步道約 2.4 公里取官方；官方寫來回約 4 小時，單程取一半' },
    hh_west: { url:'https://www.taroko.gov.tw/AttractionTrailContent.aspx?s=53&n=5511&sms=11272', note:'步道 6.7 公里取官方；到北峰約 2 小時、再約 3 個半小時到西峰' },
    jiaming: { url:'https://recreation.forest.gov.tw/Trail/RT?tr_id=139', note:'全長 13 公里、各山屋里程、嘉明湖海拔取官方；單程總時間官方只寫分天行程，沿用山友紀錄' },
    xiangyang: { url:'https://recreation.forest.gov.tw/Trail/RT?tr_id=139', note:'向陽山叉路 7.4 公里取官方；山頂距離由官方第三天 10.8 公里行程推算；時間沿用山友紀錄' },
    sancha: { url:'https://recreation.forest.gov.tw/Trail/RT?tr_id=139', note:'各叉路里程取官方；三叉山本身的距離與時間沿用山友紀錄' },
    xueshan: { url:'https://hike.taiwan.gov.tw/information_1.aspx?c_id=21', note:'七卡山莊、三六九山莊海拔取官方；哭坡 4 公里、東峰 5.2 公里取雪霸官方里程；主峰單程時間官方沒寫，沿用山友紀錄' },
    xueshan_east: { url:'https://hike.taiwan.gov.tw/information_1.aspx?c_id=21', note:'東峰 5.2 公里取雪霸官方里程；單程時間官方沒寫，沿用山友紀錄' },
    yushan: { url:'https://www.ysnp.gov.tw/Trail/7fa5c242-df1a-4a8e-bcab-32dc55b1f7b6', note:'排雲山莊 8.5 公里、主峰再 2.4 公里、登山口 2610 公尺取官方；官方只寫單日往返 12 小時內，單程沿用山友紀錄' },
    yushan_front: { url:'https://www.ysnp.gov.tw/Trail/7fa5c242-df1a-4a8e-bcab-32dc55b1f7b6', note:'前峰登山口 2.7 公里、再 0.8 公里到前峰，官方分段時間 1 小時 10 分加 1 小時' },
    yushan_west: { url: SX.NOSRC, note:'官方沒公布西峰單獨的距離與時間，沿用山友紀錄' },
    yushan_north: { url: SX.NOSRC, note:'官方沒公布北峰單獨的距離與時間，沿用山友紀錄' },
    yushan_east: { url: SX.NOSRC, note:'官方沒公布東峰單獨的距離與時間，沿用山友紀錄' },
  },
};
// 山群：地圖上一根旗子、點開是「群峰」卡片。lead 是代表這個山群的山（旗子位置、步道外觀、解鎖規則都看它）
// 季節、奇遇、寶物掉落寫山群代號，就代表山群裡每一座山（一律用 SX.groupOf 判斷，不要把每座山的代號抄進去）
SX.GROUPS = [
  { id:'hehuan', name:'合歡山', full:'合歡群峰', lead:'hehuan' },
  { id:'yushan', name:'玉山', full:'玉山群峰', lead:'yushan' },
  { id:'xueshan', name:'雪山', full:'雪山・雪主東', lead:'xueshan' },
  { id:'jiaming', name:'嘉明湖', full:'嘉明湖・向陽三叉', lead:'jiaming' },
];
SX.GROUP = {}; SX.GROUPS.forEach(g => SX.GROUP[g.id] = g);
SX.groupOf = id => (SX.M[id] && SX.M[id].group) || id;          // 山 → 山群代號（不在山群裡的山就是自己）
SX.peaksOf = gid => SX.MOUNTAINS.filter(m => SX.groupOf(m.id) === gid);
SX.placeName = id => SX.GROUP[id] ? SX.GROUP[id].name : SX.M[id] ? SX.M[id].name : id;   // 山群用山群名，其他用山名
// ===== 百岳帳：台灣百岳 100 座（官方分級表，依完百路線分 23 個山群）=====
// 每列 [山名, 海拔, 官方分級]。海拔用內政部國土測繪中心 1/5000 像片基本圖的最新測量（整理自維基百科「臺灣百岳」列表的「最新測高」欄，2026-11 查）
// 排名不手寫：照海拔由高到低算出來（SX.BAIYUE 的 rank），數字改了排名自己跟著變
// 遊戲裡能爬的百岳在 SX.MOUNTAINS 寫 baiyue:true（名字要跟這裡一樣），海拔和排名都從這裡拿，不另外寫
SX.BAIYUE_GROUPS = [
  { name:'北一段', peaks:[['審馬陣山',3139.3,'A'],['南湖北山',3534.2,'B'],['南湖東峰',3639.4,'B'],['馬比杉山',3211,'C'],['南湖大山',3740.9,'B'],['南湖南峰',3504.9,'C'],['巴巴山',3448.2,'C'],['中央尖山',3697.7,'C+']] },
  { name:'北二段', peaks:[['閂山',3167.5,'A'],['鈴鳴山',3271.2,'B'],['無明山',3449.2,'C+'],['甘薯峰',3157.1,'C+']] },
  { name:'南一段', peaks:[['關山',3667.4,'C'],['海諾南山',3173.2,'C'],['小關山',3248.1,'C'],['卑南主山',3293.7,'C']] },
  { name:'南二段', peaks:[['八通關山',3335,'A'],['大水窟山',3642.6,'B'],['達芬尖山',3206.4,'C'],['塔芬山',3068.8,'C'],['雲峰',3561.8,'C'],['轆轆山',3279,'C'],['南雙頭山',3358.7,'C'],['三叉山',3494.6,'A'],['向陽山',3601.1,'A']] },
  { name:'南三段', peaks:[['無雙山',3242.8,'C+'],['東巒大山',3480.8,'C+'],['東郡大山',3617.2,'C+'],['內嶺爾山',3277.7,'C'],['義西請馬至山',3252,'C+'],['丹大山',3329,'C'],['六順山',3009.1,'B']] },
  { name:'馬博橫斷', peaks:[['秀姑巒山',3826.1,'B'],['馬博拉斯山',3774.6,'C+'],['馬利加南山',3560.9,'C+'],['盆駒山',3027,'C+'],['馬西山',3442.6,'C+'],['喀西帕南山',3276.6,'C+']] },
  { name:'能安縱走', peaks:[['能高山',3260.8,'C'],['能高南峰',3348.5,'C'],['光頭山',3066.8,'C'],['白石山',3106.5,'C'],['安東軍山',3066.5,'C']] },
  { name:'奇萊連峰', peaks:[['奇萊主峰',3560.4,'B'],['奇萊南峰',3357.3,'A'],['南華山',3181.6,'A']] },
  { name:'奇萊東稜', peaks:[['奇萊北峰',3605.6,'B'],['太魯閣大山',3282.3,'C+'],['立霧主山',3070.6,'C'],['帕托魯山',3102.1,'C'],['盤石山',3104.9,'C']] },
  { name:'合歡群峰', peaks:[['合歡主峰',3416.6,'A'],['合歡北峰',3421.8,'A'],['合歡西峰',3144.1,'A'],['合歡東峰',3419.3,'A'],['石門山',3235.9,'A']] },
  { name:'東台一霸', peaks:[['新康山',3339.9,'C'],['布拉克桑山',3020.9,'C']] },
  { name:'干卓萬山塊', peaks:[['干卓萬山',3281.8,'C'],['卓社大山',3368,'C'],['牧山',3239.3,'C'],['火山',3257.3,'C']] },
  { name:'玉山群峰', peaks:[['玉山主峰',3952.4,'A'],['玉山前峰',3233,'A'],['玉山西峰',3519.1,'A'],['玉山北峰',3854.9,'B'],['玉山東峰',3872.7,'C+'],['玉山南峰',3856.7,'C+'],['東小南山',3707.9,'C'],['南玉山',3380.8,'C'],['鹿山',2981.4,'C']] },
  { name:'巒郡', peaks:[['郡大山',3277.6,'A'],['巒大山',3084.9,'C+']] },
  { name:'雪山西南稜', peaks:[['大雪山',3529.6,'C'],['雪山主峰',3884.6,'A'],['中雪山',3172.4,'A'],['頭鷹山',3509.1,'C'],['火石山',3308.9,'C']] },
  { name:'雪北線', peaks:[['雪山東峰',3199,'A'],['雪山北峰',3703,'C+'],['志佳陽山',3290.8,'A']] },
  { name:'武陵四秀', peaks:[['桃山',3323.5,'A'],['喀拉業山',3132.5,'A'],['池有山',3300.2,'A'],['品田山',3527.9,'B']] },
  { name:'大小劍', peaks:[['大劍山',3593.3,'B'],['劍山',3256.5,'C'],['佳陽山',3313.7,'B']] },
  { name:'中橫三星', peaks:[['畢祿山',3369.9,'A'],['羊頭山',3032.8,'A'],['屏風山',3247.5,'B']] },
  { name:'南橫三星', peaks:[['庫哈諾辛山',3114,'A'],['塔關山',3218.5,'A'],['關山嶺山',3173.7,'A']] },
  { name:'大霸群峰', peaks:[['大霸尖山',3489.8,'A'],['小霸尖山',3418.9,'B'],['加利山',3111.9,'A'],['伊澤山',3296.3,'A']] },
  { name:'五嶽老么', peaks:[['北大武山',3089.1,'A']] },
  { name:'一支獨秀', peaks:[['白姑大山',3341.3,'B']] },
];
SX.BAIYUE = [];   // 攤平成一份（照排名），每座：{ rank, name, alt, grade, group }
SX.BAIYUE_GROUPS.forEach(g => g.peaks.forEach(p => SX.BAIYUE.push({ name:p[0], alt:p[1], grade:p[2], group:g.name })));
SX.BAIYUE.sort((a, b) => b.alt - a.alt).forEach((p, i) => p.rank = i + 1);   // 排名＝照海拔由高到低
SX.BY = {}; SX.BAIYUE.forEach(p => SX.BY[p.rank] = p);
SX.BYNAME = {}; SX.BAIYUE.forEach(p => SX.BYNAME[p.name] = p);
SX.MOUNTAINS.forEach(function(m){
  var r = SX.REC[m.id];
  if (r) Object.assign(m, r);
  var b = m.baiyue && SX.BYNAME[m.name];
  if (b) { m.by = b.rank; m.alt = b.alt; }   // 百岳的排名、海拔只寫在百岳帳
  if (!m.theme && m.group) m.theme = m.themeOver ? Object.assign({}, SX.M[SX.GROUP[m.group].lead].theme, m.themeOver) : SX.M[SX.GROUP[m.group].lead].theme;   // 同一山群共用主峰的步道外觀；themeOver 只改其中幾項
  if (!m.recMin) m.recMin = Math.max(20, Math.round(m.dist / 60));
  if (!m.recNote) m.recNote = '一般山友約 ' + m.recMin + ' 分鐘';
  if (!m.route) m.route = [[0.3,0.9],[0.5,0.5],[0.6,0.1]];
  if (!m.waypoints) m.waypoints = [{m:0,name:'登山口'},{m:m.dist,name:m.end}];
});
SX.rawSpeed = m => m.dist / (m.recMin * 60);   // 山友實際紀錄的步調（公尺／秒），還沒算體能
// 體能：登頂讓身體慢慢變強；太久不爬山會慢慢退步（狀態 cond）。體能的常數和算法只寫在這裡。
// fitness = 1 + 加成 × 狀態（加成最多 MAX - 1）。一座山的加成 = 第一次登頂（難度 + 1）× FIRST_PER_DIFF ＋ 算數的重複登頂次數 × 每次加成（難度 1～3 是 STEP_LOW、4～5 是 STEP_HIGH），
// 每座山最多算 REPEAT_MAX 次、每天最多算一次（台灣日期）；超過的照樣算登頂（徽章、紀錄），只是不再加體能。
// 狀態 cond：離上次打開超過 GRACE_DAYS 整天，之後每天 −DECAY_PER_DAY，最低 COND_MIN；打開遊戲的那天親自走滿 RECOVER_M 公尺就 +RECOVER（每天一次），最高 COND_MAX。離線補走不算運動。
// 存檔欄位：done（登頂次數）、fitRep（山 id → 算數的重複次數）、fitDay（山 id → 最後一次算數的日期）、cond、lastSeen
SX.FIT = { MAX:2, FIRST_PER_DIFF:0.001, STEP_LOW:0.001, STEP_HIGH:0.002, HIGH_DIFF:4, REPEAT_MAX:20, COND_MIN:0.6, COND_MAX:1, GRACE_DAYS:7, DECAY_PER_DAY:0.01, RECOVER:0.05, RECOVER_M:500 };
SX.twDay = (t = Date.now()) => new Date(t + 8 * 36e5).toISOString().slice(0, 10);   // 台灣日期（UTC+8）YYYY-MM-DD
SX.fitStep = m => m.diff >= SX.FIT.HIGH_DIFF ? SX.FIT.STEP_HIGH : SX.FIT.STEP_LOW;
SX.fitGain = (id, n, rep) => { const m = SX.M[id]; return m && n > 0 ? SX.FIT.FIRST_PER_DIFF * (m.diff + 1) + SX.fitStep(m) * Math.min(rep || 0, SX.FIT.REPEAT_MAX) : 0; };
SX.fitBonus = sv => Math.min(SX.FIT.MAX - 1, Object.keys(sv.done || {}).reduce((a, id) => a + SX.fitGain(id, sv.done[id], (sv.fitRep || {})[id]), 0));
SX.fitCond = sv => Math.min(SX.FIT.COND_MAX, Math.max(SX.FIT.COND_MIN, sv.cond == null ? SX.FIT.COND_MAX : sv.cond));
SX.fitness = sv => 1 + SX.fitBonus(sv || {}) * SX.fitCond(sv || {});
SX.fitCanCount = (sv, id, day) => ((sv.fitRep || {})[id] || 0) < SX.FIT.REPEAT_MAX && (sv.fitDay || {})[id] !== day;   // 這次重複登頂算不算數
SX.fitDecay = (cond, away) => Math.max(SX.FIT.COND_MIN, cond - SX.FIT.DECAY_PER_DAY * Math.max(0, away - SX.FIT.GRACE_DAYS));   // away：離上次打開隔了幾個整天
SX.fitRecover = cond => Math.min(SX.FIT.COND_MAX, cond + SX.FIT.RECOVER);
SX.fitSave = () => ({});   // 目前的存檔，game.js 開機後換成真的存檔
SX.baseSpeed = m => SX.rawSpeed(m) * SX.fitness(SX.fitSave());   // 登山客的步速（公尺／秒）= 山友步調 × 體能：遊戲關著時就照這個速度自己走；畫面、離線補走、預估時間都從這裡拿
// 一起爬：離線隊友大概走到哪。最後一次回報的距離＋步調×離開多久；離開時在休息或打瞌睡就停在原地；最多到山頂
// s：{ dist, rest, t（伺服器時間，毫秒）, pace（他的遊戲關著時走的速度，舊版沒有就用山友步調）}；now：伺服器時間
SX.mateGuess = function(m, s, now){
  const d0 = Math.min(m.dist, Math.max(0, +s.dist || 0));
  if (s.rest) return d0;
  const v = +s.pace > 0 ? +s.pace : SX.rawSpeed(m), sec = Math.max(0, (now - (+s.t || now)) / 1000);
  return Math.min(m.dist, d0 + v * sec);
};
// 地圖旗子：不在山群裡的山一座一根；山群只有一根（位置、難度看 lead，海拔用山群裡最高的）
SX.PINS = [];
SX.MOUNTAINS.forEach(m => {
  const g = m.group && SX.GROUP[m.group];
  if (!g) { SX.PINS.push(m); return; }
  if (SX.PINS.some(p => p.id === g.id)) return;
  const L = SX.M[g.lead];
  SX.PINS.push({ id:g.id, name:g.name, isGroup:true, area:L.area, lon:L.lon, lat:L.lat, diff:L.diff, dist:L.dist, alt:Math.max(...SX.peaksOf(g.id).map(p => p.alt)) });
});

// 官方登山分級（一般季節）：need 是要先登頂過哪一級（或更難）的百岳才開放
// 遊戲裡還沒有 need 那一級的百岳時，改看再下一級（SX.gradeNeed 算，例如還沒有 C 級的山，C+ 就先要 B 級）
// snowParty：雪季（SX.SEASONS 的 snow）要幾人以上組隊才能出發（跟真實入山申請一樣；寫在這裡一個地方，SX.permitNeed 讀它）
SX.GRADES = {
  'A':  { need:null, text:'一般健行路線：步道清楚、沒有危險地形，從當天來回到兩三天的都有' },
  'B':  { need:'A',  text:'中級縱走，大約 4～5 天，或 1～3 天但有危險地形' },
  'C':  { need:'B',  text:'高級縱走，大約 5 天以上' },
  'C+': { need:'C',  text:'高級縱走，有垂降和攀岩地形', snowParty:3 },
};
SX.GRADE_ORDER = ['A', 'B', 'C', 'C+'];
SX.gradeOf = id => { const m = SX.M[id], b = m && m.by && SX.BY[m.by]; return b ? b.grade : null; };   // 不是百岳的山沒有分級
// 這座山實際要先登頂哪一級：照 need 往下找，找到遊戲裡真的有山的那一級（不然玩家永遠解不開）
SX.gradeNeed = id => {
  const g = SX.gradeOf(id); let n = g ? SX.GRADES[g].need : null;
  while (n && !SX.MOUNTAINS.some(m => SX.gradeOf(m.id) === n)) n = SX.GRADES[n].need;
  return n;
};

// 寵物：柴柴起始即有，其餘為未來解鎖
SX.PETS = [
  { id:'shiba', name:'柴柴', desc:'毛茸茸的柴犬，最愛在涼亭曬太陽，腳步比你還穩。', unlocked:true },
  { id:'bear', name:'台灣黑熊', desc:'溫和的森林居民，果子、嫩葉、小蟲子都會吃。牠不會來搶你的午餐，你也別留食物給牠喔。', unlocked:false, unlockText:'累計登頂 5 次' },
  { id:'leopardcat', name:'石虎', desc:'夜行的小獵人，尾巴很長，眼睛會在草叢裡一閃一閃。', unlocked:false, unlockText:'在夜晚或清晨的步道上遇見過山羌' },
  { id:'magpie', name:'藍鵲', desc:'嗓門很大的報告員，遇到牠就知道前面有好天氣。', unlocked:false, unlockText:'在三座以上不同的山上撿到過紀念章' },
];

// 季節限定：照真實日期（台灣時間 UTC+8），from / to 是「月-日」，可以跨年（例如 10-01 到 03-31）
// mountains 是這個季節在哪幾座山；time 有寫的話只有那些時段才算（螢火蟲只在夜晚）
// 季節限定的寶物、奇遇在自己身上寫 season:'季節代號'，只有在季節內、在這些山上才會出現；錯過就要等明年
SX.SEASONS = [
  { id:'snow', name:'雪季', from:'01-01', to:'02-28', mountains:['hehuan','xueshan','yushan'] },
  { id:'sakura', name:'櫻花季', from:'02-01', to:'03-31', mountains:['alishan','taiping'] },
  { id:'rhodo', name:'杜鵑季', from:'04-01', to:'05-31', mountains:['hehuan','yushan','xueshan'] },
  { id:'firefly', name:'螢火蟲季', from:'04-01', to:'05-15', mountains:['xiangshan','qixing','guanyin','matcha'], time:['night'] },
  { id:'summer', name:'夏日雲瀑', from:'07-01', to:'08-31', mountains:['hehuan','taiping','alishan'] },
  { id:'maple', name:'楓紅芒草季', from:'10-15', to:'12-15', mountains:['qixing','matcha'] },
  { id:'cloudsea', name:'雲海季', from:'10-01', to:'03-31', mountains:['alishan','hehuan','jiaming','xueshan','yushan'] },
];
SX.SEASON = {}; SX.SEASONS.forEach(s => SX.SEASON[s.id] = s);
SX.mdNum = s => +s.replace('-', '');   // '03-31' → 331
// 這一天（台灣時間）正在進行的季節
SX.seasonsAt = function(d){
  const t = new Date(d.getTime() + 8 * 3600e3), md = (t.getUTCMonth() + 1) * 100 + t.getUTCDate();
  return SX.SEASONS.filter(s => { const a = SX.mdNum(s.from), b = SX.mdNum(s.to); return a <= b ? md >= a && md <= b : md >= a || md <= b; });
};
// 入山管制（只在這裡判斷）：這座山在這一天出發要幾人以上組隊；不用就回 null
// 雪季裡、分級有寫 snowParty 的山（C+）→ { minParty, reason }。卡片和出發（game.js 的 permitBlock）都只看這裡
SX.permitNeed = function(id, date){
  const g = SX.gradeOf(id), n = g && SX.GRADES[g].snowParty;
  if (!n || !SX.seasonsAt(date).some(s => s.id === 'snow' && s.mountains.includes(SX.groupOf(id)))) return null;
  return { minParty:n, reason:`雪季管制：要${'零一二三四五六七八九十'[n] || n}人以上組隊才能出發` };
};

// 隨機遭遇：where 可限制海拔比例（minFrac/maxFrac 0..1）、山、天氣(wx)、時段(time)；rare 為稀有遭遇
// where.mountains 寫山群代號（山群裡每座山都算）；只屬於山群裡某幾座山的故事寫 where.peaks（例如只有雪山主峰會經過黑森林）
SX.ENCOUNTERS = [
  { id:'e01', text:'迎面走來一位山友，笑著說：「加油！快到了！」', where:{}, choices:null },
  { id:'e02', text:'草叢裡傳來窸窣聲，一隻山羌探出頭來，又飛快縮了回去。', where:{ mountains:['alishan','taiping','hehuan','jiaming','xueshan','yushan'] }, choices:[
      { label:'安靜地站著等牠', result:'山羌慢慢走出來，吃了幾口草才離開，你心情好了起來。', effect:{ temp:1 } },
      { label:'拿出零食想餵牠', result:'山羌只是看了你一眼，走開了。野生動物不吃人的食物，下次記得。', effect:{ stam:-2 } } ] },
  { id:'e03', text:'樹上一群獼猴正在吃果子，牠們好奇地盯著你的背包。', where:{ mountains:['alishan','taiping','xiangshan','qixing'] }, choices:[
      { label:'保持距離，慢慢經過', result:'獼猴沒有搶東西，你輕鬆走了過去。', effect:{ temp:1 } },
      { label:'拿出零食吸引牠們', result:'一隻獼猴跳下來把你的水果搶走，你只能苦笑。', effect:{ stam:-3 } } ] },
  { id:'e04', text:'遠方的樹枝上停著一隻帝雉，尾羽在陽光下閃閃發亮。', where:{ mountains:['alishan','taiping','hehuan','xueshan','yushan'] }, wx:['clear','cloud'], rare:true, choices:[
      { label:'輕輕按下快門', result:'你拍到一張漂亮的照片，帝雉慢慢走進林子裡。', effect:{ photo:true } },
      { label:'靠近一點想看清楚', result:'帝雉被嚇到飛走了，你只能看著牠的背影。', effect:{ temp:-1 } } ] },
  { id:'e05', text:'一位阿伯遞來一顆茶葉蛋：「上山要吃飽，才會有力氣。」', where:{}, choices:[
      { label:'謝謝阿伯，收下來', result:'茶葉蛋還是溫的，你覺得全身都有力氣了。', effect:{ stam:15 } },
      { label:'婉拒，說自己有帶', result:'阿伯笑著點頭，說：「山上的人都很照顧彼此。」', effect:{ temp:1 } } ] },
  { id:'e06', text:'腳底一緊，小腿抽筋了！你慢慢蹲下來，把腳掌往自己的方向拉。', where:{ minFrac:0.4 }, choices:[
      { label:'慢慢拉筋，等它放鬆', result:'痠痛慢慢退去，你扶著樹站起來，繼續前進。', effect:{ stam:-5 } },
      { label:'硬撐著繼續走', result:'下一步差點滑倒，你還是乖乖停下來休息。', effect:{ stam:-10 } } ] },
  { id:'e07', text:'前方一位大哥在分西瓜，清涼的香氣飄了過來。', where:{ minFrac:0.2 }, choices:[
      { label:'接過一片，道謝', result:'一口下去，整個人都涼快了，大哥說下山再見。', effect:{ stam:12, temp:-2 } },
      { label:'微笑揮手，繼續走', result:'大哥豪邁地說：「下次記得來吃！」', effect:{ temp:1 } } ] },
  { id:'e08', text:'路邊有個被遺落的塑膠袋，裡面塞著空的零食袋。', where:{}, choices:[
      { label:'把垃圾收進口袋，帶下山', result:'你默默把垃圾帶回山下，心裡很踏實。', effect:{ temp:2, item:'t_clean_pledge' } },
      { label:'當作沒看到，繼續走', result:'你走了幾步，心裡還是有點過意不去。', effect:{} } ] },
  { id:'e09', text:'雲海突然從山谷裡翻湧上來，眼前一片白茫茫。', where:{ minFrac:0.5 }, wx:['fog','cloud'], choices:null },
  { id:'e10', text:'一陣大霧襲來，步道好像不見了，你停下腳步，仔細看路標。', where:{}, wx:['fog'], choices:[
      { label:'沿著步道標記慢慢找回去', result:'你找到了熟悉的紅白指示牌，鬆了一口氣。', effect:{ stam:-4 } },
      { label:'憑感覺直走', result:'還好你很快發現走錯了，乖乖折返。', effect:{ stam:-8 } } ] },
  { id:'e11', text:'鞋帶鬆了，你蹲下來重新綁好，聽見遠方傳來鳥叫聲。', where:{}, choices:null },
  { id:'e12', text:'山屋的管理員阿姨在曬棉被，招手叫你過去喝杯熱茶。', where:{ minFrac:0.6 }, choices:[
      { label:'坐下來喝茶聊天', result:'阿姨說了好多山上的故事，你覺得這趟值得了。', effect:{ stam:10, temp:2 } },
      { label:'禮貌地說趕時間', result:'阿姨說：「慢慢來，山不會跑掉。」', effect:{ temp:1 } } ] },
  { id:'e13', text:'有位挑夫扛著補給箱快步經過，還不忘對你點頭致意。', where:{ minFrac:0.4, mountains:['xueshan','yushan','jiaming'] }, choices:[
      { label:'側身讓路，讚嘆他的體力', result:'挑夫笑著說：「山裡的路，要一步一步走。」', effect:{ temp:2 } },
      { label:'想幫忙拿一點東西', result:'挑夫婉拒了，提醒你背重要量力而為。', effect:{ stam:-2 } } ] },
  { id:'e14', text:'肚子咕嚕咕嚕叫，你在涼亭裡煮了一碗泡麵，香味傳遍整個山頭。', where:{}, choices:[
      { label:'吃完泡麵，把湯喝光', result:'熱湯下肚，全身都暖了起來。', effect:{ stam:18, temp:3 } },
      { label:'吃完把包裝收好，帶下山', result:'幾隻鳥跳過來看了看，什麼也沒撿到，又飛回樹上找蟲吃。不留食物、垃圾全部帶走，就是對山上朋友最好的照顧。', effect:{ stam:8, temp:1 } } ] },
  { id:'e15', text:'一隻蝴蝶停在你的背包上，好像在搭便車。', where:{}, choices:null },
  { id:'e16', text:'附近傳來清脆的鳥鳴，你抬頭找了半天，卻只看見一片晃動的葉子。', where:{}, choices:null },
  { id:'e17', text:'突然下起雨，你趕緊拿出雨衣，雨滴打在葉子上，很好聽。', where:{}, wx:['rain'], choices:[
      { label:'停下來聽雨聲', result:'雨聲像一首慢歌，心情平靜了許多。', effect:{ temp:2 } },
      { label:'加快腳步趕路', result:'你溼了半身，但總算找到遮雨的地方。', effect:{ stam:-6 } } ] },
  { id:'e18', text:'一隻藍鵲從頭頂飛過，留下一聲響亮的叫聲。', where:{}, rare:true, choices:[
      { label:'拍下牠飛過的瞬間', result:'照片裡只留下一根藍色的羽毛影子，你笑了。', effect:{ photo:true } },
      { label:'朝牠揮揮手', result:'藍鵲在枝頭停下來看了你一眼，好像在回應你。', effect:{ temp:1 } } ] },
  { id:'e19', text:'步道旁有幾顆小石頭疊成的小塔，是路過的山友留下的。', where:{}, choices:[
      { label:'在上面再放一顆石頭', result:'小石塔更高了，好像也留下了你的一點祝福。', effect:{ item:'t_cairn_stone' } },
      { label:'靜靜欣賞，不動它', result:'小石塔很可愛，就讓它好好待在那裡。', effect:{ temp:1 } } ] },
  { id:'e20', text:'山頂的風很大，吹得你的帽子差點飛走。', where:{ minFrac:0.85 }, choices:[
      { label:'抓緊帽子，大笑起來', result:'風把煩惱都吹走了，身體輕了不少。', effect:{ temp:3 } },
      { label:'趕快找地方躲風', result:'你在岩石後面坐下，喝口水休息。', effect:{ stam:5 } } ] },
  { id:'e21', text:'一位小朋友在步道上跑來跑去，媽媽在後面大喊：「慢一點！」', where:{ maxFrac:0.3 }, choices:[
      { label:'笑著讓小朋友先過', result:'小朋友回頭對你揮手，你覺得整個人都變年輕了。', effect:{ temp:2 } },
      { label:'提醒小朋友注意腳下', result:'媽媽感謝你的提醒，小朋友乖乖慢下來。', effect:{ temp:1 } } ] },
  { id:'e22', text:'溪邊有塊平坦的大石頭，很適合坐下來歇歇。', where:{ minFrac:0.1, maxFrac:0.6 }, wx:['clear','cloud','fog'], choices:[
      { label:'坐下來曬曬太陽', result:'陽光灑在身上，你差點睡著了。', effect:{ stam:12, temp:1 } },
      { label:'泡一下腳', result:'溪水很涼，腳底的疲憊一下子消失了。', effect:{ stam:8, temp:2 } } ] },
  { id:'e23', text:'一位外國背包客迷路了，拿著地圖一臉困惑地看著你。', where:{}, choices:[
      { label:'指著路標，告訴他方向', result:'他開心地說了好幾次謝謝，還分你一顆糖。', effect:{ stam:4, temp:2, item:'t_thanks_postcard' } },
      { label:'說「我也不太熟」，一起找路', result:'你們一起找回步道，當了一段路的同伴。', effect:{ temp:3 } } ] },
  { id:'e24', text:'黃昏的光從山谷照上來，金色灑滿草坡，像一幅畫。', where:{ time:['dusk'] }, rare:true, choices:[
      { label:'拍一張夕陽照片', result:'你拍下了這個溫柔的傍晚。', effect:{ photo:true } },
      { label:'靜靜坐著，不拍照', result:'你看著光慢慢變淡，覺得很幸福。', effect:{ temp:3 } } ] },
  { id:'e25', text:'夜晚的步道上，螢火蟲在草叢間一閃一閃，像是在替你照路。', where:{ time:['night'] }, rare:true, choices:[
      { label:'關掉頭燈，安靜地走一段', result:'黑暗裡只剩螢火與星光，你覺得很安心。', effect:{ temp:2 } },
      { label:'拍一張照片留念', result:'照片裡的光點像散落的星星。', effect:{ photo:true } } ] },
  { id:'e26', text:'一片山櫻花瓣飄落在肩上，你忍不住停下來看了好久。', where:{ mountains:['alishan','taiping','hehuan'] }, choices:null },
  { id:'e27', text:'前方的步道被落石擋住了，幾位山友正在合力把石頭搬開。', where:{ minFrac:0.5 }, choices:[
      { label:'加入一起搬', result:'大家一起把路清開，你成了這段路的小英雄。', effect:{ stam:-6, temp:3 } },
      { label:'在旁邊幫忙指揮', result:'你幫忙看路，大家很快就把路清開了。', effect:{ temp:2 } } ] },
  { id:'e28', text:'手機沒有訊號，乾脆收起來，聽聽山的聲音。', where:{}, choices:[
      { label:'收起手機，聽風聲十分鐘', result:'世界還是好好的，你覺得很輕鬆。', effect:{ temp:2 } },
      { label:'拍下這一刻，傳給朋友', result:'朋友回你一句「好羨慕」，你笑著繼續走。', effect:{ photo:true } } ] },
  { id:'e29', text:'遠方山頭的雲忽然散開，露出清楚的稜線，像在對你打招呼。', where:{ minFrac:0.6 }, wx:['clear','cloud'], rare:true, choices:[
      { label:'停下來看很久', result:'這一刻，值得記很久。', effect:{ photo:true, temp:3 } } ] },
  { id:'e30', text:'路邊有一張被風吹來的舊明信片，上面寫著「下次一起來」。', where:{}, rare:true, choices:[
      { label:'小心收進背包', result:'你決定找機會替它寄出去。', effect:{ item:'t_hiker_postcard' } },
      { label:'留在原地，讓它繼續旅行', result:'明信片被風吹向遠方，你祝福它找到主人。', effect:{ temp:2 } } ] },
  { id:'e31', text:'腳底一滑，你趕緊扶住樹幹，心跳得很快。', where:{ minFrac:0.3 }, choices:[
      { label:'慢慢站穩，調整步伐', result:'你穩穩地踩在石頭上，鬆了一口氣。', effect:{ stam:-3 } },
      { label:'坐下來休息一下', result:'你深呼吸幾次，身體慢慢放鬆下來。', effect:{ stam:4 } } ] },
  { id:'e32', text:'涼亭裡一位爺爺正在下棋，熱情地招你過去坐。', where:{ mountains:['xiangshan','qixing','guanyin','alishan'] }, choices:[
      { label:'坐下來看他下棋', result:'爺爺贏了你一步，笑得好開心。', effect:{ temp:3 } },
      { label:'禮貌道謝，繼續走', result:'爺爺說：「下次再來找我下棋喔！」', effect:{ temp:1 } } ] },
  // 季節限定奇遇（season 見 SX.SEASONS，山與時段跟著季節走）
  { id:'es_sakura', season:'sakura', text:'一陣風吹過，整排山櫻花瓣像下雨一樣飄下來，步道一下子變成粉紅色。', where:{}, choices:[
      { label:'舉起相機，拍下櫻花雨', result:'按下快門時，花瓣剛好落在鏡頭前，好幸運的一張。', effect:{ item:'t_sakura_photo' } },
      { label:'站在花雨裡深呼吸', result:'空氣裡有淡淡的花香，你覺得心裡也開花了。', effect:{ temp:2, stam:5 } } ] },
  { id:'es_rhodo', season:'rhodo', text:'轉過一個彎，整片山坡開滿粉白色的玉山杜鵑，像一片花海。', where:{ minFrac:0.3 }, choices:[
      { label:'坐在步道邊看花', result:'蜜蜂在花間忙碌，你什麼都不想，只是看著。', effect:{ stam:10, temp:2 } },
      { label:'拍一張花海照片', result:'粉色和白色在照片裡一層一層地開著。', effect:{ photo:true } } ] },
  { id:'es_firefly', season:'firefly', text:'整片山谷亮起成千上萬的小光點，螢火蟲像是從天上掉下來的星星。', where:{}, rare:true, choices:[
      { label:'關掉頭燈，安靜地看', result:'光點在你身邊慢慢飄，你把這個晚上收進心裡的小瓶子。', effect:{ temp:3, item:'t_firefly_jar' } },
      { label:'壓低聲音，慢慢走過', result:'你小心不打擾牠們，光點一路陪你走了好遠。', effect:{ temp:2 } } ] },
  { id:'es_snow', season:'snow', text:'天空忽然飄下細細的白色顆粒，今年的第一場雪落在你的手套上。', where:{ minFrac:0.4 }, wxPref:['snow'], rare:true, choices:[
      { label:'伸手接住雪花', result:'雪花在手套上停了一下才融化，你看清楚了它六個角的形狀。', effect:{ temp:-1, photo:true } },
      { label:'拉緊外套，繼續往上', result:'雪踩起來沙沙響，你一步一步走得很穩。', effect:{ stam:-4, temp:-2 } } ] },
  // 極稀有奇遇：weight 是抽中的權重（一般 1、稀有 0.3），這幾個很小，玩很久才可能遇到一次
  { id:'e33', text:'遠遠的對面山坡上，一團黑影慢慢移動。是台灣黑熊！胸前的白色 V 字在陽光下很清楚。', where:{ minFrac:0.3, mountains:['taiping','jiaming','xueshan','yushan'] }, wx:['clear','cloud'], rare:true, weight:0.25, choices:[
      { label:'停在原地，用相機遠遠記錄', result:'黑熊抬頭聞了聞風，慢慢走進樹林。你的手還在發抖，但心裡很感動。', effect:{ photo:true, temp:3 } },
      { label:'輕聲說話，慢慢往後退', result:'黑熊知道有人在，安靜地繞開了。山裡的鄰居，彼此尊重就好。', effect:{ temp:2 } } ] },
  { id:'e34', text:'太陽在背後，濃霧在前方。霧裡出現你的影子，影子周圍有一圈彩虹光環，這就是傳說中的「佛光」。', where:{ minFrac:0.5, mountains:['alishan','hehuan','jiaming','xueshan','yushan'], time:['dawn','day'] }, wx:['fog','cloud'], rare:true, weight:0.9, choices:[
      { label:'對著光環揮揮手', result:'霧裡的影子也對你揮手，彩虹跟著你一起動。這一刻好像在作夢。', effect:{ photo:true, temp:3 } },
      { label:'雙手合十，許一個願', result:'光環慢慢淡去，你覺得心裡有什麼東西被輕輕放下了。', effect:{ stam:20, temp:2 } } ] },
  { id:'e35', text:'對面的雲海越過稜線，像瀑布一樣緩緩往山谷傾瀉，整片山都安靜了下來。', where:{ minFrac:0.4, mountains:['alishan','taiping','hehuan','matcha','xueshan'] }, wx:['cloud','fog'], rare:true, weight:0.5, choices:[
      { label:'坐下來看雲瀑流完', result:'雲一直流、一直流，你把這一幕收進了小瓶子裡。', effect:{ item:'t_cloud_bottle', temp:2 } },
      { label:'拍下流動的雲', result:'照片裡的雲像白色的河，安安靜靜。', effect:{ photo:true } } ] },
  { id:'e36', text:'抬頭的瞬間，一顆、兩顆、好多顆流星劃過銀河，是流星雨！', where:{ mountains:['alishan','hehuan','jiaming','xueshan','yushan'], time:['night'] }, wx:['clear'], rare:true, weight:0.6, choices:[
      { label:'趕快許願', result:'願望還沒說完，又一顆流星劃過去。這次你說完了。', effect:{ item:'t_starlight_stamp', temp:2 } },
      { label:'關掉頭燈，躺下來數', result:'你數到第十七顆的時候，覺得整片天空都是你的。', effect:{ stam:15, temp:3 } } ] },
  // 長期收集奇遇（第 12 批）：每座山都有自己的小故事，稀有的要碰對時段、天氣或季節
  { id:'e37', text:'走到象山的大石頭旁，山下的城市燈火一盞一盞亮了起來，像打翻的星星盒子。', where:{ mountains:['xiangshan'], minFrac:0.5 }, time:['dusk','night'], choices:[
      { label:'找塊石頭坐下來看', result:'晚風涼涼的，城市的聲音變得好遠，你覺得一天的累都放下了。', effect:{ stam:8, temp:2 } },
      { label:'拍一張夜景照片', result:'照片裡的燈光一閃一閃，像是城市在對你眨眼。', effect:{ photo:true } } ] },
  { id:'e38', text:'林子裡傳來「叩、叩、叩」的聲音，抬頭一看，是一隻五色鳥正在樹洞口張望。', where:{ mountains:['xiangshan','qixing','guanyin'] }, choices:[
      { label:'站在遠處靜靜看', result:'五色鳥歪著頭看了你一下，又繼續叩叩叩，你忍不住笑了。', effect:{ temp:2 } },
      { label:'學牠叩叩叩', result:'牠停下來想了想，好像在說：「你敲得不太對喔。」', effect:{ temp:1 } } ] },
  { id:'e39', text:'霧慢慢散開，夢幻湖出現在眼前。水面上一叢叢細細的台灣水韭，安安靜靜地長在這裡。', where:{ mountains:['qixing'], minFrac:0.2, maxFrac:0.7 }, wxPref:['fog'], rare:true, choices:[
      { label:'站在木棧道上慢慢看', result:'你只用眼睛和相機記住它們，這麼小的植物，全世界只住在這片湖裡。', effect:{ item:'t_mengxiang_card', temp:2 } },
      { label:'深呼吸，聽湖邊的蛙鳴', result:'霧又慢慢合起來，湖像是把秘密收回去了。', effect:{ stam:6 } } ] },
  { id:'e40', text:'冷水坑的足湯冒著白白的熱氣，幾位山友正把腳泡在暖暖的水裡聊天。', where:{ mountains:['qixing'], maxFrac:0.35 }, wxPref:['rain','fog'], choices:[
      { label:'脫下鞋子一起泡腳', result:'暖意從腳底慢慢爬上來，大家說說笑笑，你捨不得起身。', effect:{ stam:12, temp:3 } },
      { label:'在旁邊暖暖手就好', result:'熱氣撲在臉上，眼鏡起霧了，你自己笑了出來。', effect:{ temp:2 } } ] },
  { id:'e41', text:'天空中出現好幾個小黑點，慢慢繞著圈往上升。是過境的灰面鵟鷹，正要往北方飛。', where:{ mountains:['guanyin'], minFrac:0.4 }, wx:['clear','cloud'], rare:true, choices:[
      { label:'用望遠鏡數數看有幾隻', result:'你數到第二十三隻就數亂了，牠們乘著風，越飛越高。', effect:{ photo:true, temp:2 } },
      { label:'對牠們說一路順風', result:'最後一隻在你頭上繞了一圈才離開，像是在說再見。', effect:{ temp:3 } } ] },
  { id:'e42', text:'雨絲裡出現一間小小的山莊，門口寫著「聖母山莊」。屋簷下的長椅，剛好可以躲一下雨。', where:{ mountains:['matcha'], minFrac:0.6 }, wxPref:['rain','fog'], choices:[
      { label:'進去蓋一個紀念章', result:'章印蓋得歪歪的，但你很喜歡，這是雨天才有的回憶。', effect:{ item:'t_sacredmother_stamp', temp:1 } },
      { label:'坐在屋簷下聽雨', result:'雨打在鐵皮屋頂上咚咚響，你喝了口熱水，覺得好安心。', effect:{ stam:10, temp:2 } } ] },
  { id:'es_maple', season:'maple', text:'秋天的稜線上，整片芒草都開成了銀白色，風一吹，整座山像在輕輕呼吸。', where:{ minFrac:0.4 }, choices:[
      { label:'走進芒草裡拍一張', result:'芒草比你還高，照片裡只看得到你的帽子和一片銀色的海。', effect:{ photo:true } },
      { label:'坐在步道邊聽風', result:'沙沙沙的聲音一直沒停，你覺得心裡也被吹得好乾淨。', effect:{ stam:8, temp:2 } } ] },
  { id:'e43', text:'林子的另一邊傳來「嗚——」的汽笛聲，是阿里山小火車正慢慢爬上山。', where:{ mountains:['alishan'], maxFrac:0.5 }, choices:[
      { label:'跑到觀景點對火車揮手', result:'車窗裡的小朋友也對你揮手，火車慢慢消失在檜木林裡。', effect:{ item:'t_train_ticket', temp:2 } },
      { label:'停下來聽汽笛的回聲', result:'聲音在山谷裡繞了好幾圈，像是老火車在說故事。', effect:{ temp:1 } } ] },
  { id:'e44', text:'一棵好大好大的紅檜神木站在步道旁，樹幹要好幾個人手拉手才圍得起來。', where:{ mountains:['alishan','taiping'], maxFrac:0.7 }, choices:[
      { label:'仰頭看它的樹冠', result:'陽光從好高好高的地方灑下來，你覺得自己好小，也好安心。', effect:{ temp:2 } },
      { label:'在木棧道上靜靜站一會', result:'它已經在這裡站了兩千年，你的煩惱好像也沒那麼大了。', effect:{ stam:8 } } ] },
  { id:'e45', text:'天還沒全亮，祝山觀日平台上擠滿了人。遠方玉山的稜線後面，透出一點點金色。', where:{ mountains:['alishan'], minFrac:0.5 }, time:['dawn'], wx:['clear','cloud'], rare:true, choices:[
      { label:'跟著大家一起倒數', result:'太陽探出頭的那一刻，大家一起「哇」了出來，你也是。', effect:{ photo:true, temp:3 } },
      { label:'閉上眼睛感受第一道光', result:'臉頰慢慢暖了起來，你覺得今天一定會是好日子。', effect:{ stam:15, temp:2 } } ] },
  { id:'e46', text:'「叮叮叮——」太平山的蹦蹦車從身旁慢慢開過，車廂晃呀晃，乘客都笑得好開心。', where:{ mountains:['taiping'], maxFrac:0.4 }, choices:[
      { label:'對車上的人揮揮手', result:'一位阿嬤從窗口遞出一張紀念車票：「給你，下次一起坐！」', effect:{ item:'t_bongbong_ticket', temp:2 } },
      { label:'跟著蹦蹦的節奏走路', result:'你一路蹦蹦蹦地走，連自己都覺得好好笑。', effect:{ temp:1 } } ] },
  { id:'e47', text:'霧氣停在翠峰湖上，湖面像一面鏡子，把四周的檜木林一棵一棵倒映出來。', where:{ mountains:['taiping'], minFrac:0.5 }, wxPref:['fog'], rare:true, choices:[
      { label:'拍下湖面的倒影', result:'照片上下一模一樣，分不清哪邊才是真的森林。', effect:{ item:'t_cuifeng_card' } },
      { label:'沿著湖邊慢慢散步', result:'湖很安靜，你走路也跟著輕輕的，怕把鏡子踩破。', effect:{ stam:10, temp:1 } } ] },
  { id:'e48', text:'箭竹叢上停著一隻紅紅的小鳥，像一顆會動的莓果。是酒紅朱雀！', where:{ mountains:['hehuan','xueshan','yushan'], minFrac:0.5 }, wx:['clear','cloud'], rare:true, choices:[
      { label:'蹲低身子，遠遠拍一張', result:'牠在枝頭跳了兩下才飛走，照片裡留下一抹酒紅色。', effect:{ item:'t_rosefinch_photo' } },
      { label:'安靜看牠吃草籽', result:'牠吃得好專心，完全沒發現你。你也捨不得出聲。', effect:{ temp:2 } } ] },
  { id:'e49', text:'箭竹林裡傳來響亮的歌聲，一隻金翼白眉跳到路邊，翅膀上的金色閃了一下。', where:{ mountains:['hehuan','xueshan','yushan','jiaming'], minFrac:0.4 }, choices:[
      { label:'放慢腳步聽牠唱', result:'牠唱一句，你走一步，好像在幫你打拍子。', effect:{ temp:2 } },
      { label:'拿出相機記錄', result:'牠一點也不怕，還在鏡頭前歪頭擺了個姿勢。', effect:{ photo:true } } ] },
  { id:'es_rime', season:'snow', text:'整排冷杉的枝葉上結滿了白白的霧淞，像是一夜之間被畫上了糖霜。', where:{ minFrac:0.4 }, wxPref:['fog','snow'], rare:true, choices:[
      { label:'拍下冰晶的特寫', result:'放大一看，每一根針葉上都長著細細的小冰花。', effect:{ item:'t_rime_photo', temp:-1 } },
      { label:'聽冰晶落下的聲音', result:'風一吹，枝頭沙沙落下亮晶晶的碎冰，好像在下小小的雪。', effect:{ temp:-2, stam:4 } } ] },
  { id:'e50', text:'遠處的草坡上，幾隻水鹿正低頭吃草，大耳朵一轉一轉的。', where:{ mountains:['jiaming','xueshan','yushan'], minFrac:0.4 }, time:['dawn','dusk','night'], rare:true, choices:[
      { label:'停在原地，遠遠看著', result:'帶頭的水鹿抬頭看了你一眼，又安心地繼續吃草。', effect:{ temp:3 } },
      { label:'不開閃光，輕輕拍一張', result:'照片裡的水鹿站在暮色裡，像一幅安靜的畫。', effect:{ photo:true } } ] },
  { id:'e51', text:'夜深了，嘉明湖的水面上浮著一輪月亮。湛藍的「天使的眼淚」，此刻正安安靜靜地抱著月光。', where:{ peaks:['jiaming'], minFrac:0.8 }, time:['night'], wx:['clear'], rare:true, weight:0.2, choices:[
      { label:'在湖邊坐下來，只是看', result:'你什麼都沒說，湖也什麼都沒說，這樣就很好。', effect:{ item:'t_moon_lake_photo', temp:3 } },
      { label:'對著湖許一個願', result:'一陣風吹過，月亮在水面輕輕晃了一下，好像聽到了。', effect:{ stam:20, temp:2 } } ] },
  { id:'e52', text:'山屋外，登山協作大哥正在煮一大鍋熱湯，看到你就招手：「來，喝一碗暖暖身子。」', where:{ mountains:['jiaming','xueshan','yushan'], minFrac:0.4 }, choices:[
      { label:'雙手接過來，說謝謝', result:'湯裡有高麗菜和香菇，你喝完全身都暖了。大哥笑說明天要早起喔。', effect:{ stam:18, temp:3 } },
      { label:'幫忙洗碗', result:'大哥說你是今天最乖的山友，還多分你一顆水煮蛋。', effect:{ stam:10, temp:2 } } ] },
  { id:'e53', text:'走進黑森林，高大的冷杉擋住了天空，地上鋪著厚厚的苔蘚，連腳步聲都變小了。', where:{ peaks:['xueshan'], minFrac:0.55, maxFrac:0.85 }, wxPref:['fog'], choices:[
      { label:'放輕腳步，聞聞森林的味道', result:'空氣裡有淡淡的木頭香，你覺得自己好像走進了童話書。', effect:{ temp:2 } },
      { label:'停下來聽有沒有鳥叫', result:'遠遠傳來一兩聲啾啾，森林好像在跟你打招呼。', effect:{ stam:6 } } ] },
  { id:'e54', text:'傍晚走到 369 山莊，橘色的光照在黃色屋頂上，山友們坐在門口看夕陽。', where:{ peaks:['xueshan'], minFrac:0.45, maxFrac:0.75 }, time:['dusk'], choices:[
      { label:'進山莊蓋紀念章', result:'管理員幫你把章蓋得端端正正，還提醒你今晚早點睡。', effect:{ item:'t_369_stamp', temp:1 } },
      { label:'跟大家一起看夕陽', result:'光慢慢從橘色變成粉紅色，沒有人說話，大家都捨不得。', effect:{ photo:true, temp:2 } } ] },
  { id:'e55', text:'圈谷的碎石坡旁，石縫邊有一隻小小的山椒魚，濕濕亮亮的，正慢慢爬回陰影裡。', where:{ peaks:['xueshan'], minFrac:0.85 }, wxPref:['rain','fog'], rare:true, weight:0.15, choices:[
      { label:'屏住呼吸，遠遠看著', result:'牠是冰河時期留下來的小居民。你不翻石頭、不打擾，只把牠記在心裡。', effect:{ item:'t_salamander_card', temp:3 } },
      { label:'輕輕繞開，讓牠好好休息', result:'你把腳步放得好輕好輕，像怕吵醒一個很老很老的夢。', effect:{ temp:2 } } ] },
  { id:'e56', text:'凌晨的排雲山莊，大家戴著頭燈在門口集合，準備摸黑出發去看日出。', where:{ peaks:['yushan','yushan_west','yushan_north','yushan_east'], minFrac:0.65 }, time:['night','dawn'], choices:[
      { label:'蓋個章再出發', result:'紅色的章印在頭燈下很清楚，你把它小心收好。', effect:{ item:'t_paiyun_stamp' } },
      { label:'跟隊友互相檢查裝備', result:'大家幫彼此拉好外套拉鍊，一起說：「出發！」', effect:{ stam:6, temp:2 } } ] },
  { id:'e57', text:'霧裡出現一片銀白色的枯樹林，是白木林。旁邊的玉山圓柏貼著地面長，努力地抓住山坡。', where:{ mountains:['yushan','hehuan'], minFrac:0.7 }, wx:['fog','cloud'], rare:true, choices:[
      { label:'拍下霧中的白木林', result:'樹枝像在霧裡寫字，你按下快門，好像收到一封很安靜的信。', effect:{ item:'t_whitewood_photo' } },
      { label:'摸摸自己的心跳，慢慢走', result:'高山上的樹長得好慢好慢，你也決定慢慢來。', effect:{ stam:8, temp:1 } } ] },
  // 百岳第二階段：玉山群峰、雪主東、嘉明湖線每座山的小故事（只屬於某一座山的寫 where.peaks）
  { id:'e58', text:'下山的山友笑著對你說：「前峰不前喔！」說完還指了指上面那段碎石陡坡。', where:{ peaks:['yushan_front'], minFrac:0.5 }, choices:[
      { label:'謝謝提醒，慢慢走', result:'山友從背包拿出一張貼紙送你：「爬完再貼，比較有成就感。」', effect:{ temp:1, item:'t_front_sticker' } },
      { label:'不信，衝上去', result:'衝了二十步就喘到說不出話，你終於懂「前峰不前」是什麼意思了。', effect:{ stam:-3 } } ] },
  { id:'e59', text:'碎石坡上回頭一看，塔塔加和鹿林山整片在腳下，雲正從山谷慢慢爬上來。', where:{ peaks:['yushan_front'], minFrac:0.7 }, wx:['clear','cloud'], choices:[
      { label:'拍下雲爬上來的樣子', result:'雲一層一層往上漫，照片裡的山脊像浮在白色的海上。', effect:{ photo:true } },
      { label:'坐在石頭上喘口氣', result:'風從谷底吹上來，涼涼的，你的呼吸慢慢平穩下來。', effect:{ stam:8 } } ] },
  { id:'e61', text:'從西峰正面望過去，玉山主峰整座山像一面巨大的屏風，午後的雲影慢慢從上面滑過。', where:{ peaks:['yushan_west'], minFrac:0.85 }, time:['day'], wx:['clear','cloud'], rare:true, choices:[
      { label:'拍下整面山壁', result:'鏡頭塞不下整座主峰，你退了好幾步才拍到。', effect:{ photo:true } },
      { label:'坐下來看雲影走過去', result:'雲影從左邊滑到右邊，花了好久好久，你一點都不急。', effect:{ temp:3 } } ] },
  { id:'e62', text:'北峰氣象站的觀測員剛做完整點觀測，探出頭來跟你聊天：今天風速幾級、這幾天會不會下雪。', where:{ peaks:['yushan_north'], minFrac:0.9 }, choices:[
      { label:'聽他講今天的紀錄', result:'他撕下一張寫好的格子表送你：「今天的天氣，給你帶下山。」', effect:{ item:'t_weather_log', temp:1 } },
      { label:'問他哪天會下雪', result:'他看看天空笑說：「山上的雪，要看山的心情。」', effect:{ temp:2 } } ] },
  { id:'e63', text:'北峰的傍晚，玉山主峰被夕陽照成金色，主峰的影子長長地落在雲海上。', where:{ peaks:['yushan_north'], minFrac:0.85 }, time:['dusk'], wx:['clear'], rare:true, choices:[
      { label:'拍下金色的主峰', result:'你按下快門的時候，連手都被照成金色的。', effect:{ photo:true, temp:2 } },
      { label:'安靜看到天黑', result:'金色慢慢退成粉紅、再退成藍色，星星一顆一顆出來了。', effect:{ temp:3 } } ] },
  { id:'e64', text:'東峰岩溝前，隊友遞來一頂頭盔：「三點不動一點動，慢慢來。」', where:{ peaks:['yushan_east'], minFrac:0.9 }, choices:[
      { label:'照做，慢慢攀', result:'手腳一次只動一個，你一步一步穩穩地爬上了岩溝。', effect:{ temp:2 } },
      { label:'直接手腳並用衝', result:'石頭比你想的滑，你嚇出一身汗，乖乖慢下來。', effect:{ stam:-5 } } ] },
  { id:'e65', text:'岩縫裡開著一小朵毛茸茸的白花，是只長在高山上的玉山薄雪草。', where:{ peaks:['yushan_east'], minFrac:0.8 }, wx:['clear','cloud'], rare:true, choices:[
      { label:'在岩壁下畫一張速寫', result:'你拿出鉛筆，把岩壁和那朵小白花畫進本子裡，岩紋一條一條都畫得很用力。', effect:{ item:'t_ridge_sketch' } },
      { label:'蹲下來看就好', result:'風一吹，小白花輕輕點頭，你也對它點點頭。', effect:{ temp:2 } } ] },
  { id:'e66', text:'哭坡的木階上坐著一位山友，喘得說不出話。你分他一口水，他說：「這坡真的會哭。」', where:{ peaks:['xueshan_east'], minFrac:0.6, maxFrac:0.9 }, choices:[
      { label:'陪他一起笑出來', result:'他從口袋拿出一張歪歪的手寫小證書送你：「先幫你頒，你一定會爬完。」', effect:{ item:'t_crying_slope', temp:2 } },
      { label:'坐下來一起休息', result:'兩個人一起看著木階發呆，休息完腳好像沒那麼重了。', effect:{ stam:6 } } ] },
  { id:'e67', text:'東峰三角點旁往東看，南湖大山和中央尖山並排站著，清清楚楚。', where:{ peaks:['xueshan_east'], minFrac:0.9 }, wx:['clear'], rare:true, choices:[
      { label:'拍下兩座大山', result:'一座寬寬的、一座尖尖的，你把它們收進同一張照片裡。', effect:{ photo:true } },
      { label:'記住它們的樣子', result:'你在心裡說：總有一天要去那裡。', effect:{ temp:3 } } ] },
  { id:'e68', text:'黑森林裡，冷杉一棵比一棵高，霧從樹縫中一條一條透出光來。', where:{ peaks:['xueshan'], minFrac:0.65, maxFrac:0.85 }, wx:['fog','cloud'], choices:[
      { label:'站在光裡深呼吸', result:'光照在臉上暖暖的，霧裡有木頭和苔蘚的味道。', effect:{ stam:8, temp:1 } },
      { label:'拍下一道一道的光', result:'照片裡的光像從天上垂下來的絲線。', effect:{ photo:true } } ] },
  { id:'e69', text:'圈谷的碎石上，一群岩鷚跳來跳去，一點也不怕人。', where:{ peaks:['xueshan'], minFrac:0.85 }, choices:[
      { label:'拿出圖鑑卡對照', result:'你翻到圈谷那一頁，原來這個大碗是很久以前冰河挖出來的。', effect:{ item:'t_cirque_card' } },
      { label:'蹲下來看牠們跳', result:'一隻岩鷚跳到你腳邊，歪頭看了你一眼又跳走了。', effect:{ temp:2 } } ] },
  { id:'e70', text:'霧突然散開，對面整片向陽大崩壁露了出來，像被巨人用手指刮過一樣。', where:{ mountains:['jiaming'], minFrac:0.3 }, wxPref:['fog'], choices:[
      { label:'拿出炭筆畫下來', result:'你趕在霧合起來之前，把一層一層的岩層畫進本子裡。', effect:{ item:'t_landslide_sketch' } },
      { label:'站著看到霧又合起來', result:'崩壁慢慢消失在白霧裡，好像剛剛只是一場夢。', effect:{ temp:2 } } ] },
  { id:'e71', text:'黑水塘邊，一頭水鹿低頭喝水，抬頭看了你一眼，又繼續喝。', where:{ peaks:['xiangyang'], minFrac:0.7 }, time:['dawn','dusk'], rare:true, choices:[
      { label:'停在原地，遠遠看著', result:'水鹿喝完水慢慢走進箭竹林，水面又安靜下來。', effect:{ temp:3 } },
      { label:'不開閃光，輕輕拍一張', result:'照片裡的水鹿和牠的倒影，一模一樣。', effect:{ photo:true } } ] },
  { id:'e72', text:'三叉山的大草原上風好大，草浪一波一波往山下跑，遠方的嘉明湖小小一顆藍。', where:{ peaks:['sancha'], minFrac:0.75 }, wx:['clear','cloud'], choices:[
      { label:'張開手讓風吹', result:'風把外套吹得鼓鼓的，你覺得自己快要飛起來了。', effect:{ temp:3 } },
      { label:'拍下草浪和那一點藍', result:'照片裡的嘉明湖小到要放大才看得到，但你知道它在那裡。', effect:{ photo:true } } ] },
  { id:'e73', text:'山頂附近有一座紀念碑，紀念 1945 年在這裡遇上颱風、沒能回家的搜救人員。', where:{ peaks:['sancha'], minFrac:0.9 }, choices:[
      { label:'安靜站一會兒', result:'風吹過草原，你在心裡說了一聲謝謝。', effect:{ temp:1 } },
      { label:'輕輕鞠個躬再走', result:'你把腳步放慢，記住這座山也有這樣的故事。', effect:{ temp:1 } } ] },
];

// 寶物：rarity 為 普通 / 稀有 / 傳說；drop 可為山 id 陣列或 'any'；多為照片、卡片、紀念章、拓印，不取走自然物
// 只在山群裡某幾座山掉的寶物，多寫 peaks（drop 還是寫山群代號，peaks 再縮小到那幾座山）
SX.TREASURES = [
  { id:'t_clean_pledge', name:'環保小卡', rarity:'普通', desc:'一張寫著「帶走垃圾，留下美景」的小卡片。', drop:'any' },
  { id:'t_cairn_stone', name:'石堆祝福卡', rarity:'普通', desc:'在石堆旁拍下的照片，記錄了一份小小的祝福。', drop:['xiangshan','qixing','guanyin','matcha'] },
  { id:'t_thanks_postcard', name:'道謝明信片', rarity:'普通', desc:'一張寫著「謝謝你的指路」的明信片。', drop:'any' },
  { id:'t_hut_stamp', name:'山屋紀念章', rarity:'普通', desc:'在山屋櫃台蓋下的紅色章印，代表你曾在這裡歇腳。', drop:['taiping','hehuan','jiaming','xueshan','yushan'] },
  { id:'t_summit_stamp', name:'登頂紀念章', rarity:'普通', desc:'每一座山頂都有屬於自己的小紀念章。', drop:'any' },
  { id:'t_tea_card', name:'山茶花小卡', rarity:'普通', desc:'畫著山茶花的卡片，花瓣上好像還帶著露水。', drop:['alishan','taiping','matcha'] },
  { id:'t_fog_note', name:'霧中便條', rarity:'普通', desc:'在濃霧裡撿到的一張便條，寫著「別怕，慢慢走」。', drop:['qixing','matcha','taiping'] },
  { id:'t_sunset_photo', name:'夕陽照片', rarity:'普通', desc:'在傍晚的步道上拍下的一張照片。', drop:['guanyin','alishan','xiangshan'] },
  { id:'t_rain_card', name:'雨後小卡', rarity:'普通', desc:'雨停後，樹葉上的水珠在陽光下閃閃發亮。', drop:'any' },
  { id:'t_hiker_postcard', name:'舊明信片', rarity:'稀有', desc:'一張寫著「下次一起來」的老明信片，不知道是誰留下的。', drop:['yushan','xueshan','jiaming','hehuan'] },
  { id:'t_bird_photo', name:'藍鵲的一瞥', rarity:'稀有', desc:'藍鵲飛過枝頭的瞬間，照片裡只留下一抹藍色。', drop:['alishan','taiping','qixing','guanyin'] },
  { id:'t_cone_card', name:'玉山圓柏毬果圖鑑卡', rarity:'稀有', desc:'畫著玉山圓柏小毬果的圖鑑卡，真的毬果你一顆也沒摘。', drop:['yushan','hehuan'] },
  { id:'t_rubbing', name:'古老三角點拓印', rarity:'稀有', desc:'用紙和鉛筆輕輕拓下三角點的文字，石頭仍留在原地。', drop:['qixing','hehuan','xueshan'] },
  { id:'t_bird_feather_photo', name:'帝雉的尾羽照片', rarity:'稀有', desc:'帝雉尾羽在陽光下的特寫，你只用相機記下牠的美。', drop:['alishan','taiping','yushan','xueshan'] },
  { id:'t_deer_track_card', name:'山羌足跡拓印卡', rarity:'稀有', desc:'用紙拓下的小小蹄印，提醒你山裡還有很多住客。', drop:['jiaming','xueshan','taiping'] },
  { id:'t_cloud_bottle', name:'雲海瓶', rarity:'稀有', desc:'把雲海的照片裝進小瓶子裡，打開就能想起那天的白色海洋。', drop:['alishan','hehuan','taiping'] },
  { id:'t_rhodo_card', name:'高山杜鵑明信卡', rarity:'稀有', desc:'杜鵑盛開時的明信卡，花朵粉粉的，好可愛。', drop:['hehuan','taiping','qixing'] },
  { id:'t_lake_map', name:'嘉明湖湖畔地圖', rarity:'稀有', desc:'手繪的湖畔小地圖，標示著哪裡可以安靜地坐著看水。', drop:['jiaming'], peaks:['jiaming'] },
  { id:'t_angel_tear_card', name:'天使的眼淚明信片', rarity:'傳說', desc:'嘉明湖畔的美景明信片，傳說看到的人心裡會多一點溫柔。', drop:['jiaming'], peaks:['jiaming'] },
  { id:'t_starlight_stamp', name:'滿天星空紀念章', rarity:'傳說', desc:'在合歡山的夜晚拍下星空，印成一枚金色的小章。', drop:['hehuan'] },
  { id:'t_old_triangle', name:'百年三角點的回憶', rarity:'傳說', desc:'一張老照片，記下很久以前測量隊員站在山頂的樣子。', drop:['qixing','taiping','xueshan'] },
  { id:'t_summit_dawn', name:'晨光山頂照片', rarity:'傳說', desc:'天還沒亮就登頂，等到第一道光照亮山稜線。', drop:['yushan','alishan','xueshan'] },
  { id:'t_forest_bell', name:'林間風鈴卡', rarity:'傳說', desc:'一張畫著風鈴的卡片，風吹過時好像能聽到叮噹聲。', drop:['matcha','taiping','alishan'] },
  // 長期收集寶物（第 12 批）：多半要碰到某座山的奇遇才比較容易拿到
  { id:'t_mengxiang_card', name:'夢幻湖水韭圖鑑卡', rarity:'稀有', desc:'畫著台灣水韭的小卡，全世界只有七星山的夢幻湖找得到它。你只帶走了這張圖。', drop:['qixing'] },
  { id:'t_sacredmother_stamp', name:'聖母山莊紀念章', rarity:'普通', desc:'在抹茶山的聖母山莊蓋下的章，印泥被雨氣弄得有點暈開，反而更好看。', drop:['matcha'] },
  { id:'t_train_ticket', name:'小火車紀念車票', rarity:'普通', desc:'一張硬硬的老式車票，印著阿里山小火車和檜木林。', drop:['alishan'] },
  { id:'t_bongbong_ticket', name:'蹦蹦車紀念車票', rarity:'普通', desc:'太平山蹦蹦車的紀念票，拿在手上好像還聽得到叮叮叮。', drop:['taiping'] },
  { id:'t_cuifeng_card', name:'翠峰湖倒影明信片', rarity:'稀有', desc:'霧裡的翠峰湖像一面鏡子，森林上下各有一片。', drop:['taiping'] },
  { id:'t_rosefinch_photo', name:'酒紅朱雀的一瞥', rarity:'稀有', desc:'箭竹叢上的一抹酒紅色，是高山上最可愛的小訪客。', drop:['hehuan','xueshan','yushan'] },
  { id:'t_whitebrow_card', name:'金翼白眉圖鑑卡', rarity:'稀有', desc:'記下金翼白眉的歌聲和翅膀上的金色，牠總在步道邊唱歌給山友聽。', drop:['hehuan','xueshan','yushan','jiaming'] },
  { id:'t_369_stamp', name:'369山莊紀念章', rarity:'普通', desc:'雪山 369 山莊的章，章裡有黃色屋頂和一大片山坡。', drop:['xueshan'], peaks:['xueshan'] },
  { id:'t_paiyun_stamp', name:'排雲山莊紀念章', rarity:'普通', desc:'在攻頂玉山前一晚蓋下的章，代表你曾在台灣最高的山屋住過一晚。', drop:['yushan'], peaks:['yushan','yushan_west','yushan_north','yushan_east'] },
  { id:'t_whitewood_photo', name:'白木林照片', rarity:'稀有', desc:'霧中的銀白色枯樹林，安靜得像一幅水墨畫。', drop:['yushan','hehuan'] },
  { id:'t_salamander_card', name:'雪山山椒魚圖鑑卡', rarity:'傳說', desc:'冰河時期留下來的小居民，只住在高山冷冷的石縫邊。能遇見牠，是山給你的禮物。', drop:['xueshan'], peaks:['xueshan'] },
  { id:'t_moon_lake_photo', name:'天使的眼淚月光照片', rarity:'傳說', desc:'夜裡的嘉明湖抱著一輪月亮，湛藍的湖水在月光下閃著銀色。', drop:['jiaming'], peaks:['jiaming'] },
  // 百岳第二階段寶物（第 15 批）：玉山群峰、雪主東、嘉明湖線
  { id:'t_front_sticker', name:'「前峰不前」貼紙', rarity:'普通', desc:'山友之間流傳的手繪貼紙，畫著一個喘到吐舌頭的小人，在陡坡上努力往上爬。', drop:['yushan'], peaks:['yushan_front'] },
  { id:'t_weather_log', name:'玉山氣象站觀測紀錄卡', rarity:'稀有', desc:'一張手寫的格子表，記下這一天北峰上的溫度和風向。', drop:['yushan'], peaks:['yushan_north'] },
  { id:'t_ridge_sketch', name:'十峻之首岩壁速寫', rarity:'傳說', desc:'在玉山東峰岩壁下畫的鉛筆速寫，岩紋一條一條都畫得很用力。', drop:['yushan'], peaks:['yushan_east'] },
  { id:'t_crying_slope', name:'哭坡過關證書', rarity:'普通', desc:'一張歪歪的手寫小證書：「本人已爬完哭坡，沒有哭（大概）。」', drop:['xueshan'] },
  { id:'t_cirque_card', name:'圈谷冰河遺跡圖鑑卡', rarity:'稀有', desc:'畫著雪山圈谷怎麼被冰河一點一點挖出來的小圖解。', drop:['xueshan'], peaks:['xueshan'] },
  { id:'t_landslide_sketch', name:'向陽大崩壁素描卡', rarity:'稀有', desc:'用炭筆畫的向陽大崩壁，一層一層的岩層畫得很清楚。', drop:['jiaming'] },
  { id:'t_sancha_rubbing', name:'三叉山一等三角點拓印', rarity:'稀有', desc:'台灣只有十座百岳的山頂是一等三角點，這是其中一座。石頭還留在山上，你只帶走了紙。', drop:['jiaming'], peaks:['sancha'] },
  // 季節限定寶物：只在 season 的期間、該季節的山上掉落（drop 'any' 代表季節的每一座山）
  { id:'t_snow_crystal_stamp', name:'雪季冰晶章', rarity:'傳說', season:'snow', desc:'只有下雪的季節才蓋得到的章，章印是一片六角形的雪花。', drop:'any' },
  { id:'t_sakura_bookmark', name:'阿里山櫻花書籤', rarity:'稀有', season:'sakura', desc:'印著阿里山櫻花和小火車的書籤，夾在書裡就像把春天帶回家。', drop:['alishan'] },
  { id:'t_sakura_photo', name:'櫻花雨照片', rarity:'稀有', season:'sakura', desc:'花瓣像雨一樣落下的那一瞬間，剛好被你拍了下來。', drop:'any' },
  { id:'t_rhodo_pressed', name:'玉山杜鵑押花', rarity:'稀有', season:'rhodo', desc:'山屋管理員用掉在地上的落花做成的押花卡，只送給花季來訪的山友。', drop:'any' },
  { id:'t_firefly_jar', name:'螢火蟲光點瓶', rarity:'傳說', season:'firefly', desc:'把螢火蟲之夜的照片裝進小瓶子裡，關燈後好像還在一閃一閃。', drop:'any' },
  { id:'t_cloudfall_photo', name:'夏日雲瀑照片', rarity:'稀有', season:'summer', desc:'午後雷陣雨過後，雲像瀑布一樣從山稜線流下來。', drop:'any' },
  { id:'t_maple_postcard', name:'楓紅明信片', rarity:'稀有', season:'maple', desc:'秋天的山坡一半是紅葉、一半是銀白芒草，寄給想念的人剛剛好。', drop:'any' },
  { id:'t_cloudsea_card', name:'冬日雲海明信片', rarity:'稀有', season:'cloudsea', desc:'冷冷的清晨，腳下是一整片安靜的雲海，遠方的山像小島。', drop:'any' },
  { id:'t_rime_photo', name:'霧淞照片', rarity:'稀有', season:'snow', desc:'雪季的高山上，冷杉枝頭結滿白白的冰晶，像撒了一層糖霜。', drop:'any' },
];

// 隱藏任務 / 成就：cond.type 為 climbs | mountain | time | wx | items | notes | cairns | rests | nofast | gps
SX.QUESTS = [
  { id:'q01', name:'三山行者', hint:'山的數量比你想的還多一點。', desc:'登頂三座不同的山。', cond:{ type:'climbs', n:3, distinct:true }, reward:{ title:'三山行者' } },
  { id:'q02', name:'夜登之人', hint:'月亮是最好的嚮導。', desc:'在夜晚登上任一座山頂。', cond:{ type:'time', when:'night', n:1 }, reward:{ item:'t_summit_dawn' } },
  { id:'q03', name:'雨中登頂', hint:'雨傘不是唯一的裝備。', desc:'在下雨的天氣登頂一次。', cond:{ type:'wx', kind:'rain', n:1 }, reward:{ title:'雨中行者' } },
  { id:'q04', name:'疊石的人', hint:'一顆、一顆、再一顆。', desc:'在步道上疊五座石堆。', cond:{ type:'cairns', n:5 }, reward:{ item:'t_cairn_stone' } },
  { id:'q05', name:'長椅知音', hint:'坐下來的人才看得見風景。', desc:'在休息點休息十次。', cond:{ type:'rests', n:10 }, reward:{ title:'長椅知音' } },
  { id:'q06', name:'寶物收藏家', hint:'每一張卡片都有一個故事。', desc:'收集五件寶物。', cond:{ type:'items', n:5 }, reward:{ title:'收藏家' } },
  { id:'q07', name:'樹洞讀者', hint:'樹洞裡藏著別人的心事。', desc:'讀十則樹洞便條。', cond:{ type:'notes', n:10 }, reward:{ item:'t_thanks_postcard' } },
  { id:'q08', name:'黑熊的朋友', hint:'牠喜歡五座山頂的味道。', desc:'累計登頂五次，解鎖台灣黑熊。', cond:{ type:'climbs', n:5 }, reward:{ pet:'bear' } },
  { id:'q09', name:'慢慢走的人', hint:'快不一定好，但穩最重要。', desc:'一趟山全程不趕路，慢慢走完。', cond:{ type:'nofast', n:1 }, reward:{ title:'慢行者' } },
  { id:'q10', name:'在山上的那一刻', hint:'手機放久一點，心會更近。', desc:'在山上收起手機十分鐘。', cond:{ type:'gps', n:0, offlineMinutes:10 }, reward:{ item:'t_clean_pledge' } },
  { id:'q11', name:'霧中的指路人', hint:'看不見時，就看腳下。', desc:'在濃霧中找回步道三次。', cond:{ type:'wx', kind:'fog', n:3 }, reward:{ item:'t_fog_note' } },
  { id:'q12', name:'高山的呼吸', hint:'海拔越高，越要慢下來。', desc:'登上海拔超過三千公尺的山頂。', cond:{ type:'mountain', minAlt:3000, n:1 }, reward:{ title:'高山行者' } },
  { id:'q13', name:'一起回家的朋友', hint:'有人陪你，路就不那麼遠。', desc:'和朋友一起登頂五次。', cond:{ type:'climbs', n:5, withFriends:true }, reward:{ item:'t_hut_stamp' } },
  { id:'q14', name:'藍鵲的報告', hint:'牠總是站在你前面，告訴你好天氣。', desc:'在三座以上不同的山上遇見藍鵲。', cond:{ type:'items', n:3, kind:'magpie' }, reward:{ pet:'magpie' } },
  { id:'q15', name:'石虎的眼睛', hint:'夜裡的草叢，有一雙亮亮的眼睛。', desc:'在夜晚的步道上遇見一次山羌。', cond:{ type:'wx', kind:'night', n:1 }, reward:{ pet:'leopardcat' } },
  { id:'q16', name:'玉山的呼喚', hint:'最高的那座山，等你去看日出。', desc:'登頂玉山主峰。', cond:{ type:'mountain', id:'yushan', n:1 }, reward:{ item:'t_summit_dawn' } },
];

// 徽章：每一條有銅、銀、金、白金幾個等級（tiers 由小到大，最多四個）；stat 是 game.js 的 badgeValue 要算的數值
// tiers 寫 'all' 代表「全部蒐集完」（數量跟著寶物、奇遇、山的總數走）；unit 是進度條後面的單位
// 節奏目標：銅 1～2 週、銀 1～3 個月、金 3～6 個月、白金 1～2 年（以每天打開 3～10 分鐘估算）
SX.BADGE_TIERS = [
  { name:'銅', color:'#c27a3e' },
  { name:'銀', color:'#a9b4bf' },
  { name:'金', color:'#e8b730' },
  { name:'白金', color:'#9fd8e8' },
];
// 入門級：徽章可以多寫 starter（比銅還低的一級），第一次上山（象山走一趟）就拿得到，徽章頁才不會整片灰灰的；存檔另外記，不影響銅銀金白金
SX.BADGE_STARTER = { name:'入門', color:'#8fbf7a' };
SX.BADGES = [
  { id:'walk',    name:'步行里程',   glyph:'步', stat:'walked',      unit:'km', starter:1, tiers:[40, 250, 600, 2000], desc:'累積走過的路' },
  { id:'summit',  name:'登頂次數',   glyph:'頂', stat:'summits',     unit:'次', starter:1, tiers:[10, 50, 120, 400], desc:'所有山加起來的登頂次數' },
  { id:'fav',     name:'老朋友',     glyph:'山', stat:'favMountain', unit:'次', tiers:[3, 15, 40, 120], desc:'同一座山登頂的次數（算最常去的那座）' },
  { id:'streak',  name:'連續上山',   glyph:'日', stat:'bestStreak',  unit:'天', tiers:[7, 30, 100, 365], desc:'連續上山的天數（算最長的一次）' },
  { id:'night',   name:'夜登',       glyph:'夜', stat:'night',       unit:'次', tiers:[3, 15, 40, 120], desc:'在夜晚登頂的次數' },
  { id:'rain',    name:'雨中行',     glyph:'雨', stat:'rain',        unit:'次', tiers:[2, 8, 20, 60], desc:'在下雨天登頂的次數' },
  { id:'fog',     name:'霧中行',     glyph:'霧', stat:'fogTop',      unit:'次', tiers:[2, 10, 25, 80], desc:'在起霧時登頂的次數' },
  { id:'snow',    name:'雪中行',     glyph:'雪', stat:'snowTop',     unit:'次', tiers:[1, 5, 15, 40], desc:'在下雪時登頂的次數（只有雪季的高山會下雪）' },
  { id:'rest',    name:'長椅常客',   glyph:'憩', stat:'rests',       unit:'次', starter:1, tiers:[10, 60, 150, 500], desc:'在長椅或觀景台休息的次數' },
  { id:'cairn',   name:'疊石人',     glyph:'石', stat:'cairns',      unit:'座', starter:1, tiers:[5, 30, 80, 250], desc:'疊出的許願石堆' },
  { id:'treasure',name:'寶物收藏',   glyph:'寶', stat:'treasureKinds', unit:'種', starter:3, tiers:[10, 18, 'all'], desc:'蒐集到的寶物種類' },
  { id:'enc',     name:'奇遇見聞',   glyph:'遇', stat:'encKinds',    unit:'種', starter:1, tiers:[10, 20, 32, 'all'], desc:'遇過的奇遇種類' },
  { id:'stamp',   name:'集印帳',     glyph:'印', stat:'stamps',      unit:'座', tiers:[3, 6, 'all'], desc:'集印帳蓋到章的山' },
  // 山群徽章：stat 'groupPeaks' 算 group 這個山群登頂過幾座（'all' 就是山群裡全部的山）
  { id:'g_hehuan', name:'合歡群峰全制霸', glyph:'歡', stat:'groupPeaks', group:'hehuan', unit:'座', tiers:[1, 3, 'all'], desc:'合歡群峰五座百岳，登頂過幾座' },
  // 玉山群峰一共九座，遊戲裡現在有五座：等級先寫數字，其他四座開放時再加一級 'all'（已經拿到的等級不會變）
  { id:'g_yushan', name:'玉山群峰全制霸', glyph:'玉', stat:'groupPeaks', group:'yushan', unit:'座', tiers:[1, 3, 5], desc:'玉山群峰的百岳，登頂過幾座' },
  // 完百之路：stat 'baiyue' 算登頂過幾座不同的百岳；之後開放更多百岳時往後加 30、50、100
  { id:'baiyue', name:'完百之路', glyph:'岳', stat:'baiyue', unit:'座', tiers:[10], desc:'登頂過幾座不同的台灣百岳' },
];

// 世界區域：目前只有台灣。之後可以加入世界名山（例如富士山、少女峰、吉力馬札羅），現在先不啟用。
SX.REGIONS = [
  { id:'taiwan', name:'台灣', coast:'SX.COAST', ridge:'SX.RIDGE', mountains:'SX.MOUNTAINS', center:[120.95,23.7], zoom:7 },
  // 範例（未啟用）：
  // { id:'japan', name:'日本', coast:'SX.COAST_JP', mountains:'SX.MOUNTAINS_JP', center:[138.7,35.4], zoom:6 },
];

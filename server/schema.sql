-- 山行小日子 後端資料表（Cloudflare D1）
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,          -- 好友碼（6 碼）
  created INTEGER NOT NULL,
  seen INTEGER NOT NULL,
  mountain TEXT, dist REAL DEFAULT 0, -- 目前在爬的山與進度（給好友看）
  pet TEXT,
  walked REAL DEFAULT 0, summits INTEGER DEFAULT 0,  -- 累積走了幾公尺、登頂幾次
  wk INTEGER DEFAULT 0, wk_base REAL DEFAULT 0,        -- 本週起點（週排行 = walked - wk_base）
  banned INTEGER DEFAULT 0,
  login TEXT,                          -- 換手機用的登入名（設密碼時才有；不分大小寫、不重複）
  pw_hash TEXT, pw_salt TEXT, pw_iter INTEGER,  -- 密碼的 PBKDF2-SHA256 雜湊、隨機鹽、次數（不存密碼本身）
  unlocks TEXT                         -- 能爬的山 { 山 id: 關著遊戲自己走上去要幾分鐘 }（好友跟隨選山取交集用）
);
CREATE UNIQUE INDEX IF NOT EXISTS players_login ON players (login);
-- 用登入名＋密碼登入的手機：每支手機自己的登入碼雜湊
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY, player TEXT NOT NULL, created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_player ON sessions (player, created);
-- 猜密碼限制：每個登入名（n:）、每個網路位址（ip:）錯了幾次、從什麼時候開始算
CREATE TABLE IF NOT EXISTS login_fails (
  k TEXT PRIMARY KEY, n INTEGER NOT NULL, first INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS friends (
  a TEXT NOT NULL, b TEXT NOT NULL, created INTEGER NOT NULL,
  PRIMARY KEY (a, b)
);
CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  mountain TEXT NOT NULL,
  m REAL NOT NULL,                    -- 在步道上的公尺數
  alt INTEGER NOT NULL,               -- 海拔
  band INTEGER NOT NULL,              -- 每 500 公尺一組：0 = 0~500m，在 500m 處顯示
  caption TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending / ok / hidden
  reports INTEGER NOT NULL DEFAULT 0,
  bytes INTEGER NOT NULL DEFAULT 0,
  created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS photos_mb ON photos (mountain, band, status);
CREATE INDEX IF NOT EXISTS photos_owner ON photos (owner, created);
CREATE TABLE IF NOT EXISTS photo_blobs (
  id TEXT PRIMARY KEY, type TEXT NOT NULL, data BLOB NOT NULL
);
CREATE TABLE IF NOT EXISTS reports (
  photo TEXT NOT NULL, reporter TEXT NOT NULL, created INTEGER NOT NULL,
  PRIMARY KEY (photo, reporter)
);
CREATE TABLE IF NOT EXISTS invites (
  id TEXT PRIMARY KEY,
  host TEXT NOT NULL, guest TEXT NOT NULL,
  mountain TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending / accepted / declined
  created INTEGER NOT NULL,
  team TEXT                           -- 好友跟隨：邀進哪一支隊伍
);
CREATE INDEX IF NOT EXISTS invites_guest ON invites (guest, status);

-- v2：雲端存檔、累積距離（好友週排行）
CREATE TABLE IF NOT EXISTS saves (
  id TEXT PRIMARY KEY, data TEXT NOT NULL, updated INTEGER NOT NULL
);

-- v5：熱門山每日入園名額（名額表在 server/src/index.js 的 QUOTA；已經在跑的資料庫跑 migrate5.sql）
-- 每一個名額：哪一天（台灣日期）、哪座山的名額、誰；同一人同一天同一座山只有一列
CREATE TABLE IF NOT EXISTS quota_spots (day TEXT NOT NULL, quota TEXT NOT NULL, player TEXT NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (day, quota, player));
-- 每天每座山已經用了幾個（只由下面的 trigger 加，不另外寫）
CREATE TABLE IF NOT EXISTS quota_count (day TEXT NOT NULL, quota TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, quota));
CREATE TRIGGER IF NOT EXISTS quota_spots_count AFTER INSERT ON quota_spots BEGIN INSERT INTO quota_count (day, quota, n) VALUES (NEW.day, NEW.quota, 1) ON CONFLICT(day, quota) DO UPDATE SET n = n + 1; END;
-- 送太快的限制：每個 key 在這段時間內送了幾次、從什麼時候開始算
CREATE TABLE IF NOT EXISTS rate_limits (k TEXT PRIMARY KEY, n INTEGER NOT NULL, first INTEGER NOT NULL);

-- v6：好友好感度（規則在 server/src/index.js 的 AFF；已經在跑的資料庫跑 migrate6.sql）
-- 一對好友只有一列（lo＝兩人 id 小的那個、hi＝大的那個），兩人看到同一個數字；刪除好友就刪掉這列（歸零）
CREATE TABLE IF NOT EXISTS affinity (
  lo TEXT NOT NULL, hi TEXT NOT NULL,
  pts INTEGER NOT NULL DEFAULT 0,                 -- 累計好感
  m_lo REAL NOT NULL DEFAULT 0, m_hi REAL NOT NULL DEFAULT 0,  -- 兩人各自回報「跟對方一起走」的公尺數；一起走的距離取兩邊較小的那個
  w_units INTEGER NOT NULL DEFAULT 0,             -- 一起走已經算過幾個單位（超過每天上限的也算過，不會隔天補）
  tops INTEGER NOT NULL DEFAULT 0,                -- 一起登頂幾次
  day TEXT NOT NULL DEFAULT '',                   -- 下面幾個「今天」的數字是哪一天（台灣日期）
  d_walk INTEGER NOT NULL DEFAULT 0, d_like INTEGER NOT NULL DEFAULT 0, d_top INTEGER NOT NULL DEFAULT 0, d_tot INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (lo, hi), CHECK (lo < hi)
);
-- 一起登頂：同一對、同一天、同一座山一列；兩人都回報登頂了才加分（granted 只會從 0 變 1 一次）
CREATE TABLE IF NOT EXISTS aff_tops (lo TEXT NOT NULL, hi TEXT NOT NULL, day TEXT NOT NULL, mountain TEXT NOT NULL, by_lo INTEGER NOT NULL DEFAULT 0, by_hi INTEGER NOT NULL DEFAULT 0, granted INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (lo, hi, day, mountain));
-- 按好友照片的愛心：同一個人按同一張照片只算一次（取消再按不會再加）
CREATE TABLE IF NOT EXISTS aff_likes (player TEXT NOT NULL, photo TEXT NOT NULL, created INTEGER NOT NULL, PRIMARY KEY (player, photo));

-- v3：推播通知（已經在跑的資料庫跑 migrate3.sql）
-- push_subs：每支手機的推播訂閱（endpoint 是瀏覽器給的網址，本身就很難猜）
CREATE TABLE IF NOT EXISTS push_subs (endpoint TEXT PRIMARY KEY, player TEXT NOT NULL, created INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS push_subs_player ON push_subs(player);
-- push_queue：等手機來拿的通知內容（推播本身不帶內容，手機收到後再來拿，就不用做內容加密）
CREATE TABLE IF NOT EXISTS push_queue (id INTEGER PRIMARY KEY AUTOINCREMENT, endpoint TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, tag TEXT, created INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS push_queue_ep ON push_queue(endpoint);
-- eta：關掉遊戲時，登山客預計走到山頂前的時間（排程每 5 分鐘檢查一次）
CREATE TABLE IF NOT EXISTS eta (player TEXT PRIMARY KEY, mountain TEXT NOT NULL, name TEXT NOT NULL, at INTEGER NOT NULL, sent INTEGER NOT NULL DEFAULT 0);

-- v7：好友跟隨（隊伍）（規則在 server/src/index.js 的 TEAM；已經在跑的資料庫跑 migrate7.sql）
-- 隊伍：隊長、現在是第幾趟（0＝還沒出發過）、隊長交接後原隊長是誰（他回來時告訴他一次）
CREATE TABLE IF NOT EXISTS teams (id TEXT PRIMARY KEY, leader TEXT NOT NULL, trip INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL, handed_from TEXT);
-- 隊員（隊長也在這裡）：一個人同時只能在一支隊伍，所以用 player 當主鍵
CREATE TABLE IF NOT EXISTS team_members (player TEXT PRIMARY KEY, team TEXT NOT NULL, joined INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS team_members_team ON team_members (team);
-- 每一趟：哪座山、哪天出發（台灣日期，寶物分配的亂數種子用）、出發時的隊員名單（寫死，大家照這份算寶物）、全員登頂的時間（0＝還沒）
CREATE TABLE IF NOT EXISTS team_trips (team TEXT NOT NULL, trip INTEGER NOT NULL, mountain TEXT NOT NULL, day TEXT NOT NULL, started INTEGER NOT NULL, members TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (team, trip));
-- 每人每趟：最後回報走到哪、什麼時候；預估登頂時間（關著遊戲也照這個算登頂）；登頂時間（0＝還沒）
CREATE TABLE IF NOT EXISTS team_runs (team TEXT NOT NULL, trip INTEGER NOT NULL, player TEXT NOT NULL, dist REAL NOT NULL DEFAULT 0, at INTEGER NOT NULL, eta INTEGER NOT NULL DEFAULT 0, summited INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (team, trip, player));
CREATE INDEX IF NOT EXISTS team_runs_player ON team_runs (player);
CREATE INDEX IF NOT EXISTS team_runs_open ON team_runs (summited, eta);

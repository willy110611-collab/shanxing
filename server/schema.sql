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
  banned INTEGER DEFAULT 0
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
  created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS invites_guest ON invites (guest, status);

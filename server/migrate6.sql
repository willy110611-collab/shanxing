-- 好友好感度（2026-11-23）：已經在跑的資料庫要先跑這個，再部署新版伺服器
-- 一對好友只有一列（lo＝兩人 id 小的那個、hi＝大的那個），兩人看到同一個數字；刪除好友就刪掉這列（歸零）
-- 等級門檻、每種事件加多少、每天上限都只寫在 server/src/index.js 的 AFF
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

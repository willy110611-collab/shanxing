-- 熱門山每日入園名額（2026-11-23）：已經在跑的資料庫要先跑這個，再部署新版伺服器
-- 每一個名額：哪一天（台灣日期）、哪座山的名額、誰；同一人同一天同一座山只有一列
CREATE TABLE IF NOT EXISTS quota_spots (day TEXT NOT NULL, quota TEXT NOT NULL, player TEXT NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (day, quota, player));
-- 每天每座山已經用了幾個（只由下面的 trigger 加，不另外寫）
CREATE TABLE IF NOT EXISTS quota_count (day TEXT NOT NULL, quota TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, quota));
CREATE TRIGGER IF NOT EXISTS quota_spots_count AFTER INSERT ON quota_spots BEGIN INSERT INTO quota_count (day, quota, n) VALUES (NEW.day, NEW.quota, 1) ON CONFLICT(day, quota) DO UPDATE SET n = n + 1; END;
-- 送太快的限制：每個 key 在這段時間內送了幾次、從什麼時候開始算
CREATE TABLE IF NOT EXISTS rate_limits (k TEXT PRIMARY KEY, n INTEGER NOT NULL, first INTEGER NOT NULL);

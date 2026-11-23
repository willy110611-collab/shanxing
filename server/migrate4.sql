-- 換手機用的密碼（2026-11-23）：已經在跑的資料庫要先跑這個，再部署新版伺服器
-- 登入名（不重複）＋密碼的 PBKDF2 雜湊、隨機鹽、次數（不存密碼本身）
ALTER TABLE players ADD COLUMN login TEXT;
ALTER TABLE players ADD COLUMN pw_hash TEXT;
ALTER TABLE players ADD COLUMN pw_salt TEXT;
ALTER TABLE players ADD COLUMN pw_iter INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS players_login ON players (login);
-- 用登入名＋密碼登入的手機：每支手機自己的登入碼雜湊
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, player TEXT NOT NULL, created INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_player ON sessions (player, created);
-- 猜密碼限制：每個登入名（n:）、每個網路位址（ip:）錯了幾次、從什麼時候開始算
CREATE TABLE IF NOT EXISTS login_fails (k TEXT PRIMARY KEY, n INTEGER NOT NULL, first INTEGER NOT NULL);

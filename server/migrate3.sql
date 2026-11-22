-- 推播通知（2026-11-22）
-- push_subs：每支手機的推播訂閱（endpoint 是瀏覽器給的網址，本身就很難猜）
CREATE TABLE IF NOT EXISTS push_subs (endpoint TEXT PRIMARY KEY, player TEXT NOT NULL, created INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS push_subs_player ON push_subs(player);
-- push_queue：等手機來拿的通知內容（推播本身不帶內容，手機收到後再來拿，就不用做內容加密）
CREATE TABLE IF NOT EXISTS push_queue (id INTEGER PRIMARY KEY AUTOINCREMENT, endpoint TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, tag TEXT, created INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS push_queue_ep ON push_queue(endpoint);
-- eta：關掉遊戲時，登山客預計走到山頂前的時間（排程每 5 分鐘檢查一次）
CREATE TABLE IF NOT EXISTS eta (player TEXT PRIMARY KEY, mountain TEXT NOT NULL, name TEXT NOT NULL, at INTEGER NOT NULL, sent INTEGER NOT NULL DEFAULT 0);

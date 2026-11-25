-- 裝備系統・組隊（2026-11-25）：已經在跑的資料庫要先跑這個，再部署新版伺服器
-- team_members.gear：隊員回報的裝備狀況（JSON：{ warn:[{ id, dur }], carry:[id] }）
-- gear_gifts：幫隊友修裝備的紀錄；同一個人一天只能幫同一位隊友一次
ALTER TABLE team_members ADD COLUMN gear TEXT;
CREATE TABLE IF NOT EXISTS gear_gifts (id TEXT PRIMARY KEY, frm TEXT NOT NULL, dst TEXT NOT NULL, item TEXT NOT NULL, day TEXT NOT NULL, at INTEGER NOT NULL, taken INTEGER NOT NULL DEFAULT 0, UNIQUE (frm, dst, day));
CREATE INDEX IF NOT EXISTS gear_gifts_dst ON gear_gifts (dst, taken);

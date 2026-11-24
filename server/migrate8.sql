-- 維修模式（2026-11-24）：已經在跑的資料庫要先跑這個，再部署新版伺服器
-- 只有一列（id＝1）：start 幾點開始整修、eta 預計幾點好（都是毫秒時間）。沒有這一列＝沒有維修
-- start 還沒到＝預約（遊戲預告）；start 過了＝整修中（除了 /api/maint、/api/admin、/api/health 一律回 503）；結束維修＝刪掉這一列
CREATE TABLE IF NOT EXISTS maint (id INTEGER PRIMARY KEY CHECK (id = 1), start INTEGER NOT NULL, eta INTEGER NOT NULL);

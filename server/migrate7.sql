-- 好友跟隨（隊伍）（2026-11-24）：已經在跑的資料庫要先跑這個，再部署新版伺服器
-- 規格：docs/好友跟隨與好感度.md 第二節。隊伍人數上限、隊長交接時間都只寫在 server/src/index.js 的 TEAM
-- 我能爬的山：{ 山 id: 關著遊戲自己從登山口走到山頂要幾分鐘 }（隊長選山時取全隊交集；離線的人用最後一次回報的）
ALTER TABLE players ADD COLUMN unlocks TEXT;
-- 邀請跟隨：這張邀請是邀進哪一支隊伍（舊的「一起爬」邀請沒有，不再使用）
ALTER TABLE invites ADD COLUMN team TEXT;
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

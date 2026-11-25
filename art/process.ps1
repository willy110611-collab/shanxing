# 山行小日子：把 art\raw 裡 Gemini 畫的圖轉成遊戲用素材
# 用法：在 PowerShell 執行  .\art\process.ps1
# - art\raw 底下可以分資料夾；檔名只要「含有」繪圖清單上的英文名字就認得
#   （例如「6. hiker_walk (16.9 洋紅底).jfif」→ hiker_walk）。認不出來的會列出來，不會亂套。
# - 天空、路面、地圖、奇遇插圖、廣場背景：縮到合適大小存成 jpg
# - 其他（洋紅底的物件、人物、前景）：去掉洋紅底，存成透明 webp
# - 最後重寫 art\manifest.json（遊戲靠這份清單知道哪些圖已經有了）
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$raw = Join-Path $here 'raw'
# 不去背的整張圖：天空、路面、奇遇／登頂插圖、廣場背景、出發前的小山讀取圖（load_，2:1 米色紙底：左半線稿、右半上色）、頁面背景、區域立體地圖（map_ 加上 data.js SX.REGIONS 的代號；map_pin 這類是去背小圖）
$regBlock = [regex]::Match([IO.File]::ReadAllText((Join-Path $here '..\js\data.js')), '(?s)SX\.REGIONS\s*=\s*\[(.*?)\];').Groups[1].Value
$regions = [regex]::Matches($regBlock, "^\s*\{\s*id:'([a-z0-9_]+)'", 'Multiline') | ForEach-Object { $_.Groups[1].Value }
$mtBlock = [regex]::Match([IO.File]::ReadAllText((Join-Path $here '..\js\data.js')), '(?s)SX\.MOUNTAINS\s*=\s*\[(.*?)\];').Groups[1].Value
$mts = [regex]::Matches($mtBlock, "^\s*\{\s*id:'([a-z0-9_]+)'", 'Multiline') | ForEach-Object { $_.Groups[1].Value }
$opaque = '^(sky_|ground_|enc_|scene_|plaza_|load_|cover_|ui_page$|summit_(' + ($mts -join '|') + ')$|map_(' + ($regions -join '|') + ')$)'
# 只在網頁上顯示、不畫在畫布上的圖：寶物卡、集印、介面木框和按鈕、圖示、稀有度、徽章、標題
# 2026-11-24 iPhone「重複發生問題」：開遊戲時把所有圖都解開放在記憶體（約 540 MB）整頁當掉。這些圖改成用到才下載、由網頁自己顯示，
# 透明邊在轉檔時就裁掉（art\trim.js），遊戲不再先解成畫布再裁。
# 要畫在畫布上的圖不能放進來（tools/check.js 會擋）：face_ 狀態臉、wx_ 右上天氣、emo_ 廣場頭上的表情、map_ 地圖、icon_lock 地圖木牌上的鎖
# icon_locate（地圖左下「我的位置」圓木牌，第 27 批）是網頁按鈕的背景圖：照 icon_ 這組走（只在網頁上、用到才下載、讀取畫面先下載），去洋紅底存透明 webp
$htmlOnly = '^(t_|stamp_|ui_|icon_(?!lock$)|rarity_|badge_|title_logo$|encounter_frame$|cover_(portrait|key)$|mist_(tl|tr|bl|br)$)'
# 不在開遊戲時下載，跳出卡片、打開視窗時才載（manifest 標 lazy）：大插圖＋只在網頁上顯示的圖＋出發前的小山讀取圖（load_<山>，按下出發才下載那一座的，js/mtload.js）
$lazy = '^(enc_|scene_|load_|summit_(' + ($mts -join '|') + ')$)|' + $htmlOnly
# 介面的按鈕、木框、圖示每個畫面都看得到：讀取畫面時就先下載好（manifest 標 pre），只下載、不解開放記憶體
# （2026-11-24 改成用到才下載後，更新完第一次打開按鈕透明到圖下載完，決定先下載好）。寶物卡、集印照樣打開背包才下載
# 封面（cover_portrait 直版、cover_key 橫版，不去背的整張圖）、點封面後往四面散開的四團雲（mist_tl／mist_tr／mist_bl／mist_br，去洋紅底）：讀取畫面跑完就要用，也先下載好
$pre = '^(ui_|icon_|rarity_|badge_|title_logo$|encounter_frame$|cover_(portrait|key)$|mist_(tl|tr|bl|br)$)'

# 合法的名字只有一個來源：docs\GEMINI繪圖清單.md 裡用反引號標起來的英文名
$doc = [IO.File]::ReadAllText((Join-Path $here '..\docs\GEMINI繪圖清單.md'))
$known = @{}
[regex]::Matches($doc, '`([a-z][a-z0-9_]*)`') | ForEach-Object { $known[$_.Groups[1].Value] = 1 }

$skipped = @(); $seen = @{}
$tmpDir = Join-Path ([IO.Path]::GetTempPath()) "shanxing_art_$PID"; New-Item -ItemType Directory -Force $tmpDir | Out-Null
# 解碼後的像素指紋：同一張圖重新轉檔，像素一樣就算沒變
function PixelSum($f) { (& ffmpeg -v error -i $f -map 0:v -f hash -hash sha256 -) -join '' }
$node = (Get-Command node -ErrorAction SilentlyContinue).Source; if (-not $node) { $node = 'C:\Program Files\nodejs\node.exe' }
Get-ChildItem $raw -File -Recurse | Where-Object { $_.Extension -match '^\.(png|jpe?g|jfif|webp)$' } | ForEach-Object {
  # 在檔名裡找第一個清單上有的英文名字
  $name = $null
  foreach ($m in [regex]::Matches($_.BaseName.ToLower(), '[a-z][a-z0-9_]*')) { if ($known.ContainsKey($m.Value)) { $name = $m.Value; break } }
  if (-not $name) { $skipped += $_.FullName.Substring($raw.Length + 1); return }
  if ($seen.ContainsKey($name)) { Write-Host "注意：$name 有兩張，用後面這張（$($_.Name)）" }
  $seen[$name] = 1
  # 先轉到暫存檔，跟現有的圖比「像素」：一樣就留舊檔不動（檔案內容不變，manifest 的 v 就不變，玩家不用重新下載）
  # 尺寸上限以手機為準（畫面 375 寬 × 2 倍像素），再大只是多下載
  if ($name -match $opaque) {
    $out = Join-Path $here "$name.jpg"; $tmp = Join-Path $tmpDir "$name.jpg"
    # 長邊不超過 $max（直式的地圖以高度算）
    $max = if ($name -like 'ground_*') { 768 } elseif ($name -like 'map_*') { 2048 } elseif ($name -like 'enc_*') { 960 } else { 1600 }   # 奇遇插圖在卡片上只有約 300 像素寬
    # 出發前的小山讀取圖：左半線稿、右半上色要對齊（art 的 loadreg.js 找出兩半差幾像素、把右半挪回去；對不上就停下來請重畫）
    $src = $_.FullName
    if ($name -like 'load_*') { $src = Join-Path $tmpDir "$name.reg.png"; & $node (Join-Path $here 'loadreg.js') $_.FullName $src | Write-Host; if ($LASTEXITCODE) { throw "小山讀取圖左右兩半對不上：$($_.Name)" } }
    ffmpeg -v error -y -i $src -vf "scale='min(iw,$max)':'min(ih,$max)':force_original_aspect_ratio=decrease" -q:v 4 $tmp
  } else {
    # 透明圖存 WebP（同畫質比 png 小十倍左右）
    $out = Join-Path $here "$name.webp"; $tmp = Join-Path $tmpDir "$name.webp"
    # 寵物（含第一批 shiba_walk）的舊四格走路圖只剩世界地圖和備用：寵物在畫面上不到 60 像素高，800 寬（每格 200）就夠
    $max = if ($name -match '^hiker_.*walk$') { 1600 } elseif ($name -match '_walk$') { 800 } elseif ($name -match '^frame_') { 1080 } else { 720 }
    # 去洋紅底：art\despill.js 在原圖尺寸把邊緣的洋紅混色解開（變透明＋換回圖的顏色）、透明處填圖的顏色，再縮圖存 webp
    # 遊戲載入時不再處理，所以洋紅一定要在這裡清乾淨（tools\artscan.js 會檢查）
    & $node (Join-Path $here 'despill.js') $_.FullName $tmp $max | Out-Null
    if ($LASTEXITCODE) { throw "去背失敗：$($_.Name)" }
    if ($name -match $htmlOnly) { & $node (Join-Path $here 'trim.js') $tmp | Out-Null; if ($LASTEXITCODE) { throw "裁透明邊失敗：$($_.Name)" } }
  }
  if ((Test-Path $out) -and ((PixelSum $out) -eq (PixelSum $tmp))) { Remove-Item $tmp; Write-Host "沒變 $name"; return }
  # 圖真的換了：同名的舊輸出刪掉（換格式時才不會留下兩張同名圖），換上新的
  Get-ChildItem $here -File | Where-Object { $_.BaseName -eq $name -and $_.Extension -match '^\.(png|jpg|webp)$' } | Remove-Item
  Move-Item $tmp $out
  Write-Host "完成 $name"
}
Remove-Item $tmpDir -Recurse -Force
if ($skipped.Count) { Write-Host "`n認不出名字、沒有處理（檔名裡加上清單上的英文名就會處理）："; $skipped | ForEach-Object { Write-Host "  $_" } }

# 產生清單：檔名 + 檔案內容指紋（SHA-1 前 8 碼）。圖換了網址才會變，沒換的圖網址不變，手機不用重新下載
$items = Get-ChildItem $here -File | Where-Object { $_.Extension -match '^\.(png|jpg|webp)$' } | Sort-Object Name | ForEach-Object {
  $v = (Get-FileHash -Algorithm SHA1 $_.FullName).Hash.Substring(0, 8).ToLower()
  '{"file":"' + $_.Name + '","v":"' + $v + '"' + ($(if ($_.BaseName -match $lazy) { ',"lazy":1' } else { '' })) + ($(if ($_.BaseName -match $pre) { ',"pre":1' } else { '' })) + '}'
}
$json = '[' + (($items) -join ",`n ") + ']'
[IO.File]::WriteAllText((Join-Path $here 'manifest.json'), $json + "`n", (New-Object System.Text.UTF8Encoding $false))
Write-Host "清單已更新：$(@($items).Count) 張"
# 立體地圖：跟真實海岸線對齊，結果寫進 manifest 的 fit（山的位置靠這個換算）
$fitTool = Join-Path $here '..\tools\mapfit.js'
if ((Test-Path $fitTool) -and (Get-ChildItem $here -File -Filter 'map_*')) { & $node $fitTool }

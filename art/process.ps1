# 山行小日子：把 art\raw 裡 Gemini 畫的圖轉成遊戲用素材
# 用法：在 PowerShell 執行  .\art\process.ps1
# - 天空、路面、地圖、奇遇插圖：縮到合適大小存成 jpg
# - 其他（洋紅底的物件、人物、前景）：去掉洋紅底，存成透明 png
# - 最後重寫 art\manifest.json（遊戲靠這份清單知道哪些圖已經有了）
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$raw = Join-Path $here 'raw'
$opaque = '^(sky_|ground_|map_|enc_)'
Get-ChildItem $raw -File | Where-Object { $_.Extension -match '^\.(png|jpe?g|webp)$' } | ForEach-Object {
  $name = $_.BaseName.ToLower()
  if ($name -match $opaque) {
    $out = Join-Path $here "$name.jpg"
    $max = if ($name -like 'ground_*') { 1024 } else { 2048 }
    ffmpeg -v error -y -i $_.FullName -vf "scale='min($max,iw)':-2" -q:v 3 $out
  } else {
    $out = Join-Path $here "$name.png"
    $max = if ($name -match '_walk$|^frame_') { 2400 } else { 1200 }
    # 去洋紅底：colorkey 去背（容許 Gemini 畫得不是很純的洋紅），再縮圖
    ffmpeg -v error -y -i $_.FullName -vf "format=rgba,colorkey=0xFF00FF:0.34:0.10,scale='min($max,iw)':-2" $out
  }
  Write-Host "完成 $name"
}

# 產生清單：檔名 + 修改時間（圖換新時網址會跟著變，手機才不會卡舊圖）
$items = Get-ChildItem $here -File | Where-Object { $_.Extension -match '^\.(png|jpg)$' } | Sort-Object Name | ForEach-Object {
  '{"file":"' + $_.Name + '","v":' + [int64]($_.LastWriteTimeUtc - [datetime]'1970-01-01').TotalSeconds + '}'
}
$json = '[' + (($items) -join ",`n ") + ']'
[IO.File]::WriteAllText((Join-Path $here 'manifest.json'), $json + "`n", (New-Object System.Text.UTF8Encoding $false))
Write-Host "清單已更新：$(@($items).Count) 張"

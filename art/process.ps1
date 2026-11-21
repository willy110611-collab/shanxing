# 山行小日子：把 art\raw 裡 Gemini 畫的圖轉成遊戲用素材
# 用法：在 PowerShell 執行  .\art\process.ps1
# - 天空、路面、地圖：縮到合適大小存成 jpg
# - 其他（洋紅底的物件、人物、前景）：去掉洋紅底，存成透明 png
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$raw = Join-Path $here 'raw'
$opaque = '^(sky_|ground_|map_)'
Get-ChildItem $raw -File | Where-Object { $_.Extension -match '^\.(png|jpe?g|webp)$' } | ForEach-Object {
  $name = $_.BaseName
  if ($name -match $opaque) {
    $out = Join-Path $here "$name.jpg"
    $max = if ($name -like 'ground_*') { 1024 } else { 2048 }
    ffmpeg -v error -y -i $_.FullName -vf "scale='min($max,iw)':-2" -q:v 3 $out
  } else {
    $out = Join-Path $here "$name.png"
    # 去洋紅底：colorkey 去背，再把邊緣殘留的洋紅色壓掉
    ffmpeg -v error -y -i $_.FullName -vf "format=rgba,colorkey=0xFF00FF:0.32:0.12,scale='min(1600,iw)':-2" $out
  }
  Write-Host "完成 $name"
}

# 山行小日子：請 Gemini 繪製的美術素材清單

畫完的圖放進 `D:\##Claude##\山行\art\raw\`，**檔名照下面表格取**（副檔名 png 或 jpg 都可以）。
放好後跟我說一聲，我會負責去背、裁切、縮圖，再疊成會前進的 2.5D 畫面，並加上光束、落葉、霧氣等動態效果。

建議先畫「第一批」（12 張），我就能先做出接近影片的版本；第二批之後再補。

---

## 共通規則（每一張都要貼在提示詞最前面）

```
Hand-painted anime film background art, warm healing mood like a Japanese animated film (original artwork, no existing characters), delicate thin dark-brown ink outlines, soft cel shading with gentle painterly gradients, rich natural detail, soft golden afternoon sunlight coming from the upper right, Taiwan high-mountain nature (Taiwan hemlock and fir trees, Yushan rhododendron with pink-white flowers, dwarf bamboo grass, silver grass, mossy rocks). No text, no letters, no logo, no watermark, no UI, no frame.
```

**去背規則**（凡是寫「洋紅底」的圖）：
- 背景必須是**整片純洋紅色 #FF00FF**。不要畫成透明格子、不要陰影落在背景上、不要有地面。
- 物件完整出現在畫面中間，四周留一點洋紅空白，不要被切到。
- 提示詞最後加上：
```
Isolated single object centered on a solid flat pure magenta #FF00FF background, the whole object fully visible with margin, no ground, no cast shadow on the background, no checkerboard.
```

**主角設定**（凡是畫登山客，都要貼這段，確保每張是同一個人）：
```
The same hiker in every image: a young adult hiker seen from directly behind, wide-brim tan safari hat, red-and-black plaid flannel shirt, khaki hiking pants, brown leather hiking boots, a large olive-green trekking backpack with a rolled orange sleeping mat strapped on top, a water bottle in the side pocket, a small tin mug hanging from the pack, holding two silver trekking poles.
```

**柴犬設定**：
```
The same dog in every image: a small cute red shiba inu with cream underside, curled tail over its back, wearing tiny red saddle bags.
```

---

## 第一批（先做這 12 張就能換上新畫風）

| 檔名 | 比例 | 內容（接在共通規則後面） |
|---|---|---|
| `sky_day` | 16:9 | Wide panoramic view from a high mountain ridge: layered blue-green mountain ranges fading into haze, a vast sea of clouds filling the valleys, soft blue sky with a few clouds, bright afternoon, golden light from the upper right. Only distant scenery, nothing in the foreground, the bottom third is mostly the cloud sea. |
| `sky_sunset` | 16:9 | Same panoramic view as above, at sunset: golden-orange sky, pink and amber cloud sea, purple distant ridges, the sun low on the right. |
| `ground_dirt` | 1:1 | Top-down view of a natural mountain dirt trail surface, packed brown earth with small stones, exposed tree roots and a few fallen leaves, seamless tileable texture, even lighting, no shadows from outside objects. |
| `ground_stone` | 1:1 | Top-down view of an old stone-slab hiking path, irregular flat grey stones with moss in the gaps, seamless tileable texture, even lighting. |
| `ground_grass` | 1:1 | Top-down view of alpine meadow grass with dwarf bamboo and tiny wildflowers, seamless tileable texture, even lighting. |
| `hiker_walk` | 16:9 | 洋紅底。The hiker (主角設定) seen from directly behind, slightly from above, full body, shown as a **4-frame walking cycle sprite sheet**: four poses side by side in a single row, evenly spaced, same size and same height in every frame, legs and poles alternating. |
| `hiker_rest` | 1:1 | 洋紅底。The hiker (主角設定) seen from behind, sitting on the ground relaxing, backpack set down beside, holding a steaming cup. |
| `shiba_walk` | 16:9 | 洋紅底。The dog (柴犬設定) seen from directly behind, slightly from above, **4-frame trotting cycle sprite sheet**: four poses side by side in one row, same size. |
| `tree_pine` | 9:16 | 洋紅底。One tall Taiwan hemlock / fir conifer tree, full tree from roots to top. |
| `bush_rhodo` | 1:1 | 洋紅底。One round Yushan rhododendron bush covered with pink-white flower clusters. |
| `rock_moss` | 1:1 | 洋紅底。One large mossy grey boulder with a few ferns at its base. |
| `frame_top` | 9:16 | 洋紅底。Overhanging tree branches and leaves hanging down from the top edge of the picture only (like looking out from under a tree), slightly blurred as if very close to the camera; the lower 70% of the picture is pure magenta. |

## 第二批（豐富沿途景物）

| 檔名 | 比例 | 內容 |
|---|---|---|
| `ground_steps` | 1:1 | Top-down view of wooden log steps on a dirt trail, seamless tileable vertically. |
| `ground_scree` | 1:1 | Top-down view of loose grey scree gravel trail, seamless tileable. |
| `ground_snow` | 1:1 | Top-down view of a snowy trail with footprints, seamless tileable. |
| `grass_silver` | 1:1 | 洋紅底。A clump of silver grass (Miscanthus) with fluffy plumes. |
| `bamboo_dwarf` | 1:1 | 洋紅底。A clump of Yushan dwarf bamboo grass. |
| `fern` | 1:1 | 洋紅底。A lush fern clump. |
| `flowers` | 1:1 | 洋紅底。Small alpine wildflowers (white and yellow) clump. |
| `sign_wood` | 9:16 | 洋紅底。A weathered wooden trail signpost with two blank arrow boards (no text). |
| `bench` | 1:1 | 洋紅底。A rustic wooden bench, 3/4 view from the front. |
| `deck_view` | 16:9 | 洋紅底。A small wooden viewing platform with railings, 3/4 view. |
| `railing` | 16:9 | 洋紅底。A short section of rustic wooden trail railing. |
| `waterfall` | 9:16 | 洋紅底。A small mossy rocky waterfall. |
| `cairn` | 1:1 | 洋紅底。A small stack of flat stones (cairn). |
| `note_post` | 9:16 | 洋紅底。A short wooden post with a paper note pinned on it. |
| `wish_tree` | 9:16 | 洋紅底。A small tree with many little paper wish cards tied on its branches. |
| `frame_bottom` | 9:16 | 洋紅底。Blurred foreground rhododendron flowers and ferns in the bottom-left and bottom-right corners only; the rest of the picture is pure magenta. |
| `hiker_sleep` | 1:1 | 洋紅底。The hiker (主角設定) from behind, napping while leaning on the backpack. |
| `shiba_sit` | 1:1 | 洋紅底。The dog (柴犬設定) from behind, sitting and looking at the view. |
| `sky_dawn` / `sky_night` | 16:9 | Same panorama at dawn (pale pink-blue) / at night (deep blue, stars, moonlit cloud sea). |

## 第三批（地圖）

| 檔名 | 比例 | 內容 |
|---|---|---|
| `map_taiwan` | 9:16 | A miniature tilt-shift diorama of the island of Taiwan seen from high above at an angle, the island as a thick board with visible soil cliff edges, green mountains with a central mountain range running north to south, highest peaks with rocky tops, conifer forests, surrounded by blue ocean with gentle waves and soft fluffy clouds drifting around, warm golden light from the upper right, soft blur at the top and bottom edges. No labels, no text, no pins. |

---

### 小提醒
- 同一批最好在**同一個 Gemini 對話**裡連續畫，風格比較一致。
- 走路連續動作（sprite sheet）如果四格大小不一樣，可以請它「make all four frames exactly the same size and aligned on the same baseline」重畫。
- 畫出來覺得不像影片，可以直接把影片截圖丟給 Gemini，說「照這張的畫風」。

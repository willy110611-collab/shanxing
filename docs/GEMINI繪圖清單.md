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

---

## 第四批：背包寶物（23 張，全部 1:1、洋紅底）

每張提示詞：`Isolated single collectible item illustration for a cozy game inventory, ` + 下面的內容 + 去背規則。
同一批請在同一個對話裡畫，風格會一致。**檔名 = 前面的英文 id**（例如 `t_cloud_bottle.png`）。

| 檔名 | 名稱 | 內容 |
|---|---|---|
| `t_clean_pledge` | 環保小卡 | a small paper card with a leaf and a tiny trash bag doodle |
| `t_cairn_stone` | 石堆祝福卡 | a paper card with a drawing of a small stone cairn |
| `t_thanks_postcard` | 道謝明信片 | a handwritten thank-you postcard with a mountain doodle |
| `t_hut_stamp` | 山屋紀念章 | a round red rubber-stamp impression of a mountain hut on paper |
| `t_summit_stamp` | 登頂紀念章 | a round red rubber-stamp impression of a mountain peak with a flag |
| `t_tea_card` | 山茶花小卡 | a small card with a camellia flower and a cup of tea |
| `t_fog_note` | 霧中便條 | a slightly damp paper note in soft mist |
| `t_sunset_photo` | 夕陽照片 | a polaroid photo of a golden sunset over a cloud sea |
| `t_rain_card` | 雨後小卡 | a card with raindrops and a small rainbow over the mountains |
| `t_hiker_postcard` | 舊明信片 | an old sepia vintage postcard of hikers on a ridge |
| `t_bird_photo` | 藍鵲的一瞥 | a polaroid photo of a Taiwan blue magpie on a branch |
| `t_cone_card` | 玉山圓柏毬果圖鑑卡 | a botanical field-guide card of a juniper cone and twig |
| `t_rubbing` | 古老三角點拓印 | a charcoal rubbing on paper of an old survey triangulation marker |
| `t_bird_feather_photo` | 帝雉的尾羽照片 | a photo of a Mikado pheasant's long barred tail feathers |
| `t_deer_track_card` | 山羌足跡拓印卡 | a card with an ink rubbing of small muntjac deer hoof prints |
| `t_cloud_bottle` | 雲海瓶 | a small corked glass bottle with a swirling sea of clouds inside, glowing softly |
| `t_rhodo_card` | 高山杜鵑明信卡 | a postcard of pink-white Yushan rhododendron flowers |
| `t_lake_map` | 嘉明湖湖畔地圖 | a hand-drawn treasure-style map of an oval blue alpine lake |
| `t_angel_tear_card` | 天使的眼淚明信片 | a postcard of a sapphire-blue alpine lake shaped like a teardrop, sparkling (legendary feel, golden border) |
| `t_starlight_stamp` | 滿天星空紀念章 | a deep-blue stamp impression with a starry sky and mountain silhouette, golden glow |
| `t_old_triangle` | 百年三角點的回憶 | a weathered old stone survey marker with moss, golden glow (legendary) |
| `t_summit_dawn` | 晨光山頂照片 | a polaroid of a summit at sunrise with golden light rays (legendary) |
| `t_forest_bell` | 林間風鈴卡 | a card with a small glass wind chime hanging in a forest, sparkling (legendary) |

## 第五批：寵物（每隻 2 張，洋紅底）

每隻一張「背影走路四格」（16:9，同 `shiba_walk` 的寫法）和一張「正面大頭照」（1:1，用在寵物選擇畫面）。

| 檔名 | 內容 |
|---|---|
| `pet_shiba_walk` / `pet_shiba_face` | 柴犬（用柴犬設定） |
| `pet_bear_walk` / `pet_bear_face` | a cute Formosan black bear cub with the white V-shaped chest mark, small backpack |
| `pet_leopardcat_walk` / `pet_leopardcat_face` | a cute Taiwan leopard cat (spotted, white stripes on forehead, round ears) |
| `pet_magpie_walk` / `pet_magpie_face` | a cute Taiwan blue magpie (long blue tail, red beak), hopping / flying low |

## 第六批：介面（洋紅底，除非另外寫）

| 檔名 | 比例 | 內容 |
|---|---|---|
| `ui_panel` | 16:9 | An empty rectangular hand-crafted wooden sign board frame with rounded corners and nail heads, warm wood grain, the center is a light parchment panel, no text. |
| `ui_button` | 16:9 | An empty small rounded wooden button plank with ink outline, no text. |
| `ui_card` | 9:16 | An empty vertical wooden-framed parchment card (for a mountain info card), no text. |
| `icon_map` `icon_bag` `icon_album` `icon_settings` `icon_rest` `icon_camera` `icon_upload` | 1:1 | Each one a separate small round game icon in the same style: folded trail map / canvas hiking bag / photo album / brass gear / small tent / vintage camera / photo with an up arrow. |
| `face_happy` `face_ok` `face_tired` `face_cold` `face_sleep` | 1:1 | The hiker's face as a round portrait icon (same hat), expressions: happy smiling / calm / tired and sweating / shivering cold with blue cheeks / sleeping with Zzz. |
| `badge_quest` | 1:1 | An empty round brass medal badge with a mountain relief and laurel, no text. |
| `rarity_common` `rarity_rare` `rarity_legend` | 1:1 | Three empty item-slot frames: plain wood / silver-blue with small gems / gold with sparkles. |
| `encounter_frame` | 9:16 | An empty storybook-style illustrated frame with leaves and flowers around the edges for event cards, parchment center, no text. |
| `title_logo` | 16:9 | A title logo plate: wooden sign with carved Chinese characters 「山行小日子」, small mountain and cloud decorations. （這張可以有字） |

## 第七批：奇遇插圖（之後再畫也可以）

奇遇卡片上方的小插圖，16:9，不用去背，每張一個場景。**檔名照下表取**，放進去就會自動出現在對應的奇遇上。

| 檔名 | 場景 |
|---|---|
| `enc_e05` | A kind elderly hiker uncle offering a tea egg to the hiker on the trail |
| `enc_e04` | A Mikado pheasant with long barred tail feathers on a mossy branch in sunlight |
| `enc_e03` | A group of Formosan macaques eating fruit in a tree, curious about the hiker's backpack |
| `enc_e02` | A Reeves's muntjac deer peeking out of the grass beside the trail |
| `enc_e09` | A sea of clouds suddenly rising up from the valley, everything turning white |
| `enc_e06` | The hiker crouching to stretch a cramped calf, pulling the toes back |
| `enc_e13` | A mountain porter carrying a big supply box up the trail, nodding hello |
| `enc_e14` | A steaming bowl of instant noodles in a wooden pavilion on the mountain |
| `enc_e10` | Thick fog on the trail, a wooden trail marker appearing through the mist |
| `enc_e08` | The hiker picking up a dropped plastic bag of litter to carry down the mountain |

（其他奇遇沒有圖時，會照舊顯示程式畫的小圖示。之後想加，檔名就是 `enc_` 加上奇遇代號。）

## 第八批：登山口廣場（山友大廳）

不用去背，整張畫。畫面下方大約 2/3 是空的石板廣場地面（山友的角色會走在上面，所以地上不要畫人、不要畫大東西擋住）。

| 檔名 | 比例 | 內容 |
|---|---|---|
| `plaza_bg` | 9:16 | A cozy Taiwan mountain trailhead plaza seen from a high angle, looking slightly down: the bottom two-thirds of the picture is an open, empty flagstone plaza floor receding into the distance (no people, no animals, nothing standing in the middle). At the far edge of the plaza: a small wooden mountain hut with warm lit windows on the left, a blank wooden trailhead sign arch in the center where the trail enters the forest, a wooden notice board on the right. Taiwan hemlock trees on both sides, layered blue-green mountains and a little cloud sea in the background, soft golden morning light. |

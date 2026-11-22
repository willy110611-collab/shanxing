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

---

# 第九批：補圖（2026-11-22 整理）

畫面上還有這些東西是程式畫的，跟美術圖放在一起會不搭。**資料夾照現在的分類放**（沒有的資料夾就新建）。
寫「洋紅底」的照共通規則去背；畫人物的照主角設定。**全部不要有文字**（字由遊戲自己寫上去）。

## 放進 `02.素材`（步道上的東西）

| 檔名 | 比例 | 內容 |
|---|---|---|
| `tree_broad` | 9:16 | 洋紅底。One medium broadleaf tree (Taiwan camphor / beech), round full crown of leaves, visible trunk and roots, whole tree from roots to top. |
| `tree_big` | 9:16 | 洋紅底。One huge ancient Taiwan red cypress "sacred tree" with a massive gnarled trunk covered in moss and ferns, whole tree from roots to top. |
| `tree_sakura` | 9:16 | 洋紅底。One Taiwan mountain cherry tree in full bloom (deep pink flowers), whole tree from roots to top. |
| `tree_pine_snow` | 9:16 | 洋紅底。The same Taiwan hemlock / fir tree as tree_pine, but covered with fresh snow on every branch. |
| `grass_tuft` | 1:1 | 洋紅底。A small low clump of wild mountain grass, very simple, ankle height. |
| `treasure_box` | 1:1 | 洋紅底。A small old wooden treasure box with brass corners half hidden in grass, a soft golden glow coming out of the lid gap. |
| `summit_marker` | 9:16 | 洋紅底。A Taiwan mountain summit triangulation stone pillar (square white-grey stone post with a red top band), blank face with no text, a few small rocks around its base. |
| `hiker_rain_walk` | 16:9 | 洋紅底。The hiker (主角設定) seen from directly behind wearing a yellow rain poncho over the backpack, **4-frame walking cycle sprite sheet** like hiker_walk, same size and baseline in every frame. |
| `hiker_summit` | 1:1 | 洋紅底。The hiker (主角設定) seen from behind standing on a summit rock, both trekking poles raised high in celebration. |

## 放進 `03.台灣立體微縮地圖`

| 檔名 | 比例 | 內容 |
|---|---|---|
| `map_pin` | 1:1 | 洋紅底。A small wooden signpost pin stuck in the ground: one short post with a blank horizontal wooden name board and a tiny red cloth flag on top, no text. |
| `map_cloud` | 16:9 | 洋紅底。One soft fluffy white cloud puff, cel-shaded, seen slightly from above, for drifting over a map. |

## 放進 `05.寵物`（坐著的樣子，主角休息時用）

| 檔名 | 比例 | 內容 |
|---|---|---|
| `pet_bear_sit` `pet_leopardcat_sit` `pet_magpie_sit` | 1:1 | 洋紅底。Each pet (same design as its walk sheet) seen from behind, sitting calmly and looking at the view. |

## 放進 `06.介面`

| 檔名 | 比例 | 內容 |
|---|---|---|
| `ui_page` | 9:16 | Full-page background for menu screens (album, settings, lobby list): a warm wooden desk with a soft parchment sheet, gentle vignette, very calm and plain in the middle so text is readable. 不用去背。 |
| `ui_tab` / `ui_tab_on` | 16:9 | 洋紅底。A small blank wooden tab plank (light wood) / the same plank in darker warm wood with a slight glow (selected). |
| `ui_close` | 1:1 | 洋紅底。A small round wooden button with a carved X mark. |
| `ui_toggle_on` / `ui_toggle_off` | 16:9 | 洋紅底。A wooden slide switch: knob on the right with a green leaf inlay (on) / knob on the left, plain (off). |
| `ui_ribbon` | 16:9 | 洋紅底。A blank cloth ribbon banner for window titles, warm cream with brown stitched edges, no text. |
| `ui_bubble` | 16:9 | 洋紅底。A blank hand-drawn speech bubble (cream paper, brown ink outline, small tail at the bottom center). |
| `wx_sun` `wx_cloud` `wx_rain` `wx_fog` `wx_snow` `wx_night` | 1:1 | 洋紅底。Six round weather icons in the same style as the other icons: sun / cloud / rain cloud / fog / snowflake / crescent moon with stars. |
| `emo_wave` `emo_bow` `emo_jump` `emo_sit` `emo_cheer` | 1:1 | 洋紅底。Five small round emote icons: waving hand / bowing / sparkle jump / steaming cup (sit and rest) / party popper (cheer). |

## 放進 `07.奇遇`（16:9，不用去背）

| 檔名 | 場景 |
|---|---|
| `enc_e01` | A friendly hiker coming down the trail smiling and cheering the hiker on |
| `enc_e07` | A kind man sharing slices of watermelon at a trail rest spot |
| `enc_e11` | The hiker crouching to retie a loose bootlace, birds in the trees |
| `enc_e12` | A mountain hut keeper auntie airing quilts, waving with a cup of hot tea |
| `enc_e15` | A butterfly resting on the hiker's backpack |
| `enc_e16` | Looking up at swaying leaves, trying to find a singing bird |
| `enc_e17` | Sudden rain on the trail, the hiker pulling out a rain poncho, raindrops on leaves |
| `enc_e18` | A Taiwan blue magpie flying overhead with its long tail |
| `enc_e19` | A small stone cairn left by other hikers beside the trail |
| `enc_e20` | Strong wind on a summit almost blowing the hiker's hat away |
| `enc_e21` | A little kid running on the trail with the mother calling from behind |
| `enc_e22` | A big flat rock beside a clear mountain stream, perfect for resting |
| `enc_e23` | A confused foreign backpacker holding a map, asking for directions |
| `enc_e24` | Golden evening light rising from the valley over a grassy slope |
| `enc_e25` | Fireflies glowing in the grass along a night trail |
| `enc_e26` | Cherry blossom petals falling on the hiker's shoulder |
| `enc_e27` | Several hikers working together to move fallen rocks off the trail |
| `enc_e28` | The hiker putting away a phone with no signal, listening to the mountain |
| `enc_e29` | Clouds parting to reveal a clear distant mountain ridge |
| `enc_e30` | An old postcard blown onto the trail side by the wind (blank back, no readable text) |
| `enc_e31` | The hiker slipping and grabbing a tree trunk, a little scared |
| `enc_e32` | A grandpa playing Chinese chess in a trail pavilion, inviting the hiker to sit |
| `enc_es_sakura` | 季節限定（櫻花季）：A gust of wind making mountain cherry blossom petals fall like rain over a forest trail, the path turning pink |
| `enc_es_rhodo` | 季節限定（杜鵑季）：A whole alpine slope covered in blooming pink-white Yushan rhododendrons, the hiker standing at a bend in the trail |
| `enc_es_firefly` | 季節限定（螢火蟲季）：Thousands of fireflies glowing over a dark forest valley at night like fallen stars, the hiker with headlamp switched off |
| `enc_es_snow` | 季節限定（雪季）：The first light snowfall of the year on a high mountain trail, tiny snowflakes landing on the hiker's glove |

極稀有奇遇（玩很久才會遇到一次，畫得特別用心一點）：

| 檔名 | 場景 |
|---|---|
| `enc_e33` | Far across a forested valley, a Formosan black bear with the white V mark on its chest walking slowly on a sunny slope, the hiker small in the foreground watching quietly from a safe distance |
| `enc_e34` | A Brocken spectre on a high mountain ridge: the hiker's shadow cast onto a wall of mist, surrounded by a soft rainbow-colored glory ring, sun behind the hiker |
| `enc_e35` | A cloud waterfall: a sea of clouds spilling over a mountain ridge and flowing slowly down into the valley like a white waterfall, soft golden light |
| `enc_e36` | A meteor shower over the Milky Way above dark alpine ridges at night, many shooting stars, the hiker lying on the grass looking up |

## 放進 `07.奇遇`：登頂插圖（16:9，不用去背，抵達山頂時顯示）

| 檔名 | 場景 |
|---|---|
| `summit_xiangshan` | View from Elephant Mountain over the Taipei city skyline and Taipei 101 at sunset |
| `summit_qixing` | Qixing Mountain summit, silver grass, volcanic fumaroles steaming below, Taipei basin far away |
| `summit_guanyin` | Guanyin Mountain summit overlooking the Tamsui river mouth and the sea |
| `summit_matcha` | "Matcha Mountain" (Shengmu trail) bright green grassy ridge like a matcha ice cream, cloudy sea view |
| `summit_alishan` | Alishan sunrise over a sea of clouds with Yushan range silhouettes |
| `summit_taiping` | Taipingshan misty forest with old railway, mossy trees |
| `summit_hehuan` | Hehuan Mountain wide dwarf-bamboo grassland ridges under a deep blue sky |
| `summit_jiaming` | Jiaming Lake, a small deep-blue oval lake ("angel's tear") among grassy alpine slopes |
| `summit_xueshan` | Xueshan main peak with the glacial cirque and rugged rocky ridges |
| `summit_yushan` | Yushan main peak summit at dawn, rocky top, endless sea of clouds |

## 放進 `08.登山口廣場`

| 檔名 | 比例 | 內容 |
|---|---|---|
| `hiker_wave` `hiker_bow` `hiker_cheer` | 1:1 | 洋紅底。The hiker (主角設定) seen from behind: waving one hand / bowing politely / jumping with both arms up cheering. |

## 放進 `09.集印帳`（新資料夾）

| 檔名 | 比例 | 內容 |
|---|---|---|
| `stamp_xiangshan` `stamp_qixing` `stamp_guanyin` `stamp_matcha` `stamp_alishan` `stamp_taiping` `stamp_hehuan` `stamp_jiaming` `stamp_xueshan` `stamp_yushan` | 1:1 | 洋紅底。Ten round red-ink rubber stamp impressions (like Taiwanese trail commemorative stamps), each showing the silhouette of that mountain's famous view (see 登頂插圖 above), slightly uneven ink, **no text**. |

## 放進 `04.背包`、`10.小遊戲`

| 檔名 | 比例 | 內容 |
|---|---|---|
| `stone_a` `stone_b` `stone_c` | 1:1 | 洋紅底。Three different flat river stones for stacking (round grey / oval brown-grey / small pale), seen from the side. 放 `10.小遊戲` |
| `note_paper` | 1:1 | 洋紅底。A small blank wish note paper tied with string. 放 `04.背包` |

## 第十批：讓地面更立體（放進 `02.素材`）

| 檔名 | 比例 | 內容 |
|---|---|---|
| `grass_clumps` | 16:9 | 洋紅底。A row of 8 separate short wild grass clumps of different shapes (ankle height), seen slightly from above at a low angle, evenly spaced, each fully visible, same lighting from the upper right. |
| `trail_bank` | 16:9 | 洋紅底。A horizontal strip of a small soil bank at the edge of a mountain trail seen from the side: a short vertical dirt cut with exposed tree roots and small pebbles, moss on top edge, seamless tileable left-right. |
| `icon_lock` | 1:1 | 洋紅底。A small round brass padlock icon in the same style as the other round icons (warm brass, ink outline, a tiny mountain engraved on the lock body), closed shackle, no text. 放 `06.介面`（地圖上還不能爬的山用） |

## 第十一批：季節限定寶物（放進 `04.背包`，1:1、洋紅底）

只有在真實日期的季節內才拿得到的寶物（例如櫻花季 2/1～3/31 在阿里山、太平山）。畫法跟第四批一樣：
每張提示詞：`Isolated single collectible item illustration for a cozy game inventory, ` + 下面的內容 + 去背規則。**檔名 = 前面的英文 id**。
季節感要明顯（顏色、花、雪），稀有的加一點淡淡的光，傳說的加金色邊框或金光。

| 檔名 | 名稱 | 季節 | 內容 |
|---|---|---|---|
| `t_snow_crystal_stamp` | 雪季冰晶章 | 雪季 | an icy pale-blue round stamp impression shaped like a six-pointed snowflake on paper, frosty sparkles, golden glow (legendary) |
| `t_sakura_bookmark` | 阿里山櫻花書籤 | 櫻花季 | a paper bookmark printed with pink mountain cherry blossoms and a tiny red forest train, with a pink ribbon tassel |
| `t_sakura_photo` | 櫻花雨照片 | 櫻花季 | a polaroid photo of cherry blossom petals falling like rain over a forest trail, soft pink |
| `t_rhodo_pressed` | 玉山杜鵑押花 | 杜鵑季 | a small card with pressed pink-white Yushan rhododendron petals under a thin film, handwritten-style border (no readable text) |
| `t_firefly_jar` | 螢火蟲光點瓶 | 螢火蟲季 | a small corked glass jar holding a night-forest photo full of tiny glowing yellow-green dots, glowing softly, golden glow (legendary) |
| `t_cloudfall_photo` | 夏日雲瀑照片 | 夏日雲瀑 | a polaroid photo of white clouds pouring over a green mountain ridge like a waterfall after a summer afternoon storm |
| `t_maple_postcard` | 楓紅明信片 | 楓紅芒草季 | a postcard of an autumn hillside, half red maple leaves and half silvery-white silver grass |
| `t_cloudsea_card` | 冬日雲海明信片 | 雲海季 | a postcard of a calm winter dawn sea of clouds with distant blue mountain peaks like islands |

## 第 12 批：新奇遇與寶物

為了長期收集新增的奇遇和寶物。奇遇插圖跟第九批「`07.奇遇`」一樣（16:9，不用去背）；寶物跟第四批一樣（放進 `04.背包`，1:1、洋紅底，提示詞前面加 `Isolated single collectible item illustration for a cozy game inventory, `）。稀有的加一點淡淡的光，傳說的加金色邊框或金光。**檔名 = 前面的英文 id**。

### 放進 `07.奇遇`（16:9，不用去背）

| 檔名 | 場景 |
|---|---|
| `enc_e37` | Dusk on the big boulders of Elephant Mountain in Taipei, the city lights below slowly switching on, the hiker sitting on a rock watching quietly |
| `enc_e38` | A colorful Taiwan barbet (green, blue, red and yellow head) peeking out of a tree hole in a lowland forest, the hiker smiling from a distance |
| `enc_e39` | Menghuan Pond on Qixing Mountain in thin mist, small tufts of Taiwan quillwort in the shallow water, a wooden boardwalk with the hiker looking gently |
| `enc_e40` | The Lengshuikeng public foot bath steaming in light rain, a few hikers soaking their feet and chatting, misty volcanic hills behind |
| `enc_e41` | Many grey-faced buzzards circling high in the sky above Guanyin Mountain, the river mouth far below, the hiker looking up with binoculars |
| `enc_e42` | A small mountain lodge (Holy Mother Lodge) on a green ridge in drizzle, the hiker resting on a bench under the eaves with a warm cup |
| `enc_es_maple` | An autumn ridge covered in silvery-white silver grass swaying in the wind, the hiker's hat just peeking above the grass |
| `enc_e43` | The small red Alishan forest train climbing slowly through tall cypress forest, a child waving from the window, the hiker waving back from a viewpoint |
| `enc_e44` | A gigantic ancient red cypress tree beside a wooden boardwalk, sunlight falling from the high canopy, the hiker tiny at its base looking up |
| `enc_e45` | Pre-dawn at the Zhushan sunrise platform, a crowd of small figures, golden light just appearing behind a distant blue mountain ridge |
| `enc_e46` | The tiny Taipingshan bong-bong forest train rolling slowly along a forest track, smiling passengers, the hiker waving beside the rails |
| `enc_e47` | Cuifeng Lake in soft fog, the still water mirroring a cypress forest perfectly, the hiker standing on the shore |
| `enc_e48` | A small wine-red Taiwan rosefinch perched on dwarf bamboo on an alpine slope, the hiker crouching far away with a camera |
| `enc_e49` | A white-whiskered laughingthrush with golden wing patches singing at the edge of a dwarf bamboo trail, the hiker walking slowly |
| `enc_es_rime` | Fir branches covered in white rime ice like sugar frosting in a snowy mountain forest, soft fog, sparkling ice crystals |
| `enc_e50` | A few sambar deer grazing on a distant alpine grass slope at dusk, big ears turning, the hiker standing still far away |
| `enc_e51` | Night at Jiaming Lake, the deep blue oval lake (Angel's Tears) holding the reflection of a full moon, the hiker sitting quietly on the grassy shore |
| `enc_e52` | A mountain guide cooking a big pot of steaming soup outside a mountain cabin at evening, handing a bowl to the hiker |
| `enc_e53` | The Black Forest of Snow Mountain: tall dark fir trees, thick moss on the ground, misty light, the hiker walking softly |
| `enc_e54` | Sunset at the 369 Lodge with its yellow roof on a wide grassy slope, hikers sitting at the door watching the orange sky |
| `enc_e55` | A tiny glistening Taiwan salamander near a rock crevice on a misty glacial cirque scree slope, the hiker kneeling far back just watching, not touching |
| `enc_e56` | Before dawn at Paiyun Lodge, hikers with headlamps gathering at the door under the stars, ready to set off for the sunrise |
| `enc_e57` | A silvery-white forest of dead trees (white wood forest) in mist, low twisted Yushan junipers hugging the slope, the hiker walking slowly |

### 放進 `04.背包`（1:1、洋紅底）

| 檔名 | 名稱 | 內容 |
|---|---|---|
| `t_mengxiang_card` | 夢幻湖水韭圖鑑卡 | a small field-guide card illustrating tufts of Taiwan quillwort in a pond, soft glow (rare) |
| `t_sacredmother_stamp` | 聖母山莊紀念章 | a round green stamp impression of a small mountain lodge on a ridge, ink slightly blurred by rain |
| `t_train_ticket` | 小火車紀念車票 | an old-style hard cardboard train ticket printed with a small red forest train and cypress trees (no readable text) |
| `t_bongbong_ticket` | 蹦蹦車紀念車票 | a cute paper souvenir ticket printed with a tiny bong-bong forest rail car (no readable text) |
| `t_cuifeng_card` | 翠峰湖倒影明信片 | a postcard of a misty lake mirroring a cypress forest above and below, soft glow (rare) |
| `t_rosefinch_photo` | 酒紅朱雀的一瞥 | a polaroid photo of a small wine-red rosefinch on dwarf bamboo, soft glow (rare) |
| `t_whitebrow_card` | 金翼白眉圖鑑卡 | a small field-guide card of a laughingthrush with golden wing patches and music-note doodles, soft glow (rare) |
| `t_369_stamp` | 369山莊紀念章 | a round orange stamp impression of a yellow-roofed lodge on a grassy slope |
| `t_paiyun_stamp` | 排雲山莊紀念章 | a round red stamp impression of a stone mountain lodge under a high peak and stars |
| `t_whitewood_photo` | 白木林照片 | a polaroid photo of silvery-white dead trees in mist, like an ink painting, soft glow (rare) |
| `t_salamander_card` | 雪山山椒魚圖鑑卡 | a field-guide card of a tiny brown salamander beside a mossy rock crevice, golden border and golden glow (legendary) |
| `t_moon_lake_photo` | 天使的眼淚月光照片 | a polaroid photo of a deep blue alpine lake at night reflecting the full moon, silver sparkles, golden border and golden glow (legendary) |
| `t_rime_photo` | 霧淞照片 | a polaroid photo of fir branches covered in white rime ice like sugar frosting, frosty sparkles, soft glow (rare, snow season) |

## 第 13 批：階梯、欄杆與兩側植物牆（放進 `02.素材`）

目前階梯的「立面」（每一階朝向你的那一面）和欄杆都是程式用單色畫的，所以看起來很假。這批畫好後會換掉。路面貼圖不用去背（存成 jpg），欄杆和植物要洋紅底。

| 檔名 | 比例 | 內容 |
|---|---|---|
| `ground_riser_stone` | 16:9 | 不用去背。Straight-on front view at eye level of the vertical front faces of old granite stone steps on a Taiwan mountain trail: one horizontal band of rough grey cut-stone blocks of slightly different sizes, moss and tiny ferns in the joints, a worn and slightly chipped top edge, seamless tileable left-right, even soft lighting, the band fills the whole image. |
| `ground_stone_moss` | 1:1 | 不用去背。Top-down view of the flat tops of old mossy granite stone steps, irregular grey slabs with thick green moss and fallen hemlock needles in the gaps, a few small leaves, seamless tileable texture, even lighting. |
| `ground_riser_wood` | 16:9 | 不用去背。Straight-on front view at eye level of the front edges of wooden log steps on a dirt mountain trail: one horizontal band of round weathered logs held by short wooden stakes, packed brown soil behind, a little moss, seamless tileable left-right, even soft lighting, the band fills the whole image. |
| `rail_post` | 9:16 | 洋紅底。A single weathered wooden trail railing post (square timber, about waist height), slightly darker at the base, small notch at the top where a handrail rests, ink outline, lit from the upper right. |
| `rail_bar` | 16:9 | 洋紅底。One long horizontal peeled-log handrail for a mountain trail railing, smooth worn top where hands touch, visible wood grain, both ends cut flat, lit from the upper right. |
| `hedge_fern` | 1:1 | 洋紅底。A dense waist-high clump of Taiwan mountain ferns and low shrubs growing at the edge of a forest trail, wider than tall, lush and layered, lit from the upper right. |
| `bamboo_tall` | 9:16 | 洋紅底。A tall dense clump of Yushan dwarf bamboo (Yushania niitakayamensis) about two metres high, many thin stems with narrow leaves, lit from the upper right. |
| `trunk_close` | 9:16 | 洋紅底。One tall straight Taiwan hemlock trunk with rough bark, moss and a little ivy, only a few small branches near the top, whole trunk visible from roots to top, lit from the upper right. |

參考感覺：台灣步道的陡石階一路往上爬、兩側被森林包住、一側或兩側有木頭欄杆（就像你之前給的那幾張照片）。
## 第 14 批：合歡群峰登頂插圖（放進 `07.奇遇`，16:9，不用去背，抵達山頂時顯示）

合歡山拆成五座百岳（合歡群峰）。合歡主峰沿用上面的 `summit_hehuan`；下面四座還沒畫之前，遊戲會先借用 `summit_hehuan`。畫法跟上面的登頂插圖一樣。

| 檔名 | 場景 |
|---|---|
| `summit_hh_shimen` | Shimen Mountain (Hehuan range) summit: a gentle dwarf-bamboo grass slope right above a winding mountain highway, the rounded Hehuan main peak across the valley, clear blue sky |
| `summit_hh_east` | Hehuan East Peak summit after a very steep stone-step climb, looking down at a small alpine lodge far below and the jagged Qilai ridges to the east |
| `summit_hh_north` | Hehuan North Peak summit with a stone triangulation marker, wide green dwarf-bamboo ridges, pink alpine rhododendron bushes, Qilai and Xueshan ranges on the horizon |
| `summit_hh_west` | Hehuan West Peak summit at the end of a long remote bamboo ridge, a lonely triangulation stone, rolling ridgelines and a sea of clouds in the late afternoon light |

## 第 15 批：百岳第二階段（玉山群峰、雪山東峰、向陽山、三叉山）＋合歡群峰集印章

共通規則、主角設定、去背規則照最前面。檔名已定，直接照抄。集印章最後四個是合歡群峰（石門山、東峰、北峰、西峰）。

### 放進 `07.奇遇`：登頂插圖（16:9，不用去背，抵達山頂時顯示）

| 檔名 | 場景 |
|---|---|
| `summit_yushan_front` | Yushan Front Peak summit, a steep grey scree slope with a few twisted Yushan junipers, looking down on the Tataka saddle and forested ridges below, clouds rising from the valley |
| `summit_yushan_west` | Yushan West Peak summit among tall Taiwan fir trees, a tiny old stone mountain shrine on the trail, and the huge rocky face of Yushan main peak seen straight across the valley |
| `summit_yushan_north` | Yushan North Peak summit with a small white mountain weather station and wind instruments, the golden sunset-lit Yushan main peak beside it above a sea of clouds |
| `summit_yushan_east` | Yushan East Peak, a sharp jagged rocky summit with steep rock gullies, the hiker wearing a climbing helmet, dramatic deep valleys below and the Central Mountain Range in the distance |
| `summit_xueshan_east` | Xueshan East Peak, a gentle dwarf-bamboo summit with a survey marker, a long wooden-step slope behind, the Holy Ridge and the Nanhu mountains on the horizon |
| `summit_xiangyang` | Xiangyang Mountain summit on a dwarf-bamboo ridge, the huge eroded Xiangyang landslide cliff face across the valley, a small dark alpine pond below |
| `summit_sancha` | Sancha Mountain, a vast rolling golden-green alpine grassland summit with wind sweeping the grass, a tiny deep-blue oval lake visible far away, a simple stone memorial standing quietly |

（雪山主峰、玉山主峰的登頂插圖已有，不用重畫。）

### 放進 `09.集印帳`

| 檔名 | 比例 | 內容 |
|---|---|---|
| `stamp_yushan_front` `stamp_yushan_west` `stamp_yushan_north` `stamp_yushan_east` `stamp_xueshan_east` `stamp_xiangyang` `stamp_sancha` `stamp_hh_shimen` `stamp_hh_east` `stamp_hh_north` `stamp_hh_west` | 1:1 | 洋紅底。Eleven round red-ink rubber stamp impressions in the same style as the existing mountain stamps, each showing the silhouette of that peak's summit view above (shrine / weather station / jagged rock / landslide cliff / grassland and lake), slightly uneven ink, **no text**. |

### 放進 `02.素材`（沿途新物件）

| 檔名 | 比例 | 內容 |
|---|---|---|
| `shrine_small` | 1:1 | 洋紅底。A tiny old mountain shrine made of grey stone with a small tiled roof, a few stones and a little offering in front, Taiwan high-mountain style. |
| `weather_station` | 1:1 | 洋紅底。A small white high-mountain weather station building with a wind vane, anemometer and solar panel on a rocky base. |
| `hut_paiyun` | 16:9 | 洋紅底。A two-storey mountain lodge with a grey roof and wooden porch at the edge of a fir forest, 3/4 view (Paiyun Lodge style), no text on signs. |
| `rock_wall` | 9:16 | 洋紅底。A tall steep grey rock wall with a narrow gully and a few small alpine plants in cracks, as a trail-side climbing section. |
| `hiker_helmet` | 1:1 | 洋紅底。The hiker (主角設定) seen from behind wearing a red climbing helmet over the safari hat strap, gripping a rock with one hand. |

### 放進 `04.背包`：新寶物（全部 1:1、洋紅底）

| 檔名 | 名稱 | 內容 |
|---|---|---|
| `t_front_sticker` | 「前峰不前」貼紙 | a hand-drawn round sticker of a tiny out-of-breath hiker on a steep slope |
| `t_shrine_card` | 西峰山神廟平安小卡 | a small card with a photo of a tiny stone mountain shrine among fir trees |
| `t_weather_log` | 玉山氣象站觀測紀錄卡 | a handwritten weather observation sheet with a grid, a pencil and a small thermometer doodle |
| `t_ridge_sketch` | 十峻之首岩壁速寫 | a pencil sketch of a jagged rock face on cream paper (legendary) |
| `t_crying_slope` | 哭坡過關證書 | a small crooked handwritten certificate with a wooden-step slope doodle and a smiling face |
| `t_cirque_card` | 圈谷冰河遺跡圖鑑卡 | a field-guide card illustrating a glacial cirque bowl |
| `t_landslide_sketch` | 向陽大崩壁素描卡 | a charcoal sketch of a layered eroded cliff face |
| `t_sancha_rubbing` | 三叉山一等三角點拓印 | a charcoal rubbing on paper of a first-class survey marker stone |

### 放進 `07.奇遇`：下山插圖（16:9，不用去背，按「下山」時顯示）

| 檔名 | 場景 |
|---|---|
| `scene_descend` | The hiker (主角設定) and the shiba seen from behind, walking down old stone steps toward a forest trailhead in warm late-afternoon light, the mountain glowing gold behind them, peaceful and a little wistful |

## 第 16 批：走路更順（八格走路動作，放進 `01.風格`，跟原本 hiker_walk 同一個資料夾）

原本走路只有四格，看起來一頓一頓的。這批改成八格：**兩排、每排四格**（上排第 1～4 格，下排第 5～8 格），八格接起來剛好是完整的一步左腳、一步右腳。到了之後遊戲會自動改用八格版，四格版留著當備用。

| 檔名 | 比例 | 內容 |
|---|---|---|
| `hiker_walk8` | 16:9 | 洋紅底。The hiker (主角設定) seen from directly behind, slightly from above, full body, shown as an **8-frame walking cycle sprite sheet arranged in 2 rows of 4** (frames 1–4 on the top row, 5–8 on the bottom row, read left to right), evenly spaced in a grid, same size and same foot baseline in every frame. One full stride: left foot contact → passing → right foot contact → passing, with the trekking poles swinging opposite to the legs, the backpack bouncing slightly, natural uphill walking posture leaning a little forward. |
| `hiker_rain_walk8` | 16:9 | 洋紅底。Same as hiker_walk8 (same grid, same 8 poses, same size and baseline), but the hiker wears a yellow rain poncho over the backpack. |

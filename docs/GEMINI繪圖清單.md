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
| `title_logo` | 16:9 | A title logo plate: wooden sign with carved Chinese characters 「森呼吸」, small mountain and cloud decorations. （這張可以有字；舊的「山行小日子」木牌已經不用，畫好新的才會出現在地圖左上角） |
| `cover_portrait` | 9:16 | 不用洋紅底。直版封面（開遊戲讀取完顯示，輕點進入）：森呼吸標題在上方三分之一、登山客和柴犬背影在下方、最下面 12% 只有草和步道（遊戲在那裡放一行字）。提示詞見 `_交付/封面與好友圖示繪圖包/提示詞.md`。 |
| `cover_key` | 16:9 | 不用洋紅底。橫版封面（森呼吸主視覺），電腦或橫放的螢幕用。 |

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
| `summit_yushan_west` | Yushan West Peak summit among tall Taiwan fir trees, a tiny old stone niche by the trail, and the huge rocky face of Yushan main peak seen straight across the valley |
| `summit_yushan_north` | Yushan North Peak summit with a small white mountain weather station and wind instruments, the golden sunset-lit Yushan main peak beside it above a sea of clouds |
| `summit_yushan_east` | Yushan East Peak, a sharp jagged rocky summit with steep rock gullies, the hiker wearing a climbing helmet, dramatic deep valleys below and the Central Mountain Range in the distance |
| `summit_xueshan_east` | Xueshan East Peak, a gentle dwarf-bamboo summit with a survey marker, a long wooden-step slope behind, the Holy Ridge and the Nanhu mountains on the horizon |
| `summit_xiangyang` | Xiangyang Mountain summit on a dwarf-bamboo ridge, the huge eroded Xiangyang landslide cliff face across the valley, a small dark alpine pond below |
| `summit_sancha` | Sancha Mountain, a vast rolling golden-green alpine grassland summit with wind sweeping the grass, a tiny deep-blue oval lake visible far away, a simple stone memorial standing quietly |

（雪山主峰、玉山主峰的登頂插圖已有，不用重畫。）

### 放進 `09.集印帳`

| 檔名 | 比例 | 內容 |
|---|---|---|
| `stamp_yushan_front` `stamp_yushan_west` `stamp_yushan_north` `stamp_yushan_east` `stamp_xueshan_east` `stamp_xiangyang` `stamp_sancha` `stamp_hh_shimen` `stamp_hh_east` `stamp_hh_north` `stamp_hh_west` | 1:1 | 洋紅底。Eleven round red-ink rubber stamp impressions in the same style as the existing mountain stamps, each showing the silhouette of that peak's summit view above (stone niche / weather station / jagged rock / landslide cliff / grassland and lake), slightly uneven ink, **no text**. |

### 放進 `02.素材`（沿途新物件）

| 檔名 | 比例 | 內容 |
|---|---|---|
| `shrine_small` | 1:1 | 洋紅底。A tiny old roadside stone niche (路邊的小石龕) made of grey stone with a small slate roof and a few stacked stones in front, Taiwan high-mountain style. |
| `weather_station` | 1:1 | 洋紅底。A small white high-mountain weather station building with a wind vane, anemometer and solar panel on a rocky base. |
| `hut_paiyun` | 16:9 | 洋紅底。A two-storey mountain lodge with a grey roof and wooden porch at the edge of a fir forest, 3/4 view (Paiyun Lodge style), no text on signs. |
| `rock_wall` | 9:16 | 洋紅底。A tall steep grey rock wall with a narrow gully and a few small alpine plants in cracks, as a trail-side climbing section. |
| `hiker_helmet` | 1:1 | 洋紅底。The hiker (主角設定) seen from behind wearing a red climbing helmet over the safari hat strap, gripping a rock with one hand. |

### 放進 `04.背包`：新寶物（全部 1:1、洋紅底）

| 檔名 | 名稱 | 內容 |
|---|---|---|
| `t_front_sticker` | 「前峰不前」貼紙 | a hand-drawn round sticker of a tiny out-of-breath hiker on a steep slope |
| `t_shrine_card` | （**不需要**：這件寶物已拿掉，不用畫） | — |
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
| `hiker_walk16` | 16:9 | 洋紅底。16 格正背面走路循環（遊戲以 2 列 × 8 欄切）；左右腳交替，格序在 art.js SHEETS 用 order 重排。 |
| `hiker_rain_walk16` | 16:9 | 洋紅底。同 hiker_walk16，穿黃色雨衣、深綠色背包套，姿勢完全相同。 |
| `hiker_stairs16` | 16:9 | 洋紅底。16 格正背面爬石階循環（2 列 × 8 欄）：前 8 格抬左膝、後 8 格抬右膝。 |
| `hiker_rain_stairs16` | 16:9 | 洋紅底。同 hiker_stairs16，穿黃色雨衣。 |
| `hiker_step8` | 16:9 | 洋紅底。1 列 8 格正背面「右腳往前跨一步」（第 4 格兩腳並排）；遊戲把左腳那一步鏡射接上，湊成 16 格走路循環。 |
| `hiker_rain_step8` | 16:9 | 洋紅底。同 hiker_step8，穿黃色雨衣、深綠色背包套，姿勢完全相同。 |
| `hiker_tired_step8` | 16:9 | 洋紅底。1 列 8 格正背面「累了、彎腰拖一小步」右腳那一步；遊戲鏡射接成左腳那一步。 |
| `hiker_rain_tired_step8` | 16:9 | 洋紅底。同 hiker_tired_step8，雨衣＋深綠背包套跟 hiker_rain_step8 一樣，帽子 8 格一致。 |

## 第 17 批：讀取畫面跑步的柴犬（放進 `05.寵物`）

開遊戲時的讀取進度條上，會有一隻柴犬跟著進度往右跑。現在用的是背影走路圖，這張要**側面、往右跑**。

| 檔名 | 比例 | 內容 |
|---|---|---|
| `shiba_run` | 16:9 | 洋紅底。The same shiba (柴犬設定, with its small red saddlebags) seen **from the side, running to the right**, shown as a **4-frame running cycle sprite sheet**: four poses side by side in a single row, evenly spaced, same size and same ground line in every frame, ears up, tail curled, happy bouncy trot. |

## 第 18 批：人物動作細節（放進 `01.風格`，全部洋紅底，畫主角都要貼「主角設定」）

讓登山客跟著體力、地形有不同的樣子。八格的都是**兩排、每排四格**（上排 1～4、下排 5～8），每格大小、腳底線一樣；單張的就是一個姿勢。登山杖一定要**銀灰色**。

| 檔名 | 比例 | 內容 |
|---|---|---|
| `hiker_stairs8` | 16:9 | 洋紅底。The hiker (主角設定) seen from directly behind, slightly from above, **8-frame stair-climbing cycle in 2 rows of 4**: lifting each knee high to step up onto the next stone step, body leaning forward, trekking poles planted on the higher step, backpack bouncing slightly. Same size and foot baseline in every frame. Silver-grey trekking poles. |
| `hiker_tired_walk8` | 16:9 | 洋紅底。The hiker (主角設定) seen from directly behind, **8-frame tired walking cycle in 2 rows of 4**: back bent forward, head lowered, shoulders sagging under the heavy pack, short slow dragging steps, leaning on the trekking poles. Same size and foot baseline in every frame. Silver-grey trekking poles. |
| `hiker_hop4` | 16:9 | 洋紅底。The hiker (主角設定) seen from directly behind, **4-frame happy little hop in a single row**: crouch → small joyful jump with both feet off the ground and one trekking pole raised → landing → standing tall again. Same size, same ground line (the jump frame floats above it). Silver-grey trekking poles. |
| `hiker_turn_walk8` | 16:9 | 洋紅底。The hiker (主角設定) seen from behind but **turned about 25 degrees to the right**, as if walking around a right-hand bend, **8-frame walking cycle in 2 rows of 4**, body leaning slightly into the turn. Same size and foot baseline in every frame. Silver-grey trekking poles. (Left turns will mirror this.) |
| `hiker_breath` | 1:1 | 洋紅底。The hiker (主角設定) seen from behind, stopped on a slope, bent over with both hands resting on the trekking poles, catching breath, shoulders raised. Silver-grey trekking poles. |
| `hiker_drink` | 1:1 | 洋紅底。The hiker (主角設定) seen from behind and slightly to the side, standing and drinking from a water bottle, head tilted back, trekking poles held in the other hand. |
| `hiker_look` | 1:1 | 洋紅底。The hiker (主角設定) seen from behind, standing still and looking out to the side at the view, one hand shading the eyes, trekking poles in the other hand. |
| `hiker_wipe` | 1:1 | 洋紅底。The hiker (主角設定) seen from behind and slightly to the side, wiping sweat from the forehead with the back of the hand, a little tired but smiling. |

## 第 19 批：廣場正面／側面走路、雨天寵物雨衣、雨天動作（全部洋紅底）

| 檔名 | 放進 | 比例 | 內容 |
|---|---|---|---|
| `hiker_front_walk8` | `01.風格` | 16:9 | 洋紅底。The hiker (主角設定) seen **from the front, walking toward the viewer**, smiling, 8-frame walking cycle in 2 rows of 4, same size and foot baseline. Silver-grey trekking poles. |
| `hiker_side_walk8` | `01.風格` | 16:9 | 洋紅底。The hiker (主角設定) seen **from the side, walking to the right**, 8-frame walking cycle in 2 rows of 4, same size and foot baseline. Silver-grey trekking poles. |
| `hiker_rain_stairs8` | `01.風格` | 16:9 | 洋紅底。Same as hiker_stairs8 but wearing the yellow rain poncho over the backpack. |
| `hiker_rain_tired_walk8` | `01.風格` | 16:9 | 洋紅底。Same as hiker_tired_walk8 but wearing the yellow rain poncho over the backpack. |
| `pet_shiba_rain_walk` | `05.寵物` | 16:9 | 洋紅底。The shiba (柴犬設定) seen from directly behind wearing a tiny yellow hooded raincoat, 4-frame trotting cycle in one row, same size as pet_shiba_walk. |
| `pet_bear_rain_walk` | `05.寵物` | 16:9 | 洋紅底。The same small cute Formosan black bear cub as pet_bear_walk, seen from behind wearing a tiny yellow raincoat, 4-frame walking cycle in one row. |
| `pet_leopardcat_rain_walk` | `05.寵物` | 16:9 | 洋紅底。The same leopard cat as pet_leopardcat_walk, seen from behind wearing a tiny yellow raincoat, 4-frame walking cycle in one row. |
| `pet_magpie_rain_walk` | `05.寵物` | 16:9 | 洋紅底。The same Taiwan blue magpie as pet_magpie_walk, seen from behind hopping, wearing a tiny yellow rain cape, 4-frame hopping cycle in one row. |

## 第 20 批：兩座山屋、廣場背景重畫（拿掉像鳥居的木門）

| 檔名 | 放進 | 比例 | 內容 |
|---|---|---|---|
| `hut_369` | `02.素材` | 16:9 | 洋紅底。A long single-storey Taiwan high-mountain lodge in the style of Xueshan 369 Lodge: a low wooden building with a **bright yellow corrugated metal roof**, a row of small windows, a few steps up to the door, set on a grassy slope, 3/4 view, no text on signs. |
| `hut_jiaming` | `02.素材` | 16:9 | 洋紅底。A small simple one-storey Taiwan alpine refuge hut like the Jiaming Lake shelter: a low grey-green metal-and-wood cabin with a shallow roof, one door and two small windows, a few rocks around it, 3/4 view, no text on signs. |
| `plaza_bg` | `08.登山口廣場` | 9:16 | 不用去背（滿版）。Same as the current plaza background, but the gate where the trail enters the forest must be a **simple rustic Taiwanese trailhead archway made of two rough log posts and one log crossbeam with a blank wooden sign board**, NOT a Japanese torii gate (no curved top beam, no double crossbeam, no red or black shrine style). |

## 第 21 批：寵物一步八格走路、藍鵲飛行（全部洋紅底）

| 檔名 | 放進 | 比例 | 內容 |
|---|---|---|---|
| `pet_shiba_step8` | `05.寵物` | 16:9 | 洋紅底。The shiba (柴犬設定) with its small backpack seen from directly behind, 1 row × 8 frames walking, same size and same head height in every frame. |
| `pet_shiba_rain_step8` | `05.寵物` | 16:9 | 洋紅底。Same poses as pet_shiba_step8, wearing the tiny yellow hooded raincoat. |
| `pet_bear_step8` | `05.寵物` | 16:9 | 洋紅底。The Formosan black bear cub (same as pet_bear_walk, backpack) seen from directly behind, 1 row × 8 frames walking, same size and head height. |
| `pet_bear_rain_step8` | `05.寵物` | 16:9 | 洋紅底。Same poses as pet_bear_step8, wearing the yellow raincoat. |
| `pet_leopardcat_step8` | `05.寵物` | 16:9 | 洋紅底。The leopard cat (same as pet_leopardcat_walk) seen from directly behind, 1 row × 8 frames walking, same size and head height. |
| `pet_leopardcat_rain_step8` | `05.寵物` | 16:9 | 洋紅底。Same poses as pet_leopardcat_step8, wearing the yellow raincoat. |
| `pet_magpie_fly12` | `05.寵物` | 16:9 | 洋紅底。The Taiwan blue magpie seen from behind flying, 12-frame wing-flap loop in 2 rows of 6; wings never cross into the next cell. |
| `pet_magpie_rain_fly12` | `05.寵物` | 16:9 | 洋紅底。Same poses as pet_magpie_fly12, wearing the tiny yellow rain cape. |

## 第 22 批：下雨版動作、休息與長椅新姿勢（放進 `01.風格`，全部洋紅底，畫主角都要貼「主角設定」）

每張都要**上傳同名的舊圖當參考**（構圖、大小、腳底位置照舊），雨衣版另外再上傳 `hiker_rain_step8` 當雨衣參考。
**雨衣設定**（雨衣版都貼）：
```
Rain outfit, identical in every image: the same bright yellow hooded rain poncho as the reference hiker_rain_step8 (hood up under the tan safari hat, poncho reaching mid-thigh, sleeves to the wrists), a dark-green rain cover over the backpack with the orange sleeping mat still on top, khaki pants and brown boots below. Trekking poles are silver-grey (not purple).
```

| 檔名 | 比例 | 內容 |
|---|---|---|
| `hiker_rest` | 1:1 | 洋紅底。**重畫**。The hiker (主角設定) seen from behind and slightly above, sitting on a low flat trailside rock, knees bent, backpack set down leaning against the rock on the right, holding a steaming tin mug in both hands, trekking poles leaning on the backpack, shoulders relaxed. The rock is small and fully visible. |
| `hiker_rain_rest` | 1:1 | 洋紅底。Same pose and rock as hiker_rest, wearing the rain outfit (hood up), backpack in its dark-green rain cover. |
| `hiker_bench` | 1:1 | 洋紅底。The hiker (主角設定) seen **directly from behind** sitting on a simple wooden park bench that also faces away from the viewer (we see the bench's backrest and the hiker's back above it), backpack set on the ground beside the bench on the right, trekking poles leaning on the bench end, hiker looking out at the view, one hand holding a tin mug. The whole bench is fully visible. |
| `hiker_rain_bench` | 1:1 | 洋紅底。Same as hiker_bench, wearing the rain outfit (hood up), backpack in its dark-green rain cover. |
| `bench_back` | 1:1 | 洋紅底。The same empty wooden bench as in hiker_bench, seen directly from behind (backrest toward the viewer), on short legs, slightly weathered wood. |
| `hiker_rain_sleep` | 1:1 | 洋紅底。Same pose as hiker_sleep (napping while leaning on the backpack), wearing the rain outfit, hood up. |
| `hiker_rain_summit` | 1:1 | 洋紅底。Same pose as hiker_summit (standing on a summit rock, both poles raised), wearing the rain outfit. |
| `hiker_rain_helmet` | 1:1 | 洋紅底。Same pose as hiker_helmet, red climbing helmet worn over the poncho hood, rain outfit. |
| `hiker_rain_look` | 1:1 | 洋紅底。Same pose as hiker_look (looking out to the side, one hand shading the eyes), rain outfit. |
| `hiker_rain_breath` | 1:1 | 洋紅底。Same pose as hiker_breath (bent over on the poles catching breath), rain outfit. |
| `hiker_rain_wipe` | 1:1 | 洋紅底。Same pose as hiker_wipe, wiping rain and sweat from the forehead, rain outfit. |
| `hiker_rain_drink` | 1:1 | 洋紅底。Same pose as hiker_drink (drinking from a water bottle, head tilted back), rain outfit. |
| `hiker_rain_hop4` | 16:9 | 洋紅底。Exactly the same 4 frames as hiker_hop4 (crouch → small jump → landing → standing), rain outfit, hood identical in all 4 frames. |

## 第 23 批：補奇遇插圖、睡袋

### 放進 `07.奇遇`（16:9，不用去背；每張前面貼「共通規則」，畫到主角就加「主角設定」）
| 檔名 | 場景 |
|---|---|
| `enc_e58` | On the steep scree slope of Yushan Front Peak, a cheerful descending hiker grinning and pointing up at the loose rocky slope above, the hiker (主角設定) seen from behind looking up |
| `enc_e59` | Looking back from a high scree slope: Tataka saddle and Mt. Lulin spread out far below, clouds slowly creeping up from the valley, the hiker small in the foreground seen from behind |
| `enc_e61` | From Yushan West Peak, the massive face of Yushan Main Peak standing like a giant folding screen across the valley, afternoon cloud shadows sliding across it, the hiker seen from behind |
| `enc_e62` | A small mountain weather station on a rocky high peak (Yushan North Peak), a friendly weather observer in a warm jacket leaning out of the doorway chatting with the hiker, instruments and a wind vane on the roof |
| `enc_e63` | Sunset from Yushan North Peak: Yushan Main Peak glowing golden, its long shadow stretching across a sea of clouds, the hiker silhouetted on the rocks |
| `enc_e64` | At the foot of a steep rock gully, a teammate handing a red climbing helmet to the hiker, both smiling, rocky cliff and chains behind |
| `enc_e65` | Close-up of a tiny fuzzy white alpine edelweiss (Yushan Leontopodium) growing in a rock crack, soft focus mountains behind, the hiker's boot and pole tip just visible |
| `enc_e66` | On a steep wooden staircase on a high mountain slope ("Crying Slope"), an exhausted hiker sitting on a step catching breath, the hiker offering a water bottle, both laughing a little |
| `enc_e67` | From a summit triangulation stone, a clear view east to two distant great peaks standing side by side above layered ridges (Nanhu Dashan and Zhongyang Jian), the hiker seen from behind |
| `enc_e68` | A dark misty forest of tall Taiwan fir trees ("Black Forest" on Xueshan), mist drifting between the trunks with beams of light coming through, the hiker small on the trail |
| `enc_e69` | A glacial cirque of grey scree under a high peak, a small flock of alpine accentors (small brown-grey birds) hopping on the rocks close to the hiker's boots, unafraid |
| `enc_e70` | Fog suddenly parting to reveal a huge eroded landslide cliff face across the valley (Xiangyang great collapse wall), deep vertical scratches like a giant's fingers, the hiker staring in awe |
| `enc_e71` | A quiet dark mountain pond among hemlocks, a Formosan sambar deer drinking at the edge and looking up calmly at the hiker standing at a respectful distance |
| `enc_e72` | A vast high-altitude grassland on Sancha Mountain, strong wind making waves run through the dwarf bamboo grass, a tiny blue lake (Jiaming Lake) far away, the hiker's hat brim flapping |
| `enc_e73` | A simple stone memorial monument on a windy grassy ridge near a summit, a few wildflowers placed at its base, the hiker standing quietly with hat in hand, calm respectful mood, soft overcast light |

### 放進 `01.風格`（1:1、洋紅底，貼「主角設定」；`hiker_rain_sleep` 另外加「雨衣設定」）
| 檔名 | 內容 |
|---|---|
| `hiker_sleep` | **重畫**。The hiker (主角設定) seen from behind and slightly above, sleeping zipped up in a warm brown mummy sleeping bag laid on the orange sleeping mat, the safari hat tipped over the face, the backpack used as a pillow, trekking poles laid beside. Fully visible, small patch of ground under the mat. |
| `hiker_rain_sleep` | **重畫**。Same as hiker_sleep but under a small low green tarp shelter strung between the two trekking poles, raindrops on the tarp, the hiker in the sleeping bag under it, backpack in its dark-green rain cover. |

## 第 24 批：登山口廣場（大廳）各方向的動作（放進 `08.登山口廣場`，全部洋紅底、1:1，畫主角都要貼「主角設定」，但把 "seen from directly behind" 改成各張寫的方向）

廣場上的人會往前（面向鏡頭）、往旁邊、往後走，停下來時面向鏡頭。現在揮手、鞠躬、歡呼只有背影，跳一下、坐下沒有圖。這批補齊三個方向。
每張都**上傳參考圖**：正面的上傳 `hiker_front_walk8`，側面的上傳 `hiker_side_walk8`（人物大小、比例照它），動作再上傳同名的背影版（例如 `hiker_wave`）。

| 檔名 | 比例 | 內容 |
|---|---|---|
| `hiker_front_wave` | 1:1 | 洋紅底。The hiker (主角設定) seen **from the front**, standing and smiling, waving one hand high, trekking poles held in the other hand. Same size and proportions as hiker_front_walk8. |
| `hiker_front_bow` | 1:1 | 洋紅底。The hiker seen **from the front**, bowing politely from the waist, hat in one hand, poles in the other. |
| `hiker_front_cheer` | 1:1 | 洋紅底。The hiker seen **from the front**, jumping a little with both arms up cheering, big smile, poles raised. |
| `hiker_front_jump4` | 16:9 | 洋紅底。The hiker seen **from the front**, 4 frames in one row: crouch → small happy jump with both feet off the ground → landing → standing tall. Same size and ground line in every frame (the jump frame floats above it). |
| `hiker_front_sit` | 1:1 | 洋紅底。The hiker seen **from the front**, sitting cross-legged on the ground relaxing, backpack set down beside, holding a steaming tin mug, smiling. |
| `hiker_side_wave` | 1:1 | 洋紅底。The hiker seen **from the side facing right**, standing and waving one hand toward the right, poles in the other hand. Same size and proportions as hiker_side_walk8. |
| `hiker_side_bow` | 1:1 | 洋紅底。The hiker seen **from the side facing right**, bowing politely from the waist. |
| `hiker_side_cheer` | 1:1 | 洋紅底。The hiker seen **from the side facing right**, small jump with both arms up cheering. |
| `hiker_side_jump4` | 16:9 | 洋紅底。The hiker seen **from the side facing right**, 4 frames in one row: crouch → small jump → landing → standing. Same size and ground line. |
| `hiker_side_sit` | 1:1 | 洋紅底。The hiker seen **from the side facing right**, sitting on the ground with knees up, backpack beside, holding a steaming tin mug. |
| `hiker_back_sit` | 1:1 | 洋紅底。The hiker seen **from directly behind**, sitting cross-legged on the ground, backpack set down beside, looking at the view, holding a tin mug. |

背影的「跳一下」直接用現有的 `hiker_hop4`，不用另外畫。

## 第 25 批：彎道時身體斜一點（放進 `01.風格`，洋紅底、16:9，貼「主角設定」；雨衣版另外加「雨衣設定」）

轉彎時人從正背面轉成「斜後方」，看得到一點側臉和身體側面。往右彎用原圖，往左彎遊戲會整張鏡射，所以這張要**一整個完整的走路循環（左右腳都有）**，不能只畫一步。
上傳參考圖：`hiker_step8`（腳步節奏、人物大小）、`hiker_turn_walk8`（斜後方的角度）。

| 檔名 | 比例 | 內容 |
|---|---|---|
| `hiker_turn16` | 16:9 | 洋紅底。The hiker (主角設定) seen from **behind and about 30 degrees to the right (three-quarter rear view)**, walking forward and slightly to the right, **16-frame walking cycle in 2 rows of 8**: top row = the RIGHT foot steps forward (frame 4 both feet side by side), bottom row = the LEFT foot steps forward (frame 12 both feet side by side). Same size, same foot baseline, same body center in every frame; trekking poles silver-grey, alternating with the steps. Only a little of the face visible under the hat brim. |
| `hiker_rain_turn16` | 16:9 | 洋紅底。Exactly the same 16 poses and angle as hiker_turn16, wearing the rain outfit (yellow hooded poncho with hood up, dark-green backpack cover), hood identical in all 16 frames. |

**重畫（2026-11-24）**：第一次交的 `hiker_rain_turn16` 上排背包有雨套、下排沒有（露出水壺和網袋），走路時上下兩排輪流播，背包會一閃一閃。晴天版 `hiker_turn16` 第二次交的可以用。重畫雨衣版時上傳晴天版 `hiker_turn16`（姿勢）和 `hiker_rain_step8`（雨衣、雨套）當參考，提示詞在原本那段後面加：
```
Redraw hiker_rain_turn16. Copy the 16 poses exactly from the uploaded hiker_turn16. The backpack must wear the SAME dark-green rain cover in ALL 16 frames, both rows: the cover hides the side bottle pockets and mesh, only the orange sleeping mat shows on top. Do not draw any frame without the rain cover. Plain flat magenta background only, no shadows, boxes or color patches behind the figures.
```

**重畫（2026-11-25）**：`hiker_turn16`、`hiker_rain_turn16` 兩張的右手登山杖常常伸出自己那一格（每格 1/8 寬），遊戲照格子切圖時杖子被切斷，伸進下一格的那一截又出現在下一格左邊，轉彎走路時杖子一下斷一下多一截。兩張都要重畫：上傳現在的 `hiker_turn16`（姿勢）當參考，雨衣版再加上傳 `hiker_rain_step8`（雨衣、雨套）。提示詞在原本那段後面加：
```
Redraw this sprite sheet with the SAME 16 poses, but make every figure smaller so that it fits completely inside its own cell. The sheet is an exact grid of 8 columns x 2 rows of equal-size cells. In every frame the whole figure, including BOTH trekking poles from the grip to the tip, must stay inside its own cell with a clear empty magenta gap of at least 8% of the cell width on the left and on the right. No pole, foot, hat brim or backpack may touch or cross the cell border, and nothing from one frame may reach into the next cell. Keep the same foot baseline and the same body center in every frame. Plain flat magenta background only, no grid lines, shadows or boxes.
```
交圖後我會把 16 格的切法畫成對照圖（紅框＝遊戲切的範圍），確認每一格的杖子都完整、旁邊沒有別格伸過來的杖子。

## 第 26 批：出發前的小山載入畫面（放進 `02.素材`，2:1，不用洋紅底，米色紙底）

每座山一張：左半只有墨線、右半上好色，兩半構圖一模一樣；遊戲把兩半疊起來，顏色從山腳像水位一樣往上漲。完整提示詞和每座山的山形在 `_交付/小山載入繪圖包/提示詞.md`。
沒有自己那張圖的山先用 `load_default`（目前就是觀音山那張）；連它都讀不到時才用程式照真實輪廓畫。

| 檔名 | 比例 |
|---|---|
| `load_default` | 2:1 |
| `load_xiangshan` | 2:1 |
| `load_qixing` | 2:1 |
| `load_guanyin` | 2:1 |
| `load_matcha` | 2:1 |
| `load_alishan` | 2:1 |
| `load_taiping` | 2:1 |
| `load_hehuan` | 2:1 |
| `load_hh_shimen` | 2:1 |
| `load_hh_east` | 2:1 |
| `load_hh_north` | 2:1 |
| `load_hh_west` | 2:1 |
| `load_jiaming` | 2:1 |
| `load_xiangyang` | 2:1 |
| `load_sancha` | 2:1 |
| `load_xueshan` | 2:1 |
| `load_xueshan_east` | 2:1 |
| `load_yushan` | 2:1 |
| `load_yushan_front` | 2:1 |
| `load_yushan_west` | 2:1 |
| `load_yushan_north` | 2:1 |
| `load_yushan_east` | 2:1 |

## 第 27 批：地圖「我的位置」按鈕（放進 `06.介面`，1:1、洋紅底）

地圖左下角一顆圓形木牌，點了地圖滑到正在爬（或上次爬）的山。現在是程式畫的木頭圓牌＋墨線準星，這張到了自動換上（跟 `icon_map`、`icon_bag` 那組小圓圖示同一個畫法）。
提示詞：先貼「共通規則」，再貼表格裡的英文，最後加「去背規則」那句。

| 檔名 | 比例 | 內容 |
|---|---|---|
| `icon_locate` | 1:1 | 洋紅底。A small round wooden badge icon in the same style as the other round game icons (icon_map, icon_bag, icon_settings): a thick disc of warm honey-brown wood with visible wood grain and a slightly darker carved rim, delicate thin dark-brown ink outline, soft cel shading lit from the upper right. In the center, a hand-inked locate symbol: a cream-white circle drawn in dark-brown ink with four short crosshair ticks pointing up, down, left and right, and a small red-orange dot in the very middle, like a compass sight on an old trail map. Flat front view, simple and readable at 50 pixels, no text, no letters, no arrow, no map pin. |

## 第 28 批：山腰步道兩種（泥土小徑、碎石路＋石壁；放進 `02.素材`）

一邊約 45 度陡降、看得到山谷遠山，另一邊約 40 度陡升。路面貼圖整張是路面、不用洋紅底；其他三張洋紅底，左右要能無縫接續。完整提示詞在 `_交付/山腰土徑繪圖包/提示詞.md`。

| 檔名 | 比例 | 底 |
|---|---|---|
| `ground_dirt_leaf` | 1:1 | 整張路面 |
| `ground_gravel` | 1:1 | 整張路面 |
| `grass_tall_slope` | 16:9 | 洋紅 |
| `canopy_branch` | 16:9 | 洋紅 |
| `rock_wall_slope` | 16:9 | 洋紅 |

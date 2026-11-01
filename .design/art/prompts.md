# Запросы к генератору картинок

Только здесь — что изображено и тексты запросов. Игрокам не цитировать.
Генерация содержательного — во временных чатах ChatGPT (см. `../visual.md`).

## Шаг 0. Образцы стиля (нейтральные, игроки смотрят и выбирают)

Один лист на направление, 3:2 альбомный. Одинаковый состав, чтобы сравнивать честно:
слева — кусок карты местности; справа сверху — 3 предмета; справа снизу — маленькая сцена.
Предметы и местность общие, без связи с сюжетом.

Общий хвост для всех трёх:

```
Layout: one landscape sheet 3:2. Left two-thirds: a fragment of a hand-made world map seen from above
at a slight oblique angle — a bending river, a birch grove, open steppe with tall grass, a dirt road
crossing the river by a ford, one small thatched hut with a thin line of smoke, low hills at the edge.
Right third, top: three separate item icons in a row on an empty background — a short knife, a clay pot,
a bundle of firewood. Right third, bottom: a small vignette — a campfire at dusk in front of a thatched hut.
Setting: Eastern European steppe and forest, 17th century, dark folk-tale mood, no magic.
Absolutely no text, letters, numbers, labels, signatures or watermarks anywhere.
```

Результат (2026-10-28, 1536×1024 каждый): A — тёмный, живописный, ложится на нынешний UI как есть;
B — самый «Day R», насыщенный, светлее UI; C — светлая бумага, сильный характер, на тёмном UI нужна рамка.
Иконки предметов во всех трёх читаются; у A они уже на тёмном фоне — проще вырезать.

### A. «Літопис» — тушь и лессировка на копчёном пергаменте (развитие нынешнего стиля)

```
Style: ink drawing with sepia and umber washes on dark smoked parchment, like an illuminated page of an
old East Slavic chronicle. Warm light ink lines (#e6d9bc) and fine hatching on a deep brown ground
(#221c15 to #332a1f). Sparse accents only in cinnabar red (#c24e36) and ochre (#c49a45). Candlelit,
quiet, hand-made, slightly uneven line. Flat-ish, readable at small size.
```

### B. «Живопис» — рисованная гуашь, ближе к Day R

```
Style: hand-painted gouache illustration for a survival game map, detailed but readable, muted earthy
palette (ochre, olive, umber, slate blue water, dusty greens), soft painterly brush texture, warm
evening light, subtle dark vignette. Objects slightly stylized and chunky so they read on a phone.
```

### C. «Гравюра» — народная гравюра (дерево/медь), XVII век

```
Style: Ukrainian 17th-century woodcut and copper engraving, bold black carved lines and cross-hatching
on warm aged paper, with only two hand-applied spot colours: cinnabar red and ochre. Strong silhouettes,
folk-print simplicity, rough print texture.
```

## Шаг 2. Карта, лист 1 (земли актов 1–2 + побочки) — проект «Ілюстрації»

Раскладка по `AreaDef.pos` (9×5) → доли холста. Дорог на холсте нет: дороги рисует клиент по `links`.
a_14 верба (0,1) · a_06 гай (2,0) · a_12 багно (4,1) · a_07 гребля (5,0) · a_08 гать (7,1)
a_01 двор (3,2) · a_04 солончак (5,2) · a_05 ропа (6,3) · a_02 берег (1,3) · a_13 острів (2,4)
a_03 очерет (4,4) · a_10 шлях (7,4) · a_11 містечко (8,3)

Результат: `art-src/map1.webp` (v1, принят с первого раза). Разметка точек и дорог — `client/src/art/map1.json`,
проверка глазами — наложение кругов/линий на картинку (PIL), итерации по 1–2 правки.

```
Generate an image, landscape 1536x1024. A hand-painted world map for a survival game, seen from above at a slight
oblique angle, terrain filling the whole canvas edge to edge (no frame, no border, no sea filler). Region: Eastern
European forest-steppe with a river, marshes and salt lakes. Each landmark compact and clearly readable, with open
grassland between landmarks. Composition by position on the canvas: far left, upper middle — a stream lined with old
willows; upper left — a dense dark old grove of oaks and birches; upper center — a dark boggy marsh with black pools
and tussocks; top, center-right — an old earthen dyke, a long grassy embankment holding back a still pond; upper
right — wide wet fen crossed by a raised log causeway; center-left — a lone farmstead: a thatched hut, a barn, a
wattle fence, a small vegetable plot, thin smoke; center — a flat white-grey salt pan with cracked crust;
center-right, a bit lower — a shallow brine lake with salt crust at its edges; left side, lower half — a slate-blue
river that comes from the top-left, runs down the left side and then along the bottom of the map to the right, with
a sandy shore; bottom left — a small wooded island in the river; bottom center — thick reed beds along the river;
bottom right — open dry steppe; right edge, lower middle — a small trading town with a wooden palisade and a few
dozen thatched and shingled houses. No roads, paths or tracks anywhere (they are added later). No people, no
animals. Style: <хвост стиля из bible.md>
```

Новые земли (акт 3+): отдельный лист `map2` того же размера, края стыкуются с соседним листом по смыслу
(река/дорога уходит за край). Клиент пока умеет один лист — второй потребует раскладки листов в мире.

## Шаг 3. Значки предметов — 8 листов 4×3 (`things.json`: порядок и описания)

Шаблон (собирается скриптом из `things.json`): «Generate an image, landscape 1536x1024, with a fully
transparent background … strict grid of 4 columns and 3 rows … Row N, left to right: … Style: hand-painted
gouache game icons …, a thin dark outline around each object …». Пустая клетка — «leave this cell empty».

## Шаг 4. Рисованные планы мест (вместо шапок) — `grounds.json`: описание на каждый SceneId

Композиция повторяет SVG-план (`client/src/pictures.tsx`, `Ground`) и точки мест (`LocationDef.plan/spots`, %).
1024×1024, затем обрезка до 8:7. Шаблон: «Generate an image, square 1024x1024. A hand-painted top-down location
plan for a survival game … Location: <grounds.json> … Keep the very top and bottom edges plain …» + хвост стиля.
Двор дома — без построек на местах будущих верстаков (иначе они «видны» до постройки).

## Шаг 5. Портреты врагов — 2 листа 3×3, 1024², прозрачный фон (`foes.json`: порядок и описания)

«Generate an image, square 1024x1024, with a fully transparent background … A sheet of enemy portraits …
strict grid of 3 columns and 3 rows … faces the viewer at three-quarters, menacing … Row N …» + хвост стиля.
Люди — по плечи; имён и сюжетных деталей в запросе нет.

## Виды мест с уровня глаз (шапки сцен и карточка места на карте) — `views.json`

1536×1024, обрезка до широкой полосы. «An eye-level painted establishing view of … The main subject sits in
the middle horizontal band (top and bottom fifth will be cropped) … No people, no animals …» + хвост стиля.
`hearth1/2` — для ужинов (сцены из пулов).

## Лица жителей — листы 2×2, 1024², тёмный фон (`folk.json`: порядок и описания)

«Create one square image 1024x1024: a 2x2 grid of four separate painted portraits, divided by thin solid
black gutters … head and shoulders of one person, facing the viewer, face centered … plain dark warm
painted background (smoky umber), soft firelight from one side … 17th century Cossack-era clothing …
Top-left: … Top-right: … Bottom-left: … Bottom-right: …» + хвост стиля «Живопис» (лица читаются в
маленьком круге на телефоне). Режется `scripts/art.ts folk <png> <n> 0.86`.

## Шаг 7. Поле боя (вид строго сверху) — проект «Ілюстрації»

Два листа. Порядок клеток — `.design/art/feats.json`, `.design/art/tex.json`. Нарезка:
`tsx scripts/art.ts feats <png> 1`, `tsx scripts/art.ts tex <png> 1`.

### Лист feats 1 (предметы местности, прозрачный фон, 4×3)

```
Generate an image, landscape 1536x1152, TRANSPARENT background. A sheet of 12 separate terrain objects for a
tactical battle grid, seen STRICTLY FROM DIRECTLY ABOVE (top-down, bird's-eye, no perspective, no horizon),
arranged in a 4x3 grid, each object centred in its own cell with empty transparent space around it, all at
the same scale (one cell = a square of ground about 2 metres across) and lit from the top left, with a soft
contact shadow under each object only. Row 1: the round crown of an old oak seen from above with dark leafy
clumps; a low round shrub; a clump of tall reeds with pale feathery heads; a big grey weathered boulder.
Row 2: a fallen tree trunk lying across the cell, bark and a cut end; a straight piece of thick clay-and-stone
wall seen from above (its top), running left to right across the cell; a woven wattle fence of willow rods
running left to right; an ox cart seen from above, wooden bed and two big wheels. Row 3: a wooden chest with
iron bands; a wooden barrel seen from above (round lid, hoops); a heap of white-grey salt; an old tree stump
with rings. Style: <хвост стиля из bible.md>
```

### Лист tex 1 (грунты, 3×3, края в края)

```
Generate an image, square 1536x1536. Nine square ground textures for a tactical battle grid, seen STRICTLY
FROM DIRECTLY ABOVE, arranged in a 3x3 grid; each texture fills its whole square edge to edge (no borders,
no gaps, no objects, no shadows of objects), even and uniform so it can cover a large area. Row 1: short
steppe grass with small wild flowers; pale river sand with ripples; dark wet marsh mud with puddles.
Row 2: cracked white-grey salt crust; a dusty dirt road with ruts; old cobblestones. Row 3: deep slate-blue
river water with gentle ripples; shallow clear water over pebbles and sand; weathered wooden planks laid side
by side. Style: <хвост стиля из bible.md>
```

### Грунты по одному (1024, заменили лист tex 1)

```
Generate an image, square 1024x1024. A single ground texture for a top-down tactical battle grid, seen STRICTLY
FROM DIRECTLY ABOVE, filling the whole square edge to edge, even and uniform so it can cover a large area, no
objects, no horizon, no vignette, no frame: <что>. Style: <хвост стиля>
```
Дальше в той же беседе: «Now another texture of the same kind, same style, size and rules (...): <что>».
Что: grass — short dry steppe grass with a few small wild flowers and bare earth; sand — pale river sand with
soft wind ripples and small pebbles; mud — dark wet marsh mud with puddles, trampled sedge, broken reed stems;
salt — cracked white-grey salt crust over grey clay; dust — dusty dirt road with faint cart ruts and hoof prints;
cobble — old worn cobblestones, moss in the gaps; water — deep slate-blue river water, gentle ripples, warm glints;
shallow — shallow clear water over sand and rounded pebbles; planks — weathered causeway planks top to bottom.

### Лист perks 1–4 (значки роста, 4×3, прозрачный фон)

```
Generate an image, landscape 1536x1152, TRANSPARENT background. A sheet of 12 separate emblem-like objects for
game icons, arranged in a 4x3 grid, each object centred in its own cell with plenty of empty transparent space
around it, all at a similar size, seen from a slight three-quarter view, lit from the top left, no ground, no
shadows outside the object. Row 1: …; Row 2: …; Row 3: … (по строкам из .design/art/perks.json).
No people except hands where named. Style: <хвост стиля из bible.md>
```

### Лист things 9 (знаряддя жителів, 2026-10-29)
Шаблон шага 3 (1536x1024, прозрачный фон, 4×3), строки из `things.json` (лист 9), пустые клетки — «leave this cell empty».

## Город 2.0 (2026-10-29) — проект «Ілюстрації»

### Культура по стадиям (по одной картинке на культуру; `tsx scripts/art.ts crops <png> <look>`)
```
Generate an image, landscape 1536x1024, TRANSPARENT background. Five growth stages of one <CROP> plant side by
side in a single row, left to right from just sown to ripe, all standing on one shared invisible ground line near
the bottom edge, painted at the same real-world scale so the later stages are clearly bigger, each centred in its
own fifth of the width with clear empty space between them. Each plant grows from a small clump of dark earth at
its root (no soil strip, no ground plane, only a soft contact shadow). Seen from the side and slightly above, as
it would look growing in a garden bed. 1) <…>; 2) <…>; 3) <…>; 4) <…>; 5) <…>. Style: <хвост стиля из bible.md>
```
Стадии: garlic — clove tip peeking from a mound / two-three thin shoots / fan of flat blue-green leaves / tall
leaves, white head swelling / ripe: leaves yellowing and bending, big white-violet bulb on the earth.
thyme — tiny cutting / a few sprigs / low cushion of grey-green leaves / bigger cushion, first lilac flowers /
full bush covered in small lilac flowers. beet — corky seeds on a mound / two seedling leaves on red stems /
rosette of glossy leaves with red veins / bigger rosette, dark red shoulder of the root / ripe: lush leaves, big
round dark red beetroot half out of the earth. flax — tiny shiny seeds / thin seedlings / clump of slender stems /
tall slender stems with sky-blue flowers / ripe: golden dry stems with round seed bolls. pumpkin — flat white
seed on a mound / two rounded seed leaves / short vine with big lobed leaves / sprawling vine, yellow flower and a
small green fruit / ripe: big orange ribbed pumpkin among leaves.

### Пустая грядка (`tsx scripts/art.ts bed <png>`)
```
Generate an image, landscape 1536x1024, TRANSPARENT background. One single long raised vegetable bed, seen from
the front and somewhat above (three-quarter view), centred, about four times as wide as it is deep: a rectangle
of dark freshly tilled earth with furrows along its length, edged on all sides with a low woven willow wattle,
empty — nothing planted. Soft contact shadow only. Style: <хвост стиля>
```

### Значки города — лист things 10 (шаблон шага 3, 4×3, прозрачный фон), строки из `things.json`.

## Дом растёт (2026-10-30) — проект «Ілюстрації»

Листы `yard` 1–2 (`.design/art/yard.json`: порядок и описания), нарезка `tsx scripts/art.ts yard <png> <n>`.
Ракурс — как у плана двора (`grounds/g1.webp`): почти строго сверху, чуть наклонно, свет вечерний слева сверху.
```
Generate an image, landscape 1536x1152. A sheet of 12 separate objects for a top-down village map of a
survival game, arranged in a 4x3 grid, each object centred in its own cell with clear empty space around it,
on a flat solid pure magenta background (#FF00FF) that fills everything around and between the objects.
All objects are seen from high above at a steep angle, almost straight down like a game map (tops and roofs
show, sides barely), at the same real-world scale, lit by warm low evening light from the top left, each with
a soft dark contact shadow on the ground under it only (no ground patch, no grass around). Row 1: <1–4>.
Row 2: <5–8>. Row 3: <9–12>. Style: <хвост стиля из bible.md>
```

## Моменты ключевых сцен (2026-10-30, `improvements.md` шаг 7) — `.design/art/moments.json`
1536×1024, нарезка как у видов (`tsx scripts/art.ts moment <png> <scene>`). Без лиц: люди — мелкие фигуры
вдали или со спины. «Generate an image, landscape 1536x1024. An eye-level painted illustration of a moment in
a dark folk-tale survival game: <описание>. The main subject sits in the middle horizontal band (the top and
bottom fifth will be cropped). No faces shown: people only as small distant figures or seen from behind.»
+ хвост стиля.

## Спогади Майстра (2026-10-31) — проект «Ілюстрації»

Грунты `workshop`, `kryvets` (шаблон шага 4, описания — `grounds.json`), виды `workshop`, `kryvets`
(шаблон видов, `views.json`), знаки карты — лист marks 7 (`@workshop`, `@kryvets`, остальное пусто),
лица — лист folk 6 (`pm_h1` + три запасных лица: майстер, господиня, писар — не жители, отброшены).
Все шесть приняты с первого раза. Сборка запросов — тем же хвостом стиля, что в `bible.md`.

## Спогади Ловця (2026-10-31) — проект «Ілюстрації»

Грунты `hutir`, `brid`, виды `hutir`, `brid`, знаки — лист marks 8 (`@hutir`, `@brid`), лица — folk 7 (`ph_h1` + три
запасных: поромник, купець, молодий солдат — не жители). Все шесть с первого раза. План острова лёг иначе,
чем в запросе (хата правее и выше) — точки места подвинуты под рисунок.

## Моменты спогадів (2026-10-31) — проект «Ілюстрації»

Шаблон «Моменты» без изменений, описания — `moments.json` (`pm_s01`, `pm_s08`, `pm_s12`, `ph_s06`, `ph_s12`, `ph_s15`).
Отправка: поле ввода теперь `div.ProseMirror[contenteditable]` (не `#prompt-textarea`), кнопка «Send» — кликом по ref.
Шесть чатов параллельно в разных вкладках, скачивание тем же приёмником (`scratchpad/tools/receiver.mjs`).

## Лист map2 «Пониззя» (2026-10-31)

Запрос — тот же шаблон, что `map1`, описание края: a wide slate-blue river enters from the top edge a little left of center, flows down through the middle of the map and in the lower half spreads into a maze of channels and reed marshes, leaving the bottom edge right of center; upper left corner — a dense old oak grove; upper left, just right of the grove, on the west bank of the river — a small white river town: a few dozen whitewashed thatched cottages, a wooden church with one green onion dome, a market square, a small wooden pier on the river; left edge, a little above the middle, just outside the town — a lone craftsman's yard with a forge chimney and a small cherry orchard behind a wattle fence; left side, a little below the middle — a sandy willow shore on the west bank with osier bushes; center, slightly right — a river crossing: a wide shallow ford with a flat wooden ferry raft, a tavern with a roofless barn and a few carts on the west bank; right of the ford, on the east bank — wide open meadows with lone oaks (left empty); upper right — a high dry steppe bluff over the river with ancient burial mounds (kurgans) and feather grass; top, right of center — a dusty crossroads on the steppe edge with a lone stone cross; lower center — vast reed marshes with winding channels and black pools; lower left, inside the marshes — a low long island ridge with a single fisherman's hut, a smokehouse and nets drying on poles; bottom left corner — an old dry riverbed with ash and willow woods.

### Лист things 12 (2026-10-31) — шаблон шага 3, строки из `things.json` (лист 12)
Значки к предметам без своей картинки (сверка значков с названиями). Нарезка `tsx scripts/art.ts things <png> 12`.


## Ясенець, гл. 6–7 спогадів (2026-11-01) — проект «Ілюстрації»

Лист `map4` — шаблон шага 2 (описание: река справа сверху вниз, брод справа внизу, кручи за рекой, бор сверху,
пасіка у бора, майдан с дзвіницею чуть правее центра, Ганнина хата край села слева, цвинтар слева вверху, млин на
потічку внизу). Планы — шаблон шага 4 + `grounds.json` (`yhouse` … `yhill`), виды — шаблон видов + `views.json`,
знаки — лист marks 9 на пурпурном ключе (`marks.json`, строки 1–2, остальные клетки пустые). Параллельно в трёх
вкладках, отправка текста через `execCommand('insertText')` + кнопка `aria-label="Send"`.

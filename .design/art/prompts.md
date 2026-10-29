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

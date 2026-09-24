# Tundra, Temperate Rainforest and Equatorial Wetlands

The game now has 20 climates. New Grand Campaigns start with 12 factions on 300 tiles. Classic remains five factions on 125 tiles. Existing campaigns keep their factions, revealed terrain and climate reservations. Expeditions can encounter the new climates beyond those reservations.

Climate continuity increases from 85% to 88%. This modestly favors larger regions without imposing a minimum size. The compatibility and buffer rules still apply. Each new climate has initial weight 1 and entry weight 0.75 from compatible neighbors. Its favored exit has weight 2; its other exits have weight 1.

## Tundra

60% land, 40% water. Compatible with Cold and Arctic; the favored exit is Arctic.

| Land tile      | Share | Annual baseline  |
| -------------- | ----: | ---------------- |
| Berry heath    |   20% | 1 Grain          |
| Musk ox range  |   20% | 1 Wool + 1 Meat  |
| Reindeer range |   15% | 1 Meat + 1 Hides |
| Peat bog       |   15% | 1 Coal           |
| Arctic iron    |   12% | 1 Iron ore       |
| Arctic stone   |   10% | 1 Stone          |
| Arctic gold    |    5% | 1 Gold           |
| Snow plain     |    3% | None             |

Water checks: 20% Fish, then 15% Cod, then 8% Whales. Open water doubles the Whale check as elsewhere.

This is a productive treeless frontier between Cold and Arctic. It supplies animal products, fuel and metals but no Wood or Clay. Berry heath produces two Grain in Summer and two in Autumn. Musk oxen give one Wool in Spring and three in Summer; Meat remains available throughout the year. Peat gives two Coal in Summer and two in Autumn.

The sea freezes earlier and thaws later than in Cold. Early/Late Spring melt chances are 45%/85%; Summer melts all seasonal ice. Early/Late Autumn freeze chances are 15%/35%, rising to 80%/100% in Winter. These checks use the existing ice rules for movement, production, stranded ships and retreat.

## Temperate Rainforest

40% land, 60% water. Compatible with Temperate, Oceanic and Cold; the favored exit is Oceanic.

| Land tile            | Share | Annual baseline  |
| -------------------- | ----: | ---------------- |
| Old-growth forest    |   25% | 3 Wood           |
| Fern hunting grounds |   15% | 1 Hides + 1 Meat |
| Coastal pasture      |   10% | 2 Wool           |
| Peat bog             |   10% | 1 Coal           |
| Alluvial clay banks  |   15% | 2 Clay           |
| Coastal cliffs       |   15% | 1 Stone          |
| Iron                 |    7% | 1 Iron ore       |
| Gold                 |    3% | 1 Gold           |

Water checks: 25% Fish, then 10% Cod, then 8% Whales.

This region supports construction and coastal trade. It has no Grain tiles or Salt, little metal, and abundant timber. Old-growth forest produces 3/4/3/2 Wood across Spring/Summer/Autumn/Winter. Hunting, peat and fishing remain available year-round. Coastal pasture uses the established shearing calendar. The mild coast does not freeze. Winter art stays green and wet, with light frost rather than blanket snow.

## Equatorial Wetlands

35% land, 65% water. Compatible with Tropical and Subtropical; the favored exit is Tropical.

| Land tile           | Share | Annual baseline |
| ------------------- | ----: | --------------- |
| Mangroves           |   25% | 1 Wood + 1 Fish |
| Sago grove          |   20% | 1 Grain         |
| River woods         |   15% | 1 Wood          |
| Alluvial clay banks |   20% | 2 Clay          |
| Peat bog            |   10% | 1 Coal          |
| Stone               |    5% | 1 Stone         |
| Iron                |    3% | 1 Iron ore      |
| Gold                |    2% | 1 Gold          |

Water checks: 30% Fish, then 3% Whales.

This region supplies reliable food and construction materials but has no Wool, Hides or Salt on land and few minerals. Sago gives one Grain every season, trading the large peaks of cereal harvests for reliability. Mangroves give both resources throughout the year. They are forested land, so normal land movement and construction apply. Their Fish is collected by adjacent towns, land merchants and merchant ships under the normal production rules. Fishing ships still collect marine grounds, not inland mangroves.

The water never freezes. Seasonal artwork changes water levels and foliage rather than adding snow or temperate autumn colors. Alluvial Clay keeps its wet-season slowdown and dry-season peak.

## Shared rules and assets

Amounts above are per-settlement annual baselines. Every seasonal resource schedule totals four times its baseline. Town, camp, workshop and collector multipliers apply normally. Advanced processing also applies separately to every output, including Fish from mangroves. Peat uses the Coal resource and existing Coal recipes; sago and berries use Grain. No extra resource cards or payment rules are introduced.

There are 96 new seasonal land images and seven new base terrain images. All new regions also have four-season sea coverage, including frozen Tundra water. Sea images reuse the established Arctic, Oceanic and Tropical families. Files live in `public/assets/seasons/` and `public/assets/terrain-*-v1.webp`.

The six source sheets were generated with the built-in image tool. Their full prompts are in `public/assets/frontier-climates-prompts.json`. `scripts/import-frontier-art.py` crops each approved sheet into four terrain rows and four seasonal columns, then writes 384px WebP files and both synchronized manifests. The game loads individual tiles, not large sheets.

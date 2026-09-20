# Seasons design and acceptance criteria

New campaigns start in a uniformly random season: Spring, Summer, Autumn or Winter, with a 25% chance each. The world seed determines this choice reproducibly, independently of dice rolls. Seasons then run in the order Spring, Summer, Autumn, Winter. One full round is one season. The round boundary, rather than an individual faction turn, changes the world. One year lasts four rounds. Dice stay independent and unchanged.

## Production

The printed tile yield is its current climate-adjusted annual baseline per matching roll, supplied by `biomeYield`. Seasonal output tables use whole goods. Every good on every tile sums to four times its current climate-adjusted baseline across the four seasons. All matching rolls during an active harvest window produce goods; there is no first-roll cap, guaranteed harvest or compensation for missed rolls. With an unchanged number of surviving factions and producers, the calendar preserves that baseline’s annual dice expectation. The cereal rebalance deliberately changes some baselines; it does not recalculate stored goods.

Cities, camps, merchants, ships, automatic advanced processing and workshops all multiply the actual seasonal raw yield. Woods workshop products remain fixed independently of the chosen raw good. Woods uses the same seasonal quantities for Wood and Hides, avoiding an extra-output exploit by changing products each season. Setup grants use the ordinary printed yield so starting supplies do not depend on the starting season.

Turnip fields have baseline 2 in Temperate/Oceanic regions and 1 in Cold/Alpine regions, paying one baseline in Summer and three in Autumn. Andean Potato fields have baseline 2 and pay 2/6. Both represent early and maincrop varieties across the terrain; the two windows improve reliability without increasing annual expected production. Temperate Oats pay 6/2; Subtropical Sorghum and American Maize pay 8 in Autumn. Tropical rice and Mesoamerican Chinampa gardens pay 4 in Spring, Summer and Autumn; Subtropical rice pays 4 in Summer and Autumn; Monsoon rice pays 4 in Autumn. Oceanic Barley pays 8 in Summer; other Barley pays 4 in its established window. Black-soil wheat pays 12 in Summer. Grain is an abstract food resource shared by cereals, roots, gardens and Olive groves. See [Crop yields and game balance](cereal-balance.md) for sources and all schedules. Exact tables are authoritative in `src/game/seasons.ts`.

American terrain adds Alpaca pasture (1 Wool plus 1 Meat baseline), Bison range (1 Meat plus 1 Hides), Turkey grounds (2 Meat), Cloud forest (1 Wood plus 1 Hides), Volcanic quarry (2 Stone) and Sunflower fields (1 Oil). Alpaca Wool pays 4 in Spring; Alpaca Meat and both Bison goods pay 1/0/2/1. Turkey pays 1/1/4/2 Meat. Both Cloud forest goods and Volcanic Stone remain steady. Sunflower Oil pays 4 in Autumn and retains Coal substitution, Fuel processing and the existing Oil workshop rules.

Meat substitutes 1:1 for Grain after Fish and before automatic Gold substitution. It processes into Rations. Cattle pasture gives 2 Meat as its annual baseline; goat pasture 1 Meat; reindeer and cattle ranges each 1 Meat plus 1 Hides. Crop and livestock entries occupy the shares shown in the current climate tables. There is no upkeep, food decay, forced feeding or new livestock inventory.

Shearing peaks in Spring/Summer. Most livestock and hunting favor later-year output. Reindeer ranges provide 1 Meat and 1 Hides per matching roll in every season; Seal grounds provide 1 Hides and 1 Oil year-round. Their annual totals are unchanged. Logging, salt extraction, northern mining and fishing have their own schedules. Covered mines in mild climates and Coal in its generation climates retain steady production. Glacial mines produce only in Summer at four times their baseline. Warm fisheries produce throughout the year. Guild contracts remain on-demand industry using their existing inputs and fixed outputs, offering a costly alternative to a missed natural harvest.

Warm-climate hunting, logging and raw Clay extraction continue during the wet Summer. Base-one Jungle, timber and Clay production is steady at 1/1/1/1. Savanna Wildlife grassland provides 2/1/3/2 Hides and Subtropical/Monsoon Alluvial clay 2/1/2/3 Clay (Spring/Summer/Autumn/Winter). Tropical, Subtropical, Savanna and Mesoamerican Salt flats follow 1/0/1/2 because solar evaporation depends on dry weather. Desert and Hyperarid Salt flats remain productive at 1/1/1/1. Cattle range and Whale schedules are separate and unchanged. All schedules sum to four times each resource’s current climate-adjusted baseline.

Rough fields are removed from the catalogue and generation. Their weight merges into Barley in Cold (7%), Alpine (7%) and Oceanic (8%), and into Millet in Steppe (10%) and Savanna (20%). These percentages are conditional on land. Each merged interval occupies the same random-draw range as the old adjacent entries, so other terrain rolls, land/water ratios and total Grain frequency remain unchanged. Save version 11 converts existing Rough fields to the same named cereal without changing tile IDs, dice numbers, camps, workshops or stocks. Oceanic Rough fields adopt Barley’s Summer harvest and its revised baseline of 2, paying 8 Grain per settlement on each matching Summer roll. Cold/Alpine Barley and Steppe/Savanna Millet retain baseline 1. Oceanic Golden fields retain their Autumn harvest.

Turnip fields replace Rye at unchanged generation shares: 4% Temperate, 2% Oceanic, 3% Cold and 3% Alpine. Oats replace the 4% Temperate Maize interval, and Sorghum the 5% Subtropical interval. Save version 12 also migrates prototype non-American Potato fields to Turnips and non-American Maize to Oats in cool climates or Sorghum in warm climates. Climate, IDs, dice numbers, camps, workshops, units, random streams and stocks survive; current schedules apply without retroactive harvests.

## Seventeen climates

The initial draw gives weight 1 to fourteen normal climates, including Andean, Prairie and Mesoamerican, and 0.35 each to Glacial, Hyperarid and Monsoon. On a climate change, entering a compatible American region from an older climate has weight 0.75. American regions favor exits Andean to Alpine, Prairie to Steppe and Mesoamerican to Subtropical at weight 2; their other exits have weight 1. Extreme entry remains 0.5, established transitions keep their weights, and continuity stays 85%.

Andean has 75% land and a dry Winter, with Potato fields, Alpacas, mines, salt, peaks, snow and limited river timber. Mines stay productive, river timber follows 1/1/2/0 and seas never freeze. Prairie has 70% land with Maize, Sunflowers, Bison and river woods. Its mines follow the Cold schedule; ordinary seas freeze in Winter and have fixed 10% chances in Spring and Autumn. Mesoamerican has 45% land, warm seas, rainy Summer, Maize, Chinampa gardens, Turkey grounds, Cloud forest and volcanic quarries.

New Potatoes generate only in Andean; new Maize only in Prairie and Mesoamerican. Regional roles refer to traditional agriculture rather than exclusive botanical origins. The live climate tables define every conditional terrain share and compatible neighbor and generate the published rules.

Glacial (45% land), Hyperarid (90%) and Monsoon (30%) retain their distinct scarcity and seasonal rules. Black-soil wheat remains a rare fertile biome occupying 2% of Temperate land and 4% of Steppe land.

## Ice and movement

Glacial land stays snowy in every season. Arctic land remains snowy in Spring and regains substantial early snow in Autumn, with deep Winter snow and a short Summer thaw. Snow alone does not prevent hunting or change land movement. Permanent terrain identity stays separate from seasonal surface.

The world seed fixes a frost pattern for each ordinary sea hex. The following are per-hex freezing chances, not guaranteed regional proportions:

| Climate | Spring | Summer | Autumn | Winter |
| ------- | -----: | -----: | -----: | -----: |
| Glacial |   100% |     0% |   100% |   100% |
| Arctic  |    70% |     0% |    50% |   100% |
| Alpine  |    35% |     0% |    25% |   100% |
| Cold    |    20% |     0% |    10% |   100% |
| Prairie |    10% |     0% |    10% |   100% |

The same hexes freeze every year and after reloads. Every ordinary sea hex frozen in Autumn also freezes in Spring. Arctic Frozen sea terrain remains frozen in Spring, Autumn and Winter and opens in Summer. Glacial Frozen sea terrain is barren permanent pack ice and stays frozen in every season. Ordinary Glacial Fish, Cod and Whale tiles open in Summer and allocate all production to that season. Ordinary seas in other climates stay open. Land armies can use ice; ships use open water. Seasonal ice never qualifies as permanent construction ground. Bare Peaks remain impassable.

Frozen sea yields no marine resources. For each tile and each raw resource, any Spring or Autumn payout removed by freezing is added to Summer. Its four-season sum therefore stays at four times the printed yield. This is a change to the per-roll schedule, not a delivery or compensation for missed dice rolls. Multipliers and advanced processing use the adjusted seasonal raw quantities.

Icebound ships cannot act until thaw. Land troops caught by thaw remain on a floe, can step ashore with normal movement or board a same-tile/adjacent transport. No force disappears or teleports at a season boundary. Trapped forces can be attacked using ordinary power and whole-unit casualties. Retreats must be legal for all survivors. Ports lose their improved exchange rate while their water is frozen, while ordinary reserve trading remains available.

## AI and information

Long-term strength uses annual income, not temporarily zero winter income. Trade valuation forecasts the next six public rolls across season boundaries. Site selection slightly favors complementary harvest windows. The AI evacuates hazardous ice/sea before a change and attempts transport rescues without extra movement or resources. Stable emergency war objectives remain active.

The compact calendar shows the season and year, exact timing and warnings. Seasonal artwork previews change visuals only. Each tile shows its exact open-water or frozen surface and adjusted yields for all four seasons, current payout and printed annual average. Generic marine harvest tables show the open-water baseline except Glacial, whose Summer-only schedule is already exact; a selected tile’s forecast includes its fixed frost pattern and Summer redistribution. Dice remain visible on dormant tiles. English/French UI and rules describe the same mechanics.

## Compatibility, assets and validation

Existing saves preserve warehouses, dice rolls, map geology and ownership, apart from the documented retired crop and regional crop replacements. Current climate-adjusted crop baselines apply to existing tiles on load; stored goods are never recalculated. Legacy saves without a calendar still begin Spring at the next full round. Campaigns saved with the previous calendar keep their current season, timing and sea surfaces until the next season boundary, when the fixed frost patterns take effect. This grace period survives another save and reload, so loading alone cannot strand units. Random starting seasons apply only to new campaigns. Seasonal surfaces and stranded statuses must satisfy save invariants.

Artwork covers each supported climate/biome/season combination using generated painterly terrain, with clear crop stages, real snow cover and warm-climate wet/dry changes. Only map-used patterns load. No tint-only completion claim. Base assets for new biomes support the rulebook and historical views. A manifest and prompts record every generated/reused source.

Release gates: exhaustive annual-yield conservation; recipe substitution and explicit-trade tests; all producer tiers; calendar/ice/port/transport/combat regressions; save migration/roundtrips; no AI action loops and multi-year simulations; all unit tests; EN/FR/mobile browser verification; complete asset coverage and visual inspection; large-map performance; live deployment preserving earlier asset hashes; GitHub publication.

# Seasons design and acceptance criteria

New campaigns start in a uniformly random season: Spring, Summer, Autumn or Winter, with a 25% chance each. The world seed determines this choice reproducibly, independently of dice rolls. Seasons then run in the order Spring, Summer, Autumn, Winter. One full round is one season. The round boundary, rather than an individual faction turn, changes the world. One year lasts four rounds. Dice stay independent and unchanged.

## Production

The printed tile yield is its current climate-adjusted annual baseline per matching roll, supplied by `biomeYield`. Seasonal output tables use whole goods. Every good on every tile sums to four times its current climate-adjusted baseline across the four seasons. All matching rolls during an active harvest window produce goods; there is no first-roll cap, guaranteed harvest or compensation for missed rolls. With an unchanged number of surviving factions and producers, the calendar preserves that baseline’s annual dice expectation. The cereal rebalance deliberately changes some baselines; it does not recalculate stored goods.

Cities, camps, merchants, ships, automatic advanced processing and workshops all multiply the actual seasonal raw yield. Woods workshop products remain fixed independently of the chosen raw good. Woods uses the same seasonal quantities for Wood and Hides, avoiding an extra-output exploit by changing products each season. Setup grants use the ordinary printed yield so starting supplies do not depend on the starting season.

Four crop additions diversify timing: barley, rye, millet and maize. Tropical rice has three windows (4 Grain each), Subtropical rice two (4 each), and Monsoon rice one (4 in Autumn). Oceanic Barley and Temperate/Oceanic Rye have baseline 2 and pay 8 in Summer; other Barley/Rye have baseline 1 and pay 4 in their existing harvest season. Rare Black-soil wheat has baseline 3 and pays 12 in Summer. See [Cereal yields and game balance](cereal-balance.md) for the full table, research and limits of this abstraction. Wheat, barley, rye, millet and maize have one window; Olive groves span Autumn and Winter. Exact tables are authoritative in `src/game/seasons.ts`. The game uses a common abstract calendar, not a simulation of hemispheres.

Meat substitutes 1:1 for Grain after Fish and before automatic Gold substitution. It processes into Rations. Cattle pasture gives 2 Meat as its annual baseline; goat pasture 1 Meat; reindeer and cattle ranges each 1 Meat plus 1 Hides. Crop and livestock entries occupy the shares shown in the current climate tables. There is no upkeep, food decay, forced feeding or new livestock inventory.

Shearing peaks in Spring/Summer. Most livestock and hunting favor later-year output. Reindeer ranges provide 1 Meat and 1 Hides per matching roll in every season; Seal grounds provide 1 Hides and 1 Oil year-round. Their annual totals are unchanged. Logging, salt extraction, northern mining and fishing have their own schedules. Covered mines in mild climates and Coal in its generation climates retain steady production. Glacial mines produce only in Summer at four times their baseline. Warm fisheries produce throughout the year. Guild contracts remain on-demand industry using their existing inputs and fixed outputs, offering a costly alternative to a missed natural harvest.

Warm-climate hunting, logging and raw Clay extraction continue during the wet Summer. Base-one Jungle, timber and Clay production is steady at 1/1/1/1. Savanna Wildlife grassland provides 2/1/3/2 Hides and Subtropical/Monsoon Alluvial clay 2/1/2/3 Clay (Spring/Summer/Autumn/Winter). Tropical, Subtropical and Savanna Salt flats follow 1/0/1/2 because solar evaporation depends on dry weather. Desert and Hyperarid Salt flats remain productive at 1/1/1/1. Cattle range and Whale schedules are separate and unchanged. All schedules sum to four times each resource’s current climate-adjusted baseline.

Rough fields are removed from the catalogue and generation. Their weight merges into Barley in Cold (7%), Alpine (7%) and Oceanic (8%), and into Millet in Steppe (10%) and Savanna (20%). These percentages are conditional on land. Each merged interval occupies the same random-draw range as the old adjacent entries, so other terrain rolls, land/water ratios and total Grain frequency remain unchanged. Save version 11 converts existing Rough fields to the same named cereal without changing tile IDs, dice numbers, camps, workshops or stocks. Oceanic Rough fields adopt Barley’s Summer harvest and its revised baseline of 2, paying 8 Grain per settlement on each matching Summer roll. Cold/Alpine Barley and Steppe/Savanna Millet retain baseline 1. Oceanic Golden fields retain their Autumn harvest.

## Fourteen climates

The initial climate draw uses weight 1 for each established climate and 0.35 each for Glacial, Hyperarid and Monsoon. Initial weights are normalized; they are separate from the 85% continuity chance and destination weights used when extending zones. Entering a compatible extreme has weight 0.5. Glacial borders Arctic/Alpine with exit weights 2/1; Hyperarid borders Desert with exit weight 2; Monsoon borders Tropical/Subtropical/Savanna with exit weights 2/1/1. Existing transitions retain their weights.

Glacial has 45% land, mostly barren snow and peaks, plus permanent pack ice and Summer-only mines and ordinary marine harvests. Hyperarid has 90% land with extensive barren terrain, salt and minerals, but sparse food and timber. Monsoon has 30% land fragmented by water and peaks, with forest, clay and a single rainfed rice harvest. Difficulty comes from scarcity, transport and predictable seasons, without upkeep, recurring disaster damage or AI resource advantages.

Black-soil wheat is a fertile Chernozem biome within Temperate and Steppe, not another climate. It replaces two percentage points of Temperate Golden fields and four of Steppe plain. Its generation shares are 2% and 4% of land respectively.

## Ice and movement

Glacial land stays snowy in every season. Arctic land remains snowy in Spring and regains substantial early snow in Autumn, with deep Winter snow and a short Summer thaw. Snow alone does not prevent hunting or change land movement. Permanent terrain identity stays separate from seasonal surface.

The world seed fixes a frost pattern for each ordinary sea hex. The following are per-hex freezing chances, not guaranteed regional proportions:

| Climate | Spring | Summer | Autumn | Winter |
| ------- | -----: | -----: | -----: | -----: |
| Glacial |   100% |     0% |   100% |   100% |
| Arctic  |    70% |     0% |    50% |   100% |
| Alpine  |    35% |     0% |    25% |   100% |
| Cold    |    20% |     0% |    10% |   100% |

The same hexes freeze every year and after reloads. Every ordinary sea hex frozen in Autumn also freezes in Spring. Arctic Frozen sea terrain remains frozen in Spring, Autumn and Winter and opens in Summer. Glacial Frozen sea terrain is barren permanent pack ice and stays frozen in every season. Ordinary Glacial Fish, Cod and Whale tiles open in Summer and allocate all production to that season. Ordinary seas in other climates stay open. Land armies can use ice; ships use open water. Seasonal ice never qualifies as permanent construction ground. Bare Peaks remain impassable.

Frozen sea yields no marine resources. For each tile and each raw resource, any Spring or Autumn payout removed by freezing is added to Summer. Its four-season sum therefore stays at four times the printed yield. This is a change to the per-roll schedule, not a delivery or compensation for missed dice rolls. Multipliers and advanced processing use the adjusted seasonal raw quantities.

Icebound ships cannot act until thaw. Land troops caught by thaw remain on a floe, can step ashore with normal movement or board a same-tile/adjacent transport. No force disappears or teleports at a season boundary. Trapped forces can be attacked using ordinary power and whole-unit casualties. Retreats must be legal for all survivors. Ports lose their improved exchange rate while their water is frozen, while ordinary reserve trading remains available.

## AI and information

Long-term strength uses annual income, not temporarily zero winter income. Trade valuation forecasts the next six public rolls across season boundaries. Site selection slightly favors complementary harvest windows. The AI evacuates hazardous ice/sea before a change and attempts transport rescues without extra movement or resources. Stable emergency war objectives remain active.

The compact calendar shows the season and year, exact timing and warnings. Seasonal artwork previews change visuals only. Each tile shows its exact open-water or frozen surface and adjusted yields for all four seasons, current payout and printed annual average. Generic marine harvest tables show the open-water baseline except Glacial, whose Summer-only schedule is already exact; a selected tile’s forecast includes its fixed frost pattern and Summer redistribution. Dice remain visible on dormant tiles. English/French UI and rules describe the same mechanics.

## Compatibility, assets and validation

Existing saves preserve warehouses, dice rolls, map geology and ownership, apart from the documented Rough fields replacement. Current climate-adjusted cereal baselines apply to existing tiles on load; stored goods are never recalculated. Legacy saves without a calendar still begin Spring at the next full round. Campaigns saved with the previous calendar keep their current season, timing and sea surfaces until the next season boundary, when the fixed frost patterns take effect. This grace period survives another save and reload, so loading alone cannot strand units. Random starting seasons apply only to new campaigns. Seasonal surfaces and stranded statuses must satisfy save invariants.

Artwork covers each supported climate/biome/season combination using generated painterly terrain, with clear crop stages, real snow cover and warm-climate wet/dry changes. Only map-used patterns load. No tint-only completion claim. Base assets for new biomes support the rulebook and historical views. A manifest and prompts record every generated/reused source.

Release gates: exhaustive annual-yield conservation; recipe substitution and explicit-trade tests; all producer tiers; calendar/ice/port/transport/combat regressions; save migration/roundtrips; no AI action loops and multi-year simulations; all unit tests; EN/FR/mobile browser verification; complete asset coverage and visual inspection; large-map performance; live deployment preserving earlier asset hashes; GitHub publication.

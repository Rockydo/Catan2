# Seasons design and acceptance criteria

New campaigns start in a uniformly random season: Spring, Summer, Autumn or Winter, with a 25% chance each. The world seed determines this choice reproducibly, independently of dice rolls. Seasons then run in the order Spring, Summer, Autumn, Winter. One full round is one season. The round boundary, rather than an individual faction turn, changes the world. One year lasts four rounds. Dice stay independent and unchanged.

## Production

The printed tile yield remains its annual average per matching roll. Seasonal output tables use whole goods. Every good on every tile sums to four times its printed yield across the four seasons. All matching rolls during an active harvest window produce goods; there is no first-roll cap, guaranteed harvest or compensation for missed rolls. With an unchanged number of surviving factions and producers, annual expected output is unchanged.

Cities, camps, merchants, ships, automatic advanced processing and workshops all multiply the actual seasonal raw yield. Woods workshop products remain fixed independently of the chosen raw good. Woods uses the same seasonal quantities for Wood and Hides, avoiding an extra-output exploit by changing products each season. Setup grants use the ordinary printed yield so starting supplies do not depend on the starting season.

Four crop additions diversify timing: barley, rye, millet and maize. Tropical rice has three windows (4 Grain each), subtropical rice two (6 each). Wheat, barley, rye, millet and maize have one window; Olive groves span Autumn and Winter. Exact tables are authoritative in `src/game/seasons.ts`. The game uses a common abstract calendar, not a simulation of hemispheres.

Meat substitutes 1:1 for Grain after Fish and before automatic Gold substitution. It processes into Rations. Cattle pasture gives 2 Meat as its annual baseline; goat pasture 1 Meat; reindeer and cattle ranges each 1 Meat plus 1 Hides. New terrains replace portions of existing climate resource tables; climate land/water ratios stay unchanged. There is no upkeep, food decay, forced feeding or new livestock inventory.

Shearing peaks in Spring/Summer. Meat and hunting provide later-year output. Logging, salt extraction, northern mining and fishing have their own schedules. Covered mines in mild climates and Coal retain steady production. Warm fisheries produce throughout the year. Guild contracts remain on-demand industry using their existing inputs and fixed outputs, offering a costly alternative to a missed natural harvest.

## Ice and movement

Permanent terrain identity stays separate from seasonal surface. Existing Frozen sea is ice in Spring, Autumn and Winter and open water in Summer. Cold, Alpine and Arctic water freezes in Winter. Land armies can use ice; ships use open water. Seasonal ice never qualifies as permanent construction ground. Bare Peaks remain impassable.

Icebound ships cannot act until thaw. Land troops caught by thaw remain on a floe, can step ashore with normal movement or board a same-tile/adjacent transport. No force disappears or teleports at a season boundary. Trapped forces can be attacked using ordinary power and whole-unit casualties. Retreats must be legal for all survivors. Ports lose their improved exchange rate while their water is frozen, while ordinary reserve trading remains available.

## AI and information

Long-term strength uses annual income, not temporarily zero winter income. Trade valuation forecasts the next six public rolls across season boundaries. Site selection slightly favors complementary harvest windows. The AI evacuates hazardous ice/sea before a change and attempts transport rescues without extra movement or resources. Stable emergency war objectives remain active.

The compact calendar shows the season and year, exact timing and warnings. Seasonal artwork previews change visuals only. Each tile shows its four-season harvest table, current payout and printed annual average. Dice remain visible on dormant tiles. English/French UI and rules describe the same mechanics.

## Compatibility, assets and validation

Save envelope version 9 introduces the calendar. Versions 1–8 migrate without changing warehouses, dice RNG, map geology or ownership. Legacy saves without a calendar begin Spring at the next full round. Saves with a calendar keep their existing season and timing. Random starting seasons apply only to new campaigns. Seasonal surfaces and stranded statuses must satisfy save invariants.

Artwork covers each supported climate/biome/season combination using generated painterly terrain, with clear crop stages, real snow cover and warm-climate wet/dry changes. Only map-used patterns load. No tint-only completion claim. Base assets for new biomes support the rulebook and historical views. A manifest and prompts record every generated/reused source.

Release gates: exhaustive annual-yield conservation; recipe substitution and explicit-trade tests; all producer tiers; calendar/ice/port/transport/combat regressions; save migration/roundtrips; no AI action loops and multi-year simulations; all unit tests; EN/FR/mobile browser verification; complete asset coverage and visual inspection; large-map performance; live deployment preserving earlier asset hashes; GitHub publication.

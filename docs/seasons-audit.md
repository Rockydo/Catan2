# Seasons integration audit

## Production contract

A season lasts one complete round. Spring, Summer, Autumn and Winter have the same number of faction turns for a stable set of survivors. Each season is a harvest window: every matching dice roll pays. There is no once-per-year payout cap and no compensation when a harvest window receives no matching roll.

For each current climate-adjusted resource baseline Y, its four seasonal payouts sum to 4Y. Expected annual production for that baseline is therefore: 4 × living factions × dice probability × Y. This must hold independently for every component of mixed terrain, including whale Oil, seal Oil, Oasis food and wood, and Woods choices. A wheat tile on 7 can miss an entire five-faction harvest season with probability (5/6)^5, about 40%. A tile on 2 misses with probability (35/36)^5, about 87%.

Keep `tileYield`, backed by the shared climate-aware `biomeYield`, as the annual mean / permanent terrain contract. The cereal rebalance can revise this baseline without changing stored goods; catalogue rows, AI exploration, workshops and setup grants must use the revised value. Legal camps, extensions, harvest coverage, AI long-term evaluation and resource availability must not disappear during a fallow season. Add a separate seasonal production contract used consistently by towns, automatic city refining, camps, workshops, merchants and ships. Advanced processed production multiplies every seasonal raw component, including food substitutes and Oil, before mapping goods. Workshops still respect their selected Woods resource.

AI should use annual income for durable town/army power evaluation, and a separate near-term forecast for shortages and trades. Using current harvest output directly as permanent power would trigger alliances and rebellions every season for no strategic reason.

## Crop grounding

IRRI's long-running triple-cropping experiment distinguishes a dry-season, early-wet-season and late-wet-season rice crop. Triple crops require short-duration varieties, irrigation and careful scheduling. Tropical triple-crop rice is therefore an explicit game abstraction of intensively cultivated paddies, not a universal claim about all rice. Subtropical double cropping is a useful game contrast. The chosen annual rice totals are 12 Tropical, 8 Subtropical and 4 Monsoon, with four Grain per active window. This is a balance choice, not proof that two real crops must produce less than three: cooler rice regions can have higher yields per harvest. See [Crop yields and game balance](cereal-balance.md) for primary sources, paddy/milled-rice distinctions and the complete cereal table.

Sources:

- https://sites.google.com/irri.org/long-term-experiments/ltcce
- https://ricetoday.irri.org/150th-harvest-from-worlds-longest-running-continuous-rice-experiment/
- https://www.fao.org/4/Y4011E/y4011e0s.htm (Mediterranean wheat generally grows from late autumn sowing to early summer harvest.)

## Integration locations

- `src/game/engine.ts`: `nextTurn` increments `round` once on index wrap; run global surface transitions there, not each player's `beginTurn`. Second setup-town starting resources currently call `tileYield`; keep baseline grants so the starting season cannot strand economies. Existing save activation must not advance game state or roll RNG.
- `src/game/maritime.ts`: `tileYield`, `harvestYield`, `workshopYield`, `tileGood`, `tileOptions`, `marineResource`, `harvestTiles`. Current frozen ice is represented as geological `resource: ice`. Fishing BFS currently follows only `resource: water`.
- `src/game/selectors.ts`: `productionSources` handles all production paths; `income` caches this inside one planning frame. Add explicit annual/seasonal separation. `canRoute`, town sites, tower sites and colony placement need permanent land, never winter ice. `recipePayment` assumes one substitute per base good.
- `src/game/types.ts`: `RAW_SUBSTITUTES` currently maps Grain to one Fish alternative. Meat requires centralized multiple-alternative spending. Existing grain is spent first, then food substitutes, then Gold. Explicit requests for Meat must not be consumed twice as substitutes.
- `src/game/ai-market.ts`, `ai-exploration.ts`, `ai.ts`: aggregate food supply/needs over Grain + Fish + Meat, preserving exact named trade validation. Market prices should not value Meat as useless because recipes print Grain.
- `src/game/world.ts`: `canOccupy`, `landAtVertex`, `solidAtVertex`, `waterAtVertex` currently infer movement and construction from the same `resource` field. Keep geological ground separate from seasonal movement. There are approximately 59 direct water/ice tests across the current game and UI; audit these rather than changing only one predicate.
- `src/game/military.ts`: movement, embark/unload, retreat, bombardment, siege and transport passenger locations must remain valid through freezing/thawing. Pending combat must finish before any surface transition. Frozen seas cannot be colonized or develop new road/camp/tower foundation rights.
- `src/game/save.ts`: save envelope version 10 adds partial sea freezing to the calendar introduced in version 9. Migration from versions 1–8 still activates Spring at the next full round. Existing version-9 campaigns keep their current sea surfaces until the next season boundary; `thawGrace` must survive version-10 roundtrips and expire only on a season change. Validate `calendar.iceModel`, `Hex.freezeRoll` and `Hex.thawGrace`, unit occupancy and opposed stacks. Migration must be idempotent and retain backups, warehouses, tile dice numbers and independent random streams.
- `src/game/guilds.ts`: production guild contracts spend known inputs and produce chosen outputs outside dice production. Do not accidentally gate artisan refinement on harvest windows. Agriculture output must state whether it is seasonal or independent.
- `src/ui/Board.tsx`: separate memoized terrain SVG and interaction SVG. Seasonal art must use keyed file references, not expensive per-frame filters. Only invalidate on season/preview, climate/terrain change or crop-choice change. Production tokens need actual seasonal output, fallow state and visible dice numbers.
- `src/ui/Panels.tsx`, `Maritime.tsx`, `GoodGuide.tsx`: show base yield separately from current seasonal yield, all four windows, correct processed multipliers and links to selected collector coverage. Empty current output is fallow, not a broken tile.
- `src/ui/terrain-art.ts`: regional art mapping plus legacy atlas. Manifest should cover every biome × allowed climate × season, including zero-output land, open water, mixed-resource terrain and seasonal sea surfaces. No silent fallback for promised unique crop/season combinations.
- `src/ui/components.tsx`: cost sufficiency and substitution explanation assume one alternate. Resource bars, guide recipes, raw trade selectors and generated docs all require Meat.

## Partial sea-freezing contract

Ordinary sea tiles use one stable `freezeRoll = randomAt(seed, tile.id, "season-freeze")`, independent of dice and other random streams. `calendar.iceModel: 1` activates this model. The same local draw is tested against both thresholds in `SHOULDER_ICE_CHANCE`:

| Climate | Spring | Summer | Autumn | Winter |
| ------- | -----: | -----: | -----: | -----: |
| Glacial |   100% |     0% |   100% |   100% |
| Arctic  |    70% |     0% |    50% |   100% |
| Alpine  |    35% |     0% |    25% |   100% |
| Cold    |    20% |     0% |    10% |   100% |
| Prairie |    10% |     0% |    10% |   100% |

These are per-hex probabilities, not fixed proportions of each map. Reusing the same draw guarantees that Autumn ice is a subset of Spring ice and that the pattern repeats each year and reload. Other climates, including Andean, do not freeze ordinary sea. Glacial ordinary water freezes throughout Spring, Autumn and Winter, even in a reference fixture without a local roll, and opens in Summer. Arctic `resource: ice` terrain opens in Summer; Glacial `resource: ice` is permanent pack ice and never opens. It remains barren and never supplies construction ground.

`seasonalProfile` transfers any frozen Spring or Autumn allocation into Summer independently for every raw component. Fish, Cod and both Whale goods retain a four-season sum of four times their individual printed yields. Frozen sea produces no marine harvest. The changed schedule still requires matching dice rolls; it does not repay missed rolls. Collectors, advanced processing and forecasts must all use this adjusted schedule. Generic catalogue rows without a local frost draw show the open-water baseline, except Glacial marine output which is already Summer-only; selected-tile forecasts show actual surfaces and yields.

A version-9 save may contain a ship on ordinary water that the new pattern would freeze in the current Spring or Autumn. Migration records that season in `thawGrace` so the water stays open until the next boundary; repeat saves and loads must preserve this grace. The underlying frost draw is already stable, and the next season clears the old grace. Loading alone must not change the current surface or strand a force. Version-1–8 saves retain their existing Spring activation at the next full round.

## Surface-transition safety

Use one deterministic global pass at the season boundary. Never kill units automatically, place them on invalid terrain, or silently let opposing land/naval forces share a tile. Any protected occupancy or rescue exception must be explicit in the UI and save invariants. Be careful with ships carrying troops, fleets on isolated lakes, ice tiles with armies and no reachable shore, retreat reservations, and former allies sharing a tile.

A movement penalty greater than one is dangerous for 1-MP heavy infantry and artillery: it can make terrain permanently impassable. Prefer strategic seasonal surface routes over arbitrary snow costs unless a full-turn entry rule is implemented and clearly shown.

## Required checks

1. Four-season output sums for every biome and each Woods choice; test every marine frost pattern and each raw component independently. Output is finite nonnegative integer, and frozen Spring/Autumn yield moves exactly into Summer.
2. Identical multipliers across towns, camps, extensions, merchants, merchant ships and high-tier city processed goods, including mixed tiles.
3. Matching roll off-season pays zero; wrong roll in-season pays zero; multiple matches in the harvest window all pay.
4. Multiple food substitutes, partial stocks, explicit Meat costs, Gold fallback, AI trade equivalence and honest costs.
5. Exactly one season transition per whole round, dead factions skipped correctly, all-player elimination/victory handling, setup resource baseline.
6. Exact per-climate frost thresholds, stable seeded draws across years/reloads, Autumn ice as a subset of Spring ice, and the distinct Arctic seasonal ice and Glacial permanent ice exceptions. Exercise freeze/thaw with land units, naval units, loaded carriers, enemy stacks, no shore, and build legality.
7. Version-1–8 Spring activation, version-9 migration with occupied open Spring/Autumn water, preserved version-10 grace on repeated reloads, grace expiry at the next boundary, and save roundtrips in every season and frozen state without data loss.
8. Asset manifest complete, no missing network requests; readable tokens in all climates; French localization; mobile calendar and exact per-tile surface/yield forecasts. Generic marine tables must identify their open-water baseline.
9. Large-map pan/zoom uses existing cached layers; no new continuous animation, per-tile filters or repeated whole-map climate scans each AI action.

## Arctic hunting and snow correction

Seal grounds and Reindeer range now produce both resources in every season: 1 of each per matching roll at settlement level. This redistributes their old Spring/Autumn peak into Summer, preserving four units per resource per year before dice odds. Cattle range retains its original seasonal schedule.

Arctic snow cover spans Spring, Autumn and Winter in weather labels and landscape art. Spring retains melting snow; Autumn regains substantial early snow; Summer remains the short thaw. Snow coverage does not independently block production or movement. Land snow and partial sea freezing are separate rules; the marine forecast follows the per-hex contract above. This simplified land calendar follows the [NOAA Arctic Report Card](https://arctic.noaa.gov/report-card/report-card-2016/terrestrial-snow-cover-7/), which describes Arctic snow cover lasting up to nine months each year.

## Warm-climate activity correction

Summer represents the warm climates’ wet season in this game. It does not imply that all forest access or hunting stops. [FAO harvesting guidance](https://www.fao.org/4/AC142E/ac142e0d.htm) allows wet-weather harvesting on suitable terrain and calls for suspension or relocation where soil damage makes it necessary. A universal tropical timber shutdown was too broad. The same blanket shutdown for wild-game hunting lacked a basis. These are simplified game calendars, not region-specific forecasts.

Clay is the raw resource, not fired or sun-dried bricks. Extraction therefore remains productive in Summer; richer Alluvial clay has lower wet-season output rather than zero. With whole resources and annual sum 4, a base-one tile that produces every season necessarily pays 1/1/1/1. Wildlife grassland retains a smaller Summer harvest and a larger Autumn harvest: 2/1/3/2. Alluvial clay follows 2/1/2/3. Crops, livestock and Whales retain their separate schedules.

Solar salt is different. [FAO salt-pond guidance](https://www.fao.org/4/w3732e/w3732e0q.htm) describes production stopping during the rainy season and depending on sustained evaporation exceeding precipitation. Tropical and Subtropical Salt therefore retain 1/0/1/2. Savanna Salt now follows that same wet/dry order, instead of peaking during its wet Summer. Desert and Hyperarid Salt have no wet-season shutdown and produces 1/1/1/1. These changes preserve annual totals and apply to existing saves without a migration.

## Rough fields removal

Rough fields duplicated the baseline yield and harvest window of named cereals in Cold, Alpine, Steppe and Savanna climates. Its land-generation share now merges with the immediately following Barley or Millet interval. The retirement itself preserves the affected draw intervals and the sum of 100% in each climate. The later cereal rebalance gives Oceanic Barley baseline 2; the other replacement crops keep baseline 1. Black-soil wheat separately replaces 2 percentage points of Temperate Golden fields and 4 of Steppe plain.

Save envelope version 11 replaces the retired biome before catalogue-dependent migrations and invariant checks. Cold, Alpine and Oceanic Rough fields become Barley; Steppe and Savanna become Millet. Older non-climate worlds use Millet as the fallback for this retired biome, retaining its Autumn calendar. IDs, dice numbers, resource types, camps, workshops, stored goods, units and random streams are preserved. Oceanic conversions explicitly adopt Barley’s Summer harvest and its current baseline of 2, paying 8 Grain per matching Summer roll. No hidden legacy harvest rule is added. Generic pre-climate Grain tiles without a biome keep their existing rules and archived seasonal artwork.

Required regression coverage: all five generation shares and unchanged other draw intervals; legacy version-10 and older imports; live producers and saved references; annual Grain/Rations output matching the current climate-adjusted baseline; current save roundtrip; rejected invalid resources/climates; English/French names, forecasts and artwork after loading an old campaign. Archived art remains available to already-open clients but Rough fields are removed from the playable catalogue, new worlds and current saves.

## Extreme climate and cereal integration

The initial draw contains seventeen climates with relative weights 1 for each non-extreme climate and 0.35 for each extreme. Entry weights of 0.5 do not change the 85% continuity rule. Verify reciprocal compatibility, the 2/1 Glacial, 2 Hyperarid and 2/1/1 Monsoon exit weights, and preservation of all existing reservations through expeditions and reloads.

Glacial land remains snowy in all four seasons. Its mines and ordinary productive seas allocate four times their baseline to Summer; Seal grounds remain productive every season. Permanent Glacial ice is barren and never opens. Test movement, construction, fishing coverage and forecasts for this distinction. Hyperarid scarcity and Monsoon fragmentation need no new disasters or AI exceptions.

`biomeYield` supplies Rice baselines 3/2/1 for Tropical/Subtropical/Monsoon, Oceanic Barley 2, Temperate/Oceanic Turnip fields 2, Andean Potato fields 2 and baseline 1 for other Barley/Turnip fields. Wheat and Maize remain 2, Millet 1; Black-soil wheat is 3. Global and climate-specific catalogues must show these actual values, including workshop output. Existing stored goods and terrain stay intact; current productivity applies on load. Test annual conservation against revised baselines, not historical values.

## Regional crops and American climates

Turnips replace Rye at the same 4% Temperate, 2% Oceanic, 3% Cold and 3% Alpine land shares, with baseline 2 in mild regions and 1 in Cold/Alpine. The schedule is 0/1/3/0 times that baseline. Oats replace the 4% Temperate Maize interval and pay 0/6/2/0; Sorghum replaces the 5% Subtropical Maize interval and pays 0/0/8/0. Both retain baseline 2. Potatoes generate only in Andean (baseline 2, 0/2/6/0); Maize only in Prairie and Mesoamerican (baseline 2, Autumn 8). See [Crop yields and game balance](cereal-balance.md) for sources and abstractions.

Andean, Prairie and Mesoamerican have initial climate weight 1 and land ratios 75%, 70% and 45%. Entering an American climate from an older compatible climate has weight 0.75. Preferred exits Andean to Alpine, Prairie to Steppe and Mesoamerican to Subtropical have weight 2; other American exits have weight 1. Test reciprocal compatibility, exact normalized probabilities, preserved prior reservations and every land table summing to 100%.

Prairie seas freeze in Winter and use fixed 10% Spring/Autumn frost thresholds. Frozen output moves into Summer. Andean seas stay open; highland dryness does not imply frozen water. The calendar warning, exact tile forecast, generated tables and artwork must agree. New dual-resource Alpaca, Bison and Cloud forest tiles must retain both goods through town and collector multiplication and automatic processing. The first resource determines their linked workshop. Sunflower Oil uses existing Coal substitution and Fuel production.

Save version 12 replaces retired Rye and prototype non-American Potatoes with Turnips. Old non-American Maize becomes Oats in cool regions or Sorghum in warm regions; American crops retain their identity. Perform conversion before catalogue checks, retaining tile IDs, climate, dice, producers, inventories, units and random streams. No migration harvest is awarded. Keep archived crop artwork for earlier clients.

Required coverage: all seventeen climate tables and transitions; region-exclusive crop generation; version-11 and prototype version-12 imports plus roundtrips; annual raw and processed conservation; unchanged food/Oil substitution; AI production valuation; English/French names, icons, forecasts and decoded artwork before and after reload. Generated guides must use shared yield helpers and tolerate climates without Whale entries.

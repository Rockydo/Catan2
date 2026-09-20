# Seasons integration audit

## Production contract

A season lasts one complete round. Spring, Summer, Autumn and Winter have the same number of faction turns for a stable set of survivors. Each season is a harvest window: every matching dice roll pays. There is no once-per-year payout cap and no compensation when a harvest window receives no matching roll.

For each existing resource yield Y, its four seasonal payouts sum to 4Y. Expected annual production is therefore unchanged: 4 × living factions × dice probability × Y. This must hold independently for every component of mixed terrain, including whale Oil, seal Oil, Oasis food and wood, and Woods choices. A wheat tile on 7 can miss an entire five-faction harvest season with probability (5/6)^5, about 40%. A tile on 2 misses with probability (35/36)^5, about 87%.

Keep `tileYield` as the annual mean / permanent terrain contract. Legal camps, extensions, harvest coverage, AI long-term evaluation and resource availability must not disappear during a fallow season. Add a separate seasonal production contract used consistently by towns, automatic city refining, camps, workshops, merchants and ships. Advanced processed production multiplies every seasonal raw component, including food substitutes and Oil, before mapping goods. Workshops still respect their selected Woods resource.

AI should use annual income for durable town/army power evaluation, and a separate near-term forecast for shortages and trades. Using current harvest output directly as permanent power would trigger alliances and rebellions every season for no strategic reason.

## Crop grounding

IRRI's long-running triple-cropping experiment distinguishes a dry-season, early-wet-season and late-wet-season rice crop. Triple crops require short-duration varieties, irrigation and careful scheduling. Tropical triple-crop rice is therefore an explicit game abstraction of intensively cultivated paddies, not a universal claim about all rice. Subtropical double cropping is a sensible contrast.

Sources:
- https://sites.google.com/irri.org/long-term-experiments/ltcce
- https://ricetoday.irri.org/150th-harvest-from-worlds-longest-running-continuous-rice-experiment/
- https://www.fao.org/4/Y4011E/y4011e0s.htm (Mediterranean wheat generally grows from late autumn sowing to early summer harvest.)

## Integration locations

- `src/game/engine.ts`: `nextTurn` increments `round` once on index wrap; run global surface transitions there, not each player's `beginTurn`. Second setup-town starting resources currently call `tileYield`; keep baseline grants so spring setup cannot strand economies. Existing save activation must not advance game state or roll RNG.
- `src/game/maritime.ts`: `tileYield`, `harvestYield`, `workshopYield`, `tileGood`, `tileOptions`, `marineResource`, `harvestTiles`. Current frozen ice is represented as geological `resource: ice`. Fishing BFS currently follows only `resource: water`.
- `src/game/selectors.ts`: `productionSources` handles all production paths; `income` caches this inside one planning frame. Add explicit annual/seasonal separation. `canRoute`, town sites, tower sites and colony placement need permanent land, never winter ice. `recipePayment` assumes one substitute per base good.
- `src/game/types.ts`: `RAW_SUBSTITUTES` currently maps Grain to one Fish alternative. Meat requires centralized multiple-alternative spending. Existing grain is spent first, then food substitutes, then Gold. Explicit requests for Meat must not be consumed twice as substitutes.
- `src/game/ai-market.ts`, `ai-exploration.ts`, `ai.ts`: aggregate food supply/needs over Grain + Fish + Meat, preserving exact named trade validation. Market prices should not value Meat as useless because recipes print Grain.
- `src/game/world.ts`: `canOccupy`, `landAtVertex`, `solidAtVertex`, `waterAtVertex` currently infer movement and construction from the same `resource` field. Keep geological ground separate from seasonal movement. There are approximately 59 direct water/ice tests across the current game and UI; audit these rather than changing only one predicate.
- `src/game/military.ts`: movement, embark/unload, retreat, bombardment, siege and transport passenger locations must remain valid through freezing/thawing. Pending combat must finish before any surface transition. Frozen seas cannot be colonized or develop new road/camp/tower foundation rights.
- `src/game/save.ts`: envelope version 8, game version 5; validates unit occupancy and opposed stacks. New optional fields need strict validation, idempotent migration, serialization roundtrips, backup retention and legacy no-calendar behavior. Do not change tile dice numbers or stored resources when enabling seasons.
- `src/game/guilds.ts`: production guild contracts spend known inputs and produce chosen outputs outside dice production. Do not accidentally gate artisan refinement on harvest windows. Agriculture output must state whether it is seasonal or independent.
- `src/ui/Board.tsx`: separate memoized terrain SVG and interaction SVG. Seasonal art must use keyed file references, not expensive per-frame filters. Only invalidate on season/preview, climate/terrain change or crop-choice change. Production tokens need actual seasonal output, fallow state and visible dice numbers.
- `src/ui/Panels.tsx`, `Maritime.tsx`, `GoodGuide.tsx`: show base yield separately from current seasonal yield, all four windows, correct processed multipliers and links to selected collector coverage. Empty current output is fallow, not a broken tile.
- `src/ui/terrain-art.ts`: regional art mapping plus legacy atlas. Manifest should cover every biome × allowed climate × season, including zero-output land, open water, mixed-resource terrain and seasonal sea surfaces. No silent fallback for promised unique crop/season combinations.
- `src/ui/components.tsx`: cost sufficiency and substitution explanation assume one alternate. Resource bars, guide recipes, raw trade selectors and generated docs all require Meat.

## Surface-transition safety

Use one deterministic global pass at the season boundary. Never kill units automatically, place them on invalid terrain, or silently let opposing land/naval forces share a tile. Any protected occupancy or rescue exception must be explicit in the UI and save invariants. Be careful with ships carrying troops, fleets on isolated lakes, ice tiles with armies and no reachable shore, retreat reservations, and former allies sharing a tile.

A movement penalty greater than one is dangerous for 1-MP heavy infantry and artillery: it can make terrain permanently impassable. Prefer strategic seasonal surface routes over arbitrary snow costs unless a full-turn entry rule is implemented and clearly shown.

## Required checks

1. Four-season output sums for every biome and each Woods choice; output is finite nonnegative integer.
2. Identical multipliers across towns, camps, extensions, merchants, merchant ships and high-tier city processed goods, including mixed tiles.
3. Matching roll off-season pays zero; wrong roll in-season pays zero; multiple matches in the harvest window all pay.
4. Multiple food substitutes, partial stocks, explicit Meat costs, Gold fallback, AI trade equivalence and honest costs.
5. Exactly one season transition per whole round, dead factions skipped correctly, all-player elimination/victory handling, setup resource baseline.
6. Ice freeze/thaw with land units, naval units, loaded carriers, enemy stacks, no shore, and build legality.
7. Legacy save activation, save roundtrips in every season and frozen state, no data loss.
8. Asset manifest complete, no missing network requests; readable tokens in all climates; French localization; mobile calendar and tile forecast.
9. Large-map pan/zoom uses existing cached layers; no new continuous animation, per-tile filters or repeated whole-map climate scans each AI action.

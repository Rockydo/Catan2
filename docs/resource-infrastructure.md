# Resource infrastructure and irrigation

## How to use it

Select a tile, open **Terrain & seasons → Production infrastructure**. The panel shows site suitability, required city tier, construction cost, annual extra harvest and one-time industrial coal costs. A tier I settlement supports tier I works; city tiers II–IV unlock the matching upgrade. The city must touch the tile and cannot be besieged. Roads alone do not support production upgrades. Existing bridges, levees, harbors and granaries retain their separate utility rules.

Improvements belong to their builder. Their extra production and weather protection apply only to that faction's producers. Rival or allied settlements sharing a tile do not inherit the investment. The dice number still has to roll. Cities, camps and merchants apply their ordinary production multipliers; processed output follows the resulting raw harvest.

## Ten investment tracks

| Track | Eligible sites | Tier I annual addition, per affected raw good | Development |
|---|---|---|---|
| Irrigation | Existing crops, nonpolar climate, adjacent river/lake/spring or an oasis | 1–5 by climate (below) | Channels → managed canals → steam pumping → integrated works |
| Soil husbandry | Existing nonpolar crops | 3 in wet climates; 2 otherwise | Manure/rotation → seed management → threshing/fertilizers → research works |
| Drainage | Nonpolar crops on floodplains or in wet climates | 3 wet; 1 otherwise | Ditches → tile drains → steam pumps → drainage network |
| Terraces | Existing crops in Alpine/Andean climates or elevated land (elevation ≥0.58) | 3 Alpine/Andean; 2 otherwise | Contour walls → bench terraces → engineered works → integrated estate |
| Husbandry | Domestic sheep, cattle, goats, alpacas and flood meadows | 3 cool or dry; 2 otherwise | Fodder/shelter → pasture management → feed mill → veterinary/feed complex |
| Forestry | Existing timber-producing forest | 3 wet; 2 otherwise | Managed woodland → haulage → steam logging → industrial depot |
| Mining | Existing iron, coal and gold deposits, excluding peat | 4 | Supports → winding/drainage → steam engine → deep mine |
| Quarrying | Existing stone/clay, or peat | 4 | Organized workings → cranes → steam excavators → industrial extraction |
| Saltworks | Existing salt production | 4 dry; 2 otherwise | Evaporation beds → managed pans → heated pans → refinery |
| Fishery | River, lake, coastal, shoal or reef water beside the supporting town | 4 hot; 3 otherwise, while fish are present | Landing/curing → icehouse → refrigeration → cold chain |

Annual additions mean the sum of the four **per-roll seasonal amounts**, before weather, access and producer multipliers. Each season normally lasts two rounds. This is not a guaranteed annual payout: the matching number must roll. Additions are assigned proportionally to the native harvest calendar with whole-card rounding. Improvements never create a new resource. Agricultural tracks improve existing grain/oil; husbandry improves existing domestic meat/wool/hides. Forestry never increases wildlife. Fisheries improve fish recovery, not whales, and lose their benefit when the shoal migrates away.

Different tracks add their bonuses; they do not multiply each other's bonuses. For each track, tier II adds **2** more annual units than tier I, tier III adds **1** more, and tier IV adds **1** more. All installed tiers operate at their full level regardless of coal stocks.

## City requirements, construction and coal

Costs below are **incremental**, paid on each upgrade, not the price for skipping earlier levels.

A settlement/city must be at least the target infrastructure tier (I–IV).
Tier I uses each track's basic recipe. Soil husbandry now uses wood, grain and
iron tools rather than hides. All later bills are specific to the work being built:
**no infrastructure recipe requires gold or gold bars**.

| Track | Main materials and purpose | Coal at II / III / IV |
|---|---|---|
| Irrigation | Blocks and pottery for channels/pipes, steel pumping gear | 6 / 40 / 100 |
| Husbandry | Planks, feed grain and shelter blocks; machinery and late veterinary chemicals | 4 / 30 / 80 |
| Soil husbandry | Seed grain and tools; later machinery and fertilizer chemicals | 4 / 30 / 80 |
| Drainage | Pottery drains, blocks and pumping gear | 8 / 40 / 100 |
| Terraces | Large quantities of stone/blocks, timber and steel construction gear | 4 / 30 / 80 |
| Forestry | Timber structures, steel saws/haulage gear and leather belts/harnesses | 8 / 40 / 100 |
| Mining | Timber supports, blocks, steel lifting/pumping gear and leather belts/harnesses | 10 / 40 / 100 |
| Quarrying | Timber frames, blocks, steel cutting/lifting gear and leather belts/harnesses | 10 / 40 / 100 |
| Saltworks | Blocks, pottery pans/linings and metal equipment | 8 / 45 / 110 |
| Fishery | Timber landing works, insulated block stores, netting cloth and cooling machinery | 6 / 40 / 100 |

Tier II coal is a one-time construction/fabrication allowance for fittings, tools,
fired drains and masonry. It does not imply every tier II project has a steam
engine. Industrial tiers require much larger coal investments and tier IV also
uses 8–12 processed fuel. These quantities are game balance abstractions.

For example, **mining II** costs 6 planks, 3 blocks, 5 steel, 2 leather and 10 coal;
**III** costs 10 planks, 8 blocks, 16 steel, 4 leather and 40 coal;
**IV** costs 18 planks, 20 blocks, 36 steel, 6 leather, 100 coal and 12 fuel.
All bills are displayed directly from the same `infrastructureCost` function used
for payment and AI planning. Existing constructed works are retained without a
retroactive charge; new builds/upgrades use the corrected bills immediately.

**No upkeep of any kind.** Coal and fuel are paid only when constructing or upgrading. Nothing is consumed on dice rolls, season changes, turn changes or reloads. An empty coal stock does not reduce output or deactivate an improvement.

High tiers are deliberately expensive for small incremental gains. Their one-time coal investment makes them most attractive around productive, protected, advanced cities with several producers. Cheap new land will often offer better value. AI investment evaluates marginal returns and penalizes expensive high tiers; it has no fuel-reserve requirement.

## Irrigation calendars

Water alone cannot create a growing season. Irrigation requires real nearby freshwater; ocean water and a bare road do not qualify. Polar climates cannot build new irrigation. It improves existing crops without converting terrain.

| Climate | Tier I annual bonus |
|---|---|
| Desert, Hyperarid, Semiarid | +5 |
| Steppe, Mediterranean, Savanna, Monsoon | +4 |
| Prairie, Andean, Subtropical, Mesoamerican | +3 |
| Temperate, Tropical | +2 |
| Cold, Alpine, Oceanic, Temperate rainforest, Tropical maritime, Equatorial wetlands | +1 |
| Arctic, Glacial, Tundra | New irrigation unavailable |

**Concentrated** retains the crop's existing harvest dates. **Spread** distributes exactly the same improved annual grain/oil budget across suitable harvest seasons. It represents staggered plots and planting dates across a tile, not four mature crops on every individual field. It therefore lowers dependence on one season's dice rolls without creating extra output by switching modes.

Rules for the spread calendar, applied in the following order:

1. Polar legacy sites: summer only.
2. Olives: autumn/winter; dates in oases: summer/autumn in warm climates. Irrigation does not turn perennial fruits into cereals.
3. Breadfruit and sago: all seasons in hot climates; summer/autumn elsewhere.
4. Cool/continental crops (Cold, Alpine, Andean, Temperate, Oceanic, Steppe, Prairie, Temperate rainforest): summer/autumn. No irrigated winter grain.
5. Wheat, black-soil/alluvial wheat, barley and oats in warmer climates: spring/summer; in hot dry climates, spring only to avoid the hottest growing period.
6. Recession sorghum in hot climates: autumn/winter, after seasonal high water; summer/autumn elsewhere.
7. Other hot humid/balanced crops: all seasons. Tropical rice can support staggered planting with a sustained water supply.
8. Hot dry rice/delta/chinampa cultivation: spring/summer/autumn.
9. Remaining warm crops, including subtropical rice: summer/autumn.

A crop keeps its existing native concentrated schedule. No artificial crop is added to climates where the map generator does not place it. The rules also cover imported/older saves.

The inspector previews **both calendars side by side**, marks the active mode and any queued change, and shows grain and oil. One change may be queued per campaign year. It activates at the next displayed year boundary (every eight rounds with the current calendar), which can differ from spring when a campaign began in another season. Until then, current receipts follow the active calendar.

Example: temperate alluvial wheat has a native annual grain budget of 12. Tier I irrigation adds 2. Concentrated gives **0 / 14 / 0 / 0**; spread gives **0 / 7 / 7 / 0**. Winter remains dormant. Upgrading the same project changes both modes' annual totals equally.

## Risk, flooding and war

- Irrigation reduces the drought penalty by 50%, 60%, 70% and 80% at tiers I–IV. It does not prevent cold damage.
- Drainage reduces adverse wet-weather crop penalties by the same percentages. It does not remove beneficial rain bonuses or prevent river flooding.
- Husbandry reduces domestic cold/drought penalties by the same percentages. Wild herds are unaffected.
- Industrial saltworks III/IV reduce the wet-weather salt penalty from 50% to 10%.
- All these modifiers still round to whole cards, as existing production does. Small harvests can show no numerical difference for a fractional modifier.
- Flooded ground still stops producing unless a levee protects it. Irrigation and drainage are not flood immunity. Frozen water and crop disruption continue to block affected harvests.
- A surviving **armed enemy land force** occupying a tile destroys all hostile local projects there, including expensive industrial tracks and utility works. An unresolved battle or a local friendly defending army prevents premature destruction. Civilians and ships do not automatically ravage land projects.
- Destroyed irrigation also loses its queued crop plan. Destroyed levees cease protecting their floodplain immediately. The event log identifies every lost project. Rebuilding starts again at tier I and requires a legal site.

## Evidence and game abstraction

The directions of the effects follow real agronomy and industrial history. Exact resource amounts, costs and percentages are balance choices, not measured yield claims or predictions for a specific farm.

- [FAO rice systems](https://www.fao.org/agriculture/crops/thematic-sitemap/theme/spi/scpi-home/managing-ecosystems/sustainable-rice-systems/rice-what/en/) and [IRRI crop calendars](https://www.knowledgebank.irri.org/step-by-step-production/pre-planting/crop-calendar): crop duration, temperature and water availability constrain planting and harvest; tropical irrigation enables more cropping opportunities than cold climates.
- [FAO irrigation demand and planting dates](https://www.fao.org/4/u5835e/u5835e04.htm): staggered planting changes the distribution of water needs and cropping activity. Spreading production is modeled as several plots, not instant crop maturation.
- [FAO conservation agriculture](https://www.fao.org/conservation-agriculture) and [terrace design](https://www.fao.org/4/t0321e/t0321e-10.htm): soil cover, rotation and retaining works can improve resource use and limit erosion. They do not create farmland on bare peaks.
- [FAO water quality, salinity and drainage](https://www.fao.org/4/T0234e/T0234E02.htm): irrigation has management limits; drainage matters. The game uses siting and upfront investment costs rather than adding a separate salinity ledger.
- [FAO fish preservation](https://www.fao.org/4/x5884e/x5884e01.htm): landing facilities and cooling improve usable catch through reduced spoilage; fishery infrastructure therefore does not create fish populations.
- [National Museums Scotland on steam mine pumping](https://www.nms.ac.uk/discover-catalogue/the-newcomen-engine-and-its-role-in-britains-industrial-revolution): powered drainage made deeper mining practical. Coal demand and costly machinery distinguish industrial upgrades here.

This is a compact seasonal strategy abstraction, not a farm simulator. Technology is represented by settlement/city tiers; it does not introduce a separate technology tree, soil-depletion meters or unrestricted terraforming.

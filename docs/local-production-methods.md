# Local production methods: design, evidence and complete catalogue

## What is real, and what is a game coefficient?

This system uses real constraints and techniques to distinguish investment choices. **The card bonuses, weather percentages, construction bills and four city tiers are game balance coefficients, not measured historical yields.** It combines technologies from different places and periods; tiers represent local capability, not a claim that every civilization followed one historical sequence. Climate names are broad strategic regions, not precise classifications of individual soils or aquifers.

A project changes recovery, management and risk on an **existing resource**. It cannot create mineral veins, forests, permanent wildlife, new water sources or unlimited farmland. There is no upkeep, labor meter, soil-depletion ledger or unrestricted terraforming. Coal and manufactured fuel are paid once when upgrading.

## Research translated into mechanics

| Evidence and physical mechanism | Implementation and limits |
|---|---|
| [FAO Hani rice terraces](https://www.fao.org/giahs/giahs-around-the-world/china-hani-rice-terraces/en): linked catchments, terraces and water distribution | Paddy bunds, dividing sluices and cascaded terrace methods; water benefits depend on the rice crop's temperature window. Irrigation still needs real freshwater. |
| [FAO agricultural heritage systems](https://www.fao.org/4/y4586e/y4586e13.htm): contrasting oases and raised-field/wetland agriculture | Oasis distribution, canal-fed raised gardens and rice paddies are separate methods. Chinampa/delta mixed gardens are not described as rice paddies. |
| [FAO Andean agriculture](https://www.fao.org/giahs/giahs-around-the-world/peru-andean-agriculture/20th-anniversary-celebrations-of-the-globally-important-agricultural-heritage-systems-%28giahs%29-programme/en): terraces, ridged fields, water management and elevation-adapted crops | Stone-heavy highland terraces, root-crop rotations, raised beds and modest cold-loss protection. No winter harvest unlocked and no mountain crossing. Elevation/highland climate remains the game's coarse slope eligibility proxy. |
| [FAO water harvesting](https://www.fao.org/land-water/water/agricultural-water-management/water-harvesting-and-storage/en) and [zaï/tassa and half-moon systems](https://www.fao.org/4/y4690e/y4690e09.htm): runoff concentration and soil improvement where seasonal rain exists | A separate rainwater-harvesting investment for eligible rainfed dryland crops. No freshwater-neighbor requirement, but no true-desert conversion or extra harvest season. |
| [FAO Qanat Kashan system](https://www.fao.org/uploads/media/IRAN_GIAHS_Proposal_FINAL.PDF): conserving and distributing scarce groundwater | Covered oasis distribution requires the game's existing freshwater site. It does not prospect for aquifers or create a new source. |
| [FAO agroforestry](https://www.fao.org/agroforestry/about-agroforestry/overview/) and [conservation agriculture](https://www.fao.org/conservation-agriculture): soil cover, organic matter and nutrient cycling | Tropical compost/cover-crop methods, dryland mulch and rotations. These improve an existing crop; they do not convert fields to forest or add wildlife. Black-soil fields deliberately receive smaller soil-investment gains because they already have a strong native yield. |
| [FAO livestock feeding and stored fodder](https://www.fao.org/4/Y2647E/y2647e02.htm) and [pastoralism](https://www.fao.org/policy-support/policy-themes/pastoralism/en/): seasonal feed availability | Cold-region hay/shelter puts more extra recovery in autumn/winter; dryland fodder reserves mitigate dry spells. Domestic herds remain stationary under existing rules. |
| [Forestry England coppicing](https://www.forestryengland.uk/westonbirt/coppice), [FAO tropical logging](https://www.fao.org/4/ae359e/ae359e04.htm), [Natural Resources Canada adaptation options](https://cfs.nrcan.gc.ca/adaptation-options): forest type, planned extraction and ground conditions matter | Broadleaf management, tropical selective extraction and cold-region winter haulage have different seasonal allocations and weather protection. Extra wood never also grants extra wild animals. |
| [National Museums Scotland: Newcomen pumping](https://www.nms.ac.uk/discover-catalogue/the-newcomen-engine-and-its-role-in-britains-industrial-revolution) and [NPS Coal Creek extraction](https://www.nps.gov/yuch/learn/historyculture/coal-creek-dredge-history.htm): water control and frozen-ground working | Mine pumping reduces wet losses; cold-region protected workings and steam thawing reduce cold losses and cost more coal. The game's hard-rock gold method uses sorting/crushing, not a fictitious alluvial deposit on every gold tile. |
| [NPS quarry history](https://www.nps.gov/bica/learn/historyculture/lime-kiln-and-limestone-quarry.htm) and [FAO peat preparation](https://www.fao.org/4/x5872e/x5872e0b.htm): cutting/lifting stone differs from cutting and drying peat | Stone benches/cranes/saws, clay settling/excavation and peat racks/presses/stores are separate methods. The peat model reflects historical extraction, not a recommendation for present-day land management. |
| [FAO salt-pan management](https://www.fao.org/4/ag174e/AG174E01.htm): brine concentration and evaporation | Dry climates favor solar salt early; cool/wet sites get smaller early gains and costly heated concentration later. Rain dilution remains distinct from mine drainage. |
| [FAO fish salting and preservation](https://www.fao.org/flw-in-fish-value-chains/resources/articles/detail/fish-salting--what-you-need-to-know/en): handling and spoilage determine usable catch | Tropical curing/cooling offers more recovery than already-cold coast handling. Freshwater landings are a distinct method. Absent shoals and frozen access still prevent harvest. No whaling bonus from fishery works. |
| [NPS caribou drives](https://www.nps.gov/gaar/learn/historyculture/the-caribou-drive.htm) and [backcountry meat handling](https://www.nps.gov/wrst/planyourvisit/hunting-and-fishing.htm): locating passing animals and preserving meat | Woodland tracking, plains scouting, cold caches/drive markers and desert shaded curing. Bonuses depend entirely on animals currently present; infrastructure cannot create, retain or exterminate a herd. |

## How the method is selected

Selection is deterministic and needs no new save data. Existing projects use the method appropriate to their existing tile when this version loads.

- **Irrigation:** Desert/Hyperarid or oasis → oasis distribution; chinampa/delta gardens → raised gardens; rice → paddy control; warm/dry alluvial wheat or recession sorghum → recession management (continental variant elsewhere); olive/breadfruit/sago → orchard basins; dry climates or Monsoon → dryland field irrigation; cool/wet settings → supplemental irrigation; other fields → continental irrigation. Eligibility is checked separately: no polar irrigation and no invented freshwater.
- **Soils:** chernozem → black-soil rotations; potato/turnip → root rotations; hot wet settings → nutrient cycling; dry settings → mulch; otherwise mixed rotations.
- **Drainage/terraces:** rice keeps its own water-management methods. Cool lowlands and raised gardens use raised beds. Alpine/Andean cultivated sites receive stone-heavy highland terraces; other rice slopes, dry slopes and general hillsides use their matching methods. Existing eligibility uses highland climate or elevation ≥0.58, not a detailed slope simulation.
- **Livestock/forestry:** cold highlands and polar regions favor hay or winter haulage; Steppe/Prairie livestock also store winter fodder. Dry warm herds use fodder reserves. Hot forests use selective logging; remaining broadleaf forests use coppice/high-forest management.
- **Extraction:** polar mines require cold-region workings; elsewhere gold, coal and iron have distinct methods. Quarries distinguish peat, clay and stone. Dry climates use solar salt; other sites use sheltered/heated concentration.
- **Fisheries/hunting:** river/lake landings differ from hot and cold coastal methods. Hunting selects cold-region caches, desert tracking, woodland tracking or open-country stations from the existing habitat and climate. Eligibility follows the existing wildlife habitat rules, not the presence of a herd at the moment of construction.

## Reading the numbers

`Annual extra` is one shared budget summed over the four per-roll seasonal profiles. It is not guaranteed income. The number must roll, access must remain legal and migratory animals must be present. Ordinary city/camp/unit multipliers still apply.

`Season weights` favor a season's share of the bonus, multiplied by its native productive amount. A zero native crop harvest stays zero. Wildlife uses the current visiting animals as a conditional four-season snapshot. Hunting gets no bonus when that snapshot is empty.

`Protection` is the fraction of a **negative weather penalty** removed. For example 80% protection changes a 25% loss into a 5% loss. Only the strongest applicable owned method applies; different tracks cannot stack protections into immunity. Positive weather remains positive, and flood/ice access rules still win.

`Material multipliers` modify the corresponding base construction ingredients, rounded upward. Missing ingredients are not invented by a multiplier. Default multipliers and seasonal weights are 1. Tier costs are incremental and never charged again on rolls or reloads.

The catalogue below is generated from the same definitions used by the game (`npx tsx scripts/document-infrastructure.ts`).

<!-- GENERATED METHODS -->

43 local methods.

### Oasis water distribution

Covered channels conserve scarce freshwater; dry sites gain most, but still need an oasis, river, lake or spring.

- Stages I–IV: Spring channels → Covered distribution galleries → Lift pumps → Lined oasis network.
- Annual extra I–IV: **5 / 7 / 8 / 9**.
- Spring / summer / autumn / winter weights: 1 / 1 / 1 / 1.
- Loss protection I–IV: dry: 60% / 70% / 80% / 85%.
- Construction adjustments: stone ×1.3, masonry ×1.3, ceramics ×1.25.

### Paddy water control

Bunds and sluices regulate water on existing rice plots. Warmth limits additional planting; water cannot create a winter crop in a cold climate.

- Stages I–IV: Paddy bunds → Dividing sluices → Paddy pumping station → Controlled paddy network.
- Annual extra I–IV: **3 / 5 / 6 / 7**.
- Spring / summer / autumn / winter weights: 1 / 1 / 1 / 1.
- Loss protection I–IV: dry: 50% / 60% / 70% / 80%.
- Construction adjustments: ceramics ×1.25, steel ×0.85.

### Canal-fed raised gardens

Canals supply raised garden beds without flooding the roots. Sediment and controlled water support existing mixed crops; these are not rice paddies.

- Stages I–IV: Garden feeder channels → Raised beds and sluices → Garden return pumps → Integrated garden waterways.
- Annual extra I–IV: **3 / 5 / 6 / 7**.
- Spring / summer / autumn / winter weights: 1 / 1 / 1 / 1.
- Loss protection I–IV: dry: 50% / 60% / 70% / 80%; wet: 20% / 30% / 40% / 50%.
- Construction adjustments: planks ×1.2, masonry ×0.85.

### Recession-water management

Diversion gates retain useful water after floods recede. They improve the existing harvest without preventing flooding.

- Stages I–IV: Diversion channels → Recession gates → Lift and return pumps → Regulated recession network.
- Annual extra I–IV: **4 / 6 / 7 / 8**.
- Spring / summer / autumn / winter weights: 1 / 1 / 1 / 1.
- Loss protection I–IV: dry: 50% / 60% / 70% / 80%.
- Construction adjustments: masonry ×1.2, planks ×1.2.

### Orchard basin irrigation

Tree basins direct scarce water to roots. Fruit and oil retain their native ripening seasons.

- Stages I–IV: Tree basins → Lined orchard channels → Orchard lift pumps → Root-zone distribution.
- Annual extra I–IV: **3 / 4 / 5 / 6**.
- Spring / summer / autumn / winter weights: 1 / 1 / 1 / 1.
- Loss protection I–IV: dry: 50% / 60% / 70% / 80%.
- Construction adjustments: ceramics ×1.25, planks ×0.8.

### Supplemental field irrigation

Reliable supplementary water helps existing fields; cool or already wet climates have limited extra cropping potential.

- Stages I–IV: Field channels → Managed canals → Steam pumping station → Integrated irrigation works.
- Annual extra I–IV: **1 / 2 / 3 / 4**.
- Spring / summer / autumn / winter weights: 1 / 1 / 1 / 1.
- Loss protection I–IV: dry: 50% / 60% / 70% / 80%.
- Construction adjustments: Base recipe.

### Seasonal field irrigation

Stored and diverted freshwater supports continental summer crops without extending the growing season into winter.

- Stages I–IV: Field channels → Managed canals → Steam pumping station → Integrated irrigation works.
- Annual extra I–IV: **2 / 4 / 5 / 6**.
- Spring / summer / autumn / winter weights: 1 / 1 / 1 / 1.
- Loss protection I–IV: dry: 50% / 60% / 70% / 80%.
- Construction adjustments: Base recipe.

### Dryland field irrigation

Freshwater irrigation has high returns in dry farming areas. It remains distinct from rain-dependent runoff harvesting.

- Stages I–IV: Field channels → Lined field canals → Steam lift pumps → Integrated field network.
- Annual extra I–IV: **4 / 6 / 7 / 8**.
- Spring / summer / autumn / winter weights: 1 / 1 / 1 / 1.
- Loss protection I–IV: dry: 50% / 60% / 70% / 80%.
- Construction adjustments: ceramics ×1.15, masonry ×1.1.

### Dryland mulch and rotations

Ground cover and organic matter conserve moisture. Drought-tolerant crops gain less from extra water but benefit from soil care.

- Stages I–IV: Mulch and manure → Fallow rotations → Seed drills and soil amendments → Dryland agronomy station.
- Annual extra I–IV: **2 / 3 / 4 / 5**.
- Spring / summer / autumn / winter weights: 1 / 1 / 1 / 1.
- Loss protection I–IV: dry: 20% / 30% / 40% / 50%.
- Construction adjustments: grain ×1.25, reagents ×0.8.

### Black-soil rotations

Already fertile black soils need careful rotations more than large fertilizer inputs. Improvements have deliberately modest returns.

- Stages I–IV: Crop rotations → Seed selection → Precision sowing → Soil-testing station.
- Annual extra I–IV: **1 / 2 / 3 / 4**.
- Spring / summer / autumn / winter weights: 1 / 1 / 1 / 1.
- Loss protection I–IV: None.
- Construction adjustments: reagents ×0.65, steel ×1.1.

### Tropical nutrient cycling

Mulch, compost and cover crops conserve nutrients under heavy rain. This supports the existing crop, without planting a new forest.

- Stages I–IV: Compost and ground cover → Cover-crop rotations → Amendment preparation → Nutrient recovery works.
- Annual extra I–IV: **3 / 5 / 6 / 7**.
- Spring / summer / autumn / winter weights: 1 / 1 / 1 / 1.
- Loss protection I–IV: wet: 20% / 30% / 40% / 50%.
- Construction adjustments: reagents ×1.25, grain ×0.75.

### Root-crop rotations

Seed selection, ridging and rotations improve existing tubers and roots while keeping their climate-limited harvest calendar.

- Stages I–IV: Seed selection → Ridged rotations → Mechanical lifting → Seed and root stores.
- Annual extra I–IV: **3 / 4 / 5 / 6**.
- Spring / summer / autumn / winter weights: 1 / 1 / 1 / 1.
- Loss protection I–IV: wet: 15% / 25% / 35% / 45%.
- Construction adjustments: planks ×1.15, steel ×1.15.

### Mixed-field rotations

Rotations and selected seed improve existing cereals and perennial crops. Mechanization improves recovery, not the number of winter harvests.

- Stages I–IV: Rotations and manure → Seed and soil management → Steam threshing and fertilizers → Agricultural research works.
- Annual extra I–IV: **2 / 4 / 5 / 6**.
- Spring / summer / autumn / winter weights: 1 / 1 / 1 / 1.
- Loss protection I–IV: None.
- Construction adjustments: Base recipe.

### Wet-field drainage

Ditches and fired drains relieve waterlogging; river floods still require levees.

- Stages I–IV: Field ditches → Tile drainage → Steam drainage pumps → Managed drainage network.
- Annual extra I–IV: **3 / 5 / 6 / 7**.
- Spring / summer / autumn / winter weights: 1 / 1 / 1 / 1.
- Loss protection I–IV: wet: 50% / 60% / 70% / 80%.
- Construction adjustments: ceramics ×1.2.

### Controlled paddy drawdown

Gates allow managed drainage without treating rice as a dryland cereal. Small output gains complement water control.

- Stages I–IV: Paddy outlets → Drawdown sluices → Return pumps → Paddy drainage network.
- Annual extra I–IV: **1 / 2 / 3 / 4**.
- Spring / summer / autumn / winter weights: 1 / 1 / 1 / 1.
- Loss protection I–IV: wet: 20% / 30% / 40% / 50%.
- Construction adjustments: planks ×1.25, ceramics ×0.75.

### Raised beds and drains

Raised growing beds and drainage reduce waterlogging in cool lowlands; they do not warm an entire climate or stop river floods.

- Stages I–IV: Raised beds → Linked field drains → Lowland pumps → Managed raised-field network.
- Annual extra I–IV: **2 / 4 / 5 / 6**.
- Spring / summer / autumn / winter weights: 1 / 1 / 1 / 1.
- Loss protection I–IV: wet: 50% / 60% / 70% / 80%; cold: 10% / 20% / 30% / 40%.
- Construction adjustments: stone ×1.25, steel ×0.9.

### Highland stone terraces

Retaining walls conserve soil and water on cultivated slopes. Sheltered plots reduce cold-spell losses without opening winter harvests.

- Stages I–IV: Contour stone walls → Bench and water terraces → Engineered retaining works → Integrated highland estate.
- Annual extra I–IV: **3 / 5 / 6 / 7**.
- Spring / summer / autumn / winter weights: 1 / 1 / 1 / 1.
- Loss protection I–IV: cold: 15% / 25% / 35% / 45%; dry: 15% / 25% / 35% / 45%.
- Construction adjustments: stone ×1.3, masonry ×1.25, planks ×0.8.

### Cascaded rice terraces

Level basins and dividing sluices hold water on existing hillside rice plots. No new farmland or mountain crossings are created.

- Stages I–IV: Paddy contour walls → Cascaded basins → Engineered paddy walls → Integrated terrace catchment.
- Annual extra I–IV: **3 / 4 / 5 / 6**.
- Spring / summer / autumn / winter weights: 1 / 1 / 1 / 1.
- Loss protection I–IV: dry: 25% / 40% / 55% / 65%.
- Construction adjustments: masonry ×1.25, steel ×0.85.

### Dry-stone contour terraces

Contour walls slow runoff and soil loss on existing dry slopes. Benefits favor dry spells rather than extra harvest seasons.

- Stages I–IV: Dry-stone walls → Bench terraces → Engineered hillside works → Integrated terrace estate.
- Annual extra I–IV: **2 / 4 / 5 / 6**.
- Spring / summer / autumn / winter weights: 1 / 1 / 1 / 1.
- Loss protection I–IV: dry: 25% / 40% / 55% / 65%.
- Construction adjustments: stone ×1.25, masonry ×1.1.

### Hillside erosion control

Cultivated slopes benefit from retaining works; flat land cannot build terraces.

- Stages I–IV: Contour walls → Bench terraces → Engineered hillside works → Integrated terrace estate.
- Annual extra I–IV: **2 / 3 / 4 / 5**.
- Spring / summer / autumn / winter weights: 1 / 1 / 1 / 1.
- Loss protection I–IV: wet: 20% / 30% / 40% / 50%.
- Construction adjustments: Base recipe.

### Hay meadows and winter shelter

Stored fodder and shelter favor cold-season livestock recovery. Domestic herds stay on their tile; wild herds are not fed by these works.

- Stages I–IV: Hay and shelter → Winter fodder stores → Mechanized feed mill → Veterinary and feed complex.
- Annual extra I–IV: **4 / 6 / 7 / 8**.
- Spring / summer / autumn / winter weights: 1 / 1 / 2 / 3.
- Loss protection I–IV: cold: 50% / 60% / 70% / 80%; dry: 15% / 25% / 35% / 45%.
- Construction adjustments: planks ×1.2, grain ×1.3.

### Dryland fodder reserves

Managed fodder and watering facilities buffer dry-season grazing shortages. This improves existing domestic stock, not wild herd abundance.

- Stages I–IV: Fodder and watering pens → Managed grazing paddocks → Fodder processing mill → Veterinary and fodder depot.
- Annual extra I–IV: **3 / 5 / 6 / 7**.
- Spring / summer / autumn / winter weights: 1 / 1 / 1 / 1.
- Loss protection I–IV: dry: 50% / 60% / 70% / 80%; cold: 15% / 25% / 35% / 45%.
- Construction adjustments: masonry ×1.2, grain ×1.25.

### Managed pasture and stock care

Pasture rotation and feed preparation improve domestic meat, hides and wool within one shared output budget.

- Stages I–IV: Fodder and shelters → Managed pasture → Mechanized feed mill → Veterinary and feed complex.
- Annual extra I–IV: **3 / 5 / 6 / 7**.
- Spring / summer / autumn / winter weights: 1 / 1 / 1 / 1.
- Loss protection I–IV: cold: 25% / 40% / 55% / 65%; dry: 25% / 40% / 55% / 65%.
- Construction adjustments: Base recipe.

### Winter timber haulage

Frozen-ground haulage favors winter timber recovery. Saws and prepared tracks reduce access losses; they do not increase game populations.

- Stages I–IV: Managed winter cutting → Sled haulage routes → Steam saw and haulage → Boreal timber depot.
- Annual extra I–IV: **2 / 4 / 5 / 6**.
- Spring / summer / autumn / winter weights: 1 / 1 / 1 / 3.
- Loss protection I–IV: cold: 25% / 40% / 55% / 70%; wet: 10% / 20% / 35% / 50%.
- Construction adjustments: leather ×1.3, planks ×1.1.

### Selective tropical logging

Planned felling and short extraction routes improve recovery under wet conditions. Existing forest composition and wildlife remain unchanged.

- Stages I–IV: Marked selective felling → Planned extraction routes → Compact steam sawworks → Selective timber depot.
- Annual extra I–IV: **2 / 4 / 5 / 6**.
- Spring / summer / autumn / winter weights: 1 / 1 / 1 / 1.
- Loss protection I–IV: wet: 25% / 40% / 55% / 65%.
- Construction adjustments: steel ×1.2, masonry ×0.8.

### Managed broadleaf woodland

Coppice and high-forest management improve timber recovery, with more work in the dormant season rather than a blanket wildlife bonus.

- Stages I–IV: Managed cutting coupes → Timber haulage → Steam logging works → Industrial forestry depot.
- Annual extra I–IV: **3 / 5 / 6 / 7**.
- Spring / summer / autumn / winter weights: 1 / 1 / 2 / 2.
- Loss protection I–IV: wet: 15% / 25% / 40% / 55%.
- Construction adjustments: Base recipe.

### Ventilated coal workings

Supports, ventilation and pumping support coal extraction. Drainage equipment increasingly reduces wet-spell losses.

- Stages I–IV: Supported workings → Ventilation and winding → Steam mine pumps → Integrated ventilated mine.
- Annual extra I–IV: **4 / 6 / 7 / 8**.
- Spring / summer / autumn / winter weights: 1 / 1 / 1 / 1.
- Loss protection I–IV: wet: 0% / 25% / 65% / 80%.
- Construction adjustments: Base recipe.

### Hard-rock ore dressing

Crushing, sorting and lifting recover more ore from the existing vein. No new deposit is created.

- Stages I–IV: Sorted workings → Crushing and winding → Steam ore-dressing mill → Integrated ore works.
- Annual extra I–IV: **3 / 5 / 6 / 7**.
- Spring / summer / autumn / winter weights: 1 / 1 / 1 / 1.
- Loss protection I–IV: wet: 0% / 25% / 65% / 80%.
- Construction adjustments: steel ×1.15.

### Gold-vein recovery

Careful sorting and crushing improve precious-metal recovery. Gold receives a smaller card bonus than bulk coal or stone.

- Stages I–IV: Selective vein working → Stamping and sorting → Steam stamp mill → Integrated gold recovery.
- Annual extra I–IV: **2 / 3 / 4 / 5**.
- Spring / summer / autumn / winter weights: 1 / 1 / 1 / 1.
- Loss protection I–IV: wet: 0% / 25% / 65% / 80%.
- Construction adjustments: steel ×1.2, masonry ×1.1.

### Cold-region mineral workings

Thawing and protected lifting are expensive in frozen ground. Steam equipment reduces cold-spell losses but never opens impassable terrain.

- Stages I–IV: Protected workings → Insulated winding gear → Steam thawing and pumping → Cold-region extraction works.
- Annual extra I–IV: **2 / 3 / 4 / 5**.
- Spring / summer / autumn / winter weights: 1 / 3 / 2 / 1.
- Loss protection I–IV: cold: 0% / 25% / 65% / 80%; wet: 0% / 25% / 65% / 80%.
- Construction adjustments: coal ×1.4, planks ×1.2.

### Clay winning and settling

Covered sorting and drained workings improve raw clay recovery. These works do not turn the tile's output into pottery.

- Stages I–IV: Organized clay pits → Settling and haulage → Steam clay excavators → Integrated clay workings.
- Annual extra I–IV: **3 / 5 / 6 / 7**.
- Spring / summer / autumn / winter weights: 1 / 1 / 1 / 1.
- Loss protection I–IV: wet: 0% / 25% / 65% / 80%.
- Construction adjustments: masonry ×0.8, planks ×1.2.

### Peat cutting and drying

Cutting, raised drying racks and covered stores suit wet peat ground. Wet spells remain a risk until advanced drying works.

- Stages I–IV: Cutting and drying racks → Covered peat stores → Mechanical pressing → Integrated peat drying.
- Annual extra I–IV: **2 / 4 / 5 / 6**.
- Spring / summer / autumn / winter weights: 1 / 3 / 2 / 1.
- Loss protection I–IV: wet: 10% / 25% / 55% / 70%.
- Construction adjustments: steel ×0.7, planks ×1.3, coal ×0.8.

### Dimension-stone quarrying

Cutting benches, cranes and sawing improve stone recovery. Wet and cold spells hamper exposed workings.

- Stages I–IV: Organized workings → Cranes and haulage → Steam stone saws → Industrial extraction works.
- Annual extra I–IV: **3 / 5 / 6 / 7**.
- Spring / summer / autumn / winter weights: 1 / 1 / 1 / 1.
- Loss protection I–IV: wet: 10% / 25% / 50% / 70%; cold: 0% / 10% / 40% / 60%.
- Construction adjustments: steel ×1.15.

### Solar evaporation saltworks

Sun and dry air favor evaporation; rain dilutes exposed pans. Advanced covered and heated works reduce that risk.

- Stages I–IV: Evaporation beds → Divided crystallizer pans → Covered heated pans → Integrated salt refinery.
- Annual extra I–IV: **4 / 6 / 7 / 8**.
- Spring / summer / autumn / winter weights: 1 / 3 / 2 / 1.
- Loss protection I–IV: wet: 10% / 25% / 70% / 80%; cold: 0% / 10% / 50% / 70%.
- Construction adjustments: coal ×0.9, masonry ×1.15.

### Sheltered brine concentration

Cool or wet climates have weaker natural evaporation. Heated pans matter more, with a higher upfront coal bill.

- Stages I–IV: Sheltered brine beds → Brine concentration pans → Coal-fired salt pans → Covered salt refinery.
- Annual extra I–IV: **1 / 2 / 4 / 5**.
- Spring / summer / autumn / winter weights: 1 / 1 / 1 / 1.
- Loss protection I–IV: wet: 10% / 25% / 70% / 85%; cold: 0% / 10% / 60% / 80%.
- Construction adjustments: coal ×1.3, steel ×1.1.

### Freshwater landing and curing

Landing stages and careful handling improve the fish currently using the river or lake. They do not dam navigation or create permanent fish.

- Stages I–IV: Net landings → Landing and curing stores → Steam ice plant → Freshwater cold chain.
- Annual extra I–IV: **2 / 4 / 5 / 6**.
- Spring / summer / autumn / winter weights: 1 / 1 / 1 / 1.
- Loss protection I–IV: None.
- Construction adjustments: planks ×1.2, cloth ×1.2, masonry ×0.8.

### Tropical catch preservation

Shade, curing and refrigeration reduce warm-climate catch losses. Benefits disappear when the shoal migrates away.

- Stages I–IV: Shaded curing racks → Covered landing stores → Steam ice plant → Tropical cold chain.
- Annual extra I–IV: **3 / 5 / 6 / 7**.
- Spring / summer / autumn / winter weights: 1 / 1 / 1 / 1.
- Loss protection I–IV: None.
- Construction adjustments: salt ×1.5, coal ×1.15, cloth ×1.2.

### Cold-coast fish handling

Landing gear, curing stores and icehouses improve existing catches. Frozen water and absent shoals still stop production.

- Stages I–IV: Landing and curing → Icehouse and landing gear → Steam refrigeration → Industrial cold chain.
- Annual extra I–IV: **2 / 3 / 4 / 5**.
- Spring / summer / autumn / winter weights: 1 / 1 / 1 / 1.
- Loss protection I–IV: None.
- Construction adjustments: coal ×0.9, planks ×1.15.

### Runoff basins and stone bunds

Planting pits, small bunds and stored runoff support rainfed dryland crops. They need seasonal rain, cannot irrigate a true desert and do not add harvest seasons.

- Stages I–IV: Runoff planting basins → Contour bunds and cisterns → Runoff distribution pumps → Managed microcatchments.
- Annual extra I–IV: **2 / 3 / 4 / 5**.
- Spring / summer / autumn / winter weights: 1 / 1 / 1 / 1.
- Loss protection I–IV: dry: 25% / 40% / 50% / 60%.
- Construction adjustments: stone ×1.2.

### Woodland tracking and game recovery

Trails, hides and curing facilities improve meat and hides only while wild animals are here. Logging and development still discourage visiting herds.

- Stages I–IV: Tracking shelters → Hides and curing racks → Game-handling depot → Regional game cold store.
- Annual extra I–IV: **4 / 6 / 7 / 8**.
- Spring / summer / autumn / winter weights: 1 / 1 / 1 / 1.
- Loss protection I–IV: None.
- Construction adjustments: Base recipe.

### Open-country hunting stations

Scouting shelters and communal game handling improve recovery from passing herds. No herd is created, held in place or hunted to extinction.

- Stages I–IV: Scouting shelters → Drive lanes and curing racks → Game-handling depot → Regional game cold store.
- Annual extra I–IV: **4 / 6 / 7 / 8**.
- Spring / summer / autumn / winter weights: 1 / 1 / 1 / 1.
- Loss protection I–IV: None.
- Construction adjustments: lumber ×0.8, stone ×1.2.

### Cold-country hunting caches

Tracking routes, stone markers and protected caches improve passing reindeer, musk ox and coastal seals. Empty snow plains still yield nothing.

- Stages I–IV: Tracking and stone caches → Drive markers and shelters → Protected game depot → Insulated game stores.
- Annual extra I–IV: **4 / 6 / 7 / 8**.
- Spring / summer / autumn / winter weights: 1 / 1 / 1 / 1.
- Loss protection I–IV: None.
- Construction adjustments: stone ×1.25, leather ×1.25, coal ×0.8.

### Dryland tracking and shaded curing

Small tracking shelters near scrub and oases improve recovery from visiting gazelles. They never create a permanent herd or water source.

- Stages I–IV: Tracking shelters → Shaded curing stations → Game-handling depot → Dryland game cold store.
- Annual extra I–IV: **4 / 6 / 7 / 8**.
- Spring / summer / autumn / winter weights: 1 / 1 / 1 / 1.
- Loss protection I–IV: None.
- Construction adjustments: salt ×1.25, lumber ×1.2, planks ×1.2.

# Catane Frontiers: complete rules

Generated from the interactive guide and game data. Launch the game and choose Learn to play for the illustrated version.

## Setup and turn sequence

### Objective

Win by destroying every rival settlement and city. There are no victory points or turn limit. Empty land does not need to be occupied or explored. The last surviving faction wins immediately.
A town means either a settlement or a city. Losing your last town eliminates your faction and removes its remaining pieces, goods and cards. During an unfinished game, eliminated factions may return through expeditions; eliminated AI factions may also return through rebellions.

### Setup

Choose Classic (5 factions, 125 tiles) or Grand campaign (10 factions, 250 tiles).

- In player order, each faction places one settlement and one adjoining road or sea route.
- Repeat in reverse player order. Each faction now has two settlements and two route pieces.
- The second settlement receives the full baseline yield of every adjacent productive tile. For example, Golden fields give 2 Grain and a Whale tile gives 1 Hides plus 1 Oil. Woods initially give Wood. Ignore the starting season for these setup resources. Start with no troops or processed goods.
  Each settlement must touch at least one walkable solid land tile. Bare Peaks and Frozen sea do not qualify. At least one empty intersection must separate any two settlements, regardless of owner.

### Turn sequence

- Production: roll two independent six-sided dice. All factions collect the current seasonal production from tiles whose number matches the total. Seven produces normally. There is no robber, discard or stock limit.
- Actions: build, trade, recruit, move, fight, raid, explore, buy research and play cards in any order. Raided goods are immediately available to spend.
- End turn: pass to the next surviving faction. A round is complete when every surviving faction has had a turn. The season then advances.
  Held research cards may also be played before rolling, if their conditions allow it. There is no separate military phase.

### Construction access

Camps add raw production along routes. City I doubles each adjacent tile’s printed raw yield and unlocks workshops. A coastal town can build mobile ships; the available tier depends on its level. Research and guilds provide additional effects and resource exchanges. See the relevant chapters for costs and requirements.

### Differences from Catan

The original costs of roads, settlements, City I, sea-route pieces and tier-I development cards are unchanged. There is no robber, pirate, Knight reward, Largest Army reward, Longest Road reward or victory-point card. Pieces, reserve stock and research supplies are unlimited.
Goods are stored in individual towns but spent from a common pool. Armies can raid and destroy towns. Workshops, guilds, research and expeditions add actions. Sea routes connect settlements; fleets are separate moving pieces.

## Map and dice

### Climate generation

The initial map contains 125 tiles in Classic or 250 in Grand campaign. Climate is assigned before terrain. Pick a random starting tile, then choose among seventeen climates using relative weights: 1 for each of the fourteen non-extreme climates and 0.35 each for Glacial, Hyperarid and Monsoon. Normalize these weights for the initial draw. Grow outward through neighbors. If all assigned immediate neighbors agree, retain that climate with 85% probability. On a switch, intersect the compatible climates of assigned immediate neighbors only. Destination weights start at 1. From the seven original climates, newly compatible Oceanic, Alpine, Subtropical and Savanna destinations have weight 0.5. Temperate and Steppe favor Cold at 1.5. Mediterranean gives Steppe and Desert weight 0.5. Tropical to Desert, Desert to Tropical and Cold to Arctic have weight 2. Oceanic favors Temperate at 2; Alpine favors Cold and Arctic at 2 each; Subtropical and Savanna favor Tropical at 2. Entering a compatible extreme climate has weight 0.5. Glacial exits to Arctic at 2 or Alpine at 1; Hyperarid exits to Desert at 2; Monsoon exits to Tropical at 2, Subtropical or Savanna at 1. Entering a compatible American region from an older climate has weight 0.75. Andean favors Alpine, Prairie favors Steppe and Mesoamerican favors Subtropical with weight 2; their other exits have weight 1. Eligible weights are normalized for each draw. The 85% continuity chance is unchanged. At mixed borders, prefer an existing adjacent compatible climate. If no candidate exists, copy an immediate neighbor.
Before rolling terrain, a final repair pass leaves intermediate compatible climates as buffer zones where needed. Adjacent climates are always compatible. Climate reservations include an unseen collar, so future expeditions cannot create incompatible seams. The underlying terrain never changes. Its appearance, yield and sea surface follow the seasonal calendar. The same seed and discovery sequence reproduce the same world. Different expedition sequences may extend climate zones differently.
Choose land or water using that climate’s ratio, then use its terrain table below. Land percentages are conditional on rolling land. Water checks run in the listed order on remaining water only; the first success ends the sequence. Water tiles with no adjacent land double their climate’s Whale check chance. Fish, Cod and Frozen sea checks stay unchanged and run first. Frozen sea does not count as land. Hidden neighbors use their reserved climates and land rolls; the map edge alone does not qualify as open water. Gold frequency varies by climate. No resource, climate, port, continent or balanced start is guaranteed.
Temperate, Tropical and Desert use 50% land. Cold and Subtropical use 55%, Steppe 65%, Arctic and Mediterranean 40%, Oceanic 35%, Alpine 75%, Savanna 70%, Glacial 45%, Hyperarid 90%, Monsoon 30%, Andean 75%, Prairie 70% and Mesoamerican 45%. Steppe and Desert are mutually compatible, as are all other listed borders. Oasis food means Grain.

### Climate overview

Use the Climates button beside the map zoom controls to show only climate colors. The legend counts revealed tiles in each climate. Pan, zoom and select tiles as usual; press Climates again to restore the normal map.

### Extreme climates and fertile soils

Glacial stays snowy in every season, with extensive barren snow, peaks and permanent pack ice. Mines and ordinary marine resource tiles produce only in Summer; Seal grounds produce all year. Glacial borders only Arctic and Alpine.
Hyperarid has 90% land, much of it barren desert or peaks. Salt and minerals offer opportunities, but rare Oases and poor fisheries make food and Wood scarce. It borders only Desert. Monsoon has 30% land: water and peaks separate pockets of forest, clay and rainfed rice. Rice harvests once in Autumn; timber, hunting and clay remain productive through Summer rains. Monsoon borders Tropical, Subtropical and Savanna.
Difficulty comes from geography, resource scarcity and predictable harvest windows. These climates add no upkeep, recurring disaster damage or special AI resources. Isolated colonies use normal transport, trade and construction rules.
Black-soil wheat represents fertile Chernozem grassland and forest-steppe soil, not a separate climate. It occupies 2% of Temperate land and 4% of Steppe land, replacing two points of Golden fields and four points of Steppe plain respectively.

### American regions

Andean highlands have 75% land, with Potato fields, Alpaca pasture, mines, salt, peaks and limited river timber. Their Winter is dry; Andean seas stay open all year. Prairie has 70% land, with Maize fields, Sunflower fields, Bison range and riverside woods. Its ordinary seas freeze in Winter and have a fixed 10% chance of freezing in each of Spring and Autumn. Mesoamerican has 45% land, combining Maize fields, Chinampa gardens, Turkey grounds, Cloud forest, volcanic quarries and warm seas. Summer is rainy.
New Potato fields generate only in Andean terrain. New Maize fields generate only in Prairie and Mesoamerican terrain. Turnips replace Rye in Temperate, Oceanic, Cold and Alpine regions; Oats replace Temperate Maize and Sorghum replaces Subtropical Maize. These regional choices distinguish food economies. Traditional European cultivation does not imply a European botanical origin: crops such as oats and wheat have older roots elsewhere in the Old World.

### Barren terrain, peaks and ice

Snow plains and Desert produce nothing and have no workshop or camp. Armies can cross them and build normally beside them. Frozen sea is generated by Arctic and Glacial water rolls. It produces nothing, admits land units and blocks ships. Permanent towns, towers and roads require adjacent solid ground; no route can be built on an edge bordered only by ice. An ice-water edge without land can hold a sea route. Glacial Frozen sea stays frozen all year. Arctic Frozen sea opens in Summer and refreezes in Autumn. Ordinary Glacial water freezes in Spring, Autumn and Winter and opens in Summer. Other Cold, Alpine, Arctic and Prairie water freezes in Winter, with fixed per-hex chances of also freezing in Spring and Autumn. See Seasons and harvests for trapped units, winter ports and construction rules.
Bare Peaks produce nothing and are impassable to every unit. Units cannot move through them, recruit onto them, retreat onto them or disembark onto them. Roads may follow their edges under the normal connection rules, including an edge between two peaks. Towns and watchtowers need at least one adjacent walkable solid land tile. No camp or workshop can use Bare Peaks.

### Existing campaigns

Revealed tiles retain their assigned climate, dice numbers, camps, workshops, units and stored goods. Current climate-adjusted crop productivity applies on load. Retired Rough fields become Barley in Cold, Alpine and Oceanic climates, or Millet in Steppe and Savanna. Oceanic Barley has baseline 2 and pays 8 Grain in Summer; Oceanic Golden fields keep their Autumn harvest.
Retired Rye fields and prototype Potato fields outside American regions become Turnip fields. Their baseline remains 2 in Temperate/Oceanic climates and 1 in Cold/Alpine climates, with Summer/Autumn payouts of 2/6 or 1/3. Former non-American Maize becomes Oats in Temperate and other cool climates, or Sorghum in warm climates; both retain baseline 2. American Potato and Maize fields keep their identity. No stored harvest is recalculated or awarded during migration.
Saves made before climates existed classify their older tiles as Temperate for future borders. New exploration can use all seventeen climates. Start a new campaign to use the current terrain tables throughout the map.

### Tile numbers and dice

Every productive tile receives a uniform random number from 2 through 12, including 7. Dice are two independent d6, so tile numbers are equally common in generation but not equally likely to activate. Dice, terrain, research and rebellion randomness are saved separately. Reloading does not reroll an offer or the map. Hidden coordinates cannot be inspected by players or AI.

### Ports

Eligible fully revealed coastal edges have a 10% port-candidate chance. Ports require open water beside solid land: frozen sea cannot host a port, but snow plains can. Invalid ice ports from older saves are removed on load. Half are generic 3:1 ports; half are specific 2:1 raw-resource ports, excluding Gold and Oil. Ports cannot share an intersection. A town on either end uses the port, unless under siege or its sea tile is blockaded. In older saves, Gold ports are treated as generic ports.

### Setup restrictions

An extreme map may lack enough legal starting sites. The game rejects a seed with insufficient legal starting sites. During setup a placement cannot make it impossible to finish everyone's two settlements. A missing resource alone does not invalidate a map: the reserve can supply it through trade.

## Seasons and harvests

### Calendar

One complete round is one season. Every surviving faction takes its turn before the next season begins. The sequence is Spring, Summer, Autumn, Winter; four rounds make one year. New campaigns start in a random season, with a 25% chance for each. The same world seed gives the same starting season. Seasons never change halfway through a round.
The calendar beside the round number shows the current season and year. Open it to review the next season and preview landscapes. A preview changes artwork only: movement, production and legal actions still use the current season. Select a tile for its exact open-water or frozen surface and production in all four seasons.

### Dice and harvest windows

A tile produces only when its number is rolled during a productive season. Every matching roll pays, even if that tile has already produced in the same season. There is no once-per-year harvest limit, guaranteed harvest, replacement roll or compensation. Off-season matching rolls produce nothing. Dice remain two independent six-sided dice.
For each resource, the four seasonal amounts add up to four times its current climate-adjusted annual baseline. This preserves that baseline’s annual dice expectation for the same producers and number of rolls; cereal balance updates can change the baseline itself. Timing is less reliable: Golden fields produce 8 Grain per settlement on each matching Summer roll, and zero in the other seasons. If their number never appears that Summer, the harvest is lost.

### Crop types

- Golden fields (wheat): Summer harvest, 8 Grain; Oceanic wheat harvests in Autumn instead.
- Black-soil wheat: Summer harvest, 12 Grain. Rare fertile fields in Temperate and Steppe.
- Barley: 8 Grain in Summer in Oceanic climate; 4 in Summer in Mediterranean climate; 4 in Autumn in Cold and Alpine climates.
- Turnip fields: 2 Grain in Summer and 6 in Autumn in Temperate/Oceanic climates; 1 and 3 in Cold/Alpine climates.
- Potato fields: 2 Grain in Summer and 6 in Autumn in Andean climate.
- Oat fields: 6 Grain in Summer and 2 in Autumn in Temperate climate.
- Sorghum fields: 8 Grain in Autumn in Subtropical climate.
- Millet: Autumn harvest, 4 Grain in Steppe and Savanna.
- Maize: Autumn harvest, 8 Grain in Prairie and Mesoamerican climates.
- Chinampa gardens: 4 Grain in Spring, Summer and Autumn in Mesoamerican climate.
- Tropical rice: 4 Grain in Spring, Summer and Autumn. Subtropical rice: 4 in Summer and Autumn. Monsoon rice: 4 in Autumn only.
- Olive groves: 2 Grain in Autumn and Winter. Oasis food: 4 Grain in Autumn; Oasis Wood remains available year-round.
- Sunflower fields: 4 Oil in Autumn in Prairie climate. Oil replaces Coal at 1:1 and processes into Fuel.
  Unlisted seasons produce zero. These windows require a matching roll; nothing is delivered automatically. Grain is an abstract food card shared by cereals, roots, gardens and Olive groves. Turnips and potatoes represent early and maincrop varieties across the terrain. Their smaller Summer harvest and larger Autumn maincrop improve reliability while preserving their annual baseline. Oats favor Summer, with a smaller late harvest. These are regional game calendars, not universal agricultural dates or measured crop-yield ratios. Rice and Chinampa gardens represent managed systems with several productive windows.

### Livestock and Meat

Cattle pasture produces 1/1/4/2 Meat in Spring/Summer/Autumn/Winter. Goat pasture produces 1/0/2/1 Meat. Reindeer range produces 1 Meat and 1 Hides in every season, including Summer. Cattle range produces 1/0/2/1 of both Meat and Hides from Spring to Winter.
Meat is a raw resource. Recipes still print Grain: pay Grain first, then Fish, then Meat at 1:1 to cover any shortfall. Gold covers any remaining missing raw goods. Explicit trades use the named goods. Meat workshops and advanced city or merchant production make Rations, without consuming the raw harvest.
Pastures continue to produce Wool. In temperate and colder regions, shearing occurs in Spring and Summer; Tropical, Subtropical, Savanna and Desert wool is spread across all four seasons. Livestock has no feeding cost or upkeep. Food and other stored goods never spoil.
Alpaca pasture has annual baseline 1 Wool plus 1 Meat. Wool pays 4 in Spring; Meat pays 1/0/2/1 from Spring to Winter. Bison range has baseline 1 Meat plus 1 Hides, with both resources following 1/0/2/1. Turkey grounds have baseline 2 Meat and pay 1/1/4/2. Their resources use the existing recipes and workshops.

### Other seasonal industries

Wood, hunting, salt production and clay work vary by climate. Cold forests retain a small Winter timber harvest. Warm-climate hunting and logging continue through Summer rains. Jungle and warm woodlands produce 1 each season; Savanna Wildlife grassland gives 2/1/3/2 Hides from Spring to Winter. Tropical Clay gives 1 each season; Subtropical and Monsoon Alluvial clay gives 2/1/2/3. Tropical, Subtropical, Savanna and Mesoamerican Salt flats give 1/0/1/2: evaporation stops during the wet Summer and peaks in the dry Winter. Desert and Hyperarid Salt flats give 1 each season. Seasonal totals follow the current climate-adjusted baseline. Hides and Oil on the same animal tile can have different seasonal outputs; both are collected.
Cloud forest gives 1 Wood plus 1 Hides each season. Volcanic quarry gives 2 Stone each season. Andean river timber follows 1/1/2/0; Andean mines stay productive through the dry Winter. Prairie follows the Cold mining calendar.
Mild-climate mines and quarries remain steady. Cold, Alpine, Arctic and Prairie mines and quarries favor Summer and stop in Winter; Glacial mines produce 4 times their baseline in Summer only. Coal in its listed climates stays available year-round. These reliable goods remain useful when food harvests are uncertain.
Before adjusting for sea ice, Fish and Cod in Temperate, Cold, Arctic, Steppe, Oceanic, Alpine, Prairie and Andean climates produce at 1×/2×/1×/0× their baseline from Spring to Winter. Glacial Fish, Cod and both Whale goods produce 4 times their baseline in Summer only. Warmer-climate fish remains steady all year. Cold, Alpine and Arctic Whales use 1×/2×/1×/0×; warm-climate Whales use 0×/1×/2×/1×. Multiply both Hides and Oil. Seal grounds produce 1 Hides and 1 Oil in every season, including Summer. The generic marine table shows the open-water baseline. A selected tile’s forecast shows its exact yields after sea ice shifts frozen Spring or Autumn output into Summer.

### Production multipliers

Towns multiply each seasonal raw output by their level: 1/2/3/4. Camps multiply it by camp tier: 1/2. Merchants, merchant ships and fishing ships multiply by unit tier. Normal blockades and harvest coverage still apply.
Town levels 3 and 4 and merchant tiers III and IV also add 1× and 2× every seasonal raw component as its processed good. A level-4 town beside Summer Golden fields produces 32 Grain plus 16 Rations per matching roll. A tier-II Bakery adds another 16 Rations. Nothing is deducted from the Grain harvest.
An extension multiplies its linked resource’s seasonal amount by its own tier. A Woods workshop keeps its chosen raw resource, even when the faction changes the tile’s ordinary harvest choice. No seasonal output means no automatic processed output.
Guild contracts are separate paid actions. Their printed inputs and outputs do not change with the season; they can supply goods between dice harvests. Existing stored raw goods can still be refined through Artisans. Starting resources from the second setup settlement use baseline yields, regardless of the starting season.

### Arctic and Glacial snow cover

Arctic land keeps snow in Spring, regains it in Autumn and has deep cover in Winter. Summer is the short Arctic thaw. Glacial land stays snowy in every season. Snow cover does not prevent seal or reindeer hunting: both remain productive on matching rolls all year. Snow on land and sea ice are separate conditions; use the sea surface forecast for movement.

### Sea ice and thaw

Ordinary sea hexes have the following freezing chances in Spring/Autumn: Glacial 100%/100%, Arctic 70%/50%, Alpine 35%/25%, Cold 20%/10%, Prairie 10%/10%. All ordinary sea hexes in these five climates freeze in Winter and open in Summer. This includes Fishing grounds, Cod grounds and Whale grounds; frozen resource tiles display ice and stop all marine production, including both Whale goods. Each hex’s pattern is fixed by the world seed and repeats every year, including after reloads. An Autumn-frozen hex is always frozen in Spring too. These are per-hex chances, not guaranteed proportions of a region; inspect the exact forecast before moving.
Arctic Frozen sea terrain freezes in Spring, Autumn and Winter and opens only in Summer. Glacial Frozen sea terrain is permanent pack ice and stays frozen in all four seasons. Ordinary seas in other climates, including Andean, stay navigable.
Frozen sea tiles produce no marine resources. For each tile and each raw resource, the Spring or Autumn yield removed by ice is added to Summer, preserving the four-season total. For example, a northern Fish tile with an open-water schedule of 1/2/1/0 produces 0/4/0/0 if it freezes in both Spring and Autumn, or 0/3/1/0 if it freezes only in Spring. Each payout still needs a matching dice roll; missed rolls are never reimbursed.
Land units can enter frozen water. Ships can enter open water. Frozen water stops fishing coverage through that hex. A frozen port loses its improved trading rate until open water returns; ordinary reserve trading still works. Ship recruitment and sea expeditions require open water.
Ice never becomes solid land for construction. Towns and towers need permanent solid land; roads need a genuine land side. Existing sea routes remain sea routes. Existing camps and buildings are not destroyed by freezing or thawing. Camps may be built in Winter under their normal connection rules, but only produce in their harvest seasons.

### Units caught by a surface change

A ship caught by freezing becomes icebound. It stays in place with its passengers and cannot act until thaw. Land units may attack an enemy icebound fleet on that frozen hex using normal combat.
Land units caught by thaw stay on a drifting ice floe. They are not killed or teleported. They may step onto adjacent land or frozen water, or board a friendly transport on the same or an adjacent hex, subject to normal capacity and activation rules. They cannot walk across open water. Enemy fleets may attack them normally. A trapped unit can retreat only to terrain its unit type can legally occupy.
Move ships out of freezing regions and bring troops ashore before a surface change. A stranded force with no rescue route may remain trapped until the next suitable season.

### AI and existing saves

AI values durable production by its annual mean, so seasonal spikes do not artificially change strategic strength. Trading uses upcoming harvests and stockpiles; expansion considers complementary crop seasons. The AI also plans winter berths and rescues stranded troops.
Existing campaigns keep their calendar, dice numbers, units and stored goods. Retired Rye and prototype non-American Potato fields become Turnip fields. Non-American Maize becomes Oats in cool climates or Sorghum in warm climates. Climate and annual baseline are preserved; the current crop schedule applies on load. Current climate-adjusted crop baselines apply to existing tiles when loaded; stored harvests are not recalculated. Campaigns saved before partial sea freezing also keep their current sea surfaces until the next season boundary. This grace period survives saving and reloading again, so loading cannot suddenly strand a force. Older saves without a calendar begin Spring at the next full round, preserving the current round. Newly explored land can contain the new crop and livestock types. Seasonal production then applies to old and new tiles alike.

### Artwork preview

Select a season in the calendar to preview its landscape, then pan and inspect the map normally. The badge shows the preview and the season whose rules still apply. Return to current season or press Escape to leave the preview. Any successful game command also restores the current landscape. Production forecasts and movement rules never change during a preview.

## Goods, storage and trade

### Production and storage

There are thirteen raw goods and ten processed goods. On a matching roll, towns receive each adjacent tile’s current seasonal output multiplied by town level. All goods of a multi-resource tile are multiplied. Off-season output is zero. Town levels 3 and 4 also add 1× and 2× every seasonal raw component as its processed good, without an extension. In Summer, a level-4 town beside Golden fields receives 32 Grain plus 16 Rations. The bonus scales with the tile’s yield. Extensions add their own processed output without consuming or reducing the raw harvest. All factions produce on every roll. New buildings and collectors can produce on the next matching roll. See Seasons and harvests for the full calendar.

### Storage destinations

Town output stays in that town. Camps and mobile collectors send goods to the nearest owned town, using hex distance to its adjacent land and oldest town ID to break ties. Future output changes destination when towns change; old stocks stay where they are. Trades and research rewards enter your home store, the oldest surviving town. Raids use the operating army's hex to find their destination.

### Paying costs

All warehouses form one spending pool, even during a siege. Each good is debited proportionally across towns, using whole-card largest remainders and town ID for ties. Stores with 8 and 2 Grain pay a five-Grain cost as 4 and 1. You cannot freely relocate a warehouse, choose a sole paying town or change your home store.

### Food substitutes, Oil and Gold

Grain represents food from cereals, roots, gardens and Olive groves. Sunflower fields supply the same Oil resource as marine animals. Recipes show Grain and Coal. Pay Grain first, then Fish, then Meat to cover missing Grain at 1:1. Pay Coal first, then substitute missing Coal with Oil at 1:1. After these substitutions, each missing raw resource is paid with 1 Gold and each missing processed good with 1 Gold bar. Resources named in the recipe are spent first; Gold and bars explicitly required by a recipe are reserved before covering shortages. This also applies to discounted recipes, guild construction and non-trade guild orders. Gold does not automatically cover processed goods, and bars do not automatically cover raw goods; use reserve trades for those conversions. Explicit player trades, reserve trades, merchant contracts and research exchanges spend exactly the offered goods, without automatic substitution.

### Gold exchange rates

Gold has its own reserve rates: 1 Gold buys 1 raw good; 2 Gold buy 1 processed good. One Gold bar buys 2 raw goods of one type or 1 processed good. These rates need no port. Goldsmiths produce Gold bars. Grain, Fish and Meat all make Rations; Coal and Oil both make Fuel through Artisans. Sunflower-linked extensions make Fuel using the same workshop as Coal. Whale-linked extensions make Leather. Automatic advanced city production also makes Fuel from every harvested Oil.

### Trading

Only trades involving the active player are allowed. All 23 goods can be offered in explicit quantities. No gifts, same-good wash trades, buildings or research cards can be traded. AI offers appear as dismissible prompts. Public stockpiles, upcoming seasonal production, scarcity and each AI's planned needs affect its valuation; bank prices do not fluctuate.

### Reserve and port rates

Default reserve rates: 4 identical raw → 1 different raw; 6 identical raw → 1 processed; 4 identical processed → 1 different processed; 2 identical processed → 1 raw. A generic port improves only raw-to-raw exchange to 3:1. A matching specific port improves it to 2:1. Gold rates take precedence. Any good can be imported even if absent from the map. There is no free raw-to-processed crafting action.

### Occupation and blockades

An enemy armed land unit blocks ordinary town, extension and camp output from its tile. It does not block its own or allied production. Enemy fleets block ordinary Fish and Whale production, including fishing ships harvesting that tile. Land merchants and merchant ships ignore production blockades on covered tiles. Land merchants cannot blockade, protect a town or attack.

### Construction under occupation

Enemy occupation prevents new towns beside it and roads bordering it. Camps only need their linked side clear. Existing roads remain until destroyed. A besieged town cannot upgrade, recruit, build extensions or walls, operate guilds, launch fleets or expeditions, or use a port. Its goods stay spendable and its other unoccupied adjacent tiles still produce.

### Woods harvest choice

Each faction chooses Wood or Hides separately for each Woods tile it harvests. Default: Wood. Select the tile and change the choice during your action phase. The choice applies to all your towns, camps and collectors covering that tile, on subsequent rolls. It does not change opponents’ choices or stored goods. A workshop’s resource is fixed when built; later switches do not change its product or upgrade recipe. Steppe, Seal grounds, Oasis, Alpaca pasture, Bison range and Cloud forest produce both listed goods automatically.

## Construction and upgrades

### Routes and settlements

A new route must connect to your own road, sea route or town. Roads and sea routes connect directly without requiring a coastal town between them. Another faction's town or tower interrupts your junction; allied infrastructure is not yours to build from. A settlement must connect to your network after setup, touch land and obey the one-empty-intersection distance rule. Troops do not found remote settlements.
Any edge touching revealed land is a road, including a coastline. Sea routes occupy edges touching water with no revealed land. Revealing land beside a sea route converts it to a road, preserving ownership and camps. A movable sea-route end has no town or other owned route at its open end. Move at most one such piece per owner turn to another legal connected sea edge, never one built this turn. Closed routes cannot move. Each edge holds only one route.

### Town levels

Level 1 is a Settlement. Level 2 is City I, level 3 City II, level 4 City III. They multiply each matching adjacent tile’s base yield by 1/2/3/4. Levels 3/4 add 1×/2× the base tile yield as processed goods, separately from extensions. Maximum walls and recruitable unit tiers are 1/2/3/4. Cities have 1/2/3 guild slots and allow extension tiers 1/2/3. Upgrades preserve existing stocks, walls and extensions. Pay each upgrade's listed incremental cost.
Recruitment and shipbuilding use the town level at the start of your turn. A new town cannot recruit until your next turn; a town upgraded this turn unlocks its new unit tier next turn. Recruit as many eligible units or ships as you can afford. There is no military upkeep or quantity cap. New units defend and collectors produce immediately, but cannot act until the next owner turn.

### Extensions

A city may build one extension for each adjacent productive tile, at most three. Each is permanently linked to that tile, even if two tiles provide the same raw good. Ordinary water has no slot; Fish supports a Smokehouse and Whales a Tannery. Neighbouring cities can each have an extension on their shared tile.
Build tiers in order. Tier I/II/III yields 1×/2×/3× the linked resource’s base tile yield as processed goods on that tile's number, without spending raw goods. City level limits the maximum tier to level minus one. A level-4 city with a tier-III Forge gains 4 Iron ore and 3 Steel on its ore tile's roll. Enemy occupation blocks both outputs.

### Resource camps

Each owned road can hold one camp on each land side. Choose its linked tile when building. There is no camp limit per tile beyond its physical route sides. Sea routes can hold fisheries on Fish sides and whaling camps on Whale sides. A fishery survives conversion of its parent route into a road.
Every tier-I camp costs one card of each of two raw types, never the good it produces. Tier II has its own equipment cost. Camps multiply the tile’s full base yield by 1/2. A Forest camp gives 2/4 Wood; a Steppe camp gives 1/2 Hides and 1/2 Wool. No operating inputs, upkeep or processed output. Destroying a route destroys all attached camps. An isolated surviving route keeps its camps and production goes to the nearest owned town.

### Settlers and colonization

Settlers and Settler ships each have one tier and zero combat power. Settlers cost the tier-I land Merchant plus a Settlement: 1 Wood, 1 Clay, 2 Wool, 3 Grain and 2 Hides. A Settler ship costs the tier-I Merchant ship plus a Settlement: 3 Wood, 1 Clay, 2 Wool, 1 Grain and 2 Hides. Recruit them at any eligible town; ships require adjacent open water. Settlers move 1 tile per turn, Settler ships 2. New units act next turn.
Select the unit in Forces, choose Found settlement, then select a highlighted corner of its current tile. Founding consumes one unit and creates a level-1 settlement immediately, with empty storage. No road, second resource payment or additional movement point is required, including after spending the last movement point. The new town follows ordinary next-turn recruitment readiness. Settlement spacing still applies: no settlement on an occupied intersection or one edge from another town. At least one adjacent tile must be walkable solid land. Enemy units on any adjacent tile and enemy watchtowers on the site prevent colonization. Allied units may remain nearby. A Settler ship founds on the coast without disembarking.
Land settlers can be carried by transports and must disembark before founding. Settler ships carry no passengers. Neither type harvests resources, provides combat power, blocks production, protects towns or conducts raids alone. Exposed settlers and settler ships are destroyed when their tile enters battle, even when escorted by the winning force. Embarked land settlers follow the normal passenger-loss rules. Settlers do not prevent elimination after the last town is lost. The AI can recruit and move colonists toward reachable, productive sites, prioritizing scarce resources and avoiding hostile positions.

## Armies and battles

### Units and movement

Land combat units have 1/2/3/4 power and casualty points at tiers I/II/III/IV. Recruit a tier directly; units cannot upgrade. Heavy infantry moves 1 tile and doubles power on rugged terrain (mineral hills and mountains, Rough pasture). Light infantry moves 2 and doubles in forests (Woods, Forest, Hunting forest, Jungle, Tropical woods, Olive grove, Oasis). Cavalry moves 3 and doubles on flat terrain (fields, Pasture, Steppe, Salt, Snow plain, Seal grounds, Desert, Frozen sea). Artillery moves 1 and contributes its tier to siege power, without a field terrain bonus.
Units occupy hexes and need no roads. Select any subset of a stack, including deselecting exhausted units or selecting half. A group moves at its slowest member's speed. Track points per unit: splitting or merging never restores them. Land units cannot enter water without transport; fleets cannot enter land. Unrevealed tiles are impassable.
One movement point pays for one tile of movement, an adjacent battle, a siege/raid step or road/tower demolition. You may combine these while every participating unit can pay. A 4-point force can fight three adjacent battles then raid. Moving next to a town never raids it automatically. Enemy hexes block routes: go around or fight each blocking force. Allies allow passage and shared occupation.
Town destruction, loading and unloading require fresh units and end their activation. Extra movement does not undo these operations. Newly recruited units and embarked troops cannot act. Defending on another player's turn does not spend your next turn's movement.

### Resolve a battle

Use the defender's terrain for both sides. Every defending unit on the hex participates; only the attacker's selected force attacks. Remove all participating land merchants on both sides first, even in a tie. Sum each combat unit's tier times its applicable terrain multiplier, never above ×2. Add watchtower support once per force, not per unit. At sea use printed ship power, without terrain multipliers.
There are no battle dice. Only the loser loses combat units. The loss target is the difference in power, capped at the loser's total casualty points. Remove whole units with the smallest achievable total at least as large as that target. The loser chooses among equally small combinations. Terrain bonuses never increase a unit's casualty points. No wounds persist. With units worth 1 and 3 and a target of 2, lose the 3-point unit, not both.
A defeated surviving defender retreats one legal adjacent hex, free of enemies; friendly stacks are allowed. A defeated attacker returns to its approach hex. If a defender has no legal retreat, it stays and the attacker does not occupy the tile. Equal power causes no combat casualties; the defender holds. Land merchants still die. When defenders leave or die, surviving attackers occupy their tile without another movement cost. Win, tie or loss spends the battle point; attackers can use remaining points.

### Collecting with land merchants

Merchants have zero power and speed 1 at every tier. They collect their current tile plus up to their tier in selected neighbouring productive tiles, multiplying each matching tile’s base yield by their tier. They can cover Fish and Whales; Whales give both Hides and Oil. At tiers III/IV, each matching covered tile also gives 1×/2× the base tile yield as processed goods, without consuming the raw harvest. Coverage ignores enemy production blocking. Automatic coverage favours Gold, then dice probability, then coordinate order, and ignores unproductive water.
Change selected neighbours during your action phase or restore automatic coverage. Moving or transport resets the selection; embarked merchants produce nothing. They cannot raid, siege, demolish or guard. All land merchants involved in a battle die even if their escort wins. Inspect a merchant to see and edit its coverage. All output goes to your nearest town.

## Sieges and defenses

### Guarded towns

Before besieging, raiding or destroying a town, remove every defending or allied armed land guard from all land tiles touching its vertex. Fleets, embarked troops and land merchants do not guard towns. Third-party enemies block movement but do not protect the town. The attacking force remains on an adjacent land tile; the map links it to the target.

### How long a siege lasts

Defense D = town level − 1 + wall tier + supporting owned watchtower tiers. Siege power A = participating artillery tiers + the highest Engineer-tools bonus among participants. Required siege-only operations = max(0, D − A). If completed steps already meet this value, raid for 1 movement point; otherwise spend 1 point to add one step. Reaching the threshold with that step enables the raid on a later operation, not the same one.
Each attacker can perform only one siege, raid or destruction operation against a given town per owner turn. No walls or artillery: a settlement is raided on turn 1 and destroyed on turn 2; City I needs siege, raid, destroy; City II needs two siege steps; City III needs three. If artillery already meets the defense, raid immediately without entering a preliminary siege. Raid and destruction can never happen on the same owner turn.
Continue a siege operation every subsequent owner turn and keep at least one armed attacker adjacent. Missing a turn, withdrawing or a defending guard arriving breaks the siege and resets progress and destruction permission. Different attackers never share progress. Artillery changes the requirement at the next operation. After a breach, repeat raids do not need more siege steps even if artillery leaves.

### Raid or destroy

A raid moves every stored good to the raider's nearest town, ready to spend immediately. The initial raid can target an empty warehouse. On later owner turns, raid again if new goods arrived, or destroy the town. An empty repeat raid cannot renew a siege. A later raid does not reset the original destruction permission.
Destruction requires a later owner turn, an adjacent fresh force and no defending guards. It first transfers all remaining warehouse goods, then removes the town, walls, extensions and guilds. Roads and their camps survive unless separately destroyed. No free replacement town or automatic capture. Losing the last town eliminates that faction immediately.

### Walls and watchtowers

Build walls in order: Palisade (1 Wood), Stone Curtain (3 Stone), Bastion (3 Blocks), Citadel Ring (4 Blocks + 2 Steel). Their added siege turns equal the current tier, not the sum of earlier tiers. Maximum wall tier equals town level. Walls add no field combat power.
Towers require an owned road at their intersection when built or upgraded. They may share your town's vertex and have no distance rule between towers. Enemy towns or armed occupation prevent construction. Build I→IV in order: 2 Wood OR 2 Stone; 2 Stone + 1 Iron ore; 2 Stone + 1 Steel; 2 Blocks + 1 Steel. They survive removal of the supporting road.
A tower adds its tier once to an owned armed army or fleet on any touching hex, including zero-power economic ships. It cannot empower a merchant-only land force. It adds its tier in siege defense to an owned town at the same vertex or one edge away. Multiple towers stack. Enemy towers block new towns and route junctions at their vertex.
A tower can itself be sieged after clearing its defending land guards. Its independent defense is floor(tier ÷ 2): 0/1/1/2. Subtract artillery and Engineer support. If completed steps meet the remainder, destroy it immediately; otherwise add one siege step. Each operation costs 1 movement point, at most once per tower per attacker turn. Towers have no warehouse, raid or post-raid delay. Other towers and the city do not protect their siege value. Their bonuses remain until destroyed. Siege continuity follows town rules.

### Roads and siege reports

An armed land force can destroy a road bordering its hex for 1 movement point. Clear the owner's or allies' guards on either land side first. All attached camps disappear. You may demolish your own road this way, with no refund. Fleets use the equivalent action for sea routes, after clearing defending fleets on either water side.
Click a siege badge, town, tower or dashed link for defenses, progress, attacking composition, siege equipment, last operation and goods at risk. Every town inspector also shows its total resistance even before an attack.

## Fleets and sea harvests

### Routes are not fleets

A sea route is an edge piece that extends your settlement network. A mobile ship occupies a water hex, moves and fights. Neither substitutes for the other. Build mobile ships beside a coastal town, without needing a printed port, on a revealed water hex without enemies. Town level at the start of the turn gates ship tier. No limit on hulls per order, town, turn or fleet, provided you pay. Ships cannot upgrade.
Transports are fast carriers; convoys carry more units but move more slowly. The ship tables list combat power, movement and capacity for every class. Each ship class has four tiers. Fleets move at the slowest participating ship's speed. Combat follows whole-piece losses and retreats, using each hull's listed power/casualty points. Passengers add no naval power. Surviving ships keep full power and berths.

### Fishing and merchant ships

Fishing ships collect Fish, Cod and Whales from their own tile and connected water within 1/2/3/4 steps at tiers I/II/III/IV. Count the shortest water route, not straight-line distance: land and ice cannot be crossed, and unrevealed tiles are outside coverage. Merchant ships collect from all adjacent land tiles, including enemy-occupied or rival-used land, but never Fish or Whales. Each matching tile’s current seasonal yield is multiplied by ship tier. The seasonal calendar applies separately to each raw good, including both Whale Hides and Oil. Tier-III/IV merchant ships also add 1×/2× the seasonal tile yield as processed goods on each matching covered tile, without consuming raw output. Fishing ships do not produce processed goods. Output goes directly to the nearest owned town. Collectors can produce immediately after construction. There is no collector limit per tile or cargo capacity for goods.
Both economic ship types have 0/1/2/3 power at tiers I/II/III/IV and no passenger berths. Unarmed ships in a defeated fleet are lost automatically. Higher tiers follow normal whole-ship casualty calculations. Production coverage and economic ships are visible when inspecting fleets.

### Transport troops

Load or unload across a shared land-water edge, with no port required. Every participating ship and passenger must be fresh. Loading and unloading end their activation. One berth holds one unit of any tier, including a merchant. Embarked troops cannot produce, guard or act separately. Land on a clear or allied beach, never directly assault an enemy-occupied tile. Unloaded troops can attack on a later owner turn.

### Loss of a carrier

If a carrier sinks, move passengers into spare berths on friendly surviving participating ships on that water hex. Any without a berth die. There is no goods cargo system. A fleet cannot raid or destroy a town from offshore, and cannot cut a land road.

### Shore bombardment

Land artillery can attack an adjacent enemy fleet. Only the selected artillery participates, at twice its tier in combat power, plus its normal tower support. The fleet returns fire with ordinary naval power and its tower support. Spend 1 movement point, including after movement if points remain. Use normal power-difference losses and whole-unit rounding. Artillery stays on land; defeated ships retreat if possible or remain trapped. You can bombard again with another point. This lets land forces deal with fleets in isolated lakes.

## Research cards

### Purchase and play

Each of four tiers has eight different cards. Pay to see two distinct random cards from that tier and keep one. All pairs are equally likely; previous purchases and choices do not affect the next draw. No deck depletion, discard pile or reroll. An unresolved offer survives save/load.

### Tier requirements and costs

Tier I needs a settlement and costs 1 Grain + 1 Wool + 1 Iron ore. Tier II needs an unbesieged City I and costs 1 Stone + 1 Salt + 1 Cloth. Tier III needs City II and costs 2 Pottery + 1 Rations + 1 Fuel. Tier IV needs City III and costs 2 Cloth + 2 Chemicals + 2 Fuel. Buy and play any number per turn; finish a pending choice before buying another.
Cards can be played immediately after selection, including Scholar discoveries. Play held cards before rolling or during your action phase whenever legal. No off-turn reactions, resale, trading or hand limit. Rivals can see hand counts, purchases and played effects, but not hidden card identities. A pending discovery counts as one held card.

### Grants, discounts and movement

The tables below list each card’s exact effect. Free placements expire at turn end and still obey city tier, placement, occupation, readiness and sequential-upgrade rules. New recruits cannot act this turn. Commissions cover their printed ship tier only. Local Levy excludes artillery and merchants; other unrestricted unit commissions include merchants.
Free routes and recruits accumulate; separate ship grants retain their tiers. Upgrade discounts queue, with the oldest matching one used first. They do not combine on one upgrade and unused allowances produce no refund or stored goods. The normal one-expedition-per-turn and one-operation-per-target limits still apply.

### Movement and siege effects

Movement bonuses add and can affect forces that have already used all their normal points, but never undo an activation-ending action, ready new recruits, permit passage through enemies or enable stationary destruction after moving. Siege Engineers adds three steps before a legal siege operation. Campaign Orders can also add two steps with a separate adjacent fresh army; the same unit cannot receive both parts. No siege progress can be added to a town already operated against or raided this turn. Guards must still be cleared, and the raid-to-destruction delay remains.

## City guilds

### Slots and tiers

City I/II/III has 1/2/3 slots for different guild types and supports guild tiers I/II/III. Build every tier in order. Tier-I guilds use raw goods; tier II uses raw and processed goods; tier III uses processed goods only. The catalogue shows all construction prices and each tier's contract. Different cities can repeat the same specialization.

### Contract timing

A newly built or upgraded tier opens next owner turn. Each unlocked tier has its own one-order-per-owner-turn allowance. A tier-III guild may use all three contracts in any order, with different targets. No upkeep. Orders draw from the faction pool and deliver output to that guild's city, without reducing ordinary production. Sieged cities cannot build, upgrade, dissolve or use guilds.

### Standing orders and removal

Economic guilds except Scholars may save a separate standing recipe for each tier. After your dice roll, cities in founding order try tier I→III once each. Unaffordable or blocked recipes wait while other valid orders can run. No borrowing or automatic bank imports. Pause or edit each tier separately. Dissolving refunds nothing; a replacement starts at I and opens next turn. Guilds disappear with a destroyed city, transfer in a rebellion and add six public power points per tier. Rebel standing orders are paused.

### Local production and trade

The catalogue includes the increased outputs of all five economic guilds: Prospectors, Farmers, Extractors, Artisans and Merchants. Tiers I/II produce 50% more than their original contracts, rounded up to whole goods; tier III produces twice as much. Input costs are unchanged. Each unlocked tier keeps its separate contract.
Prospectors require an adjacent clear Stone, Coal, Iron ore, Salt or Gold deposit. Gold yields 3/5/16 instead of the ordinary mineral quantities of 6/9/32. Farmers require adjacent clear Grain or Wool land, never Hides, Fish or Whales. Extractors require adjacent clear Wood or Clay. Their number does not matter for orders; their normal dice output continues. Without a suitable deposit that specialization cannot work.

### Conversion and exchange

Artisans convert the selected raw to its normal processed partner without an extension. Grain or Fish makes Rations, Coal or Oil makes Fuel, Gold makes Gold bars. Pay the selected raw inputs plus listed supporting inputs; where these coincide, the quantities add. Merchant contracts use the exact selected goods and their stated batch rates, independently of ports and normal bank rates.

### Army and fleet services

Commanders and Navigators supply entire selected eligible formations beside the guild city, regardless of size. The bonus follows each unit through splits and merges; each unit can receive that guild service once per owner turn. They add movement, not battle power. New or embarked units and units whose activation ended are ineligible. Navigator movement recovery does not skip transport readiness rules. Consult the tier contract for the exact bonus and range.

### Engineer equipment

Engineers equip every eligible combat unit in one adjacent army. Its siege bonus is the highest equipped unit's bonus, not a sum: +2/+4/+6 by contract tier. Splitting retains equipment, merging does not multiply it. Each unit receives tools once per owner turn, separately from Commander supplies. Tools expire at the start of the next owner turn. They affect city and tower sieges, never battles; new and embarked units are ineligible.
Builders grant 2/3/6 free route segments this turn, with normal connections and blocking; no free settlements or camps. Scholars provide a choice of two ordinary random cards at research tier II/III/IV, playable immediately. They are manual only; finish a pending discovery before another order. Higher guild tiers retain each lower tier's separate contract.

## Expeditions and returning factions

### Launch an expedition

At the map boundary, use your road or sea-route endpoint, town, established land unit (including merchants) or mobile ship. A unit needs no network connection and may launch after moving or acting, at no movement cost, without moving or consuming the unit. New recruits must wait; embarked troops cannot launch separately. Select an outward-facing frontier corner.
A land launch needs adjoining revealed land; a sea launch needs adjoining water. It must touch unknown space, no hostile launch tile and no besieged town. Choose direction and preview coordinates, never hidden terrain. Expedition tiers reveal exactly 10/20/40 connected new tiles. Costs, not city tiers, gate access. One expedition per player per turn, including research grants.
The footprint grows outward from the launch, skipping known coordinates. A trapped unknown pocket too small for the chosen tier is invalid and costs nothing. Reveal immediately and publicly; troops may move into reachable new tiles later this turn. Climate-based generation applies whatever the launch mode. Previously revealed terrain and yields never change. Reveals grant no town, routes, resources or ownership and never guarantee a missing good.
Only the strongest living AI faction is forbidden to fund or use research-funded expeditions, even if cornered. AI ranking excludes humans and breaks ties by faction ID. Every other AI may explore, particularly with useful frontier space, shortages or blocked expansion. Human players keep normal access.

### Return during exploration

Whenever someone expands the map, each eliminated base faction has a 10% return chance. A returning faction receives one to three legal new settlements and one to three troops in the newly revealed area, subject to space. The new warehouses start empty. The game never forces an illegal placement or replaces occupied territory. Returns restore original faction identities, not new extra factions. They rejoin normal turn order without an immediate bonus turn.

### Rebellions

A rebellion is checked only at the affected faction's own turn start, only while an eliminated base AI faction is available. The strongest living AI has 10% risk; the second AI has 5%. For humans ranked among all survivors, first has 8%, second 4%. One-town factions are exempt without passing the chance down. No cooldown; restored factions can later suffer rebellion themselves. Finished games stay finished.

### Rebel territory

Restore a randomly chosen eliminated AI faction. An AI victim loses a random 25–45% share, a human 15–35%, each whole percentage equally likely. A random town anchors one or more compact regions, with nearby assets favoured and some variation. Transfer whole towns with walls, extensions, guilds and colocated towers; at least one defects and one stays loyal. Routes transfer with camps. Attachments can make exact shares differ.

### Transferred assets

Transfer the rounded share of each stored good and held research cards, conserving totals. Preserve stores in place where possible and adjust only the difference. Troops and ships follow the region proportionally; carriers and passengers stay together. Divided stacks use a reachable safe tile of the right terrain or remain loyal if none exists. Readiness is preserved so defectors gain no early action. Temporary research grants stay loyal; affected sieges clear. Rebels return to their original seat, with no bonus turn, and no inherited alliance. Announcements show the share and location.

## Alliances and AI

### Emergency coalition

If one faction holds more than 40% of total surviving faction power, all other surviving factions immediately form one coalition against it. This includes human factions. It replaces existing alliances and ignores distance, the four-member limit and normal commitment timers. Power uses the same town, army and production score shown in Faction power.

The target stays fixed until its share falls to 20% or less, or it is eliminated. Members cannot leave, attack each other, or make other alliances while locked. Returning factions join automatically. When unlocked, members may leave immediately; the alliance and war do not end automatically. A new faction exceeding 40% can trigger another emergency.

AI members commit their available combat forces to the target, keeping only guards against immediate border threats. They prioritize raids, production denial, transport landings and useful expeditions around blocked fronts. Deployment orders persist across moves and saved games. Mobile troops continue after slower escorts exhaust their movement. Reinforcements spread among exposed fronts, while inland armies and transports meet at a shared coastal pickup. Armed fishing and merchant ships can also join the offensive; unarmed civilian units keep their economic roles. Even the strongest AI may launch expeditions while in this coalition. Battles still use each faction’s own troops and normal combat rules. No resources or troops are granted. The rule applies to existing saves when loaded; an unresolved battle finishes first.

### Forming an alliance

AI may propose survival alliances of two to four nearby factions. Humans can accept or decline but cannot initiate them. Each faction belongs to at most one alliance. The strongest living individual faction cannot join or form one, whether human or AI; exact power ties use faction ID. An alliance never wins jointly.
Members must connect through partners whose towns lie within six hexes. AI needs a common non-allied enemy within nine hexes of each member, stronger than each by at least 20% plus six power. Proposed combined strength cannot exceed 150% of that threat. An existing alliance stops recruiting at 120%. Minor differences do not justify a pact.
Two nearby two-member alliances may merge against a qualifying common enemy, respecting the four-member cap, the 150% limit and the 120% limit for each existing pact. Every human on both sides must approve; one rejection preserves both pacts. Approval survives save/load. Ownership never changes in a merger.

### Commitment and departure

A new pact locks for five full rounds. Adding a member does not restart the lock; merging keeps the later existing deadline, never a new five-round timer. An expired merged pact stays unlocked. Becoming strongest does not override the lock but prevents recruitment. After expiry, any member may leave during its action phase. A pact remains if at least two members stay. Elimination removes a member immediately; revival restores no alliance.
AI leaves an unlocked pact if partners are too distant, the strongest faction is inside it, no nearby common enemy remains at least 15% plus four power stronger than every member, or combined alliance power exceeds 150% of the strongest qualifying threat. No extra random delay. Departing partners observe a five-owner-turn contact pause before invitations or reunions, including via mergers. Invitations to the same recipient also have a five-turn pause.

### Fighting and sharing space

Allies cannot attack, bombard, siege, raid or destroy one another's property. They may share tiles, pass through one another and land on allied beaches. They do not block production. Allied land guards protect nearby allied towns, towers and routes. Infrastructure, costs and commands remain separate; allied routes do not extend your building network.

### Combined defense

Co-located allied defenders combine terrain-adjusted power. Each represented owner's towers add once. Only the active player's selected units attack. Combined defenders take normal whole-unit losses; a human defender chooses if present, otherwise the lowest-ID defender. Survivors retreat together to a tile safe for all. Neighbouring allied armies do not join automatically.
Leaving while sharing a tile neither teleports nor kills anyone. Former allies become hostile immediately and may withdraw or fight in place for 1 movement point. It does not allow crossing new hostile stacks. The faction view shows members, combined public power, lock time and the leave action.

### AI priorities

The AI pursues sole victory, using public power, income, military reach and terrain. It protects exposed towns, expands toward useful resources, builds industry, buys tools when useful and seeks winning battles or raids. It ranks raid targets by exposed stocks, production, siege delay and the owner’s strength. It leaves small siege or blockade detachments while surplus troops continue attacking. Nearby forces reinforce defensible towns; a garrison that cannot match an overwhelming leader may keep a delaying guard and send counter-raiders. Offensive investment increases through the middle and late game. Advanced collectors are valuable naval raid targets. Armies with no viable land assault can leave a blockade to reach transports or a usable frontier. Transports can bypass blocked land routes, and eligible factions can fund border expeditions to seek new approaches. Eligible AI considers expeditions from its third or fourth turn, checking every turn when production gaps, confinement or a large power deficit justify them. It values frontiers by visible climates and expected missing-resource yields, with Fish and Meat counted as Grain and Oil as Coal. It compares reveal directions to approach nearby enemies, can build toward a useful frontier, and may fund exploration before adding more reserve troops once it has a basic field army. Immediate town defense retains priority. It does not inspect hidden terrain or reserved climates. The strongest AI remains barred from expeditions. Artillery can attack fleets. Easy, Standard and Hard change planning breadth, not costs, dice or free resources.
Pressure against a leader begins beyond a 25% or six-point lead, whichever is larger, and rises sharply toward maximum at 1.8 times the runner-up. This applies equally to human and AI leaders. Smaller factions favour the leader's exposed income and towns, support useful neighbours with favourable trades and reduce attacks on other small factions. They avoid hopeless frontal attacks because winners suffer no military losses. Priorities shift as power changes, subject to alliance locks.

### Public power and difficulty

Public power is an estimate of economic and military capacity, not a victory score or direct army strength. Inspect the faction panel for its components. Speed settings change the delay between AI actions; they do not change difficulty or rules.

## Controls and saving

### Finding actions

Drag the map to pan and use the wheel to zoom. Click a tile, route, town, tower, army or fleet to inspect it. Build and recruitment panels show legal targets and costs. Select troops individually or use Select half; exhausted units can be deselected to leave only mobile units. Inspect enemy formations and cities to see composition, extensions, guilds and stored goods. The faction panel shows power and research counts.
Keyboard shortcuts: B Build, F Forces, T Trade, R Research, E Explore, Escape to close a panel. Controls remain available as buttons. In the resource bar, Fish sits above Oil. Bank trade offers list your most abundant goods first. Dice reports show each faction's harvest. Siege and raid notifications link to the affected town.

### Save, language and local play

The game autosaves in this browser for this website address. Use Export save for a portable backup and Import save to continue elsewhere. Changing browser, host or port uses a different local store. Export before clearing browser data or replacing a campaign. The game supports single-player AI opponents and local hotseat, not online multiplayer.
Choose English or Français in the main menu or campaign settings. Language changes only presentation, never your map, random streams or save rules. This guide has the same two languages. Use search for a term, the catalogue for exact prices and the examples to understand production and sieges. You can print the full guide or save it as PDF from the browser.
Use Show climates in the map controls to color climate regions. Tile inspection shows climate, terrain family and full base yield.

### Seasonal calendar

Click the season beside the round number for the yearly calendar and read-only landscape previews. Select a tile to see its exact yields and open-water or frozen surface in all four seasons. The map’s resource labels show current seasonal quantities; zero means the tile is out of season, not that it has lost its resource.

## Climate tables

### Temperate: 50% land / 50% water

Compatible : Steppe, Mediterranean, Cold, Tropical, Oceanic, Alpine, Subtropical, Prairie

Initial climate weight : 1

Transition weights : Steppe ×1, Mediterranean ×1, Cold ×1.5, Tropical ×1, Oceanic ×0.5, Alpine ×0.5, Subtropical ×0.5, Prairie ×0.75

| Land terrain     | Conditional chance | Annual baseline       |
| ---------------- | ------------------ | --------------------- |
| Golden fields    | 7%                 | 2 Grain               |
| Black-soil wheat | 2%                 | 3 Grain               |
| Oat fields       | 4%                 | 2 Grain               |
| Turnip fields    | 4%                 | 2 Grain               |
| Pasture          | 9%                 | 2 Wool                |
| Cattle pasture   | 8%                 | 2 Meat                |
| Woods            | 17%                | 1 Wood OR 1 Hides     |
| Gold mountains   | 5%                 | 1 Gold                |
| Clay hills       | 12%                | 1 Clay                |
| Stone quarry     | 10%                | 1 Stone               |
| Iron mountains   | 10%                | 1 Iron ore            |
| Coal hills       | 10%                | 1 Coal                |
| Salt flats       | 2%                 | 1 Salt                |
| Water terrain    | Sequential check   | Effective water share |
| ---              | ---                | ---                   |
| Fishing grounds  | 15%                | 15%                   |
| Whale grounds    | 5%                 | 4.25%                 |
| Water            |                    | 80.75%                |

Open water (no adjacent land): Whale check 10%; effective share 8.5%. Table above: coastal water.

### Cold: 55% land / 45% water

Compatible : Temperate, Steppe, Arctic, Oceanic, Alpine, Prairie

Initial climate weight : 1

Transition weights : Temperate ×1, Steppe ×1, Arctic ×2, Oceanic ×0.5, Alpine ×0.5, Prairie ×0.75

| Land terrain    | Conditional chance | Annual baseline       |
| --------------- | ------------------ | --------------------- |
| Forest          | 30%                | 2 Wood                |
| Hunting forest  | 6%                 | 2 Hides               |
| Reindeer range  | 4%                 | 1 Meat + 1 Hides      |
| Barley fields   | 7%                 | 1 Grain               |
| Turnip fields   | 3%                 | 1 Grain               |
| Rough pasture   | 5%                 | 1 Wool                |
| Gold mountains  | 5%                 | 1 Gold                |
| Coal hills      | 10%                | 1 Coal                |
| Iron mountains  | 10%                | 1 Iron ore            |
| Stone quarry    | 10%                | 1 Stone               |
| Clay hills      | 10%                | 1 Clay                |
| Water terrain   | Sequential check   | Effective water share |
| ---             | ---                | ---                   |
| Fishing grounds | 20%                | 20%                   |
| Cod grounds     | 10%                | 8%                    |
| Whale grounds   | 10%                | 7.2%                  |
| Water           |                    | 64.8%                 |

Open water (no adjacent land): Whale check 20%; effective share 14.4%. Table above: coastal water.

### Arctic: 40% land / 60% water

Compatible : Cold, Alpine, Glacial

Initial climate weight : 1

Transition weights : Cold ×1, Alpine ×0.5, Glacial ×0.5

| Land terrain          | Conditional chance | Annual baseline       |
| --------------------- | ------------------ | --------------------- |
| Snow plain            | 35%                | 0                     |
| Reindeer range        | 5%                 | 1 Meat + 1 Hides      |
| Seal hunting grounds  | 15%                | 1 Hides + 1 Oil       |
| Arctic iron mountains | 20%                | 1 Iron ore            |
| Arctic stone ridge    | 15%                | 1 Stone               |
| Arctic gold mountains | 10%                | 1 Gold                |
| Water terrain         | Sequential check   | Effective water share |
| ---                   | ---                | ---                   |
| Frozen sea            | 30%                | 30%                   |
| Fishing grounds       | 20%                | 14%                   |
| Cod grounds           | 20%                | 11.2%                 |
| Whale grounds         | 20%                | 8.96%                 |
| Water                 |                    | 35.84%                |

Open water (no adjacent land): Whale check 40%; effective share 17.92%. Table above: coastal water.

### Steppe: 65% land / 35% water

Compatible : Cold, Temperate, Mediterranean, Desert, Alpine, Savanna, Andean, Prairie

Initial climate weight : 1

Transition weights : Cold ×1.5, Temperate ×1, Mediterranean ×1, Desert ×1, Alpine ×0.5, Savanna ×0.5, Andean ×0.75, Prairie ×0.75

| Land terrain     | Conditional chance | Annual baseline       |
| ---------------- | ------------------ | --------------------- |
| Steppe plain     | 25%                | 1 Hides + 1 Wool      |
| Black-soil wheat | 4%                 | 3 Grain               |
| Cattle range     | 16%                | 1 Meat + 1 Hides      |
| Millet fields    | 10%                | 1 Grain               |
| Pasture          | 10%                | 2 Wool                |
| Woods            | 7%                 | 1 Wood OR 1 Hides     |
| Stone quarry     | 10%                | 1 Stone               |
| Iron mountains   | 5%                 | 1 Iron ore            |
| Coal hills       | 5%                 | 1 Coal                |
| Clay hills       | 5%                 | 1 Clay                |
| Gold mountains   | 3%                 | 1 Gold                |
| Water terrain    | Sequential check   | Effective water share |
| ---              | ---                | ---                   |
| Fishing grounds  | 15%                | 15%                   |
| Whale grounds    | 5%                 | 4.25%                 |
| Water            |                    | 80.75%                |

Open water (no adjacent land): Whale check 10%; effective share 8.5%. Table above: coastal water.

### Mediterranean: 40% land / 60% water

Compatible : Temperate, Steppe, Desert, Oceanic, Subtropical

Initial climate weight : 1

Transition weights : Temperate ×1, Steppe ×0.5, Desert ×0.5, Oceanic ×0.5, Subtropical ×0.5

| Land terrain    | Conditional chance | Annual baseline       |
| --------------- | ------------------ | --------------------- |
| Golden fields   | 3%                 | 2 Grain               |
| Barley fields   | 2%                 | 1 Grain               |
| Olive grove     | 20%                | 1 Grain               |
| Escarpment      | 20%                | 1 Stone               |
| Woods           | 5%                 | 1 Wood OR 1 Hides     |
| Rough pasture   | 10%                | 1 Wool                |
| Goat pasture    | 5%                 | 1 Meat                |
| Salt flats      | 5%                 | 1 Salt                |
| Gold mountains  | 7%                 | 1 Gold                |
| Coal hills      | 10%                | 1 Coal                |
| Iron mountains  | 13%                | 1 Iron ore            |
| Water terrain   | Sequential check   | Effective water share |
| ---             | ---                | ---                   |
| Fishing grounds | 15%                | 15%                   |
| Whale grounds   | 5%                 | 4.25%                 |
| Water           |                    | 80.75%                |

Open water (no adjacent land): Whale check 10%; effective share 8.5%. Table above: coastal water.

### Tropical: 50% land / 50% water

Compatible : Temperate, Desert, Subtropical, Savanna, Monsoon, Mesoamerican

Initial climate weight : 1

Transition weights : Temperate ×1, Desert ×2, Subtropical ×0.5, Savanna ×0.5, Monsoon ×0.5, Mesoamerican ×0.75

| Land terrain    | Conditional chance | Annual baseline       |
| --------------- | ------------------ | --------------------- |
| Jungle          | 25%                | 1 Hides               |
| Tropical woods  | 10%                | 1 Wood                |
| Rice field      | 25%                | 3 Grain               |
| Clay hills      | 15%                | 1 Clay                |
| Gold mountains  | 5%                 | 1 Gold                |
| Stone quarry    | 5%                 | 1 Stone               |
| Coal hills      | 5%                 | 1 Coal                |
| Iron mountains  | 5%                 | 1 Iron ore            |
| Salt flats      | 5%                 | 1 Salt                |
| Water terrain   | Sequential check   | Effective water share |
| ---             | ---                | ---                   |
| Fishing grounds | 10%                | 10%                   |
| Whale grounds   | 5%                 | 4.5%                  |
| Water           |                    | 85.5%                 |

Open water (no adjacent land): Whale check 10%; effective share 9%. Table above: coastal water.

### Desert: 50% land / 50% water

Compatible : Tropical, Mediterranean, Steppe, Savanna, Hyperarid, Andean, Prairie

Initial climate weight : 1

Transition weights : Tropical ×2, Mediterranean ×1, Steppe ×1, Savanna ×0.5, Hyperarid ×0.5, Andean ×0.75, Prairie ×0.75

| Land terrain    | Conditional chance | Annual baseline       |
| --------------- | ------------------ | --------------------- |
| Desert          | 25%                | 0                     |
| Goat pasture    | 5%                 | 1 Meat                |
| Gold mountains  | 10%                | 1 Gold                |
| Iron mountains  | 12%                | 1 Iron ore            |
| Stone quarry    | 12%                | 1 Stone               |
| Coal hills      | 6%                 | 1 Coal                |
| Oasis           | 10%                | 1 Wood + 1 Grain      |
| Salt flats      | 20%                | 1 Salt                |
| Water terrain   | Sequential check   | Effective water share |
| ---             | ---                | ---                   |
| Fishing grounds | 8%                 | 8%                    |
| Whale grounds   | 3%                 | 2.76%                 |
| Water           |                    | 89.24%                |

Open water (no adjacent land): Whale check 6%; effective share 5.52%. Table above: coastal water.

### Oceanic: 35% land / 65% water

Compatible : Temperate, Cold, Mediterranean

Initial climate weight : 1

Transition weights : Temperate ×2, Cold ×1, Mediterranean ×1

| Land terrain    | Conditional chance | Annual baseline       |
| --------------- | ------------------ | --------------------- |
| Coastal pasture | 17%                | 2 Wool                |
| Cattle pasture  | 8%                 | 2 Meat                |
| Woods           | 20%                | 1 Wood OR 1 Hides     |
| Barley fields   | 8%                 | 2 Grain               |
| Turnip fields   | 2%                 | 2 Grain               |
| Golden fields   | 5%                 | 2 Grain               |
| Clay hills      | 10%                | 1 Clay                |
| Coastal cliffs  | 15%                | 1 Stone               |
| Coal hills      | 8%                 | 1 Coal                |
| Iron mountains  | 5%                 | 1 Iron ore            |
| Gold mountains  | 2%                 | 1 Gold                |
| Water terrain   | Sequential check   | Effective water share |
| ---             | ---                | ---                   |
| Fishing grounds | 20%                | 20%                   |
| Cod grounds     | 10%                | 8%                    |
| Whale grounds   | 10%                | 7.2%                  |
| Water           |                    | 64.8%                 |

Open water (no adjacent land): Whale check 20%; effective share 14.4%. Table above: coastal water.

### Alpine: 75% land / 25% water

Compatible : Cold, Arctic, Temperate, Steppe, Glacial, Andean

Initial climate weight : 1

Transition weights : Cold ×2, Arctic ×2, Temperate ×1, Steppe ×1, Glacial ×0.5, Andean ×0.75

| Land terrain    | Conditional chance | Annual baseline       |
| --------------- | ------------------ | --------------------- |
| Mountain quarry | 20%                | 2 Stone               |
| Iron mountains  | 15%                | 1 Iron ore            |
| Coal hills      | 10%                | 1 Coal                |
| Alpine pasture  | 10%                | 1 Wool                |
| Goat pasture    | 5%                 | 1 Meat                |
| Barley fields   | 7%                 | 1 Grain               |
| Turnip fields   | 3%                 | 1 Grain               |
| Forest          | 10%                | 2 Wood                |
| Gold mountains  | 5%                 | 1 Gold                |
| Clay hills      | 5%                 | 1 Clay                |
| Bare Peaks      | 10%                | 0                     |
| Water terrain   | Sequential check   | Effective water share |
| ---             | ---                | ---                   |
| Fishing grounds | 10%                | 10%                   |
| Cod grounds     | 10%                | 9%                    |
| Whale grounds   | 3%                 | 2.43%                 |
| Water           |                    | 78.57%                |

Open water (no adjacent land): Whale check 6%; effective share 4.86%. Table above: coastal water.

### Subtropical: 55% land / 45% water

Compatible : Tropical, Temperate, Mediterranean, Savanna, Monsoon, Andean, Mesoamerican

Initial climate weight : 1

Transition weights : Tropical ×2, Temperate ×1, Mediterranean ×1, Savanna ×1, Monsoon ×0.5, Andean ×0.75, Mesoamerican ×0.75

| Land terrain        | Conditional chance | Annual baseline       |
| ------------------- | ------------------ | --------------------- |
| Alluvial clay banks | 25%                | 2 Clay                |
| Rice field          | 15%                | 2 Grain               |
| Sorghum fields      | 5%                 | 2 Grain               |
| River woods         | 15%                | 1 Wood                |
| Cattle pasture      | 5%                 | 2 Meat                |
| Jungle              | 10%                | 1 Hides               |
| Stone quarry        | 10%                | 1 Stone               |
| Coal hills          | 5%                 | 1 Coal                |
| Iron mountains      | 5%                 | 1 Iron ore            |
| Salt flats          | 3%                 | 1 Salt                |
| Gold mountains      | 2%                 | 1 Gold                |
| Water terrain       | Sequential check   | Effective water share |
| ---                 | ---                | ---                   |
| Fishing grounds     | 15%                | 15%                   |
| Whale grounds       | 3%                 | 2.55%                 |
| Water               |                    | 82.45%                |

Open water (no adjacent land): Whale check 6%; effective share 5.1%. Table above: coastal water.

### Savanna: 70% land / 30% water

Compatible : Tropical, Desert, Steppe, Subtropical, Monsoon, Mesoamerican

Initial climate weight : 1

Transition weights : Tropical ×2, Desert ×1, Steppe ×1, Subtropical ×1, Monsoon ×0.5, Mesoamerican ×0.75

| Land terrain       | Conditional chance | Annual baseline       |
| ------------------ | ------------------ | --------------------- |
| Wildlife grassland | 30%                | 2 Hides               |
| Cattle range       | 5%                 | 1 Meat + 1 Hides      |
| Millet fields      | 20%                | 1 Grain               |
| Dry woodland       | 10%                | 1 Wood                |
| Rough pasture      | 10%                | 1 Wool                |
| Iron mountains     | 10%                | 1 Iron ore            |
| Clay hills         | 5%                 | 1 Clay                |
| Stone quarry       | 5%                 | 1 Stone               |
| Gold mountains     | 3%                 | 1 Gold                |
| Salt flats         | 2%                 | 1 Salt                |
| Water terrain      | Sequential check   | Effective water share |
| ---                | ---                | ---                   |
| Fishing grounds    | 10%                | 10%                   |
| Whale grounds      | 3%                 | 2.7%                  |
| Water              |                    | 87.3%                 |

Open water (no adjacent land): Whale check 6%; effective share 5.4%. Table above: coastal water.

### Glacial: 45% land / 55% water

Compatible : Arctic, Alpine

Initial climate weight : 0.35

Transition weights : Arctic ×2, Alpine ×1

| Land terrain          | Conditional chance | Annual baseline       |
| --------------------- | ------------------ | --------------------- |
| Snow plain            | 55%                | 0                     |
| Bare Peaks            | 15%                | 0                     |
| Seal hunting grounds  | 8%                 | 1 Hides + 1 Oil       |
| Arctic iron mountains | 10%                | 1 Iron ore            |
| Arctic stone ridge    | 8%                 | 1 Stone               |
| Arctic gold mountains | 4%                 | 1 Gold                |
| Water terrain         | Sequential check   | Effective water share |
| ---                   | ---                | ---                   |
| Frozen sea            | 55%                | 55%                   |
| Fishing grounds       | 10%                | 4.5%                  |
| Cod grounds           | 15%                | 6.075%                |
| Whale grounds         | 12%                | 4.131%                |
| Water                 |                    | 30.294%               |

Open water (no adjacent land): Whale check 24%; effective share 8.262%. Table above: coastal water.

### Hyperarid: 90% land / 10% water

Compatible : Desert

Initial climate weight : 0.35

Transition weights : Desert ×2

| Land terrain    | Conditional chance | Annual baseline       |
| --------------- | ------------------ | --------------------- |
| Desert          | 55%                | 0                     |
| Bare Peaks      | 5%                 | 0                     |
| Salt flats      | 12%                | 1 Salt                |
| Iron mountains  | 10%                | 1 Iron ore            |
| Stone quarry    | 7%                 | 1 Stone               |
| Gold mountains  | 6%                 | 1 Gold                |
| Oasis           | 3%                 | 1 Wood + 1 Grain      |
| Coal hills      | 2%                 | 1 Coal                |
| Water terrain   | Sequential check   | Effective water share |
| ---             | ---                | ---                   |
| Fishing grounds | 3%                 | 3%                    |
| Whale grounds   | 1%                 | 0.97%                 |
| Water           |                    | 96.03%                |

Open water (no adjacent land): Whale check 2%; effective share 1.94%. Table above: coastal water.

### Monsoon: 30% land / 70% water

Compatible : Tropical, Subtropical, Savanna

Initial climate weight : 0.35

Transition weights : Tropical ×2, Subtropical ×1, Savanna ×1

| Land terrain        | Conditional chance | Annual baseline       |
| ------------------- | ------------------ | --------------------- |
| Jungle              | 20%                | 1 Hides               |
| Tropical woods      | 15%                | 1 Wood                |
| River woods         | 10%                | 1 Wood                |
| Rice field          | 15%                | 1 Grain               |
| Alluvial clay banks | 15%                | 2 Clay                |
| Bare Peaks          | 15%                | 0                     |
| Stone quarry        | 5%                 | 1 Stone               |
| Iron mountains      | 2%                 | 1 Iron ore            |
| Coal hills          | 1%                 | 1 Coal                |
| Gold mountains      | 2%                 | 1 Gold                |
| Water terrain       | Sequential check   | Effective water share |
| ---                 | ---                | ---                   |
| Fishing grounds     | 10%                | 10%                   |
| Whale grounds       | 2%                 | 1.8%                  |
| Water               |                    | 88.2%                 |

Open water (no adjacent land): Whale check 4%; effective share 3.6%. Table above: coastal water.

### Andean: 75% land / 25% water

Compatible : Alpine, Steppe, Desert, Subtropical, Mesoamerican

Initial climate weight : 1

Transition weights : Alpine ×2, Steppe ×1, Desert ×1, Subtropical ×1, Mesoamerican ×1

| Land terrain    | Conditional chance | Annual baseline       |
| --------------- | ------------------ | --------------------- |
| Potato fields   | 18%                | 2 Grain               |
| Alpaca pasture  | 14%                | 1 Wool + 1 Meat       |
| Mountain quarry | 16%                | 2 Stone               |
| Iron mountains  | 10%                | 1 Iron ore            |
| Gold mountains  | 6%                 | 1 Gold                |
| Salt flats      | 6%                 | 1 Salt                |
| Clay hills      | 5%                 | 1 Clay                |
| River woods     | 5%                 | 1 Wood                |
| Bare Peaks      | 15%                | 0                     |
| Snow plain      | 5%                 | 0                     |
| Water terrain   | Sequential check   | Effective water share |
| ---             | ---                | ---                   |
| Fishing grounds | 12%                | 12%                   |
| Water           |                    | 88%                   |

No whales in this climate.

### Prairie: 70% land / 30% water

Compatible : Cold, Temperate, Steppe, Desert, Mesoamerican

Initial climate weight : 1

Transition weights : Cold ×1, Temperate ×1, Steppe ×2, Desert ×1, Mesoamerican ×1

| Land terrain     | Conditional chance | Annual baseline       |
| ---------------- | ------------------ | --------------------- |
| Steppe plain     | 32%                | 1 Hides + 1 Wool      |
| Maize fields     | 12%                | 2 Grain               |
| Sunflower fields | 6%                 | 1 Oil                 |
| Bison range      | 16%                | 1 Meat + 1 Hides      |
| River woods      | 8%                 | 1 Wood                |
| Clay hills       | 8%                 | 1 Clay                |
| Stone quarry     | 6%                 | 1 Stone               |
| Coal hills       | 5%                 | 1 Coal                |
| Iron mountains   | 4%                 | 1 Iron ore            |
| Gold mountains   | 1%                 | 1 Gold                |
| Salt flats       | 2%                 | 1 Salt                |
| Water terrain    | Sequential check   | Effective water share |
| ---              | ---                | ---                   |
| Fishing grounds  | 10%                | 10%                   |
| Water            |                    | 90%                   |

No whales in this climate.

### Mesoamerican: 45% land / 55% water

Compatible : Tropical, Subtropical, Savanna, Andean, Prairie

Initial climate weight : 1

Transition weights : Tropical ×1, Subtropical ×2, Savanna ×1, Andean ×1, Prairie ×1

| Land terrain     | Conditional chance | Annual baseline       |
| ---------------- | ------------------ | --------------------- |
| Maize fields     | 20%                | 2 Grain               |
| Chinampa gardens | 6%                 | 3 Grain               |
| Turkey grounds   | 8%                 | 2 Meat                |
| Cloud forest     | 16%                | 1 Wood + 1 Hides      |
| Tropical woods   | 10%                | 1 Wood                |
| Clay hills       | 12%                | 1 Clay                |
| Volcanic quarry  | 10%                | 2 Stone               |
| Iron mountains   | 8%                 | 1 Iron ore            |
| Gold mountains   | 4%                 | 1 Gold                |
| Salt flats       | 4%                 | 1 Salt                |
| Coal hills       | 2%                 | 1 Coal                |
| Water terrain    | Sequential check   | Effective water share |
| ---              | ---                | ---                   |
| Fishing grounds  | 15%                | 15%                   |
| Whale grounds    | 5%                 | 4.25%                 |
| Water            |                    | 80.75%                |

Open water (no adjacent land): Whale check 10%; effective share 8.5%. Table above: coastal water.

## Terrain yields

Current annual baselines include climate-specific crop productivity. Each seasonal calendar totals four times that baseline, not necessarily the value used by an earlier game version.

| Terrain               | Climates                                                                                                                                                                            | Base yield        | Family |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------ |
| Woods                 | Temperate / Steppe / Mediterranean / Oceanic                                                                                                                                        | 1 Wood OR 1 Hides | forest |
| Forest                | Cold / Alpine                                                                                                                                                                       | 2 Wood            | forest |
| Hunting forest        | Cold                                                                                                                                                                                | 2 Hides           | forest |
| Golden fields         | Temperate / Mediterranean / Oceanic                                                                                                                                                 | 2 Grain           | flat   |
| Black-soil wheat      | Temperate / Steppe                                                                                                                                                                  | 3 Grain           | flat   |
| Pasture               | Temperate / Steppe                                                                                                                                                                  | 2 Wool            | flat   |
| Rough pasture         | Cold / Mediterranean / Savanna                                                                                                                                                      | 1 Wool            | rugged |
| Clay hills            | Temperate / Cold / Steppe / Tropical / Oceanic / Alpine / Savanna / Andean / Prairie / Mesoamerican                                                                                 | 1 Clay            | rugged |
| Gold mountains        | Temperate / Cold / Steppe / Mediterranean / Tropical / Desert / Oceanic / Alpine / Subtropical / Savanna / Hyperarid / Monsoon / Andean / Prairie / Mesoamerican                    | 1 Gold            | rugged |
| Iron mountains        | Temperate / Cold / Steppe / Mediterranean / Tropical / Desert / Oceanic / Alpine / Subtropical / Savanna / Hyperarid / Monsoon / Andean / Prairie / Mesoamerican                    | 1 Iron ore        | rugged |
| Stone quarry          | Temperate / Cold / Steppe / Tropical / Desert / Subtropical / Savanna / Hyperarid / Monsoon / Prairie                                                                               | 1 Stone           | rugged |
| Coal hills            | Temperate / Cold / Steppe / Mediterranean / Tropical / Desert / Oceanic / Alpine / Subtropical / Hyperarid / Monsoon / Prairie / Mesoamerican                                       | 1 Coal            | rugged |
| Salt flats            | Temperate / Mediterranean / Tropical / Desert / Subtropical / Savanna / Hyperarid / Andean / Prairie / Mesoamerican                                                                 | 1 Salt            | flat   |
| Snow plain            | Arctic / Glacial / Andean                                                                                                                                                           | 0                 | flat   |
| Seal hunting grounds  | Arctic / Glacial                                                                                                                                                                    | 1 Hides + 1 Oil   | flat   |
| Arctic iron mountains | Arctic / Glacial                                                                                                                                                                    | 1 Iron ore        | rugged |
| Arctic stone ridge    | Arctic / Glacial                                                                                                                                                                    | 1 Stone           | rugged |
| Arctic gold mountains | Arctic / Glacial                                                                                                                                                                    | 1 Gold            | rugged |
| Steppe plain          | Steppe / Prairie                                                                                                                                                                    | 1 Hides + 1 Wool  | flat   |
| Olive grove           | Mediterranean                                                                                                                                                                       | 1 Grain           | forest |
| Escarpment            | Mediterranean                                                                                                                                                                       | 1 Stone           | rugged |
| Jungle                | Tropical / Subtropical / Monsoon                                                                                                                                                    | 1 Hides           | forest |
| Tropical woods        | Tropical / Monsoon / Mesoamerican                                                                                                                                                   | 1 Wood            | forest |
| Rice field            | Tropical                                                                                                                                                                            | 3 Grain           | flat   |
| Rice field            | Subtropical                                                                                                                                                                         | 2 Grain           | flat   |
| Rice field            | Monsoon                                                                                                                                                                             | 1 Grain           | flat   |
| Desert                | Desert / Hyperarid                                                                                                                                                                  | 0                 | flat   |
| Oasis                 | Desert / Hyperarid                                                                                                                                                                  | 1 Wood + 1 Grain  | forest |
| Water                 | Temperate / Cold / Arctic / Steppe / Mediterranean / Tropical / Desert / Oceanic / Alpine / Subtropical / Savanna / Glacial / Hyperarid / Monsoon / Andean / Prairie / Mesoamerican | 0                 | water  |
| Fishing grounds       | Temperate / Cold / Arctic / Steppe / Mediterranean / Tropical / Desert / Oceanic / Alpine / Subtropical / Savanna / Glacial / Hyperarid / Monsoon / Andean / Prairie / Mesoamerican | 1 Fish            | water  |
| Cod grounds           | Cold / Arctic / Oceanic / Alpine / Glacial                                                                                                                                          | 2 Fish            | water  |
| Whale grounds         | Temperate / Cold / Arctic / Steppe / Mediterranean / Tropical / Desert / Oceanic / Alpine / Subtropical / Savanna / Glacial / Hyperarid / Monsoon / Mesoamerican                    | 1 Hides + 1 Oil   | water  |
| Frozen sea            | Arctic / Glacial                                                                                                                                                                    | 0                 | flat   |
| Coastal pasture       | Oceanic                                                                                                                                                                             | 2 Wool            | flat   |
| Coastal cliffs        | Oceanic                                                                                                                                                                             | 1 Stone           | rugged |
| Mountain quarry       | Alpine / Andean                                                                                                                                                                     | 2 Stone           | rugged |
| Alpine pasture        | Alpine                                                                                                                                                                              | 1 Wool            | rugged |
| Bare Peaks            | Alpine / Glacial / Hyperarid / Monsoon / Andean                                                                                                                                     | 0                 | rugged |
| Alluvial clay banks   | Subtropical / Monsoon                                                                                                                                                               | 2 Clay            | flat   |
| River woods           | Subtropical / Monsoon / Andean / Prairie                                                                                                                                            | 1 Wood            | forest |
| Wildlife grassland    | Savanna                                                                                                                                                                             | 2 Hides           | flat   |
| Dry woodland          | Savanna                                                                                                                                                                             | 1 Wood            | forest |
| Barley fields         | Cold / Mediterranean / Alpine                                                                                                                                                       | 1 Grain           | flat   |
| Barley fields         | Oceanic                                                                                                                                                                             | 2 Grain           | flat   |
| Potato fields         | Andean                                                                                                                                                                              | 2 Grain           | flat   |
| Turnip fields         | Temperate / Oceanic                                                                                                                                                                 | 2 Grain           | flat   |
| Turnip fields         | Cold / Alpine                                                                                                                                                                       | 1 Grain           | flat   |
| Oat fields            | Temperate                                                                                                                                                                           | 2 Grain           | flat   |
| Sorghum fields        | Subtropical                                                                                                                                                                         | 2 Grain           | flat   |
| Alpaca pasture        | Andean                                                                                                                                                                              | 1 Wool + 1 Meat   | flat   |
| Sunflower fields      | Prairie                                                                                                                                                                             | 1 Oil             | flat   |
| Bison range           | Prairie                                                                                                                                                                             | 1 Meat + 1 Hides  | flat   |
| Chinampa gardens      | Mesoamerican                                                                                                                                                                        | 3 Grain           | flat   |
| Turkey grounds        | Mesoamerican                                                                                                                                                                        | 2 Meat            | forest |
| Cloud forest          | Mesoamerican                                                                                                                                                                        | 1 Wood + 1 Hides  | forest |
| Volcanic quarry       | Mesoamerican                                                                                                                                                                        | 2 Stone           | rugged |
| Millet fields         | Steppe / Savanna                                                                                                                                                                    | 1 Grain           | flat   |
| Maize fields          | Prairie / Mesoamerican                                                                                                                                                              | 2 Grain           | flat   |
| Cattle pasture        | Temperate / Oceanic / Subtropical                                                                                                                                                   | 2 Meat            | flat   |
| Goat pasture          | Mediterranean / Desert / Alpine                                                                                                                                                     | 1 Meat            | rugged |
| Reindeer range        | Cold / Arctic                                                                                                                                                                       | 1 Meat + 1 Hides  | flat   |
| Cattle range          | Steppe / Savanna                                                                                                                                                                    | 1 Meat + 1 Hides  | flat   |

Bare Peaks: no production and no unit entry, including recruitment, retreat or disembarkation. Roads may follow their edges; towns need adjacent walkable solid land.

## Complete seasonal harvest tables

Ordinary seas freeze in Spring/Autumn with fixed chances: Glacial 100%/100%, Arctic 70%/50%, Alpine 35%/25%, Cold 20%/10%, Prairie 10%/10%. These five climates freeze in Winter and open in Summer; Andean water never freezes. Glacial Frozen sea terrain stays frozen all year; Arctic Frozen sea opens in Summer. Glacial marine harvests occur only in Summer. Other marine rows show the open-water baseline: frozen Spring or Autumn yield moves into Summer without changing the current annual total. Select a tile for exact surfaces and yields.

### Temperate

| Terrain          | Spring     | Summer          | Autumn          | Winter          |
| ---------------- | ---------- | --------------- | --------------- | --------------- |
| Golden fields    | 0          | 8 Grain         | 0               | 0               |
| Black-soil wheat | 0          | 12 Grain        | 0               | 0               |
| Oat fields       | 0          | 6 Grain         | 2 Grain         | 0               |
| Turnip fields    | 0          | 2 Grain         | 6 Grain         | 0               |
| Pasture          | 4 Wool     | 4 Wool          | 0               | 0               |
| Cattle pasture   | 1 Meat     | 1 Meat          | 4 Meat          | 2 Meat          |
| Woods (Wood)     | 1 Wood     | 1 Wood          | 2 Wood          | 0               |
| Woods (Hides)    | 1 Hides    | 1 Hides         | 2 Hides         | 0               |
| Gold mountains   | 1 Gold     | 1 Gold          | 1 Gold          | 1 Gold          |
| Clay hills       | 1 Clay     | 1 Clay          | 1 Clay          | 1 Clay          |
| Stone quarry     | 1 Stone    | 1 Stone         | 1 Stone         | 1 Stone         |
| Iron mountains   | 1 Iron ore | 1 Iron ore      | 1 Iron ore      | 1 Iron ore      |
| Coal hills       | 1 Coal     | 1 Coal          | 1 Coal          | 1 Coal          |
| Salt flats       | 1 Salt     | 2 Salt          | 1 Salt          | 0               |
| Fishing grounds  | 1 Fish     | 2 Fish          | 1 Fish          | 0               |
| Whale grounds    | 0          | 1 Hides + 1 Oil | 2 Hides + 2 Oil | 1 Hides + 1 Oil |

### Cold

| Terrain         | Spring           | Summer           | Autumn           | Winter           |
| --------------- | ---------------- | ---------------- | ---------------- | ---------------- |
| Forest          | 2 Wood           | 2 Wood           | 3 Wood           | 1 Wood           |
| Hunting forest  | 2 Hides          | 0                | 2 Hides          | 4 Hides          |
| Reindeer range  | 1 Meat + 1 Hides | 1 Meat + 1 Hides | 1 Meat + 1 Hides | 1 Meat + 1 Hides |
| Barley fields   | 0                | 0                | 4 Grain          | 0                |
| Turnip fields   | 0                | 1 Grain          | 3 Grain          | 0                |
| Rough pasture   | 2 Wool           | 2 Wool           | 0                | 0                |
| Gold mountains  | 1 Gold           | 2 Gold           | 1 Gold           | 0                |
| Coal hills      | 1 Coal           | 1 Coal           | 1 Coal           | 1 Coal           |
| Iron mountains  | 1 Iron ore       | 2 Iron ore       | 1 Iron ore       | 0                |
| Stone quarry    | 1 Stone          | 2 Stone          | 1 Stone          | 0                |
| Clay hills      | 1 Clay           | 2 Clay           | 1 Clay           | 0                |
| Fishing grounds | 1 Fish           | 2 Fish           | 1 Fish           | 0                |
| Cod grounds     | 2 Fish           | 4 Fish           | 2 Fish           | 0                |
| Whale grounds   | 1 Hides + 1 Oil  | 2 Hides + 2 Oil  | 1 Hides + 1 Oil  | 0                |

### Arctic

| Terrain               | Spring           | Summer           | Autumn           | Winter           |
| --------------------- | ---------------- | ---------------- | ---------------- | ---------------- |
| Snow plain            | 0                | 0                | 0                | 0                |
| Reindeer range        | 1 Meat + 1 Hides | 1 Meat + 1 Hides | 1 Meat + 1 Hides | 1 Meat + 1 Hides |
| Seal hunting grounds  | 1 Hides + 1 Oil  | 1 Hides + 1 Oil  | 1 Hides + 1 Oil  | 1 Hides + 1 Oil  |
| Arctic iron mountains | 1 Iron ore       | 2 Iron ore       | 1 Iron ore       | 0                |
| Arctic stone ridge    | 1 Stone          | 2 Stone          | 1 Stone          | 0                |
| Arctic gold mountains | 1 Gold           | 2 Gold           | 1 Gold           | 0                |
| Frozen sea            | 0                | 0                | 0                | 0                |
| Fishing grounds       | 1 Fish           | 2 Fish           | 1 Fish           | 0                |
| Cod grounds           | 2 Fish           | 4 Fish           | 2 Fish           | 0                |
| Whale grounds         | 1 Hides + 1 Oil  | 2 Hides + 2 Oil  | 1 Hides + 1 Oil  | 0                |

### Steppe

| Terrain          | Spring           | Summer          | Autumn           | Winter           |
| ---------------- | ---------------- | --------------- | ---------------- | ---------------- |
| Steppe plain     | 1 Hides + 2 Wool | 2 Wool          | 1 Hides          | 2 Hides          |
| Black-soil wheat | 0                | 12 Grain        | 0                | 0                |
| Cattle range     | 1 Meat + 1 Hides | 0               | 2 Meat + 2 Hides | 1 Meat + 1 Hides |
| Millet fields    | 0                | 0               | 4 Grain          | 0                |
| Pasture          | 4 Wool           | 4 Wool          | 0                | 0                |
| Woods (Wood)     | 1 Wood           | 1 Wood          | 2 Wood           | 0                |
| Woods (Hides)    | 1 Hides          | 1 Hides         | 2 Hides          | 0                |
| Stone quarry     | 1 Stone          | 1 Stone         | 1 Stone          | 1 Stone          |
| Iron mountains   | 1 Iron ore       | 1 Iron ore      | 1 Iron ore       | 1 Iron ore       |
| Coal hills       | 1 Coal           | 1 Coal          | 1 Coal           | 1 Coal           |
| Clay hills       | 1 Clay           | 1 Clay          | 1 Clay           | 1 Clay           |
| Gold mountains   | 1 Gold           | 1 Gold          | 1 Gold           | 1 Gold           |
| Fishing grounds  | 1 Fish           | 2 Fish          | 1 Fish           | 0                |
| Whale grounds    | 0                | 1 Hides + 1 Oil | 2 Hides + 2 Oil  | 1 Hides + 1 Oil  |

### Mediterranean

| Terrain         | Spring     | Summer          | Autumn          | Winter          |
| --------------- | ---------- | --------------- | --------------- | --------------- |
| Golden fields   | 0          | 8 Grain         | 0               | 0               |
| Barley fields   | 0          | 4 Grain         | 0               | 0               |
| Olive grove     | 0          | 0               | 2 Grain         | 2 Grain         |
| Escarpment      | 1 Stone    | 1 Stone         | 1 Stone         | 1 Stone         |
| Woods (Wood)    | 1 Wood     | 1 Wood          | 2 Wood          | 0               |
| Woods (Hides)   | 1 Hides    | 1 Hides         | 2 Hides         | 0               |
| Rough pasture   | 2 Wool     | 2 Wool          | 0               | 0               |
| Goat pasture    | 1 Meat     | 0               | 2 Meat          | 1 Meat          |
| Salt flats      | 1 Salt     | 2 Salt          | 1 Salt          | 0               |
| Gold mountains  | 1 Gold     | 1 Gold          | 1 Gold          | 1 Gold          |
| Coal hills      | 1 Coal     | 1 Coal          | 1 Coal          | 1 Coal          |
| Iron mountains  | 1 Iron ore | 1 Iron ore      | 1 Iron ore      | 1 Iron ore      |
| Fishing grounds | 1 Fish     | 1 Fish          | 1 Fish          | 1 Fish          |
| Whale grounds   | 0          | 1 Hides + 1 Oil | 2 Hides + 2 Oil | 1 Hides + 1 Oil |

### Tropical

| Terrain         | Spring     | Summer          | Autumn          | Winter          |
| --------------- | ---------- | --------------- | --------------- | --------------- |
| Jungle          | 1 Hides    | 1 Hides         | 1 Hides         | 1 Hides         |
| Tropical woods  | 1 Wood     | 1 Wood          | 1 Wood          | 1 Wood          |
| Rice field      | 4 Grain    | 4 Grain         | 4 Grain         | 0               |
| Clay hills      | 1 Clay     | 1 Clay          | 1 Clay          | 1 Clay          |
| Gold mountains  | 1 Gold     | 1 Gold          | 1 Gold          | 1 Gold          |
| Stone quarry    | 1 Stone    | 1 Stone         | 1 Stone         | 1 Stone         |
| Coal hills      | 1 Coal     | 1 Coal          | 1 Coal          | 1 Coal          |
| Iron mountains  | 1 Iron ore | 1 Iron ore      | 1 Iron ore      | 1 Iron ore      |
| Salt flats      | 1 Salt     | 0               | 1 Salt          | 2 Salt          |
| Fishing grounds | 1 Fish     | 1 Fish          | 1 Fish          | 1 Fish          |
| Whale grounds   | 0          | 1 Hides + 1 Oil | 2 Hides + 2 Oil | 1 Hides + 1 Oil |

### Desert

| Terrain         | Spring     | Summer          | Autumn           | Winter          |
| --------------- | ---------- | --------------- | ---------------- | --------------- |
| Desert          | 0          | 0               | 0                | 0               |
| Goat pasture    | 1 Meat     | 0               | 2 Meat           | 1 Meat          |
| Gold mountains  | 1 Gold     | 1 Gold          | 1 Gold           | 1 Gold          |
| Iron mountains  | 1 Iron ore | 1 Iron ore      | 1 Iron ore       | 1 Iron ore      |
| Stone quarry    | 1 Stone    | 1 Stone         | 1 Stone          | 1 Stone         |
| Coal hills      | 1 Coal     | 1 Coal          | 1 Coal           | 1 Coal          |
| Oasis           | 1 Wood     | 1 Wood          | 1 Wood + 4 Grain | 1 Wood          |
| Salt flats      | 1 Salt     | 1 Salt          | 1 Salt           | 1 Salt          |
| Fishing grounds | 1 Fish     | 1 Fish          | 1 Fish           | 1 Fish          |
| Whale grounds   | 0          | 1 Hides + 1 Oil | 2 Hides + 2 Oil  | 1 Hides + 1 Oil |

### Oceanic

| Terrain         | Spring     | Summer          | Autumn          | Winter          |
| --------------- | ---------- | --------------- | --------------- | --------------- |
| Coastal pasture | 4 Wool     | 4 Wool          | 0               | 0               |
| Cattle pasture  | 1 Meat     | 1 Meat          | 4 Meat          | 2 Meat          |
| Woods (Wood)    | 1 Wood     | 1 Wood          | 2 Wood          | 0               |
| Woods (Hides)   | 1 Hides    | 1 Hides         | 2 Hides         | 0               |
| Barley fields   | 0          | 8 Grain         | 0               | 0               |
| Turnip fields   | 0          | 2 Grain         | 6 Grain         | 0               |
| Golden fields   | 0          | 0               | 8 Grain         | 0               |
| Clay hills      | 1 Clay     | 1 Clay          | 1 Clay          | 1 Clay          |
| Coastal cliffs  | 1 Stone    | 1 Stone         | 1 Stone         | 1 Stone         |
| Coal hills      | 1 Coal     | 1 Coal          | 1 Coal          | 1 Coal          |
| Iron mountains  | 1 Iron ore | 1 Iron ore      | 1 Iron ore      | 1 Iron ore      |
| Gold mountains  | 1 Gold     | 1 Gold          | 1 Gold          | 1 Gold          |
| Fishing grounds | 1 Fish     | 2 Fish          | 1 Fish          | 0               |
| Cod grounds     | 2 Fish     | 4 Fish          | 2 Fish          | 0               |
| Whale grounds   | 0          | 1 Hides + 1 Oil | 2 Hides + 2 Oil | 1 Hides + 1 Oil |

### Alpine

| Terrain         | Spring          | Summer          | Autumn          | Winter |
| --------------- | --------------- | --------------- | --------------- | ------ |
| Mountain quarry | 2 Stone         | 4 Stone         | 2 Stone         | 0      |
| Iron mountains  | 1 Iron ore      | 2 Iron ore      | 1 Iron ore      | 0      |
| Coal hills      | 1 Coal          | 1 Coal          | 1 Coal          | 1 Coal |
| Alpine pasture  | 2 Wool          | 2 Wool          | 0               | 0      |
| Goat pasture    | 1 Meat          | 0               | 2 Meat          | 1 Meat |
| Barley fields   | 0               | 0               | 4 Grain         | 0      |
| Turnip fields   | 0               | 1 Grain         | 3 Grain         | 0      |
| Forest          | 2 Wood          | 2 Wood          | 3 Wood          | 1 Wood |
| Gold mountains  | 1 Gold          | 2 Gold          | 1 Gold          | 0      |
| Clay hills      | 1 Clay          | 2 Clay          | 1 Clay          | 0      |
| Bare Peaks      | 0               | 0               | 0               | 0      |
| Fishing grounds | 1 Fish          | 2 Fish          | 1 Fish          | 0      |
| Cod grounds     | 2 Fish          | 4 Fish          | 2 Fish          | 0      |
| Whale grounds   | 1 Hides + 1 Oil | 2 Hides + 2 Oil | 1 Hides + 1 Oil | 0      |

### Subtropical

| Terrain             | Spring     | Summer          | Autumn          | Winter          |
| ------------------- | ---------- | --------------- | --------------- | --------------- |
| Alluvial clay banks | 2 Clay     | 1 Clay          | 2 Clay          | 3 Clay          |
| Rice field          | 0          | 4 Grain         | 4 Grain         | 0               |
| Sorghum fields      | 0          | 0               | 8 Grain         | 0               |
| River woods         | 1 Wood     | 1 Wood          | 1 Wood          | 1 Wood          |
| Cattle pasture      | 1 Meat     | 1 Meat          | 4 Meat          | 2 Meat          |
| Jungle              | 1 Hides    | 1 Hides         | 1 Hides         | 1 Hides         |
| Stone quarry        | 1 Stone    | 1 Stone         | 1 Stone         | 1 Stone         |
| Coal hills          | 1 Coal     | 1 Coal          | 1 Coal          | 1 Coal          |
| Iron mountains      | 1 Iron ore | 1 Iron ore      | 1 Iron ore      | 1 Iron ore      |
| Salt flats          | 1 Salt     | 0               | 1 Salt          | 2 Salt          |
| Gold mountains      | 1 Gold     | 1 Gold          | 1 Gold          | 1 Gold          |
| Fishing grounds     | 1 Fish     | 1 Fish          | 1 Fish          | 1 Fish          |
| Whale grounds       | 0          | 1 Hides + 1 Oil | 2 Hides + 2 Oil | 1 Hides + 1 Oil |

### Savanna

| Terrain            | Spring           | Summer          | Autumn           | Winter           |
| ------------------ | ---------------- | --------------- | ---------------- | ---------------- |
| Wildlife grassland | 2 Hides          | 1 Hides         | 3 Hides          | 2 Hides          |
| Cattle range       | 1 Meat + 1 Hides | 0               | 2 Meat + 2 Hides | 1 Meat + 1 Hides |
| Millet fields      | 0                | 0               | 4 Grain          | 0                |
| Dry woodland       | 1 Wood           | 1 Wood          | 1 Wood           | 1 Wood           |
| Rough pasture      | 1 Wool           | 1 Wool          | 1 Wool           | 1 Wool           |
| Iron mountains     | 1 Iron ore       | 1 Iron ore      | 1 Iron ore       | 1 Iron ore       |
| Clay hills         | 1 Clay           | 1 Clay          | 1 Clay           | 1 Clay           |
| Stone quarry       | 1 Stone          | 1 Stone         | 1 Stone          | 1 Stone          |
| Gold mountains     | 1 Gold           | 1 Gold          | 1 Gold           | 1 Gold           |
| Salt flats         | 1 Salt           | 0               | 1 Salt           | 2 Salt           |
| Fishing grounds    | 1 Fish           | 1 Fish          | 1 Fish           | 1 Fish           |
| Whale grounds      | 0                | 1 Hides + 1 Oil | 2 Hides + 2 Oil  | 1 Hides + 1 Oil  |

### Glacial

| Terrain               | Spring          | Summer          | Autumn          | Winter          |
| --------------------- | --------------- | --------------- | --------------- | --------------- |
| Snow plain            | 0               | 0               | 0               | 0               |
| Bare Peaks            | 0               | 0               | 0               | 0               |
| Seal hunting grounds  | 1 Hides + 1 Oil | 1 Hides + 1 Oil | 1 Hides + 1 Oil | 1 Hides + 1 Oil |
| Arctic iron mountains | 0               | 4 Iron ore      | 0               | 0               |
| Arctic stone ridge    | 0               | 4 Stone         | 0               | 0               |
| Arctic gold mountains | 0               | 4 Gold          | 0               | 0               |
| Frozen sea            | 0               | 0               | 0               | 0               |
| Fishing grounds       | 0               | 4 Fish          | 0               | 0               |
| Cod grounds           | 0               | 8 Fish          | 0               | 0               |
| Whale grounds         | 0               | 4 Hides + 4 Oil | 0               | 0               |

### Hyperarid

| Terrain         | Spring     | Summer          | Autumn           | Winter          |
| --------------- | ---------- | --------------- | ---------------- | --------------- |
| Desert          | 0          | 0               | 0                | 0               |
| Bare Peaks      | 0          | 0               | 0                | 0               |
| Salt flats      | 1 Salt     | 1 Salt          | 1 Salt           | 1 Salt          |
| Iron mountains  | 1 Iron ore | 1 Iron ore      | 1 Iron ore       | 1 Iron ore      |
| Stone quarry    | 1 Stone    | 1 Stone         | 1 Stone          | 1 Stone         |
| Gold mountains  | 1 Gold     | 1 Gold          | 1 Gold           | 1 Gold          |
| Oasis           | 1 Wood     | 1 Wood          | 1 Wood + 4 Grain | 1 Wood          |
| Coal hills      | 1 Coal     | 1 Coal          | 1 Coal           | 1 Coal          |
| Fishing grounds | 1 Fish     | 1 Fish          | 1 Fish           | 1 Fish          |
| Whale grounds   | 0          | 1 Hides + 1 Oil | 2 Hides + 2 Oil  | 1 Hides + 1 Oil |

### Monsoon

| Terrain             | Spring     | Summer          | Autumn          | Winter          |
| ------------------- | ---------- | --------------- | --------------- | --------------- |
| Jungle              | 1 Hides    | 1 Hides         | 1 Hides         | 1 Hides         |
| Tropical woods      | 1 Wood     | 1 Wood          | 1 Wood          | 1 Wood          |
| River woods         | 1 Wood     | 1 Wood          | 1 Wood          | 1 Wood          |
| Rice field          | 0          | 0               | 4 Grain         | 0               |
| Alluvial clay banks | 2 Clay     | 1 Clay          | 2 Clay          | 3 Clay          |
| Bare Peaks          | 0          | 0               | 0               | 0               |
| Stone quarry        | 1 Stone    | 1 Stone         | 1 Stone         | 1 Stone         |
| Iron mountains      | 1 Iron ore | 1 Iron ore      | 1 Iron ore      | 1 Iron ore      |
| Coal hills          | 1 Coal     | 1 Coal          | 1 Coal          | 1 Coal          |
| Gold mountains      | 1 Gold     | 1 Gold          | 1 Gold          | 1 Gold          |
| Fishing grounds     | 1 Fish     | 1 Fish          | 1 Fish          | 1 Fish          |
| Whale grounds       | 0          | 1 Hides + 1 Oil | 2 Hides + 2 Oil | 1 Hides + 1 Oil |

### Andean

| Terrain         | Spring          | Summer     | Autumn     | Winter     |
| --------------- | --------------- | ---------- | ---------- | ---------- |
| Potato fields   | 0               | 2 Grain    | 6 Grain    | 0          |
| Alpaca pasture  | 4 Wool + 1 Meat | 0          | 2 Meat     | 1 Meat     |
| Mountain quarry | 2 Stone         | 2 Stone    | 2 Stone    | 2 Stone    |
| Iron mountains  | 1 Iron ore      | 1 Iron ore | 1 Iron ore | 1 Iron ore |
| Gold mountains  | 1 Gold          | 1 Gold     | 1 Gold     | 1 Gold     |
| Salt flats      | 1 Salt          | 2 Salt     | 1 Salt     | 0          |
| Clay hills      | 1 Clay          | 1 Clay     | 1 Clay     | 1 Clay     |
| River woods     | 1 Wood          | 1 Wood     | 2 Wood     | 0          |
| Bare Peaks      | 0               | 0          | 0          | 0          |
| Snow plain      | 0               | 0          | 0          | 0          |
| Fishing grounds | 1 Fish          | 2 Fish     | 1 Fish     | 0          |

### Prairie

| Terrain          | Spring           | Summer     | Autumn           | Winter           |
| ---------------- | ---------------- | ---------- | ---------------- | ---------------- |
| Steppe plain     | 1 Hides + 2 Wool | 2 Wool     | 1 Hides          | 2 Hides          |
| Maize fields     | 0                | 0          | 8 Grain          | 0                |
| Sunflower fields | 0                | 0          | 4 Oil            | 0                |
| Bison range      | 1 Meat + 1 Hides | 0          | 2 Meat + 2 Hides | 1 Meat + 1 Hides |
| River woods      | 1 Wood           | 1 Wood     | 2 Wood           | 0                |
| Clay hills       | 1 Clay           | 2 Clay     | 1 Clay           | 0                |
| Stone quarry     | 1 Stone          | 2 Stone    | 1 Stone          | 0                |
| Coal hills       | 1 Coal           | 1 Coal     | 1 Coal           | 1 Coal           |
| Iron mountains   | 1 Iron ore       | 2 Iron ore | 1 Iron ore       | 0                |
| Gold mountains   | 1 Gold           | 2 Gold     | 1 Gold           | 0                |
| Salt flats       | 1 Salt           | 2 Salt     | 1 Salt           | 0                |
| Fishing grounds  | 1 Fish           | 2 Fish     | 1 Fish           | 0                |

### Mesoamerican

| Terrain          | Spring           | Summer           | Autumn           | Winter           |
| ---------------- | ---------------- | ---------------- | ---------------- | ---------------- |
| Maize fields     | 0                | 0                | 8 Grain          | 0                |
| Chinampa gardens | 4 Grain          | 4 Grain          | 4 Grain          | 0                |
| Turkey grounds   | 1 Meat           | 1 Meat           | 4 Meat           | 2 Meat           |
| Cloud forest     | 1 Wood + 1 Hides | 1 Wood + 1 Hides | 1 Wood + 1 Hides | 1 Wood + 1 Hides |
| Tropical woods   | 1 Wood           | 1 Wood           | 1 Wood           | 1 Wood           |
| Clay hills       | 1 Clay           | 1 Clay           | 1 Clay           | 1 Clay           |
| Volcanic quarry  | 2 Stone          | 2 Stone          | 2 Stone          | 2 Stone          |
| Iron mountains   | 1 Iron ore       | 1 Iron ore       | 1 Iron ore       | 1 Iron ore       |
| Gold mountains   | 1 Gold           | 1 Gold           | 1 Gold           | 1 Gold           |
| Salt flats       | 1 Salt           | 0                | 1 Salt           | 2 Salt           |
| Coal hills       | 1 Coal           | 1 Coal           | 1 Coal           | 1 Coal           |
| Fishing grounds  | 1 Fish           | 1 Fish           | 1 Fish           | 1 Fish           |
| Whale grounds    | 0                | 1 Hides + 1 Oil  | 2 Hides + 2 Oil  | 1 Hides + 1 Oil  |

## All costs

Prices are paid per construction or upgrade step. Watchtower I offers two alternative payments: 2 Wood OR 2 Stone.

| Recipe                                 | Cost                                                    |
| -------------------------------------- | ------------------------------------------------------- |
| Road                                   | 1 Wood + 1 Clay                                         |
| Settlement                             | 1 Wood + 1 Clay + 1 Wool + 1 Grain                      |
| City I / level 2                       | 3 Iron ore + 2 Grain                                    |
| Seafarers route ship                   | 1 Wood + 1 Wool                                         |
| Tier-I research                        | 1 Iron ore + 1 Wool + 1 Grain                           |
| City II / level 3                      | 3 Iron ore + 3 Grain + 3 Blocks + 2 Pottery             |
| City III / level 4                     | 5 Blocks + 4 Planks + 4 Pottery + 3 Cloth + 2 Chemicals |
| Sawmill I                              | 2 Wood + 1 Iron ore + 1 Stone                           |
| Sawmill II                             | 2 Planks + 2 Steel + 1 Wood                             |
| Sawmill III                            | 4 Planks + 3 Steel + 2 Fuel                             |
| Kiln I                                 | 2 Clay + 1 Coal + 1 Stone                               |
| Kiln II                                | 2 Pottery + 2 Fuel + 1 Clay                             |
| Kiln III                               | 4 Pottery + 3 Fuel + 2 Blocks                           |
| Weaver I                               | 2 Wool + 1 Wood + 1 Salt                                |
| Weaver II                              | 2 Cloth + 1 Wool + 2 Pottery                            |
| Weaver III                             | 4 Cloth + 2 Leather + 3 Chemicals                       |
| Forge I                                | 2 Iron ore + 1 Coal + 1 Stone                           |
| Forge II                               | 2 Steel + 2 Fuel + 1 Iron ore                           |
| Forge III                              | 4 Steel + 3 Fuel + 2 Chemicals                          |
| Stoneworks I                           | 2 Stone + 1 Iron ore + 1 Wood                           |
| Stoneworks II                          | 2 Blocks + 2 Steel + 1 Stone                            |
| Stoneworks III                         | 4 Blocks + 3 Steel + 2 Planks                           |
| Tannery I                              | 2 Hides + 1 Salt + 1 Clay                               |
| Tannery II                             | 2 Leather + 2 Chemicals + 1 Hides                       |
| Tannery III                            | 4 Leather + 3 Chemicals + 2 Pottery                     |
| Hillguard                              | 1 Grain + 2 Iron ore                                    |
| Iron Sentinel                          | 2 Steel + 1 Leather + 1 Rations                         |
| Granite Praetorian                     | 3 Steel + 2 Leather + 2 Fuel + 1 Rations                |
| Brushrunner                            | 1 Grain + 1 Wool + 1 Hides                              |
| Thorn Ranger                           | 2 Leather + 1 Rations + 1 Cloth                         |
| Veil Warden                            | 3 Leather + 2 Cloth + 1 Chemicals + 2 Rations           |
| Outrider                               | 2 Grain + 2 Hides                                       |
| Lancer                                 | 2 Leather + 1 Cloth + 2 Rations                         |
| Sunsteel Cataphract                    | 3 Steel + 3 Leather + 2 Cloth + 2 Rations               |
| Field Ballista                         | 2 Wood + 1 Iron ore + 1 Hides                           |
| Siege Onager                           | 2 Planks + 1 Steel + 2 Leather                          |
| Great Bombard                          | 3 Planks + 3 Steel + 3 Chemicals + 3 Fuel               |
| Palisade                               | 1 Wood                                                  |
| Stone Curtain                          | 3 Stone                                                 |
| Bastion                                | 3 Blocks                                                |
| Citadel Ring                           | 4 Blocks + 2 Steel                                      |
| Land expedition I · Reconnaissance     | 2 Grain + 1 Wood + 1 Hides                              |
| Sea expedition I · Reconnaissance      | 2 Grain + 2 Wood + 1 Salt                               |
| Land expedition II · Survey            | 3 Rations + 2 Leather + 2 Pottery                       |
| Sea expedition II · Survey             | 3 Rations + 2 Cloth + 3 Planks                          |
| Land expedition III · Great Expedition | 5 Rations + 4 Leather + 2 Chemicals + 3 Pottery         |
| Sea expedition III · Great Expedition  | 5 Rations + 4 Planks + 3 Cloth + 4 Chemicals            |
| Lumber camp                            | 1 Hides + 1 Iron ore                                    |
| Lumber camp II                         | 2 Steel + 2 Leather                                     |
| Brick camp                             | 1 Stone + 1 Iron ore                                    |
| Brick camp II                          | 2 Blocks + 1 Steel                                      |
| Wool camp                              | 1 Stone + 1 Grain                                       |
| Wool camp II                           | 2 Cloth + 1 Leather                                     |
| Grain camp                             | 1 Iron ore + 1 Hides                                    |
| Grain camp II                          | 2 Rations + 2 Pottery                                   |
| Ore camp                               | 1 Wood + 1 Hides                                        |
| Ore camp II                            | 2 Planks + 1 Fuel + 2 Chemicals                         |
| Stone camp                             | 1 Iron ore + 1 Hides                                    |
| Stone camp II                          | 2 Steel + 1 Fuel                                        |
| Hides camp                             | 1 Salt + 1 Stone                                        |
| Hides camp II                          | 2 Leather + 1 Chemicals                                 |
| Salt camp                              | 1 Clay + 1 Coal                                         |
| Salt camp II                           | 2 Pottery + 1 Fuel + 1 Blocks                           |
| Coal camp                              | 1 Wood + 1 Stone                                        |
| Coal camp II                           | 2 Blocks + 1 Leather + 2 Fuel                           |
| Bakery I                               | 2 Grain + 1 Salt + 1 Clay                               |
| Bakery II                              | 2 Rations + 2 Pottery + 1 Grain                         |
| Bakery III                             | 4 Rations + 3 Pottery + 2 Cloth                         |
| Chemical works I                       | 2 Salt + 1 Coal + 1 Clay                                |
| Chemical works II                      | 2 Chemicals + 2 Pottery + 1 Salt                        |
| Chemical works III                     | 4 Chemicals + 3 Pottery + 2 Fuel                        |
| Fuel works I                           | 2 Coal + 1 Stone + 1 Clay                               |
| Fuel works II                          | 2 Fuel + 2 Blocks + 1 Coal                              |
| Fuel works III                         | 4 Fuel + 3 Blocks + 2 Steel                             |
| Spearguard                             | 1 Steel + 2 Grain                                       |
| Trail Scout                            | 1 Leather + 1 Wool + 1 Grain                            |
| Horseman                               | 1 Leather + 2 Grain + 1 Hides                           |
| Light Catapult                         | 2 Wood + 1 Iron ore + 1 Blocks                          |
| Gold camp                              | 1 Iron ore + 1 Hides                                    |
| Gold camp II                           | 2 Steel + 1 Planks                                      |
| Fish camp                              | 1 Wool + 1 Salt                                         |
| Fish camp II                           | 2 Cloth + 1 Planks                                      |
| Meat camp                              | 1 Stone + 1 Iron ore                                    |
| Meat camp II                           | 1 Planks + 1 Steel                                      |
| Goldsmith I                            | 2 Iron ore + 1 Coal + 1 Stone                           |
| Goldsmith II                           | 2 Steel + 2 Pottery                                     |
| Goldsmith III                          | 3 Steel + 3 Fuel + 2 Blocks                             |
| Smokehouse I                           | 2 Salt + 1 Coal + 1 Stone                               |
| Smokehouse II                          | 2 Pottery + 1 Fuel + 1 Salt                             |
| Smokehouse III                         | 3 Pottery + 3 Fuel + 2 Planks                           |
| Peddler                                | 2 Hides + 1 Wool + 2 Grain                              |
| Trader                                 | 2 Leather + 2 Wool + 2 Grain                            |
| Caravan Master                         | 3 Leather + 2 Cloth + 3 Rations                         |
| Merchant Prince                        | 4 Leather + 3 Cloth + 4 Rations + 1 Gold bars           |
| Coastal Transport                      | 2 Wood + 1 Wool + 1 Hides                               |
| Sailing Transport                      | 3 Wood + 2 Cloth + 1 Hides                              |
| Ocean Transport                        | 3 Planks + 2 Cloth + 2 Leather                          |
| Royal Transport                        | 4 Planks + 3 Cloth + 3 Leather + 2 Steel                |
| Cargo Barge                            | 3 Wood + 1 Wool + 2 Hides                               |
| Convoy Cog                             | 4 Wood + 3 Leather + 1 Wool                             |
| Convoy Galleon                         | 4 Planks + 3 Leather + 2 Cloth                          |
| Grand Convoy                           | 5 Planks + 4 Leather + 3 Cloth + 2 Steel                |
| Patrol Galley                          | 2 Wood + 2 Iron ore + 1 Wool                            |
| War Galley                             | 3 Wood + 2 Steel + 1 Wool                               |
| War Frigate                            | 3 Planks + 3 Steel + 2 Cloth                            |
| Royal Frigate                          | 4 Planks + 4 Steel + 3 Cloth + 2 Fuel                   |
| Guard Carrack                          | 3 Wood + 3 Iron ore + 1 Coal                            |
| Battle Carrack                         | 4 Wood + 3 Steel + 1 Coal                               |
| Armored Carrack                        | 4 Planks + 4 Steel + 2 Blocks                           |
| Dreadnought                            | 5 Planks + 5 Steel + 3 Blocks + 3 Fuel                  |
| Fishing Skiff                          | 2 Wood + 2 Wool + 1 Salt                                |
| Fishing Cutter                         | 3 Wood + 2 Cloth + 1 Salt                               |
| Deepwater Trawler                      | 3 Planks + 3 Cloth + 2 Pottery                          |
| Grand Trawler                          | 4 Planks + 4 Cloth + 3 Pottery + 2 Chemicals            |
| Trading Sloop                          | 2 Wood + 1 Wool + 2 Hides                               |
| Merchant Cog                           | 3 Wood + 2 Leather + 1 Wool                             |
| Merchant Galleon                       | 3 Planks + 2 Cloth + 3 Leather                          |
| Treasure Galleon                       | 4 Planks + 3 Cloth + 4 Leather + 1 Gold bars            |
| Watchtower 1                           | 2 Wood                                                  |
| Watchtower 2                           | 2 Stone + 1 Iron ore                                    |
| Watchtower 3                           | 2 Stone + 1 Steel                                       |
| Watchtower 4                           | 2 Blocks + 1 Steel                                      |
| Research I · Practical Knowledge       | 1 Grain + 1 Wool + 1 Iron ore                           |
| Research II · Guild Knowledge          | 1 Stone + 1 Salt + 1 Cloth                              |
| Research III · Engineering             | 2 Pottery + 1 Rations + 1 Fuel                          |
| Research IV · Statecraft               | 2 Cloth + 2 Chemicals + 2 Fuel                          |
| Watchtower 1 · Stone                   | 2 Stone                                                 |
| Prospectors' Guild I                   | 3 Stone + 2 Hides + 1 Iron ore                          |
| Prospectors' Guild II                  | 4 Stone + 2 Coal + 2 Leather                            |
| Prospectors' Guild III                 | 4 Blocks + 2 Fuel + 3 Steel                             |
| Artisans' Guild I                      | 3 Stone + 2 Coal + 1 Clay                               |
| Artisans' Guild II                     | 4 Stone + 2 Coal + 2 Planks                             |
| Artisans' Guild III                    | 4 Blocks + 2 Fuel + 3 Chemicals                         |
| Merchants' Guild I                     | 3 Stone + 2 Salt + 1 Hides                              |
| Merchants' Guild II                    | 4 Stone + 2 Coal + 2 Cloth                              |
| Merchants' Guild III                   | 4 Blocks + 2 Fuel + 3 Leather                           |
| Commanders' Guild I                    | 3 Stone + 2 Iron ore + 1 Grain                          |
| Commanders' Guild II                   | 4 Stone + 2 Coal + 2 Steel                              |
| Commanders' Guild III                  | 4 Blocks + 2 Fuel + 3 Steel                             |
| Navigators' Guild I                    | 3 Stone + 2 Salt + 1 Wood                               |
| Navigators' Guild II                   | 4 Stone + 2 Coal + 2 Cloth                              |
| Navigators' Guild III                  | 4 Blocks + 2 Fuel + 3 Planks                            |
| Farmers' Guild I                       | 3 Stone + 2 Salt + 1 Coal                               |
| Farmers' Guild II                      | 4 Stone + 2 Coal + 2 Chemicals                          |
| Farmers' Guild III                     | 4 Blocks + 2 Fuel + 3 Chemicals                         |
| Extractors' Guild I                    | 3 Stone + 2 Iron ore + 1 Hides                          |
| Extractors' Guild II                   | 4 Stone + 2 Coal + 2 Steel                              |
| Extractors' Guild III                  | 4 Blocks + 2 Fuel + 3 Steel                             |
| Engineers' Guild I                     | 3 Stone + 2 Iron ore + 1 Coal                           |
| Engineers' Guild II                    | 4 Stone + 2 Coal + 2 Steel                              |
| Engineers' Guild III                   | 4 Blocks + 2 Fuel + 3 Steel                             |
| Builders' Guild I                      | 3 Stone + 2 Wood + 1 Clay                               |
| Builders' Guild II                     | 4 Stone + 2 Coal + 2 Planks                             |
| Builders' Guild III                    | 4 Blocks + 2 Fuel + 3 Planks                            |
| Scholars' Guild I                      | 3 Stone + 2 Wool + 1 Salt                               |
| Scholars' Guild II                     | 4 Stone + 2 Coal + 2 Chemicals                          |
| Scholars' Guild III                    | 4 Blocks + 2 Fuel + 3 Cloth                             |
| Settlers                               | 2 Hides + 2 Wool + 3 Grain + 1 Wood + 1 Clay            |
| Settler Ship                           | 3 Wood + 2 Wool + 2 Hides + 1 Clay + 1 Grain            |

## Land roster

| Unit                | Tier | Power | Movement | Terrain bonus |
| ------------------- | ---- | ----- | -------- | ------------- |
| Settlers            | I    | 0     | 1        | 0             |
| Peddler             | I    | 0     | 1        | 0             |
| Trader              | II   | 0     | 1        | 0             |
| Caravan Master      | III  | 0     | 1        | 0             |
| Merchant Prince     | IV   | 0     | 1        | 0             |
| Hillguard           | I    | 1     | 1        | ×2 rugged     |
| Spearguard          | II   | 2     | 1        | ×2 rugged     |
| Iron Sentinel       | III  | 3     | 1        | ×2 rugged     |
| Granite Praetorian  | IV   | 4     | 1        | ×2 rugged     |
| Brushrunner         | I    | 1     | 2        | ×2 forest     |
| Trail Scout         | II   | 2     | 2        | ×2 forest     |
| Thorn Ranger        | III  | 3     | 2        | ×2 forest     |
| Veil Warden         | IV   | 4     | 2        | ×2 forest     |
| Outrider            | I    | 1     | 3        | ×2 flat       |
| Horseman            | II   | 2     | 3        | ×2 flat       |
| Lancer              | III  | 3     | 3        | ×2 flat       |
| Sunsteel Cataphract | IV   | 4     | 3        | ×2 flat       |
| Field Ballista      | I    | 1     | 1        | 0             |
| Light Catapult      | II   | 2     | 1        | 0             |
| Siege Onager        | III  | 3     | 1        | 0             |
| Great Bombard       | IV   | 4     | 1        | 0             |

## Ship roster

| Ship              | Tier | Power / casualty points | Movement | Berths |
| ----------------- | ---- | ----------------------- | -------- | ------ |
| Settler Ship      | I    | 0                       | 2        | 0      |
| Fishing Skiff     | I    | 0                       | 2        | 0      |
| Fishing Cutter    | II   | 1                       | 2        | 0      |
| Deepwater Trawler | III  | 2                       | 3        | 0      |
| Grand Trawler     | IV   | 3                       | 3        | 0      |
| Trading Sloop     | I    | 0                       | 2        | 0      |
| Merchant Cog      | II   | 1                       | 2        | 0      |
| Merchant Galleon  | III  | 2                       | 3        | 0      |
| Treasure Galleon  | IV   | 3                       | 3        | 0      |
| Coastal Transport | I    | 1                       | 3        | 1      |
| Sailing Transport | II   | 2                       | 3        | 2      |
| Ocean Transport   | III  | 3                       | 4        | 3      |
| Royal Transport   | IV   | 4                       | 4        | 4      |
| Cargo Barge       | I    | 1                       | 2        | 2      |
| Convoy Cog        | II   | 2                       | 2        | 4      |
| Convoy Galleon    | III  | 3                       | 2        | 6      |
| Grand Convoy      | IV   | 4                       | 3        | 8      |
| Patrol Galley     | I    | 2                       | 3        | 0      |
| War Galley        | II   | 3                       | 4        | 0      |
| War Frigate       | III  | 5                       | 4        | 0      |
| Royal Frigate     | IV   | 7                       | 5        | 0      |
| Guard Carrack     | I    | 3                       | 1        | 0      |
| Battle Carrack    | II   | 5                       | 2        | 0      |
| Armored Carrack   | III  | 7                       | 2        | 0      |
| Dreadnought       | IV   | 10                      | 2        | 0      |

## All research cards

### Tier I

**Fishing Charter:** Build one free tier-I fishing or merchant ship this turn. Normal coastal placement, town tier and readiness apply.

**Survey Party:** Fund one free tier-I land or sea expedition this turn: reveal ten tiles.

**Road Building:** Build up to three roads or shipping-route segments free this turn.

**Abundant Harvest:** Gain any four raw goods in your home store.

**Local Levy:** Recruit two tier-I infantry or cavalry free this turn. Normal readiness applies.

**Defense Supplies:** Gain two Wood and two Stone. Spend them on defenses or other construction.

**Forced March:** Give one army or fleet +3 movement this turn, even after moving. Points can also fund battles or raids.

**Merchant’s Bargain:** Exchange up to six raw goods for the same number of any raw goods.

### Tier II

**Caravan Charter:** Recruit two free tier-I merchants this turn. They act next turn.

**Masonry Grant:** Waive up to four raw and two processed goods on one city or wall upgrade this turn.

**Supply Network:** Gain any six raw goods in your home store.

**Craftsmen’s Guild:** Gain three processed goods of up to two types.

**Trained Volunteers:** Recruit one free tier-II unit of any class, including a merchant.

**Workshop Grant:** Waive up to four raw and two processed goods on one extension build or upgrade this turn.

**Coastal Charter:** Build one free tier-II ship of any class, including fishing and merchant ships.

**Supply Lines:** Give up to two armies or fleets +3 movement this turn, even after moving. Points can also fund battles or raids.

### Tier III

**Prospecting Survey:** Fund one free tier-II land or sea expedition this turn: reveal twenty tiles.

**Coastal Development:** Build two free tier-II fishing or merchant ships this turn. Normal coastal placement, town tier and readiness apply.

**Industrial Commission:** Waive up to six raw and four processed goods on one extension build or upgrade this turn.

**Veteran Levy:** Recruit one free tier-III unit of any class, including a merchant.

**Naval Commission:** Build one free tier-III ship of any class, including fishing and merchant ships.

**Guild Exchange:** Gain six processed goods of up to three types.

**Coordinated March:** Give up to three armies or fleets +4 movement this turn, even after moving. Points can also fund battles or raids.

**Siege Engineers:** Add three completed siege turns to one legal siege before its operation. Defending armies must be cleared first.

### Tier IV

**Frontier Network:** Build up to six free roads or shipping-route segments and fund one free tier-II expedition this turn: reveal twenty tiles.

**Mass Mobilization:** Recruit four free tier-II land units of any class this turn, including merchants. They act next turn.

**Civic Masterworks:** Waive up to six raw and eight processed goods on one city or wall upgrade this turn.

**Professional Muster:** Recruit one free tier-IV unit or two free tier-III units of any class.

**Admiralty Charter:** Build one free tier-IV ship of any class, including fishing and merchant ships.

**Great Expedition Charter:** Fund one free tier-III land or sea expedition this turn: reveal forty tiles.

**Grand Exchange:** Gain nine processed goods of up to three types.

**Campaign Orders:** Give up to four armies or fleets +5 movement this turn, even after moving, and optionally add two steps to a separate legal siege. Each battle or raid still costs one movement point.

## Guild contracts

### Farmers’ Guild

Fertilize local crops and pastures on demand.

- I: 1 Salt → 6 Grain or Wool from an adjacent clear land tile.

- II: 1 Salt + 1 Coal → 12 local Grain or Wool.

- III: 1 Salt + 1 Coal + 1 Chemicals → 32 local Grain or Wool.

### Extractors’ Guild

Equip local logging and clay crews with better tools.

- I: 1 Iron ore → 6 Wood or Clay from an adjacent clear tile.

- II: 1 Iron ore + 1 Steel → 15 local Wood or Clay.

- III: 1 Steel + 1 Fuel → 36 local Wood or Clay.

### Engineers’ Guild

Equip an adjacent army with siege tools for this turn.

- I: 1 Iron ore: +2 siege power to one entire adjacent army this turn.

- II: 1 Steel: +4 siege power to one entire adjacent army this turn.

- III: 1 Steel + 1 Fuel: +6 siege power to one entire adjacent army this turn. Does not increase battle power.

### Builders’ Guild

Commission roads and shipping routes throughout your realm.

- I: 1 Stone: 2 free road or sea-route builds this turn.

- II: 1 Stone + 1 Coal: 3 free road or sea-route builds this turn.

- III: 1 Blocks + 1 Fuel: 6 free road or sea-route builds this turn. Normal connections and blocking apply.

### Scholars’ Guild

Fund advanced discoveries: choose one of two random cards.

- I: 1 Stone + 1 Salt: one tier-II research discovery.

- II: 1 Rations + 1 Fuel: one tier-III research discovery.

- III: 1 Cloth + 1 Chemicals + 1 Fuel: one tier-IV research discovery. Play the chosen card immediately.

### Prospectors’ Guild

Extract local minerals on demand.

- I: 1 Grain → 6 minerals from an adjacent clear deposit (3 Gold).

- II: 1 Grain + 1 Coal → 9 minerals (5 Gold).

- III: 1 Rations + 1 Fuel → 32 minerals (16 Gold).

### Artisans’ Guild

Manufacture goods without a linked extension.

- I: 2 raw goods → 2 of their processed good.

- II: 2 raw goods + 1 Coal → 5 of their processed good.

- III: 2 raw goods + 1 Fuel → 8 of their processed good.

### Merchants’ Guild

Fulfil better trades once per turn.

- I: Trade 2 ordinary raw goods for 3 of another.

- II: Trade 2 ordinary raw goods for 6 of another.

- III: Trade 2 raw goods for 12 of another, or 1 processed good for 6 of another. Gold and Gold bars excluded.

### Commanders’ Guild

Supply a nearby army for a longer march.

- I: 1 Grain: +2 movement to the entire army on one adjacent hex.

- II: 1 Leather: +3 movement to the entire army on one adjacent hex.

- III: 1 Fuel: +4 movement to the entire army on one adjacent hex.

### Navigators’ Guild

Supply a nearby fleet for a longer voyage.

- I: 1 Salt: +2 movement to the entire fleet on one adjacent water hex.

- II: 1 Cloth: +3 movement to the entire fleet on one adjacent water hex.

- III: 1 Fuel: +4 movement to the entire fleet on one adjacent water hex.

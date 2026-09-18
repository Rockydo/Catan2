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
- The second settlement receives the full printed yield of every adjacent productive tile. For example, Golden fields give 2 Grain and a Whale tile gives 1 Hides plus 1 Oil. Woods initially give Wood. Start with no troops or processed goods.
Each settlement must touch at least one walkable solid land tile. Bare Peaks and Frozen sea do not qualify. At least one empty intersection must separate any two settlements, regardless of owner.
### Turn sequence
- Production: roll two independent six-sided dice. All factions collect production from tiles whose number matches the total. Seven produces normally. There is no robber, discard or stock limit.
- Actions: build, trade, recruit, move, fight, raid, explore, buy research and play cards in any order. Raided goods are immediately available to spend.
- End turn: pass to the next surviving faction. A round is complete when every surviving faction has had a turn.
Held research cards may also be played before rolling, if their conditions allow it. There is no separate military phase.
### Construction access
Camps add raw production along routes. City I doubles each adjacent tile’s printed raw yield and unlocks workshops. A coastal town can build mobile ships; the available tier depends on its level. Research and guilds provide additional effects and resource exchanges. See the relevant chapters for costs and requirements.
### Differences from Catan
The original costs of roads, settlements, City I, sea-route pieces and tier-I development cards are unchanged. There is no robber, pirate, Knight reward, Largest Army reward, Longest Road reward or victory-point card. Pieces, reserve stock and research supplies are unlimited.
Goods are stored in individual towns but spent from a common pool. Armies can raid and destroy towns. Workshops, guilds, research and expeditions add actions. Sea routes connect settlements; fleets are separate moving pieces.

## Map and dice

### Climate generation
The initial map contains 125 tiles in Classic or 250 in Grand campaign. Climate is assigned before terrain. Pick a random starting tile and one of eleven climates with equal probability. Grow outward through neighbors. If all assigned immediate neighbors agree, retain that climate with 85% probability. On a switch, intersect the compatible climates of assigned immediate neighbors only. Destination weights start at 1. From the seven original climates, newly compatible Oceanic, Alpine, Subtropical and Savanna destinations have weight 0.5. Temperate and Steppe favor Cold at 1.5. Mediterranean gives Steppe and Desert weight 0.5. Tropical to Desert, Desert to Tropical and Cold to Arctic have weight 2. Oceanic favors Temperate at 2; Alpine favors Cold and Arctic at 2 each; Subtropical and Savanna favor Tropical at 2. Eligible weights are normalized for each draw. The 85% continuity chance is unchanged. At mixed borders, prefer an existing adjacent compatible climate. If no candidate exists, copy an immediate neighbor.
Before rolling terrain, a final repair pass leaves intermediate compatible climates as buffer zones where needed. Adjacent climates are always compatible. Climate reservations include an unseen collar, so future expeditions cannot create incompatible seams. Revealed terrain never changes. The same seed and discovery sequence reproduce the same world. Different expedition sequences may extend climate zones differently.
Choose land or water using that climate’s ratio, then use its terrain table below. Land percentages are conditional on rolling land. Water checks run in the listed order on remaining water only; the first success ends the sequence. Water tiles with no adjacent land double their climate’s Whale check chance. Fish, Cod and Frozen sea checks stay unchanged and run first. Frozen sea does not count as land. Hidden neighbors use their reserved climates and land rolls; the map edge alone does not qualify as open water. Gold frequency varies by climate. No resource, climate, port, continent or balanced start is guaranteed.
Temperate, Tropical and Desert use 50% land. Cold and Subtropical use 55%, Steppe 65%, Arctic and Mediterranean 40%, Oceanic 35%, Alpine 75% and Savanna 70%. Steppe and Desert are mutually compatible, as are all other listed borders. Oasis food means Grain.
### Climate overview
Use the Climates button beside the map zoom controls to show only climate colors. The legend counts revealed tiles in each climate. Pan, zoom and select tiles as usual; press Climates again to restore the normal map.
### Barren terrain, peaks and ice
Snow plains and Desert produce nothing and have no workshop or camp. Armies can cross them and build normally beside them. Frozen sea is generated by the Arctic water roll. It produces nothing, admits land units and blocks ships. Permanent towns, towers and roads require adjacent solid ground; no route can be built on an edge bordered only by ice. An ice-water edge without land can hold a sea route. Frozen sea never melts.
Bare Peaks produce nothing and are impassable to every unit. Units cannot move through them, recruit onto them, retreat onto them or disembark onto them. Roads may follow their edges under the normal connection rules, including an edge between two peaks. Towns and watchtowers need at least one adjacent walkable solid land tile. No camp or workshop can use Bare Peaks.
### Existing campaigns
Revealed tiles retain their terrain, yields and assigned climate. Saves made before climates existed classify those older tiles as Temperate for future climate borders. Newly explored tiles can use all eleven climates. Start a new campaign to use the new terrain tables throughout the map.
### Tile numbers and dice
Every productive tile receives a uniform random number from 2 through 12, including 7. Dice are two independent d6, so tile numbers are equally common in generation but not equally likely to activate. Dice, terrain, research and rebellion randomness are saved separately. Reloading does not reroll an offer or the map. Hidden coordinates cannot be inspected by players or AI.
### Ports
Eligible fully revealed coastal edges have a 10% port-candidate chance. Ports require open water beside solid land: frozen sea cannot host a port, but snow plains can. Invalid ice ports from older saves are removed on load. Half are generic 3:1 ports; half are specific 2:1 raw-resource ports, excluding Gold and Oil. Ports cannot share an intersection. A town on either end uses the port, unless under siege or its sea tile is blockaded. In older saves, Gold ports are treated as generic ports.
### Setup restrictions
An extreme map may lack enough legal starting sites. The game rejects a seed with insufficient legal starting sites. During setup a placement cannot make it impossible to finish everyone's two settlements. A missing resource alone does not invalidate a map: the reserve can supply it through trade.

## Goods, storage and trade

### Production and storage
There are twelve raw goods and ten processed goods. Towns receive each adjacent matching tile’s printed output multiplied by town level. Golden fields give 2/4/6/8 Grain at town levels 1/2/3/4; Rice fields give 3/6/9/12. Both goods on a dual-output tile are multiplied. Town levels 3 and 4 (City II and City III) also add 1× and 2× the base tile yield as processed goods on each matching tile, without an extension. This bonus is flat, regardless of the tile’s raw yield. A level-4 town beside Golden fields receives 8 Grain + 2 Rations; beside Steppe plain it receives 4 Hides + 4 Wool + 2 Leather + 2 Cloth. Extensions add processed output without consuming or reducing the raw harvest. All players produce on every roll. New buildings and collectors can produce on the next matching roll.
### Storage destinations
Town output stays in that town. Camps and mobile collectors send goods to the nearest owned town, using hex distance to its adjacent land and oldest town ID to break ties. Future output changes destination when towns change; old stocks stay where they are. Trades and research rewards enter your home store, the oldest surviving town. Raids use the operating army's hex to find their destination.
### Paying costs
All warehouses form one spending pool, even during a siege. Each good is debited proportionally across towns, using whole-card largest remainders and town ID for ties. Stores with 8 and 2 Grain pay a five-Grain cost as 4 and 1. You cannot freely relocate a warehouse, choose a sole paying town or change your home store.
### Fish, Oil and Gold
Recipes show Grain and Coal. Pay Grain first, then substitute missing Grain with Fish at 1:1. Pay Coal first, then substitute missing Coal with Oil at 1:1. After these substitutions, each missing raw resource is paid with 1 Gold and each missing processed good with 1 Gold bar. Resources named in the recipe are spent first; Gold and bars explicitly required by a recipe are reserved before covering shortages. This also applies to discounted recipes, guild construction and non-trade guild orders. Gold does not automatically cover processed goods, and bars do not automatically cover raw goods; use reserve trades for those conversions. Explicit player trades, reserve trades, merchant contracts and research exchanges spend exactly the offered goods, without automatic substitution.
### Gold exchange rates
Gold has its own reserve rates: 1 Gold buys 1 raw good; 2 Gold buy 1 processed good. One Gold bar buys 2 raw goods of one type or 1 processed good. These rates need no port. Goldsmiths produce Gold bars. Grain and Fish both make Rations; Coal and Oil both make Fuel through Artisans. Whale-linked extensions make Leather, not Oil or Fuel.
### Trading
Only trades involving the active player are allowed. All 22 goods can be offered in explicit quantities. No gifts, same-good wash trades, buildings or research cards can be traded. AI offers appear as dismissible prompts. Public stockpiles, production, scarcity and each AI's planned needs affect its valuation; bank prices do not fluctuate.
### Reserve and port rates
Default reserve rates: 4 identical raw → 1 different raw; 6 identical raw → 1 processed; 4 identical processed → 1 different processed; 2 identical processed → 1 raw. A generic port improves only raw-to-raw exchange to 3:1. A matching specific port improves it to 2:1. Gold rates take precedence. Any good can be imported even if absent from the map. There is no free raw-to-processed crafting action.
### Occupation and blockades
An enemy armed land unit blocks ordinary town, extension and camp output from its tile. It does not block its own or allied production. Enemy fleets block ordinary Fish and Whale production, including fishing ships harvesting that tile. Land merchants and merchant ships ignore production blockades on covered tiles. Land merchants cannot blockade, protect a town or attack.
### Construction under occupation
Enemy occupation prevents new towns beside it and roads bordering it. Camps only need their linked side clear. Existing roads remain until destroyed. A besieged town cannot upgrade, recruit, build extensions or walls, operate guilds, launch fleets or expeditions, or use a port. Its goods stay spendable and its other unoccupied adjacent tiles still produce.
### Woods harvest choice
Each faction chooses Wood or Hides separately for each Woods tile it harvests. Default: Wood. Select the tile and change the choice during your action phase. The choice applies to all your towns, camps and collectors covering that tile, on subsequent rolls. It does not change opponents’ choices or stored goods. A workshop’s resource is fixed when built; later switches do not change its product or upgrade recipe. Steppe, Seal grounds and Oasis produce both listed goods automatically.


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
Fishing ships collect Fish, Cod and Whales from their own tile and connected water within 1/2/3/4 steps at tiers I/II/III/IV. Count the shortest water route, not straight-line distance: land and ice cannot be crossed, and unrevealed tiles are outside coverage. Merchant ships collect from all adjacent land tiles, including enemy-occupied or rival-used land, but never Fish or Whales. Each matching tile’s full base yield is multiplied by ship tier. Cod gives 2 Fish per tier; Whales give 1 Hides and 1 Oil per tier. Tier-III/IV merchant ships also add 1×/2× the base tile yield as processed goods on each matching covered tile, without consuming raw output. Fishing ships do not produce processed goods. Output goes directly to the nearest owned town. Collectors can produce immediately after construction. There is no collector limit per tile or cargo capacity for goods.
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
The AI pursues sole victory, using public power, income, military reach and terrain. It protects exposed towns, expands toward useful resources, builds industry, buys tools when useful and seeks winning battles or raids. It ranks raid targets by exposed stocks, production, siege delay and the owner’s strength. It leaves small siege or blockade detachments while surplus troops continue attacking. Nearby forces reinforce defensible towns; a garrison that cannot match an overwhelming leader may keep a delaying guard and send counter-raiders. Offensive investment increases through the middle and late game. Advanced collectors are valuable naval raid targets. Armies with no viable land assault can leave a blockade to reach transports or a usable frontier. Transports can bypass blocked land routes, and eligible factions can fund border expeditions to seek new approaches. Eligible AI considers expeditions from its third or fourth turn, checking every turn when production gaps, confinement or a large power deficit justify them. It values frontiers by visible climates and expected missing-resource yields, with Fish counted as Grain and Oil as Coal. It compares reveal directions to approach nearby enemies, can build toward a useful frontier, and may fund exploration before adding more reserve troops once it has a basic field army. Immediate town defense retains priority. It does not inspect hidden terrain or reserved climates. The strongest AI remains barred from expeditions. Artillery can attack fleets. Easy, Standard and Hard change planning breadth, not costs, dice or free resources.
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


## Climate tables

### Temperate: 50% land / 50% water

Compatible : Steppe, Mediterranean, Cold, Tropical, Oceanic, Alpine, Subtropical

Transition weights : Steppe ×1, Mediterranean ×1, Cold ×1.5, Tropical ×1, Oceanic ×0.5, Alpine ×0.5, Subtropical ×0.5

| Land terrain | Conditional chance |

|---|---|

| Golden fields | 17% |

| Pasture | 17% |

| Woods | 17% |

| Gold mountains | 5% |

| Clay hills | 12% |

| Stone quarry | 10% |

| Iron mountains | 10% |

| Coal hills | 10% |

| Salt flats | 2% |

| Water terrain | Sequential check | Effective water share |

|---|---|---|

| Fishing grounds | 15% | 15% |

| Whale grounds | 5% | 4.25% |

| Water |  | 80.75% |

Open water (no adjacent land): Whale check 10%; effective share 8.5%. Table above: coastal water.

### Cold: 55% land / 45% water

Compatible : Temperate, Steppe, Arctic, Oceanic, Alpine

Transition weights : Temperate ×1, Steppe ×1, Arctic ×2, Oceanic ×0.5, Alpine ×0.5

| Land terrain | Conditional chance |

|---|---|

| Forest | 30% |

| Hunting forest | 10% |

| Rough fields | 10% |

| Rough pasture | 5% |

| Gold mountains | 5% |

| Coal hills | 10% |

| Iron mountains | 10% |

| Stone quarry | 10% |

| Clay hills | 10% |

| Water terrain | Sequential check | Effective water share |

|---|---|---|

| Fishing grounds | 20% | 20% |

| Cod grounds | 10% | 8% |

| Whale grounds | 10% | 7.2% |

| Water |  | 64.8% |

Open water (no adjacent land): Whale check 20%; effective share 14.4%. Table above: coastal water.

### Arctic: 40% land / 60% water

Compatible : Cold, Alpine

Transition weights : Cold ×1, Alpine ×0.5

| Land terrain | Conditional chance |

|---|---|

| Snow plain | 40% |

| Seal hunting grounds | 15% |

| Arctic iron mountains | 20% |

| Arctic stone ridge | 15% |

| Arctic gold mountains | 10% |

| Water terrain | Sequential check | Effective water share |

|---|---|---|

| Frozen sea | 30% | 30% |

| Fishing grounds | 20% | 14% |

| Cod grounds | 20% | 11.2% |

| Whale grounds | 20% | 8.96% |

| Water |  | 35.84% |

Open water (no adjacent land): Whale check 40%; effective share 17.92%. Table above: coastal water.

### Steppe: 65% land / 35% water

Compatible : Cold, Temperate, Mediterranean, Desert, Alpine, Savanna

Transition weights : Cold ×1.5, Temperate ×1, Mediterranean ×1, Desert ×1, Alpine ×0.5, Savanna ×0.5

| Land terrain | Conditional chance |

|---|---|

| Steppe plain | 40% |

| Rough fields | 15% |

| Pasture | 10% |

| Woods | 7% |

| Stone quarry | 10% |

| Iron mountains | 5% |

| Coal hills | 5% |

| Clay hills | 5% |

| Gold mountains | 3% |

| Water terrain | Sequential check | Effective water share |

|---|---|---|

| Fishing grounds | 15% | 15% |

| Whale grounds | 5% | 4.25% |

| Water |  | 80.75% |

Open water (no adjacent land): Whale check 10%; effective share 8.5%. Table above: coastal water.

### Mediterranean: 40% land / 60% water

Compatible : Temperate, Steppe, Desert, Oceanic, Subtropical

Transition weights : Temperate ×1, Steppe ×0.5, Desert ×0.5, Oceanic ×0.5, Subtropical ×0.5

| Land terrain | Conditional chance |

|---|---|

| Golden fields | 5% |

| Olive grove | 20% |

| Escarpment | 20% |

| Woods | 5% |

| Rough pasture | 15% |

| Salt flats | 5% |

| Gold mountains | 7% |

| Coal hills | 10% |

| Iron mountains | 13% |

| Water terrain | Sequential check | Effective water share |

|---|---|---|

| Fishing grounds | 15% | 15% |

| Whale grounds | 5% | 4.25% |

| Water |  | 80.75% |

Open water (no adjacent land): Whale check 10%; effective share 8.5%. Table above: coastal water.

### Tropical: 50% land / 50% water

Compatible : Temperate, Desert, Subtropical, Savanna

Transition weights : Temperate ×1, Desert ×2, Subtropical ×0.5, Savanna ×0.5

| Land terrain | Conditional chance |

|---|---|

| Jungle | 25% |

| Tropical woods | 10% |

| Rice field | 25% |

| Clay hills | 15% |

| Gold mountains | 5% |

| Stone quarry | 5% |

| Coal hills | 5% |

| Iron mountains | 5% |

| Salt flats | 5% |

| Water terrain | Sequential check | Effective water share |

|---|---|---|

| Fishing grounds | 10% | 10% |

| Whale grounds | 5% | 4.5% |

| Water |  | 85.5% |

Open water (no adjacent land): Whale check 10%; effective share 9%. Table above: coastal water.

### Desert: 50% land / 50% water

Compatible : Tropical, Mediterranean, Steppe, Savanna

Transition weights : Tropical ×2, Mediterranean ×1, Steppe ×1, Savanna ×0.5

| Land terrain | Conditional chance |

|---|---|

| Desert | 30% |

| Gold mountains | 10% |

| Iron mountains | 12% |

| Stone quarry | 12% |

| Coal hills | 6% |

| Oasis | 10% |

| Salt flats | 20% |

| Water terrain | Sequential check | Effective water share |

|---|---|---|

| Fishing grounds | 8% | 8% |

| Whale grounds | 3% | 2.76% |

| Water |  | 89.24% |

Open water (no adjacent land): Whale check 6%; effective share 5.52%. Table above: coastal water.

### Oceanic: 35% land / 65% water

Compatible : Temperate, Cold, Mediterranean

Transition weights : Temperate ×2, Cold ×1, Mediterranean ×1

| Land terrain | Conditional chance |

|---|---|

| Coastal pasture | 25% |

| Woods | 20% |

| Rough fields | 10% |

| Golden fields | 5% |

| Clay hills | 10% |

| Coastal cliffs | 15% |

| Coal hills | 8% |

| Iron mountains | 5% |

| Gold mountains | 2% |

| Water terrain | Sequential check | Effective water share |

|---|---|---|

| Fishing grounds | 20% | 20% |

| Cod grounds | 10% | 8% |

| Whale grounds | 10% | 7.2% |

| Water |  | 64.8% |

Open water (no adjacent land): Whale check 20%; effective share 14.4%. Table above: coastal water.

### Alpine: 75% land / 25% water

Compatible : Cold, Arctic, Temperate, Steppe

Transition weights : Cold ×2, Arctic ×2, Temperate ×1, Steppe ×1

| Land terrain | Conditional chance |

|---|---|

| Mountain quarry | 20% |

| Iron mountains | 15% |

| Coal hills | 10% |

| Alpine pasture | 15% |

| Rough fields | 10% |

| Forest | 10% |

| Gold mountains | 5% |

| Clay hills | 5% |

| Bare Peaks | 10% |

| Water terrain | Sequential check | Effective water share |

|---|---|---|

| Fishing grounds | 10% | 10% |

| Cod grounds | 10% | 9% |

| Whale grounds | 3% | 2.43% |

| Water |  | 78.57% |

Open water (no adjacent land): Whale check 6%; effective share 4.86%. Table above: coastal water.

### Subtropical: 55% land / 45% water

Compatible : Tropical, Temperate, Mediterranean, Savanna

Transition weights : Tropical ×2, Temperate ×1, Mediterranean ×1, Savanna ×1

| Land terrain | Conditional chance |

|---|---|

| Alluvial clay banks | 25% |

| Rice field | 20% |

| River woods | 20% |

| Jungle | 10% |

| Stone quarry | 10% |

| Coal hills | 5% |

| Iron mountains | 5% |

| Salt flats | 3% |

| Gold mountains | 2% |

| Water terrain | Sequential check | Effective water share |

|---|---|---|

| Fishing grounds | 15% | 15% |

| Whale grounds | 3% | 2.55% |

| Water |  | 82.45% |

Open water (no adjacent land): Whale check 6%; effective share 5.1%. Table above: coastal water.

### Savanna: 70% land / 30% water

Compatible : Tropical, Desert, Steppe, Subtropical

Transition weights : Tropical ×2, Desert ×1, Steppe ×1, Subtropical ×1

| Land terrain | Conditional chance |

|---|---|

| Wildlife grassland | 35% |

| Rough fields | 20% |

| Dry woodland | 10% |

| Rough pasture | 10% |

| Iron mountains | 10% |

| Clay hills | 5% |

| Stone quarry | 5% |

| Gold mountains | 3% |

| Salt flats | 2% |

| Water terrain | Sequential check | Effective water share |

|---|---|---|

| Fishing grounds | 10% | 10% |

| Whale grounds | 3% | 2.7% |

| Water |  | 87.3% |

Open water (no adjacent land): Whale check 6%; effective share 5.4%. Table above: coastal water.

## Terrain yields

| Terrain | Base yield | Family |

|---|---|---|

| Woods | 1 Wood OR 1 Hides | forest |

| Forest | 2 Wood | forest |

| Hunting forest | 2 Hides | forest |

| Golden fields | 2 Grain | flat |

| Pasture | 2 Wool | flat |

| Rough fields | 1 Grain | flat |

| Rough pasture | 1 Wool | rugged |

| Clay hills | 1 Clay | rugged |

| Gold mountains | 1 Gold | rugged |

| Iron mountains | 1 Iron ore | rugged |

| Stone quarry | 1 Stone | rugged |

| Coal hills | 1 Coal | rugged |

| Salt flats | 1 Salt | flat |

| Snow plain | 0 | flat |

| Seal hunting grounds | 1 Hides + 1 Oil | flat |

| Arctic iron mountains | 1 Iron ore | rugged |

| Arctic stone ridge | 1 Stone | rugged |

| Arctic gold mountains | 1 Gold | rugged |

| Steppe plain | 1 Hides + 1 Wool | flat |

| Olive grove | 1 Grain | forest |

| Escarpment | 1 Stone | rugged |

| Jungle | 1 Hides | forest |

| Tropical woods | 1 Wood | forest |

| Rice field | 3 Grain | flat |

| Desert | 0 | flat |

| Oasis | 1 Wood + 1 Grain | forest |

| Water | 0 | water |

| Fishing grounds | 1 Fish | water |

| Cod grounds | 2 Fish | water |

| Whale grounds | 1 Hides + 1 Oil | water |

| Frozen sea | 0 | flat |

| Coastal pasture | 2 Wool | flat |

| Coastal cliffs | 1 Stone | rugged |

| Mountain quarry | 2 Stone | rugged |

| Alpine pasture | 1 Wool | rugged |

| Bare Peaks | 0 | rugged |

| Alluvial clay banks | 2 Clay | flat |

| River woods | 1 Wood | forest |

| Wildlife grassland | 2 Hides | flat |

| Dry woodland | 1 Wood | forest |

Bare Peaks: no production and no unit entry, including recruitment, retreat or disembarkation. Roads may follow their edges; towns need adjacent walkable solid land.

## All costs

Prices are paid per construction or upgrade step. Watchtower I offers two alternative payments: 2 Wood OR 2 Stone.

| Recipe | Cost |

|---|---|

| Road | 1 Wood + 1 Clay |

| Settlement | 1 Wood + 1 Clay + 1 Wool + 1 Grain |

| City I / level 2 | 3 Iron ore + 2 Grain |

| Seafarers route ship | 1 Wood + 1 Wool |

| Tier-I research | 1 Iron ore + 1 Wool + 1 Grain |

| City II / level 3 | 3 Iron ore + 3 Grain + 3 Blocks + 2 Pottery |

| City III / level 4 | 5 Blocks + 4 Planks + 4 Pottery + 3 Cloth + 2 Chemicals |

| Sawmill I | 2 Wood + 1 Iron ore + 1 Stone |

| Sawmill II | 2 Planks + 2 Steel + 1 Wood |

| Sawmill III | 4 Planks + 3 Steel + 2 Fuel |

| Kiln I | 2 Clay + 1 Coal + 1 Stone |

| Kiln II | 2 Pottery + 2 Fuel + 1 Clay |

| Kiln III | 4 Pottery + 3 Fuel + 2 Blocks |

| Weaver I | 2 Wool + 1 Wood + 1 Salt |

| Weaver II | 2 Cloth + 1 Wool + 2 Pottery |

| Weaver III | 4 Cloth + 2 Leather + 3 Chemicals |

| Forge I | 2 Iron ore + 1 Coal + 1 Stone |

| Forge II | 2 Steel + 2 Fuel + 1 Iron ore |

| Forge III | 4 Steel + 3 Fuel + 2 Chemicals |

| Stoneworks I | 2 Stone + 1 Iron ore + 1 Wood |

| Stoneworks II | 2 Blocks + 2 Steel + 1 Stone |

| Stoneworks III | 4 Blocks + 3 Steel + 2 Planks |

| Tannery I | 2 Hides + 1 Salt + 1 Clay |

| Tannery II | 2 Leather + 2 Chemicals + 1 Hides |

| Tannery III | 4 Leather + 3 Chemicals + 2 Pottery |

| Hillguard | 1 Grain + 2 Iron ore |

| Iron Sentinel | 2 Steel + 1 Leather + 1 Rations |

| Granite Praetorian | 3 Steel + 2 Leather + 2 Fuel + 1 Rations |

| Brushrunner | 1 Grain + 1 Wool + 1 Hides |

| Thorn Ranger | 2 Leather + 1 Rations + 1 Cloth |

| Veil Warden | 3 Leather + 2 Cloth + 1 Chemicals + 2 Rations |

| Outrider | 2 Grain + 2 Hides |

| Lancer | 2 Leather + 1 Cloth + 2 Rations |

| Sunsteel Cataphract | 3 Steel + 3 Leather + 2 Cloth + 2 Rations |

| Field Ballista | 2 Wood + 1 Iron ore + 1 Hides |

| Siege Onager | 2 Planks + 1 Steel + 2 Leather |

| Great Bombard | 3 Planks + 3 Steel + 3 Chemicals + 3 Fuel |

| Palisade | 1 Wood |

| Stone Curtain | 3 Stone |

| Bastion | 3 Blocks |

| Citadel Ring | 4 Blocks + 2 Steel |

| Land expedition I · Reconnaissance | 2 Grain + 1 Wood + 1 Hides |

| Sea expedition I · Reconnaissance | 2 Grain + 2 Wood + 1 Salt |

| Land expedition II · Survey | 3 Rations + 2 Leather + 2 Pottery |

| Sea expedition II · Survey | 3 Rations + 2 Cloth + 3 Planks |

| Land expedition III · Great Expedition | 5 Rations + 4 Leather + 2 Chemicals + 3 Pottery |

| Sea expedition III · Great Expedition | 5 Rations + 4 Planks + 3 Cloth + 4 Chemicals |

| Lumber camp | 1 Hides + 1 Iron ore |

| Lumber camp II | 2 Steel + 2 Leather |

| Brick camp | 1 Stone + 1 Iron ore |

| Brick camp II | 2 Blocks + 1 Steel |

| Wool camp | 1 Stone + 1 Grain |

| Wool camp II | 2 Cloth + 1 Leather |

| Grain camp | 1 Iron ore + 1 Hides |

| Grain camp II | 2 Rations + 2 Pottery |

| Ore camp | 1 Wood + 1 Hides |

| Ore camp II | 2 Planks + 1 Fuel + 2 Chemicals |

| Stone camp | 1 Iron ore + 1 Hides |

| Stone camp II | 2 Steel + 1 Fuel |

| Hides camp | 1 Salt + 1 Stone |

| Hides camp II | 2 Leather + 1 Chemicals |

| Salt camp | 1 Clay + 1 Coal |

| Salt camp II | 2 Pottery + 1 Fuel + 1 Blocks |

| Coal camp | 1 Wood + 1 Stone |

| Coal camp II | 2 Blocks + 1 Leather + 2 Fuel |

| Bakery I | 2 Grain + 1 Salt + 1 Clay |

| Bakery II | 2 Rations + 2 Pottery + 1 Grain |

| Bakery III | 4 Rations + 3 Pottery + 2 Cloth |

| Chemical works I | 2 Salt + 1 Coal + 1 Clay |

| Chemical works II | 2 Chemicals + 2 Pottery + 1 Salt |

| Chemical works III | 4 Chemicals + 3 Pottery + 2 Fuel |

| Fuel works I | 2 Coal + 1 Stone + 1 Clay |

| Fuel works II | 2 Fuel + 2 Blocks + 1 Coal |

| Fuel works III | 4 Fuel + 3 Blocks + 2 Steel |

| Spearguard | 1 Steel + 2 Grain |

| Trail Scout | 1 Leather + 1 Wool + 1 Grain |

| Horseman | 1 Leather + 2 Grain + 1 Hides |

| Light Catapult | 2 Wood + 1 Iron ore + 1 Blocks |

| Gold camp | 1 Iron ore + 1 Hides |

| Gold camp II | 2 Steel + 1 Planks |

| Fish camp | 1 Wool + 1 Salt |

| Fish camp II | 2 Cloth + 1 Planks |

| Goldsmith I | 2 Iron ore + 1 Coal + 1 Stone |

| Goldsmith II | 2 Steel + 2 Pottery |

| Goldsmith III | 3 Steel + 3 Fuel + 2 Blocks |

| Smokehouse I | 2 Salt + 1 Coal + 1 Stone |

| Smokehouse II | 2 Pottery + 1 Fuel + 1 Salt |

| Smokehouse III | 3 Pottery + 3 Fuel + 2 Planks |

| Peddler | 2 Hides + 1 Wool + 2 Grain |

| Trader | 2 Leather + 2 Wool + 2 Grain |

| Caravan Master | 3 Leather + 2 Cloth + 3 Rations |

| Merchant Prince | 4 Leather + 3 Cloth + 4 Rations + 1 Gold bars |

| Coastal Transport | 2 Wood + 1 Wool + 1 Hides |

| Sailing Transport | 3 Wood + 2 Cloth + 1 Hides |

| Ocean Transport | 3 Planks + 2 Cloth + 2 Leather |

| Royal Transport | 4 Planks + 3 Cloth + 3 Leather + 2 Steel |

| Cargo Barge | 3 Wood + 1 Wool + 2 Hides |

| Convoy Cog | 4 Wood + 3 Leather + 1 Wool |

| Convoy Galleon | 4 Planks + 3 Leather + 2 Cloth |

| Grand Convoy | 5 Planks + 4 Leather + 3 Cloth + 2 Steel |

| Patrol Galley | 2 Wood + 2 Iron ore + 1 Wool |

| War Galley | 3 Wood + 2 Steel + 1 Wool |

| War Frigate | 3 Planks + 3 Steel + 2 Cloth |

| Royal Frigate | 4 Planks + 4 Steel + 3 Cloth + 2 Fuel |

| Guard Carrack | 3 Wood + 3 Iron ore + 1 Coal |

| Battle Carrack | 4 Wood + 3 Steel + 1 Coal |

| Armored Carrack | 4 Planks + 4 Steel + 2 Blocks |

| Dreadnought | 5 Planks + 5 Steel + 3 Blocks + 3 Fuel |

| Fishing Skiff | 2 Wood + 2 Wool + 1 Salt |

| Fishing Cutter | 3 Wood + 2 Cloth + 1 Salt |

| Deepwater Trawler | 3 Planks + 3 Cloth + 2 Pottery |

| Grand Trawler | 4 Planks + 4 Cloth + 3 Pottery + 2 Chemicals |

| Trading Sloop | 2 Wood + 1 Wool + 2 Hides |

| Merchant Cog | 3 Wood + 2 Leather + 1 Wool |

| Merchant Galleon | 3 Planks + 2 Cloth + 3 Leather |

| Treasure Galleon | 4 Planks + 3 Cloth + 4 Leather + 1 Gold bars |

| Watchtower 1 | 2 Wood |

| Watchtower 2 | 2 Stone + 1 Iron ore |

| Watchtower 3 | 2 Stone + 1 Steel |

| Watchtower 4 | 2 Blocks + 1 Steel |

| Research I · Practical Knowledge | 1 Grain + 1 Wool + 1 Iron ore |

| Research II · Guild Knowledge | 1 Stone + 1 Salt + 1 Cloth |

| Research III · Engineering | 2 Pottery + 1 Rations + 1 Fuel |

| Research IV · Statecraft | 2 Cloth + 2 Chemicals + 2 Fuel |

| Watchtower 1 · Stone | 2 Stone |

| Prospectors' Guild I | 3 Stone + 2 Hides + 1 Iron ore |

| Prospectors' Guild II | 4 Stone + 2 Coal + 2 Leather |

| Prospectors' Guild III | 4 Blocks + 2 Fuel + 3 Steel |

| Artisans' Guild I | 3 Stone + 2 Coal + 1 Clay |

| Artisans' Guild II | 4 Stone + 2 Coal + 2 Planks |

| Artisans' Guild III | 4 Blocks + 2 Fuel + 3 Chemicals |

| Merchants' Guild I | 3 Stone + 2 Salt + 1 Hides |

| Merchants' Guild II | 4 Stone + 2 Coal + 2 Cloth |

| Merchants' Guild III | 4 Blocks + 2 Fuel + 3 Leather |

| Commanders' Guild I | 3 Stone + 2 Iron ore + 1 Grain |

| Commanders' Guild II | 4 Stone + 2 Coal + 2 Steel |

| Commanders' Guild III | 4 Blocks + 2 Fuel + 3 Steel |

| Navigators' Guild I | 3 Stone + 2 Salt + 1 Wood |

| Navigators' Guild II | 4 Stone + 2 Coal + 2 Cloth |

| Navigators' Guild III | 4 Blocks + 2 Fuel + 3 Planks |

| Farmers' Guild I | 3 Stone + 2 Salt + 1 Coal |

| Farmers' Guild II | 4 Stone + 2 Coal + 2 Chemicals |

| Farmers' Guild III | 4 Blocks + 2 Fuel + 3 Chemicals |

| Extractors' Guild I | 3 Stone + 2 Iron ore + 1 Hides |

| Extractors' Guild II | 4 Stone + 2 Coal + 2 Steel |

| Extractors' Guild III | 4 Blocks + 2 Fuel + 3 Steel |

| Engineers' Guild I | 3 Stone + 2 Iron ore + 1 Coal |

| Engineers' Guild II | 4 Stone + 2 Coal + 2 Steel |

| Engineers' Guild III | 4 Blocks + 2 Fuel + 3 Steel |

| Builders' Guild I | 3 Stone + 2 Wood + 1 Clay |

| Builders' Guild II | 4 Stone + 2 Coal + 2 Planks |

| Builders' Guild III | 4 Blocks + 2 Fuel + 3 Planks |

| Scholars' Guild I | 3 Stone + 2 Wool + 1 Salt |

| Scholars' Guild II | 4 Stone + 2 Coal + 2 Chemicals |

| Scholars' Guild III | 4 Blocks + 2 Fuel + 3 Cloth |

| Settlers | 2 Hides + 2 Wool + 3 Grain + 1 Wood + 1 Clay |

| Settler Ship | 3 Wood + 2 Wool + 2 Hides + 1 Clay + 1 Grain |

## Land roster

| Unit | Tier | Power | Movement | Terrain bonus |

|---|---|---|---|---|

| Settlers | I | 0 | 1 | 0 |

| Peddler | I | 0 | 1 | 0 |

| Trader | II | 0 | 1 | 0 |

| Caravan Master | III | 0 | 1 | 0 |

| Merchant Prince | IV | 0 | 1 | 0 |

| Hillguard | I | 1 | 1 | ×2 rugged |

| Spearguard | II | 2 | 1 | ×2 rugged |

| Iron Sentinel | III | 3 | 1 | ×2 rugged |

| Granite Praetorian | IV | 4 | 1 | ×2 rugged |

| Brushrunner | I | 1 | 2 | ×2 forest |

| Trail Scout | II | 2 | 2 | ×2 forest |

| Thorn Ranger | III | 3 | 2 | ×2 forest |

| Veil Warden | IV | 4 | 2 | ×2 forest |

| Outrider | I | 1 | 3 | ×2 flat |

| Horseman | II | 2 | 3 | ×2 flat |

| Lancer | III | 3 | 3 | ×2 flat |

| Sunsteel Cataphract | IV | 4 | 3 | ×2 flat |

| Field Ballista | I | 1 | 1 | 0 |

| Light Catapult | II | 2 | 1 | 0 |

| Siege Onager | III | 3 | 1 | 0 |

| Great Bombard | IV | 4 | 1 | 0 |

## Ship roster

| Ship | Tier | Power / casualty points | Movement | Berths |

|---|---|---|---|---|

| Settler Ship | I | 0 | 2 | 0 |

| Fishing Skiff | I | 0 | 2 | 0 |

| Fishing Cutter | II | 1 | 2 | 0 |

| Deepwater Trawler | III | 2 | 3 | 0 |

| Grand Trawler | IV | 3 | 3 | 0 |

| Trading Sloop | I | 0 | 2 | 0 |

| Merchant Cog | II | 1 | 2 | 0 |

| Merchant Galleon | III | 2 | 3 | 0 |

| Treasure Galleon | IV | 3 | 3 | 0 |

| Coastal Transport | I | 1 | 3 | 1 |

| Sailing Transport | II | 2 | 3 | 2 |

| Ocean Transport | III | 3 | 4 | 3 |

| Royal Transport | IV | 4 | 4 | 4 |

| Cargo Barge | I | 1 | 2 | 2 |

| Convoy Cog | II | 2 | 2 | 4 |

| Convoy Galleon | III | 3 | 2 | 6 |

| Grand Convoy | IV | 4 | 3 | 8 |

| Patrol Galley | I | 2 | 3 | 0 |

| War Galley | II | 3 | 4 | 0 |

| War Frigate | III | 5 | 4 | 0 |

| Royal Frigate | IV | 7 | 5 | 0 |

| Guard Carrack | I | 3 | 1 | 0 |

| Battle Carrack | II | 5 | 2 | 0 |

| Armored Carrack | III | 7 | 2 | 0 |

| Dreadnought | IV | 10 | 2 | 0 |

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

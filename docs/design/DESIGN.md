> Historical design notes. For current player rules, use [the complete reference](../rules/en.md) or the interactive in-game guide.

# Catane: Frontiers

Grand campaigns · Rules and design v2.7 · 17 September 2026

Build a productive realm, specialize its industries, explore an unpredictable archipelago and eliminate rival towns. This document matches the game, including fisheries, Gold, watchtowers and mobile merchants.

**1. What stays, what changes, and terminology**

Preserve two six-sided dice, production for every player on every roll, building on vertices, routes on edges, the settlement distance rule, trading with the active player, and the original costs for roads, settlements, the first city upgrade, edge route ships, and first-tier development/research cards. Roads and shipping routes must extend a player’s own network. Either type can connect directly to an owned road, shipping route, settlement or city; no coastal town is required where road and sea routes meet. Initial placement uses the normal two-settlement snake draft and resources from the second settlement. These foundations follow the [official base rulebook](https://www.catan.com/sites/default/files/2025-03/CN3081%20CATAN%E2%80%93The%20Game%20Rulebook%20secure%20%281%29.pdf) and [official Seafarers rulebook](https://www.catan.com/sites/default/files/2025-03/CN3083%20CATAN%E2%80%93Seafarers%20Rulebook%202025%20secured%20reduced.pdf).

Explicit changes needed for this version:

- No victory points, Longest Road reward, Largest Army reward, robber, pirate, desert, seven-discard rule, or knight cards. Seven produces normally. No scenario rewards. Gold is a stored, tradable resource rather than a choose-any-resource production tile. There are twelve raw goods (including Fish and Oil) and ten processed goods.
- Unlimited bank stock and building pieces, appropriate to an expanding digital map. Research draws from unlimited random catalogues. Players have no inventory limit.
- Mobile fleets supplement Seafarers’ edge-based shipping routes. They are different game pieces with different jobs.
- New rules for local storage, armies, whole-unit casualties, siege, industry, exploration, and elimination are specified here; these are deliberate additions rather than claims about vanilla Catan.

**Level 1 = settlement; level 2 = city I; level 3 = city II; level 4 = city III.** This implements two upgrades beyond the vanilla city, three extension tiers, and the siege progression described in the brief. An unqualified “town” below means any of these four levels.

After rolling, there is one shared action phase: trade, build, recruit, research, explore and command armies or fleets in any order. Raided goods may be spent immediately, before ending that same turn. There is no separate military-phase button or irreversible switch. New recruits still cannot act until their next owner turn.

A **turn** is one player’s turn. A **round** is one turn for each surviving player. Movement, recruitment, and siege timers count the acting owner’s turns. Production happens on everyone’s turns. A **unit** is one combat or merchant piece, not an army; one transport berth carries one unit of any tier. “Tile ownership” is not exclusive: several players can produce from one tile. Hostility blocks production separately for each owner.

**2. Map generation, setup, and victory**

Choose **Classic: five factions and 110 initial tiles**, or **Grand campaign: ten factions and 220 initial tiles**. All other rules and prices are shared. Each surviving faction rolls once per round, so ten-player rounds naturally offer more production rolls between your turns. Generate the selected number of hexes in a compact, roughly circular footprint. On an axial grid, select coordinates in increasing hex distance from the origin; seed-based ordering breaks ties on the final ring. Shape selection must not inspect terrain or numbers.

For each coordinate independently:

1. Water with probability 50%; land with probability 50%.
2. On land, the nine original land resources each have weight 1; Gold has weight 0.5. Thus each ordinary land type has probability 1/9.5 given land, and Gold has probability 0.5/9.5. Across all tiles this is about 5.263% per ordinary resource and 2.632% Gold. Fish is never selected as land.
3. Assign a uniformly random integer from 2 through 12, including 7. A coastal water hex (at least one land neighbour) has a 15% chance of Fish; non-coastal water (all six neighbours are water) has a 10% chance. After Fish, each remaining water hex gets an independent Whale roll: 5% on the coast, 10% offshore. Whales never replace Fish. Thus Whales occupy 4.25% of all coastal water and 9% of all non-coastal water on average. Separate seeded resource rolls do not alter terrain or numbers. Coastal eligibility for newly generated tiles uses the same fixed coordinate-based terrain generator for all six neighbours, so revealing tiles in a different order cannot reroll a fishery. Already revealed terrain takes precedence in older campaigns whose original generator differed. Fish and Whales remain water for movement and battle; both show a production number. Whales yield both Hides and Oil on every matching production roll; there is no separate Whale inventory good. Empty water produces nothing. Already revealed tiles are never rerolled when exploring; these new odds apply to new campaigns and newly revealed expedition tiles.

Number assignment is uniform; the production roll remains 2d6. Thus seven activates six times as often as two. There are no guarantees about resources, number distribution, continents, accessible seas, or starting balance. Do not reroll a tile to make its neighbors look natural. Render coasts and vegetation attractively without changing the generated type.

Use independent seeded random streams for terrain, resource, number, and ports. Coordinate-based generation makes an unrevealed hex stable regardless of which player reveals it. Players and AI cannot inspect those hidden values. Save the seed and generation-version number.

Generate printed trade harbors on fully revealed coastal edges: each eligible edge has a 10% harbor candidate chance, half generic 3:1 and half a uniformly selected raw-resource-specific 2:1 harbor, excluding Gold and Oil. Resolve candidates in fixed coordinate order and reject ones sharing a vertex with an existing harbor. Exploration preserves existing harbors except for the correction of retired Gold harbors to generic harbors. Gold never appears as a specialized harbor; existing Gold harbors become generic 3:1 harbors when loading a saved campaign. Its dedicated bank rates are independent of ports. A harbor benefits a town on either endpoint. Ports are not guaranteed. Raw land/resource generation is unaffected.

Classic drafts in order 1–2–3–4–4–3–2–1. Grand campaign drafts 1–2–3–4–5–6–7–8–8–7–6–5–4–3–2–1. Each placement is a settlement plus an adjacent road or eligible Seafarers route ship. Require at least one revealed land hex at its vertex and obey the distance rule. The second settlement grants one raw card from each adjacent revealed productive hex, including Fish, and both one Hides and one Oil from Whales, stored there. No free military units or processed goods. Players can inspect the entire initial revealed map before choosing.

An extreme seed may not permit the required eight or sixteen legal starting settlements: for example, an all-water map. Report “unstartable seed” and retain that seed for inspection. Offer a separately requested new seed; never silently repair or regenerate it. Resource absence alone never invalidates a map, because bank imports remain available. The generator must test existence of a legal placement set for the selected faction count; the draft UI must reject a choice only if it would leave too few legal placements to finish setup, and show why.

**Victory is elimination of every rival’s towns.** A player with no settlements or cities is eliminated immediately; their remaining armies, fleets, roads, route ships, camps, cards, and stores are removed. There are no mobile settlers who can resurrect an eliminated player. Last remaining player wins. Surrender is an explicit alternative to playing out a lost position.

This gives “dominate the map” a finite meaning on an unbounded world: destroy all rival holdings, including colonies founded through expeditions. Empty land and undiscovered coordinates do not need occupation. Literal occupation of an infinite map would have no reachable victory condition. There is no automatic turn limit or territorial-score victory.

**3. The twenty-two goods**

Use these plain display names throughout the interface. Grain and Fish both produce Rations; Oil substitutes for Coal and can be refined into Fuel through Artisans. Whale-linked city extensions remain Tanneries producing Leather. A resource’s illustration and name always remain visible in the resource guide; colour is an additional cue. Internal save identifiers remain stable for compatibility; the old IDs do not represent additional resources.

| Raw good | Tile / combat family | Processed good | Extension | Processed uses |
|---|---|---|---|---|
| Wood | Woodland · forest | Planks | Sawmill | Ship hulls, artillery frames, city construction |
| Clay | Clay hills · rugged | Pottery | Kiln | City services, vessels, farms, research |
| Wool | Pasture · flat | Cloth | Weaver | Sails, clothing, cavalry, research |
| Grain | Fields · flat | Rations | Bakery | Recruitment, exploration, research |
| Iron ore | Mountains · rugged | Steel | Forge | Armor, weapons, tools, warships |
| Stone | Escarpment · rugged | Blocks | Stoneworks | Cities, walls, mining infrastructure |
| Hides | Hunting forest · forest | Leather | Tannery | Armor, cavalry tack, camps, expeditions |
| Salt | Salt flat · flat | Chemicals | Chemical works | Tanning, chemical works, gunpowder, research |
| Coal | Coal hills · rugged | Fuel | Fuel works | Metallurgy, workshops, heavy equipment, research |
| Gold | Gold mountains · rugged | Gold bars | Goldsmith | Flexible bank exchange and high-tier merchant investment |
| Fish | Coastal and offshore water | Rations | Smokehouse | Replaces Grain in every construction or recruitment recipe |
| Oil | Whale grounds · water (alongside Hides) | Fuel | Artisans’ Guild processing | Coal substitute in every recipe |

Wood is shown as round logs; Planks as sawn boards. Clay is a terracotta lump; Pottery is a jug. Wool is a cream ball; Cloth is blue folded fabric. Grain is a wheat stalk; Rations is bread. Iron ore is blue-veined rock; Steel is a metal ingot. Stone is a rough pale boulder; Blocks are cut rectangular stones. Hides is an animal pelt; Leather is a stitched roll. Salt is white crystals; Chemicals is a teal flask. Coal is angular black rock; Fuel is refined coal briquettes with a flame. Fuel represents coke used in high-temperature furnaces. Chemicals represents refined salts used for tanning, textile dyes, ore and water treatment, and gunpowder ingredients, abstracted into one card.

Five land types are rugged, three flat and two forest. Heavy infantry has more favoured terrain, while light infantry moves twice as fast. Fish and Grain count as a shared food reserve, and Oil and Coal as a shared industrial reserve, in AI shortage and trade valuations. Fish inherits every Grain recipe; Gold and Gold bars have intrinsic exchange uses as well as industry and selected recipes. The new goods never enter the original building costs.

Gold terrain uses a dedicated painted mountain-and-mine illustration with natural gold seams; Gold bars are stacked yellow ingots. Fish terrain uses a dedicated painting of a silver-blue shoal beneath turquoise water, with a numbered production token. Whale grounds use matching ocean art with two whales, and produce both Hides and Oil; no separate Whale resource card is added.

**Fish payment.** Every recipe remains printed with Grain. Pay from stored Grain first; missing Grain is covered one-for-one by stored Fish, including mixed payments and discounted recipes. The game displays the Fish substitution before purchase. Player trades, bank trades and research exchanges spend the explicitly offered goods and never silently substitute Fish for Grain. Fish received from towns, ships and camps goes into normal local warehouses.

**Oil payment.** Whales yield equal quantities of Hides and Oil to towns, camps, fishing ships and land merchants covering them. Oil is stored in the same local warehouse as Hides. Recipes remain printed with Coal: spend Coal first, then cover any shortage with Oil one-for-one, including guild construction and orders. Direct player/bank trades and research exchanges still spend exactly the offered goods. Artisans can refine Oil into Fuel; existing Whale-linked Tanneries continue producing only Leather. Oil appears directly below Fish in the resource bar, with an amber droplet icon. It has no separate land tile or dedicated harbor. Existing campaigns acquire Oil from future Whale harvests without retroactively changing stores, terrain, numbers or random streams.

**Trading and resource absence.** Player trades may include all twenty-two goods, in explicit quantities, with the active player. No gifts, same-good wash trades, building trades, or card trades. Default bank rates are:

| Give to the bank | Receive | Conditions |
|---|---|---|
| 1 Gold | 1 raw good | Any raw type, including Fish and Oil; no harbor required |
| 2 Gold | 1 processed good | No harbor required |
| 1 Gold bar | 2 raw goods of one type | Whole-card pairs; no fractional bars |
| 1 Gold bar | 1 processed good | No harbor required |
| 4 identical raw | 1 different raw | Always available; includes all twelve raw types |
| 3 identical raw | 1 different raw | Owned active generic harbor |
| 2 of a harbor’s named raw | 1 different raw | Owned active matching specific harbor |
| 6 identical raw | 1 processed good | Always available; no harbor discount |
| 4 identical processed | 1 different processed | Always available |
| 2 identical processed | 1 raw | Always available; no harbor discount |

This is the escape valve for an absent ore, grain, or industrial resource. A player can import steel even without any ore tile; doing so is expensive. All receive choices may include a good absent from the revealed world. There is no instant raw-to-processed crafting action beyond these bank rates: extensions are the efficient local source. No bank exchange sequence increases inventory value for free.

**4. Buildings, extensions and resource camps**

All costs below are incremental payments for the indicated step. Existing buildings, inventories, walls and extensions survive upgrades. All production starts on the next matching dice roll. No recipe uses more than five different goods. Only the final city uses five; all others use four or fewer.

| Construction | Exact cost |
|---|---|
| Road | 1 Wood + 1 Clay |
| Settlement | 1 Wood + 1 Clay + 1 Wool + 1 Grain |
| City I / level 2 | 3 Iron ore + 2 Grain |
| Seafarers route ship | 1 Wood + 1 Wool |
| City II / level 3 | 3 Iron ore + 3 Grain + 3 Blocks + 2 Pottery |
| City III / level 4 | 5 Blocks + 4 Planks + 4 Pottery + 3 Cloth + 2 Chemicals |

| Town level | Raw per matching adjacent productive hex | Max extension tier | Max wall tier | Max unit tier recruited |
|---|---:|---:|---:|---:|
| 1 · Settlement | 1 | None | I | I |
| 2 · City I | 2 | I | II | II |
| 3 · City II | 3 | II | III | III |
| 4 · City III | 4 | III | IV | IV |

**Troop recruitment has no per-turn capacity limit.** Buy as many units as you can afford at an eligible town with a clear adjacent land hex. Unit-tier eligibility uses the town level at the start of the owner’s turn. New towns cannot recruit until the next owner turn, and newly unlocked tiers become recruitable next turn. Newly recruited units defend immediately and become active next owner turn. Mobile shipbuilding also has no per-turn quantity limit.

**Extensions.** A city may have one extension for each adjacent producing hex (land, Fish water or Whale water), so at most three. It is bound permanently to that particular hex and its raw resource. Two neighboring cities may independently build extensions on their shared hex. Two adjacent hexes of the same raw type may each support an extension at the same city. Ordinary water has no extension slot; Fish water supports a Smokehouse producing Rations; Whale water supports a Tannery producing Leather. There are no remote extensions.

An extension of tier 1/2/3 produces 1/2/3 of its processed good whenever its linked tile rolls. This consumes no raw cards and does not reduce raw production. For example, a level-4 city beside a seven-numbered ore mountain with a tier-3 forge gains 4 ore and 3 steel on a seven. If an enemy army occupies that mountain, both outputs are blocked for that city.

| Extension | Build tier I | Upgrade to II | Upgrade to III |
|---|---|---|---|
| Sawmill | 2 Wood + 1 Iron ore + 1 Stone | 2 Planks + 2 Steel + 1 Wood | 4 Planks + 3 Steel + 2 Fuel |
| Kiln | 2 Clay + 1 Coal + 1 Stone | 2 Pottery + 2 Fuel + 1 Clay | 4 Pottery + 3 Fuel + 2 Blocks |
| Weaver | 2 Wool + 1 Wood + 1 Salt | 2 Cloth + 1 Wool + 2 Pottery | 4 Cloth + 2 Leather + 3 Chemicals |
| Bakery | 2 Grain + 1 Salt + 1 Clay | 2 Rations + 2 Pottery + 1 Grain | 4 Rations + 3 Pottery + 2 Cloth |
| Forge | 2 Iron ore + 1 Coal + 1 Stone | 2 Steel + 2 Fuel + 1 Iron ore | 4 Steel + 3 Fuel + 2 Chemicals |
| Stoneworks | 2 Stone + 1 Iron ore + 1 Wood | 2 Blocks + 2 Steel + 1 Stone | 4 Blocks + 3 Steel + 2 Planks |
| Tannery | 2 Hides + 1 Salt + 1 Clay | 2 Leather + 2 Chemicals + 1 Hides | 4 Leather + 3 Chemicals + 2 Pottery |
| Chemical works | 2 Salt + 1 Coal + 1 Clay | 2 Chemicals + 2 Pottery + 1 Salt | 4 Chemicals + 3 Pottery + 2 Fuel |
| Fuel works | 2 Coal + 1 Stone + 1 Clay | 2 Fuel + 2 Blocks + 1 Coal | 4 Fuel + 3 Blocks + 2 Steel |
| Goldsmith | 2 Iron ore + 1 Coal + 1 Stone | 2 Steel + 2 Pottery | 3 Steel + 3 Fuel + 2 Blocks |
| Smokehouse | 2 Salt + 1 Coal + 1 Stone | 2 Pottery + 1 Fuel + 1 Salt | 3 Pottery + 3 Fuel + 2 Planks |

Extensions advance in order, with the city level limiting the maximum tier to level minus one. Prices above are complete upgrade prices, not cumulative totals. Each tier adds processed production without consuming the linked raw goods. Goldsmiths and Smokehouses use compact supporting-material recipes; neither needs its own output to start.

**Resource camps.** Each owned road can support one camp on **each of its land sides**, for up to two camps on a land–land edge. Select the linked tile separately for each camp. There is **no per-tile camp limit** and no player-wide camp cap. The six edges around a hex provide its physical sites, shared by road ownership; towns and extensions do not consume them. Shipping routes beside Fish can build and upgrade a fishery on each fishing side, using the same two-tier camp system. If exploration creates a coast and converts that route into a road, its existing fishery remains and can still be upgraded.

A tier-I camp costs **two raw cards of exactly two resource types**: one card for its main equipment or construction material, and one supporting card. Each recipe reflects that camp’s work; there is no universal Wood-and-Clay base. **No camp’s initial construction requires the raw resource it produces.** Tier-II upgrades use processed equipment and are paid once, after tier I. No upkeep or operating input is consumed.

| Camp / output | Build I | Purpose | Upgrade to II |
|---|---|---|---|
| Logging camp / Wood | 1 Hides + 1 Iron ore | Camp tents and axes | 2 Steel + 2 Leather |
| Clay pit / Clay | 1 Stone + 1 Iron ore | Retaining walls and digging tools | 2 Blocks + 1 Steel |
| Shepherd camp / Wool | 1 Stone + 1 Grain | Sheep pens and starter feed | 2 Cloth + 1 Leather |
| Farmstead / Grain | 1 Iron ore + 1 Hides | Harvest sacks and hand tools | 2 Rations + 2 Pottery |
| Iron mine / Iron ore | 1 Wood + 1 Hides | Pit props and hauling bags | 2 Planks + 1 Fuel + 2 Chemicals |
| Quarry / Stone | 1 Iron ore + 1 Hides | Chisels and lifting slings | 2 Steel + 1 Fuel |
| Hunting lodge / Hides | 1 Salt + 1 Stone | Weighted traps and hide preservation | 2 Leather + 1 Chemicals |
| Saltworks / Salt | 1 Clay + 1 Coal | Evaporation pans and heat | 2 Pottery + 1 Fuel + 1 Blocks |
| Coal mine / Coal | 1 Wood + 1 Stone | Timber props and stone supports | 2 Blocks + 1 Leather + 2 Fuel |
| Gold camp | 1 Iron ore + 1 Hides | Mining tools and hauling bags | 2 Steel + 1 Planks |
| Fishery | 1 Wool + 1 Salt | Nets and preservation | 2 Cloth + 1 Planks |

Building all eleven basic camps costs 22 cards. Wood and Clay account for three; the two new camps need neither. Hides supplies harvest bags and hauling gear; Stone supplies foundations, pasture boundaries and weighted hunting traps; Salt preserves hides. Iron ore remains useful for hand tools. Every tier-I camp costs exactly two raw cards, one of each type, and never its own output. Tier-II upgrades retain their total card costs, with retired Rope inputs replaced by other processed goods. Original road, settlement, first-city, route-ship and research costs remain unchanged. Palisades now cost one Wood. These catalogue totals describe demand distribution, not equal-value cards on every random map.

Tier I produces **one raw card**; tier II produces **two raw cards** whenever the linked tile rolls. Upgrading one side does not upgrade the other. Camps have no processed output. Their raw output is additional to town production and extension output.

The road must belong to the builder and the linked land tile must be free of enemy occupation. An enemy on the opposite side does not prevent constructing this camp on its clear side. Production goes to the nearest owned town: minimize hex distance from the linked tile to any land hex adjacent to that town, ignoring roads, water and ownership. Break equal distances by oldest town ID. Recompute this destination for future output when towns change. Existing stored cards remain where they are. An isolated road retains its camps. Destroying the parent road destroys **all** its camps immediately, without refund.

Camps are the cheap specialist option: they exploit one roll and one raw good. Settlements diversify income, add a warehouse and recruitment site, and can become cities. A tier-II camp is efficient on a strong number but remains vulnerable to occupation and road destruction. There is no artificial extraction cap to override the requested rule.

**5. Inventory, spending, and occupation**

Every town owns an unlimited twenty-two-good inventory. Town raw output and extension output enter that town. Camp and mobile collector output follows the destination rule above. Resource cards gained from bank trades, player trades, and research enter the player’s **home store**, initially their first settlement and thereafter the oldest surviving town. Home store designation cannot be moved voluntarily. A raid enters the raider’s nearest town immediately.

The interface displays an empire total plus each town’s local stock. All stored town goods remain available to pay any valid empire construction, recruitment or trade cost. Siege does not silently remove a store from that pool.

For each good being spent, debit towns proportionally to their current holdings using largest-remainder integer allocation; break equal remainders by town ID. Example: stores with 8 and 2 grain pay a five-grain cost as 4 and 1. For a two-grain cost they pay 2 and 0. Players cannot select the threatened town as the exclusive payer. There is no free internal stock-transfer order and no refund-based relocation. Ordinary spending can still reduce exposed stock: that is intentional: but cannot instantly evacuate an arbitrary entire warehouse at no economic cost.

On every production roll, a land hex occupied by another player’s army produces **nothing for its enemies**, including towns, extensions, and camps linked to that hex. It still produces for the occupying army’s owner. Units are hostile to every other player; trading does not create immunity. Blocking is based on an armed land unit’s presence, not army size or siege status. Land merchants do not blockade or protect towns. Merchant and merchant-ship production bypasses occupation on covered tiles. Enemy fleets block ordinary Fish and Whale production (towns, fisheries, Smokehouses and fishing ships); merchant ships only collect land. The other two hexes beside a besieged town continue producing unless occupied too. Routes do not convey permanent ownership of tiles.

Do not allow new towns at vertices adjacent to enemy armies, or roads on edges bordering enemy armies. Camps require only their linked land side to be clear. Existing roads remain intact and usable until destroyed; occupation itself does not delete them. A town under an active siege cannot build extensions/walls, upgrade, recruit, launch fleets/expeditions, or provide harbor discounts. Its stock remains pooled, and unaffected adjacent tiles still produce. These restrictions end as soon as the siege breaks.

**6. Turn sequence and readiness**

1. **Production:** roll two six-sided dice. Eligible towns, extensions, camps and mobile collectors produce for every player. Seven produces normally.
2. **Shared action phase:** trade, build, recruit, research, explore and command armies or fleets in any order. Siege or raid, then spend the proceeds immediately.
3. **End:** expire this-turn bonuses and advance to the next surviving player. Check elimination immediately after a town is destroyed.

A previously acquired research card may be played before rolling or during the shared action phase when its effect is legal. There is no per-turn limit on research cards played. There is no separate military phase.

**There is no military upkeep**, food payment, attrition, maintenance, debt or military size cap. Recruitment and ship costs are paid once. Rations remain useful in unit recruitment, research and expeditions; they are never charged automatically. Building armies competes directly with economic expansion for cards.

New units and mobile ships defend immediately, but cannot move, attack, siege, destroy, load or unload until their owner’s next turn. Unit-tier eligibility uses the town’s level at the start of that owner turn; upgrading a town unlocks its new unit tier next turn. Every unit retains full printed power until removed as a whole casualty. There are no persistent wounds, promotions or unit upgrades.

**7. Land units: names, costs, and visual identity**

Each tier-I/II/III/IV combat land unit has **1/2/3/4 power and unit points**. All prices are direct recruitment prices, not upgrade supplements. Tier II bridges raw-only militia and professional armies: each recipe contains **exactly one processed-good type**, alongside raw materials. The former tier-II units are now tier III; the former tier-III units are now tier IV, with their names and prices retained. Recruit onto a non-hostile land tile adjacent to an eligible town. A town with no legal deployment tile cannot recruit.

| Class / movement / role | Tier I | Tier II | Tier III | Tier IV |
|---|---|---|---|---|
| Heavy infantry · speed 1 · ×2 rugged | **Hillguard**: 1 Grain + 2 Iron ore | **Spearguard**: 1 Steel + 2 Grain | **Iron Sentinel**: 2 Steel + 1 Leather + 1 Rations | **Granite Praetorian**: 3 Steel + 2 Leather + 2 Fuel + 1 Rations |
| Light infantry · speed 2 · ×2 forest | **Brushrunner**: 1 Grain + 1 Wool + 1 Hides | **Trail Scout**: 1 Leather + 1 Wool + 1 Grain | **Thorn Ranger**: 2 Leather + 1 Rations + 1 Cloth | **Veil Warden**: 3 Leather + 2 Cloth + 1 Chemicals + 2 Rations |
| Cavalry · speed 3 · ×2 flat | **Outrider**: 2 Grain + 2 Hides | **Horseman**: 1 Leather + 2 Grain + 1 Hides | **Lancer**: 2 Leather + 1 Cloth + 2 Rations | **Sunsteel Cataphract**: 3 Steel + 3 Leather + 2 Cloth + 2 Rations |
| Artillery · speed 1 · siege reduction equals tier | **Field Ballista**: 2 Wood + 1 Iron ore + 1 Hides | **Light Catapult**: 2 Wood + 1 Iron ore + 1 Blocks | **Siege Onager**: 2 Planks + 1 Steel + 2 Leather | **Great Bombard**: 3 Planks + 3 Steel + 3 Chemicals + 3 Fuel |

Heavy infantry receives ×2 combat power in rugged terrain (Clay, Iron ore, Stone, Coal); light infantry in forest (Wood, Hides); cavalry on flat terrain (Wool, Grain, Salt). Both armies use the defender’s terrain. Artillery has no field-combat terrain multiplier; its tier reduces siege duration. Movement speed does not change with tier. Bonuses multiply the full tier value, so a favored tier-IV unit has power 8 but remains four casualty points.

Visual progression: Hillguard uses a padded coat, round shield, and war pick; Iron Sentinel mail/partial plate, angular shield, and polehammer; Granite Praetorian articulated dark plate, tower shield, and mace. Brushrunner uses a short hood and hunting spear; Thorn Ranger fitted leather, longbow, and split cloak; Veil Warden layered dark leather and recurved bow. Outrider has an unarmored small horse and javelin; Lancer mail, lance, and cloth caparison; Sunsteel Cataphract full rider and horse armor. Field Ballista is a compact bolt thrower; Siege Onager a reinforced torsion catapult; Great Bombard a heavy iron cannon. Use class silhouettes, Roman tier I–IV badges, player-color cloth, and a clear unit-count badge. Do not rely on color alone.

The original twelve portraits remain in the [original unit atlas](assets/unit-roster.png), with its columns now used as tiers I, III and IV. The [new tier-II atlas](assets/unit-tier-2.png) adds Spearguard (steel spear and shield), Trail Scout (leather vest and short bow), Horseman (leather equipment on an unarmored horse), and Light Catapult (compact counterweighted throwing arm). It was made with the built-in imagegen tool using the [saved prompt](assets/unit-tier-2-prompt.txt). The game’s roster presents all sixteen combat units and four merchant ranks with current names and ranks, using bronze, green, silver and gold Roman badges. Map counters show faction, class composition and piece count; a mixed counter grants no bonus.

**8. Armies, movement, and combat resolution**

Armies occupy land hexes, not road edges or town vertices. Any number of same-owner units can occupy a hex and defend together as one army. Different players cannot end normal movement on the same land hex. Armies move at the slowest participating unit’s printed speed: heavy 1, light 2, cavalry 3, artillery 1. Land movement needs no roads. Water and unrevealed hexes are impassable without a transport or expedition reveal. Roads do not add speed.

**Enemy-occupied hexes block passage for both land armies and mobile fleets.** A move may end on an enemy hex to initiate combat, but its route cannot pass through that hex to a destination beyond it. Go around along a clear route and pay its full movement distance, or attack the blocker. Each clear approach hex costs one movement point; initiating a battle on the adjacent enemy hex costs one point instead of an ordinary move. Occupying that hex after victory costs no extra point. Surviving attackers may keep moving, fighting, sieging or raiding while they have points, including after a tie or defeat. Enemy blockers must still be fought separately; a path cannot bypass them. This applies equally to land armies, fleets and research-granted movement. Your own units do not block passage.

Movement, battles, siege steps, raids and road/route or watchtower demolition share each unit’s movement allowance. An army with four points can fight three adjacent battles and then raid an adjacent unprotected settlement, provided it survives and can reach each target. A siege step or raid costs **one remaining movement point per participating unit** and may follow movement. Heavy infantry can siege or raid while already adjacent; light infantry can move one tile then operate, cavalry two, and artillery must already be adjacent unless granted extra movement. Group participation requires every unit to afford the point. Moving adjacent does not automatically perform the operation: choose the target explicitly. Destroying a town and loading/unloading remain stationary operations that require fresh units and end their activation. Destroying a road or edge shipping route, and a tower siege/destruction operation, each cost one remaining movement point per participant and may follow movement or combat. “Immediate raid” means a siege operation with no preceding siege-only turn.

Track movement/operation spent on individual units, not army container IDs. Splitting and merging cannot refresh readiness or actions. Units that move together spend the distance actually traveled; after splitting, a unit may use remaining movement up to its own speed, and may spend one point on a siege or raid; stationary town destruction or transport remains unavailable after moving. Combat spends only its actual approach/battle distance; surviving units retain unused movement. Ties and losses also spend the point, so attacks are never free. Resolving casualties must finish before another action. A group can perform a stationary operation only with units that have neither moved nor acted; other units on that hex can defend but do not contribute artillery to that operation.

**Battle procedure:**

1. Lock the participants and defending hex. Every defending unit there participates. Remove participating land merchants on both sides, including in a tie; they never add power. Attacking units come from one adjacent hex; no free remote reinforcements.
2. Compute each unit’s tier × its applicable multiplier (1 or 2), then sum. No combat dice. No multiplicative stacking above ×2. Add adjacent friendly watchtower tiers once to each army after its terrain calculation; towers cannot give power to a merchant-only force. Naval units use their printed ship power.
3. If powers differ, set the casualty target **X = min(power difference, the loser’s total unit points)**. The winner loses no combat units. Land merchants are already removed.
4. Remove whole losing units whose printed unit points total at least X, choosing the **smallest achievable total at or above X**. The loser chooses among combinations with that same minimum total. Do not use terrain-doubled combat power as casualty value. There are no persistent wounds, reduced-strength survivors, or fractional units. For example, with tiers {1, 3} and X = 2, remove the tier-III unit (3 points), rather than both units (4).
5. A surviving losing defender retreats one hex to a revealed land hex with no enemy army; friendly stacks are allowed. It chooses among legal destinations. A losing attacker returns to its immediately preceding hex. Surviving attackers retain unused movement; defending on opponents’ turns does not consume the defender’s future owner turn.
6. If a losing defender has no legal retreat and still has points, it holds the hex, and the attacker stays on its approach hex. The winner retains its damage-free victory but does not gain occupation. A later battle can finish the trapped defenders. This avoids inventing extra encirclement casualties beyond the requested difference rule.

On equal power, neither side loses combat points; the attacker returns to its approach hex and spends the battle point; any remaining points stay available. The defender holds. If all defenders die or retreat, the attacking survivors enter the defended hex. After combat, check whether any town siege is broken by the resulting positions.

**Examples.** Three tier-II heavy infantry on rugged terrain have power 12. Four tier-II cavalry attacking them there have power 8. Cavalry loses 4 of its 8 unit points and retreats; heavy infantry loses none. On flat ground the same cavalry has power 16, versus the heavy infantry’s 6, and destroys all six heavy unit points. A single tier-III unit losing by one is destroyed: its three points are the smallest available whole-unit loss that meets the one-point target. If the loser has tiers {1, 2, 3} and X = 3, it may remove the tier-III unit or the tier-I and tier-II pair.

The exact combat rule strongly rewards superior concentration: cheap attacks do not wear down a stronger army. That is an inherent consequence, not something resource pricing can eliminate. The counters here are terrain, recruitment investment, multiple exposed production sites, sea transport limits, and the opportunity cost of concentrating every defender. If playtests still become irreversible after one battle, changing winner casualties would require changing the requested combat rule; it is not silently included.

**9. Walls, siege, raiding, and destruction**

Walls are sequential and cannot exceed the town’s allowed tier. Costs are paid for each step. They add time, not town combat power, and do not directly multiply an infantry defender’s strength.

| Tier | Wall | Incremental cost | Total added siege turns |
|---|---|---|---|
| I | Palisade | 1 Wood | 1 |
| II | Stone Curtain | 3 Stone | 2 |
| III | Bastion | 3 Blocks | 3 |
| IV | Citadel Ring | 4 Blocks + 2 Steel | 4 |

The wall contribution is its **current tier**, not the sum of every tier built. Destroying a town destroys its walls and all extensions. A successful raid does not automatically destroy its walls or reduce its level.

To initiate or continue a siege, spend one remaining movement point from an adjacent land hex. Units stay on that hex; a faction-colored dashed line links the participating army to its target town, whose ring and badge show the siege. The line is removed when the siege breaks. **If any defending-owner army is present on any land hex adjacent to the target vertex, the town cannot be sieged, raided, or destroyed.** Clear all those armies through ordinary combat first. There may be fewer than three land hexes on a coast. Fleets do not count as land garrisons, and embarked troops do not protect a vertex. Armies belonging to a third player do not protect the town, but their occupied hexes remain impassable to the attacker.

One attacking player can resolve at most one siege/raid/destruction operation against a particular town per owner turn, regardless of how many armies they split into. An army with movement remaining may operate against another adjacent town; splitting or merging does not reset the movement spent or bypass the per-town limit.

Define **D = town level − 1 + wall tier + friendly watchtower support**. Define **A = sum of printed tiers of participating artillery**. Tier I/II/III/IV artillery contributes 1/2/3/4. The number of siege-only turns required is **max(0, D − A)**. Artillery subtracts from the requirement; it does not subtract that many additional turns on each later activation. Artillery’s siege reduction is not a combat multiplier.

If artillery meets or exceeds the full city, wall and supporting-tower defense, choose **Raid town** directly: the one-point action transfers the warehouse immediately, without a preliminary siege-only action. Only a multi-turn breach requires entering a siege. The raid is still recorded as a breach for repeat raids and next-turn destruction.

Track completed siege-only turns per attacker and target. On an operation, if completed turns already meet the current requirement, raid. Otherwise add one completed siege turn and end the operation. Meeting the requirement with that increment enables a raid on the following activation. A raid therefore always happens on siege operation **max(0, D − A) + 1**, with destruction possible on the next owner turn.

| Target without walls | No artillery: sequence from first siege operation |
|---|---|
| Settlement, level 1 | Raid → destroy |
| City I, level 2 | Siege → raid → destroy |
| City II, level 3 | Siege → siege → raid → destroy |
| City III, level 4 | Siege → siege → siege → raid → destroy |

A level-4 city with tier-IV walls has D = 7. One tier-IV bombard gives A = 4: three siege-only operations, then raid, then destruction. Two such bombards give A = 8: raid on the first siege operation, destroy on the next. Even overwhelming artillery never combines raid and destruction in one turn.

Siege persists only while at least one of that attacker’s land units stays adjacent, no defending-owner army is on any adjacent land hex, and the attacker performs a valid siege-related operation on each of its subsequent turns. A defending reinforcement reaching any adjacent land hex breaks it immediately. Skipping the operation, withdrawing entirely, or losing that foothold resets progress and any raid authorization. Artillery joining or leaving changes A at the next operation; completed siege turns remain unless the siege breaks. Separate attackers do not share progress or raid authorization.

**Siege inspection:** click a town’s siege badge or its dashed army link to open the full siege report. The town inspector also offers “View full siege details.” The report shows the city, wall and tower defense separately; completed and required steps; each adjacent attacking army’s composition and artillery reduction; last-operation restrictions; raid/destruction timing; and stored goods at risk. Artillery on different hexes is shown separately and never pooled. The report is available for your own and rival towns, with keyboard access and live updates.

**Raid:** transfer **every resource in the target town’s warehouse** immediately into the raider’s nearest surviving town, using the same hex-distance and oldest-town tie rule as camps, measured from the operating army’s hex. Empty the target warehouse. There is no carrying capacity, goods selection, unit cargo or delivery operation. These cards are immediately pooled and can be spent immediately in the same shared action phase. An empty warehouse can still be raided to authorize destruction. On each subsequent owner turn, the attacker may raid again if new resources have arrived, or destroy the town. Repeat raids take the entire new warehouse and require no additional siege-only turns while the siege remains intact, even if artillery has left. An empty warehouse cannot be raided again merely to renew the siege. The first raid continues to authorize destruction; a later raid does not reset that authorization. The one-operation-per-town-per-owner-turn limit still prevents raiding and destroying on the same turn. Each participating unit spends one movement point on a raid. Destruction always requires a subsequent owner turn.

**Destroy:** after the mandatory intervening owner-turn boundary, use another stationary operation with adjacency and defender-clearance still satisfied. First transfer every remaining stored resource to the attacker’s nearest surviving town, measured from the operating army’s hex with the same distance and tie rule as a raid. This includes resources received since the last raid; they are immediately pooled and spendable. Then remove the town, walls, and all extensions. Roads survive unless separately destroyed, so an invader may need to rebuild a network to settle the site. No automatic capture or free replacement settlement. Neighboring camps remain if their parent roads survive and redirect only their future production. Check elimination immediately.

An armed army on either land side of a road can spend **one remaining movement point per participating unit** to destroy that road. It can do so after moving or fighting, then continue with remaining points; newly recruited, embarked or activation-ended units remain ineligible. All attached camps are destroyed immediately. A hostile army on the other land side belonging to the road owner must be cleared first. Friendly demolition is allowed only as the same army operation, without refunds; there is no free demolition to deny a raid. Route-ship destruction uses the fleet rule below.

**Watchtowers.** A watchtower occupies a road intersection and may share that intersection with an owned town. There is no settlement-distance restriction between towers. At construction or upgrade it must touch an owned road; an enemy town or armed land occupation prevents construction. Build tiers I → II → III → IV in order. Existing towers survive the destruction of their supporting road.

| Tower tier | Upgrade cost | Power bonus | Additional siege turns |
|---|---|---:|---:|
| I · Lookout | 2 Wood **or** 2 Stone | +1 | +1 |
| II · Stone Watchtower | 2 Stone + 1 Iron ore | +2 | +2 |
| III · Guard Tower | 2 Stone + 1 Steel | +3 | +3 |
| IV · Grand Watchtower | 2 Blocks + 1 Steel | +4 | +4 |

A tower adds its tier once to a friendly armed army or fleet fighting on any hex touching its vertex, after terrain multipliers. It does not add a bonus per unit. Tier-I economic ships also receive tower support despite having zero base power. Land merchants still die at engagement and cannot form a tower-powered land army. For siege defense, it adds its tier to an owned town at the same vertex or one edge away. Multiple supporting towers add their bonuses. Artillery offsets the combined town, wall and tower requirement. An adjacent armed land army may siege or destroy an enemy tower after clearing that tower’s owner's armies from all adjoining land hexes. Each operation costs **1 movement point per participating unit**, and only one operation per tower per attacker turn is permitted. The tower’s standalone defense is **half its city-defense bonus, rounded down**: 0 / 1 / 1 / 2 siege-only turns for tiers I / II / III / IV. Subtract the participating army’s artillery tiers, clamped at zero; neither neighboring towers nor the colocated city add to its standalone defense. If completed siege steps already meet this requirement, destroy immediately; otherwise record one completed step and continue next owner turn. Tier-I towers need no preliminary siege. Any higher-tier tower can also be destroyed immediately when artillery meets or exceeds its standalone defense. Towers have no warehouse to raid and no post-raid waiting turn. Their support bonuses persist until destruction. A siege breaks if the attacker withdraws entirely, defending troops reach an adjoining land tile, or the attacker skips an operation on a subsequent turn. Inspect the siege badge, tower itself, dashed army link or tower panel for progress and army details. Towers owned by an eliminated faction are removed. Enemy towers prevent founding a town on their vertex or using that vertex as a road/ship junction.

**10. Fleets and Seafarers connections**

Seafarers **route ships live on edges** and extend settlement reach. Any edge with revealed land on either side is always a **road**, including the coastline; shipping routes are only eligible on edges bordering water with no revealed land. Starting placement uses the selected road/ship type and never silently substitutes the other. If exploration reveals land beside a frontier shipping route, that segment becomes a road; existing coastal shipping routes are corrected when loading a save, preserving ownership. A basic open-ended route ship may be relocated once per owner turn onto a valid sea edge connected to any owned road, shipping route or town; do not move one built that turn. An open end has no town and no other owned road or shipping route attached. Closed routes are fixed. There is still at most one route ship or road on an edge. Settlement connection and distance rules apply when founding an overseas colony. Armies and transports cannot bypass that requirement to conjure inland settlements.

**Mobile ships live on water hexes**, carry units, and fight. They never count as settlement-route edges, even when adjacent. A coastal town can build mobile ships onto an adjacent revealed water hex with no enemy fleet. A printed trade harbor is not required. There is no limit on the number of mobile ships built per town, turn, fleet or order; pay for every hull, with matching research commissions covering only their granted quantity. Ship-tier eligibility is measured at the start of the turn. New towns cannot launch until next turn. No conversion between route tokens and mobile ships. Fishery upgrades stay attached to route edges; fishing ships are separate moving pieces.

| Ship / tier | Complete cost | Speed | Power / casualty points | Unit berths |
|---|---|---:|---:|---:|
| Coastal Transport · I | 2 Wood + 1 Wool + 1 Hides | 3 | 1 | 1 |
| Sailing Transport · II | 3 Wood + 2 Cloth + 1 Hides | 3 | 2 | 2 |
| Ocean Transport · III | 3 Planks + 2 Cloth + 2 Leather | 4 | 3 | 3 |
| Royal Transport · IV | 4 Planks + 3 Cloth + 3 Leather + 2 Steel | 4 | 4 | 4 |
| Cargo Barge · I | 3 Wood + 1 Wool + 2 Hides | 2 | 1 | 2 |
| Convoy Cog · II | 4 Wood + 3 Leather + 1 Wool | 2 | 2 | 4 |
| Convoy Galleon · III | 4 Planks + 3 Leather + 2 Cloth | 2 | 3 | 6 |
| Grand Convoy · IV | 5 Planks + 4 Leather + 3 Cloth + 2 Steel | 3 | 4 | 8 |
| Patrol Galley · I | 2 Wood + 2 Iron ore + 1 Wool | 3 | 2 | 0 |
| War Galley · II | 3 Wood + 2 Steel + 1 Wool | 4 | 3 | 0 |
| War Frigate · III | 3 Planks + 3 Steel + 2 Cloth | 4 | 5 | 0 |
| Royal Frigate · IV | 4 Planks + 4 Steel + 3 Cloth + 2 Fuel | 5 | 7 | 0 |
| Guard Carrack · I | 3 Wood + 3 Iron ore + 1 Coal | 1 | 3 | 0 |
| Battle Carrack · II | 4 Wood + 3 Steel + 1 Coal | 2 | 5 | 0 |
| Armored Carrack · III | 4 Planks + 4 Steel + 2 Blocks | 2 | 7 | 0 |
| Dreadnought · IV | 5 Planks + 5 Steel + 3 Blocks + 3 Fuel | 2 | 10 | 0 |
| Fishing Skiff · I | 2 Wood + 2 Wool + 1 Salt | 2 | 0 | 0 |
| Fishing Cutter · II | 3 Wood + 2 Cloth + 1 Salt | 2 | 1 | 0 |
| Deepwater Trawler · III | 3 Planks + 3 Cloth + 2 Pottery | 3 | 2 | 0 |
| Grand Trawler · IV | 4 Planks + 4 Cloth + 3 Pottery + 2 Chemicals | 3 | 3 | 0 |
| Trading Sloop · I | 2 Wood + 1 Wool + 2 Hides | 2 | 0 | 0 |
| Merchant Cog · II | 3 Wood + 2 Leather + 1 Wool | 2 | 1 | 0 |
| Merchant Galleon · III | 3 Planks + 2 Cloth + 3 Leather | 3 | 2 | 0 |
| Treasure Galleon · IV | 4 Planks + 3 Cloth + 4 Leather + 1 Gold bars | 3 | 3 | 0 |

All six ship classes have four directly recruited tiers. The town must have started the turn at level at least the ship tier; ships cannot be upgraded. Tier I costs raw materials, tier II keeps Wood and has exactly one processed type, and tiers III/IV use Planks with more processed equipment. Transports are fast troop carriers; convoys trade speed for berths; galleys pursue and intercept; carracks concentrate combat power. Fishing and merchant ships sacrifice power for production. There is no upkeep. New ships may produce immediately but may not move or perform operations until their next owner turn.

**Mobile collectors.** Fishing ships collect Fish and Whales (Hides + Oil) from their own hex and all six adjoining hexes. Towns adjoining Whales collect their level in both Hides and Oil; Whaling camps on shipping routes use the Hides camp costs and produce one/two of each good at tiers I/II. Linked Tannery extensions produce Leather in addition to the town’s Hides, using the normal Hides extension recipe. Merchant ships produce raw goods from all adjoining land hexes, including those also serving rivals and those occupied by enemy armies. They do not collect Fish or Whales. Each covered tile matching the dice produces the ship tier in each listed raw good: a tier-IV fishing ship gets four Hides plus four Oil from each covered Whale tile. Both classes have power 0/1/2/3 at tiers I/II/III/IV and zero transport berths. Output is deposited immediately in the nearest owned town, not held as cargo. There is no exclusivity or per-tile collector cap; each collector is a separate vulnerable investment.

**Land merchants.** All four tiers have zero power and move one hex per turn. They collect their current tile plus up to tier-many selected adjacent producing tiles; each yields the merchant tier on a matching roll. Automatic selection prefers Gold, then dice likelihood, then coordinate order, excluding water without Fish or Whales. Players may choose fewer tiles, change the covered neighbors during their action phase, or restore automatic selection. Moving or being carried clears the old selection; landing uses a fresh local selection. Coverage is public and highlighted on the board when inspected. Embarked merchants do not produce. They may collect adjacent enemy-occupied tiles, but still obey normal movement blocking and cannot siege, raid, destroy roads/towers, or protect towns.

| Merchant | Tier | Cost | Current tile + selected neighbours | Cards per matching tile |
|---|---:|---|---|---:|
| Peddler | 1 | 2 Hides + 1 Wool + 2 Grain | current + 1 | 1 |
| Trader | 2 | 2 Leather + 2 Wool + 2 Grain | current + 2 | 2 |
| Caravan Master | 3 | 3 Leather + 2 Cloth + 3 Rations | current + 3 | 3 |
| Merchant Prince | 4 | 4 Leather + 3 Cloth + 4 Rations + 1 Gold bars | current + 4 | 4 |

Land merchants participating in a battle are all destroyed at engagement, on both sides, even in ties or when their escort wins. Embarked merchants follow passenger rules. Zero-power economic ships are automatically lost with a defeated fleet; a lone zero-power ship is sunk without a casualty-selection prompt. Higher-tier economic ships use ordinary whole-ship loss calculations. Economic fleets carry a visible M (merchant) or F (fishing) badge; their composition, tier and production coverage can be inspected.

Merge ships into fleets; speed is the slowest participating ship. Apply unit-level action tracking to prevent extra movement from splitting or merging. Water-only movement crosses shared hex sides, never land or an unrevealed hex. Fleet combat uses tier-specific ship power plus friendly watchtower support and the same power-difference, whole-piece casualty rounding, tie, and retreat rules as armies; no terrain multipliers. Remove whole ships with the smallest achievable casualty-point total at or above the loss target. Surviving ships retain full power and berths; there is no persistent hull damage. Embarked troops contribute no naval combat power.

Loading or unloading is a stationary operation for both passengers and participating carriers, across a land–water shared edge; no port is required. All involved pieces must be fresh. An entire army needs one berth per unit, so a nine-unit army requires nine tier-I transports, five tier-I convoys, or fewer higher-tier carriers, or a suitable mix. Carrying a tier-IV unit takes the same single berth as carrying a tier-I unit. Once loaded, passengers cannot activate independently until a later unloading operation, and cannot act again that turn after unloading. This ruleset has no direct attack from a transport into an occupied land hex: secure an empty beach, unload, and attack on a later turn.

If a transport sinks, transfer its passengers into available berths on friendly surviving participating ships at that water hex; passengers without a berth are lost. Carriers transport land military units and merchants. Neither ships nor passengers have a goods cargo system.

A hostile fleet on water can block a town’s printed harbor discount if that harbor’s sea hex is occupied. It does not block land production or substitute for an army in a siege. A fleet may destroy an enemy edge route ship bordering its water hex for **one remaining movement point per participating ship**, including after moving or fighting. It can continue with any remaining points. If the route owner has a mobile fleet on either water hex bordering that edge, clear it first. A mobile fleet cannot cut a land road or destroy a town from offshore. Ship routes crossing a blockaded hex cannot be extended through that hex until the fleet leaves; existing pieces remain until destroyed.

Escorts therefore protect transports and route infrastructure; convoys trade speed for carrying efficiency; tier-IV armies make scarce sea berths valuable. Small isolated lakes remain possible, but ships there can be attacked from land using shore bombardment.

**Shore bombardment.** Selected artillery on land may attack an enemy fleet in any adjacent revealed water hex. Only the selected eligible artillery participates; accompanying infantry and merchants remain outside this exchange. Artillery contributes twice its tier in power, plus friendly watchtower support on its occupied land hex once. The fleet uses normal naval power plus its own watchtower support on the water hex. The action requires one remaining movement point, spends that point, leaving any remaining points available for further actions. It can follow movement if a movement bonus leaves a point available. Resolve the usual power-difference, rounded whole-unit casualties; ties cause no losses and there are no persistent wounds. Ships retaliate, so losing artillery takes casualties. Artillery never enters water. Surviving defeated ships must retreat to a legal adjacent water hex when one exists; trapped survivors stay and can be bombarded again if the artillery has a point remaining. Unarmed defeated ships and passengers of sunk transports follow the normal naval casualty rules.

**11. Expeditions and the expanding world**

An eligible launch point is an owned road frontier endpoint, an owned edge route-ship frontier endpoint, or an owned town touching the unknown map boundary. Established land units and mobile ships are also expedition anchors at the edge of the map, with no road or town connection required. Land units (including merchants) launch land expeditions; ships of every class launch sea expeditions. Embarked troops cannot launch separately. Newly recruited units must wait until their next owner turn. A unit may launch after moving or acting; the expedition consumes no movement and does not move or consume the unit. Select an outward-facing frontier corner of its occupied tile in Explore. Land expeditions use a road, town or land unit with an adjacent revealed land hex at the launch point. Sea expeditions use a route ship, coastal town or mobile ship with an adjacent revealed water hex. The launch must border at least one unrevealed hex and cannot touch an enemy-occupied launch hex or belong to a besieged town.

| Tier | New hexes | Land cost | Sea cost |
|---|---|---|---|
| I · Reconnaissance | 10 | 2 Grain + 1 Wood + 1 Hides | 2 Grain + 2 Wood + 1 Salt |
| II · Survey | 20 | 3 Rations + 2 Leather + 2 Pottery | 3 Rations + 2 Cloth + 3 Planks |
| III · Great Expedition | 40 | 5 Rations + 4 Leather + 2 Chemicals + 3 Pottery | 5 Rations + 4 Planks + 3 Cloth + 4 Chemicals |

Any eligible surviving player can fund any expedition tier; the recipe itself is the tier gate. Only the strongest living AI faction is barred from paid and research-funded expeditions, even when cornered. Human factions never count toward this AI rank and retain their ordinary expedition rules. Every other AI faction may explore. Rankings use the public faction-power score, with faction ID breaking exact ties, and are reconsidered as the board changes. Cornered means no legal settlement site can be reached by extending the faction’s road/sea-route network anywhere on the revealed map, observing enemy occupation, routes, towns, towers and settlement spacing. Cost, resource shortages and the AI’s normal limited planning radius do not qualify. Building and conquering on the existing map remain legal. Explorers do not need a level-4 city to search for a missing resource. Launching consumes no road or ship and grants no settlement, production, free routes, or ownership. One expedition per player per turn, and at most one per launch point per turn. Resolve during the shared action phase and reveal immediately; movement later that turn can enter newly revealed reachable terrain.

Before paying, select the frontier point and one outward direction. Display the exact 10/20/40 coordinate footprint without terrain or number previews. Build that footprint from unknown hexes using a breadth-first outward flood from unknown neighbors of the launch point, favoring the selected direction; never inspect hidden contents. Each new hex must touch the launch or an earlier selected new hex. Skip already revealed coordinates without charging for them; reveal exactly N new coordinates. If that unknown component has fewer than N reachable cells, the launch is invalid for that tier and no cost is paid. This matters for small enclosed holes; an outer frontier has unbounded space.

Generation uses the same independent 50% water / 50% land, nine ordinary land resources at weight 1, Gold at weight 0.5, Fish at 15% coastal / 10% offshore followed by Whales on remaining water at 5% coastal / 10% offshore, and uniform 2–12 numbers as the initial world. A land expedition can reveal water, and a sea expedition can reveal land. The launch mode affects cost and access, not results. Reveals are public. Sequential turns resolve overlapping footprints before the next player selects and pays for theirs.

An expedition is a search, not a guarantee. An ordinary land resource has probability 0.5/9.5 per new hex, giving 41.76% / 66.09% / 88.50% chances of at least one discovery in 10/20/40 tiles. For Gold these chances are 23.41% / 41.34% / 65.59%. An ordinary resource with a seven appears at least once in 40 tiles with probability 17.46%. Fish depends on neighbouring terrain, so fishery discoveries are spatially correlated. Do not promise a discovery the random generator does not guarantee.

**Rebellions**

At the beginning of the **affected faction’s own turn only**, if an eliminated base AI faction is available to restore, make at most one rebellion check. Among living AI factions, the strongest has a **10%** chance on its own turn and the second strongest **5%**. A human ranks among all surviving factions: strongest has an **8%** chance and second strongest **4%**. Other ranks have no check. One-town factions are exempt, without promoting lower ranks into their chance. No cooldown applies. Existing rebels are ordinary factions and may later face a rebellion themselves. Finished campaigns remain finished.

On success, choose an eliminated AI faction at random and restore its original name, color and AI difficulty. Draw a whole percentage uniformly from **25% through 45%, inclusive, for an AI victim**, or **15% through 35% for a human victim**. A random town anchors a compact regional secession; nearby towns and infrastructure are preferred with modest random variation. Disconnected island holdings can produce more than one region. Towns remain whole and carry their city levels, walls, extensions and colocated watchtowers. Round town counts to whole buildings, transferring at least one while leaving at least one loyal town. Roads/sea routes and their camps transfer together; independent towers follow the regional share. These indivisible attachments can make their exact percentages differ from the rolled share.

Transfer the rounded share of every stored good and of held research cards, conserving the combined totals. Preserve warehouse contents in place where possible and move only the difference needed to reach the share. No new goods, units or research are created. Transfer approximately the same share of land units and ships, favoring the seceding region. Ships and passengers remain together. A divided stack assembles on the nearest free hex of the appropriate terrain reachable without crossing an enemy force; if there is no safe hex, that group stays loyal. This may adjust the exact troop share. Owners’ turn counters are reconciled so transferred fresh troops do not gain early readiness. Unspent temporary research grants remain with their original owner; the restored realm starts with no temporary grants. Siege operations whose participants defect are cleared, while unaffected sieges follow normal continuation rules.

The revived faction returns to its existing seat in the turn order and receives no immediate bonus turn. Rebellion randomness is saved independently from dice and research draws, so loading cannot reroll it and the dice sequence does not change. Announcements identify the returning faction, affected realm, rolled share and transferred assets, with a button to locate the rebel territory. Events remain in the chronicle.

**12. Research cards: four tiers and purposeful discoveries**

Research has four tiers, each with eight distinct, equally likely cards. There is no per-turn purchase limit; pay for each discovery and finish choosing a card before buying another. Pay the tier price, privately reveal exactly two **different** random cards, and keep one. Each purchase samples afresh from all eight cards in that tier, regardless of cards held, chosen, passed over or played earlier. The same card can appear again on the very next purchase. Each card has a 25% chance of appearing in an offer; each unordered pair has a 1/28 chance. There are no finite decks, discard piles, depletion or reshuffles.

Play any number of eligible cards per owner turn, before rolling or in the shared action phase when each effect is legal. Cards become playable immediately after choosing them, including discoveries from Scholars’ Guilds. There is no hand limit, off-turn reaction, trading or resale. Public information includes cards held, purchases this turn and played effects; identities in rival hands remain private. A pending discovery counts as one held card. Each tier's eight possible rewards can be inspected before funding it.

Multiple cards preserve all their rewards: free routes and recruits accumulate, ship grants retain their individual tiers, and upgrade discounts queue separately. Each upgrade uses the oldest matching discount, with no combined discount or refund of unused allowance. Movement bonuses add together. Normal expedition and siege-operation limits still apply; an already funded expedition cannot be replaced by another card. Unused grants expire at turn end.

| Tier | Unlock | Exact purchase cost |
|---|---|---|
| I · Practical Knowledge | Settlement | 1 Grain + 1 Wool + 1 Iron ore |
| II · Guild Knowledge | Unbesieged City I | 1 Stone + 1 Salt + 1 Cloth |
| III · Engineering | Unbesieged City II | 2 Pottery + 1 Rations + 1 Fuel |
| IV · Statecraft | Unbesieged City III | 2 Cloth + 2 Chemicals + 2 Fuel |

Tier I preserves the original recipe. Tier II bridges raw and processed production using only one processed type; higher tiers use three processed types, in larger quantities. Gold and Fish substitutions retain their existing rules. Research rewards deliberately exceed or improve the flexibility of their purchase inputs, compensating for the delayed play and the once-per-turn limit. Commissions offer larger material savings, but require a useful eligible construction this turn. Movement and siege cards offer timing advantages rather than direct production. Research competes with immediate development and defense, and is no longer priced as a low-priority luxury.

| Tier 1: Practical Knowledge | Exact effect |
|---|---|
| Fishing Charter | Build one free tier-I fishing or merchant ship this turn. Normal coastal placement, town tier and readiness apply. |
| Survey Party | Fund one free tier-I land or sea expedition this turn: reveal ten tiles. |
| Road Building | Build up to three roads or shipping-route segments free this turn. |
| Abundant Harvest | Gain any four raw goods in your home store. |
| Local Levy | Recruit two tier-I infantry or cavalry free this turn. Normal readiness applies. |
| Defense Supplies | Gain two Wood and two Stone. Spend them on defenses or other construction. |
| Forced March | Give one army or fleet +3 movement this turn, even after moving. Points can also fund battles or raids. |
| Merchant’s Bargain | Exchange up to six raw goods for the same number of any raw goods. |

| Tier 2: Guild Knowledge | Exact effect |
|---|---|
| Caravan Charter | Recruit two free tier-I merchants this turn. They act next turn. |
| Masonry Grant | Waive up to four raw and two processed goods on one city or wall upgrade this turn. |
| Supply Network | Gain any six raw goods in your home store. |
| Craftsmen’s Guild | Gain three processed goods of up to two types. |
| Trained Volunteers | Recruit one free tier-II unit of any class, including a merchant. |
| Workshop Grant | Waive up to four raw and two processed goods on one extension build or upgrade this turn. |
| Coastal Charter | Build one free tier-II ship of any class, including fishing and merchant ships. |
| Supply Lines | Give up to two armies or fleets +3 movement this turn, even after moving. Points can also fund battles or raids. |

| Tier 3: Engineering | Exact effect |
|---|---|
| Prospecting Survey | Fund one free tier-II land or sea expedition this turn: reveal twenty tiles. |
| Coastal Development | Build two free tier-II fishing or merchant ships this turn. Normal coastal placement, town tier and readiness apply. |
| Industrial Commission | Waive up to six raw and four processed goods on one extension build or upgrade this turn. |
| Veteran Levy | Recruit one free tier-III unit of any class, including a merchant. |
| Naval Commission | Build one free tier-III ship of any class, including fishing and merchant ships. |
| Guild Exchange | Gain six processed goods of up to three types. |
| Coordinated March | Give up to three armies or fleets +4 movement this turn, even after moving. Points can also fund battles or raids. |
| Siege Engineers | Add three completed siege turns to one legal siege before its operation. Defending armies must be cleared first. |

| Tier 4: Statecraft | Exact effect |
|---|---|
| Frontier Network | Build up to six free roads or shipping-route segments and fund one free tier-II expedition this turn: reveal twenty tiles. |
| Mass Mobilization | Recruit four free tier-II land units of any class this turn, including merchants. They act next turn. |
| Civic Masterworks | Waive up to six raw and eight processed goods on one city or wall upgrade this turn. |
| Professional Muster | Recruit one free tier-IV unit or two free tier-III units of any class. |
| Admiralty Charter | Build one free tier-IV ship of any class, including fishing and merchant ships. |
| Great Expedition Charter | Fund one free tier-III land or sea expedition this turn: reveal forty tiles. |
| Grand Exchange | Gain nine processed goods of up to three types. |
| Campaign Orders | Give up to four armies or fleets +5 movement this turn, even after moving, and optionally add two steps to a separate legal siege. No extra attacks. |

All free placements and commissions expire at the end of the turn. They do not waive location, city level, sequential upgrades, enemy occupation or unit readiness. Recruits may include merchants except for Local Levy; Caravan Charter recruits only merchants. Fishing Charter and Coastal Development commission only fishing or merchant ships; the other ship commissions can build any of the six ship classes at the **printed commission tier**, including economic ships, and never pay for a different tier. New units still wait until the next owner turn to act. Material discounts apply once to the next matching construction, pay no change, and cannot be transferred into stored goods. Survey Party pays for ten tiles, Prospecting Survey and Frontier Network for twenty, and Great Expedition Charter for forty. The ordinary one-expedition-per-turn limit still applies. Frontier Network also grants six free route segments.

Movement bonuses affect selected unembarked armies or fleets that have not performed an action that ends their activation. They may already have moved, including using all their ordinary movement points; these points can fund further battles or raids, but do not undo an activation-ending stationary action, bypass enemy blockers, or permit stationary demolition after moving. Fleet movement never grants a land siege action. Siege Engineers adds three completed steps before the normal one-point operation; it cannot bypass defending armies or the delay between raid and destruction. Campaign Orders may also add two siege steps using a separate adjacent fresh land army; the same unit cannot receive both its march and siege effect. Progress cannot be added to a town already raided or operated against this turn.

Existing campaigns preserve their map, inventories, card identities, purchase dates and active rewards. Old deck and discard records are removed on migration. Already-paid pending offers retain their original choices until resolved; every subsequent purchase uses the new two-card draw. Original tier-II effects still migrate to tier III, and original tier-III effects to tier IV. Research uses its own saved random stream, separate from world generation and dice. Reloading preserves an unresolved offer rather than rerolling it.

**13. Balance and strategic choices**

The resource catalogue is intentionally asymmetric. Wood, Clay, Wool, Grain and Iron ore retain their original building roles. Primary raw resources support linked city industries. Grain and Fish share Rations as their output; Artisans can refine Oil into Fuel. New goods primarily support the added systems, and scarcity is resolved through expansion, camps, trade or expeditions rather than map guarantees.

The nine original industries follow three recurring steps: four raw cards establish an extension, five cards raise it to tier II, and nine processed cards raise it to tier III. Goldsmith and Smokehouse totals instead progress 4 / 4 / 8 cards. A workshop becomes productive before it needs other processed industries. Its own output pays part of its improvement; two neighbouring industries provide later equipment. Repeating the original raw bill on each upgrade was removed. Only City III requires five types; higher costs otherwise come from quantities.

Steel and Leather are military workhorses. Blocks anchor cities and walls. Cloth and Pottery support research and civilian development. Planks and Leather support transport and machinery. Rations support recruitment and exploration. Chemicals and Fuel appear more often in late industry and equipment. This is a distribution of roles, not a promise that every card will have identical demand in each game.

**Build wide:** settlements diversify rolls and resources, add recruitment sites, and spread raid exposure. Two-sided camps offer cheaper raw specialization. Roads with two camps are valuable targets, and occupation shuts down every camp linked to the occupied tile.

**Build tall:** higher cities and extensions multiply a small footprint’s output. Tier-I extensions are accessible using raw goods, while higher tiers reward interlocking industries. Concentrated warehouses make these centres attractive raids, so walls buy time for a field army to return.

**Military investment:** tier I is cheap and can occupy several tiles. Higher tiers concentrate power into fewer pieces, transport berths. They require processed goods and risk losing an entire elite piece even in a narrow defeat. There is no maintenance advantage to a small army; the tradeoff is the upfront investment and where forces can be deployed.

**Naval strategy:** 50% water makes islands and disconnected seas more common. Edge ships extend settlement networks; mobile transports move troops. Convoys offer two, four, six or eight berths as their tier rises, escorts protect the crossing, and alternative landing beaches matter because hostile landings are prohibited. Fleets cannot claim towns without land armies.

**Exploration:** ordinary resources have 41.76% / 66.09% / 88.50% discovery chances across the expedition tiers. Gold is half as common. Discovery does not guarantee a reachable camp or productive number. Expedition prices reflect reach and organization without a city prerequisite.

**Balance evidence:** the accompanying audit checks all prices, goods coverage, camp inputs, resource probabilities and casualty arithmetic. The game’s automated suites test rules, interfaces and seeded AI campaigns. Recipe frequency is not a measure of actual player demand. The winner-takes-no-casualties battle rule inherently favours concentration, and an unlucky seed can lengthen development. No finite automated run proves that all random maps are equally fair or all strategies equally strong. Practical testing details and observed campaign lengths are recorded in the game’s TESTING.md.

**Guilds of the Frontier**

Cities become places with a strategic role, not just larger warehouses. A guild turns scarce inputs into a dependable local service: minerals, industry, contracts or military reach. City I, II and III provide **one, two and three different guild slots**, respectively. A guild’s own maximum tier still follows the city tier. Different cities can house different guilds, or repeat a specialization when geography and demand justify it.

**Common rules**

- City I (town level 2), City II (level 3) and City III (level 4) unlock guild tiers I, II and III respectively. Build every tier in order and pay each cost.
- Tier I uses only raw goods. Tier II uses Stone, Coal and a processed material. Tier III uses only processed goods, always including **Blocks and Fuel**. Blocks retain Stone as the advanced structural material; Fuel is processed Coal.
- Every unlocked tier has its own independent work order. A tier III guild can complete one tier I, one tier II and one tier III order in the same owner turn, in any order. Each tier can use a different recipe or target. Upgrading retains saved lower-tier standing recipes.
- Construction and upgrades open **next owner turn**. A guild can complete **one work order per unlocked tier per owner turn**, regardless of other guilds, research or recruitment. There is no upkeep.
- Economic orders draw inputs from the faction pool and deliver output to **that guild's city**. They do not replace or reduce normal town, camp or extension production.
- A besieged city cannot construct, upgrade, dismantle or operate a guild. Prospectors, Farmers and Extractors also need their selected deposit clear of an enemy army. Military guilds do not fire through a siege or replace the defending army.
- Economic guilds except Scholars can save an optional standing recipe separately for each unlocked tier. Immediately after the owner's dice roll, cities act in founding order, trying their enabled tiers I → II → III once each. An unaffordable or blocked tier waits while other affordable tiers can still run: no borrowing, substitutions beyond normal Fish-for-Grain and Oil-for-Coal recipe payment, or automatic bank trades. Pause or revise each tier independently in the city panel.
- Ordinary recipes accept Fish instead of missing Grain and Oil instead of missing Coal. Merchant contracts spend the exact advertised good.
- Dissolving a guild refunds nothing. A replacement starts at tier I and opens next turn. Upgrading or rebuilding cannot grant another immediate order.
- Guilds and their tiers are publicly visible. The map keeps one crest plus a guild-count badge; selecting the city exposes compact tabs for each guild’s orders, tiers and costs. Every guild retains its own independent contracts. They are destroyed with the city and accompany the city in a rebellion. A rebel owner inherits readiness and the current turn's used status; standing orders are paused for the new owner.
- Guilds add six public faction-power points per tier. Their discretionary manufacturing is not counted as guaranteed dice income.

**Costs**

All recipes contain only three resource types.

| Guild | Tier I | Tier II | Tier III |
|---|---|---|---|
| Prospectors’ Guild | 3 Stone + 2 Hides + 1 Iron ore | 4 Stone + 2 Coal + 2 Leather | 4 Blocks + 2 Fuel + 3 Steel |
| Artisans’ Guild | 3 Stone + 2 Coal + 1 Clay | 4 Stone + 2 Coal + 2 Planks | 4 Blocks + 2 Fuel + 3 Chemicals |
| Merchants’ Guild | 3 Stone + 2 Salt + 1 Hides | 4 Stone + 2 Coal + 2 Cloth | 4 Blocks + 2 Fuel + 3 Leather |
| Commanders’ Guild | 3 Stone + 2 Iron ore + 1 Grain | 4 Stone + 2 Coal + 2 Steel | 4 Blocks + 2 Fuel + 3 Steel |
| Navigators’ Guild | 3 Stone + 2 Salt + 1 Wood | 4 Stone + 2 Coal + 2 Cloth | 4 Blocks + 2 Fuel + 3 Planks |
| Farmers’ Guild | 3 Stone + 2 Salt + 1 Coal | 4 Stone + 2 Coal + 2 Chemicals | 4 Blocks + 2 Fuel + 3 Chemicals |
| Extractors’ Guild | 3 Stone + 2 Iron ore + 1 Hides | 4 Stone + 2 Coal + 2 Steel | 4 Blocks + 2 Fuel + 3 Steel |
| Engineers’ Guild | 3 Stone + 2 Iron ore + 1 Coal | 4 Stone + 2 Coal + 2 Steel | 4 Blocks + 2 Fuel + 3 Steel |
| Builders’ Guild | 3 Stone + 2 Wood + 1 Clay | 4 Stone + 2 Coal + 2 Planks | 4 Blocks + 2 Fuel + 3 Planks |
| Scholars’ Guild | 3 Stone + 2 Wool + 1 Salt | 4 Stone + 2 Coal + 2 Chemicals | 4 Blocks + 2 Fuel + 3 Cloth |

**Guild specializations**

**Prospectors’ Guild: local extraction**

Requires an adjacent Stone, Coal, Iron ore, Salt or Gold tile. Choose one deposit per order. Its dice number does not affect the order; normal dice production remains unchanged.

| Tier | Work order | Output |
|---|---|---|
| I · Work crew | 1 Grain | 4 of the selected mineral, or 2 Gold |
| II · Steam pumps | 1 Grain + 1 Coal | 6 minerals, or 3 Gold |
| III · Industrial mine | 1 Rations + 1 Fuel | 16 minerals, or 8 Gold |

This provides a deliberate answer to unlucky dice and makes an otherwise modest Coal deposit strategically useful. Tier III's large batch needs both a food industry and a fuel industry. Gold yields are halved because of its flexibility. Output cannot come from an absent or occupied deposit.

**Artisans’ Guild: manufacturing orders**

Convert a chosen raw good to its ordinary processed counterpart without needing a linked tile extension. Fish and Grain both make Rations; Oil and Coal both make Fuel; Gold makes Gold bars. This is paid manufacturing, not free passive production.

| Tier | Work order | Output |
|---|---|---|
| I · Workshop | 2 matching raw goods | 1 matching processed good |
| II · Coal-fired works | 2 matching raw goods + 1 Coal | 3 matching processed goods |
| III · Mechanized factory | 2 matching raw goods + 1 Fuel | 4 matching processed goods |

Costs combine when the input itself is Coal: tier II consumes 3 Coal to make 3 Fuel. Tier III consumes 2 Coal and 1 Fuel to make 4 Fuel. Each factory gets one order per unlocked tier, preventing a single building from refining forever. Extensions retain their advantage: they produce on every matching roll without consuming raw goods.

**Merchants’ Guild: limited contracts**

One contract per unlocked tier per turn. Choose different goods from the same category. Gold and Gold bars are excluded; their existing bank conversion stays intact.

| Tier | Contract |
|---|---|
| I · Trading house | 2 ordinary raw goods → 2 of another raw good |
| II · Exchange | 2 ordinary raw goods → 4 of another raw good |
| III · Commodity market | 2 ordinary raw goods → 6 of another raw good, **or** 1 processed good → 3 of another processed good |

Contracts provide a limited way to bridge shortages and turn an uneven economy into usable materials. They do not change bank rates or allow cross-category exchanges. Several guilds can cooperate, but each unlocked tier has a fixed batch and one-order limit; returning output through another contract never refreshes either tier.

**Commanders’ Guild: army supply**

Choose an entire friendly army on **one hex adjacent to the city**. Every eligible unit receives the bonus, with no formation-size limit. A guild supply order adds movement points; it does not change power, heal casualties, upgrade units or refund points already spent.

| Tier | Cost | Supply |
|---|---|---|
| I · Muster hall | 1 Grain | Entire army gains +2 movement per eligible unit |
| II · Supply depot | 1 Leather | Entire army gains +3 movement per eligible unit |
| III · Motor works | 1 Fuel | Entire army gains +4 movement per eligible unit |

Units may already have moved or fought, including using all normal movement, but cannot be embarked, newly recruited or have ended their activation through a stationary operation or Hold. **Each unit can receive guild supply once per owner turn**, even across different cities and tiers. Every unlocked tier has its own order, so a tier III guild can supply three separate armies of any size. Previously supplied units keep their existing bonus; new arrivals can receive an unused order without refreshing those already supplied. Research bonuses remain separate and additive. Extra points can fund movement, battles, siege steps or raids.

**Navigators’ Guild: fleet supply**

Requires a coastal city. Same supply rules as Commanders, for ships on one adjacent water hex. Economic ships and loaded transports are eligible; passengers do not separately receive a land bonus.

| Tier | Cost | Supply |
|---|---|---|
| I · Pilot house | 1 Salt | Entire fleet gains +2 movement per eligible ship |
| II · Navigation office | 1 Cloth | Entire fleet gains +3 movement per eligible ship |
| III · Steam dock | 1 Fuel | Entire fleet gains +4 movement per eligible ship |

This supports crossings, convoy positioning, coastal campaigns and relocating economic fleets. Across all three orders, a tier III guild can supply three separate fleets of any size. Ships remain constrained by water connectivity, enemies, remaining movement points and the speed of the slowest selected ship. Passengers are excluded from the naval bonus.

**Balance goals and safeguards**

Guilds keep the unchanged vanilla building recipes. The new resource sinks are Stone/Blocks, Coal/Fuel, Salt, Hides/Leather and other processed goods. Coal matters in every tier-II guild, tier-II manufacturing, steam mining, all tier-III construction and advanced supply/factory orders. It is fuel for optional productive work, not military upkeep.

Power is local, interruptible and capped by actions. A new city does not instantly provide an industrial army bonus. Guilds cannot multiply army power, refund combat movement, turn the same unit into a relay runner across unlimited depots, manufacture indefinitely in one turn, guarantee missing deposits, or bypass the AI expedition restrictions. Successful economic guilds also concentrate valuable goods in an exposed warehouse.

A raw-good count alone is not a sufficient balance metric: two surplus Wood exchanged for two scarce Coal can be worthwhile without increasing the card count. Verification therefore evaluates both ordinary replacement costs and scarcity-weighted values, with fixed per-city throughput and upgrades evaluated as additional contracts alongside the earlier tiers. Factory orders are most useful when a processed good is scarce; Prospectors depend on geography; contracts depend on mismatched supply; military supply depends on a useful formation and reachable objectives.

AI guild selection and upgrades compete with normal cities, extensions, camps, armies and fleets. It evaluates real order inputs/outputs against current marginal values, checks geography, uses profitable work orders, and buys military supply when an eligible formation has a reachable objective beyond its remaining movement. The existing conquest, coalition, rebellion and exploration policies remain in force.

**Opportunity cost and balance review**

Guild construction prices remain unchanged. Better outputs and separate tier allowances compensate for the city unlock, guild investment, delayed opening, and the passive buildings forgone while saving those materials.

The repeatable audit is `AUDIT_PREFIX=guilds-buff npx tsx scripts/guilds-audit.ts`. It compares every work order, all unlocked orders together, cumulative city/guild costs, and passive camp/extension income at dice numbers 2, 6, 7, 8 and 12 in both campaign sizes. Its illustrative value proxy is ordinary raw = 1, ordinary processed = 3, Gold = 2 and Gold bars = 4; scarcity also has a separate Coal scenario. These are comparison weights, not fixed market prices.

| Mature economic guild, all three orders | Net value per owner turn | 45-value guild investment payback |
|---|---:|---:|
| Prospectors, ordinary minerals | +17 | 2.65 turns |
| Artisans, ordinary inputs | +14 | 3.21 turns |
| Merchants, raw contracts at I/II and processed at III | +8 | 5.63 turns |
| Merchants, raw contracts at every tier | +6 | 7.5 turns |

A tier III Prospectors' Guild can extract 4 + 6 + 16 = 26 ordinary minerals (or 13 Gold), consuming two Grain, one Coal, one Rations and one Fuel. An Artisans' Guild can manufacture 1 + 3 + 4 = 8 processed goods, consuming six matching raw goods, one Coal and one Fuel. Those inputs can support different chains at each tier. A Merchants' Guild has three finite contracts; it cannot cycle a spent tier again that turn.

Payback above starts once a fully built guild is operational. The audit also reports a conservative comparison charging every city upgrade to the guild, even though those cities provide their own production. Neither column measures compounding income lost while saving, time to acquire missing materials, or military protection costs. The next-turn opening delay still applies. Camps on good numbers and extensions on several opponents' rolls retain valuable immediate, input-free production; guilds offer reliable selectable output and industrial scale.

Commanders and Navigators supply +2 / +3 / +4 movement to an entire eligible army or fleet, with no size limit, for their existing tier-specific costs. All tiers can operate, but each unit or ship still receives guild supply only once per owner turn. Movement points can fund repeated battles and raids; new recruits remain unavailable, and guild supply cannot stack on the same unit across tiers or cities.

Saved campaigns retain their guilds and selected recipes. Old saves with a spent shared allowance keep that turn spent; their next owner turn starts the new independent allowances. Saved movement already awarded is not changed retroactively. AI evaluates the stronger outputs, skips spent tiers, and values upgrades as additional economic contracts.

**Validation**

521 engine tests cover independent contracts, multiple guild slots, all five new specializations, save compatibility, and anti-leader raids on land and by transport. 39 Chromium/Firefox/mobile scenarios cover guild controls, public inspection, compact map badges, research discoveries, Engineer equipment, and siege information.

Two campaign continuations execute 4,248 legal commands over twelve additional rounds in Classic and Grand. Grand makes 136 guild construction/upgrade decisions and completes 418 orders across eight specializations, including 70 Farmers, 41 Extractors and 98 Engineers. It also makes 37 settlements, 43 city upgrades, 504 recruitment orders, 68 shipbuilding orders and 86 battle resolutions. Builders and Scholars have targeted AI tests but did not operate in this bounded campaign sample. The final Grand board has 320 tiles and 488 pieces; median decision time is approximately 16 ms and p95 is 31 ms on this machine.

These simulations establish legal play and use of the new options; they do not establish equal specialization win rates across random maps. Current reports use the `guild-expansion-*` and `leader-pressure-*` artifact prefixes. Balance payback estimates are illustrative replacement-cost comparisons, not measured victory rates.






**Farmers’ Guild**

Fertilize local crops and pastures on demand.

| Tier | Work order |
|---|---|
| I | 1 Salt → 4 Grain or Wool from an adjacent clear land tile. |
| II | 1 Salt + 1 Coal → 8 local Grain or Wool. |
| III | 1 Salt + 1 Coal + 1 Chemicals → 16 local Grain or Wool. |

**Extractors’ Guild**

Equip local logging and clay crews with better tools.

| Tier | Work order |
|---|---|
| I | 1 Iron ore → 4 Wood or Clay from an adjacent clear tile. |
| II | 1 Iron ore + 1 Steel → 10 local Wood or Clay. |
| III | 1 Steel + 1 Fuel → 18 local Wood or Clay. |

**Engineers’ Guild**

Equip an adjacent army with siege tools for this turn.

| Tier | Work order |
|---|---|
| I | 1 Iron ore: +2 siege power to one entire adjacent army this turn. |
| II | 1 Steel: +4 siege power to one entire adjacent army this turn. |
| III | 1 Steel + 1 Fuel: +6 siege power to one entire adjacent army this turn. Does not increase battle power. |

**Builders’ Guild**

Commission roads and shipping routes throughout your realm.

| Tier | Work order |
|---|---|
| I | 1 Stone: 2 free road or sea-route builds this turn. |
| II | 1 Stone + 1 Coal: 3 free road or sea-route builds this turn. |
| III | 1 Blocks + 1 Fuel: 6 free road or sea-route builds this turn. Normal connections and blocking apply. |

**Scholars’ Guild**

Fund advanced discoveries: choose one of two random cards.

| Tier | Work order |
|---|---|
| I | 1 Stone + 1 Salt: one tier-II research discovery. |
| II | 1 Rations + 1 Fuel: one tier-III research discovery. |
| III | 1 Cloth + 1 Chemicals + 1 Fuel: one tier-IV research discovery. Play the chosen card immediately. |

Farmers work only adjoining Grain or Wool **land** tiles: mineral supplements, heated cultivation and chemical fertilizer support the agricultural chain. Hides, Whales and Fish are not farmed. Existing Hides orders are cleared on load; a previously built guild without Grain or Wool remains dormant. Extractors require adjacent Wood or Clay land. Both use the exact selected deposit, need it free of enemy armies, and deliver output into the guild city without consuming or reducing normal production.

Engineer equipment applies to every eligible land combat unit in the selected adjacent formation. The army receives a flat +2/+4/+6 siege power, using the **highest equipment bonus** among its units rather than summing it. Splitting keeps tools with equipped units; merging never multiplies the bonus. Each unit can receive Engineer tools once per owner turn, separately from Commander movement supplies. Tools expire at the start of the owner’s next turn, affect both city and watchtower sieges, and never change battle power. New units and embarked units cannot receive tools.

Builders grant 2/3/6 free road or shipping-route builds for the rest of the current turn. These commissions stack with other route grants, expire next owner turn, and obey every normal placement, ownership and blocking rule. They do not construct settlements or camps for free.

Scholars fund tier-II/III/IV discoveries respectively. Each uses the normal full eight-card catalogue, gives two distinct random choices and keeps one, without a discard pile or reroll. There is no bonus card; the chosen card can be played immediately. Complete the current discovery before another order. Scholars have **manual orders only**, since each discovery requires a player choice; each unlocked guild tier still has an independent order.

The town inspector always shows total siege resistance and its city/wall/watchtower components, plus current siege progress. With no siege equipment, resistance N means N siege-only operations followed by a raid; destruction becomes legal on a later attacker turn. Selected hostile army equipment shows its reduction. Defending armies must still be cleared first.


**Formal alliances**

AI factions can initiate nearby survival alliances of two to four factions. The human can accept or decline an invitation but cannot initiate one. There is no joint victory: every faction still pursues sole domination.

- **Who may join:** the strongest surviving individual faction, using public faction power with faction ID breaking exact ties, cannot form or join an alliance. This applies equally to human and AI leaders. Combined alliance power may exceed the leader; AI survival policy limits how large a pact it is willing to create or maintain. Each faction belongs to at most one pact. Two nearby two-member pacts may merge into one four-member alliance against a common stronger enemy; merging never bypasses the four-member cap or admits the strongest individual faction.
- **Geography and threat:** every member must connect through another member whose towns are within six hexes. AI acceptance requires a common non-allied enemy within nine hexes of each member, at least 20% plus six power stronger than each individually. Small power differences alone do not trigger an alliance. Invitations favor nearby useful partners and use no hidden resources, research identities or future terrain.
- **Mergers and consent:** when both existing pacts still need help against the same qualifying nearby enemy, AI favors merging them over recruiting a lone faction. The prospective combined power must remain at or below 150% of that threat, and neither existing pact may already have 120% of its power. Both memberships transfer atomically to one alliance; no units, towns, goods or ownership change. Every human member on either side must approve through an accept/decline prompt; in a multi-human game approval proceeds one player at a time, including across save/load. One decline leaves both original pacts intact. AI-only mergers resolve automatically. The five-turn contact pause after a departure also prevents reunion through a merger.
- **Commitment:** forming an alliance locks it for five full rounds. Adding a member does not restart the original commitment. A merger uses the later of the two existing commitment deadlines; it never starts a fresh five-round timer, and two expired pacts remain unlocked. Invitations to an existing pact show the remaining commitment, or state that members are already free to leave. Becoming strongest does not break an existing commitment, but prevents admitting any further members. Once unlocked, any member may leave during its action phase; remaining members stay allied if at least two survive. Elimination removes a member immediately; a resurrected faction does not inherit its old alliance.
- **Military protection:** allies cannot attack, bombard, raid, siege or destroy each other's towns, towers or routes. Allied forces do not block passage, landings or production and may occupy the same army/fleet tile. Each owner retains command of its units and pays its own costs. Allied land guards prevent the siege of nearby allied towns and towers; allied guards also defend routes. Infrastructure ownership and construction connections are not shared.
- **Shared defense:** co-located defenders combine their terrain-adjusted power. Watchtower support applies once for each represented faction's own towers. Attacks still use only the active faction's selected units. Combined defenders take the normal rounded whole-unit casualties. A human defender chooses the coalition's losses if present; otherwise the lowest-ID defending faction does. Unit owners are visible in the casualty list. Surviving defenders retreat together to a hex safe for all of them. Allies on neighboring hexes do not automatically join a field battle.
- **Departure on a shared tile:** nobody teleports or loses units merely for leaving. Former allies already sharing a hex may withdraw normally, or fight in place for one movement point. They are hostile again immediately. The army panel offers an explicit attack-in-place control. This is a temporary positional exception, not permission to move through new enemy stacks.
- **AI conduct:** diplomacy is considered once after the AI's roll. The AI cannot repeat an invitation to the same recipient within five of its own turns. Allied armies stop being potential targets or threats; nearby allied guards count toward local safety, allowing more offensive sorties. The shared threat receives extra targeting priority and allied factions modestly increase their campaign commitment. Existing practical trade aid remains available. After the lock, each AI reassesses on its own turn and leaves immediately if its partners are too distant, the strongest individual faction is now inside the pact, or there is no common nearby enemy still stronger than every member by at least 15% plus four power. This slightly lower retention threshold than the formation threshold avoids churn over tiny strength changes. It also leaves if combined alliance power exceeds **150% of the strongest qualifying shared threat**. A three- or four-member pact therefore sheds members until the remaining coalition is useful rather than dominant; a two-member pact dissolves. There is no additional random delay after eligibility to leave. AI will not propose or accept a pact that already exceeds the 150% margin, and an existing pact stops recruiting once it has **120% of the proposed target’s strength**. These checks use individual outside factions, not rival alliance totals, so blocs do not justify permanently propping one another up. After a departure, both former partners record a five-owner-turn contact pause; AI proposals cannot immediately reunite them through a third member. Departure logs explain the reason. All changes apply to existing saves without extending or bypassing the original five-round commitment.
- **Interface:** invitations show the members, common threat and combined public faction power, with immediate accept/decline controls. The faction view displays coalition cards sorted by combined power, colored member names, the commitment timer and a leave control. Individual faction scores remain separately ranked. Shared map stacks carry one colored badge per faction; composition labels distinguish your, allied and enemy forces.


**Frontier returns and own-turn rebellions**

Every successful paid or research-funded expedition gives **each eliminated original faction** an independent **10% return chance**. A successful return establishes **1–3 settlements and 1–3 tier-I land troops**, with both quantities uniformly rolled. The first foothold is random; further settlements cluster nearby, observing normal spacing and enemy occupation. All sites must touch newly revealed land. If less space is available, fewer settlements are placed; if no suitable site exists, the faction stays eliminated. Terrain is never altered to force a revival. The faction returns without free warehouses of goods, roads, guilds or research; its settlements produce normally and its troops can act on its next turn. A lost human faction retains human control if it returns. Each revival gets a map-location announcement. Returns use a separate saved random stream and do not affect dice, research or terrain generation.

**Rebellions are checked only at the beginning of the potentially affected faction's own turn, once per turn.** They require an eliminated AI faction to resurrect; one-town factions are exempt, and there is no additional cooldown. For an AI faction, rank among surviving AI factions: the strongest has a **10%** chance, the second **5%**, taking a uniformly random **25–45%** share. For a human faction, rank among **all** surviving factions by the same public power score: strongest has an **8%** chance, second **4%**, taking a uniformly random **15–35%** share. Lower-ranked factions do not face rebellion. ID resolves exact power ties. A rebellion can restore at most one faction in a turn, and checks never target another faction on the active faction's turn.

The existing regional secession model applies to both human and AI victims: choose a random foothold, grow one or several compact regions, transfer a proportional share of whole towns, extensions, guilds, roads, camps, towers, troops, ships with passengers, goods and research. Indivisible assets round; at least one town remains with the parent faction. Trapped forces that cannot separate legally remain with their owner. Stocks are conserved and redistributed to match the rolled share. Revived factions inherit no old alliances. Rebellions do not fire during setup or after the game has ended. Existing saves keep their map, faction count, warehouses, armies and dice stream; the new policies apply immediately when loaded.


**14. AI priorities and implementation**

AI players use the same command validator, prices, movement and readiness as humans. The market model is explicitly allowed to use each surviving realm’s pooled goods totals and actual expected production. It does not read opponents’ research-card identities. They do not receive extra goods, inspect future dice, or inspect undiscovered terrain. Decisions run in a Web Worker so the interface remains responsive. Easy perturbs project valuations and searches less deeply; Hard searches farther and considers a larger threat radius; Standard is the default.

The economic planner computes expected income using the actual 2d6 probability for each tile, town level, extension and camp tier, with hostile occupation zeroing that source. It raises the value of missing income and scarce stocks. It enumerates legal city upgrades, walls, camps on either road side, extensions, recruitment, fleets, routes, settlements, research and expeditions. It first executes affordable useful projects; otherwise it imports a missing ingredient for its highest-priority project. Bank imports preserve enough of the other ingredients to finish that project. Ordinary trades use global scarcity, observable stockpiles, production and upcoming recipes, with a premium demanded from a clear leader. During a serious imbalance, smaller factions near that leader can receive favorable supply trades. Aid targets a concrete recruitment, ship or wall recipe; preserves a donor construction reserve and one extra card of the donated good; and spends at most 15% of current stock value, at most six cards, in one offer per owner turn. The donor can accept progressively less immediate value as the survival threat rises, down to 30% of the offered market value at maximum support. Immediate town defense takes priority. The recipient must still find the offer useful. These offers use the normal visible trade interface, can be dismissed, and confer no permanent alliance or special rules. Rejected offers fall back to bank imports or other actions.


Expansion searches connected road and ship networks, respecting distance rules, direct road/sea-route connections and enemy occupation. Site value rewards new resources and strong numbers, discounts duplicated income and route costs, and penalizes nearby threats. Camps fill individual shortages without requiring a new town. From owner turn four, the planner reserves inputs for a basic field force: initially two unit points, growing to eight as the campaign develops. It recruits an affordable non-artillery unit first or imports missing inputs for the closest feasible recruit, allowing other construction only from unreserved resources. Immediate local defence takes priority even earlier. Its campaign target compares raw unit points with raw unit points and is bounded by its own towns and income. Serious dominance can raise the economic military budget progressively, up to 2.5 times its ordinary value; this remains a finite planning target rather than an endless response to the largest stack. Immediate defense can justify recruitment beyond this planning target. Optional recruitment has lower priority than useful development, and civilian projects reserve their ingredients once the basic field force and emergencies are covered. The first next-tier city unlock receives additional value for access to advanced units and extensions. Expansion has no fixed town-count ceiling; productive reachable sites remain candidates. It never budgets upkeep. Artillery is recruited for remaining siege requirements; unit prices, terrain and available tiers affect its other recruitment choices.

The trade market combines each surviving realm’s stored goods with six expected dice rolls of production. City levels, extension tiers, camp tiers, number probabilities and occupation all affect this forecast. Catalogue usage adds a modest demand adjustment, with bounded scarcity multipliers so absent goods never have infinite prices. Personal trade utility additionally considers the faction’s own production, diminishing value of surplus, and ingredients needed for its next project. Proposals protect already-held inputs for the proposing project and require a benefit for both sides, using the same valuation for AI acceptance. Whole-card offers stay within a 0.8–1.25 shared-market value ratio and improve on available bank alternatives for both partners; among feasible offers the planner favors a balanced mutual gain. A recipient rejects materially underpriced offers but may accept a generous offer. Runaway-leader premiums and the one-offer-per-turn limit remain. Market prices are estimates used for decisions; bank rates and construction costs do not fluctuate.

The shared phase planner uses playable research, takes available military operations, then returns to construction and trading as funds become available. A march can be followed immediately by a one-point siege or raid; stolen goods are available to its next construction decision. Active siege groups hold their position for the next operation instead of spending spare movement abandoning the siege.

The military planner equips useful Engineer siege tools before an operation and finishes legal sieges before moving armies away, attacks only with favourable calculated power, tries to combine weaker forces, and moves toward threatened friendly towns or rival towns. Immediate town threats require a revealed land path within the unit’s normal movement range; troops across disconnected water are excluded. Separate enemy stacks and factions are not combined into one hypothetical attacking army. Threatened towns retain guards, including when embarking troops; a sufficiently large army can leave a guard and send its surplus. A favorable sortie may displace the engaged enemy without annihilating it, provided unrelated threats do not leave the town exposed. Beatable blocking armies are strategic objectives, so a blocked town path does not make the entire front invisible. Idle smaller stacks converge on stronger stacks, with stable tie-breaking instead of mutually chasing each other. It accounts for terrain at the defended hex and whole-unit casualty totals. Casualty selection preserves useful units where several minimum-loss combinations exist. Fleet logistics must plan embarkation, a reachable unoccupied landing beach, naval travel and the subsequent land approach; enemy towns need not themselves be coastal. Transport construction counts existing capacity across the connected sea, so ships leaving a dock do not trigger endless replacements. After immediate local defense, stranded invasion troops reserve transport inputs ahead of additional speculative land recruitment and unrelated economic development. Safe islands with no practical land objective stop accumulating additional troops beyond a small staging force. The planner imports missing hull materials. Warships can be commissioned against reachable coastal enemy fleets even when no land army is waiting to embark; escort strength responds to visible threats. Empty, isolated lakes do not justify a navy. Troops with a viable land objective march instead of repeatedly embarking and unloading. An overwhelmingly defended reachable town does not count as a reason to strand the entire force: troops can rendezvous with transports and seek another island or another beach on the same island behind a blocked choke point. Boarding, travel and unloading remain distinct legal actions; passengers can support a landing plan from an adjacent transport. Unneeded ships return to troops awaiting an overseas passage. Seaborne troops cannot unload and attack on the same turn.

A public-board strength estimate combines towns, city levels, extensions, walls, expected income and military forces. Coalition pressure starts only beyond a **25% lead or six strength points, whichever is larger**. It then ramps sharply: a 409-to-248 lead produces about 78% crisis severity; a leader at 1.8 times the runner-up reaches the maximum sixfold target preference. Small differences remain ordinary rivalry. This applies equally to human and AI factions. As the gap closes or leadership changes, priorities are recalculated immediately, subject to any formal alliance commitment described below.

At a serious imbalance, nonleaders suspend offensive operations against other smaller factions. Actual occupation of their towns' adjacent land still justifies self-defense. They favor weaker partners close to the leading faction for supply trades, reserve more resources for resistance and prioritize its towns, fleets, towers and resource camps. Other factions already pressuring a town increase its appeal as a shared front, but armies never combine across owners. Small fast detachments accept more risk to deny valuable production, destroy camps or open raids. They still avoid deliberately losing frontal battles: only the loser takes casualties under these rules, so such attacks would not wear the winner down. Larger forces preserve sensible town guards and seek winnable engagements. Rival research identities, future dice and unexplored terrain do not enter these decisions.


Research purchases estimate the best of two discoveries over all 28 equally likely pairs using current economic and tactical needs, without reading the random stream or rival hands. Research investment scores are weighted at 75% of their estimated value, with a further 50% reduction for additional purchases in the same owner turn; these are preferences, not hard caps. Affordable research can still compete with development and can resolve an otherwise unfunded expansion plan, while immediate defense and affordable advanced-city unlocks retain priority. The AI avoids building up a backlog of unplayed cards and chooses the most useful playable effect first. Card effects are prevalidated; free recruits obey town-tier eligibility and readiness; free ships obey coastal placement, town-tier eligibility and readiness. Paid expeditions compete for reserved construction materials from owner turn six onward, on a staggered six-turn cadence, with additional opportunities for boxed-in forces that have little expansion room. Truly cornered factions consider an escape every owner turn from turn three, even without an army. Smaller realms at least 25% behind the strongest faction, with few settlement projects or at least three missing raw-resource incomes, consider expeditions every three owner turns from turn four. Their frontier connections and expedition investment receive higher scores (105% investment weight for catch-up and 115% for a true escape, versus 78% ordinarily), while urgent defense retains priority. These opportunities apply only to factions eligible under the strongest-AI expedition restriction in section 11. All three paid tiers are evaluated at their actual costs, with ordinary expedition investment weighted at 78% and a smaller routine exploration bonus. Expedition research rewards are also valued at 65% when choosing discoveries. Already funded expeditions retain their priority and printed free tier when the faction is eligible; research grants cannot bypass the restriction. Ineligible AI factions do not play expedition cards or build routes solely to reach unexplored map edges. Other useful owned cards are still played. Frontier routes receive extra value for shortages, lack of room and blocked military approaches. Expedition planning uses only revealed geometry and missing-resource values. The footprint may be previewed, but neither terrain nor numbers may influence a decision before reveal.

This is a heuristic opponent, not a claim of optimal play. The enduring checks are legal actions, progress without an action loop, resource-aware expansion, force defence, army concentration, transport, siege and victory. See the executable AI scenarios and seeded campaign reports for what is exercised.

AI Gold and bar valuations account for their guaranteed bank conversion value; Fish is valued like Grain and can cover planned Grain costs. Starting placement and expansion include Gold and fishing income. Industry planning includes Goldsmiths, Smokehouses and route fisheries. Economic collectors are built according to visible potential yield, threat and diminishing faction demand; they move separately from attack stacks to better safe harvesting sites and away from threats. Naval planning evaluates tier-specific power, speed, capacity and costs. Armed fleets value vulnerable enemy economic ships as targets. Watchtowers are built near threatened towns or stationed forces and can be destroyed as military objectives.

**15. Interface, saved games and verification**

Every turn’s roll is shown immediately, without a dice animation, alongside a full-faction production receipt showing actual delivered raw and processed goods, including zero-production players. Live receipts highlight contributing tiles. Reports dismiss after 3 seconds for human rolls and 1.8 seconds for AI rolls. They can be pinned or reopened; replay never rolls again or awards goods. Reduced-motion preferences are respected. AI pauses briefly while its receipt is visible. Restored reports preserve the actual totals without pretending that the current buildings reconstruct historical production sites.

Your settlements and cities now raise a dismissible alert when besieged, raided or destroyed. Alerts identify the attacker, report the total goods stolen or lost, and offer **Show location** even after destruction; opening the location acknowledges that alert. During play, unread alerts stay available until dismissed; repeat siege steps update that town’s warning, while separate raids remain separate notices. Hotseat players see their own alerts. Alerts do not pause AI turns. Siege badges on the map and progress bars in town details show completed steps, the remaining siege requirement after adjacent artillery, and a breached warning with destruction timing. Artillery on different hexes is not pooled. Siege progress survives save/reload; old event popups are not replayed on load.

Select a rival town to inspect every built extension, its linked resource tile and roll, tier and processed output; construction controls remain owner-only. Bank Give goods are sorted by current holdings, most first, with stable resource-order ties. The selected good stays selected after an exchange while the list reorders. An AI offer to a human opens a popup with You receive and You give, and play waits for that person. Accept transfers the agreed goods; Decline, the close button, clicking outside or Escape dismisses it without moving any resources. Offers to AI players resolve automatically, and hotseat offers use the normal handoff.

The playable browser game is in `../catane-game/`. Run `npm start` there and open http://127.0.0.1:4173. It supports five or ten human/AI seats (and existing four/eight-seat saves), shared-screen handoff, save import/export, autosave recovery, optional sound, adjustable AI speed, pause and spectator play. Its included production build requires no account, server-side application or network access during play.

The board uses the illustrated land atlas with distinctive gold veins for Gold mountains, blue water, cream roll tokens and probability pips. Resource names remain on land tiles. Ownership uses ten distinct realm colours plus badges, labels and town/army inspection. Camp markers show which side of the road they belong to and their tier. The resource bar has twenty-two literal SVG icons; selecting one opens production information, local warehouse counts and every recipe using it. Army previews calculate defender-terrain power. Siege panels display the time remaining, raid and destruction as separate actions. Raid confirmation shows the full warehouse and receiving town.

The rules engine stores canonical hex, vertex and edge IDs, individual unit readiness, local warehouses, separate camp tiers keyed by road side, city extensions keyed by tile, research hands, pending choices and per-owner siege progress. Successful commands apply to a copy of the state; rejected commands leave the live game intact. World generation, dice and research offers use separate deterministic streams. The recent chronicle is bounded; saves preserve the full current state rather than an unlimited replay transcript.

Format-1/2/3/4 saves now migrate to format 5. New watchtower records start empty. Older coastal water receives Fish according to the separate 15% roll using already revealed land; existing land is never changed into Gold. New expeditions can discover Gold. All old stocks, road ownership, dice streams and unit identities are preserved. Existing ships receive their class’s new tier-I stats. Retired Flax tiles and harbors become Salt; stored Flax becomes Salt and Rope becomes Chemicals, one-for-one, added to existing holdings. Linked camps and extensions keep their site and tier, so a former Ropery becomes Chemical works. Map coordinates, water, roll numbers, armies and random-stream state remain intact. Pending offers are converted; an offer that becomes a same-good trade is cancelled without moving resources. New land uses the weighted ten-resource distribution described above. Current saves cannot be opened by older builds.

Version-1 saves migrate automatically: old camps become tier I on their original side, an old supply phase advances to economy, and old carried goods are deposited in their owner’s nearest town. Existing revealed terrain and numbers remain unchanged; newly revealed tiles use the new 50% water rule. New campaigns use 50% water from the start. The browser’s save key is deliberately retained to find existing campaigns. Imports verify integrity and invariants before replacing play; local storage and device memory are finite even though the rules impose no map boundary.

Release checks cover deterministic independent generation; productive sevens; original costs; sequential city/extension/wall/camp upgrades; two-sided camps with no tile cap; occupation and nearest-town storage; proportional spending; no upkeep; whole-piece casualties without wounds; transport and sinking; field-only combat; artillery siege timing; complete raids and delayed destruction; research legality; expansions; save migration and corruption recovery; AI legal action sequences; and desktop/mobile browser interaction. Test reports distinguish actual results from balance hypotheses. Use TESTING.md for current measured evidence and commands to reproduce it.



**Conquest priorities and fast AI pacing.** AI factions mobilize earlier, value new settlement connections more highly, and commit larger economical forces as their public strength advantage grows. Strong leaders push their advantage; coalitions still focus on dominant factions, and the strongest-AI expedition restriction and rebellions still apply. Favorable battles receive higher priority, nearby finishing opportunities receive extra weight, and detachments send stronger surplus units while retaining required town guards. Artillery can be recruited and moved into coastal firing positions to clear hostile fleets. Losing attacks remain undesirable because they cannot damage the winner.

Campaign settings include **ULTRA FAST · 20 ms between actions**, remembered on the device. All pacing settings use identical planning and rules; thinking time is additional. Planning reuses immutable geometry and repeated board calculations without reducing search or strategic choices.

**Anti-leader raids and naval pressure.** Unbeatable occupied destinations are excluded before selecting a strategic target. Guarded towns are less attractive than exposed warehouses; cheap fast detachments can bypass defenses to raid, destroy camps and roads, or suppress production. Arriving with one movement point left for an immediate raid is rewarded. Infantry guards still protect threatened towns and favorable defensive sorties take priority. Land detours and same-island transport bypasses use only revealed legal paths. Warships can blockade productive water even without a hostile fleet; limited blockade hulls compete for supplies, while loaded transports retain their landing task. Nearby weaker factions are spared and receive bounded favorable military trades as crisis severity rises. No intentionally losing frontal attacks are added: losers cannot damage winners under these battle rules.



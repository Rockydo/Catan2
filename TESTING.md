# Release verification

## Climate generation and production: 2026-09-18

- 662 tests pass across 48 files. Thirty new tests cover all seven probability tables over 140,000 terrain rolls, effective sequential water probabilities, compatible climate borders over 30 seeded worlds and 120 expansions, immutable revealed terrain and reservations, save validation, legacy migration, all new yields, Woods choices, fixed workshop products, secondary-resource guild contracts, collector multipliers, ice movement and construction, and AI harvest choices.
- All 118 Chromium browser scenarios are verified. The initial full run passed 116; two assertions still expected the old terrain-pattern count and a Whale label without quantities. Both were corrected and passed in the targeted rerun. The targeted run passed 48 checks across Chromium, Firefox and mobile, including camera alignment, zoom sharpness, both languages, every terrain image, resource references and accessibility. A final 18-check climate/print run passed after adding all seven tables to the printed guide.
- A bounded ten-faction AI campaign reached the round-25 checkpoint with 9,050 validated commands, 350 revealed tiles, 534 units, 59 raids and 197 battles. It used expeditions and continued harvesting under the new terrain yields. The longer run was stopped for runtime before its planned 30-round completion. This is a regression sample, not a completed balance study.
- Large-map checks pass at 125, 500, 1,000 and 2,500 tiles, including an AI action, invariants and save/load at each size. These are sparse-force map checks, not late-game military benchmarks.
- TypeScript/production build, formatting, diff checks and all 12 production HTTP checks pass. Screenshots of the climate overlay, Woods selector and bilingual climate guide were inspected. Browser tests use isolated profiles and do not replace the live player’s save.
- Save envelope 8 preserves pre-climate terrain and yields. New campaigns use generation 5; expeditions extend existing climate reservations before rolling terrain. All 20 new images have production WebP files and recorded prompts in `public/assets/climate-art-v1-prompts.json`.

Evidence: `test-artifacts/climate-*`, with rule, browser, campaign and HTTP logs copied into that directory.

## Offensive AI review: 2026-09-18

- 632 unit and localization tests pass across 47 files. Nine new warfare scenarios cover minimal raid crews, keeping a siege while surplus troops move, distant defense distractions, exposed economic targets, larger transport budgets, conquest around a land choke, border expeditions, transport funding under overwhelming pressure and island recruitment.
- 30 focused browser checks pass on Chromium, Firefox and mobile, covering the AI worker, Grand campaign, siege inspection and bilingual guide. The 15 worker, Grand campaign and siege checks were repeated successfully after the final optimization.
- The final 200-action late-game replay passes command validation and state invariants. Decision times on this machine were 38.5 ms median and 44.3 ms p95. The previous AI on the same starting save measured 54.7 ms and 74.3 ms, with different subsequent decisions. These are workload measurements, not general timing guarantees.
- A separate optimization-only comparison reproduced all 200 commands and the same final game state. Caching tower support within the immutable planning frame and removing repeated stack, guard and tower-site scans reduced that revised planner’s median from 63.1 ms to 38.5 ms. Changed engine states do not reuse the cache.
- A 40-action replay starting with 1,518 units also reproduces every command and final state after optimization. Median decision time fell from 305.2 ms to 48.5 ms, with p95 falling from 314.0 ms to 65.3 ms. This sample covers recruitment and ship funding decisions, including the military scans performed before them.
- A time-bounded 10-faction campaign validates 14,019 commands through part of round 38 on 310 tiles, ending with 2,569 units. The final snapshot passes invariants and save/load validation. The run exercises 56 embarkations, 30 landings and nine expeditions; it was stopped for runtime and did not finish the planned 40 rounds. This is a regression sample, not proof of long-term balance.
- Production build, formatting and diff checks pass. The English and French rules describe the revised target selection and use of detachments.

Evidence is in the local, untracked `test-artifacts/aggressive-ai-*` files. The saved benchmark is a test fixture; the player’s live campaign was not changed.

## French localization and interactive rules

- 597 engine and localization tests pass across 45 files.
- 330 browser tests pass across Chromium, Firefox and mobile Chromium.
- The French tests recruit a unit, inspect trade inventory, buy and choose research, and switch languages without changing the saved campaign.
- The rulebook tests cover language switching, mobile navigation and search, production and siege examples, all 32 cards, all ship tiers, guild contracts, layout overflow and accessibility.
- A fresh source clone installs with `npm ci`, builds and exports both rule references without the former sibling design folder. The dependency audit reports zero vulnerabilities.
- Engine coverage: 96.56% statements, 93.24% branches, 95.90% functions and 97.29% lines.
- Two 30-round legacy campaigns execute 905 valid AI commands without invariant failures. This is a regression sample, not proof of long-term balance.
- Production build, formatting and the 12 HTTP checks pass. English and French print exports render successfully; the full French reference is 40 A4 pages.
- Desktop and mobile guide screenshots were inspected. French map labels use accented vector glyphs and shared label definitions to preserve the existing zoom approach.

The full browser run exposed stale assertions for the added Oil resource, Whale artwork and the siege-power label. These assertions now match the current game. Contrast auditing waits for the battle dialog's entrance animation to finish, and battle labels have stronger contrast. The mobile guide's search results are accessible inside its navigation drawer.

Evidence for this pass uses the `localized-` and `rules-final-` prefixes in the local, untracked `test-artifacts` folder. Reproduce the checks using the commands in README.md. Tests use isolated browser contexts and do not modify the player's live save.

## Small alliances can merge against a stronger neighbor

**593 engine tests pass across 44 files**, including fourteen merger regressions. AI prioritizes a useful two-plus-two merger over a lone recruit, with the existing four-faction, geography, common-threat, strongest-faction exclusion and 150% combined-power safeguards. Both source pacts must still need additional protection. A merger transfers all members to one pact, removes the old duplicate pact, preserves unit ownership, and keeps the later original commitment deadline without a fresh five-round lock. Existing contact pauses prevent reuniting recent former partners.

Every affected human approves, including a human inside the proposing AI's own alliance. Multi-human approval queues survive save/load; unauthorized responders and malformed queues are rejected. A later decline preserves both original pacts, while successful merging immediately permits shared passage. Existing pre-queue invitations remain compatible.

**24 browser checks pass across Chromium, Firefox and mobile**, including accept, decline, combined-power preview, deadline text, accessibility and save/reload for merger offers. Desktop and mobile screenshots were inspected. Build, formatting and all 12 HTTP checks pass. Two resumed campaigns completed **1,000 validated AI actions**, with eight alliance formations and one departure; no natural merger occurred in this bounded sample, so merger behavior is specifically demonstrated by the engine fixtures and browser checks rather than inferred from the simulation. Evidence uses the `alliance-merge-` prefix. The design, in-game rules and PDF match the new behavior.

## Alliances return to individual competition

**579 engine tests pass across 43 files**, including ten new regression cases for excessive combined power, useful modest advantages, the five-round lock, shrinking a three-member pact, oversized invitations, stopping unnecessary recruitment, retaining needed recruitment, distant powers, third-party reunion loops, and loss of a shared threat. Retention now requires a nearby common enemy stronger than each member by 15% plus four power, and combined power at most 150% of that enemy. Formation keeps its higher individual-threat threshold and uses the same combined-power limit; recruitment stops once an existing pact has 120% of the candidate threat's power. Both former partners record contact pauses when leaving.

**18 alliance browser checks pass** across Chromium, Firefox and mobile, including a loaded oversized pact that automatically dissolves after the AI's roll and records its reason. Invitation, dismissal, lock, leave, combined-power, accessibility and shared-force flows remain covered. Production compilation, formatting, and all 12 HTTP checks pass. The updated rules and PDF describe the policy; existing saves keep their original lock timer.

Two resumed four/eight-faction campaigns executed **1,000 validated AI commands**, with seven alliance formations, one departure, 21 battles, and shared allied stacks. The eight-faction sample covered one round, so it does not establish long-term breakup frequency; the deterministic regression and browser scenarios specifically exercise expiration and dissolution. Evidence uses the `alliance-balance-` prefix in `test-artifacts`.

## Alliances, larger campaigns and returning factions

**569 engine tests pass across 42 files.** Coverage includes alliance geography, four-member limits, strongest-faction exclusion, five-round commitment, partial departures, shared movement and defense, protected allies, save validation, expedition eligibility, frontier revival placement, and owner-turn rebellion timing. Seeded probability samples exercise the human 8%/4% chances and 15–35% regional share, AI 10%/5% chances and 25–45% share, one-town exemption, and the independent 10% expedition return chance. New games use 5 factions/110 tiles or 10 factions/220 tiles; existing 4/8-faction saves retain their maps.

**27 focused browser checks pass across Chromium, Firefox and mobile**, covering alliance offers, dismissal, combined power, leave controls, shared forces, frontier return announcements and location buttons, human rebellion announcements, ten-faction setup, and the tenth human player's restored turn and harvest. Three additional real-worker base-campaign checks verify the new five-faction snake setup and a complete human/AI turn cycle. Separate faction-power and army-composition browser checks also passed during integration. The production build, formatting, and all 12 HTTP checks pass.

Two new-mode AI simulations executed **7,024 validated commands**: the five-faction campaign reached round 31, and the ten-faction campaign reached round 28 at its 6,000-action cap. They formed 21 alliances, fought 188 battles, built 63 ships, and exercised transport, one rebellion and three expeditions. No natural frontier revival occurred in these bounded runs; deterministic engine and browser tests cover that feature. No campaign reached victory within this sample, so this is behavioral and stability evidence rather than proof of complete strategic balance. Median decision times were 2.29 ms and 14.42 ms; 95th percentiles were 15.07 ms and 58.81 ms on this machine.

Evidence: `test-artifacts/alliance-growth-engine-final.log`, `alliance-growth-browser-verified.log`, `alliance-base-campaign-browser.log`, `alliance-growth-ai.json`, `alliance-http.log` and `alliance-format-final.log`. In-game rules and design documents describe the same behavior. Browser checks use isolated contexts and leave the live player's campaign untouched.

## Stronger movement research

**332 engine tests pass**, including exact 1/2/3/4-group caps with +3/+3/+4/+5 movement, extending an exhausted infantry move by three tiles, expiry at the next owner turn, fleet eligibility, spent/new/embarked rejection and enemy blockers. AI evaluates the increased bonuses and can select ordinarily moved units. Campaign Orders still uses a separate fresh army for its two-step siege effect. Save validation now accepts bonuses through five; active bonuses round-trip correctly.

All **21 focused research/trade/raid browser checks** pass across Firefox, Chromium and mobile, plus three final movement-reload checks after the save-range correction. The real dialog shows remaining movement before and after the bonus; selecting an already-moved force, playing the card, reloading, and moving again succeeds. Production compilation, formatting and all 12 HTTP checks pass. Evidence uses `march-buff-` prefixes. The in-game rules, PDF and card reference carry the new values.

## Unlimited random research: 32 cards

**322 engine tests pass.** Four 1,400-offer samples cover every one of the 28 pairs per tier, require two distinct cards every time, check broad frequency bounds, retain 1,400 cards without depletion, preserve the dice stream, and round-trip the resulting saves. These deterministic sample checks diagnose sampling behavior; they are not mathematical proof of a random generator. Holdings cannot influence future offers at the same research RNG state, and reload cannot reroll a paid offer. New effect tests cover all eight additions, exact free-unit/ship counts, launch capacity, 10/20-tile expeditions, six free roads, a single-use city discount, and saved active rewards.

All **162 browser scenarios are verified across Chromium, Firefox and mobile**: 159 passed the first full run; three research-flow timeouts were followed by a corrected inspector-reopening expectation and a clean rerun of all 12 research scenarios. The final group checks the eight-effect previews, two-card offer, no public discards, reload persistence, new reward redemption and accessibility. Logs: `random-research-browser.log` and `random-research-browser-final.log`. Production compilation, formatting and all 12 HTTP checks pass. Desktop/mobile selection screenshots were reviewed.

Two Standard-AI campaigns completed 8163 validated commands, bought 249 cards and played 247. Every new effect was played across the two campaigns. One campaign ended in victory at round 84; the other remained contested after 100 rounds. Research buy valuations use the expected better choice over all equally likely pairs, and free rewards use normal legal construction plans. Evidence: `random-research-campaigns.json` and `random-research-summary.json`.

Save envelope 7 removes historical deck/discard records, preserves existing hands and already-paid pending offers, and supports saved tier-I expeditions and six-route rewards. New offers always contain two distinct cards. The map, stored goods and dice RNG are preserved.

## Compact command workspace

**308 engine tests, 159 browser scenarios and 12 production HTTP checks pass.** The browser suite runs in Firefox, Chromium and mobile Chromium and includes accessibility audits, campaign setup with the real AI worker, recruitment, naval transport, research, trade, sieges, saves and map interaction. TypeScript/production compilation and formatting pass.

New coverage checks atomic batch recruitment, exact total payment, free commissions, Fish substitution, rollback on insufficient goods and naval capacity, invalid quantities, compact map geometry, drawer controls, keyboard shortcuts while typing, remembered recruitment preferences, six visible naval purchase buttons at 1280×720, mobile overflow, enemy composition and accessibility. The former horizontal-only turn-control assertion now checks actual rectangle non-overlap because mobile controls occupy separate rows. Existing recruitment tests use the new direct tier buttons and shared deployment selector.

The initial pass exposed a raid-to-construction selection regression and low-contrast army names; both were corrected before the final full suite. New browser test text was corrected to the actual tier-I unit name, Hillguard. UI screenshots were reviewed at 1440×900, 1280×720 and 393×873. See VISUAL-REVIEW.md and `test-artifacts/ux-*`; the final browser result is `ux-browser-final.log`. QA uses isolated browser contexts and leaves the player’s live save untouched.

## Gold/Fish art, ports and census follow-up

Dedicated generated Gold and Fish paintings replace the previous map overlays. Fish uses the revised muted-teal painting, blends with the ordinary water base and skips land shading. The rendered map was visually checked at gameplay zoom in an isolated browser (`gold-fish-art-board.png`). Gold is excluded from the port generator; existing Gold ports convert to generic 3:1 ports on load or exploration, preserving locations. Fish census counts use productive tile goods, with an explicit note that fishing grounds belong to the water total.

All **270 engine tests**, **18 maritime browser checks** across Chromium/Firefox/mobile, and the production build pass. The new port regression checks cover fresh generation and saved-world corrections; the census scenario verifies two fishing grounds still count as two water tiles. Full prompts and asset provenance are in ART.md and the asset directory. Evidence uses the `gold-fish-art-` prefix.

## Maritime expansion: 2.6

The rules suite passes **268 tests across 16 files**. The full browser suite passes **132 checks** across Chromium, Firefox and mobile Chromium; the maritime scenarios are also checked again after final engine edge-case fixes. Production compilation, formatting, all 12 HTTP checks and the 123-recipe audit pass. Only City III uses five resource types; every other recipe uses at most four. The arithmetic audit covers 82,830 whole-unit casualty cases.

New rule scenarios cover the 50/50 generator across 20,000 coordinates, half-weight Gold, 15% coastal Fish eligibility, preserved legacy coastlines, Grain/Fish mixed payments, explicit trade quantities, all Gold/Gold-bar bank rates, Gold camps, fisheries, Smokehouse and Goldsmith output, all 24 hull/tier recipes and statistics, fishing and merchant production, manual merchant coverage, hostile occupation, tower placement and sequential costs, land/sea support, siege defense, tower destruction, merchant deaths, zero-power ships, tiered convoy rescue and merchant transport coverage resets. AI trade tests count Fish and Grain as a common food reserve. The leader-premium fixture excludes Fish surplus so it still isolates the effect it claims to test.

Browser scenarios build a city using Fish, upgrade a fishery, build a Smokehouse, exchange whole Gold bars, build/upgrade watchtowers at a town vertex, commission tier-IV economic ships, inspect economic-unit badges and coverage, and preserve manual merchant coverage through save/reload. Rival coverage is visible but read-only. Axe scans and screenshot inspection identified low-contrast text in the new harvest panels; that was corrected before the clean run. Existing dice, trades, coastal roads, siege alerts, military, research, accessibility and narrow-screen scenarios remain covered.

### AI observations

Four Standard-AI seeds (`maritime-audit-0` through `-3`) ran to victory or 60 rounds under the revised shared-food valuations: **4,718 valid commands**, no rejected commands or invariant failures. One campaign ended at round 56; the other three reached the 60-round observation limit. The slowest measured decision was 145 ms on this machine during concurrent verification. These are bounded observations, not a guarantee of campaign length or fairness on every seed.

| Action | Count |
|---|---:|
| settlement | 45 |
| city | 73 |
| ship | 102 |
| recruit | 258 |
| tower | 27 |
| siege | 77 |
| destroy-town | 34 |
| load | 42 |
| unload | 29 |
| resolve-battle | 115 |

AI recruits mobile merchants, develops merchant ships and fisheries when useful, sends transports across seas, upgrades cities, builds towers and attacks towns. Fishing-ship demand is map- and food-dependent: one tier-II fishing ship was bought in this final batch, while numerous transport and merchant hulls were bought. Engine tests separately exercise every ship class and tier; self-play is not claimed to have purchased every one. Income calculations are cached only within a single AI decision, and production skips warehouse searches for non-collectors.

An earlier exploratory 100-round batch is retained as `maritime-ai-initial.*`; it predates the final combined Fish/Grain valuation. It is not a controlled comparison or final performance benchmark. The final batch is `maritime-ai.*`.

### Saved campaigns and release

Six archived format-4 campaigns migrate and round-trip to format 5/generation 4 with their revealed terrain, numbers and dice stream preserved. The two unfinished campaigns each continued three rounds (122 additional valid commands total); four completed campaigns retained their outcomes. Additional scenarios preserve fisheries, towers, chosen coverage and high-tier hulls and recalculate unfinished legacy naval battles to attainable casualties under the new ship statistics.

Existing maps gain Fish on eligible coastal water but keep their revealed land. Gold and the 50/50 distribution arrive in future expeditions or new campaigns. Old Flax/Rope migrations remain supported. Tests use isolated browser storage; they do not replace the user's active campaign.

Evidence is stored in `test-artifacts/maritime-*`, including rules/browser/HTTP/format logs, screenshots, AI summaries and legacy-save checks. `releases/catane-frontiers-v2.6.zip` includes the runnable build, editable source, tests, original art and updated design. Its extracted build is boot-tested without installing dependencies; the report is `test-artifacts/v26-archive-check.json`.

## Nine goods, shared actions and market trades: 2.5

**189 engine/scenario tests and 114 browser checks pass**, across Chromium, Firefox and mobile Chromium. Production build, formatting, the 85-recipe audit and all 12 HTTP checks pass. Browser coverage includes migration from a format-3 save, exactly eighteen resource controls, retained Chemical works tiers, one-of-each camp payments, no separate military button, immediate use of raided goods to upgrade a city, and visible siege links. Accessibility and desktop/mobile screenshots were reviewed. One old mobile test still searched for the removed phase button; its locator was corrected to End turn before the clean full run.

Engine tests cover uniform selection from nine land resources, retired terrain rejection, conversion of tiles/ports/stocks/camps/extensions/production/trades/raid receipts, corrupt or overflowing legacy quantities and idempotent save/reload. Existing format-1/2 cargo and troop migration checks remain passing. Basic camps use exactly two different raw cards at one each, never their output. Original building costs remain unchanged; only City III uses five types. Current saves use format 4 and generation 3.

Movement cases cover heavy infantry adjacent, light infantry moving one tile, cavalry moving two tiles and artillery adjacent before a raid. Siege steps also accept prior movement and consume one remaining point per participant. Tests reject spent, newly recruited, exhausted or blocked forces; preserve the per-town operation limit and later-turn destruction; and verify an AI march can lead to a siege and construction in the shared phase. Research commissions now work throughout that phase when their other prerequisites are met. Two earlier city-priority assertions were updated to allow marching before the still-required same-turn city upgrade.

Market tests cover every realm’s stockpiles, probability-weighted industry and camp production, occupation, upcoming project inputs, diminishing surplus value, mutually useful near-market offers and matching AI acceptance. The leader test now uses a legal grain-for-wool trade instead of the formerly synthetic grain-for-grain bundle. No future dice, hidden research identities or unrevealed tiles enter market prices.

Six Standard-AI campaigns (`ai-audit-0` through `ai-audit-5`, at most 120 rounds) completed **8,621 legal commands**, **429 trade offers**, **167 camp operations**, **86 new settlements**, **117 city upgrades** and **207 attacks**. Four reached victory, two remained contested. The longest decision was 66 ms on this run. All 24 factions recruited; median first recruitment was round 5, latest round 20. This batch changes both the resource distribution and action rules; it is not an isolated balance comparison with 2.4.

Four archived format-2 campaigns were migrated and continued for up to thirty more rounds: **2,494 valid commands**, **133 trade offers**, **43 new settlements**, **44 city upgrades**, and one new victory. Periodic state invariants and final save validation passed. These finite campaigns demonstrate legal progress and working migration, not guaranteed completion or equal strength on every random map.

Reproduce with `npm test`, `npm run test:e2e`, `SEEDS=6 ROUNDS=120 AUDIT=nine-goods WRITE_SAVES=1 npx tsx scripts/ai-audit.ts`, and `AUDIT=nine-goods npx tsx scripts/ai-resume-audit.ts`. Evidence is in `test-artifacts/nine-goods-*.log`, `nine-goods-summary.json`, `nine-goods-balance.json`, `ai-nine-goods.json`, `nine-goods-resumed-campaigns.json` and the desktop/mobile screenshots. The extracted 2.5 release also starts without node_modules, loads the rules and assets, and runs worker setup with no browser errors (`nine-goods-archive.log`, `v25-archive-check.json`). Historical verification follows below.

## Town attack alerts and siege indicators

**173 engine tests and the full 105 browser checks pass.** Twelve focused checks across Chromium, Firefox and mobile Chromium also pass after the final location-navigation polish. They exercise real worker attacks, owner-only siege/raid/destruction alerts, exact stolen and destroyed goods totals, locating a destroyed town, siege progress after reload, and accessibility. Engine scenarios cover repeat raids, destruction timing, reinforcement and withdrawal, artillery kept separate across hexes, saved attack records, and unique event IDs after the history cap. Opening an alert’s location acknowledges it and focuses the map; the mobile action panel closes so it does not cover the destination.

Axe found that an overflowing town-details panel could not be scrolled with the keyboard; action panels now accept keyboard focus. Desktop and mobile screenshots were reviewed, with siege badges placed above towns to separate them from the nearby invading counters. TypeScript/build, formatting, the rendered rules and 12 production HTTP checks pass. Evidence: `test-artifacts/town-alert-engine.log`, `town-alert-full-browser.log`, `town-alert-browser.log`, `town-alert-build.log`, `town-alert-format.log`, `town-alert-docs.log`, `town-alert-http.log`, and the `town-alert-*.png` / `town-location-*.png` screenshots.

Alerts remain queued during the current campaign session, with at most thirty recent notices. Historical popups do not replay on load; saved siege indicators and the recent chronicle remain available. No combat costs, timing rules, AI policy or dice behavior were changed.

## Immediate dice and shorter reports

The dice and four-realm production receipts now appear immediately, without a tumble, result bounce or staggered row fade. Reports dismiss in 3 seconds for human rolls and 1.8 seconds for AI rolls; Keep open and replay remain available. The countdown uses the same duration as the dismissal timer. All 18 targeted Chromium, Firefox and mobile Chromium checks pass, covering immediate visibility, exact production, no duplicate replay gains, repeated results, both motion preferences, accessibility, pinning, AI pause/resume and timed dismissal. Build passes. Evidence: `test-artifacts/immediate-dice-build.log` and `immediate-dice-browser.log`. The initial accessibility checks exposed partially faded receipt text; removing the row entrance fade resolved it.

## Camps, four troop ranks and AI development: 2.4

Verified on 11 September 2026. **169 engine/scenario tests pass**, together with the full existing **84 browser checks** and **3 added recruitment checks** across Chromium, Firefox and mobile Chromium. TypeScript/production build, formatting, the 90-recipe audit and 12 HTTP checks pass. The added browser test initially used an exact button name that omitted the resource-price text; correcting its locator produced the clean three-browser result. Current evidence uses the `v24-` prefix.

Camp checks require exactly two raw types and three total cards, exclude the camp’s own output, preserve original building prices and validate the whole catalogue. Wood and Clay demand across one of every basic camp falls from 18/30 to 8/30 cards. Four new troop recipes each contain exactly one processed-good type. All sixteen units are recruited through the engine; tier IV town eligibility, whole-unit casualties, terrain bonuses, ordinary and free unlimited recruitment, payment, exhaustion of resources and next-turn readiness are covered. The new browser scenario purchases six tier-II troops and a tier-IV troop at one town, verifies the generated art loads, and reloads the resulting save.

Format-1/2 saves migrate to format 3. Tests preserve maps and inventories, remap old elite unit identities and outstanding free-unit grants once, retain ship tiers, and recalculate pending battle powers and attainable casualties. Save/reload preserves the dice stream. Old builds cannot read format-3 saves. Research cards still have three tiers and their printed numeric unit grants; already active old grants retain the units they promised through migration.

### AI behavior

Regressions exercise a favorable six-against-five sortie that inflicts one casualty instead of demanding a wipeout, movement toward a beatable army blocking a town path, separate enemy stacks, slow-unit threat range, bounded speculative recruitment, economic development with a funded field army, both advanced city unlocks and direct tier-IV AI recruitment. Existing proactive defense, leader pressure, trade, fleet transport and siege scenarios remain passing.

Six Standard-AI seeds (`ai-audit-0` through `ai-audit-5`), up to 120 rounds each, were run before and after the combined update. Both batches use the same initial map generation; camp prices, troop tiers, recruitment rules and AI policies change together, so this is not an isolated causal estimate of one AI adjustment.

| Measure | Previous build | Final 2.4 |
|---|---:|---:|
| Valid commands | 14,533 | 11,999 |
| Recruits purchased | 1,239 | 662 |
| Attacks initiated | 152 | 184 |
| Settlements founded after setup | 60 | 106 |
| City upgrades | 62 | 204 |
| Conquests completed by cutoff | 2 / 6 | 3 / 6 |

The final run includes **93 upgrades to City I, 72 to City II and 39 to City III**, and recruits 122 new tier-II troops plus 9 tier-III troops. No tier-IV troops happened to be purchased in this batch; a dedicated funded scenario verifies that the AI chooses and legally recruits them. The largest stack reached 119 unit points, versus 92 before: the policy reduces repeated speculative purchasing overall, not every individual army’s size. Three campaigns remain contested. The longest measured decision was 681 ms. This is evidence of more economic development and active combat, not proof of optimal strategy, equal faction strength or guaranteed stalemate elimination.

Reproduce: `SEEDS=6 ROUNDS=120 AUDIT=frontier-final WRITE_SAVES=1 npx tsx scripts/ai-audit.ts`. Reports: `ai-stalemate-before.json`, `ai-frontier-final.json`, and `v24-campaign-summary.json`. The original batch is reproducible with the archived 2.3 implementation; its generated states are included under `test-artifacts/stalemate-before-saves/` for migration and continuation checks. `npx tsx scripts/ai-resume-audit.ts` migrates four old unfinished campaigns and runs up to thirty additional rounds, validating every action and periodic state invariants. The four continuations completed 2,471 valid actions, 29 new settlements, 43 city upgrades, 23 resolved battles and 19 town destructions; one reached victory and three remained contested. Cached land-objective and invasion-coast queries remove repeated planning for co-located troops. Repeating the six-map batch retained every recorded outcome and action total while reducing the longest measured decision from 681 ms to 89 ms (`v24-cache-comparison.json`). The unchanged outcomes and action totals are checked again in `ai-frontier-cached.json`; worker trade, raid and recruitment controls pass nine targeted browser checks after the optimization (`v24-final-browser.log`).

### Dice verification

The production dice implementation draws two values from its seeded pseudorandom stream and maps each to faces 1–6. It has no special weighting for eight, player-dependent adjustment or streak correction. Research uses a separate RNG state; map generation uses coordinate hashing. Animation and harvest reporting use the stored pair; tests verify actual production, replay without additional awards, stream separation and continuation across saves.

`npx tsx scripts/dice-audit.ts` checks **2,000,000 rolls across twenty seeds** using the engine generator and actual two-draw formula. Eight appeared **278,122 times (13.9061%)**, versus 13.8889% expected. Six appeared 278,121 times; seven appeared 333,253 times (16.66265%). The 36 ordered face-pair chi-square statistic was 21.98 with 35 degrees of freedom. No observed total differed from its expected frequency by more than 0.023 percentage points. This sample found no distribution problem; it does not establish physical randomness or diagnose an unprovided player history. The generator was left unchanged. Full distribution: `v24-dice.json` / `v24-dice.log`.

Visual review: the sixteen-unit roster and desktop/mobile recruitment and army views were rendered and inspected (`test-artifacts/military/`). The new tier-II atlas and its complete generation prompt ship with the design. Packaging includes the runnable build, source, rules, assets and verification evidence.

## Oceans and fleet priorities: 2.3

Verified on 11 September 2026. **150 engine/scenario tests**, **84 production browser checks** across Chromium, Firefox and mobile Chromium, and **12 HTTP checks** pass. TypeScript/build, formatting and the 86-recipe design audit pass. The added generation configuration requires a JSON import attribute in the browser-test runner; this was corrected before the successful full browser run.

The shared generation setting is 45% water / 55% land for new campaigns and expeditions. Each raw good has 5.5% probability per new tile. The source generator, expedition panel and design audit use that setting; 10/20/40-tile discovery chances are 43.20% / 67.74% / 89.59%. Tests check the per-coordinate threshold and preservation of existing terrain rather than requiring an exact water quota in every random map.

The previous 2.2 campaign audit already recorded 33 mobile ships, so fleet construction existed. This revision reserves transport inputs when an army has a reachable overseas objective but no land approach, imports missing hull materials, and allows warship construction against coastal naval threats without requiring waiting land troops. Tests include building a fleet from scratch and completing an island conquest, defending a coast without a land invasion force, avoiding empty isolated lakes, and counting ships elsewhere in the connected sea before ordering replacements. Basic land defense keeps priority.

The final twelve-seed, 120-round batch completed 24,215 valid actions with no invariant failures. Fleets were built on 6 of the twelve maps: 54 ships, 42 embarkations and 27 landings. First fleet construction ranged from rounds 8 to 119; this is conditional strategic behavior, not a promised timetable. Six campaigns completed conquest and six remained contested at the cutoff. The longest individual decision was 480 ms. This does not establish optimal play or guarantee a fleet on every map.

Evidence: `test-artifacts/ocean-engine.log`, `ocean-targeted.log`, `ocean-browser.log`, `ocean-build.log`, `ocean-format.log`, `ocean-http.log`, `ocean-balance.json`. Final seeded results are in `ai-ocean.json` / `ai-ocean.log` and `ocean-summary.json`. Reproduce with `SEEDS=12 ROUNDS=120 AUDIT=ocean npx tsx scripts/ai-audit.ts`. The new probability changes seed layouts, so these are not a direct same-map balance comparison with 2.2. Historical evidence follows.

## Dice, military, AI and intelligence: 2.2

Verified against the production build on 11 September 2026. **136 engine/scenario tests** pass; the full production browser suite passes **84 checks** (28 scenarios × Chromium, Firefox and mobile Chromium), with no retries. The final sword-emblem change and fresh-campaign trade handling are checked again in `v22-final-interactions.log`. The HTTP suite passes **12 checks**. TypeScript/build, formatting and 100/500/1,000/2,500-tile state, AI-decision and save checks pass. Logs use the `test-artifacts/v22-` prefix.

New coverage verifies actual four-player raw/processed dice receipts, occupation and camp accounting, report replay/reload without duplicate production, repeated identical rolls, reduced motion, mobile scrolling, AI report pacing, all twelve troop ranks, mixed-army clicks, rival extension inspection, research-count privacy, and bank sorting/selection stability. Live worker offers wait for a human; Accept, Decline, close and Escape are exercised. Repeat raids use real new production, retain destruction authorization and obey whole-turn limits, artillery changes, reinforcement blocking and save round trips. Accessibility checks cover the new receipts, military lists, research intelligence and trade popup.

Rules/AI coverage: **92.38% lines**, **91.21% statements**, **83.11% branches**, **88.31% functions**. The large-world smoke check measured 4 / 13 / 16 / 36 ms for one economy decision at 100 / 500 / 1,000 / 2,500 tiles on this machine; it is not a full campaign benchmark at those sizes.

### Movement interception follow-up

Eight additional regression checks verify existing army and fleet interception: no movement through enemy hexes (including bonus movement and direct commands), legal detours with full movement cost, combat ending movement even after victory, passage opening on the next turn, and friendly-unit passage. Both the AI path search and actual movement validator are covered. No gameplay behavior was changed. Evidence: `test-artifacts/v22-movement.log`. The rulebook now states the blocking rule explicitly.

### AI review and final campaign evidence

The baseline reproduced the user’s concern: on twelve Standard-AI seeds, first recruitment had a median of **round 19** (latest 24). Economic scores repeatedly displaced the initial defensive force, and no player trade offers were generated. The revised planner reserves a minimum field force, imports missing inputs, holds threatened towns, releases surplus guards, responds to public leadership changes and proposes bounded mutually useful trades. Dedicated scenarios cover terrain, disconnected islands, rival-faction separation, leader targeting/trade premiums, transport capacity across a sea and prevention of embark/unload loops.

The final batch runs the same `ai-audit-0` through `ai-audit-11` seeds, four Standard AI seats, normal costs and resources, up to 180 rounds. **22457 legal actions; 8 completed conquests; 4 campaigns still contested at the cutoff.** Winning campaigns ended in rounds 22–59. It includes 1134 player trade offers, 1404 recruits, 258 resolved battles, 125 town destructions, 26 embarkations and 19 landings. No invalid command, invariant failure or action-limit loop occurred. The longest individual decision was 422 ms.

First recruitment now has a median of **round 4**. 44 of 47 factions that recruited did so by round 10; three late cases recruited in rounds 12, 14, 23. One faction was eliminated before recruiting. The budget cannot manufacture absent resources or recruit from a besieged town. These are bounded automated results, not equal-seat balance or guaranteed completion on every random map. The earlier intermediate audits remain separate from final evidence.

Evidence: `ai-baseline.json`, `ai-release.json`, their `.log` files and `v22-ai-summary.json`. Reproduce with `SEEDS=12 ROUNDS=180 AUDIT=release npx tsx scripts/ai-audit.ts`. The extracted 2.2 archive boot check is recorded in `v22-archive-check.json`; it starts without installing dependencies. Existing format-2 saves remain compatible, including saves created before the optional AI trade-offer tracking field.

The following sections retain the historical 2.1 and 2.0 release evidence.

## Visual update 2.1

The final graphics build passes **116 engine tests**, **57 browser checks** (19 scenarios in each of Chromium, Firefox and mobile Chromium), **12 HTTP checks**, TypeScript/build and formatting. Logs: `test-artifacts/polish-engine.log`, `polish-browser.log`, `polish-http.log`, `polish-build.log`, `polish-format.log`. The browser suite includes axe-core on the menu, game, all five action panels and resource guide. A low-contrast mobile research empty state found during this pass was corrected before the final run.

New checks verify keyboard harbor inspection, cursor-anchored zoom, pan accuracy with SVG letterboxing, compact large-resource counts and nonoverlapping mobile turn controls. Screenshot passes review desktop (1600×1000), laptop (1280×800), mobile (390×844), compact (320×740), advanced towns and the complete faction miniature roster; see `VISUAL-REVIEW.md`. The extracted 2.1 release boot check is in `test-artifacts/polish-archive-check.json`.

The following records describe the preceding rules release. The rules and AI code are unchanged by 2.1; those seeded campaigns and coverage figures were not rerun for this visual update.

Verified 11 September 2026 against the local production build. The implemented scope is a four-player local browser game with human/AI seats, not an online multiplayer service.

| Check | Result | Evidence |
|---|---|---|
| Extracted release archive | Starts without node_modules; game, rules and all three art assets load | `test-artifacts/release-archive-check.json` |
| Clean dependency installation | Passed, locked dependencies | `test-artifacts/v2-clean-install.log` |
| TypeScript and production build | Passed | `test-artifacts/v2-clean-build.log` |
| Engine and scenario suite | **116 passed** | `test-artifacts/v2-coverage.log` |
| Production browser suite | **48 passed**, no retries | `test-artifacts/release-v2-check.log` |
| Accessibility | No WCAG A/AA violations in tested menu, game, five action panels and expanded resource guide | Browser suite uses axe-core |
| Production HTTP server | **12 passed** | `test-artifacts/v2-http.log` |
| Large-world state/AI smoke checks | 100, 500, 1,000 and 2,500 tiles passed | `test-artifacts/v2-stress.log` |
| Rules and economy audit | **86 recipes**, **13,122 casualty arithmetic cases** | `../catane-design/balance-audit.json` |
| Production dependencies | **0 reported vulnerabilities** at audit time | `test-artifacts/v2-dependencies.json` |
| Formatting | Passed | `test-artifacts/v2-format.log` |

Browser coverage consists of 16 scenarios run in desktop Chromium, desktop Firefox and Pixel 7-sized mobile Chromium. It exercises the real production UI: fresh campaign and worker AI, snake setup, turns, towns, walls, extensions, research, imports, trades, movement and combat, casualties, siege victory, transport and landing, route relocation, expeditions, hotseat privacy, saves/reload/corruption, camps on both road sides, independent camp upgrades, complete warehouse raids, resource help and artwork loading. Firefox's atlas hit-testing bug was fixed and the full suite rerun successfully. Mobile action panels are exercised directly.

Engine regressions cover no military maintenance, normal seven production, preserved original prices, full city raw output plus extensions, all six road sites around a resource tile, tier-II camp production and road destruction, nearest-town delivery, proportional payment, occupation, whole-piece casualty choices, artillery siege timing, field combat without wall bonuses, every research effect and its legal phase, fleet capacity and sinking, readiness, save corruption, first-edition migration and recalculation of pending old fortified battles. A dedicated AI scenario completes embarkation, travel, landing, an inland march, siege, raid, destruction and victory.

The code coverage instrumented by Vitest is the rules/AI layer: **88.06% lines**, **86.25% statements**, **76.39% branches**, **78.68% functions**. The worker bridge is exercised in browser tests rather than included as a unit-covered function. Coverage is evidence of exercised code, not a guarantee of correctness.

The large-world smoke check measured AI economy decisions at 3 / 12 / 18 / 24 ms for 100 / 500 / 1,000 / 2,500 tiles on this machine, with successful save validation and round trips. The 2,500-tile save was 1,983,627 bytes. This is a bounded state/decision check, not a claim of a 2,500-tile campaign at constant frame rate. Browser storage, memory and practical map navigation remain finite.

## Seeded campaign evidence

The final batch uses 16 independent `soak-0` through `soak-15` seeds, four Standard AI players, normal resources and rules, up to 180 rounds. Commands pass through the same validator as human play; state invariants are checked every 25 commands and at campaign completion. Aggregate measurements are in `test-artifacts/release-v2-soak-summary.json`, with the complete run in `test-artifacts/release-v2-soak.log`.

**44,533 valid actions; 9 completed conquests; 7 campaigns still contested at the cutoff.** Completed games ended in rounds 56–156. The longest measured decision was 73 ms; exploration grew a map to 130 tiles. The batch included 12 expeditions, 36 embarkations, 34 landings, 483 resolved battles and 238 town destructions. No invalid command or invariant failure occurred.

These runs check stability and that the AI can expand, import missing resources, build industry and armies, transport troops, siege and win. They do not prove equal seat win rates or human-level strategy. Some campaigns remain contested at the test cutoff; the game has no forced turn limit. Independent resource rolls and the winner-takes-no-casualties combat rule can produce long or uneven games. The audit's recipe-use counts measure coverage, not observed human demand. No resource guarantees, upkeep or automatic victory shortcut were added to improve the figures.

## Reproduce

```sh
npm ci
npm run check
npm run test:coverage
npm run format:check
FACTIONS=4 SEEDS=16 ROUNDS=180 npm run test:soak
npm run test:stress
# With npm start running:
npm run test:http
# With the sibling design folder present:
python ../catane-design/balance_audit.py
npm run docs
```

Install browser binaries with `npx playwright install chromium firefox`; on a fresh Linux CI image use `--with-deps`. The test configuration uses system Chromium when present, otherwise Playwright Chromium. WebKit/Safari was not tested in this environment. CI performs the build, rules/coverage, browser, formatting, a shorter seeded batch and the large-world check.

Release screenshots are in `test-artifacts/v2-menu.png`, `v2-board.png`, and the per-browser campaign images. The standalone HTML/PDF rulebooks and bundled in-game rulebook contain the second-edition prices and mechanics. Old iteration logs are retained locally for diagnosis; the final evidence is the set named explicitly above.

## Coastal road correction: 2026-09-12

- 194 engine tests passed, including five new coastal-road scenarios: costs and camps, sea-only shipping, setup validation, save correction, frontier correction and AI route types.
- Browser suite: 113 passed initially. Three relocation fixtures still assumed coastal shipping, and the new mobile test needed to reopen the automatically closed action panel. Updated those fixtures; all six focused coastal/relocation checks then passed on Firefox, Chromium and mobile, covering all four initial failures. No product changes were needed after the initial browser run.
- Production build, formatting and all 12 HTTP checks passed; rules HTML/PDF regenerated. User campaign left untouched for refresh and continue.


## Complete merchant and fleet artwork: 2026-09-14

- All 44 land-unit and ship portraits rendered in the actual `MilitaryPortrait` component; all nine painted art sheets loaded with no browser errors. Reviewed the full roster and merchant detail screenshots for framing, tier distinction and readability. Evidence: `test-artifacts/complete-roster.png`, `test-artifacts/complete-roster-review.json`.
- Six existing browser checks passed across Firefox, Chromium and mobile Chromium, covering all twenty land portraits, army counters, tier-IV fishing/merchant ship recruitment and harvest details. Evidence: `test-artifacts/complete-roster-browser.log`.
- Production build and formatting passed. This artwork-only follow-up does not alter game rules or saved campaigns.


## Destruction spoils: 2026-09-14

Town destruction now transfers the full remaining warehouse to the attacker's nearest town before removing the target. Two regression scenarios cover settlement and level-4 city destruction after a prior raid, replenished stock of all 21 goods, exact destination and pooled totals, untouched other warehouses, event contents, save round trips and rejected repeat destruction. All 272 engine tests and 12 town-alert browser checks passed (Chromium, Firefox and mobile). Production build, rules generation and formatting passed. Evidence: `test-artifacts/destruction-spoils-*.log`.


## Four-tier research and alternative watchtower foundations: 2026-09-14

- **299 engine tests pass.** New cases cover all four purchase recipes/unlocks, three distinct choices, exhausted decks, exact payouts, tier-II/III/IV ship and recruit commissions, discounts, naval movement, AI purchases and tactical siege research, save-format-6 migration of old hands/decks/pending choices without changing inventories or dice, and two Wood OR two Stone for a watchtower base.
- **All 144 browser scenarios verified across Firefox, Chromium and mobile.** Full run: 140 passed; a raid fixture accidentally expected 421 instead of its seeded 321 Grain, and one Firefox accessibility check sampled the modal fade mid-animation. Corrected the fixture and waited for the actual animation completion before auditing. All six focused reruns passed, covering those four failures on all browsers. The preceding 24 research/watchtower-focused checks also passed.
- Visually inspected desktop and mobile discovery screenshots. Three distinct cards, tier emblems, reward previews, next-turn restrictions and active commission reminders are exposed in the UI. Privacy checks scope rival hand information separately from the intentionally public catalogue.
- Production build, formatting, all 12 HTTP checks and the recipe audit pass. Audit: 125 recipe entries, only City III uses five resource types; tier-II research has one processed type. Watchtower alternatives are represented as separate recipes. Published HTML/PDF and in-game rules regenerated.
- Evidence: `test-artifacts/research-four-engine.log`, `research-four-browser-full.log`, `research-four-browser-rerun.log`, `research-four-browser-final.log`, `research-four-campaigns.json`, and the `research-four-choice-*.png` screenshots. Campaign simulations use four independent Standard-AI seeds, up to 100 rounds, with command validation and state invariants every 25 actions. These are bounded strategy/stability checks, not proof of equal faction win rates.

Final campaign results: **371 purchases; 367 cards played; 11,786 validated actions**. Purchases by tier: I 272, II 64, III 27, IV 8. Two conquests completed in rounds 59 and 89; two remained contested at round 100. All four starting seats bought research across the batch; no faction had more than one unplayed card at the final snapshots. Armies, ships, city upgrades and expansion remained active. See `test-artifacts/research-four-summary.json`.


## Direct road and sea-route connections: 2026-09-15

Roads and sea routes now share network junctions without requiring coastal towns. Six new engine regressions cover road–sea–road construction and exact costs, ownership/enemy-town/tower restrictions, fleet/army blocking, AI path transitions, mixed-network open-end detection and relocation onto a road endpoint. All **338 engine tests pass**. All **nine focused browser checks pass** across Firefox, Chromium and mobile: clickable mixed-route construction with save/reload, sea-route relocation, and new-game setup with an AI turn. Build, formatting, regenerated HTML/PDF rules and all **12 HTTP checks** pass. Evidence: `test-artifacts/mixed-routes-*.log`.

## Adaptive resistance, Grand campaign and map performance: 2026-09-15

- **353 engine tests pass** across 24 files. Added scenarios cover dominance thresholds and scaling, identical treatment of human/AI leaders, shifting allegiances, self-defense, bounded favorable military trades and resistance to abusive offers, cheap production disruption, camp destruction, every paid expedition tier, strongest-first safe embarkation, exact cached path equivalence, eight-player setup/turn order/ownership and save validation.
- **180 browser scenarios pass** in the full Firefox, Chromium and mobile Chromium suite after the renderer changes. New camera checks cover actual pointer dragging without accidental game actions, cursor-anchored zoom, synchronized terrain/interaction layers, reset, resize, keyboard selection, dice-label toggles and army movement after recentering with save/reload. Existing tests cover construction targets, frontier expansion, transport/landing, merchant coverage, combat, sieges, research, trade dialogs, accessibility and live AI workers. Grand-campaign checks cover all eight configurable seats, 200 initial hexes and eight harvest receipts. Desktop/mobile screenshots were inspected for terrain art and overlay alignment.
- Build, TypeScript, formatting, regenerated HTML/PDF rules and all **12 production HTTP checks pass**. User browser storage and the current campaign were never accessed by the tests; all browser fixtures use isolated contexts.

Two deterministic Standard-AI campaigns supplied **9,311 validated actions** in the reported checkpoints: 35 completed rounds for four factions and 34 completed rounds for eight. The eight-player audit is deliberately bounded at its saved round-35 entry; later partial-round actions are excluded. Together the checkpoints contain 114 initiated battles, 16 paid expeditions (27 including research grants), 118 ship constructions, 10 embarkations, eight landings and 13 town destructions. The eight-faction world grew to 410 tiles. State invariants were checked during play and the final checkpoint was deserialized and validated. These two seeds demonstrate exercised behavior, not equal win rates or optimal coordination. Controlled regression fixtures separately verify leader targeting, truce changes and actual accepted aid offers. A later ten-decision check of the large checkpoint also exercises the final boarding/trade safeguards.

Evidence: `coalition-engine.log`, `coalition-browser-final.log`, `coalition-audit-summary.json`, `coalition-campaigns.log`, `coalition-snapshot-report.log`, `coalition-decision-check.log`, `coalition-build.log`, `coalition-docs.log`, `coalition-format.log`, `coalition-http.log`, and `map-camera-{firefox,chromium,mobile}.png` in `test-artifacts/`.

### Map performance measurements

Measured with the production build in isolated headless Chromium at 1920×1080. Each fixture has eight human factions, a seeded map, roads, developed towns and units; AI does not run. Baseline and final camera sequences send 100 frame-paced pan events and 40 zoom events. The final audit additionally uses actual browser mouse dragging, tile selection, a peaceful army move and two seconds idle. Waits allow fonts/art to load; the benchmark itself adds no permanent instrumentation to the game.

| Populated map | Towns / units | Pan median / 95th percentile | Actual mouse drag median / 95th | Zoom median / 95th | Camera scripting | Camera layouts |
| --- | --- | --- | --- | --- | --- | --- |
| 200 tiles | 56 / 50 | 16.7 / 16.7 ms | 16.7 / 16.8 ms | 16.7 / 16.8 ms | 15.6 ms | 2 |
| 500 tiles | 116 / 125 | 16.7 / 16.7 ms | 16.7 / 16.7 ms | 16.7 / 33.3 ms | 16.9 ms | 2 |
| 1000 tiles | 116 / 250 | 16.7 / 16.8 ms | 16.7 / 16.8 ms | 16.7 / 16.8 ms | 18.0 ms | 2 |

The original 1,000-tile renderer measured **133.3 ms median pan frames (about 7.5 fps)**, 233.2 ms at the 95th percentile, 8,850 ms camera scripting and 174 layouts. The final renderer measures **16.7 ms median frames (about 60 fps)**, 16.8 ms at the 95th percentile, 18 ms scripting and two layouts. Shared patterns fall from 578 to 12. The final zoom sequence still has two brief rasterization tasks when movement settles (58 and 76 ms); it is not a claim that every possible frame is below 16.7 ms.

At 1,000 tiles, repeated selection takes 33.8 ms median / 116 ms at the 95th percentile, including two animation frames and inspector changes. The full automated move interaction: opening move controls, selecting a valid destination, validating/persisting the move and two presentation frames: takes 327 ms. The two-second idle interval records zero scripting and 0.3 ms total task work. These measurements are workload/browser specific, not a guarantee for all hardware or unbounded expedition sizes. No art resolution, gameplay rule or save persistence was removed to obtain them.

Raw measurements, fixture saves and screenshots: `test-artifacts/map-before.json` and `map-release-{200,500,1000}.{json,png}`. The benchmark is `scripts/map-performance.ts`. The browser suite separately verifies actual input behavior and storage correctness across all three browser configurations.

## Wheel-zoom follow-up: 2026-09-15

The wheel-specific profile found two costs missed by the original rapid-zoom benchmark: redraws between individual wheel notches, and browser SVG text layout on scale changes even when the camera viewBox was unchanged. Changing only the redraw delay did not remove the latter; diagnostic traces and a text-disabled control isolated it.

The final renderer uses cached vector outlines for map labels, with shared definitions for common resource names/numbers, accessible labels/titles and a bounded cache for changing army counts and siege text. It uses the same Noto Sans family; font provenance and the SIL OFL license are included. All terrain, unit art, numbers and labels remain visible at full detail. Ordinary HTML interface text is unchanged.

This initial zoom fix waited 600 ms of quiet input (superseded by the sharpening follow-up below); ordinary map clicks no longer force a synchronous zoom refresh. An indexed scene excludes distant terrain, targets, roads/camps, coasts, harbors, towers, towns and armies, keeping a quarter viewport of overscan plus an 80-world-unit art margin and refreshing before hidden content could enter view. Resize observation targets the fixed HTML viewport rather than the drawing. The invisible input surface follows the viewport instead of inflating the scene bounds. Game state and saving are unchanged.

### Final performance evidence

Production build, isolated headless Chromium, 1920×1080, 1,000 tiles, 116 towns and 250 units; no AI runs. The test sends actual wheel input up to deep zoom, then twelve alternating zoom steps. The sparse variant leaves 400–420 ms between steps. Final runs also wait for the settled redraw, not just the input frames.

| Sequence | Median / 95th-percentile frame | Main-thread task work | Layout passes | Tasks at least 50 ms |
| --- | --- | --- | --- | --- |
| Original, 160–180 ms notches | 16.7 / 50.0 ms | 3420 ms | 42 | 42 |
| Final, 160–180 ms notches | 16.7 / 16.7 ms | 472 ms | 2 | 1 |
| Final, 400–420 ms notches | 16.7 / 16.7 ms | 527 ms | 2 | 1 |

The final deep-zoom portion uses about **6–7 ms total layout time**, rather than the hundreds of milliseconds seen in the diagnostic traces. The single remaining long task is about 50–55 ms; this is not a claim of zero stalls on every machine. The complete 1,000-tile map benchmark also preserves approximately 60 fps dragging, 33.4 ms median selection latency and zero idle scripting over two seconds. It exercises army movement, persistence and camera input. Evidence: `zoom-verified.json`, `zoom-verified-sparse.json`, `zoom-map-verified.json`, their screenshots and logs in `test-artifacts/`. Reproduce with `scripts/zoom-performance.ts` (optionally `GAP=400`) after generating the populated fixture using `scripts/map-performance.ts`.

New browser scenarios check deep-zoom visibility, continuous viewport coverage across repeated drags and rapid zoom-out, full-map restoration, vector labels with accessible names, cursor anchoring, resizing and army movement/save reload. Final browser results are recorded below. Build, TypeScript, formatting and all 12 production HTTP checks pass. The player's active browser storage remains untouched.

**All 183 browser scenarios verified on the final build.** Chromium completed 61/61. The concurrent Firefox/mobile runs completed all gameplay assertions but six cases hit a shared Playwright trace-output cleanup collision at context close (ENOENT); their remaining counts were 57 and 59. Rerunning the affected groups through one runner with a separate output directory passed all 12 executions, covering all six cleanup errors. No product change was required. Evidence: `zoom-final-{firefox,chromium,mobile}.log` and `zoom-final-rerun.log`. Use distinct output directories when running separate Playwright processes concurrently.

## Prompt zoom sharpening: 2026-09-15

Reduced the camera's quiet-input delay from **600 ms to 80 ms**. Fast wheel/trackpad gestures still use the composited layer; isolated notches and the end of a gesture restore the full-resolution SVG promptly. No art, game-state or save changes. A trial with periodic mid-gesture redraws introduced extra rasterization stalls and was not retained.

The same populated 1,000-tile fixture was measured in isolated headless Chromium at 1920×1080. The benchmark now records the first animation-frame observation of restored SVG geometry after a wheel event, in addition to frame times and browser work. This measures readiness for presentation, not physical display latency.

| Wheel spacing | Median / 95th-percentile frame | Median / longest observed sharpening delay | Layout passes |
| --- | --- | --- | --- |
| 160–180 ms | 16.7 / 16.8 ms | 83.2 / 97.2 ms | 42 |
| 400–420 ms | 16.7 / 16.8 ms | 83.1 / 103.9 ms | 42 |
| Rapid 16–36 ms | 16.7 / 16.8 ms | 83.5 / 207.1 ms | 4 |

Individual notches now intentionally refresh more often than the previous 600 ms batching policy. The ordinary-notch run has no 50 ms long tasks. Sparse and rapid runs still contain occasional rasterization stalls (longest tasks 114 and 190 ms respectively), so this is not a guarantee of perfectly uniform frames. All three retain approximately 60 fps at the median and 95th percentile. Labels stay temporarily scaled during a continuous gesture, then sharpen after release; the timer is not a mid-gesture refresh interval.

All **12 focused camera browser checks pass** across Chromium, Firefox and mobile: new single-notch/continuous-gesture sharpening regression, cursor anchoring, terrain/overlay synchronization, drag coverage, zoom-out restoration, number toggles, resize, selection, movement and save/reload. Build/TypeScript, formatting and all **12 HTTP checks pass**. The live player's tab and storage were not accessed.

Evidence: `test-artifacts/zoom-crisp-final-{normal,sparse,continuous}.{json,log,png}`, `zoom-crisp-browser.log`, `zoom-crisp-build.log`, `zoom-crisp-format.log`, and `zoom-crisp-http.log`.

## Grand campaign AI computation: 2026-09-15

The default 250 ms pause between AI actions is unchanged, as are Fast (80 ms), Relaxed (800 ms), harvest presentation and all strategic priorities/search bounds. This pass removes redundant calculation and worker startup; it does not skip decisions, reduce intelligence or change action budgets.

A decision-scoped index supplies piece locations, faction pieces/towns, town vertices, pooled stocks and nearest warehouses. It applies only to the immutable decision input and shared player views. Mutable engine validation clones bypass the index; returned arrays/stocks remain independent and the frame is restored after nested calls or exceptions. Nearest-warehouse selection computes each distance once and preserves ID tie breaks. Coordinate caching is immutable and capped at 8,192 entries. The app reuses a worker after successful decisions, terminates interrupted requests and validates unique request IDs before committing replies.

### Measurements

Same saved Grand campaign (round 35, 410 tiles, 89 towns, 688 pieces), same 100 sequential choices, Node CPU profiler enabled in both runs:

| AI decision computation | Before | After |
| --- | --- | --- |
| Total, 100 choices | 41,620 ms | 10,804 ms |
| Median choice | 364 ms | 107 ms |
| 95th percentile | 965 ms | 157 ms |
| Slowest choice | 1,562 ms | 275 ms |

Total decision time falls **74%**, about **3.85× faster**. This sampled stretch belongs to the first faction's developed turn; it is not a complete eight-faction round. Browser worker checks separately send ten identical economy snapshots in isolated Chromium. The original app's fresh-worker-per-action mode totals **4,347 ms** including startup/message overhead; optimized code with worker reuse totals **951 ms**. These figures exclude the deliberately retained pacing and harvest pauses, and are not universal hardware/turn-duration guarantees.

### Behavior and validation

- All 100 sequential commands match the recorded original choices exactly.
- A separate comparison imports source extracted from the original release (SHA-256 `f291db77984dfe6cb37b3e80eac9ee996ad12d4d7d1744d72d26ec887b4e8dbf`). All **88 decisions and resulting game states** match across all eight Grand factions and the three surviving Classic factions, eight choices from each starting seat.
- A further **400-action Grand continuation** passes command validation and periodic/final state invariants. It exercises recruitment, nine city upgrades, movement/combat, sieging, research, player trades, settlement/route construction and a paid expedition. The continuation reaches three acting factions; it is a bounded stability check, not a full-round or win-rate claim. Its timing overlaps browser validation and is excluded from the benchmark comparison.
- **357 engine tests pass**, including new cache isolation, mutable simulation, nested/exception cleanup, nearest-town equivalence and bounded coordinate cases.
- **45 browser checks pass** across Chromium, Firefox and mobile. New coverage verifies one worker serves successive Grand AI actions, stale request IDs are ignored, pausing cancels pending work, and resuming uses a fresh worker. Existing coverage verifies Grand setup/restore, live human trade offers, harvest timing/pauses and siege/raid/destruction alerts.
- Production build/TypeScript, formatting and all **12 HTTP checks pass**. Tests use isolated storage; the player's active campaign was untouched.

Evidence: `grand-ai-before.json`, `grand-ai-indexed.json`, `grand-ai-worker-{before,after}.json`, `grand-ai-equivalence.json`, `grand-ai-campaign.json`, and `grand-ai-{engine,browser,build,format,http}.log` in `test-artifacts/`. Local CPU profiles use `.cpuprofile`. Reproduce the sequential comparison with `LABEL=grand-ai-check EXPECT=test-artifacts/grand-ai-before.json npx tsx scripts/ai-performance.ts`; use `scripts/ai-worker-performance.ts` for actual browser workers. `scripts/ai-equivalence.ts` takes `REFERENCE` pointing to the unmodified source extracted from the prior release. The original baseline's `finalHash` included the timestamped save envelope; behavior comparisons use command equality and direct game-state equality, not that hash.

## Unlimited research purchases and plays: 2026-09-16

Removed per-turn purchase/play gates from the engine, research UI and AI. Each discovery still costs its printed recipe, requires its normal unlock and must be resolved before another purchase. New cards still wait until the next owner turn. Existing `researchBought`/`researchPlayed` save fields remain informational and cannot block further research.

Repeated rewards now preserve earlier grants: roads and recruits add, ship commissions keep individual tiers/classes, and separate discounts queue for their next matching upgrades. Legacy ship grants retain their tiers when mixed with new grants. Normal shipyard, expedition and siege-operation limits remain; another expedition card cannot silently replace an already funded expedition. Save validation accepts accumulated route and movement bonuses, including movement beyond the old single-card range. UI price previews and AI free-ship valuation use the same per-grant tiers as actual recruitment.

**365 engine tests pass.** Eight new cases cover twelve paid purchases across all four tiers, pending discovery and same-turn readiness restrictions, multiple plays before/after rolling despite legacy flags, accumulating routes/recruits and expiry, mixed-tier legacy/new ship redemption, independent matching discounts, AI repeated plays/purchase planning, expedition grant preservation and stacked movement/save reload. Existing random-card sampling tests now buy repeatedly without manually resetting the old purchase flag.

**18 research browser scenarios pass** across Chromium, Firefox and mobile. The new workflow buys three discoveries, plays two previously acquired cards, confirms new cards remain unavailable, reloads and buys a fourth discovery in the same turn. Existing cases verify four-tier rewards, accessibility, free ships, batch recruits, movement and save/reload. Initial test-only failures used an exact accessible name that omitted the button's price; the corrected final suite passes in full.

Production build/TypeScript, formatting, regenerated HTML/PDF/in-game rules, and **12 HTTP checks pass**. The player's tab and stored campaign were not accessed. Evidence: `research-unlimited-{engine-final,browser-final,build,format,docs,http}.log` in `test-artifacts/`.

## More restrained AI research and expeditions: 2026-09-16

Research investment receives a 0.75 score multiplier, with an additional 0.5 multiplier after a purchase that owner turn. These are preferences; research remains legal and present in the planner. Routine exploration moves from a five-turn to an eight-turn stagger, its due bonus falls from 16 to 8, and paid expedition scores receive a 0.65 multiplier. Expedition discovery rewards also receive 0.65 valuation when choosing cards. Boxed-in forces retain the existing exceptional exploration opportunity. Useful owned cards and already funded expeditions remain actionable. No human costs, per-turn rules, combat logic or coalition targeting changed.

Two deterministic four-faction Standard-AI seeds were replayed before and after through round 35, validating every action and checking state invariants periodically and at completion. Research purchases changed **81 → 48**, plays **78 → 46**, and expeditions **7 → 3**. Both seeds still used research and expeditions. City upgrades remained 29 across each pair of runs; recruitment, fleets and settlement expansion continued. These small, diverging campaign samples demonstrate the intended tendency, not fixed odds or a guarantee for every map.

All **367 engine tests pass**, including marginal-research deferral versus purchases with ample surplus, positive/legal repeat purchase projects, routine expedition spacing, immediate use of funded expeditions and all three paid tiers. All **21 focused browser checks pass** across Chromium, Firefox and mobile, covering live AI worker reuse/cancellation and the complete research workflows, including unlimited human purchases/plays. Build/TypeScript, formatting, regenerated HTML/PDF/in-game rules and 12 HTTP checks pass. Player storage was not accessed.

Evidence: `test-artifacts/ai-restraint-{before,after,summary}.json`, `ai-restraint-{engine-final,browser,build,docs,format,http}.log`.

## Live faction power standings

**370 engine tests and 9 focused browser checks pass.** The shared score breakdown preserves the AI's previous arithmetic exactly, excludes private stockpiles, shows zero for eliminated realms and updates after real construction commands. Browser checks verify authoritative scores, strongest-first ordering, expandable contributions, live palisade updates and all eight Grand Campaign factions across Chromium, Firefox and mobile. Drawer accessibility audits pass and desktop/mobile screenshots were reviewed. TypeScript/production build, formatting and all 12 HTTP checks pass. The first browser attempts exposed invalid eliminated-faction test fixtures; the fixtures now remove owned routes as well as towns and validate serialization before loading. Final evidence: `test-artifacts/faction-power-browser-verified.log`, `faction-power-engine.log`, and `faction-power-overview-*.png`. The player's browser storage was not touched.

## AI expedition restrictions and regional rebellions

**391 engine tests pass.** The two strongest living AI factions (humans excluded; stable ID tie-break) cannot use paid or research-funded expeditions unless no settlement site is reachable through further legal routes on the revealed board. Tests cover all expedition tiers, land/sea launches, actual command rejection with no spending, research bypasses, ranking changes, human/third-place access, blocked-front escape and distant islands. Catch-up factions plan expeditions from turn four on a four-turn cadence; genuinely cornered factions can plan an escape every turn from turn three. Costs remain unchanged.

Rebellion tests cover the 10%/5% rank checks on every AI turn, human and one-town exemptions, both leaders rebelling in one turn, revived factions rebelling again, whole town attachments, safe split formations, transport/passenger ownership, proportional resource/card conservation, restored turn order, save replay and a separate RNG. A 1,200-seed deterministic sample exercises the stated rates and both endpoints of the 25–45% share. This is a distribution sanity check, not a proof of randomness. The isolated naval-conquest fixture now marks its unused seats as eliminated human seats so that it tests the intended two-realm invasion independently of rebellions.

Browser verification covers 27 distinct focused scenarios across Chromium, Firefox and mobile (rebellion announcement/map link/reload/accessibility, existing siege/raid/destruction alerts, faction scores and Grand AI worker behavior). The six rebellion/worker checks were rerun after the final two-faction policy change; all pass. An initial browser save fixture reinserted the original save on reload; it now only initializes an empty test context. Final evidence: `rebellions-browser-release.log`, `rebellions-browser-final.log`, and `rebellions-browser-polish.log`. Desktop/mobile notification screenshots were inspected. TypeScript/build, formatting, current HTML/PDF rules and all 12 production HTTP checks pass.

Final seeded campaign audits completed 20 rounds each: four factions executed **392** legal commands and experienced **one rebellion**; eight factions executed **2,256** legal commands, launched **nine expeditions**, and grew from 200 to 290 tiles. All nine expeditions were by factions outside the restricted top two. The latter run also performed 36 battle resolutions, nine sieges, four town destructions, six loads and three unloads. Neither run reached victory in this window. Saves and invariants were checked throughout and round-tripped afterward. The earlier 35-round four-faction run (before the final catch-up adjustment) saw three rebellions; the initial longer eight-faction process ended before completion and is not counted as a passed run. Final authoritative campaign evidence is `rebellions-audit-release.log` and `rebellions-audit-all.json`.

## Unlimited shipbuilding

**399 engine tests and 33 focused browser checks pass.** Regression coverage includes 101-ship orders followed by further launches, exact aggregate payment, atomic rollback when unaffordable, mixed-class/tier research commissions, invalid quantities, AI/research eligibility after 40 launches, next-turn readiness and high launch-counter save round trips. Browser checks cover bulk recruitment and repeat launch availability, workspace controls, research and accessibility across Chromium, Firefox and mobile.

Production build/TypeScript, formatting, regenerated current rules/PDF and all 12 HTTP checks pass. Final evidence: `unlimited-ships-engine-final.log`, `unlimited-ships-browser.log`, `unlimited-ships-build.log`, `unlimited-ships-format.log`, `unlimited-ships-docs.log`, and `unlimited-ships-http.log`. The player's live campaign was not accessed.

## Mobile expeditions, shore bombardment, conquest AI and Ultra Fast pacing

**417 engine tests and 57 focused browser checks pass.** New tests cover all three expedition tiers launched from disconnected land/sea forces, exact payments, free grants, frontier/ownership/readiness/embarkation checks, the existing strongest-AI restriction, one launch per turn and save round trips. Shore bombardment covers enclosed lakes, zero-power ships, returning fire, ties, movement buffs, whole-ship rounding, trapped survivors, water retreats, passengers, watchtower support, AI firing/recruitment/approach and pending battle saves. Full command previews match engine execution without modifying deeply frozen geometry or campaign state.

Browser checks cover land/sea launches, artillery preview/accessibility, lake clearance, returning-fire casualties and reload, persistent Ultra Fast pacing, real AI worker reuse/cancellation, existing human combat, recruitment, merchants, watchtowers and economic controls across Chromium, Firefox and mobile. Initial checks caught a preview modal that did not close after bombardment and low-contrast power labels; both are fixed. The new water fixtures initially used an invalid zero tile number; they now obey the existing 2–12 serialization rule. Existing AI tests now fund the stronger early guard requirement and compare research surplus valuation; a useful military research discovery is allowed under the stronger conquest priorities. The research restraint weights remain unchanged.

**Performance is measured independently of the strategic change.** The same 120 decisions on a 290-tile developed Grand campaign and the same 100 decisions on a 410-tile, 688-piece late campaign produce byte-identical final-state hashes before and after optimization. Developed decision time falls from 3,871 ms to 2,184 ms (44% less); late decision time falls from 8,419 ms to 4,620 ms (45% less), with late median 80.6→46.9 ms and p95 134.8→58.6 ms. These are local sampled workloads, not a universal frame-time guarantee. Geometry-only caches are bounded; unit/occupation-sensitive caches are scoped to an immutable decision. AI validation and UI action availability execute full rules while avoiding copies of read-only map geometry. Expeditions retain isolated geometry copies. No search limits, troop evaluation, or choice quality are removed. Ultra Fast specifies the 20 ms inter-action pause, with thinking time additional.

Three-round replays from the same developed four/eight-faction saves complete with legal actions and state/save invariants. The Grand replay changes from 652 to 700 actions: settlements 5→20, connecting roads 20→33, recruitment 69→144, movement 62→66, bombardments 2→3, battle resolutions 15→14. Four-faction destruction remains two towns and adds a field battle. These short, diverging samples demonstrate more expansion and mobilization, not a promise that every map has more battles. Coalition, rebellion and expedition rules remain intact.

Evidence: `coastal-actions-engine-verified.log`, `coastal-actions-browser-final.log` (51), `coastal-actions-browser-combat.log` (6), `coastal-actions-{perf,late}-{before,final}.json`, and `coastal-actions-ai-{before,after}.json`. Build, formatting, regenerated HTML/PDF rules and HTTP checks accompany the release. The user's live save was not accessed.

## City guilds: 2026-09-16

Five city specializations, three sequential tiers, geography restrictions, local warehouse output and optional standing orders. Costs use three resource types; raw/mixed/processed progression is checked across all 15 recipes. Stone/Blocks are universal construction inputs; Coal/Fuel support industry and advanced supply. Existing vanilla prices and save key remain unchanged.

Validation:
- **450 engine tests pass**, including 33 new guild scenarios with all raw processing chains and all tiers. Tests cover exact merchant contracts versus Fish substitution, Gold restrictions, aggregated Coal inputs, next-turn opening, saved lower-tier orders, once-per-turn limits, atomic failed payments, siege/occupation shutdown, raids/destruction, rebellion inheritance, save validation, unchanged production/dice, AI tier-III investment and military supply readiness.
- **39 browser scenarios pass** in Chromium, Firefox and mobile: guild founding, public crests, rival inspection, lower-tier selection, manufacturing, exact processed contracts, army supply, persistence and accessibility, plus faction-power, worker and coastal-action regressions. A final 12-scenario guild rerun validates the strengthened save validator on the final bundle.
- Production build/TypeScript, formatting, rules/HTML/PDF generation, the recipe/casualty arithmetic audit and 12 HTTP checks pass. Evidence uses the `test-artifacts/guilds-*` prefix.
- **4,004 legal AI commands** across twelve-round continuations of Classic and Grand campaigns. Grand built/upgraded guilds 79 times and used 225 orders: 145 Artisans, 63 Commanders, 12 Navigators and 5 Merchants. Two Commanders reached tier III. Classic invested in survival instead. Targeted tests cover the geographic Prospectors niche and all economic tier-III upgrades.
- At the end of the sampled Grand campaign: 320 tiles, 480 pieces; approximately 24 ms median / 85 ms p95 AI decision time. Full strategy remains enabled; the Ultra Fast 20 ms option is inter-action pacing, additional to computation. Timings are workload/hardware observations, not latency guarantees.

`GUILDS.md` records the full design and illustrative scarcity/throughput comparison. The audit checks bounded output and realistic opportunity costs; these finite campaigns do not prove equal specialization win rates on every random map. Artisans remain popular when processed goods are scarce; military guilds are conditional on formations and reachable objectives. No guild output is counted as guaranteed dice income.

Reproduce with `npm test`, `npx tsx scripts/guilds-audit.ts`, `npx playwright test e2e/guilds.spec.ts e2e/faction-power.spec.ts e2e/ai-worker.spec.ts e2e/coastal-actions.spec.ts`, and `python ../catane-design/balance_audit.py`. Browser checks use isolated storage; the player's live campaign was not manipulated.

## Stronger guilds and independent tier contracts: 2026-09-16

Buffed every specialization without changing construction prices. Prospectors produce 4/6/16 minerals (2/3/8 Gold). Artisans consume two matching raw goods, plus Coal at II or Fuel at III, producing 1/3/4 processed goods. Merchants trade two raw for 2/4/6 raw, or one processed for three processed at III. Army/fleet supply gives +2/+3/+4 movement to 3/6/9 pieces.

Each unlocked tier now has its own order allowance and its own optional standing recipe. Military supply remains once per unit per turn across tiers/cities. A tier III guild can use I, II and III in any order. Automation attempts each enabled tier once, skips blocked/unaffordable tiers independently, and supports pausing one recipe while retaining the others. Upgrading still opens next turn. Old spent shared allowances remain spent until the next owner turn; existing saved recipes remain available. Save validation checks distinct valid spent tiers, consistent completion flags and one valid standing recipe per tier.

Validation: **459 engine tests pass**, **21 browser scenarios pass** across Chromium/Firefox/mobile, production build, docs/PDF, formatting and 12 HTTP checks pass. The repeatable balance audit now includes all unlocked orders together, cumulative guild/city investment and passive camp/extension income across five dice numbers in both campaign sizes. The unchanged catalogue prices still meet original category constraints.

Campaign continuations: **4,237 legal commands**; Grand hits the explicit 4,000-command budget in round 32, with 95 guild builds/upgrades and 394 orders across all five specializations. It continues ordinary expansion and combat (42 settlements, 51 city upgrades, 79 battle resolutions). Results and saves are in `test-artifacts/guilds-buff-*`. The full cost of city access is now reported separately rather than omitted; the city itself also adds production, so this full attribution is conservative. Balance comparisons are illustrative and do not prove equal outcomes on random maps.

## Army composition, half-force selection and cheaper fortifications: 2026-09-16

Selected armies/fleets now show an immediately visible faction-separated composition grouped by type and tier, using existing portraits and prominent counts. Summaries distinguish base from terrain-adjusted power and list tower support; passengers are visible for enemy fleets and excluded from naval power. Friendly group buttons toggle ready units. Selection shortcuts precede the summary; **Select half** rounds up, divides each type/tier between the two halves and balances odd remainders by base power. New, acted, embarked and movement-exhausted pieces are excluded. Switching armies resets panel scrolling; individual checkboxes remain available.

Above the unchanged one-Wood Palisade, incremental wall costs are now **3 Stone**, **3 Blocks**, and **4 Blocks + 2 Steel**. Sequential upgrade/city caps and siege strength remain unchanged. UI, AI purchases and grants use the canonical catalogue; player rules, PDF and design cost audit were regenerated.

Validation: **464 engine/unit tests pass** (including exact wall payments/caps and mixed/odd half selections); **42 Chromium/Firefox/mobile scenarios pass** for the new overview, bulk/group selection, enemy passengers, scroll reset, new wall purchase and existing workspace/coastal flows. A further **12 focused checks** pass after moving the selection shortcuts above the roster. The overview passes accessibility auditing. Production compilation, formatting, 12 HTTP checks and catalogue audit pass. Evidence: `test-artifacts/army-overview-*`. Browser storage is isolated from the live player campaign.

## Full formation supply, shared military points and siege inspection

Commander/Navigator orders supply every eligible friendly unit on the selected adjacent hex; the engine expands a formation anchor to the entire formation, so neither UI nor AI can leave an artificial capped detachment behind. Tier bonuses and recipes remain +2/+3/+4 and unchanged. New/embarked/activation-ended units remain excluded; supplies never stack on a unit across guilds or tiers. Each unlocked tier retains its independent order.

Field battles and shore bombardment now spend movement without marking attackers as activation-ended. An adjacent battle costs one point; approach tiles cost their normal distance; occupying a won battle tile is included. Ties and losses consume points too. Surviving forces may continue moving, fighting, sieging or raiding. Destruction, transport, next-turn recruitment, blocking armies, one operation per town per turn and the raid-to-destruction delay retain their existing rules. Research descriptions, guild descriptions and attack/raid previews explain the shared budget.

Clickable and keyboard-focusable siege badges and dashed links open a report with city/wall/tower defense, current per-army artillery reductions, progress, timing restrictions, linked participants, grouped unit portraits and warehouse goods. The town inspector has the same entry point. Both friendly and enemy towns can be inspected; different hexes never pool their artillery.

Validation: 471 engine tests passed, including three battles plus a raid from four points, ties, surviving losing attackers, same-turn AI attack/raid, repeated bombardment, whole 40-unit formations across all guild tiers, and unchanged save round-trips. 63 browser scenarios passed across Chromium, Firefox and mobile, including 24-unit army and 20-ship guild orders, siege badges/links/inspector entries, keyboard access, accessibility scans, town alerts, force summaries, Select half and wall prices. Production build, format check and all 12 HTTP checks passed. Desktop and mobile siege screenshots were visually inspected. Evidence uses test-artifacts/formation-actions-*.

The updated campaign audit also passed 4,197 legal commands across two 12-round continuations. Grand completed 3,954 commands, used 65 Commander and 7 Navigator orders, resolved 89 battles, made 71 siege/raid operations and fired 11 bombardments. Its final board had 300 tiles and 606 pieces. Save invariants and reload validation passed; measured decisions were approximately 19 ms median and 77 ms p95 for that workload, not a universal performance bound.

## One-point demolition and independent watchtower sieges

Road/sea-route destruction now consumes one movement point per participant without ending activation. It may follow movement or combat; camp removal, route-owner guards, terrain restrictions and new-unit readiness still apply.

Watchtowers use optional persisted towerSieges records, separate from town breach records, with stable tower identity, attacker, vertex, progress, last owner-turn and participants. Standalone defense is floor(tier/2): 0/1/1/2 turns, less the selected formation's artillery tiers. A destroy-tower command resolves directly when progress meets that requirement, otherwise performs one siege step. Tier I always needs no preliminary siege; stronger artillery removes any tier immediately. No tower warehouse, raid stage, or post-raid wait is invented. One operation per target per attacker turn; guards, withdrawal, missed operation, elimination and rebellion cleanup are integrated. Bonuses persist until destruction.

City raids already checked artillery before adding a siege step. The UI now explicitly offers immediate Raid town when defenses are overcome; tests verify equal and surplus artillery, zero preliminary progress, loot transfer and preserved next-turn town destruction. Tower siege/destruction uses the same one-point budget and has map badges, dashed links, grouped formation/defense inspection and persisted progress. AI maintains tower sieges and evaluates removing supporting towers before a longer city siege, without abandoning accumulated city progress for another multi-turn project.

Validation: 489 engine tests passed; 39 browser scenarios passed across Firefox, Chromium and mobile, including accessibility checks, moved-army tower sieges, immediate tower removal followed by immediate city raid, road demolition, save/reload and existing town/army interfaces. A low-contrast portrait tier badge found by Firefox accessibility checking was darkened. Build, formatting, regenerated rules/PDF and 12 HTTP checks passed. Tower report screenshots were inspected. Classic and Grand campaign continuations completed 3,914 legal commands across twelve additional rounds each, including 52 tower operations, 8 route demolitions, 52 town siege/raid operations and 91 battle resolutions. Invariants and save reloads passed. Evidence: test-artifacts/tower-sieges-*; final browser log is tower-sieges-browser-verified.log.

## Offshore Fish and Whale grounds: 2026-09-17

496 engine tests pass, including 80,000 direct water-resource rolls checking Fish-first ordering and conditional coastal/offshore rates, unchanged terrain/dice streams, reveal-order stability, legacy revealed-tile preservation, Hides/Leather production, hostile fleets, mobile merchants, shipping-route camps and save validation. All 21 focused maritime browser tests pass on Firefox, Chromium and mobile Chromium, including generated Whale art loading, Hides census counts, camp upgrades, Tannery construction and save/reload. Two Standard-AI campaigns completed 628 valid actions with invariant checks (one victory, one stopped after round 25). Production build, formatting and 12 HTTP checks pass. Evidence: `test-artifacts/water-resources-*`.

## Seasons: 3.0, 2026-09-20

- **878 tests pass across 62 files.** Exact integer production tables conserve every resource's annual expected output across every biome, climate and Woods choice. Producer checks cover towns, camps, extensions, merchants, merchant ships, fishing ships and automatic processed goods. Food-payment tests cover Grain, Fish, Meat, explicit ingredient reservations and Gold fallback.
- **All 450 current browser scenarios have passed across the broad run and focused reruns.** The staged production build passed 117 affected and critical checks, including recruitment, transports, the AI worker, English/French rules and mobile controls. After the final rendering optimization, another 57 camera, climate and season checks passed across Chromium, Firefox and mobile. Earlier obsolete catalogue/count assertions were updated; development reload and test-output collisions were rerun against static production.
- Save envelope 9 preserves older terrain, warehouses and dice state, then starts Spring at the next complete round. Tests exercise eliminated-faction turn order, victory, preview immutability, frozen harbors, maritime guild validity, icebound ships, thaw-stranded troops, tiered rescue capacity, research, bombardment, expeditions and save reloads. No live player save was used or modified during verification.
- Three two-year AI campaigns complete **3,684 legal actions, 563 movements and 62 battles**, covering all eleven climates. State invariants and per-round save reloads pass. Median decisions in the final run are 5.1–5.8 ms, with p95 22.3–25.8 ms. A separate movement-heavy stress audit covers 570 pieces on 125, 500, 1,000 and 2,500 tiles in every season. These are bounded regression workloads, not universal performance or balance guarantees.
- **620 seasonal WebP assets** from 39 generated atlases cover every terrain/climate combination, including four seasons for each. All eight new biome reference images are included. The manifest coverage and file-integrity gate passes. Every atlas was visually inspected; independent reviews checked 44 central-hex crops for harvest timing, freeze/thaw, resource identity and clipping. Both languages load and decode their current map images without errors.
- The final renderer uses direct images and a shared hex clip. On the 1,000-tile, 120-town, 249-unit benchmark, seasonal zoom p95 fell from about 117 ms to 16.8 ms, matching the base-art comparison; the isolated final run had no long tasks. A 2,500-tile, 623-unit scene retained approximately 16.7 ms pan/zoom p95, with two 79/93 ms tasks around camera commits. Artwork does not mutate during camera gestures. Vector dice, anchored zoom, deep culling and the existing sharpness timing remain intact.
- TypeScript, production build, formatting, diff checks and bilingual rule exports pass. The release preserves previously deployed asset hashes for already-open campaigns.

Reproduce the engine audit with `npm test`, `npx tsx scripts/seasons-audit.ts`, and `npx tsx scripts/seasons-audit.ts --stress`. The browser suite is `npm run test:e2e`; an isolated preview can use `SEASONS_TEST_URL=http://127.0.0.1:4175 npx playwright test --config playwright.seasons-check.config.ts`. The camera comparison is `GAME_URL=http://127.0.0.1:4175 npx tsx scripts/season-map-performance.ts`, with `SEASON_ART=0` for the base-art comparison and `TILES=2500` for the larger scene. Evidence is retained locally under `test-artifacts/seasons-*` and `test-artifacts/season-*`.

## Arctic hunting, Steppe mix and patchy sea ice

- 930 automated tests pass across 64 files. The new hunting and sea-ice regressions cover both goods from animal tiles, all producer multipliers, strict freeze thresholds, deterministic forecasts, preserved annual marine yields, safe save-v10 migration, migration grace expiry and immutable command previews.
- Seven Chromium production-build scenarios pass, including English/French calendars and rules, adjacent frozen/open autumn seas, Summer art previews and exact per-tile surface forecasts. Revised Arctic autumn art was inspected at final resolution; all six asset mappings and both manifests validate.
- Steppe land weights remain 100%: Millet 5%, Cattle range 16%, Steppe plain 29%; other weights unchanged. Land/water remains 65%/35%.
- TypeScript, formatting, production build and diff whitespace checks pass. Earlier save surfaces remain unchanged during the current season; neither reloading nor previews reroll ice.

## Early and late seasons

- All 1,129 tests in 70 files pass. New coverage checks eight-round years, unchanged land yields and artwork between halves, per-climate freeze/thaw probabilities, idempotent weather, old-save migration, public AI weather estimates, and vulnerable fleets with land escorts.
- English and French calendar, forecast, rulebook and reload flows pass in Chromium, Firefox and mobile Chromium. Existing crop migration, transport rescue and seasonal expedition flows also pass. Screenshots were inspected at desktop and mobile sizes.
- Four two-year AI campaigns cover all 17 climates: 7,649 legal actions, 1,780 movements and 198 battles. State invariants and save roundtrips pass at every full-round boundary.
- The large-map audit passes all four seasons on 125, 500, 1,000 and 2,500 tiles, with up to 562 pieces. At 2,500 tiles the sampled median decisions were 19–33 ms, with the slowest sampled decision 294 ms. These are bounded regression workloads, not guarantees for every campaign.
- The audit fixture now avoids placing opposing test units on the same starting hex. Map construction tests initialize weather before serializing newly generated seas, matching the expedition command.

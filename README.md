# Catane Frontiers

A turn-based strategy game about building towns, trading resources and conquering a randomly generated archipelago. Play against the AI or share one computer in local hotseat mode. The game and illustrated rules are available in English and French.

## Launch the game

Install [Node.js 22.12 or newer](https://nodejs.org/) with npm. Then run:

```sh
git clone https://github.com/Rockydo/Catan2.git
cd Catan2
npm ci
npm run build
npm start
```

Open [http://127.0.0.1:4173/](http://127.0.0.1:4173/) in a recent Chrome, Edge or Firefox browser. Leave the terminal open while playing. Press `Ctrl+C` there to stop the server.

You can also download the repository with **Code > Download ZIP**, extract it, open a terminal in that folder, and run the last four commands above. Git is not required for that option.

After the first successful build, use `npm start`, `./launch.sh` on Linux/macOS, or `launch.cmd` on Windows. Rebuild after changing or updating the source. Double-clicking `index.html` will not work: the game needs its local server for modules and the AI worker.

## Learn the rules

Choose **Learn to play** on the opening screen, or open the rules from campaign settings. The guide includes a quick start, searchable chapters, production and siege examples, and illustrated catalogues for resources, troops, ships, research and guilds. Costs and card effects use the same data as the game.

While the server is running:

- [English interactive guide](http://127.0.0.1:4173/rules.html)
- [French interactive guide](http://127.0.0.1:4173/rules-fr.html)

For reading directly on GitHub, use the complete [English reference](docs/rules/en.md) or [French reference](docs/rules/fr.md). These text exports include all recipes, unit statistics, card effects and guild contracts.

Choose **English** or **Français** on the main menu or in campaign settings. The choice is remembered in your browser. You can switch during a campaign without changing its state. Base-game French terminology follows the publisher's official rules; see [localization notes](LOCALIZATION.md).

## What to expect

- Classic: 5 factions on 125 initial tiles. Grand campaign: 10 factions on 250 tiles.
- Seventeen climate zones determine terrain and water probabilities. Terrain numbers and shortages vary by seed. Expeditions extend the map without changing existing tiles.
- Thirteen raw resources and ten processed goods. Cities, camps, collectors and guilds provide different ways to grow.
- Four seasons change harvests, landscapes and sea ice. Crop calendars and livestock provide different ways to manage food supply.
- Four tiers of military units and ships, transport, raids, sieges, watchtowers and alliances.
- Single-tier Settlers and Settler ships found towns without a connected road. Their price includes the settlement; select the unit and use **Found settlement**.
- Four research tiers, with eight cards each. Buy a choice of two random cards and keep one.
- AI difficulty and action-speed settings are separate. Faster actions do not reduce AI intelligence.
- If any faction exceeds 40% of total faction power, every other faction receives 1 Gold per settlement or city on every dice roll, rising by 1 for each further five percentage points (45% gives 2, 50% gives 3). Above 60%, they also receive 1 Gold bar per city, rising by 1 at 65%, 70% and so on. Settlements do not receive Gold bars.
- No victory points or military upkeep. Destroy every rival's last town to win.

This is a substantial variant, so read the short first-game chapter even if you know Catan. There is no online multiplayer or matchmaking. Sharing a save transfers a campaign; it does not connect two players.

## Controls and saves

Drag to pan; use the wheel to zoom. Click a town, route, tile, army or fleet to inspect it. The action rail provides construction, forces, trade, research and exploration. Keyboard shortcuts are `B`, `F`, `T`, `R` and `E`; `Escape` closes panels. Touch users can use the on-screen controls.

Campaigns autosave as compressed records in browser IndexedDB, with an atomic previous-save backup. Large campaigns do not use the small localStorage quota. Existing browser saves migrate automatically after a successful write. Saving, compression and load validation run in a background worker. If you refresh before the latest write completes, the browser asks you to wait or confirm leaving.

Large saves group repeated unit data and map fields before compression. Sequential unit IDs and repeated entries use compact sequences. Map identifiers share a dictionary. Matching coordinates and neighbor lists are stored once and reconstructed exactly from saved keys and tile rings, preserving their original order. Climate-plan coordinates and troop-template fields also use compact columns. Repeated terrain values, stocks and guild records share dictionary entries on disk and become independent records again when loaded. Unusual layouts remain literal. The loader never rerolls terrain or uses current generation rules to rebuild the map. Every unit, stored resource and individual order is preserved. Large battle, siege and thaw-retreat participant lists also use lossless ID sequences, preserving their exact order and any stale siege references.

The measured Round 32 export, with 540 tiles, 322 towns and 14,695 units, shrinks from 2.74 MB of JSON to about 33 KB. Compression depends on the campaign's contents. Restoring repeated orders now prepares their nested copying rules once per template, while keeping each unit's data independent. Opening the map also reuses the loaded army index, and large siege links use a set lookup instead of repeated list scans.

Loading the campaign starts while the map and panel code is loading. The main-thread fallback save engine loads only if the background worker is unavailable. File imports send the file handle to that worker, which reads and decodes it without making a full file-sized buffer in the interface thread. The save worker reuses encoded geometry while the world is unchanged and rebuilds it after terrain or topology changes. It also reuses packed troops across economic orders that leave the army unchanged. Recruitment, losses, movement and unit orders invalidate that data. Both caches retain only their latest input, and the complete expanded save limit is checked on each write.

Autosaves send only changes to the worker after the first snapshot; each stored save remains complete and can load independently of its backup. Existing saves use the latest format on their next save or export. Large-army reloads and imports transfer troop templates and repeated sequences from the validation worker to the interface. The loader reuses exact byte counts from validation instead of serializing the rebuilt map again. Current compact saves also reuse the validated troop templates for immediate transfer, avoiding another pass to repack the army. Diverse armies retain regular JSON transfer when templates would not help. File integrity, expansion limits and complete game validation still run before a campaign opens.

**Export save** in campaign settings creates a portable backup. Exports are compact, losslessly compressed `.catane` files. **Import save** accepts these files and all previous JSON exports, compressed or uncompressed, up to 128 MB after decompression. Use it to continue in another browser or computer. Export before clearing browser data, replacing a campaign or changing the server address. Different browsers, hostnames and ports have separate storage. Saves are not uploaded to GitHub or a game server.

Once installed and built, the game runs locally without an account or an internet connection. Artwork, rules and AI are included. The server listens only on your computer by default. `HOST` and `PORT` environment variables can change its address; exposing it on a network still does not add multiplayer.

The local server validates cached artwork and pages on refresh. Unchanged files return headers without another file body; updated files receive new validators. Only hashed code and stylesheet filenames are cached permanently. Large file downloads stream from disk instead of creating a full in-memory copy per request.

## Development and tests

```sh
npm run dev             # Vite development server, URL printed in terminal
npm run build           # TypeScript checks and production build
npm test                # Rules, AI and localization tests
npm run test:coverage   # Same tests with coverage
npx playwright install chromium firefox
npm run test:e2e         # Chromium, Firefox and mobile-browser checks
npm run test:soak        # Seeded AI campaigns (5 factions by default)
npm run test:stress      # Larger-map stress checks
npx tsx scripts/seasons-audit.ts --rounds=16 # Two years over all seventeen climates
npx tsx scripts/seasons-audit.ts --stress # All seasons on maps up to 2,500 tiles
FACTIONS=10 SEEDS=1 ROUNDS=40 npm run test:soak  # Grand campaign audit
npm run format:check
npm run docs            # Refresh both Markdown rule references
```

`npm run check` builds and runs the unit and browser suites. Build before running browser tests on their own. Do not rebuild while a browser test run is using `dist`.

To measure camera performance on an exported late-game campaign, run:

```sh
SAVE_PATH=/path/to/campaign.json GAME_URL=http://127.0.0.1:4173 LABEL=local npx tsx scripts/camera-performance.ts
```

This opens a disposable Chromium profile and measures ordinary and rapid wheel zooming, plus dragging at overview and close-up scales. Reports and a close-up screenshot go to `test-artifacts/`. It does not edit the export or connect to your playing browser. Compare the same export, browser, viewport and machine between builds; the timings are not universal frame-rate guarantees.

Decorative map tokens, town miniatures and force badges are prepared once as shared, lossless images at the maximum camera zoom and display density. Selection, counts, hit targets and accessible labels remain live. Unused prepared images are released from a bounded cache. Image preparation failures retain the original vectors.

The report records the actual graphics renderer and acceleration status. The default headless mode uses software rendering on this machine. Set `GRAPHICS=hardware` to request GPU acceleration; the diagnostic fails if hardware compositing is unavailable. Compare results within the same graphics mode. Use `WIDTH`, `HEIGHT` and `DPR` to match the display being tested. Reports include these settings and counts of prepared map sprites before and after navigation. `WAIT_SPRITES=1` waits for sprite preparation before sending camera input and reports that extra wait separately; omit it to include navigation during startup. This wait does not establish that every terrain artwork download has finished.

To measure the rest of an AI turn from an exported campaign, run:

```sh
SAVE_PATH=/path/to/campaign.json LABEL=local npx tsx scripts/campaign-performance.ts
```

Export while an AI faction is active. The script runs the normal AI batches, validates the resulting campaign and writes timings, commands and a final-state hash to `test-artifacts/`. It measures engine work without browser rendering or the selected AI action delay. It never changes the export or browser storage.

For comparisons, set `SOURCE_ROOT=/path/to/older/checkout` to use an older engine. Set `EXPECT_PATH=/path/to/previous/report.json` to require identical commands and final state. Optional `DECISIONS=60` measures a fixed number of individual decisions instead of complete worker batches; use the same mode and export on both versions. Time-bounded publication batches can contain different numbers of orders. Optimization-only changes must still preserve the full order sequence and final state. Ultra Fast also groups uncontested moves into these bounded batches; other pacing settings keep individual movement presentation.

To compare every proposed project and guild decision across varied coastal planning scenarios, including scores and ordering:

```sh
SOURCE_ROOT=/path/to/older/checkout npx tsx scripts/ai-planning-compare.ts
```

Use a reference checkout with the same gameplay rules. The audit creates 128 positions, including blocked coasts, shared guild coverage, watchtower support, spent movement, mixed formations and ports sharing sea tiles. It checks exact project scores, order, guild decisions and military actions, and verifies that neither planner changes its input. Shared-port cases vary city tiers, free hull grants, passenger armies, local forces and frozen seas.

To compare route-cache maintenance and hostility queries with dense troop stacks:

```sh
SOURCE_ROOT=/path/to/older/checkout LABEL=before npx tsx scripts/occupation-performance.ts
LABEL=after EXPECT_PATH=test-artifacts/occupation-performance-before.json npx tsx scripts/occupation-performance.ts
```

This read-only diagnostic uses 15,000, 60,000 and 240,000 units across 20 successive immutable views, with three timing samples. It compares every query result and checks that the input remains unchanged. `UNITS`, `VIEWS` and `SAMPLES` adjust the workload. This isolates occupation and route-cache reads; it does not measure complete AI turns.

To measure bulk boarding, fleet movement, unloading and passenger rescue in a dense disposable campaign:

```sh
LABEL=before SOURCE_ROOT=/path/to/older/checkout npx tsx scripts/fleet-performance.ts
LABEL=after EXPECT_PATH=test-artifacts/fleet-performance-before.json npx tsx scripts/fleet-performance.ts
```

The default fixture has 40 convoy ships and 15,000 other units. Transport cases carry 320 passengers. The naval-loss case carries 240 passengers and sinks half the convoy hulls, with limited spare berths on the survivors. Each action is a complete engine transaction, including validation and cleanup, with three timing samples and an exact final-state comparison. `SHIPS`, `IDLE_UNITS` and `SAMPLES` adjust the workload. This measures transport and casualty actions, not a whole AI turn, and never opens browser storage.

To measure guild supply and production with large armies:

```sh
LABEL=local npx tsx scripts/guild-performance.ts
```

This checks single contracts and three-tier batches for Commanders, Navigators, Engineers and Artisans. The default fixture has a 200-unit formation and 15,000 other units. `FORMATION_UNITS`, `IDLE_UNITS` and `SAMPLES` adjust the workload. `SOURCE_ROOT` selects a reference checkout; `EXPECT_PATH` requires the same commands and complete final-state hashes as its report. The diagnostic verifies unchanged input campaigns and measures full engine transactions in disposable fixtures.

To compare route memory against the former full-path planner:

```sh
TILES=2000 npx tsx scripts/path-memory-performance.ts
```

This runs open and corridor graphs in separate Node processes, with three samples per implementation and explicit garbage collection. It verifies every destination's order and distance, then reports construction time and retained heap. These are route-only stress cases, not complete campaigns or AI-turn benchmarks.

For trade offers, coalition supplies and acceptance decisions across different stocks, factions and alliances:

```sh
SOURCE_ROOT=/path/to/older/checkout npx tsx scripts/ai-trade-compare.ts
```

This compares 48 positions through both direct calls and the normal planning scope. It verifies exact decisions and unchanged input state.

To include the browser, worker transfers and autosaving in the AI measurement:

```sh
SAVE_PATH=/path/to/campaign.json GAME_URL=http://127.0.0.1:4173 LABEL=local npx tsx scripts/ai-transfer-performance.ts
```

This uses a disposable browser and stops at the turn boundary or a decision requiring the human player, such as choosing battle casualties. It reports both worker calculation time and elapsed time. `EXPECT_PATH` checks the complete command list and final state against an earlier report. Optional `AI_SEAT=2` starts that faction's action phase on a private copy for diagnosis; this skips intervening turns and dice, so it is a scenario rather than a normal turn replay.

Large AI economies group similarly ranked production contracts, guild construction/upgrades and camp work into short queues. Queues contain at most 32 jobs and use up to 20% of starting materials that are not reserved for a higher-priority purchase. Costs, guild allowances and legal placement are checked for every job. Production stops for a new military supply opportunity or a newly affordable priority purchase. The AI then makes a full strategic decision again. Early economies and human autoplay retain individual planning.

Initial AI uploads above 16,384 troops use chunks of at most 2,048 units. The interface yields between short groups of messages, so map input and Pause can run while the snapshot is sent. The worker plans only after the entire snapshot arrives. Published-state tokens still handle subsequent orders. The transfer diagnostic reports the longest individual posting call, upload duration and overlapping long tasks separately from AI thinking.

Published snapshots also share their troop indexes when the roster has not changed. Economic orders can update towns and resources without rescanning every army. Changes to units rebuild the indexes; terrain, diplomacy, production and town calculations still use the current campaign. Mutable engine and AI planning scopes do not read this UI cache.

When an AI reply changes units, copying and rebuilding their list reuse the known dictionary order. Moves keep the preceding order; recruitment, losses and reordering use the exact order supplied by the patch. Every unit value and derived index is read fresh. Unindexed inputs and full replacements keep the ordinary discovery path.

Autosave and export reuse the exact received AI changes instead of comparing the whole army again. Short sequences can be combined while a save is pending. Missing history, unrelated states, human actions and larger sequences retain the full comparison path. Weak references let previous campaigns be collected. The transfer diagnostic reports how many save messages forward an existing AI patch.

Set `BATCH_LIMIT=1` to isolate a slow first worker batch without playing the rest of the turn. `ORDER_LIMIT=140` stops after the batch that reaches that many orders, which helps compare builds with different batch sizes. Reports include counts by action type. The normal 20-second worker timeout remains enabled. The report includes autosave transfer time and counts full versus incremental save messages.

The report also separates main-thread script, layout and style work. Set `PROFILE_UI=1` to write a Chrome `.cpuprofile` alongside it. Profiling adds overhead, so use a separate run when comparing timings.

To check harvest processing and seasonal forecasts on an exported campaign:

```sh
SAVE_PATH=/path/to/campaign.json LABEL=local npx tsx scripts/production-performance.ts
```

This checks every dice total from 2 through 12 on independent copies, records full-state hashes and times the resource distribution. It also records ordered deliveries for all seasons and forecasts over several roll counts, including the time spent on each forecast. Five independent read scopes measure the size and construction cost of the production cache key. `SOURCE_ROOT` selects an older checkout; `EXPECT_PATH` requires exact agreement on deliveries, forecasts and resulting campaign states, while timings and internal key formats may differ. It never writes to the campaign export or browser storage.

The report also times 32 consecutive fingerprint reads with a protected terrain snapshot, over five samples. Every read must match that version's unscoped key. Older checkouts use ordinary reads for comparison. This isolates cache-key construction and does not execute commands or measure complete AI turns.

To compare nearby army threat checks as the map grows:

```sh
SAVE_PATH=/path/to/campaign.json SOURCE_ROOT=/path/to/reference LABEL=before \
  npx tsx scripts/ai-threat-performance.ts
SAVE_PATH=/path/to/campaign.json EXPECT_PATH=test-artifacts/ai-threat-before.json LABEL=after \
  npx tsx scripts/ai-threat-performance.ts
```

This checks every town against a previous checkout with the same rules. Each checkout runs in its own process, with three warmups and seven measured samples using fresh campaign snapshots, including index construction. Mixing engine copies in one process can distort timings, even with identical source. Threat membership, unit order and the complete source campaign must remain unchanged. The timing isolates threat detection, not a complete AI turn. `SAMPLES` and `LABEL` control the report.

`scripts/ai-economy-performance.ts` uses the same options and separate-process workflow to compare every economic proposal, including scores, costs and order. Its reports use the `ai-economy-` prefix. `scripts/army-front-performance.ts` isolates army strength comparisons across 2,000 candidate destinations with 32, 128 and 512 separate formations. It checks easy targets, mixed defenses and unbeatable defenders against the preceding exhaustive search. Neither script advances or changes a playing campaign. `scripts/ai-performance.ts` also accepts `SOURCE_ROOT` for separate-process comparisons of complete decision and execution sequences.

`scripts/army-march-performance.ts` measures 24 peaceful moves and faction-strength checks with 1,000, 10,000 and 100,000 troops. It includes normal command validation and coalition cleanup, verifies campaign invariants, and checks the complete result and every reported strength against `EXPECT_PATH`. Use `SOURCE_ROOT` for a reference checkout, `LABEL` for report names and `SIZES` to select army sizes. Each process runs three warmups and five measured samples. This isolates movement processing; it does not measure AI target selection or a whole turn.

To compare forecast costs as merchant and fishing fleets grow:

```sh
SOURCE_ROOT=/path/to/reference LABEL=before npx tsx scripts/collector-forecast-performance.ts
EXPECT_PATH=test-artifacts/collector-forecast-before.json LABEL=after \
  npx tsx scripts/collector-forecast-performance.ts
```

This measures annual income and four seasonal planning horizons with 2,000, 20,000 and 60,000 collectors. Each sample uses a different round to require fresh forecasts. All forecast hashes must match and fixture inputs must stay unchanged. `COLLECTORS` and `SAMPLES` adjust the cases. These are isolated production fixtures, not whole AI turns or played campaigns.

To compare dense land and fleet movement batches against a prior checkout:

```sh
SOURCE_ROOT=/path/to/reference LABEL=before npx tsx scripts/movement-performance.ts
EXPECT_PATH=test-artifacts/movement-performance-before.json LABEL=after \
  npx tsx scripts/movement-performance.ts
```

This measures 32 prescribed movement transactions amid 15,000 and 60,000 other troops, including loaded convoy ships, validation and cleanup. It checks every order, the complete resulting state and unchanged inputs. It isolates execution cost, not AI thinking or browser rendering. `UNITS`, `ORDERS` and `SAMPLES` adjust the fixtures.

`SAVE_PATH=/path/to/campaign.json npx tsx scripts/woods-performance.ts` measures up to three accessible Woods resource choices, individually and in one private batch, plus their validation previews. It checks complete results and unchanged input data. Optional `AI_SEAT` selects a living faction; `SOURCE_ROOT`, `LABEL`, `EXPECT_PATH` and `SAMPLES` support separate-process build comparisons. This diagnostic measures transaction and publication costs, not a complete AI turn.

`MILITARY=1` adds 100-unit recruitment, 100-ship construction and an available movement order to `scripts/order-performance.ts`. The diagnostic prepares the same roster index used by the visible board before measuring publication. It reports engine and interface-comparison time separately and checks complete results against `EXPECT_PATH` when provided.

To measure compression and exact save recovery without a browser:

```sh
SAVE_PATH=/path/to/campaign.json npx tsx scripts/save-performance.ts
```

To compare refresh loading of original JSON and all ten compact formats in a disposable Chromium profile:

```sh
SAVE_PATH=/path/to/campaign.json GAME_URL=http://127.0.0.1:4173 \
  npx tsx scripts/save-load-performance.ts
```

This checks the exact loaded state and measures when the campaign menu appears. It does not open or change your playing browser. Set `FORMATS=details,packed` to compare packing versions 8 and 9. Version 9 shares repeated column values. The report includes the full campaign hash.

Set `OPEN_BOARD=1` to also measure the Continue button through two rendered map frames. This uses a disposable hotseat copy to prevent AI actions; it does not measure completion of every artwork download. `TRACK_SPRITES=1` additionally records the time from Continue until all decorative map sprites are prepared, separately from the first rendered frames. `PROFILE_BOARD=1` additionally writes Chromium CPU profiles. `scripts/save-decode-performance.ts` isolates decompression, validation and troop restoration with three warmups and seven measured loads. Set `SAVE_PATH`, optional `SOURCE_ROOT`, `LABEL` and `EXPECT_PATH`. Use separate processes for before/after timing; the reference report checks the complete campaign hash.

Set `TRACK_RESOURCES=1` to include browser resource-transfer totals after the page becomes idle. This extra wait is excluded from menu and map timings. Compare servers using separate disposable profiles and the same built files; `DIST_DIR=/path/to/build PORT=4181 npm start` starts an isolated copy of the production server.

`scripts/save-snapshot-performance.ts` compares repeated save packing against a reference checkout. Set `SAVE_PATH` and `SOURCE_ROOT`; `LABEL` names the report. It checks the complete archive payload and unchanged source campaign outside the measured intervals. `scripts/map-selection-performance.ts` measures tile selection on an exported copy, using `SAVE_PATH`, optional `GAME_URL` and `LABEL`. Neither script touches the playing campaign.

`scripts/save-import-performance.ts` measures importing the same compressed campaign through a fresh worker, including reconstruction in the interface thread. It takes the same `SAVE_PATH`, `GAME_URL` and `LABEL` options and verifies the complete result. This isolates import processing from map painting. `RAW_INPUT=1` measures historical uncompressed JSON; `FILE_INPUT=1` measures the file-handle path used by the current interface. Without `FILE_INPUT`, it measures the earlier read-and-copy path. Preparation and message-posting times are reported separately. It bundles the actual interface decoder used by the tested build; set `SOURCE_ROOT` to that build’s checkout when comparing a previous version.

The interactive rules are built alongside the game. Their bilingual chapter source is `src/rules/chapters.json`; costs, rosters, cards and guild contracts are read from `src/game`. To save the full guide as PDF, use its print button. With the local production server running, `npm run docs:pdf` also writes both PDFs into `releases/`.

`python scripts/package-release.py` packages a built copy with sources and tests. The resulting ZIP can run with Node.js without installing dependencies, because it includes `dist`. Local saves, browser profiles and test artifacts are excluded. Generated builds and release bundles are not committed to this repository.

## Project layout

| Folder                  | Contents                                             |
| ----------------------- | ---------------------------------------------------- |
| `src/game`              | Rules engine, AI, generation, saves and content data |
| `src/ui`, `src/App.tsx` | Game interface and map                               |
| `src/i18n`              | Language selection and French translations           |
| `src/rules`             | Interactive bilingual rulebook                       |
| `public/assets`         | Bundled artwork and asset records                    |
| `docs/rules`            | Complete generated text references                   |
| `tests`, `e2e`          | Engine and browser tests                             |
| `scripts`               | Server, documentation, audits and packaging          |

See [TESTING.md](TESTING.md) for test notes and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for dependency and font notices. [ART.md](ART.md) records artwork sources. Older design notes are historical; the in-game guide and current engine define the current rules.

This is an independent fan project, not an official Catan product or an endorsement by its publisher. Catan names belong to their respective owners. No commercial Catan artwork is bundled.

## Climate maps

New campaigns use seventeen climates and regional terrain types. Select a tile for its climate and base production, or use **Show climates** in the map controls. The **Map and dice** rules chapter has interactive tables with all land and water probabilities.

Towns, camps and collectors multiply the terrain’s base yield. Woods let each faction choose Wood or Hides during its action phase. Frozen sea carries land units, blocks ships and cannot support permanent construction without solid ground. Bare Peaks are impassable to all units; roads can follow their edges, but towns need adjacent walkable solid land. Existing saves retain their revealed terrain and stored goods, apart from the documented replacements of retired Rough fields, Rye and non-American Maize or prototype Potatoes. Current climate-adjusted crop yields apply on load; newly explored tiles use current climate generation.

New regions include Glacial (45% land), Hyperarid (90%) and Monsoon (30%). Initial climate weights are 1 for each established climate and 0.35 for each extreme; compatible entries into extremes use weight 0.5. Their scarcity, ice and fragmented terrain create isolated colony opportunities without disaster damage or extra upkeep.

Andean highlands (75% land), Prairie (70%) and Mesoamerican regions (45%) add distinct American terrain. Potatoes generate only in Andean regions; Maize only in Prairie and Mesoamerican regions. Alpacas provide Wool and Meat, Bison Meat and Hides, and Turkey grounds Meat. Cloud forest yields Wood and Hides, volcanic quarries Stone, and Prairie Sunflower fields produce Oil in Autumn. This Oil uses the existing Coal substitution and Fuel production rules. The three American climates have initial weight 1; entering one from an older compatible climate has weight 0.75.

## Seasons and food

New campaigns start in a random season, with a 25% chance each for Spring, Summer, Autumn and Winter. The world seed determines the starting season, so the same seed gives the same start. Each season lasts two complete rounds of faction turns: early, then late. Eight rounds form one year. The early and late halves have identical harvest values and artwork, while sea ice is checked at every round boundary. The calendar beside the turn controls shows current production and lets you preview seasonal artwork. Selecting a tile shows its harvest calendar, current surface and future ice probabilities. Previewing a season does not advance the game.

Crops only produce during their harvest seasons, and still need their dice number to roll. Wheat, barley, maize, millet and sorghum have one harvest window; turnips, potatoes, oats, olives and subtropical rice have two; tropical rice and Chinampa gardens have three. A harvest window pays on every matching roll. For each tile and each resource, the four seasonal yields add up to four times its current climate-adjusted annual baseline. Doubling the calendar keeps land output per roll unchanged; balance updates can revise the baseline itself. Cities, camps, extensions and collectors apply their normal multipliers to those seasonal yields.

Rice pays 4 Grain in each active window: three in Tropical, two in Subtropical and one in Monsoon. Turnip fields replace Rye at the same generation shares and annual baseline: Temperate/Oceanic turnips pay 2 in Summer and 6 in Autumn; Cold/Alpine turnips pay 1 and 3. Andean Potato fields pay 2/6. Temperate Oats pay 6/2, while Subtropical Sorghum and American Maize pay 8 in Autumn. Chinampa gardens pay 4 in Spring, Summer and Autumn. Grain remains an abstract food resource shared by cereals, roots, gardens and Olive groves. See [Crop yields and game balance](docs/cereal-balance.md) for the full table and research.

Cattle, goats and reindeer produce Meat. Recipes continue to show Grain: payments use available Grain, then Fish, then Meat, with Gold covering any remaining shortage. Meat refines into Provisions. Nothing spoils, and seasons add no food upkeep.

Glacial, Arctic, Alpine, Cold and Prairie seas use climate-specific freeze and thaw chances at each early/late boundary. Open water checks freezing; ice checks melting. Results persist through reloads and can vary between years. Selecting a sea tile shows its next check and an eight-round probability outlook. Seasonal ice always clears by Late Summer; Glacial pack ice never melts. Other climates remain open. Exact probabilities appear in the English and French season guides.

Existing per-roll harvest calendars stay unchanged, including local marine Summer concentrations. Both halves use the same values. Actual ice blocks marine harvests and fishing coverage; new weather does not bank missed rolls. Icebound ships fight at one-quarter power, rounded up per ship, and cannot move or retreat. Friendly land armies on the same hex defend them at full strength, including against shore bombardment. Passengers remain aboard. Thaw restores normal ship strength. Land troops automatically retreat across the melting ice sheet to the nearest safe solid land, without spending movement. If only enemy-held shores are reachable, they force a landing using normal combat. Survivors with no reachable shore or a failed landing remain available for transport rescue. Pending landings are saved between battles.

Existing campaigns keep their calendar, stores and dice numbers. Save version 12 replaces Rye and prototype Potato fields outside American regions with Turnip fields. Former non-American Maize becomes Oats in cool climates or Sorghum in warm climates. Climate, tile references and annual baselines survive; current seasonal schedules apply on load. Loading preserves current sea surfaces; later half-season boundaries apply the new weather rules. In older saves without a seasonal calendar, seasons begin in Spring at the next full round, so the current round finishes under its existing production rules. Newly explored land can include the new crops and livestock.

Version 13 keeps an existing campaign’s season, year and sea surfaces when loading. The current round becomes the early half; the next round is late. Weather begins changing at the next full-round boundary.

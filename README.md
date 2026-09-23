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

Large saves group repeated unit data and map fields before compression. Sequential unit IDs and repeated entries use compact sequences. Map identifiers share a dictionary. Matching coordinates and neighbor lists are stored once and reconstructed exactly from saved keys and tile rings, preserving their original order. Unusual layouts remain literal. The loader never rerolls terrain or uses current generation rules to rebuild the map. Every unit, stored resource and individual order is preserved.

Autosaves send only changes to the worker after the first snapshot; each stored save remains complete and can load independently of its backup. Existing saves use the latest format on their next save or export. Large-army reloads and imports transfer troop templates and repeated sequences from the validation worker to the interface. The loader reuses exact byte counts from validation instead of serializing the rebuilt map again. Diverse armies retain regular JSON transfer when templates would not help. File integrity, expansion limits and complete game validation still run before a campaign opens.

**Export save** in campaign settings creates a portable backup. Exports are compact, losslessly compressed `.catane` files. **Import save** accepts these files and all previous JSON exports, compressed or uncompressed, up to 128 MB after decompression. Use it to continue in another browser or computer. Export before clearing browser data, replacing a campaign or changing the server address. Different browsers, hostnames and ports have separate storage. Saves are not uploaded to GitHub or a game server.

Once installed and built, the game runs locally without an account or an internet connection. Artwork, rules and AI are included. The server listens only on your computer by default. `HOST` and `PORT` environment variables can change its address; exposing it on a network still does not add multiplayer.

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

This opens a disposable Chromium profile and measures ordinary and rapid wheel zooming. Reports and a close-up screenshot go to `test-artifacts/`. It does not edit the export or connect to your playing browser. Compare the same export, browser, viewport and machine between builds; the timings are not universal frame-rate guarantees.

The report records the actual graphics renderer and acceleration status. The default headless mode uses software rendering on this machine. Set `GRAPHICS=hardware` to request GPU acceleration; the diagnostic fails if hardware compositing is unavailable. Compare results within the same graphics mode.

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

To measure bulk boarding, fleet movement and unloading in a dense disposable campaign:

```sh
LABEL=before SOURCE_ROOT=/path/to/older/checkout npx tsx scripts/fleet-performance.ts
LABEL=after EXPECT_PATH=test-artifacts/fleet-performance-before.json npx tsx scripts/fleet-performance.ts
```

The default fixture has 40 convoy ships, 320 passengers and 15,000 other units. Each action is a complete engine transaction, including validation and cleanup, with three timing samples and an exact final-state comparison. `SHIPS`, `IDLE_UNITS` and `SAMPLES` adjust the workload. This measures transport actions, not a whole AI turn, and never opens browser storage.

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

Set `BATCH_LIMIT=1` to isolate a slow first worker batch without playing the rest of the turn. The normal 20-second worker timeout remains enabled. The report includes autosave transfer time and counts full versus incremental save messages.

The report also separates main-thread script, layout and style work. Set `PROFILE_UI=1` to write a Chrome `.cpuprofile` alongside it. Profiling adds overhead, so use a separate run when comparing timings.

To check harvest processing and seasonal forecasts on an exported campaign:

```sh
SAVE_PATH=/path/to/campaign.json LABEL=local npx tsx scripts/production-performance.ts
```

This checks every dice total from 2 through 12 on independent copies, records full-state hashes and times the resource distribution. It also records ordered deliveries for all seasons and forecasts over several roll counts. `SOURCE_ROOT` selects an older checkout; `EXPECT_PATH` requires exact agreement with its report. It never writes to the campaign export or browser storage.

To measure compression and exact save recovery without a browser:

```sh
SAVE_PATH=/path/to/campaign.json npx tsx scripts/save-performance.ts
```

To compare refresh loading of original JSON and all seven compact formats in a disposable Chromium profile:

```sh
SAVE_PATH=/path/to/campaign.json GAME_URL=http://127.0.0.1:4173 \
  npx tsx scripts/save-load-performance.ts
```

This checks the exact loaded state and measures when the campaign menu appears. It does not open or change your playing browser. Set `FORMATS=geometry,packed` to compare the previous geometry format with the current format, which also removes duplicate neighbor lists. The report includes the full campaign hash.

`scripts/save-import-performance.ts` measures importing the same compressed campaign through a fresh worker, including reconstruction in the interface thread. It takes the same `SAVE_PATH`, `GAME_URL` and `LABEL` options and verifies the complete result. This isolates import processing from map painting. It bundles the actual interface decoder used by the tested build; set `SOURCE_ROOT` to that build’s checkout when comparing a previous version.

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

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
- Fourteen climate zones determine terrain and water probabilities. Terrain numbers and shortages vary by seed. Expeditions extend the map without changing existing tiles.
- Thirteen raw resources and ten processed goods. Cities, camps, collectors and guilds provide different ways to grow.
- Four seasons change harvests, landscapes and sea ice. Crop calendars and livestock provide different ways to manage food supply.
- Four tiers of military units and ships, transport, raids, sieges, watchtowers and alliances.
- Single-tier Settlers and Settler ships found towns without a connected road. Their price includes the settlement; select the unit and use **Found settlement**.
- Four research tiers, with eight cards each. Buy a choice of two random cards and keep one.
- AI difficulty and action-speed settings are separate. Faster actions do not reduce AI intelligence.
- No victory points or military upkeep. Destroy every rival's last town to win.

This is a substantial variant, so read the short first-game chapter even if you know Catan. There is no online multiplayer or matchmaking. Sharing a save transfers a campaign; it does not connect two players.

## Controls and saves

Drag to pan; use the wheel to zoom. Click a town, route, tile, army or fleet to inspect it. The action rail provides construction, forces, trade, research and exploration. Keyboard shortcuts are `B`, `F`, `T`, `R` and `E`; `Escape` closes panels. Touch users can use the on-screen controls.

Campaigns autosave in the browser. **Export save** in campaign settings creates a portable backup. Use **Import save** to continue in another browser or computer. Export before clearing browser data, replacing a campaign or changing the server address. Different browsers, hostnames and ports have separate storage. Saves are not uploaded to GitHub or a game server.

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
npx tsx scripts/seasons-audit.ts          # Two years over all fourteen climates
npx tsx scripts/seasons-audit.ts --stress # All seasons on maps up to 2,500 tiles
FACTIONS=10 SEEDS=1 ROUNDS=40 npm run test:soak  # Grand campaign audit
npm run format:check
npm run docs            # Refresh both Markdown rule references
```

`npm run check` builds and runs the unit and browser suites. Build before running browser tests on their own. Do not rebuild while a browser test run is using `dist`.

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

New campaigns use fourteen climates and 49 terrain types. Select a tile for its climate and base production, or use **Show climates** in the map controls. The **Map and dice** rules chapter has interactive tables with all land and water probabilities.

Towns, camps and collectors multiply the terrain’s base yield. Woods let each faction choose Wood or Hides during its action phase. Frozen sea carries land units, blocks ships and cannot support permanent construction without solid ground. Bare Peaks are impassable to all units; roads can follow their edges, but towns need adjacent walkable solid land. Existing saves retain their revealed terrain and stored goods, apart from the named replacement of retired Rough fields. Current climate-adjusted cereal yields apply on load; newly explored tiles use current climate generation.

New regions include Glacial (45% land), Hyperarid (90%) and Monsoon (30%). Initial climate weights are 1 for each established climate and 0.35 for each extreme; compatible entries into extremes use weight 0.5. Their scarcity, ice and fragmented terrain create isolated colony opportunities without disaster damage or extra upkeep.

## Seasons and food

New campaigns start in a random season, with a 25% chance each for Spring, Summer, Autumn and Winter. The world seed determines the starting season, so the same seed gives the same start. One complete round of faction turns advances to the next season in that cycle. The calendar beside the turn controls shows current production and lets you preview seasonal artwork. Selecting a tile shows its exact yields and open-water or frozen surface in all four seasons. Previewing a season does not advance the game.

Crops only produce during their harvest seasons, and still need their dice number to roll. Wheat, rye, barley, maize and millet have one harvest window; olives and subtropical rice have two; tropical rice has three. A harvest window pays on every matching roll. For each tile and each resource, the four seasonal yields add up to four times its current climate-adjusted annual baseline. The calendar preserves that baseline’s annual dice expectation; balance updates can revise the baseline itself. Cities, camps, extensions and collectors apply their normal multipliers to those seasonal yields.

Rice pays 4 Grain in each active window: three windows in Tropical, two in Subtropical and one Autumn window in Monsoon. Oceanic Barley and Temperate/Oceanic Rye pay 8 in Summer; other Barley/Rye pay 4 in their existing season. Black-soil wheat pays 12 in Summer and is a rare Chernozem biome in Temperate (2% of land) and Steppe (4%). See [Cereal yields and game balance](docs/cereal-balance.md) for the complete table and research.

Cattle, goats and reindeer produce Meat. Recipes continue to show Grain: payments use available Grain, then Fish, then Meat, with Gold covering any remaining shortage. Meat refines into Provisions. Nothing spoils, and seasons add no food upkeep.

Ordinary sea hexes in Glacial, Arctic, Alpine and Cold climates all freeze in Winter and open in Summer. In Spring/Autumn, each hex has a fixed freezing chance of 100%/100% in Glacial, 70%/50% in Arctic, 35%/25% in Alpine and 20%/10% in Cold climates. The world seed fixes the pattern: it repeats every year and survives reloads, and every hex that freezes in Autumn also freezes in Spring. These chances do not guarantee an exact frozen share of a region. Arctic Frozen sea terrain stays frozen in Spring, Autumn and Winter and opens in Summer. Glacial Frozen sea is permanent pack ice; Glacial land stays snowy all year. Other climates stay open.

Frozen sea hexes produce no marine resources. Any Spring or Autumn yield removed by ice is added to that hex’s Summer yield, separately for each resource, keeping its four-season total unchanged. Summer still needs a matching dice roll. Land units can cross frozen water; ships trapped there wait for thaw. Land units caught on thawed water can escape to adjacent land or board a transport. No unit is automatically destroyed by a season change. Frozen water never becomes a foundation for permanent buildings. Ports need adjacent open water to provide their trade rate.

Existing campaigns keep their calendar, terrain, stores and dice numbers. Campaigns saved before partial sea freezing retain their current sea surfaces until the next season, including after saving and reloading again; loading alone cannot strand a force. In older saves without a seasonal calendar, seasons begin in Spring at the next full round, so the current round finishes under its existing production rules. Newly explored land can include the new crops and livestock.

import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { newGame } from "../src/game/engine";
import { chooseAIAction } from "../src/game/ai";
import { addHexes, canOccupy, generateWorld } from "../src/game/world";
import { REALM_NAMES } from "../src/game/content";
import { settlementSites } from "../src/game/selectors";
import { SAVE_KEY, assertInvariants, serialize } from "../src/game/save";
import { syncSeasonSurfaces } from "../src/game/seasons";
import { piece, run } from "../tests/helpers";

// Always uses a disposable browser profile. Never imports the player's save.
const size = Number(process.env.TILES ?? 1000);
const url = process.env.GAME_URL ?? "http://127.0.0.1:4174/";
let game = newGame(
  "season-map-performance",
  REALM_NAMES.map((name) => ({ name, control: "human" })),
);
while (game.phase.startsWith("setup")) game = run(game, chooseAIAction(game));
addHexes(game, game.seed, Object.keys(generateWorld(game.seed, size).tiles));
game.phase = "economy";
game.players.forEach((p) => {
  p.turns = 20;
});
const template = Object.values(game.towns)[0];
for (let i = 0; i < Math.min(100, size / 5); i++) {
  const vertex = settlementSites(game, i % game.players.length, true)[0];
  if (!vertex) break;
  const id = `t${game.nextId++}`;
  game.towns[id] = {
    ...structuredClone(template),
    id,
    vertex,
    name: `Town ${i}`,
    owner: i % game.players.length,
    level: 2,
    turnLevel: 2,
    extensions: {},
    stock: { lumber: 20, brick: 20, grain: 20, wool: 20, ore: 20 },
  };
}
for (const [i, tile] of Object.values(game.tiles)
  .filter((_, i) => i % 4 === 0)
  .entries()) {
  if (canOccupy(tile, true))
    piece(game, tile.id, i % game.players.length, "galley", 2);
  else if (canOccupy(tile, false))
    piece(game, tile.id, i % game.players.length, "heavy", 2);
}
syncSeasonSurfaces(game);
const seasonalArtwork = process.env.SEASON_ART !== "0";
if (!seasonalArtwork) {
  delete game.calendar;
  for (const tile of Object.values(game.tiles)) delete tile.surface;
  for (const unit of Object.values(game.pieces)) delete unit.seasonStatus;
}
assertInvariants(game);
mkdirSync("test-artifacts", { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript("window.__name = fn => fn");
  await page.addInitScript(
    ({ key, data }) => {
      localStorage.setItem(key, data);
      localStorage.setItem("catane-language", "en");
    },
    { key: SAVE_KEY, data: serialize(game) },
  );
  await page.goto(url);
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  const handoff = page.getByRole("button", { name: "I am Emberhold" });
  if (await handoff.isVisible()) await handoff.click();
  await page.locator(".world-map").waitFor();
  await page.waitForLoadState("networkidle");
  const metrics = await page.evaluate(async () => {
    const map = document.querySelector<SVGSVGElement>(".world-map")!;
    const rect = map.getBoundingClientRect(),
      x = rect.x + rect.width / 2,
      y = rect.y + rect.height / 2;
    const pan: number[] = [],
      zoom: number[] = [],
      tasks: number[] = [];
    let artworkMutations = 0;
    const observer = new MutationObserver((rows) => {
      artworkMutations += rows.length;
    });
    document
      .querySelectorAll(".terrain-map pattern, .terrain-map .terrain-texture")
      .forEach((p) =>
        observer.observe(p, {
          subtree: true,
          attributes: true,
          childList: true,
        }),
      );
    const longTasks = new PerformanceObserver((list) =>
      tasks.push(...list.getEntries().map((e) => e.duration)),
    );
    longTasks.observe({ type: "longtask" });
    const pointer = (type: string, px: number, py: number) =>
      map.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          clientX: px,
          clientY: py,
          pointerId: 1,
          pointerType: "mouse",
          button: 0,
          buttons: type === "pointerup" ? 0 : 1,
        }),
      );
    let last = performance.now();
    pointer("pointerdown", x, y);
    for (let i = 0; i < 90; i++)
      await new Promise<void>((resolve) =>
        requestAnimationFrame((now) => {
          pan.push(now - last);
          last = now;
          pointer(
            "pointermove",
            x + Math.sin(i / 15) * 220,
            y + Math.cos(i / 15) * 120,
          );
          resolve();
        }),
      );
    pointer("pointerup", x, y);
    last = performance.now();
    for (let i = 0; i < 60; i++)
      await new Promise<void>((resolve) =>
        requestAnimationFrame((now) => {
          zoom.push(now - last);
          last = now;
          map.dispatchEvent(
            new WheelEvent("wheel", {
              bubbles: true,
              cancelable: true,
              clientX: x,
              clientY: y,
              deltaY: i < 30 ? -60 : 60,
            }),
          );
          resolve();
        }),
      );
    observer.disconnect();
    longTasks.disconnect();
    const summary = (list: number[]) => {
      const a = list.slice(3).sort((a, b) => a - b);
      return {
        median: a[Math.floor(a.length * 0.5)],
        p95: a[Math.floor(a.length * 0.95)],
        max: a.at(-1),
      };
    };
    return {
      pan: summary(pan),
      zoom: summary(zoom),
      longTasks: tasks,
      artworkMutations,
      patterns: document.querySelectorAll(".terrain-map pattern").length,
      mapNodes: map.querySelectorAll("*").length,
    };
  });
  const result = {
    seasonalArtwork,
    tiles: Object.keys(game.tiles).length,
    towns: Object.keys(game.towns).length,
    pieces: Object.keys(game.pieces).length,
    climates: [...new Set(Object.values(game.tiles).map((t) => t.climate))],
    ...metrics,
    errors,
  };
  writeFileSync(
    `test-artifacts/seasons-map-${size}${seasonalArtwork ? "" : "-base-art"}.json`,
    JSON.stringify(result, null, 2),
  );
  await page.screenshot({
    path: `test-artifacts/seasons-map-${size}${seasonalArtwork ? "" : "-base-art"}.png`,
  });
  console.log(JSON.stringify(result, null, 2));
  if (errors.length || metrics.artworkMutations)
    throw new Error(
      "Map interaction changed terrain assets or raised a runtime error",
    );
} finally {
  await browser.close();
}

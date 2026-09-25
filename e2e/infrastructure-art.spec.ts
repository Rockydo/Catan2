import { test, expect } from "@playwright/test";
import { newGame } from "../src/game/engine";
import { generateWorld } from "../src/game/world";
import { serialize, SAVE_KEY } from "../src/game/save";
import { syncSeasonSurfaces } from "../src/game/seasons";

for (const size of [120, 850])
  test(`integrated infrastructure paintings render on ${size}-tile maps`, async ({
    page,
  }) => {
    const game = newGame("infrastructure-painting-browser");
    Object.assign(game, generateWorld(game.seed, size, true));
    game.calendar = { ...game.calendar!, startSeason: "summer" };
    const land = Object.values(game.tiles).filter(
      (t) => t.resource !== "water" && t.resource !== "ice" && t.geography,
    );
    for (const [i, tile] of land.slice(0, 5).entries()) {
      tile.resource = "grain";
      tile.biome = "golden-fields";
      tile.climate = "temperate";
      game.climatePlan![tile.id] = "temperate";
      tile.geography = {
        elevation: 0.4,
        region: tile.geography!.region,
        access: "normal",
        animals: [],
        fauna: {},
        projects: {
          irrigation: { owner: 0, born: 1, tier: i === 4 ? 2 : i + 1 },
          ...(i === 4 ? { soil: { owner: 0, born: 1, tier: 1 } } : {}),
        },
      };
      tile.surface = undefined;
    }
    const changed = new Set(land.slice(0, 5).map((t) => t.id));
    game.wildlife = game.wildlife!.filter(
      (w) => game.tiles[w.tile] && !changed.has(w.tile),
    );
    syncSeasonSurfaces(game);
    const failures: string[] = [];
    page.on("pageerror", (e) => failures.push(e.message));
    page.on("response", (response) => {
      if (response.url().includes("/assets/infrastructure/") && !response.ok())
        failures.push(response.url());
    });
    await page.addInitScript(
      ({ key, data }) => {
        localStorage.setItem(key, data);
        localStorage.setItem("catane-language", "en");
      },
      { key: SAVE_KEY, data: serialize(game) },
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/");
    await page.getByRole("button", { name: /Continue campaign/ }).click();
    const paintings = page.locator(
      '.terrain-map image.terrain-texture[href*="/infrastructure/"]',
    );
    await expect(paintings).toHaveCount(5);
    expect(
      await paintings.evaluateAll(async (nodes) =>
        Promise.all(
          nodes.map(async (node) => {
            const img = new Image();
            img.src = node.getAttribute("href")!;
            await img.decode();
            return [img.naturalWidth, img.naturalHeight];
          }),
        ),
      ),
    ).toEqual(Array.from({ length: 5 }, () => [512, 512]));
    if (size >= 800)
      await expect(page.locator(".terrain-canvas")).toHaveAttribute(
        "data-terrain-status",
        "ready",
        { timeout: 30000 },
      );
    await page.screenshot({
      path: `output/infrastructure-art/map-${size}.png`,
    });
    expect(failures).toEqual([]);
  });

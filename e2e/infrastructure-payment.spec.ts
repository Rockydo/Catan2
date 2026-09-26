import { test, expect } from "@playwright/test";
import { newGame } from "../src/game/engine";
import { chooseAIAction } from "../src/game/ai";
import { run } from "../tests/helpers";
import { ownTowns } from "../src/game/selectors";
import { serialize, SAVE_KEY, assertInvariants } from "../src/game/save";
import { syncSeasonSurfaces } from "../src/game/seasons";
for (const fish of [0, 4])
  test(`cloud forest construction with ${fish} Fish and no Grain`, async ({
    page,
  }) => {
    let s = newGame("infrastructure-browser");
    for (let n = 0; s.phase.startsWith("setup") && n < 60; n++)
      s = run(s, chooseAIAction(s));
    s.active = 0;
    s.phase = "economy";
    s.pieces = {};
    const towns = ownTowns(s, 0);
    for (const t of towns) t.stock = {};
    const town = towns[0];
    town.level = town.turnLevel = 2;
    town.stock = { lumber: 3, ore: 1, fish };
    const id = s.vertices[town.vertex].tiles.find(
      (id) => !["water", "ice", "peaks"].includes(s.tiles[id].resource),
    )!;
    const tile = s.tiles[id];
    tile.resource = "lumber";
    tile.biome = "cloud-forest";
    Object.assign(tile.geography!, {
      pass: false,
      waterway: undefined,
      access: "normal",
      floodplain: false,
      projects: {},
      fauna: {},
      animals: [],
    });
    s.wildlife = s.wildlife!.filter((w) => w.tile !== id);
    syncSeasonSurfaces(s);
    assertInvariants(s);
    await page.addInitScript(
      ({ key, data }) => {
        localStorage.setItem(key, data);
        localStorage.setItem("catane-language", "en");
      },
      { key: SAVE_KEY, data: serialize(s) },
    );
    await page.goto("/");
    await page.getByRole("button", { name: /Continue campaign/ }).click();
    await page.getByTestId(`hex-${id}`).click();
    await page.getByTestId("inspector-details-toggle").click();
    await page.locator(".infrastructure-panel > summary").click();
    const card = page.locator('[data-infrastructure="forestry"]'),
      button = card.getByRole("button", { name: /Build/ });
    if (fish) {
      await expect(button).toBeEnabled();
      await expect(card.locator("[data-infrastructure-payment]")).toBeVisible();
      await button.click();
      await expect(card.locator("b").first()).toContainText(" · I");
    } else await expect(button).toBeDisabled();
  });

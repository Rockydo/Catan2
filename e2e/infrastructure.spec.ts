import { syncSeasonSurfaces } from "../src/game/seasons";
import { test, expect } from "@playwright/test";
import { newGame } from "../src/game/engine";
import { chooseAIAction } from "../src/game/ai";
import { run } from "../tests/helpers";
import { ownTowns } from "../src/game/selectors";
import { serialize, SAVE_KEY, assertInvariants } from "../src/game/save";
import { GOODS } from "../src/game/types";
import { neighbors } from "../src/game/world";

for (const locale of ["en", "fr"])
  test(`infrastructure upgrades and honest harvest previews in ${locale}`, async ({
    page,
  }) => {
    let s = newGame("infrastructure-browser");
    while (s.phase.startsWith("setup")) s = run(s, chooseAIAction(s));
    s.active = 0;
    s.phase = "economy";
    s.pieces = {};
    const town = ownTowns(s, 0)[0];
    town.level = town.turnLevel = 4;
    for (const good of GOODS) town.stock[good] = 200;
    const id = s.vertices[town.vertex].tiles.find(
      (id) => !["water", "ice", "peaks"].includes(s.tiles[id].resource),
    )!;
    const tile = s.tiles[id];
    tile.resource = "grain";
    tile.biome = "flood-wheat";
    tile.climate = "temperate";
    s.climatePlan![id] = "temperate";
    tile.geography!.pass = false;
    tile.geography!.waterway = undefined;
    tile.geography!.access = "normal";
    tile.geography!.floodplain = true;
    tile.geography!.projects = {};
    tile.geography!.fauna = {};
    tile.geography!.animals = [];
    s.wildlife = s.wildlife!.filter((w) => w.tile !== id);
    const river = s.tiles[neighbors(id).find((n) => s.tiles[n] && n !== id)!];
    river.resource = "water";
    river.geography!.waterway = "river";
    river.geography!.pass = false;
    river.biome = "river";
    syncSeasonSurfaces(s);
    assertInvariants(s);
    await page.addInitScript(
      ({ data, key, locale }) => {
        localStorage.setItem(key, data);
        localStorage.setItem("catane-language", locale);
      },
      { data: serialize(s), key: SAVE_KEY, locale },
    );
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/");
    await page
      .getByRole("button", {
        name: locale === "en" ? /Continue campaign/ : /Reprendre/,
      })
      .click();
    await page.getByTestId(`hex-${id}`).click();
    await page.getByTestId("inspector-details-toggle").click();
    await page.locator(".infrastructure-panel > summary").click();
    const irrigation = page.locator('[data-infrastructure="irrigation"]');
    await expect(irrigation.getByRole("button")).toBeEnabled();
    await irrigation.getByRole("button").click();
    await expect(irrigation.locator("b").first()).toContainText(
      "Irrigation · I",
    );
    await expect(page.locator(".irrigation-calendars")).toContainText("14");
    await expect(page.locator(".irrigation-calendars")).toContainText("7");
    await page.locator(".geography-panel select").selectOption("spread");
    await expect(page.locator(".geography-panel select")).toBeDisabled();
    await expect(page.locator(".irrigation-calendars")).toContainText(
      locale === "en" ? "year" : "année",
    );
    await irrigation.getByRole("button").click();
    await irrigation.getByRole("button").click();
    await expect(irrigation.locator("b").first()).toContainText("III");
    await expect(irrigation).toContainText("100");
    await expect(page.locator(".infrastructure-panel")).toContainText(
      locale === "en" ? "No upkeep" : "Aucun entretien",
    );
    await irrigation.getByRole("button").click();
    await expect(irrigation.locator("b").first()).toContainText("IV");
    await expect(irrigation.getByRole("button")).toHaveCount(0);
    await page.screenshot({
      path: `output/infrastructure/${locale}.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });

for (const locale of ["en", "fr"])
  test(`hunting habitat investment and local method details in ${locale}`, async ({
    page,
  }) => {
    let s = newGame("hunting-browser");
    while (s.phase.startsWith("setup")) s = run(s, chooseAIAction(s));
    s.active = 0;
    s.phase = "economy";
    s.pieces = {};
    const town = ownTowns(s, 0)[0];
    town.level = town.turnLevel = 4;
    for (const good of GOODS) town.stock[good] = 200;
    const id = s.vertices[town.vertex].tiles.find(
      (id) => !["water", "ice", "peaks"].includes(s.tiles[id].resource),
    )!;
    const tile = s.tiles[id];
    tile.resource = "lumber";
    tile.biome = "forest";
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
      ({ data, key, locale }) => {
        localStorage.setItem(key, data);
        localStorage.setItem("catane-language", locale);
      },
      { data: serialize(s), key: SAVE_KEY, locale },
    );
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/");
    await page
      .getByRole("button", {
        name: locale === "en" ? /Continue campaign/ : /Reprendre/,
      })
      .click();
    await page.getByTestId(`hex-${id}`).click();
    await page.getByTestId("inspector-details-toggle").click();
    await page.locator(".infrastructure-panel > summary").click();
    const hunting = page.locator('[data-infrastructure="hunting"]');
    await expect(hunting).toContainText(
      locale === "en" ? "No animals currently" : "Aucun animal actuellement",
    );
    await hunting.locator(".infrastructure-effects summary").click();
    await expect(hunting.locator(".geography-calendar > div")).toHaveCount(4);
    await expect(hunting).toContainText(
      locale === "en" ? "migration can change" : "migrations peuvent changer",
    );
    await expect(hunting.getByRole("button")).toBeEnabled();
    for (const tier of ["I", "II", "III", "IV"]) {
      await hunting.getByRole("button").click();
      await expect(hunting.locator("b").first()).toContainText(` · ${tier}`);
    }
    await expect(hunting.getByRole("button")).toHaveCount(0);
    await expect(page.locator("[data-development-level]")).toHaveAttribute(
      "data-development-level",
      "0",
    );
    const forestry = page.locator('[data-infrastructure="forestry"]');
    await forestry.locator(".infrastructure-effects summary").click();
    await expect(forestry).toContainText(
      locale === "en" ? "Wet-spell losses reduced" : "Pertes de pluie réduites",
    );
    await forestry.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `output/infrastructure/hunting-${locale}.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });

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

for (const locale of ["en", "fr"])
  for (const kind of ["foraging", "whaling", "mining"] as const)
    test(`${kind} upgrades persist and explain their site in ${locale}`, async ({
      page,
    }) => {
      let s = newGame(`new-production-${kind}`);
      const climate = kind === "mining" ? "tropical" : "tundra";
      const nativeSites = () =>
        Object.values(s.tiles).filter(
          (t) =>
            t.climate === climate &&
            !["water", "ice", "peaks"].includes(t.resource),
        );
      if (kind !== "whaling") {
        for (let attempt = 0; !nativeSites().length && attempt < 80; attempt++)
          s = newGame(`regional-browser-${climate}-${attempt}`);
        expect(nativeSites().length).toBeGreaterThan(0);
      }
      while (s.phase.startsWith("setup")) s = run(s, chooseAIAction(s));
      s.active = 0;
      s.phase = "economy";
      s.pieces = {};
      const town = ownTowns(s, 0)[0];
      town.level = town.turnLevel = 4;
      for (const good of GOODS) town.stock[good] = 500;
      let id = s.vertices[town.vertex].tiles.find(
        (id) => s.tiles[id].resource !== "peaks",
      )!;
      if (kind !== "whaling") {
        const target = nativeSites().find((t) =>
          t.vertices.some(
            (v) => !Object.values(s.towns).some((other) => other.vertex === v),
          ),
        )!;
        town.vertex = target.vertices.find(
          (v) => !Object.values(s.towns).some((other) => other.vertex === v),
        )!;
        id = target.id;
      }
      const tile = s.tiles[id];
      tile.resource =
        kind === "whaling" ? "water" : kind === "mining" ? "ore" : "grain";
      tile.biome =
        kind === "whaling"
          ? "water"
          : kind === "mining"
            ? "iron"
            : "tundra-heath";
      if (kind !== "whaling") {
        tile.geography!.elevation = kind === "mining" ? 0.48 : 0.76;
        if (kind === "foraging") tile.geography!.coastal = false;
      }
      Object.assign(tile.geography!, {
        pass: false,
        waterway: kind === "whaling" ? "coast" : undefined,
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
          if (!localStorage.getItem(key)) localStorage.setItem(key, data);
          localStorage.setItem("catane-language", locale);
        },
        { data: serialize(s), key: SAVE_KEY, locale },
      );
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto("/");
      const open = async () => {
        await page
          .getByRole("button", {
            name: locale === "en" ? /Continue campaign/ : /Reprendre/,
          })
          .click();
        await page.getByTestId(`hex-${id}`).click();
        await page.getByTestId("inspector-details-toggle").click();
        await page.locator(".infrastructure-panel > summary").click();
      };
      await open();
      const row = page.locator(`[data-infrastructure="${kind}"]`);
      if (kind === "whaling") {
        await expect(row).toContainText(
          locale === "en"
            ? "No whales currently"
            : "Aucune baleine actuellement",
        );
        await expect(row.locator("[data-recovery-priority]")).toContainText(
          locale === "en" ? "Oil" : "Huile",
        );
      } else await expect(row.locator("[data-method-site]")).toBeVisible();
      await row.locator(".infrastructure-effects summary").click();
      await expect(row.locator(".geography-calendar > div")).toHaveCount(4);
      if (kind !== "whaling")
        await expect(row).toHaveAttribute(
          "data-infrastructure-method",
          kind === "mining"
            ? "regional-tropical-lowland-iron-dewatering"
            : "regional-upland-tundra-berry-sorting-caches",
        );
      for (const tier of ["I", "II", "III", "IV"]) {
        await row.getByRole("button").click();
        await expect(row.locator("b").first()).toContainText(` · ${tier}`);
      }
      await expect(row.getByRole("button")).toHaveCount(0);
      await expect(page.locator("[data-development-level]")).toHaveAttribute(
        "data-development-level",
        kind === "mining" ? "3" : "0",
      );
      await row.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `output/infrastructure/${kind}-${locale}.png`,
        fullPage: true,
      });
      // Let the ordinary autosave finish, then exercise its real browser reload path.
      await expect
        .poll(() => page.evaluate((key) => localStorage.getItem(key), SAVE_KEY))
        .not.toBe(serialize(s));
      await page.reload();
      await open();
      await expect(row.locator("b").first()).toContainText(" · IV");
      expect(errors).toEqual([]);
    });

import { test, expect } from "@playwright/test";
import { newGame } from "../src/game/engine";
import { chooseAIAction } from "../src/game/ai";
import { run } from "../tests/helpers";
import { ownTowns } from "../src/game/selectors";
import { serialize, SAVE_KEY, assertInvariants } from "../src/game/save";
import { GOODS } from "../src/game/types";
import { syncSeasonSurfaces } from "../src/game/seasons";
for (const locale of ["en", "fr"] as const)
  for (const width of [1280, 768])
    test(`specialists, rotation and readable cards ${locale} ${width}`, async ({
      page,
    }) => {
      let s = newGame("infrastructure-browser");
      while (s.phase.startsWith("setup")) s = run(s, chooseAIAction(s));
      s.active = 0;
      s.phase = "economy";
      s.pieces = {};
      const town = ownTowns(s, 0)[0];
      town.level = town.turnLevel = 4;
      for (const good of GOODS) town.stock[good] = 5000;
      const id = s.vertices[town.vertex].tiles.find(
          (id) => !["water", "ice", "peaks"].includes(s.tiles[id].resource),
        )!,
        tile = s.tiles[id];
      tile.resource = "grain";
      tile.biome = "flood-wheat";
      tile.climate = "temperate";
      s.climatePlan![id] = "temperate";
      Object.assign(tile.geography!, {
        pass: false,
        waterway: undefined,
        access: "normal",
        floodplain: true,
        projects: {},
        fauna: {},
        animals: [],
      });
      s.wildlife = s.wildlife!.filter((w) => w.tile !== id);
      syncSeasonSurfaces(s);
      assertInvariants(s);
      const original = serialize(s),
        errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.addInitScript(
        ({ data, key, locale }) => {
          if (!localStorage.getItem(key)) localStorage.setItem(key, data);
          localStorage.setItem("catane-language", locale);
        },
        { data: original, key: SAVE_KEY, locale },
      );
      await page.setViewportSize({ width, height: 1000 });
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
      const panel = page.locator(".infrastructure-panel");
      await expect(
        panel.getByRole("tab", {
          name: locale === "en" ? /Main/ : /Principales/,
        }),
      ).toHaveAttribute("aria-selected", "true");
      const card = page.locator('[data-infrastructure="soil"]');
      await card.scrollIntoViewIfNeeded();
      expect((await card.boundingBox())!.height).toBeLessThan(650);
      await expect(card).not.toContainText("Visual development");
      await panel
        .getByRole("tab", {
          name: locale === "en" ? /Specialists/ : /Compléments/,
        })
        .click();
      const specialistTab = panel.getByRole("tab", {
        name: locale === "en" ? /Specialists/ : /Compléments/,
      });
      await specialistTab.focus();
      await page.keyboard.press("ArrowRight");
      await expect(panel.getByRole("tab", { name: /Rotations/ })).toBeFocused();
      await page.keyboard.press("ArrowLeft");
      await expect(specialistTab).toBeFocused();
      for (const branch of ["seed-selection", "field-gleaning"]) {
        const row = page.locator(`[data-specialist-branch="${branch}"]`);
        await expect(row.getByRole("button")).toBeEnabled();
        await row.getByRole("button").click();
        await expect(row.locator("b").first()).toContainText(" · I");
      }
      const rescue = page.locator('[data-specialist-branch="raised-rows"]');
      await expect(
        rescue.locator('[data-specialist-service="flood-rescue"]'),
      ).toBeVisible();
      await expect(
        rescue.locator("[data-flood-benefit] .geography-calendar > div"),
      ).toHaveCount(4);
      await expect(rescue.locator("[data-flood-benefit]")).toContainText("1");
      expect(
        await rescue.evaluate((el) => el.scrollWidth <= el.clientWidth + 2),
      ).toBe(true);
      await page
        .locator('[data-specialist-branch="seed-selection"]')
        .scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `output/infrastructure/specialists-${locale}-${width}.png`,
      });
      await panel.getByRole("tab", { name: /Rotations/ }).click();
      const rotation = page.locator(
        '[data-specialist-branch="rotation-stubble-turnips"]',
      );
      await expect(rotation).toContainText(
        locale === "en" ? "Autumn" : "Automne",
      );
      await expect(rotation.getByRole("button")).toBeEnabled();
      await rotation.getByRole("button").click();
      await expect(rotation.locator("b").first()).toContainText(" · I");
      await rotation.locator(".infrastructure-effects summary").click();
      await expect(rotation.locator(".geography-calendar > div")).toHaveCount(
        4,
      );
      expect(
        await panel.evaluate((el) => el.scrollWidth <= el.clientWidth + 2),
      ).toBe(true);
      await rotation.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `output/infrastructure/rotation-${locale}-${width}.png`,
      });
      await expect
        .poll(() => page.evaluate((key) => localStorage.getItem(key), SAVE_KEY))
        .not.toBe(original);
      await page.reload();
      await open();
      await panel.getByRole("tab", { name: /Rotations/ }).click();
      await expect(rotation.locator("b").first()).toContainText(" · I");
      await panel
        .getByRole("tab", {
          name: locale === "en" ? /Specialists/ : /Compléments/,
        })
        .click();
      await expect(
        page.locator('[data-specialist-branch="seed-selection"] b').first(),
      ).toContainText(" · I");
      expect(errors).toEqual([]);
    });

for (const locale of ["en", "fr"] as const)
  test(`freshwater ore specialist has clear requirements and four working stages ${locale}`, async ({
    page,
  }) => {
    let s = newGame("infrastructure-browser");
    while (s.phase.startsWith("setup")) s = run(s, chooseAIAction(s));
    s.active = 0;
    s.phase = "economy";
    s.pieces = {};
    const town = ownTowns(s, 0)[0];
    town.level = town.turnLevel = 4;
    for (const good of GOODS) town.stock[good] = 5000;
    const id = s.vertices[town.vertex].tiles.find(
      (id) => !["water", "ice", "peaks"].includes(s.tiles[id].resource),
    )!;
    const tile = s.tiles[id];
    tile.resource = "ore";
    tile.biome = "iron";
    tile.climate = "temperate";
    s.climatePlan![id] = "temperate";
    Object.assign(tile.geography!, {
      pass: false,
      waterway: undefined,
      access: "normal",
      floodplain: false,
      projects: {},
      fauna: {},
      animals: [],
      landmark: "thermal-spring",
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
    await page.setViewportSize({ width: 768, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await page
      .getByRole("button", {
        name: locale === "en" ? /Continue campaign/ : /Reprendre/,
      })
      .click();
    await page.getByTestId(`hex-${id}`).click();
    await page.getByTestId("inspector-details-toggle").click();
    await page.locator(".infrastructure-panel > summary").click();
    await page
      .getByRole("tab", {
        name: locale === "en" ? /Specialists/ : /Compléments/,
      })
      .click();
    const card = page.locator('[data-specialist-branch="ore-jigging"]');
    await expect(card).toContainText(
      locale === "en"
        ? "Requires local fresh water"
        : "Eau douce locale requise",
    );
    for (const tier of ["I", "II", "III", "IV"]) {
      await expect(card.getByRole("button")).toBeEnabled();
      await card.getByRole("button").click();
      await expect(card.locator("b").first()).toContainText(` · ${tier}`);
    }
    await expect(card.getByRole("button")).toHaveCount(0);
    expect(
      await card.evaluate((el) => el.scrollWidth <= el.clientWidth + 2),
    ).toBe(true);
    await card.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `output/infrastructure/niche-ore-${locale}.png`,
    });
    expect(errors).toEqual([]);
  });

for (const [locale, large] of [
  ["en", false],
  ["fr", true],
] as const)
  test(`weather-only specialists explain rounded effects ${locale}`, async ({
    page,
  }) => {
    let s = newGame("infrastructure-browser");
    while (s.phase.startsWith("setup")) s = run(s, chooseAIAction(s));
    s.active = 0;
    s.phase = "economy";
    s.pieces = {};
    const town = ownTowns(s, 0)[0];
    town.level = town.turnLevel = 4;
    for (const good of GOODS) town.stock[good] = 5000;
    const id = s.vertices[town.vertex].tiles.find(
      (id) => !["water", "ice", "peaks"].includes(s.tiles[id].resource),
    )!;
    const tile = s.tiles[id];
    tile.biome = large ? "old-growth-forest" : "woods";
    tile.climate = "temperate";
    tile.resource = "lumber";
    s.climatePlan![id] = tile.climate;
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
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto("/");
    await page
      .getByRole("button", {
        name: locale === "en" ? /Continue campaign/ : /Reprendre/,
      })
      .click();
    await page.getByTestId(`hex-${id}`).click();
    await page.getByTestId("inspector-details-toggle").click();
    await page.locator(".infrastructure-panel > summary").click();
    await page
      .getByRole("tab", {
        name: locale === "en" ? /Specialists/ : /Compléments/,
      })
      .click();
    const card = page.locator('[data-specialist-branch="covered-timber"]');
    await expect(card).toContainText(
      locale === "en"
        ? "Normal-weather harvest unchanged"
        : "Récolte normale inchangée",
    );
    await expect(card).toContainText("25% → 22.5%");
    await expect(card).toContainText(
      locale === "en"
        ? "Lost-resource recovery: 0 → 1"
        : "Récupération des pertes : 0 → 1",
    );
    if (!large)
      await expect(card).toContainText("rounded harvest stays the same");
    await card.locator(".infrastructure-effects summary").click();
    await expect(card.locator('[data-weather-calendar="wet"]')).toBeVisible();
    await expect(card).not.toContainText("No extra harvest");
    await expect(card.locator(".geography-calendar > div")).toHaveCount(4);
    await card.scrollIntoViewIfNeeded();
    expect(
      await card.evaluate((el) => el.scrollWidth <= el.clientWidth + 2),
    ).toBe(true);
    await page.screenshot({
      path: `output/infrastructure/weather-clarity-${locale}.png`,
    });
    for (let i = 0; i < 4; i++) await card.getByRole("button").click();
    await expect(card).toContainText(
      locale === "en"
        ? "Benefit from all four stages"
        : "Effet des quatre étapes",
    );
    await expect(card.getByRole("button")).toHaveCount(0);
  });

for (const locale of ["en", "fr"] as const)
  test(`livestock service byproducts are clear and buildable ${locale}`, async ({
    page,
  }) => {
    let s = newGame("infrastructure-browser");
    while (s.phase.startsWith("setup")) s = run(s, chooseAIAction(s));
    s.active = 0;
    s.phase = "economy";
    s.pieces = {};
    const town = ownTowns(s, 0)[0];
    town.level = town.turnLevel = 4;
    for (const good of GOODS) town.stock[good] = 5000;
    const id = s.vertices[town.vertex].tiles.find(
      (id) => !["water", "ice", "peaks"].includes(s.tiles[id].resource),
    )!;
    const tile = s.tiles[id];
    Object.assign(tile, {
      biome: "pasture",
      climate: "temperate",
      resource: "wool",
    });
    s.climatePlan![id] = "temperate";
    Object.assign(tile.geography!, {
      pass: false,
      waterway: undefined,
      access: "normal",
      floodplain: false,
      landmark: "thermal-spring",
      projects: {},
      fauna: {},
      animals: [],
    });
    s.wildlife = s.wildlife!.filter((w) => w.tile !== id);
    syncSeasonSurfaces(s);
    assertInvariants(s);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(
      ({ data, key, locale }) => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, data);
        localStorage.setItem("catane-language", locale);
      },
      { data: serialize(s), key: SAVE_KEY, locale },
    );
    await page.setViewportSize({ width: 768, height: 1000 });
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
      await page
        .getByRole("tab", {
          name: locale === "en" ? /Specialists/ : /Compléments/,
        })
        .click();
    };
    await open();
    for (const [id, role, resource] of [
      ["wool-washing", "wool-oil", locale === "en" ? "Oil" : "Huile"],
      ["fodder-reserves", "fodder", locale === "en" ? "Meat" : "Viande"],
    ]) {
      const card = page.locator(`[data-specialist-branch="${id}"]`);
      await expect(
        card.locator(`[data-specialist-service="${role}"]`),
      ).toBeVisible();
      await card.getByRole("button").click();
      await expect(card.locator(".infrastructure-gain")).toContainText(
        resource,
      );
      await card.getByRole("button").click();
      await expect(card.locator("b").first()).toContainText(" · II");
      await card.locator(".infrastructure-effects summary").click();
      await expect(card.locator(".infrastructure-comparison")).not.toHaveCount(
        0,
      );
      expect(
        await card.evaluate((el) => el.scrollWidth <= el.clientWidth + 2),
      ).toBe(true);
      await card.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `output/infrastructure/service-${role}-${locale}.png`,
      });
    }
    await page.waitForTimeout(1500);
    await page.reload();
    await open();
    await expect(
      page.locator('[data-specialist-branch="wool-washing"] b').first(),
    ).toContainText(" · II");
    expect(errors).toEqual([]);
  });

for (const locale of ["en", "fr"] as const)
  test(`forest livelihoods and local material savings ${locale}`, async ({
    page,
  }) => {
    let s = newGame("specialist-forest-browser");
    while (s.phase.startsWith("setup")) s = run(s, chooseAIAction(s));
    s.active = 0;
    s.phase = "economy";
    s.pieces = {};
    const town = ownTowns(s, 0)[0];
    town.level = town.turnLevel = 4;
    for (const good of GOODS) town.stock[good] = 5000;
    const id = s.vertices[town.vertex].tiles.find(
      (id) => !["water", "ice", "peaks"].includes(s.tiles[id].resource),
    )!;
    const tile = s.tiles[id];
    tile.biome = "forest";
    tile.resource = "lumber";
    tile.climate = "cold";
    s.climatePlan![id] = "cold";
    Object.assign(tile.geography!, {
      pass: false,
      waterway: undefined,
      access: "normal",
      floodplain: false,
      fauna: {},
      animals: [],
      projects: {},
    });
    const { SPECIALIST_BRANCHES, specialistId } =
      await import("../src/game/infrastructure-specialists");
    const sorting = SPECIALIST_BRANCHES.find((b) => b.id === "log-sorting")!;
    for (let n = 1; n <= 4; n++)
      tile.geography!.projects![specialistId(sorting, n)] = {
        owner: 0,
        born: 1,
        tier: 1,
      };
    s.wildlife = s.wildlife!.filter((w) => w.tile !== id);
    syncSeasonSurfaces(s);
    assertInvariants(s);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(
      ({ data, key, locale }) => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, data);
        localStorage.setItem("catane-language", locale);
      },
      { data: serialize(s), key: SAVE_KEY, locale },
    );
    await page.setViewportSize({ width: 768, height: 1000 });
    await page.goto("/");
    await page
      .getByRole("button", {
        name: locale === "en" ? /Continue campaign/ : /Reprendre/,
      })
      .click();
    await page.getByTestId(`hex-${id}`).click();
    await page.getByTestId("inspector-details-toggle").click();
    await page.locator(".infrastructure-panel > summary").click();
    await page
      .locator(".infrastructure-panel")
      .getByRole("tab", {
        name: locale === "en" ? /Specialists/ : /Compléments/,
      })
      .click();
    const mushrooms = page.locator(
      '[data-specialist-branch="woodland-mushrooms"]',
    );
    await expect(
      mushrooms.locator('[data-specialist-service="forest-food"]'),
    ).toBeVisible();
    await expect(mushrooms.locator("[data-material-savings]")).toBeVisible();
    await expect(mushrooms.getByRole("button")).toBeEnabled();
    await mushrooms.getByRole("button").click();
    await expect(mushrooms.locator("b").first()).toContainText(" · I");
    await mushrooms.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `output/landforms/specialist-forest-${locale}.png`,
    });
    expect(
      await mushrooms.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true);
    expect(errors).toEqual([]);
  });

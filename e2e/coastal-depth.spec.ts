import { test, expect } from "@playwright/test";
import { newGame } from "../src/game/engine";
import { chooseAIAction } from "../src/game/ai";
import { run } from "../tests/helpers";
import { coastalPattern, worldStructure } from "../src/game/world-structure";
import { serialize, SAVE_KEY, assertInvariants } from "../src/game/save";
import { suitableWildlifeHabitat } from "../src/game/environment";
import { ownTowns } from "../src/game/selectors";
import { syncSeasonSurfaces } from "../src/game/seasons";
import { GOODS } from "../src/game/types";
const patterns = new Map<string, string>();
for (let i = 0; i < 120 && patterns.size < 4; i++) {
  const seed = `shore-pattern-${i}`;
  if (
    worldStructure(seed) !== "continental" &&
    !patterns.has(coastalPattern(seed))
  )
    patterns.set(coastalPattern(seed), seed);
}
for (const [pattern, seed] of patterns)
  test(`coastal pattern ${pattern} supports twelve-faction play`, async ({
    page,
  }) => {
    let s = newGame(
      seed,
      Array.from({ length: 12 }, (_, i) => ({
        name: `Realm ${i}`,
        control: i ? ("standard" as const) : ("human" as const),
      })),
    );
    for (let n = 0; s.phase.startsWith("setup") && n < 60; n++)
      s = run(s, chooseAIAction(s));
    expect(s.phase.startsWith("setup")).toBe(false);
    s.active = 0;
    s.phase = "economy";
    assertInvariants(s);
    await page.addInitScript(
      ({ key, data }) => {
        localStorage.setItem(key, data);
        localStorage.setItem("catane-language", "en");
      },
      { key: SAVE_KEY, data: serialize(s) },
    );
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await page.getByRole("button", { name: /Continue campaign/ }).click();
    const tile = Object.values(s.tiles).find((t) => !!t.geography)!;
    await page.getByTestId(`hex-${tile.id}`).click();
    await page.getByTestId("inspector-details-toggle").click();
    await expect(page.locator("[data-coastal-pattern]")).toBeVisible();
    await page.screenshot({ path: `output/coastal-depth/${pattern}.png` });
    expect(errors).toEqual([]);
  });
for (const locale of ["en", "fr"] as const)
  test(`new woodland practices build with clear seasonal effects ${locale}`, async ({
    page,
  }) => {
    let s = newGame("infrastructure-browser");
    for (let n = 0; s.phase.startsWith("setup") && n < 60; n++)
      s = run(s, chooseAIAction(s));
    s.active = 0;
    s.phase = "economy";
    s.pieces = {};
    const town = ownTowns(s, 0)[0];
    town.level = town.turnLevel = 4;
    for (const g of GOODS) town.stock[g] = 5000;
    const id = s.vertices[town.vertex].tiles.find(
        (id) => !["water", "ice", "peaks"].includes(s.tiles[id].resource),
      )!,
      t = s.tiles[id];
    t.biome = "woods";
    t.resource = "lumber";
    t.climate = "temperate";
    s.climatePlan![id] = "temperate";
    Object.assign(t.geography!, {
      pass: false,
      waterway: undefined,
      access: "normal",
      projects: {},
      fauna: {},
      animals: [],
    });
    s.wildlife = s.wildlife!.filter((w) => w.tile !== id);
    syncSeasonSurfaces(s);
    assertInvariants(s);
    await page.addInitScript(
      ({ key, data, locale }) => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, data);
        localStorage.setItem("catane-language", locale);
      },
      { key: SAVE_KEY, data: serialize(s), locale },
    );
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
    for (const [id, role] of [
      ["coppice-stools", "winter-coppice"],
      ["woodland-pannage", "autumn-pannage"],
    ]) {
      const card = page.locator(`[data-specialist-branch="${id}"]`);
      await expect(
        card.locator(`[data-specialist-service="${role}"]`),
      ).toBeVisible();
      for (const tier of ["I", "II", "III", "IV"]) {
        await card.getByRole("button").click();
        await expect(card.locator("b").first()).toContainText(` · ${tier}`);
      }
      await expect(card.getByRole("button")).toHaveCount(0);
      await card.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `output/coastal-depth/${id}-${locale}.png`,
      });
    }
  });
test("older campaigns discover seal colonies once on load", async ({
  page,
}) => {
  let s;
  for (let n = 0; n < 80; n++) {
    const g = newGame(`polar-check-${n}`);
    if (
      Object.values(g.tiles).some((t) => suitableWildlifeHabitat(t, "seal"))
    ) {
      s = g;
      break;
    }
  }
  expect(s).toBeDefined();
  let game = s!;
  for (let n = 0; game.phase.startsWith("setup") && n < 60; n++)
    game = run(game, chooseAIAction(game));
  game.active = 0;
  game.phase = "economy";
  game.wildlife = [];
  for (const t of Object.values(game.tiles)) {
    t.geography!.fauna = {};
    t.geography!.animals = [];
    delete t.geography!.sealSurveyed;
  }
  assertInvariants(game);
  const candidates = Object.values(game.tiles)
    .filter((t) => suitableWildlifeHabitat(t, "seal"))
    .map((t) => t.id);
  await page.addInitScript(
    ({ key, data }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, data);
      localStorage.setItem("catane-language", "en");
    },
    { key: SAVE_KEY, data: serialize(game) },
  );
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  let found = false;
  for (const id of candidates) {
    await page.getByTestId(`hex-${id}`).click();
    const toggle = page.getByTestId("inspector-details-toggle");
    await toggle.click();
    if (
      (await page.locator(".geography-panel").innerText()).includes(
        "Seal colony",
      )
    ) {
      found = true;
      await page.screenshot({ path: "output/coastal-depth/seal-colony.png" });
      break;
    }
  }
  expect(found).toBe(true);
});

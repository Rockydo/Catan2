import { test, expect } from "@playwright/test";
import { maritimeFixture } from "../tests/maritime-fixture";
import { SAVE_KEY, serialize } from "../src/game/save";
import { syncSeasonSurfaces } from "../src/game/seasons";
import { piece, run } from "../tests/helpers";
import { newGame } from "../src/game/engine";
import { chooseAIAction } from "../src/game/ai";

for (const locale of ["en", "fr"] as const) {
  test(`${locale}: seasonal calendar, tile forecasts and art preview preserve game rules`, async ({
    page,
  }) => {
    const { s, home } = maritimeFixture();
    s.calendar = { startRound: s.round };
    Object.assign(s.tiles["0,0"], {
      biome: "golden-fields",
      climate: "temperate",
      resource: "grain",
      number: 7,
    });
    home.stock.meat = 12;
    syncSeasonSurfaces(s);
    await page.addInitScript(
      ({ key, data, locale }) => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, data);
        localStorage.setItem("catane-language", locale);
      },
      { key: SAVE_KEY, data: serialize(s), locale },
    );
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await page
      .getByRole("button", {
        name: locale === "fr" ? /Reprendre/ : /Continue campaign/,
      })
      .click();
    const calendar = page.getByRole("button", {
      name: locale === "fr" ? /Printemps Année 1/ : /Spring Year 1/,
    });
    await expect(calendar).toBeVisible();
    await page.getByTestId("hex-0,0").press("Enter");
    const forecast = page.getByRole("region", {
      name: locale === "fr" ? "Production saisonnière" : "Seasonal production",
    });
    await expect(forecast).toContainText(
      locale === "fr" ? "Pas de récolte" : "No harvest",
    );
    await expect(
      forecast.locator(".tile-season-grid > div").nth(1),
    ).toContainText("8");
    await expect(
      page.getByRole("button", {
        name: locale === "fr" ? "Viande : 12" : "Meat: 12",
        exact: true,
      }),
    ).toBeVisible();
    await calendar.click();
    const panel = page.getByRole("region", {
      name: locale === "fr" ? "Calendrier des saisons" : "Seasonal calendar",
    });
    await expect(panel).toBeVisible();
    await panel
      .getByRole("button", {
        name: locale === "fr" ? /Hiver APERÇU/ : /Winter PREVIEW/,
      })
      .click();
    await expect(panel).toHaveCount(0);
    await expect(page.locator(".season-map-preview")).toContainText(
      locale === "fr" ? "Hiver" : "Winter",
    );
    await expect(page.locator(".season-map-preview")).toContainText(
      locale === "fr" ? "Printemps" : "Spring",
    );
    // A visual preview never changes the actual production table or saved round.
    await expect(forecast.locator(".tile-season-heading")).toContainText(
      locale === "fr" ? "Printemps" : "Spring",
    );
    await expect(forecast).toContainText(
      locale === "fr" ? "Pas de récolte" : "No harvest",
    );
    const closeInspector = page.getByRole("button", {
      name:
        locale === "fr" ? "Fermer le panneau d'actions" : "Close action panel",
    });
    if (await closeInspector.isVisible()) await closeInspector.click();
    await page
      .getByRole("button", {
        name: locale === "fr" ? "Zoom avant" : "Zoom in",
        exact: true,
      })
      .click();
    await expect(page.locator(".season-map-preview")).toBeVisible();
    await page.screenshot({
      path: `test-artifacts/calendar-${locale}-${test.info().project.name}.png`,
    });
    await page
      .locator(".season-map-preview")
      .getByRole("button", {
        name:
          locale === "fr"
            ? "Revenir à la saison en cours"
            : "Return to current season",
      })
      .click();
    await expect(page.locator(".season-map-preview")).toHaveCount(0);
    await calendar.click();
    await panel
      .getByRole("button", {
        name: locale === "fr" ? /Hiver APERÇU/ : /Winter PREVIEW/,
      })
      .click();
    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
    await expect(page.locator(".season-map-preview")).toHaveCount(0);
    const saved = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).game,
      SAVE_KEY,
    );
    expect(saved.round).toBe(s.round);
    expect(saved.actions).toBe(s.actions);
    expect(saved.towns[home.id].stock.meat).toBe(12);
    await page.screenshot({
      path: `test-artifacts/seasons-${locale}-${test.info().project.name}.png`,
    });
    expect(errors).toEqual([]);
  });
}

test("icebound fleets and friendly land forces remain distinct and clearly labeled", async ({
  page,
}) => {
  const { s } = maritimeFixture();
  s.calendar = { startRound: s.round };
  s.round += 3;
  Object.assign(s.tiles["0,0"], {
    biome: "fish",
    climate: "cold",
    resource: "water",
    fish: true,
    number: 7,
  });
  const troop = piece(s, "0,0", 0, "heavy", 2);
  const ship = piece(s, "0,0", 0, "galley", 2);
  syncSeasonSurfaces(s);
  await page.addInitScript(
    ({ key, data }) => {
      localStorage.setItem(key, data);
      localStorage.setItem("catane-language", "en");
    },
    { key: SAVE_KEY, data: serialize(s) },
  );
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await page.getByTestId("hex-0,0").press("Enter");
  const overview = page.getByTestId("army-overview");
  await expect(overview.getByTestId("formation-owner-0")).toHaveCount(2);
  await expect(overview).toContainText("Icebound");
  await expect(overview).toContainText("Your army");
  await expect(overview).toContainText("Your fleet");
  expect(ship.seasonStatus).toBe("icebound");
  expect(troop.seasonStatus).toBeUndefined();
});

for (const locale of ["en", "fr"] as const) {
  test(`${locale}: illustrated rulebook reads exact climate harvest profiles`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(
      locale === "fr" ? "/rules-fr.html#seasons" : "/rules.html#seasons",
    );
    const reference = page.getByRole("region", {
      name:
        locale === "fr"
          ? "Tables des récoltes saisonnières"
          : "Seasonal harvest tables",
    });
    await expect(reference).toBeVisible();
    await reference
      .getByRole("button", { name: "Tropical", exact: true })
      .click();
    const rice = reference.locator('[data-biome="rice-field"]');
    await expect(rice.locator("td")).toHaveText(
      ["4 Grain", "4 Grain", "4 Grain", "0"].map((s) =>
        locale === "fr" ? s.replace("Grain", "Blé") : s,
      ),
      { useInnerText: true },
    );
    await reference
      .getByRole("button", { name: "Subtropical", exact: true })
      .click();
    await expect(rice.locator("td").nth(0)).toHaveText("0");
    await expect(rice.locator("td").nth(1)).toContainText("6");
    await expect(rice.locator("td").nth(2)).toContainText("6");
    await page
      .getByRole("heading", {
        name: locale === "fr" ? "Saisons et récoltes" : "Seasons and harvests",
        exact: true,
      })
      .first()
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `test-artifacts/season-rulebook-${locale}-${test.info().project.name}.png`,
    });
    expect(errors).toEqual([]);
  });
}

test("a generated mixed-climate campaign renders crop and livestock seasons without missing art", async ({
  page,
}) => {
  let s = newGame("season-review-1");
  s.calendar = { startRound: 1, startSeason: "spring" };
  syncSeasonSurfaces(s);
  while (s.phase.startsWith("setup")) s = run(s, chooseAIAction(s));
  expect(
    new Set(Object.values(s.tiles).map((t) => t.climate)).size,
  ).toBeGreaterThanOrEqual(6);
  s.round = 2;
  s.phase = "economy";
  s.players.forEach((p) => (p.control = "human"));
  syncSeasonSurfaces(s);
  const errors: string[] = [];
  const missing: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.url().includes("/assets/") && r.status() >= 400)
      missing.push(`${r.status()} ${r.url()}`);
  });
  await page.addInitScript(
    ({ key, data }) => {
      localStorage.setItem(key, data);
      localStorage.setItem("catane-language", "en");
    },
    { key: SAVE_KEY, data: serialize(s) },
  );
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  const handoff = page.getByRole("button", { name: "I am Emberhold" });
  await expect(handoff).toBeVisible();
  await handoff.click();
  for (const [id, name, amount] of [
    ["-3,2", "Barley fields", 0],
    ["1,-4", "Maize fields", 0],
    ["1,-6", "Cattle pasture", 1],
  ] as const) {
    await page.getByTestId(`hex-${id}`).press("Enter");
    const forecast = page.getByRole("region", { name: "Seasonal production" });
    await expect(
      page.getByRole("complementary", { name: "Action inspector" }),
    ).toContainText(name);
    await expect(forecast.locator(".tile-season-heading")).toContainText(
      "Summer",
    );
    await expect(
      forecast.locator(".tile-season-grid > div").nth(1),
    ).toContainText(String(amount));
  }
  await page.screenshot({
    path: `test-artifacts/season-mixed-campaign-${test.info().project.name}.png`,
  });
  const closeInspector = page.getByRole("button", {
    name: "Close action panel",
  });
  if (await closeInspector.isVisible()) await closeInspector.click();
  await page.getByRole("button", { name: /Summer Year 1/ }).click();
  await page
    .getByRole("region", { name: "Seasonal calendar" })
    .getByRole("button", { name: /Winter PREVIEW/ })
    .click();
  await expect(page.locator(".season-map-preview")).toContainText("Winter");
  const images = await page
    .locator("svg image")
    .evaluateAll((nodes) =>
      nodes.map((n) => n.getAttribute("href")).filter(Boolean),
    );
  expect(images.length).toBeGreaterThan(5);
  expect(
    await page.evaluate(async (urls) => {
      const statuses = await Promise.all(
        urls.map(async (url) => {
          const image = new Image();
          image.src = url!;
          try {
            await image.decode();
            return image.naturalWidth > 0;
          } catch {
            return false;
          }
        }),
      );
      return statuses.every(Boolean);
    }, images),
  ).toBe(true);
  await page.screenshot({
    path: `test-artifacts/season-mixed-winter-${test.info().project.name}.png`,
  });
  await page.getByRole("button", { name: "End turn", exact: true }).click();
  await expect(page.locator(".season-map-preview")).toHaveCount(0);
  expect(missing).toEqual([]);
  expect(errors).toEqual([]);
});

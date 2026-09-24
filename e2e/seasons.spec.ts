import { test, expect } from "@playwright/test";
import { maritimeFixture } from "../tests/maritime-fixture";
import { SAVE_KEY, serialize } from "../src/game/save";
import { syncSeasonSurfaces, seasonalProfile } from "../src/game/seasons";
import { terrainName } from "../src/game/maritime";
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
    await expect(page.getByTestId("hex-0,0")).toBeVisible();
    await page.getByTestId("hex-0,0").press("Enter");
    await page.getByTestId("inspector-details-toggle").click();
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
  await expect(page.getByTestId("hex-0,0")).toBeVisible();
  await page.getByTestId("hex-0,0").press("Enter");
  const overview = page.getByTestId("army-overview");
  await expect(overview.getByTestId("formation-owner-0")).toHaveCount(2);
  await expect(overview).toContainText("Stranded");
  await expect(overview).toContainText("Your army");
  await expect(overview).toContainText("Your fleet");
  expect(ship.seasonStatus).toBe("icebound");
  expect(troop.seasonStatus).toBeUndefined();
});

test("patchy autumn ice matches tile forecasts and summer previews", async ({
  page,
}) => {
  const { s } = maritimeFixture();
  s.calendar = { startRound: s.round, startSeason: "autumn", iceModel: 1 };
  for (const tile of Object.values(s.tiles)) tile.climate = "cold";
  for (const [id, freezeRoll] of [
    ["0,0", 0.2],
    ["1,0", 0.9],
  ] as const)
    Object.assign(s.tiles[id], {
      resource: "water",
      biome: "fish",
      climate: "arctic",
      number: 7,
      fish: true,
      freezeRoll,
    });
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
  await expect(page.getByTestId("hex-0,0")).toBeVisible();
  await page.getByTestId("hex-0,0").press("Enter");
  await page.getByTestId("inspector-details-toggle").click();
  const forecast = page.getByRole("region", { name: "Seasonal production" });
  await expect(forecast.locator(".season-surface-label")).toHaveText([
    "Frozen sea",
    "Open water",
    "Frozen sea",
    "Frozen sea",
  ]);
  await expect(
    forecast.locator(".tile-season-grid > div").nth(1),
  ).toContainText("4");
  await expect(
    page.locator(".connected-water [data-ice-exposure]"),
  ).toHaveCount(1);
  await expect(
    page.locator('image[href$="arctic-fish-autumn.webp"]'),
  ).toHaveCount(1);
  await expect(page.getByTestId("hex-1,0")).toBeVisible();
  await page.getByTestId("hex-1,0").press("Enter");
  await page.getByTestId("inspector-details-toggle").click();
  await expect(forecast.locator(".season-surface-label")).toHaveText([
    "Open water",
    "Open water",
    "Open water",
    "Frozen sea",
  ]);
  await page.getByRole("button", { name: /Autumn Year 1/ }).click();
  await page.getByRole("button", { name: /Summer PREVIEW/ }).click();
  await expect(
    page.locator(".connected-water [data-ice-exposure]"),
  ).toHaveCount(0);
  await expect(
    page.locator('image[href$="arctic-fish-summer.webp"]'),
  ).toHaveCount(2);
  const closeInspector = page.getByRole("button", {
    name: "Close action panel",
  });
  if (await closeInspector.isVisible()) await closeInspector.click();
  await page.getByRole("button", { name: "Return to current season" }).click();
  await page.screenshot({
    path: `test-artifacts/patchy-ice-${test.info().project.name}.png`,
  });
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
    // This fixture verifies the preserved fixed-animal climate-era table.
    await reference.getByRole("checkbox").check();
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
    for (const [biome, amounts, good] of [
      ["jungle", [1, 1, 1, 1], locale === "fr" ? "Peaux" : "Hides"],
      ["tropical-woods", [1, 1, 1, 1], locale === "fr" ? "Bois" : "Wood"],
      ["salt-flats", [1, 0, 1, 2], locale === "fr" ? "Sel" : "Salt"],
    ] as const) {
      await expect(reference.locator(`[data-biome="${biome}"] td`)).toHaveText(
        amounts.map((n) => (n ? `${n} ${good}` : "0")),
        {
          useInnerText: true,
        },
      );
    }
    await reference
      .getByRole("button", { name: "Subtropical", exact: true })
      .click();
    await expect(rice.locator("td").nth(0)).toHaveText("0");
    await expect(rice.locator("td").nth(1)).toContainText("4");
    await expect(rice.locator("td").nth(2)).toContainText("4");
    for (const [biome, amounts, good] of [
      ["river-woods", [1, 1, 1, 1], locale === "fr" ? "Bois" : "Wood"],
      ["alluvial-clay", [2, 1, 2, 3], locale === "fr" ? "Argile" : "Clay"],
    ] as const) {
      await expect(reference.locator(`[data-biome="${biome}"] td`)).toHaveText(
        amounts.map((n) => `${n} ${good}`),
        {
          useInnerText: true,
        },
      );
    }
    await reference
      .getByRole("button", {
        name: locale === "fr" ? "Savane" : "Savanna",
        exact: true,
      })
      .click();
    await expect(
      reference.locator('[data-biome="wildlife-grassland"] td'),
    ).toHaveText(
      [2, 1, 3, 2].map((n) => `${n} ${locale === "fr" ? "Peaux" : "Hides"}`),
      { useInnerText: true },
    );
    await expect(
      reference.locator('[data-biome="salt-flats"] td').nth(1),
    ).toHaveText("0");
    await reference
      .getByRole("button", {
        name: locale === "fr" ? "Désert" : "Desert",
        exact: true,
      })
      .click();
    await expect(reference.locator('[data-biome="salt-flats"] td')).toHaveText(
      Array(4).fill(locale === "fr" ? "1 Sel" : "1 Salt"),
      {
        useInnerText: true,
      },
    );
    await reference
      .getByRole("button", {
        name: locale === "fr" ? "Arctique" : "Arctic",
        exact: true,
      })
      .click();
    for (const [biome, goods] of [
      ["seal-grounds", locale === "fr" ? "1 Peaux 1 Huile" : "1 Hides 1 Oil"],
      [
        "reindeer-range",
        locale === "fr" ? "1 Viande 1 Peaux" : "1 Meat 1 Hides",
      ],
    ]) {
      const row = reference.locator(`[data-biome="${biome}"]`);
      await expect(row.locator("td")).toHaveText(Array(4).fill(goods), {
        useInnerText: true,
      });
    }
    await reference.getByRole("combobox").selectOption("autumn");
    await expect(
      reference.locator('[data-biome="reindeer-range"] th'),
    ).toContainText(locale === "fr" ? "Premières neiges" : "Early snow");
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
  let s = newGame("season-review-15");
  s.calendar = { ...s.calendar!, startSeason: "spring" };
  syncSeasonSurfaces(s);
  while (s.phase.startsWith("setup")) s = run(s, chooseAIAction(s));
  expect(
    new Set(Object.values(s.tiles).map((t) => t.climate)).size,
  ).toBeGreaterThanOrEqual(6);
  s.round = 3;
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
  const samples = Object.values(s.tiles)
    .filter(
      (t) =>
        ["grain", "meat", "wool"].includes(t.resource) &&
        Object.values(seasonalProfile(t, 0)).some((stock) =>
          Object.values(stock).some((n) => n),
        ),
    )
    .slice(0, 3);
  expect(samples).toHaveLength(3);
  for (const tile of samples) {
    const id = tile.id,
      name = terrainName(tile);
    const amount = Object.values(seasonalProfile(tile, 0).summer)[0] ?? 0;
    await expect(page.getByTestId(`hex-${id}`)).toBeVisible();
    await page.getByTestId(`hex-${id}`).press("Enter");
    await page.getByTestId("inspector-details-toggle").click();
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

import { test, expect } from "@playwright/test";
import { maritimeFixture } from "../tests/maritime-fixture";
import { SAVE_KEY, assertInvariants, serialize } from "../src/game/save";
import { syncSeasonSurfaces } from "../src/game/seasons";

for (const locale of ["en", "fr"] as const) {
  const grain = locale === "fr" ? "Blé" : "Grain";
  const rules = locale === "fr" ? "/rules-fr.html" : "/rules.html";

  test(`${locale}: current climates and regional cereal yields agree across the guide`, async ({
    page,
  }) => {
    const errors: string[] = [];
    const missing: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => {
      if (response.url().includes("/assets/") && response.status() >= 400)
        missing.push(response.url());
    });
    await page.goto(`${rules}#world`);
    const climate = page.locator(".climate-reference");
    await expect(climate.locator(".climate-tabs button")).toHaveCount(22);
    for (const [name, land, art] of [
      ["Glacial", "45%", "glacial-snow-plain-summer.webp"],
      [
        locale === "fr" ? "Hyperaride" : "Hyperarid",
        "90%",
        "hyperarid-desert-autumn.webp",
      ],
      [
        locale === "fr" ? "Mousson" : "Monsoon",
        "30%",
        "monsoon-jungle-autumn.webp",
      ],
    ] as const) {
      await climate.getByRole("button", { name, exact: true }).click();
      await expect(climate.locator("h3")).toContainText(land);
      await expect(climate).toContainText(locale === "fr" ? "0,35" : "0.35");
      const picture = climate
        .locator(`.terrain-picture[style*="${art}"]`)
        .first();
      await expect(picture).toHaveCount(1);
      expect(
        await picture.evaluate(async (element) => {
          const url = getComputedStyle(element).backgroundImage.match(
            /url\(["']?(.*?)["']?\)/,
          )![1];
          const image = new Image();
          image.src = url;
          await image.decode();
          return image.naturalWidth;
        }),
      ).toBeGreaterThan(0);
    }

    await page.goto(`${rules}#economy`);
    const catalogue = page.locator(".terrain-reference");
    for (const [biome, climates, amount] of [
      ["rice-field", "tropical", 3],
      ["rice-field", "subtropical", 2],
      ["rice-field", "monsoon", 1],
      ["barley-fields", "cold mediterranean alpine", 1],
      ["barley-fields", "oceanic", 2],
      ["turnip-fields", "temperate oceanic", 2],
      ["turnip-fields", "cold alpine", 1],
    ] as const) {
      const variant = catalogue.locator(
        `[data-terrain="${biome}"] ${climates
          .split(" ")
          .map((c) => `[data-yield-climates~="${c}"]`)
          .join("")}`,
      );
      await expect(variant.locator(".terrain-outputs").nth(0)).toContainText(
        `${amount} ${grain}`,
      );
      await expect(variant.locator(".terrain-outputs").nth(1)).toContainText(
        `${amount} Rations`,
      );
    }

    await page.goto(`${rules}#seasons`);
    const calendar = page.locator(".season-reference");
    await expect(calendar.locator(".climate-tabs button")).toHaveCount(22);
    for (const [name, biome, amounts] of [
      [locale === "fr" ? "Mousson" : "Monsoon", "rice-field", [0, 0, 4, 0]],
      [
        locale === "fr" ? "Océanique" : "Oceanic",
        "barley-fields",
        [0, 8, 0, 0],
      ],
      [
        locale === "fr" ? "Tempéré" : "Temperate",
        "chernozem-wheat",
        [0, 12, 0, 0],
      ],
      [
        locale === "fr" ? "Tempéré" : "Temperate",
        "turnip-fields",
        [0, 2, 6, 0],
      ],
      [
        locale === "fr" ? "Océanique" : "Oceanic",
        "turnip-fields",
        [0, 2, 6, 0],
      ],
      [locale === "fr" ? "Froid" : "Cold", "turnip-fields", [0, 1, 3, 0]],
      [locale === "fr" ? "Alpin" : "Alpine", "turnip-fields", [0, 1, 3, 0]],
    ] as const) {
      await calendar.getByRole("button", { name, exact: true }).click();
      await expect(calendar.locator(`[data-biome="${biome}"] td`)).toHaveText(
        amounts.map((amount) => (amount ? `${amount} ${grain}` : "0")),
        { useInnerText: true },
      );
    }
    expect(errors).toEqual([]);
    expect(missing).toEqual([]);
  });

  test(`${locale}: Summer keeps Glacial pack ice frozen while fisheries open and black-soil wheat harvests`, async ({
    page,
  }) => {
    const { s } = maritimeFixture();
    s.calendar = { startRound: s.round, startSeason: "summer", iceModel: 1 };
    // Alpine neighbors provide compatible buffers around both test regions.
    for (const tile of Object.values(s.tiles)) tile.climate = "alpine";
    Object.assign(s.tiles["0,0"], {
      biome: "chernozem-wheat",
      climate: "temperate",
      resource: "grain",
      number: 7,
    });
    Object.assign(s.tiles["2,0"], {
      biome: "ice",
      climate: "glacial",
      resource: "ice",
    });
    Object.assign(s.tiles["3,0"], {
      biome: "fish",
      climate: "glacial",
      resource: "water",
      fish: true,
      number: 7,
    });
    syncSeasonSurfaces(s);
    assertInvariants(s);
    await page.addInitScript(
      ({ key, data, locale }) => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, data);
        localStorage.setItem("catane-language", locale);
      },
      { key: SAVE_KEY, data: serialize(s), locale },
    );
    const errors: string[] = [];
    const missing: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => {
      if (response.url().includes("/assets/") && response.status() >= 400)
        missing.push(response.url());
    });
    await page.goto("/");
    await page
      .getByRole("button", {
        name: locale === "fr" ? /Reprendre/ : /Continue campaign/,
      })
      .click();
    const forecast = page.getByRole("region", {
      name: locale === "fr" ? "Production saisonnière" : "Seasonal production",
    });
    const frozen = locale === "fr" ? "Banquise" : "Frozen sea";
    const open = locale === "fr" ? "Mer libre" : "Open water";
    await expect(page.locator(".world-map")).toBeVisible();
    await expect(page.getByTestId("hex-2,0")).toBeVisible();
    await page.getByTestId("hex-2,0").press("Enter");
    await page.getByTestId("inspector-details-toggle").click();
    await expect(forecast.locator(".season-surface-label")).toHaveText([
      frozen,
      frozen,
      frozen,
      frozen,
    ]);
    await expect(forecast).toContainText(
      locale === "fr" ? "Banquise permanente" : "Permanent Glacial pack ice",
    );
    await expect(
      page.locator(".connected-water [data-ice-exposure]"),
    ).toHaveCount(1);

    await expect(page.getByTestId("hex-3,0")).toBeVisible();

    await page.getByTestId("hex-3,0").press("Enter");
    await page.getByTestId("inspector-details-toggle").click();
    await expect(forecast.locator(".season-surface-label")).toHaveText([
      frozen,
      open,
      frozen,
      frozen,
    ]);
    await expect(
      forecast
        .locator(".tile-season-grid > div")
        .nth(1)
        .locator(".season-goods b"),
    ).toHaveText("4");
    await expect(
      page.locator('image[href$="glacial-fish-summer.webp"]'),
    ).toHaveCount(1);

    await expect(page.getByTestId("hex-0,0")).toBeVisible();

    await page.getByTestId("hex-0,0").press("Enter");
    await page.getByTestId("inspector-details-toggle").click();
    await expect(page.locator(".panel-intro h2")).toHaveText(
      locale === "fr" ? "Blé sur terre noire" : "Black-soil wheat",
    );
    await expect(
      forecast
        .locator(".tile-season-grid > div")
        .nth(1)
        .locator(".season-goods b"),
    ).toHaveText("12");
    await expect(
      page.locator('image[href$="temperate-chernozem-wheat-summer.webp"]'),
    ).toHaveCount(1);

    await page
      .getByRole("button", {
        name: locale === "fr" ? /Été Année 1/ : /Summer Year 1/,
      })
      .click();
    await page
      .getByRole("button", {
        name: locale === "fr" ? /Hiver APERÇU/ : /Winter PREVIEW/,
      })
      .click();
    await expect(
      page.locator(".connected-water [data-ice-exposure]"),
    ).toHaveCount(2);
    await expect(forecast.locator(".tile-season-heading")).toContainText(
      locale === "fr" ? "Été" : "Summer",
    );
    const saved = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).game,
      SAVE_KEY,
    );
    expect(saved.tiles["2,0"].surface).toBe("frozen");
    expect(saved.tiles["3,0"].surface).toBe("open");
    expect(saved.round).toBe(s.round);
    expect(errors).toEqual([]);
    expect(missing).toEqual([]);
  });
}

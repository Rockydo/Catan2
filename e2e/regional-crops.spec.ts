import { test, expect } from "@playwright/test";
import { maritimeFixture } from "../tests/maritime-fixture";
import { SAVE_KEY, serialize } from "../src/game/save";
import { hash } from "../src/game/world";
import { syncSeasonSurfaces } from "../src/game/seasons";

for (const locale of ["en", "fr"] as const) {
  const grain = locale === "fr" ? "Blé" : "Grain";
  const rules = locale === "fr" ? "/rules-fr.html" : "/rules.html";
  for (const version of [11, 12]) {
    test(`${locale}: version-${version} regional crops migrate with names, food icons, forecasts and artwork after reload`, async ({
      page,
    }) => {
      const { s } = maritimeFixture();
      s.calendar = { startRound: s.round, startSeason: "summer", iceModel: 1 };
      const crops = [
        ["0,0", "oceanic", "turnip-fields", [0, 2, 6, 0]],
        ["1,0", "temperate", "turnip-fields", [0, 2, 6, 0]],
        ["2,0", "cold", "turnip-fields", [0, 1, 3, 0]],
        ["3,0", "alpine", "turnip-fields", [0, 1, 3, 0]],
        ["-1,1", "temperate", "oat-fields", [0, 6, 2, 0]],
        ["-2,1", "subtropical", "sorghum-fields", [0, 0, 8, 0]],
      ] as const;
      const names = {
        "turnip-fields": locale === "fr" ? "Champs de navets" : "Turnip fields",
        "oat-fields": locale === "fr" ? "Champs d’avoine" : "Oat fields",
        "sorghum-fields":
          locale === "fr" ? "Champs de sorgho" : "Sorghum fields",
      };
      const envelope = JSON.parse(serialize(s));
      envelope.version = version;
      for (const [id, climate, biome] of crops)
        Object.assign(envelope.game.tiles[id], {
          biome:
            biome === "turnip-fields"
              ? version === 11
                ? "rye-fields"
                : "potato-fields"
              : "maize-field",
          climate,
          resource: "grain",
          number: 7,
        });
      envelope.checksum = hash(JSON.stringify(envelope.game)).toString(16);
      await page.addInitScript(
        ({ key, data, locale }) => {
          if (!localStorage.getItem(key)) localStorage.setItem(key, data);
          localStorage.setItem("catane-language", locale);
        },
        { key: SAVE_KEY, data: JSON.stringify(envelope), locale },
      );
      const errors: string[] = [],
        missing: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("response", (response) => {
        if (response.url().includes("/assets/") && response.status() >= 400)
          missing.push(response.url());
      });
      const forecast = page.getByRole("region", {
        name:
          locale === "fr" ? "Production saisonnière" : "Seasonal production",
      });
      await page.goto("/");
      for (const reloaded of [false, true]) {
        if (reloaded) await page.reload();
        await page
          .getByRole("button", {
            name: locale === "fr" ? /Reprendre/ : /Continue campaign/,
          })
          .click();
        for (const [id, climate, biome, amounts] of crops) {
          const hex = page.getByTestId(`hex-${id}`);
          await expect(hex).toHaveAccessibleName(new RegExp(names[biome]));
          await expect(hex).toHaveAccessibleName(
            new RegExp(`${amounts[1]} ${grain}`),
          );
          await hex.press("Enter");
          await expect(page.locator(".panel-intro h2")).toHaveText(
            names[biome],
          );
          for (const [index, amount] of amounts.entries()) {
            const output = forecast
              .locator(".tile-season-grid > div")
              .nth(index)
              .locator(".season-goods, .season-no-harvest");
            await expect(output).toHaveText(
              amount ? `${amount} ${grain}` : "0",
            );
            await expect(output.locator("svg.resource-icon")).toHaveCount(
              amount ? 1 : 0,
            );
            if (amount)
              await expect(output.locator(`[title="${grain}"]`)).toHaveCount(1);
          }
          const art = page.locator(
            `image[href$="${climate}-${biome}-summer.webp"]`,
          );
          await expect(art).toHaveCount(1);
          expect(
            await art.evaluate(async (element) => {
              const image = new Image();
              image.src = element.getAttribute("href")!;
              await image.decode();
              return image.naturalWidth;
            }),
          ).toBeGreaterThan(0);
        }
        const saved = await page.evaluate(
          (key) => JSON.parse(localStorage.getItem(key)!),
          SAVE_KEY,
        );
        expect(saved.version).toBe(12);
        for (const [id, climate, biome] of crops)
          expect(saved.game.tiles[id]).toMatchObject({
            id,
            biome,
            climate,
            resource: "grain",
            number: 7,
          });
        expect(saved.game.towns).toEqual(s.towns);
        expect(saved.game.rng).toEqual(s.rng);
        expect(saved.game.round).toBe(s.round);
      }
      expect(errors).toEqual([]);
      expect(missing).toEqual([]);
    });
  }

  test(`${locale}: American regions expose distinct terrain, crop calendars and Oil processing`, async ({
    page,
  }) => {
    const errors: string[] = [],
      missing: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => {
      if (response.url().includes("/assets/") && response.status() >= 400)
        missing.push(response.url());
    });
    await page.goto(`${rules}#world`);
    const climate = page.locator(".climate-reference");
    await expect(climate.locator(".climate-tabs button")).toHaveCount(17);
    for (const [name, land, terrain, share] of [
      [
        locale === "fr" ? "Andin" : "Andean",
        "75%",
        locale === "fr" ? "Champs de pommes de terre" : "Potato fields",
        "18%",
      ],
      [
        "Prairie",
        "70%",
        locale === "fr" ? "Champs de tournesols" : "Sunflower fields",
        "6%",
      ],
      [
        locale === "fr" ? "Mésoaméricain" : "Mesoamerican",
        "45%",
        locale === "fr" ? "Jardins chinampas" : "Chinampa gardens",
        "6%",
      ],
    ] as const) {
      await climate.getByRole("button", { name, exact: true }).click();
      await expect(climate.locator("h3")).toContainText(land);
      if (locale === "fr") {
        await expect(climate).toContainText("Montagnes de minerai");
        await expect(climate).toContainText("Marais salants");
        if (name === "Prairie")
          await expect(climate).toContainText("Carrière de pierre");
      }
      if (name === "Prairie" || name === "Andean" || name === "Andin")
        await expect(climate).toContainText(
          locale === "fr"
            ? "Aucune baleine dans ce climat."
            : "No whales in this climate.",
        );
      const row = climate
        .locator(".climate-terrain")
        .filter({ hasText: terrain });
      await expect(row).toContainText(share);
      const picture = row.locator(".terrain-picture");
      await expect(picture).toHaveCount(1);
      expect(
        await picture.evaluate(async (element) => {
          const image = new Image();
          image.src = getComputedStyle(element).backgroundImage.match(
            /url\(["']?(.*?)["']?\)/,
          )![1];
          await image.decode();
          return image.naturalWidth;
        }),
      ).toBeGreaterThan(0);
      await climate.screenshot({
        path: `test-artifacts/american-${name}-${locale}-${test.info().project.name}.png`,
      });
    }
    await page.goto(`${rules}#seasons`);
    const calendar = page.locator(".season-reference");
    for (const [name, biome, amounts, good] of [
      [
        locale === "fr" ? "Andin" : "Andean",
        "potato-fields",
        [0, 2, 6, 0],
        grain,
      ],
      ["Prairie", "maize-field", [0, 0, 8, 0], grain],
      [
        "Prairie",
        "sunflower-fields",
        [0, 0, 4, 0],
        locale === "fr" ? "Huile" : "Oil",
      ],
      [
        locale === "fr" ? "Mésoaméricain" : "Mesoamerican",
        "chinampa-gardens",
        [4, 4, 4, 0],
        grain,
      ],
      [
        locale === "fr" ? "Mésoaméricain" : "Mesoamerican",
        "turkey-grounds",
        [1, 1, 4, 2],
        locale === "fr" ? "Viande" : "Meat",
      ],
      [
        locale === "fr" ? "Tempéré" : "Temperate",
        "oat-fields",
        [0, 6, 2, 0],
        grain,
      ],
      ["Subtropical", "sorghum-fields", [0, 0, 8, 0], grain],
    ] as const) {
      await calendar.getByRole("button", { name, exact: true }).click();
      await expect(calendar.locator(`[data-biome="${biome}"] td`)).toHaveText(
        amounts.map((amount) => (amount ? `${amount} ${good}` : "0")),
        { useInnerText: true },
      );
    }
    await page.goto(`${rules}#economy`);
    const sunflowers = page.locator('[data-terrain="sunflower-fields"]');
    await expect(sunflowers.locator(".terrain-outputs").nth(0)).toContainText(
      locale === "fr" ? "1 Huile" : "1 Oil",
    );
    await expect(sunflowers.locator(".terrain-outputs").nth(1)).toContainText(
      locale === "fr" ? "1 Combustible" : "1 Fuel",
    );
    await expect(
      page.locator(".terrain-reference [data-terrain=rye-fields]"),
    ).toHaveCount(0);
    expect(errors).toEqual([]);
    expect(missing).toEqual([]);
  });

  test(`${locale}: Prairie winter freezes while Andean fisheries stay open`, async ({
    page,
  }) => {
    const { s } = maritimeFixture();
    for (const tile of Object.values(s.tiles)) tile.climate = "steppe";
    s.calendar = { startRound: s.round, startSeason: "winter", iceModel: 1 };
    for (const [id, climate] of [
      ["0,0", "prairie"],
      ["3,0", "andean"],
    ] as const)
      Object.assign(s.tiles[id], {
        resource: "water",
        biome: "fish",
        fish: true,
        climate,
        freezeRoll: 0.05,
        number: 7,
      });
    syncSeasonSurfaces(s);
    await page.addInitScript(
      ({ key, data, locale }) => {
        localStorage.setItem(key, data);
        localStorage.setItem("catane-language", locale);
      },
      { key: SAVE_KEY, data: serialize(s), locale },
    );
    await page.goto("/");
    await page
      .getByRole("button", {
        name: locale === "fr" ? /Reprendre/ : /Continue campaign/,
      })
      .click();
    await page.getByTestId("hex-0,0").press("Enter");
    const forecast = page.getByRole("region", {
      name: locale === "fr" ? "Production saisonnière" : "Seasonal production",
    });
    const frozen = locale === "fr" ? "Banquise" : "Frozen sea",
      open = locale === "fr" ? "Mer libre" : "Open water";
    await expect(forecast.locator(".season-surface-label")).toHaveText([
      frozen,
      open,
      frozen,
      frozen,
    ]);
    await page.getByTestId("hex-3,0").press("Enter");
    await expect(
      forecast
        .locator(".tile-season-grid > div")
        .nth(3)
        .locator(".season-no-harvest"),
    ).toHaveText("0");
    const saved = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).game,
      SAVE_KEY,
    );
    expect(saved.tiles["0,0"].surface).toBe("frozen");
    expect(saved.tiles["3,0"].surface).toBe("open");
    const closePanel = page.getByRole("button", {
      name:
        locale === "fr" ? "Fermer le panneau d'actions" : "Close action panel",
      exact: true,
    });
    if (await closePanel.isVisible()) await closePanel.click();
    await page
      .locator(".resource-chip")
      .filter({
        has: page.locator("span", {
          hasText: locale === "fr" ? /^Huile$/ : /^Oil$/,
        }),
      })
      .click();
    const guide = page.getByRole("dialog");
    await expect(guide.locator(".production-chain")).toContainText(
      locale === "fr" ? "Raffinerie de combustible" : "Fuel works",
    );
    await expect(guide).toContainText(
      locale === "fr" ? "Champs de tournesols" : "Sunflower fields",
    );
    await expect(guide).toContainText("Artisans");
  });
}

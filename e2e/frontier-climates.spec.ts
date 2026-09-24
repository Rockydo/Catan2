import { test, expect } from "@playwright/test";
import { FRONTIER_CLIMATES, CLIMATE_INFO } from "../src/game/climate-content";
import { SEASONS } from "../src/game/seasons";
import { maritimeFixture } from "../tests/maritime-fixture";
import { BIOME_INFO } from "../src/game/climate-content";
import { SAVE_KEY, serialize } from "../src/game/save";

for (const climate of FRONTIER_CLIMATES) {
  test(`${climate}: map artwork, tile yields and climate overview are readable`, async ({
    page,
  }) => {
    const { s } = maritimeFixture();
    s.calendar = {
      startRound: s.round,
      startSeason: "summer",
      roundsPerSeason: 2,
      iceModel: 2,
    };
    const biomes = CLIMATE_INFO[climate].terrain.map(([b]) => b);
    Object.values(s.tiles).forEach((tile, i) => {
      tile.climate = climate;
      tile.biome = biomes[i % biomes.length];
      tile.resource = BIOME_INFO[tile.biome].resource;
      delete tile.surface;
    });
    const target = s.tiles["0,0"];
    target.biome = biomes[0];
    target.resource = BIOME_INFO[target.biome].resource;
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
    await expect(page.locator(".world-map")).toBeVisible();
    await page.getByTestId("hex-0,0").press("Enter");
    await expect(page.locator(".panel-intro h2")).toHaveText(
      BIOME_INFO[target.biome].name,
    );
    await expect(
      page
        .locator(`image[href$="${climate}-${target.biome}-summer.webp"]`)
        .first(),
    ).toBeAttached();
    await page.screenshot({
      path: `test-artifacts/frontier-map-${climate}-${test.info().project.name}.png`,
    });
    const close = page.getByRole("button", {
      name: "Close action panel",
      exact: true,
    });
    if (await close.isVisible()) await close.click();
    await page
      .getByRole("button", { name: "Show climates", exact: true })
      .click();
    await expect(page.locator(".climate-map-legend")).toContainText(
      CLIMATE_INFO[climate].name,
    );
    expect(errors).toEqual([]);
  });
}

for (const locale of ["en", "fr"] as const) {
  test(`${locale}: all new landscapes load in the regional and seasonal guides`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.url().includes("/assets/") && r.status() >= 400)
        errors.push(r.url());
    });
    const names =
      locale === "fr"
        ? ["Toundra", "Forêt pluviale tempérée", "Marais équatoriaux"]
        : FRONTIER_CLIMATES.map((c) => CLIMATE_INFO[c].name);
    await page.goto(
      `${locale === "fr" ? "/rules-fr.html" : "/rules.html"}#world`,
    );
    const reference = page.locator(".climate-reference");
    await expect(reference.locator(".climate-tabs button")).toHaveCount(20);
    for (const name of names) {
      await reference.getByRole("button", { name, exact: true }).click();
      await expect(
        reference
          .locator(".climate-columns > div")
          .first()
          .locator(".climate-terrain"),
      ).toHaveCount(8);
      await expect(reference).toContainText(locale === "fr" ? "88 %" : "88%");
    }
    await page.goto(
      `${locale === "fr" ? "/rules-fr.html" : "/rules.html"}#seasons`,
    );
    const calendar = page.locator(".season-reference");
    for (const [i, climate] of FRONTIER_CLIMATES.entries()) {
      await calendar
        .getByRole("button", { name: names[i], exact: true })
        .click();
      for (const season of SEASONS) {
        await calendar
          .getByLabel(
            locale === "fr" ? "Aperçu du paysage" : "Landscape preview",
          )
          .selectOption(season);
        const pictures = calendar.locator(
          `.terrain-picture[style*="${climate}-"][style*="-${season}.webp"]`,
        );
        await expect(pictures).toHaveCount(8);
        expect(
          await pictures.evaluateAll(async (elements) =>
            Promise.all(
              elements.map(async (element) => {
                const url = getComputedStyle(element).backgroundImage.match(
                  /url\(["']?(.*?)["']?\)/,
                )![1];
                const image = new Image();
                image.src = url;
                await image.decode();
                return image.naturalWidth;
              }),
            ),
          ),
        ).toEqual(Array(8).fill(384));
      }
    }
    await page.screenshot({
      path: `test-artifacts/frontier-climates-${locale}-${test.info().project.name}.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
}

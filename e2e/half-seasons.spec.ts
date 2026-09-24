import { test, expect } from "@playwright/test";
import { maritimeFixture } from "../tests/maritime-fixture";
import { piece } from "../tests/helpers";
import { SAVE_KEY, serialize } from "../src/game/save";
import { syncSeasonSurfaces } from "../src/game/seasons";

for (const locale of ["en", "fr"] as const) {
  test(`${locale}: early and late calendar, weather outlook, fleet escort and saved ice`, async ({
    page,
  }, info) => {
    const { s } = maritimeFixture();
    s.calendar = {
      startRound: 1,
      startSeason: "spring",
      roundsPerSeason: 2,
      iceModel: 2,
    };
    s.round = 1;
    const tile = s.tiles["1,0"];
    Object.assign(tile, {
      resource: "water",
      biome: "fish",
      fish: true,
      climate: "cold",
      surface: "frozen",
      freezeRoll: 0.99,
      iceWeather: { round: 1, season: "spring", half: "early" },
    });
    piece(s, tile.id, 0, "galley", 4);
    piece(s, tile.id, 0, "heavy", 4);
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
        name: locale === "en" ? /Continue campaign/ : /Reprendre/,
      })
      .click();
    const calendar = page.getByRole("button", {
      name:
        locale === "en" ? "Early Spring Year 1" : "Début de printemps Année 1",
    });
    await calendar.click();
    const panel = page.getByRole("region", {
      name: locale === "en" ? "Seasonal calendar" : "Calendrier des saisons",
    });
    await expect(panel).toContainText(
      locale === "en" ? "two full rounds" : "deux manches complètes",
    );
    await expect(panel).toContainText(
      locale === "en" ? "Late Spring" : "Fin de printemps",
    );
    await page
      .getByRole("button", {
        name:
          locale === "en"
            ? "Close seasonal calendar"
            : "Fermer le calendrier des saisons",
      })
      .click();
    await expect(page.getByTestId("hex-1,0")).toBeVisible();
    await page.getByTestId("hex-1,0").press("Enter");
    await page.getByTestId("inspector-details-toggle").click();
    const forecast = page.locator(".ice-forecast");
    await expect(forecast.locator(".ice-next-risk")).toContainText("90%");
    await expect(forecast).toContainText(
      locale === "en" ? "chance to thaw" : "de chances de dégeler",
    );
    await forecast.locator("summary").click();
    await expect(forecast.locator(".ice-outlook-grid > div")).toHaveCount(8);
    await expect(
      forecast.locator(".ice-outlook-grid > div").first(),
    ).toContainText("10%");
    await forecast.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `test-artifacts/half-season-ice-${locale}-${info.project.name}.png`,
    });
    await expect(page.getByTestId("army-1,0")).toBeVisible();
    await page.getByTestId("army-1,0").press("Enter");
    const overview = page.getByTestId("army-overview");
    await expect(overview).toContainText(
      locale === "en" ? "quarter power" : "quart de leur puissance",
    );
    await expect(overview.locator(".formation-faction")).toHaveCount(2);
    const stored = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).game,
      SAVE_KEY,
    );
    expect(stored.tiles[tile.id].surface).toBe("frozen");
    expect(stored.tiles[tile.id].iceWeather).toEqual(tile.iceWeather);
    expect(stored.round).toBe(1);
    await page.reload();
    await page
      .getByRole("button", {
        name: locale === "en" ? /Continue campaign/ : /Reprendre/,
      })
      .click();
    await expect(calendar).toBeVisible();
    expect(errors).toEqual([]);
  });

  test(`${locale}: rulebook publishes conditional ice odds`, async ({
    page,
  }) => {
    await page.goto(
      locale === "en" ? "/rules.html#seasons" : "/rules-fr.html#seasons",
    );
    const reference = page.locator(".season-reference");
    await reference
      .getByRole("button", {
        name: locale === "en" ? "Arctic" : "Arctique",
        exact: true,
      })
      .click();
    await reference.locator(".ice-rules > summary").click();
    await expect(reference.locator(".ice-transition-table")).toHaveCount(2);
    const ordinary = reference.locator(".ice-transition-table").first();
    await expect(ordinary.locator("tbody tr")).toHaveCount(8);
    await expect(ordinary.locator("tbody tr").nth(5)).toContainText("55%");
    await expect(ordinary.locator("tbody tr").nth(1)).toContainText("70%");
  });
}

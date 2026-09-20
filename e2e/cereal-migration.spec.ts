import { test, expect } from "@playwright/test";
import { maritimeFixture } from "../tests/maritime-fixture";
import { SAVE_KEY, serialize } from "../src/game/save";
import { hash } from "../src/game/world";

for (const locale of ["en", "fr"] as const) {
  test(`${locale}: retired fields load as named cereals with matching forecasts and artwork`, async ({
    page,
  }) => {
    const { s } = maritimeFixture();
    s.calendar = { startRound: s.round, startSeason: "summer", iceModel: 1 };
    const envelope = JSON.parse(serialize(s));
    envelope.version = 10;
    for (const [id, climate] of [
      ["0,0", "oceanic"],
      ["2,0", "steppe"],
    ])
      Object.assign(envelope.game.tiles[id], {
        biome: "rough-fields",
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
    for (const [id, name, climate, biome, amounts] of [
      [
        "0,0",
        locale === "fr" ? "Champs d’orge" : "Barley fields",
        "oceanic",
        "barley-fields",
        [0, 8, 0, 0],
      ],
      [
        "2,0",
        locale === "fr" ? "Champs de millet" : "Millet fields",
        "steppe",
        "millet-fields",
        [0, 0, 4, 0],
      ],
    ] as const) {
      await page.getByTestId(`hex-${id}`).press("Enter");
      await expect(page.locator(".panel-intro h2")).toHaveText(name);
      for (const [index, amount] of amounts.entries())
        await expect(
          forecast.locator(".tile-season-grid > div").nth(index),
        ).toContainText(String(amount));
      await expect(
        page.locator(`image[href$="${climate}-${biome}-summer.webp"]`),
      ).toHaveCount(1);
    }
    await page.reload();
    await page
      .getByRole("button", {
        name: locale === "fr" ? /Reprendre/ : /Continue campaign/,
      })
      .click();
    await page.getByTestId("hex-0,0").press("Enter");
    await expect(page.locator(".panel-intro h2")).toHaveText(
      locale === "fr" ? "Champs d’orge" : "Barley fields",
    );
    expect(errors).toEqual([]);
    expect(missing).toEqual([]);
  });
}

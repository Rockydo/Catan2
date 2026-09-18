import { test, expect } from "@playwright/test";
import { maritimeFixture } from "../tests/maritime-fixture";
import { serialize, SAVE_KEY } from "../src/game/save";
import { BIOME_INFO } from "../src/game/climate-content";

for (const locale of ["en", "fr"] as const) {
  for (const biome of ["snow-plain", "desert", "ice"] as const) {
    test(`${locale}: select a town beside ${biome}, open Forces and recruit`, async ({
      page,
    }) => {
      const { s, home } = maritimeFixture();
      Object.assign(s.tiles["0,0"], {
        biome,
        resource: BIOME_INFO[biome].resource,
      });
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
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
          name: locale === "en" ? /Continue campaign/ : /Reprendre/,
        })
        .click();
      await page.getByTestId(`town-${home.id}`).press("Enter");
      await page.getByRole("button", { name: "Forces", exact: true }).click();
      const deployment = page.getByLabel(
        locale === "en" ? "Land deployment" : "Déploiement terrestre",
      );
      await expect(deployment).toBeVisible();
      await deployment.selectOption("0,0");
      await page
        .locator('[data-testid="recruit-heavy"] .recruit-purchase')
        .click();
      await expect
        .poll(() =>
          page.evaluate(
            (key) =>
              Object.values(JSON.parse(localStorage.getItem(key)!).game.pieces)
                .length,
            SAVE_KEY,
          ),
        )
        .toBe(1);
      expect(errors).toEqual([]);
      await expect(page.locator(".crash-screen")).toHaveCount(0);
    });
  }
}

import { test, expect } from "@playwright/test";
import { maritimeFixture } from "../tests/maritime-fixture";
import { serialize, SAVE_KEY } from "../src/game/save";

for (const locale of ["en", "fr"]) {
  test(`automatic Gold payment is disclosed and spent in ${locale}`, async ({
    page,
  }) => {
    const { s, home } = maritimeFixture();
    home.stock = { gold: 3, goldbars: 6 };
    await page.addInitScript(
      ({ data, key, locale }) => {
        localStorage.setItem(key, data);
        localStorage.setItem("catane-language", locale);
      },
      { data: serialize(s), key: SAVE_KEY, locale },
    );
    await page.goto("/");
    await page
      .getByRole("button", {
        name: locale === "en" ? /Continue campaign/ : /Reprendre/,
      })
      .click();
    await page.getByRole("button", { name: "Forces", exact: true }).click();
    const recruit = page.locator(
      '[data-testid="recruit-heavy"] .recruit-purchase',
    );
    await expect(recruit).toBeEnabled();
    await expect(recruit.locator(".fish-payment")).toContainText(
      locale === "en" ? "Gold" : "Or",
    );
    await expect(recruit.locator(".cost-shortage")).toHaveCount(0);
    const close = page.getByRole("button", {
      name: locale === "en" ? "Close action panel" : /Fermer le panneau/,
    });
    if (await close.isVisible()) await close.click();
    await page
      .getByRole("button", {
        name: locale === "en" ? "Research" : "Développement",
        exact: true,
      })
      .click();
    const buy = page.getByRole("button", {
      name:
        locale === "en"
          ? /Fund tier I research/
          : /Financer le développement de palier I\s/,
    });
    await expect(buy).toBeEnabled();
    await expect(buy).toContainText(
      locale === "en"
        ? "Uses 3 Gold for missing raw resources."
        : "Utilise 3 Or pour les ressources brutes manquantes.",
    );
    await buy.click();
    await expect(page.locator(".research-card")).toHaveCount(2);
    await page.locator(".research-card").first().click();
    await expect
      .poll(() =>
        page.evaluate(
          ({ key, id }) =>
            JSON.parse(localStorage.getItem(key)!).game.towns[id].stock.gold ??
            0,
          { key: SAVE_KEY, id: home.id },
        ),
      )
      .toBe(0);
    const fourth = page.locator(".research-tier").nth(3);
    await fourth.locator("summary").click();
    const buyFourth = page.getByRole("button", {
      name:
        locale === "en"
          ? /Fund tier IV research/
          : /Financer le développement de palier IV/,
    });
    await expect(buyFourth).toBeEnabled();
    await expect(buyFourth).toContainText(
      locale === "en" ? "Uses 6 Gold bars" : "Utilise 6 Lingots d’or",
    );
    await buyFourth.click();
    await expect(page.locator(".research-card")).toHaveCount(2);
    await expect
      .poll(() =>
        page.evaluate(
          ({ key, id }) =>
            JSON.parse(localStorage.getItem(key)!).game.towns[id].stock
              .goldbars ?? 0,
          { key: SAVE_KEY, id: home.id },
        ),
      )
      .toBe(0);
  });
}

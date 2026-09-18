import { test, expect } from "@playwright/test";
import { maritimeFixture, fishingFixture } from "../tests/maritime-fixture";
import { piece } from "../tests/helpers";
import { colonizationSites } from "../src/game/selectors";
import { serialize, SAVE_KEY } from "../src/game/save";

for (const locale of ["en", "fr"] as const)
  for (const naval of [false, true]) {
    test(`${locale}: ${naval ? "settler ship" : "settlers"} found a town from the map and persist`, async ({
      page,
    }) => {
      const { s } = maritimeFixture();
      const tile = "-3,0";
      if (naval) s.tiles[tile].resource = "water";
      const unit = piece(s, tile, 0, naval ? "settlership" : "settler");
      unit.moved = naval ? 2 : 1;
      const vertex = colonizationSites(s, unit)[0];
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
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
      await expect(
        page.getByTestId(`army-${tile}`).getByTestId("settler-unit-marker"),
      ).toBeVisible();
      await page.getByTestId(`army-${tile}`).press("Enter");
      await page.getByRole("button", { name: "Forces", exact: true }).click();
      // Exhausted units are still selectable manually and may found after moving.
      const group = page.locator(".formation-group-toggle");
      if (await group.count()) await group.first().click();
      const colonize = page.getByRole("button", {
        name: locale === "en" ? "Found settlement" : "Fonder une colonie",
        exact: true,
      });
      if (!(await colonize.count())) {
        await page.locator(".army-composition > summary").click();
        await page.locator(".unit-choice").first().click();
      }
      await page.screenshot({
        path: `test-artifacts/settler-force-${locale}-${naval}-${test.info().project.name}.png`,
      });
      await colonize.click();
      await page.getByTestId(`settlement-target-${vertex}`).press("Enter");
      await expect
        .poll(() =>
          page.evaluate(
            (key) =>
              Object.values(JSON.parse(localStorage.getItem(key)!).game.towns)
                .length,
            SAVE_KEY,
          ),
        )
        .toBe(3);
      expect(
        await page.evaluate(
          ({ key, id }) =>
            JSON.parse(localStorage.getItem(key)!).game.pieces[id],
          { key: SAVE_KEY, id: unit.id },
        ),
      ).toBeUndefined();
      await page.reload();
      await page
        .getByRole("button", {
          name: locale === "en" ? /Continue campaign/ : /Reprendre/,
        })
        .click();
      await expect(page.locator('[data-testid^="town-"]')).toHaveCount(3);
      await page.screenshot({
        path: `test-artifacts/settlers-${locale}-${naval}-${test.info().project.name}.png`,
      });
      expect(errors).toEqual([]);
    });
  }

test("recruit both colonist types at tier I and hide them at higher tiers", async ({
  page,
}) => {
  const { s, home } = fishingFixture();
  await page.addInitScript(
    ({ key, data }) => {
      localStorage.setItem(key, data);
      localStorage.setItem("catane-language", "en");
    },
    { key: SAVE_KEY, data: serialize(s) },
  );
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await page.getByTestId(`town-${home.id}`).press("Enter");
  await page.getByRole("button", { name: "Forces", exact: true }).click();
  for (const naval of [false, true]) {
    await page
      .getByRole("button", { name: naval ? "Navy" : "Army", exact: true })
      .click();
    const kind = naval ? "settlership" : "settler";
    await page
      .getByTestId(`recruit-${kind}`)
      .locator(".recruit-purchase")
      .click();
    await expect
      .poll(() =>
        page.evaluate(
          ({ key, kind }) =>
            Object.values(
              JSON.parse(localStorage.getItem(key)!).game.pieces,
            ).filter((u: any) => u.kind === kind).length,
          { key: SAVE_KEY, kind },
        ),
      )
      .toBe(1);
  }
  await page.getByRole("button", { name: "Tier II", exact: true }).click();
  await expect(page.getByTestId("recruit-settlership")).toHaveCount(0);
  await page.getByRole("button", { name: "Army", exact: true }).click();
  await expect(page.getByTestId("recruit-settler")).toHaveCount(0);
});

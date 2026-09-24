import { test, expect } from "@playwright/test";
import { newGame } from "../src/game/engine";
import { chooseAIAction } from "../src/game/ai";
import { run } from "../tests/helpers";
import { serialize, SAVE_KEY, assertInvariants } from "../src/game/save";
import { ownTowns } from "../src/game/selectors";
import { GOODS } from "../src/game/types";
function campaign() {
  let s = newGame("geo-alpha");
  while (s.phase.startsWith("setup")) s = run(s, chooseAIAction(s));
  s.phase = "economy";
  for (const p of s.players)
    for (const g of GOODS) ownTowns(s, p.id)[0].stock[g] = 200;
  assertInvariants(s);
  return s;
}
for (const locale of ["en", "fr"] as const) {
  test(`${locale}: geography map, overlays, selection and recruitment`, async ({
    page,
  }) => {
    const s = campaign(),
      errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.url().includes("/assets/") && r.status() >= 400)
        errors.push(r.url());
    });
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
        name: locale === "en" ? /Continue campaign/ : /Reprendre la partie/,
      })
      .click();
    await expect(page.locator(".world-map")).toBeVisible();
    const view = page.locator(".map-view-select");
    for (const mode of ["weather", "wildlife", "access"]) {
      await view.selectOption(mode);
      await expect(page.locator(".geography-legend")).toBeVisible();
    }
    await view.selectOption("normal");
    const river = Object.values(s.tiles).find(
      (t) => t.geography?.waterway === "river",
    )!;
    await page.getByTestId(`hex-${river.id}`).press("Enter");
    await expect(page.locator(".geography-panel")).toBeVisible();
    await expect(page.locator(".weather-impact")).toBeVisible();
    await page.screenshot({
      path: `test-artifacts/geography-map-${locale}-${test.info().project.name}.png`,
    });
    const close = page.getByRole("button", {
      name:
        locale === "en" ? "Close action panel" : "Fermer le panneau d'actions",
      exact: true,
    });
    if (await close.isVisible()) await close.click();
    await page.getByTestId(`town-${ownTowns(s)[0].id}`).press("Enter");
    const forces = page.getByRole("button", {
      name: locale === "en" ? "Forces" : "Forces",
      exact: true,
    });
    await forces.click();
    await expect(page.locator(".recruitment-workspace")).toBeVisible();
    await expect(
      page.locator('image[href*="portrait-hunter-1"]'),
    ).toBeVisible();
    await page.screenshot({
      path: `test-artifacts/geography-recruitment-${locale}-${test.info().project.name}.png`,
    });
    await page.getByTestId("recruit-hunter").getByRole("button").click();
    await expect(page.locator('[data-testid^="army-"]')).toHaveCount(1);

    expect(errors).toEqual([]);
  });
  test(`${locale}: illustrated geography rules assets and regional calendars`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.url().includes("/assets/") && r.status() >= 400)
        errors.push(r.url());
    });
    await page.goto(
      `${locale === "en" ? "/rules.html" : "/rules-fr.html"}#geography`,
    );
    await expect(page.locator(".geography-reference")).toBeVisible();
    for (const climate of ["cold", "tropical", "mediterranean"])
      await page.locator(".geography-reference select").selectOption(climate);
    await page
      .locator(".geography-reference .climate-tabs button")
      .last()
      .click();
    const images = await page
      .locator(".geography-reference img")
      .evaluateAll(async (els) =>
        Promise.all(
          els.map(async (e) => {
            await (e as HTMLImageElement).decode();
            return (e as HTMLImageElement).naturalWidth;
          }),
        ),
      );
    expect(images.every((n) => n > 100)).toBe(true);
    expect(images.length).toBe(17);
    await page.screenshot({
      path: `test-artifacts/geography-guide-${locale}-${test.info().project.name}.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
}

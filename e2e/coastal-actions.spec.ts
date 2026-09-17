import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { coastalFixture, frontierUnitFixture } from "../tests/coastal-fixture";
import { serialize, SAVE_KEY } from "../src/game/save";
import type { Game } from "../src/game/types";
import type { Page } from "@playwright/test";
async function open(page: Page, s: Game) {
  await page.addInitScript(
    ({ key, data }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, data);
    },
    { key: SAVE_KEY, data: serialize(s) },
  );
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await page
    .getByRole("button", { name: "Fit entire map", exact: true })
    .click();
}
async function saved(page: Page): Promise<Game> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).game,
    SAVE_KEY,
  );
}
for (const sea of [false, true])
  test(`launch a ${sea ? "sea" : "land"} expedition from a border force and retain it after reload`, async ({
    page,
  }) => {
    const { s, tile, unit } = frontierUnitFixture(sea);
    await open(page, s);
    await page.getByTestId(`army-${tile.id}`).click();
    await page.getByRole("button", { name: "Explore", exact: true }).click();
    const launch = page.getByLabel("Launch point");
    await expect(launch.locator("option:checked")).toContainText(
      `${sea ? "Fleet" : "Army"} at ${tile.id}`,
    );
    await page
      .getByRole("button", { name: "Preview expedition footprint" })
      .click();
    await expect(
      page.getByRole("button", { name: /^Launch expedition/ }),
    ).toBeEnabled();
    await page.getByRole("button", { name: /^Launch expedition/ }).click();
    await expect
      .poll(async () => Object.keys((await saved(page)).tiles).length)
      .toBe(110);
    expect((await saved(page)).pieces[unit.id]).toEqual(unit);
    await page.reload();
    await page.getByRole("button", { name: /Continue campaign/ }).click();
    await expect(page.locator('[data-testid^="hex-"]')).toHaveCount(110);
  });
test("preview and sink an unarmed lake ship with artillery", async ({
  page,
}) => {
  const { s, gun, ship, shore, water } = coastalFixture();
  ship.kind = "fishing";
  await open(page, s);
  await page.getByTestId(`army-${shore}`).click();
  await page.getByRole("button", { name: "Select all ready units" }).click();
  await page
    .getByRole("button", { name: new RegExp(`Bombard fleet at ${water}`) })
    .click();
  const dialog = page.getByRole("dialog", { name: "Review shore bombardment" });
  await expect(dialog).toContainText("Ships retaliate");
  // Contrast is checked after the modal fade, as in the research-card audit.
  await page.locator(".modal-backdrop").evaluate(async (element) => {
    await Promise.all(
      element
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished.catch(() => {})),
    );
  });
  expect(
    (await new AxeBuilder({ page }).include('[role="dialog"]').analyze())
      .violations,
  ).toEqual([]);
  await dialog
    .getByRole("button", { name: "Bombard fleet", exact: true })
    .click();
  await expect
    .poll(async () => !!(await saved(page)).pieces[ship.id])
    .toBe(false);
  expect((await saved(page)).pieces[gun.id]).toMatchObject({
    tile: shore,
    acted: false,
  });
  await expect(
    page.getByRole("button", { name: /Bombard fleet at/ }),
  ).toHaveCount(0);
});
test("fleet retaliation uses the human artillery casualty dialog", async ({
  page,
}) => {
  const { s, gun, ship, shore } = coastalFixture();
  gun.tier = 1;
  ship.kind = "carrack";
  await open(page, s);
  await page.getByTestId(`army-${shore}`).click();
  await page.getByRole("button", { name: "Select all ready units" }).click();
  await page.getByRole("button", { name: /Bombard fleet at/ }).click();
  await page
    .getByRole("button", { name: "Bombard fleet", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Resolve shore bombardment",
  });
  await expect(dialog).toContainText("Artillery stays on land");
  await expect(dialog.locator(".unit-choice")).toHaveCount(1);
  await page.reload();
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /Confirm casualties/ }).click();
  await expect
    .poll(async () => !!(await saved(page)).pieces[gun.id])
    .toBe(false);
  expect((await saved(page)).pieces[ship.id]).toBeTruthy();
});

test("Ultra Fast pacing is selectable and persists across reloads", async ({
  page,
}) => {
  await open(page, coastalFixture().s);
  await page.getByRole("button", { name: "Game settings and saves" }).click();
  await page.getByLabel("AI pacing").selectOption("20");
  await expect(page.getByLabel("AI pacing")).toHaveValue("20");
  await expect(page.getByRole("dialog")).toContainText("ULTRA FAST");
  await page.reload();
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await page.getByRole("button", { name: "Game settings and saves" }).click();
  await expect(page.getByLabel("AI pacing")).toHaveValue("20");
});

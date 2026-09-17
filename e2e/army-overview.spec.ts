import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { maritimeFixture } from "../tests/maritime-fixture";
import { piece } from "../tests/helpers";
import { serialize, SAVE_KEY } from "../src/game/save";
import { speed, unitName } from "../src/game/selectors";
import type { Game } from "../src/game/types";
async function open(page: Page, s: Game) {
  await page.addInitScript(({ key, data }) => localStorage.setItem(key, data), {
    key: SAVE_KEY,
    data: serialize(s),
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await page
    .getByRole("button", { name: "Fit entire map", exact: true })
    .click();
}
test("friendly composition is immediately grouped, supports bulk selection and distinguishes tiers", async ({
  page,
}, info) => {
  const { s } = maritimeFixture();
  for (let i = 0; i < 12; i++) piece(s, "2,0", 0, "heavy", 1);
  for (let i = 0; i < 3; i++) piece(s, "2,0", 0, "heavy", 3);
  piece(s, "2,0", 0, "merchant", 4);
  piece(s, "2,0", 0, "cavalry", 2);
  piece(s, "2,0", 0, "cavalry", 2);
  await open(page, s);
  await page.getByTestId("army-2,0").click();
  const overview = page.getByTestId("army-overview");
  await expect(overview).toBeVisible();
  await expect(overview.locator(".formation-group")).toHaveCount(4);
  await expect(overview).toContainText("×12");
  await expect(overview).toContainText("Tier III");
  await expect(overview).toContainText("Economy");
  await expect(overview.locator(".formation-stats")).toContainText(
    "29 power here",
  );
  await page.getByRole("button", { name: "Select half", exact: true }).click();
  await expect(
    overview.locator(".formation-group").filter({ hasText: "Hillguard" }),
  ).toContainText("6 selected");
  await expect(page.locator(".army-composition summary")).toContainText(
    "9 selected",
  );
  await page
    .getByRole("button", { name: "Select all ready units", exact: true })
    .click();
  const group = overview.getByRole("button", { name: /Hillguard group/ });
  await group.click();
  await expect(group).toHaveAttribute("aria-pressed", "false");
  await expect(group).toContainText("0 selected");
  await group.click();
  await expect(group).toHaveAttribute("aria-pressed", "true");
  expect(
    (
      await new AxeBuilder({ page })
        .include('[data-testid="army-overview"]')
        .analyze()
    ).violations,
  ).toEqual([]);
  await overview.screenshot({
    path: `test-artifacts/army-overview-${info.project.name}.png`,
  });
});
test("enemy composition and transported troops are visible without opening any disclosure", async ({
  page,
}) => {
  const { s } = maritimeFixture();
  s.tiles["2,0"].resource = "water";
  const ship = piece(s, "2,0", 1, "convoy", 2);
  piece(s, "2,0", 1, "merchantship", 3);
  for (let i = 0; i < 3; i++) {
    const u = piece(s, "2,0", 1, "heavy", 3);
    u.carrier = ship.id;
  }
  await open(page, s);
  await page.getByTestId("army-2,0").click();
  const overview = page.getByTestId("army-overview");
  await expect(overview).toContainText("Enemy fleet");
  await expect(overview.getByTestId("enemy-unit-group")).toHaveCount(2);
  await expect(overview.getByRole("button")).toHaveCount(0);
  await expect(overview.getByLabel("Embarked troops")).toContainText(
    "Iron Sentinel",
  );
  await expect(overview.getByLabel("Embarked troops")).toContainText("×3");
  await expect(overview.locator(".formation-stats")).toContainText(
    "3/4 passengers",
  );
  await expect(overview.locator(".formation-stats")).toContainText(
    "4 power here",
  );
});
test("switching armies resets scroll to the composition and keeps spent units out of bulk selection", async ({
  page,
}) => {
  const { s } = maritimeFixture();
  const fresh = piece(s, "2,0", 0, "heavy", 1),
    spent = piece(s, "2,0", 0, "heavy", 1);
  spent.acted = true;
  piece(s, "-2,0", 1, "light", 4);
  await open(page, s);
  await page.getByTestId("army-2,0").click();
  const overview = page.getByTestId("army-overview");
  await expect(overview).toContainText("1 selected · 1 ready");
  const button = overview.getByRole("button", { name: /Hillguard group/ });
  await button.click();
  await button.click();
  await expect(overview).toContainText("1 selected · 1 ready");
  await page.locator(".panel-content").evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await page.getByTestId("army--2,0").press("Enter");
  await expect(overview).toContainText("Veil Warden");
  await expect
    .poll(() => page.locator(".panel-content").evaluate((el) => el.scrollTop))
    .toBe(0);
  expect(fresh.id).not.toBe(spent.id);
});
test("Stone Curtain can be built with three Stone and no processed goods", async ({
  page,
}) => {
  const { s, home } = maritimeFixture();
  home.level = home.turnLevel = 2;
  home.wall = 1;
  home.stock = { stone: 3 };
  await open(page, s);
  await page.getByTestId(`town-${home.id}`).click();
  const build = page.getByRole("button", { name: /Build Stone Curtain/ });
  await expect(build).toBeEnabled();
  await build.click();
  await expect(page.locator(".panel-intro")).toContainText("Stone Curtain");
  const game = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).game,
    SAVE_KEY,
  );
  expect(game.towns[home.id].stock).toEqual({});
});

for (const naval of [false, true]) {
  test(`${naval ? "fleets" : "armies"} can deselect exhausted groups and extract units with movement left`, async ({
    page,
  }) => {
    const { s } = maritimeFixture();
    const origin = "2,0",
      destination = "2,-1";
    if (naval) {
      s.tiles[origin].resource = "water";
      s.tiles[destination].resource = "water";
    }
    const exhausted = piece(s, origin, 0, naval ? "galley" : "heavy", 1);
    const mobile = piece(s, origin, 0, naval ? "convoy" : "light", 1);
    const mixedExhausted = piece(s, origin, 0, mobile.kind, 1);
    exhausted.moved = speed(exhausted);
    mobile.moved = speed(mobile) - 1;
    mixedExhausted.moved = speed(mixedExhausted);
    await open(page, s);
    await page.getByTestId(`army-${origin}`).click();
    const overview = page.getByTestId("army-overview");
    await expect(page.locator(".army-composition summary")).toContainText(
      "1 selected",
    );
    await page.locator(".army-composition summary").click();
    const checks = page.locator(".army-composition .unit-choice input");
    // An exhausted unit can still be selected individually for inspection or supply.
    await checks.nth(0).check();
    const exhaustedGroup = overview
      .locator(".formation-group")
      .filter({ hasText: unitName(exhausted) });
    await expect(exhaustedGroup).toContainText("1 selected · 0 ready");
    await expect(exhaustedGroup).toBeEnabled();
    await exhaustedGroup.click();
    await expect(checks.nth(0)).not.toBeChecked();
    await expect(checks.nth(1)).toBeChecked();
    // Same-class stacks must also clear exhausted members when toggled.
    await checks.nth(2).check();
    const mixedGroup = overview
      .locator(".formation-group")
      .filter({ hasText: unitName(mobile) });
    await mixedGroup.click();
    await expect(checks.nth(1)).not.toBeChecked();
    await expect(checks.nth(2)).not.toBeChecked();
    await mixedGroup.click();
    await expect(checks.nth(1)).toBeChecked();
    await expect(checks.nth(2)).not.toBeChecked();
    await checks.nth(0).check();
    await page
      .getByRole("button", { name: "Select all ready units", exact: true })
      .click();
    await expect(checks.nth(0)).not.toBeChecked();
    await expect(checks.nth(1)).toBeChecked();
    await page
      .getByRole("button", { name: "Move / attack with selected", exact: true })
      .click();
    await page.getByTestId(`hex-${destination}`).click();
    await expect
      .poll(() =>
        page.evaluate(
          ({ key, id }) =>
            JSON.parse(localStorage.getItem(key)!).game.pieces[id].tile,
          { key: SAVE_KEY, id: mobile.id },
        ),
      )
      .toBe(destination);
    const saved = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).game,
      SAVE_KEY,
    );
    expect(saved.pieces[exhausted.id].tile).toBe(origin);
    expect(saved.pieces[mixedExhausted.id].tile).toBe(origin);
    expect(saved.pieces[mobile.id].moved).toBe(speed(mobile));
  });
}

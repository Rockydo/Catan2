import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { fishingFixture } from "../tests/maritime-fixture";
import { piece } from "../tests/helpers";
import { serialize, SAVE_KEY } from "../src/game/save";
import { inventory } from "../src/game/selectors";
import { shipCost, unitCost } from "../src/game/content";
import type { Game } from "../src/game/types";
async function open(page: Page, s: Game) {
  await page.addInitScript(
    ({ key, data }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, data);
    },
    { key: SAVE_KEY, data: serialize(s) },
  );
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
}
async function state(page: Page): Promise<Game> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).game,
    SAVE_KEY,
  );
}

test("map-first workspace, dismissible drawers and keyboard shortcuts", async ({
  page,
}) => {
  await open(page, fishingFixture().s);
  const ratio = await page
    .locator(".board-frame")
    .evaluate(
      (e) => (e.clientWidth * e.clientHeight) / (innerWidth * innerHeight),
    );
  expect(ratio).toBeGreaterThan(0.75);
  await expect(page.locator(".turn-footer")).toHaveCount(0);
  await expect(page.getByText("Your ambition", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "End turn", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Realms & chronicle", exact: true })
    .click();
  await expect(
    page.getByRole("complementary", { name: "Realms and chronicle" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Close realms and chronicle" })
    .click();
  await page.keyboard.press("f");
  await expect(
    page.getByRole("region", { name: "Recruitment", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Recruitment quantity").focus();
  await page.keyboard.press("t");
  await expect(
    page.getByRole("region", { name: "Recruitment", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Forces", exact: true }).focus();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("complementary", { name: "Action inspector" }),
  ).toBeHidden();
  await page.keyboard.press("t");
  await expect(page.getByLabel("Give goods")).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  expect(overflow).toBe(false);
});

test("one naval catalogue supports atomic bulk launch and remembers tier", async ({
  page,
}) => {
  const { s, water } = fishingFixture();
  await open(page, s);
  await page.getByRole("button", { name: "Forces", exact: true }).click();
  await page.getByRole("button", { name: "Navy", exact: true }).click();
  await page.getByRole("button", { name: "Tier II", exact: true }).click();
  await page.getByLabel("Naval deployment").selectOption(water);
  await expect(page.locator(".compact-recruit")).toHaveCount(8);
  await page.getByLabel("Recruitment quantity").fill("5");
  const before = inventory(s);
  await page
    .getByRole("button", { name: "Launch 5 Fishing Cutter", exact: true })
    .click();
  const after = await state(page);
  expect(Object.values(after.pieces)).toHaveLength(5);
  expect(
    Object.values(after.pieces).every(
      (u) => u.kind === "fishing" && u.tier === 2 && u.tile === water,
    ),
  ).toBe(true);
  for (const [g, n] of Object.entries(shipCost("fishing", 2)))
    expect(inventory(after)[g as keyof typeof before]).toBe(
      before[g as keyof typeof before]! - 5 * n!,
    );
  await expect(
    page.getByRole("button", { name: "Launch 5 Fishing Cutter", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Trade", exact: true }).click();
  await page.getByRole("button", { name: "Forces", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Navy", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Tier II", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("army batch recruitment pays the total order once", async ({ page }) => {
  const { s } = fishingFixture();
  await open(page, s);
  await page.getByRole("button", { name: "Forces", exact: true }).click();
  await page.getByLabel("Recruitment quantity").fill("5");
  await page
    .getByRole("button", { name: "Recruit 5 Hillguard", exact: true })
    .click();
  const after = await state(page),
    before = inventory(s);
  expect(Object.values(after.pieces)).toHaveLength(5);
  for (const [g, n] of Object.entries(unitCost("heavy", 1)))
    expect(inventory(after)[g as keyof typeof before]).toBe(
      before[g as keyof typeof before]! - 5 * n!,
    );
});

test("eight naval purchase controls remain reachable on a 720px desktop and pass accessibility checks", async ({
  page,
}, info) => {
  if (info.project.name !== "mobile")
    await page.setViewportSize({ width: 1280, height: 720 });
  await open(page, fishingFixture().s);
  await page.getByRole("button", { name: "Forces", exact: true }).click();
  await page.getByRole("button", { name: "Navy", exact: true }).click();
  await page.getByRole("button", { name: "Tier II", exact: true }).click();
  const bounds = await page.locator(".recruit-purchase").evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      const pane = el.closest(".panel-content")!.getBoundingClientRect();
      return r.top >= pane.top && r.bottom <= pane.bottom;
    }),
  );
  expect(bounds).toEqual(Array(8).fill(true));
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    audit.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
});

test("enemy army composition remains inspectable", async ({ page }) => {
  const { s } = fishingFixture();
  piece(s, "2,0", 1, "heavy", 3);
  await open(page, s);
  await page.getByTestId("army-2,0").click();
  await page.getByRole("button", { name: "Forces", exact: true }).click();
  await page.locator(".army-composition > summary").click();
  await expect(page.locator(".unit-choice")).toHaveCount(1);
  await expect(page.locator(".unit-choice input")).toBeDisabled();
  await expect(page.locator(".unit-choice")).toContainText("3 power");
});

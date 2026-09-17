import { applyCommand } from "../src/game/engine";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { fishingFixture } from "../tests/maritime-fixture";
import { serialize, SAVE_KEY } from "../src/game/save";
import { inventory } from "../src/game/selectors";
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
async function panel(page: Page, name: string) {
  const button = page.getByRole("button", { name: "Actions & realm" });
  if (
    (await button.isVisible()) &&
    !(await page
      .locator(".right-panel")
      .evaluate((e) => e.classList.contains("mobile-open")))
  )
    await button.click();
  await page.getByRole("button", { name, exact: true }).click();
}
async function closePanel(page: Page) {
  const close = page.getByRole("button", { name: "Close action panel" });
  if (await close.isVisible()) await close.click();
}
async function state(page: Page): Promise<Game> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).game,
    SAVE_KEY,
  );
}
test("four research tiers preview their rewards and a two-card discovery persists", async ({
  page,
}) => {
  const { s } = fishingFixture();
  // Choose a reproducible random state whose real draw includes this reward.
  while (
    !applyCommand(s, {
      type: "buy-research",
      tier: 4,
    }).state.researchChoice?.some((c) => c.kind === "grand")
  )
    s.deckRng++;

  await open(page, s);
  await panel(page, "Research");
  await expect(page.locator(".research-tier")).toHaveCount(4);
  const fourth = page.locator(".research-tier").nth(3);
  await fourth.locator("summary").click();
  await expect(fourth).toContainText("nine processed goods");
  await expect(fourth.locator(".research-preview p")).toHaveCount(8);
  await expect(page.getByText("Public discards", { exact: true })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: /Fund tier IV research/ }).click();
  await expect(page.locator(".research-card")).toHaveCount(2);
  await expect(page.locator(".research-card .research-emblem")).toHaveCount(2);
  const offered = (await state(page)).researchChoice;
  expect(new Set(offered!.map((c) => c.kind)).size).toBe(2);
  await page.reload();
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  expect((await state(page)).researchChoice).toEqual(offered);
  // Audit settled colors rather than an intermediate frame of the modal fade.
  await page.locator(".modal-backdrop").evaluate(async (element) => {
    await Promise.all(
      element
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished.catch(() => {})),
    );
  });
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    audit.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    ),
  ).toEqual([]);
  await page.screenshot({
    path: `test-artifacts/research-four-choice-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page
    .locator(".research-card")
    .filter({
      has: page.getByRole("heading", { name: "Grand Exchange", exact: true }),
    })
    .click();
  expect((await state(page)).players[0].hand).toMatchObject([
    { kind: "grand", tier: 4 },
  ]);
  await panel(page, "Research");
  await expect(
    page.getByRole("button", { name: "Play card", exact: true }),
  ).toBeEnabled();
  await page.reload();
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  expect((await state(page)).players[0].hand[0].kind).toBe("grand");
  const before = inventory(await state(page));
  await panel(page, "Research");
  await page.getByRole("button", { name: "Play card", exact: true }).click();
  await page.getByLabel("Steel quantity").fill("9");
  await page
    .getByRole("button", { name: "Play research", exact: true })
    .click();
  expect(inventory(await state(page)).steel).toBe(before.steel! + 9);
  expect((await state(page)).players[0].hand).toHaveLength(0);
});
test("a tier-IV exchange grants nine chosen processed goods in the real interface", async ({
  page,
}) => {
  const { s } = fishingFixture();
  s.players[0].hand = [{ id: "c-grand", kind: "grand", tier: 4, bought: 0 }];
  const before = inventory(s);
  await open(page, s);
  await panel(page, "Research");
  await page.getByRole("button", { name: "Play card", exact: true }).click();
  await page.getByLabel("Steel quantity").fill("9");
  await page
    .getByRole("button", { name: "Play research", exact: true })
    .click();
  expect(inventory(await state(page)).steel).toBe(before.steel! + 9);
});
test("a tier-II commission launches a free merchant ship with the correct portrait and price", async ({
  page,
}) => {
  const { s, home, water } = fishingFixture();
  s.players[0].hand = [{ id: "c-patrol", kind: "patrol", tier: 2, bought: 0 }];
  const before = inventory(s);
  await open(page, s);
  await panel(page, "Research");
  await page.getByRole("button", { name: "Play card", exact: true }).click();
  await page
    .getByRole("button", { name: "Play research", exact: true })
    .click();
  await expect(page.getByLabel("Active research rewards")).toContainText(
    "free tier II ship",
  );
  await closePanel(page);
  await page.getByTestId(`town-${home.id}`).click();
  await panel(page, "Forces");
  await page.getByRole("button", { name: "Tier II", exact: true }).click();
  await page.getByRole("button", { name: "Navy", exact: true }).click();
  await page.getByLabel("Naval deployment").selectOption(water);
  const button = page.getByRole("button", { name: /Merchant Cog/ });
  await expect(button).toContainText("Free");
  await button.click();
  const n = await state(page);
  expect(Object.values(n.pieces)).toMatchObject([
    { kind: "merchantship", tier: 2 },
  ]);
  expect(inventory(n)).toEqual(before);
});

test("Mass Mobilization redeems four free recruits through batch recruitment and survives saving", async ({
  page,
}) => {
  const { s } = fishingFixture();
  s.players[0].hand = [
    { id: `c${s.nextId++}`, kind: "mobilization", tier: 4, bought: 0 },
  ];
  await open(page, s);
  await panel(page, "Research");
  await page.getByRole("button", { name: "Play card", exact: true }).click();
  await page
    .getByRole("button", { name: "Play research", exact: true })
    .click();
  const before = inventory(await state(page));
  await panel(page, "Forces");
  await page.getByRole("button", { name: "Tier II", exact: true }).click();
  await page.getByLabel("Recruitment quantity").fill("4");
  await page
    .getByRole("button", { name: "Recruit 4 Spearguard", exact: true })
    .click();
  const after = await state(page);
  expect(Object.values(after.pieces)).toHaveLength(4);
  expect(inventory(after)).toEqual(before);
  expect(after.players[0].bonuses.recruits).toHaveLength(0);
  await page.reload();
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  expect(Object.values((await state(page)).pieces)).toHaveLength(4);
});

test("movement research shows exhausted movement, adds three points, and lets the army move again", async ({
  page,
}) => {
  const { maritimeFixture } = await import("../tests/maritime-fixture");
  const { piece } = await import("../tests/helpers");
  const { s } = maritimeFixture();
  const u = piece(s, "0,0");
  u.moved = 1;
  s.players[0].hand = [
    { id: `c${s.nextId++}`, kind: "march", tier: 1, bought: 0 },
  ];
  await open(page, s);
  await panel(page, "Research");
  await page.getByRole("button", { name: "Play card", exact: true }).click();
  const row = page.getByRole("dialog").locator(".unit-choice");
  await expect(row).toContainText("0 → 3 movement remaining");
  await row.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Play research", exact: true })
    .click();
  expect((await state(page)).pieces[u.id]).toMatchObject({
    moved: 1,
    bonus: 3,
  });
  await page.reload();
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await closePanel(page);
  await page.getByTestId("army-0,0").click();
  await page
    .getByRole("button", { name: "Move / attack with selected", exact: true })
    .click();
  await closePanel(page);
  await page.getByTestId("hex-1,0").click();
  expect((await state(page)).pieces[u.id]).toMatchObject({
    tile: "1,0",
    moved: 2,
    bonus: 3,
  });
});

test("buys and plays multiple research cards in one turn and remains unlimited after reload", async ({
  page,
}) => {
  const { s } = fishingFixture();
  s.players[0].hand = [0, 1].map(() => ({
    id: `c${s.nextId++}`,
    kind: "palisade",
    tier: 1,
    bought: 0,
  }));
  await open(page, s);
  await panel(page, "Research");
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: /^Fund tier I research/ }).click();
    await expect(page.locator(".research-card")).toHaveCount(2);
    await page.locator(".research-card").first().click();
    expect((await state(page)).players[0].hand).toHaveLength(3 + i);
    await panel(page, "Research");
  }
  await expect(page.locator(".hand-card button:enabled")).toHaveCount(5);
  const before = inventory(await state(page));
  for (let i = 0; i < 2; i++) {
    await page.locator(".hand-card button:enabled").first().click();
    await page
      .getByRole("button", { name: "Play research", exact: true })
      .click();
    await panel(page, "Research");
  }
  expect(inventory(await state(page)).lumber).toBe(before.lumber! + 4);
  await expect(page.locator(".hand-card button:enabled")).toHaveCount(3);
  await expect(page.locator(".hand-card button:disabled")).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await panel(page, "Research");
  await page.getByRole("button", { name: /^Fund tier I research/ }).click();
  await page.locator(".research-card").first().click();
  expect((await state(page)).players[0].hand).toHaveLength(4);
});

import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { harvestFixture } from "../tests/roll-fixture";
import { run } from "../tests/helpers";
import { serialize, SAVE_KEY } from "../src/game/save";
import { GOODS, type Game } from "../src/game/types";
import { GOOD_INFO } from "../src/game/content";
import { ownTowns, inventory } from "../src/game/selectors";
async function saved(page: Page, s: Game) {
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

test("dice appear immediately with exact four-realm deliveries and replay never produces twice", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const s = harvestFixture(),
    expected = run(s, { type: "roll" });
  await saved(page, s);
  await page.getByRole("button", { name: "Roll dice", exact: true }).click();
  const report = page.getByRole("region", { name: "Dice roll and production" });
  expect(await report.getAttribute("class")).toContain("is-revealed");
  await expect(
    page.getByRole("button", { name: "Skip animation" }),
  ).toHaveCount(0);
  expect(
    await report.evaluate((el) =>
      [el, ...el.querySelectorAll(".die-rotor, .roll-result")].every(
        (node) => getComputedStyle(node).animationName === "none",
      ),
    ),
  ).toBe(true);
  await expect(
    page.getByRole("button", { name: "End turn", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Keep open" }).click();
  await expect(report).toContainText(
    `rolled ${expected.dice![0] + expected.dice![1]}`,
  );
  for (const player of s.players) {
    const row = page.getByTestId(`roll-player-${player.id}`),
      goods = expected.production[player.id];
    await expect(row).toContainText(player.name);
    await expect(row.locator("[data-good]")).toHaveCount(
      GOODS.filter((g) => goods[g]).length,
    );
    for (const g of GOODS.filter((g) => goods[g]))
      await expect(row.locator(`[data-good="${g}"]`)).toHaveAttribute(
        "aria-label",
        `${GOOD_INFO[g].name}: +${goods[g]}`,
      );
  }
  await expect(page.getByTestId("roll-player-3")).toContainText(
    "No production this roll",
  );
  expect((await state(page)).production).toEqual(expected.production);
  const afterRoll = await state(page);
  await page.getByRole("button", { name: "Close roll report" }).click();
  await page.getByRole("button", { name: "View last roll" }).click();
  await expect(report).toContainText("Report held open");
  expect(await state(page)).toEqual(afterRoll);
  await page.getByRole("button", { name: "Close roll report" }).click();
  await page.reload();
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await expect(report).toHaveCount(0);
  await page.getByRole("button", { name: "View last roll" }).click();
  await expect(report).toContainText("Saved roll");
  expect((await state(page)).production).toEqual(expected.production);
});

test("abundant harvest report remains accessible with visible controls on narrow screens", async ({
  page,
}) => {
  await saved(page, harvestFixture());
  await page.getByRole("button", { name: "Roll dice", exact: true }).click();
  await page.getByRole("button", { name: "Keep open" }).click();
  const report = page.getByRole("region", { name: "Dice roll and production" });
  const close = page.getByRole("button", { name: "Close roll report" }),
    receipts = page.getByRole("group", {
      name: "Resource receipts for all 4 realms",
    });
  await expect(close).toBeInViewport();
  await receipts.focus();
  await receipts.press("End");
  await expect(page.getByTestId("roll-player-3")).toBeInViewport();
  await expect(close).toBeInViewport();
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    audit.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  expect(
    await page.evaluate(() => document.body.scrollWidth),
  ).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
  await page.screenshot({
    path: `test-artifacts/roll/${test.info().project.name}-verified.png`,
    animations: "disabled",
  });
  await receipts.press("Escape");
  await expect(report).toHaveCount(0);
});

test("repeated identical dice show separate immediate reports with either motion preference", async ({
  page,
}) => {
  const first = harvestFixture();
  await saved(page, first);
  await page.getByRole("button", { name: "Roll dice", exact: true }).click();
  const report = page.getByRole("region", { name: "Dice roll and production" });
  const id = await report.getAttribute("data-roll-id");
  const rolled = await state(page),
    next = structuredClone(rolled);
  next.phase = "roll";
  next.dice = null;
  next.rng = first.rng;
  next.round++;
  await page.locator("input[type=file]").setInputFiles({
    name: "next-round.json",
    mimeType: "application/json",
    buffer: Buffer.from(serialize(next)),
  });
  await page.getByRole("button", { name: "Roll dice", exact: true }).click();
  await expect(report).toHaveClass(/is-revealed/);
  await expect(report).not.toHaveAttribute("data-roll-id", id!);
  expect((await state(page)).dice).toEqual(rolled.dice);
  await page.getByRole("button", { name: "Close roll report" }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  next.actions += 2;
  await page.locator("input[type=file]").setInputFiles({
    name: "motion.json",
    mimeType: "application/json",
    buffer: Buffer.from(serialize(next)),
  });
  await page.getByRole("button", { name: "Roll dice", exact: true }).click();
  await expect(report).toHaveClass(/is-revealed/);
  await expect(
    page.getByRole("button", { name: "Skip animation" }),
  ).toHaveCount(0);
  expect(inventory(await state(page), 0)).toEqual(
    inventory(run(next, { type: "roll" }), 0),
  );
});

test("AI pauses for its harvest report and continues after it closes", async ({
  page,
}) => {
  const s = harvestFixture();
  s.active = 1;
  s.players[1].turns = 1;
  await saved(page, s);
  const report = page.getByRole("region", { name: "Dice roll and production" });
  await expect(report).toContainText("Tidewatch");
  await page.getByRole("button", { name: "Keep open" }).click();
  const actions = (await state(page)).actions;
  await page.waitForTimeout(700);
  expect((await state(page)).actions).toBe(actions);
  await page.getByRole("button", { name: "Close roll report" }).click();
  await expect
    .poll(async () => (await state(page)).actions)
    .toBeGreaterThan(actions);
});

for (const automatic of [false, true]) {
  test(`${automatic ? "AI" : "human"} harvest report expires at the shorter duration`, async ({
    page,
  }) => {
    await page.clock.install();
    const s = harvestFixture();
    if (automatic) {
      s.active = 1;
      s.players[1].turns = 1;
    }
    await saved(page, s);
    if (!automatic)
      await page
        .getByRole("button", { name: "Roll dice", exact: true })
        .click();
    const report = page.getByRole("region", {
      name: "Dice roll and production",
    });
    await expect(report).toBeVisible();
    const id = await report.getAttribute("data-roll-id");
    const duration = automatic ? 1800 : 3000;
    await expect(report.locator(".harvest-countdown")).toHaveAttribute(
      "style",
      `--duration: ${duration}ms;`,
    );
    await page.clock.runFor(duration);
    await expect(page.locator(`[data-roll-id="${id}"]`)).toHaveCount(0);
  });
}

import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { funded, piece, run } from "../tests/helpers";
import { ownTowns, inventory } from "../src/game/selectors";
import { landAtVertex } from "../src/game/world";
import { serialize, SAVE_KEY } from "../src/game/save";
import { GOODS, type Game, type Raw, type UnitClass } from "../src/game/types";
import {
  GOOD_INFO,
  UNIT_INFO,
  processedFor,
  extensionName,
  CARDS,
} from "../src/game/content";
async function saved(page: Page, s: Game) {
  await page.addInitScript(({ key, data }) => localStorage.setItem(key, data), {
    key: SAVE_KEY,
    data: serialize(s),
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
}
async function panel(page: Page, name: string) {
  if (
    (await page.getByRole("button", { name: "Actions & realm" }).isVisible()) &&
    !(await page
      .locator(".right-panel")
      .evaluate((e) => e.classList.contains("mobile-open")))
  )
    await page.getByRole("button", { name: "Actions & realm" }).click();
  await page.getByRole("button", { name, exact: true }).click();
}

test("rival extensions and research counts are inspectable without revealing private cards", async ({
  page,
}) => {
  let s = funded();
  s.active = 1;
  ownTowns(s, 1)[0].level = ownTowns(s, 1)[0].turnLevel = 3;
  s = run(s, { type: "buy-research", tier: 2 });
  s = run(s, { type: "choose-research", index: 0 });
  s.active = 0;
  const enemy = ownTowns(s, 1)[0],
    tile = landAtVertex(s, enemy.vertex)[0];
  enemy.level = enemy.turnLevel = 3;
  enemy.extensions[tile] = 2;
  const raw = s.tiles[tile].resource as Raw,
    secret = CARDS[s.players[1].hand[0].kind].name;
  await saved(page, s);
  await page.getByTestId(`town-${enemy.id}`).click();
  await panel(page, "Build");
  const extensions = page.getByTestId("city-extensions");
  await expect(extensions.locator(".industry-row")).toHaveCount(1);
  await expect(extensions).toContainText(extensionName(raw));
  await expect(extensions).toContainText(`roll ${s.tiles[tile].number}`);
  await expect(extensions).toContainText("Tier II · +2 per roll");
  await expect(extensions.locator("button")).toHaveCount(0);
  await expect(
    page.locator(".public-research-note").filter({ hasText: "holds" }),
  ).toContainText("holds 1 research cards");
  await panel(page, "Research");
  await expect(page.getByTestId("research-count-1")).toContainText("Tidewatch");
  await expect(page.getByTestId("research-count-1").locator("b")).toHaveText(
    "1",
  );
  await expect(page.locator(".hand-card")).toHaveCount(0);
  await expect(page.locator(".research-intelligence")).not.toContainText(
    secret,
  );
  await page.screenshot({
    path: `test-artifacts/military/${test.info().project.name}-intelligence.png`,
  });
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

test("bank give list sorts by current holdings, preserves ties and selected goods after trading", async ({
  page,
}) => {
  const s = funded();
  for (const t of ownTowns(s)) t.stock = {};
  ownTowns(s)[0].stock = {
    ore: 31,
    grain: 30,
    lumber: 12,
    brick: 12,
    steel: 9,
  };
  await saved(page, s);
  await panel(page, "Trade");
  const give = page.getByRole("combobox", { name: "Give goods" });
  const sorted = [...GOODS].sort(
    (a, b) => (inventory(s)[b] ?? 0) - (inventory(s)[a] ?? 0),
  );
  expect(
    await give
      .locator("option")
      .evaluateAll((es) => es.map((e) => (e as HTMLOptionElement).value)),
  ).toEqual(sorted);
  await expect(give).toHaveValue("ore");
  await page
    .getByRole("combobox", { name: "Receive goods" })
    .selectOption("wool");
  await page
    .getByRole("button", { name: /Exchange \d+ Iron ore for 1 Wool/ })
    .click();
  await expect(give).toHaveValue("ore");
  await expect(give.locator("option").first()).toHaveAttribute(
    "value",
    "grain",
  );
  await give.selectOption("steel");
  await expect(give).toHaveValue("steel");
  expect(
    await page
      .getByRole("combobox", { name: "Receive goods" })
      .locator("option")
      .evaluateAll((es) => es.map((e) => (e as HTMLOptionElement).value)),
  ).toEqual([...GOODS]);
});

test("all twenty land-unit portraits show class and rank and mixed army counters accept clicks", async ({
  page,
}) => {
  const s = funded(),
    town = ownTowns(s)[0];
  town.level = town.turnLevel = 4;
  const tile = landAtVertex(s, town.vertex)[0];
  for (const kind of Object.keys(UNIT_INFO) as UnitClass[])
    for (const tier of [1, 2, 3, 4]) piece(s, tile, 0, kind, tier);
  await saved(page, s);
  const counter = page.getByTestId(`army-${tile}`);
  await expect(counter.locator("[data-unit-kinds]")).toHaveAttribute(
    "data-unit-kinds",
    "merchant,heavy,light,cavalry,artillery",
  );
  await counter.click();
  await panel(page, "Forces");
  for (const kind of Object.keys(UNIT_INFO))
    for (const tier of [1, 2, 3, 4])
      await expect(
        page.locator(
          `.unit-choice [data-unit-kind="${kind}"][data-unit-tier="${tier}"]`,
        ),
      ).toHaveCount(1);
  await expect(page.locator(".unit-choice .portrait-rank")).toHaveCount(20);
  await expect(page.locator(".unit-choice .portrait-class")).toHaveCount(20);
  await page.locator(".army-composition > summary").click();
  await page.locator(".unit-choice").first().click();
  await expect(page.locator(".unit-choice input").first()).not.toBeChecked();
  await page.screenshot({
    path: `test-artifacts/military/${test.info().project.name}-troops.png`,
  });
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

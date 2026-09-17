import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { guildFixture } from "../tests/guild-fixture";
import { piece } from "../tests/helpers";
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
test("city guild founding shows all ten crests, costs, opening delay and persists", async ({
  page,
}, info) => {
  const { s, home } = guildFixture();
  await open(page, s);
  await page.getByTestId(`town-${home.id}`).click();
  const panel = page.getByTestId("city-guild");
  await panel.scrollIntoViewIfNeeded();
  await expect(panel.locator(".guild-choice")).toHaveCount(10);
  await panel.getByRole("button", { name: /Establish Artisans/ }).click();
  await expect(panel).toContainText("This guild opens on your next turn");
  await expect(page.getByTestId(`guild-badge-${home.id}`)).toHaveCount(1);
  await expect(
    panel.getByRole("button", { name: /Complete guild order/ }),
  ).toBeDisabled();
  await panel.locator(".guild-reference summary").click();
  await expect(panel).toContainText("Coal");
  expect(
    (
      await new AxeBuilder({ page })
        .include('[data-testid="city-guild"]')
        .analyze()
    ).violations,
  ).toEqual([]);
  await panel.screenshot({
    path: `test-artifacts/guilds-${info.project.name}-city.png`,
  });
  await page.reload();
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  expect((await saved(page)).towns[home.id].guild).toMatchObject({
    kind: "artisans",
    tier: 1,
  });
});
test("industrial work orders choose lower tiers, save automation and deliver once", async ({
  page,
}, info) => {
  const { s, home } = guildFixture("artisans", 3);
  await open(page, s);
  await page.getByTestId(`town-${home.id}`).click();
  const panel = page.getByTestId("city-guild");
  await panel.getByLabel("Guild operating tier").selectOption("2");
  await panel.getByLabel("Guild raw material").selectOption("coal");
  await expect(panel.locator(".guild-receive")).toContainText("3");
  await panel.getByRole("checkbox", { name: /Standing order/ }).check();
  await panel.getByRole("button", { name: /Complete guild order/ }).click();
  await expect(panel).toContainText("completed its order");
  const n = await saved(page);
  expect(n.towns[home.id].stock.coal).toBe(home.stock.coal! - 3);
  expect(n.towns[home.id].stock.coke).toBe(home.stock.coke! + 3);
  expect(n.towns[home.id].guild).toMatchObject({
    auto: true,
    used: false,
    usedTiers: [2],
    order: { tier: 2, raw: "coal" },
  });
  await panel.screenshot({
    path: `test-artifacts/guilds-${info.project.name}-factory.png`,
  });
});
test("merchant contracts stay in category and expose useful processed trades", async ({
  page,
}) => {
  const { s, home } = guildFixture("merchants", 3);
  await open(page, s);
  await page.getByTestId(`town-${home.id}`).click();
  const panel = page.getByTestId("city-guild");
  await panel.getByLabel("Guild contract give").selectOption("coke");
  await panel.getByLabel("Guild contract receive").selectOption("steel");
  await expect(
    panel
      .getByLabel("Guild contract receive")
      .locator('option[value="goldbars"]'),
  ).toHaveCount(0);
  await expect(
    panel.getByLabel("Guild contract receive").locator('option[value="coal"]'),
  ).toHaveCount(0);
  await panel.getByRole("button", { name: /Complete guild order/ }).click();
  const n = await saved(page);
  expect(n.towns[home.id].stock.coke).toBe(home.stock.coke! - 1);
  expect(n.towns[home.id].stock.steel).toBe(home.stock.steel! + 3);
});
test("formation supply is clear and rival city guilds are publicly inspectable", async ({
  page,
}) => {
  const { s, home, enemy, land } = guildFixture("commanders", 2);
  const units = Array.from({ length: 24 }, () => piece(s, land));
  enemy.level = enemy.turnLevel = 3;
  enemy.guild = {
    kind: "merchants",
    tier: 2,
    born: 0,
    used: false,
    auto: false,
  };
  await open(page, s);
  await page.getByTestId(`town-${home.id}`).click();
  const panel = page.getByTestId("city-guild");
  await expect(panel).toContainText(
    "Entire army · 24 eligible units · no size limit",
  );
  await panel.getByRole("button", { name: /Supply formation/ }).click();
  const n = await saved(page);
  for (const unit of units)
    expect(n.pieces[unit.id]).toMatchObject({
      bonus: 3,
      guildSupplied: true,
    });
  await page.getByTestId(`town-${enemy.id}`).press("Enter");
  await expect(panel).toContainText("Merchants’ Guild");
  await expect(panel).toContainText("Public specialization");
  await expect(
    panel.getByRole("button", { name: /Complete guild order/ }),
  ).toHaveCount(0);
});
test("each unlocked tier has its own contract and separately saved standing recipe", async ({
  page,
}) => {
  const { s, home } = guildFixture("artisans", 3);
  await open(page, s);
  await page.getByTestId(`town-${home.id}`).click();
  const panel = page.getByTestId("city-guild");
  for (const [tier, raw] of [
    ["1", "coal"],
    ["2", "ore"],
    ["3", "salt"],
  ]) {
    await panel.getByLabel("Guild operating tier").selectOption(tier);
    await panel.getByLabel("Guild raw material").selectOption(raw);
    await panel.getByRole("checkbox", { name: /Standing order/ }).check();
    await expect(
      panel.getByRole("button", { name: /Complete guild order/ }),
    ).toBeEnabled();
    await panel.getByRole("button", { name: /Complete guild order/ }).click();
    await expect(
      panel.getByRole("button", { name: /Complete guild order/ }),
    ).toBeDisabled();
  }
  const n = await saved(page);
  expect(n.towns[home.id].guild).toMatchObject({
    used: true,
    usedTiers: [1, 2, 3],
    standingOrders: [
      { tier: 1, raw: "coal" },
      { tier: 2, raw: "ore" },
      { tier: 3, raw: "salt" },
    ],
  });
  expect(n.towns[home.id].stock).toMatchObject({
    coal: 197,
    coke: 200,
    steel: 203,
    reagents: 204,
  });
  await panel.getByLabel("Guild operating tier").selectOption("2");
  await expect(panel.getByLabel("Guild raw material")).toHaveValue("ore");
  await panel.getByRole("checkbox", { name: /Standing order/ }).uncheck();
  expect(
    (await saved(page)).towns[home.id].guild!.standingOrders?.map(
      (o) => o.tier,
    ),
  ).toEqual([1, 3]);
  await page.reload();
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await page.getByTestId(`town-${home.id}`).click();
  await panel.getByLabel("Guild operating tier").selectOption("1");
  await expect(
    panel.getByRole("checkbox", { name: /Standing order/ }),
  ).toBeChecked();
  await expect(panel.getByLabel("Guild raw material")).toHaveValue("coal");
  await expect(
    panel.getByRole("button", { name: /Complete guild order/ }),
  ).toBeDisabled();
});

test("navigator supply applies to the entire fleet, including economic ships but excluding passengers", async ({
  page,
}) => {
  const { s, home, water } = guildFixture("navigators", 1);
  const ships = Array.from({ length: 20 }, (_, i) =>
    piece(s, water, 0, i % 2 ? "merchantship" : "convoy", 2),
  );
  const passenger = piece(s, water);
  passenger.carrier = ships[0].id;
  await open(page, s);
  await page.getByTestId(`town-${home.id}`).click();
  const panel = page.getByTestId("city-guild");
  await expect(panel).toContainText(
    "Entire fleet · 20 eligible ships · no size limit",
  );
  await panel.getByRole("button", { name: /Supply formation/ }).click();
  const n = await saved(page);
  for (const ship of ships)
    expect(n.pieces[ship.id]).toMatchObject({ bonus: 2, guildSupplied: true });
  expect(n.pieces[passenger.id].bonus).toBe(0);
});

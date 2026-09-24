import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { guildFixture } from "../tests/guild-fixture";
import { piece } from "../tests/helpers";
import { serialize, SAVE_KEY } from "../src/game/save";
import { townGuilds } from "../src/game/guilds";
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

test("three guild slots remain readable, founding selects the new guild and reloading preserves each", async ({
  page,
}, info) => {
  const { s, home } = guildFixture("artisans", 3);
  await open(page, s);
  await page.getByTestId(`town-${home.id}`).click();
  await page.getByRole("button", { name: "+ Add guild", exact: true }).click();
  await page.locator(".guild-choice").filter({ hasText: "Farmers" }).click();
  await page.getByRole("button", { name: /Establish Farmers/ }).click();
  await expect(page.getByTestId("city-guild")).toContainText(
    "Farmers’ Guild I",
  );
  await expect(page.locator(".guild-slot-heading")).toContainText(
    "2 / 3 slots",
  );
  await page.getByRole("button", { name: "+ Add guild", exact: true }).click();
  await page.locator(".guild-choice").filter({ hasText: "Builders" }).click();
  await page.getByRole("button", { name: /Establish Builders/ }).click();
  await expect(page.locator(".guild-slot-heading")).toContainText(
    "3 / 3 slots",
  );
  await expect(
    page.getByRole("button", { name: "+ Add guild", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByTestId(`guild-badge-${home.id}`)).toContainText("3");
  await expect(
    page.getByTestId(`guild-badge-${home.id}`).getByRole("img", {
      name: "Artisans’ Guild III",
      exact: true,
    }),
  ).toHaveCount(1);
  await page
    .getByRole("group", { name: "City guild selector" })
    .getByRole("button", { name: /Artisans/ })
    .click();
  await expect(page.getByTestId("city-guild")).toContainText(
    "Artisans’ Guild III",
  );
  await expect
    .poll(async () => townGuilds((await saved(page)).towns[home.id]))
    .toHaveLength(3);
  expect(
    (await new AxeBuilder({ page }).include(".city-guilds").analyze())
      .violations,
  ).toEqual([]);
  await page.locator(".city-guilds").screenshot({
    path: `test-artifacts/guild-expansion-${info.project.name}-slots.png`,
  });
  await page.reload();
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await page.getByTestId(`town-${home.id}`).click();
  await expect(page.locator(".guild-slot-heading")).toContainText(
    "3 / 3 slots",
  );
});

test("secondary Farmers and Scholars guilds deliver their own effects with independent controls", async ({
  page,
}) => {
  const { s, home, land } = guildFixture("farmers", 3);
  home.guilds = [
    { kind: "builders", tier: 3, born: 0, used: false, auto: false },
    home.guild!,
    { kind: "scholars", tier: 3, born: 0, used: false, auto: false },
  ];
  delete home.guild;
  await open(page, s);
  await page.getByTestId(`town-${home.id}`).click();
  const tabs = page.getByRole("group", { name: "City guild selector" });
  await tabs.getByRole("button", { name: /Farmers/ }).click();
  await page.getByLabel("Guild operating tier").selectOption("3");
  await page.getByLabel("Guild deposit").selectOption(land);
  await page.getByRole("button", { name: /^Complete guild order/ }).click();
  await expect
    .poll(async () => (await saved(page)).towns[home.id].stock.grain)
    .toBe(home.stock.grain! + 32);
  await tabs.getByRole("button", { name: /Builders/ }).click();
  await page.getByRole("button", { name: /^Complete guild order/ }).click();
  await expect
    .poll(async () => (await saved(page)).players[0].bonuses.routes)
    .toBe(6);
  await tabs.getByRole("button", { name: /Scholars/ }).click();
  await expect(
    page.getByRole("checkbox", { name: /Standing order/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /^Complete guild order/ }).click();
  await expect
    .poll(async () => (await saved(page)).researchChoice)
    .toHaveLength(2);
  const state = await saved(page);
  expect(state.researchChoice!.every((c) => c.tier === 4)).toBe(true);
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("town inspection always displays siege turns and their breakdown, including a vulnerable settlement", async ({
  page,
}, info) => {
  const { s, home, enemy } = guildFixture();
  home.wall = 3;
  s.towers[home.vertex] = {
    id: `w${s.nextId++}`,
    vertex: home.vertex,
    owner: 0,
    tier: 2,
  };
  enemy.level = 1;
  enemy.wall = 0;
  await open(page, s);
  await page.getByTestId(`town-${home.id}`).click();
  await page.getByTestId("inspector-details-toggle").click();
  const card = page.getByTestId("town-siege-resistance");
  await expect(card).toContainText("Siege resistance: 8 turns");
  await expect(card).toContainText("City 3 + walls 3 + watchtowers 2");
  await expect(card).toContainText("raid on operation 9");
  expect(
    (
      await new AxeBuilder({ page })
        .include('[data-testid="town-siege-resistance"]')
        .analyze()
    ).violations,
  ).toEqual([]);
  await card.screenshot({
    path: `test-artifacts/guild-expansion-${info.project.name}-defense.png`,
  });
  const close = page.getByRole("button", { name: "Close action panel" });
  if (await close.isVisible()) await close.click();
  await page.getByTestId(`town-${enemy.id}`).click();
  await expect(card).toContainText("Siege resistance: 0 turns");
  await expect(card).toContainText("can be raided immediately");
});

test("Engineer equipment is visible and usable in the army inspector", async ({
  page,
}) => {
  const { s, home, land } = guildFixture("engineers", 3);
  const u = piece(s, land, 0, "heavy", 3);
  await open(page, s);
  await page.getByTestId(`town-${home.id}`).click();
  await page.getByRole("button", { name: /^Equip siege tools/ }).click();
  expect((await saved(page)).pieces[u.id].guildSiege).toBe(6);
  const close = page.getByRole("button", { name: "Close action panel" });
  if (await close.isVisible()) await close.click();
  await page.getByTestId(`army-${land}`).click();
  await expect(page.getByTestId("army-overview")).toContainText(
    "+6 Engineer siege power this turn",
  );
});

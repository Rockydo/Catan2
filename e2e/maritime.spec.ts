import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { fishingFixture, maritimeFixture } from "../tests/maritime-fixture";
import { run, piece } from "../tests/helpers";
import { serialize, SAVE_KEY } from "../src/game/save";
import { inventory, points } from "../src/game/selectors";
import { harvestTiles, defaultCoverage } from "../src/game/maritime";
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
async function panel(page: Page, name?: string) {
  const mobile = page.getByRole("button", { name: "Actions & realm" });
  if (
    (await mobile.isVisible()) &&
    !(await page
      .locator(".right-panel")
      .evaluate((e) => e.classList.contains("mobile-open")))
  )
    await mobile.click();
  if (name) await page.getByRole("button", { name, exact: true }).click();
}
async function close(page: Page) {
  const b = page.getByRole("button", { name: "Close action panel" });
  if (await b.isVisible()) await b.click();
}
async function state(page: Page): Promise<Game> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).game,
    SAVE_KEY,
  );
}

test("Grain recipes show automatic Fish payment and complete a city upgrade", async ({
  page,
}) => {
  const { s, home } = maritimeFixture();
  home.level = home.turnLevel = 1;
  home.stock = { ore: 3, fish: 2 };
  await open(page, s);
  await page.getByTestId(`town-${home.id}`).click();
  await panel(page, "Build");
  const upgrade = page.getByRole("button", { name: /Upgrade to City I/ });
  await expect(upgrade).toContainText("Uses 2 Fish instead of Grain");
  await upgrade.click();
  expect((await state(page)).towns[home.id].level).toBe(2);
  expect(inventory(await state(page)).fish ?? 0).toBe(0);
});

test("fisheries, Smokehouses and whole Gold-bar trading work through their controls", async ({
  page,
}) => {
  let { s, home, water, edge } = fishingFixture();
  s = run(s, { type: "route", edge: edge.id });
  await open(page, s);
  await page.getByTestId(`road-${edge.id}`).click();
  await panel(page, "Build");
  await page.getByRole("button", { name: /^Build camp/ }).click();
  await page.getByRole("button", { name: /Upgrade camp to II/ }).click();
  expect((await state(page)).routes[edge.id].camps[water]).toBe(2);
  await close(page);
  await page.getByTestId(`town-${home.id}`).click();
  await panel(page, "Build");
  const industry = page.locator(`[data-linked-tile="${water}"]`);
  await expect(industry).toContainText("Smokehouse");
  await industry.getByRole("button", { name: /Build extension/ }).click();
  expect((await state(page)).towns[home.id].extensions[water]).toBe(1);
  await panel(page, "Trade");
  await page.getByLabel("Give goods").selectOption("goldbars");
  await page.getByLabel("Receive goods").selectOption("grain");
  await expect(page.locator(".trade-rate")).toContainText("2 ×");
  const before = inventory(await state(page));
  await page
    .getByRole("button", { name: /Exchange 1 Gold bars for 2 Grain/ })
    .click();
  expect(inventory(await state(page)).grain).toBe(before.grain! + 2);
  expect(inventory(await state(page)).goldbars).toBe(before.goldbars! - 1);
});

test("watchtower map targets build beside a town and all four tiers stay inspectable", async ({
  page,
}) => {
  let { s, home } = maritimeFixture();
  s = run(s, { type: "road", edge: s.vertices[home.vertex].edges[0] });
  await open(page, s);
  await panel(page, "Build");
  await page
    .locator(".build-tool")
    .filter({ has: page.getByText("Watchtower", { exact: true }) })
    .click();
  await close(page);
  await page.getByTestId(`tower-target-${home.vertex}`).click();
  await panel(page, "Build");
  const before = inventory(await state(page));
  await page
    .getByRole("button", { name: /Build watchtower with Stone/ })
    .click();
  expect((await state(page)).towers[home.vertex].tier).toBe(1);
  expect(inventory(await state(page)).stone).toBe(before.stone! - 2);
  expect(inventory(await state(page)).lumber).toBe(before.lumber);
  for (const rank of ["II", "III", "IV"])
    await page
      .getByRole("button", {
        name: new RegExp(`Upgrade watchtower to ${rank} `),
      })
      .click();
  expect((await state(page)).towers[home.vertex].tier).toBe(4);
  await expect(page.getByLabel("Watchtower", { exact: true })).toContainText(
    "+4",
  );
  await page.screenshot({
    path: `test-artifacts/maritime-tower-${test.info().project.name}.png`,
    fullPage: true,
  });
});

test("shipwright builds tier-IV fishing and merchant ships with distinct portraits and harvest details", async ({
  page,
}) => {
  const { s, home, water } = fishingFixture();
  await open(page, s);
  await page.getByTestId(`town-${home.id}`).click();
  await panel(page, "Forces");
  await page.getByRole("button", { name: "Tier IV", exact: true }).click();
  await page.getByRole("button", { name: "Navy", exact: true }).click();
  await page.getByLabel("Naval deployment").selectOption(water);
  await page.getByRole("button", { name: /Grand Trawler/ }).click();
  await page.getByRole("button", { name: /Treasure Galleon/ }).click();
  const built = await state(page);
  expect(
    Object.values(built.pieces).map((u) => [u.kind, u.tier, points(u)]),
  ).toEqual([
    ["fishing", 4, 3],
    ["merchantship", 4, 3],
  ]);
  await close(page);
  await page.getByTestId(`army-${water}`).click();
  await panel(page, "Forces");
  await expect(page.locator(".harvest-card")).toHaveCount(2);
  await expect(page.getByTestId("economic-unit-marker")).toHaveCount(1);
  await page
    .getByTestId(`harvest-${Object.values(built.pieces)[0].id}`)
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `test-artifacts/maritime-fleet-${test.info().project.name}.png`,
    fullPage: true,
  });
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    audit.violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
  ).toEqual([]);
});

test("merchant coverage is visible, editable, saved, and also inspectable for enemies", async ({
  page,
}) => {
  const { s } = maritimeFixture();
  s.tiles["1,0"].resource = "gold";
  s.tiles["1,0"].number = 2;
  s.tiles["0,1"].resource = "water";
  s.tiles["0,1"].fish = true;
  const u = piece(s, "0,0", 0, "merchant", 2);
  u.coverage = ["1,0"];
  await open(page, s);
  await page.getByTestId("army-0,0").click();
  await panel(page, "Forces");
  await expect(page.getByTestId(`harvest-${u.id}`)).toContainText("Zero power");
  await page.getByLabel("Harvest 0,1", { exact: true }).check();
  expect((await state(page)).pieces[u.id].coverage).toEqual(["1,0", "0,1"]);
  await close(page);
  await expect(page.getByTestId("harvest-coverage-0,1")).toBeAttached();
  await page.screenshot({
    path: `test-artifacts/maritime-coverage-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.reload();
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await page.getByTestId("army-0,0").click();
  await panel(page, "Forces");
  await expect(page.getByLabel("Harvest 0,1", { exact: true })).toBeChecked();
  const enemy = piece(s, "2,0", 1, "merchant", 4);
  enemy.coverage = defaultCoverage(s, enemy);
  await page.locator("input[type=file]").setInputFiles({
    name: "enemy-merchant.json",
    mimeType: "application/json",
    buffer: Buffer.from(serialize(s)),
  });
  await close(page);
  await page.getByTestId("army-2,0").click();
  await panel(page, "Forces");
  await expect(page.getByTestId(`harvest-${enemy.id}`)).toBeVisible();
  await expect(
    page.getByTestId(`harvest-${enemy.id}`).getByRole("checkbox").first(),
  ).toBeDisabled();
});

test("world census counts fishing grounds as productive water", async ({
  page,
}) => {
  const { s, edge } = fishingFixture();
  for (const id of edge.tiles) s.tiles[id].fish = true;
  s.tiles["3,0"].resource = "gold";
  await open(page, s);
  await panel(page, "Explore");
  await expect(page.getByTestId("census-fish").locator("b")).toHaveText("2");
  await expect(page.getByTestId("census-water").locator("b")).toHaveText("2");
  await expect(page.getByTestId("census-gold").locator("b")).toHaveText("1");
  await expect(
    page.getByText(/Fish and Whale grounds are included in the water total/),
  ).toBeVisible();
});

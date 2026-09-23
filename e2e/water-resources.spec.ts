import { test, expect, type Page } from "@playwright/test";
import { guildFixture } from "../tests/guild-fixture";
import { fishingFixture } from "../tests/maritime-fixture";
import { run } from "../tests/helpers";
import { serialize, SAVE_KEY } from "../src/game/save";

async function panel(page: Page, name: string) {
  const toggle = page.getByRole("button", { name: "Actions & realm" });
  if (
    (await toggle.isVisible()) &&
    !(await page
      .locator(".right-panel")
      .evaluate((e) => e.classList.contains("mobile-open")))
  )
    await toggle.click();
  await page.getByRole("button", { name, exact: true }).click();
}
async function close(page: Page) {
  const button = page.getByRole("button", { name: "Close action panel" });
  if (await button.isVisible()) await button.click();
}

test("Whales have ocean art, Hides and Oil production, camps, correct census and persistent saves", async ({
  page,
}, info) => {
  let { s, home, water, edge } = fishingFixture();
  delete s.tiles[water].fish;
  s.tiles[water].whale = true;
  const fish = edge.tiles[1];
  s.tiles[fish].fish = true;
  s = run(s, { type: "route", edge: edge.id });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(
    ({ key, data }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, data);
    },
    {
      key: SAVE_KEY,
      data: serialize(s),
    },
  );
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await page
    .getByRole("button", { name: "Fit entire map", exact: true })
    .click();
  const oil = page
    .locator(".resource-chip")
    .filter({ has: page.locator("span", { hasText: /^Oil$/ }) });
  const fishChip = page
    .locator(".resource-chip")
    .filter({ has: page.locator("span", { hasText: /^Fish$/ }) });
  const oilBox = (await oil.boundingBox())!,
    fishBox = (await fishChip.boundingBox())!;
  expect(Math.abs(oilBox.x - fishBox.x)).toBeLessThan(1);
  expect(oilBox.y).toBeGreaterThan(fishBox.y);
  await expect(oil).toHaveAttribute("title", /Raw resource/);
  const tile = page.getByTestId(`hex-${water}`);
  await expect(tile).toHaveAttribute(
    "aria-label",
    /Whale grounds, Hides \+ Oil, roll 7/,
  );
  await expect(tile).toHaveClass(/sea-tile/);
  expect((await page.request.get("/assets/terrain-whale-v1.png")).ok()).toBe(
    true,
  );
  await expect(page.locator("#terrain-whale image")).toHaveAttribute(
    "href",
    /terrain-whale-v1.png/,
  );
  await tile.press("Enter");
  await panel(page, "Build");
  await expect(
    page.getByRole("heading", { name: "Whale grounds" }),
  ).toBeVisible();
  await expect(page.locator(".panel-intro")).toContainText("1 Hides + 1 Oil");
  await close(page);
  await oil.click();
  await expect(page.getByRole("dialog")).toContainText(
    "Oil replaces Coal one-for-one",
  );
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page
    .getByRole("button", { name: "Center selected location", exact: true })
    .click();
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  // Allow the camera’s deferred SVG rerasterization to settle for visual evidence.
  await page.waitForTimeout(400);
  await page.screenshot({
    path: `test-artifacts/water-resources-${info.project.name}.png`,
  });
  await page.getByTestId(`road-${edge.id}`).click();
  await panel(page, "Build");
  const camp = page.locator(".camp-side").filter({ hasText: "Whaling camp" });
  await camp.getByRole("button", { name: /^Build camp/ }).click();
  const route = page.getByTestId(`road-${edge.id}`);
  await expect(route).toHaveAttribute("aria-label", /with camps/);
  await expect(route.getByRole("img", { name: "I", exact: true })).toHaveCount(
    1,
  );
  await camp.getByRole("button", { name: /Upgrade camp to II/ }).click();
  await expect(route.getByRole("img", { name: "II", exact: true })).toHaveCount(
    1,
  );
  await expect(route.getByRole("img", { name: "I", exact: true })).toHaveCount(
    0,
  );
  await expect(camp).toContainText("Tier II: 2 Hides + 2 Oil per roll");
  await close(page);
  await page.getByTestId(`town-${home.id}`).click();
  await panel(page, "Build");
  const extension = page.locator(`[data-linked-tile="${water}"]`);
  await expect(extension).toContainText("Tannery");
  await extension.getByRole("button", { name: /Build extension/ }).click();
  await panel(page, "Explore");
  await expect(page.getByTestId("census-hides").locator("b")).toHaveText("1");
  await expect(page.getByTestId("census-fish").locator("b")).toHaveText("1");
  await expect(page.getByTestId("census-oil").locator("b")).toHaveText("1");
  await expect(page.getByTestId("census-water").locator("b")).toHaveText("2");
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).game,
    SAVE_KEY,
  );
  expect(saved.tiles[water].whale).toBe(true);
  expect(saved.routes[edge.id].camps[water]).toBe(2);
  expect(saved.towns[home.id].extensions[water]).toBe(1);
  await page.reload();
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await expect(page.getByTestId(`hex-${water}`)).toHaveAttribute(
    "aria-label",
    /Whale grounds, Hides/,
  );
  const restored = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).game,
    SAVE_KEY,
  );
  expect(restored.routes[edge.id].camps[water]).toBe(2);
  expect(restored.towns[home.id].extensions[water]).toBe(1);
  expect(errors).toEqual([]);
});

test("guild recipes display Coal while paying an Oil shortfall and saving the result", async ({
  page,
}) => {
  const { s, home, land } = guildFixture("farmers", 2);
  home.stock = { oil: 1, salt: 1 };
  await page.addInitScript(({ key, data }) => localStorage.setItem(key, data), {
    key: SAVE_KEY,
    data: serialize(s),
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await page.getByTestId(`town-${home.id}`).click();
  await panel(page, "Build");
  await page.getByLabel("Guild operating tier").selectOption("2");
  await page.getByLabel("Guild deposit").selectOption(land);
  const order = page.getByRole("button", { name: /^Complete guild order/ });
  await expect(order).toContainText("Uses 1 Oil instead of Coal");
  await expect(order.locator(".cost")).toHaveAttribute("aria-label", /Coal/);
  await expect(order.locator(".cost")).not.toHaveAttribute("aria-label", /Oil/);
  await order.click();
  const state = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).game,
    SAVE_KEY,
  );
  expect(state.towns[home.id].stock.grain).toBe(12);
  expect(state.towns[home.id].stock.oil ?? 0).toBe(0);
});

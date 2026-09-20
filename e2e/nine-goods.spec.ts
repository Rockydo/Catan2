import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { oldGoodsFixture, wrapOldGame } from "../tests/nine-goods-fixture";
import { funded, piece } from "../tests/helpers";
import { SAVE_KEY, serialize } from "../src/game/save";
import { inventory, sumStock, ownTowns } from "../src/game/selectors";
import { landAtVertex } from "../src/game/world";

test("old goods migrate into twenty-three clear resource controls and preserved industry", async ({
  page,
}) => {
  const { old, town, tile } = oldGoodsFixture();
  old.phase = "military";
  await page.addInitScript(
    ({ key, data }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, data);
    },
    { key: SAVE_KEY, data: wrapOldGame(old) },
  );
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await expect(page.locator(".resource-chip")).toHaveCount(23);
  await expect(page.locator(".resource-bar")).not.toContainText(/Flax|Rope/);
  await expect(
    page.getByRole("button", { name: "Military phase", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "End turn", exact: true }),
  ).toBeVisible();
  await page.getByTestId(`town-${town}`).click();
  await expect(page.getByTestId("city-extensions")).toContainText(
    "Chemical works",
  );
  const s = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).game,
    SAVE_KEY,
  );
  expect(s.version).toBe(5);
  expect(s.phase).toBe("economy");
  expect(s.towns[town].stock).toEqual({ salt: 7, reagents: 7 });
  expect(s.towns[town].extensions[tile]).toBe(2);
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    audit.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.screenshot({
    path: `test-artifacts/nine-goods-${test.info().project.name}.png`,
  });
  await page.reload();
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await expect(page.locator(".resource-chip")).toHaveCount(23);
});

test("a basic camp spends exactly one of each of two raw goods", async ({
  page,
}) => {
  const s = funded();
  const road = Object.values(s.routes).find(
    (r) => r.owner === 0 && r.kind === "road",
  )!;
  road.camps = {};
  const before = inventory(s);
  await page.addInitScript(({ key, data }) => localStorage.setItem(key, data), {
    key: SAVE_KEY,
    data: serialize(s),
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await page.getByTestId(`road-${road.edge}`).click();
  await page
    .getByRole("button", { name: /^Build camp/ })
    .first()
    .click();
  const after = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).game,
    SAVE_KEY,
  );
  expect(sumStock(before) - sumStock(inventory(after))).toBe(2);
  expect(Object.values(after.routes[road.edge].camps)).toEqual([1]);
  await expect(
    page.getByRole("button", { name: /^Upgrade camp to II/ }),
  ).toBeVisible();
});

test("raid proceeds directly from the shared phase and its goods fund a city immediately", async ({
  page,
}) => {
  const s = funded(),
    home = ownTowns(s)[0],
    target = ownTowns(s, 1)[0];
  for (const t of ownTowns(s)) t.stock = {};
  target.stock = { ore: 3, grain: 2 };
  const tile = landAtVertex(s, target.vertex)[0],
    unit = piece(s, tile, 0, "heavy", 1);
  await page.addInitScript(({ key, data }) => localStorage.setItem(key, data), {
    key: SAVE_KEY,
    data: serialize(s),
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await page.getByTestId(`army-${tile}`).click();
  await page
    .getByRole("button", { name: "Raid town", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Raid all goods", exact: true })
    .click();
  let current = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).game,
    SAVE_KEY,
  );
  expect(current.pieces[unit.id].moved).toBe(1);
  expect(current.towns[target.id].stock).toEqual({});
  if (
    await page.getByRole("button", { name: "Close action panel" }).isVisible()
  )
    await page.getByRole("button", { name: "Close action panel" }).click();
  await page.getByTestId(`town-${home.id}`).click();
  await page.getByRole("button", { name: "Upgrade to City I" }).click();
  current = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).game,
    SAVE_KEY,
  );
  expect(current.towns[home.id].level).toBe(2);
  expect(sumStock(inventory(current))).toBe(0);
  expect(current.phase).toBe("economy");
});

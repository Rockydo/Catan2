import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { maritimeFixture } from "../tests/maritime-fixture";
import { piece } from "../tests/helpers";
import { serialize, SAVE_KEY } from "../src/game/save";
import type { Page } from "@playwright/test";
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

test("a tower can be besieged from a moved army and inspected from its badge/link after reload", async ({
  page,
}, info) => {
  const { s, enemy } = maritimeFixture();
  const tower = {
    id: `w${s.nextId++}`,
    vertex: enemy.vertex,
    owner: 1,
    tier: 4,
  };
  s.towers[tower.vertex] = tower;
  const u = piece(s, "3,0", 0, "cavalry", 2);
  u.moved = 1;
  await open(page, s);
  await page.getByTestId("army-3,0").click();
  await page
    .getByRole("button", { name: "Select all ready units", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Siege watchtower", exact: true })
    .click();
  expect((await saved(page)).pieces[u.id]).toMatchObject({
    moved: 2,
    acted: false,
  });
  expect((await saved(page)).towerSieges![`0:${tower.id}`].progress).toBe(1);
  const badge = page.getByTestId(`tower-siege-badge-${tower.vertex}`);
  await expect(badge).toContainText("SIEGE 1/2");
  await expect(
    page.getByRole("button", { name: "Continue tower siege", exact: true }),
  ).toBeDisabled();
  const closePanel = page.getByRole("button", { name: "Close action panel" });
  if (await closePanel.isVisible()) await closePanel.click();
  await badge.click();
  const dialog = page.getByRole("dialog", {
    name: "Siege of Grand Watchtower",
  });
  await expect(dialog).toContainText("2 standalone siege turns");
  await expect(dialog).toContainText(
    "1 completed siege steps · 2 currently required · 1 remaining",
  );
  await expect(dialog).toContainText("Already operated this turn");
  // Audit settled colors, not a partially transparent frame of the entry fade.
  await dialog.evaluate(async (node) => {
    await Promise.all(
      node
        .closest(".modal-backdrop")!
        .getAnimations()
        .map((a) => a.finished),
    );
  });
  expect(
    (await new AxeBuilder({ page }).include('[role="dialog"]').analyze())
      .violations,
  ).toEqual([]);
  await dialog.screenshot({
    path: `test-artifacts/tower-sieges-${info.project.name}.png`,
  });
  await page.keyboard.press("Escape");
  await page.getByTestId(`tower-siege-link-${tower.id}-3,0`).press("Enter");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await page.reload();
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await expect(badge).toContainText("SIEGE 1/2");
});

test("overwhelming artillery sees direct tower destruction and direct city raid", async ({
  page,
}) => {
  const { s, home, enemy } = maritimeFixture();
  enemy.level = enemy.turnLevel = 2;
  enemy.wall = 0;
  home.stock = {};
  enemy.stock = { gold: 6 };
  const tower = {
    id: `w${s.nextId++}`,
    vertex: enemy.vertex,
    owner: 1,
    tier: 2,
  };
  s.towers[tower.vertex] = tower;
  const u = piece(s, "3,0", 0, "artillery", 4);
  u.bonus = 2;
  await open(page, s);
  await page.getByTestId("army-3,0").click();
  await page
    .getByRole("button", { name: "Select all ready units", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Begin siege", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Raid town", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Destroy watchtower", exact: true })
    .click();
  expect((await saved(page)).towers[tower.vertex]).toBeUndefined();
  expect((await saved(page)).towerSieges).toBeUndefined();
  await page.getByRole("button", { name: "Raid town", exact: true }).click();
  await page
    .getByRole("button", { name: "Raid all goods", exact: true })
    .click();
  const n = await saved(page);
  expect(n.towns[home.id].stock.gold).toBe(6);
  expect(n.sieges[`0:${enemy.id}`]).toMatchObject({ progress: 0, raided: 10 });
  expect(n.pieces[u.id]).toMatchObject({ moved: 2, acted: false });
});

test("road demolition after a move spends one point and leaves movement available", async ({
  page,
}) => {
  const { s } = maritimeFixture();
  const edge = s.tiles["1,0"].edges[0];
  s.routes[edge] = {
    id: `r${s.nextId++}`,
    edge,
    owner: 1,
    kind: "road",
    born: 0,
    camps: { "1,0": 1 },
  };
  const u = piece(s, "1,0", 0, "cavalry", 2);
  u.moved = 1;
  await open(page, s);
  await page.getByTestId("army-1,0").click();
  await page
    .getByRole("button", { name: "Select all ready units", exact: true })
    .click();
  await page.getByRole("button", { name: /Destroy Tidewatch road/ }).click();
  const dialog = page.getByRole("dialog", { name: "Destroy this road?" });
  await expect(dialog).toContainText("1 movement point");
  await dialog
    .getByRole("button", { name: "Confirm destruction", exact: true })
    .click();
  const n = await saved(page);
  expect(n.routes[edge]).toBeUndefined();
  expect(n.pieces[u.id]).toMatchObject({ moved: 2, acted: false });
});

import { test, expect, type Page } from "@playwright/test";
import { maritimeFixture } from "../tests/maritime-fixture";
import { frontierUnitFixture } from "../tests/coastal-fixture";
import { piece } from "../tests/helpers";
import { serialize, deserialize, SAVE_KEY } from "../src/game/save";
import { syncSeasonSurfaces } from "../src/game/seasons";
import type { Game } from "../src/game/types";

async function open(page: Page, s: Game) {
  deserialize(serialize(s));
  await page.addInitScript(
    ({ key, data }) => {
      localStorage.setItem(key, data);
      localStorage.setItem("catane-language", "en");
    },
    { key: SAVE_KEY, data: serialize(s) },
  );
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
}
async function saved(page: Page): Promise<Game> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).game,
    SAVE_KEY,
  );
}

for (const rescue of [false, true])
  test(`${rescue ? "same-tile rescue uses full tier-II capacity" : "adjacent embarkation works on summer-open Arctic ice"}`, async ({
    page,
  }) => {
    const { s } = maritimeFixture();
    for (const tile of Object.values(s.tiles)) tile.climate = "cold";
    s.calendar = { startRound: s.round };
    s.round++;
    Object.assign(s.tiles["0,0"], {
      resource: "ice",
      biome: "ice",
      climate: "arctic",
      number: 7,
    });
    // Fleet first catches controls that incorrectly use the first unit's medium
    // instead of the army the player selected on a shared tile.
    const carrier = piece(s, "0,0", 0, "convoy", rescue ? 2 : 1);
    const troops = Array.from({ length: rescue ? 3 : 1 }, () =>
      piece(s, rescue ? "0,0" : "1,0", 0, "heavy", 1),
    );
    syncSeasonSurfaces(s);
    await open(page, s);
    await page.getByTestId(`army-${troops[0].tile}`).click();
    if (rescue)
      await page
        .getByTestId("army-overview")
        .getByRole("button", { name: /Hillguard group/ })
        .click();
    await page.getByRole("button", { name: "Embark on fleet at 0,0" }).click();
    const dialog = page.getByRole("dialog", { name: "Embark your army" });
    await expect(dialog).toContainText(`${rescue ? 4 : 2} free berths`);
    await expect(
      dialog.getByRole("button", { name: "Load transports" }),
    ).toBeEnabled();
    await dialog.getByRole("button", { name: "Load transports" }).click();
    await expect(dialog).toHaveCount(0);
    const after = await saved(page);
    for (const troop of troops) {
      expect(after.pieces[troop.id].carrier).toBe(carrier.id);
      expect(after.pieces[troop.id].seasonStatus).toBeUndefined();
    }
  });

for (const sea of [false, true])
  test(`exploration selects ${sea ? "sea from thawed ice" : "land from winter-frozen water"}`, async ({
    page,
  }) => {
    const { s, tile } = frontierUnitFixture(sea);
    for (const tile of Object.values(s.tiles)) tile.climate = "cold";
    s.calendar = { startRound: s.round };
    s.round += sea ? 1 : 3;
    Object.assign(tile, {
      resource: sea ? "ice" : "water",
      biome: sea ? "ice" : "water",
      climate: sea ? "arctic" : "cold",
      number: 7,
    });
    syncSeasonSurfaces(s);
    await open(page, s);
    await page.getByTestId(`army-${tile.id}`).press("Enter");
    await page.getByRole("button", { name: "Explore", exact: true }).click();
    await expect(
      page.getByRole("button", { name: sea ? "Sea" : "Land", exact: true }),
    ).toHaveClass(/active/);
    await expect(
      page.getByLabel("Launch point").locator("option:checked"),
    ).toContainText(`${sea ? "Fleet" : "Army"} at ${tile.id}`);
    await page
      .getByRole("button", { name: "Preview expedition footprint" })
      .click();
    await page.getByRole("button", { name: /^Launch expedition/ }).click();
    await expect
      .poll(async () => Object.keys((await saved(page)).tiles).length)
      .toBe(Object.keys(s.tiles).length + 10);
  });

test("siege research can select a land army standing on winter sea ice", async ({
  page,
}) => {
  const { s, enemy } = maritimeFixture();
  s.calendar = { startRound: s.round };
  s.round += 3;
  Object.assign(s.tiles["3,0"], {
    resource: "water",
    biome: "water",
    climate: "cold",
    number: 7,
  });
  enemy.level = enemy.turnLevel = 4;
  piece(s, "3,0", 0, "heavy", 1);
  s.players[0].hand = [
    { id: `c${s.nextId++}`, kind: "engineers", tier: 3, bought: 0 },
  ];
  syncSeasonSurfaces(s);
  await open(page, s);
  await page.getByRole("button", { name: "Research", exact: true }).click();
  await page.getByRole("button", { name: "Play card", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Siege target").selectOption(enemy.id);
  await expect(dialog.locator(".unit-choice")).toContainText(
    "besiegers at 3,0",
  );
  await dialog.getByRole("radio").check();
  await expect(
    dialog.getByRole("button", { name: "Play research", exact: true }),
  ).toBeEnabled();
  await dialog
    .getByRole("button", { name: "Play research", exact: true })
    .click();
  await expect
    .poll(async () => (await saved(page)).sieges[`0:${enemy.id}`]?.progress)
    .toBe(3);
});

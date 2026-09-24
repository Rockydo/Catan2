import { browserSave } from "../scripts/browser-save";
import { test, expect } from "@playwright/test";
import { newGame } from "../src/game/engine";
import { REALM_NAMES } from "../src/game/content";
import { chooseAIAction } from "../src/game/ai";
import { run } from "../tests/helpers";
import { serialize, SAVE_KEY } from "../src/game/save";

test("grand campaign choice exposes twelve configurable factions and creates 300 tiles", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: /New campaign/ }).click();
  await page.getByLabel("Campaign size").selectOption("12");
  await expect(page.getByLabel("Realm 12 name")).toHaveValue("Duskmoor");
  await page
    .getByLabel("World seed", { exact: true })
    .fill("grand-browser-test");
  await page.screenshot({
    path: `test-artifacts/coalition-grand-setup-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Found your realm" }).click();
  await page.getByRole("button", { name: /begin/ }).click();
  await expect.poll(async () => Boolean(await browserSave(page))).toBe(true);
  const s = JSON.parse((await browserSave(page))!).game;
  expect(s.players).toHaveLength(12);
  expect(Object.keys(s.tiles)).toHaveLength(300);
  await expect(page.getByText(/FOUNDING THE REALM/)).toContainText("24");
  expect(errors).toEqual([]);
});

test("twelve-faction saves restore, show every harvest receipt and accept the twelfth human turn", async ({
  page,
}) => {
  let s = newGame(
    "grand-browser-test",
    REALM_NAMES.map((name) => ({ name, control: "human" })),
  );
  while (s.phase.startsWith("setup")) s = run(s, chooseAIAction(s));
  s.active = 11;
  await page.addInitScript(({ key, data }) => localStorage.setItem(key, data), {
    key: SAVE_KEY,
    data: serialize(s),
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  // A shared-screen controller may ask the next human to acknowledge their seat.
  const ready = page.getByRole("button", {
    name: /I am Duskmoor/,
  });
  if (await ready.isVisible()) await ready.click();
  await page.getByRole("button", { name: "Roll dice", exact: true }).click();
  await page.getByRole("button", { name: /Keep open/ }).click();
  await expect(page.locator('[data-testid^="roll-player-"]')).toHaveCount(12);
  await expect(page.getByTestId("roll-player-11")).toContainText("Duskmoor");
  await page.getByTestId("roll-player-11").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `test-artifacts/coalition-grand-harvest-${test.info().project.name}.png`,
    fullPage: true,
  });
  await expect
    .poll(async () => JSON.parse((await browserSave(page))!).game.phase)
    .toBe("economy");
  const current = JSON.parse((await browserSave(page))!).game;
  expect(current.active).toBe(11);
  expect(current.phase).toBe("economy");
});

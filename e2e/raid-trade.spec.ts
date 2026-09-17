import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { tradeFixture } from "../tests/trade-fixture";
import { funded, piece, run, nextOwnerTurn } from "../tests/helpers";
import { ownTowns, inventory, nearestTown } from "../src/game/selectors";
import { landAtVertex } from "../src/game/world";
import { serialize, SAVE_KEY } from "../src/game/save";
import type { Game } from "../src/game/types";
async function state(page: Page): Promise<Game> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).game,
    SAVE_KEY,
  );
}
async function saved(page: Page, s: Game) {
  await page.addInitScript(({ key, data }) => localStorage.setItem(key, data), {
    key: SAVE_KEY,
    data: serialize(s),
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
}

test("live worker trade offers pop up, wait for the human, and support decline, close, Escape and acceptance", async ({
  page,
}) => {
  const s = tradeFixture();
  await saved(page, s);
  const offer = page.getByRole("dialog", { name: "Tidewatch offers a trade" });
  for (const dismissal of ["Decline", "Close dialog", "Escape"]) {
    await expect(offer).toBeVisible();
    await expect(offer).toContainText("You receive");
    await expect(offer).toContainText("You give");
    const pending = await state(page);
    expect(pending.trade?.to).toBe(0);
    await page.waitForTimeout(500);
    expect((await state(page)).actions).toBe(pending.actions);
    if (dismissal === "Escape") await offer.press("Escape");
    else
      await offer.getByRole("button", { name: dismissal, exact: true }).click();
    await expect(offer).toHaveCount(0);
    const declined = await state(page);
    expect(inventory(declined, 0)).toEqual(inventory(s, 0));
    expect(declined.players[1].tradeOffered).toBe(true);
    await expect
      .poll(async () => (await state(page)).actions)
      .toBeGreaterThan(pending.actions + 1);
    await page.reload();
    await page.getByRole("button", { name: /Continue campaign/ }).click();
  }
  await expect(offer).toBeVisible();
  const pending = await state(page),
    expected = run(pending, {
      type: "respond-trade",
      actor: 0,
      mode: "accept",
    });
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations.map((v) => v.id)).toEqual([]);
  await page.screenshot({
    path: `test-artifacts/military/${test.info().project.name}-trade-offer.png`,
  });
  await offer.getByRole("button", { name: "Accept trade" }).click();
  await expect(offer).toHaveCount(0);
  expect(inventory(await state(page), 0)).toEqual(inventory(expected, 0));
});

test("a previously raided city offers another raid or destruction, with one operation per turn", async ({
  page,
}) => {
  let s = funded();
  const target = ownTowns(s, 1)[0],
    tile = landAtVertex(s, target.vertex)[0],
    u = piece(s, tile, 0, "artillery", 3);
  target.level = target.turnLevel = 4;
  s.phase = "military";
  s = run(s, { type: "siege", ids: [u.id], town: target.id });
  nextOwnerTurn(s);
  s.towns[target.id].stock = { grain: 8, steel: 3 };
  const receiving = nearestTown(s, tile, 0)!,
    before = { ...receiving.stock };
  await saved(page, s);
  await page.getByTestId(`army-${tile}`).click();
  if (
    (await page.getByRole("button", { name: "Actions & realm" }).isVisible()) &&
    !(await page
      .locator(".right-panel")
      .evaluate((e) => e.classList.contains("mobile-open")))
  )
    await page.getByRole("button", { name: "Actions & realm" }).click();
  await expect(
    page.getByRole("button", { name: "Destroy town", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Raid again", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("All 11 goods");
  await page
    .getByRole("button", { name: "Raid all goods", exact: true })
    .click();
  const raided = await state(page);
  expect(raided.towns[target.id].stock).toEqual({});
  expect(raided.towns[receiving.id].stock.grain).toBe((before.grain ?? 0) + 8);
  expect(raided.towns[receiving.id].stock.steel).toBe((before.steel ?? 0) + 3);
  expect(raided.sieges[`0:${target.id}`].raided).toBe(
    s.sieges[`0:${target.id}`].raided,
  );
  await expect(
    page.getByRole("button", { name: "Destroy town", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "No new goods to raid", exact: true }),
  ).toBeDisabled();
  nextOwnerTurn(raided);
  await page.locator("input[type=file]").setInputFiles({
    name: "next-turn.json",
    mimeType: "application/json",
    buffer: Buffer.from(serialize(raided)),
  });
  if (
    await page.getByRole("button", { name: "Close action panel" }).isVisible()
  )
    await page.getByRole("button", { name: "Close action panel" }).click();
  await page.getByTestId(`army-${tile}`).click();
  await page.getByRole("button", { name: "Destroy town", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm destruction", exact: true })
    .click();
  expect((await state(page)).towns[target.id]).toBeUndefined();
});

import { test, expect, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { newGame } from "../src/game/engine";
import { chooseAIAction } from "../src/game/ai";
import { run, piece } from "../tests/helpers";
import { ownTowns, inventory } from "../src/game/selectors";
import { GOODS } from "../src/game/types";
import { serialize, deserialize, SAVE_KEY } from "../src/game/save";

async function inPanelViewport(locator: Locator) {
  await expect(locator).toBeVisible();
  expect(
    await locator.evaluate((el) => {
      const r = el.getBoundingClientRect(),
        p = el.closest(".inspector-scroll")!.getBoundingClientRect();
      return (
        r.top >= p.top - 1 &&
        r.bottom <= p.bottom + 1 &&
        r.left >= p.left - 1 &&
        r.right <= p.right + 1
      );
    }),
  ).toBe(true);
}
async function state(page: Page) {
  return deserialize(
    await page.evaluate((key) => localStorage.getItem(key)!, SAVE_KEY),
  );
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
]) {
  test(`action-first inspector preserves controls and full information at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    let s = newGame("ford-clarity");
    while (s.phase.startsWith("setup")) s = run(s, chooseAIAction(s));
    s.phase = "economy";
    const home = ownTowns(s, 0)[0];
    home.level = home.turnLevel = 4;
    for (const good of GOODS) home.stock[good] = 500;
    s.players[0].turns = 10;
    const river = s.tiles["-4,4"];
    river.surface = "open";
    Object.assign(river.geography!, { ford: true, access: "ford" });
    for (const kind of [
      "heavy",
      "light",
      "cavalry",
      "artillery",
      "hunter",
    ] as const)
      for (let tier = 1; tier <= 4; tier++) piece(s, river.id, 0, kind, tier);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize(viewport);
    await page.addInitScript(
      ({ key, data }) => {
        localStorage.setItem(key, data);
        localStorage.setItem("catane-language", "en");
      },
      { key: SAVE_KEY, data: serialize(s) },
    );
    await page.goto("/");
    await page.getByRole("button", { name: /Continue campaign/ }).click();
    // Open by keyboard shortcut; camera coordinates differ across viewport sizes.
    await page.getByTestId(`army-${river.id}`).click();
    const move = page.getByRole("button", {
      name: "Move / attack with selected",
      exact: true,
    });
    await inPanelViewport(move);
    await expect(move).toBeEnabled();
    await expect(page.locator(".tile-condition-chips")).toContainText(
      "Ford open",
    );
    await expect(page.getByTestId(`army-${river.id}`)).toHaveAttribute(
      "aria-label",
      /F: harvesting formation/,
    );
    await page.getByTestId("inspector-details-toggle").click();
    await expect(page.locator(".geography-panel")).toBeVisible();
    await expect(page.locator(".ford-status")).toContainText(
      "land units can enter",
    );
    // Even clicking the already selected action rail returns to controls.
    await page
      .getByRole("navigation", { name: "Game actions" })
      .getByRole("button", { name: "Forces", exact: true })
      .click();
    await inPanelViewport(move);
    await page
      .locator(".inspector-scroll")
      .evaluate((el) => (el.scrollTop = el.scrollHeight));
    await page.getByRole("button", { name: "Trade", exact: true }).click();
    const trade = page.getByRole("button", { name: /^Exchange / });
    await page.getByLabel("Give goods").selectOption("gold");
    await page.getByLabel("Receive goods").selectOption("ore");
    await page.getByLabel("How many to receive", { exact: true }).fill("2");
    // Full tile information can be read without losing a partially configured order.
    await page.getByTestId("inspector-details-toggle").click();
    await page.getByRole("button", { name: "Actions", exact: true }).click();
    await expect(
      page.getByLabel("How many to receive", { exact: true }),
    ).toHaveValue("2");
    await inPanelViewport(trade);
    const before = inventory(await state(page));
    await trade.click();
    await expect
      .poll(async () => inventory(await state(page)).ore)
      .toBe(before.ore! + 2);
    await page.screenshot({
      path: `output/inspector/trade-${viewport.width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Build", exact: true }).click();
    await inPanelViewport(page.locator(".build-tools button").first());
    await page.getByTestId("inspector-details-toggle").click();
    await page
      .getByRole("button", { name: "Close action panel", exact: true })
      .click();
    await page.getByTestId(`town-${home.id}`).click();
    await page.getByRole("button", { name: "Forces", exact: true }).click();
    await page.getByLabel("Recruitment quantity").fill("2");
    await page.getByTestId("inspector-details-toggle").click();
    await page.getByRole("button", { name: "Actions", exact: true }).click();
    await expect(page.getByLabel("Recruitment quantity")).toHaveValue("2");
    const recruit = page.getByTestId("recruit-heavy").getByRole("button");
    await inPanelViewport(recruit);
    const beforeCount = Object.keys((await state(page)).pieces).length;
    await recruit.click();
    await expect
      .poll(async () => Object.keys((await state(page)).pieces).length)
      .toBe(beforeCount + 2);
    await page.screenshot({
      path: `output/inspector/recruit-${viewport.width}.png`,
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Close action panel", exact: true })
      .click();
    await page.getByTestId(`army-${river.id}`).click();
    await inPanelViewport(move);
    await move.click();
    await expect(page.locator(".right-panel")).not.toBeVisible();
    await expect(page.locator(".map-tile.reachable").first()).toBeVisible();
    // No document-level overflow; all long content uses the one inspector scroller.
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Trade", exact: true }).click();
    const audit = await new AxeBuilder({ page })
      .include(".right-panel")
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(audit.violations).toEqual([]);
    expect(errors).toEqual([]);
  });
}

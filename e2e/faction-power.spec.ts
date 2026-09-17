import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { funded, run } from "../tests/helpers";
import { factionStrengths } from "../src/game/ai-strategy";
import { ownTowns } from "../src/game/selectors";
import { newGame } from "../src/game/engine";
import { chooseAIAction } from "../src/game/ai";
import { REALM_NAMES } from "../src/game/content";
import { serialize, deserialize, SAVE_KEY } from "../src/game/save";
import type { Game } from "../src/game/types";
async function saved(page: Page, s: Game) {
  deserialize(serialize(s));
  await page.addInitScript(({ key, data }) => localStorage.setItem(key, data), {
    key: SAVE_KEY,
    data: serialize(s),
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
}
async function open(page: Page) {
  await page
    .getByRole("button", { name: "Realms & chronicle", exact: true })
    .click();
}

test("all faction scores match AI, rank correctly and offer accessible breakdowns", async ({
  page,
}) => {
  const s = funded();
  ownTowns(s, 2)[0].level = ownTowns(s, 2)[0].turnLevel = 4;
  const scores = factionStrengths(s);
  await saved(page, s);
  await expect(page.getByLabel("Faction power standings")).toHaveCount(0);
  await open(page);
  await expect(page.locator(".power-card")).toHaveCount(4);
  for (const p of s.players)
    await expect(page.getByTestId(`faction-score-${p.id}`)).toHaveText(
      scores[p.id].toFixed(1),
    );
  const ordered = [...s.players].sort(
    (a, b) => scores[b.id] - scores[a.id] || a.id - b.id,
  );
  await expect(page.locator(".power-card").first()).toHaveAttribute(
    "data-testid",
    `faction-power-${ordered[0].id}`,
  );
  await page.screenshot({
    path: `test-artifacts/faction-power-overview-${test.info().project.name}.png`,
  });
  await page.locator(".power-card").first().locator("summary").click();
  await expect(
    page.locator(".power-card").first().locator(".power-breakdown"),
  ).toContainText("Expected production");
  await page.screenshot({
    path: `test-artifacts/faction-power-${test.info().project.name}.png`,
  });
  const audit = await new AxeBuilder({ page })
    .include(".left-panel")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    audit.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
});

test("power updates after building without reloading", async ({ page }) => {
  const s = funded();
  const before = factionStrengths(s)[0];
  await saved(page, s);
  await open(page);
  await expect(page.getByTestId("faction-score-0")).toHaveText(
    before.toFixed(1),
  );
  await page
    .getByRole("button", { name: "Close realms and chronicle" })
    .click();
  await page.getByTestId(`town-${ownTowns(s)[0].id}`).click();
  await page.getByRole("button", { name: "Build", exact: true }).click();
  await page.getByRole("button", { name: /Build Palisade/ }).click();
  await open(page);
  await expect(page.getByTestId("faction-score-0")).toHaveText(
    (before + 1).toFixed(1),
  );
});

test("grand campaign exposes all ten realms including eliminated ones", async ({
  page,
}) => {
  let s = newGame(
    "grand-browser-test",
    REALM_NAMES.map((name, id) => ({
      name,
      control: id === 0 ? "human" : "standard",
    })),
  );
  while (s.phase.startsWith("setup")) s = run(s, chooseAIAction(s));
  s.players[7].alive = false;
  for (const t of ownTowns(s, 7)) delete s.towns[t.id];
  for (const [id, route] of Object.entries(s.routes))
    if (route.owner === 7) delete s.routes[id];
  const scores = factionStrengths(s);
  await saved(page, s);
  await open(page);
  await expect(page.locator(".power-card")).toHaveCount(10);
  for (const p of s.players) {
    const card = page.getByTestId(`faction-power-${p.id}`);
    await card.scrollIntoViewIfNeeded();
    await expect(page.getByTestId(`faction-score-${p.id}`)).toHaveText(
      scores[p.id].toFixed(1),
    );
    const rect = await card.boundingBox();
    expect(rect!.x).toBeGreaterThanOrEqual(0);
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(
      page.viewportSize()!.width,
    );
  }
  await expect(page.getByTestId("faction-power-7")).toContainText("Eliminated");
  await page.getByTestId("faction-power-7").locator("summary").click();
  await expect(page.getByTestId("faction-power-7").locator("dd")).toHaveText([
    "0.0",
    "0.0",
    "0.0",
  ]);
});

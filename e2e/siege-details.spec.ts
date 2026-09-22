import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { maritimeFixture } from "../tests/maritime-fixture";
import { piece } from "../tests/helpers";
import { serialize, SAVE_KEY } from "../src/game/save";
import { landAtVertex } from "../src/game/world";

for (const breached of [false, true])
  test(`siege badge and link open a detailed, accessible inspection (breached=${breached})`, async ({
    page,
  }, info) => {
    const { s, enemy: town } = maritimeFixture();
    town.level = town.turnLevel = 4;
    town.wall = 2;
    town.stock = { gold: 7, steel: 4 };
    const sides = landAtVertex(s, town.vertex);
    const artillery = piece(s, sides[0], 0, "artillery", 2);
    piece(s, sides[0], 0, "heavy", 3);
    piece(s, sides[1], 0, "artillery", 1);
    s.towers[town.vertex] = {
      id: "w900",
      vertex: town.vertex,
      owner: town.owner,
      tier: 1,
    };
    s.sieges[`0:${town.id}`] = {
      owner: 0,
      town: town.id,
      progress: 2,
      last: 10,
      raided: breached ? 10 : null,
      units: [artillery.id],
    };
    await page.addInitScript(
      ({ key, data }) => localStorage.setItem(key, data),
      { key: SAVE_KEY, data: serialize(s) },
    );
    await page.goto("/");
    await page.getByRole("button", { name: /Continue campaign/ }).click();
    await page
      .getByRole("button", { name: "Fit entire map", exact: true })
      .click();
    await page.getByTestId(`siege-badge-${town.id}`).click();
    const dialog = page.getByRole("dialog", { name: `Siege of ${town.name}` });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Siege defense breakdown")).toContainText(
      "6 total siege turns",
    );
    await expect(dialog).toContainText(
      "2 completed siege steps · 4 currently required · 2 remaining",
    );
    await expect(dialog).toContainText(
      "Siege power reduction: 2 turns · Required with this force: 4 turns",
    );
    await expect(dialog).toContainText(
      "Siege power reduction: 1 turns · Required with this force: 5 turns",
    );
    await expect(dialog).toContainText(
      "already operated against this town this turn",
    );
    await expect(dialog).toContainText(
      breached
        ? "Destruction unlocks next attacker turn"
        : "Complete 2 more siege steps",
    );
    await expect(dialog).toContainText("Gold");
    await expect(dialog.locator(".formation-group")).toHaveCount(3);
    expect(
      (await new AxeBuilder({ page }).include('[role="dialog"]').analyze())
        .violations,
    ).toEqual([]);
    await dialog.screenshot({
      path: `test-artifacts/formation-actions-siege-${breached}-${info.project.name}.png`,
    });
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await page
      .getByTestId(`siege-link-0-${town.id}-${sides[0]}`)
      .press("Enter");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByTestId(`town-${town.id}`).press("Enter");
    await page.getByRole("button", { name: "View full siege details" }).click();
    await expect(dialog).toBeVisible();
  });

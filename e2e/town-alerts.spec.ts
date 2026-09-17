import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { threatenedFixture } from "../tests/town-alert-fixture";
import { nextOwnerTurn, run } from "../tests/helpers";
import { serialize, SAVE_KEY } from "../src/game/save";
import { chooseAIAction } from "../src/game/ai";

for (const kind of ["siege", "raid", "destroy"] as const) {
  test(`an AI ${kind} notifies the defender and links to the town location`, async ({
    page,
  }) => {
    let { s, target, attacker } = threatenedFixture(
      kind === "siege" ? 4 : 1,
      kind === "siege" ? 2 : 0,
    );
    target.stock = { grain: 4, steel: 2 };
    if (kind === "destroy") {
      s = run(s, { type: "siege", town: target.id, ids: [attacker.id] });
      nextOwnerTurn(s);
      s.towns[target.id].stock = { wool: 5 };
    }
    expect(chooseAIAction(s)).toMatchObject({
      type: kind === "destroy" ? "destroy-town" : "siege",
      town: target.id,
    });
    await page.addInitScript(
      ({ key, data }) => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, data);
      },
      { key: SAVE_KEY, data: serialize(s) },
    );
    await page.goto("/");
    await page.getByRole("button", { name: /Continue campaign/ }).click();
    const alert = page.getByTestId("town-attack-alert");
    await expect(alert).toBeVisible();
    await page.getByRole("button", { name: "Pause AI", exact: true }).click();
    await expect(alert).toContainText(target.name);
    await expect(alert).toContainText("Tidewatch");
    if (kind !== "destroy")
      await expect(
        page.locator(`[data-testid^="siege-link-1-${target.id}-"]`),
      ).toHaveCount(1);
    if (kind === "raid") await expect(alert).toContainText("stole 6 goods");
    if (kind === "destroy") {
      await expect(alert).toContainText("Town destroyed");
      await expect(alert).toContainText(
        "5 remaining stored goods seized by the attacker",
      );
      await expect(page.getByTestId(`town-${target.id}`)).toHaveCount(0);
    } else {
      await expect(page.getByTestId(`siege-badge-${target.id}`)).toContainText(
        kind === "siege" ? "SIEGE 1/5" : "BREACHED",
      );
      if (kind === "siege")
        await expect(alert.getByRole("progressbar")).toHaveAttribute(
          "aria-valuenow",
          "1",
        );
    }
    if (kind === "siege") {
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        result.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
      ).toEqual([]);
      await page.screenshot({
        path: `test-artifacts/town-alert-${test.info().project.name}.png`,
      });
    }
    const before = await page.locator(".world-map").getAttribute("viewBox");
    await alert.getByRole("button", { name: "Show location" }).click();
    await expect(page.locator(".world-map")).not.toHaveAttribute(
      "viewBox",
      before!,
    );
    await expect(alert).toHaveCount(0);
    await page.screenshot({
      path: `test-artifacts/town-location-${kind}-${test.info().project.name}.png`,
    });
    if (kind !== "destroy")
      await expect(page.getByTestId(`siege-badge-${target.id}`)).toBeVisible();
    if (kind === "siege") {
      await page.reload();
      await page.getByRole("button", { name: /Continue campaign/ }).click();
      await expect(page.getByTestId(`siege-badge-${target.id}`)).toBeVisible();
      await expect(page.getByTestId("town-attack-alert")).toHaveCount(0);
    }
  });
}

test("attacks on a rival do not generate personal town alerts", async ({
  page,
}) => {
  const { s, target } = threatenedFixture();
  s.players[0].control = "standard";
  s.players[2].control = "human";
  expect(chooseAIAction(s)).toMatchObject({ type: "siege", town: target.id });
  await page.addInitScript(({ key, data }) => localStorage.setItem(key, data), {
    key: SAVE_KEY,
    data: serialize(s),
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await expect(page.getByTestId(`siege-badge-${target.id}`)).toBeVisible();
  await expect(page.getByTestId("town-attack-alert")).toHaveCount(0);
});

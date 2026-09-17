import { test, expect } from "@playwright/test";
import { funded } from "../tests/helpers";
import { ownTowns } from "../src/game/selectors";
import { serialize, SAVE_KEY } from "../src/game/save";

test("four recruitment tiers, new artwork and unlimited purchases survive reload", async ({
  page,
}) => {
  const s = funded(),
    town = ownTowns(s)[0];
  town.level = town.turnLevel = 4;
  await page.addInitScript(
    ({ key, data }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, data);
    },
    { key: SAVE_KEY, data: serialize(s) },
  );
  const missing: string[] = [];
  page.on("response", (r) => {
    if (r.status() >= 400) missing.push(r.url());
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await page.getByTestId(`town-${town.id}`).click();
  if (
    (await page.getByRole("button", { name: "Actions & realm" }).isVisible()) &&
    !(await page
      .locator(".right-panel")
      .evaluate((e) => e.classList.contains("mobile-open")))
  )
    await page.getByRole("button", { name: "Actions & realm" }).click();
  await page.getByRole("button", { name: "Forces", exact: true }).click();
  await page.getByRole("button", { name: "Tier II", exact: true }).click();
  await expect(
    page.getByText("Unlimited recruitment", { exact: false }),
  ).toBeVisible();
  const spearguard = page
    .locator(".recruit-card")
    .filter({ hasText: "Spearguard" });
  await expect(spearguard.locator("image")).toHaveAttribute(
    "href",
    "./assets/unit-tier-2.png",
  );
  for (let i = 0; i < 6; i++)
    await spearguard.getByRole("button", { name: /^Recruit / }).click();
  await page.getByRole("button", { name: "Tier IV", exact: true }).click();
  await page
    .locator(".recruit-card")
    .filter({ hasText: "Granite Praetorian" })
    .getByRole("button", { name: /^Recruit / })
    .click();
  const count = await page.evaluate(
    (key) =>
      Object.values(JSON.parse(localStorage.getItem(key)!).game.pieces).length,
    SAVE_KEY,
  );
  expect(count).toBe(7);
  await page.reload();
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  expect(
    await page.evaluate(
      (key) =>
        Object.values(JSON.parse(localStorage.getItem(key)!).game.pieces)
          .length,
      SAVE_KEY,
    ),
  ).toBe(7);
  expect(missing).toEqual([]);
});

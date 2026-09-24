import { test, expect } from "@playwright/test";
import { fishingFixture } from "../tests/maritime-fixture";
import { serialize, SAVE_KEY } from "../src/game/save";

test("offshore fishing recruitment exposes three tiers with artwork and working orders", async ({
  page,
}) => {
  const { s, home, water } = fishingFixture();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.url().includes("/assets/") && r.status() >= 400) errors.push(r.url());
  });
  await page.addInitScript(
    ({ key, data }) => {
      localStorage.setItem(key, data);
      localStorage.setItem("catane-language", "en");
    },
    { key: SAVE_KEY, data: serialize(s) },
  );
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await page.getByTestId(`town-${home.id}`).click();
  await page.getByRole("button", { name: "Forces", exact: true }).click();
  await page.getByRole("button", { name: "Navy", exact: true }).click();
  await page.getByLabel("Naval deployment").selectOption(water);
  await page.getByRole("button", { name: "Tier I", exact: true }).click();
  await expect(page.locator('[data-unit-kind="oceanfishing"]')).toHaveCount(0);
  for (const [tier, name, roman] of [
    [2, "Offshore Fisher", "II"],
    [3, "Whaling Carrack", "III"],
    [4, "Ocean Harvester", "IV"],
  ] as const) {
    await page
      .getByRole("button", { name: `Tier ${roman}`, exact: true })
      .click();
    await expect(
      page.locator(`image[href*="portrait-oceanfishing-${tier}-v1.webp"]`),
    ).toHaveCount(1);
    await page.getByRole("button", { name: new RegExp(name) }).click();
  }
  await expect(page.locator(".save-status")).toHaveText("Saved locally");
  const result = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).game,
    SAVE_KEY,
  );
  expect(
    Object.values(result.pieces).map((u: any) => [u.kind, u.tier]),
  ).toEqual([
    ["oceanfishing", 2],
    ["oceanfishing", 3],
    ["oceanfishing", 4],
  ]);
  expect(errors).toEqual([]);
});

import { test, expect } from "@playwright/test";
import { newGame } from "../src/game/engine";
import { serialize, SAVE_KEY } from "../src/game/save";

test("a sparse modern save displays restored specialist harbors after loading", async ({
  page,
}) => {
  const game = newGame(
    "port-audit-13",
    Array.from({ length: 12 }, (_, i) => ({
      name: `Realm ${i}`,
      control: "human" as const,
    })),
  );
  for (const edge of Object.values(game.edges))
    if (edge.harbor !== "generic") delete edge.harbor;
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(
    ({ key, data }) => {
      localStorage.setItem(key, data);
      localStorage.setItem("catane-language", "en");
    },
    { key: SAVE_KEY, data: serialize(game) },
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await page.getByRole("button", { name: "I am Realm 0", exact: true }).click();
  await expect(page.locator(".world-map")).toBeVisible();
  await expect(page.locator('.map-harbor[aria-label*="2:1"]')).toHaveCount(3);
  await expect(page.locator('.map-harbor[aria-label*="3:1"]')).toHaveCount(4);
  await page.screenshot({
    path: "output/ports/restored-specialist-ports.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

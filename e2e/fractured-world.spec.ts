import { test, expect } from "@playwright/test";
import { newGame } from "../src/game/engine";
import { chooseAIAction } from "../src/game/ai";
import { run } from "../tests/helpers";
import { serialize, SAVE_KEY } from "../src/game/save";
import { worldStructure } from "../src/game/world-structure";
const examples = new Map<string, string>();
for (let i = 0; i < 32 && examples.size < 3; i++) {
  const seed = `fracture-survey-${i}`,
    mode = worldStructure(seed);
  if (!examples.has(mode)) examples.set(mode, seed);
}
for (const [mode, seed] of examples)
  test(`${mode}: Grand Campaign renders and resumes`, async ({ page }) => {
    let s = newGame(
      seed,
      Array.from({ length: 12 }, (_, i) => ({
        name: `Realm ${i + 1}`,
        control: i === 0 ? ("human" as const) : ("standard" as const),
      })),
    );
    for (let i = 0; s.phase.startsWith("setup") && i < 60; i++)
      s = run(s, chooseAIAction(s));
    expect(s.phase.startsWith("setup")).toBe(false);
    s.active = 0;
    s.phase = "economy";
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(
      ({ key, data }) => {
        localStorage.setItem(key, data);
        localStorage.setItem("catane-language", "en");
      },
      { key: SAVE_KEY, data: serialize(s) },
    );
    await page.setViewportSize({ width: 1600, height: 1100 });
    await page.goto("/");
    await page.getByRole("button", { name: /Continue campaign/ }).click();
    const land = Object.values(s.tiles).find(
      (t) => !["water", "ice", "peaks"].includes(t.resource),
    )!;
    await page.getByTestId(`hex-${land.id}`).click();
    await page.getByTestId("inspector-details-toggle").click();
    await expect(page.locator(".landform-label")).toBeVisible();
    await page.screenshot({ path: `output/geography11/${mode}.png` });
    await page.reload();
    await page.getByRole("button", { name: /Continue campaign/ }).click();
    await expect(page.getByTestId(`hex-${land.id}`)).toBeVisible();
    expect(errors).toEqual([]);
  });

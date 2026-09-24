import { test, expect } from "@playwright/test";
import { newGame } from "../src/game/engine";
import { serialize, SAVE_KEY, assertInvariants } from "../src/game/save";
import {
  worldLandform,
  regionalLandform,
  type PhysicalLandform,
} from "../src/game/physical-landforms";
import { LANDFORM_LABELS } from "../src/ui/landform-labels";
for (const form of [
  "great-river-basins",
  "cuesta-belts",
  "lake-districts",
  "badlands",
] as PhysicalLandform[]) {
  test(`new landscape: ${form}`, async ({ page }) => {
    let seed = "";
    for (let i = 0; i < 2000; i++) {
      const candidate = `landscape-gallery-${i}`;
      if (
        worldLandform(candidate, 8) === form &&
        regionalLandform(candidate, "0,0", 8) === form
      ) {
        seed = candidate;
        break;
      }
    }
    expect(seed).not.toBe("");
    const s = newGame(
      seed,
      Array.from({ length: 12 }, (_, i) => ({
        name: `Realm ${i + 1}`,
        control: i === 0 ? ("human" as const) : ("standard" as const),
      })),
    );
    assertInvariants(s);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.url().includes("/assets/") && r.status() >= 400)
        errors.push(r.url());
    });
    await page.addInitScript(
      ({ key, data }) => {
        localStorage.setItem(key, data);
        localStorage.setItem("catane-language", "en");
      },
      { key: SAVE_KEY, data: serialize(s) },
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/");
    await page.getByRole("button", { name: /Continue campaign/ }).click();
    await expect(page.locator(".world-map")).toBeVisible();
    await page.getByTestId("hex-0,0").press("Enter");
    await expect(page.locator(".landform-label")).toContainText(
      LANDFORM_LABELS[form].en,
    );
    await page.evaluate(async () => {
      await Promise.all(
        [...document.querySelectorAll("image")].map(
          (el) =>
            new Promise<void>((resolve) => {
              const im = new Image();
              im.onload = () => resolve();
              im.onerror = () => resolve();
              im.src = el.getAttribute("href") ?? "";
            }),
        ),
      );
    });
    await page.screenshot({ path: `test-artifacts/landform-${form}.png` });
    expect(errors).toEqual([]);
  });
}

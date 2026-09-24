import { test, expect } from "@playwright/test";
import { newGame } from "../src/game/engine";
import { generateWorld } from "../src/game/world";
import { syncSeasonSurfaces } from "../src/game/seasons";
import { syncEnvironment } from "../src/game/environment";
import { chooseAIAction } from "../src/game/ai";
import { run } from "../tests/helpers";
import { serialize, assertInvariants } from "../src/game/save";
import { landform } from "../src/game/geography";

function fixture(size: number) {
  let index = 0;
  while (landform(`connected-water-${index}`) !== "inland-seas") index++;
  let s = newGame(`connected-water-${index}`);
  Object.assign(s, generateWorld(s.seed, size, true));
  s.wildlife = [];
  s.environmentRound = undefined;
  s.calendar = { ...s.calendar!, startSeason: "summer" };
  syncSeasonSurfaces(s);
  syncEnvironment(s);
  while (s.phase.startsWith("setup")) s = run(s, chooseAIAction(s));
  s.phase = "economy";
  assertInvariants(s);
  return s;
}
for (const size of [300, 850]) {
  test(`connected water and wildlife render on ${size} tiles`, async ({
    page,
  }) => {
    const s = fixture(size),
      errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.url().includes("/assets/") && r.status() >= 400)
        errors.push(r.url());
    });
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.addInitScript(() =>
      localStorage.setItem("catane-language", "en"),
    );
    await page.goto("/");
    await page.locator('input[type="file"]').setInputFiles({
      name: "water-test.json",
      mimeType: "application/json",
      buffer: Buffer.from(serialize(s)),
    });
    await expect(page.locator(".world-map")).toBeVisible();
    await expect(page.locator(".connected-water").first()).toBeAttached();
    await expect(page.locator(".wildlife-art").first()).toBeAttached();
    await page.waitForFunction(() =>
      [
        ...document.querySelectorAll<SVGImageElement>(
          ".connected-water image, .wildlife-art image",
        ),
      ].every((e) => !!e.href.baseVal),
    );
    if (size >= 800) {
      await expect(page.locator(".terrain-canvas")).toHaveAttribute(
        "data-terrain-status",
        "ready",
        { timeout: 30000 },
      );
      await expect(page.locator(".terrain-map")).toBeHidden();
    }
    const decoded = await page
      .locator(".connected-water image, .wildlife-art image")
      .evaluateAll(async (nodes) => {
        const urls = [...new Set(nodes.map((n) => n.getAttribute("href")!))];
        await Promise.all(
          urls.map(async (url) => {
            const im = new Image();
            im.src = url;
            await im.decode();
          }),
        );
        return urls.length;
      });
    expect(decoded).toBeGreaterThan(3);
    await page.screenshot({
      path: `test-artifacts/connected-water-${size}-${test.info().project.name}.png`,
    });
    const frame = page.locator(".world-map");
    const box = (await frame.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.5);
    await page.mouse.wheel(0, -450);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.58, {
      steps: 12,
    });
    await page.mouse.up();
    await page.screenshot({
      path: `test-artifacts/connected-water-detail-${size}-${test.info().project.name}.png`,
    });
    if (size >= 800)
      await expect(page.locator(".terrain-canvas")).toHaveAttribute(
        "data-terrain-status",
        "ready",
      );
    await page.locator(".map-view-select").selectOption("wildlife");
    await expect(page.locator(".wildlife-art").first()).toBeVisible();
    await page.locator(".map-view-select").selectOption("normal");
    if (size >= 800)
      await expect(page.locator(".terrain-canvas")).toHaveAttribute(
        "data-terrain-status",
        "ready",
        { timeout: 30000 },
      );
    expect(errors).toEqual([]);
  });
}

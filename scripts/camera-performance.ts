import { browserSave } from "./browser-save";
import { unpackSave } from "../src/storage/codec";
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { deserialize, serialize } from "../src/game/save";

// Example: SAVE_PATH=/path/to/export.json GAME_URL=http://127.0.0.1:4179
// LABEL=candidate npx tsx scripts/camera-performance.ts
// Disposable browser only. The export and the player's browser stay untouched.
if (!process.env.SAVE_PATH) throw Error("Set SAVE_PATH to a campaign export.");
const game = deserialize(
  await unpackSave(readFileSync(process.env.SAVE_PATH, "utf8")),
);
const viewer =
  game.players.find((p) => p.alive && p.control === "human") ??
  game.players.find((p) => p.alive)!;
viewer.control = "human";
game.active = viewer.id;
game.phase = "economy";
delete game.trade;
delete game.battle;
delete game.allianceOffer;
delete game.researchChoice;
const label = (process.env.LABEL ?? "camera").replace(/[^a-z0-9_-]/gi, "-");
const output = `test-artifacts/camera-${label}`;
mkdirSync("test-artifacts", { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem("catane-language", "en"));
  await page.addInitScript("window.__name = fn => fn");
  await page.goto(process.env.GAME_URL ?? "http://127.0.0.1:4173/");
  await page.locator("input[type=file]").setInputFiles({
    name: "performance-copy.json",
    mimeType: "application/json",
    buffer: Buffer.from(serialize(game)),
  });
  await page.locator(".board-frame").waitFor();
  const handoff = page.getByRole("button", {
    name: `I am ${viewer.name}`,
    exact: true,
  });
  if (await handoff.isVisible()) await handoff.click();
  await page.waitForLoadState("networkidle");
  await page
    .locator(".save-status:not(.bad)")
    .filter({ hasText: "Saved locally" })
    .waitFor();
  const originalSave = await browserSave(page);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  const box = (await page.locator(".board-frame").boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.48, box.y + box.height * 0.46);
  const results = [];
  for (const [name, sign, gap, count] of [
    ["zoom-in", -1, 120, 16],
    ["zoom-out", 1, 120, 16],
    ["rapid-in", -1, 16, 12],
    ["rapid-out", 1, 16, 12],
  ] as const) {
    const before = await cdp.send("Performance.getMetrics");
    // Keep frame observation inside the page, separate from CDP wheel latency.
    await page.evaluate(() => {
      const frames: number[] = [],
        longs: number[] = [];
      let last = performance.now(),
        raf = 0;
      const tick = (now: number) => {
        frames.push(now - last);
        last = now;
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) longs.push(entry.duration);
      });
      observer.observe({ type: "longtask" });
      Object.assign(window, {
        finishCameraProbe: () => {
          cancelAnimationFrame(raf);
          observer.disconnect();
          const sorted = frames.slice(2).sort((a, b) => a - b);
          return {
            median: sorted[Math.floor(sorted.length * 0.5)],
            p95: sorted[Math.floor(sorted.length * 0.95)],
            max: sorted.at(-1),
            over33: sorted.filter((n) => n > 33.5).length,
            frames: sorted.length,
            longs,
          };
        },
      });
    });
    for (let i = 0; i < count; i++) {
      await page.mouse.wheel(0, sign * 100);
      await page.waitForTimeout(gap);
    }
    await page.waitForTimeout(150);
    const frames = await page.evaluate(() =>
      (
        window as unknown as { finishCameraProbe: () => object }
      ).finishCameraProbe(),
    );
    const after = await cdp.send("Performance.getMetrics");
    const difference = (key: string) =>
      1000 *
      (after.metrics.find((m) => m.name === key)!.value -
        before.metrics.find((m) => m.name === key)!.value);
    results.push({
      name,
      ...frames,
      scriptMs: difference("ScriptDuration"),
      taskMs: difference("TaskDuration"),
      layoutMs: difference("LayoutDuration"),
      styleMs: difference("RecalcStyleDuration"),
    });
  }
  const saved = await browserSave(page);
  if (saved !== originalSave)
    throw Error("Camera input changed the campaign save");
  // Inspect the crowded center at normal playing scale, not just the overview.
  for (let i = 0; i < 8; i++) await page.mouse.wheel(0, -100);
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${output}.png` });
  const result = {
    tiles: Object.keys(game.tiles).length,
    towns: Object.keys(game.towns).length,
    units: Object.keys(game.pieces).length,
    results,
    errors,
  };
  writeFileSync(`${output}.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  if (errors.length) throw Error("Camera interaction raised a browser error");
} finally {
  await browser.close();
}

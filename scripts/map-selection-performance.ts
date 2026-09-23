import { chromium } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { importSave } from "../src/storage/codec";
import { deserialize, serialize } from "../src/game/save";
import { browserSave } from "./browser-save";

// Human-turn selection in a disposable browser. Camera/artwork are settled
// before measurement; no DOM-wide observers run during the timed interactions.
if (!process.env.SAVE_PATH)
  throw Error("Set SAVE_PATH to an exported campaign.");
const game = await importSave(readFileSync(process.env.SAVE_PATH));
game.active = game.players.find((p) => p.alive && p.control === "human")!.id;
game.phase = "economy";
delete game.trade;
delete game.battle;
delete game.allianceOffer;
delete game.researchChoice;
const label = (process.env.LABEL ?? "campaign").replace(/[^a-z0-9_-]/gi, "-");
const prefix = `test-artifacts/map-selection-${label}`;
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
  await page.addInitScript("window.__name = fn => fn");
  await page.addInitScript(() => localStorage.setItem("catane-language", "en"));
  await page.goto(process.env.GAME_URL ?? "http://127.0.0.1:4173/");
  await page.locator("input[type=file]").setInputFiles({
    name: "selection-copy.json",
    mimeType: "application/json",
    buffer: Buffer.from(serialize(game)),
  });
  await page.locator(".board-frame").waitFor();
  await page.waitForLoadState("networkidle");
  await page
    .locator(".save-status:not(.bad)")
    .filter({ hasText: "Saved locally" })
    .waitFor();
  const original = await browserSave(page);
  if (
    !original ||
    JSON.stringify(deserialize(original)) !== JSON.stringify(game)
  )
    throw Error("Imported campaign differs from the fixture.");
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  const samples = [];
  for (let sample = 0; sample < Number(process.env.SAMPLES ?? 3); sample++) {
    if (process.env.PROFILE_SELECTION && sample === 0) {
      await cdp.send("Profiler.enable");
      await cdp.send("Profiler.start");
    }
    const before = await cdp.send("Performance.getMetrics");
    const result = await page.evaluate(async () => {
      const tiles = [...document.querySelectorAll(".map-tile")]
        .filter((_, i) => i % 47 === 0)
        .slice(0, 30);
      const times: number[] = [];
      for (const tile of tiles) {
        const start = performance.now();
        tile.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
        if (!tile.classList.contains("selected"))
          throw Error("Selection did not update.");
        times.push(performance.now() - start);
      }
      const sorted = times.slice().sort((a, b) => a - b);
      return {
        count: times.length,
        median: sorted[Math.floor(sorted.length * 0.5)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        times,
      };
    });
    const after = await cdp.send("Performance.getMetrics");
    if (process.env.PROFILE_SELECTION && sample === 0) {
      const { profile } = await cdp.send("Profiler.stop");
      writeFileSync(`${prefix}.cpuprofile`, JSON.stringify(profile));
    }
    const delta = (key: string) =>
      1000 *
      (after.metrics.find((m) => m.name === key)!.value -
        before.metrics.find((m) => m.name === key)!.value);
    samples.push({
      ...result,
      taskMs: delta("TaskDuration"),
      scriptMs: delta("ScriptDuration"),
      layoutMs: delta("LayoutDuration"),
      styleMs: delta("RecalcStyleDuration"),
    });
    if ((await browserSave(page)) !== original)
      throw Error("Selection changed the campaign.");
  }
  const report = {
    tiles: Object.keys(game.tiles).length,
    towns: Object.keys(game.towns).length,
    units: Object.keys(game.pieces).length,
    samples,
    stateHash: createHash("sha256").update(JSON.stringify(game)).digest("hex"),
    errors,
  };
  writeFileSync(`${prefix}.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (errors.length) throw Error("Browser errors during selection.");
} finally {
  await browser.close();
}

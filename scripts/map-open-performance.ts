import { chromium } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { importSave } from "../src/storage/codec";
import { deserialize, serialize } from "../src/game/save";
import { browserSave } from "./browser-save";

// Warm-asset refresh and map opening in a disposable profile, with AI paused.
// SAVE_PATH=... LABEL=before GAME_URL=http://127.0.0.1:4173 npx tsx scripts/map-open-performance.ts
if (!process.env.SAVE_PATH) throw Error("Set SAVE_PATH to a campaign export.");
const game = await importSave(readFileSync(process.env.SAVE_PATH));
const viewer = game.players.find((p) => p.alive && p.control === "human")!;
game.active = viewer.id;
game.phase = "economy";
delete game.trade;
delete game.battle;
delete game.allianceOffer;
delete game.researchChoice;
const label = (process.env.LABEL ?? "campaign").replace(/[^a-z0-9_-]/gi, "-");
const prefix = `test-artifacts/map-open-${label}`;
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
  await page.addInitScript(() => {
    localStorage.setItem("catane-language", "en");
    const w = window as any;
    w.mapProbe = {
      decoding: 0,
      decodes: 0,
      urls: new Set(),
      menu: 0,
      tasks: [],
    };
    const original = HTMLImageElement.prototype.decode;
    HTMLImageElement.prototype.decode = function () {
      w.mapProbe.decoding++;
      w.mapProbe.decodes++;
      w.mapProbe.urls.add(this.src);
      return original.call(this).finally(() => w.mapProbe.decoding--);
    };
    new MutationObserver(() => {
      if (
        !w.mapProbe.menu &&
        Array.from(document.querySelectorAll("button")).some((b) =>
          b.textContent?.startsWith("Continue campaign"),
        )
      )
        w.mapProbe.menu = performance.now();
    }).observe(document, { subtree: true, childList: true });
    new PerformanceObserver((list) => {
      w.mapProbe.tasks.push(
        ...list
          .getEntries()
          .map((e) => ({ start: e.startTime, ms: e.duration })),
      );
    }).observe({ type: "longtask" });
  });
  await page.goto(process.env.GAME_URL ?? "http://127.0.0.1:4173/");
  await page.locator("input[type=file]").setInputFiles({
    name: "map-copy.json",
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
  if (!original) throw Error("The imported campaign was not saved");
  const expected = JSON.stringify(deserialize(original));
  if (expected !== JSON.stringify(game))
    throw Error("The imported campaign differs from the prepared fixture");
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  const samples = [];
  for (let i = 0; i < Number(process.env.SAMPLES ?? 3); i++) {
    await page.reload();
    await page.getByRole("button", { name: /Continue campaign/ }).waitFor();
    if (process.env.PROFILE_OPEN && i === 0) {
      await cdp.send("Profiler.enable");
      await cdp.send("Profiler.start");
    }
    const before = await cdp.send("Performance.getMetrics");
    const result = await page.evaluate(async () => {
      const w = window as any,
        start = performance.now();
      const button = Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent?.startsWith("Continue campaign"),
      )!;
      button.click();
      let mounted = 0,
        quiet = 0;
      for (;;) {
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
        if (performance.now() - start > 30000)
          throw Error("Map did not finish opening");
        if (!document.querySelector(".board-frame")) continue;
        mounted ||= performance.now();
        const layer = document.querySelector<HTMLElement>(".map-camera-layer");
        quiet =
          w.mapProbe.decoding || !layer || layer.style.display === "none"
            ? 0
            : quiet + 1;
        if (quiet >= 3) break;
      }
      return {
        refreshMenuMs: w.mapProbe.menu,
        decodes: w.mapProbe.decodes,
        uniqueDecodes: w.mapProbe.urls.size,
        openMs: performance.now() - start,
        mountMs: mounted - start,
        nodes: document.querySelector(".board-frame")!.querySelectorAll("*")
          .length,
        sprites: document.querySelectorAll('image[href^="data:image/svg+xml"]')
          .length,
        tasks: w.mapProbe.tasks.filter(
          (t: { start: number; ms: number }) => t.start + t.ms > start,
        ),
      };
    });
    const after = await cdp.send("Performance.getMetrics");
    if (process.env.PROFILE_OPEN && i === 0) {
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
      throw Error("Opening the map changed the campaign");
  }
  const result = {
    tiles: Object.keys(game.tiles).length,
    towns: Object.keys(game.towns).length,
    units: Object.keys(game.pieces).length,
    samples,
    stateHash: createHash("sha256").update(expected).digest("hex"),
    errors,
  };
  writeFileSync(`${prefix}.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  if (errors.length) throw Error("Map opening raised a browser error");
} finally {
  await browser.close();
}

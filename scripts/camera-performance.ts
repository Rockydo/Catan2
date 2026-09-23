import { browserSave } from "./browser-save";
import { unpackSave } from "../src/storage/codec";
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { deserialize, serialize } from "../src/game/save";

// Example: SAVE_PATH=/path/to/export.json GAME_URL=http://127.0.0.1:4179
// LABEL=candidate npx tsx scripts/camera-performance.ts
// Disposable browser only. The export and the player's browser stay untouched.
if (!process.env.SAVE_PATH) throw Error("Set SAVE_PATH to a campaign export.");
const game = deserialize(await unpackSave(readFileSync(process.env.SAVE_PATH)));
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
const graphics = process.env.GRAPHICS ?? "software";
if (!["software", "hardware"].includes(graphics))
  throw Error("GRAPHICS must be software or hardware.");
function positiveOption(name: string, fallback: number) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value) || value <= 0)
    throw Error(`${name} must be a finite positive number.`);
  return value;
}
const viewport = {
  width: Math.round(positiveOption("WIDTH", 1920)),
  height: Math.round(positiveOption("HEIGHT", 1080)),
};
const deviceScaleFactor = positiveOption("DPR", 1);
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", ...(graphics === "hardware" ? ["--enable-gpu"] : [])],
});
try {
  const system = await browser.newBrowserCDPSession(),
    { gpu } = await system.send("SystemInfo.getInfo"),
    rendering = {
      requested: graphics,
      renderer: gpu.auxAttributes?.glRenderer,
      features: gpu.featureStatus,
    };
  await system.detach();
  if (
    graphics === "hardware" &&
    gpu.featureStatus?.gpu_compositing !== "enabled"
  )
    throw Error(
      "Hardware compositing is unavailable; refusing a silently software-rendered comparison.",
    );
  const page = await browser.newPage({
    viewport,
    deviceScaleFactor,
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
  if (process.env.PROBE_CSS)
    await page.addStyleTag({ content: process.env.PROBE_CSS });
  const sceneState = () =>
    page.evaluate(() => ({
      terrainRenderer:
        document.querySelector<HTMLCanvasElement>(".terrain-canvas")?.style
          .display === "block"
          ? "canvas"
          : "svg",
      terrainStatus:
        document.querySelector<HTMLElement>(".terrain-canvas")?.dataset
          .terrainStatus,
      terrainTextureBytes: Number(
        document.querySelector<HTMLElement>(".terrain-canvas")?.dataset
          .textureBytes || 0,
      ),
      sprites: Object.fromEntries(
        [
          ".town-miniature",
          ".production-token-art",
          ".army-miniature-art",
          ".guild-miniature-art",
          ".tower-miniature-art",
        ].map((selector) => [
          selector,
          {
            count: document.querySelectorAll(selector).length,
            prepared: document.querySelectorAll(selector + " > image").length,
          },
        ]),
      ),
    }));
  const sceneBeforePreparation = await sceneState();
  let preparationWaitMs: number | undefined;
  if (process.env.WAIT_SPRITES) {
    const start = performance.now();
    await page.waitForFunction(() => {
      const nodes = document.querySelectorAll(
        ".town-miniature,.production-token-art,.army-miniature-art,.guild-miniature-art,.tower-miniature-art",
      );
      return (
        nodes.length > 0 &&
        Array.from(nodes).every((node) => node.querySelector(":scope > image"))
      );
    });
    preparationWaitMs = performance.now() - start;
  }
  if (process.env.WAIT_GPU) {
    const start = performance.now();
    await page
      .locator('.terrain-canvas[data-terrain-status="ready"]')
      .waitFor({ state: "visible", timeout: 30000 });
    preparationWaitMs = (preparationWaitMs ?? 0) + performance.now() - start;
  }
  const initialScene = await sceneState();
  const originalSave = await browserSave(page);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  if (process.env.TRACE_CAMERA)
    await cdp.send("Tracing.start", {
      categories:
        "devtools.timeline,blink.user_timing,disabled-by-default-devtools.timeline.frame",
      transferMode: "ReturnAsStream",
    });
  const box = (await page.locator(".board-frame").boundingBox())!;
  const pointer = { x: box.x + box.width * 0.48, y: box.y + box.height * 0.46 };
  await page.mouse.move(pointer.x, pointer.y);
  const results = [];
  for (const [name, sign, gap, count, dragging] of [
    ["zoom-in", -1, 120, 16, false],
    ["zoom-out", 1, 120, 16, false],
    ["rapid-in", -1, 16, 12, false],
    ["rapid-out", 1, 16, 12, false],
    ["pan-right", 1, 16, 30, true],
    ["pan-left", -1, 16, 30, true],
    ["near-pan-right", 1, 16, 30, true],
    ["near-pan-left", -1, 16, 30, true],
  ] as const) {
    if (name === "near-pan-right") {
      for (let i = 0; i < 8; i++) await page.mouse.wheel(0, -100);
      await page.waitForTimeout(200);
    }
    await page.mouse.move(pointer.x, pointer.y);
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
    if (dragging) await page.mouse.down();
    for (let i = 0; i < count; i++) {
      if (dragging)
        await page.mouse.move(
          pointer.x + sign * (i + 1) * 10,
          pointer.y + sign * (i + 1) * 3,
        );
      else await page.mouse.wheel(0, sign * 100);
      await page.waitForTimeout(gap);
    }
    if (dragging) await page.mouse.up();
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
  if (process.env.TRACE_CAMERA) {
    const done = new Promise<string>((resolve) =>
      cdp.once("Tracing.tracingComplete", (data) => resolve(data.stream!)),
    );
    await cdp.send("Tracing.end");
    const stream = await done,
      parts: string[] = [];
    for (;;) {
      const data = await cdp.send("IO.read", { handle: stream });
      parts.push(data.data);
      if (data.eof) break;
    }
    await cdp.send("IO.close", { handle: stream });
    writeFileSync(`${output}.trace.json`, parts.join(""));
  }
  if (saved !== originalSave)
    throw Error("Camera input changed the campaign save");
  // Inspect the crowded center at normal playing scale, not just the overview.
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${output}.png` });
  const result = {
    rendering,
    viewport,
    deviceScaleFactor,
    preparationWaitMs,
    sceneBeforePreparation,
    initialScene,
    finalScene: await sceneState(),
    tiles: Object.keys(game.tiles).length,
    towns: Object.keys(game.towns).length,
    units: Object.keys(game.pieces).length,
    ...(process.env.PROBE_CSS ? { diagnosticCss: process.env.PROBE_CSS } : {}),
    results,
    errors,
  };
  writeFileSync(`${output}.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  if (errors.length) throw Error("Camera interaction raised a browser error");
} finally {
  await browser.close();
}

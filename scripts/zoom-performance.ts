import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { SAVE_KEY } from "../src/game/save";
const label = process.env.LABEL ?? "zoom-before",
  gap = Number(process.env.GAP ?? 160);
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
  });
  await page.addInitScript("window.__name = fn => fn");
  await page.addInitScript(({ key, data }) => localStorage.setItem(key, data), {
    key: SAVE_KEY,
    data: readFileSync("test-artifacts/map-release-1000-save.json", "utf8"),
  });
  await page.goto("http://127.0.0.1:4173/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  const handoff = page.getByRole("button", { name: "I am Emberhold" });
  if (await handoff.isVisible()) await handoff.click();
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
  if (process.env.HIDE_TEXT)
    await page.addStyleTag({
      content: ".map-camera-layer text {display:none !important}",
    });
  if (process.env.NO_FILTERS)
    await page.addStyleTag({
      content: ".map-camera-layer * {filter:none !important}",
    });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  const start = await cdp.send("Performance.getMetrics");
  await page.evaluate(() => {
    const w = window as any;
    w.frames = [];
    w.boxes = [];
    w.wheels = [];
    w.sharpFrames = [];
    w.blurSpans = [];
    document
      .querySelector(".world-map")!
      .addEventListener("wheel", () => w.wheels.push(performance.now()), {
        capture: true,
      });
    w.boxObserver = new MutationObserver((entries) => {
      for (const e of entries)
        if (e.attributeName === "viewBox") w.boxes.push(performance.now());
    });
    w.boxObserver.observe(document.querySelector(".world-map"), {
      attributes: true,
      attributeFilter: ["viewBox"],
    });
    w.tasks = [];
    let last = performance.now();
    let blurrySince = 0;
    const layer = document.querySelector<HTMLElement>(".map-camera-layer")!;
    const map = document.querySelector(".world-map")!;
    let lastSharpBox = map.getAttribute("viewBox");
    function tick(now: number) {
      const observed = performance.now();
      w.frames.push(now - last);
      last = now;
      if (layer.style.transform) {
        if (!blurrySince) blurrySince = observed;
      } else {
        if (blurrySince) w.blurSpans.push(observed - blurrySince);
        blurrySince = 0;
        const box = map.getAttribute("viewBox");
        if (box !== lastSharpBox && w.wheels.length) {
          w.sharpFrames.push({
            at: observed,
            sinceWheel: observed - w.wheels.at(-1),
          });
          lastSharpBox = box!;
        }
      }
      w.frame = requestAnimationFrame(tick);
    }
    w.frame = requestAnimationFrame(tick);
    w.observer = new PerformanceObserver((list) =>
      w.tasks.push(...list.getEntries().map((e) => e.duration)),
    );
    w.observer.observe({ type: "longtask" });
  });
  const box = (await page.locator(".board-frame").boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.52, box.y + box.height * 0.45);
  // Real mouse-wheel notches with gaps, then continue interacting at deep zoom.
  for (let i = 0; i < 30; i++) {
    await page.mouse.wheel(0, -100);
    await page.waitForTimeout(gap);
  }
  await page.waitForTimeout(800);
  const deepStart = await cdp.send("Performance.getMetrics");
  if (process.env.TRACE)
    await cdp.send("Tracing.start", {
      categories: "devtools.timeline",
      transferMode: "ReturnAsStream",
    });
  for (let i = 0; i < 12; i++) {
    await page.mouse.wheel(0, i % 2 ? 100 : -100);
    await page.waitForTimeout(gap + 20);
  }
  await page.waitForTimeout(800);
  const end = await cdp.send("Performance.getMetrics");
  if (process.env.TRACE) {
    const complete = new Promise<{ stream?: string }>((resolve) =>
      cdp.once("Tracing.tracingComplete", resolve),
    );
    await cdp.send("Tracing.end");
    const { stream } = await complete;
    if (!stream) throw Error("Trace did not return a stream");
    let trace = "";
    for (;;) {
      const chunk = await cdp.send("IO.read", { handle: stream });
      trace += chunk.data;
      if (chunk.eof) break;
    }
    await cdp.send("IO.close", { handle: stream });
    writeFileSync(`test-artifacts/${label}-trace.json`, trace);
  }
  const measured = await page.evaluate(() => {
    const w = window as any;
    cancelAnimationFrame(w.frame);
    w.observer.disconnect();
    const v = w.frames.slice(3).sort((a: number, b: number) => a - b);
    return {
      median: v[Math.floor(v.length * 0.5)],
      p95: v[Math.floor(v.length * 0.95)],
      max: Math.max(...v),
      longTasks: w.tasks,
      boxChanges: w.boxes,
      wheelTimes: w.wheels,
      sharpFrames: w.sharpFrames,
      maxBlurMs: Math.max(0, ...w.blurSpans),
    };
  });
  const metric = (a: typeof start, b: typeof start, name: string) =>
    b.metrics.find((m) => m.name === name)!.value -
    a.metrics.find((m) => m.name === name)!.value;
  const result = {
    ...measured,
    scriptMs: metric(start, end, "ScriptDuration") * 1000,
    taskMs: metric(start, end, "TaskDuration") * 1000,
    layouts: metric(start, end, "LayoutCount"),
    deepTaskMs: metric(deepStart, end, "TaskDuration") * 1000,
    deepLayoutMs: metric(deepStart, end, "LayoutDuration") * 1000,
    deepStyleMs: metric(deepStart, end, "RecalcStyleDuration") * 1000,
    deepScriptMs: metric(deepStart, end, "ScriptDuration") * 1000,
    scene: await page.locator("[data-map-x]").evaluateAll((nodes) => ({
      total: nodes.length,
      shown: nodes.filter((e) => getComputedStyle(e).display !== "none").length,
    })),
  };
  await page.screenshot({ path: `test-artifacts/${label}.png` });
  writeFileSync(
    `test-artifacts/${label}.json`,
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}

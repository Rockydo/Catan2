import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { newGame } from "../src/game/engine";
import { chooseAIAction } from "../src/game/ai";
import { generateWorld } from "../src/game/world";
import { REALM_NAMES } from "../src/game/content";
import { settlementSites, routeKind, moveTargets } from "../src/game/selectors";
import { serialize, SAVE_KEY, assertInvariants } from "../src/game/save";
import { piece, run } from "../tests/helpers";

const label = process.env.LABEL ?? "map-before",
  size = Number(process.env.TILES ?? 1000);
let s = newGame(
  "map-performance",
  REALM_NAMES.map((name) => ({ name, control: "human" })),
);
while (s.phase.startsWith("setup")) s = run(s, chooseAIAction(s));
Object.assign(s, generateWorld(s.seed, size));
s.phase = "economy";
s.active = 0;
s.players.forEach((p) => (p.turns = 20));
const template = Object.values(s.towns)[0];
for (let i = 0; i < Math.min(100, size / 5); i++) {
  const vertex = settlementSites(s, 0, true)[0];
  if (!vertex) break;
  const id = `t${s.nextId++}`;
  s.towns[id] = {
    ...structuredClone(template),
    id,
    vertex,
    name: `Town ${i}`,
    owner: i % 8,
    level: 2,
    turnLevel: 2,
    extensions: {},
    stock: { lumber: 20, brick: 20, grain: 20, wool: 20, ore: 20 },
  };
}
for (const [i, e] of Object.values(s.edges)
  .filter((_, i) => i % 5 === 0)
  .entries()) {
  s.routes[e.id] = {
    id: `r${s.nextId++}`,
    edge: e.id,
    owner: i % 8,
    kind: routeKind(s, e.id),
    born: 0,
    camps: {},
  };
}
for (const [i, tile] of Object.values(s.tiles)
  .filter((_, i) => i % 4 === 0)
  .entries()) {
  piece(s, tile.id, i % 8, tile.resource === "water" ? "galley" : "heavy", 2);
}
assertInvariants(s);
writeFileSync(`test-artifacts/${label}-save.json`, serialize(s));
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
  });
  await page.addInitScript("window.__name = (fn) => fn;");
  await page.addInitScript(({ key, data }) => localStorage.setItem(key, data), {
    key: SAVE_KEY,
    data: serialize(s),
  });
  await page.goto("http://127.0.0.1:4173");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  const handoff = page.getByRole("button", { name: "I am Emberhold" });
  if (await handoff.isVisible()) await handoff.click();
  await page.locator(".world-map").waitFor();
  await page.evaluate(() =>
    Promise.all(
      Array.from(document.images).map((i) => i.decode().catch(() => {})),
    ),
  );
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState("networkidle");
  const session = await page.context().newCDPSession(page);
  await session.send("Performance.enable");
  const before = await session.send("Performance.getMetrics");
  const timings = await page.evaluate(async () => {
    const map = document.querySelector<SVGSVGElement>(".world-map")!,
      rect = map.getBoundingClientRect();
    const frames: number[] = [],
      longTasks: number[] = [];
    let mutations = 0;
    const observer = new MutationObserver(
      (entries) => (mutations += entries.length),
    );
    observer.observe(map, { subtree: true, attributes: true, childList: true });
    const performanceObserver = new PerformanceObserver((list) =>
      longTasks.push(...list.getEntries().map((e) => e.duration)),
    );
    performanceObserver.observe({ type: "longtask" });
    const send = (type: string, x: number, y: number, buttons = 1) =>
      map.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          clientX: x,
          clientY: y,
          pointerId: 1,
          pointerType: "mouse",
          button: 0,
          buttons,
        }),
      );
    const x = rect.x + rect.width / 2,
      y = rect.y + rect.height / 2;
    let last = performance.now();
    send("pointerdown", x, y);
    for (let i = 0; i < 100; i++) {
      await new Promise<void>((resolve) =>
        requestAnimationFrame((now) => {
          frames.push(now - last);
          last = now;
          send(
            "pointermove",
            x + Math.sin(i / 15) * 220,
            y + Math.cos(i / 15) * 120,
          );
          resolve();
        }),
      );
    }
    send("pointerup", x, y, 0);
    const zoomFrames: number[] = [];
    last = performance.now();
    for (let i = 0; i < 40; i++) {
      await new Promise<void>((resolve) =>
        requestAnimationFrame((now) => {
          zoomFrames.push(now - last);
          last = now;
          map.dispatchEvent(
            new WheelEvent("wheel", {
              bubbles: true,
              cancelable: true,
              clientX: x,
              clientY: y,
              deltaY: i < 20 ? -60 : 60,
            }),
          );
          resolve();
        }),
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
    observer.disconnect();
    performanceObserver.disconnect();
    const summary = (values: number[]) => {
      const sorted = values.slice(2).sort((a, b) => a - b);
      return {
        median: sorted[Math.floor(sorted.length * 0.5)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        max: Math.max(...sorted),
      };
    };
    return {
      pan: summary(frames),
      zoom: summary(zoomFrames),
      longTasks,
      mutations,
      nodes: document.querySelector(".board-frame")!.querySelectorAll("*")
        .length,
      interactiveNodes: map.querySelectorAll("*").length,
      patterns: document
        .querySelector(".board-frame")!
        .querySelectorAll("pattern").length,
    };
  });
  const cameraMetrics = await session.send("Performance.getMetrics");
  await page.evaluate(() => {
    const measured = window as unknown as {
      cameraFrames: number[];
      cameraFrame: number;
    };
    measured.cameraFrames = [];
    let last = performance.now();
    const tick = (now: number) => {
      measured.cameraFrames.push(now - last);
      last = now;
      measured.cameraFrame = requestAnimationFrame(tick);
    };
    measured.cameraFrame = requestAnimationFrame(tick);
  });
  const bounds = (await page.locator(".board-frame").boundingBox())!;
  const origin = {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
  await page.mouse.move(origin.x, origin.y);
  await page.mouse.down();
  for (let i = 0; i < 50; i++) {
    await page.mouse.move(
      origin.x + Math.sin(i / 10) * 200,
      origin.y + Math.cos(i / 10) * 100,
    );
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
  const realPan = await page.evaluate(() => {
    const measured = window as unknown as {
      cameraFrames: number[];
      cameraFrame: number;
    };
    cancelAnimationFrame(measured.cameraFrame);
    const frames = measured.cameraFrames.slice(3).sort((a, b) => a - b);
    return {
      median: frames[Math.floor(frames.length * 0.5)],
      p95: frames[Math.floor(frames.length * 0.95)],
    };
  });
  const selection = await page.evaluate(async () => {
    const tiles = [...document.querySelectorAll(".map-tile")]
      .filter((_, i) => i % 47 === 0)
      .slice(0, 20);
    const times: number[] = [];
    for (const tile of tiles) {
      const start = performance.now();
      tile.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    return {
      median: times[Math.floor(times.length * 0.5)],
      p95: times[Math.floor(times.length * 0.95)],
    };
  });
  let movement: { elapsedMs: number; destination: string } | null = null;
  const peacefulTargets = (id: string) =>
    Object.keys(moveTargets(s, [id])).filter(
      (tile) =>
        !Object.values(s.pieces).some((u) => u.tile === tile && u.owner !== 0),
    );
  const mover = Object.values(s.pieces).find(
    (u) =>
      u.owner === 0 &&
      s.tiles[u.tile].resource !== "water" &&
      peacefulTargets(u.id).length,
  );
  if (mover) {
    await page.getByTestId(`army-${mover.tile}`).dispatchEvent("click");
    await page.getByRole("button", { name: "Forces", exact: true }).click();
    const start = performance.now();
    await page
      .getByRole("button", { name: /Move \/ attack with selected/ })
      .click();
    const destination = peacefulTargets(mover.id)[0];
    const target = page.getByTestId(`hex-${destination}`);
    await target.dispatchEvent("click");
    await page.waitForFunction(
      ({ key, id, destination }) =>
        JSON.parse(localStorage.getItem(key)!).game.pieces[id].tile ===
        destination,
      { key: SAVE_KEY, id: mover.id, destination },
    );
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    movement = { elapsedMs: performance.now() - start, destination };
  }
  const idleBefore = await session.send("Performance.getMetrics");
  await page.waitForTimeout(2000);
  const after = await session.send("Performance.getMetrics");
  const idle = {
    scriptMs:
      (after.metrics.find((m) => m.name === "ScriptDuration")!.value -
        idleBefore.metrics.find((m) => m.name === "ScriptDuration")!.value) *
      1000,
    taskMs:
      (after.metrics.find((m) => m.name === "TaskDuration")!.value -
        idleBefore.metrics.find((m) => m.name === "TaskDuration")!.value) *
      1000,
  };

  const metric = (name: string) =>
    cameraMetrics.metrics.find((m) => m.name === name)!.value -
    before.metrics.find((m) => m.name === name)!.value;
  const result = {
    tiles: size,
    towns: Object.keys(s.towns).length,
    units: Object.keys(s.pieces).length,
    ...timings,
    realPan,
    selection,
    movement,
    idle,
    scriptMs: metric("ScriptDuration") * 1000,
    taskMs: metric("TaskDuration") * 1000,
    layouts: metric("LayoutCount"),
    heapMB:
      after.metrics.find((m) => m.name === "JSHeapUsedSize")!.value /
      1024 /
      1024,
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

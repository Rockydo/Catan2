import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { importSave } from "../src/storage/codec";
import { serialize } from "../src/game/save";
import { beginTurn } from "../src/game/engine";
import { browserSave } from "./browser-save";
if (!process.env.SAVE_PATH)
  throw Error("Set SAVE_PATH to an exported campaign.");
const game = await importSave(readFileSync(process.env.SAVE_PATH));
const batchLimit = process.env.BATCH_LIMIT
  ? Number(process.env.BATCH_LIMIT)
  : undefined;
if (
  batchLimit !== undefined &&
  (!Number.isInteger(batchLimit) || batchLimit < 1)
)
  throw Error("BATCH_LIMIT must be a positive integer.");
if (process.env.AI_SEAT !== undefined) {
  const seat = Number(process.env.AI_SEAT);
  if (
    !Number.isInteger(seat) ||
    !game.players[seat]?.alive ||
    game.players[seat].control === "human"
  )
    throw Error("AI_SEAT must be the index of a surviving AI faction.");
  game.active = seat;
  beginTurn(game);
  game.phase = "economy";
}
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({
      viewport: { width: 1920, height: 1080 },
    }),
    errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(
    ({ actor, humans, batchLimit }) => {
      const w = window as any;
      w.__name = (f: any) => f;
      localStorage.setItem("catane-ai-pacing", "20");
      localStorage.setItem("catane-language", "en");
      const p: any = (w.probe = {
        start: 0,
        done: 0,
        rows: [],
        commands: [],
        frames: [],
        longs: [],
        jsonMs: 0,
        jsonCalls: 0,
        postMs: 0,
        maxPostMs: 0,
        uploadChunks: 0,
        uploads: [],
        taskTimes: [],
        fullRequests: 0,
        continuedRequests: 0,
        savePostMs: 0,
        saveFullRequests: 0,
        saveDeltaRequests: 0,
        saveForwardedDeltas: 0,
      });
      const stringify = JSON.stringify;
      JSON.stringify = function (...args: any[]) {
        const t = performance.now();
        const result = Reflect.apply(stringify, JSON, args);
        if (p.start && !p.done) {
          p.jsonMs += performance.now() - t;
          p.jsonCalls++;
        }
        return result;
      };
      const Native = window.Worker;
      const receivedDeltas = new WeakSet<object>();
      window.Worker = class extends Native {
        ai = false;
        constructor(url: string | URL, options?: WorkerOptions) {
          super(url, options);
          this.ai = String(url).includes("ai.worker");
          if (!this.ai) return;
          this.addEventListener("message", ({ data: d }) => {
            if (d.resync) return;
            if (d.delta) receivedDeltas.add(d.delta);
            p.rows.push({ cpu: d.ms, error: d.error });
            if (d.commands) for (const c of d.commands) p.commands.push(c);
            const active = d.state?.active ?? d.delta?.values.active;
            const visible = d.state ?? d.delta?.values;
            const responder =
              visible?.battle?.loser ??
              visible?.trade?.to ??
              visible?.allianceOffer?.approvals?.[0] ??
              visible?.allianceOffer?.to;
            const prompt =
              responder !== undefined && humans.includes(responder);
            if (
              (active !== undefined && active !== actor) ||
              prompt ||
              d.error ||
              (batchLimit !== undefined && p.rows.length >= batchLimit)
            ) {
              p.stopReason = d.error
                ? "error"
                : prompt
                  ? "human-decision"
                  : active !== undefined && active !== actor
                    ? "turn-boundary"
                    : "batch-limit";
              p.done = performance.now();
              p.lastActions = d.state?.actions ?? d.delta?.values.actions;
            }
          });
        }
        postMessage(data: any) {
          if (!this.ai) {
            const started = performance.now();
            super.postMessage(data);
            if (data.type === "save" && p.start && !p.done) {
              p.savePostMs += performance.now() - started;
              if (data.game) p.saveFullRequests++;
              if (data.delta) {
                p.saveDeltaRequests++;
                if (receivedDeltas.has(data.delta)) p.saveForwardedDeltas++;
              }
            }
            return;
          }
          if (p.done) return;
          if (!p.start) p.start = performance.now();
          const t = performance.now();
          if (data.state) {
            p.fullRequests++;
            p.uploads.push({ start: t });
          } else if (data.upload === "pieces") p.uploadChunks++;
          else if (!data.upload) p.continuedRequests++;
          super.postMessage(data);
          const elapsed = performance.now() - t;
          p.postMs += elapsed;
          p.maxPostMs = Math.max(p.maxPostMs, elapsed);
          if ((data.state && !data.upload) || data.upload === "ready")
            p.uploads.at(-1).end = performance.now();
        }
      };
      new PerformanceObserver((list) => {
        if (p.start && !p.done)
          for (const e of list.getEntries()) {
            p.longs.push(e.duration);
            p.taskTimes.push({ start: e.startTime, duration: e.duration });
          }
      }).observe({ type: "longtask" });
      let last = performance.now();
      const tick = (now: number) => {
        if (p.start && !p.done) p.frames.push(now - last);
        last = now;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },
    {
      actor: game.active,
      batchLimit,
      humans: game.players
        .filter((p) => p.control === "human")
        .map((p) => p.id),
    },
  );
  await page.goto(process.env.GAME_URL ?? "http://127.0.0.1:4173/");
  await page.locator("input[type=file]").setInputFiles({
    name: "performance-copy.json",
    mimeType: "application/json",
    buffer: Buffer.from(serialize(game)),
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  const before = await cdp.send("Performance.getMetrics");
  if (process.env.PROFILE_UI) {
    await cdp.send("Profiler.enable");
    await cdp.send("Profiler.start");
  }
  await page.getByRole("button", { name: "Resume AI", exact: true }).click();
  const progress = setInterval(() => {
    void page
      .evaluate(() => {
        const p = (window as any).probe;
        return {
          elapsedMs: p.start ? performance.now() - p.start : 0,
          batches: p.rows.length,
          orders: p.commands.length,
          last: p.commands.at(-1)?.type,
        };
      })
      .then((value) => console.log(JSON.stringify({ progress: value })))
      .catch(() => {});
  }, 15000);
  try {
    await page.waitForFunction(
      () => {
        const p = (window as any).probe;
        if (
          !p.done &&
          /AI paused:|The AI took too long/.test(
            document.body.textContent ?? "",
          )
        ) {
          p.done = performance.now();
          p.failure = document.body.textContent?.slice(-1800);
        }
        return !!p.done;
      },
      {},
      { timeout: Number(process.env.TIMEOUT_MS ?? 240000) },
    );
  } catch (error) {
    console.error(
      await page.evaluate(() => ({
        text: document.body.textContent?.slice(-1800),
        batches: (window as any).probe.rows.length,
        last: (window as any).probe.commands.at(-1),
      })),
    );
    throw error;
  } finally {
    clearInterval(progress);
  }
  const failure = await page.evaluate(() => (window as any).probe.failure);
  if (failure) throw Error(failure);
  await page.waitForTimeout(200);
  const probe = await page.evaluate(() => (window as any).probe);
  const metrics = await cdp.send("Performance.getMetrics");
  const metricMs = (name: string) =>
    1000 *
    ((metrics.metrics.find((m) => m.name === name)?.value ?? 0) -
      (before.metrics.find((m) => m.name === name)?.value ?? 0));
  const profile = process.env.PROFILE_UI
    ? (await cdp.send("Profiler.stop")).profile
    : undefined;
  let saved = JSON.parse((await browserSave(page))!).game;
  for (let i = 0; i < 20 && saved.actions !== probe.lastActions; i++) {
    await page.waitForTimeout(100);
    saved = JSON.parse((await browserSave(page))!).game;
  }
  if (saved.actions !== probe.lastActions)
    throw Error("Final snapshot was not saved");
  const sorted = probe.frames.sort((a: number, b: number) => a - b);
  const result = {
    stoppedAt: probe.stopReason,
    elapsedMs: probe.done - probe.start,
    cpuMs: probe.rows.reduce((n: number, r: any) => n + (r.cpu ?? 0), 0),
    orders: probe.commands.length,
    batches: probe.rows.length,
    fullRequests: probe.fullRequests,
    continuedRequests: probe.continuedRequests,
    jsonMs: probe.jsonMs,
    jsonCalls: probe.jsonCalls,
    postMs: probe.postMs,
    maxPostMs: probe.maxPostMs,
    uploadChunks: probe.uploadChunks,
    uploadMs: probe.uploads.reduce(
      (n: number, u: any) => n + (u.end - u.start),
      0,
    ),
    uploadLongTasks: probe.taskTimes.filter((t: any) =>
      probe.uploads.some(
        (u: any) => t.start < u.end && t.start + t.duration > u.start,
      ),
    ),
    savePostMs: probe.savePostMs,
    saveFullRequests: probe.saveFullRequests,
    saveDeltaRequests: probe.saveDeltaRequests,
    saveForwardedDeltas: probe.saveForwardedDeltas,
    frameP95: sorted[Math.floor(sorted.length * 0.95)],
    longTasks: probe.longs,
    mainThread: {
      taskMs: metricMs("TaskDuration"),
      scriptMs: metricMs("ScriptDuration"),
      layoutMs: metricMs("LayoutDuration"),
      styleMs: metricMs("RecalcStyleDuration"),
    },
    errors,
    finalHash: createHash("sha256").update(JSON.stringify(saved)).digest("hex"),
    commands: probe.commands,
  };
  const expected = process.env.EXPECT_PATH
    ? JSON.parse(readFileSync(process.env.EXPECT_PATH, "utf8"))
    : undefined;
  if (
    expected &&
    (JSON.stringify(expected.commands) !== JSON.stringify(result.commands) ||
      expected.finalHash !== result.finalHash)
  )
    throw Error("AI decisions or final state changed");
  mkdirSync("test-artifacts", { recursive: true });
  const label = (process.env.LABEL ?? "result").replace(/[^a-z0-9_-]/gi, "-");
  if (profile)
    writeFileSync(
      `test-artifacts/ai-transfer-${label}.cpuprofile`,
      JSON.stringify(profile),
    );
  writeFileSync(
    `test-artifacts/ai-transfer-${label}.json`,
    JSON.stringify(result, null, 2),
  );
  console.log(
    JSON.stringify({
      ...result,
      commands: undefined,
      longTasks: result.longTasks.length,
    }),
  );
  if (errors.length || probe.rows.some((r: any) => r.error))
    throw Error("Browser/worker error");
} finally {
  await browser.close();
}

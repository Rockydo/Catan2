import { chromium } from "@playwright/test";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { deserialize } from "../src/game/save";
import { chooseAIAction } from "../src/game/ai";
import { applyCommand } from "../src/game/engine";
import type { Game } from "../src/game/types";
const cases = [];
for (const file of [
  "alliance-growth-ai-5-save",
  "alliance-growth-ai-10-save",
  "coalition-audit-8-save",
]) {
  let s = deserialize(readFileSync(`test-artifacts/${file}.json`, "utf8"));
  const states: Game[] = [];
  const actors = new Set<number>();
  let eligible = 0;
  for (
    let i = 0;
    i < 300 && states.length < 40 && s.phase !== "finished";
    i++
  ) {
    if (
      s.phase === "economy" &&
      !s.battle &&
      !s.trade &&
      !s.allianceOffer &&
      !s.researchChoice
    ) {
      if (eligible++ % 4 === 0) {
        states.push(s);
        actors.add(s.active);
      }
    }
    const result = applyCommand(s, chooseAIAction(s));
    if (!result.ok) throw Error(result.error);
    s = result.state;
  }
  const info = {
    file,
    samples: states.length,
    actors: [...actors],
    round: s.round,
    tiles: Object.keys(s.tiles).length,
    towns: Object.keys(s.towns).length,
    pieces: Object.keys(s.pieces).length,
  };
  console.log("Collected", JSON.stringify(info));
  cases.push({ info, states });
}
const workerUrl = `/assets/${readdirSync("dist/assets").find((f) => f.startsWith("ai.worker-") && f.endsWith(".js"))}`;
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  await page.addInitScript("window.__name = fn => fn");
  await page.goto("http://127.0.0.1:4173/");
  const reports = await page.evaluate(
    async ({ cases, workerUrl }) => {
      const worker = new Worker(workerUrl, { type: "module" });
      let request = 0;
      const measure = (state: any, difficulty: string) =>
        new Promise<{ ms: number; roundTripMs: number; type: string }>(
          (resolve, reject) => {
            const copy = structuredClone(state);
            for (const p of copy.players)
              if (p.control !== "human" || p.id === copy.active)
                p.control = difficulty;
            const t = performance.now();
            const timeout = setTimeout(
              () => reject(Error("Worker timed out")),
              20000,
            );
            worker.onerror = (e) => {
              clearTimeout(timeout);
              reject(Error(e.message));
            };
            worker.onmessage = (e) => {
              clearTimeout(timeout);
              if (e.data.error) reject(Error(e.data.error));
              else
                resolve({
                  ms: e.data.ms,
                  roundTripMs: performance.now() - t,
                  type: e.data.command.type,
                });
            };
            worker.postMessage({ state: copy, request: request++ });
          },
        );
      const results = [];
      try {
        for (let i = 0; i < 8; i++)
          await measure(
            cases[0].states[i % cases[0].states.length],
            i % 2 ? "hard" : "standard",
          );
        for (const { info, states } of cases) {
          const rows: {
            sample: number;
            repeat: number;
            difficulty: string;
            ms: number;
            roundTripMs: number;
            type: string;
          }[] = [];
          for (let repeat = 0; repeat < 3; repeat++)
            for (let i = 0; i < states.length; i++) {
              for (const difficulty of (i + repeat) % 2
                ? ["hard", "standard"]
                : ["standard", "hard"])
                rows.push({
                  sample: i,
                  repeat,
                  difficulty,
                  ...(await measure(states[i], difficulty)),
                });
            }
          const metrics = (difficulty: string) => {
            const selected = rows.filter((r) => r.difficulty === difficulty);
            const ms = selected.map((r) => r.ms).sort((a, b) => a - b);
            return {
              decisions: ms.length,
              meanMs: ms.reduce((a, b) => a + b, 0) / ms.length,
              medianMs: ms[Math.floor(ms.length / 2)],
              p95Ms: ms[Math.floor(ms.length * 0.95)],
              roundTripMeanMs:
                selected.reduce((n, r) => n + r.roundTripMs, 0) /
                selected.length,
            };
          };
          const standard = metrics("standard"),
            hard = metrics("hard");
          results.push({
            info,
            standard,
            hard,
            ratio: hard.meanMs / standard.meanMs,
            rows,
          });
        }
      } finally {
        worker.terminate();
      }
      return results;
    },
    { cases, workerUrl },
  );
  writeFileSync(
    "test-artifacts/difficulty-performance.json",
    JSON.stringify(reports, null, 2),
  );
  console.log(
    JSON.stringify(
      reports.map(({ rows, ...r }) => r),
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}

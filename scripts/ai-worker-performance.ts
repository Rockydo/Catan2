import { chromium } from "@playwright/test";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { deserialize } from "../src/game/save";
import { applyCommand } from "../src/game/engine";
import type { Command, Game } from "../src/game/types";
const label = process.env.LABEL ?? "grand-ai-worker-check";
const commands: Command[] = JSON.parse(
  readFileSync("test-artifacts/grand-ai-before.json", "utf8"),
).commands;
let state = deserialize(
  readFileSync("test-artifacts/coalition-audit-8-save.json", "utf8"),
);
const samples: { state: Game; command: Command }[] = [];
for (const command of commands) {
  if (state.phase === "economy") samples.push({ state, command });
  if (samples.length === 10) break;
  const result = applyCommand(state, command);
  if (!result.ok) throw Error(result.error);
  state = result.state;
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
  const result = await page.evaluate(
    async ({ samples, workerUrl }) => {
      const reports = [];
      for (const reuse of [false, true]) {
        let worker: Worker | undefined;
        const rows = [];
        try {
          for (let i = 0; i < samples.length; i++) {
            const start = performance.now();
            worker ??= new Worker(workerUrl, { type: "module" });
            const reply = await new Promise<{
              command: unknown;
              ms: number;
              error?: string;
            }>((resolve, reject) => {
              const timeout = setTimeout(
                () => reject(Error("Worker timeout")),
                20000,
              );
              worker!.onerror = (event) => {
                clearTimeout(timeout);
                reject(Error(event.message));
              };
              worker!.onmessage = (event) => {
                clearTimeout(timeout);
                resolve(event.data);
              };
              worker!.postMessage({ state: samples[i].state, request: i });
            });
            if (
              reply.error ||
              JSON.stringify(reply.command) !==
                JSON.stringify(samples[i].command)
            )
              throw Error(reply.error ?? "Worker changed its decision");
            rows.push({
              decisionMs: reply.ms,
              roundTripMs: performance.now() - start,
            });
            if (!reuse) {
              worker.terminate();
              worker = undefined;
            }
          }
          reports.push({ reuse, rows });
        } finally {
          worker?.terminate();
        }
      }
      return reports;
    },
    { samples, workerUrl },
  );
  writeFileSync(
    `test-artifacts/${label}.json`,
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}

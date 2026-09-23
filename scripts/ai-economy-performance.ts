import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Game } from "../src/game/types";

// Run each checkout in a separate process: mixing copies of the engine in one
// V8 isolate changes warmup and inline-cache behavior even for identical code.
if (!process.env.SAVE_PATH)
  throw Error("Set SAVE_PATH to an exported campaign.");
const root = resolve(process.env.SOURCE_ROOT ?? ".");
const module = (file: string) => pathToFileURL(resolve(root, "src", file)).href;
const { importSave } = await import(module("storage/codec.ts"));
const { economyProjects } = await import(module("game/ai.ts"));
const { withPlanningFrame } = await import(module("game/selectors.ts"));
const samples = Number(process.env.SAMPLES ?? 7);
if (!Number.isInteger(samples) || samples < 1) throw Error("Invalid SAMPLES.");
const source: Game = await importSave(readFileSync(process.env.SAVE_PATH));
const before = JSON.stringify(source);
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const expected = process.env.EXPECT_PATH
  ? JSON.parse(readFileSync(process.env.EXPECT_PATH, "utf8"))
  : undefined;
const campaignHash = hash(before);
if (expected && expected.campaignHash !== campaignHash)
  throw Error("The reference used a different campaign.");
const durations: number[] = [];
let resultHash = "",
  projects = 0;
for (let sample = -3; sample < samples; sample++) {
  const state = structuredClone(source);
  const start = performance.now();
  const result = withPlanningFrame(state, () => economyProjects(state));
  const elapsed = performance.now() - start;
  const digest = hash(JSON.stringify(result));
  if (
    (resultHash && digest !== resultHash) ||
    (expected && digest !== expected.resultHash)
  )
    throw Error("Economic project costs, scores or order changed.");
  resultHash = digest;
  projects = result.length;
  if (JSON.stringify(state) !== before)
    throw Error("Planning mutated the campaign.");
  if (sample >= 0) durations.push(elapsed);
}
if (JSON.stringify(source) !== before) throw Error("Source campaign changed.");
const report = {
  tiles: Object.keys(source.tiles).length,
  towns: Object.keys(source.towns).length,
  units: Object.keys(source.pieces).length,
  projects,
  samples,
  medianMs: [...durations].sort((a, b) => a - b)[
    Math.floor(durations.length / 2)
  ],
  durations,
  resultHash,
  campaignHash,
};
mkdirSync("test-artifacts", { recursive: true });
writeFileSync(
  `test-artifacts/ai-economy-${process.env.LABEL ?? "comparison"}.json`,
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));

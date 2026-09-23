import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { importSave } from "../src/storage/codec";
import type { Game, Piece } from "../src/game/types";

// Compare nearby threat planning with the same rules in a prior checkout.
// Fresh immutable snapshots prevent warm caches from hiding index setup costs.
if (!process.env.SAVE_PATH || !process.env.SOURCE_ROOT)
  throw Error(
    "Set SAVE_PATH and SOURCE_ROOT to a campaign and reference checkout.",
  );
const samples = Number(process.env.SAMPLES ?? 7);
if (!Number.isInteger(samples) || samples < 1) throw Error("Invalid SAMPLES.");
const source = await importSave(readFileSync(process.env.SAVE_PATH));
const before = JSON.stringify(source);
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
async function reader(root: string) {
  const module = (file: string) =>
    pathToFileURL(resolve(root, "src/game", `${file}.ts`)).href;
  const { townThreats } = await import(module("ai-strategy"));
  const { withPlanningFrame } = await import(module("selectors"));
  return (state: Game) =>
    withPlanningFrame(state, () =>
      Object.values(state.towns).map((town) =>
        (townThreats(state, town) as Piece[]).map((u) => u.id),
      ),
    );
}
const readers = [await reader(process.env.SOURCE_ROOT), await reader(".")];
const durations: number[][] = [[], []];
let expected = "";
for (let sample = -1; sample < samples; sample++) {
  for (const index of sample % 2 === 0 ? [1, 0] : [0, 1]) {
    const state = structuredClone(source);
    const start = performance.now();
    const result = readers[index](state);
    const elapsed = performance.now() - start;
    const serialized = JSON.stringify(result);
    if (!expected) expected = serialized;
    if (serialized !== expected)
      throw Error("Threat membership or order changed.");
    if (JSON.stringify(state) !== before)
      throw Error("Planning mutated the campaign.");
    if (sample >= 0) durations[index].push(elapsed);
  }
}
if (JSON.stringify(source) !== before) throw Error("Source campaign changed.");
const median = (values: number[]) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const report = {
  tiles: Object.keys(source.tiles).length,
  towns: Object.keys(source.towns).length,
  units: Object.keys(source.pieces).length,
  samples,
  beforeMs: median(durations[0]),
  afterMs: median(durations[1]),
  durations,
  resultHash: hash(expected),
  campaignHash: hash(before),
};
mkdirSync("test-artifacts", { recursive: true });
writeFileSync(
  `test-artifacts/ai-threat-${process.env.LABEL ?? "comparison"}.json`,
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));

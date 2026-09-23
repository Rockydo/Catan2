import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { unpackSave } from "../src/storage/codec";

// Read an exported copy only. SOURCE_ROOT can select an earlier checkout;
// EXPECT_PATH compares every complete roll state, delivery list and forecast.
if (!process.env.SAVE_PATH) throw Error("Set SAVE_PATH to a campaign export.");
const root = resolve(process.env.SOURCE_ROOT ?? ".");
const moduleAt = (name: string) =>
  pathToFileURL(`${root}/src/game/${name}.ts`).href;
const { deserialize } = await import(moduleAt("save"));
const { production } = await import(moduleAt("economy"));
const {
  productionSources,
  forecastProduction,
  productionSignature,
  withPlanningFrame,
  withProductionTerrainRead,
} = await import(moduleAt("selectors"));
const { projectedIncomes, withSeasonalPlanning } = await import(
  moduleAt("ai-seasonal")
);
const game = deserialize(await unpackSave(readFileSync(process.env.SAVE_PATH)));
const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const expected = process.env.EXPECT_PATH
  ? JSON.parse(readFileSync(process.env.EXPECT_PATH, "utf8"))
  : undefined;
// Recreate the read-only decision each time: repeated calls within one frame
// intentionally use a cached signature and would hide its construction cost.
const signatureMs = [];
let signature = "";
for (let sample = 0; sample < 5; sample++) {
  const started = performance.now();
  const current = withPlanningFrame(game, () => productionSignature(game));
  signatureMs.push(performance.now() - started);
  if (sample && current !== signature)
    throw Error("Unchanged production inputs changed their signature.");
  signature = current;
}
// Model consecutive immutable decisions sharing a protected terrain snapshot.
// Older checkouts have no scope; both must return their same complete key on
// every read. These are fingerprint queries, not executed commands or AI turns.
const signatureBatchSamplesMs = [];
const terrainScope =
  withProductionTerrainRead ?? ((_tiles: unknown, run: () => void) => run());
for (let sample = 0; sample < 5; sample++) {
  const start = performance.now();
  terrainScope(game.tiles, () => {
    for (let i = 0; i < 32; i++) {
      const view = { ...game };
      const current = withPlanningFrame(view, () => productionSignature(view));
      if (current !== signature)
        throw Error("A terrain read scope changed the production signature.");
    }
  });
  signatureBatchSamplesMs.push(performance.now() - start);
}
// Repeated terrain-derived output queries across changing decision views.
// This isolates harvest reuse; it is not a whole AI-turn measurement.
const harvestModes = [
  "current",
  "annual",
  "spring",
  "summer",
  "autumn",
  "winter",
];
const harvestBatchSamplesMs: number[] = [];
let harvestBatchHash = "";
for (let sample = 0; sample < 5; sample++) {
  const outputs: unknown[] = [];
  const start = performance.now();
  terrainScope(game.tiles, () => {
    for (let i = 0; i < 32; i++) {
      const view = { ...game, actions: game.actions + i };
      outputs.push(
        withPlanningFrame(view, () =>
          forecastProduction(
            view,
            harvestModes[i % harvestModes.length],
            (tile: string, amount: number) =>
              ((6 - Math.abs(7 - view.tiles[tile].number)) / 36) * amount,
          ),
        ),
      );
    }
  });
  harvestBatchSamplesMs.push(performance.now() - start);
  const hash = digest(outputs);
  if (
    (harvestBatchHash && hash !== harvestBatchHash) ||
    (expected?.harvestBatchHash && hash !== expected.harvestBatchHash)
  )
    throw Error("Protected harvest forecasts changed their ordered result.");
  harvestBatchHash = hash;
}
const deliveries = [
  "current",
  "annual",
  "spring",
  "summer",
  "autumn",
  "winter",
].map((mode) => {
  const sources = withPlanningFrame(game, () => productionSources(game, mode));
  return {
    mode,
    count: sources.length,
    hash: digest(
      sources.map((v: any) => [v.owner, v.town.id, v.tile, v.good, v.amount]),
    ),
  };
});
const forecastTimings: { rolls: number; ms: number }[] = [];
const forecasts = [1, 6, 16, 40].map((rolls) => {
  const started = performance.now();
  const outputs = withSeasonalPlanning(() =>
    withPlanningFrame(game, () => projectedIncomes(game, rolls)),
  );
  forecastTimings.push({ rolls, ms: performance.now() - started });
  return { rolls, hash: digest(outputs) };
});
const rolls = [];
for (let roll = 2; roll <= 12; roll++) {
  const state = structuredClone(game);
  const start = performance.now();
  production(state, roll);
  const ms = performance.now() - start;
  const hash = digest(state);
  if (
    expected &&
    expected.rolls.find((r: any) => r.roll === roll)?.hash !== hash
  )
    throw Error(`Roll ${roll} changed the complete campaign state.`);
  rolls.push({ roll, ms, hash });
}
if (
  expected &&
  (JSON.stringify(deliveries) !== JSON.stringify(expected.deliveries) ||
    JSON.stringify(forecasts) !== JSON.stringify(expected.forecasts))
)
  throw Error("Production delivery order or seasonal forecast changed.");
const report = {
  source: root,
  tiles: Object.keys(game.tiles).length,
  towns: Object.keys(game.towns).length,
  units: Object.keys(game.pieces).length,
  signatureBytes: Buffer.byteLength(signature),
  signatureMedianMs: [...signatureMs].sort((a, b) => a - b)[2],
  signatureSamplesMs: signatureMs,
  signatureBatchReads: 32,
  signatureBatchMedianMs: [...signatureBatchSamplesMs].sort((a, b) => a - b)[2],
  signatureBatchSamplesMs,
  harvestBatchReads: 32,
  harvestBatchMedianMs: [...harvestBatchSamplesMs].sort((a, b) => a - b)[2],
  harvestBatchSamplesMs,
  harvestBatchHash,
  deliveries,
  forecasts,
  forecastTimings,
  rolls,
  medianRollMs: rolls.map((r) => r.ms).sort((a, b) => a - b)[5],
  exactMatch: !!expected,
};
const label = (process.env.LABEL ?? "campaign").replace(/[^a-z0-9_-]/gi, "-");
mkdirSync("test-artifacts", { recursive: true });
const output = `test-artifacts/production-${label}.json`;
writeFileSync(output, JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    {
      ...report,
      deliveries: deliveries.length,
      forecasts: forecasts.length,
      rolls: rolls.length,
      output,
    },
    null,
    2,
  ),
);

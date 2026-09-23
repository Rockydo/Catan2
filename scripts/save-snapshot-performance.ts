import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { importSave } from "../src/storage/codec";
import * as current from "../src/game/save";

// Compare immutable autosave packing. No browser storage or playing campaign
// is touched; archive comparisons run outside the measured intervals.
if (!process.env.SAVE_PATH || !process.env.SOURCE_ROOT)
  throw Error(
    "Set SAVE_PATH and SOURCE_ROOT to an export and reference checkout.",
  );
const reference = await import(
  pathToFileURL(resolve(process.env.SOURCE_ROOT, "src/game/save.ts")).href
);
const game = await importSave(readFileSync(process.env.SAVE_PATH));
const original = JSON.stringify(game);
const next = { ...game, actions: game.actions + 1 };
const packers = [
  reference.createSnapshotSerializer(),
  current.createSnapshotSerializer(),
];
const payload = (text: string) => {
  const { savedAt, ...data } = JSON.parse(text);
  return JSON.stringify(data);
};
const expected = payload(current.serializePacked(next));
for (const pack of packers) pack(game);
const times: number[][] = [[], []];
for (let i = 0; i < 7; i++)
  for (const index of i % 2 ? [1, 0] : [0, 1]) {
    const start = performance.now();
    const result = packers[index](next);
    times[index].push(performance.now() - start);
    if (payload(result) !== expected) throw Error("Changed archive payload.");
  }
if (JSON.stringify(game) !== original) throw Error("Changed source campaign.");
const median = (values: number[]) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const report = {
  tiles: Object.keys(game.tiles).length,
  towns: Object.keys(game.towns).length,
  units: Object.keys(game.pieces).length,
  unchangedArmySave: {
    beforeMs: median(times[0]),
    afterMs: median(times[1]),
    samples: times,
  },
  exactRoundTrip: true,
  stateHash: createHash("sha256").update(original).digest("hex"),
};
const label = (process.env.LABEL ?? "campaign").replace(/[^a-z0-9_-]/gi, "-");
mkdirSync("test-artifacts", { recursive: true });
writeFileSync(
  `test-artifacts/save-snapshot-${label}.json`,
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));

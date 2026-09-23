import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { importSave } from "../src/storage/codec";
import { copyRecords } from "../src/game/record-copy";
import type { Piece } from "../src/game/types";

// Isolated dictionary work, not whole turns. Measure both implementations in
// the same runtime, alternating their order across samples. Use exported data.
if (!process.env.SAVE_PATH)
  throw Error("Set SAVE_PATH to an exported campaign.");
const game = await importSave(readFileSync(process.env.SAVE_PATH));
const units = Object.values(game.pieces);
if (!units.length) throw Error("The export must contain troops.");
type Records = Record<string, Piece>;
type Patch = { values: Records; keys?: readonly string[] };
function reference(source: Records, patch?: Patch): Records {
  if (!patch) return { ...source };
  return patch.keys
    ? Object.fromEntries(
        patch.keys.map((key) => [
          key,
          Object.hasOwn(patch.values, key) ? patch.values[key] : source[key],
        ]),
      )
    : { ...source, ...patch.values };
}
const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const results = [];
let guard = 0;
for (const count of [15_000, 60_000, 240_000]) {
  const source: Records = {};
  for (let i = 0; i < count; i++) {
    const id = `u${i}`;
    source[id] = { ...units[i % units.length], id };
  }
  Object.freeze(source);
  const beforeHash = hash(source),
    keys = Object.keys(source);
  const changes: Records = {},
    recruits: Records = {};
  for (let i = 0; i < 100; i++) {
    changes[`u${i}`] = { ...source[`u${i}`], moved: source[`u${i}`].moved + 1 };
    const id = `u${count + i}`;
    recruits[id] = { ...source[`u${i}`], id };
  }
  for (const [operation, patch] of [
    ["copy", undefined],
    ["move-100", { values: changes }],
    [
      "recruit-100",
      { values: recruits, keys: [...keys, ...Object.keys(recruits)] },
    ],
  ] as const) {
    const expected = reference(source, patch),
      actual = copyRecords(source, patch);
    const expectedHash = hash(expected);
    if (hash(actual) !== expectedHash)
      throw Error(`${count}/${operation}: record values or order changed`);
    for (const key of Object.keys(expected))
      if (actual[key] !== expected[key])
        throw Error(`${count}/${operation}: record identity changed`);
    const samples = { before: [] as number[], after: [] as number[] };
    const methods = { before: reference, after: copyRecords<Piece> };
    for (const method of Object.values(methods))
      for (let warmup = 0; warmup < 3; warmup++)
        guard += method(source, patch).u0.tier;
    for (let sample = 0; sample < 3; sample++)
      for (const label of sample % 2
        ? (["after", "before"] as const)
        : (["before", "after"] as const)) {
        const start = performance.now();
        for (let iteration = 0; iteration < 10; iteration++)
          guard += methods[label](source, patch).u0.tier;
        samples[label].push((performance.now() - start) / 10);
      }
    const result = {
      count,
      operation,
      samples,
      beforeMs: [...samples.before].sort((a, b) => a - b)[1],
      afterMs: [...samples.after].sort((a, b) => a - b)[1],
      exact: true,
      hash: expectedHash,
    };
    results.push(result);
    console.log(JSON.stringify(result));
  }
  if (hash(source) !== beforeHash)
    throw Error("The source dictionary was modified");
}
const label = (process.env.LABEL ?? "current").replace(/[^a-z0-9_-]/gi, "-");
mkdirSync("test-artifacts", { recursive: true });
writeFileSync(
  `test-artifacts/record-copy-${label}.json`,
  JSON.stringify(
    {
      node: process.version,
      v8: process.versions.v8,
      guard,
      results,
    },
    null,
    2,
  ),
);

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { maritimeFixture } from "../tests/maritime-fixture";
import { piece } from "../tests/helpers";
import type { Command, Game } from "../src/game/types";

// Complete movement transactions, including copy-on-write, rule validation and
// cleanup. Prescribed orders isolate execution cost; this is not AI thinking.
// Fixtures and browser profiles are disposable; never read the live campaign.
const root = resolve(process.env.SOURCE_ROOT ?? ".");
const { applyCommandPlan } = await import(
  pathToFileURL(resolve(root, "src/game/engine.ts")).href
);
const counts = (process.env.UNITS ?? "15000,60000").split(",").map(Number);
const samples = Number(process.env.SAMPLES ?? 3),
  orders = Number(process.env.ORDERS ?? 32);
if ([...counts, samples, orders].some((n) => !Number.isSafeInteger(n) || n < 1))
  throw Error("Use positive integers for counts, samples and orders.");
const expected = process.env.EXPECT_PATH
  ? JSON.parse(readFileSync(process.env.EXPECT_PATH, "utf8"))
  : undefined;
if (
  expected &&
  (JSON.stringify(expected.counts) !== JSON.stringify(counts) ||
    expected.orders !== orders)
)
  throw Error("Reference fixture parameters differ.");
const results = [];
for (const naval of [false, true])
  for (const count of counts) {
    const { s } = maritimeFixture();
    if (naval)
      for (const id of ["0,0", "1,0", "2,0"]) s.tiles[id].resource = "water";
    const mobile = Array.from({ length: orders }, () =>
      piece(s, "0,0", 0, naval ? "convoy" : "cavalry", 4),
    );
    if (naval)
      for (const ship of mobile)
        for (let n = 0; n < 8; n++)
          piece(s, ship.tile, 0, "heavy", 3).carrier = ship.id;
    for (let n = 0; n < count; n++) piece(s, "3,0", 1, "heavy", 2);
    const commands: Command[] = mobile.map((unit) => ({
      type: "move",
      ids: [unit.id],
      to: "1,0",
    }));
    const before = JSON.stringify(s),
      times: number[] = [];
    let finalHash = "";
    for (let i = 0; i < samples; i++) {
      const start = performance.now();
      const result = applyCommandPlan(
        s,
        (_view: Game, done: readonly Command[]) => commands[done.length],
      );
      times.push(performance.now() - start);
      if (!result.ok) throw Error(result.error);
      if (JSON.stringify(result.commands) !== JSON.stringify(commands))
        throw Error("Movement orders changed.");
      const hash = createHash("sha256")
        .update(JSON.stringify(result.state))
        .digest("hex");
      if (finalHash && finalHash !== hash)
        throw Error("Repeated moves changed the result.");
      finalHash = hash;
      if (JSON.stringify(s) !== before)
        throw Error("The input campaign was mutated.");
    }
    const prior = expected?.results.find(
      (r: any) => r.naval === naval && r.idleUnits === count,
    );
    if (
      expected &&
      (prior?.finalHash !== finalHash ||
        JSON.stringify(prior?.commands) !== JSON.stringify(commands))
    )
      throw Error("The reference result or commands differ.");
    results.push({
      naval,
      idleUnits: count,
      totalUnits: Object.keys(s.pieces).length,
      commands,
      finalHash,
      samplesMs: times,
      medianMs: [...times].sort((a, b) => a - b)[Math.floor(times.length / 2)],
    });
  }
const label = (process.env.LABEL ?? "result").replace(/[^a-z0-9_-]/gi, "-");
mkdirSync("test-artifacts", { recursive: true });
const report = { source: root, counts, orders, results };
writeFileSync(
  `test-artifacts/movement-performance-${label}.json`,
  JSON.stringify(report, null, 2),
);
console.log(
  JSON.stringify(
    { ...report, results: results.map(({ commands, ...r }) => r) },
    null,
    2,
  ),
);

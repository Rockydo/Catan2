import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { guildFixture } from "../tests/guild-fixture";
import { piece } from "../tests/helpers";
import type { Command } from "../src/game/types";

// Isolated whole-command measurements. No browser, live campaign or save writes.
const root = resolve(process.env.SOURCE_ROOT ?? ".");
const { applyCommand, applyCommandPlan } = await import(
  pathToFileURL(resolve(root, "src/game/engine.ts")).href
);
const formationSize = Number(process.env.FORMATION_UNITS ?? 200),
  idleUnits = Number(process.env.IDLE_UNITS ?? 15000),
  samples = Number(process.env.SAMPLES ?? 3);
for (const [name, n] of Object.entries({ formationSize, idleUnits, samples }))
  if (!Number.isSafeInteger(n) || n < 1)
    throw Error(`${name} must be a positive integer.`);
const expected = process.env.EXPECT_PATH
  ? JSON.parse(readFileSync(process.env.EXPECT_PATH, "utf8"))
  : undefined;
if (
  expected &&
  (expected.formationSize !== formationSize || expected.idleUnits !== idleUnits)
)
  throw Error("Reference formation and campaign sizes differ.");
const results = [];
for (const kind of [
  "commanders",
  "navigators",
  "engineers",
  "artisans",
] as const)
  for (const operation of ["single", "three-tiers"] as const) {
    const { s, home, land, water } = guildFixture(kind, 3),
      units = Array.from({ length: formationSize }, () =>
        piece(
          s,
          kind === "navigators" ? water : land,
          0,
          kind === "navigators" ? "convoy" : "heavy",
          3,
        ),
      );
    for (let i = 0; i < idleUnits; i++) piece(s, "3,0", 1, "heavy", 2);
    const commands: Command[] = (operation === "single" ? [3] : [1, 2, 3]).map(
      (tier) => ({
        type: "guild-order",
        town: home.id,
        tier,
        ...(kind === "artisans" ? { kind: "coal" } : { ids: [units[0].id] }),
      }),
    );
    const before = JSON.stringify(s),
      times = [];
    let finalHash = "";
    for (let sample = 0; sample < samples; sample++) {
      const start = performance.now();
      const result =
        operation === "single"
          ? applyCommand(s, commands[0])
          : applyCommandPlan(
              s,
              (_view: unknown, done: readonly Command[]) =>
                commands[done.length],
            );
      times.push(performance.now() - start);
      if (!result.ok) throw Error(result.error);
      if (JSON.stringify(s) !== before)
        throw Error("The input campaign was changed.");
      const actualHash = createHash("sha256")
        .update(JSON.stringify(result.state))
        .digest("hex");
      if (finalHash && actualHash !== finalHash)
        throw Error("Repeated orders changed their result.");
      finalHash = actualHash;
    }
    const row = {
      kind,
      operation,
      commands,
      finalHash,
      medianMs: [...times].sort((a, b) => a - b)[Math.floor(times.length / 2)],
      times,
    };
    if (expected) {
      const reference = expected.results.find(
        (r: typeof row) => r.kind === kind && r.operation === operation,
      );
      if (
        !reference ||
        reference.finalHash !== row.finalHash ||
        JSON.stringify(reference.commands) !== JSON.stringify(commands)
      )
        throw Error(
          `${kind}/${operation}: command or complete state differs from reference.`,
        );
    }
    results.push(row);
    console.log(
      JSON.stringify({ kind, operation, medianMs: row.medianMs, finalHash }),
    );
  }
const label = (process.env.LABEL ?? "campaign").replace(/[^a-z0-9_-]/gi, "-");
mkdirSync("test-artifacts", { recursive: true });
writeFileSync(
  `test-artifacts/guild-performance-${label}.json`,
  JSON.stringify(
    {
      root,
      formationSize,
      idleUnits,
      results,
      unchangedInput: true,
      repeatedResultsMatch: true,
      referenceMatched: !!expected,
    },
    null,
    2,
  ),
);

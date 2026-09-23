import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Command } from "../src/game/types";

// One engine checkout per process. Isolate movement/strength/coalition cleanup
// on a dense army; this is not an AI search or a complete campaign benchmark.
const root = resolve(process.env.SOURCE_ROOT ?? ".");
// Fixture helpers import the engine too. Load them from the same checkout so
// reference measurements never initialize a second engine in this process.
const { maritimeFixture } = await import(
  pathToFileURL(resolve(root, "tests/maritime-fixture.ts")).href
);
const { piece } = await import(
  pathToFileURL(resolve(root, "tests/helpers.ts")).href
);
const moduleAt = (file: string) =>
  import(pathToFileURL(resolve(root, "src/game", file)).href);
const { applyCommandPlan } = await moduleAt("engine.ts");
const { factionStrengthDetails } = await moduleAt("ai-strategy.ts");
const { assertInvariants } = await moduleAt("save.ts");
const expected = process.env.EXPECT_PATH
  ? JSON.parse(readFileSync(process.env.EXPECT_PATH, "utf8"))
  : undefined;
const sizes = (process.env.SIZES ?? "1000,10000,100000").split(",").map(Number);
if (sizes.some((n) => !Number.isSafeInteger(n) || n < 24 || n > 500000))
  throw Error("SIZES must contain army counts between 24 and 500000.");
const reports = [];
for (const size of sizes) {
  const { s } = maritimeFixture();
  const commands: Command[] = [];
  for (let i = 0; i < size; i++) {
    const owner = i < 24 ? 0 : i % 2;
    const unit = piece(
      s,
      owner === 0 ? "0,0" : "-4,0",
      owner,
      "cavalry",
      1 + (i % 4),
    );
    if (i < 24) commands.push({ type: "move", ids: [unit.id], to: "1,0" });
  }
  assertInvariants(s);
  const before = JSON.stringify(s),
    samples: number[] = [];
  let resultHash = "";
  for (let i = 0; i < 8; i++) {
    const strengths: unknown[] = [];
    const start = performance.now();
    const result = applyCommandPlan(
      s,
      (view: typeof s, done: readonly Command[]) => {
        strengths.push(factionStrengthDetails(view));
        return commands[done.length];
      },
    );
    const elapsed = performance.now() - start;
    if (!result.ok) throw Error(result.error);
    assertInvariants(result.state);
    if (JSON.stringify(result.commands) !== JSON.stringify(commands))
      throw Error("March orders changed.");
    const hash = createHash("sha256")
      .update(JSON.stringify([result.state, strengths]))
      .digest("hex");
    if (resultHash && resultHash !== hash)
      throw Error("The march result changed between runs.");
    resultHash = hash;
    if (JSON.stringify(s) !== before)
      throw Error("The original campaign was changed.");
    if (i >= 3) samples.push(elapsed);
  }
  const previous = expected?.find((r: { units: number }) => r.units === size);
  if (expected && previous?.resultHash !== resultHash)
    throw Error(`The reference march differs for ${size} units.`);
  reports.push({
    units: size,
    orders: commands.length,
    medianMs: [...samples].sort((a, b) => a - b)[2],
    samples,
    resultHash,
  });
}
mkdirSync("test-artifacts", { recursive: true });
const label = (process.env.LABEL ?? "current").replace(/[^a-z0-9_-]/gi, "-");
writeFileSync(
  `test-artifacts/army-march-${label}.json`,
  JSON.stringify(reports, null, 2),
);
console.log(JSON.stringify(reports, null, 2));

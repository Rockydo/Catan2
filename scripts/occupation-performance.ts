import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { newGame } from "../src/game/engine";
import { piece } from "../tests/helpers";

// Read-only route-cache maintenance and repeated occupation queries. Fresh
// immutable views keep the same movement network, as economic orders often do.
// These movement-only fixtures are not playable campaigns, complete AI turns
// or estimates of total campaign memory.
const root = resolve(process.env.SOURCE_ROOT ?? ".");
const { withPlanningFrame, hostileAt, blockAt, navalBlockAt } = await import(
  pathToFileURL(resolve(root, "src/game/selectors.ts")).href
);
const { planningDistance } = await import(
  pathToFileURL(resolve(root, "src/game/ai-paths.ts")).href
);
const sizes = (process.env.UNITS ?? "15000,60000,240000")
  .split(",")
  .map(Number);
const views = Number(process.env.VIEWS ?? 20);
const samples = Number(process.env.SAMPLES ?? 3);
if ([...sizes, views, samples].some((n) => !Number.isInteger(n) || n < 1))
  throw Error("UNITS, VIEWS and SAMPLES must be positive integers.");
const reference = process.env.EXPECT_PATH
  ? JSON.parse(readFileSync(process.env.EXPECT_PATH, "utf8"))
  : undefined;
if (
  reference &&
  (reference.views !== views ||
    JSON.stringify(reference.sizes) !== JSON.stringify(sizes))
)
  throw Error("The reference must use the same sizes and view count.");
const results = [];
for (const count of sizes) {
  const game = newGame("occupation-performance");
  const ids = Object.keys(game.tiles);
  for (const tile of Object.values(game.tiles)) {
    tile.resource = "grain";
    delete tile.surface;
  }
  const positions = ids.slice(0, 24);
  for (let i = 0; i < count; i++) {
    // Consecutive formations plus interleaved enemy, naval and stranded groups.
    const group = Math.floor(i / 125);
    const unit = piece(
      game,
      positions[group % positions.length],
      group % 4,
      group % 3 ? "heavy" : "galley",
    );
    if (group % 5 === 0) unit.seasonStatus = unit.naval ? "icebound" : "adrift";
    if (i % 11 === 0) unit.carrier = "excluded-passenger";
  }
  const original = JSON.stringify(game);
  const read = (view: typeof game) =>
    withPlanningFrame(view, () => {
      const out = [];
      for (const owner of [0, 1, 2, 3]) {
        out.push(planningDistance(view, ids[0], ids.at(-1)!, false, owner));
        for (const tile of positions)
          out.push(
            hostileAt(view, tile, owner, false),
            hostileAt(view, tile, owner, true),
            blockAt(view, tile, owner),
            navalBlockAt(view, tile, owner),
          );
      }
      return out;
    });
  read(game);
  const times = [];
  let hash = "";
  for (let sample = 0; sample < samples; sample++) {
    const outcomes = [];
    const started = performance.now();
    for (let i = 0; i < views; i++)
      outcomes.push(read({ ...game, actions: i }));
    times.push(performance.now() - started);
    const current = createHash("sha256")
      .update(JSON.stringify(outcomes))
      .digest("hex");
    if (hash && hash !== current) throw Error("Repeated read results changed.");
    hash = current;
  }
  if (JSON.stringify(game) !== original) throw Error("Input campaign changed.");
  const expected = reference?.results.find(
    (row: { units: number }) => row.units === count,
  );
  if (reference && expected?.hash !== hash)
    throw Error(`Queries differ at ${count} units.`);
  results.push({
    units: count,
    samplesMs: times,
    medianMs: [...times].sort((a, b) => a - b)[Math.floor(times.length / 2)],
    hash,
  });
}
const report = { source: root, sizes, views, samples, results };
const label = (process.env.LABEL ?? "current").replace(/[^a-z0-9_-]/gi, "-");
mkdirSync("test-artifacts", { recursive: true });
writeFileSync(
  `test-artifacts/occupation-performance-${label}.json`,
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));

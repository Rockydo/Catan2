import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { newGame } from "../src/game/engine";
import { piece } from "../tests/helpers";
import type { UnitClass, ShipClass } from "../src/game/types";

// Pure strength and civilian-danger reads through related immutable views.
// These troop-only fixtures are not playable campaigns or whole AI turns.
const root = resolve(process.env.SOURCE_ROOT ?? ".");
const moduleAt = (file: string) =>
  pathToFileURL(resolve(root, "src/game", `${file}.ts`)).href;
const { withPlanningFrame, withSharedPiecePlanningFrame } = await import(
  moduleAt("selectors")
);
const { factionStrengthDetails } = await import(moduleAt("ai-strategy"));
const { collectorThreats, colonistDanger } = await import(
  moduleAt("ai-threats")
);
const sizes = (process.env.UNITS ?? "15000,60000,240000")
  .split(",")
  .map(Number);
const views = Number(process.env.VIEWS ?? 20),
  samples = Number(process.env.SAMPLES ?? 3);
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
  throw Error("Use the same sizes and view count as the reference.");
const results = [];
for (const count of sizes) {
  const game = newGame("troop-read-performance");
  const tiles = Object.keys(game.tiles).slice(0, 24);
  const kinds: (UnitClass | ShipClass)[] = [
    "heavy",
    "light",
    "cavalry",
    "artillery",
    "merchant",
    "galley",
    "convoy",
    "fishing",
    "merchantship",
  ];
  for (let i = 0; i < count; i++) {
    // Large formations interspersed with separate profiles and passengers.
    const group = Math.floor(i / 125);
    const u = piece(
      game,
      tiles[group % tiles.length],
      group % game.players.length,
      kinds[group % kinds.length],
      1 + (group % 4),
    );
    if (i % 11 === 0) u.carrier = "test-carrier";
    if (i % 7 === 0) u.seasonStatus = u.naval ? "icebound" : "adrift";
  }
  const original = JSON.stringify(game);
  const read = () =>
    withPlanningFrame(game, () => {
      const out = [];
      for (let i = 0; i < views; i++) {
        const view = { ...game, active: i % game.players.length, actions: i };
        out.push(
          withSharedPiecePlanningFrame(view, () => {
            const threats = collectorThreats(view, view.active, false);
            return {
              strength: factionStrengthDetails(view),
              colonists: colonistDanger(view).map((set: Set<string>) => [
                ...set,
              ]),
              collectors: tiles.map((tile) => [
                threats(tile, false),
                threats(tile, true),
              ]),
            };
          }),
        );
      }
      return out;
    });
  read();
  const times = [];
  let hash = "";
  for (let i = 0; i < samples; i++) {
    const start = performance.now(),
      outcomes = read();
    times.push(performance.now() - start);
    const current = createHash("sha256")
      .update(JSON.stringify(outcomes))
      .digest("hex");
    if (hash && hash !== current) throw Error("Repeated results changed.");
    hash = current;
  }
  if (JSON.stringify(game) !== original) throw Error("Input campaign changed.");
  const expected = reference?.results.find(
    (row: { units: number }) => row.units === count,
  );
  if (reference && expected?.hash !== hash)
    throw Error(`Results differ at ${count} units.`);
  results.push({
    units: count,
    samplesMs: times,
    medianMs: [...times].sort((a, b) => a - b)[Math.floor(samples / 2)],
    hash,
  });
}
const report = { source: root, sizes, views, samples, results };
const label = (process.env.LABEL ?? "current").replace(/[^a-z0-9_-]/gi, "-");
mkdirSync("test-artifacts", { recursive: true });
writeFileSync(
  `test-artifacts/troop-read-${label}.json`,
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));

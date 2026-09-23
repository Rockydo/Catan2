import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { newGame } from "../src/game/engine";
import { generateWorld } from "../src/game/world";
import { formationPower, withPlanningFrame } from "../src/game/selectors";
import { formationCanBeat } from "../src/game/ai-formation-power";
import type { Piece, UnitClass } from "../src/game/types";

// Isolate repeated target-strength tests, including construction of the query.
// The reference is the preceding AI's short-circuit scan of separate armies.
// This is not a complete AI turn or a measurement of pathfinding.
const reports = [];
const median = (values: number[]) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
for (const size of [32, 128, 512]) {
  const s = newGame(`front-strength-${size}`);
  Object.assign(s, generateWorld(s.seed, 2000));
  const tiles = Object.values(s.tiles);
  for (const [i, tile] of tiles.entries())
    tile.resource = (["grain", "ore", "lumber"] as const)[i % 3];
  for (const [i, vertex] of Object.values(s.vertices).entries())
    if (i % 17 === 0)
      s.towers[vertex.id] = {
        id: `tower-${i}`,
        vertex: vertex.id,
        owner: 0,
        tier: 1 + (i % 4),
      };
  const kinds: UnitClass[] = ["heavy", "light", "cavalry", "artillery"];
  const groups: Piece[][] = Array.from({ length: size }, (_, i) =>
    Array.from({ length: 20 }, (_, j) => ({
      id: `unit-${i}-${j}`,
      tile: tiles[i].id,
      owner: 0,
      kind: kinds[i % 4],
      tier: 1 + ((i + j) % 4),
      naval: false,
      born: 0,
      moved: 0,
      acted: false,
      bonus: 0,
    })),
  );
  for (const group of groups)
    for (const unit of group) s.pieces[unit.id] = unit;
  const before = JSON.stringify(s);
  for (const mode of ["easy", "mixed", "blocked"] as const) {
    const durations: number[][] = [[], []];
    let expected = "";
    for (let sample = -1; sample < 7; sample++)
      for (const optimized of sample % 2 ? [true, false] : [false, true]) {
        const start = performance.now();
        const results = withPlanningFrame(s, () => {
          const queries = optimized
            ? []
            : groups.map((group) => formationPower(s, group));
          const canBeat = optimized
            ? formationCanBeat(s, groups)
            : (tile: string, defense: number) =>
                queries.some((query) => query(tile) > defense);
          return tiles.map((tile, i) =>
            canBeat(
              tile.id,
              mode === "easy"
                ? 0
                : mode === "blocked"
                  ? 1000
                  : [0, 50, 200, 1000, 10][i % 5],
            ),
          );
        });
        const elapsed = performance.now() - start;
        const payload = JSON.stringify(results);
        if (!expected) expected = payload;
        if (payload !== expected) throw Error("Attack feasibility changed.");
        if (JSON.stringify(s) !== before)
          throw Error("Source campaign changed.");
        if (sample >= 0) durations[Number(optimized)].push(elapsed);
      }
    reports.push({
      formations: size,
      troops: size * 20,
      destinations: tiles.length,
      mode,
      beforeMs: median(durations[0]),
      afterMs: median(durations[1]),
      durations,
      resultHash: createHash("sha256").update(expected).digest("hex"),
    });
  }
}
mkdirSync("test-artifacts", { recursive: true });
writeFileSync(
  "test-artifacts/army-front-performance.json",
  JSON.stringify(reports, null, 2),
);
console.log(
  JSON.stringify(
    reports.map(({ durations, ...report }) => report),
    null,
    2,
  ),
);

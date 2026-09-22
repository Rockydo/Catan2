import { expect, it } from "vitest";
import { funded, piece } from "./helpers";
import { pathTo } from "../src/game/selectors";
import {
  planningPath,
  planningDistance,
  planningDistances,
} from "../src/game/ai-paths";
it("cached strategic paths match legal paths across terrain, hostile positions and movement bounds", () => {
  const s = funded("path-cache-check");
  const tiles = Object.keys(s.tiles);
  for (const tile of tiles.filter((_, i) => i % 7 === 0))
    piece(s, tile, 1, s.tiles[tile].resource === "water" ? "galley" : "heavy");
  for (const naval of [false, true])
    for (const owner of [0, 1])
      for (const max of [0, 1, 3, Infinity]) {
        for (const from of tiles.filter((_, i) => i % 23 === 0)) {
          const distances = planningDistances(s, from, naval, owner, max);
          for (const to of tiles.filter((_, i) => i % 11 === 0)) {
            expect(planningPath(s, from, to, naval, owner, max)).toEqual(
              pathTo(s, from, to, naval, owner, max),
            );
            expect(planningDistance(s, from, to, naval, owner, max)).toBe(
              pathTo(s, from, to, naval, owner, max)?.length ?? Infinity,
            );
            expect(distances(to)).toBe(
              planningDistance(s, from, to, naval, owner, max),
            );
          }
          expect(distances(from)).toBe(
            planningDistance(s, from, from, naval, owner, max),
          );
          expect(distances("9999,9999")).toBe(Infinity);
        }
      }
  const next = structuredClone(s);
  next.pieces = {};
  for (const to of tiles)
    expect(planningPath(next, "0,0", to, false, 0)).toEqual(
      pathTo(next, "0,0", to, false, 0),
    );
});

it("a local distance query survives shared-cache eviction without leaking another position", () => {
  const s = funded("distance-query-lifetime");
  const from = Object.values(s.tiles).find((t) => t.resource !== "water")!.id;
  const query = planningDistances(s, from, false, 0);
  const expected = Object.keys(s.tiles).map((id) => [id, query(id)] as const);
  for (let i = 0; i < 300; i++)
    planningDistances(s, `${i + 10000},0`, false, 0);
  const next = structuredClone(s);
  next.pieces = {};
  for (const tile of Object.values(next.tiles)) tile.resource = "peaks";
  expect(planningDistances(next, from, false, 0)(from)).toBe(Infinity);
  expect(Object.keys(s.tiles).map((id) => [id, query(id)])).toEqual(expected);
});

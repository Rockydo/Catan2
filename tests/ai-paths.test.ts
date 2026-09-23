import { expect, it, vi } from "vitest";
import * as selectors from "../src/game/selectors";
import { funded, piece } from "./helpers";
import { pathTo, withPlanningFrame } from "../src/game/selectors";
import { canOccupy } from "../src/game/world";
import { formerDeployment } from "./deployment-reference";
import {
  planningPath,
  planningDistance,
  planningDistances,
  planningDestinations,
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

it("deployment distances retain all visit order, blocked endpoints and stranded origins", () => {
  const initial = funded("deployment-order"),
    tiles = Object.keys(initial.tiles);
  for (const [i, tile] of tiles.entries()) {
    if (i % 5 === 0) initial.tiles[tile].surface = "frozen";
    if (i % 7 === 0) initial.tiles[tile].surface = "open";
    if (i % 11 === 0) piece(initial, tile, 1, i % 2 ? "heavy" : "galley");
  }
  const allied = structuredClone(initial);
  allied.alliances = [
    { id: "pact", members: [0, 1], threat: 2, lockedUntil: 99 },
  ];
  for (const s of [initial, allied])
    withPlanningFrame(s, () => {
      for (const naval of [false, true])
        for (const owner of [0, 1])
          for (const from of [
            ...tiles.filter((_, i) => i % 19 === 0),
            "9999,9999",
          ]) {
            const paths = formerDeployment(s, from, naval, owner),
              actual = [...planningDestinations(s, from, naval, owner)];
            expect(actual).toEqual(
              [...paths].map(([id, route]) => [id, route.length]),
            );
            for (const [to, route] of paths)
              if (canOccupy(s.tiles[to], naval))
                expect(planningPath(s, from, to, naval, owner)).toEqual(route);
            actual[0][1] = 10000;
            expect(
              planningDestinations(s, from, naval, owner).next().value,
            ).toEqual([from, 0]);
          }
    });
});

it("an unfinished destination iterator survives cache eviction and a changed movement network", () => {
  const s = funded("deployment-iterator"),
    from = "0,0",
    expected = [...planningDestinations(s, from, false, 0)],
    iterator = planningDestinations(s, from, false, 0);
  expect(iterator.next().value).toEqual(expected[0]);
  for (let i = 0; i < 300; i++)
    planningDistances(s, `${i + 10000},0`, false, 0);
  const next = structuredClone(s);
  for (const tile of Object.values(next.tiles)) tile.resource = "peaks";
  expect([...planningDestinations(next, from, false, 0)]).toEqual([[from, 0]]);
  expect([...iterator]).toEqual(expected.slice(1));
});

it("large route trees evict by total destination count before reaching the source limit", () => {
  const s = funded("route-size-budget"),
    template = s.tiles["0,0"];
  // This route-only corridor needs no town geometry. Eighty sources remain
  // below the 256-source cap but exceed the total retained destination budget.
  s.pieces = {};
  s.towers = {};
  s.tiles = Object.fromEntries(
    Array.from({ length: 4000 }, (_, q) => {
      const id = `${q},0`;
      return [
        id,
        { ...template, id, q, r: 0, resource: "grain", surface: undefined },
      ];
    }),
  );
  withPlanningFrame(s, () => {
    const original = planningDistances(s, "0,0", false, 0);
    for (let q = 1; q < 80; q++) planningDistances(s, `${q},0`, false, 0);
    const occupied = vi.spyOn(selectors, "hostileAt");
    try {
      expect(planningDistance(s, "79,0", "3999,0", false, 0)).toBe(3920);
      expect(occupied).not.toHaveBeenCalled();
      expect(planningDistance(s, "0,0", "3999,0", false, 0)).toBe(3999);
      expect(occupied).toHaveBeenCalled();
      // Eviction does not invalidate a still-live query or its chosen route.
      expect(original("3999,0")).toBe(3999);
      const path = planningPath(s, "0,0", "3999,0", false, 0)!;
      expect(path).toEqual(
        Array.from({ length: 3999 }, (_, i) => `${i + 1},0`),
      );
      path[0] = "changed";
      expect(planningPath(s, "0,0", "2,0", false, 0)).toEqual(["1,0", "2,0"]);
    } finally {
      occupied.mockRestore();
    }
  });
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

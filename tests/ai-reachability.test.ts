import { expect, it } from "vitest";
import {
  planningReachable,
  planningDistance,
  planningDistances,
  planningReachableToAny,
} from "../src/game/ai-paths";
import { withPlanningFrame, pathTo } from "../src/game/selectors";
import { funded, piece } from "./helpers";

it("component reachability exactly matches tactical paths through islands, blockades, alliances and ice", () => {
  const s = funded("connectivity-equivalence");
  s.pieces = {};
  const tiles = Object.keys(s.tiles);
  for (let i = 0; i < tiles.length; i++) {
    if (i % 7 === 0)
      piece(
        s,
        tiles[i],
        i % 3,
        s.tiles[tiles[i]].resource === "water" ? "galley" : "heavy",
      );
    if (i % 11 === 0) s.tiles[tiles[i]].resource = "peaks";
  }
  for (const allied of [false, true]) {
    const game = structuredClone(s);
    if (allied)
      game.alliances = [
        { id: "together", members: [0, 1], threat: 2, lockedUntil: 10 },
      ];
    withPlanningFrame(game, () => {
      for (const naval of [false, true])
        for (const owner of [0, 1])
          for (const from of tiles.filter((_, i) => i % 5 === 0))
            for (const to of tiles) {
              expect(
                planningReachable(game, from, to, naval, owner),
                `${from} → ${to}; ${owner}/${naval}/${allied}`,
              ).toBe(pathTo(game, from, to, naval, owner) !== null);
            }
    });
  }
});

it("keeps enemy hexes as endpoints and refreshes after thaw, occupation and diplomacy", () => {
  let game = funded("connectivity-corridor");
  game.pieces = {};
  for (const tile of Object.values(game.tiles)) tile.resource = "water";
  for (const id of ["0,0", "1,0", "2,0", "3,0"])
    game.tiles[id].resource = "grain";
  const enemy = piece(game, "1,0", 1);
  const check = () =>
    withPlanningFrame(game, () => {
      for (const from of ["0,0", "1,0", "2,0", "3,0"])
        for (const to of ["0,0", "1,0", "2,0", "3,0"])
          for (const max of [Infinity, 1, 2])
            expect(planningReachable(game, from, to, false, 0, max)).toBe(
              Number.isFinite(planningDistance(game, from, to, false, 0, max)),
            );
    });
  check();
  expect(planningReachable(game, "0,0", "1,0", false, 0)).toBe(true);
  expect(planningReachable(game, "0,0", "3,0", false, 0)).toBe(false);
  game = structuredClone(game);
  piece(game, "0,0", 1);
  check();
  expect(planningReachable(game, "0,0", "1,0", false, 0)).toBe(true);
  game = structuredClone(game);
  delete game.pieces[enemy.id];
  check();
  game = structuredClone(game);
  game.tiles["1,0"].surface = "open";
  check();
  game = structuredClone(game);
  game.tiles["1,0"].surface = "frozen";
  check();
  game = structuredClone(game);
  game.alliances = [
    { id: "pact", members: [0, 1], threat: 2, lockedUntil: 10 },
  ];
  check();
});

it("compiled destination sets match individual queries for every origin, domain and alliance", () => {
  const s = funded("destination-set-equivalence");
  s.pieces = {};
  const tiles = Object.keys(s.tiles);
  for (let i = 0; i < tiles.length; i++) {
    if (i % 4 === 0)
      piece(s, tiles[i], i % 3, i % 8 === 0 ? "galley" : "heavy");
    if (i % 11 === 0) s.tiles[tiles[i]].resource = "peaks";
    if (i % 13 === 0) s.tiles[tiles[i]].surface = "frozen";
    if (i % 17 === 0) s.tiles[tiles[i]].surface = "open";
  }
  const groups = [
    [],
    [tiles[0]],
    tiles.filter((_, i) => i % 9 === 0),
    [...tiles.filter((_, i) => i % 13 === 0), tiles[0], "9999,9999"],
    tiles,
  ];
  for (const allied of [false, true]) {
    const game = structuredClone(s);
    if (allied)
      game.alliances = [
        { id: "pact", members: [0, 1], threat: 2, lockedUntil: 10 },
      ];
    withPlanningFrame(game, () => {
      for (const naval of [false, true])
        for (const owner of [0, 1, 2])
          for (const targets of groups) {
            const query = planningReachableToAny(game, targets, naval, owner);
            for (const from of [...tiles, "9999,9999"])
              expect(query(from), `${from}/${naval}/${owner}/${allied}`).toBe(
                targets.some((to) =>
                  planningReachable(game, from, to, naval, owner),
                ),
              );
          }
    });
  }
});

it("does not join regions through hostile destinations and permits direct attacks between blocked neighbors", () => {
  const s = funded("destination-blockades");
  s.pieces = {};
  for (const tile of Object.values(s.tiles)) tile.resource = "water";
  for (const id of ["0,0", "1,0", "2,0", "3,0"]) s.tiles[id].resource = "grain";
  piece(s, "1,0", 1);
  piece(s, "2,0", 1);
  withPlanningFrame(s, () => {
    const beyond = planningReachableToAny(s, ["3,0"], false, 0),
      blocker = planningReachableToAny(s, ["2,0"], false, 0);
    expect(beyond("0,0")).toBe(false);
    expect(beyond("1,0")).toBe(false);
    expect(beyond("2,0")).toBe(true);
    expect(blocker("1,0")).toBe(true);
    expect(blocker("2,0")).toBe(true);
    expect(blocker("0,0")).toBe(false);
    expect(
      planningReachableToAny(s, ["0,1", "9999,9999"], false, 0)("0,0"),
    ).toBe(false);
    for (const targets of [["3,0"], ["1,0", "2,0"]]) {
      const query = planningReachableToAny(s, targets, false, 0);
      for (const from of ["0,0", "1,0", "2,0", "3,0", "0,1"])
        expect(query(from)).toBe(
          targets.some((to) => pathTo(s, from, to, false, 0) !== null),
        );
    }
  });
});

it("keeps an existing query stable through target-array edits, cache eviction and changed weather", () => {
  const s = funded("destination-query-lifetime"),
    tiles = Object.keys(s.tiles),
    targets = tiles.filter((_, i) => i % 7 === 0),
    query = planningReachableToAny(s, targets, false, 0),
    expected = tiles.map((id) => query(id));
  targets.splice(0);
  for (let i = 0; i < 300; i++)
    planningDistances(s, `${i + 10000},0`, false, 0);
  const changed = structuredClone(s);
  for (const tile of Object.values(changed.tiles)) {
    tile.resource = "water";
    delete tile.surface;
  }
  planningReachableToAny(changed, tiles, true, 0)(tiles[0]);
  const noLand = planningReachableToAny(changed, tiles, false, 0);
  expect(tiles.every((id) => !noLand(id))).toBe(true);
  expect(tiles.map((id) => query(id))).toEqual(expected);
});

import { expect, it } from "vitest";
import { planningReachable, planningDistance } from "../src/game/ai-paths";
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

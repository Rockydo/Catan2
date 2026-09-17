import { expect, it } from "vitest";
import { funded, piece } from "./helpers";
import { pathTo } from "../src/game/selectors";
import { planningPath } from "../src/game/ai-paths";
it("cached strategic paths match legal paths across terrain, hostile positions and movement bounds", () => {
  const s = funded("path-cache-check");
  const tiles = Object.keys(s.tiles);
  for (const tile of tiles.filter((_, i) => i % 7 === 0))
    piece(s, tile, 1, s.tiles[tile].resource === "water" ? "galley" : "heavy");
  for (const naval of [false, true])
    for (const owner of [0, 1])
      for (const max of [1, 3, Infinity]) {
        for (const from of tiles.filter((_, i) => i % 23 === 0))
          for (const to of tiles.filter((_, i) => i % 11 === 0)) {
            expect(planningPath(s, from, to, naval, owner, max)).toEqual(
              pathTo(s, from, to, naval, owner, max),
            );
          }
      }
  const next = structuredClone(s);
  next.pieces = {};
  for (const to of tiles)
    expect(planningPath(next, "0,0", to, false, 0)).toEqual(
      pathTo(next, "0,0", to, false, 0),
    );
});

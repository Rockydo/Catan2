import { funded, piece } from "./helpers";
import { ownTowns } from "../src/game/selectors";
import { landAtVertex } from "../src/game/world";
export function threatenedFixture(level = 4, wall = 2) {
  const s = funded(),
    target = ownTowns(s, 0)[0];
  s.active = 1;
  s.players[1].turns = 1;
  s.phase = "military";
  target.level = target.turnLevel = level;
  target.wall = wall;
  const tile = landAtVertex(s, target.vertex)[0],
    attacker = piece(s, tile, 1, "heavy", 1);
  return { s, target, tile, attacker };
}

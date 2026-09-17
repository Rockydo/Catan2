import { funded, piece } from "./helpers";
import { eliminate } from "../src/game/engine";
import { ownTowns } from "../src/game/selectors";
import { landAtVertex } from "../src/game/world";
import { assertInvariants } from "../src/game/save";
export function rebellionFixture() {
  const s = funded("rebellion-fixture");
  s.active = 2;
  for (const p of s.players) p.turns = 10;
  for (const town of ownTowns(s, 3)) delete s.towns[town.id];
  eliminate(s);
  const towns = ownTowns(s, 1);
  for (const town of towns) {
    town.level = town.turnLevel = 4;
    town.wall = 2;
    town.extensions[landAtVertex(s, town.vertex)[0]] = 2;
    s.towers[town.vertex] = {
      id: `w${s.nextId++}`,
      vertex: town.vertex,
      owner: 1,
      tier: 2,
    };
  }
  const tile = landAtVertex(s, towns[0].vertex)[0];
  for (let i = 0; i < 12; i++)
    piece(s, tile, 1, i % 3 === 0 ? "merchant" : "heavy", (i % 4) + 1);
  const sea = Object.keys(s.tiles).find(
    (id) => s.tiles[id].resource === "water",
  )!;
  for (let i = 0; i < 6; i++) {
    const ship = piece(s, sea, 1, "convoy", 2);
    const passenger = piece(s, sea, 1, "light", 1);
    passenger.carrier = ship.id;
  }
  s.players[1].hand = Array.from({ length: 10 }, () => ({
    id: `c${s.nextId++}`,
    kind: "harvest",
    tier: 1,
    bought: 1,
  }));
  s.rebellionRng = 1;
  assertInvariants(s);
  return s;
}

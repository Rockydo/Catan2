import { describe, expect, it } from "vitest";
import { townThreats } from "../src/game/ai-strategy";
import { planningDistance } from "../src/game/ai-paths";
import { points, speed, withPlanningFrame } from "../src/game/selectors";
import { friendly } from "../src/game/relations";
import { distance, walkableAtVertex } from "../src/game/world";
import type { Game, Town, UnitClass } from "../src/game/types";
import { legacyGame, piece } from "./helpers";

// Independent exhaustive reference: preserve the original unit order and check
// every soldier, without sharing the optimized grouping or spatial index.
function exhaustive(s: Game, town: Town) {
  const targets = walkableAtVertex(s, town.vertex);
  return Object.values(s.pieces).filter(
    (u) =>
      !u.naval &&
      !u.carrier &&
      points(u) > 0 &&
      !friendly(s, u.owner, town.owner) &&
      targets.some(
        (tile) =>
          distance(u.tile, tile) <= speed(u) &&
          Number.isFinite(
            planningDistance(s, u.tile, tile, false, u.owner, speed(u)),
          ),
      ),
  );
}

function battlefield(groups: number, mixed: boolean) {
  const s = legacyGame(`threat-index-${groups}`);
  s.pieces = {};
  const tiles = Object.values(s.tiles);
  for (const [i, tile] of tiles.entries()) {
    tile.resource = mixed && i % 9 === 0 ? "water" : "grain";
    delete tile.biome;
    delete tile.fish;
    delete tile.whale;
    if (mixed && i % 13 === 0) tile.resource = "peaks";
    else if (mixed && i % 11 === 0) {
      tile.resource = "water";
      tile.surface = "frozen";
    }
  }
  const kinds: UnitClass[] = ["heavy", "light", "cavalry", "artillery"];
  const soldiers = Array.from({ length: groups }, (_, i) => {
    const u = piece(
      s,
      tiles[i].id,
      i % 3,
      kinds[i % kinds.length],
      1 + (i % 4),
    );
    u.moved = i % 4;
    u.bonus = i % 5;
    u.acted = i % 2 === 0;
    return u;
  });
  // Interleave repeated groups to expose changes in result ordering. Civilians,
  // ships and embarked troops must never become land threats.
  for (const u of soldiers.slice(0, 9).reverse())
    piece(s, u.tile, u.owner, u.kind, 4);
  const origin = tiles[0].id;
  piece(s, origin, 1, "merchant", 4);
  piece(s, origin, 1, "settler");
  const ship = piece(s, origin, 1, "galley", 4);
  piece(s, origin, 1, "cavalry", 4).carrier = ship.id;
  // Probe boundary and negative-coordinate vertices as well as the center.
  s.towns = Object.fromEntries(
    Object.values(s.vertices)
      .filter((_, i) => i % 9 === 0)
      .map((vertex, i) => {
        const town: Town = {
          id: `town-${i}`,
          vertex: vertex.id,
          owner: i % 3,
          name: `Town ${i}`,
          level: 1,
          turnLevel: 1,
          wall: 0,
          stock: {},
          extensions: {},
          recruited: 0,
          born: 0,
          launched: 0,
        };
        return [town.id, town];
      }),
  );
  return s;
}

function compare(s: Game) {
  const before = JSON.stringify(s);
  let found = 0;
  withPlanningFrame(s, () => {
    for (const town of Object.values(s.towns)) {
      const expected = exhaustive(s, town);
      const actual = townThreats(s, town);
      expect(actual.map((u) => u.id)).toEqual(expected.map((u) => u.id));
      expect(townThreats(s, town)).toBe(actual);
      found += actual.length;
    }
  });
  expect(JSON.stringify(s)).toBe(before);
  expect(found).toBeGreaterThan(0);
}

describe("nearby town threat candidates", () => {
  it.each([31, 32, 80])(
    "matches exhaustive threats with %i groups",
    (groups) => {
      for (const mixed of [false, true]) {
        const s = battlefield(groups, mixed);
        compare(s);
        const allied = structuredClone(s);
        allied.alliances = [
          { id: "allied", members: [0, 1], threat: 2, lockedUntil: 99 },
        ];
        compare(allied);
      }
    },
  );

  it("rebuilds after movement, losses, recruitment, diplomacy and thaw", () => {
    const s = battlefield(80, true);
    compare(s);
    const next = structuredClone(s);
    const units = Object.values(next.pieces);
    units[0].tile = units[30].tile;
    units[1].owner = 2;
    delete next.pieces[units[3].id];
    piece(next, units[40].tile, 1, "cavalry", 4);
    next.alliances = [
      { id: "allied", members: [1, 2], threat: 0, lockedUntil: 99 },
    ];
    for (const tile of Object.values(next.tiles)) delete tile.surface;
    compare(next);
    compare(s);
  });
});

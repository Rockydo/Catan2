import { expect, it, vi } from "vitest";
import { formationCanBeat } from "../src/game/ai-formation-power";
import * as selectors from "../src/game/selectors";
import { terrainFamily } from "../src/game/maritime";
import type { Game, Piece, UnitClass } from "../src/game/types";
import { legacyGame, piece } from "./helpers";

function fixture() {
  const s = legacyGame("strongest-formations");
  const tiles = Object.values(s.tiles);
  for (const [i, tile] of tiles.entries()) {
    tile.resource = (["grain", "lumber", "ore", "water"] as const)[i % 4];
    delete tile.biome;
    delete tile.surface;
  }
  for (const [i, vertex] of Object.values(s.vertices).entries())
    if (i % 7 === 0)
      s.towers[vertex.id] = {
        id: `tower-${i}`,
        vertex: vertex.id,
        tier: 1 + (i % 4),
        owner: i % 2,
      };
  const kinds: UnitClass[] = [
    "heavy",
    "light",
    "cavalry",
    "artillery",
    "merchant",
    "settler",
  ];
  const groups = Array.from({ length: 40 }, (_, i) =>
    Array.from({ length: 1 + (i % 5) }, (_, j) =>
      piece(
        s,
        tiles[i].id,
        0,
        kinds[(i + j) % kinds.length],
        1 + ((i + j) % 4),
      ),
    ),
  );
  return { s, groups, tiles: tiles.map((tile) => tile.id) };
}
function compare(s: Game, groups: Piece[][], tiles: string[]) {
  const before = JSON.stringify(s);
  selectors.withPlanningFrame(s, () => {
    const query = formationCanBeat(s, groups);
    for (const tile of [...tiles, ...[...tiles].reverse()])
      for (const defense of [0, 1, 4, 12, 25, 300, Infinity, 2, 0])
        expect(query(tile, defense)).toBe(
          groups.some((group) => selectors.power(s, group, tile) > defense),
        );
  });
  expect(JSON.stringify(s)).toBe(before);
}

it("matches separate battles across terrain families and differing tower support", () => {
  const { s, groups, tiles } = fixture();
  compare(s, groups, tiles);
  compare(s, [...groups].reverse(), [...tiles].reverse());
  compare(s, [], tiles);
  compare(s, [[], []], tiles);
  compare(
    s,
    [
      [piece(s, tiles[0], 0, "settler")],
      [piece(s, tiles[1], 0, "merchant", 4)],
    ],
    tiles,
  );
});

it("does not add separate armies together to invent a winning attack", () => {
  const { s, tiles } = fixture();
  s.towers = {};
  const a = [piece(s, tiles[0], 0, "heavy", 2)];
  const b = [piece(s, tiles[1], 0, "heavy", 3)];
  const flat = tiles.find((id) => terrainFamily(s.tiles[id]) === "flat")!;
  expect(formationCanBeat(s, [a, b])(flat, 3)).toBe(false);
  expect(formationCanBeat(s, [a, b])(flat, 2)).toBe(true);
  expect(selectors.power(s, [...a, ...b], flat)).toBe(5);
});

it("retains destination-dependent winners for mixed owners and zero-power ships", () => {
  const { s, groups, tiles } = fixture();
  for (const [i, group] of groups.entries())
    for (const unit of group) unit.owner = i % 2;
  compare(s, groups, tiles);
  const civilian = [piece(s, tiles[0], 0, "settler")];
  const naval = [piece(s, tiles[1], 0, "fishing", 1)];
  const stranded = [piece(s, tiles[2], 1, "galley", 4)];
  stranded[0].seasonStatus = "icebound";
  compare(s, [civilian, naval, stranded], tiles);
  compare(
    s,
    [
      [...naval, ...groups[0]],
      [...stranded, ...groups[1]],
    ],
    tiles,
  );
});

it("uses new formations and towers after a campaign changes", () => {
  const { s, groups, tiles } = fixture();
  compare(s, groups, tiles);
  const next = structuredClone(s);
  for (const tower of Object.values(next.towers)) tower.owner = 1;
  next.pieces[groups[0][0].id].tier = 4;
  const revised = groups.map((group) => group.map((u) => next.pieces[u.id]));
  revised.push([piece(next, tiles[4], 0, "cavalry", 4)]);
  compare(next, revised, tiles);
  compare(s, groups, tiles);
});

it("stops early for easy targets and resumes rather than rescanning for harder ones", () => {
  const { s, groups, tiles } = fixture();
  const original = selectors.formationPower;
  let calls = 0;
  const spy = vi
    .spyOn(selectors, "formationPower")
    .mockImplementation((state, group) => {
      const query = original(state, group);
      return (tile) => {
        calls++;
        return query(tile);
      };
    });
  try {
    selectors.withPlanningFrame(s, () => {
      const query = formationCanBeat(s, groups);
      expect(query(tiles[0], 0)).toBe(true);
      expect(calls).toBe(1);
      const before = calls;
      expect(query(tiles[0], Infinity)).toBe(false);
      expect(calls - before).toBe(groups.length);
      const seen = new Set([terrainFamily(s.tiles[tiles[0]])]);
      for (const tile of tiles) {
        const family = terrainFamily(s.tiles[tile]);
        const before = calls;
        expect(query(tile, Infinity)).toBe(false);
        expect(calls - before).toBe(seen.has(family) ? 1 : groups.length);
        seen.add(family);
        for (const defense of [0, 4, 40])
          expect(query(tile, defense)).toBe(
            groups.some((group) => selectors.power(s, group, tile) > defense),
          );
      }
    });
  } finally {
    spy.mockRestore();
  }
});

import { expect, it } from "vitest";
import { funded, piece } from "./helpers";
import { UNIT_INFO, SHIP_INFO } from "../src/game/content";
import { terrainFamily, towerPower } from "../src/game/maritime";
import {
  points,
  power,
  withPlanningFrame,
  prepareGameView,
} from "../src/game/selectors";
import type { Game, Piece, UnitClass, ShipClass } from "../src/game/types";

// Reference to the previous rule, independent of the consolidated implementation.
function reference(s: Game, units: Piece[], tile: string) {
  const family = terrainFamily(s.tiles[tile]);
  return units.reduce(
    (n, u) =>
      n +
      (u.naval && u.seasonStatus === "icebound"
        ? Math.ceil(points(u) / 4)
        : points(u)) *
        (!u.naval && UNIT_INFO[u.kind as UnitClass].family === family ? 2 : 1),
    units.some((u) => u.naval || points(u) > 0)
      ? [...new Set(units.map((u) => u.owner))].reduce(
          (n, owner) => n + towerPower(s, owner, tile),
          0,
        )
      : 0,
  );
}

it("preserves full power across terrain bonuses, all tiers, icebound fleets and mixed owners", () => {
  const s = funded("power-equivalence"),
    tiles = Object.keys(s.tiles);
  s.pieces = {};
  const classes = [...Object.keys(UNIT_INFO), ...Object.keys(SHIP_INFO)] as (
    UnitClass | ShipClass
  )[];
  for (const kind of classes)
    for (
      let tier = 1;
      tier <= (["settler", "settlership"].includes(kind) ? 1 : 4);
      tier++
    ) {
      const u = piece(s, tiles[tier], tier % s.players.length, kind, tier);
      if (u.naval && tier % 2 === 0) u.seasonStatus = "icebound";
      if (!u.naval && tier === 3) u.carrier = "transport";
    }
  for (const [i, vertex] of Object.keys(s.vertices).slice(0, 40).entries())
    s.towers[vertex] = {
      id: `tower${i}`,
      vertex,
      owner: i % s.players.length,
      tier: 1 + (i % 4),
    };
  const units = Object.values(s.pieces);
  const cases = [
    [],
    units,
    units.slice().reverse(),
    units.filter((u) => u.naval),
    units.filter((u) => !u.naval),
    ...units.map((u) => [u]),
  ];
  for (const run of [
    (fn: () => void) => fn(),
    (fn: () => void) => withPlanningFrame(s, fn),
  ])
    run(() => {
      for (const group of cases)
        for (const tile of tiles)
          expect(power(s, group, tile)).toBe(reference(s, group, tile));
    });
  prepareGameView(s);
  expect(power(s, units, tiles[0])).toBe(reference(s, units, tiles[0]));
  const draft = structuredClone(s);
  for (const tower of Object.values(draft.towers)) tower.tier = 4;
  withPlanningFrame(s, () =>
    expect(power(draft, Object.values(draft.pieces), tiles[0])).toBe(
      reference(draft, Object.values(draft.pieces), tiles[0]),
    ),
  );
});

it("retains the different tower-support rules for civilian armies and zero-power ships", () => {
  const s = funded("civilian-power"),
    tile = Object.keys(s.tiles)[0],
    vertex = s.tiles[tile].vertices[0];
  const merchant = piece(s, tile, 0, "merchant"),
    settler = piece(s, tile, 1, "settler"),
    ship = piece(s, tile, 0, "fishing", 1);
  s.towers[vertex] = { id: "tower", vertex, owner: 1, tier: 4 };
  expect(power(s, [merchant, settler], tile)).toBe(0);
  expect(power(s, [ship, settler], tile)).toBe(4);
  expect(power(s, [ship, settler, settler], tile)).toBe(4);
});

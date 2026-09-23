import { expect, it, vi } from "vitest";
import { indexRegionalLandForces } from "../src/game/ai-regional-forces";
import { collector } from "../src/game/maritime";
import { ownPieces, withPlanningFrame } from "../src/game/selectors";
import * as world from "../src/game/world";
import { funded, piece } from "./helpers";
import { SHIP_INFO, UNIT_INFO } from "../src/game/content";
import type { Game, ShipClass, UnitClass } from "../src/game/types";

function fixture() {
  const s = funded("regional-objectives");
  s.pieces = {};
  const tiles = Object.keys(s.tiles),
    regions = new Map<string, number>();
  for (const [i, tile] of tiles.entries()) if (i % 3) regions.set(tile, i % 7);
  const kinds = [...Object.keys(UNIT_INFO), ...Object.keys(SHIP_INFO)] as (
    UnitClass | ShipClass
  )[];
  for (let i = 0; i < 400; i++) {
    const u = piece(
      s,
      tiles[i % tiles.length],
      i % 4,
      kinds[i % kinds.length],
      1 + (i % 4),
    );
    if (i % 4 === 0) u.carrier = "carrier";
    if (i % 7 === 0) u.moved = 2;
    if (i % 11 === 0) u.acted = true;
    if (i % 13 === 0) u.seasonStatus = u.naval ? "icebound" : "adrift";
  }
  return { s, regions };
}

function compare(s: Game, regions: Map<string, number>) {
  const before = JSON.stringify(s);
  withPlanningFrame(s, () => {
    const indexed = indexRegionalLandForces(s, regions);
    for (const region of [undefined, ...new Set(regions.values())]) {
      const expected = ownPieces(s).filter(
        (u) =>
          !u.naval &&
          !collector(u) &&
          (u.carrier
            ? world
                .neighbors(u.tile)
                .some((tile) => regions.get(tile) === region)
            : regions.get(u.tile) === region),
      );
      expect((indexed.get(region) ?? []).map((u) => u.id)).toEqual(
        expected.map((u) => u.id),
      );
      expect(new Set(indexed.get(region)).size).toBe(expected.length);
    }
  });
  expect(JSON.stringify(s)).toBe(before);
}

it("preserves geographic candidates and unit order for every region, owner and passenger shore", () => {
  const { s, regions } = fixture();
  for (const active of [0, 1, 3]) compare({ ...s, active }, regions);
});

it("reads new positions, owners, embarkation and terrain in the next decision", () => {
  const { s, regions } = fixture();
  compare(s, regions);
  const changed = structuredClone(s),
    tiles = Object.keys(changed.tiles);
  for (const [i, u] of Object.values(changed.pieces).entries()) {
    if (i % 2) u.owner = 0;
    if (i % 3) delete u.carrier;
    u.tile = tiles[(i + 13) % tiles.length];
  }
  for (const [i, tile] of tiles.entries()) {
    if (i % 2) regions.delete(tile);
    else regions.set(tile, i % 5);
  }
  compare(changed, regions);
});

it("checks neighboring regions once per carrier tile rather than once per passenger", () => {
  const s = funded("large-passenger-region");
  s.pieces = {};
  const tiles = Object.keys(s.tiles),
    regions = new Map(tiles.map((tile, i) => [tile, i % 3]));
  for (let i = 0; i < 2000; i++)
    piece(s, tiles[i % 2], 0, "heavy", 2).carrier = "carrier";
  const spy = vi.spyOn(world, "neighbors");
  try {
    const result = indexRegionalLandForces(s, regions);
    expect(spy).toHaveBeenCalledTimes(2);
    for (const group of result.values())
      expect(new Set(group).size).toBe(group.length);
  } finally {
    spy.mockRestore();
  }
});

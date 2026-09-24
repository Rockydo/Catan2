import { expect, it } from "vitest";
import reference from "./geography-v4-reference.json";
import { elevationAt, geographyAt, landform } from "../src/game/geography";
import { climateSetting } from "../src/game/geographic-climate";
import {
  LANDFORMS,
  worldLandform,
  regionalLandform,
} from "../src/game/physical-landforms";
import { generateWorld, neighbors, addHexes } from "../src/game/world";
import { newGame } from "../src/game/engine";
import {
  serializePacked,
  deserialize,
  assertInvariants,
} from "../src/game/save";
it("preserves original version 4 elevations, drainage and climate settings exactly", () => {
  for (const row of reference) {
    expect(landform(row.seed, 4)).toBe(row.form);
    expect(elevationAt(row.seed, row.id, 4)).toBe(row.height);
    expect(geographyAt(row.seed, row.id, 4)).toEqual(row.geography);
    expect(climateSetting(row.seed, row.id, 4)).toEqual(row.climate);
  }
});
it("supports all four new formations with legal land, water, drainage and expedition seams", () => {
  for (const form of LANDFORMS.slice(10)) {
    let seed = "";
    for (let i = 0; i < 1000; i++)
      if (worldLandform(`formation-${i}`) === form) {
        seed = `formation-${i}`;
        break;
      }
    expect(seed).not.toBe("");
    const world = generateWorld(seed, 320, true);
    expect(world.geographyVersion).toBe(7);
    const land = Object.values(world.tiles).filter(
      (t) => !["water", "ice", "peaks"].includes(t.resource),
    );
    const sea = Object.values(world.tiles).filter(
      (t) => t.resource === "water",
    );
    expect(land.length).toBeGreaterThan(55);
    expect(sea.length).toBeGreaterThan(5);
    const old = structuredClone(world.tiles);
    const more = [
      ...new Set(Object.keys(world.tiles).flatMap(neighbors)),
    ].filter((id) => !world.tiles[id]);
    const reverse = structuredClone(world);
    addHexes(world, seed, more);
    addHexes(reverse, seed, [...more].reverse());
    expect(world.tiles).toEqual(reverse.tiles);
    for (const [id, tile] of Object.entries(old))
      expect(world.tiles[id]).toEqual(tile);
    for (const tile of Object.values(world.tiles)) {
      const to = tile.geography?.downstream;
      if (to) {
        expect(neighbors(tile.id)).toContain(to);
        expect(elevationAt(seed, to)).toBeLessThan(elevationAt(seed, tile.id));
      }
      if (tile.geography?.pass) {
        expect(
          neighbors(tile.id).some((id) => world.tiles[id]?.geography?.pass),
        ).toBe(false);
        expect(
          neighbors(tile.id).filter(
            (id) => world.tiles[id]?.resource === "peaks",
          ).length,
        ).toBeGreaterThanOrEqual(2);
      }
    }
  }
});
it("retains variety well beyond the initial map and reloads new geography", () => {
  const forms = new Set<string>();
  for (let i = 0; i < 50; i++)
    for (const id of ["0,0", "160,-80", "-128,224"]) {
      const seed = `formation-wide-${i}`;
      forms.add(regionalLandform(seed, id));
      const h = elevationAt(seed, id);
      expect(Number.isFinite(h)).toBe(true);
      expect(h).toBeGreaterThan(0);
      expect(h).toBeLessThan(1);
    }
  for (const f of LANDFORMS.slice(10)) expect(forms.has(f)).toBe(true);
  const s = newGame("formation-save");
  assertInvariants(s);
  expect(deserialize(serializePacked(s))).toEqual(s);
});

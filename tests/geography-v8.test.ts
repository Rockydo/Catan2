import { expect, it } from "vitest";
import reference from "./geography-v7-reference.json";
import {
  geographyAt,
  elevationAt,
  landform,
  GEOGRAPHY_VERSION,
} from "../src/game/geography";
import { climateSetting } from "../src/game/geographic-climate";
import {
  LANDFORMS,
  worldLandform,
  regionalLandform,
} from "../src/game/physical-landforms";
import { generateWorld, addHexes, neighbors } from "../src/game/world";
import { LANDFORM_LABELS } from "../src/ui/landform-labels";

it("preserves version 7 terrain, drainage and climate exactly", () => {
  for (const row of reference) {
    expect(landform(row.seed, 7)).toBe(row.form);
    expect(elevationAt(row.seed, row.id, 7)).toBe(row.height);
    expect(geographyAt(row.seed, row.id, 7)).toEqual(row.geography);
    expect(climateSetting(row.seed, row.id, 7)).toEqual(row.climate);
  }
});

it("generates the four new landforms with usable starts, lawful passes and stable expedition seams", () => {
  for (const form of LANDFORMS.slice(14, 18)) {
    let seed = "";
    for (let i = 0; i < 1000; i++)
      if (worldLandform(`new-basin-${i}`, 8) === form) {
        seed = `new-basin-${i}`;
        break;
      }
    expect(seed, form).not.toBe("");
    expect(LANDFORM_LABELS[form].en).toBeTruthy();
    expect(LANDFORM_LABELS[form].fr).toBeTruthy();
    const world = generateWorld(seed, 320, true, 8);
    expect(world.geographyVersion).toBe(8);
    const tiles = Object.values(world.tiles);
    expect(
      tiles.filter((t) => !["water", "ice", "peaks"].includes(t.resource))
        .length,
      form,
    ).toBeGreaterThan(55);
    expect(
      tiles.filter((t) => ["water", "ice"].includes(t.resource)).length,
      form,
    ).toBeGreaterThan(5);
    const copy = structuredClone(world),
      old = structuredClone(world.tiles);
    const border = [
      ...new Set(Object.keys(world.tiles).flatMap(neighbors)),
    ].filter((id) => !world.tiles[id]);
    addHexes(world, seed, border);
    addHexes(copy, seed, [...border].reverse());
    expect(world.tiles).toEqual(copy.tiles);
    for (const [id, tile] of Object.entries(old))
      expect(world.tiles[id]).toEqual(tile);
    for (const tile of Object.values(world.tiles)) {
      const to = tile.geography?.downstream;
      if (to) {
        expect(neighbors(tile.id)).toContain(to);
        expect(elevationAt(seed, to, 8)).toBeLessThan(
          elevationAt(seed, tile.id, 8),
        );
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
}, 20000);

it("sustains a long connected mainland river without cycles or fake uphill links", () => {
  const seed = "river-survey-22";
  let longest = 0;
  for (let q = -12; q <= 12; q++)
    for (let r = -12; r <= 12; r++) {
      if (Math.abs(q + r) > 12) continue;
      let id = `${q},${r}`;
      const seen = new Set<string>();
      while (true) {
        expect(seen.has(id)).toBe(false);
        seen.add(id);
        const next = geographyAt(seed, id, 8).downstream;
        if (!next) break;
        expect(neighbors(id)).toContain(next);
        expect(elevationAt(seed, next, 8)).toBeLessThan(
          elevationAt(seed, id, 8),
        );
        id = next;
      }
      longest = Math.max(longest, seen.size - 1);
    }
  expect(longest).toBeGreaterThanOrEqual(20);
  expect(GEOGRAPHY_VERSION).toBeGreaterThanOrEqual(8);
  expect(LANDFORMS).toContain(regionalLandform(seed, "0,0", 8));
}, 15000);

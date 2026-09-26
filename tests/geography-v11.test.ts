import { it, expect } from "vitest";
import { createHash } from "node:crypto";
import reference from "./geography-v10-reference.json";
import { generateWorld, neighbors, addHexes } from "../src/game/world";
import {
  GEOGRAPHY_VERSION,
  geographyAt,
  elevationAt,
} from "../src/game/geography";
import { climateSetting } from "../src/game/geographic-climate";
import { worldStructure } from "../src/game/world-structure";
import { newGame, applyCommand } from "../src/game/engine";
import { chooseAIAction } from "../src/game/ai";
import {
  assertInvariants,
  serializePacked,
  deserialize,
} from "../src/game/save";
import { compatibleClimate } from "../src/game/climate-content";
import type { World } from "../src/game/types";
function distribution(world: World) {
  const tiles = Object.values(world.tiles),
    land = tiles.filter((t) => !["water", "ice"].includes(t.resource));
  const components = (
    ids: string[],
    same: (a: string, b: string) => boolean = () => true,
  ) => {
    const left = new Set(ids),
      sizes: number[] = [];
    for (const id of ids) {
      if (!left.delete(id)) continue;
      const group = [id];
      for (let i = 0; i < group.length; i++)
        for (const n of neighbors(group[i]))
          if (left.has(n) && same(group[i], n)) {
            left.delete(n);
            group.push(n);
          }
      sizes.push(group.length);
    }
    return sizes.sort((a, b) => b - a);
  };
  const islands = components(land.map((t) => t.id)),
    climates = components(
      land.map((t) => t.id),
      (a, b) => world.tiles[a].climate === world.tiles[b].climate,
    ),
    peaks = land.filter((t) => t.resource === "peaks");
  return {
    land: land.length,
    largest: islands[0],
    small: islands.filter((n) => n >= 2 && n <= 35).length,
    climate: climates[0],
    peaks: peaks.length,
    linked: peaks.filter((t) =>
      neighbors(t.id).some((n) => world.tiles[n]?.resource === "peaks"),
    ).length,
  };
}
it("preserves complete generation-10 worlds and distant physical fields", () => {
  for (const row of reference) {
    expect(
      createHash("sha256")
        .update(JSON.stringify(generateWorld(row.seed, 125, true, 10)))
        .digest("hex"),
    ).toBe(row.hash);
    for (const s of row.samples) {
      expect(elevationAt(row.seed, s.id, 10)).toBe(s.height);
      expect(geographyAt(row.seed, s.id, 10)).toEqual(s.geo);
      expect(climateSetting(row.seed, s.id, 10)).toEqual(s.climate);
    }
  }
}, 15000);
it("produces smaller land and climate blocks, more islands and connected mountain chains across fixed seeds", () => {
  expect(GEOGRAPHY_VERSION).toBe(11);
  const old: ReturnType<typeof distribution>[] = [],
    current: ReturnType<typeof distribution>[] = [],
    modes = new Set<string>();
  for (let i = 0; i < 24; i++) {
    const seed = `fracture-survey-${i}`;
    old.push(distribution(generateWorld(seed, 320, true, 10)));
    const world = generateWorld(seed, 320, true, 11);
    current.push(distribution(world));
    modes.add(worldStructure(seed));
    expect(current.at(-1)!.land).toBeGreaterThan(100);
    for (const t of Object.values(world.tiles))
      for (const n of neighbors(t.id))
        if (world.tiles[n])
          expect(compatibleClimate(t.climate!, world.tiles[n].climate!)).toBe(
            true,
          );
  }
  const sum = (rows: typeof old, k: keyof (typeof old)[number]) =>
    rows.reduce((s, r) => s + r[k], 0);
  expect(modes.size).toBe(3);
  expect(sum(current, "largest")).toBeLessThan(sum(old, "largest") * 0.75);
  expect(sum(current, "small")).toBeGreaterThan(sum(old, "small") * 2);
  expect(sum(current, "climate")).toBeLessThan(sum(old, "climate") * 0.7);
  expect(sum(current, "linked") / sum(current, "peaks")).toBeGreaterThan(0.7);
  expect(current.some((r) => r.largest > 180)).toBe(true);
}, 30000);
it("supports twelve-faction starts, intact saves and stable new frontiers in each structure", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 24 && seen.size < 3; i++) {
    const seed = `fracture-survey-${i}`,
      mode = worldStructure(seed);
    if (seen.has(mode)) continue;
    seen.add(mode);
    let s = newGame(
      seed,
      Array.from({ length: 12 }, (_, i) => ({
        name: `Realm ${i}`,
        control: i === 0 ? ("human" as const) : ("standard" as const),
      })),
    );
    for (let n = 0; s.phase.startsWith("setup") && n < 60; n++) {
      const result = applyCommand(s, chooseAIAction(s));
      expect(result.ok).toBe(true);
      if (result.ok) s = result.state;
    }
    expect(s.phase.startsWith("setup")).toBe(false);
    assertInvariants(s);
    expect(deserialize(serializePacked(s))).toEqual(s);
    const old = structuredClone(s.tiles),
      copy = structuredClone(s),
      border = [...new Set(Object.keys(old).flatMap(neighbors))].filter(
        (id) => !old[id],
      );
    addHexes(s, seed, border);
    addHexes(copy, seed, border.reverse());
    expect(s.tiles).toEqual(copy.tiles);
    for (const id in old) expect(s.tiles[id]).toEqual(old[id]);
    for (const t of Object.values(s.tiles)) {
      if (t.geography?.pass) {
        expect(
          neighbors(t.id).filter((n) => s.tiles[n]?.resource === "peaks")
            .length,
        ).toBeGreaterThanOrEqual(2);
        expect(neighbors(t.id).some((n) => s.tiles[n]?.geography?.pass)).toBe(
          false,
        );
      }
      if (t.geography?.downstream)
        expect(elevationAt(seed, t.geography.downstream, 11)).toBeLessThan(
          elevationAt(seed, t.id, 11),
        );
    }
  }
  expect(seen.size).toBe(3);
}, 30000);

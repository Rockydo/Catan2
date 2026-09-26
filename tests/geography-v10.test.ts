import { expect, it } from "vitest";
import reference from "./geography-v9-reference.json";
import seeds from "./geography-v10-seeds.json";
import {
  EXTRA_LANDFORMS,
  EXTRA_LANDFORM_IDS,
  formationAffinity,
  formationResourceWeight,
  expandedHeight,
} from "../src/game/landform-expansion";
import {
  LANDFORMS,
  worldLandform,
  regionalLandform,
} from "../src/game/physical-landforms";
import {
  geographyAt,
  elevationAt,
  landform,
  GEOGRAPHY_VERSION,
  geographicLandChoices,
} from "../src/game/geography";
import { climateSetting } from "../src/game/geographic-climate";
import { generateWorld, neighbors, addHexes } from "../src/game/world";
import { newGame, applyCommand } from "../src/game/engine";
import { chooseAIAction } from "../src/game/ai";
import {
  assertInvariants,
  serializePacked,
  deserialize,
} from "../src/game/save";
import { BIOME_INFO } from "../src/game/climate-content";
it("preserves generation 9 climate, relief and drainage exactly", () => {
  for (const row of reference) {
    expect(landform(row.seed, 9)).toBe(row.form);
    expect(elevationAt(row.seed, row.id, 9)).toBe(row.height);
    expect(geographyAt(row.seed, row.id, 9)).toEqual(row.geography);
    expect(climateSetting(row.seed, row.id, 9)).toEqual(row.climate);
  }
});
it("adds fifteen distinct complete formations and finite nonidentical relief", () => {
  expect(GEOGRAPHY_VERSION).toBe(10);
  expect(LANDFORMS).toHaveLength(34);
  expect(EXTRA_LANDFORM_IDS).toHaveLength(15);
  const shapes = new Set<string>();
  for (const form of EXTRA_LANDFORM_IDS) {
    const info = EXTRA_LANDFORMS[form];
    expect(info.en).toBeTruthy();
    expect(info.fr).toBeTruthy();
    expect(info.detail).toBeTruthy();
    expect(info.detailFr).toBeTruthy();
    const heights = [];
    for (let q = -14; q <= 14; q++)
      for (let r = -14; r <= 14; r++) {
        const h = expandedHeight("relief-contract", q, r, form);
        expect(Number.isFinite(h)).toBe(true);
        expect(h).toBeGreaterThan(0);
        expect(h).toBeLessThan(1);
        heights.push(h.toFixed(4));
      }
    shapes.add(heights.join(","));
  }
  expect(shapes.size).toBe(15);
});
for (const form of EXTRA_LANDFORM_IDS)
  it(`${form}: playable starts, compact lakes, downhill rivers and stable frontiers`, () => {
    for (const [index, seed] of seeds[form].entries()) {
      expect(worldLandform(seed, 10)).toBe(form);
      expect(regionalLandform(seed, "0,0", 10)).toBe(form);
      const count = index ? 125 : 320,
        world = generateWorld(seed, count, true),
        old = structuredClone(world.tiles);
      const tiles = Object.values(world.tiles);
      expect(
        tiles.filter((t) => !["water", "ice", "peaks"].includes(t.resource))
          .length,
      ).toBeGreaterThan(count * 0.3);
      expect(
        tiles.filter((t) => ["water", "ice"].includes(t.resource)).length,
      ).toBeGreaterThan(3);
      const copy = structuredClone(world),
        border = [...new Set(tiles.flatMap((t) => neighbors(t.id)))].filter(
          (id) => !world.tiles[id],
        );
      addHexes(world, seed, border);
      addHexes(copy, seed, [...border].reverse());
      expect(world.tiles).toEqual(copy.tiles);
      for (const [id, t] of Object.entries(old))
        expect(world.tiles[id]).toEqual(t);
      const lakes = new Set<string>();
      for (const t of Object.values(world.tiles)) {
        if (t.geography?.pass) {
          expect(
            neighbors(t.id).filter(
              (id) => world.tiles[id]?.resource === "peaks",
            ).length,
          ).toBeGreaterThanOrEqual(2);
          expect(
            neighbors(t.id).some((id) => world.tiles[id]?.geography?.pass),
          ).toBe(false);
        }
        if (t.geography?.downstream) {
          expect(neighbors(t.id)).toContain(t.geography.downstream);
          expect(elevationAt(seed, t.geography.downstream)).toBeLessThan(
            elevationAt(seed, t.id),
          );
        }
        if (BIOME_INFO[t.biome!].family === "rugged")
          expect(t.geography?.floodplain).toBe(false);
        if (t.geography?.waterway === "lake" && !lakes.has(t.id)) {
          const group = [t.id];
          lakes.add(t.id);
          for (let i = 0; i < group.length; i++)
            for (const id of neighbors(group[i]))
              if (
                !lakes.has(id) &&
                world.tiles[id]?.geography?.waterway === "lake"
              ) {
                lakes.add(id);
                group.push(id);
              }
          expect(group.length).toBeLessThanOrEqual(12);
        }
      }
    }
    let s = newGame(
      seeds[form][0],
      Array.from({ length: 12 }, (_, i) => ({
        name: `Realm ${i}`,
        control: i === 0 ? ("human" as const) : ("standard" as const),
      })),
    );
    for (let i = 0; s.phase.startsWith("setup") && i < 60; i++) {
      const result = applyCommand(s, chooseAIAction(s));
      expect(result.ok).toBe(true);
      if (result.ok) s = result.state;
    }
    expect(s.phase.startsWith("setup")).toBe(false);
    assertInvariants(s);
    expect(deserialize(serializePacked(s))).toEqual(s);
  }, 15000);
it("keeps climate affinities and local resource effects conditional", () => {
  expect(formationAffinity("dune-seas", 0.8, 0.8)).toBe(0);
  expect(formationAffinity("dune-seas", 0.8, 0.2)).toBeGreaterThan(0);
  for (const f of [
    "drumlin-fields",
    "moraine-belts",
    "outwash-plains",
  ] as const) {
    expect(formationAffinity(f, 0.9, 0.6)).toBe(0);
    expect(formationAffinity(f, 0.2, 0.6)).toBeGreaterThan(0);
  }
  expect(
    formationResourceWeight("loess-hills", "golden-fields", 0.04, 0.07, 0.5),
  ).toBeGreaterThan(1);
  expect(
    formationResourceWeight("loess-hills", "golden-fields", 0.2, 0.25, 0.5),
  ).toBe(1);
  expect(
    formationResourceWeight("lava-plateaus", "coal", 0.1, 0.1, 0.5),
  ).toBeLessThan(1);
  expect(formationResourceWeight("dune-seas", "desert", 0.04, 0.07, 0.2)).toBe(
    2,
  );
});

it("keeps level plateau tops usable while preserving steep mountain rims", () => {
  for (const form of [
    "mesa-country",
    "lava-plateaus",
    "raised-beaches",
    "canyonlands",
  ] as const) {
    const seed = seeds[form][0];
    const at = {
      ...geographyAt(seed, "0,0"),
      elevation: 0.9,
      water: false,
      lake: false,
      downstream: undefined,
    };
    const around = neighbors("0,0").map((id) => ({ ...at, id }));
    const flat = geographicLandChoices(
      seed,
      { id: "0,0", climate: "temperate" },
      at,
      around,
    );
    expect(
      flat.choices.some(([b]) => b === "bare-peaks" || b === "mountain-pass"),
    ).toBe(false);
    const rim = geographicLandChoices(
      seed,
      { id: "0,0", climate: "temperate" },
      at,
      around.map((n) => ({ ...n, elevation: 0.6 })),
    );
    expect(rim.choices.some(([b]) => b === "bare-peaks")).toBe(true);
  }
});
it("retains pronounced relief far beyond the starting region", () => {
  for (const form of [
    "canyonlands",
    "tombolo-coasts",
    "tidal-estuaries",
    "fault-scarps",
  ] as const) {
    for (const origin of [-320, 320]) {
      const heights = [];
      for (let q = origin; q < origin + 48; q += 2)
        for (let r = origin; r < origin + 48; r += 2)
          heights.push(expandedHeight("distant-expedition", q, r, form));
      expect(Math.max(...heights) - Math.min(...heights), form).toBeGreaterThan(
        0.18,
      );
    }
  }
});

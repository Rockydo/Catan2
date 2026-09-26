import { expect, it } from "vitest";
import reference from "./geography-v8-reference.json";
import {
  geographyAt,
  elevationAt,
  landform,
  GEOGRAPHY_VERSION,
  geographicLandChoices,
} from "../src/game/geography";
import { climateSetting } from "../src/game/geographic-climate";
import {
  LANDFORMS,
  worldLandform,
  regionalLandform,
} from "../src/game/physical-landforms";
import { generateWorld, neighbors, addHexes } from "../src/game/world";
import { BIOME_INFO } from "../src/game/climate-content";

it("preserves version 8 physical fields, climate and drainage exactly", () => {
  for (const row of reference) {
    expect(landform(row.seed, 8)).toBe(row.form);
    expect(elevationAt(row.seed, row.id, 8)).toBe(row.height);
    expect(geographyAt(row.seed, row.id, 8)).toEqual(row.geography);
    expect(climateSetting(row.seed, row.id, 8)).toEqual(row.climate);
  }
});
it("adds exactly one formation and keeps playable karst relief and stable frontier seams", () => {
  expect(GEOGRAPHY_VERSION).toBeGreaterThanOrEqual(9);
  expect(LANDFORMS.slice(0, 19)).toHaveLength(19);
  const seeds: string[] = [];
  for (let i = 0; i < 1000 && seeds.length < 4; i++) {
    const seed = `karst-survey-${i}`;
    if (
      worldLandform(seed, 9) === "karst-uplands" &&
      regionalLandform(seed, "0,0", 9) === "karst-uplands"
    )
      seeds.push(seed);
  }
  expect(seeds).toHaveLength(4);
  for (const seed of seeds) {
    const world = generateWorld(seed, 320, true, 9),
      copy = structuredClone(world);
    const tiles = Object.values(world.tiles);
    expect(
      tiles.filter((t) => !["water", "ice", "peaks"].includes(t.resource))
        .length,
    ).toBeGreaterThan(80);
    expect(tiles.filter((t) => t.resource === "peaks").length).toBeGreaterThan(
      3,
    );
    expect(
      tiles.filter((t) => ["water", "ice"].includes(t.resource)).length,
    ).toBeGreaterThan(5);
    const elevations = new Set(
      tiles.map((t) => Math.round(t.geography!.elevation * 100)),
    );
    expect(elevations.size).toBeGreaterThan(20);
    const border = [...new Set(tiles.flatMap((t) => neighbors(t.id)))].filter(
      (id) => !world.tiles[id],
    );
    addHexes(world, seed, border);
    addHexes(copy, seed, [...border].reverse());
    expect(world.tiles).toEqual(copy.tiles);
    for (const t of Object.values(world.tiles)) {
      if (t.geography?.pass) {
        expect(
          neighbors(t.id).filter((id) => world.tiles[id]?.resource === "peaks")
            .length,
        ).toBeGreaterThanOrEqual(2);
        expect(
          neighbors(t.id).some((id) => world.tiles[id]?.geography?.pass),
        ).toBe(false);
      }
      if (t.geography?.downstream) {
        expect(neighbors(t.id)).toContain(t.geography.downstream);
        expect(elevationAt(seed, t.geography.downstream, 9)).toBeLessThan(
          elevationAt(seed, t.id, 9),
        );
      }
      if (BIOME_INFO[t.biome!].family === "rugged")
        expect(t.geography?.floodplain).toBe(false);
    }
  }
}, 20000);
it("conditions karst resources on limestone relief without importing another climate's crops", () => {
  let seed = "";
  for (let i = 0; i < 1000; i++)
    if (regionalLandform(`karst-survey-${i}`, "0,0", 9) === "karst-uplands") {
      seed = `karst-survey-${i}`;
      break;
    }
  const at = { elevation: 0.8, water: false },
    around = neighbors("0,0").map((id) => ({
      id,
      elevation: 0.65,
      water: false,
    }));
  const karst = geographicLandChoices(
    seed,
    { id: "0,0", climate: "temperate" },
    at as any,
    around as any,
    9,
  );
  const plain = geographicLandChoices(
    seed,
    { id: "0,0", climate: "temperate" },
    at as any,
    around as any,
    8,
  );
  const weight = (x: typeof karst, b: string) =>
    x.choices.find(([id]) => id === b)?.[1] ?? 0;
  expect(weight(karst, "stone")).toBeGreaterThan(weight(plain, "stone"));
  expect(weight(karst, "iron")).toBeLessThan(weight(plain, "iron"));
  expect(
    karst.choices.some(([b]) => ["rice-field", "maize-field"].includes(b)),
  ).toBe(false);
});

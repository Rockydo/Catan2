import { startingClimateSeed } from "./climate-fixture";
import { describe, expect, it } from "vitest";
import {
  BIOME_INFO,
  CLIMATE_INFO,
  CLIMATES,
  FRONTIER_CLIMATES,
  biomeYield,
  compatibleClimate,
  climateTransitionWeight,
  type Climate,
  type Biome,
} from "../src/game/climate-content";
import { CLIMATE_CONTINUITY, climateTerrain } from "../src/game/climate";
import {
  generateHex,
  generateWorld,
  addHexes,
  neighbors,
} from "../src/game/world";
import {
  SEASONS,
  seasonalProfile,
  iceOdds,
  seasonWeather,
  syncSeasonSurfaces,
} from "../src/game/seasons";
import { harvestYield, tileGoods } from "../src/game/maritime";
import { deserialize, serialize, assertInvariants } from "../src/game/save";
import { newGame, applyCommand } from "../src/game/engine";
import { chooseAIAction } from "../src/game/ai";
import { REALM_NAMES } from "../src/game/content";
import type { Raw } from "../src/game/types";

function tile(climate: Climate, biome: Biome) {
  return {
    ...generateHex("frontier-tile", "0,0"),
    climate,
    biome,
    resource: BIOME_INFO[biome].resource,
  };
}

describe("new regional climates", () => {
  it("has reciprocal reachable borders, complete probability tables and modest entry weights", () => {
    expect(CLIMATES).toHaveLength(22);
    expect(CLIMATE_CONTINUITY).toBe(0.88);
    for (const climate of FRONTIER_CLIMATES) {
      const info = CLIMATE_INFO[climate];
      expect(info.terrain.reduce((n, [, weight]) => n + weight, 0)).toBe(100);
      expect(info.water.every(([, chance]) => chance > 0 && chance < 1)).toBe(
        true,
      );
      for (const neighbor of info.compatible) {
        expect(compatibleClimate(neighbor, climate)).toBe(true);
        expect(climateTransitionWeight(neighbor, climate)).toBe(0.75);
      }
    }
    expect(compatibleClimate("tundra", "tropical")).toBe(false);
    expect(compatibleClimate("equatorial-wetlands", "arctic")).toBe(false);
    expect(climateTransitionWeight("tundra", "arctic")).toBe(2);
  });

  it.each(FRONTIER_CLIMATES)(
    "generates the full %s terrain table with the intended land ratio",
    (climate) => {
      const seen = new Set<Biome>();
      let land = 0;
      for (let i = 0; i < 12000; i++) {
        const t = climateTerrain(`frontier-sample-${i}`, "0,0", climate);
        seen.add(t.biome!);
        if (t.resource !== "water" && t.resource !== "ice") land++;
      }
      expect(land / 12000).toBeCloseTo(CLIMATE_INFO[climate].land, 1);
      for (const [biome] of [
        ...CLIMATE_INFO[climate].terrain,
        ...CLIMATE_INFO[climate].water,
      ])
        expect(seen.has(biome), biome).toBe(true);
    },
  );

  it("keeps every new harvest integral and conserves each raw and processed output", () => {
    for (const climate of FRONTIER_CLIMATES)
      for (const [biome] of [
        ...CLIMATE_INFO[climate].terrain,
        ...CLIMATE_INFO[climate].water,
      ]) {
        const t = tile(climate, biome),
          profile = seasonalProfile(t);
        for (const [raw, base] of Object.entries(biomeYield(biome, climate))) {
          const amounts = SEASONS.map((s) => profile[s][raw as Raw] ?? 0);
          expect(
            amounts.every(Number.isInteger),
            `${climate}/${biome}/${raw}`,
          ).toBe(true);
          expect(amounts.reduce((a, b) => a + b, 0)).toBe(base! * 4);
        }
      }
    const mangrove = tile("equatorial-wetlands", "mangrove");
    expect(tileGoods(mangrove)).toEqual(["lumber", "fish"]);
    expect(harvestYield(mangrove, 0, 4, true)).toEqual({
      lumber: 4,
      fish: 4,
      planks: 2,
      provisions: 2,
    });
    expect(
      harvestYield(
        tile("temperate-rainforest", "old-growth-forest"),
        0,
        3,
        true,
      ),
    ).toEqual({ lumber: 9, planks: 3 });
  });

  it("distinguishes brief tundra harvests from year-round wetland food and mild coastal winters", () => {
    expect(
      SEASONS.map(
        (s) => seasonalProfile(tile("tundra", "tundra-heath"))[s].grain ?? 0,
      ),
    ).toEqual([0, 2, 2, 0]);
    expect(
      SEASONS.map(
        (s) =>
          seasonalProfile(tile("equatorial-wetlands", "sago-grove"))[s].grain,
      ),
    ).toEqual([1, 1, 1, 1]);
    expect(
      SEASONS.map(
        (s) => seasonalProfile(tile("tundra", "musk-ox-range"))[s].wool ?? 0,
      ),
    ).toEqual([1, 3, 0, 0]);
    expect(iceOdds(tile("tundra", "fish"), "autumn", "late")).toEqual([
      0.35, 0,
    ]);
    expect(iceOdds(tile("tundra", "cod"), "summer", "early")).toEqual([0, 1]);
    expect(
      iceOdds(tile("temperate-rainforest", "fish"), "winter", "late"),
    ).toEqual([0, 1]);
    expect(
      seasonWeather(tile("equatorial-wetlands", "mangrove"), "winter"),
    ).toBe("Lower water");
  });

  it("maintains compatible boundaries during repeated exploration and preserves revealed terrain", () => {
    for (let seed = 0; seed < 24; seed++) {
      const w = generateWorld(`frontier-borders-${seed}`, 300);
      const original = structuredClone(w.tiles);
      for (let round = 0; round < 3; round++) {
        const unseen = [...new Set(Object.keys(w.tiles).flatMap(neighbors))]
          .filter((id) => !w.tiles[id])
          .slice(0, 40);
        addHexes(w, `frontier-borders-${seed}`, unseen);
        for (const t of Object.values(w.tiles))
          for (const id of neighbors(t.id))
            if (w.tiles[id])
              expect(compatibleClimate(t.climate!, w.tiles[id].climate!)).toBe(
                true,
              );
      }
      for (const [id, t] of Object.entries(original))
        expect(w.tiles[id]).toEqual(t);
    }
  });

  it.each(FRONTIER_CLIMATES)(
    "finishes a twelve-faction draft with %s and reloads all upper seats",
    (climate) => {
      let s = newGame(
        startingClimateSeed(climate, 300),
        REALM_NAMES.map((name) => ({ name, control: "standard" })),
      );
      syncSeasonSurfaces(s);
      for (let i = 0; i < 48; i++) {
        const result = applyCommand(s, chooseAIAction(s));
        expect(result.ok, result.error).toBe(true);
        s = result.state;
      }
      expect(s.phase).toBe("roll");
      expect(Object.keys(s.towns)).toHaveLength(24);
      assertInvariants(s);
      expect(deserialize(serialize(s))).toEqual(s);
    },
  );
});

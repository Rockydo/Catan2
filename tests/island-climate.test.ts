import { expect, it } from "vitest";
import { generateHex } from "../src/game/world";
import {
  BIOME_INFO,
  CLIMATE_INFO,
  compatibleClimate,
  type Biome,
  type Climate,
} from "../src/game/climate-content";
import { seasonalProfile, SEASONS } from "../src/game/seasons";
import {
  suitableWildlifeHabitat,
  weatherChoices,
} from "../src/game/environment";
import {
  baseSeasonalTerrainPattern,
  seasonalTerrainPattern,
  terrainArtFile,
} from "../src/ui/terrain-art";
import { geographicClimateWeight } from "../src/game/geographic-climate";
import { existsSync } from "node:fs";
const tile = (biome: Biome, climate: Climate) => ({
  ...generateHex("island", "0,0"),
  biome,
  climate,
  resource: BIOME_INFO[biome].resource,
  geography: { elevation: 0.4, region: climate, animals: [], fauna: {} },
});
it("has a complete warm island economy and prefers maritime archipelagos over continental interiors", () => {
  expect(
    CLIMATE_INFO["tropical-maritime"].terrain.reduce((s, [, w]) => s + w, 0),
  ).toBe(100);
  const c = {
    temperature: 0.83,
    moisture: 0.65,
    altitude: 0.1,
    maritime: 1,
    landform: "atolls" as const,
  };
  expect(geographicClimateWeight(c, "tropical-maritime")).toBeGreaterThan(
    geographicClimateWeight(
      { ...c, maritime: 0, landform: "continent" },
      "tropical-maritime",
    ) * 10,
  );
  for (const n of CLIMATE_INFO["tropical-maritime"].compatible)
    expect(compatibleClimate(n, "tropical-maritime")).toBe(true);
  for (const season of SEASONS) {
    expect(
      weatherChoices("tropical-maritime", season).some(([w]) => w === "cold"),
    ).toBe(false);
    for (const [biome] of CLIMATE_INFO["tropical-maritime"].terrain) {
      expect(
        existsSync(
          "public/assets/" +
            terrainArtFile(
              baseSeasonalTerrainPattern(
                tile(biome, "tropical-maritime"),
                season,
              ),
            ),
        ),
      ).toBe(true);
    }
  }
  const food = seasonalProfile(tile("breadfruit-grove", "tropical-maritime"));
  expect(SEASONS.map((s) => food[s].grain)).toEqual([2, 2, 3, 1]);
});
it("never borrows snowy temperate woods for tropical riverbanks or legacy forests", () => {
  for (const climate of [
    "tropical",
    "monsoon",
    "mesoamerican",
    "tropical-maritime",
  ] as Climate[])
    for (const biome of [
      "woods",
      "forest",
      "hunting-forest",
      "river-woods",
    ] as Biome[]) {
      const key = baseSeasonalTerrainPattern(tile(biome, climate), "winter");
      expect(key).not.toMatch(/temperate-woods|cold-forest|alpine/);
      expect(existsSync("public/assets/" + terrainArtFile(key))).toBe(true);
    }
});
it("keeps deer and turkeys visible and able to settle both native woods and grassland", () => {
  for (const [kind, climates] of [
    ["deer", ["temperate", "prairie"]],
    ["turkey", ["prairie", "mesoamerican"]],
  ] as const)
    for (const climate of climates)
      for (const biome of [
        "wildlife-grassland",
        "woods",
        "river-woods",
      ] as Biome[]) {
        const t = tile(biome, climate);
        expect(suitableWildlifeHabitat(t, kind)).toBe(true);
        t.geography.animals = [kind] as any;
        for (const season of SEASONS) {
          expect(seasonalTerrainPattern(t, season)).toMatch(
            new RegExp(`^wild-${kind}-`),
          );
          expect(
            existsSync(
              "public/assets/" +
                terrainArtFile(seasonalTerrainPattern(t, season)),
            ),
          ).toBe(true);
        }
      }
});

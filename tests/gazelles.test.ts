import { expect, it } from "vitest";
import { existsSync } from "node:fs";
import { maritimeFixture } from "./maritime-fixture";
import {
  BIOME_INFO,
  type Biome,
  type Climate,
} from "../src/game/climate-content";
import {
  baseGeographicYield,
  gazelleHabitat,
  WILDLIFE_GOODS,
} from "../src/game/geography";
import {
  nativeWildlifeKind,
  suitableWildlifeHabitat,
  wildlifeSpawnChance,
  gazelleHabitatWeight,
  migrationCandidates,
  restoreWildlifeHabitats,
  syncEnvironment,
} from "../src/game/environment";
import { neighbors, randomAt } from "../src/game/world";
import { serializePacked, deserialize } from "../src/game/save";
import { seasonalTerrainPattern, terrainArtFile } from "../src/ui/terrain-art";
import { seasonalProfile, SEASONS } from "../src/game/seasons";
function fixture() {
  const { s } = maritimeFixture();
  s.geographyVersion = 4;
  s.wildlife = [];
  s.environmentRound = s.round;
  for (const t of Object.values(s.tiles)) {
    t.climate = "desert";
    t.biome = "desert";
    t.resource = "desert";
    t.geography = {
      elevation: 0.4,
      region: "desert:0,0",
      animals: [],
      fauna: {},
    };
  }
  const tile = s.tiles["0,0"];
  tile.biome = "oasis";
  tile.resource = BIOME_INFO.oasis.resource;
  return { s, tile };
}
it("confines gazelles to dry natural ground and oases, preserving oasis production", () => {
  const { tile } = fixture();
  expect(gazelleHabitat(tile)).toBe(true);
  expect(nativeWildlifeKind("gazelles", tile)).toBe("gazelle");
  const before = baseGeographicYield(tile);
  tile.geography!.fauna = WILDLIFE_GOODS.gazelle;
  tile.geography!.animals = ["gazelle"];
  const after = seasonalProfile(tile).spring;
  expect(after.lumber).toBeGreaterThanOrEqual(before.lumber!);
  expect(before.grain).toBeGreaterThan(0);
  expect(after.hides).toBe(1);
  expect(after.meat).toBe(2);
  for (const biome of [
    "golden-fields",
    "olive-grove",
    "alluvial-clay",
    "iron",
    "salt-flats",
    "bare-peaks",
  ] as Biome[]) {
    tile.biome = biome;
    tile.resource = BIOME_INFO[biome].resource;
    expect(suitableWildlifeHabitat(tile, "gazelle")).toBe(false);
  }
  tile.biome = "oasis";
  tile.resource = BIOME_INFO.oasis.resource;
  tile.climate = "arctic";
  expect(suitableWildlifeHabitat(tile, "gazelle")).toBe(false);
});
it("prefers oases, with sparse desert populations and stronger drought attraction", () => {
  const { s, tile } = fixture(),
    beside = s.tiles[neighbors(tile.id)[0]],
    far = s.tiles["3,0"];
  expect(wildlifeSpawnChance(tile)).toBe(0.35);
  expect(wildlifeSpawnChance(far)).toBe(0.08);
  far.climate = "hyperarid";
  expect(wildlifeSpawnChance(far)).toBe(0.04);
  expect(gazelleHabitatWeight(s, tile)).toBeGreaterThan(
    gazelleHabitatWeight(s, beside),
  );
  expect(gazelleHabitatWeight(s, beside)).toBeGreaterThan(
    gazelleHabitatWeight(s, far),
  );
  tile.geography!.weather = "dry";
  expect(gazelleHabitatWeight(s, tile)).toBe(12);
  const herd = {
    id: "test",
    kind: "gazelle" as const,
    tile: tile.id,
    lastRound: 0,
  };
  const reachable = migrationCandidates(s, herd);
  expect(reachable).toContain("3,0");
  expect(reachable).not.toContain("4,0");
  for (const id of neighbors(tile.id)) {
    s.tiles[id].resource = "water";
    s.tiles[id].geography!.waterway = "deep";
  }
  expect(migrationCandidates(s, herd)).toEqual([tile.id]);
});
it("surveys old habitats once, persists the result, and never rerolls the herd population on load", () => {
  const { s, tile } = fixture();
  let i = 0;
  while (
    randomAt((s.seed = `gazelle-save-${i++}`), tile.id, "wildlife-density") >=
    0.35
  ) {}
  restoreWildlifeHabitats(s);
  expect(
    s.wildlife!.some((h) => h.kind === "gazelle" && h.tile === tile.id),
  ).toBe(true);
  const count = s.wildlife!.length;
  const loaded = deserialize(serializePacked(s));
  expect(loaded.wildlife!.length).toBe(count);
  expect(loaded.tiles[tile.id].geography!.gazelleSurveyed).toBe(true);
  syncEnvironment(loaded);
  restoreWildlifeHabitats(loaded);
  expect(loaded.wildlife!.length).toBe(count);
  expect(loaded.round).toBe(s.round);
});
it("has integrated gazelles for every dry habitat and season", () => {
  const { tile } = fixture();
  for (const climate of ["desert", "hyperarid", "semiarid"] as Climate[])
    for (const biome of [
      "desert",
      "oasis",
      "steppe-plain",
      "wildlife-grassland",
    ] as Biome[])
      for (const season of SEASONS) {
        tile.climate = climate;
        tile.biome = biome;
        tile.resource = BIOME_INFO[biome].resource;
        tile.geography!.animals = ["gazelle"];
        const pattern = seasonalTerrainPattern(tile, season);
        expect(pattern, `${climate}/${biome}/${season}`).toMatch(
          /^wild-gazelle-/,
        );
        expect(existsSync("public/assets/" + terrainArtFile(pattern))).toBe(
          true,
        );
      }
});

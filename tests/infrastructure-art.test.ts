import { expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import manifest from "../src/ui/infrastructure-art-manifest.json";
import { BIOME_INFO } from "../src/game/climate-content";
import { generateHex } from "../src/game/world";
import type { Hex } from "../src/game/types";
import { seasonalTerrainPattern, terrainArtFile } from "../src/ui/terrain-art";
import {
  developmentLevel,
  DEVELOPMENT_ART_LIMIT,
} from "../src/ui/development-level";
import { seasonalYield } from "../src/game/seasons";
import { bankArt } from "../src/ui/water-connectivity";
function wheat(tier?: number): Hex {
  return {
    ...generateHex("painted-infrastructure", "0,0"),
    resource: "grain",
    biome: "golden-fields",
    climate: "temperate",
    geography: {
      elevation: 0.4,
      region: "test",
      access: "normal",
      animals: [],
      projects: tier ? { irrigation: { owner: 0, born: 1, tier } } : {},
    },
  };
}
it("collapses basic upgrades to Worked, reserving industrial visuals for real advanced tiers", () => {
  expect([0, 1, 2, 3, 4].map((tier) => developmentLevel(wheat(tier)))).toEqual([
    0, 1, 1, 2, 3,
  ]);
  const tile = wheat(2);
  for (const kind of ["soil", "terraces", "drainage"] as const)
    tile.geography!.projects![kind] = { owner: 0, born: 1, tier: 2 };
  expect(developmentLevel(tile)).toBe(1);
  tile.geography!.projects!.soil!.tier = 3;
  expect(developmentLevel(tile)).toBe(2);
  tile.geography!.projects!.soil!.tier = 4;
  expect(developmentLevel(tile)).toBe(3);
});
it("shares visual levels across combinations while utilities do not hide development", () => {
  const tile = wheat(2);
  const base = seasonalTerrainPattern(tile, "summer");
  tile.geography!.projects!.soil = { owner: 0, born: 1, tier: 1 };
  tile.geography!.projects!.granary = { owner: 0, born: 1 };
  expect(seasonalTerrainPattern(tile, "summer")).toBe(base);
  expect(base).toBe("infra-temperate-wheat-summer-worked");
  tile.geography!.projects = { granary: { owner: 0, born: 1 } };
  expect(developmentLevel(tile)).toBe(0);
  expect(seasonalTerrainPattern(tile, "summer")).toBe(
    seasonalTerrainPattern(wheat(), "summer"),
  );
});
it("preserves individual gameplay outputs, ownership and save data during appearance selection", () => {
  const tile = wheat(3);
  tile.geography!.projects!.soil = { owner: 0, born: 1, tier: 4 };
  const original = JSON.stringify(tile),
    output = seasonalYield(tile, 0, "summer");
  for (const season of ["spring", "summer", "autumn", "winter"] as const)
    seasonalTerrainPattern(tile, season);
  expect(JSON.stringify(tile)).toBe(original);
  expect(seasonalYield(tile, 0, "summer")).toEqual(output);
  tile.geography!.projects!.soil = { owner: 7, born: 1, tier: 4 };
  expect(developmentLevel(tile)).toBe(3);
  tile.geography!.projects = { irrigation: { owner: 7, born: 5 } };
  expect(developmentLevel(tile)).toBe(1);
});
it("restores the exact natural painting after ravaging", () => {
  const tile = wheat(4);
  expect(seasonalTerrainPattern(tile, "summer")).toBe(
    "infra-temperate-wheat-summer-industrial",
  );
  tile.geography!.projects = {};
  expect(seasonalTerrainPattern(tile, "summer")).toBe(
    seasonalTerrainPattern(wheat(), "summer"),
  );
});
it("uses the matching source in every season, including winter snow", () => {
  for (const season of ["spring", "summer", "autumn", "winter"] as const)
    expect(seasonalTerrainPattern(wheat(4), season)).toBe(
      `infra-temperate-wheat-${season}-industrial`,
    );
});
it.each([
  ["tropical", "rice-field", "tropical-rice", "irrigation"],
  ["cold", "barley-fields", "cold-barley", "soil"],
  ["temperate", "coal", "temperate-coal", "mining"],
] as const)(
  "resolves all development seasons for %s/%s",
  (climate, biome, family, project) => {
    const tile = wheat();
    tile.climate = climate;
    tile.biome = biome;
    tile.resource = BIOME_INFO[biome].resource;
    for (const [tier, level] of [
      [1, "worked"],
      [2, "worked"],
      [3, "mechanized"],
      [4, "industrial"],
    ] as const) {
      tile.geography!.projects = { [project]: { owner: 0, born: 1, tier } };
      for (const season of ["spring", "summer", "autumn", "winter"] as const)
        expect(seasonalTerrainPattern(tile, season)).toBe(
          `infra-${family}-${season}-${level}`,
        );
    }
  },
);
it("does not turn fishery riverbanks into developed forests", () => {
  const river = wheat();
  river.biome = "river";
  river.resource = "water";
  river.climate = "cold";
  river.geography!.waterway = "river";
  const original = bankArt(river, "summer");
  river.geography!.projects = { fishery: { owner: 0, born: 1, tier: 4 } };
  expect(bankArt(river, "summer")).toBe(original);
  expect(original).not.toContain("infrastructure/");
});
it("retains migrating animals when only the empty forest has development artwork", () => {
  const tile = wheat();
  tile.biome = "forest";
  tile.resource = "lumber";
  tile.climate = "cold";
  tile.geography!.projects = { forestry: { owner: 0, born: 1, tier: 4 } };
  expect(seasonalTerrainPattern(tile, "summer")).toBe(
    "infra-cold-forest-summer-industrial",
  );
  tile.geography!.animals = ["reindeer"];
  const natural = { ...tile, geography: { ...tile.geography!, projects: {} } };
  expect(seasonalTerrainPattern(tile, "summer")).toBe(
    seasonalTerrainPattern(natural, "summer"),
  );
  expect(seasonalTerrainPattern(tile, "summer")).toMatch(/^wild-reindeer-/);
});
it("leaves unpainted crops, climate identities and wildlife intact instead of substituting a similar tile", () => {
  const tile = wheat(4);
  for (const biome of [
    "flood-wheat",
    "millet-fields",
    "rice-field",
    "hunting-forest",
  ] as const) {
    tile.biome = biome;
    tile.climate = biome === "rice-field" ? "subtropical" : "temperate";
    tile.resource = BIOME_INFO[biome].resource;
    const natural = {
      ...tile,
      geography: { ...tile.geography!, projects: {} },
    };
    if (biome === "hunting-forest") {
      tile.geography!.animals = ["deer"];
      natural.geography.animals = ["deer"];
    }
    expect(seasonalTerrainPattern(tile, "winter")).toBe(
      seasonalTerrainPattern(natural, "winter"),
    );
  }
});
it("ships only exact-source complete paintings within the image ceiling", () => {
  const images = readdirSync("public/assets/infrastructure", {
    recursive: true,
  }).filter((f) => /\.(webp|png|jpe?g)$/i.test(String(f)));
  expect(images.length).toBeLessThanOrEqual(DEVELOPMENT_ART_LIMIT);
  const seen = new Set<string>();
  for (const [source, variants] of Object.entries(manifest)) {
    expect(existsSync(`public/assets/${source.split("?")[0]}`), source).toBe(
      true,
    );
    for (const [level, painting] of Object.entries(variants)) {
      expect(["1", "2", "3"]).toContain(level);
      expect(seen.has(painting), painting).toBe(false);
      seen.add(painting);
      const file = readFileSync(
        `public/assets/infrastructure/${painting}.webp`,
      );
      expect(file.toString("ascii", 0, 4)).toBe("RIFF");
      expect(file.toString("ascii", 8, 12)).toBe("WEBP");
      expect(file.toString("ascii", 12, 16)).toBe("VP8 ");
      expect(file.byteLength).toBeLessThan(150_000);
    }
  }
});

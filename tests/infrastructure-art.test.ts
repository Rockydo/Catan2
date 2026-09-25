import { expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import manifest from "../src/ui/infrastructure-art-manifest.json";
import { generateHex } from "../src/game/world";
import type { Hex } from "../src/game/types";
import { seasonalTerrainPattern, terrainArtFile } from "../src/ui/terrain-art";

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

it("uses separate complete paintings for each installed tier and reverts after destruction", () => {
  const paths = new Set<string>();
  for (let tier = 1; tier <= 4; tier++) {
    const tile = wheat(tier);
    const art = seasonalTerrainPattern(tile, "summer");
    expect(art).toBe(`infra-temperate-wheat-summer-irrigation-${tier}`);
    paths.add(terrainArtFile(art));
    tile.geography!.projects = {};
    expect(seasonalTerrainPattern(tile, "summer")).toBe(
      seasonalTerrainPattern(wheat(), "summer"),
    );
  }
  expect(paths.size).toBe(4);
});

it("keeps the exact natural season and crop when that infrastructure painting is not yet available", () => {
  for (const season of ["spring", "autumn", "winter"] as const)
    expect(seasonalTerrainPattern(wheat(4), season)).toBe(
      seasonalTerrainPattern(wheat(), season),
    );
  const tile = wheat(4);
  tile.biome = "flood-wheat";
  const natural = { ...tile, geography: { ...tile.geography!, projects: {} } };
  expect(seasonalTerrainPattern(tile, "summer")).toBe(
    seasonalTerrainPattern(natural, "summer"),
  );
});

it("does not misrepresent a combined or utility upgrade using a single-upgrade painting", () => {
  const tile = wheat(2);
  tile.geography!.projects!.granary = { owner: 0, born: 1 };
  expect(seasonalTerrainPattern(tile, "summer")).toBe(
    seasonalTerrainPattern(wheat(), "summer"),
  );
});

it("supports legacy tier-one records without coupling the painting to ownership", () => {
  const tile = wheat(1);
  tile.geography!.projects!.irrigation = { owner: 7, born: 5 };
  expect(seasonalTerrainPattern(tile, "summer")).toBe(
    "infra-temperate-wheat-summer-irrigation-1",
  );
});

it("resolves a combined painting regardless of project insertion order", () => {
  const tile = wheat(2);
  const irrigation = tile.geography!.projects!.irrigation!;
  tile.geography!.projects = {
    soil: { owner: 0, born: 1, tier: 1 },
    irrigation,
  };
  expect(seasonalTerrainPattern(tile, "summer")).toBe(
    "infra-temperate-wheat-summer-irrigation-2-soil-1",
  );
  tile.geography!.projects.soil!.tier = 2;
  expect(seasonalTerrainPattern(tile, "summer")).toBe(
    seasonalTerrainPattern(wheat(), "summer"),
  );
});

it("ships every registered source and complete opaque WebP variant", () => {
  const seen = new Set<string>();
  for (const [source, variants] of Object.entries(manifest)) {
    expect(existsSync(`public/assets/${source.split("?")[0]}`), source).toBe(
      true,
    );
    for (const [signature, painting] of Object.entries(variants)) {
      expect(signature.split("+")).toEqual(signature.split("+").sort());
      expect(seen.has(painting), painting).toBe(false);
      seen.add(painting);
      const file = readFileSync(
        `public/assets/infrastructure/${painting}.webp`,
      );
      expect(file.toString("ascii", 0, 4)).toBe("RIFF");
      expect(file.toString("ascii", 8, 12)).toBe("WEBP");
      expect(file.byteLength).toBeLessThan(150_000);
      // Lossy VP8 without VP8X/ALPH: complete RGB texture, not a transparent layer.
      expect(file.toString("ascii", 12, 16)).toBe("VP8 ");
    }
  }
});

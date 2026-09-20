import { describe, expect, it } from "vitest";
import { readFileSync, statSync } from "node:fs";
import { CLIMATES, CLIMATE_INFO } from "../src/game/climate-content";
import { SEASONS } from "../src/game/seasons";
import { terrainArtFile, terrainPatternKey } from "../src/ui/terrain-art";
import manifest from "../src/ui/season-art-manifest.json";

const tiles = manifest.tiles as Record<string, string>;

describe("complete seasonal terrain artwork", () => {
  it("bundles a real seasonal image for every generated climate and terrain combination", () => {
    const missing: string[] = [];
    for (const climate of CLIMATES) {
      const info = CLIMATE_INFO[climate];
      const biomes = new Set([
        "water" as const,
        ...info.terrain.map(([biome]) => biome),
        ...info.water.map(([biome]) => biome),
      ]);
      for (const biome of biomes)
        for (const season of SEASONS) {
          const key = `${climate}/${biome}/${season}`;
          if (!tiles[key]) {
            missing.push(key);
            continue;
          }
          const pattern = terrainPatternKey(biome, climate, season);
          expect(pattern, key).toBe(`season-${key.replaceAll("/", "-")}`);
          expect(terrainArtFile(pattern), key).toBe(`seasons/${tiles[key]}`);
        }
    }
    expect(
      missing,
      "Every generated terrain needs all four seasonal images",
    ).toEqual([]);
  });

  it("keeps the bundled manifest synchronized and every WebP complete", () => {
    expect(
      JSON.parse(readFileSync("public/assets/seasons/manifest.json", "utf8")),
    ).toEqual(manifest);
    for (const file of new Set(Object.values(tiles))) {
      expect(file).toMatch(/^[a-z0-9-]+\.webp$/);
      const path = `public/assets/seasons/${file}`;
      const data = readFileSync(path);
      expect(statSync(path).size, file).toBeGreaterThan(2000);
      expect(data.toString("ascii", 0, 4), file).toBe("RIFF");
      expect(data.toString("ascii", 8, 12), file).toBe("WEBP");
      expect(data.readUInt32LE(4) + 8, file).toBe(data.length);
    }
  });

  it("also gives pre-climate campaign terrain a changing seasonal landscape", () => {
    for (const raw of [
      "lumber",
      "brick",
      "wool",
      "grain",
      "ore",
      "stone",
      "hides",
      "salt",
      "coal",
      "gold",
      "fish",
      "whale",
      "water",
    ] as const) {
      const patterns = SEASONS.map((season) =>
        terrainPatternKey(raw, undefined, season),
      );
      expect(new Set(patterns).size, raw).toBe(4);
      for (const pattern of patterns) expect(pattern, raw).toMatch(/^season-/);
    }
  });
});

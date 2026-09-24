import { it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync } from "node:fs";
import { FloodArt } from "../src/ui/FloodArt";
import { seasonalTerrainPattern, terrainArtFile } from "../src/ui/terrain-art";
import { geographyColor } from "../src/ui/Geography";
import {
  CLIMATES,
  CLIMATE_INFO,
  BIOME_INFO,
} from "../src/game/climate-content";
import { RIPARIAN_TERRAIN } from "../src/game/geography";
import {
  seasonalYield,
  seasonalWorkshopBase,
  SEASONS,
} from "../src/game/seasons";
import { generateHex } from "../src/game/world";
it("keeps distinct underlying terrain artwork for every floodable biome and season", () => {
  for (const climate of CLIMATES)
    for (const [biome] of [
      ...CLIMATE_INFO[climate].terrain,
      ...RIPARIAN_TERRAIN[climate],
    ]) {
      if (["bare-peaks", "mountain-pass"].includes(biome)) continue;
      const t = {
        ...generateHex("flood-art", "0,0"),
        climate,
        biome,
        resource: BIOME_INFO[biome].resource,
        geography: {
          elevation: 0.5,
          region: "test",
          floodplain: true,
          access: "flooded" as const,
        },
      };
      for (const season of SEASONS) {
        const key = seasonalTerrainPattern(t, season);
        expect(key).not.toBe("geo-flooded");
        expect(
          existsSync(`public/assets/${terrainArtFile(key).split("?")[0]}`),
          `${climate}/${biome}/${season}`,
        ).toBe(true);
        expect(
          renderToStaticMarkup(
            createElement(FloodArt, { tile: t, x: 0, y: 0 }),
          ),
        ).toContain("flooded-terrain");
      }
    }
});
it("distinguishes flooded, dry and protected land and stops raw and workshop output", () => {
  const tile = {
    ...generateHex("flood", "0,0"),
    biome: "flood-wheat" as const,
    climate: "temperate" as const,
    resource: "grain" as const,
    geography: {
      elevation: 0.5,
      region: "test",
      floodplain: true,
      access: "flooded" as const,
    },
  };
  expect(seasonalYield(tile, 0, "summer")).toEqual({});
  expect(seasonalWorkshopBase(tile, 0, "grain", "summer")).toBe(0);
  const dry = {
    ...tile,
    geography: { ...tile.geography, access: "normal" as const },
  };
  const protectedTile = {
    ...tile,
    geography: {
      ...tile.geography,
      projects: { levee: { owner: 0, born: 1 } },
    },
  };
  expect(seasonalYield(protectedTile, 0, "summer").grain).toBeGreaterThan(0);
  expect(
    new Set(
      [tile, dry, protectedTile].map((t) => geographyColor(t, "flooding")),
    ).size,
  ).toBe(3);
  for (const t of [dry, protectedTile])
    expect(
      renderToStaticMarkup(createElement(FloodArt, { tile: t, x: 0, y: 0 })),
    ).toBe("");
});

import seasonalManifest from "./season-art-manifest.json";
import { frozenInSeason, type Season } from "../game/seasons";
import type { Hex } from "../game/types";
import { tileTerrain } from "../game/maritime";
import {
  BIOME_INFO,
  CLIMATES,
  CLIMATE_INFO,
  EXTREME_CLIMATES,
  AMERICAN_CLIMATES,
  type Biome,
  type Climate,
} from "../game/climate-content";
import type { TerrainKey } from "../game/content";

const seasonalTiles = seasonalManifest.tiles as Record<string, string>;
const seasonalFiles = Object.fromEntries(
  Object.entries(seasonalTiles).map(([key, file]) => [
    `season-${key.replaceAll("/", "-")}`,
    `seasons/${file}`,
  ]),
);

// Cosmetic variants only: terrain rules and saved biome IDs stay unchanged.
const regionalArt: Partial<Record<Climate, Record<string, string>>> = {
  desert: {
    gold: "desert-gold",
    ore: "desert-iron",
    stone: "desert-stone",
    coal: "desert-coal",
    salt: "desert-salt",
  },
  tropical: {
    gold: "tropical-gold",
    ore: "tropical-iron",
    stone: "tropical-stone",
    coal: "tropical-coal",
    salt: "tropical-salt",
    brick: "tropical-clay",
  },
  cold: { stone: "cold-stone", brick: "cold-clay" },
  steppe: { brick: "steppe-clay" },
  oceanic: {
    woods: "oceanic-woods",
    grain: "oceanic-grain",
    brick: "oceanic-clay",
    coal: "oceanic-coal",
    ore: "oceanic-iron",
    gold: "oceanic-gold",
  },
  alpine: {
    ore: "alpine-iron",
    coal: "alpine-coal",
    forest: "alpine-forest",
    gold: "alpine-gold",
    brick: "alpine-clay",
  },
  subtropical: {
    stone: "subtropical-stone",
    coal: "subtropical-coal",
    ore: "subtropical-iron",
    salt: "subtropical-salt",
    gold: "subtropical-gold",
  },
  savanna: {
    "rough-pasture": "savanna-pasture",
    ore: "savanna-iron",
    brick: "savanna-clay",
    stone: "savanna-stone",
    gold: "savanna-gold",
    salt: "savanna-salt",
  },
};
export const REGIONAL_ART_KEYS = Object.values(regionalArt).flatMap(
  Object.values,
);
/** Use the tile's forecast, including patchy ice, for actual and preview art. */
export function seasonalTerrainPattern(tile: Hex, season?: Season): string {
  return terrainPatternKey(
    frozenInSeason(tile, season) ? "ice" : tileTerrain(tile),
    tile.climate,
    season,
  );
}
export function terrainPatternKey(
  terrain: TerrainKey,
  climate?: Climate,
  season?: Season,
): string {
  const aliases: Partial<Record<TerrainKey, Biome>> = {
    lumber: "woods",
    brick: "clay",
    wool: "pasture",
    ore: "iron",
    hides: "hunting-forest",
    salt: "salt-flats",
    snow: "snow-plain",
    peaks: "bare-peaks",
    meat: "cattle-pasture",
    oil: "whale",
  };
  // Pre-climate Grain keeps its original autumn-harvest artwork. This is an
  // archived art key only; Rough fields are no longer a playable biome.
  const biome =
    terrain === "grain" ? "rough-fields" : (aliases[terrain] ?? terrain);
  const region = climate ?? "temperate";
  // The reference catalog should show the climate's actual landscape too.
  // Summer opens Glacial seas; autumn shows the warm extremes' crop harvests.
  if (
    !season &&
    (EXTREME_CLIMATES.includes(region) || AMERICAN_CLIMATES.includes(region))
  ) {
    const representative = region === "glacial" ? "summer" : "autumn";
    const key = `${region}/${biome}/${representative}`;
    if (seasonalTiles[key]) return `season-${key.replaceAll("/", "-")}`;
  }
  const seasonalKey = `${region}/${biome}/${season}`;
  if (season && seasonalTiles[seasonalKey])
    return `season-${seasonalKey.replaceAll("/", "-")}`;
  // Older campaigns may contain a terrain outside its modern climate table.
  // Reuse a complete seasonal family, not a static image. Archived fields match
  // legacy Grain's one autumn harvest without shifting the visible calendar.
  const listed =
    biome === "water" ||
    CLIMATE_INFO[region].terrain.some(([b]) => b === biome) ||
    CLIMATE_INFO[region].water.some(([b]) => b === biome);
  if (season && (terrain === "grain" || aliases[terrain] || !listed)) {
    const preferred: Partial<Record<string, Climate>> = {
      "hunting-forest": "cold",
      "rough-fields": "cold",
      woods: "temperate",
      "snow-plain": "arctic",
      "bare-peaks": "alpine",
      ice: "arctic",
    };
    for (const fallback of [...new Set([preferred[biome], ...CLIMATES])]) {
      if (!fallback) continue;
      const key = `${fallback}/${biome}/${season}`;
      if (seasonalTiles[key]) return `season-${key.replaceAll("/", "-")}`;
    }
  }
  const art = BIOME_INFO[terrain as Biome]?.art ?? terrain;
  return (
    (climate && regionalArt[climate]?.[art]) ||
    (terrain === "peaks" ? "bare-peaks" : terrain)
  );
}
export function terrainArtFile(art: string): string {
  if (seasonalFiles[art]) return seasonalFiles[art];
  if (["gold", "fish", "whale"].includes(art))
    return `terrain-${art}-${art === "fish" ? "v2" : "v1"}.png`;
  const revision =
    art === "cod"
      ? 3
      : [
            "forest",
            "hunting-forest",
            "jungle",
            "oasis",
            "tropical-salt",
          ].includes(art)
        ? 2
        : 1;
  return `terrain-${art}-v1.webp${revision > 1 ? `?v=${revision}` : ""}`;
}

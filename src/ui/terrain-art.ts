import wildlifeManifest from "./wildlife-terrain-manifest.json" with { type: "json" };
import { wildHabitat } from "../game/geography";
import seasonalManifest from "./season-art-manifest.json" with { type: "json" };
import { frozenInSeason, type Season } from "../game/seasons";
import type { Hex } from "../game/types";
import { tileTerrain } from "../game/maritime";
import {
  BIOME_INFO,
  CLIMATES,
  CLIMATE_INFO,
  EXTREME_CLIMATES,
  AMERICAN_CLIMATES,
  FRONTIER_CLIMATES,
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
const wildlifeTiles: Record<string, string> = wildlifeManifest;
export function seasonalTerrainPattern(tile: Hex, season?: Season): string {
  const base = baseSeasonalTerrainPattern(tile, season);
  if (!tile.geography || !wildHabitat(tile)) return base;
  const file = terrainArtFile(base);
  const animals =
    tile.geography.access === "flooded" ? [] : (tile.geography.animals ?? []);
  for (const kind of animals) {
    const art = wildlifeTiles[`${kind}/${file}`];
    if (art) return `wild-${art}`;
  }
  const empty = wildlifeTiles[`empty/${file}`];
  return empty ? `wild-${empty}` : base;
}
export function baseSeasonalTerrainPattern(tile: Hex, season?: Season): string {
  if (tile.geography && !frozenInSeason(tile, season)) {
    let image: string | undefined = tile.biome;
    const warmRegion = [
      "tropical",
      "subtropical",
      "monsoon",
      "savanna",
      "desert",
      "hyperarid",
      "mesoamerican",
      "equatorial-wetlands",
    ].includes(tile.climate ?? "");
    if (
      image === "mountain-pass" &&
      tile.geography.access === "closed" &&
      warmRegion
    )
      return "geo-wet-pass";
    if (
      image === "mountain-pass" &&
      ["desert", "hyperarid"].includes(tile.climate ?? "")
    )
      return "geo-desert-pass";
    if (image === "lake" && warmRegion) return "geo-warm-lake";
    if (image === "flood-meadow" && warmRegion) return "geo-warm-meadow";
    if (
      image === "river-woods" &&
      !seasonalTiles[`${tile.climate}/river-woods/${season ?? "summer"}`]
    ) {
      const forestClimate = ["cold", "arctic", "glacial", "tundra"].includes(
        tile.climate ?? "",
      )
        ? "cold"
        : tile.climate === "alpine"
          ? "alpine"
          : undefined;
      return terrainPatternKey(
        forestClimate ? "forest" : "woods",
        forestClimate ?? tile.climate,
        season ?? "summer",
      );
    }
    const coldSnow =
      tile.climate === "glacial" ||
      (["arctic", "tundra"].includes(tile.climate ?? "") &&
        season !== "summer");
    if (
      [
        "steppe-plain",
        "wildlife-grassland",
        "bison-range",
        "reindeer-range",
        "musk-ox-range",
        "seal-grounds",
        "turkey-grounds",
      ].includes(image ?? "")
    )
      image = "wild-grassland" as Biome;
    if (["hunting-forest", "fern-hunting-grounds"].includes(image ?? ""))
      return terrainPatternKey("forest", tile.climate, season);
    if (
      [
        "river",
        "delta-gardens",
        "mountain-pass",
        "reef",
        "flood-wheat",
        "flood-rice",
        "flood-sorghum",
        "wild-grassland",
      ].includes(image ?? "")
    ) {
      const warm = [
        "tropical",
        "subtropical",
        "monsoon",
        "savanna",
        "desert",
        "hyperarid",
        "mesoamerican",
        "equatorial-wetlands",
      ].includes(tile.climate ?? "");
      const displaySeason =
        (["wild-grassland", "river", "mountain-pass"].includes(image ?? "") &&
          coldSnow) ||
        (image === "mountain-pass" && tile.geography.access === "closed")
          ? "winter"
          : warm &&
              ["wild-grassland", "mountain-pass"].includes(image ?? "") &&
              season === "winter"
            ? "summer"
            : (season ?? "summer");
      if (image === "river" && warm)
        image = ["desert", "hyperarid"].includes(tile.climate ?? "")
          ? "desert-river"
          : "tropical-river";
      if (image === "flood-rice")
        return `geo-flood-rice-${{ spring: "spring", summer: "winter", autumn: "autumn", winter: "summer" }[season ?? "summer"]}`;
      return `geo-${image}-${displaySeason}`;
    }
    if (image === "lake")
      return `geo-lake-${coldSnow ? "winter" : (season ?? "summer")}`;
    if (image === "shoal")
      return `geo-reef-${season === "winter" ? "summer" : (season ?? "summer")}`;
    if (image === "flood-meadow")
      return `geo-flood-meadow-${coldSnow ? "winter" : (season ?? "summer")}`;
  }
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
    (EXTREME_CLIMATES.includes(region) ||
      AMERICAN_CLIMATES.includes(region) ||
      FRONTIER_CLIMATES.includes(region))
  ) {
    const representative =
      region === "glacial" || FRONTIER_CLIMATES.includes(region)
        ? "summer"
        : "autumn";
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
  if (art.startsWith("wild-")) return `wildlife-terrain/${art.slice(5)}.webp`;
  if (art.startsWith("geo-")) return `geography/${art.slice(4)}.webp`;
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

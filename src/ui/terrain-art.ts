import { BIOME_INFO, type Biome, type Climate } from "../game/climate-content";
import type { TerrainKey } from "../game/content";

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
    "rough-fields": "oceanic-rough-fields",
    grain: "oceanic-grain",
    brick: "oceanic-clay",
    coal: "oceanic-coal",
    ore: "oceanic-iron",
    gold: "oceanic-gold",
  },
  alpine: {
    ore: "alpine-iron",
    coal: "alpine-coal",
    "rough-fields": "alpine-rough-fields",
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
    "rough-fields": "savanna-rough-fields",
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
export function terrainPatternKey(
  terrain: TerrainKey,
  climate?: Climate,
): string {
  const art = BIOME_INFO[terrain as Biome]?.art ?? terrain;
  return (
    (climate && regionalArt[climate]?.[art]) ||
    (terrain === "peaks" ? "bare-peaks" : terrain)
  );
}
export function terrainArtFile(art: string): string {
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

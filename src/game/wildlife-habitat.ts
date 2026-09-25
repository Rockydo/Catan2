import { BIOME_INFO, type Biome, type Climate } from "./climate-content";
import type { Hex } from "./types";
const DRY = new Set<Climate>(["desert", "hyperarid", "semiarid"]);
export const WILD_BIOMES = new Set<Biome>([
  "steppe-plain",
  "wildlife-grassland",
  "bison-range",
  "reindeer-range",
  "musk-ox-range",
  "seal-grounds",
  "hunting-forest",
  "fern-hunting-grounds",
  "jungle",
  "turkey-grounds",
]);
/** Desert herds browse open scrub and gather at permanent water. */
export const gazelleHabitat = (tile: Hex) =>
  DRY.has(tile.climate ?? "temperate") &&
  ["desert", "oasis", "steppe-plain", "wildlife-grassland"].includes(
    tile.biome ?? "",
  ) &&
  !["water", "ice", "peaks"].includes(tile.resource) &&
  !tile.geography?.pass;

/** Only natural timber or unproductive habitat supports wild herds. Tree crops
 * are agriculture even though their combat terrain is forested. */
export const wildHabitat = (tile: Hex) => {
  if (
    !tile.biome ||
    ["water", "ice", "peaks"].includes(tile.resource) ||
    tile.geography?.pass
  )
    return false;
  if (WILD_BIOMES.has(tile.biome) || gazelleHabitat(tile)) return true;
  const info = BIOME_INFO[tile.biome];
  return (
    (info.family === "forest" || tile.biome === "snow-plain") &&
    Object.entries(info.yield).every(([raw, n]) => !n || raw === "lumber")
  );
};

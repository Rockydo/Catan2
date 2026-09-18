import type { Raw, Family } from "./types";

export const CLIMATES = [
  "temperate",
  "cold",
  "arctic",
  "steppe",
  "mediterranean",
  "tropical",
  "desert",
] as const;
export type Climate = (typeof CLIMATES)[number];
export const BIOMES = [
  "woods",
  "forest",
  "hunting-forest",
  "golden-fields",
  "pasture",
  "rough-fields",
  "rough-pasture",
  "clay",
  "gold",
  "iron",
  "stone",
  "coal",
  "salt-flats",
  "snow-plain",
  "seal-grounds",
  "arctic-iron",
  "arctic-stone",
  "arctic-gold",
  "steppe-plain",
  "olive-grove",
  "escarpment",
  "jungle",
  "tropical-woods",
  "rice-field",
  "desert",
  "oasis",
  "water",
  "fish",
  "cod",
  "whale",
  "ice",
] as const;
export type Biome = (typeof BIOMES)[number];
export type TerrainResource = Raw | "water" | "snow" | "desert" | "ice";
export interface BiomeInfo {
  name: string;
  resource: TerrainResource;
  yield: Partial<Record<Raw, number>>;
  family: Family;
  art: string;
  color: string;
}
const b = (
  name: string,
  resource: TerrainResource,
  yield_: BiomeInfo["yield"],
  family: Family,
  art: string,
  color: string,
): BiomeInfo => ({ name, resource, yield: yield_, family, art, color });
export const BIOME_INFO: Record<Biome, BiomeInfo> = {
  woods: b("Woods", "lumber", { lumber: 1 }, "forest", "woods", "#7a9856"),
  forest: b("Forest", "lumber", { lumber: 2 }, "forest", "forest", "#355a48"),
  "hunting-forest": b(
    "Hunting forest",
    "hides",
    { hides: 2 },
    "forest",
    "hunting-forest",
    "#6c7960",
  ),
  "golden-fields": b(
    "Golden fields",
    "grain",
    { grain: 2 },
    "flat",
    "grain",
    "#d1ae50",
  ),
  pasture: b("Pasture", "wool", { wool: 2 }, "flat", "wool", "#95a66c"),
  "rough-fields": b(
    "Rough fields",
    "grain",
    { grain: 1 },
    "flat",
    "rough-fields",
    "#a79865",
  ),
  "rough-pasture": b(
    "Rough pasture",
    "wool",
    { wool: 1 },
    "rugged",
    "rough-pasture",
    "#9d9b7e",
  ),
  clay: b("Clay hills", "brick", { brick: 1 }, "rugged", "brick", "#b16b50"),
  gold: b("Gold mountains", "gold", { gold: 1 }, "rugged", "gold", "#8f7544"),
  iron: b("Iron mountains", "ore", { ore: 1 }, "rugged", "ore", "#7d8293"),
  stone: b("Stone quarry", "stone", { stone: 1 }, "rugged", "stone", "#a6a49b"),
  coal: b("Coal hills", "coal", { coal: 1 }, "rugged", "coal", "#595c64"),
  "salt-flats": b("Salt flats", "salt", { salt: 1 }, "flat", "salt", "#dad5b9"),
  "snow-plain": b("Snow plain", "snow", {}, "flat", "snow-plain", "#dbe9e8"),
  "seal-grounds": b(
    "Seal hunting grounds",
    "hides",
    { hides: 1, oil: 1 },
    "flat",
    "seal-grounds",
    "#adc5c8",
  ),
  "arctic-iron": b(
    "Arctic iron mountains",
    "ore",
    { ore: 1 },
    "rugged",
    "arctic-iron",
    "#8596a9",
  ),
  "arctic-stone": b(
    "Arctic stone ridge",
    "stone",
    { stone: 1 },
    "rugged",
    "arctic-stone",
    "#b6c5ce",
  ),
  "arctic-gold": b(
    "Arctic gold mountains",
    "gold",
    { gold: 1 },
    "rugged",
    "arctic-gold",
    "#aaa07a",
  ),
  "steppe-plain": b(
    "Steppe plain",
    "hides",
    { hides: 1, wool: 1 },
    "flat",
    "steppe-plain",
    "#b0a272",
  ),
  "olive-grove": b(
    "Olive grove",
    "grain",
    { grain: 1 },
    "forest",
    "olive-grove",
    "#8e9860",
  ),
  escarpment: b(
    "Escarpment",
    "stone",
    { stone: 1 },
    "rugged",
    "escarpment",
    "#c5bba2",
  ),
  jungle: b("Jungle", "hides", { hides: 1 }, "forest", "jungle", "#416a49"),
  "tropical-woods": b(
    "Tropical woods",
    "lumber",
    { lumber: 1 },
    "forest",
    "tropical-woods",
    "#648753",
  ),
  "rice-field": b(
    "Rice field",
    "grain",
    { grain: 3 },
    "flat",
    "rice-field",
    "#91ac5b",
  ),
  desert: b("Desert", "desert", {}, "flat", "desert", "#d6b174"),
  oasis: b(
    "Oasis",
    "lumber",
    { lumber: 1, grain: 1 },
    "forest",
    "oasis",
    "#8f9f68",
  ),
  water: b("Water", "water", {}, "water", "water", "#287f9c"),
  fish: b("Fishing grounds", "water", { fish: 1 }, "water", "fish", "#287f9c"),
  cod: b("Cod grounds", "water", { fish: 2 }, "water", "cod", "#448a9d"),
  whale: b(
    "Whale grounds",
    "water",
    { hides: 1, oil: 1 },
    "water",
    "whale",
    "#287f9c",
  ),
  ice: b("Frozen sea", "ice", {}, "flat", "ice", "#aed7dc"),
};
export interface ClimateInfo {
  name: string;
  color: string;
  land: number;
  terrain: [Biome, number][];
  water: [Biome, number][];
  compatible: Climate[];
}
export const CLIMATE_INFO: Record<Climate, ClimateInfo> = {
  temperate: {
    name: "Temperate",
    color: "#84a66b",
    land: 0.5,
    terrain: [
      ["golden-fields", 17],
      ["pasture", 17],
      ["woods", 17],
      ["gold", 5],
      ["clay", 12],
      ["stone", 10],
      ["iron", 10],
      ["coal", 10],
      ["salt-flats", 2],
    ],
    water: [
      ["fish", 0.15],
      ["whale", 0.05],
    ],
    compatible: ["steppe", "mediterranean", "cold", "tropical"],
  },
  cold: {
    name: "Cold",
    color: "#719a99",
    land: 0.55,
    terrain: [
      ["forest", 30],
      ["hunting-forest", 10],
      ["rough-fields", 10],
      ["rough-pasture", 5],
      ["gold", 5],
      ["coal", 10],
      ["iron", 10],
      ["stone", 10],
      ["clay", 10],
    ],
    water: [
      ["fish", 0.2],
      ["cod", 0.1],
      ["whale", 0.1],
    ],
    compatible: ["temperate", "steppe", "arctic"],
  },
  arctic: {
    name: "Arctic",
    color: "#c1e0ed",
    land: 0.4,
    terrain: [
      ["snow-plain", 40],
      ["seal-grounds", 15],
      ["arctic-iron", 20],
      ["arctic-stone", 15],
      ["arctic-gold", 10],
    ],
    water: [
      ["ice", 0.3],
      ["fish", 0.2],
      ["cod", 0.2],
      ["whale", 0.2],
    ],
    compatible: ["cold"],
  },
  steppe: {
    name: "Steppe",
    color: "#b9ad75",
    land: 0.7,
    terrain: [
      ["steppe-plain", 55],
      ["rough-fields", 17],
      ["stone", 10],
      ["iron", 5],
      ["coal", 5],
      ["clay", 5],
      ["gold", 3],
    ],
    water: [
      ["fish", 0.15],
      ["whale", 0.05],
    ],
    compatible: ["cold", "temperate", "mediterranean", "desert"],
  },
  mediterranean: {
    name: "Mediterranean",
    color: "#c9b37d",
    land: 0.4,
    terrain: [
      ["golden-fields", 5],
      ["olive-grove", 20],
      ["escarpment", 20],
      ["woods", 5],
      ["rough-pasture", 15],
      ["salt-flats", 5],
      ["gold", 7],
      ["coal", 10],
      ["iron", 13],
    ],
    water: [
      ["fish", 0.15],
      ["whale", 0.05],
    ],
    compatible: ["temperate", "steppe", "desert"],
  },
  tropical: {
    name: "Tropical",
    color: "#4f9667",
    land: 0.5,
    terrain: [
      ["jungle", 25],
      ["tropical-woods", 10],
      ["rice-field", 25],
      ["clay", 15],
      ["gold", 5],
      ["stone", 5],
      ["coal", 5],
      ["iron", 5],
      ["salt-flats", 5],
    ],
    water: [
      ["fish", 0.1],
      ["whale", 0.05],
    ],
    compatible: ["temperate", "desert"],
  },
  desert: {
    name: "Desert",
    color: "#d6ab66",
    land: 0.5,
    terrain: [
      ["desert", 30],
      ["gold", 10],
      ["iron", 12],
      ["stone", 12],
      ["coal", 6],
      ["oasis", 10],
      ["salt-flats", 20],
    ],
    water: [
      ["fish", 0.08],
      ["whale", 0.03],
    ],
    compatible: ["tropical", "mediterranean", "steppe"],
  },
};
export function compatibleClimate(a: Climate, b: Climate) {
  return (
    a === b ||
    (CLIMATE_INFO[a].compatible.includes(b) &&
      CLIMATE_INFO[b].compatible.includes(a))
  );
}
export function waterProbabilities(
  climate: Climate,
  openWater = false,
): [Biome, number][] {
  let remaining = 1;
  const result: [Biome, number][] = CLIMATE_INFO[climate].water.map(
    ([biome, chance]) => {
      chance = Math.min(1, chance * (openWater && biome === "whale" ? 2 : 1));
      const value = remaining * chance;
      remaining *= 1 - chance;
      return [biome, value];
    },
  );
  return [...result, ["water", remaining]];
}

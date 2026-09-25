import { BIOME_INFO, biomeYield, type Climate } from "./climate-content";
import type { Hex, Stock, Raw } from "./types";
import type { Season } from "./seasons";

export const INFRASTRUCTURE = {
  irrigation: {
    name: "Irrigation",
    cost: { stone: 2, brick: 2, ore: 1 },
    description:
      "Freshwater channels improve suitable crops and reduce drought losses. Planting remains limited by crop and climate.",
    stages: [
      "Field channels",
      "Managed canals",
      "Steam pumping station",
      "Integrated irrigation works",
    ],
  },
  husbandry: {
    name: "Livestock improvements",
    cost: { lumber: 3, grain: 2, wool: 1 },
    description:
      "Fodder stores, shelter and veterinary care improve domestic herds. Wild animals remain migratory.",
    stages: [
      "Fodder and shelters",
      "Managed pasture",
      "Mechanized feed mill",
      "Veterinary and feed complex",
    ],
  },
  soil: {
    name: "Soil husbandry",
    cost: { lumber: 2, grain: 2, hides: 1 },
    description:
      "Rotations, manure and soil cover improve existing crops, especially depleted tropical soils.",
    stages: [
      "Rotations and manure",
      "Seed and soil management",
      "Steam threshing and fertilizers",
      "Agricultural research works",
    ],
  },
  drainage: {
    name: "Field drainage",
    cost: { stone: 2, brick: 2, lumber: 1 },
    description:
      "Ditches and drains reduce wet-weather crop losses on damp ground. They do not stop river floods.",
    stages: [
      "Field ditches",
      "Tile drainage",
      "Steam drainage pumps",
      "Managed drainage network",
    ],
  },
  terraces: {
    name: "Agricultural terraces",
    cost: { stone: 4, lumber: 2 },
    description:
      "Retaining walls conserve soil and water on cultivated slopes. No new farmland or mountain passages are created.",
    stages: [
      "Contour walls",
      "Bench terraces",
      "Engineered hillside works",
      "Integrated terrace estate",
    ],
  },
  forestry: {
    name: "Forestry infrastructure",
    cost: { lumber: 3, ore: 1, grain: 1 },
    description:
      "Managed felling, haulage and saws improve timber recovery without adding trees or animals.",
    stages: [
      "Managed woodland",
      "Timber haulage",
      "Steam logging works",
      "Industrial forestry depot",
    ],
  },
  mining: {
    name: "Mining infrastructure",
    cost: { lumber: 3, ore: 2, stone: 1 },
    description:
      "Supports, ventilation, drainage and powered winding improve existing ore, coal and gold deposits.",
    stages: [
      "Supported workings",
      "Winding and drainage",
      "Steam mine engine",
      "Integrated deep mine",
    ],
  },
  quarrying: {
    name: "Quarry infrastructure",
    cost: { lumber: 2, stone: 2, ore: 2 },
    description:
      "Lifting equipment and cutting tools improve existing stone, clay and peat workings.",
    stages: [
      "Organized workings",
      "Cranes and haulage",
      "Steam excavators",
      "Industrial extraction works",
    ],
  },
  saltworks: {
    name: "Saltworks",
    cost: { stone: 2, brick: 2, lumber: 1 },
    description:
      "Managed evaporation beds favor dry climates; industrial heated pans reduce rain losses.",
    stages: [
      "Evaporation beds",
      "Managed pans",
      "Coal-fired salt pans",
      "Integrated salt refinery",
    ],
  },
  fishery: {
    name: "Fishery infrastructure",
    cost: { lumber: 3, salt: 2, wool: 1 },
    description:
      "Landing and preservation facilities improve fish recovery only while fish are present. No extra whales or permanent shoals.",
    stages: [
      "Landing and curing",
      "Icehouse and landing gear",
      "Steam refrigeration",
      "Industrial cold chain",
    ],
  },
} satisfies Record<
  string,
  { name: string; cost: Stock; description: string; stages: string[] }
>;
export type InfrastructureKind = keyof typeof INFRASTRUCTURE;
export const isInfrastructure = (kind: string): kind is InfrastructureKind =>
  Object.hasOwn(INFRASTRUCTURE, kind);
export const tierOf = (tile: Hex, kind: InfrastructureKind) =>
  tile.geography?.projects?.[kind]?.tier ??
  (tile.geography?.projects?.[kind] ? 1 : 0);
export const effectiveTier = (
  tile: Hex,
  kind: InfrastructureKind,
  owner?: number,
) => {
  const p = tile.geography?.projects?.[kind];
  if (!p || (owner !== undefined && owner !== p.owner)) return 0;
  return tierOf(tile, kind);
};
export function infrastructureCost(
  kind: InfrastructureKind,
  tier: number,
): Stock {
  if (tier === 1) return { ...INFRASTRUCTURE[kind].cost };
  // Incremental costs: later increments cost much more for smaller output gains.
  return tier === 2
    ? { planks: 5, masonry: 4, steel: 3, gold: 3 }
    : tier === 3
      ? { planks: 10, masonry: 10, steel: 12, coal: 40, goldbars: 4 }
      : {
          planks: 20,
          masonry: 24,
          steel: 28,
          coal: 100,
          coke: 12,
          goldbars: 12,
        };
}

type Agronomy = {
  heat: "polar" | "cool" | "mild" | "warm" | "hot";
  moisture: "dry" | "balanced" | "wet";
  irrigation: number;
};
// Irrigation response is a game coefficient, not a measured global crop yield.
export const AGRONOMY: Record<Climate, Agronomy> = {
  temperate: { heat: "mild", moisture: "balanced", irrigation: 2 },
  oceanic: { heat: "mild", moisture: "wet", irrigation: 1 },
  cold: { heat: "cool", moisture: "balanced", irrigation: 1 },
  arctic: { heat: "polar", moisture: "dry", irrigation: 0 },
  glacial: { heat: "polar", moisture: "dry", irrigation: 0 },
  tundra: { heat: "polar", moisture: "wet", irrigation: 0 },
  alpine: { heat: "cool", moisture: "balanced", irrigation: 1 },
  andean: { heat: "cool", moisture: "dry", irrigation: 3 },
  steppe: { heat: "mild", moisture: "dry", irrigation: 4 },
  prairie: { heat: "mild", moisture: "balanced", irrigation: 3 },
  mediterranean: { heat: "warm", moisture: "dry", irrigation: 4 },
  desert: { heat: "hot", moisture: "dry", irrigation: 5 },
  hyperarid: { heat: "hot", moisture: "dry", irrigation: 5 },
  semiarid: { heat: "warm", moisture: "dry", irrigation: 5 },
  subtropical: { heat: "warm", moisture: "balanced", irrigation: 3 },
  tropical: { heat: "hot", moisture: "wet", irrigation: 2 },
  monsoon: { heat: "hot", moisture: "wet", irrigation: 4 },
  savanna: { heat: "hot", moisture: "dry", irrigation: 4 },
  mesoamerican: { heat: "hot", moisture: "balanced", irrigation: 3 },
  "tropical-maritime": { heat: "hot", moisture: "wet", irrigation: 1 },
  "equatorial-wetlands": { heat: "hot", moisture: "wet", irrigation: 1 },
  "temperate-rainforest": { heat: "mild", moisture: "wet", irrigation: 1 },
};
export const CROPS = new Set([
  "golden-fields",
  "chernozem-wheat",
  "flood-wheat",
  "flood-rice",
  "flood-sorghum",
  "delta-gardens",
  "olive-grove",
  "rice-field",
  "oasis",
  "barley-fields",
  "potato-fields",
  "turnip-fields",
  "oat-fields",
  "sorghum-fields",
  "sunflower-fields",
  "chinampa-gardens",
  "millet-fields",
  "maize-field",
  "sago-grove",
  "breadfruit-grove",
]);
const domestic = new Set([
  "pasture",
  "rough-pasture",
  "coastal-pasture",
  "alpine-pasture",
  "alpaca-pasture",
  "cattle-pasture",
  "goat-pasture",
  "cattle-savanna",
  "flood-meadow",
]);
export const isCrop = (tile: Hex) => CROPS.has(tile.biome ?? "");
export function cropHarvestWindow(tile: Hex): Season[] {
  const b = tile.biome,
    c = tile.climate ?? "temperate",
    a = AGRONOMY[c];
  if (!isCrop(tile)) return [];
  if (a.heat === "polar") return ["summer"];
  if (b === "olive-grove") return ["autumn", "winter"];
  if (b === "breadfruit-grove" || b === "sago-grove")
    return a.heat === "hot"
      ? ["spring", "summer", "autumn", "winter"]
      : ["summer", "autumn"];
  if (a.heat === "cool" || a.heat === "mild") return ["summer", "autumn"];
  if (
    [
      "golden-fields",
      "chernozem-wheat",
      "flood-wheat",
      "barley-fields",
      "oat-fields",
    ].includes(b!)
  )
    return a.heat === "hot" && a.moisture === "dry"
      ? ["spring"]
      : ["spring", "summer"];
  if (b === "oasis") return ["summer", "autumn"];
  if (b === "flood-sorghum")
    return a.heat === "hot" ? ["autumn", "winter"] : ["summer", "autumn"];
  if (a.heat === "hot" && a.moisture !== "dry")
    return ["spring", "summer", "autumn", "winter"];
  if (
    a.heat === "hot" &&
    ["rice-field", "flood-rice", "delta-gardens", "chinampa-gardens"].includes(
      b!,
    )
  )
    return ["spring", "summer", "autumn"];
  return ["summer", "autumn"];
}
/** Output and climate eligibility; settlement access and freshwater are checked separately. */
export function infrastructureSuitable(
  tile: Hex,
  kind: InfrastructureKind,
): boolean {
  if (
    !tile.geography ||
    ["ice", "peaks", "snow", "desert"].includes(tile.resource) ||
    tile.geography.pass
  )
    return false;
  const a = AGRONOMY[tile.climate ?? "temperate"],
    b = tile.biome!;
  const yields = biomeYield(b, tile.climate);
  switch (kind) {
    case "irrigation":
      return isCrop(tile) && a.irrigation > 0;
    case "soil":
      return isCrop(tile) && a.heat !== "polar";
    case "drainage":
      return (
        isCrop(tile) &&
        a.heat !== "polar" &&
        (a.moisture === "wet" || !!tile.geography.floodplain)
      );
    case "terraces":
      return (
        isCrop(tile) &&
        (tile.climate === "alpine" ||
          tile.climate === "andean" ||
          tile.geography.elevation >= 0.58)
      );
    case "husbandry":
      return domestic.has(b);
    case "forestry":
      return BIOME_INFO[b]?.family === "forest" && !isCrop(tile);
    case "mining":
      return b !== "peat-bog" && !!(yields.ore || yields.gold || yields.coal);
    case "quarrying":
      return !!(yields.stone || yields.brick) || b === "peat-bog";
    case "saltworks":
      return !!yields.salt;
    case "fishery":
      return (
        tile.resource === "water" &&
        ["river", "lake", "coast", "shoal", "reef"].includes(
          tile.geography.waterway ?? "",
        )
      );
  }
}
export function improvedGoods(tile: Hex, kind: InfrastructureKind): Raw[] {
  switch (kind) {
    case "irrigation":
    case "soil":
    case "drainage":
    case "terraces":
      return ["grain", "oil"];
    case "husbandry":
      return ["meat", "wool", "hides"];
    case "forestry":
      return ["lumber"];
    case "mining":
      return ["ore", "coal", "gold"];
    case "quarrying":
      return tile.biome === "peat-bog" ? ["coal"] : ["stone", "brick"];
    case "saltworks":
      return ["salt"];
    case "fishery":
      return ["fish"];
  }
}
export function annualInfrastructureBonus(
  tile: Hex,
  kind: InfrastructureKind,
  tier: number,
): number {
  if (!tier || !infrastructureSuitable(tile, kind)) return 0;
  const a = AGRONOMY[tile.climate ?? "temperate"];
  const response =
    kind === "irrigation"
      ? a.irrigation
      : kind === "soil"
        ? a.moisture === "wet"
          ? 3
          : 2
        : kind === "drainage"
          ? a.moisture === "wet"
            ? 3
            : 1
          : kind === "terraces"
            ? ["alpine", "andean"].includes(tile.climate ?? "")
              ? 3
              : 2
            : kind === "husbandry"
              ? a.heat === "cool" || a.moisture === "dry"
                ? 3
                : 2
              : kind === "forestry"
                ? a.moisture === "wet"
                  ? 3
                  : 2
                : kind === "saltworks"
                  ? a.moisture === "dry"
                    ? 4
                    : 2
                  : kind === "fishery"
                    ? a.heat === "hot"
                      ? 4
                      : 3
                    : 4;
  return response + [0, 0, 2, 3, 4][tier];
}
/** Allocate whole cards without creating new harvest seasons or compounding upgrades. */
export function allocateAnnual(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (!sum || !total) return weights.map(() => 0);
  const result = weights.map((w) => Math.floor((total * w) / sum));
  let left = total - result.reduce((a, b) => a + b, 0);
  const order = weights
    .map((w, i) => ({ i, rest: (total * w) / sum - result[i] }))
    .filter((x) => weights[x.i] > 0)
    .sort((a, b) => b.rest - a.rest || a.i - b.i);
  for (const { i } of order) if (left-- > 0) result[i]++;
  return result;
}

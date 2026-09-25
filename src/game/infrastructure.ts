import { BIOME_INFO, biomeYield, type Climate } from "./climate-content";
import type { Hex, Stock, Raw } from "./types";
import type { Season } from "./seasons";
import { localTechnique } from "./infrastructure-techniques";
import { wildHabitat } from "./wildlife-habitat";

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
    cost: { lumber: 2, grain: 2, ore: 1 },
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
  catchments: {
    name: "Rainwater harvesting",
    cost: { stone: 3, lumber: 1, ore: 1 },
    description:
      "Runoff basins and bunds support existing rainfed dryland crops without creating a river or another harvest season.",
    stages: [
      "Runoff planting basins",
      "Contour bunds and cisterns",
      "Runoff distribution pumps",
      "Managed microcatchments",
    ],
  },
  hunting: {
    name: "Hunting infrastructure",
    cost: { lumber: 2, stone: 1, hides: 1, salt: 1 },
    description:
      "Tracking shelters and game handling improve returns from visiting wildlife. Empty habitat still produces nothing.",
    stages: [
      "Tracking shelters",
      "Hides and curing racks",
      "Game-handling depot",
      "Regional game cold store",
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
// Incremental construction bills, not operating fuel. Tier II coal covers
// making tools, fittings, fired drains and masonry; steam works use much more.
// Each track has its own materials instead of a generic precious-metal fee.
const UPGRADE_COSTS: Record<
  InfrastructureKind,
  readonly [Stock, Stock, Stock]
> = {
  irrigation: [
    { planks: 2, masonry: 6, ceramics: 4, steel: 2, coal: 6 },
    { planks: 6, masonry: 12, ceramics: 6, steel: 10, coal: 40 },
    { planks: 12, masonry: 28, ceramics: 12, steel: 24, coal: 100, coke: 8 },
  ],
  husbandry: [
    { planks: 6, masonry: 2, steel: 2, grain: 4, coal: 4 },
    { planks: 10, masonry: 6, steel: 8, grain: 8, coal: 30 },
    {
      planks: 18,
      masonry: 16,
      steel: 18,
      grain: 12,
      reagents: 6,
      coal: 80,
      coke: 8,
    },
  ],
  soil: [
    { planks: 4, steel: 2, grain: 4, coal: 4 },
    { planks: 8, masonry: 4, steel: 8, reagents: 8, coal: 30 },
    { planks: 14, masonry: 16, steel: 18, reagents: 20, coal: 80, coke: 8 },
  ],
  drainage: [
    { masonry: 4, ceramics: 6, steel: 2, coal: 8 },
    { planks: 4, masonry: 10, ceramics: 10, steel: 10, coal: 40 },
    { planks: 8, masonry: 24, ceramics: 20, steel: 24, coal: 100, coke: 8 },
  ],
  terraces: [
    { stone: 8, planks: 3, masonry: 4, steel: 2, coal: 4 },
    { stone: 16, planks: 6, masonry: 14, steel: 8, coal: 30 },
    { stone: 24, planks: 12, masonry: 32, steel: 20, coal: 80, coke: 8 },
  ],
  forestry: [
    { planks: 6, steel: 4, leather: 2, coal: 8 },
    { planks: 12, masonry: 6, steel: 12, leather: 4, coal: 40 },
    { planks: 24, masonry: 16, steel: 30, leather: 6, coal: 100, coke: 12 },
  ],
  mining: [
    { planks: 6, masonry: 3, steel: 5, leather: 2, coal: 10 },
    { planks: 10, masonry: 8, steel: 16, leather: 4, coal: 40 },
    { planks: 18, masonry: 20, steel: 36, leather: 6, coal: 100, coke: 12 },
  ],
  quarrying: [
    { planks: 5, masonry: 3, steel: 5, leather: 2, coal: 10 },
    { planks: 8, masonry: 8, steel: 16, leather: 4, coal: 40 },
    { planks: 16, masonry: 20, steel: 32, leather: 6, coal: 100, coke: 12 },
  ],
  saltworks: [
    { masonry: 6, ceramics: 4, steel: 2, coal: 8 },
    { planks: 4, masonry: 12, ceramics: 6, steel: 10, coal: 45 },
    { planks: 8, masonry: 24, ceramics: 12, steel: 24, coal: 110, coke: 12 },
  ],
  catchments: [
    { stone: 6, masonry: 3, ceramics: 3, steel: 2, coal: 4 },
    { stone: 12, masonry: 8, ceramics: 6, steel: 8, coal: 30 },
    { stone: 18, masonry: 18, ceramics: 12, steel: 18, coal: 80, coke: 8 },
  ],
  hunting: [
    { planks: 5, leather: 3, salt: 3, steel: 2, coal: 4 },
    { planks: 8, masonry: 5, leather: 4, salt: 6, steel: 6, coal: 24 },
    {
      planks: 14,
      masonry: 12,
      leather: 6,
      salt: 10,
      steel: 16,
      coal: 60,
      coke: 6,
    },
  ],
  fishery: [
    { planks: 6, masonry: 4, cloth: 3, steel: 2, coal: 6 },
    { planks: 10, masonry: 10, cloth: 4, steel: 12, coal: 40 },
    { planks: 20, masonry: 24, cloth: 6, steel: 28, coal: 100, coke: 12 },
  ],
};
export function infrastructureCost(
  kind: InfrastructureKind,
  tier: number,
  tile?: Hex,
): Stock {
  const cost: Stock | undefined =
    tier === 1 ? INFRASTRUCTURE[kind].cost : UPGRADE_COSTS[kind][tier - 2];
  if (!cost) throw new Error(`Invalid infrastructure tier: ${tier}`);
  const materials = tile ? localTechnique(tile, kind).materials : undefined;
  return Object.fromEntries(
    Object.entries(cost).map(([good, n]) => [
      good,
      Math.ceil(n! * (materials?.[good as keyof Stock] ?? 1)),
    ]),
  );
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
  if (kind === "hunting") return !!tile.geography && wildHabitat(tile);
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
    case "catchments":
      return (
        isCrop(tile) &&
        ["semiarid", "savanna", "steppe", "prairie", "mediterranean"].includes(
          tile.climate ?? "",
        ) &&
        ![
          "rice-field",
          "flood-rice",
          "delta-gardens",
          "chinampa-gardens",
          "sago-grove",
          "oasis",
        ].includes(b) &&
        !tile.geography.floodplain
      );
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
    case "catchments":
      return ["grain", "oil"];
    case "hunting":
      return ["meat", "hides", "wool", "oil"];
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
  return localTechnique(tile, kind).annual[tier - 1] ?? 0;
}

export function infrastructureProtection(
  tile: Hex,
  raw: Raw,
  weather: "dry" | "wet" | "cold",
  owner?: number,
): number {
  let protection = 0;
  for (const kind of Object.keys(tile.geography?.projects ?? {}).filter(
    isInfrastructure,
  )) {
    const tier = effectiveTier(tile, kind, owner);
    if (
      !tier ||
      !infrastructureSuitable(tile, kind) ||
      !improvedGoods(tile, kind).includes(raw)
    )
      continue;
    protection = Math.max(
      protection,
      localTechnique(tile, kind).protection?.[weather]?.[tier - 1] ?? 0,
    );
  }
  return protection;
}

/** One shared budget per track, split over eligible seasons, then existing goods.
 * This prevents a meat/hide/wool tile multiplying a single project's bonus. */
export function infrastructureExtras(
  tile: Hex,
  kind: InfrastructureKind,
  tier: number,
  native: Record<Season, Stock>,
): Record<Season, Stock> {
  const seasons = ["spring", "summer", "autumn", "winter"] as const;
  const output: Record<Season, Stock> = {
    spring: {},
    summer: {},
    autumn: {},
    winter: {},
  };
  const bonus = annualInfrastructureBonus(tile, kind, tier);
  if (!bonus) return output;
  const goods = improvedGoods(tile, kind),
    profile = localTechnique(tile, kind);
  const amounts = seasons.map((season) =>
    goods.map((raw) =>
      kind === "hunting"
        ? (tile.geography?.fauna?.[raw] ?? 0)
        : (native[season][raw] ?? 0),
    ),
  );
  const totals = amounts.map(
    (row, i) => row.reduce((a, b) => a + b, 0) * (profile.seasons?.[i] ?? 1),
  );
  const budgets = allocateAnnual(bonus, totals);
  seasons.forEach((season, i) => {
    const extra = allocateAnnual(budgets[i], amounts[i]);
    goods.forEach((raw, j) => {
      if (extra[j]) output[season][raw] = extra[j];
    });
  });
  return output;
}
export function huntingYield(
  tile: Hex,
  owner?: number,
  season?: Season,
): Stock {
  const fauna = tile.geography?.fauna ?? {};
  const result: Stock = Object.fromEntries(
    improvedGoods(tile, "hunting")
      .filter((g) => fauna[g])
      .map((g) => [g, fauna[g]]),
  );
  if (!season) return result;
  const tier = effectiveTier(tile, "hunting", owner);
  if (!tier) return result;
  const extra = infrastructureExtras(tile, "hunting", tier, {
    spring: fauna,
    summer: fauna,
    autumn: fauna,
    winter: fauna,
  })[season];
  for (const raw of improvedGoods(tile, "hunting"))
    if (extra[raw]) result[raw] = (result[raw] ?? 0) + extra[raw]!;
  return result;
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

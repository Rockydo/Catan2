import {
  SPECIALIST_PROJECTS,
  SPECIALISTS_BY_TRACK,
  isSpecialist,
  specialistId,
  type SpecialistBranch,
  type SpecialistProject,
} from "./infrastructure-specialists";
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
      "Channels and reservoirs deliver freshwater to the roots and sustain crops through dry spells.",
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
      "Fodder stores, shelters and veterinary care support healthy, productive livestock.",
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
      "Rotations, manure and ground cover restore fertility and improve crop growth.",
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
      "Ditches and buried drains carry excess rainwater away from the crop roots.",
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
      "Retaining walls conserve soil and water on cultivated slopes.",
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
      "Planned felling, prepared haulage and sharp saws recover more useful timber from the woodland.",
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
      "Supports, ventilation, drainage and winding gear improve recovery from mineral workings.",
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
      "Lifting equipment and specialized tools improve recovery from stone, clay and peat workings.",
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
      "Managed evaporation beds gather salt in dry weather; sheltered, heated pans extend the working season.",
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
      "Runoff basins and contour bunds gather seasonal rain around dryland crops.",
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
      "Tracking shelters and curing yards help hunters follow passing game and preserve their catch.",
    stages: [
      "Tracking shelters",
      "Hides and curing racks",
      "Game-handling depot",
      "Regional game cold store",
    ],
  },
  foraging: {
    name: "Wild harvest infrastructure",
    cost: { lumber: 2, wool: 1, ore: 1 },
    description:
      "Gathering shelters and sorting benches preserve more berries during the brief heath harvest.",
    stages: [
      "Gathering shelters",
      "Harvest sorting stores",
      "Harvest handling equipment",
      "Wild harvest preservation works",
    ],
  },
  whaling: {
    name: "Whale-product infrastructure",
    cost: { lumber: 3, stone: 2, ore: 1 },
    description:
      "Shore slips, rendering kettles and settling tanks recover oil and hides from landed whales.",
    stages: [
      "Shore product slips",
      "Rendering yards",
      "Steam tryworks",
      "Whale-product handling complex",
    ],
  },
  fishery: {
    name: "Fishery infrastructure",
    cost: { lumber: 3, salt: 2, wool: 1 },
    description:
      "Clean landing stages, curing sheds and cold stores preserve more of the catch.",
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
  foraging: [
    { planks: 4, cloth: 2, steel: 2, coal: 4 },
    { planks: 8, masonry: 4, cloth: 3, steel: 6, coal: 24 },
    { planks: 12, masonry: 12, cloth: 6, steel: 16, coal: 60, coke: 6 },
  ],
  whaling: [
    { planks: 6, masonry: 4, ceramics: 3, steel: 4, coal: 8 },
    { planks: 12, masonry: 12, ceramics: 6, steel: 12, coal: 40 },
    { planks: 20, masonry: 26, ceramics: 12, steel: 28, coal: 100, coke: 10 },
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
    case "foraging":
      return b === "tundra-heath";
    case "whaling":
      return (
        tile.resource === "water" &&
        ["coast", "deep", "shoal", "reef"].includes(
          tile.geography.waterway ?? "",
        )
      );
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
    case "foraging":
      return ["grain"];
    case "whaling":
      return ["oil", "hides"];
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
  for (const [branch, tier] of installedSpecialists(tile, owner)) {
    if (branch.effect === weather && branch.goods.includes(raw))
      protection = 1 - (1 - protection) * Math.pow(0.9, tier);
  }
  return Math.min(0.9, protection);
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
    goods.map(
      (raw) =>
        (kind === "hunting" || kind === "whaling"
          ? (tile.geography?.fauna?.[raw] ?? 0)
          : (native[season][raw] ?? 0)) * (profile.goods?.[raw] ?? 1),
    ),
  );
  const totals = amounts.map(
    (row, i) => row.reduce((a, b) => a + b, 0) * (profile.seasons?.[i] ?? 1),
  );
  const budgets = allocateInfrastructureBonus(bonus, totals);
  seasons.forEach((season, i) => {
    const extra = allocateInfrastructureBonus(budgets[i], amounts[i]);
    goods.forEach((raw, j) => {
      if (extra[j]) output[season][raw] = extra[j];
    });
  });
  return output;
}

/** Highest averages keeps every allocated card when a tier adds to the budget.
 * Largest-remainder rounding can take a card away as the total increases.
 * This applies only to small infrastructure bonuses, not native harvests or
 * irrigation calendars. Stable ties make save/reload and previews identical. */
export function allocateInfrastructureBonus(
  total: number,
  weights: number[],
): number[] {
  const result = weights.map(() => 0);
  for (let card = 0; card < total; card++) {
    let best = -1,
      priority = 0;
    for (let i = 0; i < weights.length; i++) {
      const score = weights[i] / (2 * result[i] + 1);
      if (score > priority) {
        priority = score;
        best = i;
      }
    }
    if (best < 0) break;
    result[best]++;
  }
  return result;
}
export function huntingYield(
  tile: Hex,
  owner?: number,
  season?: Season,
): Stock {
  const fauna = tile.geography?.fauna ?? {};
  const kind = tile.resource === "water" ? "whaling" : "hunting";
  const result: Stock = Object.fromEntries(
    improvedGoods(tile, kind)
      .filter((g) => fauna[g])
      .map((g) => [g, fauna[g]]),
  );
  if (!season) return result;
  const tier = effectiveTier(tile, kind, owner);
  const extra = infrastructureExtras(tile, kind, tier, {
    spring: fauna,
    summer: fauna,
    autumn: fauna,
    winter: fauna,
  })[season];
  const side = specialistExtras(
    tile,
    { spring: fauna, summer: fauna, autumn: fauna, winter: fauna },
    owner,
    kind,
  )[season];
  for (const raw of improvedGoods(tile, kind))
    if (extra[raw] || side[raw])
      result[raw] = (result[raw] ?? 0) + (extra[raw] ?? 0) + (side[raw] ?? 0);
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

/** Specialist investments retain the main track and share its site restrictions. */
export function specialistSuitable(
  tile: Hex,
  branch: SpecialistBranch,
): boolean {
  if (!infrastructureSuitable(tile, branch.track)) return false;
  const biome = tile.biome ?? "",
    climate = tile.climate ?? "temperate";
  const g = tile.geography!,
    a = AGRONOMY[climate],
    native = biomeYield(tile.biome!, climate);
  if (
    (branch.biomes && !branch.biomes.includes(tile.biome!)) ||
    (branch.climates && !branch.climates.includes(climate)) ||
    (branch.minElevation !== undefined && g.elevation < branch.minElevation) ||
    (branch.maxElevation !== undefined && g.elevation >= branch.maxElevation) ||
    (branch.coastal && !g.coastal) ||
    (branch.fertile &&
      !g.floodplain &&
      !g.delta &&
      biome !== "chernozem-wheat" &&
      g.landmark !== "fertile-basin")
  )
    return false;
  const cereal =
    /fields|maize-field|rice-field/.test(biome) ||
    ["flood-wheat", "flood-rice", "flood-sorghum"].includes(biome);
  const rice = ["rice-field", "flood-rice"].includes(biome);
  const wetCrop =
    !["desert", "hyperarid", "semiarid", "steppe", "savanna"].includes(
      climate,
    ) &&
    ![
      "rice-field",
      "flood-rice",
      "delta-gardens",
      "sago-grove",
      "chinampa-gardens",
      "breadfruit-grove",
    ].includes(biome);
  if (branch.rotation) {
    const r = branch.rotation;
    return (
      r.biomes.includes(biome) &&
      r.climates.includes(climate) &&
      (r.maxElevation === undefined || g.elevation < r.maxElevation) &&
      (!r.fertile ||
        !!g.floodplain ||
        !!g.delta ||
        biome === "chernozem-wheat" ||
        g.landmark === "fertile-basin")
    );
  }
  if (
    branch.effect === "yield" &&
    !["hunting", "whaling", "fishery"].includes(branch.track) &&
    !branch.goods.some((raw) => native[raw])
  )
    return false;
  switch (branch.site) {
    case "any":
      return true;
    case "cereal":
      return (
        cereal &&
        !["potato-fields", "turnip-fields", "sunflower-fields"].includes(biome)
      );
    case "dry-crop":
      return ![
        "millet-fields",
        "sorghum-fields",
        "flood-sorghum",
        "olive-grove",
      ].includes(biome);
    case "wet-cereal":
      return cereal && wetCrop;
    case "roots":
      return ["potato-fields", "turnip-fields"].includes(biome);
    case "gardens":
      return ["delta-gardens", "chinampa-gardens", "turnip-fields"].includes(
        biome,
      );
    case "orchard":
      return [
        "olive-grove",
        "oasis",
        "breadfruit-grove",
        "sago-grove",
      ].includes(biome);
    case "oilseed":
      return ["olive-grove", "sunflower-fields"].includes(biome);
    case "rice":
      return rice;
    case "maize":
      return biome === "maize-field";
    case "wet-crop":
      return wetCrop;
    case "non-rice":
      return !rice && biome !== "sago-grove";
    case "continental-cereal":
      return (
        cereal &&
        ["steppe", "prairie", "cold"].includes(climate) &&
        ![
          "millet-fields",
          "sorghum-fields",
          "flood-sorghum",
          "sunflower-fields",
          "potato-fields",
        ].includes(biome)
      );
    case "thirsty-orchard":
      return ["oasis", "breadfruit-grove", "sago-grove"].includes(biome);
    case "wool":
      return !!native.wool;
    case "warm":
      return ["hot", "warm"].includes(a.heat);
    case "upland":
      return g.elevation >= 0.65 || ["alpine", "andean"].includes(climate);
    case "cold":
      return [
        "cold",
        "arctic",
        "glacial",
        "tundra",
        "alpine",
        "prairie",
        "andean",
      ].includes(climate);
    case "wetland":
      return a.moisture === "wet" || !!g.floodplain;
    case "ore":
      return !!native.ore;
    case "coal":
      return !!native.coal;
    case "gold":
      return !!native.gold;
    case "lowland":
      return g.elevation < 0.52;
    case "stone":
      return !!native.stone;
    case "clay":
      return !!native.brick;
    case "peat":
      return biome === "peat-bog";
    case "river":
      return g.waterway === "river";
    case "reef":
      return g.waterway === "reef";
    case "lake":
      return g.waterway === "lake";
    case "forest":
      return BIOME_INFO[tile.biome!]?.family === "forest";
    case "open":
      return BIOME_INFO[tile.biome!]?.family !== "forest";
    case "seal":
      return (
        !!g.coastal && ["arctic", "glacial", "tundra", "cold"].includes(climate)
      );
  }
}
export function specialistBranches(tile: Hex): SpecialistBranch[] {
  return (Object.keys(INFRASTRUCTURE) as InfrastructureKind[]).flatMap(
    (kind) =>
      infrastructureSuitable(tile, kind)
        ? (SPECIALISTS_BY_TRACK.get(kind) ?? []).filter((branch) =>
            specialistSuitable(tile, branch),
          )
        : [],
  );
}
/** Every stage is its own saved purchase. An incomplete/foreign chain has no effect. */
export function specialistTier(
  tile: Hex,
  branch: SpecialistBranch,
  owner?: number,
): number {
  let tier = 0,
    builder: number | undefined = owner;
  for (let stage = 1; stage <= 4; stage++) {
    const project = tile.geography?.projects?.[specialistId(branch, stage)];
    if (!project || (builder !== undefined && builder !== project.owner)) break;
    builder ??= project.owner;
    tier = stage;
  }
  return tier;
}
export function specialistCost(tile: Hex, id: SpecialistProject): Stock {
  const { branch, tier } = SPECIALIST_PROJECTS[id];
  // At least twice the local primary recipe for a smaller annual increment.
  // Fuel here represents construction and commissioning, never upkeep.
  const cost: Stock = Object.fromEntries(
    Object.entries(infrastructureCost(branch.track, tier, tile)).map(
      ([good, n]) => [good, Math.ceil(n! * 2.25)],
    ),
  );
  const extra =
    branch.id.includes("curing") || branch.id.includes("hide")
      ? "salt"
      : branch.effect === "wet"
        ? tier === 1
          ? "stone"
          : "ceramics"
        : branch.effect === "cold"
          ? tier === 1
            ? "wool"
            : "cloth"
          : tier === 1
            ? "lumber"
            : "planks";
  cost[extra] = (cost[extra] ?? 0) + tier * 2;
  for (const [good, amount] of Object.entries(branch.finishing ?? {}))
    cost[good as keyof Stock] =
      (cost[good as keyof Stock] ?? 0) + amount! * tier;
  return cost;
}
/** Only inspect installed projects during production, never the whole catalogue. */
function installedSpecialists(
  tile: Hex,
  owner?: number,
): [SpecialistBranch, number][] {
  const seen = new Set<string>(),
    result: [SpecialistBranch, number][] = [];
  for (const id of Object.keys(tile.geography?.projects ?? {})) {
    if (!isSpecialist(id)) continue;
    const branch = SPECIALIST_PROJECTS[id].branch;
    if (seen.has(branch.id)) continue;
    seen.add(branch.id);
    const tier = specialistTier(tile, branch, owner);
    if (tier && specialistSuitable(tile, branch)) result.push([branch, tier]);
  }
  return result;
}
export function specialistExtras(
  tile: Hex,
  native: Record<Season, Stock>,
  owner?: number,
  onlyTrack?: InfrastructureKind,
): Record<Season, Stock> {
  const seasons = ["spring", "summer", "autumn", "winter"] as const;
  const output: Record<Season, Stock> = {
    spring: {},
    summer: {},
    autumn: {},
    winter: {},
  };
  for (const [branch, tier] of installedSpecialists(tile, owner)) {
    if (
      branch.rotation ||
      branch.effect !== "yield" ||
      (onlyTrack && branch.track !== onlyTrack)
    )
      continue;
    const wild = ["hunting", "whaling", "fishery"].includes(branch.track);
    const amounts = seasons.map((season) =>
      branch.goods.map((raw) =>
        wild ? (tile.geography?.fauna?.[raw] ?? 0) : (native[season][raw] ?? 0),
      ),
    );
    const budgets = allocateInfrastructureBonus(
      tier,
      amounts.map(
        (row, i) =>
          row.reduce((a, b) => a + b, 0) * (branch.seasonalWeights?.[i] ?? 1),
      ),
    );
    seasons.forEach((season, i) => {
      const extra = allocateInfrastructureBonus(budgets[i], amounts[i]);
      branch.goods.forEach((raw, j) => {
        if (extra[j])
          output[season][raw] = (output[season][raw] ?? 0) + extra[j];
      });
    });
  }
  return output;
}

export function installedRotation(
  tile: Hex,
  owner?: number,
): SpecialistBranch | undefined {
  return installedSpecialists(tile, owner).find(
    ([branch]) => branch.rotation,
  )?.[0];
}
export function rotationPrerequisites(
  tile: Hex,
  branch: SpecialistBranch,
  owner?: number,
): boolean {
  const r = branch.rotation;
  if (!r) return true;
  return (
    (!r.water || effectiveTier(tile, "irrigation", owner) > 0) &&
    (!r.drainage ||
      effectiveTier(tile, "drainage", owner) > 0 ||
      (!tile.geography?.floodplain &&
        AGRONOMY[tile.climate ?? "temperate"].moisture !== "wet"))
  );
}
export function rotationExtras(
  tile: Hex,
  ordinary: Record<Season, Stock>,
  owner?: number,
): Record<Season, Stock> {
  const result: Record<Season, Stock> = {
    spring: {},
    summer: {},
    autumn: {},
    winter: {},
  };
  const branch = installedRotation(tile, owner);
  if (!branch || !rotationPrerequisites(tile, branch, owner)) return result;
  const r = branch.rotation!,
    tier = specialistTier(tile, branch, owner);
  const seasons = r.seasons.filter(
    (season) => !(ordinary[season].grain || ordinary[season].oil),
  );
  // The catch crop occupies a small portion of the field. No main-harvest cards
  // are removed, and a full irrigation calendar leaves no free seasonal window.
  const amounts = allocateInfrastructureBonus(
    Math.ceil(tier / 2),
    seasons.map(() => 1),
  );
  seasons.forEach((season, i) => {
    if (amounts[i]) result[season].grain = amounts[i];
  });
  if (seasons.length) {
    // Alternate catch-crop improvements with benefits to the main crop from
    // rotation, residue incorporation and improved soil structure.
    const mainSeasons = ["spring", "summer", "autumn", "winter"] as const;
    const weights = mainSeasons.map(
      (season) => (ordinary[season].grain ?? 0) + (ordinary[season].oil ?? 0),
    );
    const budgets = allocateInfrastructureBonus(Math.floor(tier / 2), weights);
    mainSeasons.forEach((season, i) => {
      const goods = ["grain", "oil"] as const;
      const portions = allocateInfrastructureBonus(
        budgets[i],
        goods.map((good) => ordinary[season][good] ?? 0),
      );
      goods.forEach((good, j) => {
        if (portions[j])
          result[season][good] = (result[season][good] ?? 0) + portions[j];
      });
    });
  }
  return result;
}

/** Quiet hunting corridors soften development pressure, without creating animals. */
export function specialistRefuge(tile: Hex): number {
  let tier = 0;
  for (const [b, n] of installedSpecialists(tile))
    if (b.specialty === "refuge") tier = Math.max(tier, n);
  return tier * 0.15;
}
/** Shared rescue capacity: overlapping shelters never multiply the allowance. */
export function specialistRecovery(tile: Hex, weather: string, owner?: number) {
  let budget = 0;
  const caps: Partial<Record<Raw, number>> = {};
  for (const [b, tier] of installedSpecialists(tile, owner)) {
    if (b.specialty !== "recovery" || b.effect !== weather) continue;
    const n = Math.ceil(tier / 2);
    budget = Math.max(budget, n);
    for (const raw of b.goods) caps[raw] = Math.max(caps[raw] ?? 0, n);
  }
  return { budget, caps };
}
/** Secondary uses of the harvest. Best works of each kind apply, not every
 * overlapping branch; their existing primary benefits continue to coexist. */
export function specialistUtilityExtras(
  tile: Hex,
  native: Record<Season, Stock>,
  owner?: number,
) {
  const seasons = ["spring", "summer", "autumn", "winter"] as const;
  const pantry: Record<Season, Stock> = {
    spring: {},
    summer: {},
    autumn: {},
    winter: {},
  };
  const aggregate: Record<Season, Stock> = {
    spring: {},
    summer: {},
    autumn: {},
    winter: {},
  };
  let food = 0,
    rubble = 0;
  for (const [b, tier] of installedSpecialists(tile, owner)) {
    if (b.specialty === "pantry") food = Math.max(food, Math.floor(tier / 2));
    if (b.specialty === "aggregate")
      rubble = Math.max(rubble, Math.floor(tier / 2));
  }
  const crops = seasons.map((s) => native[s].grain ?? 0);
  if (food && crops.some(Boolean)) {
    const least = crops.reduce((n, v) => Math.min(n, v), Infinity);
    const shares = allocateInfrastructureBonus(
      food,
      crops.map((n) => Number(n === least)),
    );
    seasons.forEach((s, i) => {
      if (shares[i]) pantry[s].grain = shares[i];
    });
  }
  if (rubble) {
    const shares = allocateInfrastructureBonus(
      rubble,
      seasons.map((s) => native[s].ore ?? 0),
    );
    seasons.forEach((s, i) => {
      if (shares[i]) aggregate[s].stone = shares[i];
    });
  }
  return { pantry, aggregate };
}

export function specialistPantryCapacity(tile: Hex, owner?: number): number {
  let capacity = 0;
  for (const [b, tier] of installedSpecialists(tile, owner))
    if (b.specialty === "pantry")
      capacity = Math.max(capacity, Math.floor(tier / 2));
  return capacity;
}

/** Small AI credit for the distinct service, beyond any already installed equivalent. */
export function specialistRoleGain(
  tile: Hex,
  branch: SpecialistBranch,
  tier: number,
  owner?: number,
): number {
  if (!branch.specialty) return 0;
  const level = (n: number) =>
    branch.specialty === "recovery"
      ? Math.ceil(n / 2)
      : branch.specialty === "refuge"
        ? n * 0.15
        : Math.floor(n / 2);
  let current = 0;
  for (const [b, n] of installedSpecialists(
    tile,
    branch.specialty === "refuge" ? undefined : owner,
  )) {
    if (
      b.specialty === branch.specialty &&
      (branch.specialty !== "recovery" || b.effect === branch.effect)
    )
      current = Math.max(current, level(n));
  }
  return Math.max(0, level(tier) - current);
}

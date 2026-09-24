import type { Game, Hex, World, Stock, ShipClass, Piece } from "./types";
import {
  BIOME_INFO,
  biomeYield,
  CLIMATE_INFO,
  type Biome,
  type Climate,
} from "./climate-content";
import { randomAt, neighbors, coord, key, distance } from "./world";

export type Landform =
  "continent" | "archipelago" | "inland-seas" | "peninsulas";
export type Waterway = "river" | "lake" | "coast" | "deep" | "shoal" | "reef";
export type Landmark =
  | "thermal-spring"
  | "natural-harbor"
  | "fertile-basin"
  | "mineral-vein"
  | "ancient-grove";
export type Weather = "normal" | "wet" | "dry" | "cold" | "mild";
export type Project = "bridge" | "irrigation" | "levee" | "harbor" | "granary";
export type WildlifeKind =
  | "fish"
  | "cod"
  | "whale"
  | "deer"
  | "bison"
  | "reindeer"
  | "musk-ox"
  | "seal"
  | "jungle-game"
  | "turkey";
export interface Geography {
  elevation: number;
  region: string;
  waterway?: Waterway;
  coastal?: boolean;
  warmed?: boolean;
  downstream?: string;
  ford?: boolean;
  floodplain?: boolean;
  delta?: boolean;
  pass?: boolean;
  landmark?: Landmark;
  weather?: Weather;
  access?: "normal" | "ford" | "flooded" | "closed";
  fauna?: Stock;
  animals?: WildlifeKind[];
  projects?: Partial<Record<Project, { owner: number; born: number }>>;
  damagedUntil?: number;
  newlyRevealed?: boolean;
  nextHarvestMode?: "concentrated" | "spread";
  harvestChosenYear?: number;
  harvestMode?: "concentrated" | "spread";
}
export interface Wildlife {
  id: string;
  kind: WildlifeKind;
  tile: string;
  lastRound: number;
}
export const GEOGRAPHY_VERSION = 1;
export const landform = (seed: string): Landform =>
  (["continent", "archipelago", "inland-seas", "peninsulas"] as const)[
    Math.floor(randomAt(seed, "world", "landform") * 4)
  ];
const smooth = (n: number) => n * n * (3 - 2 * n);
function noise(
  seed: string,
  q: number,
  r: number,
  scale: number,
  stream: string,
) {
  const x = q / scale,
    y = r / scale,
    a = Math.floor(x),
    b = Math.floor(y),
    u = smooth(x - a),
    v = smooth(y - b);
  const at = (i: number, j: number) => randomAt(seed, key(i, j), stream);
  return (
    (at(a, b) * (1 - u) + at(a + 1, b) * u) * (1 - v) +
    (at(a, b + 1) * (1 - u) + at(a + 1, b + 1) * u) * v
  );
}
const heightCache = new Map<string, number>();
export function elevationAt(seed: string, id: string): number {
  const cacheKey = seed + "/" + id;
  const saved = heightCache.get(cacheKey);
  if (saved !== undefined) return saved;
  const [q, r] = coord(id),
    form = landform(seed);
  const scale = form === "archipelago" ? 4 : form === "continent" ? 11 : 7;
  const large = noise(seed, q + 51, r - 29, scale, "continental-height");
  const small = noise(seed, q - 19, r + 73, 2.4, "coastal-height");
  const ridges = noise(seed, q + r * 0.65, r * 0.4, 5, "mountain-belt");
  let value = large * 0.68 + small * 0.2 + ridges * 0.12;
  if (form === "peninsulas")
    value =
      noise(seed, q + r * 0.7 + 51, r * 0.38 - 29, 5, "peninsula-coast") *
        0.72 +
      small * 0.18 +
      ridges * 0.1;
  if (form === "inland-seas") {
    let nearest = Infinity;
    const a = Math.round(q / 18),
      b = Math.round(r / 18);
    for (let i = a - 1; i <= a + 1; i++)
      for (let j = b - 1; j <= b + 1; j++) {
        const center = key(
          i * 18 + Math.round(randomAt(seed, key(i, j), "basin-q") * 6 - 3),
          j * 18 + Math.round(randomAt(seed, key(i, j), "basin-r") * 6 - 3),
        );
        nearest = Math.min(nearest, distance(id, center));
      }
    value =
      0.55 +
      small * 0.15 +
      ridges * 0.1 -
      0.45 * Math.exp((-nearest * nearest) / 22);
  }
  if (heightCache.size >= 60000) heightCache.clear();
  heightCache.set(cacheKey, value);
  return value;
}
const seaLevels = new Map<string, number>();
export function seaLevel(seed: string) {
  const cached = seaLevels.get(seed);
  if (cached !== undefined) return cached;
  // Select a coherent coastline level over a fixed survey area. This reserves
  // the same geography for every campaign size and expedition reveal order.
  // Resources remain unguaranteed; this only avoids an unusable all-sea start.
  const heights: number[] = [];
  for (let q = -8; q <= 8; q++)
    for (let r = -8; r <= 8; r++)
      if (Math.abs(q + r) <= 8) heights.push(elevationAt(seed, key(q, r)));
  heights.sort((a, b) => a - b);
  const water = {
    continent: 0.38,
    archipelago: 0.57,
    "inland-seas": 0.4,
    peninsulas: 0.48,
  }[landform(seed)];
  const level = heights[Math.floor(heights.length * water)];
  if (seaLevels.size > 256) seaLevels.clear();
  seaLevels.set(seed, level);
  return level;
}
interface Drainage {
  rivers: Map<string, string>;
  lakes: Set<string>;
  mouths: Set<string>;
}
const drainageCache = new Map<string, Drainage>();
/** Each watershed source owns a bounded downhill trace. Queries never depend on
 * revealed tiles; expeditions cannot reroll coasts, rivers or their mouths. */
function watershed(seed: string, q: number, r: number): Drainage {
  const cacheKey = `${seed}/${q}/${r}`;
  const cached = drainageCache.get(cacheKey);
  if (cached) return cached;
  const result: Drainage = {
    rivers: new Map(),
    lakes: new Set(),
    mouths: new Set(),
  };
  let source = key(q * 8 + 4, r * 8 + 4);
  for (let i = 0; i < 12; i++) {
    const candidate = key(
      q * 8 + Math.floor(randomAt(seed, cacheKey, `source-q-${i}`) * 8),
      r * 8 + Math.floor(randomAt(seed, cacheKey, `source-r-${i}`) * 8),
    );
    if (elevationAt(seed, candidate) > elevationAt(seed, source))
      source = candidate;
  }
  if (elevationAt(seed, source) > seaLevel(seed) + 0.06) {
    let at = source;
    const visited = new Set([source]);
    for (let step = 0; step < 16; step++) {
      const next = neighbors(at)
        .filter((n) => !visited.has(n))
        .sort(
          (a, b) =>
            elevationAt(seed, a) - elevationAt(seed, b) || a.localeCompare(b),
        )[0];
      if (!next) break;
      if (elevationAt(seed, next) >= elevationAt(seed, at)) {
        if (step >= 2) result.lakes.add(at);
        break;
      }
      result.rivers.set(at, next);
      if (elevationAt(seed, next) < seaLevel(seed)) {
        result.mouths.add(at);
        break;
      }
      visited.add(next);
      at = next;
    }
    if (result.rivers.size < 2) {
      result.rivers.clear();
      result.lakes.clear();
      result.mouths.clear();
    }
  }
  if (drainageCache.size >= 512) drainageCache.clear();
  drainageCache.set(cacheKey, result);
  return result;
}
function drainageAt(seed: string, id: string) {
  const [q, r] = coord(id),
    x = Math.floor(q / 8),
    y = Math.floor(r / 8);
  let downstream: string | undefined,
    lake = false,
    mouth = false;
  for (let a = x - 3; a <= x + 3; a++)
    for (let b = y - 3; b <= y + 3; b++) {
      const d = watershed(seed, a, b);
      const candidate = d.rivers.get(id);
      if (
        candidate &&
        (!downstream ||
          elevationAt(seed, candidate) < elevationAt(seed, downstream))
      )
        downstream = candidate;
      lake ||= d.lakes.has(id);
      mouth ||= d.mouths.has(id);
    }
  return { downstream, lake, mouth };
}
export function geographyAt(seed: string, id: string) {
  const elevation = elevationAt(seed, id),
    drainage = drainageAt(seed, id);
  const water =
    elevation < seaLevel(seed) || !!drainage.downstream || drainage.lake;
  return { elevation, water, ...drainage };
}
const COLD = new Set<Climate>([
  "cold",
  "arctic",
  "glacial",
  "alpine",
  "tundra",
]);
const HOT = new Set<Climate>([
  "tropical",
  "subtropical",
  "monsoon",
  "savanna",
  "mesoamerican",
  "equatorial-wetlands",
]);
const DRY = new Set<Climate>(["desert", "hyperarid"]);
const RIVER_ONLY = new Set<Biome>([
  "alluvial-clay",
  "river-woods",
  "chinampa-gardens",
  "sago-grove",
]);
const WILD_BIOMES = new Set<Biome>([
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
export const wildHabitat = (tile: Hex) =>
  !!tile.biome &&
  (WILD_BIOMES.has(tile.biome) || BIOME_INFO[tile.biome].family === "forest");
export function habitatKind(tile: Hex): WildlifeKind | undefined {
  if (tile.resource === "water") {
    if (
      tile.geography?.waterway === "river" ||
      tile.geography?.waterway === "lake"
    )
      return "fish";
    return tile.climate && COLD.has(tile.climate) ? "cod" : "fish";
  }
  if (!wildHabitat(tile)) return undefined;
  if (tile.biome === "turkey-grounds") return "turkey";
  if (tile.biome === "seal-grounds") return "seal";
  if (tile.biome === "musk-ox-range") return "musk-ox";
  if (tile.climate && COLD.has(tile.climate)) return "reindeer";
  if (tile.climate && HOT.has(tile.climate)) return "jungle-game";
  return tile.biome === "bison-range" || tile.biome === "steppe-plain"
    ? "bison"
    : "deer";
}
export const WILDLIFE_GOODS: Record<WildlifeKind, Stock> = {
  fish: { fish: 3 },
  cod: { fish: 5 },
  whale: { hides: 3, oil: 3 },
  deer: { hides: 2, meat: 2 },
  bison: { hides: 2, meat: 3 },
  reindeer: { hides: 2, meat: 2 },
  "musk-ox": { wool: 2, meat: 2 },
  seal: { hides: 2, oil: 2 },
  "jungle-game": { hides: 3, meat: 1 },
  turkey: { meat: 3 },
};
export const WILDLIFE_NAMES: Record<WildlifeKind, string> = {
  fish: "Fish shoal",
  cod: "Cod shoal",
  whale: "Whale pod",
  deer: "Deer herd",
  bison: "Wild cattle herd",
  reindeer: "Reindeer herd",
  "musk-ox": "Musk ox herd",
  seal: "Seal colony",
  "jungle-game": "Forest game",
  turkey: "Wild turkey flock",
};
export const PROJECTS: Record<
  Project,
  { name: string; cost: Stock; description: string }
> = {
  bridge: {
    name: "Bridge",
    cost: { stone: 3, planks: 2, steel: 1 },
    description:
      "Permanent river crossing for armies. Ships retain passage. Does not cross peaks or sea.",
  },
  irrigation: {
    name: "Irrigation",
    cost: { stone: 2, brick: 2, ore: 1 },
    description:
      "River-fed fields gain 1 Grain per producer on productive rolls. Allows a spread harvest calendar.",
  },
  levee: {
    name: "Flood levee",
    cost: { stone: 3, planks: 2 },
    description:
      "Keeps this floodplain accessible to armies and maintains its ordinary production during floods.",
  },
  harbor: {
    name: "Improved harbor",
    cost: { masonry: 2, planks: 2, steel: 1 },
    description:
      "A coastal anchorage gives newly built ships 1 extra movement point on their first active turn.",
  },
  granary: {
    name: "Raised granary",
    cost: { stone: 2, lumber: 2 },
    description:
      "Protects up to 8 food cards per town level from a raid. Destruction still captures everything.",
  },
};
/** Geographic constraints select from existing resource cards. River specialization
 * never creates a new fungible currency or changes vanilla construction costs. */
export function geographicTerrain(seed: string, tile: Hex): void {
  const id = tile.id,
    climate = tile.climate ?? "temperate",
    at = geographyAt(seed, id),
    around = neighbors(id).map((n) => ({ id: n, ...geographyAt(seed, n) }));
  const river = around.some((n) => n.downstream || n.lake),
    coast = around.some((n) => n.water && !n.downstream),
    delta = around.some((n) => n.mouth);
  const geo: Geography = {
    elevation: Math.round(at.elevation * 1000) / 1000,
    newlyRevealed: true,
    coastal: coast,
    region: `${climate}:${Math.floor((tile.q + tile.r * 0.5) / 10)},${Math.floor(tile.r / 10)}`,
  };
  let biome: Biome;
  if (at.water) {
    geo.waterway = at.downstream
      ? "river"
      : at.lake || landform(seed) === "inland-seas"
        ? "lake"
        : around.some((n) => !n.water)
          ? "coast"
          : "deep";
    geo.downstream = at.downstream;
    geo.ford = geo.waterway === "river" && randomAt(seed, id, "ford") < 0.3;
    if (geo.waterway === "coast" && randomAt(seed, id, "shoal") < 0.28)
      geo.waterway =
        HOT.has(climate) && randomAt(seed, id, "reef") < 0.5 ? "reef" : "shoal";
    biome =
      geo.waterway === "river"
        ? "river"
        : geo.waterway === "lake"
          ? "lake"
          : geo.waterway === "reef"
            ? "reef"
            : geo.waterway === "shoal"
              ? "shoal"
              : "water";
    if (climate === "glacial" && randomAt(seed, id, "pack-ice") < 0.22)
      biome = "ice";
  } else {
    const choices = CLIMATE_INFO[climate].terrain.filter(
      ([b]) => !RIVER_ONLY.has(b) || river,
    );
    let roll =
      randomAt(seed, id, "resource") *
      choices.reduce((sum, [, w]) => sum + w, 0);
    biome = choices.at(-1)![0];
    for (const [b, w] of choices) {
      roll -= w;
      if (roll < 0) {
        biome = b;
        break;
      }
    }
    const mountains =
      at.elevation > seaLevel(seed) + 0.15 ||
      (["alpine", "andean"].includes(climate) &&
        at.elevation > seaLevel(seed) + 0.04);
    if (biome === "bare-peaks" && !mountains) biome = "stone";
    if (biome === "seal-grounds" && !coast) biome = "snow-plain";
    if (mountains && randomAt(seed, id, "ridge") < 0.38) biome = "bare-peaks";
    if (biome === "bare-peaks" && randomAt(seed, id, "pass") < 0.25) {
      biome = "mountain-pass";
      geo.pass = true;
    }
    if (
      river &&
      at.elevation < seaLevel(seed) + 0.19 &&
      !["bare-peaks", "mountain-pass"].includes(biome)
    ) {
      geo.floodplain = true;
      geo.delta = delta;
      const pick = randomAt(seed, id, "river-field");
      if (pick < 0.17) biome = "alluvial-clay";
      else if (pick < 0.3) biome = "river-woods";
      else if (
        pick < 0.69 &&
        !["arctic", "glacial", "tundra"].includes(climate)
      )
        biome =
          climate === "mesoamerican"
            ? "chinampa-gardens"
            : climate === "andean"
              ? "potato-fields"
              : delta
                ? "delta-gardens"
                : HOT.has(climate)
                  ? "flood-rice"
                  : DRY.has(climate) || climate === "steppe"
                    ? "flood-sorghum"
                    : "flood-wheat";
      else if (pick < 0.8) biome = "flood-meadow";
    }
    if (biome === "mangrove" && !coast && !river) biome = "jungle";
    if (
      randomAt(seed, id, "landmark") < 0.012 &&
      biome !== "bare-peaks" &&
      !geo.pass
    ) {
      geo.landmark = coast
        ? COLD.has(climate)
          ? "thermal-spring"
          : "natural-harbor"
        : BIOME_INFO[biome].yield.grain
          ? "fertile-basin"
          : BIOME_INFO[biome].family === "forest"
            ? "ancient-grove"
            : ["ore", "coal", "stone", "gold"].includes(
                  BIOME_INFO[biome].resource,
                )
              ? "mineral-vein"
              : undefined;
    }
  }
  tile.biome = biome;
  tile.resource = BIOME_INFO[biome].resource;
  tile.geography = geo;
  delete tile.fish;
  delete tile.whale;
  delete tile.woodsChoices;
  delete tile.woodsChosenOn;
}
export function baseGeographicYield(tile: Hex): Stock {
  const geo = tile.geography!,
    biome = tile.biome!;
  let output: Stock = { ...biomeYield(biome, tile.climate) };
  if (WILD_BIOMES.has(biome))
    output =
      BIOME_INFO[biome].family === "forest"
        ? { lumber: biome === "hunting-forest" ? 2 : 1 }
        : {};
  if (BIOME_INFO[biome].family === "forest") {
    delete output.hides;
    delete output.meat;
    output.lumber = Math.max(1, output.lumber ?? 0);
  }
  if (["fish", "cod", "whale"].includes(biome)) output = {};
  if (geo.landmark === "ancient-grove")
    output.lumber = (output.lumber ?? 0) + 1;
  if (geo.landmark === "mineral-vein") {
    const raw = ["ore", "stone", "coal", "gold"].find(
      (g) => output[g as keyof Stock],
    );
    if (raw) output[raw as keyof Stock]! += 1;
  }
  return output;
}
export function canSail(
  tile: Hex | undefined,
  kind: ShipClass,
  tier = 1,
): boolean {
  if (!tile || tile.surface === "frozen" || tile.geography?.access === "closed")
    return false;
  const geo = tile.geography;
  if (!geo) return tile.surface === "open" || tile.resource === "water";
  if (
    tile.resource !== "water" &&
    tile.resource !== "ice" &&
    geo.access !== "flooded"
  )
    return false;
  const shallow =
    ["river", "shoal", "reef"].includes(geo.waterway ?? "") ||
    geo.access === "flooded";
  return (
    !shallow ||
    kind === "riverboat" ||
    kind === "fishing" ||
    kind === "transport" ||
    (kind === "galley" && tier <= 2) ||
    kind === "settlership"
  );
}
export function pieceAccess(
  tile: Hex | undefined,
  u: Pick<Piece, "naval" | "kind" | "tier">,
): boolean {
  if (u.naval) return canSail(tile, u.kind as ShipClass, u.tier);
  if (!tile || tile.resource === "peaks" || tile.geography?.access === "closed")
    return false;
  if (tile.geography?.projects?.bridge || tile.geography?.access === "ford")
    return true;
  if (tile.geography?.access === "flooded") return false;
  return tile.surface ? tile.surface === "frozen" : tile.resource !== "water";
}
export function geographicName(tile: Hex): string | undefined {
  const g = tile.geography;
  if (!g) return;
  return g.pass
    ? "Mountain pass"
    : g.delta
      ? "River delta"
      : g.floodplain
        ? "Floodplain"
        : g.waterway
          ? {
              river: "River",
              lake: "Lake",
              coast: "Coastal water",
              deep: "Open sea",
              shoal: "Shallows",
              reef: "Reef",
            }[g.waterway]
          : undefined;
}

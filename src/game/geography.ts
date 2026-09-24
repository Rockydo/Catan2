import { convergeRiverCourse } from "./river-course";
import {
  physicalElevation,
  regionalLandform,
  worldLandform,
  type PhysicalLandform,
} from "./physical-landforms";
import { climateSetting } from "./geographic-climate";
import type { Game, Hex, World, Stock, ShipClass, Piece } from "./types";
import {
  BIOME_INFO,
  biomeYield,
  CLIMATE_INFO,
  type Biome,
  type Climate,
} from "./climate-content";
import { randomAt, neighbors, coord, key, distance } from "./world";

export type Landform = PhysicalLandform;
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
  | "turkey"
  | "gazelle";
export interface Geography {
  elevation: number;
  region: string;
  waterway?: Waterway;
  depth?: number;
  coastal?: boolean;
  warmed?: boolean;
  downstream?: string;
  ford?: boolean;
  floodplain?: boolean;
  floodThreshold?: 3 | 4;
  delta?: boolean;
  pass?: boolean;
  landmark?: Landmark;
  weather?: Weather;
  weatherSeason?: import("./seasons").Season;
  access?: "normal" | "ford" | "flooded" | "closed";
  fauna?: Stock;
  animals?: WildlifeKind[];
  projects?: Partial<Record<Project, { owner: number; born: number }>>;
  damagedUntil?: number;
  newlyRevealed?: boolean;
  gazelleSurveyed?: boolean;
  nextHarvestMode?: "concentrated" | "spread";
  harvestChosenYear?: number;
  harvestMode?: "concentrated" | "spread";
}
export interface Wildlife {
  id: string;
  kind: WildlifeKind;
  tile: string;
  lastRound: number;
  dormant?: true;
}
export const GEOGRAPHY_VERSION = 7;
export const landform = (
  seed: string,
  version = GEOGRAPHY_VERSION,
): Landform =>
  version >= 3
    ? worldLandform(seed, version)
    : (["continent", "archipelago", "inland-seas", "peninsulas"] as const)[
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
export function elevationAt(
  seed: string,
  id: string,
  version = GEOGRAPHY_VERSION,
): number {
  const cacheKey = seed + "/" + id + "/" + version;
  const saved = heightCache.get(cacheKey);
  if (saved !== undefined) return saved;
  if (version >= 3) {
    const height = physicalElevation(seed, id, version);
    if (heightCache.size >= 60000) heightCache.clear();
    heightCache.set(cacheKey, height);
    return height;
  }
  const [q, r] = coord(id),
    form = landform(seed, version);
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
export function seaLevel(seed: string, version = GEOGRAPHY_VERSION) {
  const levelKey = `${seed}/${version}`;
  const cached = seaLevels.get(levelKey);
  if (cached !== undefined) return cached;
  // Select a coherent coastline level over a fixed survey area. This reserves
  // the same geography for every campaign size and expedition reveal order.
  // Resources remain unguaranteed; this only avoids an unusable all-sea start.
  const heights: number[] = [];
  for (let q = -8; q <= 8; q++)
    for (let r = -8; r <= 8; r++)
      if (Math.abs(q + r) <= 8)
        heights.push(elevationAt(seed, key(q, r), version));
  heights.sort((a, b) => a - b);
  const water = {
    continent: 0.38,
    archipelago: 0.57,
    "inland-seas": 0.4,
    peninsulas: 0.48,
    "island-chains": 0.58,
    skerries: 0.57,
    fjords: 0.43,
    "barrier-coasts": 0.5,
    atolls: 0.61,
    "rift-valleys": 0.38,
    "drowned-valleys": 0.5,
    "volcanic-arcs": 0.58,
    "basin-ranges": 0.3,
    "dissected-plateaus": 0.32,
  }[landform(seed, version)];
  const level =
    heights[Math.floor(heights.length * water * (version >= 3 ? 0.75 : 1))];
  if (seaLevels.size > 256) seaLevels.clear();
  seaLevels.set(levelKey, level);
  return level;
}
interface Drainage {
  rivers: Map<string, string>;
  lakes: Set<string>;
  mouths: Set<string>;
}
/** Fill a local river depression from its lowest neighbouring ground. A
 * bounded footprint and spill-height limit keep lakes compact and avoid
 * flooding mountain ridges. Coordinates alone determine the complete basin. */
function fillLakeBasin(
  seed: string,
  sink: string,
  rain: number,
  version: number,
): Set<string> {
  const basin = new Set([sink]);
  const target = 3 + Math.floor(randomAt(seed, sink, "lake-area") * 8);
  const level = elevationAt(seed, sink, version) + 0.055 + rain * 0.045;
  const frontier = new Set(neighbors(sink));
  while (basin.size < target && frontier.size) {
    let next: string | undefined,
      lowest = Infinity;
    for (const id of frontier) {
      const h = elevationAt(seed, id, version);
      if (h < lowest || (h === lowest && id < next!)) {
        next = id;
        lowest = h;
      }
    }
    if (!next || lowest > level) break;
    frontier.delete(next);
    // Reaching sea level gives this basin an outlet. Do not grow into sea.
    if (lowest < seaLevel(seed, version)) break;
    basin.add(next);
    for (const id of neighbors(next))
      if (!basin.has(id) && distance(sink, id) <= 3) frontier.add(id);
  }
  return basin;
}
const drainageCache = new Map<string, Drainage>();
/** Each watershed source owns a bounded downhill trace. Queries never depend on
 * revealed tiles; expeditions cannot reroll coasts, rivers or their mouths. */
function watershed(
  seed: string,
  q: number,
  r: number,
  version: number,
): Drainage {
  const cacheKey = `${seed}/${q}/${r}/${version}`;
  const sourceKey = `${seed}/${q}/${r}`;
  const cached = drainageCache.get(cacheKey);
  if (cached) return cached;
  const result: Drainage = {
    rivers: new Map(),
    lakes: new Set(),
    mouths: new Set(),
  };
  let source = key(q * 8 + 4, r * 8 + 4);

  for (let i = 0; i < (version >= 6 ? 24 : 12); i++) {
    const candidate = key(
      q * 8 + Math.floor(randomAt(seed, sourceKey, `source-q-${i}`) * 8),
      r * 8 + Math.floor(randomAt(seed, sourceKey, `source-r-${i}`) * 8),
    );
    if (
      elevationAt(seed, candidate, version) > elevationAt(seed, source, version)
    )
      source = candidate;
  }
  const rain =
    version >= 2 ? climateSetting(seed, source, version).moisture : 1;
  const supplied =
    version < 2 ||
    (randomAt(seed, source, "watershed-rain") < 0.18 + rain * 0.82 &&
      (version < 6 ||
        elevationAt(seed, source, version) > seaLevel(seed, version) + 0.12 ||
        randomAt(seed, source, "lowland-spring") < 0.25));
  if (
    supplied &&
    elevationAt(seed, source, version) > seaLevel(seed, version) + 0.06
  ) {
    const form =
      version >= 3 ? regionalLandform(seed, source, version) : "continent";
    const smallIslands = [
      "island-chains",
      "archipelago",
      "skerries",
      "atolls",
      "volcanic-arcs",
    ].includes(form);
    const maxSteps =
      version < 3
        ? 16
        : version === 3
          ? smallIslands
            ? 8
            : rain < 0.3
              ? 10
              : 16
          : smallIslands
            ? 12
            : rain < 0.3
              ? 24
              : 36;
    const sources = [source];
    // Wet mainland catchments have additional headwaters. They merge by
    // following the same downhill terrain, rather than drawing random branches.
    if (
      version >= 3 &&
      !smallIslands &&
      rain > 0.55 &&
      randomAt(seed, source, "tributary") < 0.75
    ) {
      const candidates = Array.from({ length: 8 }, (_, i) =>
        key(
          q * 8 + Math.floor(randomAt(seed, sourceKey, `tributary-q-${i}`) * 8),
          r * 8 + Math.floor(randomAt(seed, sourceKey, `tributary-r-${i}`) * 8),
        ),
      )
        .filter((id) => distance(id, source) >= 3)
        .sort(
          (a, b) =>
            elevationAt(seed, b, version) - elevationAt(seed, a, version),
        );
      if (
        candidates[0] &&
        elevationAt(seed, candidates[0], version) >
          seaLevel(seed, version) + 0.06
      )
        sources.push(candidates[0]);
    }
    for (const from of sources) {
      let at = from;
      const visited = new Set([from]),
        course = new Map<string, string>(),
        lakes = new Set<string>(),
        mouths = new Set<string>();
      for (let step = 0; step < maxSteps; step++) {
        let next = neighbors(at)
          .filter((n) => !visited.has(n))
          .sort(
            (a, b) =>
              elevationAt(seed, a, version) - elevationAt(seed, b, version) ||
              a.localeCompare(b),
          )[0];
        if (version >= 4) {
          const height = elevationAt(seed, at, version);
          const downhill = neighbors(at).filter(
            (id) => !visited.has(id) && elevationAt(seed, id, version) < height,
          );
          // Modest downhill bends extend valleys without crossing a ridge or
          // allowing river cycles. A continuation avoids premature local sinks.
          const flowing = downhill.filter(
            (id) =>
              elevationAt(seed, id, version) < seaLevel(seed, version) ||
              neighbors(id).some(
                (n) =>
                  elevationAt(seed, n, version) <
                  elevationAt(seed, id, version),
              ),
          );
          if (flowing.length && randomAt(seed, at, "river-meander") < 0.65)
            next = flowing.sort(
              (a, b) =>
                elevationAt(seed, b, version) - elevationAt(seed, a, version) ||
                a.localeCompare(b),
            )[0];
          // Query collars cover 24 hexes. Reserve three for lake spread and
          // keep longer meandering courses inside that fixed spatial budget.
          if (next && distance(from, next) > 20) {
            if (step >= 2) lakes.add(at);
            break;
          }
        }
        if (!next) break;
        if (
          elevationAt(seed, next, version) >= elevationAt(seed, at, version)
        ) {
          if (step >= 2) lakes.add(at);
          break;
        }
        course.set(at, next);
        if (elevationAt(seed, next, version) < seaLevel(seed, version)) {
          mouths.add(at);
          break;
        }
        visited.add(next);
        at = next;
        if (step === maxSteps - 1) lakes.add(at);
      }
      if (course.size >= 2) {
        const resolved =
          version >= 7
            ? convergeRiverCourse(course, result.rivers, (id) =>
                elevationAt(seed, id, version),
              )
            : { course, joined: false };
        for (const [id, next] of resolved.course) result.rivers.set(id, next);
        if (!resolved.joined) {
          for (const id of lakes) result.lakes.add(id);
          for (const id of mouths)
            if (resolved.course.has(id)) result.mouths.add(id);
        }
      }
    }
  }
  if (version >= 3 && result.lakes.size) {
    const sinks = [...result.lakes];
    for (const sink of sinks)
      for (const id of fillLakeBasin(seed, sink, rain, version))
        result.lakes.add(id);
    // Submerged river sections become part of the lake, not narrow channels.
    for (const id of result.lakes) {
      result.rivers.delete(id);
      result.mouths.delete(id);
    }
  }
  if (drainageCache.size >= 512) drainageCache.clear();
  drainageCache.set(cacheKey, result);
  return result;
}
function drainageAt(seed: string, id: string, version: number) {
  const [q, r] = coord(id),
    x = Math.floor(q / 8),
    y = Math.floor(r / 8);
  let downstream: string | undefined,
    lake = false,
    mouth = false;
  for (let a = x - 3; a <= x + 3; a++)
    for (let b = y - 3; b <= y + 3; b++) {
      const d = watershed(seed, a, b, version);
      const candidate = d.rivers.get(id);
      if (
        candidate &&
        (!downstream ||
          elevationAt(seed, candidate, version) <
            elevationAt(seed, downstream, version))
      )
        downstream = candidate;
      lake ||= d.lakes.has(id);
      mouth ||= d.mouths.has(id);
    }
  if (version >= 3 && lake) {
    downstream = undefined;
    mouth = false;
  }
  return { downstream, lake, mouth };
}
export function geographyAt(
  seed: string,
  id: string,
  version = GEOGRAPHY_VERSION,
) {
  const elevation = elevationAt(seed, id, version),
    drainage = drainageAt(seed, id, version);
  const water =
    elevation < seaLevel(seed, version) ||
    !!drainage.downstream ||
    drainage.lake;
  return { elevation, water, ...drainage };
}
export const MAX_LAKE_TILES = 12;
const lakeCache = new Map<string, boolean>();
/** Bounded basin search on the underlying world, including unrevealed tiles.
 * Rivers are outlets, not part of a lake's area. Thirteen tiles prove a sea;
 * no unbounded ocean flood fill or dependency on expedition reveal order. */
export function isSmallLake(
  seed: string,
  id: string,
  version = GEOGRAPHY_VERSION,
): boolean {
  const cacheKey = `${seed}/${id}/${version}`;
  const known = lakeCache.get(cacheKey);
  if (known !== undefined) return known;
  const basin = (at: string) => {
    const g = geographyAt(seed, at, version);
    return g.water && !g.downstream;
  };
  if (!basin(id)) return false;
  const found = new Set([id]),
    queue = [id];
  let small = true;
  search: for (let i = 0; i < queue.length; i++) {
    for (const next of neighbors(queue[i])) {
      if (found.has(next) || !basin(next)) continue;
      found.add(next);
      queue.push(next);
      if (found.size > MAX_LAKE_TILES) {
        small = false;
        break search;
      }
    }
  }
  if (lakeCache.size > 60000) lakeCache.clear();
  for (const tile of found) lakeCache.set(`${seed}/${tile}/${version}`, small);
  return small;
}
/** Repair oversized lakes in already saved geography worlds. Preserve every
 * coordinate, roll, producer, population, project and surface state. */
export function restoreLakeSizes(world: World): void {
  const seen = new Set<string>();
  for (const tile of Object.values(world.tiles)) {
    if (seen.has(tile.id) || tile.geography?.waterway !== "lake") continue;
    const group = [tile];
    seen.add(tile.id);
    for (let i = 0; i < group.length; i++)
      for (const id of neighbors(group[i].id)) {
        const next = world.tiles[id];
        if (next?.geography?.waterway !== "lake" || seen.has(id)) continue;
        seen.add(id);
        group.push(next);
      }
    if (group.length <= MAX_LAKE_TILES) continue;
    for (const t of group) {
      t.geography!.waterway = neighbors(t.id).some((id) => {
        const next = world.tiles[id];
        return next && next.resource !== "water" && next.resource !== "ice";
      })
        ? "coast"
        : "deep";
      if (t.biome === "lake") t.biome = "water";
    }
  }
}
const COLD = new Set<Climate>([
  "cold",
  "arctic",
  "glacial",
  "alpine",
  "tundra",
]);
const HOT = new Set<Climate>([
  "semiarid",
  "tropical",
  "tropical-maritime",
  "subtropical",
  "monsoon",
  "savanna",
  "mesoamerican",
  "equatorial-wetlands",
]);
const DRY = new Set<Climate>(["desert", "hyperarid", "semiarid"]);
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
  if (gazelleHabitat(tile)) return "gazelle";
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
  gazelle: { hides: 1, meat: 2 },
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
  gazelle: "Gazelle herd",
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
/** Riparian terrain is explicitly climate-specific. Sediment alone does not
 * imply farmland or warm vegetation. These are conditional weights, not quotas. */
export const RIPARIAN_TERRAIN: Record<
  Climate,
  readonly (readonly [Biome, number])[]
> = {
  temperate: [
    ["flood-wheat", 39],
    ["clay", 17],
    ["woods", 13],
    ["flood-meadow", 11],
  ],
  cold: [
    ["barley-fields", 24],
    ["clay", 17],
    ["forest", 25],
    ["reindeer-range", 14],
  ],
  arctic: [
    ["arctic-stone", 25],
    ["snow-plain", 40],
    ["arctic-iron", 15],
  ],
  glacial: [
    ["arctic-stone", 20],
    ["snow-plain", 60],
  ],
  tundra: [
    ["peat-bog", 25],
    ["musk-ox-range", 35],
    ["tundra-heath", 5],
    ["stone", 15],
  ],
  alpine: [
    ["barley-fields", 25],
    ["mountain-quarry", 20],
    ["forest", 20],
    ["alpine-pasture", 15],
  ],
  andean: [
    ["potato-fields", 35],
    ["volcanic-quarry", 15],
    ["cloud-forest", 15],
    ["alpaca-pasture", 15],
  ],
  steppe: [
    ["flood-sorghum", 35],
    ["clay", 17],
    ["woods", 13],
    ["steppe-plain", 15],
  ],
  prairie: [
    ["maize-field", 35],
    ["clay", 17],
    ["woods", 13],
    ["steppe-plain", 15],
  ],
  mediterranean: [
    ["flood-wheat", 35],
    ["clay", 17],
    ["woods", 13],
    ["flood-meadow", 15],
  ],
  oceanic: [
    ["flood-wheat", 30],
    ["clay", 17],
    ["woods", 18],
    ["flood-meadow", 15],
  ],
  "temperate-rainforest": [
    ["old-growth-forest", 35],
    ["clay", 15],
    ["flood-meadow", 20],
    ["oat-fields", 10],
  ],
  "tropical-maritime": [
    ["river-woods", 30],
    ["breadfruit-grove", 20],
    ["flood-rice", 15],
    ["alluvial-clay", 15],
    ["jungle", 20],
  ],
  tropical: [
    ["flood-rice", 39],
    ["alluvial-clay", 17],
    ["river-woods", 24],
  ],
  subtropical: [
    ["flood-rice", 39],
    ["alluvial-clay", 17],
    ["river-woods", 24],
  ],
  monsoon: [
    ["flood-rice", 45],
    ["alluvial-clay", 17],
    ["river-woods", 18],
  ],
  "equatorial-wetlands": [
    ["sago-grove", 30],
    ["alluvial-clay", 20],
    ["river-woods", 30],
  ],
  mesoamerican: [
    ["chinampa-gardens", 35],
    ["alluvial-clay", 20],
    ["river-woods", 25],
  ],
  savanna: [
    ["flood-sorghum", 35],
    ["clay", 20],
    ["dry-woodland", 10],
    ["wildlife-grassland", 15],
  ],
  desert: [
    ["flood-wheat", 55],
    ["flood-sorghum", 25],
    ["clay", 10],
    ["oasis", 20],
  ],
  semiarid: [
    ["flood-wheat", 40],
    ["flood-sorghum", 20],
    ["clay", 15],
    ["dry-woodland", 15],
    ["goat-pasture", 10],
  ],
  hyperarid: [
    ["flood-wheat", 40],
    ["flood-sorghum", 20],
    ["clay", 15],
    ["oasis", 35],
  ],
};
/** One conditional draw, not a normal tile replaced by special geography.
 * Weights describe availability given physical conditions, not fixed map quotas. */
export function geographicLandChoices(
  seed: string,
  tile: Pick<Hex, "id" | "climate">,
  at = geographyAt(seed, tile.id),
  around = neighbors(tile.id).map((n) => ({ id: n, ...geographyAt(seed, n) })),
  version = GEOGRAPHY_VERSION,
): { choices: [Biome, number][]; floodplain: boolean; delta: boolean } {
  const climate = tile.climate ?? "temperate",
    sea = seaLevel(seed, version);
  const relative = at.elevation - sea;
  const river = around.some((n) => n.downstream || n.lake);
  const coast = around.some(
    (n) => n.water && !n.downstream && !isSmallLake(seed, n.id, version),
  );
  const slope = around.reduce(
    (max, n) => Math.max(max, Math.abs(n.elevation - at.elevation)),
    0,
  );
  const mountains =
    relative > 0.15 ||
    (["alpine", "andean"].includes(climate) && relative > 0.04);
  const floodplain = river && relative < 0.19 && slope < 0.13;
  const delta = floodplain && around.some((n) => n.mouth);
  const setting = climateSetting(seed, tile.id, version);
  const weights = new Map<Biome, number>();
  const add = (b: Biome, w: number) => {
    if (w > 0) weights.set(b, (weights.get(b) ?? 0) + w);
  };
  const riverOnly = new Set<Biome>([
    ...RIVER_ONLY,
    "flood-wheat",
    "flood-rice",
    "flood-sorghum",
    "delta-gardens",
    "flood-meadow",
  ]);
  for (const [b, original] of CLIMATE_INFO[climate].terrain) {
    if (
      (riverOnly.has(b) && !floodplain) ||
      (b === "bare-peaks" && !mountains) ||
      (b === "seal-grounds" && !coast) ||
      (b === "mangrove" && !coast) ||
      (["coastal-cliffs", "coastal-pasture"].includes(b) && !coast) ||
      (["mountain-quarry", "alpine-pasture"].includes(b) && !mountains) ||
      (b === "peat-bog" && (slope > 0.13 || setting.moisture < 0.3)) ||
      (b === "oasis" && !river && setting.moisture < 0.18) ||
      (b === "salt-flats" && !coast && setting.moisture > 0.5)
    )
      continue;
    let w = original;
    if (mountains) {
      if (BIOME_INFO[b].yield.grain || BIOME_INFO[b].yield.wool) w *= 0.3;
      if (["iron", "stone", "gold", "coal"].includes(b)) w *= 1.5;
    }
    add(b, w);
  }
  // High ridges contain minerals, impassable summits and a smaller pass share.
  if (mountains) {
    const total = [...weights.values()].reduce((a, b) => a + b, 0);
    add("bare-peaks", total * 0.32);
    add("mountain-pass", total * 0.11);
  }
  if (floodplain) {
    // Wet alluvium changes the full draw, while leaving ordinary nearby terrain possible.
    for (const [b, w] of weights) weights.set(b, w * 0.25);
    for (const [biome, weight] of RIPARIAN_TERRAIN[climate]) add(biome, weight);
    // Productive rice deltas belong only to warm rice-growing river basins.
    if (
      delta &&
      ["tropical", "tropical-maritime", "subtropical", "monsoon"].includes(
        climate,
      )
    )
      add("delta-gardens", 25);
  }
  if (!weights.size) add("stone", 1);
  return { choices: [...weights], floodplain, delta };
}

/** Shallow shelves follow the height field rather than independent tile dice.
 * Sediment extends the shelf at river mouths. Reefs require warm, shallow sea
 * away from muddy outlets; their correlated distribution follows the seabed. */
export function seaShelf(
  seed: string,
  id: string,
  climate: Climate,
  version = GEOGRAPHY_VERSION,
) {
  const at = geographyAt(seed, id, version),
    around = neighbors(id).map((n) => geographyAt(seed, n, version));
  const depth = Math.max(0, seaLevel(seed, version) - at.elevation);
  const mouth = around.some((n) => n.mouth);
  const nearLand =
    around.some((n) => !n.water) ||
    neighbors(id).some((n) =>
      neighbors(n).some((m) => !geographyAt(seed, m, version).water),
    );
  const shallow = nearLand && depth <= (mouth ? 0.065 : 0.035);
  const [q, r] = coord(id);
  return {
    depth: Math.round(depth * 1000) / 1000,
    shallow,
    reef:
      shallow &&
      !mouth &&
      HOT.has(climate) &&
      noise(seed, q, r, 4, "reef-shelf") > 0.5,
  };
}

/** Geographic constraints select from existing resource cards. River specialization
 * never creates a new fungible currency or changes vanilla construction costs. */
export function geographicTerrain(
  seed: string,
  tile: Hex,
  version = GEOGRAPHY_VERSION,
): void {
  const id = tile.id,
    climate = tile.climate ?? "temperate",
    at = geographyAt(seed, id, version),
    around = neighbors(id).map((n) => ({
      id: n,
      ...geographyAt(seed, n, version),
    }));
  const river = around.some((n) => n.downstream || n.lake),
    coast = around.some(
      (n) =>
        n.water &&
        !n.downstream &&
        (version < 2 || !isSmallLake(seed, n.id, version)),
    ),
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
      : isSmallLake(seed, id, version)
        ? "lake"
        : around.some((n) => !n.water)
          ? "coast"
          : "deep";
    geo.downstream = at.downstream;
    geo.ford =
      geo.waterway === "river" &&
      randomAt(seed, id, "ford") <
        (version < 3
          ? 0.3
          : climateSetting(seed, id, version).moisture < 0.35
            ? 0.5
            : climateSetting(seed, id, version).moisture > 0.65
              ? 0.15
              : 0.3);
    if (version >= 2 && !["river", "lake"].includes(geo.waterway)) {
      const shelf = seaShelf(seed, id, climate, version);
      geo.depth = shelf.depth;
      if (shelf.shallow) geo.waterway = shelf.reef ? "reef" : "shoal";
    } else if (
      version < 2 &&
      geo.waterway === "coast" &&
      randomAt(seed, id, "shoal") < 0.28
    )
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
    if (
      climate === "glacial" &&
      (version < 2 || !["river", "lake"].includes(geo.waterway)) &&
      randomAt(seed, id, "pack-ice") < 0.22
    )
      biome = "ice";
  } else {
    const selection = geographicLandChoices(seed, tile, at, around, version);
    geo.floodplain = selection.floodplain;
    if (geo.floodplain) {
      const bank = around.filter((n) => n.downstream || n.lake);
      const rise = bank.length
        ? at.elevation -
          bank.reduce((min, n) => Math.min(min, n.elevation), Infinity)
        : 1;
      const slope = around.reduce(
        (m, n) => Math.max(m, Math.abs(n.elevation - at.elevation)),
        0,
      );
      geo.floodThreshold = rise <= 0.025 && slope <= 0.08 ? 3 : 4;
    }
    geo.delta = selection.delta;
    let roll =
      randomAt(seed, id, "resource") *
      selection.choices.reduce((sum, [, w]) => sum + w, 0);
    biome = selection.choices.at(-1)![0];
    for (const [b, w] of selection.choices) {
      roll -= w;
      if (roll < 0) {
        biome = b;
        break;
      }
    }
    geo.pass = biome === "mountain-pass";
    if (BIOME_INFO[biome].family === "rugged" || geo.pass) {
      geo.floodplain = false;
      delete geo.floodThreshold;
      geo.delta = false;
    }
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
  if (BIOME_INFO[biome].family === "forest" && wildHabitat(tile)) {
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
export function shallowDraft(kind: ShipClass, tier = 1): boolean {
  return (
    kind === "riverboat" ||
    kind === "fishing" ||
    kind === "transport" ||
    kind === "settlership" ||
    (kind === "galley" && tier <= 2)
  );
}
export function canSail(
  tile: Hex | undefined,
  kind: ShipClass,
  tier = 1,
  tiles?: World["tiles"],
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
  if (!shallow || shallowDraft(kind, tier)) return true;
  // Flooded land remains restricted. Coastal clearance is based on permanent
  // land, never on seasonal sea ice or temporarily flooded shores.
  return (
    geo.access !== "flooded" &&
    !!tiles &&
    neighbors(tile.id).filter((id) => {
      const adjacent = tiles[id];
      return adjacent && !["water", "ice"].includes(adjacent.resource);
    }).length === 1
  );
}
export function pieceAccess(
  tile: Hex | undefined,
  u: Pick<Piece, "naval" | "kind" | "tier">,
  tiles?: World["tiles"],
): boolean {
  if (u.naval) return canSail(tile, u.kind as ShipClass, u.tier, tiles);
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

/** Separated rock faces form a useful saddle; a clump on one side does not. */
export function mountainGapChance(world: World, id: string): number {
  const ring = neighbors(id);
  const peaks = ring
    .map((n, i) => (world.tiles[n]?.resource === "peaks" ? i : -1))
    .filter((i) => i >= 0);
  let separated = 0,
    opposite = 0;
  for (let a = 0; a < peaks.length; a++)
    for (let b = a + 1; b < peaks.length; b++) {
      const gap = Math.min(peaks[b] - peaks[a], 6 - (peaks[b] - peaks[a]));
      if (gap >= 2) separated++;
      if (gap === 3) opposite++;
    }
  return separated
    ? Math.min(0.65, 0.12 + separated * 0.12 + opposite * 0.1)
    : 0;
}
/** Refine fresh stone outcrops into saddles once the neighboring peaks are known.
 * Never remove a peak, crop, town, or previously revealed resource. */
export function favorMountainGaps(
  world: World,
  seed: string,
  ids: string[],
): void {
  if ((world.geographyVersion ?? 0) < 5) return;
  for (const id of [...ids].sort()) {
    const tile = world.tiles[id];
    if (
      !tile?.geography ||
      tile.geography.floodplain ||
      tile.geography.waterway ||
      tile.geography.pass ||
      ![
        "stone",
        "arctic-stone",
        "escarpment",
        "mountain-quarry",
        "volcanic-quarry",
      ].includes(tile.biome ?? "")
    )
      continue;
    if (randomAt(seed, id, "mountain-saddle") >= mountainGapChance(world, id))
      continue;
    tile.biome = "mountain-pass";
    tile.resource = "stone";
    tile.geography.pass = true;
  }
}

/** A pass is a saddle through a real range, never an isolated seasonal obstacle.
 * Keep legal units and all player structures in place when repairing old maps. */
export function restoreMountainPasses(
  world: World,
  ids = Object.keys(world.tiles),
): void {
  const repairing = new Set(ids);
  const isPass = (tile: Hex | undefined) =>
    tile?.biome === "mountain-pass" || !!tile?.geography?.pass;
  // Existing passes win over expedition additions; whole-map repairs are stable.
  const retained = new Set(
    Object.values(world.tiles)
      .filter((tile) => !repairing.has(tile.id) && isPass(tile))
      .map((tile) => tile.id),
  );
  for (const id of [...ids].sort(
    (a, b) =>
      mountainGapChance(world, b) - mountainGapChance(world, a) ||
      a.localeCompare(b),
  )) {
    const tile = world.tiles[id];
    if (tile?.biome !== "mountain-pass" && !tile?.geography?.pass) continue;
    if (
      neighbors(id).filter((n) => world.tiles[n]?.resource === "peaks")
        .length >= 2 &&
      !neighbors(id).some((n) => retained.has(n))
    ) {
      retained.add(id);
      continue;
    }
    const biome: Biome = ["arctic", "glacial", "tundra"].includes(
      tile.climate ?? "",
    )
      ? "arctic-stone"
      : ["alpine", "andean"].includes(tile.climate ?? "")
        ? "mountain-quarry"
        : tile.climate === "mediterranean"
          ? "escarpment"
          : "stone";
    const geography = tile.geography ? { ...tile.geography } : undefined;
    if (geography) {
      delete geography.pass;
      if (geography.access === "closed") delete geography.access;
    }
    world.tiles[id] = {
      ...tile,
      biome,
      resource: BIOME_INFO[biome].resource,
      geography,
    };
  }
}

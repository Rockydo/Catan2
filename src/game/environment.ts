import { specialistEcology } from "./infrastructure-services";
import { specialistRefuge } from "./infrastructure";
import type { Game, Hex, Stock } from "./types";
import { randomAt, neighbors, canOccupy, distance } from "./world";
import {
  seasonAt,
  seasonHalf,
  seasonYear,
  SEASONS,
  type Season,
} from "./seasons";
import { BIOME_INFO, type Climate } from "./climate-content";
import {
  canSail,
  habitatKind,
  gazelleHabitat,
  wildHabitat,
  WILDLIFE_GOODS,
  type Weather,
  type Wildlife,
  type WildlifeKind,
} from "./geography";

export const WEATHER_NAMES: Record<Weather, string> = {
  normal: "Seasonal conditions",
  wet: "Wet season",
  dry: "Dry spell",
  cold: "Cold spell",
  mild: "Mild season",
};
const tropical = new Set<Climate>([
  "tropical",
  "tropical-maritime",
  "subtropical",
  "savanna",
  "monsoon",
  "mesoamerican",
  "equatorial-wetlands",
]);
const warmWildlife = new Set<Climate>([...tropical, "semiarid"]);
const cold = new Set<Climate>([
  "cold",
  "arctic",
  "glacial",
  "alpine",
  "tundra",
  "prairie",
]);
/** Baseline water level, spring through winter. Weather changes a whole region,
 * not independent tile rolls. Flood peaks follow snowmelt or local wet seasons. */
export function waterCalendar(climate: Climate): readonly number[] {
  if (climate === "glacial") return [1, 3, 1, 0];
  if (climate === "semiarid") return [1, 0, 1, 2];
  if (climate === "equatorial-wetlands") return [2, 3, 2, 2];
  if (
    ["tropical", "tropical-maritime", "subtropical", "mesoamerican"].includes(
      climate,
    )
  )
    return [1, 2, 2, 1];
  if (tropical.has(climate)) return [1, 3, 2, 0];
  if (["desert", "hyperarid"].includes(climate)) return [1, 0, 1, 1];
  if (climate === "mediterranean") return [1, 0, 1, 3];
  if (climate === "andean") return [2, 3, 1, 0];
  if (cold.has(climate)) return [3, 2, 1, 0];
  if (["oceanic", "temperate-rainforest"].includes(climate))
    return [2, 1, 2, 3];
  if (climate === "steppe") return [2, 1, 1, 0];
  return [2, 1, 1, 2];
}
export function weatherChoices(
  climate: Climate,
  season: Season,
): [Weather, number][] {
  if (climate === "tropical-maritime")
    return season === "summer" || season === "autumn"
      ? [
          ["normal", 0.55],
          ["wet", 0.35],
          ["dry", 0.1],
        ]
      : [
          ["normal", 0.65],
          ["wet", 0.15],
          ["dry", 0.2],
        ];
  if (climate === "semiarid")
    return season === "winter"
      ? [
          ["normal", 0.5],
          ["wet", 0.35],
          ["dry", 0.15],
        ]
      : season === "summer"
        ? [
            ["normal", 0.5],
            ["dry", 0.45],
            ["wet", 0.05],
          ]
        : [
            ["normal", 0.55],
            ["dry", 0.3],
            ["wet", 0.15],
          ];
  if (tropical.has(climate))
    return [
      ["normal", 0.55],
      ["wet", 0.3],
      ["dry", 0.15],
    ];
  if (["desert", "hyperarid"].includes(climate))
    return [
      ["normal", 0.6],
      ["dry", 0.3],
      ["wet", 0.1],
    ];
  if (cold.has(climate) && season !== "summer")
    return [
      ["normal", 0.5],
      ["cold", 0.3],
      ["mild", 0.2],
    ];
  return [
    ["normal", 0.55],
    ["wet", 0.2],
    ["dry", 0.15],
    ["mild", 0.1],
  ];
}
export function regionalWeather(s: Game, tile: Hex): Weather {
  const season = seasonAt(s) ?? "spring",
    climate = tile.climate ?? "temperate";
  let roll = randomAt(
    s.seed,
    tile.geography!.region,
    `regional-weather-${seasonYear(s)}-${season}`,
  );
  for (const [weather, chance] of weatherChoices(climate, season)) {
    roll -= chance;
    if (roll < 0) return weather;
  }
  return "normal";
}
export function waterLevelModifier(
  tile: Hex,
  season: Season,
  weather: Weather,
): number {
  if (weather === "wet") {
    // Rare downpours in arid catchments are sudden spates, not snowmelt.
    if (["desert", "hyperarid"].includes(tile.climate ?? "")) return 3;
    if (
      [
        "semiarid",
        "temperate",
        "tropical",
        "tropical-maritime",
        "subtropical",
        "mesoamerican",
      ].includes(tile.climate ?? "")
    )
      return 2;
    return 1;
  }
  if (weather === "dry") return -1;
  if (
    ["arctic", "glacial", "tundra"].includes(tile.climate ?? "") &&
    ["spring", "summer"].includes(season)
  )
    return weather === "cold" ? -1 : weather === "mild" ? 1 : 0;
  return 0;
}
export function riverLevel(
  tile: Hex,
  season: Season,
  weather: Weather = tile.geography?.weather ?? "normal",
) {
  return Math.max(
    0,
    Math.min(
      4,
      waterCalendar(tile.climate ?? "temperate")[SEASONS.indexOf(season)] +
        waterLevelModifier(tile, season, weather),
    ),
  );
}
/** High water reaches only the lowest basins; raised banks need a flood crest. */
export const floodThreshold = (tile: Hex): 3 | 4 =>
  tile.geography?.floodThreshold ?? 4;
export function floodsAt(
  tile: Hex,
  season: Season,
  weather: Weather = tile.geography?.weather ?? "normal",
): boolean {
  return (
    !!tile.geography?.floodplain &&
    // Cold continental/highland winter stores water as snow and ice. Do not
    // turn dormant fields into floodwater, including imported weather states.
    !(
      season === "winter" &&
      [
        "steppe",
        "prairie",
        "cold",
        "alpine",
        "andean",
        "arctic",
        "glacial",
        "tundra",
      ].includes(tile.climate ?? "")
    ) &&
    (!tile.biome || BIOME_INFO[tile.biome].family !== "rugged") &&
    !tile.geography.projects?.levee &&
    riverLevel(tile, season, weather) >= floodThreshold(tile)
  );
}
/** Apply the balance correction without rolling weather, moving units, or changing the calendar. */
export function restoreFloodplainAccess(s: Game): void {
  if (!s.geographyVersion) return;
  const season = seasonAt(s) ?? "spring";
  for (const tile of Object.values(s.tiles)) {
    const g = tile.geography;
    if (!g?.floodplain || g.pass || g.ford) continue;
    if (tile.biome && BIOME_INFO[tile.biome].family === "rugged") {
      g.floodplain = false;
      delete g.floodThreshold;
      g.delta = false;
    }
    g.access = floodsAt(tile, season) ? "flooded" : "normal";
  }
}

export function passClosed(
  tile: Hex,
  season: Season,
  weather: Weather = tile.geography?.weather ?? "normal",
) {
  if (!tile.geography?.pass) return false;
  if (tile.climate === "andean" || tropical.has(tile.climate ?? "temperate"))
    return season === "summer" && weather === "wet";
  if (
    ["desert", "hyperarid", "semiarid", "mediterranean"].includes(
      tile.climate ?? "",
    )
  )
    return season === "winter" && weather === "wet";
  if (["glacial", "arctic"].includes(tile.climate ?? ""))
    return season !== "summer";
  return (
    season === "winter" ||
    (weather === "cold" && (season === "spring" || season === "autumn"))
  );
}
export function environmentRisk(tile: Hex, season: Season): number {
  if (!tile.geography) return 0;
  return weatherChoices(tile.climate ?? "temperate", season).reduce(
    (sum, [weather, p]) =>
      sum +
      p *
        Number(
          !!(
            passClosed(tile, season, weather) ||
            floodsAt(tile, season, weather) ||
            (tile.geography!.ford &&
              !tile.geography!.projects?.bridge &&
              riverLevel(tile, season, weather) > 1)
          ),
        ),
    0,
  );
}
const marine = (kind: WildlifeKind) => ["fish", "cod", "whale"].includes(kind);
export function suitableWildlifeHabitat(tile: Hex, kind: WildlifeKind) {
  if (!tile.geography) return false;
  if (marine(kind))
    return (
      tile.resource === "water" &&
      (!["whale", "cod"].includes(kind) ||
        !["river", "lake"].includes(tile.geography.waterway ?? "")) &&
      (kind !== "cod" ||
        [
          "cold",
          "arctic",
          "glacial",
          "tundra",
          "oceanic",
          "temperate",
          "temperate-rainforest",
        ].includes(tile.climate ?? ""))
    );
  if (
    tile.resource === "water" ||
    tile.resource === "ice" ||
    tile.resource === "peaks" ||
    tile.geography.pass ||
    !wildHabitat(tile)
  )
    return false;
  if (kind === "gazelle") return gazelleHabitat(tile);
  if (gazelleHabitat(tile)) return false;
  if (kind === "turkey")
    return (
      ["mesoamerican", "prairie"].includes(tile.climate ?? "") &&
      wildHabitat(tile)
    );
  if (kind === "seal")
    return (
      BIOME_INFO[tile.biome!].family !== "forest" &&
      !!tile.geography.coastal &&
      ["arctic", "glacial", "tundra"].includes(tile.climate ?? "")
    );
  if (kind === "jungle-game" && !warmWildlife.has(tile.climate ?? "temperate"))
    return false;
  if (
    (kind === "bison" || kind === "musk-ox") &&
    BIOME_INFO[tile.biome!].family === "forest"
  )
    return false;
  if (
    kind === "deer" &&
    (warmWildlife.has(tile.climate ?? "temperate") ||
      ["arctic", "glacial", "tundra"].includes(tile.climate ?? ""))
  )
    return false;
  if (
    kind === "bison" &&
    ![
      "steppe",
      "prairie",
      "temperate",
      "mediterranean",
      "savanna",
      "semiarid",
    ].includes(tile.climate ?? "")
  )
    return false;
  if (kind === "reindeer" || kind === "musk-ox")
    return (
      tile.climate !== "prairie" &&
      cold.has(tile.climate ?? "temperate") &&
      wildHabitat(tile)
    );
  return wildHabitat(tile);
}
/** Species are selected from the habitat, not the historical resource tile name. */
export function nativeWildlifeKind(
  seed: string,
  tile: Hex,
): WildlifeKind | undefined {
  if (tile.resource === "water") return habitatKind(tile);
  const choices = (Object.keys(WILDLIFE_GOODS) as WildlifeKind[])
    .filter((kind) => !marine(kind) && suitableWildlifeHabitat(tile, kind))
    .map((kind) => ({
      kind,
      weight:
        kind === "seal"
          ? 4
          : kind === "musk-ox" || kind === "reindeer"
            ? 3
            : kind === habitatKind(tile)
              ? 3
              : 1,
    }));
  let roll =
    randomAt(seed, tile.id, "land-wildlife-species") *
    choices.reduce((sum, c) => sum + c.weight, 0);
  return choices.find((c) => (roll -= c.weight) < 0)?.kind;
}
/** Ocean area is 75% of the previous target; compensate per-water-hex density.
 * Freshwater populations are unchanged. */
export function wildlifeSpawnChance(tile: Hex, geographyVersion = 0): number {
  if (gazelleHabitat(tile)) {
    if (tile.biome === "oasis") return 0.35;
    if (tile.biome === "desert")
      return tile.climate === "hyperarid" ? 0.04 : 0.08;
  }
  if (tile.resource !== "water") return 0.22;
  const freshwater = ["river", "lake"].includes(tile.geography?.waterway ?? "");
  return (
    (tile.geography?.waterway === "deep" ? 0.11 : 0.18) *
    (geographyVersion >= 3 && !freshwater ? 4 / 3 : 1) *
    (tile.climate === "tropical-maritime" && !freshwater ? 1.15 : 1)
  );
}
/** A preference, not a teleport: migration still walks at most three land tiles.
 * Drought concentrates herds around water without creating extra animals. */
export function gazelleHabitatWeight(
  s: Pick<Game, "tiles">,
  tile: Hex,
): number {
  const dry = tile.geography?.weather === "dry";
  if (tile.biome === "oasis") return dry ? 12 : 8;
  if (neighbors(tile.id).some((id) => s.tiles[id]?.biome === "oasis"))
    return dry ? 6 : 4;
  return tile.biome === "desert" ? 0.7 : 1.5;
}

function nearSolidLand(s: Game, id: string): boolean {
  const nearby = new Set(neighbors(id));
  for (const next of [...nearby])
    for (const other of neighbors(next)) nearby.add(other);
  return [...nearby].some((next) => {
    const t = s.tiles[next];
    return t && t.resource !== "water" && t.resource !== "ice";
  });
}
function development(s: Game) {
  const result = new Map<string, number>();
  const add = (id: string, n: number) => {
    result.set(id, (result.get(id) ?? 0) + n);
    for (const next of neighbors(id))
      if (s.tiles[next]) result.set(next, (result.get(next) ?? 0) + n * 0.4);
  };
  for (const town of Object.values(s.towns))
    for (const id of s.vertices[town.vertex].tiles) add(id, town.level * 2);
  for (const tower of Object.values(s.towers))
    for (const id of s.vertices[tower.vertex].tiles) add(id, tower.tier);
  for (const route of Object.values(s.routes))
    for (const id of s.edges[route.edge].tiles)
      add(id, 1 + (route.camps[id] ?? 0) * 2);
  return result;
}
export function migrationCandidates(s: Game, population: Wildlife) {
  const found = new Set([population.tile]),
    queue = [{ id: population.tile, depth: 0 }],
    max = marine(population.kind) ? 4 : 3;
  for (let i = 0; i < queue.length; i++) {
    const { id, depth } = queue[i];
    if (depth >= max) continue;
    for (const next of neighbors(id)) {
      const tile = s.tiles[next];
      if (found.has(next) || !tile) continue;
      const traverse = marine(population.kind)
        ? tile.resource === "water" &&
          (!["whale", "cod"].includes(population.kind) ||
            !["river", "lake"].includes(tile.geography?.waterway ?? ""))
        : ["water", "ice"].includes(tile.resource)
          ? tile.surface === "frozen" && nearSolidLand(s, tile.id)
          : canOccupy(tile);
      if (!traverse) continue;
      found.add(next);
      queue.push({ id: next, depth: depth + 1 });
    }
  }
  return [...found].filter((id) =>
    suitableWildlifeHabitat(s.tiles[id], population.kind),
  );
}
/** One-time repair of herds on formerly over-broad habitats. Keep IDs and
 * populations, and never reroll weather or advance the season during loading.
 * A population with no suitable revealed habitat waits dormant until one exists. */
export function restoreWildlifeHabitats(s: Game): void {
  if (!s.geographyVersion || !s.wildlife) return;
  const known = new Set(s.wildlife.map((h) => h.id));
  let added = false;
  for (const tile of Object.values(s.tiles)) {
    if (
      !tile.geography ||
      !gazelleHabitat(tile) ||
      tile.geography.gazelleSurveyed
    )
      continue;
    tile.geography.gazelleSurveyed = true;
    const id = `wild:${tile.id}`;
    if (
      !known.has(id) &&
      randomAt(s.seed, tile.id, "wildlife-density") < wildlifeSpawnChance(tile)
    ) {
      s.wildlife.push({
        id,
        kind: "gazelle",
        tile: tile.id,
        lastRound: s.round,
      });
      known.add(id);
      added = true;
    }
  }
  const invalid = s.wildlife.filter(
    (h) => h.dormant || !suitableWildlifeHabitat(s.tiles[h.tile], h.kind),
  );
  if (!invalid.length && !added) return;
  const choices = new Map<WildlifeKind, string[]>();
  for (const herd of invalid) {
    let candidates = choices.get(herd.kind);
    if (!candidates) {
      candidates = Object.values(s.tiles)
        .filter((t) => suitableWildlifeHabitat(t, herd.kind))
        .map((t) => t.id);
      choices.set(herd.kind, candidates);
    }
    let best: string | undefined,
      nearest = Infinity;
    for (const id of candidates) {
      const d = distance(herd.tile, id);
      if (d < nearest || (d === nearest && id < best!)) {
        best = id;
        nearest = d;
      }
    }
    if (best) {
      herd.tile = best;
      delete herd.dormant;
    } else herd.dormant = true;
  }
  for (const tile of Object.values(s.tiles))
    if (tile.geography) {
      tile.geography.fauna = {};
      tile.geography.animals = [];
    }
  for (const herd of s.wildlife) {
    if (herd.dormant) continue;
    const g = s.tiles[herd.tile].geography!;
    g.animals!.push(herd.kind);
    for (const [raw, n] of Object.entries(WILDLIFE_GOODS[herd.kind]))
      g.fauna![raw as keyof Stock] = (g.fauna![raw as keyof Stock] ?? 0) + n!;
  }
}

/** Newly forming ice triggers a short escape even in a late half-season.
 * Choose the nearest reachable open water, with seed-stable ties. Marine
 * populations stay under ice only if that search finds no open refuge. */
export function escapeFormingIce(s: Game): void {
  for (const herd of s.wildlife ?? []) {
    if (
      herd.dormant ||
      !marine(herd.kind) ||
      s.tiles[herd.tile]?.surface !== "frozen"
    )
      continue;
    const candidates = migrationCandidates(s, herd).filter(
      (id) => s.tiles[id].surface !== "frozen",
    );
    candidates.sort(
      (a, b) =>
        distance(herd.tile, a) - distance(herd.tile, b) ||
        randomAt(s.seed, herd.id, `ice-refuge-${s.round}-${a}`) -
          randomAt(s.seed, herd.id, `ice-refuge-${s.round}-${b}`),
    );
    if (candidates.length) {
      herd.tile = candidates[0];
      herd.lastRound = s.round;
    }
  }
}

/** Population is conserved. Hunting affects receipts, never animal counts.
 * Migration uses a bounded local search once per season, independent of armies. */
export function syncEnvironment(s: Game): void {
  if (!s.geographyVersion) return;
  const season = seasonAt(s) ?? "spring",
    advance = s.environmentRound !== s.round;
  const known = new Set((s.wildlife ?? []).map((w) => w.id));
  s.wildlife ??= [];
  for (const tile of Object.values(s.tiles)) {
    const geo = tile.geography;
    if (!geo) continue;
    if (geo.nextHarvestMode && geo.harvestChosenYear !== seasonYear(s)) {
      geo.harvestMode = geo.nextHarvestMode;
      delete geo.nextHarvestMode;
    }
    geo.weather = regionalWeather(s, tile);
    geo.weatherSeason = season;
    geo.access = passClosed(tile, season)
      ? "closed"
      : floodsAt(tile, season)
        ? "flooded"
        : geo.ford && riverLevel(tile, season) <= 1
          ? "ford"
          : "normal";
    // A spring-fed pool does not freeze, but neighboring ordinary sea still can.
    geo.warmed =
      !!tile.surface &&
      !(tile.resource === "ice" && tile.climate === "glacial") &&
      neighbors(tile.id).some(
        (id) => s.tiles[id]?.geography?.landmark === "thermal-spring",
      );
    if (geo.warmed) tile.surface = "open";
    geo.fauna = {};
    geo.animals = [];
    if (geo.damagedUntil !== undefined && geo.damagedUntil <= s.round)
      delete geo.damagedUntil;
    const id = `wild:${tile.id}`;
    const firstGazelleSurvey = gazelleHabitat(tile) && !geo.gazelleSurveyed;
    if (gazelleHabitat(tile)) geo.gazelleSurveyed = true;
    if (
      known.has(id) ||
      (s.environmentRound !== undefined &&
        !geo.newlyRevealed &&
        !firstGazelleSurvey)
    )
      continue;
    let kind = nativeWildlifeKind(s.seed, tile);
    const chance = wildlifeSpawnChance(tile, s.geographyVersion);
    if (
      kind &&
      suitableWildlifeHabitat(tile, kind) &&
      randomAt(s.seed, tile.id, "wildlife-density") < chance
    ) {
      if (
        tile.resource === "water" &&
        !["river", "lake"].includes(geo.waterway ?? "")
      ) {
        const whaleChance = geo.waterway === "deep" ? 0.72 : 0.22;
        if (randomAt(s.seed, tile.id, "wildlife-species") < whaleChance)
          kind = "whale";
        else if (
          [
            "cold",
            "arctic",
            "glacial",
            "tundra",
            "oceanic",
            "temperate",
            "temperate-rainforest",
          ].includes(tile.climate ?? "")
        )
          kind =
            randomAt(s.seed, tile.id, "cod-species") <
            (cold.has(tile.climate ?? "temperate") ? 0.7 : 0.35)
              ? "cod"
              : "fish";
      }
      s.wildlife.push({ id, kind, tile: tile.id, lastRound: s.round });
      known.add(id);
    }
    delete geo.newlyRevealed;
  }
  restoreWildlifeHabitats(s);
  escapeFormingIce(s);
  if (advance && seasonHalf(s) === "early") {
    const ecology = specialistEcology(s.tiles);
    const developed = development(s),
      crowding = new Map<string, number>(),
      refuges = new Map<string, number>();
    for (const herd of s.wildlife) {
      if (herd.dormant) continue;
      if (herd.lastRound === s.round) continue;
      let candidates = migrationCandidates(s, herd);
      if (marine(herd.kind)) {
        const open = candidates.filter(
          (id) => s.tiles[id].surface !== "frozen",
        );
        if (open.length) candidates = open;
      }
      const weights = candidates.map((id) => {
        const tile = s.tiles[id],
          g = tile.geography!;
        let refuge = refuges.get(id);
        if (refuge === undefined) {
          refuge = Math.max(
            specialistRefuge(tile),
            ecology.margins.get(id) ?? 0,
          );
          refuges.set(id, refuge);
        }
        let weight =
          1 /
          (1 +
            (developed.get(id) ?? 0) *
              0.22 *
              (marine(herd.kind) ? 1 : 1 - refuge)) /
          (1 + (crowding.get(id) ?? 0) * 1.5);
        if (
          tile.surface === "frozen" ||
          (g.access === "flooded" && !marine(herd.kind))
        )
          weight *= 0.2;
        if (herd.kind === "fish" || herd.kind === "cod")
          weight *= 1 + (ecology.nurseries.get(id) ?? 0);
        if (herd.kind === "gazelle") weight *= gazelleHabitatWeight(s, tile);
        if (g.waterway === "river" && herd.kind === "fish") weight *= 1.8;
        if (season === "summer" && g.elevation > 0.6 && !marine(herd.kind))
          weight *= 1.4;
        if (season === "winter" && BIOME_INFO[tile.biome!].family === "forest")
          weight *= 1.8;
        if (id === herd.tile) weight *= 0.55;
        return Math.max(0.005, weight);
      });
      let roll =
        randomAt(s.seed, herd.id, `migration-${s.round}`) *
        weights.reduce((a, b) => a + b, 0);
      for (let i = 0; i < candidates.length; i++) {
        roll -= weights[i];
        if (roll < 0) {
          herd.tile = candidates[i];
          break;
        }
      }
      herd.lastRound = s.round;
      crowding.set(herd.tile, (crowding.get(herd.tile) ?? 0) + 1);
    }
  }
  for (const tile of Object.values(s.tiles))
    if (tile.geography) {
      tile.geography.fauna = {};
      tile.geography.animals = [];
    }
  for (const herd of s.wildlife) {
    const geo = s.tiles[herd.tile]?.geography;
    if (!geo || herd.dormant) continue;
    geo.animals!.push(herd.kind);
    for (const [raw, n] of Object.entries(WILDLIFE_GOODS[herd.kind]))
      geo.fauna![raw as keyof Stock] =
        (geo.fauna![raw as keyof Stock] ?? 0) + n!;
  }
  s.environmentRound = s.round;
}
export function environmentSummary(tile: Hex, tiles?: Game["tiles"]): string[] {
  const g = tile.geography;
  if (!g) return [];
  return [
    WEATHER_NAMES[g.weather ?? "normal"],
    g.waterway === "river" && canSail(tile, "carrack", 1, tiles)
      ? "River: all ship classes (one adjacent land tile)"
      : "",
    g.waterway === "shoal"
      ? canSail(tile, "carrack", 1, tiles)
        ? "Coastal shelf: all ship classes (one adjacent land tile)"
        : "Coastal shelf: shallow-draft vessels only"
      : g.waterway === "reef"
        ? canSail(tile, "carrack", 1, tiles)
          ? "Coral reef: all ship classes (one adjacent land tile)"
          : "Coral reef: shallow-draft vessels only"
        : g.waterway === "lake"
          ? "Lake: all vessel classes when ice-free"
          : ["coast", "deep"].includes(g.waterway ?? "")
            ? "Navigable sea: all vessel classes when ice-free"
            : "",
    g.access === "flooded"
      ? "Flooded: shallow vessels only"
      : g.access === "closed"
        ? "Pass closed"
        : g.projects?.bridge
          ? "Bridge crossing open"
          : g.waterway === "river" && tile.surface === "frozen"
            ? "Frozen river: land crossing open"
            : g.access === "ford"
              ? "Low water: ford open"
              : g.ford
                ? "High water: ford closed"
                : g.waterway === "river"
                  ? "River: land crossing requires a ford, ice or bridge"
                  : "",
  ].filter(Boolean);
}

import type { Game, Hex, Stock } from "./types";
import { randomAt, neighbors, canOccupy } from "./world";
import {
  seasonAt,
  seasonHalf,
  seasonYear,
  SEASONS,
  type Season,
} from "./seasons";
import { BIOME_INFO, type Climate } from "./climate-content";
import {
  habitatKind,
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
  "subtropical",
  "savanna",
  "monsoon",
  "mesoamerican",
  "equatorial-wetlands",
]);
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
  if (tropical.has(climate)) return [1, 3, 2, 0];
  if (["desert", "hyperarid"].includes(climate)) return [0, 0, 0, 1];
  if (climate === "mediterranean") return [1, 0, 1, 3];
  if (climate === "andean") return [2, 3, 1, 0];
  if (cold.has(climate)) return [3, 2, 1, 0];
  if (["oceanic", "temperate-rainforest"].includes(climate))
    return [2, 1, 2, 3];
  return [3, 1, 1, 2];
}
export function weatherChoices(
  climate: Climate,
  season: Season,
): [Weather, number][] {
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
        (weather === "wet" ? 1 : weather === "dry" ? -1 : 0),
    ),
  );
}
export function passClosed(
  tile: Hex,
  season: Season,
  weather: Weather = tile.geography?.weather ?? "normal",
) {
  if (!tile.geography?.pass) return false;
  if (tile.climate === "andean" || tropical.has(tile.climate ?? "temperate"))
    return season === "summer" && weather === "wet";
  if (["desert", "hyperarid", "mediterranean"].includes(tile.climate ?? ""))
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
            (tile.geography!.floodplain &&
              !tile.geography!.projects?.levee &&
              riverLevel(tile, season, weather) >= 3) ||
            (tile.geography!.ford &&
              !tile.geography!.projects?.bridge &&
              riverLevel(tile, season, weather) > 1)
          ),
        ),
    0,
  );
}
const marine = (kind: WildlifeKind) => ["fish", "cod", "whale"].includes(kind);
function suitable(tile: Hex, kind: WildlifeKind) {
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
    tile.geography.pass
  )
    return false;
  if (kind === "turkey")
    return (
      ["mesoamerican", "prairie"].includes(tile.climate ?? "") &&
      wildHabitat(tile)
    );
  if (kind === "seal")
    return (
      !!tile.geography.coastal &&
      ["arctic", "glacial", "tundra"].includes(tile.climate ?? "")
    );
  if (kind === "jungle-game" && !tropical.has(tile.climate ?? "temperate"))
    return false;
  if (
    kind === "bison" &&
    !["steppe", "prairie", "temperate", "mediterranean", "savanna"].includes(
      tile.climate ?? "",
    )
  )
    return false;
  if (kind === "reindeer" || kind === "musk-ox")
    return cold.has(tile.climate ?? "temperate") && wildHabitat(tile);
  return wildHabitat(tile);
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
function migrationCandidates(s: Game, population: Wildlife) {
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
        : canOccupy(tile) && tile.resource !== "water";
      if (!traverse) continue;
      found.add(next);
      queue.push({ id: next, depth: depth + 1 });
    }
  }
  return [...found].filter((id) => suitable(s.tiles[id], population.kind));
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
    geo.access = passClosed(tile, season)
      ? "closed"
      : geo.floodplain && !geo.projects?.levee && riverLevel(tile, season) >= 3
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
    if (
      known.has(id) ||
      (s.environmentRound !== undefined && !geo.newlyRevealed)
    )
      continue;
    let kind = habitatKind(tile);
    const chance =
      tile.resource === "water"
        ? geo.waterway === "deep"
          ? 0.11
          : 0.18
        : 0.13;
    if (kind && randomAt(s.seed, tile.id, "wildlife-density") < chance) {
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
  if (advance && seasonHalf(s) === "early") {
    const developed = development(s),
      crowding = new Map<string, number>();
    for (const herd of s.wildlife) {
      if (herd.lastRound === s.round) continue;
      const candidates = migrationCandidates(s, herd);
      const weights = candidates.map((id) => {
        const tile = s.tiles[id],
          g = tile.geography!;
        let weight =
          1 /
          (1 + (developed.get(id) ?? 0) * 0.22) /
          (1 + (crowding.get(id) ?? 0) * 1.5);
        if (
          tile.surface === "frozen" ||
          (g.access === "flooded" && !marine(herd.kind))
        )
          weight *= 0.2;
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
  for (const herd of s.wildlife) {
    const geo = s.tiles[herd.tile]?.geography;
    if (!geo) continue;
    geo.animals!.push(herd.kind);
    for (const [raw, n] of Object.entries(WILDLIFE_GOODS[herd.kind]))
      geo.fauna![raw as keyof Stock] =
        (geo.fauna![raw as keyof Stock] ?? 0) + n!;
  }
  s.environmentRound = s.round;
}
export function environmentSummary(tile: Hex): string[] {
  const g = tile.geography;
  if (!g) return [];
  return [
    WEATHER_NAMES[g.weather ?? "normal"],
    g.access === "flooded"
      ? "Flooded: shallow vessels only"
      : g.access === "closed"
        ? "Pass closed"
        : g.access === "ford"
          ? "Low water: ford open"
          : g.waterway === "river"
            ? "River: land crossing requires a ford, ice or bridge"
            : "",
    g.projects?.bridge ? "Bridge crossing open" : "",
  ].filter(Boolean);
}

import type { Game, Hex, Raw, Stock } from "./types";
import { tileYield } from "./maritime";
import { randomAt } from "./world";

export const SEASONS = ["spring", "summer", "autumn", "winter"] as const;
export type Season = (typeof SEASONS)[number];
export type SeasonHalf = "early" | "late";
type Year = [number, number, number, number];

/** Legacy frost thresholds, retained for existing local harvest schedules. */
export const SHOULDER_ICE_CHANCE = {
  glacial: { spring: 1, autumn: 1 },
  arctic: { spring: 0.7, autumn: 0.5 },
  tundra: { spring: 0.45, autumn: 0.3 },
  alpine: { spring: 0.35, autumn: 0.25 },
  cold: { spring: 0.2, autumn: 0.1 },
  prairie: { spring: 0.1, autumn: 0.1 },
} as const;

export function seasonAt(
  s: Pick<Game, "calendar" | "round">,
): Season | undefined {
  if (!s.calendar || s.round < s.calendar.startRound) return undefined;
  const offset = SEASONS.indexOf(s.calendar.startSeason ?? "spring");
  return SEASONS[
    (Math.floor(
      (s.round - s.calendar.startRound) / (s.calendar.roundsPerSeason ?? 1),
    ) +
      offset) %
      4
  ];
}
export function seasonHalf(s: Pick<Game, "calendar" | "round">): SeasonHalf {
  return s.calendar?.roundsPerSeason === 2 &&
    (s.round - s.calendar.startRound) % 2 === 1
    ? "late"
    : "early";
}
export function seasonYear(s: Pick<Game, "calendar" | "round">): number {
  return s.calendar
    ? (s.calendar.startYear ?? 1) +
        Math.max(
          0,
          Math.floor(
            (s.round - s.calendar.startRound) /
              (4 * (s.calendar.roundsPerSeason ?? 1)),
          ),
        )
    : 1;
}
export function seasonLabel(s: Pick<Game, "calendar" | "round">): string {
  const season = seasonAt(s);
  if (!season) return "Spring next round";
  const name = season[0].toUpperCase() + season.slice(1);
  return s.calendar?.roundsPerSeason === 2
    ? `${seasonHalf(s) === "early" ? "Early" : "Late"} ${name}`
    : name;
}

type IceOdds = readonly [freeze: number, melt: number];
type IceYear = readonly [
  IceOdds,
  IceOdds,
  IceOdds,
  IceOdds,
  IceOdds,
  IceOdds,
  IceOdds,
  IceOdds,
];
/** On entry to each half-season: chance for open water to freeze / ice to melt.
 * Summer guarantees a full thaw by its late half, except permanent pack ice. */
export const ICE_TRANSITIONS = {
  tundra: [
    [0, 0.45],
    [0, 0.85],
    [0, 1],
    [0, 1],
    [0.15, 0],
    [0.35, 0],
    [0.8, 0],
    [1, 0],
  ],
  glacial: [
    [0.25, 0.05],
    [0.1, 0.15],
    [0, 0.7],
    [0, 1],
    [0.6, 0],
    [0.9, 0],
    [1, 0],
    [1, 0],
  ],
  arctic: [
    [0, 0.25],
    [0, 0.7],
    [0, 1],
    [0, 1],
    [0.25, 0],
    [0.55, 0],
    [0.9, 0],
    [1, 0],
  ],
  alpine: [
    [0, 0.6],
    [0, 0.8],
    [0, 1],
    [0, 1],
    [0.1, 0],
    [0.25, 0],
    [0.75, 0],
    [1, 0],
  ],
  cold: [
    [0, 0.7],
    [0, 0.9],
    [0, 1],
    [0, 1],
    [0.05, 0],
    [0.15, 0],
    [0.6, 0],
    [1, 0],
  ],
  prairie: [
    [0, 0.8],
    [0, 0.95],
    [0, 1],
    [0, 1],
    [0.05, 0],
    [0.1, 0],
    [0.45, 0],
    [0.9, 0],
  ],
} as const satisfies Record<string, IceYear>;
const ARCTIC_PACK: IceYear = [
  [0, 0.1],
  [0, 0.3],
  [0, 0.75],
  [0, 1],
  [0.7, 0],
  [1, 0],
  [1, 0],
  [1, 0],
];
export function iceOdds(tile: Hex, season: Season, half: SeasonHalf): IceOdds {
  if (tile.resource === "ice" && tile.climate === "glacial") return [1, 0];
  const table =
    tile.resource === "ice"
      ? ARCTIC_PACK
      : ICE_TRANSITIONS[tile.climate as keyof typeof ICE_TRANSITIONS];
  return (
    table?.[SEASONS.indexOf(season) * 2 + Number(half === "late")] ?? [0, 1]
  );
}
/** Public risk only. AI forecasts never inspect the weather seed or future draws. */
export function iceRisk(
  s: Pick<Game, "calendar" | "round">,
  tile: Hex,
  round = s.round + 1,
): number {
  if (!["water", "ice"].includes(tile.resource)) return 0;
  if (s.calendar?.iceModel !== 2)
    return Number(frozenInSeason(tile, seasonAt({ ...s, round })));
  let risk = Number(tile.surface === "frozen");
  for (let r = s.round + 1; r <= round; r++) {
    const at = { calendar: s.calendar, round: r },
      season = seasonAt(at);
    if (!season) continue;
    const [freeze, melt] = iceOdds(tile, season, seasonHalf(at));
    risk = risk * (1 - melt) + (1 - risk) * freeze;
  }
  return risk;
}
function resolveWeather(s: Game, tile: Hex) {
  const current = seasonAt(s);
  if (!current) return;
  if (tile.iceWeather?.round === s.round) return;
  // Reconstruct newly discovered tiles from the last guaranteed Summer reset.
  // This is at most eight cheap hash draws, even in a very old campaign.
  let first = tile.iceWeather ? tile.iceWeather.round + 1 : s.round - 7;
  first = Math.max(first, s.round - 7, s.calendar!.startRound);
  if (!tile.iceWeather || tile.iceWeather.round < s.round - 8) {
    tile.surface = "open";
    for (let r = s.round; r >= first; r--) {
      const at = { calendar: s.calendar, round: r };
      if (seasonAt(at) === "summer" && seasonHalf(at) === "late") {
        first = r;
        break;
      }
    }
    // Initial Winter/Spring starts inherit winter ice before local thaw rolls.
    if (
      !["summer", "autumn"].includes(
        seasonAt({ calendar: s.calendar, round: first })!,
      )
    )
      tile.surface =
        tile.resource === "ice" || tile.climate! in ICE_TRANSITIONS
          ? "frozen"
          : "open";
  }
  for (let round = first; round <= s.round; round++) {
    const at = { calendar: s.calendar, round },
      season = seasonAt(at)!;
    const [freeze, melt] = iceOdds(tile, season, seasonHalf(at));
    const iced = tile.surface === "frozen";
    const chance = iced ? melt : freeze;
    if (randomAt(s.seed, tile.id, `ice-weather-${round}`) < chance)
      tile.surface = iced ? "open" : "frozen";
  }
  tile.iceWeather = { round: s.round, season: current, half: seasonHalf(s) };
}

/** Exact integer schedules. Each resource independently sums to four times
 * its printed yield; dice odds and producer multipliers are unchanged. */
function schedule(tile: Hex, raw: Raw, base: number): Year {
  const biome = tile.biome,
    climate = tile.climate ?? "temperate";
  const frost = [
    "cold",
    "arctic",
    "alpine",
    "glacial",
    "prairie",
    "tundra",
  ].includes(climate);
  const dry = ["desert", "hyperarid"].includes(climate);
  const rainy = [
    "tropical",
    "subtropical",
    "savanna",
    "monsoon",
    "mesoamerican",
    "equatorial-wetlands",
  ].includes(climate);
  const hot = dry || rainy;
  const times = (weights: Year): Year => weights.map((n) => n * base) as Year;
  const wetSummer = Math.max(1, base - 1),
    dryPeak = 2 * base - wetSummer;
  const wetDry: Year = [base, wetSummer, base, dryPeak];
  // Regional schedules conserve each resource independently. Peat is dried
  // during the local drier season; tropical sago can be cut throughout the year.
  if (biome === "tundra-heath") return times([0, 2, 2, 0]);
  if (biome === "musk-ox-range")
    return times(raw === "wool" ? [1, 3, 0, 0] : [1, 1, 1, 1]);
  if (biome === "peat-bog")
    return times(climate === "tundra" ? [0, 2, 2, 0] : [1, 1, 1, 1]);
  if (biome === "old-growth-forest") return [3, 4, 3, 2];
  if (
    biome === "fern-hunting-grounds" ||
    biome === "mangrove" ||
    biome === "sago-grove"
  )
    return times([1, 1, 1, 1]);
  if (biome === "cloud-forest" || biome === "volcanic-quarry")
    return times([1, 1, 1, 1]);
  if (biome === "alpaca-pasture")
    return times(raw === "wool" ? [4, 0, 0, 0] : [1, 0, 2, 1]);
  if (biome === "bison-range") return times([1, 0, 2, 1]);
  if (biome === "sunflower-fields") return times([0, 0, 4, 0]);
  // Woods let a faction switch products. Identical calendars prevent switching
  // between forestry and hunting from manufacturing extra annual output.
  if (biome === "woods") return times(hot ? [1, 1, 1, 1] : [1, 1, 2, 0]);
  if (biome === "reindeer-range" || biome === "seal-grounds")
    return times([1, 1, 1, 1]);
  if (
    climate === "glacial" &&
    (tile.resource === "water" ||
      ["ore", "stone", "gold", "coal", "salt", "brick"].includes(raw))
  )
    return times([0, 4, 0, 0]);
  if (biome === "cattle-savanna") return times([1, 0, 2, 1]);
  if (raw === "grain") {
    if (biome === "chinampa-gardens") return [4, 4, 4, 0];
    if (biome === "rice-field") {
      const harvests =
        climate === "monsoon" ? 1 : climate === "tropical" ? 3 : 2;
      const amount = (base * 4) / harvests;
      return climate === "monsoon"
        ? [0, 0, amount, 0]
        : climate === "tropical"
          ? [amount, amount, amount, 0]
          : [0, amount, amount, 0];
    }
    if (biome === "chernozem-wheat") return times([0, 4, 0, 0]);
    if (biome === "olive-grove") return times([0, 0, 2, 2]);
    if (biome === "oasis") return times([0, 0, 4, 0]);
    if (biome === "golden-fields")
      return times(climate === "oceanic" ? [0, 0, 4, 0] : [0, 4, 0, 0]);
    if (biome === "maize-field" || biome === "sorghum-fields")
      return times([0, 0, 4, 0]);
    if (biome === "oat-fields") return times([0, 3, 1, 0]);
    if (biome === "millet-fields") return times([0, 0, 4, 0]);
    if (biome === "barley-fields")
      return times(
        climate === "alpine" || climate === "cold"
          ? [0, 0, 4, 0]
          : [0, 4, 0, 0],
      );
    // Early varieties provide a small Summer crop; maincrop lifting peaks in Autumn.
    if (biome === "potato-fields" || biome === "turnip-fields")
      return times([0, 1, 3, 0]);
    return times([0, 0, 4, 0]);
  }
  if (raw === "meat") {
    if (biome === "cattle-pasture" || biome === "turkey-grounds")
      return [1, 1, 4, 2];
    return times([1, 0, 2, 1]);
  }
  if (raw === "wool") return times(hot ? [1, 1, 1, 1] : [2, 2, 0, 0]);
  if (raw === "fish")
    return times(
      hot || climate === "mediterranean" || climate === "temperate-rainforest"
        ? [1, 1, 1, 1]
        : [1, 2, 1, 0],
    );
  if (biome === "whale" || (!biome && tile.whale))
    return times(frost ? [1, 2, 1, 0] : [0, 1, 2, 1]);
  // Warm-climate hunting and logging continue through the rains. Whole-card
  // base-one yields stay steady; richer terrain can retain a dry-season peak.
  if (raw === "hides")
    return hot ? [base, wetSummer, dryPeak, base] : times([1, 0, 1, 2]);
  if (raw === "lumber") {
    if (hot) return dry ? times([1, 1, 1, 1]) : wetDry;
    return base === 2 ? [2, 2, 3, 1] : [1, 1, 2, 0];
  }
  if (raw === "salt") {
    if (dry) return times([1, 1, 1, 1]);
    // Solar evaporation pauses during the shared tropical wet season.
    return times(rainy ? [1, 0, 1, 2] : [1, 2, 1, 0]);
  }
  if (raw === "coal" || raw === "oil") return times([1, 1, 1, 1]);
  if (frost) return times([1, 2, 1, 0]);
  // Covered mines and quarries in mild climates provide a stable alternative
  // to risky agriculture. Clay extraction can continue during tropical rains.
  if (
    raw === "brick" &&
    [
      "tropical",
      "subtropical",
      "monsoon",
      "mesoamerican",
      "equatorial-wetlands",
    ].includes(climate)
  )
    return wetDry;
  return times([1, 1, 1, 1]);
}

export function seasonalProfile(
  tile: Hex,
  owner?: number,
): Record<Season, Stock> {
  const result: Record<Season, Stock> = {
    spring: {},
    summer: {},
    autumn: {},
    winter: {},
  };
  // Keep the established per-tile harvest calendar separate from weather.
  // Early/late ice changes access, never the amounts printed for a season.
  const harvestTile = tile.iceWeather
    ? { ...tile, iceWeather: undefined }
    : tile;
  for (const [raw, base] of Object.entries(tileYield(tile, owner))) {
    const amounts = schedule(tile, raw as Raw, base!);
    if (tile.resource === "water")
      for (const i of [0, 2] as const)
        if (frozenInSeason(harvestTile, SEASONS[i])) {
          amounts[1] += amounts[i];
          amounts[i] = 0;
        }
    SEASONS.forEach((season, i) => {
      if (amounts[i]) result[season][raw as Raw] = amounts[i];
    });
  }
  return result;
}
export function seasonalYield(
  tile: Hex,
  owner: number | undefined,
  season?: Season,
): Stock {
  if (season && tile.iceWeather?.season === season && tile.surface === "frozen")
    return {};
  return season ? seasonalProfile(tile, owner)[season] : tileYield(tile, owner);
}
/** Woods workshops keep their chosen product, independently of the raw choice. */
export function seasonalWorkshopBase(
  tile: Hex,
  owner: number,
  raw: Raw,
  season?: Season,
): number {
  const output =
    tile.biome === "woods" && (raw === "lumber" || raw === "hides")
      ? { ...tile, woodsChoices: { ...tile.woodsChoices, [owner]: raw } }
      : tile;
  return seasonalYield(output, owner, season)[raw] ?? 0;
}

export function frozenInSeason(tile: Hex, season?: Season): boolean {
  if (season && tile.iceWeather?.season === season)
    return tile.surface === "frozen";
  if (!season) return tile.resource === "ice";
  if (tile.resource === "ice")
    return tile.climate === "glacial" || season !== "summer";
  if (tile.resource !== "water") return false;
  const climate = tile.climate ?? "temperate";
  if (!(climate in SHOULDER_ICE_CHANCE)) return false;
  if (season === "winter") return true;
  if (season === "summer" || tile.thawGrace === season) return false;
  const chance =
    SHOULDER_ICE_CHANCE[climate as keyof typeof SHOULDER_ICE_CHANCE][season];
  return (
    chance === 1 || (tile.freezeRoll !== undefined && tile.freezeRoll < chance)
  );
}
export function seasonWeather(tile: Hex, season: Season): string {
  if (frozenInSeason(tile, season)) return "Frozen sea";
  const climate = tile.climate ?? "temperate";
  if (climate === "tundra")
    return season === "spring"
      ? "Spring thaw"
      : season === "summer"
        ? "Brief tundra summer"
        : season === "autumn"
          ? "Early snow"
          : "Snow cover";
  if (climate === "temperate-rainforest")
    return season === "summer" ? "Mild coastal summer" : "Coastal rains";
  if (climate === "equatorial-wetlands")
    return season === "summer"
      ? "High water"
      : season === "winter"
        ? "Lower water"
        : "Humid wetlands";
  if (climate === "glacial")
    return tile.resource === "water"
      ? "Brief summer opening"
      : "Permanent snow";
  if (climate === "hyperarid")
    return season === "summer" ? "Extreme drought" : "Persistent drought";
  if (climate === "andean")
    return season === "winter"
      ? "Cool dry season"
      : season === "autumn"
        ? "Dry season"
        : season === "spring"
          ? "Early rains"
          : "Wet season";
  if (climate === "monsoon")
    return season === "spring"
      ? "Monsoon onset"
      : season === "summer"
        ? "Monsoon rains"
        : season === "autumn"
          ? "Retreating rains"
          : "Dry season";
  if (
    climate === "arctic" &&
    tile.resource !== "water" &&
    tile.resource !== "ice"
  )
    return season === "spring"
      ? "Lingering snow"
      : season === "autumn"
        ? "Early snow"
        : season === "summer"
          ? "Summer thaw"
          : "Snow cover";
  if (["tropical", "subtropical", "savanna", "mesoamerican"].includes(climate))
    return season === "spring"
      ? "Early rains"
      : season === "summer"
        ? "Wet season"
        : season === "autumn"
          ? "Dry season"
          : "Cool dry season";
  if (climate === "desert")
    return season === "summer"
      ? "Summer drought"
      : season === "winter"
        ? "Cool desert"
        : "Dry season";
  if (climate === "mediterranean")
    return season === "summer"
      ? "Summer drought"
      : season === "winter"
        ? "Winter rains"
        : season === "spring"
          ? "Spring growth"
          : "Autumn rains";
  if (season === "winter")
    return climate === "oceanic" ? "Winter rains" : "Snow cover";
  if (season === "spring")
    return ["cold", "arctic", "alpine", "prairie"].includes(climate)
      ? "Spring thaw"
      : "Spring growth";
  return season === "summer"
    ? climate === "arctic"
      ? "Summer thaw"
      : "Summer growth"
    : "Autumn cooling";
}

/** Called only at round boundaries, after discovery and during save migration.
 * No RNG draw, resource change, unit loss or forced teleportation. */
export function syncSeasonSurfaces(s: Game): void {
  if (!s.calendar) return;
  const season = seasonAt(s);
  for (const tile of Object.values(s.tiles)) {
    if (tile.resource !== "water" && tile.resource !== "ice") continue;
    if (s.calendar.iceModel === 2) {
      if (
        tile.resource === "water" &&
        tile.climate &&
        tile.climate in SHOULDER_ICE_CHANCE
      )
        tile.freezeRoll ??= randomAt(s.seed, tile.id, "season-freeze");
      if (season && tile.thawGrace && tile.thawGrace !== season)
        delete tile.thawGrace;
      resolveWeather(s, tile);
      continue;
    }
    delete tile.iceWeather;
    if (
      s.calendar.iceModel === 1 &&
      tile.resource === "water" &&
      tile.climate &&
      tile.climate in SHOULDER_ICE_CHANCE
    )
      tile.freezeRoll ??= randomAt(s.seed, tile.id, "season-freeze");
    if (!season) continue;
    if (tile.thawGrace !== undefined && tile.thawGrace !== season)
      delete tile.thawGrace;
    tile.surface = frozenInSeason(tile, season) ? "frozen" : "open";
  }
  if (!season) return;
  for (const unit of Object.values(s.pieces)) {
    delete unit.seasonStatus;
    if (unit.carrier) continue;
    const tile = s.tiles[unit.tile];
    if (unit.naval && tile.surface === "frozen") unit.seasonStatus = "icebound";
    if (
      !unit.naval &&
      tile.surface === "open" &&
      ["water", "ice"].includes(tile.resource)
    )
      unit.seasonStatus = "adrift";
  }
}

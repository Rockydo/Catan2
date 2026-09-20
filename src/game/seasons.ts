import type { Game, Hex, Raw, Stock } from "./types";
import { tileYield } from "./maritime";

export const SEASONS = ["spring", "summer", "autumn", "winter"] as const;
export type Season = (typeof SEASONS)[number];
type Year = [number, number, number, number];

export function seasonAt(
  s: Pick<Game, "calendar" | "round">,
): Season | undefined {
  if (!s.calendar || s.round < s.calendar.startRound) return undefined;
  const offset = SEASONS.indexOf(s.calendar.startSeason ?? "spring");
  return SEASONS[(s.round - s.calendar.startRound + offset) % 4];
}
export function seasonYear(s: Pick<Game, "calendar" | "round">): number {
  return s.calendar
    ? Math.max(1, Math.floor((s.round - s.calendar.startRound) / 4) + 1)
    : 1;
}

/** Exact integer schedules. Each resource independently sums to four times
 * its printed yield; dice odds and producer multipliers are unchanged. */
function schedule(tile: Hex, raw: Raw, base: number): Year {
  const biome = tile.biome,
    climate = tile.climate ?? "temperate";
  const frost = ["cold", "arctic", "alpine"].includes(climate);
  const hot = ["tropical", "subtropical", "savanna", "desert"].includes(
    climate,
  );
  const times = (weights: Year): Year => weights.map((n) => n * base) as Year;
  // Woods let a faction switch products. Identical calendars prevent switching
  // between forestry and hunting from manufacturing extra annual output.
  if (biome === "woods") return times([1, 1, 2, 0]);
  if (biome === "reindeer-range" || biome === "cattle-savanna")
    return times([1, 0, 2, 1]);
  if (raw === "grain") {
    if (biome === "rice-field")
      return climate === "tropical" ? [4, 4, 4, 0] : [0, 6, 6, 0];
    if (biome === "olive-grove") return times([0, 0, 2, 2]);
    if (biome === "oasis") return times([0, 0, 4, 0]);
    if (biome === "golden-fields")
      return times(climate === "oceanic" ? [0, 0, 4, 0] : [0, 4, 0, 0]);
    if (biome === "maize-field") return times([0, 0, 4, 0]);
    if (biome === "millet-fields") return times([0, 0, 4, 0]);
    if (biome === "barley-fields")
      return times(
        climate === "alpine" || climate === "cold"
          ? [0, 0, 4, 0]
          : [0, 4, 0, 0],
      );
    if (biome === "rye-fields") return times([0, 4, 0, 0]);
    return times([0, 0, 4, 0]);
  }
  if (raw === "meat") {
    if (biome === "cattle-pasture") return [1, 1, 4, 2];
    return times([1, 0, 2, 1]);
  }
  if (raw === "wool") return times(hot ? [1, 1, 1, 1] : [2, 2, 0, 0]);
  if (raw === "fish")
    return times(
      hot || climate === "mediterranean" ? [1, 1, 1, 1] : [1, 2, 1, 0],
    );
  if (biome === "whale" || (!biome && tile.whale))
    return times(frost ? [1, 2, 1, 0] : [0, 1, 2, 1]);
  if (biome === "seal-grounds") return times([2, 0, 1, 1]);
  if (raw === "hides") return times(hot ? [1, 0, 2, 1] : [1, 0, 1, 2]);
  if (raw === "lumber") {
    if (hot) return times(climate === "desert" ? [1, 1, 1, 1] : [1, 0, 1, 2]);
    return base === 2 ? [2, 2, 3, 1] : [1, 1, 2, 0];
  }
  if (raw === "salt")
    return times(
      ["tropical", "subtropical"].includes(climate)
        ? [1, 0, 1, 2]
        : [1, 2, 1, 0],
    );
  if (raw === "coal" || raw === "oil") return times([1, 1, 1, 1]);
  if (frost) return times([1, 2, 1, 0]);
  // Covered mines and quarries in mild climates provide a stable alternative
  // to risky agriculture. Tropical clay is worked in the drier half of the year.
  if (raw === "brick" && ["tropical", "subtropical"].includes(climate))
    return times([1, 0, 1, 2]);
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
  for (const [raw, base] of Object.entries(tileYield(tile, owner))) {
    const amounts = schedule(tile, raw as Raw, base!);
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
  if (!season) return tile.resource === "ice";
  if (tile.resource === "ice") return season !== "summer";
  return (
    tile.resource === "water" &&
    season === "winter" &&
    ["cold", "arctic", "alpine"].includes(tile.climate ?? "temperate")
  );
}
export function seasonWeather(tile: Hex, season: Season): string {
  if (frozenInSeason(tile, season)) return "Frozen sea";
  const climate = tile.climate ?? "temperate";
  if (["tropical", "subtropical", "savanna"].includes(climate))
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
    return ["cold", "arctic", "alpine"].includes(climate)
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
  if (!season) return;
  for (const tile of Object.values(s.tiles)) {
    if (tile.resource !== "water" && tile.resource !== "ice") continue;
    tile.surface = frozenInSeason(tile, season) ? "frozen" : "open";
  }
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

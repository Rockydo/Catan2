import {
  infrastructureProtection,
  huntingYield,
  isCrop,
  installedRotation,
  rotationExtras,
  specialistUtilityExtras,
  specialistRecovery,
  specialistPantryCapacity,
} from "./infrastructure";
import type { Hex, Raw, Stock } from "./types";
import { ordinarySeasonalProfile, type Season } from "./seasons";
import type { Biome } from "./climate-content";
import type { Weather } from "./geography";

const warm = new Set([
  "tropical",
  "tropical-maritime",
  "subtropical",
  "monsoon",
  "savanna",
  "mesoamerican",
  "equatorial-wetlands",
]);
const cool = new Set([
  "cold",
  "arctic",
  "glacial",
  "tundra",
  "alpine",
  "prairie",
  "andean",
]);
const thirsty = new Set([
  "rice-field",
  "flood-rice",
  "delta-gardens",
  "potato-fields",
  "chinampa-gardens",
  "sago-grove",
]);
const resilient = new Set([
  "millet-fields",
  "sorghum-fields",
  "flood-sorghum",
  "olive-grove",
]);
/** Directions follow FAO crop-water sensitivity, IRRI cold damage, grass growth
 * and forestry/salt evaporation guidance. Percentages are game balance values,
 * not claimed field measurements. See docs/weather-evidence.md. */
function nativeWeatherFactor(
  tile: Hex,
  raw: Raw,
  season: Season,
  weather: Weather,
): number {
  const climate = tile.climate ?? "temperate",
    biome = tile.biome ?? "";
  if (["ore", "coal", "gold", "stone", "brick"].includes(raw)) {
    if (weather === "wet")
      return biome === "peat-bog" ? 0.5 : raw === "stone" ? 0.9 : 0.75;
    if (weather === "cold" && cool.has(climate)) return 0.75;
    if (weather === "dry" && biome === "peat-bog") return 1.25;
    return 1;
  }
  if (raw === "salt")
    return weather === "wet"
      ? 0.5
      : weather === "dry"
        ? 1.5
        : weather === "cold"
          ? 0.75
          : 1;
  if (raw === "lumber")
    return weather === "wet" || (weather === "cold" && cool.has(climate))
      ? 0.75
      : 1;
  if (raw === "grain" || (raw === "oil" && isCrop(tile))) {
    if (weather === "dry") {
      const factor = resilient.has(biome) ? 1 : thirsty.has(biome) ? 0.5 : 0.75;
      return factor;
    }
    if (weather === "cold")
      return warm.has(climate) || thirsty.has(biome) ? 0.5 : 0.75;
    if (weather === "wet") {
      if (biome === "breadfruit-grove") return 1;
      if (
        [
          "rice-field",
          "flood-rice",
          "delta-gardens",
          "sago-grove",
          "chinampa-gardens",
        ].includes(biome)
      )
        return 1.25;
      if (
        ["desert", "hyperarid", "semiarid", "steppe", "savanna"].includes(
          climate,
        )
      )
        return 1.25;
      return 0.75;
    }
    if (
      weather === "mild" &&
      cool.has(climate) &&
      (season === "spring" || season === "autumn")
    )
      return 1.25;
  }
  if (["wool", "meat", "hides"].includes(raw)) {
    if (weather === "dry" || weather === "cold") {
      return 0.75;
    }
    if (
      weather === "wet" &&
      [
        "desert",
        "hyperarid",
        "semiarid",
        "steppe",
        "savanna",
        "mediterranean",
      ].includes(climate)
    )
      return 1.25;
    if (
      weather === "mild" &&
      cool.has(climate) &&
      (season === "spring" || season === "autumn")
    )
      return 1.25;
  }
  return 1;
}
/** Primary protection plus diminishing specialist protection, capped below immunity. */
export function weatherYieldFactor(
  tile: Hex,
  raw: Raw,
  season: Season,
  weather: Weather,
  owner?: number,
): number {
  const base = nativeWeatherFactor(tile, raw, season, weather);
  if (base >= 1 || !["dry", "wet", "cold"].includes(weather)) return base;
  return (
    base +
    (1 - base) *
      infrastructureProtection(
        tile,
        raw,
        weather as "dry" | "wet" | "cold",
        owner,
      )
  );
}
export function weatherAdjustedYield(
  tile: Hex,
  stock: Stock,
  season: Season,
  owner?: number,
): Stock {
  const weather = tile.geography?.weather;
  if (
    !weather ||
    weather === "normal" ||
    (tile.geography?.weatherSeason && tile.geography.weatherSeason !== season)
  )
    return stock;
  const output: Stock = {};
  const recovery = specialistRecovery(tile, weather, owner);
  const stored = specialistPantryCapacity(tile, owner)
    ? (specialistUtilityExtras(
        tile,
        ordinarySeasonalProfile(tile, owner),
        owner,
      ).pantry[season].grain ?? 0)
    : 0;
  const recoverable: Stock = {};
  const game = huntingYield(tile, owner, season);
  const rotation = installedRotation(tile, owner);
  const secondary =
    rotation && rotation.rotation!.seasons.includes(season)
      ? (rotationExtras(tile, ordinarySeasonalProfile(tile, owner), owner)[
          season
        ].grain ?? 0)
      : 0;
  for (const [good, amount] of Object.entries(stock)) {
    const raw = good as Raw,
      wildlife = Math.min(
        amount!,
        game[raw] ?? tile.geography?.fauna?.[raw] ?? 0,
      );
    const rotationAmount =
      raw === "grain" ? Math.min(amount! - wildlife, secondary) : 0;
    const preserved =
      raw === "grain"
        ? Math.min(stored, amount! - wildlife - rotationAmount)
        : 0;
    const base = amount! - wildlife - rotationAmount - preserved;
    // Wild animals react by migration. Weather does not multiply herd size.
    const adjusted = Math.round(
      base * weatherYieldFactor(tile, raw, season, weather, owner),
    );
    output[raw] =
      wildlife +
      preserved +
      (rotationAmount && rotation
        ? Math.round(
            rotationAmount *
              nativeWeatherFactor(
                { ...tile, biome: rotation.rotation!.secondaryBiome as Biome },
                raw,
                season,
                weather,
              ),
          )
        : 0) +
      (raw === "lumber" && base > 0 ? Math.max(1, adjusted) : adjusted);
    // Preserve only cards actually lost to this weather; never add fair-weather
    // yield or amplify wild animals and stored/secondary food.
    recoverable[raw] = Math.min(
      recovery.caps[raw] ?? 0,
      Math.max(
        0,
        base -
          (raw === "lumber" && base > 0 ? Math.max(1, adjusted) : adjusted),
      ),
    );
  }
  let left = recovery.budget;
  for (const [raw, n] of Object.entries(recoverable)) {
    const kept = Math.min(left, n!);
    if (kept) output[raw as Raw] = (output[raw as Raw] ?? 0) + kept;
    left -= kept;
  }
  return output;
}

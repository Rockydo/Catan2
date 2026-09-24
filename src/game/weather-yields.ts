import type { Hex, Raw, Stock } from "./types";
import type { Season } from "./seasons";
import type { Weather } from "./geography";

const warm = new Set([
  "tropical",
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
export function weatherYieldFactor(
  tile: Hex,
  raw: Raw,
  season: Season,
  weather: Weather,
): number {
  const climate = tile.climate ?? "temperate",
    biome = tile.biome ?? "";
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
  if (raw === "grain") {
    if (weather === "dry") {
      const factor = resilient.has(biome) ? 1 : thirsty.has(biome) ? 0.5 : 0.75;
      return tile.geography?.projects?.irrigation ? (1 + factor) / 2 : factor;
    }
    if (weather === "cold")
      return warm.has(climate) || thirsty.has(biome) ? 0.5 : 0.75;
    if (weather === "wet") {
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
    if (weather === "dry" || weather === "cold") return 0.75;
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
export function weatherAdjustedYield(
  tile: Hex,
  stock: Stock,
  season: Season,
): Stock {
  const weather = tile.geography?.weather;
  if (
    !weather ||
    weather === "normal" ||
    (tile.geography?.weatherSeason && tile.geography.weatherSeason !== season)
  )
    return stock;
  const output: Stock = {};
  for (const [good, amount] of Object.entries(stock)) {
    const raw = good as Raw,
      wildlife = Math.min(amount!, tile.geography?.fauna?.[raw] ?? 0);
    const base = amount! - wildlife;
    // Wild animals react by migration. Weather does not multiply herd size.
    const adjusted = Math.round(
      base * weatherYieldFactor(tile, raw, season, weather),
    );
    output[raw] =
      wildlife +
      (raw === "lumber" && base > 0 ? Math.max(1, adjusted) : adjusted);
  }
  return output;
}

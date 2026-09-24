import { regionalClimateFields } from "./climate-fields";
import { regionalLandform, type PhysicalLandform } from "./physical-landforms";
import { elevationAt, seaLevel } from "./geography";
import { coord, key, randomAt, DIRS } from "./world";
import type { Climate } from "./climate-content";

export interface ClimateSetting {
  temperature: number;
  moisture: number;
  altitude: number;
  maritime: number;
  landform?: PhysicalLandform;
}
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const cache = new Map<string, ClimateSetting>();
/** Fixed physical fields precede climate labels. Upwind relief dries leeward
 * country; nearby seas moderate temperature and supply moisture. No revealed
 * map edges are treated as coast, and querying an expedition changes nothing. */
export function climateSetting(
  seed: string,
  id: string,
  version = 3,
): ClimateSetting {
  const ck = `${seed}/${id}/${version}`,
    cached = cache.get(ck);
  if (cached) return cached;
  const [q, r] = coord(id),
    sea = seaLevel(seed, version),
    height = elevationAt(seed, id, version);
  const altitude = clamp((height - sea) / 0.27);
  let seaDistance = height < sea ? 0 : 7;
  for (const [dq, dr] of DIRS)
    for (let step = 1; step <= 6; step++) {
      if (elevationAt(seed, key(q + dq * step, r + dr * step), version) < sea) {
        seaDistance = Math.min(seaDistance, step);
        break;
      }
    }
  const maritime = clamp(1 - seaDistance / 7);
  const [wq, wr] =
    DIRS[Math.floor(randomAt(seed, "world", "prevailing-wind") * 6)];
  let upwind = height;
  for (let n = 1; n <= 5; n++)
    upwind = Math.max(
      upwind,
      elevationAt(seed, key(q + wq * n, r + wr * n), version),
    );
  const shadow = clamp((upwind - height) / 0.22);
  const windward = clamp(
    (height - elevationAt(seed, key(q + wq * 3, r + wr * 3), version)) / 0.18,
  );
  const potential = regionalClimateFields(seed, id),
    thermal = potential.temperature;
  const result = {
    temperature: clamp(
      thermal * (1 - maritime * 0.16) + 0.5 * maritime * 0.16 - altitude * 0.22,
    ),
    moisture: clamp(
      potential.moisture * 0.72 +
        maritime * 0.18 +
        windward * 0.18 -
        shadow * 0.28,
    ),
    altitude,
    maritime,
    ...(version >= 3 ? { landform: regionalLandform(seed, id, version) } : {}),
  };
  if (cache.size >= 60000) cache.clear();
  cache.set(ck, result);
  return result;
}
// Temperature/moisture niches are deliberately broad, not hard latitude bands.
// Compatibility still supplies transitions; resource abundance is not guaranteed.
const niches: Record<Climate, readonly [number, number]> = {
  temperate: [0.5, 0.52],
  cold: [0.25, 0.53],
  arctic: [0.1, 0.37],
  steppe: [0.48, 0.25],
  mediterranean: [0.66, 0.34],
  tropical: [0.88, 0.76],
  "tropical-maritime": [0.83, 0.65],
  desert: [0.75, 0.13],
  semiarid: [0.74, 0.26],
  oceanic: [0.48, 0.7],
  alpine: [0.24, 0.5],
  subtropical: [0.73, 0.61],
  savanna: [0.85, 0.35],
  glacial: [0.01, 0.32],
  hyperarid: [0.85, 0.02],
  monsoon: [0.86, 0.62],
  andean: [0.47, 0.35],
  prairie: [0.48, 0.37],
  mesoamerican: [0.75, 0.66],
  tundra: [0.17, 0.4],
  "temperate-rainforest": [0.42, 0.85],
  "equatorial-wetlands": [0.91, 0.91],
};
export function geographicClimateWeight(
  setting: ClimateSetting,
  climate: Climate,
): number {
  const [temperature, moisture] = niches[climate];
  const mismatch =
    ((setting.temperature - temperature) / 0.24) ** 2 +
    ((setting.moisture - moisture) / 0.28) ** 2;
  let weight = 0.015 + Math.exp(-mismatch / 2);
  if (climate === "alpine" || climate === "andean")
    weight *= 0.04 + setting.altitude ** 2 * 5;
  if (climate === "oceanic" || climate === "temperate-rainforest")
    weight *= 0.15 + setting.maritime * 1.7;
  if (climate === "equatorial-wetlands") weight *= 1.4 - setting.altitude;
  if (climate === "steppe" || climate === "prairie")
    weight *= 1.5 - setting.maritime * 0.65;
  if (climate === "semiarid") weight *= 1.3 - setting.maritime * 0.4;
  if (setting.landform) {
    const islands = [
      "island-chains",
      "archipelago",
      "skerries",
      "atolls",
      "volcanic-arcs",
    ].includes(setting.landform);
    if (climate === "mediterranean")
      weight *= islands ? 3 : setting.landform === "peninsulas" ? 2 : 1;
    if (climate === "steppe" || climate === "prairie")
      weight *= islands
        ? 0.18
        : [
              "continent",
              "rift-valleys",
              "basin-ranges",
              "dissected-plateaus",
              "great-river-basins",
              "cuesta-belts",
              "badlands",
            ].includes(setting.landform)
          ? 2.5
          : 1;
    if (climate === "oceanic" || climate === "cold")
      weight *=
        setting.landform === "fjords" || setting.landform === "skerries"
          ? 1.7
          : 1;
  }
  if (
    setting.landform === "drowned-valleys" &&
    ["oceanic", "temperate", "temperate-rainforest"].includes(climate)
  )
    weight *= 1.5;
  if (
    setting.landform === "basin-ranges" &&
    ["semiarid", "desert", "steppe"].includes(climate)
  )
    weight *= 1.5;
  if (climate === "tropical-maritime") {
    const island = [
      "atolls",
      "archipelago",
      "island-chains",
      "volcanic-arcs",
      "barrier-coasts",
    ].includes(setting.landform ?? "");
    weight *=
      (0.02 + setting.maritime ** 3 * 2.5) *
      (island ? 3 : 0.25) *
      (1 - setting.altitude * 0.7);
  }
  if (
    setting.landform === "lake-districts" &&
    ["cold", "tundra", "temperate"].includes(climate)
  )
    weight *= 1.5;
  if (
    setting.landform === "badlands" &&
    ["semiarid", "steppe", "prairie", "desert"].includes(climate)
  )
    weight *= 1.5;
  return weight;
}

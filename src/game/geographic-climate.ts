import { elevationAt, seaLevel } from "./geography";
import { coord, key, randomAt, DIRS } from "./world";
import type { Climate } from "./climate-content";

export interface ClimateSetting {
  temperature: number;
  moisture: number;
  altitude: number;
  maritime: number;
}
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const cache = new Map<string, ClimateSetting>();
function field(seed: string, q: number, r: number, stream: string) {
  const scale = 11,
    x = q / scale,
    y = r / scale;
  const a = Math.floor(x),
    b = Math.floor(y);
  const smooth = (n: number) => n * n * (3 - 2 * n);
  const u = smooth(x - a),
    v = smooth(y - b);
  const at = (i: number, j: number) => randomAt(seed, key(i, j), stream);
  // Expand the interpolated middle to retain cold and hot regions, without
  // making a finite latitude band incompatible with unlimited expeditions.
  return clamp(
    ((at(a, b) * (1 - u) + at(a + 1, b) * u) * (1 - v) +
      (at(a, b + 1) * (1 - u) + at(a + 1, b + 1) * u) * v -
      0.5) *
      1.6 +
      0.5,
  );
}
/** Fixed physical fields precede climate labels. Upwind relief dries leeward
 * country; nearby seas moderate temperature and supply moisture. No revealed
 * map edges are treated as coast, and querying an expedition changes nothing. */
export function climateSetting(seed: string, id: string): ClimateSetting {
  const ck = `${seed}/${id}`,
    cached = cache.get(ck);
  if (cached) return cached;
  const [q, r] = coord(id),
    sea = seaLevel(seed),
    height = elevationAt(seed, id);
  const altitude = clamp((height - sea) / 0.27);
  let seaDistance = height < sea ? 0 : 7;
  for (const [dq, dr] of DIRS)
    for (let step = 1; step <= 6; step++) {
      if (elevationAt(seed, key(q + dq * step, r + dr * step)) < sea) {
        seaDistance = Math.min(seaDistance, step);
        break;
      }
    }
  const maritime = clamp(1 - seaDistance / 7);
  const [wq, wr] =
    DIRS[Math.floor(randomAt(seed, "world", "prevailing-wind") * 6)];
  let upwind = height;
  for (let n = 1; n <= 5; n++)
    upwind = Math.max(upwind, elevationAt(seed, key(q + wq * n, r + wr * n)));
  const shadow = clamp((upwind - height) / 0.22);
  const windward = clamp(
    (height - elevationAt(seed, key(q + wq * 3, r + wr * 3))) / 0.18,
  );
  const thermal = field(seed, q, r, "regional-temperature");
  const result = {
    temperature: clamp(
      thermal * (1 - maritime * 0.16) + 0.5 * maritime * 0.16 - altitude * 0.22,
    ),
    moisture: clamp(
      field(seed, q, r, "regional-moisture") * 0.72 +
        maritime * 0.18 +
        windward * 0.18 -
        shadow * 0.28,
    ),
    altitude,
    maritime,
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
  desert: [0.75, 0.13],
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
  return weight;
}

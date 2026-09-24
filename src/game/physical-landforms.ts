import { coord, key, randomAt } from "./world";
import {
  physicalField as field,
  regionalClimateFields,
} from "./climate-fields";
export const LANDFORMS = [
  "continent",
  "archipelago",
  "inland-seas",
  "peninsulas",
  "island-chains",
  "skerries",
  "fjords",
  "barrier-coasts",
  "atolls",
  "rift-valleys",
] as const;
export type PhysicalLandform = (typeof LANDFORMS)[number];
export const worldLandform = (seed: string): PhysicalLandform =>
  LANDFORMS[Math.floor(randomAt(seed, "world", "landform") * LANDFORMS.length)];
const provinceCache = new Map<string, PhysicalLandform>();
/** Provinces share broad climate potential with climate selection. Geography
 * does not get repainted after a climate/resource roll. */
function province(seed: string, q: number, r: number): PhysicalLandform {
  const id = key(q, r),
    cacheKey = `${seed}/${id}`,
    cached = provinceCache.get(cacheKey);
  if (cached) return cached;
  const c = regionalClimateFields(seed, key(q * 16, r * 16));
  const weights: [PhysicalLandform, number][] = [
    [worldLandform(seed), 5],
    ["continent", 1],
    ["archipelago", 1],
    ["peninsulas", 1],
    ["inland-seas", 0.5],
  ];
  if (c.moisture < 0.36 && c.temperature < 0.7)
    weights.push(["continent", 12], ["rift-valleys", 3]);
  else if (c.temperature > 0.55 && c.temperature < 0.85 && c.moisture < 0.6)
    weights.push(["island-chains", 9], ["archipelago", 5], ["peninsulas", 3]);
  else if (c.temperature < 0.36) weights.push(["fjords", 6], ["skerries", 6]);
  else if (c.temperature > 0.7 && c.moisture > 0.55)
    weights.push(["atolls", 4], ["barrier-coasts", 5], ["archipelago", 4]);
  else
    weights.push(
      ["barrier-coasts", 3],
      ["island-chains", 2],
      ["rift-valleys", 2],
    );
  let roll =
    randomAt(seed, id, "landform-province") *
    weights.reduce((s, [, w]) => s + w, 0);
  let selected = weights.at(-1)![0];
  for (const [form, w] of weights) {
    roll -= w;
    if (roll < 0) {
      selected = form;
      break;
    }
  }
  if (provinceCache.size > 4096) provinceCache.clear();
  provinceCache.set(cacheKey, selected);
  return selected;
}
export function regionalLandform(seed: string, id: string): PhysicalLandform {
  const [q, r] = coord(id);
  return province(seed, Math.round(q / 16), Math.round(r / 16));
}
function height(
  seed: string,
  q: number,
  r: number,
  form: PhysicalLandform,
): number {
  const angle = randomAt(seed, "world", "tectonic-bearing") * Math.PI,
    u = q * Math.cos(angle) + r * Math.sin(angle),
    v = -q * Math.sin(angle) + r * Math.cos(angle);
  const broad = field(seed, q + 51, r - 29, 10, "continental-height"),
    fine = field(seed, q - 19, r + 73, 2.1, "coastal-height"),
    ridge = field(seed, u, v * 0.4, 5, "mountain-belt");
  const island = field(seed, q + 31, r - 17, 2.8, "islands"),
    warp = (field(seed, q, r, 8, "coast-warp") - 0.5) * 5;
  const climate = regionalClimateFields(seed, key(q, r));
  switch (form) {
    case "continent":
      return (
        0.2 +
        broad * 0.56 +
        fine * 0.12 +
        ridge * 0.1 +
        (climate.moisture < 0.36 ? 0.08 : 0)
      );
    case "archipelago":
      return 0.14 + island * 0.62 + fine * 0.13 + ridge * 0.1;
    case "island-chains": {
      const spine = Math.pow((Math.cos((v + warp) * 1.05) + 1) / 2, 2);
      return 0.15 + spine * 0.32 + island * 0.38 + fine * 0.12;
    }
    case "skerries":
      return (
        0.17 +
        field(seed, u + 11, v - 29, 1.6, "skerry-rock") * 0.52 +
        broad * 0.13 +
        fine * 0.14
      );
    case "fjords": {
      const cuts = Math.pow((Math.cos((v + warp) * 0.83) + 1) / 2, 6);
      return 0.3 + broad * 0.44 + ridge * 0.15 + fine * 0.1 - cuts * 0.3;
    }
    case "barrier-coasts": {
      const shore = field(seed, u, v * 0.25, 5, "barrier-mainland"),
        bars = Math.pow((Math.cos((v + warp) * 1.22) + 1) / 2, 5);
      return 0.15 + shore * 0.52 + bars * 0.2 + fine * 0.1;
    }
    case "atolls": {
      const a = Math.round(q / 7),
        b = Math.round(r / 7);
      let ring = 0;
      for (let i = a - 1; i <= a + 1; i++)
        for (let j = b - 1; j <= b + 1; j++) {
          const x = i * 7 + (randomAt(seed, key(i, j), "atoll-q") - 0.5) * 3,
            y = j * 7 + (randomAt(seed, key(i, j), "atoll-r") - 0.5) * 3,
            d = Math.hypot(q - x + (r - y) * 0.5, (r - y) * 0.866);
          ring = Math.max(ring, Math.exp(-((d - 2.1) ** 2) / 0.65));
        }
      return 0.2 + ring * 0.4 + fine * 0.13 + broad * 0.09;
    }
    case "rift-valleys": {
      const valley = Math.exp(-((Math.sin((v + warp) * 0.24) * 4) ** 2) / 1.8);
      return 0.34 + broad * 0.3 + ridge * 0.15 + fine * 0.1 - valley * 0.3;
    }
    case "peninsulas":
      return (
        0.12 +
        field(seed, u + 51, v * 0.32 - 29, 5, "peninsula-coast") * 0.64 +
        fine * 0.13 +
        ridge * 0.12
      );
    case "inland-seas": {
      let nearest = Infinity;
      const a = Math.round(q / 18),
        b = Math.round(r / 18);
      for (let i = a - 1; i <= a + 1; i++)
        for (let j = b - 1; j <= b + 1; j++) {
          const x =
              i * 18 + Math.round(randomAt(seed, key(i, j), "basin-q") * 6 - 3),
            y =
              j * 18 + Math.round(randomAt(seed, key(i, j), "basin-r") * 6 - 3);
          nearest = Math.min(
            nearest,
            Math.max(Math.abs(q - x), Math.abs(r - y), Math.abs(q - x + r - y)),
          );
        }
      return (
        0.55 +
        fine * 0.15 +
        ridge * 0.1 -
        0.45 * Math.exp((-nearest * nearest) / 22)
      );
    }
  }
}
export function physicalElevation(seed: string, id: string): number {
  const [q, r] = coord(id),
    x = q / 16,
    y = r / 16,
    a = Math.floor(x),
    b = Math.floor(y),
    smooth = (n: number) => n * n * (3 - 2 * n),
    u = smooth(x - a),
    v = smooth(y - b);
  return (
    height(seed, q, r, province(seed, a, b)) * (1 - u) * (1 - v) +
    height(seed, q, r, province(seed, a + 1, b)) * u * (1 - v) +
    height(seed, q, r, province(seed, a, b + 1)) * (1 - u) * v +
    height(seed, q, r, province(seed, a + 1, b + 1)) * u * v
  );
}

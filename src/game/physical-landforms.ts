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
  "drowned-valleys",
  "volcanic-arcs",
  "basin-ranges",
  "dissected-plateaus",
  "great-river-basins",
  "cuesta-belts",
  "lake-districts",
  "badlands",
] as const;
export type PhysicalLandform = (typeof LANDFORMS)[number];
export const worldLandform = (seed: string, version = 8): PhysicalLandform =>
  LANDFORMS[
    Math.floor(
      randomAt(seed, "world", "landform") *
        (version >= 8 ? LANDFORMS.length : version >= 5 ? 14 : 10),
    )
  ];
const provinceCache = new Map<string, PhysicalLandform>();
/** Provinces share broad climate potential with climate selection. Geography
 * does not get repainted after a climate/resource roll. */
function province(
  seed: string,
  q: number,
  r: number,
  version: number,
): PhysicalLandform {
  const id = key(q, r),
    cacheKey = `${seed}/${id}/${version}`,
    cached = provinceCache.get(cacheKey);
  if (cached) return cached;
  const span = version >= 8 ? 24 : 16;
  const c = regionalClimateFields(seed, key(q * span, r * span));
  const weights: [PhysicalLandform, number][] = [
    [
      worldLandform(seed, version),
      version >= 8 && worldLandform(seed, version) === "great-river-basins"
        ? 16
        : 5,
    ],
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
  if (version >= 5) {
    // Lithology is not a climate, but dry interiors expose basin/range relief
    // and humid coastlines favor drowned, branching valleys.
    weights.push(["volcanic-arcs", 1.2]);
    if (c.moisture < 0.4)
      weights.push(["basin-ranges", 4], ["dissected-plateaus", 3]);
    else if (c.temperature > 0.3 && c.moisture > 0.5)
      weights.push(["drowned-valleys", 4], ["dissected-plateaus", 1.5]);
    else weights.push(["dissected-plateaus", 1]);
  }
  if (version >= 8) {
    weights.push(
      ["great-river-basins", c.moisture > 0.38 ? 7 : 2],
      ["cuesta-belts", 2],
    );
    if (c.temperature < 0.45 && c.moisture > 0.35)
      weights.push(["lake-districts", 5]);
    if (c.moisture < 0.42) weights.push(["badlands", 5]);
  }
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
export function regionalLandform(
  seed: string,
  id: string,
  version = 8,
): PhysicalLandform {
  const [q, r] = coord(id);
  const span = version >= 8 ? 24 : 16;
  return province(seed, Math.round(q / span), Math.round(r / span), version);
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
    case "great-river-basins": {
      // Long, gently graded catchments: small-scale relief cannot repeatedly
      // trap the trunk in a puddle. Broad valley shoulders still divide basins.
      const phase = randomAt(seed, "world", "alluvial-divide") * 48;
      const long = Math.abs(Math.sin(((u + phase) * Math.PI) / 48));
      const valley = (Math.cos((v + warp * 0.4) * 0.19) + 1) / 2;
      return 0.23 + long * 0.36 + valley * 0.12 + fine * 0.003;
    }
    case "cuesta-belts": {
      // Tilted resistant strata: long gentle dip slopes oppose abrupt scarps.
      const phase = ((((v + warp * 0.45) / 15) % 1) + 1) % 1;
      const dip = phase < 0.82 ? phase / 0.82 : (1 - phase) / 0.18;
      return 0.27 + broad * 0.25 + dip * 0.24 + fine * 0.025;
    }
    case "lake-districts": {
      // Low, rounded shield relief with scattered glacial hollows. Drainage
      // applies the ordinary compact-lake cap; these are not inland seas.
      const rolling = field(seed, q - 37, r + 15, 15, "shield-upland");
      const hollows = field(seed, q + 19, r - 43, 3.2, "shield-hollows");
      return 0.28 + rolling * 0.29 + broad * 0.08 + hollows * 0.08;
    }
    case "badlands": {
      // Soft sediment eroded into close gullies between irregular low ribs.
      const ribs = Math.pow(
        (Math.cos((v + warp + Math.sin(u * 0.65)) * 1.45) + 1) / 2,
        3,
      );
      return 0.3 + broad * 0.25 + ribs * 0.12 + fine * 0.06;
    }
    case "drowned-valleys": {
      // Branching valleys cut an uneven coastal platform, rather than the
      // straight parallel cuts of glacial fjords. Sea level floods their ends.
      const trunk = Math.pow((Math.cos((v + warp) * 0.55) + 1) / 2, 10);
      const tributary = Math.pow(
        (Math.cos((u * 0.65 + Math.abs(v + warp) * 0.8) * 0.8) + 1) / 2,
        12,
      );
      const incision = Math.max(trunk, tributary * (0.5 + trunk * 0.5));
      return 0.32 + broad * 0.35 + ridge * 0.09 + fine * 0.07 - incision * 0.27;
    }
    case "volcanic-arcs": {
      // Unequal volcanic massifs follow a curved chain, with occasional
      // collapsed centers. Their radial slopes feed the ordinary river model.
      const cell = Math.round(u / 6);
      const row = Math.round((v - Math.sin(u * 0.12) * 5) / 18);
      let mass = 0;
      for (let band = row - 1; band <= row + 1; band++)
        for (let n = cell - 2; n <= cell + 2; n++) {
          const id = key(n, band);
          const centerU = n * 6 + (randomAt(seed, id, "volcano-u") - 0.5) * 2;
          const centerV =
            band * 18 +
            Math.sin(centerU * 0.12) * 5 +
            (randomAt(seed, id, "volcano-v") - 0.5) * 2;
          const radius = 1.7 + randomAt(seed, id, "volcano-radius") * 1.5;
          const d = Math.hypot(u - centerU, v - centerV);
          const cone = Math.exp((-d * d) / (radius * radius));
          const collapse =
            randomAt(seed, id, "volcano-caldera") < 0.28
              ? Math.exp((-d * d) / 0.8) * 0.6
              : 0;
          mass = Math.max(mass, cone - collapse);
        }
      return 0.2 + broad * 0.12 + fine * 0.08 + mass * 0.52;
    }
    case "basin-ranges": {
      // Alternating long, narrow uplifts and broad valley floors.
      const crest = Math.pow((Math.cos((v + warp * 0.45) * 0.7) + 1) / 2, 4);
      const length = 0.6 + field(seed, u, v, 8, "range-length") * 0.4;
      return 0.29 + broad * 0.23 + crest * length * 0.32 + fine * 0.07;
    }
    case "dissected-plateaus": {
      // Raised tablelands retain broad tops, split by lower eroded corridors.
      const bedrock = field(seed, u + 23, v - 51, 6, "plateau-bedrock");
      const shelf = Math.max(0, Math.min(1, (bedrock - 0.3) / 0.35));
      const top = shelf * shelf * (3 - 2 * shelf);
      const ravine = Math.pow(
        (Math.cos((v + warp + Math.sin(u * 0.4)) * 0.8) + 1) / 2,
        8,
      );
      return 0.28 + top * 0.33 + broad * 0.1 + fine * 0.05 - ravine * 0.12;
    }
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
export function physicalElevation(
  seed: string,
  id: string,
  version = 8,
): number {
  const [q, r] = coord(id),
    span = version >= 8 ? 24 : 16,
    x = q / span,
    y = r / span,
    a = Math.floor(x),
    b = Math.floor(y),
    smooth = (n: number) => n * n * (3 - 2 * n),
    u = smooth(x - a),
    v = smooth(y - b);
  return (
    height(seed, q, r, province(seed, a, b, version)) * (1 - u) * (1 - v) +
    height(seed, q, r, province(seed, a + 1, b, version)) * u * (1 - v) +
    height(seed, q, r, province(seed, a, b + 1, version)) * (1 - u) * v +
    height(seed, q, r, province(seed, a + 1, b + 1, version)) * u * v
  );
}

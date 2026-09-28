import { physicalField as field } from "./climate-fields";
import { coord, key, randomAt } from "./world";

const smooth = (n: number) => {
  const x = Math.max(0, Math.min(1, n));
  return x * x * (3 - 2 * x);
};
export type WorldStructure = "continental" | "broken-coasts" | "island-seas";
/** Large continuous continents remain a minority, rather than the default
 * outcome of blending every regional relief field together. */
export function worldStructure(seed: string): WorldStructure {
  const n = randomAt(seed, "world", "crust-structure");
  return n < 0.18 ? "continental" : n < 0.7 ? "broken-coasts" : "island-seas";
}
export const COASTAL_PATTERNS = [
  "island-mosaic",
  "ribbon-islands",
  "sweeping-arcs",
  "crossed-straits",
] as const;
export function coastalPattern(seed: string) {
  return COASTAL_PATTERNS[
    Math.floor(
      randomAt(seed, "world", "coastal-pattern") * COASTAL_PATTERNS.length,
    )
  ];
}
/** Smooth coordinate warps change island proportions without seams or rerolls. */
function crustCoordinates(seed: string, x: number, y: number, version: number) {
  if (version < 12) return [x, y];
  const angle = randomAt(seed, "world", "coast-bearing") * Math.PI;
  const u = x * Math.cos(angle) + y * Math.sin(angle);
  const v = -x * Math.sin(angle) + y * Math.cos(angle);
  switch (coastalPattern(seed)) {
    case "ribbon-islands":
      return [u / 1.65, v * 1.3];
    case "sweeping-arcs":
      return [u, v + Math.sin(u / 7) * 3.2];
    case "crossed-straits":
      return [u + v * 0.55, v * 0.92 + Math.sin(u / 9) * 1.4];
    default:
      return [u, v];
  }
}
/** Continuous curved belts share a bearing across provinces. Low saddles break
 * some crests without turning the entire high plateau into random mountains. */
export function mountainBelt(seed: string, id: string): number {
  const [q, r] = coord(id),
    angle = randomAt(seed, "world", "tectonic-bearing") * Math.PI,
    x = q + r * 0.5,
    y = (r * Math.sqrt(3)) / 2,
    u = x * Math.cos(angle) + y * Math.sin(angle),
    v = -x * Math.sin(angle) + y * Math.cos(angle),
    warp = (field(seed, u, v, 7, "range-bend") - 0.5) * 4,
    phase = randomAt(seed, "world", "range-phase") * 14,
    axis = (Math.sin(((v + warp + phase) * Math.PI) / 13) * 13) / Math.PI,
    saddle = 0.5 + field(seed, u, v, 5, "range-saddles") * 0.5;
  return Math.exp(-Math.pow(axis / 1.2, 2)) * saddle;
}
/** Deformed crust blocks supply straits before climate or resource selection.
 * Only twenty-five nearby sites are sampled, independent of the explored map size. */
export function structuredElevation(
  seed: string,
  id: string,
  relief: number,
  version = 11,
): number {
  const mode = worldStructure(seed);
  const belt = mountainBelt(seed, id);
  if (mode === "continental") return relief + belt * 0.12;
  const [q, r] = coord(id),
    rawX = q + r * 0.5 + (field(seed, q, r, 5, "crust-warp-x") - 0.5) * 1.8,
    rawY =
      (r * Math.sqrt(3)) / 2 +
      (field(seed, q, r, 5, "crust-warp-y") - 0.5) * 1.8,
    [x, y] = crustCoordinates(seed, rawX, rawY, version),
    spacing =
      (mode === "island-seas" ? 5.6 : 7.2) *
      (0.9 + randomAt(seed, "world", "crust-scale") * 0.2),
    a = Math.round(x / spacing),
    b = Math.round(y / spacing);
  let nearest = Infinity,
    second = Infinity;
  for (let i = a - 2; i <= a + 2; i++)
    for (let j = b - 2; j <= b + 2; j++) {
      const site = key(i, j),
        cx = (i + (randomAt(seed, site, "crust-x") - 0.5) * 0.6) * spacing,
        cy = (j + (randomAt(seed, site, "crust-y") - 0.5) * 0.6) * spacing,
        d = Math.hypot(x - cx, y - cy);
      if (d < nearest) {
        second = nearest;
        nearest = d;
      } else if (d < second) second = d;
    }
  const interior = smooth((second - nearest - 0.25) / 2),
    bridges = smooth(
      (field(seed, q, r, 8, "crust-connections") -
        (mode === "island-seas" ? 0.7 : 0.48)) *
        2,
    ),
    ground = Math.max(interior, bridges),
    basin = Math.max(0, 0.36 - field(seed, q, r, 9, "crust-seas")) * 0.45;
  return (
    0.24 +
    field(seed, q, r, 6.5, "crust-uplift") * 0.065 -
    basin +
    ground * (0.2 + (relief - 0.45) * 0.18 + belt * 0.15)
  );
}

import { BIOME_INFO } from "../game/climate-content";
import type { Hex } from "../game/types";
import { frozenInSeason, type Season } from "../game/seasons";
import { neighbors } from "../game/world";
import {
  baseSeasonalTerrainPattern,
  seasonalTerrainPattern,
  terrainArtFile,
} from "./terrain-art";

const wet = (tile?: Hex) =>
  !!tile && (tile.resource === "water" || tile.resource === "ice");
export interface WaterConnections {
  shore: number;
  channel: number;
  basin?: number;
  river: boolean;
  openIce?: number;
  banks?: (string | undefined)[];
  floodedBanks?: ("crops" | "forest" | "rock" | undefined)[];
}
/** Only known physical land receives a bank. Ice remains water geography,
 * and an unexplored edge never invents a coastline. */
export function waterConnections(
  tile: Hex,
  tiles: ReadonlyMap<string, Hex>,
  season?: Season,
): WaterConnections {
  let shore = 0,
    channel = 0,
    basin = 0,
    openIce = 0;
  const river = tile.geography?.waterway === "river";
  const banks: (string | undefined)[] = [];
  const floodedBanks: ("crops" | "forest" | "rock" | undefined)[] = [];
  neighbors(tile.id).forEach((id, side) => {
    const next = tiles.get(id);
    if (!next || (wet(next) && !frozenInSeason(next, season)))
      openIce |= 1 << side;
    if (next && !wet(next)) {
      shore |= 1 << side;
      if (
        river &&
        (next.geography?.floodplain ||
          [
            "alluvial-clay",
            "river-woods",
            "chinampa-gardens",
            "sago-grove",
            "flood-wheat",
            "flood-rice",
            "flood-sorghum",
            "flood-meadow",
            "delta-gardens",
          ].includes(next.biome ?? ""))
      ) {
        banks[side] = terrainArtFile(baseSeasonalTerrainPattern(next, season));
        if (
          next.geography?.access === "flooded" &&
          !next.geography.projects?.levee
        ) {
          const info = next.biome ? BIOME_INFO[next.biome] : undefined;
          floodedBanks[side] =
            info?.yield.grain || info?.yield.wool || info?.yield.meat
              ? "crops"
              : info?.family === "forest"
                ? "forest"
                : "rock";
        }
      }
    }
    if (river && wet(next) && next?.geography?.waterway !== "river")
      basin |= 1 << side;
    if (
      river &&
      ((next && wet(next)) || (!next && tile.geography?.downstream === id))
    )
      channel |= 1 << side;
  });
  return {
    shore,
    channel,
    river,
    basin,
    openIce,
    ...(banks.length ? { banks } : {}),
    ...(floodedBanks.length ? { floodedBanks } : {}),
  };
}
const R = 44.05,
  A = (Math.sqrt(3) * 44) / 2;
const point = (angle: number, radius: number) => [
  Math.cos(angle) * radius,
  Math.sin(angle) * radius,
];
const fmt = (p: number[]) => p.map((n) => n.toFixed(3)).join(",");
export const WATER_HEX = Array.from({ length: 6 }, (_, i) =>
  fmt(point(((i * 60 - 90) * Math.PI) / 180, R)),
).join(" ");
function shoreEdge(i: number) {
  const angle = (i * Math.PI) / 3;
  const a = point(angle - Math.PI / 6, R),
    b = point(angle + Math.PI / 6, R);
  const inward = point(angle, 1);
  const along = (f: number, depth: number) =>
    a.map((v, axis) => v + (b[axis] - v) * f - inward[axis] * depth);
  // A narrow irregular shelf, rather than a circular scallop per land hex.
  const curve = `M${fmt(a)}C${fmt(along(0.16, 2.8))} ${fmt(along(0.31, 5.2))} ${fmt(along(0.5, 3.4))}S${fmt(along(0.81, 2.5))} ${fmt(b)}`;
  return { a, b, curve };
}
/** The wet side of exactly the same shoreline curves used to paint banks. */
export function waterSurfacePath(mask: number) {
  let d = "";
  for (let i = 0; i < 6; i++) {
    const { a, b, curve } = shoreEdge(i);
    if (i === 0) d = `M${fmt(a)}`;
    d += mask & (1 << i) ? curve.slice(curve.indexOf("C")) : `L${fmt(b)}`;
  }
  return `${d}Z`;
}
/** Closed textured bank strips and separate waterlines. Nothing is painted
 * along water-to-water edges, including the interior of a large sea. */
export function shoreGeometry(mask: number) {
  let banks = "",
    line = "";
  for (let i = 0; i < 6; i++) {
    if (!(mask & (1 << i))) continue;
    const { a, curve } = shoreEdge(i);
    line += curve;
    banks += `${curve}L${fmt(a)}Z`;
  }
  return { banks, line };
}
/** A single outline, including tributaries, with identical mouth endpoints on
 * both sides of every shared edge. Bank strokes omit those open mouths. */
export const riverClipId = (c: WaterConnections) =>
  `water-river-${c.channel}${c.basin ? `-${c.basin}` : ""}`;
export function riverGeometry(mask: number, basin = 0) {
  const mouths: { a: number[]; b: number[] }[] = [];
  for (let i = 0; i < 6; i++) {
    if (!(mask & (1 << i))) continue;
    const angle = (i * Math.PI) / 3,
      n = point(angle, A + 0.08),
      t = point(angle + Math.PI / 2, 19);
    // Three touching water hexes have no real land at their common vertex.
    // Open that corner fully instead of drawing paired banks or tiny islands.
    mouths.push({
      a:
        basin & (1 << i) || mask & (1 << ((i + 5) % 6))
          ? point(angle - Math.PI / 6, R)
          : [n[0] - t[0], n[1] - t[1]],
      b:
        basin & (1 << i) || mask & (1 << ((i + 1) % 6))
          ? point(angle + Math.PI / 6, R)
          : [n[0] + t[0], n[1] + t[1]],
    });
  }
  if (!mouths.length)
    return {
      water: "M-25,0C-25,-32 25,-32 25,0C25,32 -25,32 -25,0Z",
      line: "",
    };
  if (mouths.length === 1) {
    // A broad headwater pool occupies the centre of the hex. Preserve the
    // exact shared-edge mouth so neighbouring river segments still join.
    const side = Math.log2(mask),
      angle = (side * Math.PI) / 3;
    const rotate = (x: number, y: number) =>
      fmt([
        x * Math.cos(angle) - y * Math.sin(angle),
        x * Math.sin(angle) + y * Math.cos(angle),
      ]);
    const { a, b } = mouths[0];
    const curve = `C${rotate(25, 14)} ${rotate(27, 30)} ${rotate(-1, 30)}C${rotate(-39, 30)} ${rotate(-39, -30)} ${rotate(-1, -30)}C${rotate(27, -30)} ${rotate(25, -14)} ${fmt(a)}`;
    return {
      water: `M${fmt(a)}L${fmt(b)}${curve}Z`,
      line: `M${fmt(b)}${curve}`,
    };
  }
  let water = `M${fmt(mouths[0].a)}`,
    line = "";
  for (let i = 0; i < mouths.length; i++) {
    const { b } = mouths[i],
      next = mouths[(i + 1) % mouths.length].a;
    // Two sea-facing sides meet at an open-water corner. Do not loop a
    // bank back into that corner: it creates a false teardrop-shaped island.
    const gap = Math.hypot(b[0] - next[0], b[1] - next[1]);
    if (gap < 0.01) {
      water += `L${fmt(b)}`;
      continue;
    }
    const inset = basin ? Math.min(7, gap * 0.16) : 0;
    const control = (f: number) => {
      const p = b.map((v, axis) => v + (next[axis] - v) * f);
      const length = Math.hypot(p[0], p[1]) || 1;
      return p.map((v) => v * (1 - inset / length));
    };
    // Wide connected arms enclose a central pool. Following an inner circular
    // arc keeps the middle underwater, even on sharp bends or tributary joins.
    const radius = 26;
    const fromAngle = Math.atan2(b[1], b[0]);
    const toAngle = Math.atan2(next[1], next[0]);
    const sweep = (toAngle - fromAngle + Math.PI * 2) % (Math.PI * 2);
    const innerB = point(fromAngle, radius),
      innerNext = point(toAngle, radius);
    const enterTangent = [
      innerB[0] + Math.sin(fromAngle) * 6,
      innerB[1] - Math.cos(fromAngle) * 6,
    ];
    const exitTangent = [
      innerNext[0] - Math.sin(toAngle) * 6,
      innerNext[1] + Math.cos(toAngle) * 6,
    ];
    const curve = basin
      ? `C${fmt(control(1 / 3))} ${fmt(control(2 / 3))} ${fmt(next)}`
      : `C${fmt(b.map((v) => v * 0.88))} ${fmt(enterTangent)} ${fmt(innerB)}A${radius},${radius} 0 ${sweep > Math.PI ? 1 : 0} 1 ${fmt(innerNext)}C${fmt(exitTangent)} ${fmt(next.map((v) => v * 0.88))} ${fmt(next)}`;
    water += `L${fmt(b)}${curve}`;
    line += `M${fmt(b)}${curve}`;
  }
  return { water: `${water}Z`, line };
}
/** Keep schools inside the channel, including off-centre river sources and bends. */
export function riverWildlifeAnchor(mask: number, basin = 0) {
  const sides = Array.from({ length: 6 }, (_, i) => i).filter(
    (i) => mask & (1 << i),
  );
  if (!sides.length) return { x: 0, y: 0 };
  const radius = sides.length === 1 ? 5 : basin ? 30 : 21;
  return {
    x:
      sides.reduce((sum, i) => sum + Math.cos((i * Math.PI) / 3) * radius, 0) /
      sides.length,
    y:
      sides.reduce((sum, i) => sum + Math.sin((i * Math.PI) / 3) * radius, 0) /
      sides.length,
  };
}
export function bankArt(tile: Hex, season?: Season) {
  // Climate-appropriate ground, kept free of baked-in water or wildlife.
  const dry = ["desert", "hyperarid", "semiarid"].includes(tile.climate ?? "");
  const evergreen = [
    "tropical",
    "tropical-maritime",
    "subtropical",
    "equatorial-wetlands",
    "temperate-rainforest",
    "monsoon",
    "mesoamerican",
  ].includes(tile.climate ?? "");
  const forest = ["cold", "temperate-rainforest", "oceanic"].includes(
    tile.climate ?? "",
  );
  const jungle = [
    "tropical",
    "tropical-maritime",
    "equatorial-wetlands",
    "mesoamerican",
    "monsoon",
  ].includes(tile.climate ?? "");
  return terrainArtFile(
    seasonalTerrainPattern(
      {
        ...tile,
        resource: dry ? "desert" : "hides",
        biome: dry
          ? "desert"
          : jungle
            ? "jungle"
            : forest
              ? "forest"
              : "wildlife-grassland",
        surface: "open",
        geography: {
          ...tile.geography!,
          access: "normal",
          waterway: undefined,
        },
      },
      evergreen ? "spring" : season,
    ),
  );
}

/** Each bank inherits the adjacent riparian terrain only on its own side.
 * The river water is painted on top, preserving connected channel geometry. */
export function riverBankSector(side: number): string {
  const { a, b } = shoreEdge(side);
  return `M0,0L${fmt(a)}L${fmt(b)}Z`;
}

import type { Hex } from "../game/types";
import type { Season } from "../game/seasons";
import { neighbors } from "../game/world";
import { seasonalTerrainPattern, terrainArtFile } from "./terrain-art";

const wet = (tile?: Hex) =>
  !!tile && (tile.resource === "water" || tile.resource === "ice");
export interface WaterConnections {
  shore: number;
  channel: number;
  river: boolean;
}
/** Only known physical land receives a bank. Ice remains water geography,
 * and an unexplored edge never invents a coastline. */
export function waterConnections(
  tile: Hex,
  tiles: ReadonlyMap<string, Hex>,
): WaterConnections {
  let shore = 0,
    channel = 0;
  const river = tile.geography?.waterway === "river";
  neighbors(tile.id).forEach((id, side) => {
    const next = tiles.get(id);
    if (next && !wet(next)) shore |= 1 << side;
    if (
      river &&
      ((next &&
        wet(next) &&
        (next.geography?.waterway !== "river" ||
          tile.geography?.downstream === id ||
          next.geography?.downstream === tile.id)) ||
        (!next && tile.geography?.downstream === id))
    )
      channel |= 1 << side;
  });
  return { shore, channel, river };
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
/** Closed textured bank strips and separate waterlines. Nothing is painted
 * along water-to-water edges, including the interior of a large sea. */
export function shoreGeometry(mask: number) {
  let banks = "",
    line = "";
  for (let i = 0; i < 6; i++) {
    if (!(mask & (1 << i))) continue;
    const angle = (i * Math.PI) / 3;
    const a = point(angle - Math.PI / 6, R),
      b = point(angle + Math.PI / 6, R);
    const inward = point(angle, 1);
    const along = (f: number, depth: number) =>
      a.map((v, axis) => v + (b[axis] - v) * f - inward[axis] * depth);
    // A narrow irregular shelf, rather than a circular scallop per land hex.
    const curve = `M${fmt(a)}C${fmt(along(0.16, 2.8))} ${fmt(along(0.31, 5.2))} ${fmt(along(0.5, 3.4))}S${fmt(along(0.81, 2.5))} ${fmt(b)}`;
    line += curve;
    banks += `${curve}L${fmt(a)}Z`;
  }
  return { banks, line };
}
/** A single outline, including tributaries, with identical mouth endpoints on
 * both sides of every shared edge. Bank strokes omit those open mouths. */
export function riverGeometry(mask: number) {
  const mouths: { a: number[]; b: number[] }[] = [];
  for (let i = 0; i < 6; i++) {
    if (!(mask & (1 << i))) continue;
    const angle = (i * Math.PI) / 3,
      n = point(angle, A + 0.08),
      t = point(angle + Math.PI / 2, 14);
    mouths.push({
      a: [n[0] - t[0], n[1] - t[1]],
      b: [n[0] + t[0], n[1] + t[1]],
    });
  }
  if (!mouths.length)
    return {
      water: "M-10,0C-10,-13 10,-13 10,0C10,13 -10,13 -10,0Z",
      line: "",
    };
  let water = `M${fmt(mouths[0].a)}`,
    line = "";
  for (let i = 0; i < mouths.length; i++) {
    const { b } = mouths[i],
      next = mouths[(i + 1) % mouths.length].a;
    const curve = `C${fmt(b.map((v) => v * 0.45))} ${fmt(next.map((v) => v * 0.45))} ${fmt(next)}`;
    water += `L${fmt(b)}${curve}`;
    line += `M${fmt(b)}${curve}`;
  }
  return { water: `${water}Z`, line };
}
export function bankArt(tile: Hex, season?: Season) {
  // Climate-appropriate ground, kept free of baked-in water or wildlife.
  const dry = ["desert", "hyperarid"].includes(tile.climate ?? "");
  const evergreen = [
    "tropical",
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

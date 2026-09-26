import { physicalField as field } from "./climate-fields";
import { key, randomAt } from "./world";
import { BIOME_INFO, type Biome } from "./climate-content";

import { type ExtraLandform } from "./landform-catalogue";
export {
  EXTRA_LANDFORMS,
  EXTRA_LANDFORM_IDS,
  isExtraLandform,
} from "./landform-catalogue";
/** Climate affinity changes occurrence, never imports another climate's tiles. */
export function formationAffinity(
  form: ExtraLandform,
  temperature: number,
  moisture: number,
): number {
  switch (form) {
    case "dune-seas":
      return moisture < 0.42 && temperature > 0.4 ? 1.8 : 0;
    case "drumlin-fields":
    case "moraine-belts":
    case "outwash-plains":
      return temperature < 0.55 ? 1.4 : 0;
    case "canyonlands":
    case "mesa-country":
    case "inselberg-plains":
      return moisture < 0.5 ? 1.4 : 0.25;
    case "alluvial-fans":
      return moisture < 0.55 ? 1.3 : 0.6;
    case "loess-hills":
      return temperature > 0.3 && temperature < 0.8 && moisture < 0.65
        ? 1.3
        : 0.2;
    case "tidal-estuaries":
      return moisture > 0.5 ? 1.5 : 0.2;
    case "tombolo-coasts":
    case "raised-beaches":
      return 0.8;
    default:
      return 0.65;
  }
}
const smooth = (x: number) => {
  const n = Math.max(0, Math.min(1, x));
  return n * n * (3 - 2 * n);
};
/** All shapes share seeded bearings but use different scales and geometries.
 * Constant bounded neighborhoods avoid work proportional to campaign size. */
export function expandedHeight(
  seed: string,
  q: number,
  r: number,
  form: ExtraLandform,
): number {
  const angle = randomAt(seed, "world", "tectonic-bearing") * Math.PI,
    u = q * Math.cos(angle) + r * Math.sin(angle),
    v = -q * Math.sin(angle) + r * Math.cos(angle),
    broad = field(seed, q + 51, r - 29, 10, "continental-height"),
    fine = field(seed, q - 19, r + 73, 2.1, "coastal-height"),
    warp = (field(seed, q, r, 8, "coast-warp") - 0.5) * 5,
    phase = randomAt(seed, "world", `phase-${form}`) * 12;
  const a = u + phase,
    b = v + warp;
  switch (form) {
    case "canyonlands": {
      const axis = Math.sin((b * Math.PI) / 32) * 10;
      const trunk = Math.exp(
        -Math.pow((axis + Math.sin(a * 0.18) * 2) / 1.6, 2),
      );
      const arms =
        Math.pow((Math.cos((a + Math.abs(axis) * 0.85) * 0.58) + 1) / 2, 12) *
        Math.exp(-Math.abs(axis) / 16);
      return (
        0.48 + broad * 0.14 + fine * 0.022 - Math.max(trunk, arms * 0.8) * 0.29
      );
    }
    case "mesa-country": {
      const rock = field(seed, a, b, 4.5, "mesa-caps");
      return (
        0.29 + broad * 0.12 + smooth((rock - 0.38) / 0.18) * 0.32 + fine * 0.009
      );
    }
    case "alluvial-fans": {
      const front = Math.pow(
        (Math.cos((b + Math.sin(a * 0.12)) * 0.2) + 1) / 2,
        9,
      );
      const apron = Math.abs(Math.sin((b * Math.PI) / 32) * 10);
      const fan = Math.pow(
        (Math.cos((a * 0.24) / (1 + apron * 0.035)) + 1) / 2,
        2,
      );
      return (
        0.26 +
        broad * 0.12 +
        front * 0.3 +
        fan * 0.13 * Math.exp(-apron / 20) +
        fine * 0.007
      );
    }
    case "loess-hills": {
      const hills = field(seed, a, b, 6, "loess-mantle");
      const gullies = Math.pow(
        (Math.cos((b + Math.sin(a * 0.32) * 2) * 0.8) + 1) / 2,
        10,
      );
      return 0.31 + broad * 0.16 + hills * 0.16 - gullies * 0.08 + fine * 0.009;
    }
    case "drumlin-fields": {
      let mound = 0;
      const x = Math.round(a / 8),
        y = Math.round(b / 4);
      for (let i = x - 1; i <= x + 1; i++)
        for (let j = y - 1; j <= y + 1; j++) {
          const id = key(i, j),
            cx = i * 8 + (randomAt(seed, id, "drumlin-x") - 0.5) * 4,
            cy = j * 4 + (randomAt(seed, id, "drumlin-y") - 0.5) * 2;
          const dx =
              (a - cx) / (2.6 + randomAt(seed, id, "drumlin-length") * 1.8),
            dy = (b - cy) / 1.15;
          mound = Math.max(mound, Math.exp(-dx * dx - dy * dy));
        }
      return 0.28 + broad * 0.19 + mound * 0.19 + fine * 0.014;
    }
    case "moraine-belts": {
      const arc = b + Math.sin(a * 0.1) * 5 + a * a * 0.014;
      const ridge = Math.pow((Math.cos(arc * 0.58) + 1) / 2, 6);
      return (
        0.3 +
        broad * 0.17 +
        ridge * (0.13 + fine * 0.09) +
        field(seed, a, b, 2.8, "moraine-hollows") * 0.045
      );
    }
    case "outwash-plains": {
      const grade = (Math.cos(((a + phase) * Math.PI) / 45) + 1) / 2;
      const ridge = Math.pow((Math.cos((b + warp * 0.2) * 0.19) + 1) / 2, 10);
      return 0.24 + grade * 0.3 + ridge * 0.095 + fine * 0.002;
    }
    case "tombolo-coasts": {
      const shore = (Math.sin((b * Math.PI) / 48) * 48) / Math.PI;
      const cell = Math.round(a / 10),
        x = a - cell * 10;
      const offshore = 2 + randomAt(seed, key(cell, 0), "headland-offset") * 3;
      const mainland = 0.19 + 0.25 * smooth((shore + 2) / 5);
      const head =
        Math.exp((-x * x) / 7 - Math.pow(shore + offshore, 2) / 5) * 0.38;
      const neck =
        Math.exp((-x * x) / 0.9) * 0.2 * smooth((shore + offshore + 1) / 2);
      return mainland + Math.max(head, neck) + broad * 0.085 + fine * 0.013;
    }
    case "caldera-highlands": {
      let rim = 0;
      const x = Math.round(a / 17),
        y = Math.round(b / 17);
      for (let i = x - 1; i <= x + 1; i++)
        for (let j = y - 1; j <= y + 1; j++) {
          const id = key(i, j),
            dx = a - i * 17 - (randomAt(seed, id, "caldera-x") - 0.5) * 4,
            dy = b - j * 17;
          const d = Math.hypot(dx, dy),
            radius = 4 + randomAt(seed, id, "caldera-size") * 2;
          const breach =
            0.25 +
            0.75 *
              smooth(
                (Math.sin(
                  Math.atan2(dy, dx) + randomAt(seed, id, "caldera-breach") * 6,
                ) +
                  0.65) /
                  0.6,
              );
          rim = Math.max(
            rim,
            Math.exp(-Math.pow((d - radius) / 1.2, 2)) * 0.34 * breach,
          );
        }
      return 0.3 + broad * 0.12 + rim + fine * 0.016;
    }
    case "lava-plateaus": {
      const flows = field(seed, a, b * 0.55, 5.5, "lava-lobes");
      const shelves =
        smooth((flows - 0.22) / 0.08) * 0.11 +
        smooth((flows - 0.44) / 0.07) * 0.14 +
        smooth((flows - 0.64) / 0.09) * 0.11;
      return 0.25 + broad * 0.13 + shelves + fine * 0.013;
    }
    case "inselberg-plains": {
      let rock = 0;
      const x = Math.round(a / 12),
        y = Math.round(b / 12);
      for (let i = x - 1; i <= x + 1; i++)
        for (let j = y - 1; j <= y + 1; j++) {
          const id = key(i, j),
            dx = a - i * 12 - (randomAt(seed, id, "inselberg-x") - 0.5) * 6,
            dy = b - j * 12 - (randomAt(seed, id, "inselberg-y") - 0.5) * 6;
          const radius = 1.3 + randomAt(seed, id, "inselberg-width") * 1.7;
          rock = Math.max(
            rock,
            Math.exp(-(dx * dx + dy * dy) / (radius * radius)) * 0.4,
          );
        }
      return 0.28 + broad * 0.18 + rock + fine * 0.008;
    }
    case "dune-seas": {
      const wind = b + Math.sin(a * 0.2) * 1.4 + warp * 0.3;
      const t = (((wind / 5) % 1) + 1) % 1;
      const slip = t < 0.75 ? t / 0.75 : (1 - t) / 0.25;
      return 0.29 + broad * 0.18 + slip * 0.095 + fine * 0.008;
    }
    case "tidal-estuaries": {
      const shore = (Math.sin((b * Math.PI) / 48) * 48) / Math.PI;
      const seaward = (Math.sin(a * 0.115) + 1) / 2;
      const width = 1.3 + seaward * 4;
      const inlet = Math.exp(
        -Math.pow((shore + Math.sin(a * 0.2) * 2) / width, 2),
      );
      const creeks =
        Math.pow((Math.cos((a + Math.abs(shore) * 0.8) * 0.55) + 1) / 2, 10) *
        Math.exp(-Math.abs(shore) / 12);
      return (
        0.33 +
        broad * 0.22 +
        fine * 0.012 -
        Math.max(inlet, creeks * 0.6) * (0.16 + seaward * 0.12)
      );
    }
    case "raised-beaches": {
      const coast = field(seed, a, b * 0.3, 9, "raised-shore");
      return (
        0.22 +
        broad * 0.09 +
        smooth((coast - 0.2) / 0.05) * 0.1 +
        smooth((coast - 0.4) / 0.055) * 0.12 +
        smooth((coast - 0.6) / 0.06) * 0.14 +
        fine * 0.009
      );
    }
    case "fault-scarps": {
      const offset =
        Math.sin(a * 0.16) * 1.5 +
        (field(seed, a, b, 6, "fault-segments") - 0.5) * 3;
      const axis = (Math.sin(((b + offset) * Math.PI) / 32) * 32) / Math.PI;
      const step = smooth((axis + 1) / 1.8),
        lower = smooth((axis + 10) / 2.4);
      const breach = 1 - Math.pow((Math.cos(a * 0.36) + 1) / 2, 8) * 0.6;
      return (
        0.24 +
        broad * 0.15 +
        (step * 0.24 + lower * 0.11) * breach +
        fine * 0.013
      );
    }
  }
}
/** Reweights only the current climate's already-eligible resources. */
export function formationResourceWeight(
  form: ExtraLandform,
  biome: Biome,
  slope: number,
  relative: number,
  moisture: number,
): number {
  const y = BIOME_INFO[biome].yield,
    family = BIOME_INFO[biome].family;
  const low = slope < 0.1 && relative < 0.15;
  switch (form) {
    case "loess-hills":
      return y.grain && low ? 1.5 : y.brick ? 1.45 : y.stone || y.ore ? 0.7 : 1;
    case "alluvial-fans":
      return y.grain && low ? 1.4 : y.stone && !low ? 1.5 : y.coal ? 0.7 : 1;
    case "canyonlands":
    case "mesa-country":
    case "fault-scarps":
      return y.stone ? 1.45 : family === "forest" && !low ? 0.8 : 1;
    case "drumlin-fields":
      return y.wool && low ? 1.35 : y.brick ? 1.2 : 1;
    case "moraine-belts":
      return y.stone
        ? 1.4
        : biome === "peat-bog" && low && moisture > 0.4
          ? 1.5
          : 1;
    case "outwash-plains":
      return y.stone ? 1.35 : y.grain ? 0.75 : family === "forest" ? 0.85 : 1;
    case "lava-plateaus":
      return y.stone ? 1.65 : y.coal ? 0.55 : 1;
    case "caldera-highlands":
      return y.stone ? 1.4 : y.grain && low ? 1.3 : y.coal ? 0.6 : 1;
    case "inselberg-plains":
      return y.stone && !low
        ? 1.8
        : ["steppe-plain", "bison-range", "wildlife-grassland"].includes(
              biome,
            ) && low
          ? 1.4
          : 1;
    case "dune-seas":
      return biome === "desert" ? 2 : y.grain || y.brick || y.ore ? 0.65 : 1;
    case "tidal-estuaries":
      return biome === "mangrove" || biome === "coastal-pasture" ? 1.5 : 1;
    case "raised-beaches":
      return biome === "coastal-cliffs" ? 1.5 : y.wool && low ? 1.25 : 1;
    case "tombolo-coasts":
      return biome === "coastal-cliffs" ? 1.4 : y.stone && !low ? 1.2 : 1;
  }
}

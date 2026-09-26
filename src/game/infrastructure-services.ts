import { BIOME_INFO } from "./climate-content";
import {
  allocateInfrastructureBonus,
  installedSpecialists,
  rotationExtras,
} from "./infrastructure";
import {
  SERVICE_RULES,
  type SpecialistService,
} from "./infrastructure-service-rules";
import type { Hex, Raw, Stock } from "./types";
import type { Season } from "./seasons";
import { neighbors } from "./world";
import {
  isSpecialist,
  SPECIALIST_PROJECTS,
} from "./infrastructure-specialists";
import type { Weather } from "./geography";
const seasons = ["spring", "summer", "autumn", "winter"] as const;
type Profile = Record<Season, Stock>;
const empty = (): Profile => ({
  spring: {},
  summer: {},
  autumn: {},
  winter: {},
});
const cold = new Set([
  "cold",
  "tundra",
  "arctic",
  "glacial",
  "alpine",
  "andean",
  "steppe",
  "prairie",
]);
const sheep = new Set([
  "pasture",
  "rough-pasture",
  "coastal-pasture",
  "alpine-pasture",
  "flood-meadow",
]);
const orchards = new Set(["olive-grove", "oasis", "breadfruit-grove"]);
export function hasSpecialistHarvestService(tile: Hex, owner?: number) {
  return installedSpecialists(tile, owner).some(
    ([b]) =>
      b.service &&
      ![
        "flood-rescue",
        "material-reuse",
        "habitat-margins",
        "fish-nursery",
      ].includes(b.service),
  );
}
/** At most two secondary cards (four for dedicated production branches) across a four-season calendar for each distinct
 * service. Equivalent works share one budget and cannot multiply each other. */
export function specialistServiceProfile(
  tile: Hex,
  native: Profile,
  owner?: number,
  weather: Weather = "normal",
  onlyTrack?: "hunting",
  onlyService?: SpecialistService,
): Profile {
  const output = empty();
  const services = new Map<
    SpecialistService,
    { budget: number; goods: Set<Raw> }
  >();
  for (const [branch, tier] of installedSpecialists(tile, owner)) {
    if (onlyTrack && branch.track !== onlyTrack) continue;
    const role = branch.service;
    if (
      !role ||
      (onlyService && role !== onlyService) ||
      [
        "flood-rescue",
        "material-reuse",
        "habitat-margins",
        "fish-nursery",
      ].includes(role) ||
      (branch.primary !== false && tier < 2)
    )
      continue;
    const rule = SERVICE_RULES[role];
    if (("weather" in rule ? rule.weather : "normal") !== weather) continue;
    if (role === "wool-oil" && !sheep.has(tile.biome ?? "")) continue;
    if (role === "prunings" && !orchards.has(tile.biome ?? "")) continue;
    if (
      role === "whole-catch" &&
      !(tile.geography?.fauna?.oil && tile.geography.fauna.hides)
    )
      continue;
    if (role === "winter-haul" && !cold.has(tile.climate ?? "")) continue;
    if (
      role === "water-work" &&
      !branch.freshwater &&
      !tile.geography?.floodplain &&
      tile.biome !== "river-woods"
    )
      continue;
    if (
      role === "low-water" &&
      !tile.geography?.floodplain &&
      !["river", "lake"].includes(tile.geography?.waterway ?? "")
    )
      continue;
    const current = services.get(role) ?? { budget: 0, goods: new Set<Raw>() };
    current.budget = Math.max(
      current.budget,
      branch.primary === false ? tier : Math.floor(tier / 2),
    );
    for (const raw of branch.goods) current.goods.add(raw);
    services.set(role, current);
  }
  for (const [role, { budget, goods }] of services) {
    const products = [...goods];
    let weights = seasons.map((s) =>
      products.reduce((n, raw) => n + (native[s][raw] ?? 0), 0),
    );
    let byproduct: Raw | undefined;
    if (role === "resin") {
      weights = [0, 1, 0, 0];
      byproduct = "oil";
    }
    if (role === "forest-food") {
      weights = [0, 0, 1, 0];
      byproduct = "grain";
    }
    if (role === "shellfish") {
      weights = [1, 1, 1, 1];
      byproduct = "fish";
    }
    if (role === "rotation-support") {
      const rotation = rotationExtras(tile, native, owner);
      weights = seasons.map((s) =>
        native[s].grain || native[s].oil ? 0 : (rotation[s].grain ?? 0),
      );
      byproduct = "grain";
    }
    if (role === "stubble-grazing") {
      const rotation = rotationExtras(tile, native, owner);
      weights = seasons.map((s, i) =>
        Number(
          (native[seasons[(i + 3) % 4]].grain ?? 0) > 0 &&
            !(native[s].grain || native[s].oil || rotation[s].grain) &&
            !(s === "winter" && cold.has(tile.climate ?? "")),
        ),
      );
      byproduct = "meat";
    }
    if (!weights.some(Boolean)) continue;
    if (role === "fodder" || role === "prunings") {
      const min = weights.reduce((n, x) => Math.min(n, x), Infinity);
      const max = weights.reduce((n, x) => Math.max(n, x), 0);
      weights = weights.map((n) =>
        Number(role === "fodder" ? n === min : n < max || min === max),
      );
      byproduct = role === "fodder" ? "meat" : "lumber";
    }
    if (role === "wool-oil") {
      weights = seasons.map((s) => native[s].wool ?? 0);
      byproduct = "oil";
    }
    if (role === "whole-catch") byproduct = "meat";
    if (role === "winter-haul")
      weights = weights.map((n, i) => (i === 3 ? n : 0));
    if (role === "sun-drying" || role === "low-water") weights[3] = 0;
    const allocations = allocateInfrastructureBonus(budget, weights);
    seasons.forEach((season, i) => {
      if (!allocations[i]) return;
      if (byproduct) {
        output[season][byproduct] =
          (output[season][byproduct] ?? 0) + allocations[i];
      } else {
        const portions = allocateInfrastructureBonus(
          allocations[i],
          products.map((raw) => native[season][raw] ?? 0),
        );
        products.forEach((raw, j) => {
          if (portions[j])
            output[season][raw] = (output[season][raw] ?? 0) + portions[j];
        });
      }
    });
  }
  return output;
}
/** Rescue is a subset of the harvest actually present, not flood immunity.
 * The caller enforces ice, damage and occupation before applying this allowance. */
export function specialistFloodSalvage(
  tile: Hex,
  stock: Stock,
  owner?: number,
  fieldHarvest: Stock = stock,
): Stock {
  let budget = 0;
  const caps: Partial<Record<Raw, number>> = {};
  for (const [b, tier] of installedSpecialists(tile, owner)) {
    if (b.service !== "flood-rescue") continue;
    const capacity = Math.ceil(tier / 2);
    budget = Math.max(budget, capacity);
    for (const raw of b.goods) caps[raw] = Math.max(caps[raw] ?? 0, capacity);
  }
  const output: Stock = {};
  for (const raw of Object.keys(caps).sort() as Raw[]) {
    const n = Math.min(
      budget,
      caps[raw]!,
      stock[raw] ?? 0,
      fieldHarvest[raw] ?? 0,
    );
    if (n) output[raw] = n;
    budget -= n;
  }
  return output;
}

export function hasSpecialistFloodRescue(tile: Hex, owner?: number): boolean {
  return installedSpecialists(tile, owner).some(
    ([b]) => b.service === "flood-rescue",
  );
}

/** Protected coastal cultivation persists independently of mobile shoals. */
export function cultivatedFish(tile: Hex, owner?: number): boolean {
  return (
    !!tile.geography?.projects &&
    installedSpecialists(tile, owner).some(([b]) => b.service === "shellfish")
  );
}
/** Owner-specific material savings, computed from the existing works before
 * construction. Never discounts the purchase of another material yard. */
export function specialistMaterialSavings(
  tile: Hex,
  cost: Stock,
  project: string,
  owner?: number,
): Stock {
  if (
    owner === undefined ||
    (isSpecialist(project) &&
      SPECIALIST_PROJECTS[project].branch.service === "material-reuse")
  )
    return {};
  const tiers: Partial<Record<Raw, number>> = {};
  for (const [b, tier] of installedSpecialists(tile, owner)) {
    if (b.service !== "material-reuse") continue;
    for (const raw of ["lumber", "stone"] as const)
      if (
        b.goods.includes(raw) &&
        (raw === "lumber"
          ? BIOME_INFO[tile.biome!].family === "forest"
          : BIOME_INFO[tile.biome!].yield.stone)
      )
        tiers[raw] = Math.max(tiers[raw] ?? 0, tier);
  }
  const saved: Stock = {};
  for (const raw of ["lumber", "stone"] as const) {
    const tier = tiers[raw] ?? 0;
    const n = Math.min(tier, Math.floor(((cost[raw] ?? 0) * tier) / 10));
    if (n) saved[raw] = n;
  }
  return saved;
}
/** Built once per migration step. Small local margins never scan the world for
 * every animal and never alter habitat eligibility or population counts. */
export function specialistEcology(tiles: Record<string, Hex>) {
  const margins = new Map<string, number>(),
    nurseries = new Map<string, number>();
  for (const tile of Object.values(tiles)) {
    if (!tile.geography?.projects) continue;
    for (const [b, tier] of installedSpecialists(tile)) {
      if (b.service === "fish-nursery")
        nurseries.set(
          tile.id,
          Math.max(nurseries.get(tile.id) ?? 0, tier * 0.2),
        );
      if (b.service === "habitat-margins")
        for (const id of neighbors(tile.id))
          if (tiles[id])
            margins.set(id, Math.max(margins.get(id) ?? 0, tier * 0.1));
    }
  }
  return { margins, nurseries };
}

export function specialistServiceTier(
  tile: Hex,
  service: SpecialistService,
  owner?: number,
): number {
  let tier = 0;
  for (const [b, n] of installedSpecialists(tile, owner))
    if (b.service === service) tier = Math.max(tier, n);
  return tier;
}

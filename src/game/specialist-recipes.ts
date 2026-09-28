import { PROCESSED, type Good, type Stock } from "./types";
import type { SpecialistBranch } from "./infrastructure-specialists";

/** Material shares describe actual equipment. Each bill retains a comparable
 * raw-equivalent investment, rather than copying every parent-track ingredient. */
export const SPECIALIST_RECIPES = {
  crates: [
    { lumber: 5, wool: 2, hides: 1 },
    { planks: 6, cloth: 3, leather: 1 },
    0.65,
  ],
  seed: [
    { lumber: 2, grain: 4, wool: 1 },
    { planks: 2, grain: 3, steel: 2, ceramics: 1 },
    0.7,
  ],
  nursery: [
    { lumber: 2, grain: 3, brick: 2 },
    { ceramics: 3, planks: 2, grain: 2, reagents: 1 },
    0.75,
  ],
  covers: [{ lumber: 1, wool: 6 }, { cloth: 5, planks: 1, leather: 1 }, 0.55],
  basin: [
    { stone: 4, brick: 3, lumber: 1 },
    { masonry: 4, ceramics: 4, steel: 1 },
    0.9,
  ],
  fermentation: [
    { brick: 5, lumber: 1, grain: 2 },
    { ceramics: 6, planks: 2, reagents: 1 },
    0.7,
  ],
  nets: [{ lumber: 2, wool: 4 }, { cloth: 4, planks: 3, steel: 1 }, 0.6],
  press: [
    { stone: 4, lumber: 3, ore: 1 },
    { masonry: 3, steel: 5, ceramics: 3 },
    1.2,
  ],
  mulch: [
    { lumber: 4, grain: 2, brick: 1 },
    { planks: 3, grain: 3, leather: 1, reagents: 2 },
    0.55,
  ],
  hayloft: [
    { lumber: 4, grain: 3, wool: 1 },
    { planks: 5, masonry: 2, cloth: 2, grain: 2 },
    0.65,
  ],
  shade: [{ lumber: 4, wool: 3 }, { planks: 4, cloth: 4, leather: 2 }, 0.55],
  scour: [
    { stone: 1, brick: 4, wool: 1 },
    { ceramics: 4, reagents: 4, steel: 2 },
    1,
  ],
  winch: [
    { lumber: 4, ore: 2, hides: 2 },
    { planks: 5, steel: 5, leather: 3 },
    1.2,
  ],
  timberyard: [
    { lumber: 4, stone: 1, wool: 2 },
    { planks: 6, masonry: 3, cloth: 2 },
    0.7,
  ],
  chute: [
    { lumber: 5, stone: 2, ore: 1 },
    { planks: 7, steel: 3, leather: 2 },
    1.05,
  ],
  screening: [
    { ore: 4, lumber: 2, stone: 1 },
    { steel: 6, planks: 2, reagents: 1 },
    1.2,
  ],
  coalwash: [
    { brick: 2, stone: 3, lumber: 1 },
    { masonry: 3, ceramics: 3, steel: 4 },
    1.15,
  ],
  sluice: [
    { lumber: 4, hides: 2, stone: 2 },
    { planks: 5, leather: 3, steel: 2 },
    1.1,
  ],
  frostworks: [
    { lumber: 3, wool: 4, stone: 2 },
    { masonry: 4, cloth: 3, planks: 3 },
    0.9,
  ],
  claywash: [
    { brick: 4, stone: 2, lumber: 1 },
    { ceramics: 5, masonry: 3, steel: 2 },
    0.95,
  ],
  forge: [
    { ore: 6, lumber: 1, hides: 1 },
    { steel: 8, leather: 2, coke: 1 },
    1.4,
  ],
  drying: [
    { lumber: 4, wool: 1, stone: 1 },
    { planks: 5, cloth: 2, steel: 1 },
    0.75,
  ],
  brinepipes: [
    { brick: 4, stone: 4 },
    { ceramics: 5, masonry: 5, steel: 1 },
    1.05,
  ],
  saltbeds: [
    { stone: 4, brick: 2, lumber: 1 },
    { masonry: 6, ceramics: 3, steel: 1 },
    1.2,
  ],
  smoking: [
    { lumber: 4, stone: 2, salt: 3 },
    { masonry: 4, planks: 2, steel: 2, salt: 4 },
    1.25,
  ],
  sledges: [
    { lumber: 3, hides: 4, ore: 1 },
    { planks: 4, leather: 4, steel: 2 },
    0.8,
  ],
  cutting: [
    { ore: 3, stone: 1, brick: 2 },
    { steel: 5, ceramics: 4, leather: 2 },
    1.1,
  ],
  pots: [{ brick: 6, lumber: 2 }, { ceramics: 7, steel: 2, planks: 1 }, 0.9],
  spawning: [
    { stone: 4, lumber: 3 },
    { masonry: 4, planks: 4, ceramics: 1 },
    0.6,
  ],
  terraces: [
    { stone: 6, ore: 1, lumber: 1 },
    { masonry: 7, steel: 2, planks: 1 },
    0.9,
  ],
  survey: [
    { lumber: 1, ore: 2, wool: 3 },
    { steel: 3, cloth: 4, planks: 2 },
    0.65,
  ],
  fences: [
    { lumber: 5, hides: 1, grain: 2 },
    { planks: 7, leather: 2, grain: 2 },
    0.65,
  ],
  curing: [
    { salt: 6, lumber: 2, hides: 1 },
    { salt: 8, ceramics: 3, planks: 3 },
    0.95,
  ],
  repair: [
    { ore: 3, lumber: 3, hides: 2 },
    { steel: 4, planks: 3, leather: 3 },
    1.15,
  ],
  tracking: [
    { hides: 4, lumber: 2, wool: 2 },
    { leather: 5, cloth: 3, planks: 2 },
    0.6,
  ],
  threshing: [
    { lumber: 4, stone: 3, grain: 1 },
    { planks: 3, steel: 4, stone: 2 },
    1.15,
  ],
  raisedbeds: [
    { lumber: 3, brick: 2, stone: 2, grain: 1 },
    { planks: 4, masonry: 4, grain: 1 },
    0.8,
  ],
} satisfies Record<string, readonly [Stock, Stock, number]>;
export type SpecialistRecipe = keyof typeof SPECIALIST_RECIPES;
/** Explicit craft assignments: changing a display name never changes its recipe. */
const GROUPS: Record<SpecialistRecipe, string> = {
  crates:
    "meadow-apiaries quarry-return-crates orchard-handling fish-crates berry-sorting",
  seed: "seed-selection potato-sprouting",
  nursery: "date-pollination chinampa-silt-nurseries nursery-shelters",
  covers: "date-bunch-covers cistern-covers berry-covers salt-pan-cover",
  basin: "sago-washing canal-silt-traps paddy-return-water pit-sediment",
  fermentation: "breadfruit-fermentation root-clamps",
  nets: "olive-catching-nets river-net-yards",
  press: "sunflower-dehulling press-settling whale-oil-settling",
  mulch: "dryland-dust-mulch orchard-mulch stubble-snow",
  hayloft:
    "woodland-pannage mountain-haylofts browse-fodder flood-meadow-hay fodder-reserves",
  shade: "pasture-shade upland-wind-shelters fish-shade lambing-shelters",
  scour: "wool-washing fleece-grading",
  winch:
    "coppice-stools river-log-booms cable-landings mine-loading quarry-loading",
  timberyard: "humid-timber-stickers covered-timber log-sorting",
  chute: "river-pollards slope-log-chutes upland-ore-ramps swamp-log-walks",
  screening: "ore-jigging ore-sorting coal-screening gold-recovery",
  coalwash: "coal-washing",
  sluice: "gold-riffle-boxes",
  frostworks: "cold-mine-portals mine-shelters quarry-shelter winter-log-depot",
  claywash: "clay-levigation clay-grading",
  forge: "quarry-wedge-sets stone-dressing",
  drying:
    "peat-stack-ventilation peat-racks harvest-drying tropical-fish-drying heath-berry-drying maize-cribs",
  brinepipes: "coastal-brine-feeders channel-sealing",
  saltbeds: "salt-crystal-draining salt-grading brine-settling salt-shelters",
  smoking: "fish-smokehouses woodland-game-smoking game-curing",
  sledges: "snow-game-sledges",
  cutting: "whale-blubber-cutting stock-handling coastal-seal-handling",
  pots: "heath-apiaries resin-tapping woodland-mushrooms",
  spawning: "shellfish-beds spawning-reeds reef-handling lake-landing",
  terraces: "contour-strips",
  survey: "paddy-level-surveys mine-survey",
  fences: "paddy-ducks crop-windbreaks pasture-rotation",
  curing: "hide-curing wild-hide-frames whale-hide-handling",
  repair: "forest-toolcare",
  tracking: "seal-haulout-wardens woodland-tracking open-range-tracking",
  threshing: "field-gleaning paddy-threshing clean-threshing",
  raisedbeds: "raised-rows field-outfalls quarry-drains mine-runoff",
};
export const RECIPE_BY_BRANCH = Object.fromEntries(
  Object.entries(GROUPS).flatMap(([recipe, ids]) =>
    ids.split(" ").map((id) => [id, recipe]),
  ),
) as Record<string, SpecialistRecipe>;
export function specialistRecipe(branch: SpecialistBranch): SpecialistRecipe {
  if (branch.rotation)
    return branch.rotation.water
      ? "raisedbeds"
      : branch.rotation.drainage
        ? "nursery"
        : "seed";
  const recipe = RECIPE_BY_BRANCH[branch.id];
  if (!recipe)
    throw new Error(`Missing specialist construction technique: ${branch.id}`);
  return recipe;
}
const processed = new Set<string>(PROCESSED);
export function constructionValue(stock: Stock): number {
  return Object.entries(stock).reduce(
    (n, [good, amount]) => n + amount! * (processed.has(good) ? 2.5 : 1),
    0,
  );
}
/** Reduce the finished material investment, including coal.
 * Whole-card apportionment retains at least one of each required material.
 * Only one rounding pass per ingredient is needed, independent of bill size. */
export function reduceConstructionBill(
  original: Stock,
  reduction: number,
): Stock {
  const bill = { ...original };
  const target = constructionValue(original) * reduction;
  const entries = Object.entries(original).map(([g, n]) => {
    const good = g as Good,
      unit = processed.has(good) ? 2.5 : 1;
    const removed = Math.min(n! - 1, Math.floor(n! * reduction));
    bill[good] = n! - removed;
    return { good, unit, removed, remainder: n! * reduction - removed };
  });
  let saved = entries.reduce((n, e) => n + e.removed * e.unit, 0);
  entries.sort((a, b) => b.remainder * b.unit - a.remainder * a.unit);
  for (const e of entries) {
    if (bill[e.good]! > 1 && saved + e.unit <= target + 1e-9) {
      bill[e.good]!--;
      saved += e.unit;
    }
  }
  return bill;
}
export const specialistCostReduction = (bill: Stock) =>
  reduceConstructionBill(bill, 0.15);
export function specialistConstruction(
  branch: SpecialistBranch,
  tier: number,
  main: Stock,
): Stock {
  const [early, late, fuel] = SPECIALIST_RECIPES[specialistRecipe(branch)];
  const shares: Stock = tier === 1 ? early : late;
  const coal = tier > 1 ? Math.ceil((main.coal ?? 0) * 2 * fuel) : 0;
  const budget = Math.max(1, constructionValue(main) * 2.35 - coal);
  const total = Object.values(shares).reduce((n, v) => n + v!, 0);
  const bill: Stock = {};
  for (const [good, weight] of Object.entries(shares))
    bill[good as Good] = Math.ceil(
      (budget * weight!) / total / (processed.has(good) ? 2.5 : 1),
    );
  if (coal) bill.coal = coal;
  for (const [good, n] of Object.entries(branch.finishing ?? {}))
    bill[good as Good] = (bill[good as Good] ?? 0) + n! * tier;
  return specialistCostReduction(bill);
}

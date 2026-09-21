import { maxValue, minValue } from "./aggregate";
import {
  biomeYield,
  CLIMATES,
  CLIMATE_INFO,
  waterProbabilities,
  climateTransitionWeight,
  type Climate,
} from "./climate-content";
import { RAW, RAW_SUBSTITUTES, type Game, type Stock, type Raw } from "./types";
import { ownTowns, ownPieces } from "./selectors";
import { collector, harvestTiles } from "./maritime";
import { distance, expeditionFootprint } from "./world";

const goods = RAW.filter((g) => g !== "fish" && g !== "meat" && g !== "oil");
const equivalent = (g: Raw): Raw =>
  g === "fish" || g === "meat" ? "grain" : g === "oil" ? "coal" : g;
// Expected output, not a prediction of the hidden seed or reserved climate plan.
const climateOutput = Object.fromEntries(
  CLIMATES.map((climate) => {
    const info = CLIMATE_INFO[climate],
      output: Stock = {};
    const landWeight = info.terrain.reduce(
      (sum, [, weight]) => sum + weight,
      0,
    );
    const distribution = [
      ...info.terrain.map(
        ([biome, weight]) =>
          [biome, (info.land * weight) / landWeight] as const,
      ),
      ...waterProbabilities(climate).map(
        ([biome, chance]) => [biome, (1 - info.land) * chance] as const,
      ),
    ];
    for (const [biome, chance] of distribution) {
      const yields =
        biome === "woods"
          ? { lumber: 0.5, hides: 0.5 }
          : biomeYield(biome, climate);
      for (const [raw, count] of Object.entries(yields)) {
        const good = equivalent(raw as Raw);
        output[good] = (output[good] ?? 0) + count! * chance;
      }
    }
    return [climate, output];
  }),
) as Record<Climate, Stock>;

/** Score each frontier's visible climate against the faction's production gaps. */
export function expeditionProspects(s: Game, income: Stock) {
  const controlled = new Set(
    ownTowns(s).flatMap((t) => s.vertices[t.vertex].tiles),
  );
  for (const route of Object.values(s.routes))
    if (route.owner === s.active)
      for (const [tile, tier] of Object.entries(route.camps))
        if (tier) controlled.add(tile);
  for (const unit of ownPieces(s))
    if (collector(unit))
      for (const tile of harvestTiles(s, unit)) controlled.add(tile);
  const climates = new Set(
    [...controlled].map((id) => s.tiles[id].climate ?? "temperate"),
  );
  const production = (g: Raw) =>
    (RAW_SUBSTITUTES[g] ?? []).reduce(
      (n, raw) => n + (income[raw] ?? 0),
      income[g] ?? 0,
    );
  const missing = goods.filter((g) => production(g) < 0.04).length;
  const scores = new Map<Climate, number>();
  for (const climate of CLIMATES) {
    const output = climateOutput[climate];
    const resourceValue = goods.reduce(
      (sum, good) => sum + (output[good] ?? 0) / (1 + production(good) * 16),
      0,
    );
    scores.set(climate, resourceValue * 20 + (climates.has(climate) ? 0 : 7));
  }
  return {
    missing,
    score(vertex: string) {
      const adjacent = s.vertices[vertex].tiles;
      return (
        adjacent.reduce((sum, id) => {
          const climate = s.tiles[id].climate ?? "temperate";
          const next = CLIMATE_INFO[climate].compatible;
          const totalWeight = next.reduce(
            (total, c) => total + climateTransitionWeight(climate, c),
            0,
          );
          // Nearby climate is the strongest clue. Compatible transitions add a
          // modest long-term diversity value, never certainty of finding a good.
          return (
            sum +
            scores.get(climate)! * 0.8 +
            (next.reduce(
              (value, c) =>
                value + scores.get(c)! * climateTransitionWeight(climate, c),
              0,
            ) /
              Math.max(1, totalWeight)) *
              0.2
          );
        }, 0) / Math.max(1, adjacent.length)
      );
    },
  };
}

/** Test all six reveal directions only for the short-listed military frontier. */
export function expeditionApproach(
  s: Game,
  vertex: string,
  tier: number,
  targets: string[],
) {
  let best: { direction: number; score: number } | undefined;
  for (const direction of targets.length ? [0, 1, 2, 3, 4, 5] : [0]) {
    const footprint = expeditionFootprint(s, vertex, tier, direction);
    if (footprint.length !== [0, 10, 20, 40][tier]) continue;
    const score = targets.length
      ? maxValue(
          targets.map((target) => {
            const before = minValue(
              s.vertices[vertex].tiles.map((id) => distance(id, target)),
            );
            const after = minValue(footprint.map((id) => distance(id, target)));
            return Math.max(0, before - after) * 5;
          }),
        )
      : 0;
    if (!best || score > best.score) best = { direction, score };
  }
  return best;
}

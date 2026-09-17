import {
  GOODS,
  RAW,
  RAW_SUBSTITUTES,
  PROCESSED,
  type Game,
  type Good,
  type Stock,
} from "./types";
import { COSTS } from "./content";
import { income, inventory } from "./selectors";

const coverage = Object.fromEntries(
  GOODS.map((g) => [
    g,
    Object.values(COSTS).filter((c) => (c[g] ?? 0) > 0).length,
  ]),
) as Record<Good, number>;

/** Observable stocks plus six expected dice rolls of output. No hidden draws. */
export function marketValues(s: Game): Record<Good, number> {
  const supply = Object.fromEntries(GOODS.map((g) => [g, 0])) as Record<
    Good,
    number
  >;
  for (const p of s.players.filter((p) => p.alive)) {
    const stock = inventory(s, p.id),
      production = income(s, p.id);
    for (const g of GOODS)
      supply[g] += (stock[g] ?? 0) + 6 * (production[g] ?? 0);
  }
  const values = {} as Record<Good, number>;
  for (const group of [RAW, PROCESSED]) {
    const averageSupply =
      group.reduce((n, g) => n + supply[g], 0) / group.length;
    const averageDemand =
      group.reduce((n, g) => n + coverage[g], 0) / group.length;
    const base = group === RAW ? 1 : 2.5;
    for (const g of group) {
      const alternate = RAW_SUBSTITUTES[g];
      const available = supply[g] + (alternate ? supply[alternate] : 0);
      const scarcity = Math.max(
        0.55,
        Math.min(2.2, Math.sqrt((averageSupply + 12) / (available + 12))),
      );
      const demand = Math.max(
        0.8,
        Math.min(1.25, Math.sqrt(coverage[g] / averageDemand)),
      );
      values[g] = base * scarcity * demand;
    }
  }
  values.fish = values.grain;
  values.oil = values.coal;
  const rawBest = Math.max(
    ...RAW.filter((g) => g !== "gold").map((g) => values[g]),
  );
  const processedBest = Math.max(
    ...PROCESSED.filter((g) => g !== "goldbars").map((g) => values[g]),
  );
  values.gold = Math.max(rawBest, processedBest / 2) * 1.08;
  values.goldbars = Math.max(rawBest * 2, processedBest) * 1.08;
  return values;
}

export function marketStockValue(stock: Stock, values: Record<Good, number>) {
  return GOODS.reduce((n, g) => n + (stock[g] ?? 0) * values[g], 0);
}

/** Finite bundle utility: selling the last useful cards costs more than surplus. */
export function tradeValuation(
  s: Game,
  player: number,
  needs: Stock = {},
  prices = marketValues(s),
) {
  const stock = inventory(s, player),
    production = income(s, player);
  return (receive: Stock, give: Stock) => {
    let gain = 0,
      loss = 0;
    // Validate exact traded cards, then combine Grain/Fish and Coal/Oil reserves.
    if (
      GOODS.some(
        (g) =>
          (give[g] ?? 0) > (stock[g] ?? 0) ||
          (give[g] ?? 0) < 0 ||
          (receive[g] ?? 0) < 0 ||
          ((give[g] ?? 0) > 0 && (receive[g] ?? 0) > 0),
      )
    )
      return { gain: 0, loss: Infinity };
    for (const g of GOODS.filter((g) => g !== "fish" && g !== "oil")) {
      const alternate = RAW_SUBSTITUTES[g],
        held = (stock[g] ?? 0) + (alternate ? (stock[alternate] ?? 0) : 0),
        paid = (give[g] ?? 0) + (alternate ? (give[alternate] ?? 0) : 0),
        taken = (receive[g] ?? 0) + (alternate ? (receive[alternate] ?? 0) : 0),
        need = (needs[g] ?? 0) + (alternate ? (needs[alternate] ?? 0) : 0),
        output =
          (production[g] ?? 0) + (alternate ? (production[alternate] ?? 0) : 0);
      const replacement = 1 + 0.6 / (1 + 6 * output);
      const utility = (n: number) =>
        prices[g] *
        (replacement * 12 * Math.log1p(n / 12) + 0.85 * Math.min(n, need));
      if (taken) gain += utility(held + taken) - utility(held);
      if (paid) loss += utility(held) - utility(held - paid);
    }
    return { gain, loss };
  };
}
export function tradeEvaluation(
  s: Game,
  player: number,
  receive: Stock,
  give: Stock,
  needs: Stock = {},
  prices = marketValues(s),
) {
  return tradeValuation(s, player, needs, prices)(receive, give);
}

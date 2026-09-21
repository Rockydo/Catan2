import { GOODS, type Command, type Game, type Good, type Stock } from "./types";
import { bankRate } from "./selectors";

/** Buy the missing quantity in one legal lot, retaining all project inputs. */
export function bankOrderToward(
  s: Game,
  cost: Stock,
  stock: Stock,
  values: Record<Good, number>,
): Command | null {
  const deficits = GOODS.filter((g) => (cost[g] ?? 0) > (stock[g] ?? 0)).sort(
    (a, b) => values[b] - values[a],
  );
  for (const take of deficits) {
    const options = GOODS.filter(
      (give) =>
        give !== take &&
        (stock[give] ?? 0) - (cost[give] ?? 0) >=
          Math.max(1, bankRate(s, give, take)),
    )
      .map((give) => ({ give, rate: bankRate(s, give, take) }))
      .sort((a, b) => a.rate * values[a.give] - b.rate * values[b.give]);
    if (!options.length) continue;
    const { give, rate } = options[0],
      paid = Math.max(1, rate),
      received = rate < 1 ? 2 : 1,
      lots = Math.min(
        Math.ceil(((cost[take] ?? 0) - (stock[take] ?? 0)) / received),
        Math.floor(((stock[give] ?? 0) - (cost[give] ?? 0)) / paid),
      );
    return {
      type: "bank",
      give: { [give]: paid * lots },
      take: { [take]: received * lots },
    };
  }
  return null;
}

/** Cheap budget check using current rates; never changes stocks or the board. */
export function canFundAtBank(
  s: Game,
  cost: Stock,
  stock: Stock,
  values: Record<Good, number>,
): boolean {
  const remaining = { ...stock };
  for (let i = 0; i <= GOODS.length * GOODS.length; i++) {
    if (GOODS.every((g) => (remaining[g] ?? 0) >= (cost[g] ?? 0))) return true;
    const trade = bankOrderToward(s, cost, remaining, values);
    if (!trade) return false;
    for (const g of GOODS)
      remaining[g] =
        (remaining[g] ?? 0) - (trade.give?.[g] ?? 0) + (trade.take?.[g] ?? 0);
  }
  return false;
}

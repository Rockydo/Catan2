import type { Command, Game, Good, Stock, UnitClass, ShipClass } from "./types";
import { canApplyCommand } from "./engine";
import { unitCost, shipCost } from "./content";
import { inventory, recipePayment } from "./selectors";
import { canFundAtBank } from "./ai-bank";

/** Reserve a fundable batch, so imports do not buy one soldier's inputs at a
 * time. Economic units keep their single-unit production-site decisions. */
export function recruitmentFundingCost(
  s: Game,
  command: Command,
  desired: number | undefined,
  fallback: Stock,
  values: Record<Good, number>,
): Stock {
  if (!desired || desired <= 1 || !["recruit", "ship"].includes(command.type))
    return fallback;
  const naval = command.type === "ship",
    tier = command.tier ?? 1,
    bonuses = s.players[s.active].bonuses,
    free = naval
      ? bonuses.ships.filter(
          (v, i) =>
            v.includes(command.kind as ShipClass) &&
            tier === (bonuses.shipTiers?.[i] ?? bonuses.shipTier ?? 1),
        ).length
      : bonuses.recruits.filter(
          (v) =>
            v.tier === tier && v.classes.includes(command.kind as UnitClass),
        ).length,
    recipe = naval
      ? shipCost(command.kind as ShipClass, tier)
      : unitCost(command.kind as UnitClass, tier),
    stock = inventory(s),
    cost = (count: number): Stock =>
      recipePayment(
        s,
        Object.fromEntries(
          Object.entries(recipe).map(([g, n]) => [
            g,
            n! * Math.max(0, count - free),
          ]),
        ),
      );
  let low = 1,
    high = Math.min(Math.ceil(desired), naval ? Number.MAX_SAFE_INTEGER : 100);
  while (low < high) {
    const count = low + Math.ceil((high - low) / 2);
    if (canFundAtBank(s, cost(count), stock, values)) low = count;
    else high = count - 1;
  }
  return low > 1 ? cost(low) : fallback;
}

/** Expand an already selected, legal order to its planned need. Use the actual
 * transaction validator so commissions, substitutions and pooled stores all
 * count correctly. Failed probes never spend resources or advance the game. */
export function recruitmentBatch(
  s: Game,
  command: Command,
  desired = 1,
): Command {
  if (command.type !== "recruit" && command.type !== "ship") return command;
  const limit = Math.min(
    Math.max(1, Math.ceil(desired)),
    command.type === "recruit" ? 100 : Number.MAX_SAFE_INTEGER,
  );
  if (!Number.isSafeInteger(limit) || limit <= 1) return command;
  const order = (count: number) => ({ ...command, count });
  if (canApplyCommand(s, order(limit))) return order(limit);
  let low = 1,
    high = limit - 1;
  while (low < high) {
    const count = low + Math.ceil((high - low) / 2);
    if (canApplyCommand(s, order(count))) low = count;
    else high = count - 1;
  }
  return low > 1 ? order(low) : command;
}

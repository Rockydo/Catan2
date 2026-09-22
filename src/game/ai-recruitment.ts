import type { Command, Game, Good, Stock, UnitClass, ShipClass } from "./types";
import { canApplyCommand } from "./engine";
import { unitCost, shipCost } from "./content";
import { inventory, recipePayment } from "./selectors";
import { canFundAtBank, bankOrderToward } from "./ai-bank";

/** Reserve a fundable batch, so imports do not buy one soldier's inputs at a
 * time. Collection orders use small proportional batches at their chosen production site. */
export function recruitmentFundingTarget(
  s: Game,
  command: Command,
  desired: number | undefined,
  fallback: Stock,
  values: Record<Good, number>,
): { cost: Stock; count: number } {
  if (!desired || desired <= 1 || !["recruit", "ship"].includes(command.type))
    return { cost: fallback, count: 1 };
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
  return { cost: low > 1 ? cost(low) : fallback, count: low };
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

/** Keep early development precise. In a mature collection economy, add at
 * most 5% of its existing tier-weighted capacity before reassessing production,
 * military priorities and deployment. This is a batch size, never a unit cap. */
export function collectionBatchSize(
  existingTiers: number,
  tier: number,
): number {
  return Math.max(1, Math.min(100, Math.floor(existingTiers / (20 * tier))));
}

export function recruitmentFundingCost(
  s: Game,
  command: Command,
  desired: number | undefined,
  fallback: Stock,
  values: Record<Good, number>,
): Stock {
  return recruitmentFundingTarget(s, command, desired, fallback, values).cost;
}

export interface RecruitmentIntent {
  command: Command;
  /** Fixed, fully fundable inputs. Imports never sell these reserved cards. */
  cost: Stock;
}
export function recruitmentIntentOrder(
  s: Game,
  intent: RecruitmentIntent,
  values: Record<Good, number>,
): Command | null {
  if (canApplyCommand(s, intent.command)) return intent.command;
  const trade = bankOrderToward(s, intent.cost, inventory(s), values);
  return trade && canApplyCommand(s, trade) ? trade : null;
}

import type { Command, Game, Good, Stock } from "./types";
import { campCost } from "./content";
import { canApplyCommand } from "./engine";
import {
  guildCost,
  guildOrderQuote,
  orderFromCommand,
  townGuilds,
} from "./guilds";
import { guildMilitaryOrder } from "./guild-ai";
import { tileGood } from "./maritime";
import { emergencyTarget } from "./relations";
import { affordable, inventory, ownTowns, recipePayment } from "./selectors";

export interface WorkProject {
  action: Command;
  cost: Stock;
  score: number;
}
export interface EconomicWorkQueue {
  orders: Command[];
  budget: Stock;
  active: number;
  turn: number;
  threat?: number;
  alliances: string;
  priority?: Command;
  reserve: Stock;
}
const production = new Set([
  "artisans",
  "prospectors",
  "farmers",
  "extractors",
]);
const family = (command: Command) =>
  command.type === "camp" || command.type === "guild"
    ? command.type
    : command.type === "guild-order" && production.has(command.guild ?? "")
      ? `production/${command.guild}`
      : undefined;

/** Mature economies may commission a small set of similarly ranked jobs from
 * one strategic decision. Following jobs use at most 20% of unreserved starting
 * materials, minus the first order. No job borrows against expected output. */
export function planEconomicWork(
  s: Game,
  selected: WorkProject,
  projects: readonly WorkProject[],
  priority?: WorkProject,
): EconomicWorkQueue | undefined {
  const kind = family(selected.action),
    towns = ownTowns(s).length;
  if (
    !kind ||
    towns < 6 ||
    s.players[s.active].control === "human" ||
    s.players[s.active].hand.length
  )
    return;
  const stock = inventory(s);
  const budget: Stock = {};
  for (const [good, amount] of Object.entries(stock))
    budget[good as Good] = Math.floor(
      Math.max(0, amount! - (priority?.cost[good as Good] ?? 0)) / 5,
    );
  // The already selected order always runs. It cannot create extra credit for
  // following jobs when it alone uses more than this material's batch budget.
  for (const [good, amount] of Object.entries(selected.cost))
    budget[good as Good] = Math.max(0, (budget[good as Good] ?? 0) - amount!);
  const orders = projects
    .filter(
      (p) =>
        p !== selected &&
        family(p.action) === kind &&
        p.score >= selected.score * 0.9 &&
        Object.entries(p.cost).every(
          ([good, amount]) => amount! <= (budget[good as Good] ?? 0),
        ),
    )
    .slice(0, Math.min(31, Math.floor(towns / 2) - 1))
    .map((p) => ({ ...p.action }));
  if (!orders.length) return;
  return {
    orders,
    budget,
    active: s.active,
    turn: s.players[s.active].turns,
    threat: emergencyTarget(s),
    alliances: JSON.stringify(s.alliances),
    priority: priority?.action,
    reserve: priority?.cost ?? {},
  };
}
function quote(s: Game, command: Command) {
  if (command.type === "camp") {
    const route = s.routes[command.edge ?? ""],
      tile = s.tiles[command.tile ?? ""];
    if (!route || !tile) return;
    const raw = tileGood(tile, s.active);
    if (!raw) return;
    return { cost: campCost(raw, (route.camps[tile.id] ?? 0) + 1) };
  }
  const town = s.towns[command.town ?? ""];
  if (!town) return;
  const guild = townGuilds(town).find(
    (g) => g.kind === (command.guild ?? command.kind),
  );
  if (command.type === "guild")
    return {
      cost: guildCost(
        command.kind as NonNullable<typeof guild>["kind"],
        (guild?.tier ?? 0) + 1,
      ),
    };
  if (!guild) return;
  return guildOrderQuote(s, { ...town, guild }, orderFromCommand(command));
}

/** Every queued order still pays its real recipe and passes the engine rules.
 * Newly affordable military supply takes precedence over further production.
 * Queues expire at turn, diplomacy, prompt or player-control boundaries. */
export function economicWorkOrder(
  s: Game,
  work: EconomicWorkQueue,
  values: Record<Good, number>,
): Command | null {
  if (
    s.active !== work.active ||
    s.players[s.active].turns !== work.turn ||
    s.players[s.active].control === "human" ||
    s.phase !== "economy" ||
    s.battle ||
    s.trade ||
    s.allianceOffer ||
    s.researchChoice ||
    s.players[s.active].hand.length ||
    emergencyTarget(s) !== work.threat ||
    JSON.stringify(s.alliances) !== work.alliances
  )
    return null;
  if (
    work.priority &&
    affordable(s, recipePayment(s, work.reserve)) &&
    canApplyCommand(s, work.priority)
  )
    return null;
  if (work.orders[0]?.type === "guild-order" && guildMilitaryOrder(s))
    return null;
  while (work.orders.length) {
    const command = work.orders.shift()!;
    let offer;
    try {
      offer = quote(s, command);
    } catch {
      continue;
    }
    if (!offer) continue;
    const cost = recipePayment(s, offer.cost);
    if (
      Object.entries(cost).some(
        ([good, amount]) => amount! > (work.budget[good as Good] ?? 0),
      ) ||
      !affordable(s, cost) ||
      Object.entries(work.reserve).some(([g, amount]) => {
        const have = inventory(s)[g as Good] ?? 0;
        return have - (cost[g as Good] ?? 0) < Math.min(have, amount!);
      })
    )
      continue;
    if ("gain" in offer && offer.gain) {
      const value = (stock: Stock) =>
        Object.entries(stock).reduce(
          (n, [g, amount]) => n + amount! * values[g as Good],
          0,
        );
      // Keep checking marginal utility as the stores fill. A production queue
      // never keeps converting an input after the recipe stops being useful.
      if (value(offer.gain) - value(cost) <= 0.15) continue;
    }
    if (!canApplyCommand(s, command)) continue;
    for (const [good, amount] of Object.entries(cost))
      work.budget[good as Good]! -= amount!;
    return command;
  }
  return null;
}

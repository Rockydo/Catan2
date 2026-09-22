import { appendValues, maxValue, minValue } from "./aggregate";
import { isSettler } from "./content";
import type {
  Command,
  Game,
  Good,
  GuildOrder,
  Piece,
  Stock,
  Town,
} from "./types";
import { COSTS, RESEARCH_NAMES } from "./content";
import { RAW } from "./types";
import {
  GUILD_KINDS,
  GUILDS,
  TRADE_RAW,
  TRADE_PROCESSED,
  economicGuild,
  guildCost,
  guildSupplyMovement,
  guildOrderQuote,
  guildPlacementError,
  guildReadyError,
  guildTierUsed,
  guildUnits,
  mineralTiles,
  townGuilds,
  guildCapacity,
  extractionGuild,
  extractionTiles,
  orderCommand,
} from "./guilds";
import {
  affordable,
  blockAt,
  besieged,
  ownTowns,
  ownPiecesAtVertex,
  planningValue,
  points,
  recipePayment,
  siegeRequirement,
  routeSites,
  speed,
} from "./selectors";
import { planningDistance } from "./ai-paths";
import { warTarget } from "./ai-strategy";
import {
  neighbors,
  walkableAtVertex as landAtVertex,
  canOccupy,
} from "./world";
import { collector } from "./maritime";
const stockValue = (stock: Stock, values: Record<Good, number>) =>
  Object.entries(stock).reduce(
    (n, [good, amount]) => n + amount! * values[good as Good],
    0,
  );
interface Project {
  action: Command;
  cost: Stock;
  score: number;
  label: string;
}
const routeDemandCache = new WeakMap<Game, boolean>();
function routeDemand(s: Game) {
  if (!routeDemandCache.has(s))
    routeDemandCache.set(
      s,
      !!(routeSites(s, "road").length || routeSites(s, "route").length),
    );
  return routeDemandCache.get(s)!;
}
type EconomicOrder = { order: GuildOrder; cost: Stock; value: number };
function economicOrders(
  s: Game,
  town: Town,
  values: Record<Good, number>,
  cache: Map<string, EconomicOrder[]>,
  tiers: number[],
) {
  const g = town.guild!,
    candidates: GuildOrder[] = [],
    // Non-extraction contracts depend on faction stocks, not which city hosts
    // them. Quote them once for all matching guilds in this planning decision.
    key = `${town.owner}/${g.kind}/${g.tier}/${tiers.join(",")}`,
    cached = !extractionGuild(g.kind) && cache.get(key);
  if (cached)
    return cached.map(({ order, cost, value }) => ({
      action: orderCommand(town, order),
      cost,
      value,
    }));
  if (extractionGuild(g.kind))
    appendValues(
      candidates,
      extractionTiles(s, town)
        .filter((tile) => !blockAt(s, tile, town.owner))
        .map((tile) => ({ tile })),
    );
  if (
    g.kind === "builders" &&
    s.players[town.owner].bonuses.routes < 2 &&
    routeDemand(s)
  )
    candidates.push({});
  if (
    g.kind === "scholars" &&
    !s.researchChoice &&
    s.players[town.owner].hand.length < 2
  )
    candidates.push({});
  if (g.kind === "artisans")
    appendValues(
      candidates,
      RAW.map((raw) => ({ raw })),
    );
  if (g.kind === "merchants") {
    for (const pool of g.tier === 3
      ? [TRADE_RAW, TRADE_PROCESSED]
      : [TRADE_RAW]) {
      const low = [...pool].sort((a, b) => values[a] - values[b]).slice(0, 3),
        high = [...pool].sort((a, b) => values[b] - values[a]).slice(0, 3);
      for (const give of low)
        for (const take of high)
          if (give !== take) candidates.push({ give, take });
    }
  }
  const quoted = candidates
    .flatMap((order) =>
      tiers
        .filter(
          (tier) =>
            g.kind !== "merchants" ||
            tier === 3 ||
            !order.give ||
            TRADE_RAW.includes(order.give as (typeof TRADE_RAW)[number]),
        )
        .map((tier) => ({ ...order, tier })),
    )
    .flatMap((order) => {
      try {
        const quote = guildOrderQuote(s, town, order),
          cost =
            g.kind === "merchants"
              ? quote.cost
              : recipePayment(s, quote.cost, town.owner),
          value =
            stockValue(quote.gain, values) +
            quote.routes *
              (values.lumber + Math.min(values.brick, values.wool)) *
              0.65 +
            (quote.researchTier
              ? stockValue(
                  COSTS[`Research ${RESEARCH_NAMES[quote.researchTier]}`],
                  values,
                ) * 0.7
              : 0) -
            stockValue(cost, values);
        return [{ order, cost, value }];
      } catch {
        return [];
      }
    })
    .sort((a, b) => b.value - a.value);
  if (!extractionGuild(g.kind)) cache.set(key, quoted);
  return quoted.map(({ order, cost, value }) => ({
    action: orderCommand(town, order),
    cost,
    value,
  }));
}
function suppliedFormation(s: Game, town: Town, planningConstruction = false) {
  const g = town.guild!,
    naval = g.kind === "navigators";
  // Construction opens next turn: newly recruited or already moved formations
  // still justify a depot. Actual orders keep strict readiness validation.
  const units = planningConstruction
    ? ownPiecesAtVertex(s, town.vertex, town.owner).filter(
        (u) => u.naval === naval,
      )
    : guildUnits(s, town);
  if (!units.length) return undefined;
  const groups = new Map<string, Piece[]>();
  for (const u of units) {
    if (!groups.has(u.tile)) groups.set(u.tile, []);
    groups.get(u.tile)!.push(u);
  }
  const enemies = planningValue(s, `guildEnemies/${s.active}`, () =>
    Object.values(s.towns).filter((t) => warTarget(s, t.owner)),
  );
  const targets = planningValue(s, `guildTargets/${s.active}/${naval}`, () => [
    ...new Set(
      naval
        ? [
            ...Object.values(s.pieces)
              .filter((u) => u.naval && warTarget(s, u.owner))
              .map((u) => u.tile),
            ...enemies
              .flatMap((t) => landAtVertex(s, t.vertex).flatMap(neighbors))
              .filter((id) => canOccupy(s.tiles[id], true)),
          ]
        : enemies.flatMap((t) => landAtVertex(s, t.vertex)),
    ),
  ]);
  let best: { ids: string[]; value: number } | undefined;
  for (const [tile, group] of groups) {
    if (group.every((u) => collector(u) || isSettler(u.kind))) continue;
    const selected = group;
    const remaining = minValue(
      selected.map((u) =>
        planningConstruction ? speed(u) : speed(u) + u.bonus - u.moved,
      ),
    );
    if (g.kind === "engineers") {
      const value = maxValue([
        0,
        ...enemies
          .filter((t) =>
            landAtVertex(s, t.vertex).some((to) =>
              Number.isFinite(planningDistance(s, tile, to, false, town.owner)),
            ),
          )
          .map((t) => Math.min(g.tier * 2, siegeRequirement(s, t, group)) * 8),
      ]);
      if (value > 0 && (!best || value > best.value))
        best = { ids: selected.map((u) => u.id), value };
      continue;
    }
    const needsMovement = targets.some((to) => {
      const distance = planningDistance(s, tile, to, naval, town.owner);
      return Number.isFinite(distance) && distance > remaining;
    });
    if (!needsMovement) continue;
    const value =
      selected.reduce((n, u) => n + Math.max(1, points(u)), 0) *
      guildSupplyMovement(g.tier);
    if (!best || value > best.value)
      best = { ids: selected.map((u) => u.id), value };
  }
  return best;
}
/** Military supply is optional and purpose-driven; does not refund spent movement; ordinary combat evaluation still decides whether to fight. */
export function guildMilitaryOrder(
  s: Game,
  engineersOnly = false,
): Command | null {
  for (const city of ownTowns(s))
    for (const g of townGuilds(city)) {
      const town = { ...city, guild: g };
      if (engineersOnly && g.kind !== "engineers") continue;
      if (
        !town.guild ||
        economicGuild(town.guild.kind) ||
        guildReadyError(s, town)
      )
        continue;
      for (let tier = town.guild.tier; tier >= 1; tier--) {
        if (guildTierUsed(town.guild, tier)) continue;
        const view = { ...town, guild: { ...town.guild, tier } };
        const formation = suppliedFormation(s, view);
        if (!formation) continue;
        const quote = guildOrderQuote(s, town, { tier }, formation.ids);
        if (affordable(s, recipePayment(s, quote.cost)))
          return {
            type: "guild-order",
            town: town.id,
            guild: g.kind,
            ids: formation.ids,
            tier,
          };
      }
    }
  return null;
}
export function guildEconomyProjects(
  s: Game,
  values: Record<Good, number>,
): Project[] {
  const projects: Project[] = [],
    quotes = new Map<string, EconomicOrder[]>();
  for (const town of ownTowns(s)) {
    if (town.level < 2 || besieged(s, town.id)) continue;
    const guilds = townGuilds(town);
    for (const g of guilds) {
      const view = { ...town, guild: g };
      if (economicGuild(g.kind) && !guildReadyError(s, view)) {
        const best = economicOrders(
          s,
          view,
          values,
          quotes,
          Array.from({ length: g.tier }, (_, i) => i + 1).filter(
            (tier) => !guildTierUsed(g, tier),
          ),
        ).filter((o) => o.value > 0.15);
        // Prefer an affordable productive order; don't let one missing input block all alternatives.
        const order = best.find((o) => affordable(s, o.cost)) ?? best[0];
        if (order)
          projects.push({
            action: order.action,
            cost: order.cost,
            score: 12 + order.value * 7,
            label: `Operate ${GUILDS[g.kind].name}`,
          });
      }
    }
    if (s.players[s.active].turns < 5) continue;
    for (const kind of GUILD_KINDS) {
      const g = guilds.find((g) => g.kind === kind);
      if (
        (!g && guilds.length >= guildCapacity(town)) ||
        (g && g.tier >= guildCapacity(town))
      )
        continue;
      if (guildPlacementError(s, town, kind)) continue;
      const tier = (g?.tier ?? 0) + 1;
      const next: Town = {
        ...town,
        guild: { kind, tier, born: 0, used: false, auto: false },
      };
      let benefit = 0;
      if (economicGuild(kind)) {
        // Upgrading adds a separate order; lower-tier income is retained.
        const orders = economicOrders(s, next, values, quotes, [tier]);
        benefit = Math.max(0, orders[0]?.value ?? 0) * 6;
      } else {
        const formation = suppliedFormation(s, next, true);
        const current = g
          ? (suppliedFormation(s, { ...town, guild: g }, true)?.value ?? 0)
          : 0;
        if (formation)
          benefit = Math.min(60, Math.max(0, formation.value - current) * 5);
      }
      if (benefit <= 0) continue;
      const cost = guildCost(kind, tier);
      projects.push({
        action: { type: "guild", town: town.id, kind },
        cost: recipePayment(s, cost),
        score: benefit / (1 + stockValue(cost, values) / 15),
        label: `Develop ${GUILDS[kind].name}`,
      });
    }
  }
  return projects.sort((a, b) => b.score - a.score);
}

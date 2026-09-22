import { appendValues, maxValue, minValue } from "./aggregate";
import {
  recruitmentBatch,
  recruitmentFundingCost,
  collectionBatchSize,
  recruitmentFundingTarget,
  recruitmentIntentOrder,
  type RecruitmentIntent,
} from "./ai-recruitment";
import { bankOrderToward } from "./ai-bank";
import { cachedMilitaryWait } from "./ai-maneuvers";
import { colonistAction, colonistProjects } from "./ai-colonization";
import {
  seasonalDestinationSafe,
  seasonalDiversityBonus,
  seasonalEvacuation,
  seasonalRescueWaiting,
  withSeasonalPlanning,
} from "./ai-seasonal";
import { isSettler } from "./content";
import { canChooseWoods } from "./selectors";
import { allianceResponder, friendly, emergencyTarget } from "./relations";
import { acceptsAlliance } from "./diplomacy";
import { guildEconomyProjects, guildMilitaryOrder } from "./guild-ai";
import { aiExpeditionAllowed, isCornered } from "./ai-expansion";
import { expeditionProspects, expeditionApproach } from "./ai-exploration";
import { RESEARCH_GOODS, RESEARCH_MARCH } from "./content";
import {
  tileGood,
  tileGoods,
  tileYield,
  workshopYield,
  terrainFamily,
  productiveAtVertex,
  collector,
  harvestTiles,
  harvestYield,
  towerSites,
  towerDefense,
  towerPower,
} from "./maritime";
import { shipStats, shipCost, TOWER_COSTS } from "./content";
import { recipePayment, withPlanningFrame, planningValue } from "./selectors";
import {
  marketValues,
  marketStockValue,
  tradeEvaluation,
  tradeValuation,
} from "./ai-market";
import {
  factionStrengths,
  leaderPressure,
  dominance,
  warTarget,
  coalitionSupport,
  townThreats,
  threatPower,
  townGuardPower,
  urgentTownDefense,
  minimumFieldPower,
  campaignPowerTarget,
  conquestDrive,
  leavesTownExposed,
} from "./ai-strategy";
import {
  GOODS,
  RAW,
  RAW_SUBSTITUTES,
  PROCESSED,
  type Game,
  type Command,
  type Stock,
  type Good,
  type Piece,
  type UnitClass,
  type Raw,
  type ShipClass,
} from "./types";
import {
  COSTS,
  TERRAIN,
  UNIT_INFO,
  SHIP_INFO,
  CARDS,
  RESEARCH_RECRUITS,
  RESEARCH_SHIPS,
  RESEARCH_EXPEDITIONS,
  CITY_RECIPES,
  WALL_NAMES,
  extensionCost,
  campCost,
  unitCost,
  processedFor,
  RESEARCH_NAMES,
  expeditionCost,
} from "./content";
import {
  neighbors,
  hash,
  distance,
  walkableAtVertex,
  canOccupy,
  waterAtVertex,
  vertexNeighbors,
  unknownAtVertex,
} from "./world";
import {
  ownTowns,
  ownPieces,
  inventory,
  income,
  probability,
  settlementSites,
  canRoute,
  routeKind,
  routeSites,
  bankRate,
  affordable,
  effectiveCost,
  piecesAt,
  combatantsAt,
  hostileAt,
  blockAt,
  points,
  power,
  bombardmentPower,
  fleetDefenders,
  bombardmentTargets,
  ready,
  fresh,
  speed,
  moveTargets,
  retreatOptions,
  casualtySelection,
  sumStock,
  protects,
  besieged,
  expeditionSites,
  siegeRequirement,
  siegePower,
  canBesiege,
  towerSiegeRequirement,
  townAt,
} from "./selectors";
import { canApplyCommand } from "./engine";
import {
  planningPath as pathTo,
  planningDistance,
  planningReachable as reachable,
} from "./ai-paths";
import {
  campaignTransportAction,
  campaignTransportDemand,
} from "./ai-transport";

// Each town is considered by many groups, tiers and targets in one decision.
const landAtVertex = (s: Game, vertex: string) =>
  planningValue(s, `walkableTown/${vertex}`, () => walkableAtVertex(s, vertex));

interface Project {
  action: Command;
  cost: Stock;
  score: number;
  label: string;
  urgent?: boolean;
  /** Units needed before this recruitment priority should be reassessed. */
  quantity?: number;
}
export function marginalValues(s: Game, p = s.active): Record<Good, number> {
  const inc = income(s, p),
    stock = inventory(s, p),
    values = {} as Record<Good, number>;
  for (const g of GOODS) {
    const raw = RAW.includes(g as Raw),
      base = raw ? 1 : 3.5,
      need = ["lumber", "brick", "grain", "ore", "wool"].includes(g) ? 1.5 : 1,
      alternates = RAW_SUBSTITUTES[g] ?? [],
      production = alternates.reduce(
        (n, raw) => n + (inc[raw] ?? 0),
        inc[g] ?? 0,
      ),
      held = alternates.reduce(
        (n, raw) => n + (stock[raw] ?? 0),
        stock[g] ?? 0,
      );
    values[g] =
      (base * need * (1 + 1 / (1 + 7 * production))) / (1 + held / 18);
  }
  values.fish = values.grain;
  values.meat = values.grain;
  values.oil = values.coal;
  const rawBest = maxValue(
    RAW.filter((g) => g !== "gold").map((g) => values[g]),
  );
  const processedBest = maxValue(
    PROCESSED.filter((g) => g !== "goldbars").map((g) => values[g]),
  );
  values.gold = Math.max(rawBest, processedBest / 2) * 1.12;
  values.goldbars = Math.max(rawBest * 2, processedBest) * 1.12;
  return values;
}
function stockValue(stock: Stock, values: Record<Good, number>) {
  return GOODS.reduce((n, g) => n + (stock[g] ?? 0) * values[g], 0);
}
function tradeNeeds(s: Game, player: number): Stock {
  return planningValue(s, `tradeNeeds/${player}`, () => {
    const view =
      player === s.active
        ? s
        : { ...s, active: player, phase: "economy" as const };
    const projects =
      view === s
        ? economyProjects(s)
        : withPlanningFrame(view, () => economyProjects(view));
    return (projects.find((p) => p.urgent) ?? projects[0])?.cost ?? {};
  });
}
export function shouldAcceptTrade(s: Game): boolean {
  const t = s.trade;
  if (!t || GOODS.some((g) => t.give[g] && t.take[g])) return false;
  if (emergencyTarget(s, t.to) === t.from) return false;
  const prices = marketValues(s),
    needs = tradeNeeds(s, t.to);
  const { gain, loss } = tradeEvaluation(
    s,
    t.to,
    t.give,
    t.take,
    needs,
    prices,
  );
  const support = coalitionSupport(s, t.from, t.to);
  const premium =
    Math.max(0.35, 1.08 - support * 0.73) +
    Math.min(0.8, leaderPressure(s, t.from, t.to) - 1) * 0.65;
  // A survival concession cannot drain the donor or consume its next project.
  if (
    support > 0 &&
    (gain < loss * 1.08 ||
      marketStockValue(t.give, prices) < marketStockValue(t.take, prices) * 0.8)
  ) {
    const stock = inventory(s, t.to);
    if (
      sumStock(t.take) > 6 ||
      marketStockValue(t.take, prices) >
        marketStockValue(stock, prices) * 0.15 ||
      GOODS.some(
        (g) =>
          (t.take[g] ?? 0) > 0 &&
          (stock[g] ?? 0) - t.take[g]! < (needs[g] ?? 0) + 1,
      )
    )
      return false;
  }
  // A personal shortage does not justify giving away globally scarce goods.
  return (
    loss > 0 &&
    gain >= loss * premium &&
    marketStockValue(t.give, prices) >=
      marketStockValue(t.take, prices) * (0.8 - support * 0.5)
  );
}

function check(s: Game, c: Command) {
  if (
    c.type === "move" &&
    c.to &&
    c.ids?.length &&
    !seasonalDestinationSafe(s, c.to, s.pieces[c.ids[0]]?.naval ?? false)
  )
    return false;
  return canApplyCommand(s, c);
}
function armyGroups(
  s: Game,
  p = s.active,
  freshOnly = false,
  mobileOnly = false,
): Piece[][] {
  const groups = new Map<string, Piece[]>();
  for (const u of ownPieces(s, p)) {
    if (
      (collector(u) &&
        !(emergencyTarget(s, p) !== undefined && u.naval && points(u) > 0)) ||
      isSettler(u.kind) ||
      seasonalRescueWaiting(s, u) ||
      (mobileOnly && speed(u) + u.bonus - u.moved < 1) ||
      (freshOnly ? !fresh(s, u) : !ready(s, u))
    )
      continue;
    const id = `${u.tile}/${u.naval}`;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id)!.push(u);
  }
  return [...groups.values()];
}
function bestGoods(
  s: Game,
  count: number,
  processed = false,
  maxTypes = count,
): Stock {
  const values = marginalValues(s),
    pool = processed ? PROCESSED : RAW,
    rank = [...pool].sort((a, b) => values[b] - values[a]);
  const out: Stock = {};
  for (let n = 0; n < count; n++) {
    const g = rank[n % Math.min(maxTypes, rank.length)];
    out[g] = (out[g] ?? 0) + 1;
  }
  return out;
}
/** Values use our economy and the public board, never rival hands or deck order. */
export function researchUtility(s: Game, kind: string): number {
  const towns = ownTowns(s).filter((t) => !besieged(s, t.id));
  const level = maxValue([0, ...towns.map((t) => t.turnLevel)]);
  const reward = RESEARCH_GOODS[kind];
  if (reward) return 9 + reward.total * (reward.processed ? 2.5 : 1.6);
  if (RESEARCH_RECRUITS[kind]) {
    const reward = RESEARCH_RECRUITS[kind];
    return level >= reward.tier ? (kind === "caravan" ? 22 : 34) : 0;
  }
  if (RESEARCH_SHIPS[kind]) {
    const reward = RESEARCH_SHIPS[kind];
    return towns.some(
      (t) =>
        t.turnLevel >= reward.tier &&
        waterAtVertex(s, t.vertex).some((id) => !hostileAt(s, id)),
    )
      ? 19 + reward.tier * reward.count * 3
      : 0;
  }
  if (kind === "palisade") return 14;
  if (kind === "merchant") {
    const stock = inventory(s),
      values = marginalValues(s);
    const best = maxValue(RAW.map((g) => values[g]));
    return maxValue([
      0,
      ...RAW.map((g) => Math.min(6, stock[g] ?? 0) * (best - values[g]) * 3),
    ]);
  }
  if (kind === "roads")
    return routeSites(s, "road").length || routeSites(s, "route").length
      ? 19
      : 0;
  if (["industry", "workshops"].includes(kind))
    return towns.some((t) =>
      productiveAtVertex(s, t.vertex).some(
        (id) => !blockAt(s, id) && (t.extensions[id] ?? 0) + 1 < t.level,
      ),
    )
      ? kind === "industry"
        ? 30
        : 22
      : 0;
  if (kind === "civic" || kind === "masonry")
    return towns.some((t) => t.level < 4 || t.wall < t.level)
      ? kind === "masonry"
        ? 22
        : 36
      : 0;
  if (["levy", "volunteers", "skilled", "muster"].includes(kind)) {
    const required = kind === "levy" ? 1 : kind === "volunteers" ? 2 : 3;
    if (level < required) return 0;
    const shortage =
      campaignPowerTarget(s) -
      ownPieces(s)
        .filter((u) => !u.naval)
        .reduce((n, u) => n + points(u), 0);
    return (shortage > 0 ? 23 : 11) + CARDS[kind].tier * 2;
  }
  if (["patrol", "naval", "admiralty"].includes(kind)) {
    const tier = CARDS[kind].tier;
    return towns.some(
      (t) =>
        t.turnLevel >= tier &&
        waterAtVertex(s, t.vertex).some((id) => !hostileAt(s, id)),
    )
      ? 20 + tier * 3
      : 0;
  }
  if (RESEARCH_EXPEDITIONS[kind])
    return aiExpeditionAllowed(s) &&
      !s.players[s.active].expeditionUsed &&
      (expeditionSites(s, "land").length || expeditionSites(s, "sea").length)
      ? (15 + RESEARCH_EXPEDITIONS[kind] * 6 + (kind === "frontier" ? 15 : 0)) *
          0.65
      : 0;
  if (kind === "engineers" || kind === "campaign") {
    if (researchSieges(s).length) return kind === "engineers" ? 32 : 38;
    if (kind === "engineers") return 0;
  }
  if (RESEARCH_MARCH[kind]) {
    return armyGroups(s).some((group) =>
      Object.values(s.towns).some(
        (t) =>
          warTarget(s, t.owner) &&
          s.vertices[t.vertex].tiles.some(
            (id) =>
              distance(group[0].tile, id) <= 6 + RESEARCH_MARCH[kind].movement,
          ),
      ),
    )
      ? 12 + RESEARCH_MARCH[kind].movement * 2 + RESEARCH_MARCH[kind].groups * 2
      : 0;
  }
  return 0;
}
function researchInvestment(s: Game, tier: number): number {
  const choices = Object.keys(CARDS)
    .filter((k) => CARDS[k].tier === tier)
    .map((k) => researchUtility(s, k));
  let total = 0,
    count = 0;
  // Expected best of two distinct effects, averaged over every equally likely pair.
  for (let a = 0; a < choices.length; a++)
    for (let b = a + 1; b < choices.length; b++) {
      total += Math.max(choices[a], choices[b]);
      count++;
    }
  const price = stockValue(
    COSTS[`Research ${RESEARCH_NAMES[tier]}`],
    marginalValues(s),
  );
  return (
    // Prefer tangible development; additional purchases this turn need an
    // especially good opportunity. This is a preference, not a purchase cap.
    (total * 0.75 * (s.players[s.active].researchBought ? 0.5 : 1)) /
    Math.max(1, count) /
    (1 + price / 30) /
    (1 + s.players[s.active].hand.length * 0.5)
  );
}

function researchSieges(s: Game) {
  return armyGroups(s, s.active, true)
    .filter((g) => !g[0].naval)
    .flatMap((group) =>
      Object.values(s.towns)
        .filter((t) => {
          const siege = s.sieges[`${s.active}:${t.id}`];
          return (
            warTarget(s, t.owner) &&
            s.vertices[t.vertex].tiles.includes(group[0].tile) &&
            group.some((u) => points(u) > 0) &&
            !protects(s, t) &&
            siege?.raided == null &&
            siege?.last !== s.players[s.active].turns &&
            siegeRequirement(s, t, group) > (siege?.progress ?? 0)
          );
        })
        .map((town) => ({ town, group })),
    );
}

export function researchAction(s: Game, cardId: string): Command | null {
  const card = s.players[s.active].hand.find((c) => c.id === cardId);
  if (!card) return null;
  const base: Command = { type: "play-research", card: cardId };
  switch (card.kind) {
    case "harvest":
    case "supplies":
    case "craftsmen":
    case "guild":
    case "grand": {
      const reward = RESEARCH_GOODS[card.kind];
      return {
        ...base,
        goods: bestGoods(s, reward.total, reward.processed, reward.types),
      };
    }
    case "merchant": {
      const stock = inventory(s),
        values = marginalValues(s),
        give = [...RAW]
          .filter((g) => (stock[g] ?? 0) > 0)
          .sort((a, b) => values[a] - values[b])[0],
        take = [...RAW].sort((a, b) => values[b] - values[a])[0];
      if (!give || give === take) return null;
      const n = Math.min(6, stock[give] ?? 0);
      return { ...base, give: { [give]: n }, take: { [take]: n } };
    }
    case "march":
    case "logistics":
    case "coordinated":
    case "campaign": {
      const siege = card.kind === "campaign" ? researchSieges(s)[0] : undefined;
      const groups = armyGroups(s).filter(
        (g) => !siege || g[0].tile !== siege.group[0].tile,
      );
      if (!groups.length && !siege) return null;
      return {
        ...base,
        ids: groups
          .slice(0, RESEARCH_MARCH[card.kind].groups)
          .flatMap((g) => g.map((u) => u.id)),
        ...(siege
          ? { town: siege.town.id, siegeIds: siege.group.map((u) => u.id) }
          : {}),
      };
    }
    case "engineers":
      for (const { town, group } of researchSieges(s)) {
        const action = { ...base, ids: group.map((u) => u.id), town: town.id };
        if (check(s, action)) return action;
      }
      return null;
    case "muster":
      return {
        ...base,
        mode: ownTowns(s).some((t) => t.turnLevel >= 4) ? "one" : "two",
      };
    default:
      return base;
  }
}

/** Route search observes only revealed edges. It never calls the tile generator. */
export function expansionPaths(
  s: Game,
): Map<string, { cost: number; first: string; kind: "road" | "route" }> {
  const out = new Map<
    string,
    { cost: number; first: string; kind: "road" | "route" }
  >();
  type Visit = {
    v: string;
    kind: "road" | "route";
    cost: number;
    first: string;
    firstKind: "road" | "route";
  };
  // Costs are small non-negative integers. FIFO buckets preserve the old
  // stable cheapest-first ordering without sorting the entire queue per edge.
  const buckets: Visit[][] = [],
    cursors: number[] = [];
  const enqueue = (visit: Visit) => {
    (buckets[visit.cost] ??= []).push(visit);
  };
  for (const t of ownTowns(s))
    for (const kind of ["road", "route"] as const)
      enqueue({ v: t.vertex, kind, cost: 0, first: "", firstKind: kind });
  for (const r of Object.values(s.routes))
    if (r.owner === s.active)
      for (const v of s.edges[r.edge].vertices)
        if (!townAt(s, v) || townAt(s, v)!.owner === s.active)
          enqueue({
            v,
            kind: r.kind,
            cost: 0,
            first: "",
            firstKind: r.kind,
          });
  const visited = new Map<string, number>();
  for (let cost = 0; cost < buckets.length;) {
    const queue = buckets[cost] ?? [],
      cursor = cursors[cost] ?? 0;
    if (cursor >= queue.length) {
      cost++;
      continue;
    }
    cursors[cost] = cursor + 1;
    const cur = queue[cursor],
      key = `${cur.v}/${cur.kind}`;
    if (
      (visited.get(key) ?? Infinity) <= cur.cost ||
      cur.cost >
        (s.players[s.active].control === "hard"
          ? 8
          : s.players[s.active].control === "easy"
            ? 3
            : 5)
    )
      continue;
    visited.set(key, cur.cost);
    if (!out.has(cur.v) || out.get(cur.v)!.cost > cur.cost)
      out.set(cur.v, { cost: cur.cost, first: cur.first, kind: cur.firstKind });
    const town = townAt(s, cur.v);
    if (
      (town && town.owner !== s.active) ||
      (s.towers[cur.v] && s.towers[cur.v].owner !== s.active)
    )
      continue;
    // Roads and sea routes may meet at any unblocked network junction.
    const other = cur.kind === "road" ? "route" : "road";
    enqueue({ ...cur, kind: other });
    for (const edgeId of s.vertices[cur.v].edges) {
      const e = s.edges[edgeId],
        r = s.routes[edgeId];
      if (r && (r.owner !== s.active || r.kind !== cur.kind)) continue;
      if (routeKind(s, edgeId) !== cur.kind) continue;
      if (
        e.tiles.some((t) =>
          hostileAt(
            s,
            t,
            s.active,
            cur.kind === "route" && canOccupy(s.tiles[t], true),
          ),
        )
      )
        continue;
      const to = e.vertices.find((v) => v !== cur.v)!;
      enqueue({
        v: to,
        kind: cur.kind,
        cost: cur.cost + (r ? 0 : 1),
        first: cur.first || (!r ? edgeId : ""),
        firstKind: cur.first ? cur.firstKind : cur.kind,
      });
    }
  }
  return out;
}
function importToward(s: Game, cost: Stock): Command | null {
  return bankOrderToward(s, cost, inventory(s), marginalValues(s));
}
export function economyProjects(s: Game): Project[] {
  const projects: Project[] = [],
    stock = inventory(s),
    values = marginalValues(s),
    towns = ownTowns(s),
    units = ownPieces(s),
    enemies = Object.values(s.pieces).filter(
      (u) => !friendly(s, u.owner, s.active) && !u.naval && !u.carrier,
    ),
    enemyTowns = Object.values(s.towns).filter((t) => warTarget(s, t.owner)),
    round = s.players[s.active].turns,
    ourPower = units
      .filter((u) => !u.naval && !collector(u))
      .reduce((n, u) => n + points(u), 0),
    inc = income(s),
    enemyFleets = [
      ...new Set(
        Object.values(s.pieces)
          .filter(
            (u) =>
              (u.naval || !!u.seasonStatus) &&
              !u.carrier &&
              warTarget(s, u.owner) &&
              canOccupy(s.tiles[u.tile], true),
          )
          .map((u) => u.tile),
      ),
    ],
    drive = conquestDrive(s),
    militaryNeeded = campaignPowerTarget(s),
    crisis = dominance(s),
    resistance = crisis.leader === s.active ? 0 : crisis.severity;
  const land = landRegions(s),
    water = landRegions(s, true);
  const fieldUnits = units.filter(
    (u) => !u.naval && !collector(u) && !u.carrier,
  );
  const regionalForces = new Map<string, Piece[]>();
  const regionalShips = new Map<number | undefined, Piece[]>();
  for (const unit of units) {
    if (!unit.naval || collector(unit)) continue;
    const region = water.get(unit.tile);
    if (!regionalShips.has(region)) regionalShips.set(region, []);
    regionalShips.get(region)!.push(unit);
  }
  const artillery = units
    .filter((u) => u.kind === "artillery")
    .reduce((n, u) => n + u.tier, 0);
  const vulnerableCoasts = enemyTowns.filter((t) => !protects(s, t, true));
  const hostileShips = Object.values(s.pieces).filter(
    (u) => u.naval && !friendly(s, u.owner, s.active),
  );
  // All tiers/towns inspect the same deployment threats during this decision.
  const collectionDanger = new Map<string, boolean>();
  const collectionOutput = new Map<string, number>();
  const armedEnemies = Object.values(s.pieces)
    .filter((u) => !friendly(s, u.owner, s.active) && points(u) > 0)
    .map((u) => ({ unit: u, movement: speed(u) }));
  function collectionAtRisk(tile: string, naval: boolean) {
    const key = `${tile}/${naval}`;
    if (!collectionDanger.has(key))
      collectionDanger.set(
        key,
        armedEnemies.some(
          ({ unit, movement }) =>
            unit.naval === naval && distance(unit.tile, tile) <= movement,
        ),
      );
    return collectionDanger.get(key)!;
  }
  function add(
    action: Command,
    cost: Stock,
    score: number,
    label: string,
    urgent = false,
    quantity = 1,
  ) {
    if (emergencyTarget(s) !== undefined) {
      const combatRecruit =
        (action.type === "recruit" || action.type === "ship") &&
        ![
          "merchant",
          "merchantship",
          "fishing",
          "settler",
          "settlership",
        ].includes(action.kind ?? "");
      if (combatRecruit || urgent) score *= 1.5;
      else if (
        ["settlement", "camp", "city", "extension"].includes(action.type)
      )
        score *= 0.65;
    }
    if (s.players[s.active].control === "easy") {
      // Public-state deterministic variety: novices misvalue projects, never cheat.
      score *=
        0.55 +
        (hash(`${s.actions}:${label}:${JSON.stringify(action)}`) % 1000) / 1000;
    }
    if (score > 0)
      projects.push({
        action,
        cost: recipePayment(s, cost),
        score,
        label,
        urgent,
        quantity,
      });
  }
  for (const t of towns) {
    const tiles = landAtVertex(s, t.vertex),
      output = productiveAtVertex(s, t.vertex).reduce(
        (n, id) =>
          n +
          probability(s.tiles[id].number) *
            tileGoods(s.tiles[id], s.active).reduce(
              (sum, good) =>
                sum +
                values[good] * (tileYield(s.tiles[id], s.active)[good] ?? 0),
              0,
            ),
        0,
      ),
      near = townThreats(s, t).filter((u) => warTarget(s, u.owner)),
      danger = threatPower(s, near, tiles),
      protectedPower = townGuardPower(s, t),
      defendNow = urgentTownDefense(
        s,
        t,
        danger,
        protectedPower,
        militaryNeeded,
      );
    if (besieged(s, t.id)) continue;
    if (t.level < 4) {
      const cost = effectiveCost(s, COSTS[CITY_RECIPES[t.level + 1]], "civic");
      add(
        { type: "city", town: t.id },
        cost,
        (output * 30 +
          (t.level >= 2
            ? productiveAtVertex(s, t.vertex).reduce(
                (sum, id) =>
                  sum +
                  probability(s.tiles[id].number) *
                    tileGoods(s.tiles[id], s.active).reduce(
                      (n, raw) =>
                        n +
                        values[processedFor(raw)] *
                          (tileYield(s.tiles[id], s.active)[raw] ?? 0),
                      0,
                    ),
                0,
              ) * 30
            : 0) +
          (t.level === 1
            ? 9
            : 4 +
              (towns.some((other) => other.level > t.level) ? 4 : 12) +
              Math.min(3, Object.keys(t.extensions).length))) /
          (1 + stockValue(cost, values) / 20) -
          (danger > protectedPower ? 15 : 0),
        `Develop ${t.name}`,
      );
    }
    if (t.wall < t.level && (danger > 0 || t.level >= 2)) {
      const cost = effectiveCost(
        s,
        COSTS[WALL_NAMES[t.wall + 1]],
        t.wall === 0 ? "palisade" : "civic",
      );
      add(
        { type: "wall", town: t.id },
        cost,
        (danger > protectedPower ? 12 : 2) +
          (sumStock(t.stock) > 15 ? 2 : 0) +
          (sumStock(cost) === 0 ? 25 : 0),
        `Fortify ${t.name}`,
      );
    }
    for (const tileId of productiveAtVertex(s, t.vertex)) {
      const tile = s.tiles[tileId],
        raw = t.extensionGoods?.[tileId] ?? tileGood(tile, s.active)!,
        next = (t.extensions[tileId] ?? 0) + 1;
      if (next < t.level && !blockAt(s, tileId)) {
        const cost = effectiveCost(s, extensionCost(raw, next), "industry"),
          good = processedFor(raw);
        add(
          { type: "extension", town: t.id, tile: tileId },
          cost,
          (probability(tile.number) *
            values[good] *
            workshopYield(tile, s.active, raw, 1) *
            30) /
            (1 + (inc[good] ?? 0) * 12) +
            (sumStock(cost) === 0 ? 25 : 0) -
            (danger > protectedPower ? 5 : 0),
          `Produce ${good}`,
        );
      }
    }
    const regions = new Set(tiles.map((id) => land.get(id)));
    const regionKey = [...regions].sort().join(",");
    if (!regionalForces.has(regionKey))
      regionalForces.set(
        regionKey,
        fieldUnits.filter((u) => regions.has(land.get(u.tile))),
      );
    const localForce = regionalForces.get(regionKey)!;
    const coastalTargets = enemyFleets.filter(
      (water) =>
        tiles.some((tile) => distance(tile, water) <= 5) &&
        neighbors(water).some(
          (shore) =>
            s.tiles[shore] &&
            canOccupy(s.tiles[shore]) &&
            tiles.some(
              (tile) => landRegions(s).get(tile) === landRegions(s).get(shore),
            ),
        ),
    );
    const coastalPower = maxValue([
      0,
      ...coastalTargets.map((water) =>
        power(
          s,
          combatantsAt(s, water, true).filter(
            (u) => !friendly(s, u.owner, s.active),
          ),
          water,
        ),
      ),
    ]);
    const localArtillery = localForce
      .filter((u) => u.kind === "artillery")
      .reduce((n, u) => n + u.tier * 2, 0);
    const coastalThreat =
      coastalTargets.length > 0 && localArtillery <= coastalPower;
    const strandedRegion =
      tiles.length > 0 && !tiles.some((id) => hasLandObjective(s, id));
    if (
      ((!strandedRegion ||
        localForce.length < Math.max(2, Math.ceil(towns.length / 2))) &&
        ourPower < militaryNeeded) ||
      defendNow ||
      coastalThreat ||
      s.players[s.active].bonuses.recruits.length
    ) {
      const target = enemyTowns.sort(
        (a, b) =>
          minValue(
            s.vertices[a.vertex].tiles.map((v) =>
              minValue(tiles.map((k) => distance(v, k))),
            ),
          ) -
          minValue(
            s.vertices[b.vertex].tiles.map((v) =>
              minValue(tiles.map((k) => distance(v, k))),
            ),
          ),
      )[0];
      for (const tile of tiles.filter((id) => !hostileAt(s, id))) {
        const terrain = s.tiles[tile].resource;
        for (const kind of (Object.keys(UNIT_INFO) as UnitClass[]).filter(
          (k) => k !== "merchant" && !isSettler(k),
        ))
          for (let tier = 1; tier <= Math.min(4, t.turnLevel); tier++) {
            const freeCount = s.players[s.active].bonuses.recruits.filter(
                (b) => b.tier === tier && b.classes.includes(kind),
              ).length,
              free = freeCount > 0,
              cost = free ? {} : unitCost(kind, tier);
            if (
              strandedRegion &&
              localForce.length >= Math.max(2, Math.ceil(towns.length / 2)) &&
              !defendNow &&
              kind !== "artillery" &&
              !free
            )
              continue;
            const neededArtillery =
              coastalThreat ||
              (!!target &&
                target.level -
                  1 +
                  target.wall +
                  towerDefense(s, target.owner, target.vertex) >
                  artillery);
            if (
              kind === "artillery" &&
              (!neededArtillery || (ourPower < 3 && !coastalThreat)) &&
              !free
            )
              continue;
            const favored =
              UNIT_INFO[kind].family === terrainFamily(s.tiles[tile]);
            // Stop at the next change of priority: a basic guard, a local
            // defense, enough siege power, or the current campaign target.
            let quantity = defendNow
              ? Math.ceil(
                  (Math.min(
                    danger,
                    danger <= militaryNeeded * 1.5
                      ? danger
                      : Math.min(6, t.level + 1),
                  ) -
                    protectedPower -
                    (protectedPower === 0
                      ? towerPower(s, s.active, tile)
                      : 0)) /
                    (tier * (favored ? 2 : 1)),
                )
              : kind === "artillery"
                ? Math.max(
                    target
                      ? Math.ceil(
                          (target.level -
                            1 +
                            target.wall +
                            towerDefense(s, target.owner, target.vertex) -
                            artillery) /
                            tier,
                        )
                      : 0,
                    coastalThreat
                      ? Math.floor(
                          (coastalPower - localArtillery) / (tier * 2),
                        ) + 1
                      : 0,
                  )
                : Math.ceil(
                    ((ourPower < minimumFieldPower(s)
                      ? minimumFieldPower(s)
                      : militaryNeeded) -
                      ourPower) /
                      tier,
                  );
            if (strandedRegion && !defendNow && kind !== "artillery")
              quantity = Math.min(
                quantity,
                Math.max(2, Math.ceil(towns.length / 2)) - localForce.length,
              );
            quantity = Math.max(1, freeCount, quantity);
            const urgency = defendNow
              ? 35 + danger * 3
              : ourPower < minimumFieldPower(s)
                ? 35
                : ourPower < militaryNeeded
                  ? round > 18
                    ? 13 * drive
                    : round > 7
                      ? 10 * drive
                      : 4 * drive
                  : 0;
            const tierEfficiency = tier / (1 + stockValue(cost, values) / 10),
              score =
                (urgency + (ourPower < militaryNeeded ? resistance * 30 : 0)) *
                  tierEfficiency +
                (favored ? 2 : 0) +
                (kind === "cavalry" ? 1 : 0) +
                (kind === "artillery" && neededArtillery
                  ? coastalThreat
                    ? 18
                    : 4
                  : 0) +
                (free ? 35 : 0);
            if (urgency || free || (kind === "artillery" && neededArtillery))
              add(
                { type: "recruit", town: t.id, tile, kind, tier },
                cost,
                score,
                `Recruit ${kind} for ${danger ? "defense" : "the campaign"}`,
                false,
                quantity,
              );
          }
      }
    }
    {
      for (const tile of waterAtVertex(s, t.vertex).filter(
        (id) => !hostileAt(s, id),
      )) {
        const localLand = localForce,
          ships = regionalShips.get(water.get(tile)) ?? [],
          berths = ships.reduce(
            (n, u) => n + shipStats(u.kind as ShipClass, u.tier).capacity,
            0,
          );
        const siegeTargets = vulnerableCoasts.filter((town) =>
          waterAtVertex(s, town.vertex).some(
            (coast) =>
              water.get(coast) === water.get(tile) &&
              reachable(s, tile, coast, true, s.active),
          ),
        );
        const siegeNeed = siegeTargets.length
          ? Math.max(
              0,
              Math.min(
                6,
                Math.max(
                  1,
                  minValue(
                    siegeTargets.map((town) => siegeRequirement(s, town, [])),
                  ),
                ),
              ) - siegePower(ships),
            )
          : 0;
        const shortcutDemand = campaignTransportDemand(s, tile);
        const invasion = invasionCoasts(s, tiles[0]).some((w) =>
          reachable(s, tile, w, true, s.active),
        );
        const overseas = shortcutDemand > 0 || invasion;
        // A shortcut for one detachment does not require berths for every
        // soldier elsewhere on the connected continent.
        const passengerDemand = Math.max(
          shortcutDemand,
          invasion ? localLand.length : 0,
        );
        const stranded = localLand.filter((u) => !hasLandObjective(s, u.tile));
        const threats = hostileShips.filter(
          (u) =>
            distance(u.tile, tile) <= 3 &&
            reachable(s, u.tile, tile, true, u.owner, 3),
        );
        const enemyPower = maxValue([
          0,
          ...s.players.map((p) =>
            threats
              .filter((u) => u.owner === p.id)
              .reduce((n, u) => n + points(u), 0),
          ),
        ]);
        const escorts = ships.filter(
            (u) => shipStats(u.kind as ShipClass, u.tier).capacity === 0,
          ),
          escortPower = escorts.reduce((n, u) => n + points(u), 0),
          commerceTargets = enemyFleets.filter(
            (water) =>
              piecesAt(s, water, true).some(
                (u) => warTarget(s, u.owner) && collector(u),
              ) && reachable(s, tile, water, true, s.active),
          ),
          commerceGuard = commerceTargets.length
            ? minValue(
                commerceTargets.map((water) =>
                  power(
                    s,
                    combatantsAt(s, water, true).filter(
                      (u) => !friendly(s, u.owner, s.active),
                    ),
                    water,
                  ),
                ),
              )
            : 0,
          commerceRaid =
            round >= 8 &&
            commerceTargets.length > 0 &&
            commerceGuard < 12 + towns.length * 5,
          blockade =
            resistance >= 0.2 &&
            ownTowns(s, crisis.leader).some((town) =>
              waterAtVertex(s, town.vertex).some(
                (water) =>
                  tileGood(s.tiles[water]) &&
                  reachable(s, tile, water, true, s.active),
              ),
            ),
          escortTarget = Math.max(
            berths > 0 ? 2 : 0,
            Math.ceil(enemyPower * 1.25),
            blockade ? Math.ceil(2 + resistance * 4) : 0,
            commerceRaid ? Math.ceil(commerceGuard * 1.2 + 3) : 0,
          );
        for (const kind of (Object.keys(SHIP_INFO) as ShipClass[]).filter(
          (k) => k !== "fishing" && k !== "merchantship" && !isSettler(k),
        ))
          for (let tier = 1; tier <= t.turnLevel; tier++) {
            const info = shipStats(kind, tier);
            if (t.turnLevel < info.level) continue;
            const freeCount = s.players[s.active].bonuses.ships.filter(
                (v, i) =>
                  v.includes(kind) &&
                  tier ===
                    (s.players[s.active].bonuses.shipTiers?.[i] ??
                      s.players[s.active].bonuses.shipTier ??
                      1),
              ).length,
              free = freeCount > 0,
              cost = free ? {} : shipCost(kind, tier);
            const siegeDemand = info.siege > 0 ? siegeNeed : 0;
            const need = info.capacity
              ? overseas
                ? Math.max(
                    0,
                    Math.min(
                      passengerDemand,
                      Math.max(
                        4,
                        Math.ceil(passengerDemand * (0.5 + resistance * 0.35)),
                      ),
                    ) - berths,
                  )
                : 0
              : Math.max(siegeDemand, escortTarget - escortPower, 0);
            const urgent =
              need > 0 &&
              (info.capacity
                ? overseas && Math.max(stranded.length, shortcutDemand) > berths
                : enemyPower > escortPower ||
                  (commerceRaid &&
                    resistance >= 0.3 &&
                    escortPower < escortTarget));
            if (need || free)
              add(
                { type: "ship", town: t.id, tile, kind, tier },
                cost,
                free
                  ? 35
                  : (((urgent ? 36 : siegeDemand ? 20 : blockade ? 14 : 5) +
                      Math.min(12, need)) *
                      (0.8 +
                        Math.min(need, info.capacity || info.power) * 0.12)) /
                      (1 + stockValue(cost, values) / 70),
                info.capacity
                  ? "Open an overseas passage"
                  : siegeDemand
                    ? "Equip a fleet to siege exposed coastal towns"
                    : "Protect the sea lanes",
                urgent,
                Math.max(
                  freeCount,
                  Math.ceil(need / (info.capacity || info.power)),
                  siegeDemand ? Math.ceil(siegeDemand / info.siege) : 0,
                ),
              );
          }
      }
    }
  }
  for (const vertex of towerSites(s)) {
    const next = (s.towers[vertex]?.tier ?? 0) + 1;
    const nearby = towns.filter(
      (t) =>
        t.vertex === vertex ||
        s.vertices[t.vertex].edges.some((e) =>
          s.edges[e].vertices.includes(vertex),
        ),
    );
    const threatened = nearby.some((t) => townThreats(s, t).length > 0);
    const stationed = s.vertices[vertex].tiles.some((id) =>
      piecesAt(s, id).some((u) => u.owner === s.active && points(u) > 0),
    );
    if (nearby.length || stationed)
      add(
        {
          type: "tower",
          vertex,
          mode:
            (stock.stone ?? 0) >= 2 &&
            ((stock.lumber ?? 0) < 2 || values.stone <= values.lumber)
              ? "stone"
              : "lumber",
        },
        next === 1
          ? (stock.stone ?? 0) >= 2 &&
            ((stock.lumber ?? 0) < 2 || values.stone <= values.lumber)
            ? { stone: 2 }
            : { lumber: 2 }
          : TOWER_COSTS[next],
        (threatened ? 16 : stationed ? 6 : 1) /
          (1 + (s.towers[vertex]?.tier ?? 0) * 0.35),
        "Build watchtower support",
      );
  }
  for (const town of towns.filter((t) => !besieged(s, t.id))) {
    for (const kind of ["merchant", "fishing", "merchantship"] as const) {
      const naval = kind !== "merchant";
      const deployments = naval
        ? waterAtVertex(s, town.vertex)
        : landAtVertex(s, town.vertex);
      const count = units
        .filter((u) => u.kind === kind)
        .reduce((n, u) => n + u.tier, 0);
      for (let tier = 1; tier <= town.turnLevel; tier++) {
        const bonus = s.players[s.active].bonuses;
        const free = naval
          ? bonus.ships.some(
              (v, i) =>
                v.includes(kind as ShipClass) &&
                tier === (bonus.shipTiers?.[i] ?? bonus.shipTier ?? 1),
            )
          : bonus.recruits.some(
              (v) => v.tier === tier && v.classes.includes("merchant"),
            );
        const cost = free
          ? {}
          : naval
            ? shipCost(kind as ShipClass, tier)
            : unitCost("merchant", tier);
        const rated = deployments
          .filter((id) => !hostileAt(s, id))
          .map((tile) => {
            const key = `${kind}/${tier}/${tile}`;
            if (!collectionOutput.has(key))
              collectionOutput.set(
                key,
                harvestTiles(s, { kind, tile, tier }).reduce(
                  (n, id) =>
                    n +
                    probability(s.tiles[id].number) *
                      stockValue(
                        harvestYield(
                          s.tiles[id],
                          s.active,
                          tier,
                          kind !== "fishing",
                        ),
                        values,
                      ),
                  0,
                ),
              );
            const output = collectionOutput.get(key)!;
            const danger = collectionAtRisk(tile, naval);
            return {
              tile,
              score: danger
                ? 0
                : (output * 24) /
                  (1 + count / 2) /
                  (1 + stockValue(cost, values) / 22),
            };
          })
          .sort((a, b) => b.score - a.score);
        if (rated[0]?.score > 0)
          add(
            {
              type: naval ? "ship" : "recruit",
              town: town.id,
              tile: rated[0].tile,
              kind,
              tier,
            },
            cost,
            rated[0].score + (free ? 45 : 0),
            "Develop mobile resource collection",
            false,
            free ? 1 : collectionBatchSize(count, tier),
          );
      }
    }
  }
  for (const r of Object.values(s.routes)) {
    if (r.owner !== s.active) continue;
    for (const id of s.edges[r.edge].tiles) {
      const tile = s.tiles[id];
      if (
        !tileGood(tile) ||
        (tile.resource === "water" && r.kind !== "route") ||
        hostileAt(s, id, s.active, canOccupy(tile, true)) ||
        (r.camps[id] ?? 0) >= 2
      )
        continue;
      const good = tileGood(tile, s.active)!;
      const cost = campCost(good, (r.camps[id] ?? 0) + 1),
        score =
          probability(tile.number) *
          25 *
          tileGoods(tile, s.active).reduce(
            (sum, raw) =>
              sum +
              (values[raw] * (tileYield(tile, s.active)[raw] ?? 0)) /
                (1 + 6 * (inc[raw] ?? 0)),
            0,
          );
      add(
        { type: "camp", edge: r.edge, tile: id },
        cost,
        score,
        "Fill a raw-resource shortage",
      );
    }
  }
  {
    // Productive sites remain candidates throughout the campaign; no town-count ceiling.
    const paths = expansionPaths(s);
    for (const v of settlementSites(s, s.active, true)) {
      const route = paths.get(v);
      if (!route || route.cost > 4) continue;
      const yieldScore = productiveAtVertex(s, v).reduce(
        (n, id) =>
          n +
          probability(s.tiles[id].number) *
            tileGoods(s.tiles[id], s.active).reduce(
              (sum, good) =>
                sum +
                (values[good] * (tileYield(s.tiles[id], s.active)[good] ?? 0)) /
                  (1 + 4 * (inc[good] ?? 0)),
              0,
            ),
        0,
      );
      const nearEnemy = s.vertices[v].tiles.some((id) =>
        enemies.some((u) => distance(u.tile, id) < 3),
      );
      const score =
        ((yieldScore *
          (1 + seasonalDiversityBonus(s, s.vertices[v].tiles)) *
          50) /
          (1 + route.cost * 0.45) +
          10 / (1 + towns.length * 0.12)) *
          drive -
        (nearEnemy ? 8 / drive : 0);
      if (route.cost === 0)
        add(
          { type: "settlement", vertex: v },
          COSTS.Settlement,
          score,
          "Settle valuable new resources",
        );
      else if (route.first && canRoute(s, route.first, route.kind))
        add(
          { type: route.kind, edge: route.first },
          effectiveCost(
            s,
            COSTS[route.kind === "road" ? "Road" : "Seafarers route ship"],
            route.kind,
          ),
          score,
          "Connect a productive settlement site",
        );
    }
  }
  for (const project of colonistProjects(s))
    add(
      project.action,
      project.cost,
      project.score * drive,
      "Colonize reachable resources without a road chain",
    );
  const prospects = expeditionProspects(s, inc);
  const missingRaw = prospects.missing;
  const expansionRoom = projects.filter(
    (p) =>
      p.action.type === "settlement" ||
      p.action.type === "road" ||
      p.action.type === "route",
  ).length;
  const blockedFront = units.some(
    (u) =>
      !u.naval && !collector(u) && !u.carrier && !hasLandObjective(s, u.tile),
  );
  const mayExplore = aiExpeditionAllowed(s);
  const strengths = factionStrengths(s);
  const strengthGap = 1 - strengths[s.active] / maxValue([1, ...strengths]);
  const needsEscape = mayExplore && isCornered(s);
  const catchUp =
    mayExplore && strengthGap >= 0.25 && (expansionRoom < 2 || missingRaw >= 3);
  // Expeditions can create a new approach at a blocked border. Only public
  // geography and visible enemies are scored; unseen terrain is never assumed.
  const bypassSites = new Set<string>();
  if (mayExplore && (blockedFront || resistance > 0.3) && round >= 3) {
    const frontierForces = new Map(
      units
        .filter((u) => !u.carrier && !collector(u) && ready(s, u))
        .map((u) => [`${u.naval}/${u.tile}`, u]),
    );
    for (const unit of frontierForces.values()) {
      if (!unit.naval && !blockedFront && hasLandObjective(s, unit.tile))
        continue;
      if (
        !enemyTowns.some(
          (t) =>
            leaderPressure(s, t.owner) >= 1 &&
            s.vertices[t.vertex].tiles.some(
              (tile) => distance(unit.tile, tile) <= 7,
            ),
        )
      )
        continue;
      for (const vertex of s.tiles[unit.tile].vertices)
        if (unknownAtVertex(s, vertex).length) bypassSites.add(vertex);
    }
  }
  const warBypass = bypassSites.size > 0;
  const explorationStart = needsEscape || catchUp ? 3 : 4;
  const explorationDue =
    round >= explorationStart &&
    (needsEscape ||
      catchUp ||
      missingRaw >= 3 ||
      expansionRoom < 3 ||
      (round + s.active) % 2 === 0);
  if (
    mayExplore &&
    round >= explorationStart &&
    !s.players[s.active].expeditionUsed &&
    !expeditionSites(s, "land").length &&
    !expeditionSites(s, "sea").length &&
    (missingRaw >= 3 || expansionRoom < 2 || blockedFront)
  ) {
    const frontier = [...expansionPaths(s)]
      .filter(
        ([v, r]) =>
          r.first &&
          unknownAtVertex(s, v).length &&
          canRoute(s, r.first, r.kind),
      )
      .sort(
        (a, b) =>
          (20 + prospects.score(b[0])) / (1 + b[1].cost * 0.4) -
          (20 + prospects.score(a[0])) / (1 + a[1].cost * 0.4),
      )[0];
    if (frontier) {
      const r = frontier[1];
      add(
        { type: r.kind, edge: r.first },
        effectiveCost(
          s,
          COSTS[r.kind === "road" ? "Road" : "Seafarers route ship"],
          r.kind,
        ),
        (18 +
          missingRaw * 2 +
          prospects.score(frontier[0]) +
          (blockedFront ? 10 : 0) +
          (needsEscape ? 20 : catchUp ? 12 * strengthGap : 0)) /
          (1 + r.cost * 0.25),
        "Reach an unexplored frontier",
      );
    }
  }
  if (
    mayExplore &&
    !s.players[s.active].expeditionUsed &&
    (s.players[s.active].bonuses.expedition ||
      explorationDue ||
      warBypass ||
      (round >= 6 &&
        expansionRoom < 2 &&
        blockedFront &&
        (round + s.active) % 3 === 0))
  ) {
    const bonus = s.players[s.active].bonuses;
    for (const kind of ["land", "sea"] as const) {
      const sites = expeditionSites(s, kind);
      const rated = sites
        .map((vertex) => ({
          vertex,
          score:
            unknownAtVertex(s, vertex).length * 2 +
            prospects.score(vertex) +
            (bypassSites.has(vertex) ? 35 * (1 + resistance) : 0) +
            (Object.values(s.towns).some(
              (t) =>
                warTarget(s, t.owner) &&
                s.vertices[t.vertex].tiles.some((a) =>
                  s.vertices[vertex].tiles.some((b) => distance(a, b) < 4),
                ),
            )
              ? 5
              : 0),
        }))
        .sort((a, b) => b.score - a.score);
      for (const tier of bonus.expedition
        ? [bonus.expeditionTier ?? 2]
        : [1, 2, 3]) {
        const choices = rated
          .slice(0, 3)
          .flatMap((site) => {
            const targets = bypassSites.has(site.vertex)
              ? enemyTowns
                  .flatMap((town) => s.vertices[town.vertex].tiles)
                  .filter((tile) =>
                    s.vertices[site.vertex].tiles.some(
                      (id) => distance(id, tile) <= 7,
                    ),
                  )
              : [];
            const approach = expeditionApproach(s, site.vertex, tier, targets);
            return approach
              ? [{ ...site, ...approach, score: site.score + approach.score }]
              : [];
          })
          .sort((a, b) => b.score - a.score);
        const site = choices[0];
        if (!site) continue;
        const cost = bonus.expedition ? {} : expeditionCost(kind, tier);
        const value = bonus.expedition
          ? 65 + site.score
          : ((20 +
              missingRaw * 2 +
              (expansionRoom < 2 ? 12 : 0) +
              (blockedFront ? 9 : 0) +
              (explorationDue ? 12 : 0) +
              (bypassSites.has(site.vertex) ? 25 * (1 + resistance) : 0) +
              (needsEscape ? 18 : catchUp ? 12 * strengthGap : 0) +
              site.score) *
              (1 + (tier - 1) * 0.4) *
              (needsEscape ? 1.2 : catchUp ? 1.15 : 1)) /
            (1 + stockValue(cost, values) / 16);
        add(
          {
            type: "expedition",
            vertex: site.vertex,
            kind,
            tier,
            direction: site.direction,
          },
          cost,
          value,
          "Explore for territory, resources and new approaches",
          needsEscape ||
            (bypassSites.has(site.vertex) && ourPower >= minimumFieldPower(s)),
        );
      }
    }
  }
  // Card rewards can buy further cards indefinitely in a developed economy.
  // Budget discretionary purchases so existing forces get another turn; this
  // is an AI spending policy, not a restriction on buying or playing cards.
  const researchBudget = Math.max(2, Math.min(6, Math.ceil(towns.length / 2)));
  if (
    s.players[s.active].hand.length < 3 &&
    (s.players[s.active].researchPurchases ?? 0) < researchBudget
  ) {
    const max = Math.min(
      4,
      maxValue([
        ...towns.filter((t) => !besieged(s, t.id)).map((t) => t.level),
        1,
      ]),
    );
    for (let tier = 1; tier <= max; tier++)
      add(
        { type: "buy-research", tier },
        COSTS[`Research ${RESEARCH_NAMES[tier]}`],
        researchInvestment(s, tier),
        "Invest in useful research",
      );
  }
  appendValues(projects, guildEconomyProjects(s, values));
  return projects.sort((a, b) => b.score - a.score);
}
/** At most one concrete offer per AI turn, aimed at a current construction deficit. */
export function playerTradeToward(s: Game, cost: Stock): Command | null {
  if (s.players[s.active].tradeOffered || s.trade || s.phase !== "economy")
    return null;
  const stock = inventory(s),
    prices = marketValues(s);
  const evaluateOurs = tradeValuation(s, s.active, cost, prices);
  let best: { action: Command; score: number } | undefined;
  for (const partner of s.players.filter(
    (p) => p.alive && p.id !== s.active && p.id !== emergencyTarget(s),
  )) {
    const theirStock = inventory(s, partner.id),
      theirNeeds = tradeNeeds(s, partner.id);
    const evaluateTheirs = tradeValuation(s, partner.id, theirNeeds, prices);
    const support = coalitionSupport(s, partner.id);
    const theirSupport = coalitionSupport(s, s.active, partner.id);
    const ourPremium =
      1.08 -
      support * 0.73 +
      Math.min(0.8, leaderPressure(s, partner.id) - 1) * 0.65;
    const theirPremium =
      1.08 -
      theirSupport * 0.73 +
      Math.min(0.8, leaderPressure(s, s.active, partner.id) - 1) * 0.65;
    for (const take of GOODS) {
      const missing = Math.max(0, (cost[take] ?? 0) - (stock[take] ?? 0));
      for (
        let receive = Math.min(3, missing, theirStock[take] ?? 0);
        receive >= 1;
        receive--
      ) {
        for (const give of GOODS.filter((g) => g !== take)) {
          const available = Math.min(8, (stock[give] ?? 0) - (cost[give] ?? 0));
          for (let pay = 1; pay <= available; pay++) {
            const ratio = (pay * prices[give]) / (receive * prices[take]);
            if (
              ratio < 0.8 - theirSupport * 0.5 ||
              ratio > 1.25 + support * 2 ||
              pay >= bankRate(s, give, take) * receive ||
              receive >= bankRate(s, take, give, partner.id) * pay
            )
              continue;
            const offered = { [give]: pay },
              requested = { [take]: receive };
            const ours = evaluateOurs(requested, offered);
            const theirs = evaluateTheirs(offered, requested);
            if (
              ours.gain < ours.loss * ourPremium ||
              theirs.gain < theirs.loss * theirPremium
            )
              continue;
            // Prefer balanced, mutually useful bundles over extracting the partner's
            // maximum willingness to pay. Whole-card ratios allow limited rounding.
            const score =
              Math.min(ours.gain - ours.loss, theirs.gain - theirs.loss) +
              receive * 0.3 -
              Math.abs(Math.log(ratio)) * 2;
            if (!best || score > best.score)
              best = {
                action: {
                  type: "offer-trade",
                  partner: partner.id,
                  give: offered,
                  take: requested,
                },
                score,
              };
          }
        }
      }
    }
  }
  return best?.action ?? null;
}

/** One bounded supply trade per turn; aid funds a frontline realm's concrete military recipe. */
export function coalitionTrade(
  s: Game,
  projects = economyProjects(s),
): Command | null {
  if (s.trade || s.players[s.active].tradeOffered || s.phase !== "economy")
    return null;
  const stock = inventory(s),
    prices = marketValues(s);
  const reserve =
    (
      projects.find(
        (p) =>
          p.urgent ||
          (p.action.type === "recruit" &&
            p.action.kind !== "merchant" &&
            !isSettler(p.action.kind ?? "")),
      ) ?? projects[0]
    )?.cost ?? {};
  const budget = marketStockValue(stock, prices) * 0.15;
  let best: { action: Command; score: number } | undefined;
  for (const partner of s.players) {
    const support = coalitionSupport(s, partner.id);
    if (support < 0.2) continue;
    const theirs = inventory(s, partner.id);
    const view = { ...s, active: partner.id, phase: "economy" as const };
    const plan = economyProjects(view).filter(
      (p) =>
        (p.action.type === "recruit" &&
          p.action.kind !== "merchant" &&
          !isSettler(p.action.kind ?? "")) ||
        (p.action.type === "ship" &&
          !["fishing", "merchantship", "settlership"].includes(
            p.action.kind!,
          )) ||
        p.action.type === "wall",
    );
    for (const project of plan.slice(0, 8))
      for (const give of GOODS) {
        const missing = Math.max(
          0,
          (project.cost[give] ?? 0) - (theirs[give] ?? 0),
        );
        const amount = Math.min(
          missing,
          6,
          Math.floor((stock[give] ?? 0) - (reserve[give] ?? 0) - 1),
          Math.floor(budget / prices[give]),
        );
        if (amount <= 0) continue;
        const offered = { [give]: amount };
        for (const take of GOODS.filter(
          (g) => g !== give && (theirs[g] ?? 0) > (project.cost[g] ?? 0),
        )) {
          const requested = { [take]: 1 };
          const ratio = prices[take] / (amount * prices[give]);
          if (ratio < 0.8 - support * 0.5 || ratio > 1) continue;
          const utility = tradeEvaluation(
            s,
            partner.id,
            offered,
            requested,
            project.cost,
            prices,
          );
          if (utility.gain < utility.loss * 1.08) continue;
          const score =
            support * (project.score + amount * prices[give]) - prices[take];
          if (!best || score > best.score)
            best = {
              action: {
                type: "offer-trade",
                partner: partner.id,
                give: offered,
                take: requested,
              },
              score,
            };
        }
      }
  }
  return best?.action ?? null;
}

function acquireToward(s: Game, cost: Stock): Command | null {
  return playerTradeToward(s, cost) ?? importToward(s, cost);
}
function chooseEconomy(
  s: Game,
  onRecruitment?: (intent: RecruitmentIntent) => void,
): Command {
  const projects = economyProjects(s);
  for (const card of [...s.players[s.active].hand].sort(
    (a, b) => researchUtility(s, b.kind) - researchUtility(s, a.kind),
  )) {
    const action = researchAction(s, card.id);
    if (action && researchUtility(s, card.kind) > 0 && check(s, action))
      return action;
  }
  const stock = inventory(s),
    values = marginalValues(s);
  const commission = (project: Project): Command | null => {
    const economic =
      ["merchant", "merchantship", "fishing"].includes(
        project.action.kind ?? "",
      ) && ["recruit", "ship"].includes(project.action.type);
    if (!economic || (project.quantity ?? 1) <= 1) return null;
    const target = recruitmentFundingTarget(
      s,
      project.action,
      project.quantity,
      project.cost,
      values,
    );
    if (target.count <= 1) return null;
    const intent: RecruitmentIntent = {
      command: { ...project.action, count: target.count },
      cost: target.cost,
    };
    const next = recruitmentIntentOrder(s, intent, values);
    if (next?.type === "bank") onRecruitment?.(intent);
    return next;
  };
  const fieldPower = ownPieces(s)
    .filter((u) => !u.naval && !collector(u) && u.kind !== "artillery")
    .reduce((n, u) => n + u.tier, 0);
  const defenseBudget = campaignPowerTarget(s);
  const endangered = ownTowns(s).filter((t) =>
    urgentTownDefense(
      s,
      t,
      threatPower(
        s,
        townThreats(s, t).filter((u) => warTarget(s, u.owner)),
        landAtVertex(s, t.vertex),
      ),
      townGuardPower(s, t),
      defenseBudget,
    ),
  );
  const reserveNeeded =
    fieldPower < minimumFieldPower(s) ||
    (dominance(s).leader === s.active &&
      s.players[s.active].turns >= 6 &&
      fieldPower <
        Math.min(campaignPowerTarget(s) * 0.6, ownTowns(s).length * 4 + 4)) ||
    endangered.length > 0 ||
    (dominance(s).leader !== s.active &&
      dominance(s).severity > 0.3 &&
      fieldPower < campaignPowerTarget(s));
  // Establish a force, then fund a necessary crossing or naval defense before
  // unrelated projects can spend every useful input.
  // Missing resources are imported; higher-tier wish lists never block a cheap guard.
  const recruits = reserveNeeded
    ? projects.filter(
        (p) =>
          p.action.type === "recruit" &&
          p.action.kind !== "artillery" &&
          p.action.kind !== "merchant" &&
          !isSettler(p.action.kind ?? ""),
      )
    : [];
  const emergency = recruits.filter((p) =>
    endangered.some((t) => t.id === p.action.town),
  );
  const development = projects.find((p) =>
    [
      "road",
      "route",
      "settlement",
      "city",
      "extension",
      "camp",
      "buy-research",
      "expedition",
      "guild",
      "guild-order",
    ].includes(p.action.type),
  );
  const optionalRecruit = projects.find((p) => p.action.type === "recruit");
  const logistics = projects.filter((p) => p.urgent);
  // Once a basic field force exists, useful exploration may compete with more
  // reserves. Immediate town defense still wins, as do critical naval logistics.
  const exploration =
    fieldPower >= minimumFieldPower(s)
      ? projects.find(
          (p) =>
            p.action.type === "expedition" &&
            p.score >= 30 &&
            p.score >= (development?.score ?? 0) * 0.95,
        )
      : undefined;
  if (!endangered.length) {
    const aid = coalitionTrade(s, projects);
    if (aid && check(s, aid)) return aid;
  }
  const candidates = emergency.length
    ? emergency
    : logistics.length
      ? logistics
      : exploration
        ? [exploration]
        : recruits.length
          ? recruits
          : development &&
              (!optionalRecruit || development.score >= optionalRecruit.score)
            ? [development]
            : [];
  const unlock = projects.find(
    (p) =>
      p.action.type === "city" &&
      s.towns[p.action.town!].level >= 2 &&
      affordable(s, p.cost) &&
      check(s, p.action),
  );
  if (!emergency.length && !recruits.length && !logistics.length && unlock)
    return unlock.action;
  const affordablePriority = candidates.find(
    (p) => affordable(s, p.cost) && check(s, p.action),
  );
  if (affordablePriority)
    return (
      commission(affordablePriority) ??
      recruitmentBatch(
        s,
        affordablePriority.action,
        affordablePriority.quantity,
      )
    );
  // Research can resolve a construction shortage immediately. Do not let
  // an unaffordable expansion reserve suppress every discovery indefinitely.
  const discovery = projects.find(
    (p) =>
      p.action.type === "buy-research" &&
      p.score >= 10 &&
      affordable(s, p.cost) &&
      check(s, p.action),
  );
  if (
    !emergency.length &&
    !recruits.length &&
    !logistics.length &&
    !s.players[s.active].hand.length &&
    discovery
  )
    return discovery.action;
  const reserve = [...candidates].sort((a, b) => {
    const deficit = (p: Project) =>
      GOODS.reduce(
        (n, g) =>
          n + Math.max(0, (p.cost[g] ?? 0) - (stock[g] ?? 0)) * values[g],
        0,
      );
    return deficit(a) - deficit(b) || b.score - a.score;
  })[0];
  if (reserve) {
    const trade = acquireToward(
      s,
      recruitmentFundingCost(
        s,
        reserve.action,
        reserve.quantity,
        reserve.cost,
        values,
      ),
    );
    if (trade && check(s, trade)) return trade;
  }
  const top = projects[0];
  if (!top) return { type: "military" };
  for (const project of projects) {
    if (project.score < top.score * 0.6 && !reserve) break;
    const cost = { ...project.cost };
    if (
      reserve &&
      GOODS.some(
        (g) =>
          (stock[g] ?? 0) - (cost[g] ?? 0) <
          Math.min(stock[g] ?? 0, reserve.cost[g] ?? 0),
      )
    )
      continue;
    if (affordable(s, cost) && check(s, project.action))
      return reserve
        ? project.action
        : (commission(project) ??
            recruitmentBatch(s, project.action, project.quantity));
  }
  if (reserve) return { type: "military" };
  const planned = commission(top);
  if (planned) return planned;
  const trade = acquireToward(
    s,
    recruitmentFundingCost(s, top.action, top.quantity, top.cost, values),
  );
  if (trade && check(s, trade)) return trade;
  return { type: "military" };
}
// A landing can lead to an inland town; requiring the town itself to touch water
// strands invasion fleets on archipelagos. These public-map regions ignore unit
// positions for strategic reach; tactical paths still validate enemy blocking.
const geographyCache = new WeakMap<Game, Map<string, number>>();
const waterGeographyCache = new WeakMap<Game, Map<string, number>>();
function landRegions(s: Game, water = false) {
  const cache = water ? waterGeographyCache : geographyCache;
  const cached = cache.get(s);
  if (cached) return cached;
  const region = new Map<string, number>();
  let label = 0;
  for (const tile of Object.values(s.tiles)) {
    if (!canOccupy(tile, water) || region.has(tile.id)) continue;
    const queue = [tile.id];
    region.set(tile.id, label++);
    for (let i = 0; i < queue.length; i++)
      for (const n of neighbors(queue[i])) {
        if (s.tiles[n] && canOccupy(s.tiles[n], water) && !region.has(n)) {
          region.set(n, label - 1);
          queue.push(n);
        }
      }
  }
  cache.set(s, region);
  return region;
}
// State objects are immutable during planning and replaced after every action.
// Cache repeated reachability queries for a whole stack instead of each unit.
const coastCache = new WeakMap<Game, Map<string, string[]>>();
const objectiveCache = new WeakMap<Game, Map<string, boolean>>();
// Shared rendezvous plans bring inland troops and empty transports to the same
// coast. Looking only beside their current positions makes them chase each other.
const rendezvousCache = new WeakMap<
  Game,
  { land: string; sea: string; army: string; fleet: string }[]
>();
function transportRendezvous(s: Game) {
  const cached = rendezvousCache.get(s);
  if (cached) return cached;
  const troops = ownPieces(s).filter(
    (u) => !u.naval && !u.carrier && !collector(u) && !isSettler(u.kind),
  );
  const fleets = ownPieces(s).filter(
    (u) =>
      u.naval &&
      !collector(u) &&
      !isSettler(u.kind) &&
      shipStats(u.kind as ShipClass, u.tier).capacity > 0 &&
      !ownPieces(s).some(
        (p) => p.carrier && s.pieces[p.carrier]?.tile === u.tile,
      ),
  );
  const pairs: {
    land: string;
    sea: string;
    army: string;
    fleet: string;
    cost: number;
  }[] = [];
  for (const army of new Set(troops.map((u) => u.tile))) {
    if (hasLandObjective(s, army)) continue;
    const landPaths = deploymentPaths(s, army, false);
    const shores = [...landPaths.keys()]
      .filter((land) => !hostileAt(s, land))
      .flatMap((land) =>
        neighbors(land)
          .filter(
            (sea) =>
              canOccupy(s.tiles[sea], true) &&
              !hostileAt(s, sea, s.active, true),
          )
          .map((sea) => ({ land, sea })),
      );
    const invasion = invasionCoasts(s, army);
    if (!invasion.length) continue;
    for (const fleet of new Set(fleets.map((u) => u.tile))) {
      const seaPaths = deploymentPaths(s, fleet, true);
      if (
        !invasion.some(
          (sea) => seaPaths.has(sea) && !hostileAt(s, sea, s.active, true),
        )
      )
        continue;
      const best = shores
        .filter(({ sea }) => seaPaths.has(sea))
        .map(({ land, sea }) => ({
          land,
          sea,
          army,
          fleet,
          cost: landPaths.get(land)!.length + seaPaths.get(sea)!.length / 2,
        }))
        .sort((a, b) => a.cost - b.cost)[0];
      if (best) pairs.push(best);
    }
  }
  pairs.sort((a, b) => a.cost - b.cost);
  const result: typeof pairs = [];
  for (const pair of pairs)
    if (!result.some((p) => p.army === pair.army || p.fleet === pair.fleet))
      result.push(pair);
  rendezvousCache.set(s, result);
  return result;
}

// One search per origin covers every strategic destination. Hostile tiles are
// endpoints only, matching the movement rules, and can never be bypassed.
const deploymentCache = new WeakMap<Game, Map<string, Map<string, string[]>>>();
function deploymentPaths(s: Game, origin: string, naval: boolean) {
  let cache = deploymentCache.get(s);
  if (!cache) {
    cache = new Map();
    deploymentCache.set(s, cache);
  }
  const key = `${s.active}/${origin}/${naval}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const paths = new Map<string, string[]>([[origin, []]]);
  const queue = [origin];
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    for (const next of neighbors(id)) {
      if (!canOccupy(s.tiles[next], naval) || paths.has(next)) continue;
      paths.set(next, [...paths.get(id)!, next]);
      if (!hostileAt(s, next, s.active, naval)) queue.push(next);
    }
  }
  cache.set(key, paths);
  return paths;
}
function invasionCoasts(s: Game, excludeLand?: string): string[] {
  let cache = coastCache.get(s);
  if (!cache) {
    cache = new Map();
    coastCache.set(s, cache);
  }
  const key = `${s.active}/${excludeLand ?? ""}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const region = landRegions(s),
    home = excludeLand ? region.get(excludeLand) : undefined;
  // A beach behind a choke point must be judged with the army we can ferry
  // there, not only troops already standing on the far side of that choke.
  const expeditionaryForce = excludeLand
    ? ownPieces(s).filter(
        (u) =>
          !u.naval &&
          !u.carrier &&
          !collector(u) &&
          region.get(u.tile) === home &&
          reachable(s, excludeLand, u.tile, false, s.active),
      )
    : undefined;
  const wanted = new Set(
    Object.values(s.towns)
      .filter((t) => warTarget(s, t.owner))
      .flatMap((t) => landAtVertex(s, t.vertex).map((id) => region.get(id)))
      .filter(
        (r) => r !== home || (excludeLand && !hasLandObjective(s, excludeLand)),
      ),
  );
  const result = Object.values(s.tiles)
    .filter(
      (t) =>
        canOccupy(t, true) &&
        neighbors(t.id).some(
          (id) =>
            region.has(id) &&
            wanted.has(region.get(id)) &&
            (region.get(id) !== home ||
              !excludeLand ||
              (!hostileAt(s, id) &&
                hasLandObjective(s, id, expeditionaryForce))),
        ),
    )
    .map((t) => t.id);
  cache.set(key, result);
  return result;
}
function landObjectives(s: Game) {
  return planningValue(s, `landObjectives/${s.active}`, () =>
    Object.values(s.towns)
      .filter((t) => warTarget(s, t.owner))
      .map((t) => {
        const tiles = landAtVertex(s, t.vertex);
        const defenders = tiles.flatMap((tile) =>
          piecesAt(s, tile, false).filter(
            (u) => friendly(s, u.owner, t.owner) && !collector(u),
          ),
        );
        return { tiles, defenders, strength: new Map<string, number>() };
      }),
  );
}
function objectiveBeatable(
  s: Game,
  objective: ReturnType<typeof landObjectives>[number],
  groups: Map<string, Piece[]>,
) {
  const { tiles, defenders, strength } = objective;
  if (!defenders.length) return true;
  return tiles.some((tile) => {
    if (!strength.has(tile))
      strength.set(tile, threatPower(s, defenders, [tile]));
    for (const force of groups.values())
      if (power(s, force, tile) > strength.get(tile)!) return true;
    return false;
  });
}
function fieldGroupsFor(s: Game, units: Piece[]) {
  const groups = new Map<string, Piece[]>();
  for (const unit of units) {
    const key = unit.carrier
      ? (s.pieces[unit.carrier]?.tile ?? unit.tile)
      : unit.tile;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(unit);
  }
  return groups;
}
interface LandingObjectives {
  targets: string[][];
  reachable: Map<string, boolean>;
}
const landingObjectives = new WeakMap<
  Game,
  {
    arrays: WeakMap<Piece[], LandingObjectives>;
    forces: Map<string, LandingObjectives>;
  }
>();
function landingHasObjective(
  s: Game,
  origin: string,
  arriving: Piece[],
): boolean {
  let cached = landingObjectives.get(s);
  if (!cached) {
    cached = { arrays: new WeakMap(), forces: new Map() };
    landingObjectives.set(s, cached);
  }
  let plan = cached.arrays.get(arriving);
  if (!plan) {
    // Many potential beaches are evaluated for exactly the same arriving
    // army. Group its soldiers and assess defenders once, not at every beach.
    const key = `${s.active}/${arriving.map((u) => u.id).join(",")}`;
    plan = cached.forces.get(key);
    if (!plan) {
      const groups = fieldGroupsFor(s, arriving);
      plan = {
        targets: landObjectives(s)
          .filter((objective) => objectiveBeatable(s, objective, groups))
          .map((o) => o.tiles),
        reachable: new Map(),
      };
      cached.forces.set(key, plan);
    }
    cached.arrays.set(arriving, plan);
  }
  if (!plan.reachable.has(origin))
    plan.reachable.set(
      origin,
      plan.targets.some((tiles) =>
        tiles.some((target) => reachable(s, origin, target, false, s.active)),
      ),
    );
  return plan.reachable.get(origin)!;
}
function hasLandObjective(
  s: Game,
  origin: string,
  arriving?: Piece[],
): boolean {
  if (arriving) return landingHasObjective(s, origin, arriving);
  let cache = objectiveCache.get(s);
  if (!cache) {
    cache = new Map();
    objectiveCache.set(s, cache);
  }
  const key = `${s.active}/${origin}/local`;
  if (cache.has(key)) return cache.get(key)!;
  const region = landRegions(s).get(origin);
  const eligibility = new Map<string, boolean>();
  const available = ownPieces(s).filter((u) => {
    if (u.naval || collector(u)) return false;
    const key = `${u.tile}/${!!u.carrier}`;
    if (!eligibility.has(key))
      eligibility.set(
        key,
        u.carrier
          ? neighbors(u.tile).some((id) => landRegions(s).get(id) === region)
          : landRegions(s).get(u.tile) === region &&
              reachable(s, origin, u.tile, false, s.active),
      );
    return eligibility.get(key)!;
  });
  const fieldGroups = fieldGroupsFor(s, available);
  const result = landObjectives(s).some(
    (objective) =>
      objective.tiles.some((target) =>
        reachable(s, origin, target, false, s.active),
      ) && objectiveBeatable(s, objective, fieldGroups),
  );
  cache.set(key, result);
  return result;
}
function townOperation(s: Game): Command | null {
  const enemies = Object.values(s.towns)
    .filter((t) => warTarget(s, t.owner))
    .sort((a, b) => leaderPressure(s, b.owner) - leaderPressure(s, a.owner));
  for (const group of armyGroups(s)) {
    const naval = group[0].naval;
    if (!group.some((u) => canBesiege(s, u))) continue;
    for (const town of enemies.filter(
      (t) =>
        s.vertices[t.vertex].tiles.includes(group[0].tile) &&
        !protects(s, t, naval),
    )) {
      const siege = s.sieges[`${s.active}:${town.id}`];
      if (siege?.last === s.players[s.active].turns) continue;
      if (siege?.raided != null) {
        const ids = group
          .filter((u) => fresh(s, u) && canBesiege(s, u))
          .slice(0, 1)
          .map((u) => u.id);
        const destroy = { type: "destroy-town", town: town.id, ids };
        if (ids.length && check(s, destroy)) return destroy;
      }
      const ids = group
        .filter(
          (u) =>
            speed(u) + u.bonus - u.moved >= 1 && (!naval || canBesiege(s, u)),
        )
        .map((u) => u.id);
      // Pull down a supporting tower when doing so removes more siege delay
      // than the tower costs to overcome. Do not abandon accumulated city work.
      const eligible = ids.map((id) => s.pieces[id]);
      if (
        !naval &&
        ids.length &&
        siege?.raided == null &&
        (siege?.progress ?? 0) < siegeRequirement(s, town, eligible)
      ) {
        const supporting = new Set([
          town.vertex,
          ...vertexNeighbors(s, town.vertex),
        ]);
        for (const tower of Object.values(s.towers)) {
          const steps = towerSiegeRequirement(tower, eligible);
          if (
            tower.owner !== town.owner ||
            !supporting.has(tower.vertex) ||
            !s.vertices[tower.vertex].tiles.includes(group[0].tile) ||
            steps + 1 > tower.tier ||
            (siege && steps > 0)
          )
            continue;
          const dismantle = {
            type: "destroy-tower",
            vertex: tower.vertex,
            ids,
          };
          if (check(s, dismantle)) return dismantle;
        }
      }
      // Siege strength is independent of army size. Keep the slowest cheap
      // operator and only equipment that actually shortens this siege.
      const ordered = [...eligible].sort(
        (a, b) => speed(a) - speed(b) || a.tier - b.tier,
      );
      const crew: Piece[] = ordered.length ? [ordered[0]] : [];
      for (const unit of ordered
        .slice(1)
        .sort((a, b) => siegePower([b]) - siegePower([a]))) {
        if (siegeRequirement(s, town, crew) <= (siege?.progress ?? 0)) break;
        if (
          siegeRequirement(s, town, [...crew, unit]) <
          siegeRequirement(s, town, crew)
        )
          crew.push(unit);
      }
      const action = {
        type: "siege",
        town: town.id,
        ids: crew.map((u) => u.id),
      };
      if (crew.length && check(s, action)) return action;
    }
  }
  return null;
}
function collectorMove(s: Game): Command | null {
  const values = marketValues(s);
  const dangerCache = new Map<string, boolean>();
  const harvestScores = new Map<string, number>();
  const staying = new Set<string>();
  const threats = Object.values(s.pieces)
    .filter((v) => !friendly(s, v.owner, s.active) && points(v) > 0)
    .map((v) => ({ unit: v, movement: speed(v) }));
  function threatened(tile: string, naval: boolean) {
    const key = `${tile}/${naval}`;
    if (!dangerCache.has(key))
      dangerCache.set(
        key,
        threats.some(
          ({ unit: v, movement }) =>
            v.naval === naval &&
            distance(v.tile, tile) <= movement &&
            reachable(s, v.tile, tile, v.naval, v.owner, movement),
        ),
      );
    return dangerCache.get(key)!;
  }
  for (const u of ownPieces(s).filter((u) => collector(u) && ready(s, u))) {
    if (speed(u) + u.bonus - u.moved < 1) continue;
    // Identical collectors on the same hex have the same legal destinations
    // and harvest choices. Keep their original order, but don't reassess a
    // stationary formation once for every individual merchant.
    const position = JSON.stringify([
      u.kind,
      u.tier,
      u.tile,
      u.naval,
      u.coverage,
      u.bonus - u.moved,
    ]);
    if (staying.has(position)) continue;
    const score = (tile: string) => {
      const key = JSON.stringify([
        u.kind,
        u.tier,
        tile,
        tile === u.tile ? u.coverage : undefined,
      ]);
      const cached = harvestScores.get(key);
      if (cached !== undefined) return cached;
      const projected = {
        ...u,
        tile,
        coverage: tile === u.tile ? u.coverage : undefined,
      };
      const output = harvestTiles(s, projected).reduce(
        (n, id) =>
          n +
          probability(s.tiles[id].number) *
            stockValue(
              harvestYield(s.tiles[id], s.active, u.tier, u.kind !== "fishing"),
              values,
            ),
        0,
      );
      const result = output - (threatened(tile, u.naval) ? 20 : 0);
      harvestScores.set(key, result);
      return result;
    };
    const current = score(u.tile),
      targets = moveTargets(s, [u.id]);
    const best = Object.keys(targets)
      .filter(
        (id) =>
          !hostileAt(s, id, u.owner, u.naval) &&
          seasonalDestinationSafe(s, id, u.naval),
      )
      .map((tile) => ({
        tile,
        score: score(tile) - targets[tile].length * 0.08,
      }))
      .sort((a, b) => b.score - a.score)[0];
    if (best && best.score > current + 0.08)
      return { type: "move", ids: [u.id], to: best.tile };
    staying.add(position);
  }
  return null;
}
function continueTowerSiege(s: Game): Command | null {
  for (const record of Object.values(s.towerSieges ?? {})) {
    const tower = s.towers[record.vertex];
    if (
      record.owner !== s.active ||
      !tower ||
      !warTarget(s, tower.owner) ||
      record.last === s.players[s.active].turns
    )
      continue;
    for (const group of armyGroups(s)) {
      if (
        group[0].naval ||
        !s.vertices[tower.vertex].tiles.includes(group[0].tile)
      )
        continue;
      const ids = group
        .filter((u) => speed(u) + u.bonus - u.moved >= 1)
        .map((u) => u.id);
      const action = { type: "destroy-tower", vertex: tower.vertex, ids };
      if (ids.length && check(s, action)) return action;
    }
  }
  return null;
}
function chooseMilitary(s: Game): Command {
  const evacuation = seasonalEvacuation(s);
  if (evacuation) return evacuation;
  const emergency = emergencyTarget(s) !== undefined;
  const colony = emergency ? undefined : colonistAction(s);
  if (colony) return colony;
  const towerOperation = continueTowerSiege(s);
  if (towerOperation) return towerOperation;
  const economicMove = emergency ? undefined : collectorMove(s);
  if (economicMove) return economicMove;
  const engineering = guildMilitaryOrder(s, true);
  if (engineering && check(s, engineering)) return engineering;
  const operation = townOperation(s);
  if (operation) return operation;
  const supply = guildMilitaryOrder(s);
  if (supply && check(s, supply)) return supply;
  const maneuver = cachedMilitaryWait(s, () => chooseManeuver(s, emergency));
  if (maneuver.type !== "end-turn") return maneuver;
  if (emergency) {
    const support = collectorMove(s) ?? colonistAction(s);
    if (support) return support;
  }
  return maneuver;
}
function chooseManeuver(s: Game, emergency: boolean): Command {
  const groups = armyGroups(s, s.active, false, true),
    drive = conquestDrive(s),
    enemyTowns = Object.values(s.towns)
      .filter((t) => warTarget(s, t.owner))
      .sort((a, b) => leaderPressure(s, b.owner) - leaderPressure(s, a.owner)),
    allies = ownTowns(s);
  const crisis = dominance(s);
  const denial = new Map<string, number>();
  for (const town of enemyTowns)
    for (const tile of s.vertices[town.vertex].tiles) {
      if (!tileGood(s.tiles[tile])) continue;
      denial.set(
        tile,
        (denial.get(tile) ?? 0) +
          probability(s.tiles[tile].number) *
            (town.level * sumStock(tileYield(s.tiles[tile], town.owner)) +
              sumStock(tileYield(s.tiles[tile], town.owner)) *
                Math.max(0, town.level - 2) *
                2.5 +
              workshopYield(
                s.tiles[tile],
                town.owner,
                town.extensionGoods?.[tile] ??
                  tileGood(s.tiles[tile], town.owner)!,
                town.extensions[tile] ?? 0,
              ) *
                2.5) *
            leaderPressure(s, town.owner),
      );
    }
  for (const route of Object.values(s.routes)) {
    if (!warTarget(s, route.owner)) continue;
    for (const [tile, tier] of Object.entries(route.camps))
      denial.set(
        tile,
        (denial.get(tile) ?? 0) +
          probability(s.tiles[tile].number) *
            tier *
            sumStock(tileYield(s.tiles[tile], route.owner)) *
            leaderPressure(s, route.owner),
      );
  }
  // An allied blockade already denies the same production; spread out instead.
  const denialAt = (tile: string, moving: Piece[]) =>
    combatantsAt(s, tile, canOccupy(s.tiles[tile], true)).some(
      (u) =>
        !moving.some((v) => v.id === u.id) &&
        !warTarget(s, u.owner) &&
        (!collector(u) || u.naval),
    )
      ? 0
      : (denial.get(tile) ?? 0);
  const shoreShots = groups
    .flatMap((group) => {
      const artillery = group.filter(
          (u) => u.kind === "artillery" && speed(u) + u.bonus - u.moved >= 1,
        ),
        ids = artillery.map((u) => u.id);
      return bombardmentTargets(s, ids).flatMap((to) => {
        const fleet = fleetDefenders(s, to, s.active),
          attack = bombardmentPower(s, artillery),
          defense = power(s, fleet, to);
        return warTarget(s, fleet[0].owner) && attack > defense
          ? [
              {
                action: { type: "bombard", ids, to },
                score:
                  (16 +
                    Math.min(attack - defense, defense) * 2 +
                    fleet.filter(collector).length * 9) *
                  leaderPressure(s, fleet[0].owner),
              },
            ]
          : [];
      });
    })
    .sort((a, b) => b.score - a.score);
  for (const shot of shoreShots) if (check(s, shot.action)) return shot.action;
  const crossing = campaignTransportAction(s);
  if (crossing && check(s, crossing)) return crossing;
  // Complete stationary operations before pathfinding can pull units away.
  for (const group of groups) {
    if (!group[0].naval) {
      const road = Object.values(s.routes).find(
        (r) =>
          warTarget(s, r.owner) &&
          r.kind === "road" &&
          s.edges[r.edge].tiles.includes(group[0].tile) &&
          Object.keys(r.camps).length,
      );
      const ids = group
        .filter((u) => ready(s, u) && speed(u) + u.bonus - u.moved >= 1)
        .slice(0, 1)
        .map((u) => u.id);
      const action = road && { type: "destroy-route", edge: road.edge, ids };
      if (action && ids.length && check(s, action)) return action;
    }
    const units = group.filter((u) => fresh(s, u));
    if (!units.length) continue;
    const ids = units.map((u) => u.id),
      tile = units[0].tile;
    if (!units[0].naval && !emergency) {
      // Embark only when a reachable overseas objective has no land path.
      for (const sea of neighbors(tile).filter((id) =>
        canOccupy(s.tiles[id], true),
      )) {
        const ships = piecesAt(s, sea, true).filter(
          (u) => u.owner === s.active && fresh(s, u),
        );
        const free = ships.reduce(
          (n, u) =>
            n +
            shipStats(u.kind as ShipClass, u.tier).capacity -
            Object.values(s.pieces).filter((v) => v.carrier === u.id).length,
          0,
        );
        const boarding: Piece[] = [];
        for (const unit of [...units].sort((a, b) => b.tier - a.tier))
          if (
            boarding.length < free &&
            !leavesTownExposed(s, [...boarding, unit])
          )
            boarding.push(unit);
        if (
          boarding.length > 0 &&
          !hasLandObjective(s, tile) &&
          !units.some(
            (u) =>
              u.kind === "artillery" &&
              Object.values(s.pieces).some(
                (v) =>
                  v.naval &&
                  warTarget(s, v.owner) &&
                  neighbors(v.tile).some(
                    (shore) =>
                      s.tiles[shore] &&
                      canOccupy(s.tiles[shore]) &&
                      landRegions(s).get(shore) === landRegions(s).get(tile),
                  ),
              ),
          ) &&
          invasionCoasts(s, tile).some((w) =>
            reachable(s, sea, w, true, s.active),
          )
        ) {
          const action = {
            type: "load",
            ids: boarding.map((u) => u.id),
            ships: ships.map((u) => u.id),
          };
          if (check(s, action)) return action;
        }
      }
    } else if (units[0].naval && !emergency) {
      const passengers = Object.values(s.pieces).filter(
        (u) => u.carrier && ids.includes(u.carrier),
      );
      if (passengers.length) {
        const land = neighbors(tile).filter(
          (t) =>
            s.tiles[t] &&
            canOccupy(s.tiles[t]) &&
            !hostileAt(s, t) &&
            hasLandObjective(s, t, passengers),
        );
        const landing = land
          .map((id) => ({
            id,
            d: minValue(
              enemyTowns.flatMap((t) =>
                landAtVertex(s, t.vertex).map(
                  (v) =>
                    planningDistance(s, id, v, false, s.active) /
                    leaderPressure(s, t.owner),
                ),
              ),
            ),
          }))
          .sort((a, b) => a.d - b.d)[0];
        if (landing && Number.isFinite(landing.d)) {
          const action = {
            type: "unload",
            ships: ids,
            ids: passengers.map((u) => u.id),
            to: landing.id,
          };
          if (check(s, action)) return action;
        }
      }
    }
  }
  const choices: { action: Command; score: number }[] = [];
  for (const original of groups) {
    const variants = [original];
    if (original.length > 1) {
      const keeper = [...original].sort(
        (a, b) => speed(a) - speed(b) || points(a) - points(b),
      )[0];
      variants.push(original.filter((u) => u.id !== keeper.id));
    }
    if (!original[0].naval && original.length > 1) {
      const fastest = maxValue(original.map(speed));
      const mobile = original.filter((u) => speed(u) === fastest);
      if (mobile.length < original.length) variants.push(mobile);
      // A small cheap party can afford a risky raid without committing the main army.
      if (crisis.leader !== s.active && crisis.severity >= 0.2) {
        const raiders: Piece[] = [];
        let budget = 4;
        for (const u of [...original]
          .filter((u) => u.kind !== "artillery")
          .sort((a, b) => speed(b) - speed(a) || a.tier - b.tier)) {
          if (u.tier > budget) continue;
          raiders.push(u);
          budget -= u.tier;
        }
        if (raiders.length && raiders.length < original.length)
          variants.push(raiders);
      }
    }
    const supplied = original.filter((u) => u.guildSupplied);
    if (supplied.length && supplied.length !== original.length)
      variants.push(supplied);
    const battery = original.filter((u) => u.kind === "artillery");
    if (battery.length && battery.length !== original.length)
      variants.push(battery);
    // Leave enough guards and send the surplus. Moving only whole stacks can
    // pin a large army forever behind a single nearby enemy.
    if (
      !original[0].naval &&
      original.length > 1 &&
      leavesTownExposed(s, original)
    ) {
      const detachment = [...original].sort(
        (a, b) =>
          power(s, [b], b.tile) - power(s, [a], a.tile) || b.tier - a.tier,
      );
      while (detachment.length && leavesTownExposed(s, detachment))
        detachment.pop();
      if (detachment.length) variants.push(detachment);
    }
    if (
      !original[0].naval &&
      original.some((u) => u.kind === "artillery") &&
      original.some((u) => u.kind === "cavalry")
    ) {
      const fast = original.filter((u) => u.kind === "cavalry");
      if (fast.length) variants.push(fast);
    }
    const seenVariants = new Set<string>();
    for (const group of variants) {
      const signature = group
        .map((u) => u.id)
        .sort()
        .join(",");
      if (seenVariants.has(signature)) continue;
      seenVariants.add(signature);
      const ids = group.map((u) => u.id),
        origin = group[0].tile,
        naval = group[0].naval;
      if (
        Object.values(s.sieges).some(
          (siege) =>
            siege.owner === s.active &&
            s.towns[siege.town] &&
            warTarget(s, s.towns[siege.town].owner) &&
            s.vertices[s.towns[siege.town].vertex].tiles.includes(origin) &&
            !s.vertices[s.towns[siege.town].vertex].tiles.some((tile) =>
              piecesAt(s, tile).some(
                (u) =>
                  u.owner === s.active &&
                  canBesiege(s, u) &&
                  !ids.includes(u.id),
              ),
            ),
        )
      )
        continue;
      if (
        !naval &&
        Object.values(s.towerSieges ?? {}).some(
          (siege) =>
            siege.owner === s.active &&
            s.towers[siege.vertex] &&
            warTarget(s, s.towers[siege.vertex].owner) &&
            s.vertices[siege.vertex].tiles.includes(origin) &&
            !s.vertices[siege.vertex].tiles.some((tile) =>
              piecesAt(s, tile, false).some(
                (u) =>
                  u.owner === s.active && !collector(u) && !ids.includes(u.id),
              ),
            ),
        )
      )
        continue;
      const targets = moveTargets(s, ids);
      const blockade =
        naval &&
        group.some(
          (u) => shipStats(u.kind as ShipClass, u.tier).capacity === 0,
        ) &&
        !Object.values(s.pieces).some(
          (u) => u.carrier && ids.includes(u.carrier),
        );
      let objectives: string[] = [];
      if (naval) {
        const passengers = Object.values(s.pieces).filter(
          (u) => u.carrier && ids.includes(u.carrier),
        );
        objectives = passengers.length
          ? invasionCoasts(s).filter((w) =>
              neighbors(w).some(
                (l) =>
                  canOccupy(s.tiles[l]) &&
                  s.tiles[l] &&
                  !hostileAt(s, l) &&
                  hasLandObjective(s, l, passengers) &&
                  enemyTowns.some((t) =>
                    landAtVertex(s, t.vertex).some((v) =>
                      reachable(s, l, v, false, s.active),
                    ),
                  ),
              ),
            )
          : Object.values(s.pieces)
              .filter(
                (u) =>
                  (u.naval || !!u.seasonStatus) &&
                  !u.carrier &&
                  warTarget(s, u.owner) &&
                  canOccupy(s.tiles[u.tile], true),
              )
              .map((u) => u.tile);
        if (
          !passengers.length &&
          group.some((u) => shipStats(u.kind as ShipClass, u.tier).capacity > 0)
        ) {
          const pickup = ownPieces(s)
            .filter(
              (u) =>
                !u.naval &&
                !collector(u) &&
                !u.carrier &&
                !hasLandObjective(s, u.tile) &&
                invasionCoasts(s, u.tile).length,
            )
            .flatMap((u) =>
              neighbors(u.tile).filter(
                (w) =>
                  canOccupy(s.tiles[w], true) &&
                  reachable(s, origin, w, true, s.active),
              ),
            );
          if (pickup.length) objectives = [...new Set(pickup)];
          if (emergency) {
            const rendezvous = transportRendezvous(s).find(
              (p) => p.fleet === origin,
            );
            if (rendezvous) {
              if (rendezvous.sea === origin) continue;
              objectives = [rendezvous.sea];
            }
          }
        }
        // Siege-capable fleets can attack an undefended coast directly, without
        // waiting for transports. Passenger fleets keep their landing orders.
        if (!passengers.length && group.some((u) => canBesiege(s, u)))
          objectives = [
            ...objectives,
            ...enemyTowns
              .filter((t) => !protects(s, t, true))
              .flatMap((t) => waterAtVertex(s, t.vertex)),
          ];
        if (!objectives.length && !emergency)
          objectives = ownPieces(s)
            .filter(
              (u) =>
                u.naval &&
                shipStats(u.kind as ShipClass, u.tier).capacity > 0 &&
                u.tile !== origin,
            )
            .map((u) => u.tile);
      } else {
        const defense =
          !emergency &&
          allies.find(
            (t) =>
              landAtVertex(s, t.vertex).some(
                (tile) =>
                  distance(origin, tile) <= maxValue(group.map(speed)) * 2,
              ) &&
              threatPower(
                s,
                townThreats(s, t).filter((u) => warTarget(s, u.owner)),
                landAtVertex(s, t.vertex),
              ) > townGuardPower(s, t),
          );
        objectives = [
          ...(defense ? landAtVertex(s, defense.vertex) : []),
          ...enemyTowns.flatMap((t) => landAtVertex(s, t.vertex)),
          ...Object.values(s.routes)
            .filter((r) => warTarget(s, r.owner))
            .flatMap((r) =>
              (r.owner === crisis.leader && crisis.severity >= 0.2
                ? s.edges[r.edge].tiles
                : Object.keys(r.camps)
              ).filter((id) => canOccupy(s.tiles[id])),
            ),
          ...[
            ...new Set(
              Object.values(s.pieces)
                .filter(
                  (u) =>
                    (!u.naval || !!u.seasonStatus) &&
                    !u.carrier &&
                    warTarget(s, u.owner) &&
                    canOccupy(s.tiles[u.tile], false),
                )
                .map((u) => u.tile),
            ),
          ].filter(
            (tile) =>
              power(s, group, tile) >
              power(
                s,
                combatantsAt(s, tile, false).filter(
                  (v) => !friendly(s, v.owner, s.active),
                ),
                tile,
              ),
          ),
        ];
      }
      if (group.every((u) => u.kind === "artillery")) {
        const targets = [
          ...new Set(
            Object.values(s.pieces)
              .filter((u) => u.naval && warTarget(s, u.owner))
              .map((u) => u.tile),
          ),
        ];
        const firingPositions = targets.flatMap((water) => {
          const fleet = fleetDefenders(s, water, s.active);
          return neighbors(water).filter(
            (shore) =>
              s.tiles[shore] &&
              canOccupy(s.tiles[shore]) &&
              !hostileAt(s, shore) &&
              bombardmentPower(
                s,
                group.map((u) => ({ ...u, tile: shore })),
              ) > power(s, fleet, water),
          );
        });
        objectives = [...new Set([...firingPositions, ...objectives])];
      }
      // Reachable does not mean attackable: an occupied destination may be an
      // unbeatable stack. Filter it before selecting a strategic goal, otherwise
      // the nearest choke point masks every more distant raid or landing.
      objectives = [
        ...new Set([
          ...objectives,
          ...[...denial.keys()].filter(
            (tile) => (!naval || blockade) && canOccupy(s.tiles[tile], naval),
          ),
        ]),
      ].filter((target) => {
        if (target === origin) return false;
        const foes = combatantsAt(s, target, naval).filter(
          (u) => !friendly(s, u.owner, s.active),
        );
        return (
          !foes.length ||
          (foes.every((u) => warTarget(s, u.owner)) &&
            power(s, group, target) > power(s, foes, target))
        );
      });
      const weights = new Map<string, number>();
      const objectiveWeight = (target: string) => {
        if (weights.has(target)) return weights.get(target)!;
        const near = naval ? neighbors(target) : [target];
        let value = maxValue([
          1,
          Math.min(5, denialAt(target, group) * 2),
          ...enemyTowns
            .filter((t) =>
              landAtVertex(s, t.vertex).some((id) => near.includes(id)),
            )
            .map((t) => {
              const helpers = landAtVertex(s, t.vertex)
                .flatMap((id) => piecesAt(s, id, false))
                .filter(
                  (u) =>
                    u.owner !== s.active &&
                    u.owner !== t.owner &&
                    friendly(s, u.owner, s.active),
                );
              return (
                leaderPressure(s, t.owner) *
                (protects(s, t, naval)
                  ? 0.2
                  : (2.5 + Math.min(3, sumStock(t.stock) / 20)) /
                    (1 + siegeRequirement(s, t, group) * 0.35)) *
                (1 + 0.8 / Math.max(1, ownTowns(s, t.owner).length)) *
                (1 +
                  Math.min(2, new Set(helpers.map((u) => u.owner)).size) * 0.3)
              );
            }),
          ...Object.values(s.routes)
            .filter(
              (r) =>
                warTarget(s, r.owner) &&
                Object.keys(r.camps).some((id) => near.includes(id)),
            )
            .map((r) => leaderPressure(s, r.owner)),
          ...combatantsAt(s, target, naval)
            .filter((u) => warTarget(s, u.owner) && collector(u))
            .map(
              (u) =>
                (2 + u.tier + Math.max(0, u.tier - 2)) *
                leaderPressure(s, u.owner),
            ),
          ...allies
            .filter((t) => landAtVertex(s, t.vertex).includes(target))
            .map((t) => {
              const danger = threatPower(
                s,
                townThreats(s, t),
                landAtVertex(s, t.vertex),
              );
              return danger > townGuardPower(s, t) &&
                distance(origin, target) <= maxValue(group.map(speed)) * 2
                ? 3
                : 0;
            }),
        ]);
        if (emergency) {
          // Spread across productive fronts already occupied by allies. An
          // uncovered target keeps its full value; combat strength is not pooled.
          const front = new Set([...near, ...near.flatMap(neighbors)]);
          const committed = Object.values(s.pieces).filter(
            (u) =>
              u.naval === naval &&
              !u.carrier &&
              (near.includes(u.tile) ||
                (u.campaign?.enemy === emergencyTarget(s) &&
                  front.has(u.campaign!.target))) &&
              friendly(s, u.owner, s.active) &&
              !ids.includes(u.id) &&
              points(u) > 0,
          );
          value /=
            1 +
            Math.min(
              3,
              committed.reduce((n, u) => n + points(u), 0) /
                Math.max(
                  2,
                  group.reduce((n, u) => n + points(u), 0),
                ),
            );
        }
        weights.set(target, value);
        return value;
      };
      const goalPaths = objectives
        .map((target) => ({
          target,
          path: emergency
            ? (deploymentPaths(s, origin, naval).get(target) ?? null)
            : pathTo(s, origin, target, naval, s.active),
        }))
        .filter((v) => v.path !== null)
        .sort(
          (a, b) =>
            a.path!.length / objectiveWeight(a.target) -
            b.path!.length / objectiveWeight(b.target),
        );
      let chosen = goalPaths[0];
      // Keep marching toward an assigned front instead of changing direction
      // whenever another army moves or a town's stock changes.
      if (emergency) {
        const orders = group.filter(
          (u) => u.campaign?.enemy === emergencyTarget(s),
        );
        const counts = new Map<string, number>();
        for (const unit of orders)
          counts.set(
            unit.campaign!.target,
            (counts.get(unit.campaign!.target) ?? 0) + 1,
          );
        const retained = [...counts]
          .sort((a, b) => b[1] - a[1])
          .map(([target]) => goalPaths.find((g) => g.target === target))
          .find((g) => g !== undefined);
        if (retained) chosen = retained;
      }
      if (!naval && (!chosen || !hasLandObjective(s, origin))) {
        const pickup = ownPieces(s)
          .filter(
            (u) =>
              u.naval &&
              shipStats(u.kind as ShipClass, u.tier).capacity > 0 &&
              invasionCoasts(s, origin).some((w) =>
                reachable(s, u.tile, w, true, s.active),
              ),
          )
          .flatMap((u) =>
            neighbors(u.tile).filter(
              (l) => s.tiles[l] && canOccupy(s.tiles[l]) && !hostileAt(s, l),
            ),
          );
        const rendezvous = emergency
          ? transportRendezvous(s).find((p) => p.army === origin)
          : undefined;
        if (rendezvous?.land === origin) continue;
        const passage = (rendezvous ? [rendezvous.land] : pickup)
          .map((target) => ({
            target,
            path: pathTo(s, origin, target, false, s.active),
          }))
          .filter((v) => v.path !== null)
          .filter((v) => v.path!.length > 0)
          .sort((a, b) => a.path!.length - b.path!.length)[0];
        if (passage) {
          chosen = passage;
          weights.set(passage.target, 4 + crisis.severity * 3);
        } else if (
          !rendezvous &&
          aiExpeditionAllowed(s) &&
          !s.players[s.active].expeditionUsed
        ) {
          // A blocked army can scout a new approach from the map edge rather
          // than orbiting the three guarded sides of the same enemy town.
          const frontier = Object.values(s.tiles)
            .filter(
              (tile) =>
                canOccupy(tile) &&
                tile.id !== origin &&
                tile.vertices.some((v) => unknownAtVertex(s, v).length) &&
                !hostileAt(s, tile.id),
            )
            .map((tile) => ({
              target: tile.id,
              path: pathTo(s, origin, tile.id, false, s.active),
            }))
            .filter((v) => v.path?.length)
            .sort((a, b) => {
              const proximity = (tile: string) =>
                minValue(
                  enemyTowns.flatMap((t) =>
                    landAtVertex(s, t.vertex).map((id) => distance(tile, id)),
                  ),
                );
              return (
                a.path!.length +
                proximity(a.target) -
                b.path!.length -
                proximity(b.target)
              );
            })[0];
          if (frontier) {
            chosen = frontier;
            weights.set(frontier.target, 3 + crisis.severity * 2);
          }
        }
      }
      for (const [to, path] of Object.entries(targets)) {
        const foes = combatantsAt(s, to, naval).filter(
          (u) => !friendly(s, u.owner, s.active),
        );
        const winning =
          foes.length > 0 && power(s, group, to) > power(s, foes, to);
        // A winning sortie forces this stack to retreat. It need not annihilate
        // every defender before guards may engage it; other threats still matter.
        const displaced = winning ? foes.map((u) => u.id) : [];
        if (leavesTownExposed(s, group, to, displaced)) continue;
        let score = -1;
        if (foes.length) {
          const a = power(s, group, to),
            d = power(s, foes, to);
          if (a <= d || !warTarget(s, foes[0].owner)) continue;
          score =
            (24 +
              (a - d) * 0.7 +
              foes.reduce((n, u) => n + points(u), 0) * 2 +
              foes.filter(collector).reduce((n, u) => n + u.tier * 9, 0)) *
            leaderPressure(s, foes[0].owner) *
            drive;
        } else if (chosen) {
          for (const goal of emergency
            ? [chosen]
            : [chosen, ...goalPaths.filter((g) => g !== chosen).slice(0, 3)]) {
            const after = pathTo(s, to, goal.target, naval, s.active);
            if (after && after.length < goal.path!.length)
              score = Math.max(
                score,
                ((goal.path!.length - after.length) * 5 +
                  (!after.length ? 8 : 0)) *
                  drive *
                  objectiveWeight(goal.target),
              );
          }
        }
        // Emergency marches must make progress toward their assigned objective.
        // Production denial is a reward for advancing, not a reason to orbit a
        // valuable tile or turn back every other action.
        if (emergency && !foes.length && score <= 0) continue;
        if (!naval || blockade)
          score += emergency
            ? Math.max(0, denialAt(to, group) - denialAt(origin, group)) * 10
            : (denialAt(to, group) - denialAt(origin, group)) * 10;
        if (
          winning &&
          !naval &&
          allies.some((t) =>
            townThreats(s, t).some((u) => displaced.includes(u.id)),
          )
        )
          score += 150;
        if (!naval) {
          const remaining =
            minValue(group.map((u) => speed(u) + u.bonus - u.moved)) -
            path.length;
          if (remaining >= 1) {
            for (const town of enemyTowns.filter(
              (t) =>
                s.vertices[t.vertex].tiles.includes(to) &&
                !protects(s, t) &&
                s.sieges[`${s.active}:${t.id}`]?.last !==
                  s.players[s.active].turns,
            )) {
              // Arrive with a point left to raid now, rather than expose a full
              // movement march to a counterattack before collecting any spoils.
              const delay = siegeRequirement(s, town, group);
              score +=
                ((18 + (delay === 0 ? Math.min(20, sumStock(town.stock)) : 0)) *
                  leaderPressure(s, town.owner)) /
                (1 + delay);
            }
          }
          const dangerHexes =
            s.players[s.active].control === "hard"
              ? Object.keys(s.tiles).filter((n) => distance(n, to) <= 3)
              : neighbors(to);
          const nearby = dangerHexes.flatMap((n) =>
            piecesAt(s, n, false).filter(
              (u) =>
                !friendly(s, u.owner, s.active) &&
                !displaced.includes(u.id) &&
                reachable(s, n, to, false, u.owner, 3),
            ),
          );
          const biggest = threatPower(s, nearby, [to]);
          if (biggest > power(s, group, to) * 1.1) {
            const crisis = dominance(s);
            const raider = group.reduce((n, u) => n + u.tier, 0) <= 4;
            const disruptingLeader =
              enemyTowns.some(
                (t) =>
                  t.owner === crisis.leader &&
                  s.vertices[t.vertex].tiles.includes(to),
              ) ||
              Object.values(s.routes).some(
                (r) => r.owner === crisis.leader && r.camps[to],
              );
            // Risk cheap disruptions as the crisis grows; losing a battle cannot
            // hurt its winner under these rules, so never order futile assaults.
            score -=
              (s.players[s.active].control === "easy" ? 8 : 20 / drive) *
              (raider && disruptingLeader ? 1 - crisis.severity * 0.8 : 1);
          }
        }
        if (score > 0)
          choices.push({
            action: {
              type: "move",
              ids,
              to,
              ...(emergency && chosen
                ? { mode: "campaign", target: chosen.target }
                : {}),
            },
            score,
          });
      }
      // Merge a weaker army with friendly reinforcements rather than feed it into a stronger defender.
      if (!choices.some((v) => v.action.ids?.join() === ids.join()))
        for (const other of groups) {
          if (other === original || other[0].naval !== naval) continue;
          const strength = (g: Piece[]) => g.reduce((n, u) => n + points(u), 0);
          if (
            strength(other) < strength(original) ||
            (strength(other) === strength(original) &&
              other[0].id.localeCompare(original[0].id) > 0)
          )
            continue;
          const path = pathTo(s, origin, other[0].tile, naval, s.active, 25);
          if (path?.length) {
            const to = path
              .slice(
                0,
                maxValue([0, ...Object.values(targets).map((p) => p.length)]),
              )
              .reverse()
              .find((id) => targets[id] && !hostileAt(s, id, s.active, naval));
            if (to && !leavesTownExposed(s, group, to))
              choices.push({ action: { type: "move", ids, to }, score: 2 });
          }
        }
      if (
        group.every((u) => ready(s, u) && speed(u) + u.bonus - u.moved >= 1) &&
        !naval
      ) {
        for (const tower of Object.values(s.towers))
          if (
            warTarget(s, tower.owner) &&
            s.vertices[tower.vertex].tiles.includes(origin)
          ) {
            const action = { type: "destroy-tower", vertex: tower.vertex, ids };
            if (check(s, action))
              choices.push({
                action,
                score: (7 + tower.tier * 2) * leaderPressure(s, tower.owner),
              });
          }
        const road = Object.values(s.routes).find(
          (r) =>
            warTarget(s, r.owner) &&
            r.kind === "road" &&
            s.edges[r.edge].tiles.includes(origin) &&
            (Object.keys(r.camps).length ||
              (r.owner === crisis.leader && crisis.severity >= 0.2)),
        );
        if (road) {
          const action = {
            type: "destroy-route",
            ids: ids.slice(0, 1),
            edge: road.edge,
          };
          if (check(s, action))
            choices.push({
              action,
              score:
                (8 + Object.values(road.camps).reduce((a, b) => a + b, 0) * 3) *
                leaderPressure(s, road.owner),
            });
        }
      }
    }
  }
  choices.sort((a, b) => b.score - a.score);
  for (const choice of choices.slice(0, 12))
    if (check(s, choice.action)) return choice.action;
  return { type: "end-turn" };
}

export function chooseAIAction(
  s: Game,
  onRecruitment?: (intent: RecruitmentIntent) => void,
): Command {
  return withSeasonalPlanning(() =>
    withPlanningFrame(s, () => chooseAction(s, onRecruitment)),
  );
}
function chooseAction(
  s: Game,
  onRecruitment?: (intent: RecruitmentIntent) => void,
): Command {
  if (s.battle) {
    const b = s.battle,
      losers = (b.loser === b.attacker ? b.attackers : b.defenders).map(
        (id) => s.pieces[id],
      ),
      ids = casualtySelection(
        losers,
        b.required,
        (u) =>
          points(u) * 10 +
          (u.kind === "artillery" ? 5 : 0) +
          (u.naval
            ? Object.values(s.pieces)
                .filter((v) => v.carrier === u.id)
                .reduce((n, u) => n + u.tier * 20, 0)
            : 0),
      );
    const options = retreatOptions(
      s,
      b.target,
      b.loser,
      b.naval,
      b.origin,
      losers.filter((u) => !ids.includes(u.id)),
    ).sort(
      (a, b) =>
        power(
          s,
          losers.filter((u) => !ids.includes(u.id)),
          b,
        ) -
        power(
          s,
          losers.filter((u) => !ids.includes(u.id)),
          a,
        ),
    );
    return { type: "resolve-battle", actor: b.loser, ids, retreat: options[0] };
  }
  if (s.allianceOffer)
    return {
      type: "respond-alliance",
      actor: allianceResponder(s.allianceOffer),
      mode: acceptsAlliance(s, s.allianceOffer) ? "accept" : "decline",
    };
  if (s.trade)
    return {
      type: "respond-trade",
      actor: s.trade.to,
      mode: shouldAcceptTrade(s) ? "accept" : "decline",
    };
  if (s.researchChoice) {
    return {
      type: "choose-research",
      index: s.researchChoice.reduce(
        (best, c, i, a) =>
          researchUtility(s, c.kind) > researchUtility(s, a[best].kind)
            ? i
            : best,
        0,
      ),
    };
  }
  if (s.phase === "setup-town") {
    const inc = income(s),
      values = marginalValues(s),
      ranked = settlementSites(s, s.active, true)
        .map((v) => ({
          v,
          score:
            productiveAtVertex(s, v).reduce((n, id) => {
              const t = s.tiles[id];
              return (
                n +
                probability(t.number) *
                  tileGoods(t, s.active).reduce(
                    (sum, good) =>
                      sum +
                      (values[good] *
                        (tileYield(s.tiles[id], s.active)[good] ?? 0)) /
                        (1 + 5 * (inc[good] ?? 0)),
                    0,
                  )
              );
            }, 0) *
              (1 + seasonalDiversityBonus(s, s.vertices[v].tiles)) +
            new Set(landAtVertex(s, v).map((id) => s.tiles[id].resource)).size *
              0.055,
        }))
        .sort((a, b) => b.score - a.score);
    for (const v of ranked) {
      const c = { type: "setup-town", vertex: v.v };
      if (check(s, c)) return c;
    }
  }
  if (s.phase === "setup-route") {
    const edges = s.vertices[s.setupVertex!].edges;
    const best = edges
      .flatMap((edge) =>
        ["road", "route"].map((kind) => ({ type: "setup-route", edge, kind })),
      )
      .filter((c) => check(s, c))
      .sort(
        (a, b) => (b.kind === "road" ? 1 : 0) - (a.kind === "road" ? 1 : 0),
      );
    return best[0];
  }
  if (s.phase === "roll") return { type: "roll" };
  if (s.phase === "economy") {
    const woodsValues = marginalValues(s);
    for (const tile of Object.values(s.tiles))
      if (
        tile.biome === "woods" &&
        tile.woodsChosenOn?.[s.active] !== s.players[s.active].turns &&
        canChooseWoods(s, tile.id)
      ) {
        const current = tile.woodsChoices?.[s.active] ?? "lumber",
          alternate = current === "lumber" ? "hides" : "lumber";
        if (woodsValues[alternate] > woodsValues[current] * 1.35)
          return { type: "woods-choice", tile: tile.id, kind: alternate };
      }
    for (const card of [...s.players[s.active].hand].sort(
      (a, b) => researchUtility(s, b.kind) - researchUtility(s, a.kind),
    )) {
      const research = researchAction(s, card.id);
      if (research && researchUtility(s, card.kind) > 0 && check(s, research))
        return research;
    }
    const operation = chooseMilitary(s);
    if (operation.type !== "end-turn") return operation;
    const action = chooseEconomy(s, onRecruitment);
    return action.type === "military" ? { type: "end-turn" } : action;
  }
  if (s.phase === "military") return chooseMilitary(s);
  return { type: "end-turn" };
}

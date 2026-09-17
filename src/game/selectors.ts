import { friendly } from "./relations";
import {
  tileGood,
  tileGoods,
  harvestTiles,
  towerPower,
  towerDefense,
} from "./maritime";
import {
  GOODS,
  RAW,
  RAW_SUBSTITUTES,
  PROCESSED,
  type Game,
  type Stock,
  type Good,
  type Raw,
  type Town,
  type Watchtower,
  type Piece,
  type UnitClass,
  type ShipClass,
} from "./types";
import {
  TERRAIN,
  UNIT_INFO,
  SHIP_INFO,
  processedFor,
  shipStats,
} from "./content";
import {
  neighbors,
  distance,
  vertexNeighbors,
  landAtVertex,
  waterAtVertex,
  unknownAtVertex,
} from "./world";
export const sumStock = (s: Stock) =>
  Object.values(s).reduce((a, b) => a + (b ?? 0), 0);
// Index only the immutable input of an AI decision. Engine validation clones
// that input before mutating it, and therefore deliberately bypasses this index.
interface PlanningIndex {
  source: Game;
  towns: Map<number, Town[]>;
  vertices: Map<string, Town>;
  pieces: Map<number, Piece[]>;
  tiles: Map<string, Piece[]>;
  stocks: Map<number, Stock>;
  nearest: Map<string, Town | undefined>;
}
let planningIndex: PlanningIndex | undefined;
export const ownTowns = (s: Game, p = s.active) => {
  if (planningIndex?.source.towns === s.towns)
    return (planningIndex.towns.get(p) ?? []).slice();
  return Object.values(s.towns)
    .filter((t) => t.owner === p)
    .sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));
};
export const ownPieces = (s: Game, p = s.active) =>
  planningIndex?.source.pieces === s.pieces
    ? (planningIndex.pieces.get(p) ?? []).slice()
    : Object.values(s.pieces).filter((u) => u.owner === p);
export const inventory = (s: Game, p = s.active): Stock => {
  const cache =
    planningIndex?.source.towns === s.towns ? planningIndex.stocks : undefined;
  if (cache?.has(p)) return { ...cache.get(p)! };
  const out: Stock = {};
  for (const t of ownTowns(s, p))
    for (const g of GOODS) out[g] = (out[g] ?? 0) + (t.stock[g] ?? 0);
  cache?.set(p, out);
  return { ...out };
};
export const affordable = (s: Game, cost: Stock, p = s.active) => {
  const stock = inventory(s, p);
  return GOODS.every((g) => (stock[g] ?? 0) >= (cost[g] ?? 0));
};
export const townAt = (s: Game, v: string) =>
  planningIndex?.source.towns === s.towns
    ? planningIndex.vertices.get(v)
    : Object.values(s.towns).find((t) => t.vertex === v);
export const piecesAt = (s: Game, tile: string, naval?: boolean) =>
  (planningIndex?.source.pieces === s.pieces
    ? (planningIndex.tiles.get(tile) ?? [])
    : Object.values(s.pieces)
  ).filter(
    (u) =>
      u.tile === tile &&
      !u.carrier &&
      (naval === undefined || u.naval === naval),
  );
export const hostileAt = (
  s: Game,
  tile: string,
  p = s.active,
  naval?: boolean,
) => piecesAt(s, tile, naval).some((u) => !friendly(s, u.owner, p));
export const blockAt = (s: Game, tile: string, p = s.active) =>
  piecesAt(s, tile, false).some(
    (u) => !friendly(s, u.owner, p) && u.kind !== "merchant",
  );
export const besieged = (s: Game, town: string) =>
  Object.values(s.sieges).some((x) => x.town === town);
export const protects = (s: Game, t: Town) =>
  s.vertices[t.vertex].tiles.some((tile) =>
    piecesAt(s, tile, false).some(
      (u) => friendly(s, u.owner, t.owner) && u.kind !== "merchant",
    ),
  );
export const ready = (s: Game, u: Piece) =>
  u.born < s.players[u.owner].turns && !u.acted && !u.carrier;
export const fresh = (s: Game, u: Piece) => ready(s, u) && u.moved === 0;
export const points = (u: Piece) =>
  u.naval
    ? shipStats(u.kind as ShipClass, u.tier).power
    : u.kind === "merchant"
      ? 0
      : u.tier;
export const speed = (u: Piece) =>
  u.naval
    ? shipStats(u.kind as ShipClass, u.tier).speed
    : UNIT_INFO[u.kind as UnitClass].speed;
export const unitName = (u: Piece) =>
  u.naval
    ? shipStats(u.kind as ShipClass, u.tier).name
    : UNIT_INFO[u.kind as UnitClass].names[u.tier - 1];
export const probability = (n: number) => (6 - Math.abs(7 - n)) / 36;
export function power(s: Game, units: Piece[], tile: string) {
  const family = TERRAIN[s.tiles[tile].resource].family;
  return units.reduce(
    (n, u) =>
      n +
      points(u) *
        (!u.naval && UNIT_INFO[u.kind as UnitClass].family === family ? 2 : 1),
    units.some((u) => u.naval || points(u) > 0)
      ? [...new Set(units.map((u) => u.owner))].reduce(
          (n, owner) => n + towerPower(s, owner, tile),
          0,
        )
      : 0,
  );
}
/** Artillery doubles its own power; shore watchtowers add support once. */
export function bombardmentPower(s: Game, units: Piece[]) {
  return (
    units.reduce((n, u) => n + points(u) * 2, 0) +
    (units.length ? towerPower(s, units[0].owner, units[0].tile) : 0)
  );
}
export function bombardmentTargets(s: Game, ids: string[]): string[] {
  const units = ids.map((id) => s.pieces[id]);
  if (
    !units.length ||
    units.some(
      (u) =>
        !u ||
        u.owner !== s.active ||
        u.naval ||
        u.kind !== "artillery" ||
        !ready(s, u) ||
        speed(u) + u.bonus - u.moved < 1 ||
        u.tile !== units[0].tile,
    )
  )
    return [];
  return neighbors(units[0].tile).filter(
    (tile) =>
      s.tiles[tile]?.resource === "water" && hostileAt(s, tile, s.active, true),
  );
}
export function minCasualties(units: Piece[], loss: number): number {
  units = units.filter((u) => points(u) > 0);
  const total = units.reduce((n, u) => n + points(u), 0);
  const target = Math.max(0, Math.min(loss, total));
  // An optimal rounded subset overshoots by less than its largest piece.
  const largest = units.reduce((n, u) => Math.max(n, points(u)), 1);
  const cap = Math.min(total, target + largest - 1);
  const reachable = new Uint8Array(cap + 1);
  reachable[0] = 1;
  let reached = 0;
  for (const u of units) {
    const size = points(u);
    for (let n = Math.min(reached, cap - size); n >= 0; n--)
      if (reachable[n]) reachable[n + size] = 1;
    reached = Math.min(cap, reached + size);
  }
  for (let n = target; n <= cap; n++) if (reachable[n]) return n;
  return total;
}
export function casualtySelection(
  units: Piece[],
  required: number,
  value = (u: Piece) => points(u) * 10 + (u.kind === "artillery" ? 3 : 0),
): string[] {
  interface Link {
    id: string;
    previous: Link | undefined;
  }
  const costs = new Float64Array(required + 1).fill(Infinity);
  const links: (Link | undefined)[] = Array(required + 1);
  costs[0] = 0;
  let reached = 0;
  for (const u of units) {
    const size = points(u),
      worth = value(u);
    for (let n = Math.min(reached, required - size); n >= 0; n--) {
      const next = n + size,
        cost = costs[n] + worth;
      if (cost < costs[next]) {
        costs[next] = cost;
        links[next] = { id: u.id, previous: links[n] };
      }
    }
    reached = Math.min(required, reached + size);
  }
  const ids: string[] = [];
  for (let link = links[required]; link; link = link.previous)
    ids.push(link.id);
  return ids.reverse();
}
export function pathTo(
  s: Game,
  from: string,
  to: string,
  naval: boolean,
  owner: number,
  max = Infinity,
): string[] | null {
  if (from === to) return [];
  if (!s.tiles[to] || (s.tiles[to].resource === "water") !== naval) return null;
  const queue = [from],
    prev = new Map<string, string>(),
    depth = new Map([[from, 0]]);
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i],
      d = depth.get(current)!;
    if (d >= max) continue;
    for (const n of neighbors(current)) {
      if (
        depth.has(n) ||
        !s.tiles[n] ||
        (s.tiles[n].resource === "water") !== naval
      )
        continue;
      prev.set(n, current);
      depth.set(n, d + 1);
      if (n === to) {
        const path = [to];
        while (prev.get(path[0]) !== from) path.unshift(prev.get(path[0])!);
        return path;
      }
      if (!hostileAt(s, n, owner, naval)) queue.push(n);
    }
  }
  return null;
}
export function moveTargets(s: Game, ids: string[]): Record<string, string[]> {
  const units = ids.map((id) => s.pieces[id]).filter(Boolean);
  if (!units.length || units.some((u) => !ready(s, u))) return {};
  const first = units[0];
  if (
    units.some(
      (u) =>
        u.tile !== first.tile ||
        u.naval !== first.naval ||
        u.owner !== first.owner,
    )
  )
    return {};
  const max = Math.min(...units.map((u) => speed(u) + u.bonus - u.moved));
  const result: Record<string, string[]> = {};
  // Former allies may still share a hex after a pact ends. They may withdraw or
  // initiate combat on that hex for one MP, without teleporting either army.
  if (max >= 1 && hostileAt(s, first.tile, first.owner, first.naval))
    result[first.tile] = [first.tile];
  const queue = [first.tile];
  const paths: Record<string, string[]> = { [first.tile]: [] };
  for (let i = 0; i < queue.length; i++) {
    const t = queue[i];
    if (paths[t].length >= max) continue;
    for (const n of neighbors(t)) {
      if (
        paths[n] ||
        !s.tiles[n] ||
        (s.tiles[n].resource === "water") !== first.naval
      )
        continue;
      paths[n] = [...paths[t], n];
      result[n] = paths[n];
      if (!hostileAt(s, n, first.owner, first.naval)) queue.push(n);
    }
  }
  return result;
}
export function retreatOptions(
  s: Game,
  tile: string,
  owner: number,
  naval: boolean,
  origin?: string,
) {
  return neighbors(tile).filter(
    (n) =>
      n !== origin &&
      s.tiles[n] &&
      (s.tiles[n].resource === "water") === naval &&
      !hostileAt(s, n, owner, naval),
  );
}
export function settlementSites(
  s: Game,
  p = s.active,
  setup = false,
): string[] {
  return Object.keys(s.vertices).filter(
    (v) =>
      landAtVertex(s, v).length &&
      !townAt(s, v) &&
      (!s.towers?.[v] || s.towers[v].owner === p) &&
      !vertexNeighbors(s, v).some((n) => townAt(s, n)) &&
      !s.vertices[v].tiles.some((t) => blockAt(s, t, p)) &&
      (setup || s.vertices[v].edges.some((e) => s.routes[e]?.owner === p)),
  );
}
export function canCompleteSetup(s: Game, remaining: number): boolean {
  if (remaining <= 0) return true;
  const candidates = settlementSites(s, s.active, true);
  const blocked = new Map(
    candidates.map((v) => [v, new Set([v, ...vertexNeighbors(s, v)])]),
  );
  function search(list: string[], need: number): boolean {
    if (!need) return true;
    if (list.length < need) return false;
    const greedy: string[] = [];
    const excluded = new Set<string>();
    for (const v of list)
      if (!excluded.has(v)) {
        greedy.push(v);
        blocked.get(v)!.forEach((n) => excluded.add(n));
      }
    if (greedy.length >= need) return true;
    if (list.length >= need * 4) return true;
    const first = list[0];
    return (
      search(
        list.slice(1).filter((v) => !blocked.get(first)!.has(v)),
        need - 1,
      ) || search(list.slice(1), need)
    );
  }
  return search(candidates, remaining);
}
/** Land on either side makes an edge a road, including the coastline. */
export function routeKind(s: Game, edge: string): "road" | "route" {
  return s.edges[edge].tiles.some((t) => s.tiles[t].resource !== "water")
    ? "road"
    : "route";
}
export function restoreCoastalRoads(s: Game) {
  for (const r of Object.values(s.routes))
    if (r.kind === "route" && routeKind(s, r.edge) === "road") r.kind = "road";
}
export function canRoute(
  s: Game,
  edge: string,
  kind: "road" | "route",
  p = s.active,
  ignore?: string,
): boolean {
  const e = s.edges[edge];
  if (!e || (s.routes[edge] && edge !== ignore)) return false;
  if (routeKind(s, edge) !== kind) return false;
  if (
    e.tiles.some((t) =>
      kind === "road"
        ? blockAt(s, t, p)
        : hostileAt(s, t, p, s.tiles[t].resource === "water"),
    )
  )
    return false;
  return e.vertices.some((v) => {
    const t = townAt(s, v);
    if (s.towers?.[v] && s.towers[v].owner !== p) return false;
    if (t) return t.owner === p;
    return s.vertices[v].edges.some(
      (r) => r !== ignore && s.routes[r]?.owner === p,
    );
  });
}
export function routeSites(s: Game, kind: "road" | "route", p = s.active) {
  return Object.keys(s.edges).filter((e) => canRoute(s, e, kind, p));
}
export function movableRoutes(s: Game, p = s.active): string[] {
  if (s.players[p].routeMoved) return [];
  return Object.values(s.routes)
    .filter(
      (r) =>
        r.owner === p &&
        r.kind === "route" &&
        r.born < s.players[p].turns &&
        s.edges[r.edge].vertices.some(
          (v) =>
            !townAt(s, v) &&
            s.vertices[v].edges.filter((e) => s.routes[e]?.owner === p)
              .length === 1,
        ),
    )
    .map((r) => r.edge);
}
export function relocationSites(s: Game, from: string): string[] {
  if (!movableRoutes(s).includes(from)) return [];
  const routes = { ...s.routes };
  delete routes[from];
  return routeSites({ ...s, routes }, "route").filter((e) => e !== from);
}
export function nearestTown(
  s: Game,
  tile: string,
  p: number,
): Town | undefined {
  const cache =
    planningIndex?.source.towns === s.towns &&
    planningIndex.source.vertices === s.vertices &&
    planningIndex.source.tiles === s.tiles
      ? planningIndex.nearest
      : undefined;
  const key = `${p}/${tile}`;
  if (cache?.has(key)) return cache.get(key);
  let best: Town | undefined,
    bestDistance = Infinity;
  // ownTowns is already ordered by ID, preserving the original tie break.
  for (const town of ownTowns(s, p)) {
    const d = Math.min(
      ...landAtVertex(s, town.vertex).map((t) => distance(tile, t)),
    );
    if (!best || d < bestDistance) {
      best = town;
      bestDistance = d;
    }
  }
  cache?.set(key, best);
  return best;
}
export function productionSources(s: Game) {
  const out: {
    owner: number;
    town: Town;
    tile: string;
    good: Good;
    amount: number;
  }[] = [];
  const blocked = (id: string, owner: number) =>
    s.tiles[id].resource === "water"
      ? hostileAt(s, id, owner, true)
      : blockAt(s, id, owner);
  for (const town of Object.values(s.towns))
    for (const id of s.vertices[town.vertex].tiles) {
      const good = tileGood(s.tiles[id]);
      if (!good || blocked(id, town.owner)) continue;
      for (const raw of tileGoods(s.tiles[id]))
        out.push({
          owner: town.owner,
          town,
          tile: id,
          good: raw,
          amount: town.level,
        });
      if (town.extensions[id])
        out.push({
          owner: town.owner,
          town,
          tile: id,
          good: processedFor(good),
          amount: town.extensions[id],
        });
    }
  for (const r of Object.values(s.routes))
    for (const [id, tier] of Object.entries(r.camps)) {
      const good = tileGood(s.tiles[id]),
        town = nearestTown(s, id, r.owner);
      if (good && town && !blocked(id, r.owner))
        for (const raw of tileGoods(s.tiles[id]))
          out.push({ owner: r.owner, town, tile: id, good: raw, amount: tier });
    }
  for (const u of Object.values(s.pieces)) {
    const tiles = harvestTiles(s, u);
    if (!tiles.length) continue;
    const town = nearestTown(s, u.tile, u.owner);
    if (!town) continue;
    for (const id of tiles) {
      const good = tileGood(s.tiles[id]);
      if (good && (u.kind !== "fishing" || !blocked(id, u.owner)))
        for (const raw of tileGoods(s.tiles[id]))
          out.push({
            owner: u.owner,
            town,
            tile: id,
            good: raw,
            amount: u.tier,
          });
    }
  }
  return out;
}
// AI evaluations repeatedly inspect the same immutable state and player views.
// Cache only inside one decision, so UI reads and mutable test fixtures stay fresh.
let incomeFrame: WeakMap<Game, Record<number, Stock>> | undefined;
export function withPlanningFrame<T>(source: Game, run: () => T): T {
  const previous = incomeFrame;
  const previousIndex = planningIndex;
  const index: PlanningIndex = {
    source,
    towns: new Map(),
    vertices: new Map(),
    pieces: new Map(),
    tiles: new Map(),
    stocks: new Map(),
    nearest: new Map(),
  };
  for (const town of Object.values(source.towns)) {
    if (!index.towns.has(town.owner)) index.towns.set(town.owner, []);
    index.towns.get(town.owner)!.push(town);
    index.vertices.set(town.vertex, town);
  }
  for (const towns of index.towns.values())
    towns.sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));
  for (const unit of Object.values(source.pieces)) {
    if (!index.pieces.has(unit.owner)) index.pieces.set(unit.owner, []);
    index.pieces.get(unit.owner)!.push(unit);
    if (!unit.carrier) {
      if (!index.tiles.has(unit.tile)) index.tiles.set(unit.tile, []);
      index.tiles.get(unit.tile)!.push(unit);
    }
  }
  planningIndex = index;
  incomeFrame = new WeakMap();
  try {
    return run();
  } finally {
    incomeFrame = previous;
    planningIndex = previousIndex;
  }
}
export function income(s: Game, p = s.active): Stock {
  let all = incomeFrame?.get(s);
  if (!all) {
    all = Object.fromEntries(s.players.map((p) => [p.id, {}])) as Record<
      number,
      Stock
    >;
    for (const source of productionSources(s)) {
      const out = all[source.owner];
      out[source.good] =
        (out[source.good] ?? 0) +
        probability(s.tiles[source.tile].number) * source.amount;
    }
    incomeFrame?.set(s, all);
  }
  return all[p];
}
/** Recipes accept raw substitutes; direct trades still spend exact goods. */
export function recipePayment(s: Game, cost: Stock, p = s.active): Stock {
  const stock = inventory(s, p),
    out = { ...cost };
  for (const [base, alternate] of Object.entries(RAW_SUBSTITUTES) as [
    Good,
    Raw,
  ][]) {
    const used = Math.min(
      Math.max(0, (stock[alternate] ?? 0) - (cost[alternate] ?? 0)),
      Math.max(0, (cost[base] ?? 0) - (stock[base] ?? 0)),
    );
    if (used) {
      out[base] = (out[base] ?? 0) - used;
      out[alternate] = (out[alternate] ?? 0) + used;
    }
  }
  return out;
}
export function bankRate(
  s: Game,
  give: Good,
  take: Good,
  p = s.active,
): number {
  const rawGive = RAW.includes(give as (typeof RAW)[number]),
    rawTake = RAW.includes(take as (typeof RAW)[number]);
  if (give === "gold") return rawTake ? 1 : 2;
  if (give === "goldbars") return rawTake ? 0.5 : 1;
  if (rawGive && !rawTake) return 6;
  if (!rawGive && !rawTake) return 4;
  if (!rawGive && rawTake) return 2;
  let rate = 4;
  for (const town of ownTowns(s, p)) {
    if (besieged(s, town.id)) continue;
    for (const id of s.vertices[town.vertex].edges) {
      const e = s.edges[id];
      if (
        !e.harbor ||
        e.tiles.some(
          (t) => s.tiles[t].resource === "water" && hostileAt(s, t, p, true),
        )
      )
        continue;
      if (e.harbor === "generic") rate = Math.min(rate, 3);
      if (e.harbor === give) rate = 2;
    }
  }
  return rate;
}
export function expeditionSites(
  s: Game,
  kind: "land" | "sea",
  p = s.active,
): string[] {
  const mobileVertices = new Set(
    ownPieces(s, p)
      .filter(
        (u) =>
          !u.carrier &&
          u.born < s.players[p].turns &&
          u.naval === (kind === "sea") &&
          s.tiles[u.tile] &&
          (s.tiles[u.tile].resource === "water") === u.naval,
      )
      .flatMap((u) => s.tiles[u.tile].vertices),
  );
  return Object.keys(s.vertices).filter((v) => {
    if (!unknownAtVertex(s, v).length) return false;
    const tileIds = kind === "land" ? landAtVertex(s, v) : waterAtVertex(s, v);
    if (
      !tileIds.length ||
      tileIds.some((t) => hostileAt(s, t, p, kind === "sea"))
    )
      return false;
    const town = townAt(s, v);
    if (town) return town.owner === p && !besieged(s, town.id);
    return (
      mobileVertices.has(v) ||
      s.vertices[v].edges.some(
        (e) =>
          s.routes[e]?.owner === p &&
          s.routes[e]?.kind === (kind === "land" ? "road" : "route"),
      )
    );
  });
}
export const siegePower = (units: Piece[]) =>
  units.filter((u) => u.kind === "artillery").reduce((n, u) => n + u.tier, 0) +
  Math.max(0, ...units.map((u) => u.guildSiege ?? 0));
export function siegeRequirement(s: Game, town: Town, units: Piece[]) {
  return Math.max(
    0,
    town.level -
      1 +
      town.wall +
      towerDefense(s, town.owner, town.vertex) -
      siegePower(units),
  );
}
/** Towers have half their own city-defense contribution, rounded down. */
export const towerSiegeRequirement = (tower: Watchtower, units: Piece[]) =>
  Math.max(0, Math.floor(tower.tier / 2) - siegePower(units));
export const towerGuards = (s: Game, tower: Watchtower) =>
  s.vertices[tower.vertex].tiles.some((tile) =>
    piecesAt(s, tile, false).some(
      (u) => friendly(s, u.owner, tower.owner) && u.kind !== "merchant",
    ),
  );
export const unusedBonuses = () => ({
  routes: 0,
  palisades: 0,
  recruits: [],
  ships: [],
  expedition: false,
});
export function effectiveCost(
  s: Game,
  base: Stock,
  kind: string,
  p = s.active,
): Stock {
  const cost = { ...base },
    bonus = s.players[p].bonuses;
  if ((kind === "road" || kind === "route") && bonus.routes > 0) return {};
  if (kind === "palisade" && bonus.palisades > 0) return {};
  if (kind === `expedition${bonus.expeditionTier ?? 2}` && bonus.expedition)
    return {};
  const discount = [bonus.discount, ...(bonus.discounts ?? [])].find(
    (d) => d?.kind === kind,
  );
  if (discount) {
    for (const [goods, budget] of [
      [RAW, discount.raw],
      [PROCESSED, discount.processed],
    ] as const) {
      let left = budget;
      for (const good of goods) {
        const remove = Math.min(cost[good] ?? 0, left);
        if (remove) {
          cost[good]! -= remove;
          left -= remove;
        }
      }
    }
  }
  return cost;
}

/** A pending draw has already bought one card; the unchosen card is never in hand. */
export function researchCount(s: Game, owner: number): number {
  return (
    s.players[owner].hand.length +
    (s.researchChoice && s.active === owner ? 1 : 0)
  );
}

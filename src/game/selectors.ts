import { maxValue, minValue } from "./aggregate";
import {
  seasonAt,
  seasonalYield,
  seasonalWorkshopBase,
  frozenInSeason,
  type Season,
} from "./seasons";
import { solidAtVertex, canOccupy } from "./world";
import { friendly } from "./relations";
import {
  tileGood,
  tileYield,
  workshopYield,
  terrainFamily,
  tileGoods,
  harvestTiles,
  harvestYield,
  collector,
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
  isSettler,
  SHIP_INFO,
  processedFor,
  shipStats,
} from "./content";
import {
  neighbors,
  distance,
  vertexNeighbors,
  landAtVertex,
  walkableAtVertex,
  waterAtVertex,
  unknownAtVertex,
} from "./world";
export const sumStock = (s: Stock) =>
  Object.values(s).reduce((a, b) => a + (b ?? 0), 0);
// Index immutable reads. Engine transactions mutate separate, unregistered
// drafts, so cached UI data can never leak into execution.
interface PlanningIndex {
  source: Game;
  towns: Map<number, Town[]>;
  vertices: Map<string, Town>;
  pieces: Map<number, Piece[]>;
  pieceOrder: Map<Piece, number>;
  tiles: Map<string, Piece[]>;
  stocks: Map<number, Stock>;
  nearest: Map<string, Town | undefined>;
  towerSupport: Map<string, number>;
  memo: Map<string, unknown>;
}
let planningIndex: PlanningIndex | undefined;
const viewIndexes = new WeakMap<Game, PlanningIndex>();
/** Opt in only after a game snapshot is published to the UI. It must never be
 * mutated afterwards. New engine results and imported saves have new identities. */
export function prepareGameView(s: Game): void {
  if (!viewIndexes.has(s)) viewIndexes.set(s, createPlanningIndex(s));
}
function readIndex(s: Game): PlanningIndex | undefined {
  return planningIndex?.source === s
    ? planningIndex
    : (viewIndexes.get(s) ?? planningIndex);
}
/** Reuse a pure calculation within a decision or a published UI snapshot. */
export function planningValue<T>(s: Game, key: string, calculate: () => T): T {
  const index = readIndex(s);
  if (index?.source !== s) return calculate();
  const cache = index.memo;
  if (!cache.has(key)) cache.set(key, calculate());
  return cache.get(key) as T;
}
export const ownTowns = (s: Game, p = s.active) => {
  const index = readIndex(s);
  if (index?.source.towns === s.towns)
    return (index.towns.get(p) ?? []).slice();
  return Object.values(s.towns)
    .filter((t) => t.owner === p)
    .sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));
};
export const ownPieces = (s: Game, p = s.active) => {
  const index = readIndex(s);
  return index?.source.pieces === s.pieces
    ? (index.pieces.get(p) ?? []).slice()
    : Object.values(s.pieces).filter((u) => u.owner === p);
};
export const inventory = (s: Game, p = s.active): Stock => {
  const index = readIndex(s);
  const cache = index?.source.towns === s.towns ? index.stocks : undefined;
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
export const townAt = (s: Game, v: string) => {
  const index = readIndex(s);
  return index?.source.towns === s.towns
    ? index.vertices.get(v)
    : Object.values(s.towns).find((t) => t.vertex === v);
};
export const piecesAt = (s: Game, tile: string, naval?: boolean) => {
  const index = readIndex(s);
  return (
    index?.source.pieces === s.pieces
      ? (index.tiles.get(tile) ?? [])
      : Object.values(s.pieces)
  ).filter(
    (u) =>
      u.tile === tile &&
      !u.carrier &&
      (naval === undefined || u.naval === naval),
  );
};
/** Nearby field units in their original campaign order. Guilds inspect the
 * same city repeatedly; do not scan every soldier in the empire each time. */
export function ownPiecesAtVertex(s: Game, vertex: string, owner = s.active) {
  const index = readIndex(s);
  if (index?.source !== s)
    return ownPieces(s, owner).filter(
      (u) => !u.carrier && s.vertices[vertex].tiles.includes(u.tile),
    );
  return planningValue(s, `localPieces/${owner}/${vertex}`, () =>
    s.vertices[vertex].tiles
      .flatMap((tile) => index.tiles.get(tile) ?? [])
      .filter((u) => u.owner === owner)
      .sort((a, b) => index.pieceOrder.get(a)! - index.pieceOrder.get(b)!),
  ).slice();
}
export const hostileAt = (
  s: Game,
  tile: string,
  p = s.active,
  naval?: boolean,
) => combatantsAt(s, tile, naval).some((u) => !friendly(s, u.owner, p));
/** A stranded force can be engaged from the tile's current movement surface. */
export const combatantsAt = (s: Game, tile: string, naval?: boolean) =>
  piecesAt(s, tile).filter(
    (u) => naval === undefined || u.naval === naval || !!u.seasonStatus,
  );
export const navalBlockAt = (s: Game, tile: string, p = s.active) =>
  piecesAt(s, tile, true).some(
    (u) => !friendly(s, u.owner, p) && !isSettler(u.kind),
  );
export const blockAt = (s: Game, tile: string, p = s.active) =>
  piecesAt(s, tile, false).some(
    (u) => !friendly(s, u.owner, p) && points(u) > 0,
  );
export const besieged = (s: Game, town: string) =>
  Object.values(s.sieges).some((x) => x.town === town);
export const protects = (s: Game, t: Town) =>
  s.vertices[t.vertex].tiles.some((tile) =>
    piecesAt(s, tile, false).some(
      (u) => friendly(s, u.owner, t.owner) && points(u) > 0,
    ),
  );
export const ready = (s: Game, u: Piece) =>
  u.born < s.players[u.owner].turns &&
  !u.acted &&
  !u.carrier &&
  u.seasonStatus !== "icebound";
export const fresh = (s: Game, u: Piece) => ready(s, u) && u.moved === 0;
export const points = (u: Piece) =>
  u.naval
    ? shipStats(u.kind as ShipClass, u.tier).power
    : u.kind === "merchant" || isSettler(u.kind)
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
function combatTowerPower(s: Game, owner: number, tile: string) {
  const index = readIndex(s);
  return index?.source === s
    ? (index.towerSupport.get(`${owner}/${tile}`) ?? 0)
    : towerPower(s, owner, tile);
}
export function power(s: Game, units: Piece[], tile: string) {
  const family = terrainFamily(s.tiles[tile]);
  return units.reduce(
    (n, u) =>
      n +
      (u.naval && u.seasonStatus === "icebound"
        ? Math.ceil(points(u) / 4)
        : points(u)) *
        (!u.naval && UNIT_INFO[u.kind as UnitClass].family === family ? 2 : 1),
    units.some((u) => u.naval || points(u) > 0)
      ? [...new Set(units.map((u) => u.owner))].reduce(
          (n, owner) => n + combatTowerPower(s, owner, tile),
          0,
        )
      : 0,
  );
}
/** Land escorts on sea ice defend a stranded fleet against bombardment too. */
export function fleetDefenders(
  s: Game,
  tile: string,
  owner = s.active,
): Piece[] {
  return piecesAt(s, tile).filter(
    (u) =>
      !friendly(s, u.owner, owner) &&
      (u.naval || s.tiles[tile].surface === "frozen"),
  );
}
/** Artillery doubles its own power; shore watchtowers add support once. */
export function bombardmentPower(s: Game, units: Piece[]) {
  return (
    units.reduce((n, u) => n + points(u) * 2, 0) +
    (units.length ? combatTowerPower(s, units[0].owner, units[0].tile) : 0)
  );
}
export function bombardmentTargets(s: Game, ids: string[]): string[] {
  const units = ids.map((id) => s.pieces[id]);
  if (
    !units.length ||
    !canOccupy(s.tiles[units[0]?.tile], false) ||
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
      ["water", "ice"].includes(s.tiles[tile]?.resource) &&
      piecesAt(s, tile, true).some((u) => !friendly(s, u.owner, s.active)),
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
  if (!canOccupy(s.tiles[to], naval)) return null;
  if (from === to) return [];
  const queue = [from],
    prev = new Map<string, string>(),
    depth = new Map([[from, 0]]);
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i],
      d = depth.get(current)!;
    if (d >= max) continue;
    for (const n of neighbors(current)) {
      if (depth.has(n) || !canOccupy(s.tiles[n], naval)) continue;
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
  const max = minValue(units.map((u) => speed(u) + u.bonus - u.moved));
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
      if (paths[n] || !canOccupy(s.tiles[n], first.naval)) continue;
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
  units?: Piece[],
) {
  return neighbors(tile).filter(
    (n) =>
      n !== origin &&
      (units?.length
        ? units.every(
            (u) =>
              u.seasonStatus !== "icebound" &&
              canOccupy(s.tiles[n], u.naval) &&
              !hostileAt(s, n, u.owner, u.naval),
          )
        : canOccupy(s.tiles[n], naval) && !hostileAt(s, n, owner, naval)),
  );
}
function settlementSite(
  s: Game,
  v: string,
  p: number,
  setup: boolean,
): boolean {
  return !!(
    solidAtVertex(s, v).length &&
    !townAt(s, v) &&
    (!s.towers?.[v] || s.towers[v].owner === p) &&
    !vertexNeighbors(s, v).some((n) => townAt(s, n)) &&
    !s.vertices[v].tiles.some((t) => blockAt(s, t, p)) &&
    (setup || s.vertices[v].edges.some((e) => s.routes[e]?.owner === p))
  );
}
export function settlementSites(
  s: Game,
  p = s.active,
  setup = false,
): string[] {
  return Object.keys(s.vertices).filter((v) => settlementSite(s, v, p, setup));
}
/** A settler carries the settlement cost; only the road requirement is waived. */
export function colonizationSites(s: Game, unit: Piece | undefined): string[] {
  if (
    !unit ||
    !isSettler(unit.kind) ||
    unit.owner !== s.active ||
    !ready(s, unit) ||
    !canOccupy(s.tiles[unit.tile], unit.naval)
  )
    return [];
  const corners = new Set(s.tiles[unit.tile].vertices);
  // Keep map order for callers that choose the first site, but inspect only
  // this tile's six corners. A spent settler can still found a town here.
  return Object.keys(s.vertices).filter(
    (v) =>
      corners.has(v) &&
      settlementSite(s, v, unit.owner, true) &&
      !s.vertices[v].tiles.some((tile) => hostileAt(s, tile, unit.owner)),
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
  return s.edges[edge].tiles.some(
    (t) => !["water", "ice"].includes(s.tiles[t].resource),
  )
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
  if (
    routeKind(s, edge) !== kind ||
    e.tiles.every((t) => s.tiles[t].resource === "ice")
  )
    return false;
  if (
    e.tiles.some((t) =>
      kind === "road"
        ? blockAt(s, t, p)
        : hostileAt(s, t, p, canOccupy(s.tiles[t], true)),
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
  const index = readIndex(s);
  const cache =
    index?.source.towns === s.towns &&
    index.source.vertices === s.vertices &&
    index.source.tiles === s.tiles
      ? index.nearest
      : undefined;
  const key = `${p}/${tile}`;
  if (cache?.has(key)) return cache.get(key);
  let best: Town | undefined,
    bestDistance = Infinity;
  // ownTowns is already ordered by ID, preserving the original tie break.
  for (const town of ownTowns(s, p)) {
    const d = minValue(
      landAtVertex(s, town.vertex).map((t) => distance(tile, t)),
    );
    if (!best || d < bestDistance) {
      best = town;
      bestDistance = d;
    }
  }
  cache?.set(key, best);
  return best;
}
export function productionSources(
  s: Game,
  mode: "current" | "annual" | Season = "current",
) {
  const season =
    mode === "current" ? seasonAt(s) : mode === "annual" ? undefined : mode;
  // A migrated open sea has grace only through the actual current season.
  // Future production previews must use the post-boundary local ice pattern.
  let tiles = s.tiles;
  if (season && mode !== "current" && season !== seasonAt(s))
    for (const tile of Object.values(s.tiles)) {
      if (!tile.thawGrace) continue;
      if (tiles === s.tiles) tiles = { ...s.tiles };
      tiles[tile.id] = { ...tile, thawGrace: undefined };
    }
  const out: {
    owner: number;
    town: Town;
    tile: string;
    good: Good;
    amount: number;
  }[] = [];
  // Several towns, camps and merchants may harvest the same tile. Evaluate
  // its calendar once per owner during this read, without retaining mutable
  // game data between actions or seasons.
  const yields = new Map<string, Stock>();
  const yieldAt = (id: string, owner: number): Stock => {
    const key = `${owner}/${id}`;
    let output = yields.get(key);
    if (!output) {
      output = seasonalYield(tiles[id], owner, season);
      yields.set(key, output);
    }
    return output;
  };
  const blocked = (id: string, owner: number) =>
    s.tiles[id].resource === "water"
      ? navalBlockAt(s, id, owner)
      : blockAt(s, id, owner);
  for (const town of Object.values(s.towns))
    for (const id of s.vertices[town.vertex].tiles) {
      const good = town.extensionGoods?.[id] ?? tileGood(tiles[id], town.owner);
      if (!good || blocked(id, town.owner)) continue;
      for (const [raw, amount] of Object.entries(
        harvestYield(
          tiles[id],
          town.owner,
          town.level,
          true,
          yieldAt(id, town.owner),
        ),
      ))
        out.push({
          owner: town.owner,
          town,
          tile: id,
          good: raw as Good,
          amount: amount!,
        });
      if (town.extensions[id])
        out.push({
          owner: town.owner,
          town,
          tile: id,
          good: processedFor(good),
          amount: workshopYield(
            tiles[id],
            town.owner,
            good,
            town.extensions[id],
            seasonalWorkshopBase(tiles[id], town.owner, good, season),
          ),
        });
    }
  for (const r of Object.values(s.routes))
    for (const [id, tier] of Object.entries(r.camps)) {
      const good = tileGood(tiles[id]),
        town = nearestTown(s, id, r.owner);
      if (good && town && !blocked(id, r.owner))
        for (const [raw, amount] of Object.entries(yieldAt(id, r.owner)))
          out.push({
            owner: r.owner,
            town,
            tile: id,
            good: raw as Raw,
            amount: tier * amount!,
          });
    }
  const harvestWorld =
    mode !== "current" && s.calendar
      ? Object.assign(Object.create(s), {
          tiles: Object.fromEntries(
            Object.entries(tiles).map(([id, tile]) => [
              id,
              tile.resource === "water" || tile.resource === "ice"
                ? {
                    ...tile,
                    surface: frozenInSeason(tile, season)
                      ? ("frozen" as const)
                      : ("open" as const),
                  }
                : tile,
            ]),
          ),
        })
      : s;
  for (const u of Object.values(s.pieces)) {
    const covered = harvestTiles(harvestWorld, u);
    if (!covered.length) continue;
    const town = nearestTown(s, u.tile, u.owner);
    if (!town) continue;
    for (const id of covered) {
      const good = tileGood(tiles[id]);
      if (good && (u.kind !== "fishing" || !blocked(id, u.owner)))
        for (const [raw, amount] of Object.entries(
          harvestYield(
            tiles[id],
            u.owner,
            u.tier,
            u.kind !== "fishing",
            yieldAt(id, u.owner),
          ),
        ))
          out.push({
            owner: u.owner,
            town,
            tile: id,
            good: raw as Good,
            amount: amount!,
          });
    }
  }
  return out.filter((source) => source.amount > 0);
}
/** Complete public inputs to passive production. Resource spending, movement
 * allowances, walls and guild contracts do not change a harvest. Fingerprint
 * values, not object identity: engine batches mutate a private draft in place. */
export function productionSignature(s: Game): string {
  return planningValue(s, "production-signature", () => {
    const blockade = new Set<string>();
    const collectors = [];
    for (const u of Object.values(s.pieces)) {
      if (u.carrier) continue;
      if (u.naval ? !isSettler(u.kind) : points(u) > 0)
        blockade.add(`${u.owner}/${u.tile}/${u.naval}`);
      if (collector(u))
        collectors.push([u.owner, u.tile, u.kind, u.tier, u.coverage]);
    }
    return JSON.stringify([
      s.round,
      s.calendar,
      s.tiles,
      s.vertices,
      s.alliances,
      s.players.map((p) => p.id),
      Object.values(s.towns).map((t) => [
        t.id,
        t.owner,
        t.vertex,
        t.level,
        t.extensions,
        t.extensionGoods,
      ]),
      Object.values(s.routes)
        .filter((r) => Object.keys(r.camps).length)
        .map((r) => [r.owner, r.camps]),
      [...blockade].sort(),
      collectors,
    ]);
  });
}
// Retain only the latest production position, not a history of growing saves.
let lastIncomeSignature: string | undefined;
let lastIncome: Record<number, Stock> | undefined;
// Within a decision, immutable state and counterparty views share forecasts.
// Outside that frame, the value signature guards the retained last result.
let incomeFrame: WeakMap<Game, Record<number, Stock>> | undefined;
function createPlanningIndex(source: Game): PlanningIndex {
  const index: PlanningIndex = {
    source,
    towns: new Map(),
    vertices: new Map(),
    pieces: new Map(),
    pieceOrder: new Map(),
    tiles: new Map(),
    stocks: new Map(),
    nearest: new Map(),
    towerSupport: new Map(),
    memo: new Map(),
  };
  for (const tower of Object.values(source.towers ?? {}))
    for (const tile of source.vertices[tower.vertex].tiles) {
      const key = `${tower.owner}/${tile}`;
      index.towerSupport.set(
        key,
        (index.towerSupport.get(key) ?? 0) + tower.tier,
      );
    }
  for (const town of Object.values(source.towns)) {
    if (!index.towns.has(town.owner)) index.towns.set(town.owner, []);
    index.towns.get(town.owner)!.push(town);
    index.vertices.set(town.vertex, town);
  }
  for (const towns of index.towns.values())
    towns.sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));
  for (const unit of Object.values(source.pieces)) {
    index.pieceOrder.set(unit, index.pieceOrder.size);
    if (!index.pieces.has(unit.owner)) index.pieces.set(unit.owner, []);
    index.pieces.get(unit.owner)!.push(unit);
    if (!unit.carrier) {
      if (!index.tiles.has(unit.tile)) index.tiles.set(unit.tile, []);
      index.tiles.get(unit.tile)!.push(unit);
    }
  }
  return index;
}
export function withPlanningFrame<T>(source: Game, run: () => T): T {
  const previous = incomeFrame;
  const previousIndex = planningIndex;
  planningIndex = createPlanningIndex(source);
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
    const signature = productionSignature(s);
    if (lastIncomeSignature === signature) all = lastIncome;
    if (!all) {
      all = Object.fromEntries(s.players.map((p) => [p.id, {}])) as Record<
        number,
        Stock
      >;
      for (const source of productionSources(s, "annual")) {
        const out = all[source.owner];
        out[source.good] =
          (out[source.good] ?? 0) +
          probability(s.tiles[source.tile].number) * source.amount;
      }
      lastIncomeSignature = signature;
      lastIncome = all;
    }
    incomeFrame?.set(s, all);
  }
  // Callers can adjust a valuation without poisoning the retained forecast.
  return { ...all[p] };
}
/** Recipes accept raw substitutes; direct trades still spend exact goods. */
export function recipePayment(s: Game, cost: Stock, p = s.active): Stock {
  const stock = inventory(s, p),
    out = { ...cost };
  for (const [base, alternates] of Object.entries(RAW_SUBSTITUTES) as [
    Good,
    readonly Raw[],
  ][]) {
    for (const alternate of alternates) {
      const used = Math.min(
        Math.max(0, (stock[alternate] ?? 0) - (out[alternate] ?? 0)),
        Math.max(0, (out[base] ?? 0) - (stock[base] ?? 0)),
      );
      if (used) {
        out[base] = (out[base] ?? 0) - used;
        out[alternate] = (out[alternate] ?? 0) + used;
      }
    }
  }
  // Reserve any explicitly requested currency before covering other shortages.
  // One shared budget per group prevents spending the same Gold twice.
  for (const [goods, currency] of [
    [RAW, "gold"],
    [PROCESSED, "goldbars"],
  ] as const) {
    let available = Math.max(0, (stock[currency] ?? 0) - (out[currency] ?? 0));
    for (const good of goods) {
      if (good === currency || !available) continue;
      const used = Math.min(
        available,
        Math.max(0, (out[good] ?? 0) - (stock[good] ?? 0)),
      );
      if (!used) continue;
      out[good] = (out[good] ?? 0) - used;
      out[currency] = (out[currency] ?? 0) + used;
      available -= used;
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
        !e.tiles.some((t) => canOccupy(s.tiles[t], true)) ||
        e.tiles.some(
          (t) => s.tiles[t].resource === "water" && navalBlockAt(s, t, p),
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
          canOccupy(s.tiles[u.tile], u.naval),
      )
      .flatMap((u) => s.tiles[u.tile].vertices),
  );
  return Object.keys(s.vertices).filter((v) => {
    if (!unknownAtVertex(s, v).length) return false;
    const tileIds =
      kind === "land" ? walkableAtVertex(s, v) : waterAtVertex(s, v);
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
  maxValue([0, ...units.map((u) => u.guildSiege ?? 0)]);
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
      (u) => friendly(s, u.owner, tower.owner) && points(u) > 0,
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

export function canChooseWoods(s: Game, tile: string, owner = s.active) {
  return (
    s.tiles[tile]?.biome === "woods" &&
    (ownTowns(s, owner).some((t) =>
      s.vertices[t.vertex].tiles.includes(tile),
    ) ||
      Object.values(s.routes).some(
        (r) => r.owner === owner && !!r.camps[tile],
      ) ||
      ownPieces(s, owner).some((u) => harvestTiles(s, u).includes(tile)))
  );
}

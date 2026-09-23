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
  marineResource,
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
  prepareWorldView,
  withWorldReadFrame,
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
  units: readonly Piece[];
  towns: Map<number, Town[]>;
  vertices: Map<string, Town>;
  vertexOrder: Map<string, number>;
  pieces: Map<number, Piece[]>;
  pieceOrder: Map<Piece, number>;
  passengers: Map<string, Piece[]>;
  producers: ProductionActors;
  movement: MovementOccupation;
  tiles: Map<string, Piece[]>;
  stocks: Map<number, Stock>;
  nearest: Map<string, Town | undefined>;
  towerSupport: Map<string, number>;
  towerDefenses: Map<string, number>;
  memo: Map<string, unknown>;
}
let planningIndex: PlanningIndex | undefined;
const viewIndexes = new WeakMap<Game, PlanningIndex>();
/** Opt in only after a game snapshot is published to the UI. It must never be
 * mutated afterwards. New engine results and imported saves have new identities. */
export function prepareGameView(s: Game): void {
  if (!viewIndexes.has(s)) viewIndexes.set(s, createPlanningIndex(s));
  prepareWorldView(s);
}
function readIndex(s: Game): PlanningIndex | undefined {
  return planningIndex?.source === s
    ? planningIndex
    : (viewIndexes.get(s) ?? planningIndex);
}
/** Own enumerable records in campaign order. Game dictionaries contain plain
 * JSON data; enumerating keys avoids V8's slower values path on large maps. */
function pieceValues(pieces: Game["pieces"]): Piece[] {
  const keys = Object.keys(pieces),
    out = new Array<Piece>(keys.length);
  for (let i = 0; i < keys.length; i++) out[i] = pieces[keys[i]];
  return out;
}
/** A shared read-only list within a planning frame or published snapshot.
 * Unregistered transaction drafts always read their current records. */
export function allPieces(s: Game): readonly Piece[] {
  const index = readIndex(s);
  return index?.source.pieces === s.pieces
    ? index.units
    : pieceValues(s.pieces);
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
    : allPieces(s).filter((u) => u.owner === p);
};
/** Passenger lists preserve global unit order, independent of ship selection
 * order. Unregistered mutable drafts read current records on every call. */
export function passengersOn(s: Game, carriers: readonly string[]): Piece[] {
  if (!carriers.length) return [];
  const selected = new Set(carriers),
    index = readIndex(s);
  if (index?.source.pieces !== s.pieces)
    return allPieces(s).filter((u) => !!u.carrier && selected.has(u.carrier));
  const result: Piece[] = [];
  let occupied = 0;
  for (const id of selected) {
    const passengers = index.passengers.get(id);
    if (!passengers?.length) continue;
    occupied++;
    for (const unit of passengers) result.push(unit);
  }
  if (occupied > 1) {
    const order = index.pieceOrder;
    result.sort((a, b) => order.get(a)! - order.get(b)!);
  }
  return result;
}
export function passengerCount(s: Game, carrier: string): number {
  const index = readIndex(s);
  if (index?.source.pieces === s.pieces)
    return index.passengers.get(carrier)?.length ?? 0;
  let count = 0;
  for (const unit of allPieces(s)) if (unit.carrier === carrier) count++;
  return count;
}
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
      : allPieces(s)
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
interface MovementOccupation {
  // Per owner: land, stranded land, naval, stranded naval. Count and power do
  // not affect passage. Passengers are absent until they disembark.
  tiles: Map<string, Map<number, number>>;
  keys?: readonly string[];
}
function collectMovementOccupation(
  units: readonly Piece[],
): MovementOccupation {
  const tiles = new Map<string, Map<number, number>>();
  let previous: Piece | undefined;
  let previousFlag = 0;
  for (const unit of units) {
    if (unit.carrier) continue;
    const flag = (unit.naval ? 4 : 1) << Number(!!unit.seasonStatus);
    // Recruitment commonly puts identical occupation records consecutively.
    // Skip their repeated map lookups as well as their former string creation.
    if (
      previous?.tile === unit.tile &&
      previous.owner === unit.owner &&
      previousFlag === flag
    )
      continue;
    previous = unit;
    previousFlag = flag;
    let owners = tiles.get(unit.tile);
    if (!owners) tiles.set(unit.tile, (owners = new Map()));
    owners.set(unit.owner, (owners.get(unit.owner) ?? 0) | flag);
  }
  return { tiles };
}
function movementOccupation(s: Game): MovementOccupation {
  const index = readIndex(s);
  return index?.source.pieces === s.pieces
    ? index.movement
    : collectMovementOccupation(allPieces(s));
}
/** Exact canonical route-cache keys, one per occupied faction/domain/status.
 * The readonly result may be shared only within immutable troop read scopes. */
export function movementOccupationKeys(s: Game): readonly string[] {
  const occupation = movementOccupation(s);
  if (!occupation.keys) {
    const keys: string[] = [];
    for (const [tile, owners] of occupation.tiles)
      for (const [owner, flags] of owners)
        for (let mode = 0; mode < 4; mode++)
          if (flags & (1 << mode))
            keys.push(`${tile}/${owner}/${mode >= 2}/${!!(mode & 1)}`);
    occupation.keys = keys.sort();
  }
  return occupation.keys;
}
export function hostileAt(
  s: Game,
  tile: string,
  p = s.active,
  naval?: boolean,
): boolean {
  const index = readIndex(s);
  if (index?.source.pieces === s.pieces) {
    const owners = index.movement.tiles.get(tile);
    // Stranded troops can be attacked from either movement domain.
    const mask = naval === undefined ? 15 : naval ? 14 : 11;
    if (owners)
      for (const [owner, flags] of owners)
        if (flags & mask && !friendly(s, owner, p)) return true;
  } else {
    // Mutable drafts must read current records; avoid intermediate unit arrays.
    for (const unit of allPieces(s))
      if (
        unit.tile === tile &&
        !unit.carrier &&
        (naval === undefined || unit.naval === naval || !!unit.seasonStatus) &&
        !friendly(s, unit.owner, p)
      )
        return true;
  }
  return false;
}
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
export const protects = (s: Game, t: Town, naval = false) =>
  s.vertices[t.vertex].tiles.some((tile) =>
    piecesAt(s, tile, naval ? undefined : false).some(
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
function unitCombatPower(
  u: Piece,
  family: ReturnType<typeof terrainFamily>,
  value: number,
) {
  return (
    (u.naval && u.seasonStatus === "icebound" ? Math.ceil(value / 4) : value) *
    (!u.naval && UNIT_INFO[u.kind as UnitClass].family === family ? 2 : 1)
  );
}
export function power(s: Game, units: Piece[], tile: string) {
  const family = terrainFamily(s.tiles[tile]);
  const owners = new Set<number>();
  let strength = 0,
    supported = false;
  for (const u of units) {
    const value = points(u);
    supported ||= u.naval || value > 0;
    owners.add(u.owner);
    strength += unitCombatPower(u, family, value);
  }
  // All represented owners contribute their tower support when the formation
  // contains a fighting unit or a ship, including zero-power ships as before.
  if (supported)
    for (const owner of owners) strength += combatTowerPower(s, owner, tile);
  return strength;
}
/** Evaluate one unchanged formation against many destinations in a read-only
 * search. Terrain contributions keep unit order and tower support stays local
 * to each destination. Create a new query after any change to the formation. */
export function formationPower(
  s: Game,
  units: Piece[],
): (tile: string) => number {
  const bases = new Map<ReturnType<typeof terrainFamily>, number>(),
    owners = new Set<number>();
  let supported = false;
  return (tile) => {
    const family = terrainFamily(s.tiles[tile]);
    let strength = bases.get(family);
    if (strength === undefined) {
      strength = 0;
      for (const u of units) {
        const value = points(u);
        supported ||= u.naval || value > 0;
        owners.add(u.owner);
        strength += unitCombatPower(u, family, value);
      }
      bases.set(family, strength);
    }
    if (supported)
      for (const owner of owners) strength += combatTowerPower(s, owner, tile);
    return strength;
  };
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
  return planningValue(s, `colonization/${unit.owner}/${unit.tile}`, () => {
    const corners = new Set(s.tiles[unit.tile].vertices);
    const index = readIndex(s);
    // Preserve map insertion order, including expedition seams. Immutable
    // decisions share its ordering index instead of enumerating the entire
    // growing world for every settler on the same six corners.
    const order =
      index?.source.vertices === s.vertices ? index.vertexOrder : undefined;
    const vertices = order
      ? [...corners]
          .filter((v) => order.has(v))
          .sort((a, b) => order.get(a)! - order.get(b)!)
      : Object.keys(s.vertices).filter((v) => corners.has(v));
    return vertices.filter(
      (v) =>
        settlementSite(s, v, unit.owner, true) &&
        !s.vertices[v].tiles.some((tile) => hostileAt(s, tile, unit.owner)),
    );
  }).slice();
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
type ProductionMode = "current" | "annual" | Season;
interface ProductionSource {
  owner: number;
  town: Town;
  tile: string;
  good: Good;
  amount: number;
}
type ProductionVisitor = (
  owner: number,
  town: Town,
  tile: string,
  good: Good,
  amount: number,
) => void;
interface ProductionActors {
  // Store both domains. Which one blocks a tile depends on the current view's
  // terrain, while occupation itself depends only on unchanged troop records.
  blockades: [Map<string, Set<number>>, Map<string, Set<number>>];
  collectors: { unit: Piece; count: number; key: string }[];
}
function sameCollector(a: Piece, b: Piece): boolean {
  return (
    a.owner === b.owner &&
    a.kind === b.kind &&
    a.tier === b.tier &&
    a.tile === b.tile &&
    (a.coverage === b.coverage ||
      (a.coverage !== undefined &&
        b.coverage !== undefined &&
        a.coverage.length === b.coverage.length &&
        a.coverage.every((tile, i) => tile === b.coverage![i])))
  );
}
function collectProductionActors(units: readonly Piece[]): ProductionActors {
  const blockades: ProductionActors["blockades"] = [new Map(), new Map()];
  const collectors: ProductionActors["collectors"] = [];
  let previous: ProductionActors["collectors"][number] | undefined;
  for (const unit of units) {
    if (unit.carrier) continue;
    if (unit.naval ? !isSettler(unit.kind) : points(unit) > 0) {
      const map = blockades[unit.naval ? 1 : 0];
      let owners = map.get(unit.tile);
      if (!owners) map.set(unit.tile, (owners = new Set()));
      owners.add(unit.owner);
    }
    if (!collector(unit)) continue;
    if (previous && sameCollector(previous.unit, unit)) previous.count++;
    else {
      previous = {
        unit,
        count: 1,
        key: JSON.stringify([
          unit.owner,
          unit.kind,
          unit.tier,
          unit.tile,
          unit.coverage,
        ]),
      };
      collectors.push(previous);
    }
  }
  return { blockades, collectors };
}
/** Related weather and faction views can share this troop-only index. Mutable
 * transactions without a matching read-only scope always inspect current units. */
function productionActors(s: Game): ProductionActors {
  const index = readIndex(s);
  return index?.source.pieces === s.pieces
    ? index.producers
    : collectProductionActors(allPieces(s));
}
export function productionSources(s: Game, mode: ProductionMode = "current") {
  const out: ProductionSource[] = [];
  forEachProduction(s, mode, (owner, town, tile, good, amount) => {
    out.push({ owner, town, tile, good, amount });
  });
  return out;
}
/** Read deliveries in producer order without allocating an array per forecast.
 * The visitor may accumulate a result, but must not change production inputs.
 * Keep every individual addition: grouping amounts changes AI rounding. */
export function forEachProduction(
  s: Game,
  mode: ProductionMode,
  visit: ProductionVisitor,
) {
  readProduction(s, mode, visit);
}
function readProduction(
  s: Game,
  mode: ProductionMode,
  visit: ProductionVisitor,
  repeated?: (sources: readonly ProductionSource[], count: number) => void,
) {
  const deliver = (
    owner: number,
    town: Town,
    tile: string,
    good: Good,
    amount: number,
  ) => {
    if (amount > 0) visit(owner, town, tile, good, amount);
  };
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
  // Blockades depend on the occupying factions, not their stack size. Only
  // read-only scopes share this index; mutable roll/forecast drafts rebuild it.
  const actors = productionActors(s);
  const blocks = new Map<string, boolean>();
  const blocked = (id: string, owner: number) => {
    const key = `${owner}/${id}`;
    if (!blocks.has(key)) {
      let result = false;
      for (const faction of actors.blockades[
        s.tiles[id]?.resource === "water" ? 1 : 0
      ].get(id) ?? [])
        if (!friendly(s, faction, owner)) {
          result = true;
          break;
        }
      blocks.set(key, result);
    }
    return blocks.get(key)!;
  };
  const warehouses = new Map<string, Town | undefined>();
  const warehouse = (id: string, owner: number) => {
    const key = `${owner}/${id}`;
    if (!warehouses.has(key)) warehouses.set(key, nearestTown(s, id, owner));
    return warehouses.get(key);
  };
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
        deliver(town.owner, town, id, raw as Good, amount!);
      if (town.extensions[id])
        deliver(
          town.owner,
          town,
          id,
          processedFor(good),
          workshopYield(
            tiles[id],
            town.owner,
            good,
            town.extensions[id],
            seasonalWorkshopBase(tiles[id], town.owner, good, season),
          ),
        );
    }
  for (const r of Object.values(s.routes))
    for (const [id, tier] of Object.entries(r.camps)) {
      const good = tileGood(tiles[id]),
        town = warehouse(id, r.owner);
      if (good && town && !blocked(id, r.owner))
        for (const [raw, amount] of Object.entries(yieldAt(id, r.owner)))
          deliver(r.owner, town, id, raw as Raw, tier * amount!);
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
  const collectors = new Map<string, ProductionSource[]>();
  for (const { unit: u, count, key } of actors.collectors) {
    let sources = collectors.get(key);
    if (!sources) {
      sources = [];
      const covered = harvestTiles(harvestWorld, u);
      const town = covered.length ? warehouse(u.tile, u.owner) : undefined;
      if (town)
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
              sources.push({
                owner: u.owner,
                town,
                tile: id,
                good: raw as Good,
                amount: amount!,
              });
        }
      collectors.set(key, sources);
    }
    // Preserve producer order and individual additions exactly. Multiplying
    // an aggregate would change floating-point forecasts and AI tie breaks.
    if (count > 1 && repeated) {
      repeated(sources, count);
      continue;
    }
    for (let i = 0; i < count; i++)
      for (const source of sources)
        deliver(
          source.owner,
          source.town,
          source.tile,
          source.good,
          source.amount,
        );
  }
}
/** Forecast totals with a pure, per-delivery weight. Identical collectors can
 * reuse their weighted terms, but every resource keeps its original sequence
 * of additions. Never multiply a sum by the collector count: that changes
 * rounding and AI decisions. No state or delivery data survives this call. */
export function forecastProduction(
  s: Game,
  mode: ProductionMode,
  weight: (tile: string, amount: number) => number,
): Record<number, Stock> {
  const result = Object.fromEntries(s.players.map((p) => [p.id, {}])) as Record<
    number,
    Stock
  >;
  readProduction(
    s,
    mode,
    (owner, _town, tile, good, amount) => {
      const stock = result[owner];
      stock[good] = (stock[good] ?? 0) + weight(tile, amount);
    },
    (sources, count) => {
      const terms = new Map<Stock, Map<Good, number[]>>();
      for (const { owner, tile, good, amount } of sources) {
        if (!(amount > 0)) continue;
        const stock = result[owner];
        let goods = terms.get(stock);
        if (!goods) terms.set(stock, (goods = new Map()));
        let values = goods.get(good);
        if (!values) goods.set(good, (values = []));
        values.push(weight(tile, amount));
      }
      // Different stock fields are independent. First-encounter order also
      // preserves the insertion order of resource keys in each returned stock.
      for (const [stock, goods] of terms)
        for (const [good, values] of goods) {
          let total = stock[good] ?? 0;
          for (let i = 0; i < count; i++)
            for (const value of values) total += value;
          stock[good] = total;
        }
    },
  );
  return result;
}
let productionTerrainRead:
  | {
      source: Game["tiles"];
      terrain?: string;
      position?: string;
      signature?: string;
    }
  | undefined;
/** The caller guarantees this terrain dictionary and all its records remain
 * unchanged until the callback returns. Other dictionaries always read fresh,
 * even after in-place edits. Scopes are synchronous, lazy and exception-safe. */
export function withProductionTerrainRead<T>(
  source: Game["tiles"],
  run: () => T,
): T {
  const previous = productionTerrainRead;
  productionTerrainRead = { source };
  try {
    return run();
  } finally {
    productionTerrainRead = previous;
  }
}
function productionKey(s: Game, position: string): string {
  const frame =
    productionTerrainRead?.source === s.tiles
      ? productionTerrainRead
      : undefined;
  if (frame?.signature !== undefined && frame.position === position)
    return frame.signature;
  // Keep every non-geometric field, including unknown future weather data.
  const terrain =
    frame?.terrain ??
    JSON.stringify(
      Object.entries(s.tiles).map(([id, tile]) => {
        const { vertices: _vertices, edges: _edges, ...harvest } = tile;
        return [id, harvest];
      }),
    );
  // Join two complete JSON arrays without encoding the terrain string again.
  // This remains an unambiguous value key, including arbitrary tile text.
  const signature = `[${terrain},${position}]`;
  if (frame) {
    frame.terrain = terrain;
    frame.position = position;
    frame.signature = signature;
  }
  return signature;
}
/** Complete public inputs to passive production. Resource spending, movement
 * allowances, walls and guild contracts do not change a harvest. Mutable inputs
 * need fresh values; only explicitly protected terrain may reuse its fields. */
export function productionSignature(s: Game): string {
  return planningValue(s, "production-signature", () => {
    const blockade = new Set<string>();
    // Consecutive identical collectors have an exact run representation. Keep
    // their order and count; production still adds every delivery separately.
    const actors = productionActors(s);
    const collectors = actors.collectors.map(({ unit: u, count }) => [
      u.owner,
      u.tile,
      u.kind,
      u.tier,
      u.coverage,
      count,
    ]);
    const fishers = new Map<number, Map<string, number>>();
    for (const { unit: u } of actors.collectors) {
      if (u.kind === "fishing") {
        if (!fishers.has(u.owner)) fishers.set(u.owner, new Map());
        const positions = fishers.get(u.owner)!;
        positions.set(u.tile, Math.max(positions.get(u.tile) ?? 0, u.tier));
      }
    }
    const towns = Object.values(s.towns);
    const camps = Object.values(s.routes).filter(
      (r) => Object.keys(r.camps).length,
    );
    const interests = new Map<string, Set<number>>();
    const mark = (tile: string, owner: number) => {
      if (!interests.has(tile)) interests.set(tile, new Set());
      interests.get(tile)!.add(owner);
    };
    for (const town of towns)
      for (const tile of s.vertices[town.vertex].tiles) mark(tile, town.owner);
    for (const route of camps)
      for (const tile of Object.keys(route.camps)) mark(tile, route.owner);
    // Fishing coverage changes with seasonal ice. Include every fishery within
    // geometric range, even across currently frozen or blocked sea lanes.
    // Merchants ignore blockades, so their movement is covered by their ordered
    // producer records above rather than adding blocked-harvest interests.
    if (fishers.size)
      for (const tile of Object.values(s.tiles))
        if (marineResource(tile))
          for (const [owner, positions] of fishers)
            for (const [origin, tier] of positions)
              if (distance(origin, tile.id) <= tier) {
                mark(tile.id, owner);
                break;
              }
    for (const [tile, owners] of interests) {
      const occupants =
        actors.blockades[s.tiles[tile]?.resource === "water" ? 1 : 0].get(
          tile,
        ) ?? [];
      for (const owner of owners)
        for (const occupant of occupants)
          if (!friendly(s, occupant, owner)) {
            blockade.add(`${owner}/${tile}`);
            break;
          }
    }
    const position = JSON.stringify([
      s.round,
      s.calendar,
      s.alliances,
      s.players.map((p) => p.id),
      towns.map((t) => [
        t.id,
        t.owner,
        t.vertex,
        t.level,
        t.extensions,
        t.extensionGoods,
        // Both direct harvests and nearest-warehouse lookup read only town
        // vertices. Unoccupied intersections cannot affect passive output.
        s.vertices[t.vertex].tiles,
      ]),
      camps.map((r) => [r.owner, r.camps]),
      [...blockade].sort(),
      collectors,
    ]);
    return productionKey(s, position);
  });
}
// Retain only the latest production position, not a history of growing saves.
let lastIncomeSignature: string | undefined;
let lastIncome: Record<number, Stock> | undefined;
// Within a decision, immutable state and counterparty views share forecasts.
// Outside that frame, the value signature guards the retained last result.
let incomeFrame: WeakMap<Game, Record<number, Stock>> | undefined;
function createPlanningIndex(
  source: Game,
  shared?: PlanningIndex,
  retainedUnits?: readonly Piece[],
): PlanningIndex {
  // A movement check needs tile occupancy, while a stock quote may need only
  // towns. Build each immutable index on demand instead of grouping the full
  // empire for every short read scope. One unit array serves all requested views.
  let units = retainedUnits;
  const unitRecords = () =>
    (units ??= shared?.units ?? pieceValues(source.pieces));
  let towns: PlanningIndex["towns"] | undefined;
  let vertices: PlanningIndex["vertices"] | undefined;
  let vertexOrder: PlanningIndex["vertexOrder"] | undefined;
  let pieces: PlanningIndex["pieces"] | undefined;
  let pieceOrder: PlanningIndex["pieceOrder"] | undefined;
  let passengers: PlanningIndex["passengers"] | undefined;
  let producers: ProductionActors | undefined;
  let movement: MovementOccupation | undefined;
  let tiles: PlanningIndex["tiles"] | undefined;
  let towerSupport: PlanningIndex["towerSupport"] | undefined;
  return {
    source,
    get units() {
      return unitRecords();
    },
    get towns() {
      if (!towns) {
        towns = new Map();
        for (const town of Object.values(source.towns)) {
          if (!towns.has(town.owner)) towns.set(town.owner, []);
          towns.get(town.owner)!.push(town);
        }
        for (const owned of towns.values())
          owned.sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));
      }
      return towns;
    },
    get vertices() {
      return (vertices ??= new Map(
        Object.values(source.towns).map((t) => [t.vertex, t]),
      ));
    },
    get vertexOrder() {
      return (vertexOrder ??= new Map(
        Object.keys(source.vertices).map((v, i) => [v, i]),
      ));
    },
    get pieces() {
      if (shared) return shared.pieces;
      if (!pieces) {
        pieces = new Map();
        for (const unit of unitRecords()) {
          if (!pieces.has(unit.owner)) pieces.set(unit.owner, []);
          pieces.get(unit.owner)!.push(unit);
        }
      }
      return pieces;
    },
    get pieceOrder() {
      if (shared) return shared.pieceOrder;
      return (pieceOrder ??= new Map(
        unitRecords().map((unit, i) => [unit, i]),
      ));
    },
    get passengers() {
      if (shared) return shared.passengers;
      if (!passengers) {
        passengers = new Map();
        for (const unit of unitRecords()) {
          if (!unit.carrier) continue;
          if (!passengers.has(unit.carrier)) passengers.set(unit.carrier, []);
          passengers.get(unit.carrier)!.push(unit);
        }
      }
      return passengers;
    },
    get producers() {
      if (shared) return shared.producers;
      return (producers ??= collectProductionActors(unitRecords()));
    },
    get movement() {
      if (shared) return shared.movement;
      return (movement ??= collectMovementOccupation(unitRecords()));
    },
    get tiles() {
      if (shared) return shared.tiles;
      if (!tiles) {
        tiles = new Map();
        for (const unit of unitRecords()) {
          if (unit.carrier) continue;
          if (!tiles.has(unit.tile)) tiles.set(unit.tile, []);
          tiles.get(unit.tile)!.push(unit);
        }
      }
      return tiles;
    },
    stocks: new Map(),
    nearest: new Map(),
    towerDefenses: new Map(),
    get towerSupport() {
      if (!towerSupport) {
        towerSupport = new Map();
        for (const tower of Object.values(source.towers ?? {}))
          for (const tile of source.vertices[tower.vertex].tiles) {
            const key = `${tower.owner}/${tile}`;
            towerSupport.set(key, (towerSupport.get(key) ?? 0) + tower.tier);
          }
      }
      return towerSupport;
    },
    memo: new Map(),
  };
}
/** Join an existing read-only decision for this exact view. Mutating callers
 * must leave the scope before execution and start a fresh frame afterwards. */
export function reusePlanningFrame<T>(source: Game, run: () => T): T {
  return planningIndex?.source === source
    ? run()
    : withPlanningFrame(source, run);
}
export function withPlanningFrame<T>(source: Game, run: () => T): T {
  return planningFrame(source, run);
}
/** Read a related view while the enclosing frame's troop records are unchanged.
 * Other indexes and memoized values stay fresh, including diplomacy/production.
 * Both callers must finish before any troop is added, removed or edited. */
export function withSharedPiecePlanningFrame<T>(source: Game, run: () => T): T {
  return planningFrame(
    source,
    run,
    planningIndex?.source.pieces === source.pieces ? planningIndex : undefined,
  );
}
/** Start fresh derived indexes after an in-place edit that preserves every
 * troop record and its dictionary order. Only the record list survives; tile,
 * owner, carrier, production and other calculated indexes are rebuilt. Never
 * use after recruitment, deletion, replacement or an unchecked command. */
export function withPieceListPlanningFrame<T>(
  source: Game,
  units: readonly Piece[] | undefined,
  run: () => T,
): T {
  return planningFrame(source, run, undefined, units);
}
function planningFrame<T>(
  source: Game,
  run: () => T,
  shared?: PlanningIndex,
  retainedUnits?: readonly Piece[],
): T {
  const previous = incomeFrame;
  const previousIndex = planningIndex;
  planningIndex = createPlanningIndex(source, shared, retainedUnits);
  incomeFrame = new WeakMap();
  try {
    return withWorldReadFrame(source, run);
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
      all = forecastProduction(
        s,
        "annual",
        (tile, amount) => probability(s.tiles[tile].number) * amount,
      );
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
/** A ship needs a siege battery and navigable water to operate against a town.
 * Land armies retain their ordinary siege ability without artillery. */
export const canBesiege = (s: Game, u: Piece) =>
  !u.carrier &&
  (u.naval
    ? shipStats(u.kind as ShipClass, u.tier).siege > 0 &&
      u.seasonStatus !== "icebound" &&
      canOccupy(s.tiles[u.tile], true)
    : points(u) > 0);
export const siegePower = (units: Piece[]) =>
  units.reduce(
    (n, u) =>
      n +
      (u.naval
        ? u.seasonStatus === "icebound"
          ? 0
          : shipStats(u.kind as ShipClass, u.tier).siege
        : u.kind === "artillery"
          ? u.tier
          : 0),
    0,
  ) + maxValue([0, ...units.map((u) => u.guildSiege ?? 0)]);
export function siegeRequirement(s: Game, town: Town, units: Piece[]) {
  const index = readIndex(s),
    cache = index?.source === s ? index.towerDefenses : undefined,
    key = `${town.owner}/${town.vertex}`;
  let support = cache?.get(key);
  if (support === undefined) {
    support = towerDefense(s, town.owner, town.vertex);
    cache?.set(key, support);
  }
  return Math.max(0, town.level - 1 + town.wall + support - siegePower(units));
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
  if (s.tiles[tile]?.biome !== "woods") return false;
  // Several woods are considered in one AI decision. Collect the faction's
  // harvest access once, rather than scanning every unit for each woodland.
  // Mutable drafts retain the direct query below; published snapshots and
  // explicit read-only planning frames receive their own access set.
  if (readIndex(s)?.source === s)
    return planningValue(s, `woodsAccess/${owner}`, () => {
      const accessible = new Set<string>();
      for (const town of ownTowns(s, owner))
        for (const id of s.vertices[town.vertex].tiles) accessible.add(id);
      for (const route of Object.values(s.routes))
        if (route.owner === owner)
          for (const [id, tier] of Object.entries(route.camps))
            if (tier) accessible.add(id);
      for (const unit of ownPieces(s, owner))
        for (const id of harvestTiles(s, unit)) accessible.add(id);
      return accessible;
    }).has(tile);
  return (
    ownTowns(s, owner).some((t) => s.vertices[t.vertex].tiles.includes(tile)) ||
    Object.values(s.routes).some((r) => r.owner === owner && !!r.camps[tile]) ||
    ownPieces(s, owner).some((u) => harvestTiles(s, u).includes(tile))
  );
}

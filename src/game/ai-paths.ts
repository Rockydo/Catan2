import { pieceAccess } from "./geography";
import type { Game } from "./types";
import { neighbors, canOccupy } from "./world";
import {
  hostileAt,
  planningValue,
  movementOccupationKeys,
  piecesAt,
} from "./selectors";

interface RouteTree {
  previous: Map<string, string>;
  depth: Map<string, number>;
}
interface RouteCache {
  trees: Map<string, RouteTree>;
  tiles: number;
}
// AI planning treats its input as immutable. A new engine command produces a
// new Game, so neither occupation nor exploration can leave a stale route tree.
const cache = new WeakMap<Game, RouteCache>();
let lastNetwork: string | undefined;
let sharedRoutes: RouteCache = { trees: new Map(), tiles: 0 };
function networkRoutes(s: Game) {
  return planningValue(s, "path-network", () => {
    // Routes depend on passability, alliances and occupation, never on stocks,
    // guild allowances, walls or the number of soldiers sharing a hex.
    const network = JSON.stringify([
      Object.values(s.tiles).map((t) => [
        t.id,
        canOccupy(t),
        canOccupy(t, true),
        t.geography?.waterway,
      ]),
      movementOccupationKeys(s),
      s.alliances,
    ]);
    if (network !== lastNetwork) {
      lastNetwork = network;
      sharedRoutes = { trees: new Map(), tiles: 0 };
    }
    return sharedRoutes;
  });
}
function routeTree(
  s: Game,
  from: string,
  naval: boolean,
  owner: number,
  max: number,
): RouteTree {
  let frame = cache.get(s);
  if (!frame) {
    frame = networkRoutes(s);
    cache.set(s, frame);
  }
  const profiles = naval
    ? [
        ...new Map(
          piecesAt(s, from)
            .filter((u) => u.owner === owner && u.naval)
            .map((u) => [`${u.kind}/${u.tier}`, u]),
        ).values(),
      ]
    : [];
  const key = `${from}/${naval}/${owner}/${max}/${profiles
    .map((u) => u.kind + u.tier)
    .sort()
    .join(",")}`;
  let tree = frame.trees.get(key);
  if (!tree) {
    const previous = new Map([[from, from]]),
      depth = new Map([[from, 0]]),
      queue = [from];
    for (let i = 0; i < queue.length; i++) {
      const current = queue[i],
        d = depth.get(current)!;
      if (d >= max) continue;
      for (const next of neighbors(current)) {
        if (
          previous.has(next) ||
          !canOccupy(s.tiles[next], naval) ||
          !profiles.every((u) => pieceAccess(s.tiles[next], u))
        )
          continue;
        previous.set(next, current);
        depth.set(next, d + 1);
        // An enemy tile is a valid attack destination, never a transit tile.
        if (!hostileAt(s, next, owner, naval)) queue.push(next);
      }
    }
    tree = { previous, depth };
    // Bound both source count and retained destinations. A single large tree
    // remains usable, but cannot multiply into 256 full-map copies. Local
    // queries retain their own tree safely after it leaves this shared cache.
    while (
      frame.trees.size &&
      (frame.trees.size >= 256 || frame.tiles + depth.size > 262144)
    ) {
      const oldest = frame.trees.keys().next().value!;
      frame.tiles -= frame.trees.get(oldest)!.depth.size;
      frame.trees.delete(oldest);
    }
    frame.trees.set(key, tree);
    frame.tiles += depth.size;
  }
  return tree;
}

/** Cost-only queries share the same search without allocating entire paths. */
export function planningDestinations(
  s: Game,
  from: string,
  naval: boolean,
  owner: number,
): IterableIterator<[string, number]> {
  // Retain breadth-first visit order, including the origin for stranded forces.
  // Entries expose copied pairs, never the mutable shared depth map itself.
  return routeTree(s, from, naval, owner, Infinity).depth.entries();
}

export function planningDistances(
  s: Game,
  from: string,
  naval: boolean,
  owner: number,
  max = Infinity,
): (to: string) => number {
  const { depth } = routeTree(s, from, naval, owner, max);
  // A fan-out query holds one tree for its local loop, even if other queries
  // evict it from the bounded shared cache. Do not expose the mutable map.
  return (to) =>
    canOccupy(s.tiles[to], naval) ? (depth.get(to) ?? Infinity) : Infinity;
}

export function planningDistance(
  s: Game,
  from: string,
  to: string,
  naval: boolean,
  owner: number,
  max = Infinity,
): number {
  if (!canOccupy(s.tiles[to], naval)) return Infinity;
  if (from === to) return 0;
  return routeTree(s, from, naval, owner, max).depth.get(to) ?? Infinity;
}
export function planningPath(
  s: Game,
  from: string,
  to: string,
  naval: boolean,
  owner: number,
  max = Infinity,
): string[] | null {
  if (!canOccupy(s.tiles[to], naval)) return null;
  if (from === to) return [];
  const { previous } = routeTree(s, from, naval, owner, max);
  if (!previous.has(to)) return null;
  const route = [to];
  let at = to;
  while (previous.get(at) !== from) {
    at = previous.get(at)!;
    route.push(at);
  }
  return route.reverse();
}

interface Connectivity {
  regions: Map<string, number>;
  endpoints: Map<string, Set<number>>;
}
// Reachability does not need a shortest-path tree for every source. A blocked
// tile remains a legal destination (or origin), but never joins two regions.
// The key is the same validated movement network as the distance/path cache.
const connectivity = new WeakMap<RouteCache, Map<string, Connectivity>>();
export function planningReachable(
  s: Game,
  from: string,
  to: string,
  naval: boolean,
  owner: number,
  max = Infinity,
): boolean {
  if (max !== Infinity)
    return Number.isFinite(planningDistance(s, from, to, naval, owner, max));
  if (!canOccupy(s.tiles[to], naval)) return false;
  if (from === to) return true;
  const network = movementNetwork(s, naval, owner);
  const origin = network.regions.get(from),
    target = network.regions.get(to);
  if (origin !== undefined && target !== undefined) return origin === target;
  // Adjacent blocked tiles can fight without an unoccupied transit region.
  if (neighbors(from).includes(to)) return true;
  if (origin !== undefined) return adjacentRegions(network, to).has(origin);
  if (target !== undefined) return adjacentRegions(network, from).has(target);
  const end = adjacentRegions(network, to);
  for (const region of adjacentRegions(network, from))
    if (end.has(region)) return true;
  return false;
}

/** Transit regions join only passable, unblocked tiles. Equal labels within
 * this position, owner and movement domain have identical unlimited reach.
 * Hostile and invalid origins return undefined and must be assessed separately. */
export function planningTransitRegion(
  s: Game,
  from: string,
  naval: boolean,
  owner: number,
): number | undefined {
  return movementNetwork(s, naval, owner).regions.get(from);
}

/** Hold the movement network once when one origin tests many destinations.
 * Like planningReachable, enemy tiles are endpoints, never transit bridges. */
export function planningReachableFrom(
  s: Game,
  from: string,
  naval: boolean,
  owner: number,
): (to: string) => boolean {
  const network = movementNetwork(s, naval, owner),
    origin = network.regions.get(from);
  if (origin !== undefined)
    return (to) => {
      if (!canOccupy(s.tiles[to], naval)) return false;
      const target = network.regions.get(to);
      return target !== undefined
        ? origin === target
        : adjacentRegions(network, to).has(origin);
    };
  const adjacent = new Set(neighbors(from)),
    regions = adjacentRegions(network, from);
  return (to) => {
    if (!canOccupy(s.tiles[to], naval)) return false;
    if (from === to || adjacent.has(to)) return true;
    const target = network.regions.get(to);
    if (target !== undefined) return regions.has(target);
    for (const end of adjacentRegions(network, to))
      if (regions.has(end)) return true;
    return false;
  };
}

function movementNetwork(s: Game, naval: boolean, owner: number): Connectivity {
  let frame = cache.get(s);
  if (!frame) {
    frame = networkRoutes(s);
    cache.set(s, frame);
  }
  let networks = connectivity.get(frame);
  if (!networks) {
    networks = new Map();
    connectivity.set(frame, networks);
  }
  const key = `${naval}/${owner}`;
  let network = networks.get(key);
  if (!network) {
    const passable = new Set(
      Object.keys(s.tiles).filter(
        (id) =>
          canOccupy(s.tiles[id], naval) && !hostileAt(s, id, owner, naval),
      ),
    );
    const regions = new Map<string, number>();
    let region = 0;
    for (const tile of passable) {
      if (regions.has(tile)) continue;
      const queue = [tile];
      regions.set(tile, region);
      for (let i = 0; i < queue.length; i++)
        for (const next of neighbors(queue[i]))
          if (passable.has(next) && !regions.has(next)) {
            regions.set(next, region);
            queue.push(next);
          }
      region++;
    }
    network = { regions, endpoints: new Map() };
    networks.set(key, network);
  }
  return network;
}

function adjacentRegions(network: Connectivity, tile: string): Set<number> {
  let result = network.endpoints.get(tile);
  if (!result) {
    result = new Set<number>();
    for (const id of neighbors(tile)) {
      const region = network.regions.get(id);
      if (region !== undefined) result.add(region);
    }
    network.endpoints.set(tile, result);
  }
  return result;
}

/** Unlimited reach to any of a fixed set of destinations. Compile their transit
 * regions once when many possible origins share the same strategic objectives.
 * Hostile destinations remain endpoints, never bridges through a blockade.
 * The returned query retains this immutable position, including after eviction. */
export function planningReachableToAny(
  s: Game,
  destinations: Iterable<string>,
  naval: boolean,
  owner: number,
): (from: string) => boolean {
  const targets = new Set<string>();
  for (const tile of destinations)
    if (canOccupy(s.tiles[tile], naval)) targets.add(tile);
  if (!targets.size) return () => false;
  const network = movementNetwork(s, naval, owner),
    goalRegions = new Set<number>();
  for (const tile of targets) {
    const region = network.regions.get(tile);
    if (region !== undefined) goalRegions.add(region);
    else
      for (const adjacent of adjacentRegions(network, tile))
        goalRegions.add(adjacent);
  }
  return (from) => {
    if (targets.has(from)) return true;
    const region = network.regions.get(from);
    if (region !== undefined) return goalRegions.has(region);
    for (const tile of neighbors(from)) if (targets.has(tile)) return true;
    for (const adjacent of adjacentRegions(network, from))
      if (goalRegions.has(adjacent)) return true;
    return false;
  };
}

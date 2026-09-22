import type { Game } from "./types";
import { neighbors, canOccupy } from "./world";
import { hostileAt, planningValue } from "./selectors";

interface RouteTree {
  previous: Map<string, string>;
  depth: Map<string, number>;
}
// AI planning treats its input as immutable. A new engine command produces a
// new Game, so neither occupation nor exploration can leave a stale route tree.
const cache = new WeakMap<Game, Map<string, RouteTree>>();
let lastNetwork: string | undefined;
let sharedRoutes = new Map<string, RouteTree>();
function networkRoutes(s: Game) {
  return planningValue(s, "path-network", () => {
    // Routes depend on passability, alliances and occupation, never on stocks,
    // guild allowances, walls or the number of soldiers sharing a hex.
    const occupation = new Set<string>();
    for (const u of Object.values(s.pieces))
      if (!u.carrier)
        occupation.add(`${u.tile}/${u.owner}/${u.naval}/${!!u.seasonStatus}`);
    const network = JSON.stringify([
      Object.values(s.tiles).map((t) => [
        t.id,
        canOccupy(t),
        canOccupy(t, true),
      ]),
      [...occupation].sort(),
      s.alliances,
    ]);
    if (network !== lastNetwork) {
      lastNetwork = network;
      sharedRoutes = new Map();
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
  const key = `${from}/${naval}/${owner}/${max}`;
  let tree = frame.get(key);
  if (!tree) {
    const previous = new Map([[from, from]]),
      depth = new Map([[from, 0]]),
      queue = [from];
    for (let i = 0; i < queue.length; i++) {
      const current = queue[i],
        d = depth.get(current)!;
      if (d >= max) continue;
      for (const next of neighbors(current)) {
        if (previous.has(next) || !canOccupy(s.tiles[next], naval)) continue;
        previous.set(next, current);
        depth.set(next, d + 1);
        // An enemy tile is a valid attack destination, never a transit tile.
        if (!hostileAt(s, next, owner, naval)) queue.push(next);
      }
    }
    tree = { previous, depth };
    // Bound retained geometry even during very large, open-ended campaigns.
    if (frame.size >= 256) frame.delete(frame.keys().next().value!);
    frame.set(key, tree);
  }
  return tree;
}

/** Cost-only queries share the same search without allocating entire paths. */
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
  while (previous.get(route[0]) !== from)
    route.unshift(previous.get(route[0])!);
  return route;
}

interface Connectivity {
  regions: Map<string, number>;
  endpoints: Map<string, Set<number>>;
}
// Reachability does not need a shortest-path tree for every source. A blocked
// tile remains a legal destination (or origin), but never joins two regions.
// The key is the same validated movement network as the distance/path cache.
const connectivity = new WeakMap<
  Map<string, RouteTree>,
  Map<string, Connectivity>
>();
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
  const origin = network.regions.get(from),
    target = network.regions.get(to);
  if (origin !== undefined && target !== undefined) return origin === target;
  // Two adjacent blocked tiles can fight each other directly, even when no
  // unoccupied transit tile connects them. The destination is already passable.
  if (neighbors(from).includes(to)) return true;
  const adjacentRegions = (tile: string) => {
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
  };
  if (origin !== undefined) return adjacentRegions(to).has(origin);
  if (target !== undefined) return adjacentRegions(from).has(target);
  const end = adjacentRegions(to);
  for (const region of adjacentRegions(from)) if (end.has(region)) return true;
  return false;
}

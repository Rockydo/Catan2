import type { Game } from "./types";
import { neighbors, canOccupy } from "./world";
import { hostileAt } from "./selectors";

// AI planning treats its input as immutable. A new engine command produces a
// new Game, so neither occupation nor exploration can leave a stale route tree.
const cache = new WeakMap<Game, Map<string, Map<string, string>>>();
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
  let frame = cache.get(s);
  if (!frame) {
    frame = new Map();
    cache.set(s, frame);
  }
  const key = `${from}/${naval}/${owner}/${max}`;
  let previous = frame.get(key);
  if (!previous) {
    previous = new Map([[from, from]]);
    const queue = [from],
      depth = new Map([[from, 0]]);
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
    frame.set(key, previous);
  }
  if (!previous.has(to)) return null;
  const route = [to];
  while (previous.get(route[0]) !== from)
    route.unshift(previous.get(route[0])!);
  return route;
}

import type { Game } from "../src/game/types";
import { canOccupy, neighbors } from "../src/game/world";
import { hostileAt } from "../src/game/selectors";

// The former emergency planner stored a full path to every reachable hex.
// Retain it as an independent ordering, distance and allocation reference.
export function formerDeployment(
  s: Game,
  origin: string,
  naval: boolean,
  owner: number,
) {
  const paths = new Map<string, string[]>([[origin, []]]),
    queue = [origin];
  for (let i = 0; i < queue.length; i++)
    for (const next of neighbors(queue[i])) {
      if (!canOccupy(s.tiles[next], naval) || paths.has(next)) continue;
      paths.set(next, [...paths.get(queue[i])!, next]);
      if (!hostileAt(s, next, owner, naval)) queue.push(next);
    }
  return paths;
}

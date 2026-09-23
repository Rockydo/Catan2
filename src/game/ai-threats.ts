import type { Game } from "./types";
import { friendly } from "./relations";
import { distance, neighbors } from "./world";
import { allPieces, points, speed } from "./selectors";
import { planningReachable } from "./ai-paths";

/** Existence-only danger checks for collectors. Soldiers with the same owner,
 * origin, domain and speed have identical reach. Keep the first occurrence of
 * each, without combining the strength or movement of different formations.
 * Recruitment uses its existing conservative radius rule without route checks. */
export function collectorThreats(
  s: Game,
  owner = s.active,
  checkRoutes = true,
) {
  type Threat = { tile: string; owner: number; movement: number };
  const threats: Threat[][] = [[], []],
    seen = [new Set<string>(), new Set<string>()],
    danger = [new Map<string, boolean>(), new Map<string, boolean>()];
  for (const unit of allPieces(s)) {
    if (friendly(s, unit.owner, owner) || !(points(unit) > 0)) continue;
    const domain = Number(unit.naval),
      movement = speed(unit),
      key = `${unit.owner}/${unit.tile}/${movement}`;
    if (seen[domain].has(key)) continue;
    seen[domain].add(key);
    threats[domain].push({ tile: unit.tile, owner: unit.owner, movement });
  }
  return (tile: string, naval: boolean): boolean => {
    const domain = Number(naval),
      cached = danger[domain].get(tile);
    if (cached !== undefined) return cached;
    const result = threats[domain].some(
      (threat) =>
        distance(threat.tile, tile) <= threat.movement &&
        (!checkRoutes ||
          planningReachable(
            s,
            threat.tile,
            tile,
            naval,
            threat.owner,
            threat.movement,
          )),
    );
    danger[domain].set(tile, result);
    return result;
  };
}

/** Colonists avoid enemy-occupied tiles and the neighbors of armed enemies.
 * Expanding a stack's neighborhood once gives exactly the same danger set. */
export function colonistDanger(s: Game, owner = s.active): Set<string>[] {
  const danger = [new Set<string>(), new Set<string>()],
    expanded = [new Set<string>(), new Set<string>()];
  for (const unit of allPieces(s)) {
    if (unit.carrier || friendly(s, unit.owner, owner)) continue;
    const domain = Number(unit.naval);
    danger[domain].add(unit.tile);
    if (!(points(unit) > 0) || expanded[domain].has(unit.tile)) continue;
    expanded[domain].add(unit.tile);
    for (const tile of neighbors(unit.tile)) danger[domain].add(tile);
  }
  return danger;
}

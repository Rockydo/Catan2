import type { Game } from "./types";
import { friendly } from "./relations";
import { distance, neighbors } from "./world";
import { piecePlanningValue, points, speed } from "./selectors";
import { planningReachable } from "./ai-paths";

/** These existence checks ignore stack count, orders and remaining movement.
 * Keep each distinct troop profile's first occurrence in campaign order. The
 * caller still evaluates current diplomacy and terrain, and still distinguishes
 * passengers (ignored by colonists, included by the collector's existing rule).
 * Only the unchanged troop list is shared between read-only decision views. */
function threatUnits(s: Game) {
  return piecePlanningValue(s, "civilian-threat-units", (units) => {
    if (units.length < 64) return units;
    const seen = new Set<string>(),
      result = [];
    let previous: (typeof units)[number] | undefined;
    for (const unit of units) {
      if (
        previous?.owner === unit.owner &&
        previous.tile === unit.tile &&
        previous.kind === unit.kind &&
        previous.naval === unit.naval &&
        previous.tier === unit.tier &&
        !!previous.carrier === !!unit.carrier
      )
        continue;
      previous = unit;
      const key = JSON.stringify([
        unit.owner,
        unit.tile,
        unit.kind,
        unit.naval,
        unit.tier,
        !!unit.carrier,
      ]);
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(unit);
    }
    return result;
  });
}

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
  for (const unit of threatUnits(s)) {
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
  for (const unit of threatUnits(s)) {
    if (unit.carrier || friendly(s, unit.owner, owner)) continue;
    const domain = Number(unit.naval);
    danger[domain].add(unit.tile);
    if (!(points(unit) > 0) || expanded[domain].has(unit.tile)) continue;
    expanded[domain].add(unit.tile);
    for (const tile of neighbors(unit.tile)) danger[domain].add(tile);
  }
  return danger;
}

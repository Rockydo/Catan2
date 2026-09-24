import type { Game, Piece } from "./types";
import { canOccupy, neighbors } from "./world";
import { friendly } from "./relations";
import { log } from "./economy";
import { power } from "./selectors";
import { engageBattle, setTile } from "./military";

const solidLand = (s: Game, tile: string) =>
  !!s.tiles[tile] &&
  !["water", "ice"].includes(s.tiles[tile].resource) &&
  canOccupy(s.tiles[tile], false);

/** Search the old ice sheet and remaining ice, without crossing older open sea
 * or hostile forces. Seasonal flooded ground and closed passes use the same evacuation rules. Safe land takes priority over a forced enemy landing. */
export function thawLanding(
  s: Game,
  origin: string,
  owner: number,
  ice: Set<string>,
): { tile: string; defenders: Piece[] } | undefined {
  const enemies = new Map<string, Piece[]>();
  for (const unit of Object.values(s.pieces)) {
    if (unit.carrier || friendly(s, owner, unit.owner)) continue;
    const group = enemies.get(unit.tile);
    if (group) group.push(unit);
    else enemies.set(unit.tile, [unit]);
  }
  const visited = new Set([origin]),
    queue = [{ tile: origin, steps: 0 }],
    contested: { tile: string; steps: number; defenders: Piece[] }[] = [];
  for (let i = 0; i < queue.length; i++) {
    const at = queue[i];
    for (const tile of neighbors(at.tile)) {
      if (visited.has(tile) || !s.tiles[tile]) continue;
      visited.add(tile);
      const defenders = enemies.get(tile) ?? [];
      if (solidLand(s, tile)) {
        if (!defenders.length) return { tile, defenders };
        contested.push({ tile, steps: at.steps + 1, defenders });
      } else if (
        !defenders.length &&
        (ice.has(tile) || s.tiles[tile].surface === "frozen")
      )
        queue.push({ tile, steps: at.steps + 1 });
    }
  }
  return contested.sort(
    (a, b) =>
      a.steps - b.steps ||
      power(s, a.defenders, a.tile) - power(s, b.defenders, b.tile) ||
      a.tile.localeCompare(b.tile),
  )[0];
}

export function continueThawRetreats(s: Game): void {
  const retreat = s.thawRetreats;
  if (!retreat || s.battle) return;
  const ice = new Set(retreat.ice);
  while (retreat.pending.length && !s.battle) {
    const next = retreat.pending.shift()!;
    const units = next.ids
      .map((id) => s.pieces[id])
      .filter(
        (u) =>
          u &&
          u.owner === next.owner &&
          u.tile === next.origin &&
          !u.naval &&
          !u.carrier &&
          u.seasonStatus === "adrift",
      );
    if (!units.length) continue;
    const landing = thawLanding(s, next.origin, next.owner, ice);
    if (!landing) {
      log(
        s,
        `${s.players[next.owner].name}: seasonal terrain closure left ${units.length} units without a reachable landing. Transport rescue is needed.`,
        "info",
        next.owner,
        next.origin,
      );
      continue;
    }
    if (landing.defenders.length) {
      log(
        s,
        `${s.players[next.owner].name}: retreating from seasonal terrain closure into an enemy-held landing at ${landing.tile}.`,
        "battle",
        next.owner,
        landing.tile,
      );
      engageBattle(
        s,
        units,
        landing.defenders,
        next.origin,
        landing.tile,
        true,
      );
    } else {
      for (const unit of units) setTile(s, unit, landing.tile);
      log(
        s,
        `${s.players[next.owner].name}: ${units.length} units automatically retreated from seasonal terrain closure to ${landing.tile}.`,
        "info",
        next.owner,
        landing.tile,
      );
    }
  }
  if (!s.battle) delete s.thawRetreats;
}

/** Called after the new round's weather and turn-start effects. Embarked troops
 * remain aboard; a forced retreat costs no movement and cannot be rerolled. */
export function startThawRetreats(s: Game, previousIce: string[]): void {
  const groups = new Map<
    string,
    { owner: number; origin: string; ids: string[] }
  >();
  for (const unit of Object.values(s.pieces)) {
    if (unit.naval || unit.carrier || unit.seasonStatus !== "adrift") continue;
    const key = `${unit.owner}/${unit.tile}`;
    if (!groups.has(key))
      groups.set(key, { owner: unit.owner, origin: unit.tile, ids: [] });
    groups.get(key)!.ids.push(unit.id);
  }
  if (!groups.size) return;
  const priority = (owner: number) =>
    (owner - (s.round % s.players.length) + s.players.length) %
    s.players.length;
  s.thawRetreats = {
    round: s.round,
    ice: previousIce,
    pending: [...groups.values()].sort(
      (a, b) =>
        priority(a.owner) - priority(b.owner) ||
        a.origin.localeCompare(b.origin),
    ),
  };
  continueThawRetreats(s);
}

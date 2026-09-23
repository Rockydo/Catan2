import type { Game, Piece, Town } from "../game/types";
import { GUILDS, townGuilds } from "../game/guilds";
import { townSiegeStatuses } from "../game/siege-status";
import { vertexPoint } from "../game/world";

/** Reuse formations whose ordered members have not changed. Keep only the
 * current scene, never old game snapshots or a history of moved armies. */
export function groupMapUnits(
  units: readonly Piece[],
  previous: Record<string, Piece[]> = {},
) {
  const groups: Record<string, Piece[]> = {},
    counts = new Map<string, number>();
  for (const unit of units) {
    if (unit.carrier) continue;
    const tile = unit.tile,
      index = counts.get(tile) ?? 0,
      prior = previous[tile];
    counts.set(tile, index + 1);
    if (index === 0) groups[tile] = prior ?? [];
    if (groups[tile] === prior) {
      if (prior[index] === unit) continue;
      groups[tile] = prior.slice(0, index);
    }
    groups[tile].push(unit);
  }
  for (const [tile, count] of counts)
    if (groups[tile] === previous[tile] && groups[tile].length !== count)
      groups[tile] = groups[tile].slice(0, count);
  return groups;
}

/** Scalar presentation props let React skip towns after unrelated orders.
 * Siege state is computed from the current game: nearby artillery, towers and
 * attacker turns can change its appearance without changing the town itself. */
export function townMapView(s: Game, town: Town, besieged: boolean) {
  const guilds = townGuilds(town),
    siege = besieged ? townSiegeStatuses(s, town)[0] : undefined;
  return {
    id: town.id,
    vertex: town.vertex,
    name: town.name,
    level: town.level,
    wall: town.wall,
    owner: town.owner,
    ownerName: s.players[town.owner].name,
    extensionCount: Object.keys(town.extensions).length,
    ...vertexPoint(s.vertices[town.vertex]),
    guildKind: guilds[0]?.kind,
    guildTier: guilds[0]?.tier,
    guildCount: guilds.length,
    guildLabel: guilds
      .map((g) => `${GUILDS[g.kind].name} tier ${g.tier}`)
      .join(", "),
    guildTitle: guilds
      .map((g) => ` · ${GUILDS[g.kind].name} ${g.tier}`)
      .join(""),
    siegeLabel: siege?.label,
    siegeBadge: siege
      ? siege.breached
        ? "BREACHED"
        : siege.remaining === 0
          ? "EXPOSED"
          : `SIEGE ${siege.completed}/${siege.required}`
      : undefined,
    siegeFraction: siege?.fraction,
  };
}

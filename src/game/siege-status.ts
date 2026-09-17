import type { Game, Town, Watchtower } from "./types";
import { piecesAt, siegeRequirement, towerSiegeRequirement } from "./selectors";
import { landAtVertex } from "./world";

/** Saved participants stay on their hex; old saves fall back to adjacent forces. */
export function siegeParticipants(s: Game, town: Town, owner: number) {
  const siege = s.sieges[`${owner}:${town.id}`];
  if (!siege) return [];
  const nearby = landAtVertex(s, town.vertex).flatMap((tile) =>
    piecesAt(s, tile, false).filter((u) => u.owner === owner),
  );
  const linked = nearby.filter((u) => siege.units?.includes(u.id));
  return linked.length ? linked : nearby;
}

/** One army on one hex performs an operation. Never pool artillery across hexes. */
export function townSiegeStatuses(s: Game, town: Town) {
  return Object.values(s.sieges)
    .filter((siege) => siege.town === town.id)
    .map((siege) => {
      const groups = landAtVertex(s, town.vertex).map((tile) =>
        piecesAt(s, tile, false).filter((u) => u.owner === siege.owner),
      );
      const required = Math.min(
        ...groups
          .filter((g) => g.length)
          .map((g) => siegeRequirement(s, town, g)),
        siegeRequirement(s, town, []),
      );
      const remaining = Math.max(0, required - siege.progress);
      const breached = siege.raided !== null;
      const destructionReady =
        breached &&
        siege.raided! < s.players[siege.owner].turns &&
        siege.last < s.players[siege.owner].turns;
      const label = breached
        ? destructionReady
          ? "Breached · destruction possible now"
          : "Breached · destruction possible next attacker turn"
        : remaining
          ? `${remaining} siege ${remaining === 1 ? "step" : "steps"} before a raid`
          : "Defenses exhausted · raid available on the next operation";
      return {
        siege,
        required,
        remaining,
        breached,
        destructionReady,
        label,
        completed: Math.min(required, siege.progress),
        fraction:
          breached || required === 0
            ? 1
            : Math.min(1, siege.progress / required),
      };
    })
    .sort(
      (a, b) =>
        Number(b.breached) - Number(a.breached) || a.remaining - b.remaining,
    );
}

export function towerSiegeStatuses(s: Game, tower: Watchtower) {
  return Object.values(s.towerSieges ?? {})
    .filter((siege) => siege.tower === tower.id)
    .map((siege) => {
      const groups = landAtVertex(s, tower.vertex)
        .map((tile) => ({
          tile,
          units: piecesAt(s, tile, false).filter(
            (u) => u.owner === siege.owner,
          ),
        }))
        .filter((g) => g.units.some((u) => u.kind !== "merchant"));
      const required = Math.min(
        towerSiegeRequirement(tower, []),
        ...groups.map((g) => towerSiegeRequirement(tower, g.units)),
      );
      return {
        siege,
        groups,
        required,
        remaining: Math.max(0, required - siege.progress),
        operated: siege.last === s.players[siege.owner].turns,
      };
    });
}

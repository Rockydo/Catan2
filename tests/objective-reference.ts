// Reference policy from before objective indexing. Keep the original scan and
// arithmetic order to detect tactical or floating-point changes independently.
import type { Game, Piece, Town } from "../src/game/types";
import {
  neighbors,
  distance,
  walkableAtVertex as landAtVertex,
} from "../src/game/world";
import { friendly, emergencyTarget } from "../src/game/relations";
import { maxValue } from "../src/game/aggregate";
import { collector } from "../src/game/maritime";
import {
  allPieces,
  combatantsAt,
  ownTowns,
  piecesAt,
  points,
  protects,
  siegeRequirement,
  speed,
  sumStock,
} from "../src/game/selectors";
import {
  leaderPressure,
  warTarget,
  threatPower,
  townThreats,
  townGuardPower,
} from "../src/game/ai-strategy";
export function referenceObjectiveWeight(
  s: Game,
  enemyTowns: Town[],
  allies: Town[],
  denialAt: (tile: string, group: Piece[]) => number,
  group: Piece[],
  target: string,
) {
  const naval = group[0].naval,
    origin = group[0].tile,
    ids = group.map((u) => u.id),
    emergency = emergencyTarget(s) !== undefined;
  const near = naval ? neighbors(target) : [target];
  let value = maxValue([
    1,
    Math.min(5, denialAt(target, group) * 2),
    ...enemyTowns
      .filter((t) => landAtVertex(s, t.vertex).some((id) => near.includes(id)))
      .map((t) => {
        const helpers = landAtVertex(s, t.vertex)
          .flatMap((id) => piecesAt(s, id, false))
          .filter(
            (u) =>
              u.owner !== s.active &&
              u.owner !== t.owner &&
              friendly(s, u.owner, s.active),
          );
        return (
          leaderPressure(s, t.owner) *
          (protects(s, t, naval)
            ? 0.2
            : (2.5 + Math.min(3, sumStock(t.stock) / 20)) /
              (1 + siegeRequirement(s, t, group) * 0.35)) *
          (1 + 0.8 / Math.max(1, ownTowns(s, t.owner).length)) *
          (1 + Math.min(2, new Set(helpers.map((u) => u.owner)).size) * 0.3)
        );
      }),
    ...Object.values(s.routes)
      .filter(
        (r) =>
          warTarget(s, r.owner) &&
          Object.keys(r.camps).some((id) => near.includes(id)),
      )
      .map((r) => leaderPressure(s, r.owner)),
    ...combatantsAt(s, target, naval)
      .filter((u) => warTarget(s, u.owner) && collector(u))
      .map(
        (u) =>
          (2 + u.tier + Math.max(0, u.tier - 2)) * leaderPressure(s, u.owner),
      ),
    ...allies
      .filter((t) => landAtVertex(s, t.vertex).includes(target))
      .map((t) => {
        const danger = threatPower(
          s,
          townThreats(s, t),
          landAtVertex(s, t.vertex),
        );
        return danger > townGuardPower(s, t) &&
          distance(origin, target) <= maxValue(group.map(speed)) * 2
          ? 3
          : 0;
      }),
  ]);
  if (emergency) {
    // Spread across productive fronts already occupied by allies. An
    // uncovered target keeps its full value; combat strength is not pooled.
    const front = new Set([...near, ...near.flatMap(neighbors)]);
    const committed = allPieces(s).filter(
      (u) =>
        u.naval === naval &&
        !u.carrier &&
        (near.includes(u.tile) ||
          (u.campaign?.enemy === emergencyTarget(s) &&
            front.has(u.campaign!.target))) &&
        friendly(s, u.owner, s.active) &&
        !ids.includes(u.id) &&
        points(u) > 0,
    );
    value /=
      1 +
      Math.min(
        3,
        committed.reduce((n, u) => n + points(u), 0) /
          Math.max(
            2,
            group.reduce((n, u) => n + points(u), 0),
          ),
      );
  }
  return value;
}

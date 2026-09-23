import type { Game, Piece, Town } from "./types";
import { distance, neighbors, walkableAtVertex } from "./world";
import { friendly, emergencyTarget } from "./relations";
import { collector } from "./maritime";
import { maxValue } from "./aggregate";
import {
  allPieces,
  combatantsAt,
  ownTowns,
  piecesAt,
  points,
  protects,
  siegePower,
  siegeRequirement,
  speed,
  sumStock,
} from "./selectors";
import {
  leaderPressure,
  warTarget,
  townThreats,
  threatPower,
  townGuardPower,
} from "./ai-strategy";

interface Deployment {
  tile: string;
  target?: string;
  power: number;
  naval: boolean;
}
interface Neighborhood {
  near: Set<string>;
  front: Set<string>;
  power: number;
}

/** One read-only military decision. Index local objectives once; no cache is
 * retained across commands, troop movement, seasonal changes or diplomacy. */
export function militaryObjectiveScorer(
  s: Game,
  enemyTowns: Town[],
  own: Town[],
  denialAt: (tile: string, group: Piece[]) => number,
) {
  const emergency = emergencyTarget(s);
  const townTiles = new Map<Town, string[]>();
  const tilesOf = (town: Town) => {
    if (!townTiles.has(town))
      townTiles.set(town, walkableAtVertex(s, town.vertex));
    return townTiles.get(town)!;
  };
  let enemies: Map<string, Town[]> | undefined,
    defenses: Map<string, Town[]> | undefined,
    enemyOrder: Map<Town, number> | undefined;
  const indexTowns = (towns: Town[]) => {
    const index = new Map<string, Town[]>();
    for (const town of towns)
      for (const tile of tilesOf(town)) {
        if (!index.has(tile)) index.set(tile, []);
        index.get(tile)!.push(town);
      }
    return index;
  };
  const targetTowns = [new Map<string, Town[]>(), new Map<string, Town[]>()];
  const townsNear = (target: string, naval: boolean) => {
    const cache = targetTowns[Number(naval)];
    if (!cache.has(target)) {
      if (!enemies) {
        enemies = indexTowns(enemyTowns);
        enemyOrder = new Map(enemyTowns.map((town, index) => [town, index]));
      }
      // Preserve the original town order, including ties in leader pressure.
      const found = new Set(
        (naval ? neighbors(target) : [target]).flatMap(
          (tile) => enemies!.get(tile) ?? [],
        ),
      );
      cache.set(
        target,
        [...found].sort((a, b) => enemyOrder!.get(a)! - enemyOrder!.get(b)!),
      );
    }
    return cache.get(target)!;
  };
  let camps: Map<string, number> | undefined;
  const campPressure = (target: string, naval: boolean) => {
    if (!camps) {
      camps = new Map();
      for (const route of Object.values(s.routes))
        if (warTarget(s, route.owner)) {
          const pressure = leaderPressure(s, route.owner);
          for (const tile of Object.keys(route.camps))
            camps.set(tile, Math.max(camps.get(tile) ?? 0, pressure));
        }
    }
    return maxValue([
      0,
      ...(naval ? neighbors(target) : [target]).map(
        (tile) => camps!.get(tile) ?? 0,
      ),
    ]);
  };
  const townDetails = new Map<
    Town,
    {
      pressure: number;
      loot: number;
      size: number;
      helpers: number;
      defense: number;
      guarded: Map<boolean, boolean>;
    }
  >();
  const detailsOf = (town: Town) => {
    if (!townDetails.has(town)) {
      const helpers = tilesOf(town)
        .flatMap((tile) => piecesAt(s, tile, false))
        .filter(
          (u) =>
            u.owner !== s.active &&
            u.owner !== town.owner &&
            friendly(s, u.owner, s.active),
        );
      townDetails.set(town, {
        pressure: leaderPressure(s, town.owner),
        loot: 2.5 + Math.min(3, sumStock(town.stock) / 20),
        size: 1 + 0.8 / Math.max(1, ownTowns(s, town.owner).length),
        helpers:
          1 + Math.min(2, new Set(helpers.map((u) => u.owner)).size) * 0.3,
        defense: siegeRequirement(s, town, []),
        guarded: new Map(),
      });
    }
    return townDetails.get(town)!;
  };
  const endangered = new Map<Town, boolean>();
  const dangerAt = (town: Town) => {
    if (!endangered.has(town))
      endangered.set(
        town,
        threatPower(s, townThreats(s, town), tilesOf(town)) >
          townGuardPower(s, town),
      );
    return endangered.get(town)!;
  };

  // Commitment uses integer unit points, not terrain combat power. Aggregate
  // identical positions/orders so a 10,000-unit stack costs one local lookup.
  const deployments = (units: readonly Piece[]) => {
    const grouped = new Map<string, Deployment>();
    for (const unit of units) {
      if (unit.carrier || !friendly(s, unit.owner, s.active)) continue;
      const power = points(unit);
      if (!(power > 0)) continue;
      const target =
        unit.campaign?.enemy === emergency ? unit.campaign?.target : undefined;
      const key = JSON.stringify([unit.naval, unit.tile, target]);
      const existing = grouped.get(key);
      if (existing) existing.power += power;
      else
        grouped.set(key, { naval: unit.naval, tile: unit.tile, target, power });
    }
    return [...grouped.values()];
  };
  let located: Map<string, Deployment[]>[] | undefined,
    assigned: Map<string, Deployment[]>[] | undefined;
  const fronts = [
    new Map<string, Neighborhood>(),
    new Map<string, Neighborhood>(),
  ];
  const frontAt = (target: string, naval: boolean) => {
    const domain = Number(naval),
      cache = fronts[domain];
    if (!cache.has(target)) {
      if (!located) {
        located = [new Map(), new Map()];
        assigned = [new Map(), new Map()];
        const add = (
          index: Map<string, Deployment[]>,
          key: string,
          group: Deployment,
        ) => {
          if (!index.has(key)) index.set(key, []);
          index.get(key)!.push(group);
        };
        for (const group of deployments(allPieces(s))) {
          add(located[Number(group.naval)], group.tile, group);
          if (group.target !== undefined)
            add(assigned[Number(group.naval)], group.target, group);
        }
      }
      const near = new Set(naval ? neighbors(target) : [target]);
      const front = new Set([...near, ...[...near].flatMap(neighbors)]);
      const groups = new Set<Deployment>();
      for (const tile of near)
        for (const group of located[domain].get(tile) ?? []) groups.add(group);
      for (const tile of front)
        for (const group of assigned![domain].get(tile) ?? [])
          groups.add(group);
      let power = 0;
      for (const group of groups) power += group.power;
      cache.set(target, { near, front, power });
    }
    return cache.get(target)!;
  };

  return (group: Piece[], weights: Map<string, number>) => {
    const naval = group[0].naval,
      origin = group[0].tile;
    // Compute formation-only values lazily: an unreachable group has no score.
    let siege: number | undefined,
      movement: number | undefined,
      moving: Deployment[] | undefined,
      groupPoints: number | undefined;
    return (target: string): number => {
      if (weights.has(target)) return weights.get(target)!;
      let value = Math.max(1, Math.min(5, denialAt(target, group) * 2));
      for (const town of townsNear(target, naval)) {
        const data = detailsOf(town);
        if (!data.guarded.has(naval))
          data.guarded.set(naval, protects(s, town, naval));
        const requirement = data.guarded.get(naval)
          ? 0
          : Math.max(0, data.defense - (siege ??= siegePower(group)));
        value = Math.max(
          value,
          data.pressure *
            (data.guarded.get(naval)
              ? 0.2
              : data.loot / (1 + requirement * 0.35)) *
            data.size *
            data.helpers,
        );
      }
      value = Math.max(value, campPressure(target, naval));
      for (const unit of combatantsAt(s, target, naval))
        if (warTarget(s, unit.owner) && collector(unit))
          value = Math.max(
            value,
            (2 + unit.tier + Math.max(0, unit.tier - 2)) *
              leaderPressure(s, unit.owner),
          );
      defenses ??= indexTowns(own);
      for (const town of defenses.get(target) ?? [])
        if (
          dangerAt(town) &&
          distance(origin, target) <=
            (movement ??= maxValue(group.map(speed))) * 2
        )
          value = Math.max(value, 3);
      if (emergency !== undefined) {
        const front = frontAt(target, naval);
        let committed = front.power;
        for (const part of (moving ??= deployments(group)))
          if (
            part.naval === naval &&
            (front.near.has(part.tile) ||
              (part.target !== undefined && front.front.has(part.target)))
          )
            committed -= part.power;
        groupPoints ??= group.reduce((n, unit) => n + points(unit), 0);
        value /= 1 + Math.min(3, committed / Math.max(2, groupPoints));
      }
      weights.set(target, value);
      return value;
    };
  };
}

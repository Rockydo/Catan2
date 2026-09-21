import type { Command, Game, Piece, ShipClass } from "./types";
import { shipStats } from "./content";
import { emergencyTarget } from "./relations";
import { leavesTownExposed, threatPower } from "./ai-strategy";
import { canOccupy, neighbors, distance, walkableAtVertex } from "./world";
import {
  ownPieces,
  points,
  power,
  speed,
  fresh,
  ready,
  hostileAt,
  piecesAt,
  moveTargets,
} from "./selectors";
import { planningPath, planningDistance } from "./ai-paths";
import { seasonalDestinationSafe } from "./ai-seasonal";

interface Front {
  distance: number;
  target: string;
}
interface Coast {
  land: string;
  sea: string;
  front: Front;
}
interface Theater {
  fronts: Map<string, Front>;
  coasts: Coast[];
  shores: { land: string; sea: string }[];
  armies: Map<string, Piece[]>;
  fleets: Map<string, Piece[]>;
}
export interface Passage {
  army: string;
  pickup: string;
  embark: string;
  landing: string;
  sea: string;
  target: string;
  turns: number;
  saving: number;
  units: number;
}
const theaters = new WeakMap<Game, Theater>();

/** Public, reverse land distances. Enemy-occupied hexes may be objectives but
 * never corridors. A connected continent can still need sea transport. */
function theater(s: Game): Theater {
  const cached = theaters.get(s);
  if (cached) return cached;
  const enemy = emergencyTarget(s, s.active);
  const armies = new Map<string, Piece[]>(),
    fleets = new Map<string, Piece[]>();
  for (const u of ownPieces(s)) {
    if (u.carrier || points(u) === 0 || u.seasonStatus) continue;
    const groups = u.naval ? fleets : armies;
    groups.set(u.tile, [...(groups.get(u.tile) ?? []), u]);
  }
  const fieldForces = [
    ...armies.values(),
    ...[...fleets.values()].map((ships) => {
      const ids = new Set(ships.map((u) => u.id));
      return ownPieces(s).filter((u) => u.carrier && ids.has(u.carrier));
    }),
  ].filter((g) => g.length);
  const enemyTowns = Object.values(s.towns).filter((t) => t.owner === enemy);
  const vulnerable = enemyTowns.filter((t) => {
    const land = walkableAtVertex(s, t.vertex);
    const guards = land
      .flatMap((id) => piecesAt(s, id, false))
      .filter((u) => u.owner === enemy);
    return (
      !guards.length ||
      land.some((id) =>
        fieldForces.some((g) => power(s, g, id) > threatPower(s, guards, [id])),
      )
    );
  });
  const fronts = new Map<string, Front>();
  const queue: string[] = [];
  for (const town of vulnerable.length ? vulnerable : enemyTowns) {
    for (const id of walkableAtVertex(s, town.vertex)) {
      if (fronts.has(id)) continue;
      fronts.set(id, { distance: 0, target: id });
      queue.push(id);
    }
  }
  for (let i = 0; i < queue.length; i++) {
    const at = queue[i],
      front = fronts.get(at)!;
    for (const id of neighbors(at)) {
      if (
        fronts.has(id) ||
        !canOccupy(s.tiles[id]) ||
        hostileAt(s, id, s.active)
      )
        continue;
      fronts.set(id, { distance: front.distance + 1, target: front.target });
      queue.push(id);
    }
  }
  const coasts: Coast[] = [],
    shores: { land: string; sea: string }[] = [];
  for (const tile of Object.values(s.tiles)) {
    if (!canOccupy(tile) || hostileAt(s, tile.id, s.active)) continue;
    const front = fronts.get(tile.id);
    for (const sea of neighbors(tile.id))
      if (canOccupy(s.tiles[sea], true) && !hostileAt(s, sea, s.active, true)) {
        shores.push({ land: tile.id, sea });
        if (front) coasts.push({ land: tile.id, sea, front });
      }
  }
  const result = { fronts, coasts, shores, armies, fleets };
  theaters.set(s, result);
  return result;
}

function landingSafe(s: Game, land: string, passengers: Piece[]): boolean {
  if (hostileAt(s, land, s.active) || !seasonalDestinationSafe(s, land, false))
    return false;
  const guards = piecesAt(s, land, false).filter((u) => u.owner === s.active);
  const danger = Object.values(s.pieces).filter(
    (u) =>
      !u.naval &&
      !u.carrier &&
      u.owner === emergencyTarget(s, s.active) &&
      points(u) > 0 &&
      distance(u.tile, land) <= speed(u) &&
      planningPath(s, u.tile, land, false, u.owner, speed(u)) !== null,
  );
  return (
    threatPower(s, danger, [land]) <= power(s, [...passengers, ...guards], land)
  );
}

const passages = new WeakMap<Game, Map<string, Passage | null>>();
/** Compare complete journey times, including pickup, loading and unloading.
 * A substantial shortcut qualifies even when the two shores share a landmass. */
export function campaignPassage(
  s: Game,
  army: string,
  fleet: string,
  sailing = 3,
  berths = 2,
): Passage | null {
  if (emergencyTarget(s, s.active) === undefined) return null;
  let cache = passages.get(s);
  if (!cache) {
    cache = new Map();
    passages.set(s, cache);
  }
  const key = `${army}/${fleet}/${sailing}/${berths}`;
  if (cache.has(key)) return cache.get(key)!;
  const { fronts, coasts, shores, armies } = theater(s);
  const force = armies.get(army) ?? [];
  const passengers = [...force]
    .sort((a, b) => b.tier - a.tier)
    .slice(0, berths);
  if (!force.length || !passengers.length || !canOccupy(s.tiles[fleet], true))
    return null;
  const pace = Math.min(...force.map(speed));
  const direct = (fronts.get(army)?.distance ?? Infinity) / pace;
  if (direct < 5) {
    cache.set(key, null);
    return null;
  }
  // Also consider pickup shores outside the enemy's current land component.
  const pickups = shores
    .map((c) => ({
      ...c,
      walk: planningDistance(s, army, c.land, false, s.active),
      sail: planningDistance(s, fleet, c.sea, true, s.active),
    }))
    .filter((c) => Number.isFinite(c.walk) && Number.isFinite(c.sail))
    .map((c) => ({
      ...c,
      wait: Math.max(Math.ceil(c.walk / pace), Math.ceil(c.sail / sailing)),
    }))
    .sort((a, b) => a.wait - b.wait || a.walk - b.walk)
    .slice(0, 12);
  let best: Passage | null = null;
  const safeLandings = new Map<string, boolean>();
  for (const pickup of pickups) {
    const landings = coasts
      .filter(
        (c) =>
          c.land !== pickup.land &&
          c.front.distance / pace + pickup.wait + 2 < direct,
      )
      .map((c) => ({
        ...c,
        distance: planningDistance(s, pickup.sea, c.sea, true, s.active),
      }))
      .filter((c) => Number.isFinite(c.distance))
      .map((c) => ({
        ...c,
        turns:
          pickup.wait +
          2 +
          Math.ceil(c.distance / sailing) +
          Math.ceil(c.front.distance / pace),
      }))
      .filter((c) => c.turns + 2 <= direct && c.turns <= direct * 0.8)
      .sort((a, b) => a.turns - b.turns || a.front.distance - b.front.distance);
    for (const landing of landings) {
      if (best && landing.turns >= best.turns) break;
      if (!safeLandings.has(landing.land))
        safeLandings.set(
          landing.land,
          landingSafe(s, landing.land, passengers),
        );
      if (!safeLandings.get(landing.land)) continue;
      best = {
        army,
        pickup: pickup.land,
        embark: pickup.sea,
        landing: landing.land,
        sea: landing.sea,
        target: landing.front.target,
        turns: landing.turns,
        saving: Number.isFinite(direct) ? direct - landing.turns : 20,
        units: force.length,
      };
      break;
    }
  }
  cache.set(key, best);
  return best;
}

/** Shipbuilding can fund a useful crossing before there is a hull to assign. */
export function campaignTransportDemand(s: Game, sea: string): number {
  if (emergencyTarget(s, s.active) === undefined) return 0;
  return [...theater(s).armies].reduce(
    (sum, [army, units]) =>
      sum + (campaignPassage(s, army, sea) ? units.length : 0),
    0,
  );
}

function march(s: Game, units: Piece[], target: string): Command | null {
  const mobile = units
    .filter((u) => ready(s, u) && speed(u) + u.bonus - u.moved >= 1)
    .sort((a, b) => speed(b) - speed(a) || points(b) - points(a));
  // Send the surplus toward the pickup without abandoning an immediate threat.
  while (mobile.length && leavesTownExposed(s, mobile, target)) mobile.pop();
  if (!mobile.length || mobile[0].tile === target) return null;
  const path = planningPath(
    s,
    mobile[0].tile,
    target,
    mobile[0].naval,
    s.active,
  );
  if (!path) return null;
  const targets = moveTargets(
    s,
    mobile.map((u) => u.id),
  );
  const to = [...path]
    .reverse()
    .find(
      (id) =>
        targets[id] &&
        !hostileAt(s, id, s.active, mobile[0].naval) &&
        seasonalDestinationSafe(s, id, mobile[0].naval) &&
        !leavesTownExposed(s, mobile, id),
    );
  return to
    ? {
        type: "move",
        ids: mobile.map((u) => u.id),
        to,
        mode: "campaign",
        target,
      }
    : null;
}

/** Shared pickup orders and repeated crossings mobilize rear armies. Landings
 * may establish a safe bridgehead before enough troops arrive to win a battle. */
export function campaignTransportAction(s: Game): Command | null {
  if (emergencyTarget(s, s.active) === undefined) return null;
  const { armies, fleets, coasts } = theater(s);
  const empty: {
    tile: string;
    ships: Piece[];
    capacity: number;
    sailing: number;
  }[] = [];
  for (const [tile, ships] of fleets) {
    const carriers = ships.filter(
      (u) => shipStats(u.kind as ShipClass, u.tier).capacity > 0,
    );
    if (!carriers.length) continue;
    const ids = new Set(ships.map((u) => u.id));
    const passengers = ownPieces(s).filter(
      (u) => u.carrier && ids.has(u.carrier),
    );
    const sailing = Math.min(...ships.map(speed));
    if (!passengers.length) {
      empty.push({
        tile,
        ships,
        capacity: carriers.reduce(
          (n, u) => n + shipStats(u.kind as ShipClass, u.tier).capacity,
          0,
        ),
        sailing,
      });
      continue;
    }
    if (!passengers.some((u) => points(u) > 0)) continue;
    const pace = Math.min(...passengers.map(speed));
    const landing = coasts
      .map((c) => ({
        ...c,
        distance: planningDistance(s, tile, c.sea, true, s.active),
      }))
      .filter((c) => Number.isFinite(c.distance))
      .sort(
        (a, b) =>
          a.distance / sailing +
          a.front.distance / pace -
          (b.distance / sailing + b.front.distance / pace),
      )
      .find((c) => landingSafe(s, c.land, passengers));
    if (!landing) continue;
    if (landing.sea === tile) {
      const freshShips = ships.filter((u) => fresh(s, u));
      const available = passengers.filter(
        (u) =>
          !u.acted &&
          !u.moved &&
          u.born < s.players[s.active].turns &&
          freshShips.some((v) => v.id === u.carrier),
      );
      if (available.length && landingSafe(s, landing.land, available))
        return {
          type: "unload",
          ships: freshShips.map((u) => u.id),
          ids: available.map((u) => u.id),
          to: landing.land,
        };
      const waiting = ships.filter((u) => ready(s, u));
      if (waiting.length)
        return { type: "hold", ids: waiting.map((u) => u.id) };
    } else {
      const action = march(s, ships, landing.sea);
      if (action) return action;
    }
  }
  const assignments = empty
    .flatMap((fleet) =>
      [...armies.keys()].flatMap((army) => {
        const plan = campaignPassage(
          s,
          army,
          fleet.tile,
          fleet.sailing,
          fleet.capacity,
        );
        return plan ? [{ fleet, plan }] : [];
      }),
    )
    .sort(
      (a, b) =>
        b.plan.saving - a.plan.saving ||
        a.plan.turns - b.plan.turns ||
        b.plan.units - a.plan.units,
    );
  const usedFleets = new Set<string>(),
    usedArmies = new Set<string>();
  for (const { fleet, plan } of assignments) {
    if (usedFleets.has(fleet.tile) || usedArmies.has(plan.army)) continue;
    usedFleets.add(fleet.tile);
    usedArmies.add(plan.army);
    const army = armies.get(plan.army)!;
    if (fleet.tile === plan.embark && plan.army === plan.pickup) {
      const ships = fleet.ships.filter((u) => fresh(s, u));
      const capacity = ships.reduce(
        (n, u) => n + shipStats(u.kind as ShipClass, u.tier).capacity,
        0,
      );
      const boarding: Piece[] = [];
      for (const u of [...army]
        .filter((u) => fresh(s, u))
        .sort((a, b) => b.tier - a.tier))
        if (
          boarding.length < capacity &&
          !leavesTownExposed(s, [...boarding, u])
        )
          boarding.push(u);
      if (boarding.length)
        return {
          type: "load",
          ids: boarding.map((u) => u.id),
          ships: ships.map((u) => u.id),
        };
    }
    const armyAction = march(s, army, plan.pickup);
    if (armyAction) return armyAction;
    const fleetAction = march(s, fleet.ships, plan.embark);
    if (fleetAction) return fleetAction;
    // Wait for next-turn embarkation instead of sending the transport elsewhere.
    if (fleet.tile === plan.embark && plan.army === plan.pickup) {
      const waiting = fleet.ships.filter((u) => ready(s, u));
      if (waiting.length)
        return { type: "hold", ids: waiting.map((u) => u.id) };
    }
  }
  return null;
}

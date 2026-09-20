import type { Command, Game, Good, Piece, ShipClass, Stock } from "./types";
import { shipStats } from "./content";
import { canApplyCommand } from "./engine";
import {
  SEASONS,
  iceRisk,
  seasonAt,
  seasonalProfile,
  type Season,
} from "./seasons";
import { canOccupy, neighbors } from "./world";
import { friendly } from "./relations";
import {
  income,
  fresh,
  moveTargets,
  ownPieces,
  piecesAt,
  probability,
  productionSources,
  ready,
  speed,
} from "./selectors";

type Outputs = Record<number, Stock>;
type SeasonalCache = Map<string, Outputs>;
let planningCache: WeakMap<Game, SeasonalCache> | undefined;
let planningSources: { source: Game; outputs: SeasonalCache }[] | undefined;
let berthCache: WeakMap<Game["pieces"], Map<string, number>> | undefined;
let rescueCache: WeakMap<Game["pieces"], Map<number, Set<string>>> | undefined;

/** Cache only within one immutable AI decision, never across mutable saves. */
export function withSeasonalPlanning<T>(run: () => T): T {
  const previous = planningCache;
  const previousSources = planningSources;
  const previousBerths = berthCache,
    previousRescues = rescueCache;
  planningCache = new WeakMap();
  planningSources = [];
  berthCache = new WeakMap();
  rescueCache = new WeakMap();
  try {
    return run();
  } finally {
    planningCache = previous;
    planningSources = previousSources;
    berthCache = previousBerths;
    rescueCache = previousRescues;
  }
}

function outputsIn(s: Game, season: Season, round?: number): Outputs {
  let cache = planningCache?.get(s);
  if (!cache) {
    // Counterparty trade planning changes active/phase only. Share the same
    // four-season production scan across those views of the public board.
    cache = planningSources?.find(
      ({ source: v }) =>
        v.tiles === s.tiles &&
        v.vertices === s.vertices &&
        v.towns === s.towns &&
        v.routes === s.routes &&
        v.pieces === s.pieces &&
        v.alliances === s.alliances &&
        v.players === s.players &&
        v.calendar === s.calendar,
    )?.outputs;
    if (!cache) {
      cache = new Map();
      planningSources?.push({ source: s, outputs: cache });
    }
    planningCache?.set(s, cache);
  }
  const key = `${season}/${round ?? "calendar"}`;
  const found = cache.get(key);
  if (found) return found;
  const result: Outputs = Object.fromEntries(s.players.map((p) => [p.id, {}]));
  const forecastWeather =
    s.calendar?.iceModel === 2 && round !== undefined && round > s.round;
  const view: Game = forecastWeather
    ? Object.assign(Object.create(s), {
        round: round!,
        tiles: Object.fromEntries(
          Object.entries(s.tiles).map(([id, tile]) => [
            id,
            ["water", "ice"].includes(tile.resource)
              ? {
                  ...tile,
                  surface: "open" as const,
                  iceWeather: { round: round!, season, half: "early" as const },
                }
              : tile,
          ]),
        ),
      })
    : s;
  for (const source of productionSources(
    view,
    round === s.round ? "current" : season,
  )) {
    const stock = result[source.owner];
    stock[source.good] =
      (stock[source.good] ?? 0) +
      source.amount *
        probability(s.tiles[source.tile].number) *
        (forecastWeather &&
        ["water", "ice"].includes(s.tiles[source.tile].resource)
          ? 1 - iceRisk(s, s.tiles[source.tile], round)
          : 1);
  }
  cache.set(key, result);
  return result;
}

/** Expected total over future public rolls, holding visible producers/blockades
 * fixed. Includes this faction's roll only if it has not rolled yet. */
export function projectedIncomes(s: Game, rolls = 6): Outputs {
  const result: Outputs = Object.fromEntries(s.players.map((p) => [p.id, {}]));
  const count = Math.max(0, Math.floor(rolls));
  if (!count || !s.players.some((p) => p.alive)) return result;
  if (!s.calendar) {
    for (const player of s.players)
      for (const [good, amount] of Object.entries(income(s, player.id)))
        result[player.id][good as Good] = amount! * count;
    return result;
  }
  let active = s.active,
    round = s.round;
  const advance = () => {
    const old = active;
    do {
      active = (active + 1) % s.players.length;
    } while (!s.players[active].alive);
    if (active <= old) round++;
  };
  if (s.phase !== "roll") advance();
  const seasonalRolls = new Map<number, number>();
  for (let i = 0; i < count; i++) {
    seasonalRolls.set(round, (seasonalRolls.get(round) ?? 0) + 1);
    advance();
  }
  for (const [round, n] of seasonalRolls) {
    const season = seasonAt({ calendar: s.calendar, round });
    const forecast = season
      ? outputsIn(s, season, round)
      : Object.fromEntries(s.players.map((p) => [p.id, income(s, p.id)]));
    for (const player of s.players)
      for (const [good, amount] of Object.entries(forecast[player.id]))
        result[player.id][good as Good] =
          (result[player.id][good as Good] ?? 0) + amount! * n;
  }
  return result;
}

export function projectedIncome(s: Game, player = s.active, rolls = 6): Stock {
  return projectedIncomes(s, rolls)[player];
}

const food = (stock: Stock) =>
  (stock.grain ?? 0) + (stock.fish ?? 0) + (stock.meat ?? 0);

/** A modest location bonus for food harvested in an existing seasonal gap.
 * Annual output remains the main site score; this is at most a 16% tie-breaker. */
export function seasonalDiversityBonus(
  s: Game,
  tiles: string[],
  owner = s.active,
): number {
  if (!s.calendar) return 0;
  const existing = SEASONS.map((season) => food(outputsIn(s, season)[owner]));
  const mean = existing.reduce((n, amount) => n + amount, 0) / 4;
  if (mean <= 0) return 0;
  const candidate = SEASONS.map((season) =>
    tiles.reduce(
      (n, id) =>
        n +
        probability(s.tiles[id].number) *
          food(seasonalProfile(s.tiles[id], owner)[season]),
      0,
    ),
  );
  const total = candidate.reduce((n, amount) => n + amount, 0);
  if (!total) return 0;
  return (
    (0.16 *
      candidate.reduce(
        (n, amount, i) => n + amount * Math.max(0, 1 - existing[i] / mean),
        0,
      )) /
    total
  );
}

function safeAfter(s: Game, tile: Game["tiles"][string], naval: boolean) {
  if (!tile) return false;
  if (!["water", "ice"].includes(tile.resource))
    return !naval && canOccupy(tile, false);
  const frozen = iceRisk(s, tile);
  return naval ? frozen < 0.15 : frozen > 0.85;
}

export function seasonalDestinationSafe(
  s: Game,
  tileId: string,
  naval: boolean,
): boolean {
  const tile = s.tiles[tileId];
  if (!tile) return false;
  if (!s.calendar || !seasonAt({ calendar: s.calendar, round: s.round + 1 }))
    return true;
  return safeAfter(s, tile, naval);
}

function freeBerths(s: Game, ship: Piece): number {
  if (!ship.naval) return 0;
  const capacity = shipStats(ship.kind as ShipClass, ship.tier).capacity;
  if (!capacity) return 0;
  let used = berthCache?.get(s.pieces);
  if (!used) {
    used = new Map();
    for (const unit of Object.values(s.pieces))
      if (unit.carrier)
        used.set(unit.carrier, (used.get(unit.carrier) ?? 0) + 1);
    berthCache?.set(s.pieces, used);
  }
  return capacity - (used.get(ship.id) ?? 0);
}

/** A carrier that has just reached stranded troops waits for legal boarding
 * next turn instead of being sent away by the ordinary offensive planner. */
export function seasonalRescueWaiting(s: Game, ship: Piece): boolean {
  if (!s.calendar || freeBerths(s, ship) <= 0) return false;
  let owners = rescueCache?.get(s.pieces);
  if (!owners) {
    owners = new Map();
    for (const unit of Object.values(s.pieces)) {
      if (unit.seasonStatus !== "adrift" || unit.carrier) continue;
      let tiles = owners.get(unit.owner);
      if (!tiles) {
        tiles = new Set();
        owners.set(unit.owner, tiles);
      }
      for (const tile of [unit.tile, ...neighbors(unit.tile)]) tiles.add(tile);
    }
    rescueCache?.set(s.pieces, owners);
  }
  return owners.get(ship.owner)?.has(ship.tile) ?? false;
}

function rescueStranded(s: Game): Command | undefined {
  const stranded = ownPieces(s).filter(
    (u) => u.seasonStatus === "adrift" && !u.carrier,
  );
  if (!stranded.length) return undefined;
  const ships = ownPieces(s).filter(
    (u) => u.naval && ready(s, u) && freeBerths(s, u) > 0,
  );
  for (const unit of stranded) {
    const pickup = new Set([unit.tile, ...neighbors(unit.tile)]);
    const adjacent = ships.filter((u) => fresh(s, u) && pickup.has(u.tile));
    for (const tile of new Set(adjacent.map((u) => u.tile))) {
      const fleet = adjacent.filter((u) => u.tile === tile),
        berths = fleet.reduce((n, u) => n + freeBerths(s, u), 0);
      const ids = stranded
        .filter((u) => u.tile === unit.tile && fresh(s, u))
        .slice(0, berths)
        .map((u) => u.id);
      if (!ids.length) continue;
      const action: Command = {
        type: "load",
        ids,
        ships: fleet.map((u) => u.id),
      };
      if (canApplyCommand(s, action)) return action;
    }
    for (const ship of ships) {
      if (pickup.has(ship.tile) || seasonalRescueWaiting(s, ship)) continue;
      const legal = moveTargets(s, [ship.id]);
      if (!Object.keys(legal).length) continue;
      const paths = new Map<string, string[]>([[ship.tile, []]]),
        queue = [ship.tile];
      for (let i = 0; i < queue.length; i++) {
        const at = queue[i],
          path = paths.get(at)!;
        if (pickup.has(at) && seasonalDestinationSafe(s, at, true)) {
          for (let step = path.length - 1; step >= 0; step--)
            if (
              legal[path[step]] &&
              seasonalDestinationSafe(s, path[step], true)
            )
              return { type: "move", ids: [ship.id], to: path[step] };
          break;
        }
        for (const to of neighbors(at)) {
          if (
            paths.has(to) ||
            !canOccupy(s.tiles[to], true) ||
            piecesAt(s, to).some((u) => !friendly(s, u.owner, s.active))
          )
            continue;
          paths.set(to, [...path, to]);
          queue.push(to);
        }
      }
    }
  }
  return undefined;
}

/** Use ordinary legal movement to leave ice before thaw, or sea before freeze.
 * A destination must stay usable next season, so repeat decisions cannot flee
 * back and forth. Frozen ships wait for thaw; there is no free relocation. */
export function seasonalEvacuation(s: Game): Command | undefined {
  if (!s.calendar) return undefined;
  const next = seasonAt({ calendar: s.calendar, round: s.round + 1 });
  if (!next) return undefined;
  const groups = new Map<string, Piece[]>();
  for (const unit of ownPieces(s)) {
    if (!ready(s, unit) || speed(unit) + unit.bonus - unit.moved < 1) continue;
    const tile = s.tiles[unit.tile];
    const risk = iceRisk(s, tile);
    const danger = unit.naval
      ? risk >= 0.25
      : (tile.resource === "ice" || tile.resource === "water") && risk <= 0.75;
    if (!danger && unit.seasonStatus !== "adrift") continue;
    const key = `${unit.naval}/${unit.tile}`;
    groups.set(key, [...(groups.get(key) ?? []), unit]);
  }
  for (const group of groups.values()) {
    const first = group[0],
      ids = group.map((u) => u.id);
    const legal = moveTargets(s, ids);
    if (!Object.keys(legal).length) continue;
    const paths = new Map<string, string[]>([[first.tile, []]]),
      queue = [first.tile];
    let best: string[] | undefined;
    for (let i = 0; i < queue.length; i++) {
      const at = queue[i],
        path = paths.get(at)!;
      if (path.length && safeAfter(s, s.tiles[at], first.naval)) {
        best = path;
        break;
      }
      for (const to of neighbors(at)) {
        if (
          paths.has(to) ||
          !canOccupy(s.tiles[to], first.naval) ||
          piecesAt(s, to).some((u) => !friendly(s, u.owner, first.owner))
        )
          continue;
        paths.set(to, [...path, to]);
        queue.push(to);
      }
    }
    if (!best) continue;
    // Reach the first stable shore/water if possible, otherwise spend the full
    // available movement progressing along the same shortest escape route.
    for (let i = best.length - 1; i >= 0; i--)
      if (legal[best[i]]) return { type: "move", ids, to: best[i] };
  }
  return rescueStranded(s);
}

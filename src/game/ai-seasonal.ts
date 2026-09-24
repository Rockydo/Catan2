import { weatherAdjustedYield } from "./weather-yields";
import { processedFor } from "./content";
import type { Raw } from "./types";
import { environmentRisk, weatherChoices } from "./environment";
import { pieceAccess } from "./geography";
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
  allPieces,
  income,
  planningValue,
  fresh,
  moveTargets,
  ownPieces,
  piecesAt,
  probability,
  forecastProduction,
  productionSignature,
  ready,
  speed,
} from "./selectors";

type Outputs = Record<number, Stock>;
type SeasonalCache = Map<string, Outputs>;
let lastProductionSignature: string | undefined;
let lastProductionOutputs: SeasonalCache = new Map();
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
      const signature = productionSignature(s);
      if (signature !== lastProductionSignature) {
        lastProductionSignature = signature;
        lastProductionOutputs = new Map();
      }
      cache = lastProductionOutputs;
      planningSources?.push({ source: s, outputs: cache });
    }
    planningCache?.set(s, cache);
  }
  const key = `${season}/${round ?? "calendar"}`;
  const found = cache.get(key);
  if (found) return found;
  const forecastWeather =
    s.calendar?.iceModel === 2 && round !== undefined && round > s.round;
  const futureSeason =
    round === undefined
      ? season !== seasonAt(s)
      : round > s.round && season !== seasonAt(s);
  const view: Game =
    forecastWeather || futureSeason
      ? Object.assign(Object.create(s), {
          ...(round !== undefined ? { round } : {}),
          tiles: Object.fromEntries(
            Object.entries(s.tiles).map(([id, tile]) => [
              id,
              {
                ...tile,
                ...(forecastWeather && ["water", "ice"].includes(tile.resource)
                  ? {
                      surface: "open" as const,
                      iceWeather: {
                        round: round!,
                        season,
                        half: "early" as const,
                      },
                    }
                  : {}),
                ...(tile.geography
                  ? {
                      geography: {
                        ...tile.geography,
                        ...(futureSeason
                          ? {
                              access: "normal" as const,
                              weather: "normal" as const,
                            }
                          : {}),
                        ...(tile.geography.damagedUntil &&
                        round !== undefined &&
                        round >= tile.geography.damagedUntil
                          ? { damagedUntil: undefined }
                          : {}),
                      },
                    }
                  : {}),
              },
            ]),
          ),
        })
      : s;
  // Weather depends on a tile and forecast round, not the number of producers.
  const weather = new Map<string, number>();
  const harvestFactors = new Map<string, Stock>();
  function expectedFactor(id: string, good: Good): number {
    if (!futureSeason || !s.tiles[id].geography) return 1;
    let factors = harvestFactors.get(id);
    if (!factors) {
      const tile = s.tiles[id],
        base = seasonalProfile(tile)[season];
      const ordinary: Stock = {},
        expected: Stock = {};
      const include = (stock: Stock, target: Stock, weight: number) => {
        for (const [key, value] of Object.entries(stock)) {
          const raw = key as Raw,
            processed = processedFor(raw);
          target[raw] = (target[raw] ?? 0) + value! * weight;
          if (processed)
            target[processed] = (target[processed] ?? 0) + value! * weight;
        }
      };
      include(base, ordinary, 1);
      for (const [weather, chance] of weatherChoices(
        tile.climate ?? "temperate",
        season,
      ))
        include(
          weatherAdjustedYield(
            {
              ...tile,
              geography: { ...tile.geography!, weather, weatherSeason: season },
            },
            base,
            season,
          ),
          expected,
          chance,
        );
      factors = {};
      for (const key of Object.keys(ordinary) as Good[])
        factors[key] = ordinary[key]
          ? (expected[key] ?? 0) / ordinary[key]!
          : 1;
      harvestFactors.set(id, factors);
    }
    return factors[good] ?? 1;
  }
  const result = forecastProduction(
    view,
    round === s.round ? "current" : season,
    (tile, amount, good) => {
      let factor = weather.get(tile);
      if (factor === undefined) {
        const terrain = s.tiles[tile];
        factor =
          forecastWeather && ["water", "ice"].includes(terrain.resource)
            ? 1 - iceRisk(s, terrain, round)
            : 1;
        if (
          futureSeason &&
          terrain.geography?.floodplain &&
          !terrain.geography.projects?.levee
        )
          factor *= 1 - environmentRisk(terrain, season);
        weather.set(tile, factor);
      }
      return (
        amount *
        probability(s.tiles[tile].number) *
        factor *
        expectedFactor(tile, good)
      );
    },
  );
  if (cache.size >= 32) cache.delete(cache.keys().next().value!);
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
  const existing = planningValue(s, `seasonalFood/${owner}`, () =>
    SEASONS.map((season) => food(outputsIn(s, season)[owner])),
  );
  const mean = existing.reduce((n, amount) => n + amount, 0) / 4;
  if (mean <= 0) return 0;
  const profiles = tiles.map((id) =>
    planningValue(s, `foodProfile/${owner}/${id}`, () =>
      seasonalProfile(s.tiles[id], owner),
    ),
  );
  const candidate = SEASONS.map((season) =>
    tiles.reduce(
      (n, id, i) =>
        n + probability(s.tiles[id].number) * food(profiles[i][season]),
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

function nextAccessRisk(
  s: Game,
  tile: Game["tiles"][string],
  season: Season,
): number {
  if (season !== seasonAt(s)) return environmentRisk(tile, season);
  const g = tile.geography;
  if (!g) return 0;
  return Number(
    g.access === "closed" ||
      g.access === "flooded" ||
      (!!g.ford && !g.projects?.bridge && g.access !== "ford"),
  );
}
function safeAfter(s: Game, tile: Game["tiles"][string], naval: boolean) {
  if (!tile) return false;
  const next = seasonAt({ calendar: s.calendar, round: s.round + 1 });
  if (!naval && next && nextAccessRisk(s, tile, next) >= 0.25) return false;
  if (tile.geography?.projects?.bridge)
    return !naval || iceRisk(s, tile) < 0.15;
  if (
    !naval &&
    tile.geography?.access === "ford" &&
    next &&
    nextAccessRisk(s, tile, next) < 0.25
  )
    return true;
  if (naval && tile.geography?.access === "flooded" && next)
    return nextAccessRisk(s, tile, next) > 0.85;
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
    for (const unit of allPieces(s))
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
    for (const unit of allPieces(s)) {
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
            !pieceAccess(s.tiles[to], ship, s.tiles) ||
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
      ? risk >= 0.25 ||
        (tile.geography?.access === "flooded" &&
          nextAccessRisk(s, tile, next) < 0.85)
      : nextAccessRisk(s, tile, next) >= 0.25 ||
        ((tile.resource === "ice" || tile.resource === "water") &&
          !tile.geography?.projects?.bridge &&
          !(
            tile.geography?.access === "ford" &&
            nextAccessRisk(s, tile, next) < 0.25
          ) &&
          risk <= 0.75);
    if (!danger && unit.seasonStatus !== "adrift") continue;
    const key = `${unit.naval}/${unit.tile}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(unit);
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
          !pieceAccess(s.tiles[to], first, s.tiles) ||
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

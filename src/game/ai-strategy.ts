import { maxValue } from "./aggregate";
import { friendly, allianceOf, emergencyTarget } from "./relations";
import { townGuilds } from "./guilds";
import type { Game, Piece, Town } from "./types";
import {
  allPieces,
  points,
  ownTowns,
  ownPieces,
  piecesAt,
  income,
  power,
  planningValue,
  piecePlanningValue,
  speed,
} from "./selectors";
import { walkableAtVertex as landAtVertex, distance } from "./world";
import { planningDistance } from "./ai-paths";

export interface FactionStrength {
  towns: number;
  forces: number;
  production: number;
  total: number;
}
const strengthDetailsCache = new WeakMap<Game, FactionStrength[]>();
const strengthsCache = new WeakMap<Game, number[]>();
function troopStrengths(s: Game): readonly number[] {
  return piecePlanningValue(s, "faction-force-strength", (units) => {
    const forces: number[] = [];
    for (const u of units)
      forces[u.owner] =
        (forces[u.owner] ?? 0) +
        (points(u) * 2 +
          (u.kind === "merchant" ||
          u.kind === "merchantship" ||
          u.kind === "fishing"
            ? u.tier * 3
            : 0));
    return forces;
  });
}
/** Public board only: no rival stockpiles, research faces, decks, RNG or unexplored tiles. */
export function factionStrengthDetails(s: Game): FactionStrength[] {
  const cached = strengthDetailsCache.get(s);
  if (cached) return cached;
  const troopScores = troopStrengths(s);
  const details = s.players.map((p) => {
    if (!p.alive) return { towns: 0, forces: 0, production: 0, total: 0 };
    const towns = ownTowns(s, p.id).reduce(
      (n, t) =>
        n +
        8 +
        t.level * 4 +
        t.wall +
        townGuilds(t).reduce((sum, g) => sum + g.tier * 6, 0) +
        Object.values(t.extensions).reduce((a, b) => a + b * 2, 0),
      0,
    );
    const forces = troopScores[p.id] ?? 0;
    const production = Object.values(income(s, p.id)).reduce(
      (n, v) => n + (v ?? 0) * 5,
      0,
    );
    return { towns, forces, production, total: towns + forces + production };
  });
  strengthDetailsCache.set(s, details);
  return details;
}
export function factionStrengths(s: Game): number[] {
  const cached = strengthsCache.get(s);
  if (cached) return cached;
  const scores = factionStrengthDetails(s).map((d) => d.total);
  strengthsCache.set(s, scores);
  return scores;
}
const dominanceCache = new WeakMap<
  Game,
  { leader: number; severity: number }
>();
/** A meaningful lead becomes urgent well before the leader doubles the runner-up.
 * Keep the six-point floor for tiny starting realms; use the ratio for larger ones.
 * 1.25× starts pressure, 1.65× is ~78%, and 1.8× is a full survival crisis.
 */
export function dominanceSeverity(first: number, second: number): number {
  const lead = Math.max(0, first - second - Math.max(6, second * 0.25));
  return Math.min(1, Math.pow(lead / Math.max(12, second * 0.55), 0.8));
}
/** Public, faction-neutral balance of power. Small leads do not create coalitions. */
export function dominance(s: Game): { leader: number; severity: number } {
  const emergency = emergencyTarget(s);
  if (emergency !== undefined) return { leader: emergency, severity: 1 };
  const cached = dominanceCache.get(s);
  if (cached) return cached;
  const scores = factionStrengths(s);
  const ranked = s.players
    .filter((p) => p.alive)
    .sort((a, b) => scores[b.id] - scores[a.id]);
  if (ranked.length < 2) return { leader: ranked[0]?.id ?? -1, severity: 0 };
  const leader = ranked[0].id,
    first = scores[leader],
    second = scores[ranked[1].id];
  const result = { leader, severity: dominanceSeverity(first, second) };
  dominanceCache.set(s, result);
  return result;
}
export function leaderPressure(
  s: Game,
  target: number,
  viewer = s.active,
): number {
  if (emergencyTarget(s, viewer) === target) return 10;
  const crisis = dominance(s);
  return Math.max(
    target !== viewer && target === crisis.leader ? 1 + crisis.severity * 5 : 1,
    allianceOf(s, viewer)?.threat === target ? 2.5 : 1,
  );
}
/** Cooperation is expedient: local attacks still justify self-defense. */
export function warTarget(s: Game, target: number, viewer = s.active): boolean {
  if (friendly(s, target, viewer) || !s.players[target]?.alive) return false;
  const emergency = emergencyTarget(s, viewer);
  if (emergency !== undefined) return target === emergency;
  const crisis = dominance(s);
  if (allianceOf(s, viewer)?.threat === target) return true;
  if (
    crisis.leader === viewer ||
    crisis.severity < 0.2 ||
    target === crisis.leader
  )
    return true;
  return ownTowns(s, viewer).some((t) =>
    townThreats(s, t).some(
      (u) => u.owner === target && landAtVertex(s, t.vertex).includes(u.tile),
    ),
  );
}
/** Prefer supplying weaker realms close enough to contest the dominant faction. */
export function coalitionSupport(
  s: Game,
  recipient: number,
  donor = s.active,
): number {
  const crisis = dominance(s);
  if (
    recipient === donor ||
    recipient === crisis.leader ||
    donor === crisis.leader ||
    !s.players[recipient]?.alive ||
    crisis.severity < 0.12
  )
    return 0;
  if (
    ownTowns(s, donor).some((t) =>
      townThreats(s, t).some(
        (u) =>
          u.owner === recipient && landAtVertex(s, t.vertex).includes(u.tile),
      ),
    )
  )
    return 0;
  const front = new Set([
    ...ownTowns(s, crisis.leader).flatMap((t) => landAtVertex(s, t.vertex)),
    ...ownPieces(s, crisis.leader).map((u) => u.tile),
  ]);
  const recipientTiles = new Set(
    ownTowns(s, recipient).flatMap((t) => landAtVertex(s, t.vertex)),
  );
  // Keep the exact closest distance without passing the entire town/army
  // cross-product as function arguments. Chrome workers have a smaller stack
  // than the main thread; ordinary late-game armies can exceed that limit.
  let distanceToFront = Infinity;
  closest: for (const tile of recipientTiles)
    for (const enemy of front) {
      distanceToFront = Math.min(distanceToFront, distance(tile, enemy));
      if (distanceToFront === 0) break closest;
    }
  const scores = factionStrengths(s);
  const weakness = Math.min(1, scores[donor] / Math.max(1, scores[recipient]));
  return (
    crisis.severity *
    weakness *
    Math.max(0, 1 - Math.max(0, distanceToFront - 2) / 7)
  );
}

const threatCache = new WeakMap<Game, Map<string, Piece[]>>();
const threatGroups = new WeakMap<
  Game,
  {
    groups: { owner: number; tile: string; speed: number; units: Piece[] }[];
    order: Map<string, number>;
  }
>();
/** Reachable land threats only; troops across water cannot threaten a land town. */
export function townThreats(s: Game, t: Town): Piece[] {
  let cache = threatCache.get(s);
  if (!cache) {
    cache = new Map();
    threatCache.set(s, cache);
  }
  const cached = cache.get(t.id);
  if (cached) return cached;
  let indexed = threatGroups.get(s);
  if (!indexed) {
    const groups = new Map<
      string,
      { owner: number; tile: string; speed: number; units: Piece[] }
    >();
    const order = new Map<string, number>();
    for (const u of allPieces(s)) {
      if (u.naval || u.carrier || points(u) <= 0) continue;
      order.set(u.id, order.size);
      const movement = speed(u),
        key = `${u.owner}/${u.tile}/${movement}`;
      if (!groups.has(key))
        groups.set(key, {
          owner: u.owner,
          tile: u.tile,
          speed: movement,
          units: [],
        });
      groups.get(key)!.units.push(u);
    }
    indexed = { groups: [...groups.values()], order };
    threatGroups.set(s, indexed);
  }
  const tiles = landAtVertex(s, t.vertex);
  const threats = indexed.groups
    .filter(
      (g) =>
        !friendly(s, g.owner, t.owner) &&
        tiles.some(
          (id) =>
            distance(g.tile, id) <= g.speed &&
            Number.isFinite(
              planningDistance(s, g.tile, id, false, g.owner, g.speed),
            ),
        ),
    )
    .flatMap((g) => g.units)
    .sort((a, b) => indexed!.order.get(a.id)! - indexed!.order.get(b.id)!);
  cache.set(t.id, threats);
  return threats;
}
/** Co-located troops can attack together; separate stacks and factions cannot. */
export function threatPower(
  s: Game,
  threats: Piece[],
  tiles: string[],
): number {
  const groups = new Map<string, Piece[]>();
  for (const u of threats) {
    const key = `${u.owner}/${u.tile}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(u);
  }
  return maxValue([
    0,
    ...[...groups.values()].flatMap((group) =>
      tiles.map((tile) => power(s, group, tile)),
    ),
  ]);
}
/** A planning target, not a unit cap. Real local danger can justify more guards.
 * Compare raw unit points with raw unit points, and limit speculative armament
 * by the size of our own economy instead of multiplying rival stockpiles forever.
 */
/** Commit a larger share of a strong economy to conquest before opponents recover. */
export function conquestDrive(s: Game): number {
  const scores = factionStrengths(s),
    ours = scores[s.active],
    rival = maxValue([
      1,
      ...s.players
        .filter((p) => p.alive && p.id !== s.active)
        .map((p) => scores[p.id]),
    ]),
    advantage = Math.max(0, Math.min(1, ours / rival - 1)),
    crisis = dominance(s);
  return (
    1.3 +
    (emergencyTarget(s) !== undefined ? 0.8 : 0) +
    (allianceOf(s, s.active) ? 0.2 : 0) +
    advantage * 0.5 +
    Math.min(0.5, Math.max(0, s.players[s.active].turns - 10) / 40) +
    crisis.severity * (crisis.leader === s.active ? 0.3 : 0.45)
  );
}
export function campaignPowerTarget(s: Game): number {
  const towns = ownTowns(s);
  const stacks = new Map<string, number>();
  for (const u of allPieces(s)) {
    if (
      friendly(s, u.owner, s.active) ||
      u.naval ||
      u.carrier ||
      u.kind === "artillery" ||
      u.kind === "merchant" ||
      u.kind === "settler"
    )
      continue;
    const key = `${u.owner}/${u.tile}`;
    stacks.set(key, (stacks.get(key) ?? 0) + u.tier);
  }
  const drive = conquestDrive(s);
  const economicBudget =
    (8 +
      towns.length * 4 +
      Math.min(
        12,
        Math.floor(
          Object.values(income(s)).reduce((n, v) => n + (v ?? 0), 0) * 2,
        ),
      )) *
    (1 + (dominance(s).leader === s.active ? 0 : dominance(s).severity) * 1.5) *
    drive;
  const opponent = maxValue([0, ...stacks.values()]);
  return Math.max(
    minimumFieldPower(s),
    Math.min(
      economicBudget,
      Math.max(10, opponent + 3 + towns.length * 2) *
        drive *
        (1 + (dominance(s).leader === s.active ? 0 : dominance(s).severity)),
    ),
  );
}
export function townGuardPower(
  s: Game,
  t: Town,
  excluded: string[] = [],
): number {
  const guards = planningValue(s, `guardPieces/${t.id}`, () => {
    const tiles = landAtVertex(s, t.vertex);
    return tiles
      .flatMap((tile) => piecesAt(s, tile, false))
      .filter((u) => friendly(s, u.owner, t.owner))
      .map((u) => ({ id: u.id, power: power(s, [u], u.tile) }));
  });
  const leaving = new Set(excluded);
  return guards.reduce((n, u) => n + (leaving.has(u.id) ? 0 : u.power), 0);
}
/** Maintain a delaying guard without spending an entire economy trying to
 * match a stack far beyond the campaign budget. Transport and raids still need funding. */
export function urgentTownDefense(
  s: Game,
  t: Town,
  danger: number,
  guards: number,
  budget = campaignPowerTarget(s),
): boolean {
  return (
    danger > guards &&
    (guards < Math.min(6, t.level + 1) || danger <= budget * 1.5)
  );
}
export function minimumFieldPower(s: Game): number {
  const turn = s.players[s.active].turns;
  return turn < 3 ? 0 : Math.min(10, Math.max(3, Math.floor(turn / 2)));
}
export function leavesTownExposed(
  s: Game,
  group: Piece[],
  to?: string,
  defeated: string[] = [],
): boolean {
  if (group[0].naval) return false;
  const near =
    planningValue(s, `townsNearArmy/${s.active}`, () => {
      const byTile = new Map<string, Town[]>();
      for (const town of ownTowns(s))
        for (const tile of landAtVertex(s, town.vertex)) {
          if (!byTile.has(tile)) byTile.set(tile, []);
          byTile.get(tile)!.push(town);
        }
      return byTile;
    }).get(group[0].tile) ?? [];
  // The destination only determines which nearby towns the army still covers.
  // Assess each town once for this detachment, not once per possible move.
  const groups = planningValue(
    s,
    "departureRisk",
    () =>
      new WeakMap<Piece[], { members: Piece[]; risks: Map<string, boolean> }>(),
  );
  let cached = groups.get(group);
  // Transport planners shrink detachments in place while choosing a guard.
  // Array identity alone would keep the assessment for the larger army.
  if (
    !cached ||
    cached.members.length !== group.length ||
    cached.members.some((u, i) => u !== group[i])
  ) {
    cached = { members: group.slice(), risks: new Map() };
    groups.set(group, cached);
  }
  const risks = cached.risks;
  const defeatedKey = defeated.join(","),
    defeatedIds = new Set(defeated);
  let leaving: string[] | undefined;
  return near.some((t) => {
    const tiles = landAtVertex(s, t.vertex);
    if (to && tiles.includes(to)) return false;
    const key = `${t.id}/${defeatedKey}`;
    if (risks.has(key)) return risks.get(key)!;
    const result = () => {
      const threats = townThreats(s, t).filter(
        (u) => !defeatedIds.has(u.id) && warTarget(s, u.owner, t.owner),
      );
      const danger = threatPower(s, threats, tiles);
      const remaining = townGuardPower(
        s,
        t,
        (leaving ??= group.map((u) => u.id)),
      );
      if (danger <= remaining) return false;
      const current = townGuardPower(s, t);
      if (emergencyTarget(s, t.owner) !== undefined)
        return (
          remaining < Math.min(danger, Math.max(1, Math.min(6, current * 0.2)))
        );
      // If even the full garrison cannot hold, hoarding every unit cannot save
      // it. Keep a delaying guard and allow counter-raids against the leader.
      // A defensible town still requires enough troops to match the real threat.
      const survivalThreat = threats.some(
        (u) => leaderPressure(s, u.owner, t.owner) >= 1.5,
      );
      if (
        survivalThreat &&
        danger > current * (s.players[t.owner].turns >= 12 ? 1.15 : 1.3) &&
        remaining >=
          Math.max(1, current * (s.players[t.owner].turns >= 12 ? 0.15 : 0.25))
      )
        return false;
      return true;
    };
    const exposed = result();
    risks.set(key, exposed);
    return exposed;
  });
}

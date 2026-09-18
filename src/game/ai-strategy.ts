import { friendly, allianceOf } from "./relations";
import { townGuilds } from "./guilds";
import type { Game, Piece, Town } from "./types";
import {
  points,
  ownTowns,
  ownPieces,
  piecesAt,
  income,
  power,
  pathTo,
  speed,
} from "./selectors";
import { landAtVertex, distance } from "./world";

export interface FactionStrength {
  towns: number;
  forces: number;
  production: number;
  total: number;
}
const strengthDetailsCache = new WeakMap<Game, FactionStrength[]>();
const strengthsCache = new WeakMap<Game, number[]>();
/** Public board only: no rival stockpiles, research faces, decks, RNG or unexplored tiles. */
export function factionStrengthDetails(s: Game): FactionStrength[] {
  const cached = strengthDetailsCache.get(s);
  if (cached) return cached;
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
    const forces = ownPieces(s, p.id).reduce(
      (n, u) =>
        n +
        (points(u) * 2 +
          (u.kind === "merchant" ||
          u.kind === "merchantship" ||
          u.kind === "fishing"
            ? u.tier * 3
            : 0)),
      0,
    );
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
  const crisis = dominance(s);
  return Math.max(
    target !== viewer && target === crisis.leader ? 1 + crisis.severity * 5 : 1,
    allianceOf(s, viewer)?.threat === target ? 2.5 : 1,
  );
}
/** Cooperation is expedient: local attacks still justify self-defense. */
export function warTarget(s: Game, target: number, viewer = s.active): boolean {
  if (friendly(s, target, viewer) || !s.players[target]?.alive) return false;
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
  const front = [
    ...ownTowns(s, crisis.leader).flatMap((t) => landAtVertex(s, t.vertex)),
    ...ownPieces(s, crisis.leader).map((u) => u.tile),
  ];
  const distanceToFront = Math.min(
    Infinity,
    ...ownTowns(s, recipient).flatMap((t) =>
      landAtVertex(s, t.vertex).flatMap((tile) =>
        front.map((enemy) => distance(tile, enemy)),
      ),
    ),
  );
  const scores = factionStrengths(s);
  const weakness = Math.min(1, scores[donor] / Math.max(1, scores[recipient]));
  return (
    crisis.severity *
    weakness *
    Math.max(0, 1 - Math.max(0, distanceToFront - 2) / 7)
  );
}

const threatCache = new WeakMap<Game, Map<string, Piece[]>>();
/** Reachable land threats only; troops across water cannot threaten a land town. */
export function townThreats(s: Game, t: Town): Piece[] {
  let cache = threatCache.get(s);
  if (!cache) {
    cache = new Map();
    threatCache.set(s, cache);
  }
  const cached = cache.get(t.id);
  if (cached) return cached;
  const tiles = landAtVertex(s, t.vertex);
  const threats = Object.values(s.pieces).filter(
    (u) =>
      !friendly(s, u.owner, t.owner) &&
      !u.naval &&
      u.kind !== "merchant" &&
      !u.carrier &&
      tiles.some(
        (id) =>
          distance(u.tile, id) <= speed(u) &&
          pathTo(s, u.tile, id, false, u.owner, speed(u)) !== null,
      ),
  );
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
    groups.set(key, [...(groups.get(key) ?? []), u]);
  }
  return Math.max(
    0,
    ...[...groups.values()].flatMap((group) =>
      tiles.map((tile) => power(s, group, tile)),
    ),
  );
}
/** A planning target, not a unit cap. Real local danger can justify more guards.
 * Compare raw unit points with raw unit points, and limit speculative armament
 * by the size of our own economy instead of multiplying rival stockpiles forever.
 */
/** Commit a larger share of a strong economy to conquest before opponents recover. */
export function conquestDrive(s: Game): number {
  const scores = factionStrengths(s),
    ours = scores[s.active],
    rival = Math.max(
      1,
      ...s.players
        .filter((p) => p.alive && p.id !== s.active)
        .map((p) => scores[p.id]),
    ),
    advantage = Math.max(0, Math.min(1, ours / rival - 1)),
    crisis = dominance(s);
  return (
    1.3 +
    (allianceOf(s, s.active) ? 0.2 : 0) +
    advantage * 0.5 +
    Math.min(0.5, Math.max(0, s.players[s.active].turns - 10) / 40) +
    crisis.severity * (crisis.leader === s.active ? 0.3 : 0.45)
  );
}
export function campaignPowerTarget(s: Game): number {
  const towns = ownTowns(s);
  const stacks = new Map<string, number>();
  for (const u of Object.values(s.pieces)) {
    if (
      friendly(s, u.owner, s.active) ||
      u.naval ||
      u.carrier ||
      u.kind === "artillery" ||
      u.kind === "merchant"
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
  const opponent = Math.max(0, ...stacks.values());
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
  const tiles = landAtVertex(s, t.vertex);
  const leaving = new Set(excluded);
  return tiles
    .flatMap((tile) => piecesAt(s, tile, false))
    .filter((u) => friendly(s, u.owner, t.owner))
    .filter((u) => !leaving.has(u.id))
    .reduce((n, u) => n + power(s, [u], u.tile), 0);
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
  return ownTowns(s).some((t) => {
    const tiles = landAtVertex(s, t.vertex);
    if (!tiles.includes(group[0].tile) || (to && tiles.includes(to)))
      return false;
    const threats = townThreats(s, t).filter(
      (u) => !defeated.includes(u.id) && warTarget(s, u.owner, t.owner),
    );
    const danger = threatPower(s, threats, tiles);
    const remaining = townGuardPower(
      s,
      t,
      group.map((u) => u.id),
    );
    if (danger <= remaining) return false;
    const current = townGuardPower(s, t);
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
  });
}

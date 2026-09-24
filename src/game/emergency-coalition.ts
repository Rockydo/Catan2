import type { Game } from "./types";
import { factionStrengths } from "./ai-strategy";
import { friendly } from "./relations";
import { log } from "./economy";
import {
  allPieces,
  withPlanningFrame,
  withSharedPiecePlanningFrame,
} from "./selectors";
import { breakSieges } from "./military";

export const EMERGENCY_TRIGGER = 0.4;
export const EMERGENCY_RELEASE = 0.2;

/** Refresh only committed states, never AI command previews. A fresh view avoids
 * cached production/strength values from earlier mutations in this transaction.
 * sharePieces is only for the engine's immutable-troop cleanup scope. */
export function syncEmergencyCoalition(
  s: Game,
  options?: { sharePieces: boolean },
): void {
  if (s.phase.startsWith("setup") || s.phase === "finished" || s.battle) return;
  const alive = s.players.filter((p) => p.alive);
  if (alive.length < 2) return;
  const view = { ...s };
  const frame = options?.sharePieces
    ? withSharedPiecePlanningFrame
    : withPlanningFrame;
  const scores = frame(view, () => factionStrengths(view));
  const total = alive.reduce((sum, p) => sum + scores[p.id], 0);
  if (total <= 0) return;
  let coalition = s.alliances?.find((a) => a.emergency === "locked");
  if (
    coalition &&
    (!s.players[coalition.threat].alive ||
      scores[coalition.threat] <= total * EMERGENCY_RELEASE)
  ) {
    coalition.emergency = "released";
    coalition.lockedUntil = s.round;
    log(
      s,
      `The emergency coalition against ${s.players[coalition.threat].name} is unlocked. Its members may leave: the target holds no more than 20% of global power.`,
      "info",
    );
    coalition = undefined;
  }
  const leader = [...alive].sort(
    (a, b) => scores[b.id] - scores[a.id] || a.id - b.id,
  )[0];
  // A locked coalition follows a strictly stronger successor even below the
  // activation threshold. Equal power keeps the incumbent target.
  const target = coalition
    ? scores[leader.id] > scores[coalition.threat]
      ? leader.id
      : coalition.threat
    : scores[leader.id] > total * EMERGENCY_TRIGGER
      ? leader.id
      : undefined;
  if (target === undefined) return;
  const members = alive.filter((p) => p.id !== target).map((p) => p.id);
  if (
    coalition &&
    coalition.threat === target &&
    s.alliances?.length === 1 &&
    coalition.members.length === members.length &&
    members.every((id) => coalition!.members.includes(id))
  )
    return;

  // Splitting the leader from former allies can leave opposing pieces on one
  // tile. Preserve the normal withdrawal rights without moving or deleting units.
  const shared = new Map<string, Set<number>>();
  for (const u of allPieces(s)) {
    if (u.carrier) continue;
    if (!shared.has(u.tile)) shared.set(u.tile, new Set());
    shared.get(u.tile)!.add(u.owner);
  }
  s.withdrawals ??= [];
  for (const [tile, owners] of shared) {
    if (!owners.has(target)) continue;
    for (const owner of owners)
      if (
        owner !== target &&
        friendly(s, target, owner) &&
        !s.withdrawals.some(
          (w) =>
            w.tile === tile &&
            w.owners.includes(target) &&
            w.owners.includes(owner),
        )
      )
        s.withdrawals.push({ tile, owners: [target, owner] });
  }
  s.alliances = [
    {
      id: coalition?.id ?? `a${s.nextId++}`,
      members,
      threat: target,
      lockedUntil: s.round,
      emergency: "locked",
    },
  ];
  delete s.allianceOffer;
  s.withdrawals = s.withdrawals.filter(
    (w) => !friendly(s, w.owners[0], w.owners[1]),
  );
  for (const p of s.players) delete p.plan;
  breakSieges(s);
  if (coalition && coalition.threat !== target)
    log(
      s,
      `Emergency coalition switches from ${s.players[coalition.threat].name} to ${s.players[target].name}, now the strongest faction. All other surviving factions join against the new target. The pact stays locked until its target falls to 20% of global power.`,
      "warning",
      target,
    );
  else if (!coalition)
    log(
      s,
      `Emergency coalition: all other surviving factions unite against ${s.players[target].name}, who holds more than 40% of global power. The pact cannot be left until that faction falls to 20%.`,
      "warning",
      target,
    );
}

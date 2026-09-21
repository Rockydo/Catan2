import type { Game } from "./types";
import { factionStrengths } from "./ai-strategy";
import { withPlanningFrame } from "./selectors";

/** Strictly above 40%, then one more Gold at 45%, 50%, etc. */
export function supportGoldPerTown(
  dominantPower: number,
  totalPower: number,
): number {
  if (totalPower <= 0 || dominantPower * 5 <= totalPower * 2) return 0;
  // Compensate only for floating-point rounding at exact 5% boundaries.
  return Math.max(
    1,
    Math.floor((dominantPower * 20) / totalPower + Number.EPSILON * 20) - 7,
  );
}

/** Strictly above 60%, then one more Gold bar at 65%, 70%, etc. */
export function supportBarsPerCity(
  dominantPower: number,
  totalPower: number,
): number {
  if (totalPower <= 0 || dominantPower * 5 <= totalPower * 3) return 0;
  return Math.max(
    1,
    Math.floor((dominantPower * 20) / totalPower + Number.EPSILON * 20) - 11,
  );
}

/** Uses ordinary faction power, excluding support and stored resources.
 * Factions never pool their shares. A tie uses the lowest faction ID. */
export function dominanceSupport(
  s: Game,
  scores?: readonly number[],
): {
  leader: number;
  perTown: number;
  perCity: number;
} | null {
  if (s.phase.startsWith("setup") || s.phase === "finished") return null;
  const alive = s.players.filter((p) => p.alive);
  if (alive.length < 2) return null;
  if (!scores) {
    // Engine transactions mutate their clone; do not reuse an earlier cache.
    const view = { ...s };
    scores = withPlanningFrame(view, () => factionStrengths(view));
  }
  let leader = alive[0].id,
    total = 0;
  for (const p of alive) {
    total += scores[p.id];
    if (
      scores[p.id] > scores[leader] ||
      (scores[p.id] === scores[leader] && p.id < leader)
    )
      leader = p.id;
  }
  const perTown = supportGoldPerTown(scores[leader], total);
  return perTown
    ? { leader, perTown, perCity: supportBarsPerCity(scores[leader], total) }
    : null;
}

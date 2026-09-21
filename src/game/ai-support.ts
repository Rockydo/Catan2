import type { Game } from "./types";
import { factionStrengths } from "./ai-strategy";
import { withPlanningFrame } from "./selectors";

/** Strictly above 40%, then one more Gold at 45%, 50%, etc. */
export function supportGoldPerTown(
  humanPower: number,
  totalPower: number,
): number {
  if (totalPower <= 0 || humanPower * 5 <= totalPower * 2) return 0;
  // Compensate only for floating-point rounding at exact 5% boundaries.
  return Math.max(
    1,
    Math.floor((humanPower * 20) / totalPower + Number.EPSILON * 20) - 7,
  );
}

/** Uses ordinary faction power. Support itself is not structural production,
 * which avoids a circular power calculation. Humans never pool their shares. */
export function aiGoldSupport(s: Game, scores?: readonly number[]): number {
  if (s.phase.startsWith("setup") || s.phase === "finished") return 0;
  const alive = s.players.filter((p) => p.alive),
    humans = alive.filter((p) => p.control === "human");
  if (!humans.length || humans.length === alive.length) return 0;
  if (!scores) {
    // Engine transactions mutate their clone; do not reuse an earlier cache.
    const view = { ...s };
    scores = withPlanningFrame(view, () => factionStrengths(view));
  }
  const total = alive.reduce((sum, p) => sum + scores[p.id], 0),
    human = Math.max(...humans.map((p) => scores[p.id]));
  return supportGoldPerTown(human, total);
}

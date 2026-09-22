import {
  recruitmentIntentOrder,
  type RecruitmentIntent,
} from "./ai-recruitment";
import { withPlanningFrame } from "./selectors";
import { chooseAIAction, marginalValues } from "./ai";
import { applyCommandPlan } from "./engine";
import type { Command, Game } from "./types";
import { routineAIOrder } from "./ai-protocol";

/** Reassess strategy between projects, but finish an already budgeted set of
 * bank imports together. Routine orders share one published snapshot. Time
 * and count bounds keep pause/cancel responsive. No player prompt, combat,
 * dice presentation or turn boundary is crossed by a batch. */
export function chooseAIOrders(
  s: Game,
  now = () => performance.now(),
): Command[] {
  return planAIOrders(s, now).commands;
}

// Keep one interrupted commissioning plan across worker messages. Accept it
// only when the entire input matches the last validated result. A new save,
// user action, battle or worker restart safely returns to strategic planning.
let continuation: { expected: string; intent: RecruitmentIntent } | undefined;

/** The worker returns the already-validated result. The UI publishes one
 * snapshot instead of replaying and copying the world for every contract. */
export function planAIOrders(s: Game, now = () => performance.now()) {
  const started = now();
  let pending =
    continuation &&
    continuation.expected === JSON.stringify(s) &&
    s.phase === "economy" &&
    !s.battle &&
    !s.trade &&
    !s.allianceOffer &&
    !s.researchChoice &&
    s.players[s.active].control !== "human"
      ? continuation.intent
      : undefined;
  continuation = undefined;
  const result = applyCommandPlan(s, (view, commands) => {
    if (
      commands.length &&
      (commands.length >= 64 ||
        now() - started >= 150 ||
        s.phase !== "economy" ||
        s.players[s.active].control === "human" ||
        !routineAIOrder(commands[commands.length - 1]) ||
        view.active !== s.active ||
        view.phase !== "economy" ||
        view.battle ||
        view.trade ||
        view.allianceOffer ||
        view.researchChoice)
    )
      return undefined;
    let next: Command | null = null;
    if (pending) {
      next = withPlanningFrame(view, () =>
        recruitmentIntentOrder(view, pending!, marginalValues(view)),
      );
      if (!next || next.type !== "bank") pending = undefined;
    }
    next ??= chooseAIAction(view, (intent) => {
      pending = intent;
    });
    return !commands.length || routineAIOrder(next) ? next : undefined;
  });
  if (!result.ok) throw new Error(result.error ?? "Invalid AI economic order");
  if (pending)
    continuation = { expected: JSON.stringify(result.state), intent: pending };
  return { commands: result.commands, state: result.state };
}

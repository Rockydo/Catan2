import {
  recruitmentIntentOrder,
  type RecruitmentIntent,
} from "./ai-recruitment";
import { withPlanningFrame } from "./selectors";
import { chooseAIAction, marginalValues } from "./ai";
import { applyCommandPlan, peacefulMove } from "./engine";
import type { Command, Game } from "./types";
import { routineAIOrder } from "./ai-protocol";

/** Reassess strategy after every order, but finish an already budgeted set of
 * bank imports together. Routine orders share one published snapshot; Ultra
 * Fast may also group peaceful moves. Time and count bounds keep pause/cancel
 * responsive. No player prompt, combat, dice or turn boundary is crossed. */
export function chooseAIOrders(
  s: Game,
  now = () => performance.now(),
): Command[] {
  return planAIOrders(s, now).commands;
}

// A worker owns immutable, retained snapshots, so its continuation can use
// identity. Ordinary callers retain the full-value guard against mutations.
// Each worker session has independent intent and retains at most one result.
export function createAIOrderPlanner(ownedSnapshots = false) {
  let continuation:
    { expected?: string; state: Game; intent: RecruitmentIntent } | undefined;
  return function planAIOrders(
    s: Game,
    now = () => performance.now(),
    batchMoves = false,
  ) {
    const started = now();
    let pending =
      continuation &&
      ((ownedSnapshots && continuation.state === s) ||
        (continuation.expected ?? JSON.stringify(continuation.state)) ===
          JSON.stringify(s)) &&
      s.phase === "economy" &&
      !s.battle &&
      !s.trade &&
      !s.allianceOffer &&
      !s.researchChoice &&
      s.players[s.active].control !== "human"
        ? continuation.intent
        : undefined;
    continuation = undefined;
    let previousWasRoutine = true;
    const result = applyCommandPlan(s, (view, commands) => {
      if (
        commands.length &&
        (commands.length >= 64 ||
          now() - started >= 150 ||
          s.phase !== "economy" ||
          s.players[s.active].control === "human" ||
          !previousWasRoutine ||
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
      // Classify against the position BEFORE execution. After a won battle,
      // its destination may look peaceful, but combat must still be published.
      const routine =
        routineAIOrder(next) || (batchMoves && peacefulMove(view, next));
      if (commands.length && !routine) return undefined;
      previousWasRoutine = routine;
      return next;
    });
    if (!result.ok)
      throw new Error(result.error ?? "Invalid AI economic order");
    if (pending)
      continuation = {
        state: result.state,
        expected: ownedSnapshots ? undefined : JSON.stringify(result.state),
        intent: pending,
      };
    return { commands: result.commands, state: result.state };
  };
}

export const planAIOrders = createAIOrderPlanner();

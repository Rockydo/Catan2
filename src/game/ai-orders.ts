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

// A worker owns immutable, retained snapshots, so its continuation can use
// identity. Ordinary callers retain the full-value guard against mutations.
// Each worker session has independent intent and retains at most one result.
export function createAIOrderPlanner(ownedSnapshots = false) {
  let continuation:
    { expected?: string; state: Game; intent: RecruitmentIntent } | undefined;
  return function planAIOrders(s: Game, now = () => performance.now()) {
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

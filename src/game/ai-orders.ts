import { chooseAIAction } from "./ai";
import { applyCommandPlan } from "./engine";
import type { Command, Game } from "./types";
import { routineAIOrder } from "./ai-protocol";

/** Replan after every transaction, but present routine orders together. Time
 * and count bounds keep pause/cancel responsive. No player prompt, combat,
 * dice presentation or turn boundary is crossed by a batch. */
export function chooseAIOrders(
  s: Game,
  now = () => performance.now(),
): Command[] {
  return planAIOrders(s, now).commands;
}

/** The worker returns the already-validated result. The UI publishes one
 * snapshot instead of replaying and copying the world for every contract. */
export function planAIOrders(s: Game, now = () => performance.now()) {
  const started = now();
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
    const next = chooseAIAction(view);
    return !commands.length || routineAIOrder(next) ? next : undefined;
  });
  if (!result.ok) throw new Error(result.error ?? "Invalid AI economic order");
  return { commands: result.commands, state: result.state };
}

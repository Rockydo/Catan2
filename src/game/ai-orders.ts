import { chooseAIAction } from "./ai";
import { applyCommand } from "./engine";
import type { Command, Game } from "./types";

const ECONOMIC_ORDERS = new Set([
  "bank",
  "recruit",
  "ship",
  "road",
  "route",
  "settlement",
  "camp",
  "city",
  "extension",
  "wall",
  "tower",
  "guild",
  "guild-order",
]);

/** Replan after every transaction, but present routine orders together. Time
 * and count bounds keep pause/cancel responsive. No player prompt, combat,
 * dice presentation or turn boundary is crossed by a batch. */
export function chooseAIOrders(
  s: Game,
  now = () => performance.now(),
): Command[] {
  const started = now(),
    commands = [chooseAIAction(s)];
  if (s.phase !== "economy" || s.players[s.active].control === "human")
    return commands;
  let view = s;
  while (commands.length < 8 && now() - started < 150) {
    const previous = commands[commands.length - 1];
    if (!ECONOMIC_ORDERS.has(previous.type)) break;
    const result = applyCommand(view, previous);
    if (!result.ok)
      throw new Error(result.error ?? "Invalid AI economic order");
    view = result.state;
    if (
      view.active !== s.active ||
      view.phase !== "economy" ||
      view.battle ||
      view.trade ||
      view.allianceOffer ||
      view.researchChoice ||
      now() - started >= 150
    )
      break;
    const next = chooseAIAction(view);
    if (!ECONOMIC_ORDERS.has(next.type)) break;
    commands.push(next);
  }
  return commands;
}

import type { Command, Game } from "../game/types";
import { commandError } from "../game/engine";

// UI snapshots are immutable. Cache the rule result, not a simulated campaign.
// Weak keys release old campaigns, and the bound limits slider/selection churn.
const previews = new WeakMap<Game, Map<string, string | undefined>>();
export function previewError(game: Game, command: Command): string | undefined {
  let cache = previews.get(game);
  if (!cache) previews.set(game, (cache = new Map()));
  const key = JSON.stringify(command);
  if (cache.has(key)) return cache.get(key);
  const error = commandError(game, command);
  if (cache.size >= 256) cache.delete(cache.keys().next().value!);
  cache.set(key, error);
  return error;
}

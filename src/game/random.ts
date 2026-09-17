import type { Game } from "./types";
import { nextRandom } from "./world";
export function random(s: Game, deck = false): number {
  const [value, state] = nextRandom(deck ? s.deckRng : s.rng);
  if (deck) s.deckRng = state;
  else s.rng = state;
  return value;
}

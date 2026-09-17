import type { Game } from "./types";
import { CARDS } from "./content";
import { random } from "./random";
import { rule } from "./economy";
const nextId = (s: Game, prefix: string) => `${prefix}${s.nextId++}`;
export function drawResearch(s: Game, tier: number) {
  rule(!s.researchChoice, "Finish choosing your current discovery first.");
  s.players[s.active].researchBought = true;
  s.researchChoice = [];
  const pool = Object.keys(CARDS).filter((kind) => CARDS[kind].tier === tier);
  for (let i = 0; i < 2; i++) {
    const [kind] = pool.splice(Math.floor(random(s, true) * pool.length), 1);
    s.researchChoice.push({
      id: nextId(s, "c"),
      tier,
      kind,
      bought: s.players[s.active].turns,
    });
  }
}

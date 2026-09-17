import { funded } from "./helpers";
import { ownTowns } from "../src/game/selectors";
export function tradeFixture() {
  const s = funded();
  for (const t of Object.values(s.towns)) t.stock = {};
  s.active = 1;
  s.phase = "economy";
  s.players[1].turns = 4;
  ownTowns(s, 1)[0].stock = { lumber: 20, wool: 1, hides: 1 };
  ownTowns(s, 0)[0].stock = { grain: 20 };
  return s;
}

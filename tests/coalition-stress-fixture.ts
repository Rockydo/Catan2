import { funded, piece } from "./helpers";
import { ownTowns, settlementSites } from "../src/game/selectors";

/** Many towns and one large enemy stack previously overflowed Chrome's worker
 * while evaluating aid. All sites obey the settlement distance rule. */
export function coalitionStressFixture() {
  const s = funded("coalition-fixture");
  s.pieces = {};
  s.routes = {};
  s.round = 25;
  s.active = 2;
  s.phase = "economy";
  for (const tile of Object.values(s.tiles)) {
    tile.resource = "grain";
    tile.number = 7;
    delete tile.fish;
    delete tile.whale;
  }
  for (const p of s.players) {
    p.turns = 25;
    p.control = "standard";
  }
  for (const t of Object.values(s.towns)) t.stock = {};
  const template = ownTowns(s, 2)[0];
  while (ownTowns(s, 2).length < 40) {
    const vertex = settlementSites(s, 2, true)[0];
    if (!vertex)
      throw new Error("Stress map needs forty legal recipient towns");
    const id = `t${s.nextId++}`;
    s.towns[id] = { ...structuredClone(template), id, vertex };
  }
  for (let i = 0; i < 3000; i++) piece(s, "4,0", 1, "heavy", 1);
  ownTowns(s, 0)[0].stock = { grain: 10 };
  ownTowns(s, 2)[0].stock = { ore: 10 };
  s.trade = { from: 2, to: 0, give: { ore: 1 }, take: { grain: 1 } };
  return s;
}

import { newGame, applyCommand } from "../src/game/engine";
import { generateWorld, addHexes } from "../src/game/world";
import { chooseAIAction } from "../src/game/ai";
import { assertInvariants, serialize, deserialize } from "../src/game/save";
import { ownTowns } from "../src/game/selectors";
const results = [];
for (const count of [100, 500, 1000, 2500]) {
  let s = newGame("large-frontier");
  while (s.phase.startsWith("setup")) {
    const r = applyCommand(s, chooseAIAction(s));
    if (!r.ok) throw new Error(r.error);
    s = r.state;
  }
  const world = generateWorld(s.seed, count);
  addHexes(s, s.seed, Object.keys(world.tiles));
  for (const t of ownTowns(s)) {
    t.level = 4;
    t.turnLevel = 4;
    t.stock = { lumber: 30, brick: 30, grain: 30, wool: 30, ore: 30 };
  }
  s.phase = "economy";
  const start = performance.now(),
    action = chooseAIAction(s),
    decisionMs = performance.now() - start;
  const n = applyCommand(s, action);
  if (!n.ok) throw new Error(n.error);
  assertInvariants(n.state);
  const text = serialize(n.state);
  deserialize(text);
  results.push({
    tiles: count,
    decisionMs: Math.round(decisionMs),
    saveBytes: Buffer.byteLength(text),
    action: action.type,
  });
}
console.log(JSON.stringify(results, null, 2));

import { expect, it } from "vitest";
import {
  coalitionSupport,
  dominance,
  factionStrengths,
} from "../src/game/ai-strategy";
import { ownTowns, ownPieces } from "../src/game/selectors";
import { distance, landAtVertex } from "../src/game/world";
import { chooseAIAction } from "../src/game/ai";
import { assertInvariants, deserialize, serialize } from "../src/game/save";
import { coalitionStressFixture } from "./coalition-stress-fixture";
import { run } from "./helpers";

it("keeps coalition aid exact with more distance pairs than a JavaScript call can hold", () => {
  const s = coalitionStressFixture();
  assertInvariants(deserialize(serialize(s)));
  const crisis = dominance(s);
  expect(crisis.leader).toBe(1);
  const front = [
    ...ownTowns(s, 1).flatMap((t) => landAtVertex(s, t.vertex)),
    ...ownPieces(s, 1).map((u) => u.tile),
  ];
  const sites = ownTowns(s, 2).flatMap((t) => landAtVertex(s, t.vertex));
  expect(front.length * sites.length).toBeGreaterThan(200000);
  // Independent reference, retaining duplicates and every comparison.
  const closest = sites.reduce(
    (best, tile) =>
      front.reduce((n, enemy) => Math.min(n, distance(tile, enemy)), best),
    Infinity,
  );
  const scores = factionStrengths(s);
  const expected =
    crisis.severity *
    Math.min(1, scores[0] / Math.max(1, scores[2])) *
    Math.max(0, 1 - Math.max(0, closest - 2) / 7);
  const before = JSON.stringify(s);
  expect(coalitionSupport(s, 2, 0)).toBeCloseTo(expected, 12);
  const action = chooseAIAction(s);
  expect(action.type).toBe("respond-trade");
  expect(JSON.stringify(s)).toBe(before);
  assertInvariants(run(s, action));
});

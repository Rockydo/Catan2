import { expect, it } from "vitest";
import { newGame, setupOrder } from "../src/game/engine";
import { REALM_NAMES } from "../src/game/content";
import { chooseAIAction } from "../src/game/ai";
import { assertInvariants, serialize, deserialize } from "../src/game/save";
import { ownTowns } from "../src/game/selectors";
import { run } from "./helpers";

export function grandSetup() {
  let s = newGame(
    "grand-campaign-test",
    REALM_NAMES.map((name) => ({ name, control: "standard" })),
  );
  while (s.phase.startsWith("setup")) s = run(s, chooseAIAction(s));
  return s;
}
it("generates 220 tiles with ten distinct factions and a full twenty-town snake draft", () => {
  let s = newGame(
    "grand-campaign-test",
    REALM_NAMES.map((name) => ({ name, control: "standard" })),
  );
  expect(Object.keys(s.tiles)).toHaveLength(220);
  expect(s.players).toHaveLength(10);
  expect(new Set(s.players.map((p) => p.color)).size).toBe(10);
  expect(setupOrder(10)).toEqual([
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0,
  ]);
  const order: number[] = [];
  while (s.phase.startsWith("setup")) {
    if (s.phase === "setup-town") order.push(s.active);
    s = run(s, chooseAIAction(s));
    assertInvariants(s);
  }
  expect(order).toEqual(setupOrder(10));
  expect(s.players.map((p) => ownTowns(s, p.id).length)).toEqual(
    Array(10).fill(2),
  );
  expect(deserialize(serialize(s))).toEqual(s);
  expect(Object.keys(newGame("classic-still-default").tiles)).toHaveLength(110);
});
it("cycles through all ten turns, rolls production and saves upper-seat ownership", () => {
  let s = grandSetup();
  for (let active = 0; active < 10; active++) {
    expect(s.active).toBe(active);
    s = run(s, { type: "roll" });
    assertInvariants(s);
    s = run(s, { type: "end-turn" });
  }
  expect(s.active).toBe(0);
  expect(s.round).toBe(2);
  expect(deserialize(serialize(s)).players[7].turns).toBe(1);
});
it("accepts trades between upper seats and rejects out-of-range ownership", () => {
  let s = grandSetup();
  s.active = 6;
  s.phase = "economy";
  ownTowns(s, 6)[0].stock = { stone: 4 };
  ownTowns(s, 7)[0].stock = { salt: 4 };
  s = run(s, {
    type: "offer-trade",
    partner: 7,
    give: { stone: 2 },
    take: { salt: 2 },
  });
  s = deserialize(serialize(s));
  s = run(s, { type: "respond-trade", actor: 7, mode: "accept" });
  assertInvariants(s);
  s.active = 10;
  expect(() => assertInvariants(s)).toThrow();
});

it("can eliminate an upper-numbered faction and award victory to faction ten", () => {
  let s = grandSetup();
  s.towns = Object.fromEntries(
    Object.entries(s.towns).filter(([, t]) => t.owner >= 8),
  );
  s.routes = Object.fromEntries(
    Object.entries(s.routes).filter(([, r]) => r.owner >= 8),
  );
  s.players.forEach((p) => (p.alive = p.id >= 8));
  s.active = 8;
  s.phase = "economy";
  s = run(s, { type: "surrender" });
  expect(s.phase).toBe("finished");
  expect(s.winner).toBe(9);
  expect(deserialize(serialize(s)).winner).toBe(9);
});

it.each([4, 8])(
  "preserves the faction count and tile count of legacy %i-player saves",
  (count) => {
    const old = newGame(
      "legacy-size",
      REALM_NAMES.slice(0, count).map((name) => ({
        name,
        control: "standard",
      })),
    );
    const restored = deserialize(serialize(old));
    expect(restored.players).toHaveLength(count);
    expect(Object.keys(restored.tiles)).toHaveLength(count * 25);
  },
);

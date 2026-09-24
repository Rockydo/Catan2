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
it("generates 320 tiles with twelve distinct factions and a full twenty-four-town snake draft", () => {
  let s = newGame(
    "grand-campaign-test",
    REALM_NAMES.map((name) => ({ name, control: "standard" })),
  );
  expect(Object.keys(s.tiles)).toHaveLength(320);
  expect(s.players).toHaveLength(12);
  expect(new Set(s.players.map((p) => p.color)).size).toBe(12);
  expect(setupOrder(12)).toEqual([
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0,
  ]);
  const order: number[] = [];
  while (s.phase.startsWith("setup")) {
    if (s.phase === "setup-town") order.push(s.active);
    s = run(s, chooseAIAction(s));
    assertInvariants(s);
  }
  expect(order).toEqual(setupOrder(12));
  expect(s.players.map((p) => ownTowns(s, p.id).length)).toEqual(
    Array(12).fill(2),
  );
  expect(deserialize(serialize(s))).toEqual(s);
  expect(Object.keys(newGame("classic-still-default").tiles)).toHaveLength(125);
});
it("cycles through all twelve turns, rolls production and saves upper-seat ownership", () => {
  let s = grandSetup();
  for (let active = 0; active < 12; active++) {
    expect(s.active).toBe(active);
    s = run(s, { type: "roll" });
    assertInvariants(s);
    s = run(s, { type: "end-turn" });
  }
  expect(s.active).toBe(0);
  expect(s.round).toBe(2);
  expect(deserialize(serialize(s)).players[11].turns).toBe(1);
});
it("accepts trades between upper seats and rejects out-of-range ownership", () => {
  let s = grandSetup();
  s.active = 10;
  s.phase = "economy";
  ownTowns(s, 10)[0].stock = { stone: 4 };
  ownTowns(s, 11)[0].stock = { salt: 4 };
  s = run(s, {
    type: "offer-trade",
    partner: 11,
    give: { stone: 2 },
    take: { salt: 2 },
  });
  s = deserialize(serialize(s));
  s = run(s, { type: "respond-trade", actor: 11, mode: "accept" });
  assertInvariants(s);
  s.active = 12;
  expect(() => assertInvariants(s)).toThrow();
});

it("can eliminate an upper-numbered faction and award victory to faction twelve", () => {
  let s = grandSetup();
  s.towns = Object.fromEntries(
    Object.entries(s.towns).filter(([, t]) => t.owner >= 10),
  );
  s.routes = Object.fromEntries(
    Object.entries(s.routes).filter(([, r]) => r.owner >= 10),
  );
  s.players.forEach((p) => (p.alive = p.id >= 10));
  s.active = 10;
  s.phase = "economy";
  s = run(s, { type: "surrender" });
  expect(s.phase).toBe("finished");
  expect(s.winner).toBe(11);
  expect(deserialize(serialize(s)).winner).toBe(11);
});

it.each([4, 8, 10])(
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

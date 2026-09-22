import { economyProjects, researchUtility } from "../src/game/ai";
import { it, expect } from "vitest";
import { fishingFixture, maritimeFixture } from "./maritime-fixture";
import { run } from "./helpers";
import { applyCommand } from "../src/game/engine";
import { inventory, fresh, ready } from "../src/game/selectors";
import { unitCost, shipCost } from "../src/game/content";
import { assertInvariants, deserialize, serialize } from "../src/game/save";
it("recruits ten units in one transaction with exact costs and ordinary readiness", () => {
  const { s, home } = maritimeFixture(),
    before = inventory(s),
    cost = unitCost("heavy", 2);
  const n = run(s, {
    type: "recruit",
    town: home.id,
    tile: s.vertices[home.vertex].tiles[0],
    kind: "heavy",
    tier: 2,
    count: 10,
  });
  expect(Object.values(n.pieces)).toHaveLength(10);
  for (const [g, q] of Object.entries(cost))
    expect(inventory(n)[g as keyof typeof before]).toBe(
      before[g as keyof typeof before]! - q! * 10,
    );
  expect(Object.values(n.pieces).every((u) => !fresh(n, u))).toBe(true);
  expect(n.towns[home.id].recruited).toBe(10);
  assertInvariants(deserialize(serialize(n)));
});
it("consumes free recruits once and pays for only the rest, including Fish substitution", () => {
  const { s, home } = maritimeFixture();
  home.stock = { ore: 6, grain: 1, fish: 1 };
  s.players[0].bonuses.recruits = [{ tier: 1, classes: ["heavy"] }];
  // Tier-I heavy recipe is checked dynamically below so the test stays explicit about the payment behavior.
  const cost = unitCost("heavy", 1);
  home.stock = {
    ...Object.fromEntries(Object.entries(cost).map(([g, q]) => [g, q! * 2])),
    grain: Math.max(0, (cost.grain ?? 0) * 2 - 1),
    fish: 1,
  };
  const n = run(s, {
    type: "recruit",
    town: home.id,
    tile: s.vertices[home.vertex].tiles[0],
    kind: "heavy",
    tier: 1,
    count: 3,
  });
  expect(Object.values(n.pieces)).toHaveLength(3);
  expect(n.players[0].bonuses.recruits).toHaveLength(0);
  expect(inventory(n).grain).toBe(0);
  expect(inventory(n).fish).toBe(cost.grain ? 0 : 1);
  assertInvariants(n);
});
it("rolls back a partially affordable order, including its free commission", () => {
  const { s, home } = maritimeFixture();
  home.stock = {};
  s.players[0].bonuses.recruits = [{ tier: 2, classes: ["heavy"] }];
  const before = serialize(s);
  const result = applyCommand(s, {
    type: "recruit",
    town: home.id,
    tile: s.vertices[home.vertex].tiles[0],
    kind: "heavy",
    tier: 2,
    count: 2,
  });
  expect(result.ok).toBe(false);
  expect(result.state).toBe(s);
  expect(JSON.parse(serialize(s)).game).toEqual(JSON.parse(before).game);
  expect(s.players[0].bonuses.recruits).toHaveLength(1);
});
it("ships have no per-town or batch cap and larger launch counts survive reload", () => {
  let { s, home, water } = fishingFixture();
  const recipe = shipCost("fishing", 1);
  home.stock = Object.fromEntries(
    Object.entries(recipe).map(([g, n]) => [g, n! * 110]),
  );
  home.level = home.turnLevel = 1;
  const command = {
    type: "ship",
    town: home.id,
    tile: water,
    kind: "fishing",
    tier: 1,
  };
  s = run(s, { ...command, count: 101 });
  s = run(s, { ...command, count: 9 });
  expect(Object.values(s.pieces)).toHaveLength(110);
  expect(s.towns[home.id].launched).toBe(110);
  expect(Object.values(inventory(s)).every((n) => !n)).toBe(true);
  expect(Object.values(s.pieces).every((u) => !ready(s, u))).toBe(true);
  expect(applyCommand(s, command).ok).toBe(false);
  assertInvariants(deserialize(serialize(s)));
});
it("bulk ships consume only matching commissions, pay the balance and roll back unaffordable orders", () => {
  const { s, home, water } = fishingFixture();
  s.players[0].bonuses.ships = [
    ["fishing"],
    ["fishing"],
    ["fishing"],
    ["merchantship"],
  ];
  s.players[0].bonuses.shipTiers = [2, 1, 2, 2];
  home.stock = { ...shipCost("fishing", 2) };
  const command = {
    type: "ship",
    town: home.id,
    tile: water,
    kind: "fishing",
    tier: 2,
  };
  expect(applyCommand(s, { ...command, count: 4 }).ok).toBe(false);
  expect(s.players[0].bonuses.shipTiers).toEqual([2, 1, 2, 2]);
  const next = run(s, { ...command, count: 3 });
  expect(next.towns[home.id].launched).toBe(3);
  expect(next.players[0].bonuses.shipTiers).toEqual([1, 2]);
  expect(next.players[0].bonuses.ships).toEqual([
    ["fishing"],
    ["merchantship"],
  ]);
  expect(Object.values(inventory(next)).every((n) => !n)).toBe(true);
  assertInvariants(next);
});
it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
  "rejects invalid ship quantities %s",
  (count) => {
    const { s, home, water } = fishingFixture();
    expect(
      applyCommand(s, {
        type: "ship",
        town: home.id,
        tile: water,
        kind: "fishing",
        tier: 1,
        count,
      }).ok,
    ).toBe(false);
  },
);
it.each([0, -1, 1.5, 101, NaN])(
  "rejects an invalid order quantity %s",
  (count) => {
    const { s, home } = maritimeFixture();
    expect(
      applyCommand(s, {
        type: "recruit",
        town: home.id,
        tile: s.vertices[home.vertex].tiles[0],
        kind: "heavy",
        tier: 1,
        count,
      }).ok,
    ).toBe(false);
  },
);

it("AI and research commissions remain available after many launches in the same turn", () => {
  let { s, home, water } = fishingFixture();
  home.launched = 40;
  s.players[0].hand = [
    { id: `c${s.nextId++}`, kind: "patrol", tier: 2, bought: 0 },
  ];
  expect(researchUtility(s, "patrol")).toBeGreaterThan(0);
  s = run(s, { type: "play-research", card: s.players[0].hand[0].id });
  const offer = economyProjects(s).find(
    (p) =>
      p.action.type === "ship" &&
      p.action.tier === 2 &&
      !Object.values(p.cost).some(Boolean),
  );
  expect(offer).toBeDefined();
  const before = inventory(s);
  const next = run(s, offer!.action);
  expect(next.towns[home.id].launched).toBe(41);
  expect(inventory(next)).toEqual(before);
  expect(Object.values(next.pieces)[0].tile).toBe(water);
  assertInvariants(next);
});

it("bulk deployment preserves sequential warehouse rounding, vouchers and substitutes", async () => {
  const { execute } = await import("../src/game/engine");
  const { s, home, enemy } = maritimeFixture();
  s.towns.extra = {
    ...structuredClone(home),
    id: "extra",
    stock: { grain: 27, fish: 38, ore: 37, gold: 182 },
  };
  home.stock = { grain: 18, meat: 12, ore: 54, gold: 421 };
  enemy.stock = { gold: 77 };
  s.players[0].bonuses.recruits = [
    { tier: 2, classes: ["heavy"] },
    { tier: 1, classes: ["heavy"] },
    { tier: 1, classes: ["cavalry"] },
    { tier: 1, classes: ["heavy"] },
  ];
  const command = {
    type: "recruit",
    town: home.id,
    tile: "0,0",
    kind: "heavy",
    tier: 1,
  };
  const sequential = structuredClone(s),
    bulk = structuredClone(s);
  for (let i = 0; i < 100; i++) execute(sequential, command);
  execute(bulk, { ...command, count: 100 });
  expect({ ...bulk, events: [] }).toEqual({ ...sequential, events: [] });
  expect(bulk.events.at(-1)?.text).toContain("100 ×");
});

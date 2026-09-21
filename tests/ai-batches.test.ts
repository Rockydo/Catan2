import { describe, expect, it } from "vitest";
import { bankOrderToward, canFundAtBank } from "../src/game/ai-bank";
import { chooseAIAction, marginalValues } from "../src/game/ai";
import { chooseAIOrders } from "../src/game/ai-orders";
import {
  recruitmentBatch,
  recruitmentFundingCost,
} from "../src/game/ai-recruitment";
import { shipCost, unitCost } from "../src/game/content";
import { inventory, ownTowns } from "../src/game/selectors";
import { landAtVertex } from "../src/game/world";
import { GOODS, type Command, type Stock } from "../src/game/types";
import { funded, run } from "./helpers";
import { fishingFixture, maritimeFixture } from "./maritime-fixture";

const multiply = (stock: Stock, n: number): Stock =>
  Object.fromEntries(
    Object.entries(stock).map(([good, count]) => [good, count! * n]),
  );

function recruiting() {
  const { s, home } = maritimeFixture();
  home.stock = {};
  const command: Command = {
    type: "recruit",
    town: home.id,
    tile: landAtVertex(s, home.vertex)[0],
    kind: "heavy",
    tier: 1,
  };
  return { s, home, command };
}

describe("AI recruitment quantities", () => {
  it("fills its minimum guard in one order and then reconsiders economic development", () => {
    const s = funded();
    s.players[0].turns = 4;
    s.players[0].control = "standard";
    const c = chooseAIAction(s);
    expect(c).toMatchObject({ type: "recruit", count: 3 });
    const next = run(s, c);
    expect(Object.values(next.pieces)).toHaveLength(3);
    expect(chooseAIAction(next).type).not.toBe("recruit");
    for (const good of GOODS)
      expect((inventory(s)[good] ?? 0) - (inventory(next)[good] ?? 0)).toBe(
        (unitCost(c.kind as "heavy", c.tier!)[good] ?? 0) * 3,
      );
  });

  it("limits an order to its budget without spending resources during planning", () => {
    const { s, home, command } = recruiting();
    home.stock = multiply(unitCost("heavy", 1), 5);
    const before = JSON.stringify(s);
    const c = recruitmentBatch(s, command, 20);
    expect(c.count).toBe(5);
    expect(JSON.stringify(s)).toBe(before);
    const next = run(s, c);
    expect(Object.values(next.pieces)).toHaveLength(5);
    expect(Object.values(inventory(next)).every((n) => !n)).toBe(true);
    for (const unit of Object.values(next.pieces)) {
      expect(unit.born).toBe(s.players[s.active].turns);
      expect(unit.acted).toBe(true);
    }
  });

  it("counts free commissions and raw-resource substitutes in the same batch", () => {
    const { s, home, command } = recruiting();
    home.stock = { gold: 6 };
    s.players[0].bonuses.recruits = [
      { tier: 1, classes: ["heavy"] },
      { tier: 1, classes: ["heavy", "light"] },
      { tier: 2, classes: ["heavy"] },
    ];
    const cost = Object.values(unitCost("heavy", 1)).reduce(
      (a, b) => a + b!,
      0,
    );
    const expected = 2 + Math.floor(6 / cost);
    const c = recruitmentBatch(s, command, 20);
    expect(c.count).toBe(expected);
    const next = run(s, c);
    expect(next.players[0].bonuses.recruits).toEqual([
      { tier: 2, classes: ["heavy"] },
    ]);
    expect(inventory(next).gold ?? 0).toBe(6 - (expected - 2) * cost);
  });

  it("supports fleets larger than 100 and preserves unmatched ship commissions", () => {
    const { s, home, water } = fishingFixture();
    home.stock = multiply(shipCost("transport", 1), 110);
    s.players[0].bonuses.ships = [["transport"], ["transport"], ["galley"]];
    s.players[0].bonuses.shipTiers = [1, 1, 1];
    const c = recruitmentBatch(
      s,
      {
        type: "ship",
        town: home.id,
        tile: water,
        kind: "transport",
        tier: 1,
      },
      112,
    );
    expect(c.count).toBe(112);
    const next = run(s, c);
    expect(Object.values(next.pieces)).toHaveLength(112);
    expect(next.players[0].bonuses.ships).toEqual([["galley"]]);
    expect(next.towns[home.id].launched).toBe(112);
  });

  it("funds a complete affordable recruitment batch instead of one unit at a time", () => {
    const { s, home, command } = recruiting();
    home.stock = { planks: 48 };
    const values = marginalValues(s);
    const cost = recruitmentFundingCost(
      s,
      command,
      3,
      unitCost("heavy", 1),
      values,
    );
    expect(cost).toEqual(multiply(unitCost("heavy", 1), 3));
    let next = s;
    let trades = 0;
    while (!GOODS.every((g) => (inventory(next)[g] ?? 0) >= (cost[g] ?? 0))) {
      const trade = bankOrderToward(next, cost, inventory(next), values)!;
      expect(trade).not.toBeNull();
      expect(Object.values(trade.take!)[0]).toBeGreaterThan(1);
      next = run(next, trade);
      expect(++trades).toBeLessThan(5);
    }
    const batch = recruitmentBatch(next, command, 3);
    expect(batch.count).toBe(3);
    expect(Object.values(run(next, batch).pieces)).toHaveLength(3);
  });
});

describe("AI bank quantities", () => {
  it("buys the missing amount and keeps resources reserved for the planned recipe", () => {
    const { s, home } = maritimeFixture();
    home.stock = { lumber: 23 };
    const cost = { lumber: 3, grain: 5 };
    const c = bankOrderToward(s, cost, home.stock, marginalValues(s));
    expect(c).toEqual({
      type: "bank",
      give: { lumber: 20 },
      take: { grain: 5 },
    });
    expect(inventory(run(s, c!))).toMatchObject(cost);
    expect(canFundAtBank(s, cost, home.stock, marginalValues(s))).toBe(true);
    expect(
      canFundAtBank(s, { ...cost, grain: 6 }, home.stock, marginalValues(s)),
    ).toBe(false);
  });

  it("caps a trade at the available surplus", () => {
    const { s, home } = maritimeFixture();
    home.stock = { lumber: 11 };
    const c = bankOrderToward(
      s,
      { lumber: 3, grain: 10 },
      home.stock,
      marginalValues(s),
    );
    expect(c).toEqual({
      type: "bank",
      give: { lumber: 8 },
      take: { grain: 2 },
    });
    expect(inventory(run(s, c!)).lumber).toBe(3);
  });

  it("uses whole gold bars for odd raw deficits without spending reserved bars", () => {
    const { s, home } = maritimeFixture();
    home.stock = { goldbars: 4 };
    const c = bankOrderToward(
      s,
      { goldbars: 1, grain: 5 },
      home.stock,
      marginalValues(s),
    );
    expect(c).toEqual({
      type: "bank",
      give: { goldbars: 3 },
      take: { grain: 6 },
    });
    expect(inventory(run(s, c!))).toMatchObject({ goldbars: 1, grain: 6 });
  });
});

describe("AI worker order sequences", () => {
  it("replans every order, preserves state and stops before a non-economic action", () => {
    const s = funded();
    s.players[0].turns = 4;
    s.players[0].control = "standard";
    s.players[0].researchPurchases = 6;
    const before = JSON.stringify(s);
    const commands = chooseAIOrders(s, () => 0);
    expect(commands.length).toBeGreaterThan(1);
    expect(commands.length).toBeLessThanOrEqual(8);
    expect(JSON.stringify(s)).toBe(before);
    let view = s;
    for (const c of commands) {
      expect(c).toEqual(chooseAIAction(view));
      expect([
        "roll",
        "end-turn",
        "military",
        "move",
        "resolve-battle",
        "research",
        "offer-trade",
      ]).not.toContain(c.type);
      view = run(view, c);
      expect(view.active).toBe(s.active);
    }
    expect(view.actions).toBe(s.actions + commands.length);
  });

  it("yields once its time budget has elapsed", () => {
    const s = funded();
    s.players[0].turns = 4;
    s.players[0].control = "standard";
    let time = 0;
    expect(chooseAIOrders(s, () => (time += 200))).toHaveLength(1);
  });

  it("never batches dice rolls or human autoplay", () => {
    const s = funded();
    s.players[0].turns = 4;
    expect(chooseAIOrders(s, () => 0)).toHaveLength(1);
    s.players[0].control = "standard";
    s.phase = "roll";
    expect(chooseAIOrders(s, () => 0)).toEqual([{ type: "roll" }]);
  });
});

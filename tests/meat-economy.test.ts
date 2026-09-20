import { describe, expect, it } from "vitest";
import { maritimeFixture } from "./maritime-fixture";
import { guildFixture } from "./guild-fixture";
import { run } from "./helpers";
import { affordable, inventory, recipePayment } from "../src/game/selectors";
import { pay, production } from "../src/game/economy";
import { applyCommand } from "../src/game/engine";
import {
  campCost,
  extensionCost,
  extensionName,
  processedFor,
} from "../src/game/content";
import { RAW, type Stock } from "../src/game/types";
import { marketValues, tradeEvaluation } from "../src/game/ai-market";
import { marginalValues } from "../src/game/ai";
import { expeditionProspects } from "../src/game/ai-exploration";
import { LAND_RESOURCES } from "../src/game/world";
import { assertInvariants, deserialize, serialize } from "../src/game/save";

describe("Meat as a food substitute", () => {
  it("pays Grain first, then Fish, then Meat, keeping recipes unchanged", () => {
    const { s, home } = maritimeFixture();
    home.stock = { grain: 2, fish: 3, meat: 4, gold: 5 };
    const cost = { grain: 7 };
    expect(recipePayment(s, cost)).toEqual({ grain: 2, fish: 3, meat: 2 });
    expect(cost).toEqual({ grain: 7 });
    pay(s, cost);
    expect(home.stock).toEqual({ meat: 2, gold: 5 });
  });

  it("reserves explicitly requested Fish, Meat, Oil and Gold before substitution", () => {
    const { s, home } = maritimeFixture();
    home.stock = { grain: 1, fish: 2, meat: 3, coal: 1, oil: 2, gold: 4 };
    const cost = { grain: 5, fish: 1, meat: 1, coal: 3, oil: 1, gold: 1 };
    const payment = recipePayment(s, cost);
    expect(payment).toEqual({
      grain: 1,
      fish: 2,
      meat: 3,
      coal: 1,
      oil: 2,
      gold: 3,
    });
    expect(recipePayment(s, payment)).toEqual(payment);
    pay(s, cost);
    expect(home.stock).toEqual({ gold: 1 });
  });

  it("uses Gold only for the remaining shortage and never counts Meat twice", () => {
    const { s, home } = maritimeFixture();
    home.stock = { fish: 1, meat: 2, gold: 1 };
    expect(recipePayment(s, { grain: 4 })).toEqual({
      grain: 0,
      fish: 1,
      meat: 2,
      gold: 1,
    });
    expect(affordable(s, recipePayment(s, { grain: 4 }))).toBe(true);
    expect(affordable(s, recipePayment(s, { grain: 5 }))).toBe(false);
    expect(affordable(s, recipePayment(s, { grain: 3, meat: 2 }))).toBe(false);
    expect(affordable(s, recipePayment(s, { grain: 4, gold: 1 }))).toBe(false);
  });

  it("does not spend another faction's food or use food as currency for other resources", () => {
    const { s, home, enemy } = maritimeFixture();
    home.stock = { meat: 2 };
    enemy.stock = { meat: 10 };
    expect(affordable(s, recipePayment(s, { grain: 3 }))).toBe(false);
    expect(recipePayment(s, { grain: 3 }, enemy.owner)).toEqual({
      grain: 0,
      meat: 3,
    });
    expect(affordable(s, recipePayment(s, { stone: 1 }))).toBe(false);
    expect(affordable(s, recipePayment(s, { provisions: 1 }))).toBe(false);
  });

  it("matches exhaustive food budgets without overpaying or producing negative payments", () => {
    const { s, home } = maritimeFixture();
    for (let grain = 0; grain < 3; grain++)
      for (let fish = 0; fish < 3; fish++)
        for (let meat = 0; meat < 3; meat++)
          for (let gold = 0; gold < 3; gold++)
            for (let required = 0; required < 10; required++) {
              home.stock = { grain, fish, meat, gold };
              const payment = recipePayment(s, { grain: required });
              expect(Object.values(payment).every((n) => n >= 0)).toBe(true);
              expect(Object.values(payment).reduce((n, v) => n + v, 0)).toBe(
                required,
              );
              expect(affordable(s, payment)).toBe(
                required <= grain + fish + meat + gold,
              );
              expect(recipePayment(s, payment)).toEqual(payment);
            }
  });

  it("funds base city construction and batch recruitment with Meat", () => {
    let { s, home } = maritimeFixture();
    home.level = home.turnLevel = 1;
    home.stock = { ore: 3, meat: 2 };
    s = run(s, { type: "city", town: home.id });
    expect(s.towns[home.id].level).toBe(2);
    expect(Object.values(inventory(s)).every((n) => !n)).toBe(true);
    s.towns[home.id].stock = { ore: 6, grain: 1, fish: 1, meat: 1 };
    const target = s.vertices[home.vertex].tiles[0];
    s = run(s, {
      type: "recruit",
      town: home.id,
      kind: "heavy",
      tier: 1,
      tile: target,
      count: 3,
    });
    expect(Object.values(s.pieces).filter((u) => u.owner === 0)).toHaveLength(
      3,
    );
    expect(Object.values(inventory(s)).every((n) => !n)).toBe(true);
  });

  it("makes Meat a Smokehouse input and an Artisan input for Rations", () => {
    expect(processedFor("meat")).toBe("provisions");
    expect(extensionName("meat")).toBe("Smokehouse");
    for (const tier of [1, 2, 3])
      expect(extensionCost("meat", tier)).toEqual(extensionCost("fish", tier));
    for (const tier of [1, 2, 3]) {
      const { s, home } = guildFixture("artisans", tier);
      home.stock = { meat: 2, coal: 1, coke: 1 };
      const after = run(s, {
        type: "guild-order",
        town: home.id,
        tier,
        kind: "meat",
      });
      expect(inventory(after).provisions).toBe([0, 2, 5, 8][tier]);
      expect(inventory(after).meat ?? 0).toBe(0);
    }
    expect(campCost("meat")).toEqual({ stone: 1, ore: 1 });
    expect(campCost("meat", 2)).toEqual({ planks: 1, steel: 1 });
  });

  it("keeps named trades exact while accepting Meat as a raw bank good", () => {
    const { s, home } = maritimeFixture();
    home.stock = { meat: 4 };
    const before = structuredClone(s);
    expect(
      applyCommand(s, { type: "bank", give: { grain: 4 }, take: { ore: 1 } })
        .ok,
    ).toBe(false);
    expect(s).toEqual(before);
    const after = run(s, { type: "bank", give: { meat: 4 }, take: { ore: 1 } });
    expect(after.towns[home.id].stock).toEqual({ ore: 1 });
  });

  it("values Meat as Grain and protects upcoming food needs in AI trades", () => {
    const { s, home } = maritimeFixture();
    for (const town of Object.values(s.towns)) town.stock = {};
    const scarce = marginalValues(s).grain;
    home.stock = { meat: 20 };
    const prices = marketValues(s),
      values = marginalValues(s);
    expect(prices.meat).toBe(prices.grain);
    expect(values.meat).toBe(values.grain);
    expect(values.grain).toBeLessThan(scarce);
    const ordinary = tradeEvaluation(s, 0, { ore: 1 }, { meat: 2 }, {}, prices);
    const reserved = tradeEvaluation(
      s,
      0,
      { ore: 1 },
      { meat: 2 },
      { grain: 20 },
      prices,
    );
    expect(reserved.loss).toBeGreaterThan(ordinary.loss);
    expect(
      tradeEvaluation(s, 0, { ore: 1 }, { grain: 2 }, {}, prices).loss,
    ).toBe(Infinity);
  });

  it("treats mixed Meat/Fish production as food for expedition planning", () => {
    const { s } = maritimeFixture();
    const grain = expeditionProspects(s, { grain: 1, coal: 1 });
    const meat = expeditionProspects(s, { meat: 0.6, fish: 0.4, oil: 1 });
    expect(meat.missing).toBe(grain.missing);
    for (const vertex of Object.keys(s.vertices))
      expect(meat.score(vertex)).toBe(grain.score(vertex));
  });

  it("round-trips Meat stock without giving old terrain free new production", () => {
    const { s, home } = maritimeFixture();
    expect(RAW).toContain("meat");
    expect(LAND_RESOURCES).not.toContain("meat");
    home.stock = { meat: 7 };
    const loaded = deserialize(serialize(s));
    assertInvariants(loaded);
    expect(loaded.towns[home.id].stock.meat).toBe(7);
    production(loaded, 7);
    expect(loaded.towns[home.id].stock.meat).toBe(7);
    const bad: Stock = { meat: -1 };
    loaded.towns[home.id].stock = bad;
    expect(() => assertInvariants(loaded)).toThrow(/quantities/);
  });
});

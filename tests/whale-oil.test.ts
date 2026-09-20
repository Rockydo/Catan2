import { syncEmergencyCoalition } from "../src/game/emergency-coalition";
import { it, expect } from "vitest";
import { fishingFixture } from "./maritime-fixture";
import { guildFixture } from "./guild-fixture";
import { piece, run } from "./helpers";
import { applyCommand } from "../src/game/engine";
import { production } from "../src/game/economy";
import {
  inventory,
  recipePayment,
  productionSources,
  income,
} from "../src/game/selectors";
import { tileGoods } from "../src/game/maritime";
import { processedFor } from "../src/game/content";
import { marketValues, tradeEvaluation } from "../src/game/ai-market";
import { marginalValues } from "../src/game/ai";
import { deserialize, serialize, assertInvariants } from "../src/game/save";
import { LAND_RESOURCES, PORT_RESOURCES } from "../src/game/world";

it.each([1, 2, 3, 4])(
  "tier %i fishing ships harvest both goods from their own and adjacent Whale tiles",
  (tier) => {
    const { s, water, edge } = fishingFixture();
    for (const id of edge.tiles) {
      delete s.tiles[id].fish;
      s.tiles[id].whale = true;
    }
    const output = (good: "oil" | "hides") =>
      productionSources(s)
        .filter((p) => p.owner === 0 && p.good === good)
        .reduce((n, p) => n + p.amount, 0);
    const before = { oil: output("oil"), hides: output("hides") };
    piece(s, water, 0, "fishing", tier);
    expect(output("oil") - before.oil).toBe(2 * tier);
    expect(output("hides") - before.hides).toBe(2 * tier);
    expect(income(s).oil).toBe(income(s).hides);
    const stocks = inventory(s);
    production(s, 7);
    expect(inventory(s).oil! - stocks.oil!).toBe(output("oil"));
    expect(inventory(s).hides! - stocks.hides!).toBe(output("hides"));
    assertInvariants(deserialize(serialize(s)));
  },
);

it("rejects unnamed Oil terrain and Oil ports, and produces no Oil from ordinary Hides or Fish", () => {
  const { s, water, home } = fishingFixture();
  expect(tileGoods(s.tiles[water])).toEqual(["fish"]);
  const land = s.vertices[home.vertex].tiles.find(
    (id) => s.tiles[id].resource !== "water",
  )!;
  s.tiles[land].resource = "hides";
  expect(tileGoods(s.tiles[land])).toEqual(["hides"]);
  expect(productionSources(s).some((p) => p.good === "oil")).toBe(false);
  expect(LAND_RESOURCES).not.toContain("oil");
  expect(PORT_RESOURCES).not.toContain("oil");
  s.tiles[land].resource = "oil";
  expect(() => assertInvariants(s)).toThrow(
    /Oil terrain must be Sunflower fields/,
  );
});

it("pays Coal before Oil, combines substitutes and reserves explicitly requested cards", () => {
  const { s, home } = fishingFixture();
  home.stock = { coal: 2, oil: 3, grain: 1, fish: 2 };
  expect(recipePayment(s, { coal: 4, grain: 3 })).toEqual({
    coal: 2,
    oil: 2,
    grain: 1,
    fish: 2,
  });
  expect(recipePayment(s, { coal: 1 })).toEqual({ coal: 1 });
  home.stock = { coal: 1, oil: 2 };
  expect(recipePayment(s, { coal: 2, oil: 2 })).toEqual({ coal: 2, oil: 2 });
});

it("builds and operates industrial guilds with Oil instead of missing Coal", () => {
  let { s, home } = guildFixture("artisans", 1);
  home.stock = { stone: 4, coal: 1, oil: 1, planks: 2 };
  s = run(s, { type: "guild", town: home.id, kind: "artisans" });
  expect(s.towns[home.id].guild!.tier).toBe(2);
  expect(Object.values(inventory(s)).every((n) => !n)).toBe(true);
  const f = guildFixture("farmers", 2);
  f.home.stock = { salt: 1, oil: 1 };
  const after = run(f.s, {
    type: "guild-order",
    town: f.home.id,
    tier: 2,
    tile: f.land,
  });
  expect(inventory(after).grain).toBe(12);
  expect(inventory(after).oil ?? 0).toBe(0);
});

it("Oil refines into Fuel, but named trades never substitute Coal automatically", () => {
  let { s, home } = guildFixture("artisans", 1);
  home.stock = { oil: 2 };
  expect(processedFor("oil")).toBe("coke");
  s = run(s, { type: "guild-order", town: home.id, tier: 1, kind: "oil" });
  expect(inventory(s).coke).toBe(2);
  s.towns[home.id].stock = { oil: 4 };
  expect(
    applyCommand(s, { type: "bank", give: { coal: 4 }, take: { grain: 1 } }).ok,
  ).toBe(false);
  s = run(s, { type: "bank", give: { oil: 4 }, take: { grain: 1 } });
  expect(inventory(s).grain).toBe(1);
  expect(inventory(s).oil ?? 0).toBe(0);
});

it("AI values Oil as Coal, treats it as a planned reserve and counts Whale production", () => {
  const { s, home, water } = fishingFixture();
  for (const town of Object.values(s.towns)) town.stock = {};
  const scarce = marginalValues(s).coal;
  home.stock = { oil: 20 };
  const values = marketValues(s);
  expect(values.oil).toBe(values.coal);
  expect(marginalValues(s).oil).toBe(marginalValues(s).coal);
  expect(marginalValues(s).coal).toBeLessThan(scarce);
  const ordinary = tradeEvaluation(s, 0, { hides: 1 }, { oil: 2 }, {}, values);
  const reserved = tradeEvaluation(
    s,
    0,
    { hides: 1 },
    { oil: 2 },
    { coal: 20 },
    values,
  );
  expect(reserved.loss).toBeGreaterThan(ordinary.loss);
  delete s.tiles[water].fish;
  s.tiles[water].whale = true;
  expect(income(s).oil).toBeGreaterThan(0);
});

it("existing saves need no Oil balance migration and gain Oil only on future harvests", () => {
  const { s, home, water } = fishingFixture();
  delete s.tiles[water].fish;
  s.tiles[water].whale = true;
  for (const town of Object.values(s.towns)) delete town.stock.oil;
  syncEmergencyCoalition(s);
  const loaded = deserialize(serialize(s));
  expect(loaded).toEqual(s);
  expect(inventory(loaded).oil ?? 0).toBe(0);
  production(loaded, 7);
  expect(loaded.towns[home.id].stock.oil).toBe(home.level);
});

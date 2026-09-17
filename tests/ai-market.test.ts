import { expect, it } from "vitest";
import { funded, piece, run } from "./helpers";
import { ownTowns } from "../src/game/selectors";
import { landAtVertex } from "../src/game/world";
import {
  marketValues,
  marketStockValue,
  tradeEvaluation,
} from "../src/game/ai-market";
import { chooseAIAction, shouldAcceptTrade } from "../src/game/ai";
import { tradeFixture } from "./trade-fixture";

it("lowers a good's market value when any faction builds large stockpiles", () => {
  const s = funded(),
    before = marketValues(s);
  ownTowns(s, 3)[0].stock.salt = 100000;
  expect(marketValues(s).salt).toBeLessThan(before.salt);
  expect(marketValues(s).salt).toBeGreaterThan(0);
});
it("values actual probability-weighted production, industries and camps, including occupation", () => {
  const s = funded();
  for (const t of Object.values(s.towns)) t.stock = {};
  const town = ownTowns(s, 3)[0],
    tile = landAtVertex(s, town.vertex)[0];
  s.tiles[tile].resource = "salt";
  s.tiles[tile].number = 7;
  const before = marketValues(s);
  town.level = 4;
  town.extensions[tile] = 3;
  const edge = s.tiles[tile].edges[0];
  s.routes[edge] = {
    id: edge,
    edge,
    owner: 3,
    kind: "road",
    born: 0,
    camps: { [tile]: 2 },
  };
  const expanded = marketValues(s);
  expect(expanded.salt).toBeLessThan(before.salt);
  expect(expanded.reagents).toBeLessThan(before.reagents);
  piece(s, tile, 1);
  expect(marketValues(s).reagents).toBeGreaterThan(expanded.reagents);
});
it("protects upcoming inputs and values an incoming project deficit more than spare cards", () => {
  const s = funded(),
    town = ownTowns(s)[0];
  for (const t of ownTowns(s)) t.stock = {};
  town.stock = { stone: 2, salt: 1 };
  const prices = marketValues(s);
  const ordinary = tradeEvaluation(
    s,
    0,
    { hides: 1 },
    { stone: 1 },
    {},
    prices,
  );
  expect(
    tradeEvaluation(s, 0, { hides: 1 }, { stone: 1 }, { stone: 2 }, prices)
      .loss,
  ).toBeGreaterThan(ordinary.loss);
  expect(
    tradeEvaluation(s, 0, { hides: 1 }, { stone: 1 }, { hides: 1 }, prices)
      .gain,
  ).toBeGreaterThan(ordinary.gain);
  const first = tradeEvaluation(s, 0, {}, { stone: 1 }, {}, prices).loss;
  town.stock.stone = 1;
  expect(
    tradeEvaluation(s, 0, {}, { stone: 1 }, {}, prices).loss,
  ).toBeGreaterThan(first);
});
it("offers useful whole-card bundles near shared market value, with identical acceptance criteria", () => {
  const s = tradeFixture(),
    action = chooseAIAction(s);
  expect(action.type).toBe("offer-trade");
  const prices = marketValues(s);
  const ratio =
    marketStockValue(action.give!, prices) /
    marketStockValue(action.take!, prices);
  expect(ratio).toBeGreaterThanOrEqual(0.8);
  expect(ratio).toBeLessThanOrEqual(1.25);
  expect(shouldAcceptTrade(run(s, action))).toBe(true);
});
it("does not price goods using hidden research identities, RNG or unseen terrain", () => {
  const s = funded(),
    before = marketValues(s);
  s.rng = 123;
  s.deckRng = 456;
  s.seed = "unrelated future map";
  s.players[1].hand = [{ id: "secret", kind: "charter", tier: 3, bought: 0 }];
  expect(marketValues(s)).toEqual(before);
});

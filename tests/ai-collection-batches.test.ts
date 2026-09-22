import { expect, it } from "vitest";
import {
  collectionBatchSize,
  recruitmentBatch,
  recruitmentFundingCost,
} from "../src/game/ai-recruitment";
import { fishingFixture } from "./maritime-fixture";
import { piece, run } from "./helpers";
import { inventory, ownPieces } from "../src/game/selectors";
import { unitCost, shipCost } from "../src/game/content";
import { marginalValues } from "../src/game/ai";
import { bankOrderToward } from "../src/game/ai-bank";
import type { Command } from "../src/game/types";

it.each(["merchant", "fishing", "merchantship"] as const)(
  "funds and builds a mature %s operation in bulk, with exact payments",
  (kind) => {
    let { s, home, water } = fishingFixture();
    const naval = kind !== "merchant";
    const tile = naval
      ? water
      : s.vertices[home.vertex].tiles.find(
          (id) => s.tiles[id].resource !== "water",
        )!;
    for (let n = 0; n < 500; n++) piece(s, tile, 0, kind, 4);
    // Only currency is initially available, so bank imports are necessary.
    home.stock = { gold: 10000 };
    const desired = collectionBatchSize(500 * 4, 4);
    expect(desired).toBe(25);
    const action: Command = {
      type: naval ? "ship" : "recruit",
      town: home.id,
      tile,
      kind,
      tier: 4,
    };
    const unitRecipe = naval ? shipCost(kind, 4) : unitCost(kind, 4);
    const funding = recruitmentFundingCost(
      s,
      action,
      desired,
      unitRecipe,
      marginalValues(s),
    );
    for (let n = 0; n < 30; n++) {
      const trade = bankOrderToward(
        s,
        funding,
        inventory(s),
        marginalValues(s),
      );
      if (!trade) break;
      s = run(s, trade);
    }
    const order = recruitmentBatch(s, action, desired);
    expect(order.count).toBe(25);
    const before = inventory(s);
    let sequential = s;
    for (let n = 0; n < desired; n++) sequential = run(sequential, action);
    const batched = run(s, order);
    expect(inventory(batched)).toEqual(inventory(sequential));
    expect(inventory(batched)).not.toEqual(before);
    expect(ownPieces(batched)).toHaveLength(525);
    expect(ownPieces(batched)).toEqual(ownPieces(sequential));
  },
);
it("keeps early purchases precise and reevaluates mature capacity in small proportional steps", () => {
  for (const tier of [1, 2, 3, 4]) {
    expect(collectionBatchSize(0, tier)).toBe(1);
    expect(collectionBatchSize(15, tier)).toBe(1);
    for (const existing of [200, 800, 10000])
      expect(collectionBatchSize(existing, tier) * tier).toBeLessThanOrEqual(
        existing * 0.05,
      );
  }
});

it("keeps a funded collection plan through imports and worker boundaries, without spending twice", async () => {
  const { planAIOrders } = await import("../src/game/ai-orders");
  const { deserialize, serialize, assertInvariants } =
    await import("../src/game/save");
  const { s: initial, home } = fishingFixture();
  initial.players[0].control = "standard";
  initial.players[0].turns = 15;
  initial.players[0].tradeOffered = true;
  home.stock = { gold: 2000 };
  // Evaluate a real mature empire, not a mocked planner. Every published batch
  // must be exactly reproducible by the ordinary public commands it contains.
  const tile = initial.vertices[home.vertex].tiles.find(
    (id) => initial.tiles[id].resource !== "water",
  )!;
  for (let n = 0; n < 200; n++) piece(initial, tile, 0, "merchant", 4);
  let s = initial;
  const before = JSON.stringify(s);
  let orders = 0;
  for (let i = 0; i < 10 && s.active === 0; i++) {
    const plan = planAIOrders(
      s,
      (() => {
        let time = 0;
        return () => (time += 200);
      })(),
    );
    expect(plan.commands.length).toBe(1);
    let replay = s;
    for (const command of plan.commands) replay = run(replay, command);
    expect(plan.state).toEqual(replay);
    s = structuredClone(plan.state); // Real worker messages have new identities.
    orders += plan.commands.length;
  }
  expect(orders).toBeGreaterThan(1);
  expect(JSON.stringify(initial)).toBe(before);
  assertInvariants(deserialize(serialize(s)));
});

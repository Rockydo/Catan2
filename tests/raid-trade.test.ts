import { it, expect } from "vitest";
import { funded, piece, run, nextOwnerTurn } from "./helpers";
import { applyCommand, beginTurn } from "../src/game/engine";
import {
  chooseAIAction,
  playerTradeToward,
  shouldAcceptTrade,
} from "../src/game/ai";
import {
  ownTowns,
  nearestTown,
  inventory,
  sumStock,
} from "../src/game/selectors";
import { landAtVertex } from "../src/game/world";
import { production } from "../src/game/economy";
import { serialize, deserialize, assertInvariants } from "../src/game/save";
import { GOODS } from "../src/game/types";
import { tradeFixture } from "./trade-fixture";

it("repeated raids take newly produced goods once per turn and preserve the first raid authorization", () => {
  let s = funded();
  const target = ownTowns(s, 1)[0],
    tiles = landAtVertex(s, target.vertex),
    origin = tiles[0];
  target.level = target.turnLevel = 4;
  const cannon = piece(s, origin, 0, "artillery", 3),
    guard = piece(s, origin, 0, "heavy", 1),
    second = piece(s, origin, 0, "heavy", 1);
  s.phase = "military";
  s = run(s, { type: "siege", town: target.id, ids: [cannon.id] });
  const first = s.sieges[`0:${target.id}`].raided;
  expect(s.towns[target.id].stock).toEqual({});
  expect(
    applyCommand(s, { type: "siege", town: target.id, ids: [guard.id] }).ok,
  ).toBe(false);
  for (let turn = 0; turn < 2; turn++) {
    nextOwnerTurn(s);
    expect(
      applyCommand(s, { type: "siege", town: target.id, ids: [guard.id] })
        .error,
    ).toContain("No new resources");
    for (const id of tiles) s.tiles[id].number = 7;
    production(s, 7);
    const goods = { ...s.towns[target.id].stock },
      destination = nearestTown(s, origin, 0)!;
    expect(sumStock(goods)).toBeGreaterThan(0);
    const before = { ...destination.stock };
    s = run(s, { type: "siege", town: target.id, ids: [guard.id] });
    for (const [g, n] of Object.entries(goods))
      expect(s.towns[destination.id].stock[g as keyof typeof goods]).toBe(
        (before[g as keyof typeof goods] ?? 0) + n!,
      );
    expect(s.towns[target.id].stock).toEqual({});
    expect(s.sieges[`0:${target.id}`].raided).toBe(first);
    expect(
      applyCommand(s, {
        type: "destroy-town",
        town: target.id,
        ids: [second.id],
      }).ok,
    ).toBe(false);
    s = deserialize(serialize(s));
  }
  nextOwnerTurn(s);
  s = run(s, { type: "destroy-town", town: target.id, ids: [guard.id] });
  expect(s.towns[target.id]).toBeUndefined();
  assertInvariants(s);
});

it("defending reinforcements stop repeat raids and skipping an operation resets authorization", () => {
  let s = funded();
  const t = ownTowns(s, 1)[0],
    tiles = landAtVertex(s, t.vertex),
    u = piece(s, tiles[0]);
  s.phase = "military";
  s = run(s, { type: "siege", town: t.id, ids: [u.id] });
  nextOwnerTurn(s);
  s.towns[t.id].stock = { grain: 4 };
  const defended = structuredClone(s);
  piece(defended, tiles[1], 1);
  expect(
    applyCommand(defended, { type: "siege", town: t.id, ids: [u.id] }).ok,
  ).toBe(false);
  s = run(s, { type: "end-turn" });
  expect(s.sieges[`0:${t.id}`]).toBeUndefined();
});

it("AI proposes a feasible, mutually useful player trade before importing at the bank", () => {
  const s = tradeFixture(),
    action = chooseAIAction(s);
  expect(action.type).toBe("offer-trade");
  expect(action.partner).toBe(0);
  const pending = run(s, action);
  expect(shouldAcceptTrade(pending)).toBe(true);
  expect(inventory(pending, 0)).toEqual(inventory(s, 0));
  expect(pending.players[1].tradeOffered).toBe(true);
  const accepted = run(pending, {
    type: "respond-trade",
    actor: 0,
    mode: "accept",
  });
  expect(inventory(accepted, 1)).not.toEqual(inventory(s, 1));
  expect(chooseAIAction(accepted).type).toBe("recruit");
});

it("declining an AI offer spends nothing, persists its spam limit and allows a new offer next turn", () => {
  const s = tradeFixture(),
    pending = run(s, chooseAIAction(s));
  const declined = run(pending, {
    type: "respond-trade",
    actor: 0,
    mode: "decline",
  });
  expect(inventory(declined, 0)).toEqual(inventory(s, 0));
  expect(inventory(declined, 1)).toEqual(inventory(s, 1));
  const restored = deserialize(serialize(declined));
  expect(playerTradeToward(restored, { grain: 1 })).toBeNull();
  expect(chooseAIAction(restored).type).toBe("bank");
  beginTurn(restored);
  restored.phase = "economy";
  expect(chooseAIAction(restored).type).toBe("offer-trade");
});

it.each([1, 4])(
  "destroying a level-%i town collects every replenished good into the nearest friendly warehouse",
  (level) => {
    let s = funded();
    const target = ownTowns(s, 1)[0];
    target.level = target.turnLevel = level;
    const origin = landAtVertex(s, target.vertex)[0];
    const unit = piece(s, origin, 0, "artillery", 4);
    s = run(s, { type: "siege", town: target.id, ids: [unit.id] });
    nextOwnerTurn(s);
    const loot = Object.fromEntries(GOODS.map((g, i) => [g, i + 1]));
    s.towns[target.id].stock = { ...loot };
    const destination = nearestTown(s, origin, 0)!;
    const warehouses = structuredClone(s.towns);
    const before = inventory(s, 0);
    s = deserialize(serialize(s));
    s = run(s, { type: "destroy-town", town: target.id, ids: [unit.id] });
    expect(s.towns[target.id]).toBeUndefined();
    for (const g of GOODS) {
      expect(s.towns[destination.id].stock[g]).toBe(
        (warehouses[destination.id].stock[g] ?? 0) + loot[g],
      );
      expect(inventory(s, 0)[g]).toBe((before[g] ?? 0) + loot[g]);
    }
    for (const town of Object.values(s.towns)) {
      if (town.id !== destination.id)
        expect(town.stock).toEqual(warehouses[town.id].stock);
    }
    expect(
      s.events.filter((e) => e.townAttack).at(-1)?.townAttack,
    ).toMatchObject({ kind: "destroy", goods: loot });
    const rejected = applyCommand(s, {
      type: "destroy-town",
      town: target.id,
      ids: [unit.id],
    });
    expect(rejected.ok).toBe(false);
    expect(inventory(s, 0)).toEqual(inventory(deserialize(serialize(s)), 0));
    assertInvariants(s);
  },
);

import { expect, it } from "vitest";
import { maritimeFixture } from "./maritime-fixture";
import { piece, run, nextOwnerTurn } from "./helpers";
import { applyCommand } from "../src/game/engine";
import { breakSieges } from "../src/game/military";
import { shipStats } from "../src/game/content";
import { siegePower, siegeRequirement, inventory } from "../src/game/selectors";
import { siegeParticipants, townSiegeStatuses } from "../src/game/siege-status";
import { chooseAIAction, economyProjects } from "../src/game/ai";
import { serialize, deserialize } from "../src/game/save";
import type { ShipClass } from "../src/game/types";

function fixture(kind: ShipClass = "carrack", tier = 1) {
  const f = maritimeFixture();
  for (const tile of ["0,0", "1,0", "2,0", "3,0"])
    f.s.tiles[tile].resource = "water";
  const ship = piece(f.s, "3,0", 0, kind, tier);
  return {
    ...f,
    ship,
    action: { type: "siege", town: f.enemy.id, ids: [ship.id] },
  };
}

it("carracks and advanced frigates carry batteries; civilians and transports never do", () => {
  expect([1, 2, 3, 4].map((t) => shipStats("carrack", t).siege)).toEqual([
    1, 2, 3, 4,
  ]);
  expect([1, 2, 3, 4].map((t) => shipStats("galley", t).siege)).toEqual([
    0, 0, 1, 2,
  ]);
  for (const kind of [
    "transport",
    "convoy",
    "fishing",
    "merchantship",
    "settlership",
  ] as const)
    for (const tier of kind === "settlership" ? [1] : [1, 2, 3, 4]) {
      const { s, action } = fixture(kind, tier);
      expect(shipStats(kind, tier).siege).toBe(0);
      expect(applyCommand(s, action).ok).toBe(false);
    }
  for (const tier of [1, 2]) {
    const { s, action } = fixture("galley", tier);
    expect(applyCommand(s, action).ok).toBe(false);
  }
});

it("a coastal raid spends one movement point and destruction next turn captures new stocks", () => {
  let { s, ship, enemy, action } = fixture();
  enemy.stock = { gold: 7, steel: 2 };
  const before = inventory(s);
  s = run(s, action);
  expect(inventory(s).gold).toBe((before.gold ?? 0) + 7);
  expect(s.towns[enemy.id].stock).toEqual({});
  expect(s.pieces[ship.id]).toMatchObject({ moved: 1, acted: false });
  expect(siegeParticipants(s, s.towns[enemy.id], 0).map((u) => u.id)).toEqual([
    ship.id,
  ]);
  expect(applyCommand(s, action).ok).toBe(false);
  const destroy = { ...action, type: "destroy-town" };
  expect(applyCommand(s, destroy).ok).toBe(false);
  s = deserialize(serialize(s));
  nextOwnerTurn(s);
  s.towns[enemy.id].stock = { goldbars: 4 };
  const goldbars = inventory(s).goldbars ?? 0;
  s = run(s, destroy);
  expect(s.towns[enemy.id]).toBeUndefined();
  expect(inventory(s).goldbars).toBe(goldbars + 4);
  expect(s.pieces[ship.id].acted).toBe(true);
});

it("naval equipment reduces normal fortification delay and only pools within one fleet", () => {
  let { s, enemy, ship, action } = fixture("carrack", 2);
  enemy.level = enemy.turnLevel = 4;
  enemy.wall = 2; // Five turns without a battery; three with this ship.
  expect(siegeRequirement(s, enemy, [ship])).toBe(3);
  for (let progress = 1; progress <= 3; progress++) {
    s = run(s, action);
    expect(s.sieges[`0:${enemy.id}`].progress).toBe(progress);
    expect(s.sieges[`0:${enemy.id}`].raided).toBeNull();
    nextOwnerTurn(s);
  }
  s = run(s, action);
  expect(s.sieges[`0:${enemy.id}`].raided).toBe(s.players[0].turns);

  const other = fixture("carrack", 4);
  other.enemy.level = other.enemy.turnLevel = 4;
  other.enemy.wall = 2;
  const secondSea = other.s.vertices[other.enemy.vertex].tiles.find(
    (t) => t !== "3,0",
  )!;
  other.s.tiles[secondSea].resource = "water";
  const distant = piece(other.s, secondSea, 0, "carrack", 4);
  other.s.sieges[`0:${other.enemy.id}`] = {
    owner: 0,
    town: other.enemy.id,
    progress: 0,
    last: -1,
    raided: null,
  };
  expect(townSiegeStatuses(other.s, other.enemy)[0].required).toBe(1);
  expect(
    applyCommand(other.s, { ...other.action, ids: [other.ship.id, distant.id] })
      .ok,
  ).toBe(false);
  const frigate = piece(other.s, other.ship.tile, 0, "galley", 3);
  expect(siegePower([other.ship, frigate])).toBe(5);
  const raid = run(other.s, {
    ...other.action,
    ids: [other.ship.id, frigate.id],
  });
  expect(raid.sieges[`0:${other.enemy.id}`].raided).toBe(10);
});

it("coastal armies, fleets and frozen water prevent naval operations", () => {
  for (const naval of [false, true]) {
    const { s, enemy, action } = fixture();
    const tile = s.vertices[enemy.vertex].tiles.find((t) => t !== "3,0")!;
    if (naval) s.tiles[tile].resource = "water";
    piece(s, tile, 1, naval ? "galley" : "heavy");
    expect(applyCommand(s, action).error).toContain(
      "Defeat every defending army and fleet",
    );
  }
  const { s, ship, action } = fixture();
  s.tiles[ship.tile].surface = "frozen";
  expect(applyCommand(s, action).ok).toBe(false);
  delete s.tiles[ship.tile].surface;
  ship.seasonStatus = "icebound";
  expect(applyCommand(s, action).ok).toBe(false);
  delete ship.seasonStatus;
  ship.tile = "0,0";
  expect(applyCommand(s, action).ok).toBe(false);
});

it("a siege breaks when its last battery withdraws, freezes or gains a defending fleet", () => {
  for (const change of ["withdraw", "freeze", "guard"] as const) {
    let { s, enemy, ship, action } = fixture("carrack", 2);
    enemy.level = enemy.turnLevel = 4;
    enemy.wall = 2;
    const escort = piece(s, ship.tile, 0, "galley", 1);
    s = run(s, action);
    if (change === "withdraw") s.pieces[ship.id].tile = "0,0";
    if (change === "freeze") s.tiles[ship.tile].surface = "frozen";
    if (change === "guard") {
      const tile = s.vertices[enemy.vertex].tiles.find((t) => t !== ship.tile)!;
      s.tiles[tile].resource = "water";
      piece(s, tile, 1, "galley");
    }
    breakSieges(s);
    expect(s.sieges[`0:${enemy.id}`]).toBeUndefined();
    expect(s.pieces[escort.id]).toBeDefined();
  }
});

it("AI raids, holds an unfinished naval siege, and recruits batteries for exposed coasts", () => {
  let { s, enemy, ship } = fixture("carrack", 2);
  s.players[0].control = "standard";
  enemy.level = enemy.turnLevel = 4;
  enemy.wall = 2;
  expect(chooseAIAction(s)).toMatchObject({
    type: "siege",
    town: enemy.id,
    ids: [ship.id],
  });
  s = run(s, chooseAIAction(s));
  const action = chooseAIAction(s);
  expect(action.type === "move" && action.ids?.includes(ship.id)).toBeFalsy();

  const recruit = fixture();
  recruit.s.players[0].control = "standard";
  recruit.s.pieces = {};
  expect(
    economyProjects(recruit.s).some(
      (p) =>
        p.action.type === "ship" &&
        p.action.kind === "carrack" &&
        p.action.tier === 1,
    ),
  ).toBe(true);
  const approach = fixture("carrack", 2);
  approach.s.players[0].control = "standard";
  approach.ship.tile = "0,0";
  expect(chooseAIAction(approach.s)).toMatchObject({
    type: "move",
    ids: [approach.ship.id],
  });
});

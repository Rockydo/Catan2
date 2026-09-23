import { expect, it, vi } from "vitest";
import { applyCommand, eliminate, execute } from "../src/game/engine";
import { breakSieges } from "../src/game/military";
import { syncEmergencyCoalition } from "../src/game/emergency-coalition";
import { pruneAlliances } from "../src/game/diplomacy";
import {
  allPieces,
  moveTargets,
  withPlanningFrame,
} from "../src/game/selectors";
import type { Command, Game } from "../src/game/types";
import { allianceFixture } from "./alliance-fixture";
import { piece } from "./helpers";
import { maritimeFixture } from "./maritime-fixture";

// Compare the optimized post-order scope with the original independent reads.
// This deliberately starts a new index for every cleanup operation.
function compare(s: Game, command: Command) {
  const original = JSON.stringify(s),
    expected = structuredClone(s);
  if (expected.phase === "military") expected.phase = "economy";
  expected.actions++;
  execute(expected, command);
  breakSieges(expected);
  eliminate(expected);
  syncEmergencyCoalition(expected);
  const actual = applyCommand(s, command);
  expect(actual.ok, actual.error).toBe(true);
  expect(JSON.stringify(actual.state)).toBe(JSON.stringify(expected));
  expect(JSON.stringify(s)).toBe(original);
  return actual.state;
}

it("keeps exact cleanup and coalition results after spending, upgrades and bulk recruitment", () => {
  let { s, towns } = allianceFixture();
  const home = towns[0];
  const commands: Command[] = [
    { type: "bank", give: { gold: 1 }, take: { lumber: 1 } },
    { type: "wall", town: home.id },
    { type: "city", town: home.id },
    { type: "recruit", town: home.id, tile: "-2,0", kind: "heavy", count: 100 },
    { type: "bank", give: { gold: 1 }, take: { ore: 1 } },
  ];
  for (const command of commands) s = compare(s, command);
  expect(s.alliances?.[0]).toMatchObject({ emergency: "locked", threat: 0 });
});

it("reads arriving guards before breaking town and watchtower sieges", () => {
  const { s, towns } = allianceFixture();
  s.pieces = {};
  const home = towns[0],
    attacker = piece(
      s,
      s.vertices[home.vertex].tiles.find((id) => id !== "-2,0")!,
      1,
    ),
    guard = piece(s, "-4,0", 0, "cavalry");
  s.sieges = {
    home: { owner: 1, town: home.id, progress: 1, last: 9, raided: null },
  };
  s.towers[home.vertex] = {
    id: "tower-test",
    vertex: home.vertex,
    owner: 0,
    tier: 2,
  };
  s.towerSieges = {
    home: {
      owner: 1,
      tower: "tower-test",
      vertex: home.vertex,
      progress: 0,
      last: 9,
      units: [attacker.id],
    },
  };
  const next = compare(s, { type: "move", ids: [guard.id], to: "-2,0" });
  expect(next.sieges).toEqual({});
  expect(next.towerSieges).toEqual({});
});

it("rebuilds after elimination instead of retaining the removed faction's forces or withdrawal rights", () => {
  const { s, towns } = allianceFixture();
  delete s.towns[towns[2].id];
  for (let i = 0; i < 100; i++) piece(s, "0,0", 2, "heavy", 4);
  piece(s, "0,0", 0);
  s.withdrawals = [{ tile: "0,0", owners: [0, 2] }];
  const next = compare(s, {
    type: "bank",
    give: { gold: 1 },
    take: { lumber: 1 },
  });
  expect(next.players[2].alive).toBe(false);
  expect(Object.values(next.pieces).some((unit) => unit.owner === 2)).toBe(
    false,
  );
  expect(next.withdrawals).toEqual([]);
  expect(
    next.alliances?.some((alliance) => alliance.members.includes(2)),
  ).not.toBe(true);
});

it("withdrawal checks ignore embarked troops and reuse current occupation reads", () => {
  const { s } = allianceFixture();
  s.pieces = {};
  piece(s, "0,0", 0);
  const second = piece(s, "0,0", 1);
  s.withdrawals = [{ tile: "0,0", owners: [0, 1] }];
  withPlanningFrame(s, () => {
    allPieces(s);
    pruneAlliances(s);
    expect(s.withdrawals).toHaveLength(1);
  });
  second.carrier = "transport";
  pruneAlliances(s);
  expect(s.withdrawals).toEqual([]);
});

it("indexes troops only once for final siege and coalition cleanup after peaceful movement", () => {
  const { s, enemy } = maritimeFixture();
  const moving = piece(s, "-3,0", 0, "cavalry");
  piece(s, "3,0", 0);
  for (let i = 0; i < 2000; i++) piece(s, "-4,0", 0);
  s.sieges.active = {
    owner: 0,
    town: enemy.id,
    progress: 1,
    last: 9,
    raided: null,
  };
  // Form any emergency coalition before the measured order. A new treaty
  // correctly requires another siege check against its changed friendships.
  syncEmergencyCoalition(s);
  const spy = vi.spyOn(Object, "keys");
  let result: ReturnType<typeof applyCommand>, scans: number;
  try {
    result = applyCommand(s, { type: "move", ids: [moving.id], to: "-2,0" });
    scans = spy.mock.calls.filter(
      ([value]) => value === result.state.pieces,
    ).length;
  } finally {
    spy.mockRestore();
  }
  expect(result.ok, result.error).toBe(true);
  expect(result.state.sieges.active).toEqual(s.sieges.active);
  // One read for movement validation, one shared by all post-order checks.
  expect(scans).toBe(2);
});

it("withdrawal breaks town and tower sieges with the same ordered notifications", () => {
  const { s, enemy } = maritimeFixture();
  const unit = piece(s, "3,0", 0, "cavalry");
  s.sieges.active = {
    owner: 0,
    town: enemy.id,
    progress: 1,
    last: 9,
    raided: null,
  };
  s.towers[enemy.vertex] = {
    id: "tower-test",
    vertex: enemy.vertex,
    owner: 1,
    tier: 2,
  };
  s.towerSieges = {
    active: {
      owner: 0,
      tower: "tower-test",
      vertex: enemy.vertex,
      progress: 0,
      last: 9,
      units: [unit.id],
    },
  };
  const to = Object.keys(moveTargets(s, [unit.id])).find(
    (tile) => !s.vertices[enemy.vertex].tiles.includes(tile),
  )!;
  const next = compare(s, { type: "move", ids: [unit.id], to });
  expect(next.sieges).toEqual({});
  expect(next.towerSieges).toEqual({});
});

it.each(["tied", "decisive", "civilian"] as const)(
  "%s combat preserves intermediate siege cleanup and complete battle state",
  (outcome) => {
    const { s, enemy } = maritimeFixture();
    const attacker = piece(
      s,
      "2,0",
      0,
      "cavalry",
      outcome === "decisive" ? 4 : 1,
    );
    piece(s, "3,0", 1, outcome === "civilian" ? "merchant" : "cavalry");
    piece(s, "2,0", 0, "merchant");
    s.sieges.active = {
      owner: 0,
      town: enemy.id,
      progress: 1,
      last: 9,
      raided: null,
    };
    const next = compare(s, { type: "move", ids: [attacker.id], to: "3,0" });
    expect(!!next.battle).toBe(outcome === "decisive");
    if (outcome === "civilian") {
      expect(next.pieces[attacker.id].tile).toBe("3,0");
      expect(next.sieges.active).toBeDefined();
    } else expect(next.sieges).toEqual({});
  },
);

it("landed defenders break sieges immediately with unchanged cleanup and coalition results", () => {
  const { s, enemy } = maritimeFixture();
  s.active = 1;
  s.tiles["2,0"].resource = "water";
  const ship = piece(s, "2,0", 1, "transport");
  const guard = piece(s, "2,0", 1);
  guard.carrier = ship.id;
  const adjacent = s.vertices[enemy.vertex].tiles.find(
    (tile) => tile !== "3,0" && tile !== "2,0",
  )!;
  piece(s, adjacent, 0);
  s.sieges.active = {
    owner: 0,
    town: enemy.id,
    progress: 1,
    last: 9,
    raided: null,
  };
  const next = compare(s, { type: "unload", ships: [ship.id], to: "3,0" });
  expect(next.sieges).toEqual({});
  expect(next.pieces[guard.id].carrier).toBeUndefined();
});

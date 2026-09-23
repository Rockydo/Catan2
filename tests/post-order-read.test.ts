import { expect, it } from "vitest";
import { applyCommand, eliminate, execute } from "../src/game/engine";
import { breakSieges } from "../src/game/military";
import { syncEmergencyCoalition } from "../src/game/emergency-coalition";
import { pruneAlliances } from "../src/game/diplomacy";
import { allPieces, withPlanningFrame } from "../src/game/selectors";
import type { Command, Game } from "../src/game/types";
import { allianceFixture } from "./alliance-fixture";
import { piece } from "./helpers";

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

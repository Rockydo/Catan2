import { expect, it } from "vitest";
import {
  applyCommand,
  applyCommandPlan,
  eliminate,
  execute,
} from "../src/game/engine";
import { breakSieges } from "../src/game/military";
import { syncEmergencyCoalition } from "../src/game/emergency-coalition";
import { guildFixture } from "./guild-fixture";
import { piece } from "./helpers";
import type { Command, Game } from "../src/game/types";

function reference(s: Game, command: Command) {
  const result = structuredClone(s);
  result.actions++;
  execute(result, command);
  breakSieges(result);
  eliminate(result);
  syncEmergencyCoalition(result);
  return result;
}
function freeze(value: unknown) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return;
  Object.freeze(value);
  for (const child of Object.values(value)) freeze(child);
}

for (const kind of ["commanders", "navigators", "engineers"] as const)
  it.each(["human", "standard"] as const)(
    `${kind} supply copies all affected troops without editing the %s input campaign`,
    (control) => {
      const { s, home, land, water } = guildFixture(kind, 3);
      s.players[0].control = control;
      const tile = kind === "navigators" ? water : land;
      const units = Array.from({ length: 160 }, () =>
        piece(s, tile, 0, kind === "navigators" ? "convoy" : "heavy", 3),
      );
      units[7].acted = true;
      const distant = piece(s, "-4,0", 0);
      const other = piece(s, "3,0", 1);
      const command: Command = {
        type: "guild-order",
        town: home.id,
        ids: [units[0].id],
        tier: 2,
      };
      const original = JSON.stringify(s),
        expected = reference(s, command);
      freeze(s);
      const result = applyCommand(s, command);
      expect(result.ok, result.error).toBe(true);
      expect(JSON.stringify(result.state)).toBe(JSON.stringify(expected));
      expect(JSON.stringify(s)).toBe(original);
      // One anchor must supply every eligible unit in the formation.
      for (const unit of units.filter((u) => !u.acted)) {
        expect(result.state.pieces[unit.id]).not.toBe(unit);
        if (kind === "engineers")
          expect(result.state.pieces[unit.id].guildSiege).toBe(4);
        else
          expect(result.state.pieces[unit.id].bonus).toBeGreaterThan(
            unit.bonus,
          );
      }
      expect(result.state.pieces[units[7].id]).toEqual(units[7]);
      expect(result.state.pieces[distant.id]).toBe(distant);
      expect(result.state.pieces[other.id]).toBe(other);
    },
  );

it("keeps supply, movement and subsequent stacked supply exact within a private batch", () => {
  const { s, home, land } = guildFixture("commanders", 3);
  const unit = piece(s, land, 0, "cavalry"),
    companion = piece(s, land, 0, "heavy");
  const distant = piece(s, "-4,0", 0);
  const commands: Command[] = [
    { type: "guild-order", town: home.id, ids: [unit.id], tier: 1 },
    { type: "move", ids: [unit.id, companion.id], to: "1,0" },
    { type: "guild-order", town: home.id, ids: [unit.id], tier: 2 },
    { type: "guild-order", town: home.id, ids: [companion.id], tier: 3 },
  ];
  const expected = commands.reduce(reference, s),
    original = JSON.stringify(s);
  freeze(s);
  const result = applyCommandPlan(
    s,
    (_view, completed) => commands[completed.length],
  );
  expect(result.ok, result.error).toBe(true);
  expect(JSON.stringify(result.state)).toBe(JSON.stringify(expected));
  expect(result.commands).toEqual(commands);
  expect(result.state.pieces[distant.id]).toBe(distant);
  expect(JSON.stringify(s)).toBe(original);
});

it("a rejected order rolls back all earlier formation supplies and moves in its batch", () => {
  const { s, home, land } = guildFixture("commanders", 3);
  const unit = piece(s, land, 0, "cavalry"),
    companion = piece(s, land, 0);
  const commands: Command[] = [
    { type: "guild-order", town: home.id, ids: [unit.id], tier: 1 },
    { type: "move", ids: [unit.id, companion.id], to: "1,0" },
    { type: "guild-order", town: home.id, ids: [unit.id], tier: 1 },
  ];
  const original = JSON.stringify(s);
  freeze(s);
  const result = applyCommandPlan(
    s,
    (_view, completed) => commands[completed.length],
  );
  expect(result.ok).toBe(false);
  expect(result.error).toContain("completed its order");
  expect(result.commands).toEqual([]);
  expect(result.state).toBe(s);
  expect(JSON.stringify(s)).toBe(original);
});

it.each(["artisans", "builders", "scholars"] as const)(
  "%s contracts retain exact resource, grant and research results without copying troops",
  (kind) => {
    const { s, home } = guildFixture(kind, 3);
    const unit = piece(s, "3,0", 1);
    const command: Command = {
      type: "guild-order",
      town: home.id,
      tier: 3,
      ...(kind === "artisans" ? { kind: "coal" } : {}),
    };
    const expected = reference(s, command),
      original = JSON.stringify(s);
    freeze(s);
    for (const result of [
      applyCommand(s, command),
      applyCommandPlan(s, (_view, done) => (done.length ? undefined : command)),
    ]) {
      expect(result.ok, result.error).toBe(true);
      expect(JSON.stringify(result.state)).toBe(JSON.stringify(expected));
      expect(result.state.pieces[unit.id]).toBe(unit);
      expect(JSON.stringify(s)).toBe(original);
    }
  },
);

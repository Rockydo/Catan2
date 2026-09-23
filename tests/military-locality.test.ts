import { expect, it } from "vitest";
import {
  applyCommand,
  applyCommandPlan,
  canApplyCommand,
  eliminate,
  execute,
} from "../src/game/engine";
import { breakSieges } from "../src/game/military";
import { syncEmergencyCoalition } from "../src/game/emergency-coalition";
import { colonizationSites } from "../src/game/selectors";
import type { Command, Game } from "../src/game/types";
import { piece } from "./helpers";
import { maritimeFixture } from "./maritime-fixture";

function freeze(value: unknown) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return;
  Object.freeze(value);
  for (const child of Object.values(value)) freeze(child);
}
function reference(s: Game, command: Command) {
  const next = structuredClone(s);
  if (next.phase === "military") next.phase = "economy";
  next.actions++;
  execute(next, command);
  breakSieges(next);
  eliminate(next);
  syncEmergencyCoalition(next);
  return next;
}

const operations = [
  "siege",
  "raid",
  "naval-raid",
  "destroy-town",
  "tower-siege",
  "destroy-tower",
  "destroy-road",
  "destroy-route",
  "hold",
  "colonize",
] as const;
function fixture(operation: (typeof operations)[number]) {
  const { s, enemy } = maritimeFixture();
  const naval = operation === "naval-raid" || operation === "destroy-route";
  if (naval) s.tiles["3,0"].resource = "water";
  const unit = piece(
    s,
    operation === "colonize" ? "-3,0" : "3,0",
    0,
    naval ? "carrack" : operation === "colonize" ? "settler" : "cavalry",
    operation === "colonize" ? 1 : 4,
  );
  const distant = piece(s, "-4,0", 0);
  const enemyUnit = piece(s, "4,-2", 1);
  let command: Command;
  switch (operation) {
    case "siege":
      enemy.level = 4;
      enemy.wall = 4;
      command = { type: "siege", ids: [unit.id], town: enemy.id };
      break;
    case "raid":
    case "naval-raid":
    case "destroy-town":
      command = {
        type: operation === "destroy-town" ? operation : "siege",
        ids: [unit.id],
        town: enemy.id,
      };
      if (operation === "destroy-town")
        s.sieges[`0:${enemy.id}`] = {
          owner: 0,
          town: enemy.id,
          progress: 0,
          raided: 9,
          last: 9,
        };
      break;
    case "tower-siege":
    case "destroy-tower":
      s.towers[enemy.vertex] = {
        id: "local-tower",
        vertex: enemy.vertex,
        owner: 1,
        tier: operation === "tower-siege" ? 4 : 1,
      };
      command = { type: "destroy-tower", ids: [unit.id], vertex: enemy.vertex };
      break;
    case "destroy-road":
    case "destroy-route": {
      const edge = s.tiles[unit.tile].edges[0];
      s.routes[edge] = {
        id: "local-route",
        owner: 1,
        edge,
        kind: naval ? "route" : "road",
        camps: { [unit.tile]: 2 },
        born: 0,
      };
      command = { type: "destroy-route", ids: [unit.id], edge };
      break;
    }
    case "hold":
      command = { type: "hold", ids: [unit.id] };
      break;
    case "colonize":
      command = {
        type: "colonize",
        ids: [unit.id],
        vertex: colonizationSites(s, unit)[0],
      };
      expect(command.vertex).toBeDefined();
      break;
  }
  return { s, unit, distant, enemyUnit, command };
}

it.each(operations)(
  "%s copies only affected troops and matches isolated execution",
  (operation) => {
    const { s, unit, distant, enemyUnit, command } = fixture(operation);
    const before = JSON.stringify(s),
      expected = reference(s, command);
    freeze(s);
    expect(canApplyCommand(s, command)).toBe(true);
    for (const result of [
      applyCommand(s, command),
      applyCommandPlan(s, (_view, done) => (done.length ? undefined : command)),
    ]) {
      expect(result.ok, result.error).toBe(true);
      expect(JSON.stringify(result.state)).toBe(JSON.stringify(expected));
      expect(JSON.stringify(s)).toBe(before);
      expect(result.state.tiles).toBe(s.tiles);
      expect(result.state.pieces[distant.id]).toBe(distant);
      if (operation === "destroy-town") {
        expect(result.state.pieces[enemyUnit.id]).toBeUndefined();
        expect(s.pieces[enemyUnit.id]).toBe(enemyUnit);
      } else expect(result.state.pieces[enemyUnit.id]).toBe(enemyUnit);
      if (operation !== "colonize")
        expect(result.state.pieces[unit.id]).not.toBe(unit);
      else expect(result.state.pieces[unit.id]).toBeUndefined();
    }
  },
);

it("raid then withdrawal in a batch keeps loot, movement and siege cleanup exact", () => {
  const { s, unit, distant, command } = fixture("raid");
  const orders: Command[] = [
    command,
    { type: "move", ids: [unit.id], to: "1,0" },
  ];
  const expected = orders.reduce(reference, s),
    before = JSON.stringify(s);
  freeze(s);
  const result = applyCommandPlan(s, (_view, done) => orders[done.length]);
  expect(result.ok, result.error).toBe(true);
  expect(JSON.stringify(result.state)).toBe(JSON.stringify(expected));
  expect(result.state.pieces[distant.id]).toBe(distant);
  expect(JSON.stringify(s)).toBe(before);
});

it.each(["load", "unload-all", "unload-selected"] as const)(
  "%s copies the actual passengers and ships without changing other troops",
  (mode) => {
    const { s } = maritimeFixture();
    s.tiles["1,0"].resource = "water";
    const ship = piece(s, "1,0", 0, "convoy", 4);
    const passengers = Array.from({ length: 6 }, () => {
      const u = piece(s, mode === "load" ? "0,0" : "1,0", 0, "merchant", 3);
      u.coverage = ["0,0"];
      if (mode !== "load") u.carrier = ship.id;
      return u;
    });
    const distant = piece(s, "-3,0", 0);
    const ids = passengers
      .slice(0, mode === "unload-selected" ? 2 : 6)
      .map((u) => u.id);
    const command: Command =
      mode === "load"
        ? { type: mode, ids, ships: [ship.id] }
        : {
            type: "unload",
            ships: [ship.id],
            to: "0,0",
            ...(mode === "unload-selected" ? { ids } : {}),
          };
    const expected = reference(s, command),
      before = JSON.stringify(s);
    freeze(s);
    expect(canApplyCommand(s, command)).toBe(true);
    for (const result of [
      applyCommand(s, command),
      applyCommandPlan(s, (_view, done) => (done.length ? undefined : command)),
    ]) {
      expect(result.ok, result.error).toBe(true);
      expect(JSON.stringify(result.state)).toBe(JSON.stringify(expected));
      expect(result.state.pieces[distant.id]).toBe(distant);
      expect(result.state.pieces[ship.id]).not.toBe(ship);
      for (const u of passengers)
        if (ids.includes(u.id)) expect(result.state.pieces[u.id]).not.toBe(u);
        else expect(result.state.pieces[u.id]).toBe(u);
      expect(JSON.stringify(s)).toBe(before);
    }
  },
);

it("a partially executed landing and a later invalid batch order both roll back", () => {
  const { s } = maritimeFixture();
  s.tiles["1,0"].resource = "water";
  const ship = piece(s, "1,0", 0, "convoy", 4);
  const passenger = piece(s, "1,0", 0, "merchant", 3);
  passenger.carrier = ship.id;
  passenger.coverage = ["0,0"];
  const stranger = piece(s, "-3,0", 0);
  const before = JSON.stringify(s);
  freeze(s);
  const invalid: Command = {
    type: "unload",
    ships: [ship.id],
    ids: [passenger.id, stranger.id],
    to: "0,0",
  };
  expect(canApplyCommand(s, invalid)).toBe(false);
  const failed = applyCommand(s, invalid);
  expect(failed.ok).toBe(false);
  expect(failed.state).toBe(s);
  const orders: Command[] = [{ ...invalid, ids: [passenger.id] }, invalid];
  const batch = applyCommandPlan(s, (_view, done) => orders[done.length]);
  expect(batch.ok).toBe(false);
  expect(batch.state).toBe(s);
  expect(batch.commands).toEqual([]);
  expect(JSON.stringify(s)).toBe(before);
});

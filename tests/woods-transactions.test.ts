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
import {
  expeditionSites,
  income,
  prepareGameView,
  productionSignature,
} from "../src/game/selectors";
import type { Command, Game } from "../src/game/types";
import { piece } from "./helpers";
import { maritimeFixture } from "./maritime-fixture";
import { frontierUnitFixture } from "./coastal-fixture";

function freeze(value: unknown) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return;
  Object.freeze(value);
  for (const child of Object.values(value)) freeze(child);
}
// Independent, fully detached execution retains all ordinary cleanup.
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
function fixture() {
  const f = maritimeFixture();
  const woods = f.s.vertices[f.home.vertex].tiles.slice(0, 2);
  for (const id of woods)
    Object.assign(f.s.tiles[id], {
      resource: "lumber",
      biome: "woods",
      climate: "temperate",
    });
  const unit = piece(f.s, "-2,0", 0, "cavalry", 4);
  piece(f.s, "3,0", 1, "heavy", 2);
  const command: Command = {
    type: "woods-choice",
    tile: woods[0],
    kind: "hides",
  };
  return { ...f, woods, unit, command };
}

it.each([false, true])(
  "isolates a Woods choice with existing choices: %s",
  (existing) => {
    const { s, woods, unit, command } = fixture();
    if (existing) {
      s.tiles[woods[0]].woodsChoices = { 0: "lumber", 1: "hides" };
      s.tiles[woods[0]].woodsChosenOn = { 0: 5, 1: 6 };
    }
    const expected = reference(s, command),
      original = JSON.stringify(s);
    prepareGameView(s);
    freeze(s);
    expect(canApplyCommand(s, command)).toBe(true);
    for (const result of [
      applyCommand(s, command),
      applyCommandPlan(s, (_, done) => (done.length ? undefined : command)),
    ]) {
      expect(result.ok, result.error).toBe(true);
      expect(JSON.stringify(result.state)).toBe(JSON.stringify(expected));
      expect(result.state.tiles).not.toBe(s.tiles);
      expect(result.state.tiles[woods[0]]).not.toBe(s.tiles[woods[0]]);
      expect(result.state.tiles[woods[1]]).toBe(s.tiles[woods[1]]);
      expect(result.state.edges).toBe(s.edges);
      expect(result.state.vertices).toBe(s.vertices);
      expect(result.state.pieces[unit.id]).toBe(unit);
      expect(JSON.stringify(s)).toBe(original);
    }
    expect(applyCommand(s, command).state.pieces).toBe(s.pieces);
  },
);

it("refreshes forecasts after repeated selections without changing a published input", () => {
  const { s, woods, command } = fixture();
  const commands: Command[] = [
    command,
    { ...command, tile: woods[1] },
    { ...command, kind: "lumber" },
    { ...command, kind: "hides" },
  ];
  const expected = [s];
  for (const c of commands) expected.push(reference(expected.at(-1)!, c));
  const forecasts = expected.map((v) => v.players.map((p) => income(v, p.id)));
  const signatures = expected.map((v) => productionSignature(v));
  expect(forecasts[0]).not.toEqual(forecasts[1]);
  prepareGameView(s);
  freeze(s);
  const result = applyCommandPlan(s, (view, done) => {
    expect(view.players.map((p) => income(view, p.id))).toEqual(
      forecasts[done.length],
    );
    expect(productionSignature(view)).toBe(signatures[done.length]);
    return commands[done.length];
  });
  expect(result.ok, result.error).toBe(true);
  expect(result.state).toEqual(expected.at(-1));
  prepareGameView(result.state);
  expect(income(s)).toEqual(forecasts[0][0]);
  expect(income(result.state)).toEqual(forecasts.at(-1)![0]);
});

it("detaches later recruits, marching troops and combatants after a terrain choice", () => {
  const { s, home, unit, command } = fixture();
  const defender = piece(s, "0,0", 1, "heavy", 2);
  const commands: Command[] = [
    command,
    { type: "move", ids: [unit.id], to: "-1,0" },
    {
      type: "recruit",
      town: home.id,
      tile: s.vertices[home.vertex].tiles[1],
      kind: "heavy",
      count: 2,
    },
    { ...command, kind: "lumber" },
    { type: "move", ids: [unit.id], to: "0,0" },
  ];
  const expected = commands.reduce(reference, s),
    original = JSON.stringify(s);
  freeze(s);
  const result = applyCommandPlan(s, (_, done) => commands[done.length]);
  expect(result.ok, result.error).toBe(true);
  expect(JSON.stringify(result.state)).toBe(JSON.stringify(expected));
  expect(result.state.battle).toBeDefined();
  expect(result.state.pieces[unit.id]).not.toBe(unit);
  expect(result.state.pieces[defender.id]).not.toBe(defender);
  expect(JSON.stringify(s)).toBe(original);
});

it("isolates season changes and production after a Woods choice", () => {
  const { s, home, command } = fixture();
  s.active = home.owner = 1;
  s.calendar = { startRound: 1, startSeason: "spring", roundsPerSeason: 2 };
  s.round = 2;
  Object.assign(s.tiles["1,0"], {
    resource: "water",
    climate: "cold",
    biome: "fish",
    fish: true,
    surface: "frozen",
  });
  // Keep both factions alive after transferring the test harvesting town.
  const other = structuredClone(home);
  other.id = "woods-home";
  other.owner = 0;
  other.vertex = s.tiles["-3,0"].vertices[0];
  s.towns[other.id] = other;
  const ship = piece(s, "1,0", 0, "merchantship", 3);
  ship.moved = 1;
  const commands: Command[] = [command, { type: "end-turn" }, { type: "roll" }];
  const expected = commands.reduce(reference, s),
    original = JSON.stringify(s);
  freeze(s);
  const result = applyCommandPlan(s, (_, done) => commands[done.length]);
  expect(result.ok, result.error).toBe(true);
  expect(JSON.stringify(result.state)).toBe(JSON.stringify(expected));
  expect(result.state.round).toBe(3);
  expect(result.state.pieces[ship.id]).not.toBe(ship);
  expect(JSON.stringify(s)).toBe(original);
});

it("copies roster membership when Woods cleanup eliminates a townless faction", () => {
  const { s, unit, command } = fixture();
  s.players[2].alive = true;
  const removed = piece(s, "-4,0", 2);
  const expected = reference(s, command),
    original = JSON.stringify(s);
  freeze(s);
  for (const result of [
    applyCommand(s, command),
    applyCommandPlan(s, (_, done) => (done.length ? undefined : command)),
  ]) {
    expect(result.ok, result.error).toBe(true);
    expect(result.state).toEqual(expected);
    expect(result.state.pieces).not.toBe(s.pieces);
    expect(result.state.pieces[removed.id]).toBeUndefined();
    expect(result.state.pieces[unit.id]).toBe(unit);
    expect(JSON.stringify(s)).toBe(original);
  }
});

it("detaches map geometry for an expedition after a selected tile was copied", () => {
  const { s } = frontierUnitFixture();
  const home = Object.values(s.towns).find((t) => t.owner === s.active)!;
  const tile = s.vertices[home.vertex].tiles[0];
  Object.assign(s.tiles[tile], { resource: "lumber", biome: "woods" });
  const vertex = expeditionSites(s, "land")[0];
  expect(vertex).toBeDefined();
  const commands: Command[] = [
    { type: "woods-choice", tile, kind: "hides" },
    { type: "expedition", vertex, kind: "land", tier: 1 },
    { type: "woods-choice", tile, kind: "lumber" },
  ];
  const expected = commands.reduce(reference, s),
    original = JSON.stringify(s);
  freeze(s);
  const result = applyCommandPlan(s, (_, done) => commands[done.length]);
  expect(result.ok, result.error).toBe(true);
  // Legacy fixtures have no climate plan. The batch preallocates that optional
  // root field before the expedition creates it; its insertion order differs
  // from individual execution, but all campaign records and their order agree.
  expect(result.state).toEqual(expected);
  expect(Object.keys(result.state.tiles)).toEqual(Object.keys(expected.tiles));
  expect(Object.keys(result.state.tiles)).toHaveLength(
    Object.keys(s.tiles).length + 10,
  );
  expect(result.state.vertices).not.toBe(s.vertices);
  expect(result.state.edges).not.toBe(s.edges);
  expect(JSON.stringify(s)).toBe(original);
});

it("rolls back invalid choices and a later failing order without exposing tile edits", () => {
  const { s, command } = fixture();
  const original = JSON.stringify(s);
  freeze(s);
  for (const invalid of [
    { ...command, kind: "grain" },
    { ...command, tile: "missing" },
    { ...command, tile: "-4,0" },
    { ...command, actor: 1 },
  ]) {
    expect(canApplyCommand(s, invalid)).toBe(false);
    const single = applyCommand(s, invalid);
    expect(single.ok).toBe(false);
    expect(single.state).toBe(s);
    const result = applyCommandPlan(
      s,
      (_, done) => [command, invalid][done.length],
    );
    expect(result.ok).toBe(false);
    expect(result.state).toBe(s);
    expect(result.commands).toEqual([]);
    expect(JSON.stringify(s)).toBe(original);
  }
});

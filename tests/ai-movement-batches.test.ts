import { afterEach, expect, it, vi } from "vitest";
import * as ai from "../src/game/ai";
import { createAIOrderPlanner } from "../src/game/ai-orders";
import { AISession } from "../src/game/ai-session";
import { applySnapshotDelta } from "../src/game/snapshot-delta";
import { peacefulMove } from "../src/game/engine";
import { maritimeFixture } from "./maritime-fixture";
import { funded, piece, run } from "./helpers";
import { ownTowns } from "../src/game/selectors";
import { landAtVertex } from "../src/game/world";
import type { Command, Game } from "../src/game/types";

afterEach(() => vi.restoreAllMocks());

function sequence(s: Game, commands: Command[]) {
  const start = s.actions;
  s.players[s.active].control = "standard";
  vi.spyOn(ai, "chooseAIAction").mockImplementation(
    (view) => commands[view.actions - start] ?? { type: "end-turn" },
  );
}

function freeze(value: unknown) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return;
  Object.freeze(value);
  for (const child of Object.values(value)) freeze(child);
}

it("batches peaceful movement with each order's complete result and exact immutable state", () => {
  const { s } = maritimeFixture();
  const first = piece(s, "0,0", 0, "cavalry"),
    second = piece(s, "0,0", 0, "cavalry");
  const commands: Command[] = [
    { type: "move", ids: [first.id], to: "1,0" },
    { type: "move", ids: [second.id], to: "1,0" },
    { type: "move", ids: [first.id], to: "2,0" },
  ];
  sequence(s, commands);
  const original = JSON.stringify(s);
  freeze(s);
  let expected = s;
  for (const command of commands) expected = run(expected, command);
  const result = createAIOrderPlanner(true)(s, () => 0, true);
  expect(result.commands).toEqual(commands);
  expect(JSON.stringify(result.state)).toBe(JSON.stringify(expected));
  expect(JSON.stringify(s)).toBe(original);
  // The last call looks ahead only far enough to defer the end-turn boundary.
  expect(ai.chooseAIAction).toHaveBeenCalledTimes(4);
});

it("keeps ordinary speed and human autoplay to one move", () => {
  const { s } = maritimeFixture();
  const unit = piece(s, "0,0", 0, "cavalry");
  const commands: Command[] = [
    { type: "move", ids: [unit.id], to: "1,0" },
    { type: "move", ids: [unit.id], to: "2,0" },
  ];
  sequence(s, commands);
  expect(createAIOrderPlanner(true)(s, () => 0).commands).toEqual([
    commands[0],
  ]);
  s.players[0].control = "human";
  expect(createAIOrderPlanner(true)(s, () => 0, true).commands).toEqual([
    commands[0],
  ]);
});

it("stops before combat and publishes an attack separately, even if it removes every defender", () => {
  const { s } = maritimeFixture();
  const unit = piece(s, "0,0", 0, "cavalry", 4);
  piece(s, "2,0", 1, "merchant");
  const commands: Command[] = [
    { type: "move", ids: [unit.id], to: "1,0" },
    { type: "move", ids: [unit.id], to: "2,0" },
    { type: "move", ids: [unit.id], to: "3,0" },
  ];
  sequence(s, commands);
  const plan = createAIOrderPlanner(true);
  const movement = plan(s, () => 0, true);
  expect(movement.commands).toEqual([commands[0]]);
  expect(peacefulMove(movement.state, commands[1])).toBe(false);
  const combat = plan(movement.state, () => 0, true);
  expect(combat.commands).toEqual([commands[1]]);
  expect(combat.state).toEqual(run(movement.state, commands[1]));
  expect(
    Object.values(combat.state.pieces).filter((p) => p.owner === 1),
  ).toHaveLength(0);
});

it("does not classify attacks on icebound ships or adrift armies as peaceful", () => {
  const { s } = maritimeFixture();
  const soldier = piece(s, "0,0"),
    ship = piece(s, "1,0", 1, "galley");
  ship.seasonStatus = "icebound";
  expect(
    peacefulMove(s, { type: "move", ids: [soldier.id], to: ship.tile }),
  ).toBe(false);
  const water = { ...s, pieces: {} };
  const attacker = piece(water, "0,0", 0, "galley"),
    swimmer = piece(water, "1,0", 1, "heavy");
  swimmer.seasonStatus = "adrift";
  expect(
    peacefulMove(water, { type: "move", ids: [attacker.id], to: swimmer.tile }),
  ).toBe(false);
});

it("moves carriers and passengers together while retaining allied destinations", () => {
  const { s } = maritimeFixture();
  for (const id of ["0,0", "1,0", "2,0"]) s.tiles[id].resource = "water";
  const ship = piece(s, "0,0", 0, "convoy", 4),
    passenger = piece(s, "0,0", 0, "heavy"),
    ally = piece(s, "1,0", 1, "galley");
  passenger.carrier = ship.id;
  s.alliances = [{ id: "pact", members: [0, 1], threat: 2, lockedUntil: 20 }];
  const commands: Command[] = [
    { type: "move", ids: [ship.id], to: "1,0" },
    { type: "move", ids: [ship.id], to: "2,0" },
  ];
  sequence(s, commands);
  expect(peacefulMove(s, commands[0])).toBe(true);
  const plan = createAIOrderPlanner(true)(s, () => 0, true);
  expect(plan.commands).toEqual(commands);
  expect(plan.state.pieces[ship.id].tile).toBe("2,0");
  expect(plan.state.pieces[passenger.id].tile).toBe("2,0");
  expect(plan.state.pieces[ally.id].tile).toBe("1,0");
  expect(JSON.stringify(plan.state)).toBe(
    JSON.stringify(commands.reduce(run, s)),
  );
});

it("bounds move batches by both elapsed time and order count", () => {
  const { s } = maritimeFixture();
  const commands: Command[] = Array.from({ length: 65 }, () => ({
    type: "move",
    ids: [piece(s, "0,0").id],
    to: "1,0",
  }));
  sequence(s, commands);
  expect(createAIOrderPlanner(true)(s, () => 0, true).commands).toEqual(
    commands.slice(0, 64),
  );
  let clock = 0;
  expect(
    createAIOrderPlanner(true)(s, () => (clock += 151), true).commands,
  ).toEqual([commands[0]]);
});

it("worker continuations can switch pacing while preserving the published position", () => {
  const { s } = maritimeFixture();
  const commands: Command[] = Array.from({ length: 4 }, () => ({
    type: "move",
    ids: [piece(s, "0,0").id],
    to: "1,0",
  }));
  sequence(s, commands);
  const session = new AISession();
  const first = session.handle({ request: 1, state: s, delta: true }, () => 0);
  expect(first.error).toBeUndefined();
  expect(first.commands).toEqual(commands.slice(0, 1));
  const visible = applySnapshotDelta(s, structuredClone(first.delta!));
  const next = session.handle(
    { request: 2, baseRequest: 1, delta: true, batchMoves: true },
    () => 0,
  );
  expect(next.error).toBeUndefined();
  expect(next.commands).toEqual(commands.slice(1));
  expect(
    JSON.stringify(applySnapshotDelta(visible, structuredClone(next.delta!))),
  ).toBe(JSON.stringify(commands.reduce(run, s)));
});

it("a later invalid move rolls back the whole unpublished batch", () => {
  const { s } = maritimeFixture();
  const unit = piece(s, "0,0");
  sequence(s, [
    { type: "move", ids: [unit.id], to: "1,0" },
    { type: "move", ids: [unit.id], to: "2,0" },
  ]);
  const before = JSON.stringify(s);
  freeze(s);
  const session = new AISession();
  const result = session.handle(
    { request: 1, state: s, batchMoves: true },
    () => 0,
  );
  expect(result.error).toContain("unreachable");
  expect(result.state).toBeUndefined();
  expect(JSON.stringify(s)).toBe(before);
  expect(
    session.handle({ request: 2, baseRequest: 1, batchMoves: true }),
  ).toEqual({ request: 2, resync: true });
});

it.each(["movement-parity-a", "movement-parity-b"])(
  "real AI keeps its complete decision sequence and state at either pacing: %s",
  (seed) => {
    const s = funded(seed);
    s.players[0].control = "standard";
    s.players[0].turns = 4;
    s.players[1].control = "human";
    const origin = landAtVertex(s, ownTowns(s)[0].vertex)[0];
    for (let n = 0; n < 8; n++) piece(s, origin, 0, "light", 2);
    for (let n = 0; n < 6; n++) piece(s, origin, 0, "merchant", 2);
    const replay = (batchMoves: boolean) => {
      const plan = createAIOrderPlanner(true);
      let state = structuredClone(s);
      const commands: Command[] = [];
      for (let n = 0; n < 200; n++) {
        const next = plan(state, () => 0, batchMoves);
        state = next.state;
        commands.push(...next.commands);
        const responder =
          state.battle?.loser ??
          state.trade?.to ??
          state.allianceOffer?.approvals?.[0] ??
          state.allianceOffer?.to;
        if (
          state.active !== 0 ||
          state.players[0].turns !== 4 ||
          state.phase === "finished" ||
          (responder !== undefined &&
            state.players[responder].control === "human")
        )
          return { state: JSON.stringify(state), commands };
      }
      throw Error("AI did not reach a turn boundary or player decision");
    };
    expect(replay(true)).toEqual(replay(false));
  },
  30000,
);

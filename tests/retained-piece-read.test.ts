import { expect, it } from "vitest";
import {
  allPieces,
  income,
  inventory,
  movementOccupationKeys,
  ownPieces,
  piecesAt,
  piecePlanningValue,
  pieceCompositionValue,
  retainPieceRead,
  withMovementValidationFrame,
  withMovedPiecePlanningFrame,
  withPlanningFrame,
  withRetainedPieceRead,
} from "../src/game/selectors";
import { applyCommandPlan, applyCommand } from "../src/game/engine";
import { factionStrengthDetails } from "../src/game/ai-strategy";
import { maritimeFixture } from "./maritime-fixture";
import { piece } from "./helpers";
import type { Command, Game } from "../src/game/types";

it("shares only troop reads through 10,000 successive scopes without a recursive chain", () => {
  const { s, home } = maritimeFixture();
  for (let i = 0; i < 2000; i++) piece(s, "-4,0", 0, "heavy", 2);
  let retained = withPlanningFrame(s, () => retainPieceRead(s))!;
  let computed = 0;
  for (let i = 0; i < 10_000; i++) {
    const view = {
      ...s,
      actions: i,
      towns: { ...s.towns, [home.id]: { ...home, stock: { gold: i } } },
    };
    withRetainedPieceRead(view, retained, () => {
      expect(
        piecePlanningValue(view, "test-size", (units) => {
          computed++;
          return units.length;
        }),
      ).toBe(2000);
      expect(inventory(view).gold).toBe(i);
      expect(ownPieces(view)).toHaveLength(2000);
      retained = retainPieceRead(view)!;
    });
  }
  expect(computed).toBe(1);
  expect(retainPieceRead(s)).toBeUndefined();
  piece(s, "-4,0", 0, "heavy", 3);
  expect(allPieces(s)).toHaveLength(2001);
});

it("retains a private batch's army across purchases and rebuilds after recruitment and movement", () => {
  const { s, home } = maritimeFixture();
  for (let i = 0; i < 2000; i++) piece(s, "-4,0", 0, "heavy", 2);
  const rider = piece(s, "-3,0", 0, "cavalry");
  const bank: Command = {
    type: "bank",
    give: { gold: 1 },
    take: { lumber: 1 },
  };
  const commands: Command[] = [
    bank,
    bank,
    { type: "recruit", town: home.id, tile: "0,0", kind: "heavy", count: 5 },
    bank,
    { type: "move", ids: [rider.id], to: "-2,0" },
    bank,
  ];
  const states = [s];
  for (const command of commands) {
    const result = applyCommand(states.at(-1)!, command);
    expect(result.ok, result.error).toBe(true);
    states.push(result.state);
  }
  const read = (state: Game) => ({
    strength: factionStrengthDetails(state),
    income: income(state),
    stock: inventory(state),
    occupation: movementOccupationKeys(state),
    units: allPieces(state),
    home: piecesAt(state, "0,0"),
    destination: piecesAt(state, "-2,0"),
  });
  const expected = states.map((state) =>
    withPlanningFrame(state, () => read(state)),
  );
  const original = JSON.stringify(s);
  let computations = 0,
    compositionComputations = 0;
  const result = applyCommandPlan(s, (view, done) => {
    piecePlanningValue(view, "batch-probe", () => ++computations);
    const score = pieceCompositionValue(view, "composition-probe", (units) => {
      compositionComputations++;
      return units.reduce((n, unit) => n + unit.tier, 0);
    });
    expect(score).toBe(
      expected[done.length].units.reduce((n, unit) => n + unit.tier, 0),
    );
    expect(read(view)).toEqual(expected[done.length]);
    return commands[done.length];
  });
  expect(result.ok, result.error).toBe(true);
  expect(computations).toBe(3); // initial, recruits added, rider moved
  expect(compositionComputations).toBe(2); // movement preserves the army roster
  expect(JSON.stringify(result.state)).toBe(JSON.stringify(states.at(-1)));
  expect(JSON.stringify(s)).toBe(original);
});

it("discards composition aggregates after combat and keeps the exact surviving army", () => {
  const { s } = maritimeFixture();
  const attacker = piece(s, "0,0", 0, "cavalry", 4);
  piece(s, "2,0", 1, "merchant", 4);
  const commands: Command[] = [
    { type: "move", ids: [attacker.id], to: "1,0" },
    { type: "move", ids: [attacker.id], to: "2,0" },
    { type: "move", ids: [attacker.id], to: "3,0" },
  ];
  let expected = s,
    computations = 0;
  const result = applyCommandPlan(s, (view, done) => {
    const roster = pieceCompositionValue(view, "roster", (units) => {
      computations++;
      return units.map((unit) => [
        unit.owner,
        unit.kind,
        unit.naval,
        unit.tier,
      ]);
    });
    expect(roster).toEqual(
      Object.values(expected.pieces).map((unit) => [
        unit.owner,
        unit.kind,
        unit.naval,
        unit.tier,
      ]),
    );
    expect(factionStrengthDetails(view)).toEqual(
      factionStrengthDetails(expected),
    );
    const command = commands[done.length];
    if (command) {
      const step = applyCommand(expected, command);
      expect(step.ok, step.error).toBe(true);
      expected = step.state;
    }
    return command;
  });
  expect(result.ok, result.error).toBe(true);
  expect(computations).toBe(3); // initial, combat, and later move on the fully detached draft
  expect(JSON.stringify(result.state)).toBe(JSON.stringify(expected));
});

it("carries value-only roster results through moves while rebuilding troop and production reads", () => {
  const { s } = maritimeFixture();
  const merchant = piece(s, "0,0", 0, "merchant", 4);
  let computed = 0;
  const score = (state: Game) =>
    pieceCompositionValue(state, "roster", (units) => {
      computed++;
      return units.reduce((n, u) => n + u.tier, 0);
    });
  const before = withPlanningFrame(s, () => ({
    score: score(s),
    retained: retainPieceRead(s)!,
    income: income(s),
    positions: piecePlanningValue(s, "positions", (units) =>
      units.map((u) => u.tile),
    ),
  }));
  s.pieces[merchant.id] = { ...merchant, tile: "1,0", moved: 1 };
  const view = { ...s };
  withMovedPiecePlanningFrame(
    view,
    Object.values(view.pieces),
    before.retained,
    () => {
      expect(score(view)).toBe(before.score);
      expect(computed).toBe(1);
      expect(piecesAt(view, "0,0")).toEqual([]);
      expect(piecesAt(view, "1,0")).toEqual([view.pieces[merchant.id]]);
      expect(
        piecePlanningValue(view, "positions", (units) =>
          units.map((u) => u.tile),
        ),
      ).toEqual(["1,0"]);
      const fresh = { ...view };
      expect(income(view)).toEqual(
        withPlanningFrame(fresh, () => income(fresh)),
      );
    },
  );
  const changed = {
    ...view,
    pieces: {
      ...view.pieces,
      [merchant.id]: { ...view.pieces[merchant.id], owner: 1, tier: 2 },
    },
  };
  withMovedPiecePlanningFrame(
    changed,
    Object.values(changed.pieces),
    before.retained,
    () => {
      expect(score(changed)).toBe(2);
      expect(computed).toBe(2);
    },
  );
  // Mutable callers outside protected scopes always see current changes.
  changed.pieces[merchant.id].tier = 3;
  expect(score(changed)).toBe(3);
  expect(computed).toBe(3);
});

it("reuses occupation before movement but gives copied troops fresh identity lookups", () => {
  const { s } = maritimeFixture();
  const rider = piece(s, "-3,0", 0, "cavalry");
  for (let i = 0; i < 2000; i++) piece(s, "-4,0", 0, "heavy", 2);
  let oldKeys: readonly string[];
  const retained = withPlanningFrame(s, () => {
    oldKeys = movementOccupationKeys(s);
    allPieces(s);
    piecesAt(s, "-3,0");
    return retainPieceRead(s)!;
  });
  // The engine detaches selected records before validating their unchanged position.
  s.pieces[rider.id] = { ...rider };
  withMovementValidationFrame(s, Object.values(s.pieces), retained, () => {
    expect(movementOccupationKeys(s)).toBe(oldKeys);
    expect(piecesAt(s, "-3,0")[0]).toBe(s.pieces[rider.id]);
    expect(piecesAt(s, "-3,0")[0]).not.toBe(rider);
  });
  s.pieces[rider.id].tile = "-2,0";
  withPlanningFrame(s, () => {
    expect(movementOccupationKeys(s)).not.toEqual(oldKeys);
    expect(piecesAt(s, "-2,0")[0]).toBe(s.pieces[rider.id]);
  });
});

it("does not reuse a handle for another troop dictionary and restores enclosing scopes after errors", () => {
  const { s } = maritimeFixture();
  piece(s, "-4,0");
  withPlanningFrame(s, () => {
    const original = allPieces(s),
      retained = retainPieceRead(s)!;
    const empty = { ...s, pieces: {} };
    expect(() =>
      withRetainedPieceRead(empty, retained, () => {
        expect(allPieces(empty)).toEqual([]);
        throw Error("test read failure");
      }),
    ).toThrow("test read failure");
    expect(allPieces(s)).toBe(original);
  });
});

it("recalculates army composition when post-move cleanup eliminates a faction", () => {
  const { s, enemy } = maritimeFixture();
  const rider = piece(s, "0,0", 0, "cavalry", 4);
  piece(s, "-4,0", 1, "heavy", 2);
  delete s.towns[enemy.id];
  const move: Command = { type: "move", ids: [rider.id], to: "1,0" };
  const expected = applyCommand(s, move);
  expect(expected.ok, expected.error).toBe(true);
  let computations = 0;
  const result = applyCommandPlan(s, (view, done) => {
    const score = pieceCompositionValue(view, "cleanup-roster", (units) => {
      computations++;
      return units.reduce((n, unit) => n + unit.tier, 0);
    });
    expect(score).toBe(done.length ? 4 : 6);
    return done.length ? undefined : move;
  });
  expect(result.ok, result.error).toBe(true);
  expect(computations).toBe(2);
  expect(JSON.stringify(result.state)).toBe(JSON.stringify(expected.state));
});

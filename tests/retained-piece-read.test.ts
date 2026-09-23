import { expect, it } from "vitest";
import {
  allPieces,
  income,
  inventory,
  movementOccupationKeys,
  ownPieces,
  piecesAt,
  piecePlanningValue,
  retainPieceRead,
  withMovementValidationFrame,
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
  let computations = 0;
  const result = applyCommandPlan(s, (view, done) => {
    piecePlanningValue(view, "batch-probe", () => ++computations);
    expect(read(view)).toEqual(expected[done.length]);
    return commands[done.length];
  });
  expect(result.ok, result.error).toBe(true);
  expect(computations).toBe(3); // initial, recruits added, rider moved
  expect(JSON.stringify(result.state)).toBe(JSON.stringify(states.at(-1)));
  expect(JSON.stringify(s)).toBe(original);
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

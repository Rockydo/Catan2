import { expect, it } from "vitest";
import { funded, piece } from "./helpers";
import {
  passengersOn,
  passengerCount,
  withPlanningFrame,
  withSharedPiecePlanningFrame,
  prepareGameView,
} from "../src/game/selectors";
import type { Game } from "../src/game/types";

function fixture() {
  const s = funded("passenger-index");
  s.pieces = {};
  const boats = [
    piece(s, "0,0", 0, "convoy", 4),
    piece(s, "0,0", 1, "convoy", 4),
    piece(s, "1,0", 0, "transport", 2),
  ];
  for (let i = 0; i < 24; i++) {
    const boat = boats[i % boats.length],
      unit = piece(s, boat.tile, boat.owner, i % 2 ? "cavalry" : "merchant", 2);
    unit.carrier = boat.id;
  }
  // Dictionary insertion order can differ from IDs and carrier selection order.
  const moved = Object.values(s.pieces)[8];
  delete s.pieces[moved.id];
  s.pieces[moved.id] = moved;
  return { s, boats };
}
function check(s: Game, ids: string[]) {
  const expected = Object.values(s.pieces).filter(
    (u) => !!u.carrier && ids.includes(u.carrier),
  );
  expect(passengersOn(s, ids)).toEqual(expected);
  for (const id of ids)
    expect(passengerCount(s, id)).toBe(
      expected.filter((u) => u.carrier === id).length,
    );
  const result = passengersOn(s, ids);
  result.reverse();
  result.length = 0;
  expect(passengersOn(s, ids)).toEqual(expected);
}
it("preserves global passenger order for selected carriers and separate planning scopes", () => {
  const { s, boats } = fixture();
  const selections = [
    [],
    [boats[0].id],
    [boats[2].id, boats[0].id],
    [...boats.map((b) => b.id).reverse(), boats[0].id, "missing"],
  ];
  for (const ids of selections) {
    check(s, ids);
    withPlanningFrame(s, () => {
      check(s, ids);
      withSharedPiecePlanningFrame({ ...s, active: 1 }, () => check(s, ids));
      const draft = structuredClone(s);
      const unit = Object.values(draft.pieces).find((u) => u.carrier)!;
      delete unit.carrier;
      check(draft, ids);
    });
  }
  const view = structuredClone(s);
  prepareGameView(view);
  for (const ids of selections) check(view, ids);
});
it("sees boarding, disembarking, capture and removals on mutable drafts", () => {
  const { s, boats } = fixture();
  const ids = boats.map((b) => b.id);
  withPlanningFrame(s, () => check(s, ids));
  const unit = Object.values(s.pieces).find((u) => u.carrier)!;
  delete unit.carrier;
  check(s, ids);
  unit.carrier = boats[2].id;
  unit.owner = boats[2].owner;
  check(s, ids);
  delete s.pieces[unit.id];
  check(s, ids);
  const added = piece(s, boats[0].tile);
  added.carrier = boats[0].id;
  withPlanningFrame(s, () => check(s, ids));
});

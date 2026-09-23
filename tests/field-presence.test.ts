import { expect, it, vi } from "vitest";
import {
  allPieces,
  points,
  prepareGameView,
  protects,
  someFieldPiece,
  towerGuards,
  withPlanningFrame,
  withSharedPiecePlanningFrame,
} from "../src/game/selectors";
import { friendly } from "../src/game/relations";
import type { Game, Piece } from "../src/game/types";
import { allianceFixture, pact } from "./alliance-fixture";
import { piece } from "./helpers";

// Original existence query, independent of all production selector indexes.
function reference(
  s: Game,
  tiles: readonly string[],
  accept: (unit: Piece) => boolean,
  naval?: boolean,
) {
  return tiles.some((tile) =>
    Object.values(s.pieces)
      .filter(
        (u) =>
          u.tile === tile &&
          !u.carrier &&
          (naval === undefined || u.naval === naval),
      )
      .some(accept),
  );
}

it("matches original field checks across domains, civilians, passengers and allies", () => {
  const { s, towns } = allianceFixture();
  pact(s, [0, 1]);
  const tiles = Object.keys(s.tiles);
  for (let i = 0; i < tiles.length; i++) {
    const kind = (["heavy", "merchant", "fishing", "convoy"] as const)[i % 4];
    const unit = piece(s, tiles[i], i % 4, kind, (i % 4) + 1);
    if (i % 7 === 0) unit.carrier = "test-transport";
    if (i % 9 === 0) unit.seasonStatus = unit.naval ? "icebound" : "adrift";
    unit.acted = i % 3 === 0;
  }
  const check = (view: Game) => {
    for (const town of towns) {
      const adjacent = view.vertices[town.vertex].tiles;
      const guard = (u: Piece) =>
        friendly(view, u.owner, town.owner) && points(u) > 0;
      for (const naval of [undefined, false, true]) {
        const owner = (u: Piece) => u.owner === town.owner;
        expect(someFieldPiece(view, adjacent, owner, naval)).toBe(
          reference(view, adjacent, owner, naval),
        );
      }
      expect(protects(view, town)).toBe(
        reference(view, adjacent, guard, false),
      );
      expect(protects(view, town, true)).toBe(reference(view, adjacent, guard));
      expect(towerGuards(view, { ...town, tier: 4 })).toBe(
        reference(view, adjacent, guard, false),
      );
    }
    expect(someFieldPiece(view, [], () => true)).toBe(false);
    expect(someFieldPiece(view, ["outside-map"], () => true)).toBe(false);
  };
  check(s);
  withPlanningFrame(s, () => {
    check(s);
    const other = { ...s, alliances: [] };
    withSharedPiecePlanningFrame(other, () => check(other));
    check(s);
  });
  prepareGameView(s);
  check(s);
});

it("reads movement, boarding, losses and new alliances immediately on mutable drafts", () => {
  const { s, towns } = allianceFixture();
  s.pieces = {};
  const town = towns[0],
    tile = s.vertices[town.vertex].tiles[0];
  const guard = piece(s, tile, 1);
  const check = (expected: boolean) => {
    expect(protects(s, town)).toBe(expected);
    withPlanningFrame(s, () => expect(protects(s, town)).toBe(expected));
  };
  check(false);
  pact(s, [0, 1]);
  check(true);
  guard.carrier = "transport";
  check(false);
  delete guard.carrier;
  guard.tile = "5,0";
  check(false);
  guard.tile = tile;
  check(true);
  delete s.pieces[guard.id];
  check(false);
  piece(s, tile, 0, "merchant", 4);
  check(false);
  const fisher = piece(s, tile, 0, "fishing", 1);
  expect(protects(s, town, true)).toBe(false);
  fisher.tier = 2;
  expect(protects(s, town, true)).toBe(true);
  expect(protects(s, town)).toBe(false);
  s.pieces = {};
  check(false);
});

it("scans a mutable empire once for a three-hex check and stops at its first match", () => {
  const { s, towns } = allianceFixture();
  s.pieces = {};
  const tiles = s.vertices[towns[0].vertex].tiles;
  expect(tiles).toHaveLength(3);
  const first = piece(s, tiles[0], 0);
  for (let i = 0; i < 2000; i++) piece(s, "5,0", 1);
  const keys = vi.spyOn(Object, "keys");
  try {
    const reject = vi.fn(() => false);
    expect(someFieldPiece(s, tiles, reject, false)).toBe(false);
    expect(reject).toHaveBeenCalledTimes(1);
    expect(
      keys.mock.calls.filter(([value]) => value === s.pieces),
    ).toHaveLength(1);
    const accept = vi.fn((unit: Piece) => unit === first);
    withPlanningFrame(s, () => {
      allPieces(s);
      keys.mockClear();
      expect(someFieldPiece(s, tiles, accept)).toBe(true);
      expect(someFieldPiece(s, tiles, accept)).toBe(true);
      expect(
        keys.mock.calls.filter(([value]) => value === s.pieces),
      ).toHaveLength(0);
    });
    expect(accept).toHaveBeenCalledTimes(2);
  } finally {
    keys.mockRestore();
  }
});

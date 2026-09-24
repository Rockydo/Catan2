import { expect, it, vi } from "vitest";
import { factionStrengthDetails } from "../src/game/ai-strategy";
import { SHIP_INFO, UNIT_INFO } from "../src/game/content";
import type { Game, ShipClass, UnitClass } from "../src/game/types";
import * as selectors from "../src/game/selectors";
import { piece, funded } from "./helpers";

function fixture(count = 160) {
  const s = funded("force-strength-reads");
  s.pieces = {};
  const tiles = Object.keys(s.tiles);
  const kinds = [...Object.keys(UNIT_INFO), ...Object.keys(SHIP_INFO)] as (
    UnitClass | ShipClass
  )[];
  for (let i = 0; i < count; i++) {
    const kind = kinds[i % kinds.length];
    const u = piece(
      s,
      tiles[i % 9],
      i % s.players.length,
      kind,
      ["settler", "settlership"].includes(kind) ? 1 : 1 + (i % 4),
    );
    if (i % 5 === 0) u.carrier = "test-carrier";
    if (i % 7 === 0) u.seasonStatus = u.naval ? "icebound" : "adrift";
  }
  return s;
}
function expectedForces(s: Game) {
  return s.players.map((p) =>
    p.alive
      ? Object.values(s.pieces)
          .filter((u) => u.owner === p.id)
          .reduce(
            (sum, u) =>
              sum +
              (selectors.points(u) * 2 +
                ([
                  "merchant",
                  "merchantship",
                  "fishing",
                  "oceanfishing",
                ].includes(u.kind)
                  ? u.tier * 3
                  : 0)),
            0,
          )
      : 0,
  );
}

it("preserves per-faction force totals for every class, tier, passenger and stranded unit", () => {
  const s = fixture();
  const expected = expectedForces(s),
    before = JSON.stringify(s);
  selectors.withPlanningFrame(s, () => {
    expect(factionStrengthDetails(s).map((v) => v.forces)).toEqual(expected);
    const reversed = {
      ...s,
      pieces: Object.fromEntries(Object.entries(s.pieces).reverse()),
    };
    expect(factionStrengthDetails(reversed).map((v) => v.forces)).toEqual(
      expectedForces(reversed),
    );
  });
  expect(JSON.stringify(s)).toBe(before);
});

it("reuses troop totals through related views while towns, income and alive factions remain current", () => {
  const s = fixture(2_000);
  const changed = {
    ...s,
    towns: structuredClone(s.towns),
    players: structuredClone(s.players),
    alliances: [{ id: "test", members: [0, 1], threat: 3, lockedUntil: 5 }],
  };
  Object.values(changed.towns)[0].level = 4;
  changed.players[2].alive = false;
  // Independent unregistered calculation supplies all three score components.
  const expected = factionStrengthDetails(structuredClone(changed));
  const points = vi.spyOn(selectors, "points");
  try {
    selectors.withPlanningFrame(s, () => {
      const first = factionStrengthDetails(s);
      expect(points).toHaveBeenCalledTimes(2_000);
      selectors.withSharedPiecePlanningFrame(changed, () => {
        expect(factionStrengthDetails(changed)).toEqual(expected);
        expect(points).toHaveBeenCalledTimes(2_000);
      });
      expect(factionStrengthDetails(s)).toBe(first);
    });
  } finally {
    points.mockRestore();
  }
});

it("rebuilds troop totals after replacement, recruitment, deletion or an in-place edit outside the scope", () => {
  const s = fixture();
  selectors.withPlanningFrame(s, () => {
    factionStrengthDetails(s);
    const changed = { ...s, pieces: structuredClone(s.pieces) };
    const units = Object.values(changed.pieces);
    delete changed.pieces[units[0].id];
    units[2].owner = 1;
    piece(changed, units[1].tile, 3, "heavy", 4);
    selectors.withSharedPiecePlanningFrame(changed, () => {
      expect(factionStrengthDetails(changed).map((v) => v.forces)).toEqual(
        expectedForces(changed),
      );
    });
  });
  const retained = Object.values(s.pieces);
  retained[3].tier = 4;
  retained[4].owner = 0;
  const next = { ...s };
  selectors.withPieceListPlanningFrame(next, retained, () => {
    expect(factionStrengthDetails(next).map((v) => v.forces)).toEqual(
      expectedForces(next),
    );
  });
  retained[3].tier = 1;
  expect(factionStrengthDetails({ ...s }).map((v) => v.forces)).toEqual(
    expectedForces(s),
  );
});

it("keeps published snapshots separate and restores enclosing troop scopes after errors", () => {
  const s = fixture();
  const next = structuredClone(s);
  Object.values(next.pieces)[3].tier = 4;
  selectors.prepareGameView(s);
  selectors.prepareGameView(next);
  expect(factionStrengthDetails(s).map((v) => v.forces)).toEqual(
    expectedForces(s),
  );
  expect(factionStrengthDetails(next).map((v) => v.forces)).toEqual(
    expectedForces(next),
  );
  const read = vi.fn((units) => units.length);
  selectors.withPlanningFrame(s, () => {
    expect(selectors.piecePlanningValue(s, "count", read)).toBe(160);
    const inner = { ...next, pieces: {} };
    expect(() =>
      selectors.withPlanningFrame(inner, () => {
        expect(selectors.piecePlanningValue(inner, "count", read)).toBe(0);
        throw Error("inner failure");
      }),
    ).toThrow("inner failure");
    expect(selectors.piecePlanningValue(s, "count", read)).toBe(160);
    expect(read).toHaveBeenCalledTimes(2);
  });
  // A new scope must not inherit cached values from an earlier scope.
  selectors.withPlanningFrame(s, () =>
    selectors.piecePlanningValue(s, "count", read),
  );
  expect(read).toHaveBeenCalledTimes(3);
});

import { describe, expect, it } from "vitest";
import {
  factionStrengthDetails,
  factionStrengths,
} from "../src/game/ai-strategy";
import {
  income,
  ownPieces,
  ownTowns,
  points,
  withPlanningFrame,
} from "../src/game/selectors";
import { funded, piece, run } from "./helpers";
import { landAtVertex } from "../src/game/world";

describe("public faction strength breakdown", () => {
  it("preserves the AI's existing score exactly, including civilian units and production", () => {
    const s = funded("strength-breakdown");
    const town = ownTowns(s)[0];
    town.level = town.turnLevel = 3;
    town.wall = 2;
    town.extensions[landAtVertex(s, town.vertex)[0]] = 2;
    piece(s, landAtVertex(s, town.vertex)[0], 0, "merchant", 3);
    piece(s, landAtVertex(s, town.vertex)[0], 0, "heavy", 4);
    const expected = s.players.map(
      (p) =>
        ownTowns(s, p.id).reduce(
          (n, t) =>
            n +
            8 +
            t.level * 4 +
            t.wall +
            Object.values(t.extensions).reduce((a, b) => a + b * 2, 0),
          0,
        ) +
        ownPieces(s, p.id).reduce(
          (n, u) =>
            n +
            (points(u) * 2 +
              (["merchant", "merchantship", "fishing"].includes(u.kind)
                ? u.tier * 3
                : 0)),
          0,
        ) +
        Object.values(income(s, p.id)).reduce((n, v) => n + (v ?? 0) * 5, 0),
    );
    expect(withPlanningFrame(s, () => factionStrengths(s))).toEqual(expected);
    expect(factionStrengthDetails(s)[0].forces).toBe(17);
    for (const d of factionStrengthDetails(s))
      expect(d.total).toBe(d.towns + d.forces + d.production);
  });
  it("updates on a real game command without changing the old state", () => {
    const s = funded();
    const before = factionStrengths(s)[0];
    const next = run(s, { type: "wall", town: ownTowns(s)[0].id });
    expect(factionStrengths(next)[0]).toBe(before + 1);
    expect(factionStrengths(s)[0]).toBe(before);
  });
  it("ignores private stockpiles and zeros eliminated realms", () => {
    const s = funded();
    const before = factionStrengths(s);
    const next = structuredClone(s);
    for (const t of Object.values(next.towns)) t.stock = {};
    next.players[3].alive = false;
    expect(factionStrengths(next).slice(0, 3)).toEqual(before.slice(0, 3));
    expect(factionStrengthDetails(next)[3]).toEqual({
      towns: 0,
      forces: 0,
      production: 0,
      total: 0,
    });
  });
});

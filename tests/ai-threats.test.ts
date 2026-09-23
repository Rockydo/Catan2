import { expect, it, vi } from "vitest";
import { collectorThreats, colonistDanger } from "../src/game/ai-threats";
import { friendly } from "../src/game/relations";
import { distance, neighbors } from "../src/game/world";
import { points, speed, withPlanningFrame } from "../src/game/selectors";
import { UNIT_INFO, SHIP_INFO } from "../src/game/content";
import * as paths from "../src/game/ai-paths";
import * as selectors from "../src/game/selectors";
import type { Game, ShipClass, UnitClass } from "../src/game/types";
import { funded, piece } from "./helpers";

function check(s: Game) {
  withPlanningFrame(s, () => {
    const danger = colonistDanger(s),
      threatened = collectorThreats(s),
      recruiting = collectorThreats(s, s.active, false),
      units = Object.values(s.pieces);
    for (const naval of [false, true]) {
      const expected = new Set(
        units
          .filter(
            (u) =>
              !u.carrier &&
              u.naval === naval &&
              !friendly(s, u.owner, s.active),
          )
          .flatMap((u) =>
            points(u) > 0 ? [u.tile, ...neighbors(u.tile)] : [u.tile],
          ),
      );
      expect([...danger[Number(naval)]]).toEqual([...expected]);
      for (const tile of [...Object.keys(s.tiles), "9999,9999"]) {
        expect(recruiting(tile, naval), `recruit ${tile}/${naval}`).toBe(
          units.some(
            (u) =>
              !friendly(s, u.owner, s.active) &&
              points(u) > 0 &&
              u.naval === naval &&
              distance(u.tile, tile) <= speed(u),
          ),
        );
        expect(threatened(tile, naval), `${tile}/${naval}`).toBe(
          units.some(
            (u) =>
              !friendly(s, u.owner, s.active) &&
              points(u) > 0 &&
              u.naval === naval &&
              distance(u.tile, tile) <= speed(u) &&
              paths.planningReachable(
                s,
                u.tile,
                tile,
                naval,
                u.owner,
                speed(u),
              ),
          ),
        );
      }
    }
  });
}

it("preserves every danger query across mixed stacks, alliances, movement speeds, civilians and seasonal surfaces", () => {
  const s = funded("danger-grouping");
  s.pieces = {};
  const tiles = Object.keys(s.tiles),
    classes = [...Object.keys(UNIT_INFO), ...Object.keys(SHIP_INFO)] as (
      UnitClass | ShipClass
    )[];
  for (let i = 0; i < 160; i++) {
    const unit = piece(
      s,
      tiles[(i % 8) * 6],
      i % s.players.length,
      classes[i % classes.length],
      1 + (i % 4),
    );
    if (i % 5 === 0) unit.carrier = "shared-transport";
    if (i % 6 === 0) unit.seasonStatus = unit.naval ? "icebound" : "adrift";
    unit.moved = i % 4;
  }
  s.tiles[tiles[0]].surface = "frozen";
  s.tiles[tiles[6]].surface = "open";
  check(s);
  const allied = structuredClone(s);
  allied.alliances = [
    { id: "pact", members: [0, 1], threat: 3, lockedUntil: 10 },
  ];
  check(allied);
  allied.pieces = {};
  check({ ...allied });
});

it("checks a repeated threat once, while retaining different owners and speeds", () => {
  const s = funded("duplicate-danger");
  s.pieces = {};
  for (let i = 0; i < 1000; i++) piece(s, "0,0", 1, "heavy");
  piece(s, "0,0", 1, "cavalry");
  piece(s, "0,0", 2, "heavy");
  // A failed passage forces the predicate to inspect all distinct threats.
  const reach = vi.spyOn(paths, "planningReachable").mockReturnValue(false);
  try {
    const threatened = collectorThreats(s);
    expect(threatened("1,0", false)).toBe(false);
    expect(reach).toHaveBeenCalledTimes(3);
    expect(threatened("1,0", false)).toBe(false);
    expect(reach).toHaveBeenCalledTimes(3);
    expect(threatened("1,0", true)).toBe(false);
    expect(reach).toHaveBeenCalledTimes(3);
  } finally {
    reach.mockRestore();
  }
});

it("reads representative profiles instead of every soldier for both civilian planners", () => {
  const s = funded("grouped-threat-read");
  s.pieces = {};
  for (let i = 0; i < 2_000; i++) piece(s, "0,0", 1, "heavy");
  const score = vi.spyOn(selectors, "points");
  try {
    withPlanningFrame(s, () => {
      const original = colonistDanger(s);
      expect(collectorThreats(s, 0, false)("1,0", false)).toBe(true);
      expect(score).toHaveBeenCalledTimes(2);
      const allied = {
        ...s,
        alliances: [{ id: "safe", members: [0, 1], threat: 2, lockedUntil: 9 }],
      };
      selectors.withSharedPiecePlanningFrame(allied, () => {
        expect(collectorThreats(allied, 0, false)("1,0", false)).toBe(false);
        expect(colonistDanger(allied).map((set) => set.size)).toEqual([0, 0]);
        expect(score).toHaveBeenCalledTimes(2);
      });
      original[0].clear();
      expect(colonistDanger(s)[0].has("0,0")).toBe(true);
      expect(score).toHaveBeenCalledTimes(3);
    });
  } finally {
    score.mockRestore();
  }
});

it("updates threat summaries after movement, ownership, boarding, recruitment and deletion", () => {
  const s = funded("changed-threat-read");
  s.pieces = {};
  for (let i = 0; i < 200; i++)
    piece(s, "0,0", i % 2 ? 1 : 2, i % 3 ? "heavy" : "cavalry");
  const before = JSON.stringify(s);
  check(s);
  withPlanningFrame(s, () => {
    colonistDanger(s);
    const changed = { ...s, pieces: structuredClone(s.pieces) };
    for (const [i, u] of Object.values(changed.pieces).entries()) {
      u.tile = i % 2 ? "3,0" : "-3,0";
      u.owner = 3;
      if (i % 4 === 0) u.carrier = "transport";
      if (i % 5 === 0) delete changed.pieces[u.id];
    }
    piece(changed, "1,0", 1, "merchant");
    const expected = new Set(
      Object.values(changed.pieces)
        .filter((u) => !u.carrier)
        .flatMap((u) =>
          points(u) > 0 ? [u.tile, ...neighbors(u.tile)] : [u.tile],
        ),
    );
    selectors.withSharedPiecePlanningFrame(changed, () => {
      expect([...colonistDanger(changed)[0]]).toEqual([...expected]);
    });
  });
  expect(JSON.stringify(s)).toBe(before);
  const retained = Object.values(s.pieces);
  for (const u of retained) {
    u.owner = 0;
    u.tile = "2,0";
  }
  selectors.withPieceListPlanningFrame(s, retained, () => {
    expect(colonistDanger(s).map((set) => set.size)).toEqual([0, 0]);
    expect(collectorThreats(s, 0, false)("2,0", false)).toBe(false);
  });
  // Mutating after the scope must not reuse an old summary on the same game.
  retained[0].owner = 1;
  expect(colonistDanger(s)[0].has("2,0")).toBe(true);
  expect(collectorThreats(s, 0, false)("2,0", false)).toBe(true);
});

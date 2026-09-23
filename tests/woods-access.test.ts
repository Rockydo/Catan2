import { expect, it, vi } from "vitest";
import {
  canChooseWoods,
  prepareGameView,
  withPlanningFrame,
} from "../src/game/selectors";
import * as maritime from "../src/game/maritime";
import { maritimeFixture } from "./maritime-fixture";
import { piece } from "./helpers";
import type { Game } from "../src/game/types";

function fixture() {
  const { s } = maritimeFixture();
  for (const t of Object.values(s.tiles)) {
    t.biome = "woods";
    t.resource = "lumber";
  }
  const water = s.tiles["0,1"];
  water.resource = "water";
  delete water.biome;
  piece(s, water.id, 0, "merchantship", 3);
  piece(s, "-2,0", 0, "merchant", 1).coverage = ["-3,0"];
  piece(s, "2,-1", 1, "merchant", 3);
  piece(s, "1,-2", 0, "merchant", 4).carrier = "embarked";
  piece(s, "-2,2", 0, "heavy", 4);
  for (const [owner, id] of [
    [0, "-3,1"],
    [1, "3,-1"],
  ] as const) {
    const edge = s.tiles[id].edges[0];
    s.routes[edge] = {
      id: `route-${owner}`,
      edge,
      owner,
      kind: "road",
      camps: { [id]: 1 },
      born: 0,
    };
  }
  return s;
}
function access(s: Game) {
  return [0, 1, 2].map((owner) =>
    Object.keys(s.tiles).map((id) => canChooseWoods(s, id, owner)),
  );
}

it("matches direct access checks for towns, camps, custom/default merchant coverage and ships", () => {
  const s = fixture(),
    before = JSON.stringify(s),
    expected = access(s);
  expect(withPlanningFrame(s, () => access(s))).toEqual(expected);
  prepareGameView(s);
  expect(access(s)).toEqual(expected);
  expect(JSON.stringify(s)).toBe(before);
  expect(canChooseWoods(s, "missing")).toBe(false);
});

it("rebuilds access after coverage, boarding, ownership, camps and town positions change", () => {
  const s = fixture(),
    before = access(s);
  prepareGameView(s);
  const next = structuredClone(s);
  next.towns = {};
  next.routes = {};
  for (const u of Object.values(next.pieces)) {
    u.owner = 1;
    delete u.carrier;
    u.tile = "3,0";
    u.coverage = ["3,-1"];
  }
  const expected = access(next);
  expect(expected).not.toEqual(before);
  expect(withPlanningFrame(next, () => access(next))).toEqual(expected);
  expect(access(s)).toEqual(before);
  // Unregistered drafts can change in place between direct checks.
  expect(canChooseWoods(next, "3,-1", 1)).toBe(true);
  next.pieces = {};
  expect(canChooseWoods(next, "3,-1", 1)).toBe(false);
});

it("computes each unit's coverage once while inspecting all woodlands", () => {
  const s = fixture();
  s.towns = {};
  s.routes = {};
  for (let i = 0; i < 1500; i++) piece(s, "0,0", 0, "heavy", 1);
  const owned = Object.values(s.pieces).filter((u) => u.owner === 0).length;
  const spy = vi.spyOn(maritime, "harvestTiles");
  try {
    withPlanningFrame(s, () => {
      for (const id of Object.keys(s.tiles)) canChooseWoods(s, id, 0);
    });
    expect(spy).toHaveBeenCalledTimes(owned);
  } finally {
    spy.mockRestore();
  }
});

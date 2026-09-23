import { expect, it, vi } from "vitest";
import { militaryObjectiveScorer } from "../src/game/ai-objectives";
import { referenceObjectiveWeight } from "./objective-reference";
import { funded, piece } from "./helpers";
import { leaderPressure, warTarget } from "../src/game/ai-strategy";
import { UNIT_INFO, SHIP_INFO } from "../src/game/content";
import { canOccupy } from "../src/game/world";
import * as selectors from "../src/game/selectors";
import type { Game, Piece, UnitClass, ShipClass } from "../src/game/types";

function fixture() {
  const s = funded("objective-scoring");
  const tiles = Object.values(s.tiles);
  s.pieces = {};
  s.routes = {};
  s.towers = {};
  const land = tiles.filter((t) => canOccupy(t)),
    water = tiles.filter((t) => canOccupy(t, true));
  const kinds = [...Object.keys(UNIT_INFO), ...Object.keys(SHIP_INFO)] as (
    UnitClass | ShipClass
  )[];
  for (let i = 0; i < 160; i++) {
    const kind = kinds[i % kinds.length];
    const places = Object.hasOwn(SHIP_INFO, kind) ? water : land;
    const unit = piece(
      s,
      places[Math.floor(i / 4) % places.length].id,
      i % 4,
      kind,
      1 + (Math.floor(i / 4) % 4),
    );
    if (i % 5 === 0)
      unit.campaign = { enemy: 3, target: tiles[i % tiles.length].id };
    if (i % 7 === 0)
      unit.campaign = { enemy: 2, target: tiles[(i + 3) % tiles.length].id };
    if (i % 9 === 0) unit.carrier = "carrier";
    if (i % 11 === 0) unit.seasonStatus = unit.naval ? "icebound" : "adrift";
    if (i % 13 === 0 && !unit.naval) unit.guildSiege = 4;
  }
  Object.values(s.towns).forEach((town, i) => {
    town.level = 1 + (i % 4);
    town.wall = i % (town.level + 1);
    town.stock = { grain: i * 11, steel: i * 2 };
    if (i % 2 === 0)
      s.towers[town.vertex] = {
        id: `w${i}`,
        vertex: town.vertex,
        owner: town.owner,
        tier: 1 + (i % 4),
      };
  });
  Object.values(s.edges)
    .slice(0, 36)
    .forEach((edge, i) => {
      s.routes[edge.id] = {
        id: `r${i}`,
        edge: edge.id,
        owner: i % 4,
        kind: "road",
        born: 0,
        camps: Object.fromEntries(edge.tiles.map((t) => [t, 1])),
      };
    });
  return s;
}

function compare(s: Game) {
  const before = JSON.stringify(s);
  selectors.withPlanningFrame(s, () => {
    const enemies = Object.values(s.towns)
      .filter((t) => warTarget(s, t.owner))
      .sort((a, b) => leaderPressure(s, b.owner) - leaderPressure(s, a.owner));
    const own = selectors.ownTowns(s);
    const denialAt = (tile: string) =>
      (Math.abs(s.tiles[tile]?.q ?? 0) % 4) / 3;
    const score = militaryObjectiveScorer(s, enemies, own, denialAt);
    const groups = new Map<string, Piece[]>();
    for (const unit of Object.values(s.pieces))
      if (unit.owner === s.active && !unit.carrier) {
        const key = JSON.stringify([unit.tile, unit.naval]);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(unit);
      }
    for (const group of groups.values()) {
      const weights = new Map<string, number>(),
        weight = score(group, weights);
      for (const tile of Object.keys(s.tiles))
        expect(weight(tile), `${s.active}/${group[0].id}/${tile}`).toBe(
          referenceObjectiveWeight(s, enemies, own, denialAt, group, tile),
        );
      const tile = Object.keys(s.tiles)[0];
      weights.set(tile, 123);
      expect(weight(tile)).toBe(123);
    }
  });
  expect(JSON.stringify(s)).toBe(before);
}

it("preserves exact objective weights across ordinary, allied and emergency wars", () => {
  for (const active of [0, 1, 3])
    for (const mode of ["independent", "allied", "emergency"] as const) {
      const s = fixture();
      s.active = active;
      if (mode !== "independent")
        s.alliances = [
          {
            id: "a",
            members: [0, 1, 2],
            threat: 3,
            lockedUntil: 10,
            ...(mode === "emergency" ? { emergency: "locked" as const } : {}),
          },
        ];
      compare(s);
      // A new position has different occupancy, weather, stores and diplomacy.
      const changed = structuredClone(s);
      const first = Object.values(changed.pieces)[0];
      delete changed.pieces[first.id];
      Object.values(changed.towns)[0].stock.gold = 500;
      Object.values(changed.tiles).find(
        (t) => t.resource === "water",
      )!.surface = "frozen";
      changed.alliances = [];
      compare(changed);
    }
});

it("indexes a large coalition once and excludes the moving detachment without double counting orders", () => {
  const s = fixture();
  s.active = 0;
  s.towns = {};
  s.towers = {};
  s.routes = {};
  s.pieces = {};
  s.alliances = [
    {
      id: "a",
      members: [0, 1, 2],
      threat: 3,
      lockedUntil: 10,
      emergency: "locked",
    },
  ];
  const tile = Object.values(s.tiles).find((t) => canOccupy(t))!.id;
  const group: Piece[] = [];
  for (let i = 0; i < 2000; i++) {
    const u = piece(s, tile, i % 2, "heavy", 1 + (i % 4));
    u.campaign = { enemy: 3, target: tile };
    if (i < 4 && u.owner === 0) group.push(u);
  }
  const spy = vi.spyOn(selectors, "allPieces");
  try {
    selectors.withPlanningFrame(s, () => {
      const score = militaryObjectiveScorer(
        s,
        [],
        [],
        () => 2,
      )(group, new Map());
      for (const target of Object.keys(s.tiles)) score(target);
      expect(spy).toHaveBeenCalledTimes(1);
    });
  } finally {
    spy.mockRestore();
  }
  compare(s);
});

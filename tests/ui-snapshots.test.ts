import { describe, expect, it, vi } from "vitest";
import { applyCommand, commandError } from "../src/game/engine";
import {
  prepareGameView,
  allPieces,
  inventory,
  ownTowns,
  ownPieces,
  piecesAt,
  townAt,
  power,
  nearestTown,
  productionSources,
  productionSignature,
  withPlanningFrame,
} from "../src/game/selectors";
import { previewError } from "../src/ui/command-preview";
import { fishingFixture } from "./maritime-fixture";
import { piece } from "./helpers";
import { UNIT_INFO, SHIP_INFO } from "../src/game/content";
import type { Game, Command } from "../src/game/types";

function freeze(value: unknown): void {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return;
  Object.freeze(value);
  for (const child of Object.values(value)) freeze(child);
}
function readings(s: Game) {
  return s.players.map((p) => ({
    stock: inventory(s, p.id),
    towns: ownTowns(s, p.id),
    pieces: ownPieces(s, p.id),
    local: Object.keys(s.tiles).map((tile) => ({
      pieces: piecesAt(s, tile),
      power: power(s, piecesAt(s, tile), tile),
      nearest: nearestTown(s, tile, p.id)?.id,
    })),
    sources: productionSources(s).filter((source) => source.owner === p.id),
  }));
}

describe("immutable UI snapshots", () => {
  it("does not index troops for a stock-only read and shares one scan across unit views", () => {
    const { s, water } = fishingFixture();
    for (let i = 0; i < 1000; i++) piece(s, water, 0, "fishing");
    let scans = 0;
    s.pieces = new Proxy(s.pieces, {
      ownKeys(target) {
        scans++;
        return Reflect.ownKeys(target);
      },
    });
    prepareGameView(s);
    inventory(s);
    expect(scans).toBe(0);
    expect(piecesAt(s, water)).toHaveLength(1000);
    expect(ownPieces(s)).toHaveLength(1000);
    expect(piecesAt(s, water)).toHaveLength(1000);
    expect(allPieces(s)).toHaveLength(1000);
    productionSources(s);
    productionSignature(s);
    expect(scans).toBe(1);
  });
  it("restores nested read scopes and never indexes an unregistered mutable draft", () => {
    const { s, water } = fishingFixture();
    piece(s, water, 0, "fishing");
    const child = structuredClone(s);
    piece(child, water, 1, "fishing");
    const draft = { ...s, pieces: { ...s.pieces } };
    withPlanningFrame(s, () => {
      const original = allPieces(s);
      expect(() =>
        withPlanningFrame(child, () => {
          expect(allPieces(child)).toHaveLength(2);
          throw Error("abort read");
        }),
      ).toThrow("abort read");
      expect(allPieces(s)).toBe(original);
      expect(allPieces(draft)).toHaveLength(1);
      piece(draft, water, 0, "fishing");
      expect(allPieces(draft)).toHaveLength(2);
      expect(allPieces(s)).toHaveLength(1);
    });
    // Mutable transactions outside a scope cannot reuse a previous read.
    piece(s, water, 0, "fishing");
    expect(allPieces(s)).toHaveLength(2);
  });
  it("keeps own-record order, including numeric keys and deletion/reinsertion", () => {
    const { s, water } = fishingFixture();
    const first = piece(s, water),
      second = piece(s, water),
      third = piece(s, water);
    const records = Object.create({ inherited: first });
    records.u10 = first;
    records[3] = second;
    records[1] = third;
    records.u20 = second;
    delete records.u10;
    records.u10 = first;
    Object.defineProperty(records, "hidden", { value: third });
    s.pieces = records;
    const expected = Object.values(records);
    expect(allPieces(s)).toEqual(expected);
    withPlanningFrame(s, () => {
      expect(allPieces(s)).toEqual(expected);
      expect(ownPieces(s)).toEqual(expected);
      expect(piecesAt(s, water)).toEqual(expected);
    });
  });
  it("matches uncached lookups and keeps transaction drafts independent", () => {
    const { s, home, water } = fishingFixture();
    const land = s.vertices[home.vertex].tiles.find(
      (id) => s.tiles[id].resource !== "water",
    )!;
    piece(s, land, 0, "heavy", 3);
    piece(s, water, 0, "fishing", 2);
    const expected = readings(s);
    const before = structuredClone(s);
    prepareGameView(s);
    expect(readings(s)).toEqual(expected);
    expect(withPlanningFrame(s, () => readings(s))).toEqual(expected);
    inventory(s).gold = -100;
    ownTowns(s).pop();
    ownPieces(s).reverse();
    piecesAt(s, land).pop();
    expect(readings(s)).toEqual(expected);
    expect(townAt(s, home.vertex)).toBe(home);
    freeze(s);
    const commands: Command[] = [
      { type: "ship", town: home.id, tile: water, kind: "galley", count: 2 },
      { type: "recruit", town: home.id, tile: land, kind: "heavy", count: 2 },
      { type: "bank", give: { gold: 1 }, take: { lumber: 1 } },
      { type: "wall", town: home.id },
    ];
    for (const c of commands) {
      const expectedResult = applyCommand(before, c);
      const result = applyCommand(s, c);
      expect(result).toEqual(expectedResult);
      expect(result.ok).toBe(true);
      prepareGameView(result.state);
      expect(readings(result.state)).toEqual(readings(expectedResult.state));
      expect(readings(s)).toEqual(expected);
    }
    expect(s).toEqual(before);
  });

  it("caches repeated menu checks, but invalidates costs and legality after an action", () => {
    const { s, home } = fishingFixture();
    home.level = 2;
    home.wall = 1;
    const command = { type: "wall", town: home.id };
    const clone = vi.spyOn(globalThis, "structuredClone");
    try {
      expect(previewError(s, command)).toBeUndefined();
      const count = clone.mock.calls.length;
      expect(previewError(s, { ...command })).toBeUndefined();
      expect(clone.mock.calls.length).toBe(count);
      const result = applyCommand(s, command);
      expect(result.ok).toBe(true);
      expect(previewError(result.state, command)).toBe(
        "Upgrade the town to unlock a higher wall.",
      );
      expect(previewError(s, command)).toBeUndefined();
    } finally {
      clone.mockRestore();
    }
  });
});

describe("lightweight order previews", () => {
  it("matches real recruitment, ships, upgrades and guild validation without mutating any live data", () => {
    const { s, home, water } = fishingFixture();
    const land = s.vertices[home.vertex].tiles.find(
      (id) => s.tiles[id].resource !== "water",
    )!;
    s.players[0].bonuses.recruits = [{ tier: 1, classes: ["heavy"] }];
    s.players[0].bonuses.ships = [["galley"], ["fishing"]];
    s.players[0].bonuses.shipTiers = [1, 2];
    const commands: Command[] = [
      ...Object.keys(UNIT_INFO).flatMap((kind) =>
        [1, 4].flatMap((tier) =>
          [1, 3, 100].map((count) => ({
            type: "recruit",
            town: home.id,
            tile: land,
            kind,
            tier,
            count,
          })),
        ),
      ),
      ...Object.keys(SHIP_INFO).flatMap((kind) =>
        [1, 4].flatMap((tier) =>
          [1, 3, 101].map((count) => ({
            type: "ship",
            town: home.id,
            tile: water,
            kind,
            tier,
            count,
          })),
        ),
      ),
      { type: "recruit", town: home.id, tile: water, kind: "heavy" },
      { type: "ship", town: home.id, tile: land, kind: "galley" },
      { type: "recruit", town: home.id, tile: land, kind: "heavy", count: 0 },
      { type: "recruit", town: home.id, tile: land, kind: "heavy", count: 101 },
      { type: "city", town: home.id },
      { type: "wall", town: home.id },
      { type: "extension", town: home.id, tile: land },
      { type: "guild", town: home.id, kind: "artisans" },
    ];
    for (const funded of [true, false]) {
      const snapshot = structuredClone(s);
      if (!funded)
        for (const t of Object.values(snapshot.towns))
          t.stock = { gold: 2, goldbars: 1, fish: 2, oil: 2 };
      freeze(snapshot);
      for (const c of commands)
        expect(commandError(snapshot, c)).toBe(applyCommand(snapshot, c).error);
    }
  });

  it("preserves deployment blockers, vouchers and phase/actor restrictions", () => {
    const { s, home, water } = fishingFixture();
    const c = {
      type: "ship",
      town: home.id,
      tile: water,
      kind: "galley",
      count: 2,
    };
    const check = (state: Game, command: Command = c) => {
      const before = structuredClone(state);
      expect(commandError(state, command)).toBe(
        applyCommand(state, command).error,
      );
      expect(state).toEqual(before);
    };
    for (const phase of [
      "setup-town",
      "roll",
      "military",
      "economy",
      "finished",
    ] as const)
      check({ ...s, phase });
    check(s, { ...c, actor: 1 });
    check(s, { ...c, town: "missing" });
    s.players[0].bonuses.ships = [["galley"]];
    for (const t of Object.values(s.towns)) t.stock = {};
    check(s);
    piece(s, water, 1, "galley");
    check(s);
  });
});

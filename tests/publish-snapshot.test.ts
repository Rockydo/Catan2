import { describe, expect, it, vi } from "vitest";
import { sharePublishedSnapshot } from "../src/ui/publish-snapshot";
import { applyCommand } from "../src/game/engine";
import { serialize, deserialize, assertInvariants } from "../src/game/save";
import { hash, addHexes, neighbors } from "../src/game/world";
import { funded, piece } from "./helpers";
import {
  ownTowns,
  prepareGameView,
  allPieces,
  retainPieceRead,
} from "../src/game/selectors";
import { copyRecords } from "../src/game/record-copy";

describe("published campaign sharing", () => {
  it("retains map and army identity through a paid order without changing state or either input", () => {
    const previous = funded("publication");
    const unit = piece(previous, "0,0");
    const before = JSON.stringify(previous);
    const order = {
      type: "bank",
      give: { gold: 1 },
      take: { grain: 1 },
    } as const;
    const result = applyCommand(previous, order);
    expect(result.ok).toBe(true);
    const output = JSON.stringify(result.state);
    const published = sharePublishedSnapshot(previous, result.state);
    expect(JSON.stringify(published)).toBe(output);
    expect(JSON.stringify(previous)).toBe(before);
    expect(JSON.stringify(result.state)).toBe(output);
    for (const key of [
      "tiles",
      "vertices",
      "edges",
      "pieces",
      "routes",
      "players",
    ] as const)
      expect(published[key]).toBe(previous[key]);
    expect(published.towns).not.toBe(previous.towns);
    expect(published.pieces[unit.id]).toBe(unit);
    const subsequent = applyCommand(published, order);
    const unshared = applyCommand(result.state, order);
    expect(subsequent).toEqual(unshared);
    expect(JSON.stringify(previous)).toBe(before);
    expect(JSON.stringify(published)).toBe(output);
    assertInvariants(deserialize(serialize(subsequent.state)));
  });

  it("refreshes terrain, ports, armies, weather and diplomacy while keeping unrelated layers", () => {
    const previous = funded("changed-publication");
    const unit = piece(previous, "0,0");
    const variants = [
      (s: typeof previous) => {
        s.tiles["0,0"].woodsChoices = { 0: "hides" };
      },
      (s: typeof previous) => {
        s.tiles["0,0"].surface = "frozen";
      },
      (s: typeof previous) => {
        s.pieces[unit.id].moved++;
      },
      (s: typeof previous) => {
        s.towns[ownTowns(s)[0].id].owner = 1;
      },
      (s: typeof previous) => {
        s.players[0].hand.push({
          id: "card",
          kind: "harvest",
          tier: 1,
          bought: 0,
        });
      },
      (s: typeof previous) => {
        s.alliances = [
          { id: "allied", members: [0, 1], threat: 2, lockedUntil: 5 },
        ];
      },
      (s: typeof previous) => {
        addHexes(s, s.seed, Object.keys(s.tiles).flatMap(neighbors));
      },
    ];
    for (const change of variants) {
      const next = structuredClone(previous);
      change(next);
      const published = sharePublishedSnapshot(previous, next);
      expect(published).toEqual(next);
      for (const key of [
        "tiles",
        "vertices",
        "edges",
        "pieces",
        "players",
        "alliances",
      ] as const) {
        if (JSON.stringify(previous[key]) === JSON.stringify(next[key]))
          expect(published[key]).toBe(previous[key]);
        else expect(published[key]).not.toBe(previous[key]);
      }
    }
  });

  it("writes the identical checksummed export format with only one game encoding", () => {
    const s = funded("single-encoding");
    ownTowns(s)[0].name = 'Quotes " and \\ and café';
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-22T12:00:00Z"));
    try {
      const expected = JSON.stringify({
        format: "catane-frontiers",
        version: 14,
        savedAt: new Date().toISOString(),
        checksum: hash(JSON.stringify(s)).toString(16),
        game: s,
      });
      expect(serialize(s)).toBe(expected);
      assertInvariants(deserialize(serialize(s)));
    } finally {
      vi.useRealTimers();
    }
  });

  it("compares shared armies without serializing either roster", () => {
    const previous = funded("shared-roster-publication");
    for (let i = 0; i < 3000; i++) piece(previous, "0,0", i % 4);
    prepareGameView(previous);
    allPieces(previous);
    const keys = retainPieceRead(previous)!.recordKeys!;
    const unchanged = JSON.stringify(previous);
    const next = { ...previous, pieces: copyRecords(previous.pieces) };
    const stringify = vi.spyOn(JSON, "stringify");
    let published: typeof previous;
    try {
      published = sharePublishedSnapshot(previous, next, keys);
      expect(stringify).not.toHaveBeenCalled();
    } finally {
      stringify.mockRestore();
    }
    expect(published!.pieces).toBe(previous.pieces);
    expect(JSON.stringify(published!)).toBe(unchanged);
    expect(JSON.stringify(previous)).toBe(unchanged);

    // Membership changes are enough to reject sharing, even with shared troops.
    piece(next, "0,0");
    const spy = vi.spyOn(JSON, "stringify");
    try {
      expect(sharePublishedSnapshot(previous, next, keys).pieces).toBe(
        next.pieces,
      );
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it("checks unsampled units, nested values, removals and dictionary ordering", () => {
    const previous = funded("changed-roster-publication");
    for (let i = 0; i < 20; i++) piece(previous, "0,0", i % 4);
    const keys = Object.keys(previous.pieces),
      original = JSON.stringify(previous);
    for (let i = 0; i < keys.length; i++) {
      const next = { ...previous, pieces: copyRecords(previous.pieces) };
      next.pieces[keys[i]] = {
        ...next.pieces[keys[i]],
        coverage: ["0,0", "1,0"],
      };
      const expected = JSON.stringify(next);
      const stringify = vi.spyOn(JSON, "stringify");
      let published: typeof previous;
      try {
        published = sharePublishedSnapshot(previous, next, keys);
        expect(
          stringify.mock.calls.some(
            ([value]) => value === previous.pieces || value === next.pieces,
          ),
        ).toBe(false);
      } finally {
        stringify.mockRestore();
      }
      expect(published!.pieces).toBe(next.pieces);
      expect(JSON.stringify(published!)).toBe(expected);
    }
    for (const remove of [false, true]) {
      const next = { ...previous, pieces: copyRecords(previous.pieces) };
      delete next.pieces[keys[1]];
      if (!remove) next.pieces[keys[1]] = previous.pieces[keys[1]];
      const published = sharePublishedSnapshot(previous, next, keys);
      expect(published.pieces).toBe(next.pieces);
      expect(Object.keys(published.pieces)).toEqual(Object.keys(next.pieces));
    }
    expect(JSON.stringify(previous)).toBe(original);
  });

  it("retains JSON equivalence for optional troop fields and property order", () => {
    const previous = funded("optional-roster-publication");
    for (let i = 0; i < 4; i++) piece(previous, "0,0");
    const keys = Object.keys(previous.pieces),
      id = keys[1];
    const next = { ...previous, pieces: copyRecords(previous.pieces) };
    next.pieces[id] = { ...next.pieces[id], coverage: undefined };
    expect(JSON.stringify(next.pieces)).toBe(JSON.stringify(previous.pieces));
    expect(sharePublishedSnapshot(previous, next, keys).pieces).toBe(
      previous.pieces,
    );
    const reordered = { ...next, pieces: copyRecords(next.pieces) };
    reordered.pieces[id] = Object.fromEntries(
      Object.entries(next.pieces[id]).reverse(),
    ) as (typeof next.pieces)[string];
    expect(JSON.stringify(reordered.pieces)).not.toBe(
      JSON.stringify(previous.pieces),
    );
    expect(sharePublishedSnapshot(previous, reordered, keys).pieces).toBe(
      reordered.pieces,
    );
  });

  it("keeps the whole-encoding fallback for cold and completely detached rosters", () => {
    const previous = funded("cold-roster-publication");
    for (let i = 0; i < 20; i++) piece(previous, "0,0");
    for (const known of [false, true]) {
      const next = structuredClone(previous);
      const keys = known ? Object.keys(previous.pieces) : undefined;
      const stringify = vi.spyOn(JSON, "stringify");
      try {
        expect(sharePublishedSnapshot(previous, next, keys).pieces).toBe(
          previous.pieces,
        );
        expect(
          stringify.mock.calls.some(([value]) => value === next.pieces),
        ).toBe(true);
        expect(
          stringify.mock.calls.some(([value]) =>
            Object.values(next.pieces).includes(value as any),
          ),
        ).toBe(false);
      } finally {
        stringify.mockRestore();
      }
    }
    const empty = { ...previous, pieces: {} };
    expect(
      sharePublishedSnapshot(empty, { ...empty, pieces: {} }, []).pieces,
    ).toBe(empty.pieces);
  });
});

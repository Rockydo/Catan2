import { describe, expect, it, vi } from "vitest";
import { sharePublishedSnapshot } from "../src/ui/publish-snapshot";
import { applyCommand } from "../src/game/engine";
import { serialize, deserialize, assertInvariants } from "../src/game/save";
import { hash, addHexes, neighbors } from "../src/game/world";
import { funded, piece } from "./helpers";
import { ownTowns } from "../src/game/selectors";

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
});

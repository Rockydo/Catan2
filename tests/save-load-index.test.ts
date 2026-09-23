import { expect, it, vi } from "vitest";
import {
  deserialize,
  serialize,
  serializePacked,
  assertInvariants,
} from "../src/game/save";
import * as packing from "../src/game/save-packing";
import { allPieces, withPlanningFrame } from "../src/game/selectors";
import { fishingFixture } from "./maritime-fixture";
import { piece } from "./helpers";

it("reuses the fully validated army for load-time coalition checks", () => {
  const { s, water } = fishingFixture();
  for (let i = 0; i < 4000; i++) piece(s, water, 0, "fishing", 1);
  const text = serialize(s),
    expected = JSON.stringify(deserialize(text));
  const parse = JSON.parse;
  let scans = 0;
  const spy = vi.spyOn(JSON, "parse").mockImplementation((input) => {
    const value = parse(input);
    if (value?.format === "catane-frontiers")
      value.game.pieces = new Proxy(value.game.pieces, {
        ownKeys(target) {
          scans++;
          return Reflect.ownKeys(target);
        },
      });
    return value;
  });
  let restored;
  try {
    restored = deserialize(text);
  } finally {
    spy.mockRestore();
  }
  // One enumeration for the checksum and one for full validation; no third
  // enumeration for the following coalition power read.
  expect(scans).toBe(2);
  expect(JSON.stringify(restored)).toBe(expected);
  expect(restored.alliances?.[0]?.threat).toBe(0);
  assertInvariants(restored);
});

it("does not retain loaded troop indexes or disturb an enclosing read scope", () => {
  const outer = fishingFixture(),
    inner = fishingFixture();
  piece(outer.s, outer.water, 0, "fishing", 1);
  for (let i = 0; i < 20; i++) piece(inner.s, inner.water, 0, "fishing", 1);
  const text = serialize(inner.s);
  withPlanningFrame(outer.s, () => {
    const before = allPieces(outer.s);
    const loaded = deserialize(text);
    expect(allPieces(outer.s)).toBe(before);
    const first = allPieces(loaded);
    piece(loaded, inner.water, 0, "fishing", 2);
    expect(allPieces(loaded)).toHaveLength(first.length + 1);
    expect(allPieces(outer.s)).toBe(before);
    // Invalid input fails validation without leaking a partial load scope.
    const invalid = structuredClone(inner.s);
    Object.values(invalid.pieces)[0].tier = 9;
    expect(() => deserialize(serialize(invalid))).toThrow(/whole-number/);
    expect(allPieces(outer.s)).toBe(before);
  });
});

it("validates every restored unit without re-enumerating the compact archive's checked keys", () => {
  const { s, water } = fishingFixture();
  for (let i = 0; i < 4000; i++) piece(s, water, 0, "fishing", 1);
  const units = Object.values(s.pieces);
  delete s.pieces[units[12].id];
  s.pieces[units[12].id] = units[12];
  const text = serializePacked(s),
    expected = JSON.stringify(deserialize(serialize(s)));
  const restore = packing.unpackGameSnapshot;
  let scans = 0,
    reads = 0;
  const spy = vi
    .spyOn(packing, "unpackGameSnapshot")
    .mockImplementation((...args) => {
      const result = restore(...args);
      result.game.pieces = new Proxy(result.game.pieces, {
        ownKeys(target) {
          scans++;
          return Reflect.ownKeys(target);
        },
        get(target, key, receiver) {
          if (typeof key === "string" && Object.hasOwn(target, key)) reads++;
          return Reflect.get(target, key, receiver);
        },
      });
      return result;
    });
  let restored;
  try {
    restored = deserialize(text);
    expect(scans).toBe(0);
    expect(reads).toBeGreaterThanOrEqual(units.length);
    // A valid checksum and correct compact structure do not bypass game rules.
    units[2500].tier = 9;
    expect(() => deserialize(serializePacked(s))).toThrow(/whole-number/);
    units[2500].tier = 1;
    const old = JSON.parse(text);
    old.version = 13;
    scans = 0;
    deserialize(JSON.stringify(old));
    expect(scans).toBe(1); // Historical migrations keep their fresh enumeration.
  } finally {
    spy.mockRestore();
  }
  expect(JSON.stringify(restored)).toBe(expected);
  expect(Object.keys(restored.pieces)).toEqual(Object.keys(s.pieces));
  const before = allPieces(restored).length;
  piece(restored, water, 0, "fishing", 2);
  expect(allPieces(restored)).toHaveLength(before + 1);
  assertInvariants(restored);
});

import { describe, expect, it } from "vitest";
import { packGame, unpackGame } from "../src/game/save-packing";
import { deserialize, serialize, serializePacked } from "../src/game/save";
import {
  compress,
  expand,
  exportCompact,
  importSave,
} from "../src/storage/codec";
import { hash } from "../src/game/world";
import { fishingFixture } from "./maritime-fixture";
import { piece } from "./helpers";

const onDisk = (value: unknown) => JSON.parse(JSON.stringify(value));

it("preserves the exact JSON and enumeration order with independent unit records", () => {
  const { s, water } = fishingFixture();
  const a = piece(s, water, 0, "fishing", 3);
  const b = piece(s, water, 0, "fishing", 3);
  const c = piece(s, water, 0, "fishing", 4);
  Object.assign(a, {
    coverage: [water],
    future: { choices: [{ id: "future" }] },
  });
  Object.assign(b, {
    coverage: [water],
    future: { choices: [{ id: "future" }] },
  });
  // Reinserted and non-numeric IDs must keep their order, too.
  delete s.pieces[a.id];
  s.pieces[a.id] = a;
  s.pieces.civilian = { ...c, id: "civilian", bonus: 2 };
  const packed = onDisk(packGame(s));
  expect(packed.pieces.templates).toHaveLength(3);
  const restored = unpackGame(packed);
  expect(JSON.stringify(restored)).toBe(JSON.stringify(s));
  expect(Object.keys(restored.pieces)).toEqual(Object.keys(s.pieces));
  expect(restored.pieces[a.id]).not.toBe(restored.pieces[b.id]);
  const first = restored.pieces[a.id] as any;
  first.coverage.push("elsewhere");
  first.future.choices[0].id = "changed";
  expect((restored.pieces[b.id] as any).future.choices[0].id).toBe("future");
  expect(restored.pieces[b.id].coverage).toEqual([water]);
  expect((a as any).future.choices[0].id).toBe("future");
});

it("delta-encodes non-consecutive and reordered IDs without changing unit order", () => {
  const { s, water } = fishingFixture();
  const a = piece(s, water),
    b = piece(s, water),
    c = piece(s, water);
  delete s.pieces[b.id];
  s.pieces[b.id] = b;
  const packed = onDisk(packGame(s));
  expect(packed.pieces.keys.prefix).toBe("u");
  expect(packed.pieces.keys.deltas).toEqual([Number(a.id.slice(1)), 2, -1]);
  expect(Object.keys(unpackGame(packed).pieces)).toEqual([a.id, c.id, b.id]);
});

it("copies nested prototype-named fields as independent own data", () => {
  const { s, water } = fishingFixture();
  for (let i = 0; i < 2; i++) {
    const unit = piece(s, water);
    Object.assign(unit, {
      future: JSON.parse('{"__proto__":{"flag":true},"constructor":{"x":2}}'),
    });
    Object.defineProperty(unit, "__proto__", {
      value: { value: 3 },
      enumerable: true,
    });
  }
  const restored = unpackGame(onDisk(packGame(s)));
  expect(JSON.stringify(restored)).toBe(JSON.stringify(s));
  const [a, b] = Object.values(restored.pieces) as any[];
  expect(Object.getPrototypeOf(a)).toBe(Object.prototype);
  expect(Object.getPrototypeOf(a.future)).toBe(Object.prototype);
  a.future.__proto__.flag = false;
  a.__proto__.value = 4;
  expect(b.future.__proto__.flag).toBe(true);
  expect(b.__proto__.value).toBe(3);
  expect((Object.prototype as any).flag).toBeUndefined();
});

it("round-trips empty armies and differently ordered fields without dropping data", () => {
  const { s, water } = fishingFixture();
  expect(JSON.stringify(unpackGame(onDisk(packGame(s))))).toBe(
    JSON.stringify(s),
  );
  const a = piece(s, water),
    b = piece(s, water);
  s.pieces[b.id] = Object.assign({ bonus: 0 }, b);
  const packed = onDisk(packGame(s));
  expect(packed.pieces.templates).toHaveLength(2);
  expect(JSON.stringify(unpackGame(packed))).toBe(JSON.stringify(s));
  expect(s.pieces[a.id]).toBe(a);
});

it("shrinks a large campaign further than gzip alone and loads all supported encodings", async () => {
  const { s, water } = fishingFixture();
  for (let i = 0; i < 5000; i++) piece(s, water, 0, "fishing", 4);
  const legacy = serialize(s),
    packed = serializePacked(s);
  const plainGzip = await compress(legacy),
    packedGzip = await compress(packed);
  expect(packed.length).toBeLessThan(legacy.length * 0.3);
  expect(packedGzip.length).toBeLessThan(plainGzip.length * 0.6);
  const expected = deserialize(legacy);
  expect(deserialize(await expand(packedGzip))).toEqual(expected);
  expect(await importSave(await exportCompact(s))).toEqual(expected);
  const oldExport = JSON.stringify({
    format: "catane-frontiers-compressed",
    version: 1,
    encoding: "gzip-base64",
    data: Buffer.from(plainGzip).toString("base64"),
  });
  expect(await importSave(oldExport)).toEqual(expected);
  expect(await importSave(legacy)).toEqual(expected);
});

it("verifies the compact checksum and packing version before expanding units", () => {
  const { s, water } = fishingFixture();
  piece(s, water);
  const data = JSON.parse(serializePacked(s));
  data.game.pieces.rows[0] = 99;
  expect(() => deserialize(JSON.stringify(data))).toThrow(/integrity/);
  data.checksum = hash(JSON.stringify(data.game)).toString(16);
  expect(() => deserialize(JSON.stringify(data))).toThrow(/compact/);
  data.packing = 3;
  expect(() => deserialize(JSON.stringify(data))).toThrow(/supported/);
});

describe("reject malformed compact tables before exposing a campaign", () => {
  for (const [name, mutate] of Object.entries({
    duplicate: (p: any): unknown => (p.keys.deltas[1] = 0),
    missingRow: (p: any): unknown => p.rows.pop(),
    invalidTemplate: (p: any): unknown => (p.rows[0] = -1),
    fractionalTemplate: (p: any): unknown => (p.rows[0] = 0.5),
    invalidDelta: (p: any): unknown => (p.keys.deltas[0] = 0.5),
    unsafeDelta: (p: any): unknown =>
      (p.keys.deltas[0] = Number.MAX_SAFE_INTEGER + 1),
    prefix: (p: any): unknown => (p.keys.prefix = "__proto__"),
    unsafeKey: (p: any): unknown => (p.keys = ["__proto__", "valid"]),
    invalidId: (p: any): unknown => (p.templates[0].id = "different"),
    templateArray: (p: any): unknown => (p.templates[0] = []),
  }))
    it(name, () => {
      const { s, water } = fishingFixture();
      piece(s, water);
      piece(s, water);
      const packed = onDisk(packGame(s));
      mutate(packed.pieces);
      expect(() => unpackGame(packed)).toThrow(/compact/);
    });
});

it("bounds amplification from shared templates and rejects excessive nesting", () => {
  const { s, water } = fishingFixture();
  for (let i = 0; i < 2000; i++) piece(s, water);
  const packed = onDisk(packGame(s));
  packed.pieces.templates[0].payload = "x".repeat(100_000);
  expect(() => unpackGame(packed)).toThrow(/expanded limit/);
  packed.pieces.templates[0].payload = "é".repeat(40_000);
  expect(() => unpackGame(packed)).toThrow(/expanded limit/);
  for (const unit of Object.values(s.pieces))
    Object.assign(unit, { payload: packed.pieces.templates[0].payload });
  // An autosave must not acknowledge an archive that its loader will reject.
  expect(() => packGame(s)).toThrow(/expanded limit/);
  let nested: unknown = 0;
  for (let i = 0; i < 70; i++) nested = [nested];
  packed.pieces.templates[0].payload = nested;
  expect(() => unpackGame(packed)).toThrow(/compact/);
});

import { describe, expect, it } from "vitest";
import {
  packGame,
  unpackGame,
  unpackGameSnapshot,
  restoreValidatedGame,
} from "../src/game/save-packing";
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

it("does not mistake comma-containing future field names for the normal unit layout", () => {
  const { s, water } = fishingFixture();
  const unit = piece(s, water);
  const packed = onDisk(packGame(s));
  const template = packed.pieces.templates[0];
  packed.pieces.templates[0] = Object.fromEntries(
    Object.entries(template).flatMap(([field, value]) =>
      field === "owner"
        ? [["owner,kind", { preserved: value }]]
        : field === "kind"
          ? []
          : [[field, value]],
    ),
  );
  const restored = unpackGame(packed).pieces[unit.id] as any;
  expect(restored["owner,kind"]).toEqual({ preserved: unit.owner });
  expect(Object.hasOwn(restored, "owner")).toBe(false);
  expect(Object.hasOwn(restored, "kind")).toBe(false);
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

it("restores repeated orders with independent branches even inside mixed arrays", () => {
  const { s, water } = fishingFixture();
  const order = JSON.parse(
    '{"path":[null,3,"雪",[1,{"target":"island"}]],"__proto__":{"orders":[]},"empty":{}}',
  );
  for (let i = 0; i < 128; i++)
    Object.assign(piece(s, water), { futureOrder: order });
  const packed = onDisk(packGame(s));
  for (const restore of [unpackGame, restoreValidatedGame]) {
    const loaded = restore(packed);
    expect(JSON.stringify(loaded)).toBe(JSON.stringify(s));
    const [a, b] = Object.values(loaded.pieces) as any[];
    a.futureOrder.path[3][1].target = "changed";
    a.futureOrder.__proto__.orders.push("move");
    a.futureOrder.empty.created = true;
    expect(b.futureOrder).toEqual(order);
    expect(packed.pieces.templates[0].futureOrder).toEqual(order);
    expect(Object.getPrototypeOf(a.futureOrder)).toBe(Object.prototype);
  }
});

it("bounds nested template restoration before allocating an army", () => {
  const { s, water } = fishingFixture();
  for (let i = 0; i < 128; i++) piece(s, water);
  const packed = onDisk(packGame(s));
  let nested: unknown = 1;
  for (let i = 0; i < 64; i++) nested = [nested];
  packed.pieces.templates[0].future = nested;
  expect(() => unpackGame(packed)).not.toThrow();
  packed.pieces.templates[0].future = [[nested]];
  expect(() => unpackGame(packed)).toThrow(/compact save is damaged/);
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

it("keeps independent optional orders, effects and future values on the normal troop layout", () => {
  const { s, water } = fishingFixture();
  for (let i = 0; i < 2; i++) {
    const unit = piece(s, water);
    Object.assign(unit, {
      guildSupplied: true,
      guildSiege: 4,
      campaign: { enemy: 1, target: water },
      future: { nested: [null, { value: "雪" }] },
    });
    Object.defineProperty(unit, "__proto__", {
      value: { intact: true },
      enumerable: true,
    });
  }
  const expected = JSON.stringify(s),
    packed = onDisk(packGame(s));
  for (const restore of [unpackGame, restoreValidatedGame]) {
    const restored = restore(packed);
    expect(JSON.stringify(restored)).toBe(expected);
    const [a, b] = Object.values(restored.pieces) as any[];
    expect(Object.getPrototypeOf(a)).toBe(Object.prototype);
    a.campaign.target = "changed";
    a.future.nested[1].value = "edited";
    a.__proto__.intact = false;
    expect(b.campaign.target).toBe(water);
    expect(b.future.nested[1].value).toBe("雪");
    expect(b.__proto__.intact).toBe(true);
    expect(JSON.stringify(s)).toBe(expected);
    expect(JSON.stringify(restore(packed))).toBe(expected);
  }
});

it("does not reuse literal archive IDs as dictionary order when JS sorts integer property names", () => {
  const { s, water } = fishingFixture();
  for (let i = 0; i < 3; i++) piece(s, water);
  const packed = onDisk(packGame(s));
  packed.pieces.keys = ["10", "two", "2"];
  const result = unpackGameSnapshot(packed);
  expect(result.keys).toBeUndefined();
  expect(Object.keys(result.game.pieces)).toEqual(["2", "10", "two"]);
  expect(Object.values(result.game.pieces).map((u) => u.id)).toEqual([
    "2",
    "10",
    "two",
  ]);
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
  data.game[1].pieces.rows[0] = 99;
  expect(() => deserialize(JSON.stringify(data))).toThrow(/integrity/);
  data.checksum = hash(JSON.stringify(data.game)).toString(16);
  expect(() => deserialize(JSON.stringify(data))).toThrow(/compact/);
  data.packing = 99;
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

it("reuses adjacent troop descriptions without overlooking any field, order or later edit", () => {
  const { s, water } = fishingFixture();
  const base = piece(s, water, 0, "fishing", 3);
  for (const [field, value] of Object.entries({
    owner: 2,
    kind: "transport",
    naval: false,
    tier: 4,
    tile: "elsewhere",
    born: 9,
    moved: 1,
    acted: true,
    bonus: 5,
  })) {
    piece(s, water, 0, "fishing", 3);
    Object.assign(piece(s, water, 0, "fishing", 3), { [field]: value });
  }
  const extra = piece(s, water, 0, "fishing", 3);
  Object.assign(extra, { future: { value: 5 } });
  const reordered = piece(s, water, 0, "fishing", 3);
  s.pieces[reordered.id] = Object.assign({ bonus: 0 }, reordered);
  const unknown = piece(s, water, 0, "fishing", 3);
  delete (unknown as any).bonus;
  Object.assign(unknown, { future: 3 });
  const check = () =>
    expect(JSON.stringify(unpackGame(onDisk(packGame(s))))).toBe(
      JSON.stringify(s),
    );
  check();
  base.bonus = 16;
  (extra as any).future.value = 7;
  check();
});

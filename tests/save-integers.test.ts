import { expect, it } from "vitest";
import { packIntegers, unpackIntegers } from "../src/game/save-integers";
import { packGame } from "../src/game/save-packing";
import { packTables } from "../src/game/save-tables";
import { packReferences } from "../src/game/save-references";
import { packSpatial } from "../src/game/save-spatial";
import { deserialize, serialize, serializePacked } from "../src/game/save";
import { compress } from "../src/storage/codec";
import { hash } from "../src/game/world";
import { fishingFixture } from "./maritime-fixture";
import { piece } from "./helpers";

const disk = (value: unknown) => JSON.parse(JSON.stringify(value));
function fixture() {
  const { s, water } = fishingFixture();
  for (let i = 0; i < 500; i++) piece(s, water, 0, "fishing", 3);
  return s;
}
function integers(values: unknown[]) {
  return [
    [],
    {
      tiles: { keys: values, layouts: [], order: [] },
      pieces: { keys: [], templates: [], rows: [] },
    },
  ];
}

it("preserves full games, optional fields, record order and all previous save formats", async () => {
  const s = fixture(),
    tiles = Object.values(s.tiles);
  Object.assign(tiles[0], {
    future: { ints: "not an encoding", length: 4, unicode: "Forêt 雪" },
  });
  const units = Object.keys(s.pieces);
  const first = s.pieces[units[0]];
  delete s.pieces[first.id];
  s.pieces[first.id] = first;
  const before = JSON.stringify(s),
    modern = JSON.parse(serializePacked(s));
  expect(modern.packing).toBe(9);
  const templates = packGame(s),
    tables = packTables(templates),
    refs = packReferences(tables);
  expect(JSON.stringify(unpackIntegers(disk(packIntegers(refs))))).toBe(
    JSON.stringify(refs),
  );
  const expected = JSON.stringify(deserialize(serialize(s)));
  for (const [packing, game] of [
    [1, templates],
    [2, tables],
    [3, refs],
    [4, packIntegers(refs)],
    [5, packSpatial(packIntegers(refs))],
    [modern.packing, modern.game],
  ]) {
    const text = JSON.stringify({
      ...modern,
      packing,
      game,
      checksum: hash(JSON.stringify(game)).toString(16),
    });
    expect(JSON.stringify(deserialize(text))).toBe(expected);
  }
  expect(JSON.stringify(s)).toBe(before);
  expect((await compress(JSON.stringify(modern.game))).length).toBeLessThan(
    (await compress(JSON.stringify(refs))).length * 0.9,
  );
});

it("round trips positive, negative and reordered differences without rounding", () => {
  for (const values of [
    Array.from({ length: 10000 }, (_, i) => i - 5000),
    Array.from({ length: 500 }, (_, i) => (i % 2 ? 2 ** 29 : -(2 ** 29))),
    Array.from({ length: 100 }, (_, i) => 2 ** 30 - 1 - i),
    Array.from({ length: 100 }, (_, i) => -(2 ** 30) + 1 + i),
    [1.25, -0, Number.MAX_SAFE_INTEGER, null, false, "12"],
  ]) {
    const data = integers(values);
    expect(JSON.stringify(unpackIntegers(disk(packIntegers(data))))).toBe(
      JSON.stringify(data),
    );
  }
});

it("keeps unsupported or uneconomical sequences as arrays and does not alias decoded columns", () => {
  for (const values of [
    [],
    [1, 2],
    Array(100).fill(0.5),
    Array(100).fill(Number.MAX_SAFE_INTEGER),
  ]) {
    const data: any = packIntegers(integers(values));
    expect(Array.isArray(data[1].tiles.keys)).toBe(true);
  }
  const data: any = disk(
    packIntegers(integers(Array.from({ length: 100 }, (_, i) => i))),
  );
  data[1].tiles.order = { ...data[1].tiles.keys };
  const result: any = unpackIntegers(data);
  result[1].tiles.keys[0] = 99;
  expect(result[1].tiles.order[0]).toBe(0);
});

it("round trips varied run lengths and signed jumps deterministically", () => {
  let seed = 713;
  const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
  for (let sample = 0; sample < 80; sample++) {
    let value = (random() % 20000) - 10000;
    const values = Array.from({ length: 32 + (random() % 1000) }, () => {
      if (random() % 4) value += (random() % 255) - 127;
      return value;
    });
    const data = integers(values);
    expect(unpackIntegers(disk(packIntegers(data)))).toEqual(data);
  }
});

const encoded = (length: number, bytes: number[]) => ({
  length,
  ints: Buffer.from(bytes).toString("base64"),
});
for (const [name, value] of Object.entries({
  missing: {},
  negative: { length: -1, ints: "" },
  fractional: { length: 1.5, ints: "AA==" },
  invalidBase64: { length: 1, ints: "!!!!" },
  whitespace: { length: 1, ints: "AA==\n" },
  paddingBits: { length: 1, ints: "AB==" },
  truncated: encoded(1, [128]),
  overflow: encoded(1, [255, 255, 255, 255, 31]),
  overlong: encoded(1, [128, 0]),
  extra: encoded(1, [0, 0]),
  count: encoded(2, [0]),
  coordinateOverflow: encoded(1, [128, 128, 128, 128, 8]),
}))
  it(`rejects malformed integer storage: ${name}`, () => {
    const data: any = integers([]);
    data[1].tiles.keys = value;
    expect(() => unpackIntegers(data)).toThrow(/compact/);
  });

it("rejects oversized expansion before allocating arrays and validates decoded references", () => {
  const data: any = integers([]);
  data[1].tiles.keys = { length: 100_000_000, ints: "" };
  expect(() => unpackIntegers(data)).toThrow(/expanded limit/);
  const save = JSON.parse(serializePacked(fixture()));
  save.game[1].tiles.keys = encoded(1, [1]); // -1 is not a dictionary reference.
  save.checksum = hash(JSON.stringify(save.game)).toString(16);
  expect(() => deserialize(JSON.stringify(save))).toThrow(/compact/);
});

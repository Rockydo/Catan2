import { expect, it } from "vitest";
import { packColumns, unpackColumns } from "../src/game/save-columns";
import { deserialize, serialize, serializePacked } from "../src/game/save";
import { hash } from "../src/game/world";
import { fishingFixture } from "./maritime-fixture";
import { piece } from "./helpers";

const disk = (value: unknown) => JSON.parse(JSON.stringify(value));
const input = (values: unknown) => [
  [],
  { towns: { layouts: [{ fields: ["stock"], columns: [values] }] } },
];
const column = (value: any) => value[1].towns.layouts[0].columns[0];

it("preserves exact values and independent town stocks, guild orders and future nested fields", () => {
  const guild = JSON.parse(
    '{"kind":"artisans","tier":3,"order":{"raw":"coal"},"__proto__":{"safe":true}}',
  );
  const values = Array.from({ length: 150 }, (_, i) =>
    i % 3
      ? {
          stock: { gold: 4, lumber: 0 },
          guilds: [guild],
          label: 'Île 雪\\\n"',
          missing: undefined,
        }
      : { stock: { lumber: 0, gold: 4 }, guilds: [], label: null },
  );
  const original = JSON.stringify(input(values)),
    packed = disk(packColumns(input(values)));
  expect(JSON.stringify(packed).length).toBeLessThan(original.length / 2);
  const restored = unpackColumns(packed);
  expect(JSON.stringify(restored)).toBe(original);
  const records = column(restored);
  records[1].stock.gold = 999;
  records[1].guilds[0].order.raw = "hides";
  records[1].guilds[0].__proto__.safe = false;
  expect(records[2].stock.gold).toBe(4);
  expect(records[2].guilds[0].order.raw).toBe("coal");
  expect(records[2].guilds[0].__proto__.safe).toBe(true);
  expect(Object.getPrototypeOf(records[1].guilds[0])).toBe(Object.prototype);
  expect((Object.prototype as any).safe).toBeUndefined();
  expect(JSON.stringify(input(values))).toBe(original);
});

it("keeps literal small and unique columns and existing integer/reference encodings", () => {
  for (const values of [
    [],
    [1, 2, 3],
    [null, false, 1.5, "1"],
    Array.from({ length: 100 }, (_, i) => `unique${i}`),
    { length: 100, ints: "AQ==" },
    { refs: [1, 2, 3] },
    null,
  ]) {
    const original = input(values);
    expect(JSON.stringify(unpackColumns(disk(packColumns(original))))).toBe(
      JSON.stringify(original),
    );
  }
  const future = { future: { repeated: ["user data"], count: 100 } };
  expect((unpackColumns(packColumns([[], future])) as any)[1]).toEqual(future);
});

it("repeats primitive and empty values exactly, including explicit nulls and absent array items", () => {
  for (const value of ["cold", null, false, {}, [], { count: 0 }, undefined]) {
    const original = input(Array.from({ length: 100 }, () => value));
    const packed = disk(packColumns(original));
    expect(column(packed).count).toBe(100);
    expect(JSON.stringify(unpackColumns(packed))).toBe(
      JSON.stringify(original),
    );
  }
});

it("loads the previous archive and current archive with exact full campaign state", () => {
  const { s, water } = fishingFixture();
  for (let i = 0; i < 2500; i++) piece(s, water, 0, "fishing", 1 + (i % 4));
  const current = JSON.parse(serializePacked(s));
  const previous = {
    ...current,
    packing: 8,
    game: unpackColumns(current.game),
  };
  previous.checksum = hash(JSON.stringify(previous.game)).toString(16);
  const expected = JSON.stringify(deserialize(serialize(s)));
  expect(current.packing).toBe(9);
  expect(JSON.stringify(deserialize(JSON.stringify(previous)))).toBe(expected);
  expect(JSON.stringify(deserialize(JSON.stringify(current)))).toBe(expected);
});

it.each([
  { repeated: [], count: 3 },
  { repeated: false, count: 3 },
  { repeated: [1, 2], count: 3 },
  { repeated: [1], count: -1 },
  { repeated: [1], count: 0.5 },
  { repeated: [1], count: "3" },
  { repeated: [1], count: 3, indices: [0, 0, 0] },
  { repeated: [1], indices: [-1] },
  { repeated: [1], indices: [1] },
  { repeated: [1], indices: [0.5] },
  { repeated: [1], indices: ["0"] },
  { repeated: [1] },
])("rejects damaged repeated columns %#", (value) => {
  expect(() => unpackColumns(input(value))).toThrow(/damaged/);
});

it("bounds constant, indexed and combined column amplification before reconstruction", () => {
  expect(() => unpackColumns(input({ repeated: ["x"], count: 1e12 }))).toThrow(
    /expanded limit/,
  );
  const large = { repeated: [{ text: "雪".repeat(100) }], count: 100 };
  expect(() => unpackColumns(input(large), 20_000)).toThrow(/expanded limit/);
  const indexed = {
    repeated: ["雪".repeat(100)],
    indices: new Array(100).fill(0),
  };
  expect(() => unpackColumns(input(indexed), 20_000)).toThrow(/expanded limit/);
  const pair: any = input({ repeated: ["snow"], count: 100 });
  pair[1].towns.layouts[0].columns.push({ repeated: ["snow"], count: 100 });
  expect(() => unpackColumns(pair, 1_000)).toThrow(/expanded limit/);
});

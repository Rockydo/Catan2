import { expect, it } from "vitest";
import { packSpatial, unpackSpatial } from "../src/game/save-spatial";
import { packGame } from "../src/game/save-packing";
import { packTables } from "../src/game/save-tables";
import { packReferences } from "../src/game/save-references";
import { packIntegers } from "../src/game/save-integers";
import { serialize, serializePacked, deserialize } from "../src/game/save";
import { compress } from "../src/storage/codec";
import { hash } from "../src/game/world";
import { fishingFixture } from "./maritime-fixture";
import { piece } from "./helpers";

const disk = (value: unknown) => JSON.parse(JSON.stringify(value));
function dictionary() {
  return [
    {
      kinds: [2, 1, 0, 3, 1],
      q: [-4],
      r: [8],
      x: [11, -22],
      y: [33, -44],
      a: [4],
      b: [1],
      literals: ["Forêt 雪"],
    },
    {},
  ];
}
it("restores exact spatial IDs, forward edge references and arbitrary literal IDs", () => {
  expect(unpackSpatial(dictionary())).toEqual([
    ["-22:-44|11:33", "11:33", "-4,8", "Forêt 雪", "-22:-44"],
    {},
  ]);
  const refs = [
    "0,-0",
    "01:2",
    "+3,4",
    "1.25:5.5",
    "100000000000:0",
    "__proto__",
    "",
    "0:0|missing",
    "0:0|1:1|2:2",
    ...Array.from({ length: 200 }, (_, i) => `${i - 100}:${i * 2}`),
    ...Array.from({ length: 200 }, (_, i) => `${i - 100},${i * 2}`),
  ].filter(Boolean);
  const input = [refs, { future: { q: "untouched" } }];
  const before = JSON.stringify(input);
  expect(JSON.stringify(unpackSpatial(disk(packSpatial(input))))).toBe(before);
  expect(JSON.stringify(input)).toBe(before);
});
it("preserves reordered dictionaries and endpoints without rebuilding geometry", () => {
  let seed = 713;
  const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
  for (let sample = 0; sample < 40; sample++) {
    const refs: string[] = [];
    for (let i = 0; i < 100; i++)
      refs.push(`${(random() % 600) - 300}:${(random() % 600) - 300}`);
    for (let i = 0; i < 100; i++)
      refs.push(`${refs[random() % 100]}|${refs[random() % 100]}`);
    for (let i = refs.length - 1; i > 0; i--) {
      const j = random() % (i + 1);
      [refs[i], refs[j]] = [refs[j], refs[i]];
    }
    expect(unpackSpatial(disk(packSpatial([refs, {}])))).toEqual([refs, {}]);
  }
});
it("shrinks map archives while preserving complete games and packing versions 1 through 5", async () => {
  const { s, water } = fishingFixture();
  for (let i = 0; i < 600; i++) piece(s, water, 0, "fishing", 3);
  Object.assign(Object.values(s.tiles)[0], {
    future: { name: "Île 雪", kinds: [1, 2] },
  });
  const before = JSON.stringify(s);
  const expected = JSON.stringify(deserialize(serialize(s)));
  const templates = packGame(s),
    tables = packTables(templates),
    refs = packReferences(tables),
    integers = packIntegers(refs),
    spatial = packSpatial(integers);
  expect(JSON.stringify(unpackSpatial(disk(spatial)))).toBe(
    JSON.stringify(integers),
  );
  expect((await compress(JSON.stringify(spatial))).length).toBeLessThan(
    (await compress(JSON.stringify(integers))).length * 0.95,
  );
  const header = JSON.parse(serializePacked(s));
  for (const [index, game] of [
    templates,
    tables,
    refs,
    integers,
    spatial,
  ].entries()) {
    const text = JSON.stringify({
      ...header,
      packing: index + 1,
      game,
      checksum: hash(JSON.stringify(game)).toString(16),
    });
    expect(JSON.stringify(deserialize(text))).toBe(expected);
  }
  expect(JSON.stringify(s)).toBe(before);
});
it("retains tiny or unsupported ID dictionaries without a new representation", () => {
  for (const refs of [[], ["arbitrary"], ["0:0"], ["1:2|3:4"]]) {
    const input = [refs, {}];
    expect(packSpatial(input)).toBe(input);
    expect(unpackSpatial(input)).toBe(input);
  }
});
for (const [name, change] of Object.entries({
  kind: (d: any): any => (d.kinds[0] = 4),
  fractionalKind: (d: any): any => (d.kinds[0] = 0.5),
  missingCoordinate: (d: any): any => (d.q = []),
  extraCoordinate: (d: any): any => d.x.push(0),
  fractionalCoordinate: (d: any): any => (d.q[0] = 0.5),
  coordinateOverflow: (d: any): any => (d.q[0] = 2 ** 30),
  nonNumeric: (d: any): any => (d.y[0] = "10"),
  negativeEnd: (d: any): any => (d.a[0] = -1),
  absentEnd: (d: any): any => (d.a[0] = 100),
  tileEnd: (d: any): any => (d.a[0] = 2),
  cyclicEnd: (d: any): any => (d.a[0] = 0),
  missingEnd: (d: any): any => delete d.b,
  missingLiteral: (d: any): any => (d.literals = []),
  nonStringLiteral: (d: any): any => (d.literals[0] = {}),
  emptyLiteral: (d: any): any => (d.literals[0] = ""),
  longLiteral: (d: any): any => (d.literals[0] = "x".repeat(160)),
  invalidIntegers: (d: any): any => (d.kinds = { length: 5, ints: "!!!!" }),
}))
  it(`rejects malformed spatial storage: ${name}`, () => {
    const input = dictionary();
    change(input[0]);
    expect(() => unpackSpatial(input)).toThrow(/compact/);
  });
it("bounds encoded expansion before allocating reconstructed references", () => {
  const input: any = dictionary();
  input[0].kinds = { length: 100_000_000, ints: "" };
  expect(() => unpackSpatial(input)).toThrow(/expanded limit/);
  for (const invalid of [null, [], [[], null], [null, {}], [0, {}]])
    expect(() => unpackSpatial(invalid)).toThrow(/compact/);
});

import { expect, it } from "vitest";
import { packMembers, unpackMembers } from "../src/game/save-members";
import { deserialize, serialize, serializePacked } from "../src/game/save";
import { compress } from "../src/storage/codec";
import { hash } from "../src/game/world";
import { fishingFixture } from "./maritime-fixture";
import { piece } from "./helpers";

const disk = (value: unknown) => JSON.parse(JSON.stringify(value));
const input = (units: unknown) => [[], { sieges: { one: { units } } }];
const ids = (packed: any) => packed[1].sieges.one.units;

it("preserves every membership field, list order, gaps, repeated IDs and untouched future fields", () => {
  const units = Array.from({ length: 1000 }, (_, i) => `u${10000 + i * 3}`);
  units.splice(100, 2, "u2", "u2");
  units.reverse();
  const source = [
    [],
    {
      sieges: {
        one: { units, future: { ids: units, prefix: "user data" } },
        two: {},
      },
      towerSieges: { one: { units } },
      battle: { attackers: units, defenders: [...units].reverse() },
      thawRetreats: { ice: ["0,1"], pending: [{ owner: 1, ids: units }] },
      future: { units, prefix: "u", deltas: [1] },
    },
  ];
  const original = JSON.stringify(source),
    packed = disk(packMembers(source));
  expect(JSON.stringify(packed).length).toBeLessThan(original.length * 0.5);
  const restored: any = unpackMembers(packed);
  expect(JSON.stringify(restored)).toBe(original);
  restored[1].sieges.one.units.pop();
  expect(restored[1].towerSieges.one.units).toEqual(units);
  expect(restored[1].sieges.one.future.ids).toEqual(units);
  expect(JSON.stringify(source)).toBe(original);
});

it("keeps small lists, unusual IDs and future nested data literal", () => {
  for (const units of [
    [],
    ["u1"],
    Array(40).fill("001"),
    Array(40).fill("Île 雪"),
    Array(40).fill("u9007199254740991"),
    Array(40).fill("u".repeat(150) + "1000000000"),
    Array(40).fill("u01"),
    Array(40).fill("u-1"),
    Array.from({ length: 40 }, (_, i) => `${i % 2 ? "u" : "v"}${i}`),
  ]) {
    const encoded = disk(packMembers(input(units)));
    expect(Array.isArray(ids(encoded))).toBe(true);
    expect(unpackMembers(encoded)).toEqual(input(units));
  }
});

it("round trips varied positive, negative and constant ID runs with exact expansion budgets", () => {
  for (const start of [0, 8, 98, 998, 9998, 2 ** 30 - 1000])
    for (const step of [0, 1, 2, 7]) {
      const units = Array.from(
        { length: 100 },
        (_, i) => `u${start + i * step}`,
      );
      for (const list of [units, [...units].reverse()]) {
        const packed = disk(packMembers(input(list)));
        const budget = JSON.stringify(list).length + 1; // conservative trailing comma
        expect(unpackMembers(packed, budget)).toEqual(input(list));
        expect(() => unpackMembers(packed, budget - 1)).toThrow(
          /expanded limit/,
        );
      }
    }
});

it("compresses very large active sieges and preserves previous-format recovery", async () => {
  const { s, water, enemy } = fishingFixture();
  for (let i = 0; i < 6000; i++) piece(s, water, 0, "galley", 1);
  const list = Object.keys(s.pieces);
  s.sieges[`0:${enemy.id}`] = {
    owner: 0,
    town: enemy.id,
    units: list,
    progress: 1,
    last: -1,
    raided: null,
  };
  const current = JSON.parse(serializePacked(s));
  expect(current.packing).toBe(10);
  const previous = {
    ...current,
    packing: 9,
    game: unpackMembers(current.game),
  };
  previous.checksum = hash(JSON.stringify(previous.game)).toString(16);
  const expected = JSON.stringify(deserialize(serialize(s)));
  expect(JSON.stringify(deserialize(JSON.stringify(previous)))).toBe(expected);
  expect(JSON.stringify(deserialize(JSON.stringify(current)))).toBe(expected);
  expect((await compress(JSON.stringify(current))).length).toBeLessThan(
    (await compress(JSON.stringify(previous))).length * 0.5,
  );
  // A valid outer checksum must not bypass malformed member-list validation.
  current.game[1].sieges[`0:${enemy.id}`].units = {
    prefix: "u",
    length: 6000,
    runs: [1, 5000],
  };
  current.checksum = hash(JSON.stringify(current.game)).toString(16);
  expect(() => deserialize(JSON.stringify(current))).toThrow(/damaged/);
});

it.each([
  null,
  3,
  {},
  { prefix: "__proto__", deltas: [1] },
  { prefix: "u", deltas: [0.5] },
  { prefix: "u", deltas: [-1] },
  { prefix: "u", deltas: [2 ** 30] },
  { prefix: "u", length: -1, runs: [] },
  { prefix: "u", length: 1.5, runs: [1, 1] },
  { prefix: "u", length: 2, runs: [1] },
  { prefix: "u", length: 2, runs: [1, 1] },
  { prefix: "u", length: 1, runs: [1, 2] },
  { prefix: "u", length: 1, runs: [1, 0] },
  { prefix: "u", length: 1, runs: [1, 1], deltas: [1] },
  { prefix: "u", length: 100, runs: [2 ** 29, 100] },
  { prefix: "u", length: 10, runs: [5, 1, -1, 9] },
])("rejects malformed ID encodings %#", (value) => {
  expect(() => unpackMembers(input(value))).toThrow(/damaged/);
});

it("bounds compressed amplification and shares the limit across every list", () => {
  expect(() =>
    unpackMembers(input({ prefix: "u", length: 1e12, runs: [1, 1e12] })),
  ).toThrow(/expanded limit/);
  const list = { prefix: "u", length: 100, runs: [1, 100] };
  expect(() => unpackMembers(input(list), 300)).toThrow(/expanded limit/);
  const pair: any = input(list);
  pair[1].towerSieges = { other: { units: list } };
  expect(() => unpackMembers(pair, 800)).toThrow(/expanded limit/);
});

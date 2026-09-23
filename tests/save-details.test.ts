import { unpackColumns } from "../src/game/save-columns";
import { expect, it } from "vitest";
import { packDetails, unpackDetails } from "../src/game/save-details";
import { deserialize, serialize, serializePacked } from "../src/game/save";
import { compress } from "../src/storage/codec";
import { hash } from "../src/game/world";
import { fishingFixture } from "./maritime-fixture";
import { piece } from "./helpers";

const disk = (value: unknown) => JSON.parse(JSON.stringify(value));
function fixture() {
  const { s, water } = fishingFixture();
  for (let i = 0; i < 4000; i++) {
    const u = piece(s, water, 0, "fishing", 1 + (i % 4));
    u.born = Math.floor(i / 16);
  }
  return s;
}
function details() {
  return [
    [],
    {
      climatePlan: Object.fromEntries(
        Array.from({ length: 1000 }, (_, i) => [
          `${i % 31},${Math.floor(i / 31)}`,
          i % 3 ? "temperate" : "cold",
        ]),
      ),
      pieces: {
        templates: Array.from({ length: 150 }, (_, i) => ({
          id: null,
          owner: i % 4,
          kind: "cavalry",
          naval: false,
          tier: 4,
          tile: "1,2",
          born: Math.floor(i / 7),
          moved: 0,
          acted: false,
          bonus: 0,
        })),
      },
    },
  ];
}
it("reduces complete archives and reads version seven exactly", async () => {
  const s = fixture(),
    before = JSON.stringify(s);
  const modern = JSON.parse(serializePacked(s));
  const old = {
    ...modern,
    packing: 7,
    game: unpackDetails(unpackColumns(modern.game)),
  };
  old.checksum = hash(JSON.stringify(old.game)).toString(16);
  expect(modern.packing).toBe(10);
  expect(Array.isArray(modern.game[1].pieces.templates)).toBe(false);
  expect((await compress(JSON.stringify(modern))).length).toBeLessThan(
    (await compress(JSON.stringify(old))).length * 0.95,
  );
  const expected = JSON.stringify(deserialize(serialize(s)));
  expect(JSON.stringify(deserialize(JSON.stringify(old)))).toBe(expected);
  expect(JSON.stringify(deserialize(JSON.stringify(modern)))).toBe(expected);
  expect(JSON.stringify(s)).toBe(before);
});
it("preserves climate coordinates, arbitrary IDs, type strings and insertion order", () => {
  const input: any = details();
  input[1].climatePlan["0:2|1:1"] = "future-雪";
  input[1].climatePlan["Île"] = "future-雪";
  input[1].climatePlan["01,02"] = "tropical";
  delete input[1].climatePlan["0,0"];
  input[1].climatePlan["0,0"] = "temperate";
  const before = JSON.stringify(input),
    packed: any = disk(packDetails(input));
  expect(Array.isArray(packed[1].climatePlan)).toBe(true);
  expect(JSON.stringify(unpackDetails(packed))).toBe(before);
  expect(JSON.stringify(input)).toBe(before);
});
it("preserves template field order, nested and unknown fields, nulls and escaped text", () => {
  const input: any = details(),
    units = input[1].pieces.templates;
  Object.assign(units[2], {
    future: { labels: ["Forêt 雪", 'a\\b\n"c"'], empty: null },
    absent: undefined,
  });
  units[3] = { future: false, ...units[3] };
  Object.defineProperty(units[4], "__proto__", {
    value: { futureFlag: true },
    enumerable: true,
  });
  const before = JSON.stringify(input),
    packed: any = disk(packDetails(input));
  expect(Array.isArray(packed[1].pieces.templates)).toBe(false);
  const result: any = unpackDetails(packed);
  expect(JSON.stringify(result)).toBe(before);
  expect(JSON.stringify(input)).toBe(before);
  expect(Object.getPrototypeOf(result[1].pieces.templates[4])).toBe(
    Object.prototype,
  );
  expect((Object.prototype as any).futureFlag).toBeUndefined();
});
it("leaves tiny details literal and supports absent plans or empty templates", () => {
  for (const input of [
    [[], { pieces: { templates: [] } }],
    [[], { climatePlan: {}, pieces: { templates: [{ id: null }] } }],
    [[], { climatePlan: { "0,0": "cold" } }],
  ]) {
    const packed = disk(packDetails(input));
    expect(JSON.stringify(unpackDetails(packed))).toBe(JSON.stringify(input));
  }
});
it.each([
  (p: any) => {
    p[1].climatePlan = [["0,0"], ["cold"], [-1]];
  },
  (p: any) => {
    p[1].climatePlan = [["0,0"], ["cold"], [0.5]];
  },
  (p: any) => {
    p[1].climatePlan = [["0,0"], ["cold"], [1]];
  },
  (p: any) => {
    p[1].climatePlan = [["0,0", "0,0"], ["cold"], [0, 0]];
  },
  (p: any) => {
    p[1].climatePlan = [["__proto__"], ["cold"], [0]];
  },
  (p: any) => {
    p[1].climatePlan = [["0,0"], [null], [0]];
  },
  (p: any) => {
    p[1].climatePlan = [[], ["cold"], [0]];
  },
  (p: any) => {
    p[1].pieces.templates.order = [-1];
  },
  (p: any) => {
    p[1].pieces.templates.order = [99];
  },
  (p: any) => {
    p[1].pieces.templates.layouts[0].fields.push("owner");
  },
  (p: any) => {
    p[1].pieces.templates.layouts[0].columns[0] = ["wrong length"];
  },
  (p: any) => {
    p[1].pieces.templates.layouts[0].columns[1] = { length: 10, ints: "!!!!" };
  },
])("rejects damaged compact details %#", (change) => {
  const p = disk(packDetails(details()));
  change(p);
  expect(() => unpackDetails(p)).toThrow(/damaged/);
});
it("checks expansion budgets for repeated Unicode climate values and template fields", () => {
  const p: any = disk(packDetails(details()));
  p[1].climatePlan = [
    Array.from({ length: 200 }, (_, i) => `${i},0`),
    ["雪".repeat(300)],
    Array(200).fill(0),
  ];
  expect(() => unpackDetails(p, 100_000)).toThrow(/expanded limit/);
  const q: any = disk(packDetails(details()));
  delete q[1].climatePlan;
  q[1].pieces.templates.layouts[0].fields[0] = "雪".repeat(1000);
  expect(() => unpackDetails(q, 100_000)).toThrow(/expanded limit/);
});

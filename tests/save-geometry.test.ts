import { expect, it } from "vitest";
import { packGeometry, unpackGeometry } from "../src/game/save-geometry";
import { packTables, unpackTables } from "../src/game/save-tables";
import { packGame, unpackGame } from "../src/game/save-packing";
import { packReferences } from "../src/game/save-references";
import { packIntegers } from "../src/game/save-integers";
import { packSpatial } from "../src/game/save-spatial";
import { serializePacked, serialize, deserialize } from "../src/game/save";
import { compress } from "../src/storage/codec";
import { hash } from "../src/game/world";
import { fishingFixture } from "./maritime-fixture";

const disk = (value: unknown) => JSON.parse(JSON.stringify(value));
function tables() {
  return packTables(packGame(fishingFixture().s));
}

it("restores every coordinate, neighbor, property order and record order exactly", () => {
  const { s } = fishingFixture();
  const tile = Object.values(s.tiles)[0],
    edge = Object.values(s.edges)[0];
  // Retain future fields, reordered properties, reversed edge endpoints and
  // dictionary insertion order. Only matching geometry can be compressed.
  const reordered = Object.assign(
    { future: { name: "Île 雪", derived: [2] } },
    tile,
  );
  edge.vertices.reverse();
  delete s.tiles[tile.id];
  s.tiles[tile.id] = reordered;
  Object.defineProperty(reordered, "__proto__", {
    value: { safe: true },
    enumerable: true,
  });
  const expected = JSON.stringify(s);
  const original = packTables(packGame(s));
  const packed: any = disk(packGeometry(original));
  expect(
    packed.tiles.layouts.some((l: any) =>
      l.derived?.some(([, f]: any) => f === "edges"),
    ),
  ).toBe(true);
  const restored = unpackGame(unpackTables(unpackGeometry(packed)));
  expect(JSON.stringify(restored)).toBe(expected);
  expect(JSON.stringify(unpackGeometry(disk(packGeometry(original))))).toBe(
    JSON.stringify(original),
  );
  expect(JSON.stringify(s)).toBe(expected);
  expect((Object.prototype as any).safe).toBeUndefined();
  const units = Object.values(restored.tiles);
  expect(units[0].vertices).not.toBe(units[1].vertices);
  units[0].vertices[0] = "changed";
  expect(JSON.stringify(s)).toBe(expected);
});

it("keeps noncanonical geometry, unknown fields and empty tables verbatim", () => {
  const input: any = tables();
  for (const [key, value] of Object.entries({
    "01,0": { id: "01,0", q: 1, r: 0, vertices: [], edges: [] },
    "0,-0": { q: 0, r: 0, vertices: ["custom"], edges: [] },
    "50000000,0": { q: 50000000, r: 0 },
    unknown: { id: "unknown", q: null, nullable: null },
  })) {
    const p: any = packGame(fishingFixture().s);
    p.tiles = { [key]: value };
    p.vertices = {};
    p.edges = {};
    const table = packTables(p);
    expect(JSON.stringify(unpackGeometry(disk(packGeometry(table))))).toBe(
      JSON.stringify(table),
    );
  }
  input.tiles.layouts[0].columns[
    input.tiles.layouts[0].fields.indexOf("q")
  ][0] = 1.25;
  input.tiles.layouts[0].columns[
    input.tiles.layouts[0].fields.indexOf("vertices")
  ][0].reverse();
  expect(JSON.stringify(unpackGeometry(disk(packGeometry(input))))).toBe(
    JSON.stringify(input),
  );
});

it("loads packing versions 1 through 7 with exact state and shrinks the archive", async () => {
  const { s } = fishingFixture();
  const expected = JSON.stringify(deserialize(serialize(s)));
  const templates = packGame(s),
    columns = packTables(templates),
    refs = packReferences(columns);
  const ints = packIntegers(refs),
    spatial = packSpatial(ints);
  const current = JSON.parse(serializePacked(s));
  const geometry = packSpatial(
    packIntegers(packReferences(packGeometry(columns))),
  );
  const encodings = [
    templates,
    columns,
    refs,
    ints,
    spatial,
    geometry,
    current.game,
  ];
  for (const [index, game] of encodings.entries()) {
    const encoded = JSON.stringify({
      ...current,
      packing: index + 1,
      game,
      checksum: hash(JSON.stringify(game)).toString(16),
    });
    expect(JSON.stringify(deserialize(encoded))).toBe(expected);
  }
  expect((await compress(JSON.stringify(current.game))).length).toBeLessThan(
    (await compress(JSON.stringify(spatial))).length * 0.9,
  );
});

for (const [name, change] of Object.entries({
  wrongType: (t: any) => {
    t.layouts[0].derived = "q";
  },
  empty: (t: any) => {
    t.layouts[0].derived = [];
  },
  duplicateField: (t: any) => {
    t.layouts[0].derived = [
      [1, "q"],
      [2, "q"],
    ];
  },
  duplicatePosition: (t: any) => {
    t.layouts[0].derived = [
      [1, "q"],
      [1, "r"],
    ];
  },
  negativePosition: (t: any) => {
    t.layouts[0].derived[0][0] = -1;
  },
  fractionalPosition: (t: any) => {
    t.layouts[0].derived[0][0] = 0.5;
  },
  beyondLayout: (t: any) => {
    t.layouts[0].derived[0][0] = 999;
  },
  unknownField: (t: any) => {
    t.layouts[0].derived[0][1] = "__proto__";
  },
  duplicateExisting: (t: any) => {
    t.layouts[0].derived[0][1] = "id";
  },
  malformedPair: (t: any) => {
    t.layouts[0].derived[0].push("extra");
  },
  missingOrder: (t: any) => {
    t.order.pop();
  },
  invalidOrder: (t: any) => {
    t.order[0] = -1;
  },
  missingLayout: (t: any) => {
    t.order[0] = t.layouts.length;
  },
  invalidKey: (t: any) => {
    t.keys[0] = "01,0";
  },
  numericKey: (t: any) => {
    t.keys[0] = 123;
  },
  overflowKey: (t: any) => {
    t.keys[0] = "9007199254740991,1";
  },
  missingColumn: (t: any) => {
    t.layouts[0].columns.pop();
  },
}))
  it(`rejects damaged geometry: ${name}`, () => {
    const packed: any = disk(packGeometry(tables()));
    change(packed.tiles);
    expect(() => unpackGeometry(packed)).toThrow(/damaged/);
  });

it("bounds derived geometry before it can amplify a compact input", () => {
  const packed = disk(packGeometry(tables()));
  expect(() => unpackGeometry(packed, 100)).toThrow(/expanded limit/);
  expect(() => unpackGeometry(packed, 10_000)).toThrow(/expanded limit/);
});

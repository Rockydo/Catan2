import { expect, it } from "vitest";
import { packTopology, unpackTopology } from "../src/game/save-topology";
import { packTables, unpackTables } from "../src/game/save-tables";
import { packGame, unpackGame } from "../src/game/save-packing";
import { packGeometry, unpackGeometry } from "../src/game/save-geometry";
import { packReferences, unpackReferences } from "../src/game/save-references";
import { packIntegers, unpackIntegers } from "../src/game/save-integers";
import { packSpatial, unpackSpatial } from "../src/game/save-spatial";
import { fishingFixture } from "./maritime-fixture";
import { addHexes } from "../src/game/world";
import { serializePacked, serialize, deserialize } from "../src/game/save";
import { compress } from "../src/storage/codec";

const disk = (value: unknown) => JSON.parse(JSON.stringify(value));
const tables = () => packTables(packGame(fishingFixture().s));
const pack = (value: unknown) =>
  packSpatial(packIntegers(packReferences(packGeometry(packTopology(value)))));
const unpack = (value: unknown) =>
  unpackTopology(
    unpackGeometry(unpackReferences(unpackIntegers(unpackSpatial(value)))),
  );

it("stores inverse map links once and preserves every field, list and record order", () => {
  const { s } = fishingFixture();
  const before = JSON.stringify(s);
  const columns = packTables(packGame(s));
  const packed: any = disk(packTopology(columns));
  expect(packed.vertices.layouts[0].topology).toEqual([
    [3, "tiles"],
    [4, "edges"],
  ]);
  expect(packed.edges.layouts.every((l: any) => l.topology.length === 2)).toBe(
    true,
  );
  expect(JSON.stringify(unpackTopology(packed))).toBe(JSON.stringify(columns));
  const restored = unpackGame(unpackTables(unpack(disk(pack(columns)))));
  expect(JSON.stringify(restored)).toBe(before);
  const [a, b] = Object.values(restored.vertices);
  expect(a.tiles).not.toBe(b.tiles);
  a.tiles.push("changed");
  expect(b.tiles).not.toContain("changed");
  expect(JSON.stringify(s)).toBe(before);
});

it("retains arbitrary layouts, reordered tiles, endpoints, literal links and unknown fields", () => {
  const { s } = fishingFixture();
  const t = Object.values(s.tiles)[0];
  // The new insertion order does not match the old map's adjacency order.
  delete s.tiles[t.id];
  s.tiles[t.id] = t;
  const v = Object.values(s.vertices)[0];
  v.tiles.reverse();
  v.edges.reverse();
  s.vertices[v.id] = Object.assign({ edges: v.edges }, v);
  Object.values(s.edges)[0].vertices.reverse();
  Object.defineProperty(s.vertices[v.id], "__proto__", {
    value: { label: "Île 雪" },
    enumerable: true,
  });
  const columns = packTables(packGame(s)),
    before = JSON.stringify(columns);
  expect(JSON.stringify(unpack(disk(pack(columns))))).toBe(before);
  expect(JSON.stringify(columns)).toBe(before);
  expect((Object.prototype as any).label).toBeUndefined();
});

it("preserves topology across irregular frontier additions and loaded-map insertions", () => {
  for (let i = 0; i < 12; i++) {
    const { s } = fishingFixture();
    addHexes(s, s.seed, [`${i + 20},0`, `${i + 19},1`, `${i + 21},0`]);
    const first = Object.keys(s.tiles)[i],
      tile = s.tiles[first];
    delete s.tiles[first];
    s.tiles[first] = tile;
    const columns = packTables(packGame(s));
    expect(JSON.stringify(unpack(disk(pack(columns))))).toBe(
      JSON.stringify(columns),
    );
  }
});

it("keeps empty maps and unknown geometry lossless", () => {
  for (const tiles of [
    {},
    { odd: { id: "odd", vertices: [], edges: ["x"] } },
  ]) {
    const s: any = fishingFixture().s;
    s.tiles = tiles;
    s.vertices = {};
    s.edges = {};
    const columns = packTables(packGame(s));
    expect(JSON.stringify(unpackTopology(disk(packTopology(columns))))).toBe(
      JSON.stringify(columns),
    );
  }
});

it("shrinks complete archives without dropping state or changing the input", async () => {
  const { s } = fishingFixture(),
    before = JSON.stringify(s);
  const old = packSpatial(
    packIntegers(packReferences(packGeometry(packTables(packGame(s))))),
  );
  const current = JSON.parse(serializePacked(s));
  expect(current.packing).toBe(8);
  expect((await compress(JSON.stringify(current.game))).length).toBeLessThan(
    (await compress(JSON.stringify(old))).length * 0.8,
  );
  expect(JSON.stringify(deserialize(serializePacked(s)))).toBe(
    JSON.stringify(deserialize(serialize(s))),
  );
  expect(JSON.stringify(s)).toBe(before);
});

for (const [name, change] of Object.entries({
  type: (g: any) => {
    g.vertices.layouts[0].topology = "tiles";
  },
  empty: (g: any) => {
    g.vertices.layouts[0].topology = [];
  },
  negative: (g: any) => {
    g.vertices.layouts[0].topology[0][0] = -1;
  },
  fractional: (g: any) => {
    g.vertices.layouts[0].topology[0][0] = 0.5;
  },
  tooLarge: (g: any) => {
    g.vertices.layouts[0].topology[0][0] = 1000;
  },
  duplicateField: (g: any) => {
    g.vertices.layouts[0].topology[1][1] = "tiles";
  },
  duplicatePosition: (g: any) => {
    g.vertices.layouts[0].topology[1][0] = 3;
  },
  unknown: (g: any) => {
    g.vertices.layouts[0].topology[0][1] = "__proto__";
  },
  extra: (g: any) => {
    g.vertices.layouts[0].topology[0].push("extra");
  },
  existing: (g: any) => {
    g.vertices.layouts[0].fields[0] = "tiles";
  },
  missingKey: (g: any) => {
    g.vertices.keys[0] = "absent";
  },
  badOrder: (g: any) => {
    g.vertices.order[0] = -1;
  },
  missingLayout: (g: any) => {
    g.vertices.order[0] = 100000;
  },
  mismatch: (g: any) => {
    g.vertices.order.pop();
  },
  missingColumns: (g: any) => {
    g.vertices.layouts[0].columns.pop();
  },
  badRing: (g: any) => {
    const t = g.tiles.layouts[0];
    t.columns[t.fields.indexOf("vertices")][0].pop();
  },
  badTileOrder: (g: any) => {
    g.tiles.order[0] = -1;
  },
  badTileKey: (g: any) => {
    g.tiles.keys[0] = 12;
  },
  badCorner: (g: any) => {
    const t = g.tiles.layouts[0];
    t.columns[t.fields.indexOf("vertices")][0][0] = null;
  },
}))
  it(`rejects damaged topology metadata: ${name}`, () => {
    const packed = disk(packTopology(tables()));
    change(packed);
    expect(() => unpackTopology(packed)).toThrow(/damaged/);
  });

it("bounds topology reconstruction before expanding a small archive", () => {
  const packed = disk(packTopology(tables()));
  expect(() => unpackTopology(packed, 100)).toThrow(/expanded limit/);
  expect(() => unpackTopology(packed, 10_000)).toThrow(/expanded limit/);
});

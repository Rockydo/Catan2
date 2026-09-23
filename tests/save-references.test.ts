import { expect, it } from "vitest";
import { packGame, unpackGame } from "../src/game/save-packing";
import { packTables, unpackTables } from "../src/game/save-tables";
import { packReferences, unpackReferences } from "../src/game/save-references";
import { serialize, serializePacked, deserialize } from "../src/game/save";
import { compress } from "../src/storage/codec";
import { fishingFixture } from "./maritime-fixture";

const disk = (value: unknown) => JSON.parse(JSON.stringify(value));

it("preserves exact geometry, key order, optional data and independent adjacency arrays", () => {
  const { s } = fishingFixture();
  const tiles = Object.values(s.tiles);
  Object.assign(tiles[0], { extra: [[tiles[1].id], [], [tiles[2].id]] });
  Object.defineProperty(tiles[0], "__proto__", {
    value: { safe: true },
    enumerable: true,
  });
  const last = tiles[2];
  delete s.tiles[last.id];
  s.tiles[last.id] = last;
  const before = JSON.stringify(s),
    tables = packTables(packGame(s));
  const archive: any = disk(packReferences(tables));
  expect(archive[1].tiles.keys.every(Number.isInteger)).toBe(true);
  const restored = unpackGame(unpackTables(unpackReferences(archive)));
  expect(JSON.stringify(restored)).toBe(before);
  expect(JSON.stringify(s)).toBe(before);
  expect(JSON.stringify(unpackReferences(archive))).toBe(
    JSON.stringify(tables),
  );
  const keys = Object.keys(restored.vertices);
  const adjacent = restored.vertices[keys[0]].tiles;
  adjacent.push("changed");
  expect(restored.vertices[keys[1]].tiles).not.toContain("changed");
  expect(s.vertices[keys[0]].tiles).not.toContain("changed");
  expect((Object.prototype as any).safe).toBeUndefined();
});

it("keeps unrecognized columns verbatim and supports absent or empty tables", () => {
  const input = {
    tiles: {
      keys: ["x"],
      order: [0],
      layouts: [
        {
          fields: ["id", "known", "other", "mixed", "empty"],
          columns: [null, ["x"], ["Forêt"], [["x", 12, null]], [[]]],
        },
      ],
    },
    routes: { keys: [], order: [], layouts: [] },
    future: { nested: { __proto__: null }, values: [0, false, ""] },
  };
  expect(unpackReferences(disk(packReferences(input)))).toEqual(disk(input));
});

it("reduces compressed map bytes and loads through the normal checksum and validation path", async () => {
  const { s } = fishingFixture();
  const before = JSON.stringify(packTables(packGame(s)));
  const after = JSON.stringify(packReferences(packTables(packGame(s))));
  expect(after.length).toBeLessThan(before.length);
  expect((await compress(after)).length).toBeLessThan(
    (await compress(before)).length,
  );
  expect(JSON.stringify(deserialize(serializePacked(s)))).toBe(
    JSON.stringify(deserialize(serialize(s))),
  );
});

for (const [name, change] of Object.entries({
  envelope: (p: any): unknown => p.push(0),
  dictionary: (p: any): unknown => p[0].push(null),
  dictionaryLength: (p: any): unknown => p[0].push("x".repeat(160)),
  missingGame: (p: any): unknown => (p[1] = null),
  invalidKeys: (p: any): unknown => (p[1].tiles.keys = {}),
  invalidLayouts: (p: any): unknown => (p[1].tiles.layouts = {}),
  invalidColumns: (p: any): unknown => (p[1].tiles.layouts[0].columns = {}),
  negative: (p: any): unknown => (p[1].tiles.keys[0] = -1),
  fractional: (p: any): unknown => (p[1].tiles.keys[0] = 0.5),
  missing: (p: any): unknown => (p[1].tiles.keys[0] = p[0].length),
  invalidColumn: (p: any): unknown =>
    (p[1].tiles.layouts[0].columns[0] = false),
  missingRefs: (p: any): unknown => (p[1].tiles.layouts[0].columns[0] = {}),
  invalidRef: (p: any): unknown =>
    (p[1].tiles.layouts[0].columns[0] = { refs: ["0"] }),
  negativeSize: (p: any): unknown =>
    (p[1].tiles.layouts[0].columns[0] = { refs: [], sizes: [-1] }),
  fractionalSize: (p: any): unknown =>
    (p[1].tiles.layouts[0].columns[0] = { refs: [], sizes: [0.1] }),
  missingSize: (p: any): unknown =>
    (p[1].tiles.layouts[0].columns[0] = { refs: [0], sizes: [] }),
  oversized: (p: any): unknown =>
    (p[1].tiles.layouts[0].columns[0] = { refs: [0], sizes: [1e12] }),
}))
  it(`rejects damaged reference tables: ${name}`, () => {
    const p = disk(packReferences(packTables(packGame(fishingFixture().s))));
    change(p);
    expect(() => unpackReferences(p)).toThrow(/compact save/);
  });

it("rejects dictionary amplification before constructing adjacency arrays, including UTF-8", () => {
  const references = ["雪".repeat(150)];
  const encoded = [
    references,
    {
      tiles: {
        keys: [],
        order: [],
        layouts: [
          {
            fields: ["vertices"],
            columns: [{ refs: new Array(300_000).fill(0), sizes: [300_000] }],
          },
        ],
      },
    },
  ];
  expect(() => unpackReferences(encoded)).toThrow(/expanded limit/);
});

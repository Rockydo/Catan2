import { describe, expect, it } from "vitest";
import { packGame, unpackGame } from "../src/game/save-packing";
import { packTables, unpackTables } from "../src/game/save-tables";
import {
  assertInvariants,
  deserialize,
  serializePacked,
} from "../src/game/save";
import { hash } from "../src/game/world";
import { fishingFixture } from "./maritime-fixture";
import { piece } from "./helpers";

const onDisk = (value: unknown) => JSON.parse(JSON.stringify(value));
function fixture(count = 300) {
  const { s, water } = fishingFixture();
  for (let i = 0; i < count; i++) piece(s, water, 0, "fishing", 3);
  return s;
}

it("measures exactly the expanded base JSON bytes without serializing the rebuilt world", () => {
  const s = fixture();
  const cases: any[] = [packGame(s)];
  const unusual: any = packGame(s);
  unusual.tiles = {
    quoted: {
      id: "quoted",
      extra: 'a\\b\n"quoted"',
      unicode: "Forêt 雪 🌲",
      absent: undefined,
    },
    empty: {},
    own: { id: "other", n: -123.125, flag: true, missing: null, list: [] },
    future: JSON.parse(
      '{"__proto__":{"x":1},"a":[false,0,null],"id":"future"}',
    ),
  };
  unusual.extra = { preserved: "🌞", order: [1, 2] };
  unusual.vertices = {};
  cases.push(unusual);
  for (const input of cases) {
    const measured = { baseBytes: 0 };
    const decoded = unpackTables(onDisk(packTables(input)), measured);
    expect(measured.baseBytes).toBe(
      new TextEncoder().encode(JSON.stringify({ ...decoded, pieces: {} }))
        .length,
    );
    expect(JSON.stringify(unpackGame(decoded, measured.baseBytes))).toBe(
      JSON.stringify(unpackGame(decoded)),
    );
  }
});

it("preserves complete map values, property order and optional future fields", () => {
  const s = fixture();
  const tiles = Object.values(s.tiles);
  Object.assign(tiles[0], {
    future: { label: "Forêt 雪", nested: [null, false, 0, ""] },
    absent: undefined,
    nullable: null,
  });
  Object.defineProperty(tiles[0], "__proto__", {
    value: { futureFlag: true },
    enumerable: true,
  });
  // A different layout, a field absent from the other tiles, and reinserted IDs.
  s.tiles[tiles[1].id] = Object.assign({ custom: 0 }, tiles[1]);
  delete s.tiles[tiles[2].id];
  s.tiles[tiles[2].id] = tiles[2];
  const before = JSON.stringify(s);
  const packed = onDisk(packTables(packGame(s)));
  const restored = unpackGame(unpackTables(packed));
  expect(JSON.stringify(restored)).toBe(before);
  expect(JSON.stringify(s)).toBe(before);
  expect(Object.getPrototypeOf(restored.tiles[tiles[0].id])).toBe(
    Object.prototype,
  );
  expect((Object.prototype as any).futureFlag).toBeUndefined();
  // Includes exact floating coordinates, ports, roads, extensions and stockpiles.
  expect(restored).toEqual(onDisk(s));
});

it("retains records without an id field and does not repair mismatched ids", () => {
  const s = packGame(fixture(0));
  Object.assign(s.tiles, {
    future: { value: false },
    mismatch: { value: null, id: "another" },
    own: { value: [], id: "own" },
  });
  expect(JSON.stringify(unpackTables(onDisk(packTables(s))))).toBe(
    JSON.stringify(s),
  );
});

it("restores repeated unit sequences in exact order with independent mutable units", () => {
  const s = fixture(4000);
  const units = Object.values(s.pieces);
  Object.assign(units[50], {
    coverage: [],
    campaign: { enemy: 1, target: units[50].tile },
  });
  delete s.pieces[units[70].id];
  s.pieces[units[70].id] = units[70];
  const packed = onDisk(packTables(packGame(s)));
  expect(packed.pieces.rows.runs.length).toBeLessThan(15);
  expect(packed.pieces.keys.deltas.runs.length).toBeLessThan(15);
  const restored = unpackGame(unpackTables(packed));
  expect(JSON.stringify(restored)).toBe(JSON.stringify(s));
  restored.pieces[units[0].id].bonus = 8;
  expect(restored.pieces[units[1].id].bonus).toBe(0);
  expect(units[0].bonus).toBe(0);
});

it("accepts original template-packed saves alongside table-packed saves", () => {
  const s = fixture();
  const modern = JSON.parse(serializePacked(s));
  const old = { ...modern, packing: 1, game: packGame(s) };
  old.checksum = hash(JSON.stringify(old.game)).toString(16);
  expect(JSON.stringify(deserialize(JSON.stringify(old)))).toBe(
    JSON.stringify(deserialize(JSON.stringify(modern))),
  );
  const tableFormat = { ...modern, packing: 2, game: packTables(packGame(s)) };
  tableFormat.checksum = hash(JSON.stringify(tableFormat.game)).toString(16);
  expect(JSON.stringify(deserialize(JSON.stringify(tableFormat)))).toBe(
    JSON.stringify(deserialize(JSON.stringify(modern))),
  );
  modern.game[1].tiles.order[0]++;
  expect(() => deserialize(JSON.stringify(modern))).toThrow(/integrity/);
});

describe("rejects damaged map columns and run-length sequences", () => {
  const changes: Record<string, (p: any) => void> = {
    duplicateKeys: (p) => {
      p.tiles.keys[1] = p.tiles.keys[0];
    },
    unsafeKeys: (p) => {
      p.tiles.keys[0] = "__proto__";
    },
    missingKey: (p) => {
      p.tiles.keys.pop();
    },
    invalidLayout: (p) => {
      p.tiles.order[0] = -1;
    },
    fractionalLayout: (p) => {
      p.tiles.order[0] = 0.5;
    },
    missingLayout: (p) => {
      p.tiles.layouts = [];
    },
    missingColumn: (p) => {
      p.tiles.layouts[0].columns.pop();
    },
    missingValue: (p) => {
      p.tiles.layouts[0].columns.find(Array.isArray).pop();
    },
    duplicateField: (p) => {
      p.tiles.layouts[0].fields[1] = p.tiles.layouts[0].fields[0];
    },
    invalidField: (p) => {
      p.tiles.layouts[0].fields[1] = {};
    },
    invalidIdColumn: (p) => {
      p.tiles.layouts[0].columns.fill(null);
    },
    oddRuns: (p) => {
      p.pieces.rows.runs.push(0);
    },
    shortRuns: (p) => {
      p.pieces.rows.runs[1]--;
    },
    longRuns: (p) => {
      p.pieces.rows.runs[1]++;
    },
    zeroRuns: (p) => {
      p.pieces.rows.runs[1] = 0;
    },
    negativeRuns: (p) => {
      p.pieces.rows.runs[1] = -1;
    },
    fractionalRuns: (p) => {
      p.pieces.rows.runs[1] = 0.5;
    },
    fractionalValue: (p) => {
      p.pieces.rows.runs[0] = 0.5;
    },
    excessiveLength: (p) => {
      p.pieces.rows.length = 100_000_000;
    },
    unsafeValue: (p) => {
      p.pieces.keys.deltas.runs[0] = Number.MAX_SAFE_INTEGER + 1;
    },
  };
  for (const [name, mutate] of Object.entries(changes))
    it(name, () => {
      const packed = onDisk(packTables(packGame(fixture())));
      mutate(packed);
      expect(() => unpackTables(packed)).toThrow(/compact/);
    });
});

it("bounds shared column-name amplification including multibyte characters", () => {
  const s = fixture(0);
  const packed = onDisk(packTables(packGame(s)));
  for (const name of ["x".repeat(140_000), "é".repeat(70_000)]) {
    packed.tiles = {
      keys: Array.from({ length: 1000 }, (_, i) => `tile${i}`),
      order: new Array(1000).fill(0),
      layouts: [{ fields: [name], columns: [new Array(1000).fill(0)] }],
    };
    expect(() => unpackTables(packed)).toThrow(/expanded limit/);
  }
});

it("checks every unit while checking peaceful co-occupancy once per faction", () => {
  const s = fixture();
  const unit = Object.values(s.pieces).at(-1)!;
  expect(() => assertInvariants(s)).not.toThrow();
  unit.owner = 1;
  expect(() => assertInvariants(s)).toThrow(/Opposing armies/);
  s.withdrawals = [{ tile: unit.tile, owners: [0, 1] }];
  expect(() => assertInvariants(s)).not.toThrow();
  unit.moved = -1;
  expect(() => assertInvariants(s)).toThrow(/whole-number/);
});

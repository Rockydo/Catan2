import { expect, it, vi } from "vitest";
import {
  createSnapshotSerializer,
  deserialize,
  serializePacked,
} from "../src/game/save";
import * as geometry from "../src/game/save-geometry";
import { fishingFixture } from "./maritime-fixture";
import { piece } from "./helpers";
import { applySnapshotDelta, snapshotDelta } from "../src/game/snapshot-delta";
import type { Game } from "../src/game/types";
import { createSnapshotUnitPacker, packGame } from "../src/game/save-packing";

function encoded(text: string) {
  const { savedAt: _, ...data } = JSON.parse(text);
  return data;
}
function freeze(value: unknown) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return;
  Object.freeze(value);
  for (const child of Object.values(value)) freeze(child);
}

it("reuses immutable geometry across orders with exactly the same complete archive", () => {
  const { s, water, home } = fishingFixture();
  for (let i = 0; i < 2500; i++) piece(s, water, 0, "fishing", 1);
  const before = JSON.stringify(s),
    encode = createSnapshotSerializer();
  freeze(s);
  const expected = encoded(serializePacked(s));
  const spy = vi.spyOn(geometry, "packGeometry");
  try {
    expect(encoded(encode(s))).toEqual(expected);
    expect(spy).toHaveBeenCalledTimes(1);
    const next = {
      ...s,
      actions: s.actions + 1,
      towns: {
        ...s.towns,
        [home.id]: { ...home, stock: { ...home.stock, gold: 99 } },
      },
    };
    // Worker patches retain unchanged map dictionaries, just like real saves.
    const updated = applySnapshotDelta(s, snapshotDelta(s, next));
    const text = encode(updated);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(encoded(text)).toEqual(encoded(serializePacked(updated)));
    expect(JSON.stringify(deserialize(text))).toBe(
      JSON.stringify(deserialize(serializePacked(updated))),
    );
    expect(JSON.stringify(s)).toBe(before);
  } finally {
    spy.mockRestore();
  }
});

it.each(["tiles", "vertices", "edges"] as const)(
  "invalidates the prepared world when %s change or reorder",
  (field) => {
    const { s } = fishingFixture(),
      encode = createSnapshotSerializer();
    encode(s);
    const next = structuredClone(s);
    const key = Object.keys(next[field])[0],
      record = next[field][key];
    Object.assign(record, { future: { notes: "Forêt 雪", nested: [1, 2] } });
    delete next[field][key];
    (next[field] as Record<string, unknown>)[key] = record;
    // Only this map is replaced; every other world dictionary retains identity.
    const patched = { ...s, [field]: next[field] } as Game;
    const expected = encoded(serializePacked(patched));
    const spy = vi.spyOn(geometry, "packGeometry");
    try {
      expect(encoded(encode(patched))).toEqual(expected);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(encoded(encode(patched))).toEqual(expected);
      expect(spy).toHaveBeenCalledTimes(1);
    } finally {
      spy.mockRestore();
    }
  },
);

it("retains seasonal values, noncanonical map fields, empty worlds and alternating campaigns", () => {
  const { s } = fishingFixture(),
    encode = createSnapshotSerializer();
  const seasonal = structuredClone(s),
    water = Object.values(seasonal.tiles).find((t) => t.resource === "water")!;
  water.surface = "frozen";
  water.iceWeather = { round: s.round, season: "winter", half: "late" };
  Object.values(seasonal.vertices)[0].x += 0.25;
  const empty = {
    ...s,
    tiles: {},
    edges: {},
    vertices: {},
    pieces: {},
    towns: {},
  };
  for (const game of [s, seasonal, empty, s, seasonal])
    expect(encoded(encode(game))).toEqual(encoded(serializePacked(game)));
  // General mutable serialization still observes edits without any cache.
  const before = encoded(serializePacked(s));
  Object.values(s.tiles)[0].number = 12;
  expect(encoded(serializePacked(s))).not.toEqual(before);
});

it("does not enumerate an unchanged army again while saving changed stocks and orders", () => {
  const { s, water, home } = fishingFixture();
  for (let i = 0; i < 2500; i++) piece(s, water, 0, "fishing", 1);
  let reads = 0;
  s.pieces = new Proxy(s.pieces, {
    ownKeys(target) {
      reads++;
      return Reflect.ownKeys(target);
    },
  });
  const encode = createSnapshotSerializer();
  encode(s);
  expect(reads).toBe(1);
  const next = {
    ...s,
    actions: s.actions + 1,
    towns: {
      ...s.towns,
      [home.id]: { ...home, stock: { ...home.stock, gold: 9999 } },
    },
  };
  const text = encode(next);
  expect(reads).toBe(1);
  expect(encoded(text)).toEqual(encoded(serializePacked(next)));
});

it("invalidates packed troops for recruitment, losses, reordered IDs, orders and nested changes", () => {
  const { s, water } = fishingFixture();
  for (let i = 0; i < 2000; i++) piece(s, water, 0, "fishing", 1);
  const encode = createSnapshotSerializer();
  const first = Object.values(s.pieces)[0];
  const changed = {
    ...s,
    pieces: {
      ...s.pieces,
      [first.id]: {
        ...first,
        bonus: 3,
        guildSupplied: true,
        future: { orders: ["Forêt 雪", { preserved: true }] },
      },
    },
  };
  const recruited = structuredClone(changed);
  piece(recruited, water, 0, "merchantship", 4);
  const lost = { ...recruited, pieces: { ...recruited.pieces } };
  delete lost.pieces[first.id];
  const reordered = { ...s, pieces: { ...s.pieces } };
  delete reordered.pieces[first.id];
  reordered.pieces[first.id] = first;
  for (const game of [s, changed, recruited, lost, reordered, s]) {
    freeze(game);
    const text = encode(game);
    expect(encoded(text)).toEqual(encoded(serializePacked(game)));
    expect(JSON.stringify(deserialize(text))).toBe(
      JSON.stringify(deserialize(serializePacked(game))),
    );
  }
});

it("keeps the full expansion budget when cached troops are combined with a growing campaign", () => {
  const { s, water } = fishingFixture();
  // A few templates represent almost 120 MB of independent troop records.
  // Their tiny packed size must never bypass the expanded snapshot budget.
  for (let i = 0; i < 2000; i++)
    Object.assign(piece(s, water), { future: "雪".repeat(20_000) });
  const pack = createSnapshotUnitPacker();
  expect(pack(s).pieces.templates).toHaveLength(1);
  const growing = { ...s, future: "x".repeat(9_000_000) };
  expect(() => pack(growing)).toThrow(/expanded limit/);
  expect(() => packGame(growing)).toThrow(/expanded limit/);
  // A rejected save does not poison the last usable snapshot.
  expect(pack(s)).toEqual(packGame(s));
});

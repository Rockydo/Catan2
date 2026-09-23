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

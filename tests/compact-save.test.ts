import { expect, it } from "vitest";
import { fishingFixture } from "./maritime-fixture";
import { piece } from "./helpers";
import { assertInvariants, serialize, deserialize } from "../src/game/save";
import {
  compress,
  expand,
  exportCompact,
  exportArchive,
  importSave,
} from "../src/storage/codec";

it("round-trips compressed and legacy saves without losing unit orders or stored goods", async () => {
  const { s, water } = fishingFixture();
  for (let i = 0; i < 2000; i++) piece(s, water, 0, "fishing", 4);
  const text = serialize(s),
    compact = await exportCompact(s);
  expect(compact.length).toBeLessThan(text.length * 0.3);
  expect(await importSave(compact)).toEqual(deserialize(text));
  expect(await importSave(text)).toEqual(deserialize(text));
  // The outer wrapper may be pretty-printed or its keys reordered.
  const data = JSON.parse(compact);
  expect(
    await importSave(
      JSON.stringify(
        {
          data: data.data,
          encoding: data.encoding,
          version: 1,
          format: data.format,
        },
        null,
        2,
      ),
    ),
  ).toEqual(deserialize(text));
});
it("detects corrupted compressed bytes, invalid checksums and unsupported wrappers", async () => {
  const { s } = fishingFixture();
  const zipped = await compress(serialize(s));
  zipped[Math.floor(zipped.length / 2)] ^= 255;
  await expect(expand(zipped)).rejects.toThrow();
  const data = JSON.parse(serialize(s));
  data.game.rng++;
  await expect(importSave(JSON.stringify(data))).rejects.toThrow(/integrity/);
  const wrapper = JSON.parse(await exportCompact(s));
  wrapper.version = 2;
  await expect(importSave(JSON.stringify(wrapper))).rejects.toThrow(
    /supported/,
  );
});
it("counts passengers once without weakening berth or carrier validation", () => {
  const { s, water } = fishingFixture();
  const carrier = piece(s, water, 0, "transport", 1);
  const passenger = piece(s, water);
  passenger.carrier = carrier.id;
  expect(() => assertInvariants(s)).not.toThrow();
  const extra = piece(s, water);
  extra.carrier = carrier.id;
  expect(() => assertInvariants(s)).toThrow(/berths/);
  delete s.pieces[extra.id];
  passenger.owner = 1;
  expect(() => assertInvariants(s)).toThrow(/passenger/);
});

it("stops decompression at its expanded byte budget", async () => {
  const zipped = await compress("x".repeat(10000));
  await expect(expand(zipped, 512)).rejects.toThrow(/expanded limit/);
});

it("imports binary archives and historical JSON bytes with identical complete state", async () => {
  const { s, water } = fishingFixture();
  s.players[0].name = "Forêt 雪";
  for (let i = 0; i < 2000; i++) piece(s, water, 0, "fishing", 4);
  const expected = JSON.stringify(deserialize(serialize(s)));
  const archive = await exportArchive(s);
  const compact = await exportCompact(s);
  expect([...archive.subarray(0, 2)]).toEqual([0x1f, 0x8b]);
  expect(archive.byteLength).toBeLessThan(compact.length * 0.76);
  for (const input of [
    archive,
    new TextEncoder().encode(compact),
    new TextEncoder().encode(serialize(s)),
    new Blob([archive]),
    new File([compact], "old-save.catane", { type: "application/gzip" }),
    new File([serialize(s)], "legacy.json"),
  ])
    expect(JSON.stringify(await importSave(input))).toBe(expected);
  // Import only the view, not unrelated bytes in its underlying buffer.
  const padded = new Uint8Array(archive.length + 8);
  padded.set(archive, 4);
  expect(JSON.stringify(await importSave(padded.subarray(4, -4)))).toBe(
    expected,
  );
});

it("rejects corrupt or truncated binary archives and malformed UTF-8 JSON", async () => {
  const { s } = fishingFixture();
  const archive = await exportArchive(s);
  for (const length of [2, Math.floor(archive.length / 2), archive.length - 1])
    await expect(importSave(archive.slice(0, length))).rejects.toThrow();
  archive[archive.length - 8] ^= 1;
  await expect(importSave(archive)).rejects.toThrow();
  await expect(
    importSave(new Uint8Array([0x7b, 0xff, 0x7d])),
  ).rejects.toThrow();
  await expect(
    importSave(new Blob([new Uint8Array([0x7b, 0xff, 0x7d])])),
  ).rejects.toThrow();
  await expect(importSave(new Blob([archive]))).rejects.toThrow();
});

it("streams imported JSON without allocating the entire file's byte buffer", async () => {
  const text = serialize(fishingFixture().s),
    file = new Blob([text]);
  file.arrayBuffer = () => {
    throw Error("Whole file read");
  };
  file.text = () => {
    throw Error("Whole file read");
  };
  expect(JSON.stringify(await importSave(file))).toBe(
    JSON.stringify(deserialize(text)),
  );
});

it("validates empty ships and carrier capacity regardless of unit ordering", () => {
  const { s, water } = fishingFixture();
  const passenger = piece(s, water);
  const carrier = piece(s, water, 0, "transport", 1);
  passenger.carrier = carrier.id;
  expect(() => assertInvariants(s)).not.toThrow();
  const extra = piece(s, water);
  extra.carrier = carrier.id;
  expect(() => assertInvariants(s)).toThrow(/berths/);
  delete s.pieces[extra.id];
  delete s.pieces[passenger.id];
  carrier.tier = 7;
  expect(() => assertInvariants(s)).toThrow(/whole-number/);
});

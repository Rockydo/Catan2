import { expect, it } from "vitest";
import { fishingFixture } from "./maritime-fixture";
import { piece } from "./helpers";
import { assertInvariants, serialize, deserialize } from "../src/game/save";
import {
  compress,
  expand,
  exportCompact,
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

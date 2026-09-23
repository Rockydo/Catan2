import { expect, it } from "vitest";
import {
  encodeLoadedCampaign,
  decodeLoadedCampaign,
} from "../src/storage/load-transfer";
import { fishingFixture } from "./maritime-fixture";
import { piece } from "./helpers";
import { deserialize, serialize, serializePacked } from "../src/game/save";

it("keeps small and missing saves on the direct path with recovery status intact", () => {
  for (const game of [null, fishingFixture().s]) {
    const result = {
      game,
      recovered: true,
      error: "Damaged primary",
      needsSave: true,
    };
    expect(encodeLoadedCampaign(result)).toBe(result);
    expect(decodeLoadedCampaign(encodeLoadedCampaign(result))).toBe(result);
  }
});

it("transports repeated troops compactly with independent mutable units and nested data", () => {
  const { s, water } = fishingFixture();
  for (let i = 0; i < 20_000; i++) piece(s, water, 0, "fishing", 3);
  const units = Object.values(s.pieces);
  Object.assign(units[0], { future: JSON.parse('{"__proto__":{"value":7}}') });
  const expected = JSON.stringify(s);
  const encoded = encodeLoadedCampaign({
    game: s,
    recovered: true,
    needsSave: true,
  });
  expect("gameText" in encoded).toBe(true);
  expect("unitTemplates" in encoded && encoded.unitTemplates).toBe(true);
  expect("gameText" in encoded && encoded.gameText.length).toBeLessThan(
    expected.length * 0.2,
  );
  const decoded = decodeLoadedCampaign(structuredClone(encoded));
  expect(JSON.stringify(decoded.game)).toBe(expected);
  expect(decoded.recovered).toBe(true);
  expect(decoded.needsSave).toBe(true);
  decoded.game!.pieces[units[1].id].bonus++;
  expect(decoded.game!.pieces[units[2].id].bonus).toBe(units[2].bonus);
  expect(JSON.stringify(s)).toBe(expected);
  expect((Object.prototype as any).value).toBeUndefined();
});

it("retains native JSON transfer for a diverse large army and reads older worker results", () => {
  const { s, water } = fishingFixture();
  for (let i = 0; i < 20_000; i++) piece(s, water, 0, "fishing", 3).bonus = i;
  const expected = JSON.stringify(s);
  const encoded = encodeLoadedCampaign({ game: s, recovered: false });
  expect("unitTemplates" in encoded).toBe(false);
  expect("gameText" in encoded && encoded.gameText).toBe(expected);
  expect(JSON.stringify(decodeLoadedCampaign(encoded).game)).toBe(expected);
  expect(
    JSON.stringify(
      decodeLoadedCampaign({
        gameText: expected,
        recovered: true,
        error: "Recovered",
      }).game,
    ),
  ).toBe(expected);
});

it("uses compact worker transfer for medium armies only after complete archive validation", () => {
  const { s, water } = fishingFixture();
  for (let i = 0; i < 2_000; i++) piece(s, water, 0, "fishing", 3);
  const units = Object.values(s.pieces);
  for (const u of units.slice(0, 2))
    Object.assign(u, { future: { nested: [1, 2] } });
  const before = JSON.stringify(s);
  const validated = deserialize(serializePacked(s));
  const transfer = encodeLoadedCampaign({ game: validated, recovered: false });
  expect("unitTemplates" in transfer && transfer.unitTemplates).toBe(true);
  const decoded = decodeLoadedCampaign(structuredClone(transfer)).game!;
  expect(JSON.stringify(decoded)).toBe(JSON.stringify(validated));
  const [a, b] = Object.values(decoded.pieces) as any[];
  a.future.nested.push(3);
  expect(b.future.nested).toEqual([1, 2]);
  expect(JSON.stringify(s)).toBe(before);
  units[10].tier = 9;
  expect(() => deserialize(serializePacked(s))).toThrow(/whole-number/);
});

it.each(["__proto__", "prototype", "constructor", "", "u".repeat(160)])(
  "rejects unsafe unit keys in historical JSON before trusted transfer: %s",
  (key) => {
    const { s, water } = fishingFixture();
    const unit = piece(s, water, 0, "fishing", 1);
    s.pieces = JSON.parse(JSON.stringify({ [key]: { ...unit, id: key } }));
    expect(() => deserialize(serialize(s))).toThrow(/identifier/);
  },
);

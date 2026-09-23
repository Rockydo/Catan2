import { expect, it } from "vitest";
import {
  encodeLoadedCampaign,
  decodeLoadedCampaign,
} from "../src/storage/load-transfer";
import { fishingFixture } from "./maritime-fixture";
import { piece } from "./helpers";

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

it("transports a validated large army as exact JSON with independent mutable units", () => {
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
  const decoded = decodeLoadedCampaign(structuredClone(encoded));
  expect(JSON.stringify(decoded.game)).toBe(expected);
  expect(decoded.recovered).toBe(true);
  expect(decoded.needsSave).toBe(true);
  decoded.game!.pieces[units[1].id].bonus++;
  expect(decoded.game!.pieces[units[2].id].bonus).toBe(units[2].bonus);
  expect(JSON.stringify(s)).toBe(expected);
  expect((Object.prototype as any).value).toBeUndefined();
});

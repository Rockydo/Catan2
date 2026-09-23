import { expect, it } from "vitest";
import {
  encodeLoadedCampaign,
  decodeLoadedCampaign,
} from "../src/storage/load-transfer";
import { fishingFixture } from "./maritime-fixture";
import { piece } from "./helpers";
import {
  deserialize,
  deserializeSnapshot,
  serialize,
  serializePacked,
} from "../src/game/save";
import { packGame } from "../src/game/save-packing";

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
  expect("unitSequences" in encoded && encoded.unitSequences).toBe(true);
  if ("gameText" in encoded) {
    const units = JSON.parse(encoded.gameText).pieces;
    expect(units.rows.runs.length).toBeLessThan(20);
    expect(units.keys.deltas.runs.length).toBeLessThan(20);
  }
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
  // The old worker message format remains readable without the sequence flag.
  const old = {
    gameText: JSON.stringify(packGame(s)),
    unitTemplates: true as const,
    recovered: false,
  };
  expect(JSON.stringify(decodeLoadedCampaign(old).game)).toBe(expected);
});

it("retains sparse unit IDs, nonconsecutive templates, future fields and status in compact transfers", () => {
  const { s, water } = fishingFixture();
  for (let i = 0; i < 2_200; i++) {
    const u = piece(s, water, 0, "fishing", i % 100 < 50 ? 2 : 3);
    if (i % 23 === 0) delete s.pieces[u.id];
    else if (i % 100 === 0) Object.assign(u, { future: { name: "Île 雪" } });
  }
  const ids = Object.keys(s.pieces),
    first = s.pieces[ids[0]];
  delete s.pieces[first.id];
  s.pieces[first.id] = first;
  const expected = JSON.stringify(s);
  const result = {
    game: s,
    recovered: true,
    error: "Recovered primary",
    needsSave: true,
  };
  const decoded = decodeLoadedCampaign(
    structuredClone(encodeLoadedCampaign(result)),
  );
  expect(JSON.stringify(decoded.game)).toBe(expected);
  expect(decoded).toEqual(result);
  expect(Object.keys(decoded.game!.pieces)).toEqual(Object.keys(s.pieces));
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

it("reuses validated archive templates immediately without re-enumerating troops", () => {
  const { s, water } = fishingFixture();
  for (let i = 0; i < 4000; i++) piece(s, water, 0, "fishing", 3);
  const units = Object.values(s.pieces);
  Object.assign(units[100], { future: { nested: [1, 2] } });
  const text = serializePacked(s),
    snapshot = deserializeSnapshot(text);
  const expected = JSON.stringify(deserialize(serialize(s)));
  expect(snapshot.units).toBeDefined();
  // A completed validation supplies the existing archive templates. Reading or
  // enumerating the full army again while encoding would be unnecessary work.
  snapshot.game.pieces = new Proxy(snapshot.game.pieces, {
    ownKeys() {
      throw Error("Unexpected troop enumeration");
    },
    get() {
      throw Error("Unexpected troop read");
    },
  });
  const encoded = encodeLoadedCampaign(
    { game: snapshot.game, recovered: true, needsSave: true },
    snapshot.units,
  );
  const decoded = decodeLoadedCampaign(structuredClone(encoded));
  expect(JSON.stringify(decoded.game)).toBe(expected);
  expect(decoded.recovered).toBe(true);
  expect(decoded.needsSave).toBe(true);
  decoded.game!.pieces[units[0].id].bonus++;
  expect(decoded.game!.pieces[units[1].id].bonus).toBe(0);
  (decoded.game!.pieces[units[100].id] as any).future.nested.push(3);
  expect(
    (snapshot.units!.templates.find((t) => t.future)!.future as any).nested,
  ).toEqual([1, 2]);
});
it("does not retain archive unit templates across historical migrations or ordinary loads", () => {
  const { s, water } = fishingFixture();
  for (let i = 0; i < 2100; i++) piece(s, water, 0, "fishing", 1);
  const header = JSON.parse(serializePacked(s));
  header.version = 3;
  const text = JSON.stringify(header),
    snapshot = deserializeSnapshot(text);
  expect(snapshot.units).toBeUndefined();
  expect(
    JSON.stringify(
      decodeLoadedCampaign(
        encodeLoadedCampaign(
          { game: snapshot.game, recovered: false },
          snapshot.units,
        ),
      ).game,
    ),
  ).toBe(JSON.stringify(deserialize(text)));
  const raw = deserializeSnapshot(serialize(s));
  expect(raw.units).toBeUndefined();
  const ordinary = deserialize(serializePacked(s));
  expect(Object.hasOwn(ordinary, "units")).toBe(false);
  const first = Object.values(ordinary.pieces)[0];
  first.bonus = 9;
  expect(
    decodeLoadedCampaign(
      encodeLoadedCampaign({ game: ordinary, recovered: false }),
    ).game!.pieces[first.id].bonus,
  ).toBe(9);
});
it("refuses to offer a trusted transfer when a checksummed archive violates game rules", () => {
  const { s, water } = fishingFixture();
  for (let i = 0; i < 2100; i++) piece(s, water, 0, "fishing", 1);
  Object.values(s.pieces)[15].tier = 9;
  expect(() => deserializeSnapshot(serializePacked(s))).toThrow(/whole-number/);
});

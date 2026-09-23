import { expect, it, vi } from "vitest";
import { SHIP_INFO, UNIT_INFO } from "../src/game/content";
import {
  assertInvariants,
  deserialize,
  serialize,
  serializePacked,
} from "../src/game/save";
import type { Game, Piece } from "../src/game/types";
import { fishingFixture } from "./maritime-fixture";
import { piece } from "./helpers";

function fixture() {
  const { s, water } = fishingFixture();
  for (let i = 0; i < 2_000; i++) piece(s, water, 0, "fishing", 1);
  return { s, water };
}

function classChecks(read: () => Game) {
  const own = Object.hasOwn;
  let count = 0;
  const spy = vi.spyOn(Object, "hasOwn").mockImplementation((object, key) => {
    if (object === UNIT_INFO || object === SHIP_INFO) count++;
    return own(object, key);
  });
  try {
    return { game: read(), count };
  } finally {
    spy.mockRestore();
  }
}

it("validates repeated templates once, retaining exact IDs, order and independent units", () => {
  const { s, water } = fixture();
  const units = Object.values(s.pieces);
  // A second template, separated in the dictionary, with nested optional data.
  for (const i of [7, 980, 1999])
    units[i].campaign = { enemy: 1, target: water };
  delete s.pieces[units[42].id];
  s.pieces[units[42].id] = units[42];
  const text = serializePacked(s);
  const expected = JSON.stringify(deserialize(serialize(s)));
  const { game, count } = classChecks(() => deserialize(text));
  expect(count).toBe(2);
  expect(JSON.stringify(game)).toBe(expected);
  expect(Object.keys(game.pieces)).toEqual(Object.keys(s.pieces));
  game.pieces[units[7].id].campaign!.enemy = 2;
  expect(game.pieces[units[980].id].campaign!.enemy).toBe(1);
  game.pieces[units[1999].id].tier = 9;
  // Subsequent mutable validation cannot retain a prior template verdict.
  expect(() => assertInvariants(game)).toThrow(/whole-number/);
});

it("keeps full individual validation for historical saves, literal IDs and ordinary games", () => {
  const { s } = fixture();
  const old = JSON.parse(serializePacked(s));
  old.version = 13;
  expect(classChecks(() => deserialize(JSON.stringify(old))).count).toBe(2_000);
  expect(classChecks(() => deserialize(serialize(s))).count).toBe(2_000);
  const units = Object.values(s.pieces);
  s.pieces = Object.fromEntries(
    units.map((u, i) => {
      const id = String(2_000 - i);
      return [id, { ...u, id }];
    }),
  );
  const { game, count } = classChecks(() => deserialize(serializePacked(s)));
  expect(count).toBe(2_000);
  expect(JSON.stringify(game)).toBe(JSON.stringify(deserialize(serialize(s))));
});

const invalid: [string, Partial<Piece>][] = [
  ["owner", { owner: 99 }],
  ["class", { kind: "unknown" as Piece["kind"] }],
  ["naval flag", { naval: false }],
  ["tier", { tier: 9 }],
  ["birth", { born: -1 }],
  ["movement", { moved: -1 }],
  ["bonus", { bonus: 0.5 }],
  ["action flag", { acted: 1 as unknown as boolean }],
  ["coverage", { coverage: ["missing"] }],
  ["orders", { campaign: { enemy: 0, target: "missing" } }],
  ["guild supply", { guildSupplied: 1 as unknown as boolean }],
  ["guild siege", { guildSiege: 3 }],
  ["stranding", { seasonStatus: "icebound" }],
  ["passenger", { carrier: "missing" }],
];
it.each(invalid)(
  "rejects a single damaged %s template even with a valid archive checksum",
  (_, value) => {
    const { s } = fixture();
    Object.assign(Object.values(s.pieces)[1700], value);
    let error: string | undefined;
    try {
      deserialize(serialize(s));
    } catch (e) {
      error = (e as Error).message;
    }
    expect(error).toBeTruthy();
    expect(() => deserialize(serializePacked(s))).toThrow(error);
  },
);

it("counts every repeated passenger and checks the carrier after all templates", () => {
  const { s, water } = fishingFixture();
  const carrier = piece(s, water, 0, "convoy", 4);
  for (let i = 0; i < 4; i++) {
    const passenger = piece(s, water);
    passenger.carrier = carrier.id;
  }
  // Carrier comes last, to ensure template reuse does not depend on record order.
  delete s.pieces[carrier.id];
  s.pieces[carrier.id] = carrier;
  const expected = JSON.stringify(deserialize(serialize(s)));
  expect(JSON.stringify(deserialize(serializePacked(s)))).toBe(expected);
  for (let i = 0; i < 20; i++) piece(s, water).carrier = carrier.id;
  expect(() => deserialize(serializePacked(s))).toThrow(/berths/);
  for (const u of Object.values(s.pieces)) if (u.carrier) u.owner = 1;
  expect(() => deserialize(serializePacked(s))).toThrow(/passenger/);
});

it("rejects opposed repeated formations and applies current alliances", () => {
  const { s, water } = fixture();
  for (let i = 0; i < 30; i++) piece(s, water, 1, "fishing", 1);
  expect(() => deserialize(serializePacked(s))).toThrow(/Opposing armies/);
  s.withdrawals = [{ tile: water, owners: [0, 1] }];
  expect(JSON.stringify(deserialize(serializePacked(s)))).toBe(
    JSON.stringify(deserialize(serialize(s))),
  );
});

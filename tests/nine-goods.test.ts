import { describe, expect, it } from "vitest";
import { RAW, PROCESSED, GOODS } from "../src/game/types";
import { COSTS, EXTENSIONS, campCost, processedFor } from "../src/game/content";
import { assertInvariants, deserialize, serialize } from "../src/game/save";
import { production } from "../src/game/economy";
import { generateWorld, randomAt, LAND_RESOURCES } from "../src/game/world";
import { oldGoodsFixture, wrapOldGame } from "./nine-goods-fixture";

describe("nine resources and affordable camps", () => {
  it("keeps paired legacy goods and adds weighted Gold, water-only Fish and Whale Oil", () => {
    expect(RAW).toHaveLength(13);
    expect(PROCESSED).toHaveLength(10);
    expect(EXTENSIONS).toHaveLength(11);
    expect(GOODS).toHaveLength(23);
    expect(
      RAW.filter((g) => g !== "fish" && g !== "meat" && g !== "oil").map(
        processedFor,
      ),
    ).toEqual(PROCESSED);
    const w = generateWorld("nine-goods", 2000);
    for (const t of Object.values(w.tiles)) {
      expect(t.resource).not.toBe("flax");
      expect(t.resource).not.toBe("fish");
      expect(t.resource).not.toBe("oil");
    }
  });
  it("converts old investments and stores without changing locations, rolls, readiness or random streams", () => {
    const { old, town, tile, edge, port } = oldGoodsFixture();
    const s = deserialize(wrapOldGame(old));
    expect(s.version).toBe(5);
    expect(s.generation).toBe(4);
    expect(s.tiles[tile]).toEqual({ ...old.tiles[tile], resource: "salt" });
    expect(s.towns[town].stock).toEqual({ salt: 7, reagents: 7 });
    expect(s.towns[town].extensions[tile]).toBe(2);
    expect(s.routes[edge].camps[tile]).toBe(2);
    expect(s.edges[port].harbor).toBe("salt");
    expect(s.production[0]).toEqual({ salt: 3, reagents: 3 });
    expect([s.rng, s.deckRng, s.pieces]).toEqual([
      old.rng,
      old.deckRng,
      old.pieces,
    ]);
    expect(deserialize(serialize(s))).toEqual(s);
    production(s, 7);
    expect(s.production[0].salt).toBe(6);
    expect(s.production[0].reagents).toBe(4);
    assertInvariants(s);
  });
  it("converts pending trades and saved raid receipts, cancelling same-good offers caused by conversion", () => {
    const { old, town } = oldGoodsFixture();
    old.trade = { from: 0, to: 1, give: { rope: 2 }, take: { coal: 3 } };
    old.events[0].townAttack = {
      kind: "raid",
      town,
      name: old.towns[town].name,
      defender: 0,
      vertex: old.towns[town].vertex,
      goods: { flax: 2, salt: 1, rope: 4 },
    };
    let s = deserialize(wrapOldGame(old));
    expect(s.trade?.give).toEqual({ reagents: 2 });
    expect(s.events[0].townAttack?.goods).toEqual({ salt: 3, reagents: 4 });
    old.trade = { from: 0, to: 1, give: { flax: 2 }, take: { salt: 3 } };
    s = deserialize(wrapOldGame(old));
    expect(s.trade).toBeUndefined();
  });
  it("rejects corrupt conversion quantities and retired resources in current saves", () => {
    const { old, town, tile } = oldGoodsFixture();
    old.towns[town].stock.flax = -1;
    expect(() => deserialize(wrapOldGame(old))).toThrow(/quantity/);
    old.towns[town].stock.flax = Number.MAX_SAFE_INTEGER;
    expect(() => deserialize(wrapOldGame(old))).toThrow(/quantity/);
    old.towns[town].stock.flax = 1;
    const s = deserialize(wrapOldGame(old));
    for (const invalid of ["flax", "planks"]) {
      (s.tiles[tile] as any).resource = invalid;
      expect(() => deserialize(serialize(s))).toThrow(/terrain resource/);
    }
  });
});

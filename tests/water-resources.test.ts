import { describe, it, expect } from "vitest";
import {
  addHexes,
  generateHex,
  neighbors,
  randomAt,
  waterResources,
} from "../src/game/world";
import type { World } from "../src/game/types";
import { tileGood, tileTerrain, harvestTiles } from "../src/game/maritime";
import { production } from "../src/game/economy";
import { income, inventory, productionSources } from "../src/game/selectors";
import { serialize, deserialize, assertInvariants } from "../src/game/save";
import { fishingFixture } from "./maritime-fixture";
import { piece, run } from "./helpers";

describe("offshore Fish and Hides-and-Oil-producing Whales", () => {
  it.each([true, false])(
    "uses exact sequential thresholds (coastal=%s), with independent Whale rolls",
    (coastal) => {
      let fish = 0,
        whale = 0;
      const n = 40000;
      for (let i = 0; i < n; i++) {
        const id = `${i},3`,
          seed = "marine-probabilities";
        const result = waterResources(seed, id, coastal);
        const expectedFish =
          randomAt(seed, id, "fish") < (coastal ? 0.15 : 0.1);
        const expectedWhale =
          !expectedFish && randomAt(seed, id, "whale") < (coastal ? 0.05 : 0.1);
        expect(!!result.fish).toBe(expectedFish);
        expect(!!result.whale).toBe(expectedWhale);
        fish += Number(!!result.fish);
        whale += Number(!!result.whale);
      }
      expect(fish / n).toBeCloseTo(coastal ? 0.15 : 0.1, 2);
      // Whale chance is conditional on Fish not having spawned, not on all water.
      expect(whale / (n - fish)).toBeCloseTo(coastal ? 0.05 : 0.1, 2);
    },
  );
  it("keeps terrain and dice streams unchanged and never puts Whales on land or Fish", () => {
    for (let i = 0; i < 3000; i++) {
      const seed = "marine-world",
        id = `${i},0`,
        t = generateHex(seed, id);
      const coastal = neighbors(id).some(
        (n) => randomAt(seed, n, "terrain") >= 0.5,
      );
      expect(t.number).toBe(2 + Math.floor(randomAt(seed, id, "number") * 11));
      expect(!!t.whale).toBe(
        t.resource === "water" &&
          !t.fish &&
          randomAt(seed, id, "whale") < (coastal ? 0.05 : 0.1),
      );
      if (t.whale) {
        expect(tileGood(t)).toBe("hides");
        expect(tileTerrain(t)).toBe("whale");
      }
    }
  });
  it("keeps new worlds identical for the same discovery footprint and never rerolls existing tiles", () => {
    const seed = "marine-reveal",
      ids = Array.from(
        { length: 80 },
        (_, i) => `${i % 10},${Math.floor(i / 10)}`,
      );
    const a: World = { tiles: {}, edges: {}, vertices: {} },
      b: World = { tiles: {}, edges: {}, vertices: {} };
    addHexes(a, seed, ids);
    addHexes(b, seed, [...ids].reverse());
    expect(a.tiles).toEqual(b.tiles);
    const whale = Object.values(a.tiles).find((t) => t.whale)!;
    expect(whale).toBeDefined();
    delete whale.whale; // Represents plain water revealed by a previous version.
    const before = structuredClone(a.tiles);
    addHexes(a, seed, [...ids, ...neighbors(whale.id)]);
    for (const id of ids) expect(a.tiles[id]).toEqual(before[id]);
  });
  it("harvests Hides, Oil and Leather from towns, route camps, extensions and fishing ships", () => {
    let { s, home, water, edge } = fishingFixture();
    delete s.tiles[water].fish;
    s.tiles[water].whale = true;
    s = run(s, { type: "route", edge: edge.id });
    s = run(s, { type: "camp", edge: edge.id, tile: water });
    s = run(s, { type: "camp", edge: edge.id, tile: water });
    s = run(s, { type: "extension", town: home.id, tile: water });
    const ship = piece(s, edge.tiles[1], 0, "fishing", 3);
    expect(harvestTiles(s, ship)).toContain(water);
    expect(
      productionSources(s)
        .filter((p) => p.owner === 0 && p.tile === water && p.good === "hides")
        .reduce((n, p) => n + p.amount, 0),
    ).toBe(9);
    expect(income(s).hides).toBeCloseTo(9 / 6);
    expect(income(s).oil).toBeCloseTo(9 / 6);
    const before = inventory(s);
    production(s, 7);
    expect(inventory(s).hides! - before.hides!).toBe(9);
    expect(inventory(s).oil! - before.oil!).toBe(9);
    expect(inventory(s).leather! - before.leather!).toBe(3);
    assertInvariants(s);
    expect(deserialize(serialize(s))).toEqual(s);
  });
  it("enemy fleets block Whale harvest, but merchants still collect and merchant ships remain land-only", () => {
    const { s, water, edge } = fishingFixture();
    delete s.tiles[water].fish;
    s.tiles[water].whale = true;
    piece(s, edge.tiles[1], 0, "fishing", 2);
    const trader = piece(
      s,
      neighbors(water).find((id) => s.tiles[id]?.resource !== "water")!,
      0,
      "merchant",
      2,
    );
    trader.coverage = [water];
    const merchantShip = piece(s, edge.tiles[1], 0, "merchantship", 2);
    expect(harvestTiles(s, merchantShip)).not.toContain(water);
    piece(s, water, 1, "galley");
    const before = inventory(s);
    production(s, 7);
    expect(inventory(s).hides! - before.hides!).toBe(2);
    expect(inventory(s).oil! - before.oil!).toBe(2);
  });
  it("rejects invalid Whale markers and overlapping Fish/Whales in saves", () => {
    const { s, water } = fishingFixture();
    s.tiles[water].whale = true;
    expect(() => assertInvariants(s)).toThrow(/Fish and Whales/);
    delete s.tiles[water].fish;
    s.tiles[water].resource = "grain";
    expect(() => assertInvariants(s)).toThrow(/Whale grounds must be water/);
  });
});

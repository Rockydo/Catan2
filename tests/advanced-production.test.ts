import { describe, expect, it } from "vitest";
import { maritimeFixture } from "./maritime-fixture";
import { piece } from "./helpers";
import { production } from "../src/game/economy";
import { harvestTiles } from "../src/game/maritime";
import { income, inventory as totalInventory } from "../src/game/selectors";
import { BIOME_INFO, type Biome } from "../src/game/climate-content";
import type { Game } from "../src/game/types";
import { serialize, deserialize } from "../src/game/save";

const inventory = (s: Game) =>
  Object.fromEntries(Object.entries(totalInventory(s)).filter(([, n]) => n));

function fixture() {
  const f = maritimeFixture();
  for (const t of Object.values(f.s.tiles)) {
    t.resource = "snow";
    t.biome = "snow-plain";
    t.number = 2;
  }
  for (const t of Object.values(f.s.towns)) t.stock = {};
  return f;
}
function terrain(s: Game, id: string, biome: Biome) {
  Object.assign(s.tiles[id], {
    biome,
    resource: BIOME_INFO[biome].resource,
    number: 7,
  });
  delete s.tiles[id].fish;
  delete s.tiles[id].whale;
  if (biome === "fish" || biome === "cod") s.tiles[id].fish = true;
  if (biome === "whale") s.tiles[id].whale = true;
}

describe("advanced town and merchant production", () => {
  it.each([1, 2, 3, 4])(
    "town level %i adds the flat processed bonus to rich terrain",
    (level) => {
      const { s, home } = fixture();
      home.level = home.turnLevel = level;
      terrain(s, "0,0", "golden-fields");
      production(s, 6);
      expect(inventory(s)).toEqual({});
      production(s, 7);
      expect(inventory(s)).toEqual(
        level < 3
          ? { grain: 2 * level }
          : { grain: 2 * level, provisions: level - 2 },
      );
      expect(
        Object.fromEntries(
          Object.entries(s.production[0]).filter(([, n]) => n),
        ),
      ).toEqual(inventory(s));
      expect(income(s).provisions ?? 0).toBeCloseTo(Math.max(0, level - 2) / 6);
    },
  );
  it("adds both processed partners on mixed terrain, plus the existing workshop", () => {
    const { s, home } = fixture();
    terrain(s, "0,0", "steppe-plain");
    home.extensions["0,0"] = 3;
    home.extensionGoods = { "0,0": "hides" };
    production(s, 7);
    expect(inventory(s)).toEqual({ hides: 4, wool: 4, leather: 5, cloth: 2 });
  });
  it("an enemy occupation blocks the town's raw, inherent processed and workshop output", () => {
    const { s, home } = fixture();
    terrain(s, "0,0", "golden-fields");
    home.extensions["0,0"] = 3;
    piece(s, "0,0", 1, "heavy");
    production(s, 7);
    expect(inventory(s)).toEqual({});
  });
  it("a coastal level-4 town gets both Whale products and the workshop remains additive", () => {
    const { s, home } = fixture();
    terrain(s, "0,0", "whale");
    home.extensions["0,0"] = 1;
    production(s, 7);
    expect(inventory(s)).toEqual({ hides: 4, oil: 4, leather: 3, coke: 2 });
  });
  for (const kind of ["merchant", "merchantship"] as const) {
    it.each([1, 2, 3, 4])(
      `${kind} tier %i harvests covered tiles and refines at III/IV despite occupation`,
      (tier) => {
        const { s, home } = fixture();
        home.vertex = s.tiles["-4,0"].vertices[0];
        terrain(s, "0,0", "golden-fields");
        terrain(s, "1,0", "gold");
        terrain(s, "0,1", "water");
        const u = piece(s, kind === "merchant" ? "0,0" : "0,1", 0, kind, tier);
        if (kind === "merchant") u.coverage = ["1,0"];
        piece(s, "1,0", 1, "heavy");
        production(s, 7);
        expect(inventory(s)).toEqual(
          tier < 3
            ? { grain: tier * 2, gold: tier }
            : {
                grain: tier * 2,
                gold: tier,
                provisions: tier - 2,
                goldbars: tier - 2,
              },
        );
        // Storage and outputs also survive a normal save/load, with no migration.
        expect(inventory(deserialize(serialize(s)))).toEqual(inventory(s));
      },
    );
  }
  it("a carried tier-4 merchant produces nothing", () => {
    const { s, home } = fixture();
    home.vertex = s.tiles["-4,0"].vertices[0];
    terrain(s, "0,0", "water");
    terrain(s, "1,0", "gold");
    const carrier = piece(s, "0,0", 0, "convoy", 4);
    const merchant = piece(s, "0,0", 0, "merchant", 4);
    merchant.carrier = carrier.id;
    merchant.coverage = ["1,0"];
    production(s, 7);
    expect(inventory(s)).toEqual({});
  });
});

describe("tiered fishing range", () => {
  function fishing() {
    const f = fixture();
    f.home.vertex = f.s.tiles["-4,0"].vertices[0];
    for (let q = 0; q <= 4; q++)
      terrain(f.s, `${q},0`, q === 2 ? "whale" : q === 3 ? "cod" : "fish");
    return f;
  }
  it.each([1, 2, 3, 4])(
    "tier %i collects the own tile and grounds up to its water range",
    (tier) => {
      const { s } = fishing();
      const u = piece(s, "0,0", 0, "fishing", tier);
      expect(harvestTiles(s, u)).toEqual(
        Array.from({ length: tier + 1 }, (_, q) => `${q},0`),
      );
      production(s, 7);
      const fishBase = [0, 2, 2, 4, 5][tier];
      expect(inventory(s)).toEqual(
        tier === 1
          ? { fish: fishBase * tier }
          : { fish: fishBase * tier, hides: tier, oil: tier },
      );
    },
  );
  it.each(["snow-plain", "ice"] as const)(
    "cannot collect through %s",
    (biome) => {
      const { s } = fishing();
      terrain(s, "1,0", biome);
      const u = piece(s, "0,0", 0, "fishing", 4);
      expect(harvestTiles(s, u)).toEqual(["0,0"]);
    },
  );
  it("counts an actual water detour rather than the straight-line hex distance", () => {
    const { s } = fishing();
    terrain(s, "1,0", "snow-plain");
    terrain(s, "0,1", "water");
    terrain(s, "1,1", "water");
    const u = piece(s, "0,0", 0, "fishing", 2);
    expect(harvestTiles(s, u)).not.toContain("2,0");
    u.tier = 3;
    expect(harvestTiles(s, u)).toContain("2,0");
    expect(harvestTiles(s, u)).not.toContain("3,0");
  });
  it("an enemy fleet blocks its fishing ground, without blocking more distant harvest coverage", () => {
    const { s } = fishing();
    piece(s, "0,0", 0, "fishing", 4);
    piece(s, "2,0", 1, "galley", 1);
    production(s, 7);
    expect(inventory(s)).toEqual({ fish: 20 });
  });
});

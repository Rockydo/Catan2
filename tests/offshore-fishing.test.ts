import { describe, expect, it } from "vitest";
import { fishingFixture, maritimeFixture } from "./maritime-fixture";
import { piece, run } from "./helpers";
import { applyCommand } from "../src/game/engine";
import { shipStats, shipTierAllowed } from "../src/game/content";
import { harvestTiles } from "../src/game/maritime";
import { canSail } from "../src/game/geography";
import { productionSources, productionSignature } from "../src/game/selectors";
import { deserialize, serializePacked } from "../src/game/save";
import { neighbors } from "../src/game/world";

describe("offshore fishing ships", () => {
  it("starts at tier II, respects shipyard tier and survives compact saves", () => {
    let { s, home, water } = fishingFixture();
    const cmd = {
      type: "ship" as const,
      town: home.id,
      tile: water,
      kind: "oceanfishing" as const,
      tier: 1,
    };
    expect(applyCommand(s, cmd).ok).toBe(false);
    home.turnLevel = 1;
    expect(applyCommand(s, { ...cmd, tier: 2 }).ok).toBe(false);
    home.turnLevel = 4;
    s = run(s, { ...cmd, tier: 2 });
    const restored = deserialize(serializePacked(s));
    expect(Object.values(restored.pieces)[0]).toMatchObject({
      kind: "oceanfishing",
      tier: 2,
      naval: true,
    });
    for (const tier of [2, 3, 4]) {
      expect(shipTierAllowed("oceanfishing", tier)).toBe(true);
      expect(shipStats("oceanfishing", tier)).toMatchObject({
        capacity: 0,
        siege: 0,
      });
    }
  });
  it("harvests whales and fish one ring farther, without manufacturing processed goods", () => {
    const { s } = maritimeFixture();
    for (const t of Object.values(s.tiles)) {
      t.resource = "water";
      delete t.fish;
      delete t.whale;
    }
    s.tiles["3,0"].fish = true;
    s.tiles["0,3"].whale = true;
    const u = piece(s, "0,0", 0, "oceanfishing", 2);
    expect(harvestTiles(s, u)).toEqual(expect.arrayContaining(["3,0", "0,3"]));
    expect(harvestTiles(s, { ...u, kind: "fishing" })).not.toContain("3,0");
    const yields = productionSources(s).filter(
      (p) => p.owner === 0 && ["3,0", "0,3"].includes(p.tile),
    );
    expect(
      yields.filter((p) => p.tile === "0,3").map((p) => [p.good, p.amount]),
    ).toEqual(
      expect.arrayContaining([
        ["hides", 2],
        ["oil", 2],
      ]),
    );
    expect(
      yields.some(
        (p) =>
          p.good === "coke" || p.good === "leather" || p.good === "provisions",
      ),
    ).toBe(false);
    const before = productionSignature(s);
    piece(s, "3,0", 1, "galley");
    expect(productionSignature(s)).not.toBe(before);
    expect(
      productionSources(s).filter((p) => p.owner === 0 && p.tile === "3,0"),
    ).toHaveLength(0);
  });
  it("does not cast nets across ice or an impassable shallow channel", () => {
    const { s } = maritimeFixture();
    for (const id of ["0,0", "1,0", "2,0", "3,0"])
      s.tiles[id].resource = "water";
    s.tiles["3,0"].fish = true;
    const u = piece(s, "0,0", 0, "oceanfishing", 2);
    expect(harvestTiles(s, u)).toContain("3,0");
    s.tiles["1,0"].surface = "frozen";
    expect(harvestTiles(s, u)).not.toContain("3,0");
    s.tiles["1,0"].surface = "open";
    s.tiles["1,0"].geography = {
      elevation: 0.1,
      region: "temperate:0,0",
      waterway: "river",
    };
    expect(canSail(s.tiles["1,0"], "oceanfishing", 2, s.tiles)).toBe(false);
    expect(harvestTiles(s, u)).not.toContain("3,0");
    for (const id of neighbors("1,0").slice(1))
      if (s.tiles[id]) s.tiles[id].resource = "water";
    s.tiles[neighbors("1,0")[0]].resource = "grain";
    expect(canSail(s.tiles["1,0"], "oceanfishing", 2, s.tiles)).toBe(true);
  });
});

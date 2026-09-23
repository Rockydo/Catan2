import { describe, expect, it } from "vitest";
import { BIOMES, BIOME_INFO, CLIMATES } from "../src/game/climate-content";
import { tileGood, tileYield } from "../src/game/maritime";
import { RAW, type Hex } from "../src/game/types";

const tile: Hex = {
  id: "0,0",
  q: 0,
  r: 0,
  number: 7,
  resource: "grain",
  vertices: [],
  edges: [],
};

describe("primary terrain products", () => {
  it("matches actual harvest products in every climate, biome and Woods selection", () => {
    for (const climate of [undefined, ...CLIMATES])
      for (const biome of BIOMES)
        for (const owner of [undefined, -1, 0, 1, 9]) {
          const terrain: Hex = {
            ...tile,
            climate,
            biome,
            resource: BIOME_INFO[biome].resource,
            woodsChoices: { 0: "hides", 1: "lumber", [-1]: "hides" },
          };
          expect(tileGood(terrain, owner)).toBe(
            Object.keys(tileYield(terrain, owner))[0],
          );
        }
  });

  it("preserves legacy sea flags, barren terrain and changing Woods choices", () => {
    for (const resource of [
      ...RAW,
      "water",
      "ice",
      "snow",
      "desert",
      "peaks",
    ] as const)
      for (const fish of [undefined, false, true])
        for (const whale of [undefined, false, true]) {
          const terrain = { ...tile, resource, fish, whale };
          expect(tileGood(terrain)).toBe(Object.keys(tileYield(terrain))[0]);
        }
    const woods: Hex = { ...tile, biome: "woods" };
    expect(tileGood(woods, 0)).toBe("lumber");
    woods.woodsChoices = { 0: "hides" };
    expect(tileGood(woods, 0)).toBe("hides");
    woods.woodsChoices[0] = "lumber";
    expect(tileGood(woods, 0)).toBe("lumber");
  });
});

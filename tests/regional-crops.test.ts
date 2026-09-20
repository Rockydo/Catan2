import { describe, expect, it } from "vitest";
import {
  BIOMES,
  CLIMATE_INFO,
  type Climate,
} from "../src/game/climate-content";
import { climateTerrain } from "../src/game/climate";
import { newGame } from "../src/game/engine";
import { production } from "../src/game/economy";
import { assertInvariants, deserialize, serialize } from "../src/game/save";
import { randomAt } from "../src/game/world";
import { maritimeFixture } from "./maritime-fixture";
import type { Game } from "../src/game/types";

function ryeWorld(climate: Climate = "temperate") {
  const s = newGame("retired-rye");
  for (const id of Object.keys(s.climatePlan!)) s.climatePlan![id] = climate;
  for (const tile of Object.values(s.tiles)) {
    Object.assign(tile, { climate, resource: "grain", biome: "rye-fields" });
    delete tile.fish;
    delete tile.whale;
    delete tile.surface;
    delete tile.freezeRoll;
    delete tile.thawGrace;
  }
  return s;
}

function oldSave(s: Game, version = 11) {
  const envelope = JSON.parse(serialize(s));
  envelope.version = version;
  return JSON.stringify(envelope);
}

describe("Turnip fields replace Rye", () => {
  it.each([
    ["temperate", 4, 13, 17],
    ["oceanic", 2, 53, 55],
    ["cold", 3, 47, 50],
    ["alpine", 3, 67, 70],
  ] as const)(
    "keeps the exact %s land-generation interval",
    (climate, weight, start, end) => {
      expect(BIOMES).not.toContain("rye-fields");
      expect(
        CLIMATE_INFO[climate].terrain.find(
          ([biome]) => biome === "turnip-fields",
        )?.[1],
      ).toBe(weight);
      let sampled = 0;
      for (let i = 0; i < 2000; i++) {
        const id = `${i},0`;
        const roll = randomAt("retired-rye", id, "resource") * 100;
        if (
          randomAt("retired-rye", id, "terrain") >=
            CLIMATE_INFO[climate].land ||
          roll < start ||
          roll >= end
        )
          continue;
        expect(climateTerrain("retired-rye", id, climate)).toEqual({
          resource: "grain",
          biome: "turnip-fields",
          climate,
        });
        sampled++;
      }
      expect(sampled).toBeGreaterThan(0);
    },
  );

  it.each(["temperate", "oceanic", "cold", "alpine"] as const)(
    "migrates %s Rye across prior save versions without changing the world",
    (climate) => {
      for (const version of [9, 10, 11]) {
        const original = ryeWorld(climate);
        const expected = structuredClone(original);
        for (const tile of Object.values(expected.tiles))
          tile.biome = "turnip-fields";
        const restored = deserialize(oldSave(original, version));
        expect(restored).toEqual(expected);
        assertInvariants(restored);
        expect(JSON.parse(serialize(restored)).version).toBe(12);
        expect(deserialize(serialize(restored))).toEqual(restored);
      }
    },
  );

  it("runs the Rye replacement alongside the older Rough fields migration", () => {
    const original = ryeWorld("cold");
    Object.assign(original.tiles["0,0"], { biome: "rough-fields" });
    const expected = structuredClone(original);
    for (const tile of Object.values(expected.tiles))
      tile.biome = "turnip-fields";
    expected.tiles["0,0"].biome = "barley-fields";
    expect(deserialize(oldSave(original, 10))).toEqual(expected);
  });

  it("accepts legacy non-climate worlds and rejects malformed or current-version Rye", () => {
    const legacy = ryeWorld();
    legacy.generation = 4;
    delete legacy.climatePlan;
    for (const tile of Object.values(legacy.tiles)) delete tile.climate;
    expect(deserialize(oldSave(legacy)).tiles["0,0"].biome).toBe(
      "turnip-fields",
    );

    const wrongResource = ryeWorld();
    wrongResource.tiles["0,0"].resource = "ore";
    expect(() => deserialize(oldSave(wrongResource))).toThrow(
      "Invalid legacy rye resource.",
    );
    expect(() => deserialize(oldSave(ryeWorld("tropical")))).toThrow(
      "Legacy rye does not belong to its climate.",
    );
    expect(() => deserialize(serialize(ryeWorld()))).toThrow();
  });

  it("pays the early and main harvest only on matching rolls and keeps both dormant seasons empty", () => {
    const { s, home } = maritimeFixture();
    s.calendar = { startRound: 1, startSeason: "spring" };
    home.level = home.turnLevel = 1;
    home.stock = {};
    for (const tile of Object.values(s.tiles))
      Object.assign(tile, { resource: "snow", biome: "snow-plain" });
    Object.assign(s.tiles["0,0"], {
      resource: "grain",
      biome: "turnip-fields",
      climate: "temperate",
    });
    s.round = 1;
    production(s, 7);
    expect(home.stock).toEqual({});
    s.round = 2;
    production(s, 6);
    expect(home.stock).toEqual({});
    production(s, 7);
    expect(home.stock).toEqual({ grain: 2 });
    production(s, 7);
    expect(home.stock).toEqual({ grain: 4 });
    s.round = 3;
    production(s, 6);
    expect(home.stock).toEqual({ grain: 4 });
    production(s, 7);
    expect(home.stock).toEqual({ grain: 10 });
    s.round = 4;
    production(s, 7);
    expect(home.stock).toEqual({ grain: 10 });
  });
});

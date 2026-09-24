import { describe, expect, it } from "vitest";
import {
  BIOMES,
  biomeYield,
  CLIMATE_INFO,
  type Climate,
} from "../src/game/climate-content";
import { climateTerrain } from "../src/game/climate";
import { climateGame as newGame } from "./helpers";
import { seasonalProfile, SEASONS } from "../src/game/seasons";
import { assertInvariants, deserialize, serialize } from "../src/game/save";
import { randomAt } from "../src/game/world";
import type { Game } from "../src/game/types";
import { maritimeFixture } from "./maritime-fixture";
import { piece } from "./helpers";

const replacements = [
  ["cold", "barley-fields", 7, 40, 42, "autumn", 10],
  ["alpine", "barley-fields", 7, 60, 62, "autumn", 10],
  ["oceanic", "barley-fields", 8, 45, 49, "summer", 30],
  ["steppe", "millet-fields", 10, 45, 50, "autumn", 22],
  ["savanna", "millet-fields", 20, 35, 40, "autumn", 20],
] as const;

function oldSave(game: Game, version = 10) {
  const envelope = JSON.parse(serialize(game));
  envelope.version = version;
  return JSON.stringify(envelope);
}

function cropWorld(climate: Climate) {
  const game = newGame("retired-crops");
  game.calendar!.startYear = 1;
  for (const id of Object.keys(game.climatePlan!))
    game.climatePlan![id] = climate;
  for (const tile of Object.values(game.tiles)) {
    tile.climate = climate;
    tile.resource = "grain";
    tile.biome = ["cold", "alpine", "oceanic"].includes(climate)
      ? "barley-fields"
      : "millet-fields";
    delete tile.fish;
    delete tile.whale;
    delete tile.surface;
    delete tile.freezeRoll;
    delete tile.thawGrace;
    delete tile.iceWeather;
  }
  Object.assign(game.tiles["0,0"], { biome: "rough-fields" });
  return game;
}

describe("retired generic crop", () => {
  it.each(replacements)(
    "retains the merged %s cereal weights and regional Grain output",
    (climate, biome, weight, oldStart, oldEnd, harvest, baseline) => {
      expect(BIOMES).not.toContain("rough-fields");
      const terrain = CLIMATE_INFO[climate].terrain;
      expect(terrain.find(([candidate]) => candidate === biome)?.[1]).toBe(
        weight,
      );
      expect(terrain.reduce((sum, [, chance]) => sum + chance, 0)).toBe(100);
      expect(
        terrain.reduce(
          (sum, [candidate, chance]) =>
            sum + chance * (biomeYield(candidate, climate).grain ?? 0),
          0,
        ),
      ).toBe(baseline);

      // Exercise the exact seeded interval formerly occupied by Rough fields.
      // Keeping this interval prevents the removal from rerolling other terrain.
      let replaced = 0;
      for (let i = 0; i < 2000; i++) {
        const id = `${i},0`;
        const roll = randomAt("retired-crops", id, "resource") * 100;
        if (
          randomAt("retired-crops", id, "terrain") >=
            CLIMATE_INFO[climate].land ||
          roll < oldStart ||
          roll >= oldEnd
        )
          continue;
        expect(climateTerrain("retired-crops", id, climate)).toEqual({
          resource: "grain",
          climate,
          biome,
        });
        replaced++;
      }
      expect(replaced).toBeGreaterThan(0);

      const tile = cropWorld(climate).tiles["0,0"];
      tile.biome = biome;
      const profile = seasonalProfile(tile);
      const annual = 4 * biomeYield(biome, climate).grain!;
      expect(profile[harvest]).toEqual({ grain: annual });
      expect(
        SEASONS.reduce((sum, season) => sum + (profile[season].grain ?? 0), 0),
      ).toBe(annual);
    },
  );

  it.each(replacements)(
    "migrates old %s fields to %s and preserves the rest of the saved world",
    (climate, biome) => {
      const original = cropWorld(climate);
      const restored = deserialize(oldSave(original));
      const expected = structuredClone(original);
      expected.tiles["0,0"].biome = biome;
      expect(restored).toEqual(expected);
      assertInvariants(restored);
      expect(JSON.parse(serialize(restored)).version).toBe(14);
      expect(deserialize(serialize(restored))).toEqual(restored);
    },
  );

  it.each([
    ["rough-fields", "millet-fields", 10],
    ["rye-fields", "turnip-fields", 11],
  ] as const)(
    "keeps %s workshops, camps, guild orders, units and stored resources",
    (old, replacement, version) => {
      const { s, home } = maritimeFixture();
      // Keep this fixture outside coalition updates during deserialization.
      s.phase = "setup-town";
      Object.assign(s.tiles["0,0"], { biome: old });
      home.extensions["0,0"] = 2;
      home.extensionGoods = { "0,0": "grain" };
      home.guild = {
        kind: "farmers",
        tier: 2,
        born: 0,
        used: false,
        auto: true,
        order: { tile: "0,0", tier: 2 },
      };
      const edge = s.tiles["0,0"].edges[0];
      s.routes[edge] = {
        id: `r${s.nextId++}`,
        edge,
        owner: home.owner,
        kind: "road",
        born: 0,
        camps: { "0,0": 2 },
      };
      piece(s, "0,0", home.owner);
      s.production[home.owner] = { grain: 4, provisions: 4 };
      const restored = deserialize(oldSave(s, version));
      const expected = structuredClone(s);
      expected.tiles["0,0"].biome = replacement;
      expect(restored).toEqual(expected);
    },
  );

  it.each([undefined, "temperate", "arctic", "mediterranean", "tropical"])(
    "preserves Autumn yields for legacy geography with climate %s",
    (climate) => {
      const original = cropWorld("steppe");
      original.generation = 4;
      delete original.climatePlan;
      for (const tile of Object.values(original.tiles))
        Object.assign(tile, { climate });
      const restored = deserialize(oldSave(original));
      expect(restored.tiles["0,0"].biome).toBe("millet-fields");
      expect(seasonalProfile(restored.tiles["0,0"])).toEqual({
        spring: {},
        summer: {},
        autumn: { grain: 4 },
        winter: {},
      });
    },
  );

  it("does not accept malformed old crops or retired crops in new saves", () => {
    const badResource = cropWorld("cold");
    badResource.tiles["0,0"].resource = "ore";
    expect(() => deserialize(oldSave(badResource))).toThrow(
      "Invalid legacy crop resource.",
    );
    const badClimate = cropWorld("mediterranean");
    expect(() => deserialize(oldSave(badClimate))).toThrow(
      "Legacy crop does not belong to its climate.",
    );
    const missingClimate = cropWorld("steppe");
    delete missingClimate.tiles["0,0"].climate;
    expect(() => deserialize(oldSave(missingClimate))).toThrow(
      "Legacy crop does not belong to its climate.",
    );
    expect(() => deserialize(serialize(cropWorld("cold")))).toThrow();
  });
});

import { describe, expect, it } from "vitest";
import { newGame } from "../src/game/engine";
import { generateHex, neighbors, key } from "../src/game/world";
import {
  nativeWildlifeKind,
  migrationCandidates,
  suitableWildlifeHabitat,
  wildlifeSpawnChance,
  riverLevel,
} from "../src/game/environment";
import { localIceOdds, iceRisk, SEASONS } from "../src/game/seasons";
import { terrainName } from "../src/game/maritime";
import type { Hex } from "../src/game/types";
import { seasonalTerrainPattern, terrainArtFile } from "../src/ui/terrain-art";
import { existsSync } from "node:fs";

function land(id = "0,0"): Hex {
  return {
    ...generateHex("wild-fixture", id),
    resource: "hides",
    biome: "reindeer-range",
    climate: "arctic",
    geography: {
      elevation: 0.6,
      region: "polar",
      coastal: true,
      access: "normal",
      animals: [],
      fauna: {},
    },
  };
}
function water(id = "0,0"): Hex {
  return {
    ...land(id),
    resource: "water",
    biome: undefined,
    climate: "cold",
    surface: "frozen",
    geography: { ...land(id).geography!, waterway: "deep" },
  };
}
describe("cold wildlife and coastal ice", () => {
  it("selects seals, musk ox and reindeer on suitable polar coasts, never seals inland", () => {
    const coastal = new Set<string>(),
      inland = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const t = land();
      coastal.add(nativeWildlifeKind(`species-${i}`, t)!);
      t.geography!.coastal = false;
      inland.add(nativeWildlifeKind(`species-${i}`, t)!);
    }
    expect(coastal).toEqual(new Set(["seal", "musk-ox", "reindeer"]));
    expect(inland).toEqual(new Set(["musk-ox", "reindeer"]));
  });
  it("uses habitat names when the named animal is absent and has integrated art in all seasons", () => {
    for (const [biome, kind, empty] of [
      ["seal-grounds", "seal", "Polar coast"],
      ["musk-ox-range", "musk-ox", "Rocky tundra"],
      ["reindeer-range", "reindeer", "Cold grassland"],
    ] as const) {
      const t = land();
      t.biome = biome;
      expect(terrainName(t)).toBe(empty);
      t.geography!.animals = [kind];
      expect(terrainName(t)).not.toBe(empty);
      for (const season of SEASONS) {
        const pattern = seasonalTerrainPattern(t, season);
        expect(pattern).toMatch(new RegExp(`^wild-${kind}-`));
        expect(existsSync(`public/assets/${terrainArtFile(pattern)}`)).toBe(
          true,
        );
      }
    }
  });
  it("crosses a short frozen strait, ends on land, and cannot cross open sea or travel beyond three hexes", () => {
    const s = newGame("ice-wildlife", undefined, { geography: false });
    s.tiles = {
      "0,0": land("0,0"),
      "1,0": water("1,0"),
      "2,0": water("2,0"),
      "3,0": land("3,0"),
      "4,0": land("4,0"),
    };
    const herd = {
      id: "herd",
      kind: "reindeer" as const,
      tile: "0,0",
      lastRound: 1,
    };
    expect(migrationCandidates(s, herd)).toEqual(["0,0", "3,0"]);
    s.tiles["1,0"].surface = "open";
    expect(migrationCandidates(s, herd)).toEqual(["0,0"]);
    expect(suitableWildlifeHabitat(s.tiles["2,0"], "reindeer")).toBe(false);
  });
  it("increases saltwater wildlife density by one third while leaving freshwater unchanged", () => {
    const t = water();
    expect(wildlifeSpawnChance(t, 3) * 0.75).toBeCloseTo(
      wildlifeSpawnChance(t, 2),
    );
    t.geography!.waterway = "lake";
    expect(wildlifeSpawnChance(t, 3)).toBe(wildlifeSpawnChance(t, 2));
  });
  it("sheltered water freezes more readily; open ocean requires polar climate or severe winter cold", () => {
    const t = water(),
      tiles: Record<string, Hex> = {};
    for (let q = -2; q <= 2; q++)
      for (let r = -2; r <= 2; r++) tiles[key(q, r)] = water(key(q, r));
    expect(localIceOdds({ tiles }, t, "winter", "early")[0]).toBe(0);
    expect(
      localIceOdds({ tiles }, t, "winter", "early", "cold")[0],
    ).toBeGreaterThan(0);
    t.climate = "arctic";
    const open = localIceOdds({ tiles }, t, "winter", "early")[0];
    expect(open).toBeGreaterThan(0);
    tiles[neighbors(t.id)[0]] = land(neighbors(t.id)[0]);
    const coast = localIceOdds({ tiles }, t, "winter", "early")[0];
    for (const id of neighbors(t.id)) tiles[id] = land(id);
    expect(localIceOdds({ tiles }, t, "winter", "early")[0]).toBeGreaterThan(
      coast,
    );
    expect(coast).toBeGreaterThan(open);
    t.climate = "cold";
    t.geography!.waterway = "lake";
    expect(localIceOdds({ tiles: {} }, t, "winter", "early")[0]).toBe(0.6);
  });
  it("forecasts exposure honestly and delays polar snowmelt in cold spells", () => {
    const t = water();
    t.surface = "open";
    t.geography!.weather = "normal";
    expect(
      iceRisk(
        {
          round: 1,
          calendar: {
            startRound: 1,
            startSeason: "winter",
            roundsPerSeason: 2,
            iceModel: 2,
          },
          tiles: { [t.id]: t },
        },
        t,
        2,
      ),
    ).toBe(0);
    const p = land();
    p.geography!.floodplain = true;
    expect(riverLevel(p, "spring", "normal")).toBe(3);
    expect(riverLevel(p, "spring", "cold")).toBe(2);
    p.climate = "glacial";
    expect(riverLevel(p, "spring", "normal")).toBe(1);
    expect(riverLevel(p, "summer", "normal")).toBe(3);
  });
});

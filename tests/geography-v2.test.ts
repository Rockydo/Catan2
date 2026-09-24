import { describe, it, expect } from "vitest";
import {
  generateWorld,
  neighbors,
  portCoast,
  generateHex,
  restoreGoldPorts,
} from "../src/game/world";
import {
  geographicTerrain,
  geographicLandChoices,
  geographyAt,
  seaLevel,
  RIPARIAN_TERRAIN,
  wildHabitat,
} from "../src/game/geography";
import { CLIMATES, BIOME_INFO, type Biome } from "../src/game/climate-content";
import {
  seasonalYield,
  seasonalProfile,
  syncSeasonSurfaces,
  iceRisk,
} from "../src/game/seasons";
import {
  weatherAdjustedYield,
  weatherYieldFactor,
} from "../src/game/weather-yields";
import { newGame } from "../src/game/engine";
import {
  suitableWildlifeHabitat,
  restoreWildlifeHabitats,
  syncEnvironment,
} from "../src/game/environment";
import type { Hex } from "../src/game/types";

function tile(biome: Biome, climate: Hex["climate"] = "temperate"): Hex {
  return {
    ...generateHex("test", "0,0"),
    biome,
    climate,
    resource: BIOME_INFO[biome].resource,
    geography: { elevation: 0.5, region: "test", weather: "normal", fauna: {} },
  };
}
describe("physical world and climate constraints", () => {
  it("offers only cold natural terrain on polar riverbanks", () => {
    for (const climate of ["arctic", "glacial", "tundra"] as const) {
      const seed = "polar",
        h = seaLevel(seed) + 0.04;
      const at = {
        elevation: h,
        water: false,
        downstream: undefined,
        lake: false,
        mouth: false,
      };
      const around = neighbors("0,0").map((id) => ({
        ...at,
        id,
        downstream: "1,0",
      }));
      const pool = geographicLandChoices(
        seed,
        { id: "0,0", climate },
        at,
        around,
      );
      expect(pool.floodplain).toBe(true);
      for (const [b] of pool.choices) {
        expect([
          "alluvial-clay",
          "river-woods",
          "flood-wheat",
          "flood-rice",
          "flood-sorghum",
          "delta-gardens",
          "flood-meadow",
        ]).not.toContain(b);
        expect(BIOME_INFO[b].family).not.toBe("forest");
      }
    }
  });
  it("keeps polar banks valid on expeditions from either geography version", () => {
    let banks = 0;
    for (const version of [1, 2])
      for (let q = -12; q <= 12; q++)
        for (let r = -12; r <= 12; r++) {
          const t = {
            ...generateHex("polar-upgrade", `${q},${r}`),
            climate: "arctic" as const,
          };
          geographicTerrain("polar-upgrade", t, version);
          if (t.geography?.floodplain) {
            banks++;
            expect([
              "alluvial-clay",
              "river-woods",
              "flood-wheat",
              "flood-rice",
              "flood-sorghum",
              "delta-gardens",
              "flood-meadow",
            ]).not.toContain(t.biome);
          }
        }
    expect(banks).toBeGreaterThan(10);
  });
  it("has explicit riparian choices for every climate and no old-world maize or potatoes", () => {
    expect(Object.keys(RIPARIAN_TERRAIN).sort()).toEqual([...CLIMATES].sort());
    for (const climate of CLIMATES)
      if (!["andean", "prairie", "mesoamerican"].includes(climate))
        for (const [b] of RIPARIAN_TERRAIN[climate])
          expect([
            "maize-field",
            "potato-fields",
            "chinampa-gardens",
          ]).not.toContain(b);
  });
  it("never points a river into dry land and never puts trade ports on river banks", () => {
    let rivers = 0,
      ports = 0;
    for (let i = 0; i < 24; i++) {
      const seed = `river-integrity-${i}`,
        w = generateWorld(seed, 300, true);
      for (const t of Object.values(w.tiles))
        if (t.geography?.downstream) {
          rivers++;
          expect(geographyAt(seed, t.geography.downstream).water).toBe(true);
        }
      for (const e of Object.values(w.edges))
        if (e.harbor) {
          ports++;
          expect(portCoast(w, e.tiles)).toBe(true);
        }
    }
    expect(rivers).toBeGreaterThan(50);
    expect(ports).toBeGreaterThan(30);
  });
  it("removes old river trading ports on load cleanup", () => {
    const w = generateWorld("ports", 125, true),
      e = Object.values(w.edges).find((e) => e.tiles.length === 2)!;
    w.tiles[e.tiles[0]] = tile("river");
    w.tiles[e.tiles[0]].geography!.waterway = "river";
    w.tiles[e.tiles[1]] = tile("woods");
    e.harbor = "generic";
    restoreGoldPorts(w);
    expect(e.harbor).toBeUndefined();
  });
  it("disallows migrating wildlife in all cultivated woodland and crops", () => {
    for (const b of [
      "olive-grove",
      "sago-grove",
      "oasis",
      "golden-fields",
      "pasture",
      "flood-rice",
      "cattle-pasture",
    ] as Biome[]) {
      const t = tile(b, "tropical");
      expect(wildHabitat(t)).toBe(false);
      expect(suitableWildlifeHabitat(t, "jungle-game")).toBe(false);
    }
    expect(wildHabitat(tile("jungle", "tropical"))).toBe(true);
    expect(wildHabitat(tile("steppe-plain", "steppe"))).toBe(true);
  });
  it("relocates invalid saved herds without deleting populations", () => {
    const s = newGame("migrate-herd");
    const ids = Object.keys(s.tiles).slice(0, 2);
    s.tiles[ids[0]] = { ...tile("olive-grove"), id: ids[0] };
    s.tiles[ids[1]] = { ...tile("woods"), id: ids[1] };
    s.wildlife = [
      { id: "keep-me", tile: ids[0], kind: "deer", lastRound: s.round },
    ];
    restoreWildlifeHabitats(s);
    expect(s.wildlife).toHaveLength(1);
    expect(s.wildlife[0].id).toBe("keep-me");
    expect(suitableWildlifeHabitat(s.tiles[s.wildlife[0].tile], "deer")).toBe(
      true,
    );
  });
  it("lets fish flee newly formed ice without waiting for a new season", () => {
    const s = newGame("ice-escape");
    s.calendar = {
      startRound: 1,
      startSeason: "winter",
      roundsPerSeason: 2,
      iceModel: 2,
    };
    s.round = 2;
    const origin = Object.keys(s.tiles)[0],
      target = neighbors(origin).find((id) => s.tiles[id])!;
    for (const t of Object.values(s.tiles)) {
      t.resource = "stone";
      t.biome = "stone";
      t.surface = "open";
      t.geography!.newlyRevealed = false;
    }
    for (const id of [origin, target]) {
      s.tiles[id].resource = "water";
      s.tiles[id].biome = "water";
      s.tiles[id].geography!.waterway = "deep";
    }
    s.tiles[origin].surface = "frozen";
    s.tiles[origin].iceWeather = { round: 2, season: "winter", half: "late" };
    s.wildlife = [
      { id: "fish-escape", kind: "fish", tile: origin, lastRound: 1 },
    ];
    s.environmentRound = 1;
    syncEnvironment(s);
    expect(s.wildlife[0].tile).toBe(target);
  });
});
describe("resource-specific regional weather", () => {
  it("distinguishes drought-sensitive rice, wheat and resilient millet", () => {
    const factor = (b: Biome) =>
      weatherYieldFactor(tile(b), "grain", "autumn", "dry");
    expect(factor("rice-field")).toBe(0.5);
    expect(factor("golden-fields")).toBe(0.75);
    expect(factor("millet-fields")).toBe(1);
  });
  it("halves drought losses with irrigation and never creates an off-season harvest", () => {
    const t = tile("golden-fields");
    t.geography!.weather = "dry";
    expect(seasonalYield(t, undefined, "spring").grain ?? 0).toBe(0);
    const base = seasonalProfile(t).summer.grain!;
    expect(seasonalYield(t, undefined, "summer").grain).toBe(
      Math.round(base * 0.75),
    );
    t.geography!.projects = { irrigation: { owner: 0, born: 1 } };
    expect(weatherYieldFactor(t, "grain", "autumn", "dry")).toBe(0.875);
  });
  it("changes salt and logging while leaving mines and wild herds alone", () => {
    const t = tile("forest", "cold");
    t.geography!.weather = "wet";
    t.geography!.fauna = { hides: 3, meat: 2 };
    expect(
      weatherAdjustedYield(
        t,
        { lumber: 4, salt: 4, ore: 3, hides: 3, meat: 2 },
        "summer",
      ),
    ).toEqual({ lumber: 3, salt: 2, ore: 3, hides: 3, meat: 2 });
    t.geography!.weather = "dry";
    expect(weatherAdjustedYield(t, { salt: 2 }, "summer").salt).toBe(3);
  });
  it("does not carry current weather into another season", () => {
    const t = tile("golden-fields");
    t.geography!.weather = "dry";
    t.geography!.weatherSeason = "spring";
    expect(seasonalYield(t, undefined, "summer")).toEqual(
      seasonalProfile(t).summer,
    );
  });
  it("guarantees summer thaw outside permanent glacial ice, including cold spells", () => {
    for (let i = 0; i < 20; i++) {
      const s = newGame(`summer-thaw-${i}`);
      s.calendar = {
        startRound: 1,
        startSeason: "spring",
        roundsPerSeason: 2,
        iceModel: 2,
      };
      s.round = 4;
      const t = Object.values(s.tiles)[0];
      t.resource = "water";
      t.biome = "river";
      t.climate = "cold";
      t.surface = "frozen";
      t.iceWeather = { round: 3, season: "summer", half: "early" };
      t.geography!.weather = "cold";
      expect(iceRisk({ ...s, round: 3 }, t, 4)).toBe(0);
      syncSeasonSurfaces(s);
      expect(t.surface).toBe("open");
    }
  });
});

import { existsSync } from "node:fs";
import { seasonalTerrainPattern, terrainArtFile } from "../src/ui/terrain-art";
import { SEASONS } from "../src/game/seasons";
import { CLIMATE_INFO } from "../src/game/climate-content";
import { WILDLIFE_GOODS } from "../src/game/geography";
import type { WildlifeKind } from "../src/game/geography";
it("has complete occupied and empty paintings for every generated natural habitat and season", () => {
  let occupied = 0;
  for (const climate of CLIMATES) {
    const biomes = new Set(
      [...CLIMATE_INFO[climate].terrain, ...RIPARIAN_TERRAIN[climate]].map(
        ([b]) => b,
      ),
    );
    for (const biome of biomes) {
      const t = tile(biome, climate);
      t.geography!.coastal = true;
      if (!wildHabitat(t)) continue;
      for (const season of SEASONS) {
        t.geography!.animals = [];
        const empty = seasonalTerrainPattern(t, season);
        expect(empty, `${climate}/${biome}/${season}`).toMatch(/^wild-empty-/);
        expect(existsSync(`public/assets/${terrainArtFile(empty)}`)).toBe(true);
        for (const kind of Object.keys(WILDLIFE_GOODS) as WildlifeKind[]) {
          if (!suitableWildlifeHabitat(t, kind)) continue;
          t.geography!.animals = [kind];
          const occupiedArt = seasonalTerrainPattern(t, season);
          expect(occupiedArt, `${climate}/${biome}/${season}/${kind}`).toMatch(
            new RegExp(`^wild-${kind}-`),
          );
          expect(
            existsSync(`public/assets/${terrainArtFile(occupiedArt)}`),
          ).toBe(true);
          occupied++;
        }
      }
    }
  }
  expect(occupied).toBeGreaterThan(200);
});

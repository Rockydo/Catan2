import { describe, expect, it } from "vitest";
import { CLIMATE_INFO, compatibleClimate } from "../src/game/climate-content";
import {
  geographyAt,
  geographicLandChoices,
  seaLevel,
  elevationAt,
  GEOGRAPHY_VERSION,
} from "../src/game/geography";
import { generateHex, neighbors } from "../src/game/world";
import { newGame } from "../src/game/engine";
import { serializePacked, deserialize } from "../src/game/save";
import { seasonalProfile, SEASONS, iceOdds } from "../src/game/seasons";
import {
  weatherChoices,
  waterCalendar,
  passClosed,
} from "../src/game/environment";
import { weatherYieldFactor } from "../src/game/weather-yields";
import type { Hex } from "../src/game/types";

const crop = (
  biome: "barley-fields" | "flood-wheat",
  climate: Hex["climate"],
): Hex => ({
  ...generateHex("dryland", "0,0"),
  biome,
  climate,
  resource: "grain",
  geography: {
    elevation: 0.5,
    region: "dryland",
    access: "normal",
    weather: "normal",
    fauna: {},
    animals: [],
  },
});

describe("hot drylands and longer rivers", () => {
  it("has a balanced dryland draw and symmetric warm transition links", () => {
    const info = CLIMATE_INFO.semiarid;
    expect(info.terrain.reduce((sum, [, n]) => sum + n, 0)).toBe(100);
    for (const next of info.compatible) {
      expect(CLIMATE_INFO[next].compatible).toContain("semiarid");
      expect(compatibleClimate("semiarid", next)).toBe(true);
    }
    expect(compatibleClimate("semiarid", "arctic")).toBe(false);
    for (const season of SEASONS) {
      expect(
        weatherChoices("semiarid", season).reduce((sum, [, n]) => sum + n, 0),
      ).toBeCloseTo(1);
      expect(
        iceOdds(crop("barley-fields", "semiarid"), season, "early")[0],
      ).toBe(0);
    }
    expect(waterCalendar("semiarid")).toEqual([1, 0, 1, 2]);
    const pass = crop("barley-fields", "semiarid");
    pass.geography!.pass = true;
    expect(passClosed(pass, "winter", "wet")).toBe(true);
    expect(passClosed(pass, "summer", "wet")).toBe(false);
  });
  it("gives rainfed barley a modest spring crop and rich arid wheat a larger one, conserving yearly yield", () => {
    const barley = crop("barley-fields", "semiarid");
    expect(
      SEASONS.map((s) => seasonalProfile(barley, 0)[s].grain ?? 0),
    ).toEqual([4, 0, 0, 0]);
    for (const climate of ["desert", "hyperarid", "semiarid"] as const) {
      const wheat = crop("flood-wheat", climate);
      expect(
        SEASONS.map((s) => seasonalProfile(wheat, 0)[s].grain ?? 0),
      ).toEqual([12, 0, 0, 0]);
    }
    expect(weatherYieldFactor(barley, "grain", "spring", "dry")).toBe(0.75);
    expect(weatherYieldFactor(barley, "grain", "spring", "wet")).toBe(1.25);
  });
  it("favors fertile desert riverbanks, never guaranteeing crops or putting them in dry uplands", () => {
    const seed = "nile-banks",
      elevation = seaLevel(seed) + 0.04;
    const at = {
      elevation,
      water: false,
      downstream: undefined,
      lake: false,
      mouth: false,
    };
    const dry = neighbors("0,0").map((id) => ({ ...at, id }));
    const wet = dry.map((t) => ({ ...t, downstream: "1,0" }));
    for (const climate of ["desert", "hyperarid", "semiarid"] as const) {
      const river = geographicLandChoices(
        seed,
        { id: "0,0", climate },
        at,
        wet,
      );
      expect(river.floodplain).toBe(true);
      const sum = river.choices.reduce((s, [, w]) => s + w, 0);
      const crops =
        river.choices
          .filter(([b]) => b === "flood-wheat" || b === "flood-sorghum")
          .reduce((s, [, w]) => s + w, 0) / sum;
      expect(crops).toBeGreaterThan(0.4);
      expect(crops).toBeLessThan(0.8);
      const inland = geographicLandChoices(
        seed,
        { id: "0,0", climate },
        at,
        dry,
      );
      expect(inland.floodplain).toBe(false);
      expect(inland.choices.map(([b]) => b)).not.toContain("flood-wheat");
    }
  });
  it("extends downhill courses while retaining bounded, acyclic, reveal-independent drainage", () => {
    const longest: number[] = [];
    for (const version of [3, GEOGRAPHY_VERSION]) {
      let max = 0;
      for (let i = 0; i < 12; i++) {
        const seed = `dryland-rivers-${i}`;
        for (let q = -10; q <= 10; q++)
          for (let r = -10; r <= 10; r++) {
            let id = `${q},${r}`;
            const seen = new Set<string>();
            for (let steps = 0; steps < 80; steps++) {
              const next = geographyAt(seed, id, version).downstream;
              if (!next) {
                max = Math.max(max, steps);
                break;
              }
              expect(seen.has(id)).toBe(false);
              seen.add(id);
              expect(neighbors(id)).toContain(next);
              expect(elevationAt(seed, next, version)).toBeLessThan(
                elevationAt(seed, id, version),
              );
              expect(geographyAt(seed, next, version).water).toBe(true);
              id = next;
            }
          }
      }
      longest.push(max);
    }
    expect(longest[1]).toBeGreaterThan(longest[0]);
    expect(longest[1]).toBeGreaterThanOrEqual(10);
  });
  it("round-trips both current worlds and older drainage versions without replacing terrain", () => {
    const s = newGame("dryland-save");
    expect(s.geographyVersion).toBe(GEOGRAPHY_VERSION);
    for (const version of [3, GEOGRAPHY_VERSION]) {
      s.geographyVersion = version;
      const loaded = deserialize(serializePacked(s));
      expect(loaded.geographyVersion).toBe(version);
      expect(loaded.tiles).toEqual(s.tiles);
    }
  });
});

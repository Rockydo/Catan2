import {
  serializePacked,
  deserialize,
  assertInvariants,
} from "../src/game/save";
import type { Hex } from "../src/game/types";
import { expect, it } from "vitest";
import { generateHex, neighbors, generateWorld } from "../src/game/world";
import {
  floodsAt,
  environmentRisk,
  waterCalendar,
  restoreFloodplainAccess,
} from "../src/game/environment";
import { BIOME_INFO, type Climate } from "../src/game/climate-content";
import { seasonalProfile, SEASONS } from "../src/game/seasons";
import { newGame } from "../src/game/engine";
import { waterConnections } from "../src/ui/water-connectivity";
const bank = (climate: Climate = "temperate") => ({
  ...generateHex("bank", "0,0"),
  climate,
  biome: "flood-wheat" as const,
  resource: "grain" as const,
  geography: {
    elevation: 0.4,
    region: climate,
    floodplain: true,
    floodThreshold: 4 as 3 | 4,
    animals: [],
    weather: "normal" as const,
  },
});
it("normal high water floods low basins, not higher banks; levees and forecasts agree", () => {
  const t = bank("cold");
  expect(floodsAt(t, "spring", "normal")).toBe(false);
  expect(floodsAt(t, "spring", "wet")).toBe(true);
  t.geography.floodThreshold = 3;
  expect(floodsAt(t, "spring", "normal")).toBe(true);
  expect(environmentRisk(t, "spring")).toBeGreaterThan(0.5);
  (t.geography as any).projects = { levee: { owner: 0, born: 1 } };
  expect(environmentRisk(t, "spring")).toBe(0);
  expect(floodsAt(t, "spring", "wet")).toBe(false);
});
it("separates temperate high water, monsoons, polar melt and rare desert spates", () => {
  expect(waterCalendar("temperate")[0]).toBe(2);
  expect(waterCalendar("monsoon")[1]).toBe(3);
  expect(waterCalendar("glacial")[1]).toBe(3);
  expect(waterCalendar("mediterranean")[3]).toBe(3);
  for (const climate of [
    "temperate",
    "tropical",
    "tropical-maritime",
    "desert",
    "semiarid",
  ] as Climate[]) {
    const t = bank(climate);
    expect(SEASONS.filter((s) => floodsAt(t, s, "normal"))).toHaveLength(0);
    expect(SEASONS.some((s) => floodsAt(t, s, "wet"))).toBe(true);
  }
  expect(environmentRisk(bank("desert"), "spring")).toBeCloseTo(0.1);
});
it("retains useful annual harvests on higher banks across climates", () => {
  for (const climate of [
    "temperate",
    "cold",
    "mediterranean",
    "desert",
    "tropical",
    "monsoon",
    "tropical-maritime",
  ] as Climate[]) {
    const t = bank(climate),
      p = seasonalProfile(t);
    const base = SEASONS.reduce((sum, s) => sum + (p[s].grain ?? 0), 0);
    const expected = SEASONS.reduce(
      (sum, s) => sum + (p[s].grain ?? 0) * (1 - environmentRisk(t, s)),
      0,
    );
    expect(expected, climate).toBeGreaterThanOrEqual(base * 0.65);
  }
});
it("repairs stale flooding on load without changing weather, season or stocks", () => {
  const s = newGame("flood-repair");
  const t = Object.values(s.tiles).find((t) => t.geography?.floodplain)!;
  expect(t).toBeTruthy();
  t.climate = "temperate";
  t.geography!.weather = "normal";
  t.geography!.access = "flooded";
  delete t.geography!.floodThreshold;
  const round = s.round,
    calendar = JSON.stringify(s.calendar),
    stock = JSON.stringify(s.towns);
  restoreFloodplainAccess(s);
  expect(t.geography!.access).toBe("normal");
  expect(t.geography!.weather).toBe("normal");
  expect(s.round).toBe(round);
  expect(JSON.stringify(s.calendar)).toBe(calendar);
  expect(JSON.stringify(s.towns)).toBe(stock);
});
it("continues flooding onto exactly the adjacent unprotected riverbank sectors", () => {
  const river = {
    ...generateHex("river", "0,0"),
    resource: "water" as const,
    biome: "river" as const,
    geography: {
      elevation: 0.3,
      region: "temperate",
      waterway: "river" as const,
    },
  };
  const ids = neighbors(river.id),
    wet = {
      ...bank(),
      id: ids[0],
      geography: { ...bank().geography, access: "flooded" as const },
    },
    dry = { ...bank(), id: ids[1] };
  const map = new Map<string, Hex>([
    [river.id, river],
    [wet.id, wet],
    [dry.id, dry],
  ]);
  expect(waterConnections(river, map, "spring").floodedBanks?.[0]).toBe(
    "crops",
  );
  expect(
    waterConnections(river, map, "spring").floodedBanks?.[1],
  ).toBeUndefined();
  (wet.geography as any).projects = { levee: { owner: 0, born: 1 } };
  expect(waterConnections(river, map, "spring").floodedBanks).toBeUndefined();
});

it("never floods rugged terrain, even with stale old floodplain flags", () => {
  const t = bank("monsoon");
  Object.assign(t, { biome: "stone", resource: "stone" });
  t.geography.floodThreshold = 3;
  expect(floodsAt(t, "summer", "wet")).toBe(false);
  expect(environmentRisk(t, "summer")).toBe(0);
  for (let i = 0; i < 8; i++)
    for (const tile of Object.values(
      generateWorld(`rugged-flood-${i}`, 320, true).tiles,
    ))
      if (BIOME_INFO[tile.biome!].family === "rugged")
        expect(tile.geography?.floodplain).toBe(false);
});

it("keeps paid projects and compact saves valid after retiring rugged floodplains", () => {
  const s = newGame("rugged-project-save");
  const t = Object.values(s.tiles).find(
    (t) => BIOME_INFO[t.biome!].family === "rugged" && !t.geography?.pass,
  )!;
  Object.assign(t.geography!, {
    floodplain: true,
    floodThreshold: 3,
    access: "flooded",
    projects: {
      levee: { owner: 0, born: 1 },
      irrigation: { owner: 0, born: 1 },
    },
  });
  const restored = deserialize(serializePacked(s));
  expect(restored.tiles[t.id].geography?.floodplain).toBe(false);
  expect(restored.tiles[t.id].geography?.access).toBe("normal");
  expect(restored.tiles[t.id].geography?.projects).toEqual(
    t.geography!.projects,
  );
  assertInvariants(restored);
  expect(deserialize(serializePacked(restored))).toEqual(restored);
});

it("keeps cold winter floodplains dry in every weather state while allowing thaw and winter rain elsewhere", () => {
  for (const climate of [
    "steppe",
    "prairie",
    "cold",
    "alpine",
    "andean",
    "arctic",
    "glacial",
    "tundra",
  ] as Climate[]) {
    const t = bank(climate);
    t.geography.floodThreshold = 3;
    for (const weather of ["normal", "wet", "dry", "cold", "mild"] as const)
      expect(floodsAt(t, "winter", weather), `${climate}/${weather}`).toBe(
        false,
      );
    expect(environmentRisk(t, "winter")).toBe(0);
  }
  const t = bank("mediterranean");
  t.geography.floodThreshold = 3;
  expect(floodsAt(t, "winter", "normal")).toBe(true);
  expect(floodsAt(bank("cold"), "spring", "wet")).toBe(true);
});

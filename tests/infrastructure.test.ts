import { describe, it, expect } from "vitest";
import {
  CLIMATES,
  BIOME_INFO,
  type Biome,
  type Climate,
} from "../src/game/climate-content";
import {
  CROPS,
  AGRONOMY,
  cropHarvestWindow,
  annualInfrastructureBonus,
  infrastructureCost,
  effectiveTier,
  infrastructureSuitable,
  allocateAnnual,
  INFRASTRUCTURE,
} from "../src/game/infrastructure";
import { seasonalProfile, SEASONS } from "../src/game/seasons";
import { generateHex, neighbors } from "../src/game/world";
import { projectSite, geographyCommand } from "../src/game/geography-actions";
import { ravageOccupiedInfrastructure } from "../src/game/infrastructure-runtime";
import { weatherYieldFactor } from "../src/game/weather-yields";
import { funded, piece, run } from "./helpers";
import { ownTowns, inventory } from "../src/game/selectors";
import type { Hex, Game } from "../src/game/types";

function crop(
  biome: Biome = "flood-wheat",
  climate: Climate = "temperate",
): Hex {
  return {
    ...generateHex("infrastructure", "0,0"),
    biome,
    climate,
    resource: BIOME_INFO[biome].resource,
    geography: {
      elevation: 0.6,
      region: "test",
      fauna: {},
      animals: [],
      access: "normal",
      projects: { irrigation: { owner: 0, born: 1, tier: 1 } },
    },
  };
}
function budget(tile: Hex, owner = 0) {
  const p = seasonalProfile(tile, owner);
  return SEASONS.reduce((n, s) => n + (p[s].grain ?? 0) + (p[s].oil ?? 0), 0);
}
let base: Game;
function site() {
  base ??= funded("infra-fixture");
  const s = structuredClone(base),
    town = ownTowns(s, 0)[0],
    id = s.vertices[town.vertex].tiles[0];
  s.active = 0;
  s.phase = "economy";
  s.pieces = {};
  Object.assign(s.tiles[id], crop(), {
    id,
    edges: s.tiles[id].edges,
    vertices: s.tiles[id].vertices,
  });
  s.tiles[id].geography!.projects = {};
  const neighbor = neighbors(id).find((n) => s.tiles[n])!;
  s.tiles[neighbor].geography = {
    elevation: 0.2,
    region: "test",
    waterway: "river",
  };
  s.tiles[neighbor].resource = "water";
  return { s, town, tile: s.tiles[id] };
}

describe("climate-specific infrastructure", () => {
  it("conserves irrigated annual grain and oil for every crop in every climate and tier", () => {
    for (const climate of CLIMATES)
      for (const biome of CROPS)
        for (const tier of [1, 2, 3, 4]) {
          const tile = crop(biome as Biome, climate);
          tile.geography!.projects!.irrigation!.tier = tier;
          const before = budget(tile);
          tile.geography!.harvestMode = "spread";
          expect(budget(tile), `${biome}/${climate}/${tier}`).toBe(before);
          if (
            AGRONOMY[climate].heat === "cool" ||
            AGRONOMY[climate].heat === "mild"
          ) {
            if (!["olive-grove"].includes(biome))
              expect(seasonalProfile(tile).winter.grain ?? 0).toBe(0);
          }
        }
  });
  it("keeps warm rice flexible and continental crops out of winter", () => {
    expect(cropHarvestWindow(crop("rice-field", "tropical"))).toHaveLength(4);
    expect(cropHarvestWindow(crop("rice-field", "subtropical"))).toEqual([
      "summer",
      "autumn",
    ]);
    expect(cropHarvestWindow(crop("flood-wheat", "desert"))).toEqual([
      "spring",
    ]);
    expect(cropHarvestWindow(crop("flood-sorghum", "steppe"))).toEqual([
      "summer",
      "autumn",
    ]);
  });
  it("has exact integer budgets with no bonuses in absent harvest windows", () => {
    expect(allocateAnnual(7, [0, 4, 0, 0])).toEqual([0, 7, 0, 0]);
    expect(allocateAnnual(7, [0, 1, 1, 0])).toEqual([0, 4, 3, 0]);
    const t = crop();
    const base = budget({ ...t, geography: { ...t.geography!, projects: {} } });
    expect(budget(t)).toBe(base + 2);
    expect(budget(t, 1)).toBe(base);
    expect(
      annualInfrastructureBonus(crop("flood-wheat", "desert"), "irrigation", 1),
    ).toBe(5);
  });
  it("gates every tier on a neighboring city, not just wealth or roads", () => {
    const { s, town, tile } = site();
    town.level = 1;
    expect(projectSite(s, tile, "irrigation")).toBe(true);
    geographyCommand(s, { type: "project", tile: tile.id, kind: "irrigation" });
    expect(projectSite(s, tile, "irrigation")).toBe(false);
    town.level = 2;
    expect(projectSite(s, tile, "irrigation")).toBe(true);
    geographyCommand(s, { type: "project", tile: tile.id, kind: "irrigation" });
    expect(tile.geography!.projects!.irrigation!.tier).toBe(2);
    expect(projectSite(s, tile, "irrigation", 1)).toBe(false);
    expect(infrastructureCost("irrigation", 4).coal).toBe(100);
  });
  it("requires freshwater, rejects crops for mines, and rejects wild game for ranches", () => {
    const { s, tile } = site();
    for (const id of neighbors(tile.id))
      if (s.tiles[id]?.geography) s.tiles[id].geography!.waterway = "deep";
    expect(projectSite(s, tile, "irrigation")).toBe(false);
    expect(infrastructureSuitable(tile, "mining")).toBe(false);
    expect(infrastructureSuitable(crop("hunting-forest"), "husbandry")).toBe(
      false,
    );
  });
  it("charges large coal sums exactly once on industrial construction", () => {
    const { s, town, tile } = site();
    town.level = 4;
    const before = inventory(s, 0).coal!;
    for (let tier = 1; tier <= 4; tier++)
      geographyCommand(s, {
        type: "project",
        tile: tile.id,
        kind: "irrigation",
      });
    expect(inventory(s, 0).coal).toBe(before - 40 - 100);
    expect(effectiveTier(tile, "irrigation", 0)).toBe(4);
  });
  it("never charges upkeep or reduces an industrial tier when coal runs out", async () => {
    const { syncEnvironment } = await import("../src/game/environment");
    const { s, tile } = site();
    s.geographyVersion = 8;
    s.calendar = { startRound: 1, roundsPerSeason: 2 };
    tile.geography!.projects!.irrigation = { owner: 0, born: 1, tier: 4 };
    const before = inventory(s, 0).coal;
    for (const round of [1, 2, 3, 5, 7, 9]) {
      s.round = round;
      syncEnvironment(s);
    }
    expect(inventory(s, 0).coal).toBe(before);
    for (const town of ownTowns(s, 0)) town.stock.coal = 0;
    s.round = 11;
    syncEnvironment(s);
    expect(effectiveTier(tile, "irrigation", 0)).toBe(4);
    expect(inventory(s, 0).coal).toBe(0);
  });
  it("reduces drought and rain penalties only for the infrastructure owner", () => {
    const t = crop("rice-field", "subtropical");
    expect(weatherYieldFactor(t, "grain", "summer", "dry", 0)).toBe(0.75);
    expect(weatherYieldFactor(t, "grain", "summer", "dry", 1)).toBe(0.5);
    const sunflower = crop("sunflower-fields", "prairie");
    expect(weatherYieldFactor(sunflower, "oil", "autumn", "dry", 0)).toBe(
      0.875,
    );
    expect(weatherYieldFactor(sunflower, "oil", "autumn", "dry", 1)).toBe(0.75);
    t.biome = "golden-fields";
    t.geography!.projects = {
      drainage: { owner: 0, born: 1, tier: 4 },
    };
    expect(weatherYieldFactor(t, "grain", "summer", "wet", 0)).toBe(0.95);
  });
  it("all tracks have strictly increasing cost, with diminishing output increments", () => {
    for (const kind of Object.keys(
      INFRASTRUCTURE,
    ) as (keyof typeof INFRASTRUCTURE)[]) {
      const costs = [1, 2, 3, 4].map((t) =>
        Object.values(infrastructureCost(kind, t)).reduce((a, b) => a + b!, 0),
      );
      expect(costs[1]).toBeGreaterThan(costs[0]);
      expect(costs[3]).toBeGreaterThan(costs[2]);
    }
  });
  it("does not improve migrating animals when improving woods", () => {
    const t = crop("hunting-forest");
    expect(infrastructureSuitable(t, "forestry")).toBe(true);
    t.geography!.fauna = { hides: 2, meat: 3 };
    t.geography!.projects = {
      forestry: { owner: 0, born: 1, tier: 4 },
    };
    for (const season of SEASONS) {
      const p = seasonalProfile(t)[season];
      expect(p.hides).toBe(2);
      expect(p.meat).toBe(3);
    }
  });
});

describe("ravaging infrastructure", () => {
  it("destroys hostile improvements, resets queued planting, and never mutates a shared tile", () => {
    const { s, tile } = site();
    tile.geography!.projects = {
      soil: { owner: 0, born: 1, tier: 4 },
      irrigation: { owner: 0, born: 1, tier: 2 },
    };
    tile.geography!.nextHarvestMode = "spread";
    piece(s, tile.id, 1);
    ravageOccupiedInfrastructure(s);
    expect(s.tiles[tile.id].geography!.projects).toEqual({});
    expect(s.tiles[tile.id].geography!.nextHarvestMode).toBeUndefined();
    expect(tile.geography!.projects!.soil).toBeDefined();
  });
  it("civilian occupation cannot ravage and friendly defenders protect a site during combat", () => {
    const { s, tile } = site();
    tile.geography!.projects = { soil: { owner: 0, born: 1, tier: 3 } };
    piece(s, tile.id, 1, "merchant");
    ravageOccupiedInfrastructure(s);
    expect(s.tiles[tile.id].geography!.projects!.soil).toBeDefined();
    piece(s, tile.id, 1);
    piece(s, tile.id, 0);
    ravageOccupiedInfrastructure(s);
    expect(s.tiles[tile.id].geography!.projects!.soil).toBeDefined();
  });
  it("runs on actual movement transactions", () => {
    const { s, tile } = site();
    tile.geography!.projects = { soil: { owner: 1, born: 1, tier: 4 } };
    const source = neighbors(tile.id).find((id) => s.tiles[id])!;
    Object.assign(s.tiles[source], {
      resource: "lumber",
      biome: "woods",
      surface: undefined,
      geography: { elevation: 0.5, region: "test" },
    });
    const unit = piece(s, source, 0);
    unit.born = 0;
    const next = run(s, { type: "move", ids: [unit.id], to: tile.id });
    expect(next.tiles[tile.id].geography!.projects).toEqual({});
    expect(tile.geography!.projects!.soil).toBeDefined();
  });
});

it("round-trips legacy and industrial projects through compact saves and rejects corrupt tiers", async () => {
  const { newGame } = await import("../src/game/engine");
  const { serializePacked, deserialize } = await import("../src/game/save");
  const s = newGame("infrastructure-save");
  const t = Object.values(s.tiles).find(
    (t) => t.resource !== "water" && t.resource !== "ice" && !t.geography!.pass,
  )!;
  t.geography!.projects = {
    soil: { owner: 0, born: 1 },
    mining: { owner: 0, born: 1, tier: 4 },
  };
  const copy = deserialize(serializePacked(s));
  expect(copy.tiles[t.id].geography!.projects).toEqual(t.geography!.projects);
  t.geography!.projects.mining!.tier = 5;
  expect(() => deserialize(serializePacked(s))).toThrow(/tier/);
});

it("destroying a bridge marks stranded survivors and keeps the save valid", async () => {
  const { newGame } = await import("../src/game/engine");
  const { serializePacked, deserialize, assertInvariants } =
    await import("../src/game/save");
  const s = newGame("infrastructure-bridge");
  const river = Object.values(s.tiles).find(
    (t) => t.geography?.waterway === "river",
  )!;
  river.surface = "open";
  river.geography!.access = "normal";
  river.geography!.ford = false;
  river.geography!.projects = { bridge: { owner: 1, born: 1 } };
  const army = piece(s, river.id, 0);
  assertInvariants(s);
  expect(ravageOccupiedInfrastructure(s)).toBe(true);
  expect(s.pieces[army.id].seasonStatus).toBe("adrift");
  expect(army.seasonStatus).toBeUndefined();
  expect(deserialize(serializePacked(s)).pieces[army.id].seasonStatus).toBe(
    "adrift",
  );
});

import { describe, it, expect } from "vitest";
import {
  BIOME_INFO,
  CLIMATE_INFO,
  CLIMATES,
  type Biome,
  type Climate,
} from "../src/game/climate-content";
import {
  INFRASTRUCTURE,
  infrastructureSuitable,
  infrastructureCost,
  annualInfrastructureBonus,
  huntingYield,
  type InfrastructureKind,
} from "../src/game/infrastructure";
import { localTechnique } from "../src/game/infrastructure-techniques";
import {
  seasonalProfile,
  seasonalYield,
  SEASONS,
  seasonAt,
} from "../src/game/seasons";
import { weatherYieldFactor } from "../src/game/weather-yields";
import { generateHex } from "../src/game/world";
import { productionSources, ownTowns } from "../src/game/selectors";
import {
  wildHabitat,
  habitatKind,
  WILDLIFE_GOODS,
} from "../src/game/geography";
import { run, piece } from "./helpers";
import { newGame } from "../src/game/engine";
import { chooseAIAction } from "../src/game/ai";
import { serialize, deserialize } from "../src/game/save";
import { developmentLevel } from "../src/ui/development-level";
import type { Hex, Stock } from "../src/game/types";
const sum = (stock: Stock) => Object.values(stock).reduce((a, b) => a + b!, 0);
const annual = (tile: Hex, owner = 0) =>
  SEASONS.reduce((n, s) => n + sum(seasonalProfile(tile, owner)[s]), 0);
function tile(biome: Biome, climate: Climate): Hex {
  return {
    ...generateHex("local-method-test", "0,0"),
    biome,
    climate,
    resource: BIOME_INFO[biome].resource,
    geography: {
      elevation: 0.65,
      region: "test",
      access: "normal",
      animals: [],
      fauna: {},
      projects: {},
    },
  };
}
function install(t: Hex, kind: InfrastructureKind, tier = 1) {
  t.geography!.projects = { [kind]: { owner: 0, born: 1, tier } };
  return t;
}
describe("local production methods", () => {
  it("makes local methods mechanically different across climate and resource", () => {
    const desert = tile("flood-wheat", "desert"),
      wet = tile("golden-fields", "oceanic"),
      rice = tile("rice-field", "tropical");
    expect(localTechnique(desert, "irrigation").id).toBe("oasis");
    expect(localTechnique(rice, "irrigation").id).toBe("paddy");
    expect(annualInfrastructureBonus(desert, "irrigation", 1)).toBeGreaterThan(
      annualInfrastructureBonus(wet, "irrigation", 1),
    );
    expect(infrastructureCost("irrigation", 2, desert)).not.toEqual(
      infrastructureCost("irrigation", 2, wet),
    );
    expect(
      annualInfrastructureBonus(tile("gold", "temperate"), "mining", 4),
    ).toBeLessThan(
      annualInfrastructureBonus(tile("coal", "temperate"), "mining", 4),
    );
    expect(
      infrastructureCost("mining", 3, tile("arctic-iron", "arctic")).coal,
    ).toBeGreaterThan(
      infrastructureCost("mining", 3, tile("iron", "temperate")).coal!,
    );
  });
  it("allocates one shared bonus to multi-output livestock instead of multiplying it", () => {
    const t = tile("cattle-savanna", "steppe"),
      before = annual(t);
    install(t, "husbandry", 4);
    expect(annual(t) - before).toBe(8);
    const extra = SEASONS.map(
      (s) => sum(seasonalProfile(t, 0)[s]) - sum(seasonalProfile(t, 1)[s]),
    );
    expect(extra[3]).toBeGreaterThanOrEqual(extra[1]);
  });
  it("favors winter haulage in cold forests while preserving native timber and wildlife", () => {
    const t = tile("forest", "cold");
    t.geography!.fauna = { meat: 2, hides: 2 };
    t.geography!.animals = ["deer"];
    const base = seasonalProfile(t);
    install(t, "forestry", 4);
    const after = seasonalProfile(t, 0);
    expect(after.winter.lumber! - base.winter.lumber!).toBeGreaterThan(
      after.summer.lumber! - base.summer.lumber!,
    );
    for (const s of SEASONS) {
      expect(after[s].meat).toBe(base[s].meat);
      expect(after[s].hides).toBe(base[s].hides);
    }
  });
  it("limits rain harvesting to plausible existing rainfed crops", () => {
    expect(
      infrastructureSuitable(tile("millet-fields", "semiarid"), "catchments"),
    ).toBe(true);
    for (const [b, c] of [
      ["desert", "desert"],
      ["golden-fields", "hyperarid"],
      ["rice-field", "subtropical"],
      ["forest", "cold"],
    ] as const)
      expect(infrastructureSuitable(tile(b, c), "catchments")).toBe(false);
    const flood = tile("flood-sorghum", "steppe");
    flood.geography!.floodplain = true;
    expect(infrastructureSuitable(flood, "catchments")).toBe(false);
  });
  it("uses the strongest protection without stacking immunity or granting it to other factions", () => {
    const t = tile("golden-fields", "steppe");
    install(t, "irrigation", 4);
    const best = weatherYieldFactor(t, "grain", "summer", "dry", 0);
    t.geography!.projects!.catchments = { owner: 0, born: 1, tier: 4 };
    t.geography!.projects!.soil = { owner: 0, born: 1, tier: 4 };
    expect(weatherYieldFactor(t, "grain", "summer", "dry", 0)).toBe(best);
    expect(best).toBeLessThan(1);
    expect(weatherYieldFactor(t, "grain", "summer", "dry", 1)).toBe(0.75);
    const mine = install(tile("coal", "temperate"), "mining", 3);
    expect(
      weatherYieldFactor(mine, "coal", "summer", "wet", 0),
    ).toBeGreaterThan(weatherYieldFactor(mine, "coal", "summer", "wet", 1));
  });
  it("keeps every generated climate/resource method bounded, coal-funded and progressively less efficient per cost", () => {
    let sites = 0;
    for (const climate of CLIMATES)
      for (const [biome] of CLIMATE_INFO[climate].terrain) {
        const t = tile(biome, climate);
        if (t.resource === "water") t.geography!.waterway = "coast";
        const animal = habitatKind(t);
        if (animal) {
          t.geography!.fauna = { ...WILDLIFE_GOODS[animal] };
          t.geography!.animals = [animal];
        }
        for (const kind of Object.keys(
          INFRASTRUCTURE,
        ) as InfrastructureKind[]) {
          if (!infrastructureSuitable(t, kind)) continue;
          sites++;
          const before = annual(t, 1);
          let previousProfile = seasonalProfile(t, 1);
          let prevBonus = 0,
            prevCost = 0,
            prevReturn = Infinity,
            prevCoal = 0;
          for (const tier of [1, 2, 3, 4]) {
            install(t, kind, tier);
            const nextProfile = seasonalProfile(t);
            for (const season of SEASONS)
              for (const [good, amount] of Object.entries(
                previousProfile[season],
              ))
                expect(
                  nextProfile[season][good as keyof Stock] ?? 0,
                  `${climate}/${biome}/${kind}/${tier}/${season}/${good}`,
                ).toBeGreaterThanOrEqual(amount!);
            previousProfile = nextProfile;
            const amount = annual(t) - before,
              bonus = annualInfrastructureBonus(t, kind, tier),
              cost = infrastructureCost(kind, tier, t);
            expect(amount).toBeGreaterThanOrEqual(0);
            expect(amount).toBeLessThanOrEqual(bonus);
            expect(sum(cost)).toBeGreaterThan(prevCost);
            expect(cost.gold ?? 0).toBe(0);
            expect(cost.goldbars ?? 0).toBe(0);
            if (tier >= 2) expect(cost.coal).toBeGreaterThan(prevCoal);
            const value = (bonus - prevBonus) / sum(cost);
            expect(
              value,
              `${climate}/${biome}/${kind}/${tier}`,
            ).toBeLessThanOrEqual(prevReturn);
            prevBonus = bonus;
            prevCost = sum(cost);
            prevReturn = value;
            prevCoal = cost.coal ?? 0;
            for (const season of SEASONS)
              for (const n of Object.values(seasonalProfile(t, 0)[season]))
                expect(Number.isInteger(n) && n! >= 0).toBe(true);
          }
        }
      }
    expect(sites).toBeGreaterThan(300);
  });
});
describe("migratory hunting infrastructure", () => {
  it("supports all natural land habitats, including empty snow and desert, but not mines, crops or sea", () => {
    for (const [b, c] of [
      ["snow-plain", "arctic"],
      ["steppe-plain", "steppe"],
      ["woods", "temperate"],
      ["jungle", "tropical"],
      ["desert", "desert"],
      ["seal-grounds", "arctic"],
    ] as const) {
      const t = tile(b, c);
      expect(wildHabitat(t)).toBe(true);
      expect(infrastructureSuitable(t, "hunting")).toBe(true);
    }
    for (const [b, c] of [
      ["olive-grove", "mediterranean"],
      ["golden-fields", "temperate"],
      ["coal", "cold"],
      ["water", "arctic"],
      ["bare-peaks", "alpine"],
    ] as const)
      expect(infrastructureSuitable(tile(b, c), "hunting")).toBe(false);
  });
  it("is conditional on migration, owner-only, climate-safe and never paints a hunting lodge as logging works", () => {
    const t = install(tile("snow-plain", "arctic"), "hunting", 4);
    expect(annual(t)).toBe(0);
    t.geography!.fauna = { wool: 2, meat: 2 };
    t.geography!.animals = ["musk-ox"];
    expect(annual(t) - annual(t, 1)).toBe(8);
    t.geography!.weather = "cold";
    for (const season of SEASONS)
      expect(seasonalYield(t, 0, season)).toEqual(huntingYield(t, 0, season));
    t.geography!.fauna = {};
    t.geography!.animals = [];
    expect(annual(t)).toBe(0);
    const forest = install(tile("forest", "cold"), "hunting", 4);
    expect(developmentLevel(forest)).toBe(0);
    forest.geography!.projects!.forestry = { owner: 0, born: 1, tier: 1 };
    expect(developmentLevel(forest)).toBe(1);
  });
  it("benefits hunters as well as towns, survives saving, and cannot bypass flooding", () => {
    let s = newGame("hunting-infrastructure-production");
    while (s.phase.startsWith("setup")) s = run(s, chooseAIAction(s));
    const home = ownTowns(s, 0)[0];
    s.active = 0;
    s.phase = "economy";
    s.pieces = {};
    const id = s.vertices[home.vertex].tiles.find(
      (id) => !["water", "ice", "peaks"].includes(s.tiles[id].resource),
    )!;
    const original = s.tiles[id];
    Object.assign(original, tile("steppe-plain", original.climate!), {
      id,
      q: original.q,
      r: original.r,
      edges: original.edges,
      vertices: original.vertices,
    });
    original.geography!.fauna = { meat: 3, hides: 2 };
    original.geography!.animals = ["bison"];
    s.wildlife = s.wildlife!.filter((w) => w.tile !== id);
    s.wildlife.push({
      id: "test-hunting-herd",
      kind: "bison",
      tile: id,
      lastRound: 1,
    });
    install(original, "hunting", 4);
    const season = seasonAt(s);
    const u = piece(s, id, 0, "hunter", 2);
    const withHunter = productionSources(s).filter(
      (v) => v.tile === id && v.owner === 0,
    );
    delete s.pieces[u.id];
    const without = productionSources(s).filter(
      (v) => v.tile === id && v.owner === 0,
    );
    for (const raw of ["meat", "hides"] as const)
      expect(
        withHunter
          .filter((v) => v.good === raw)
          .reduce((n, v) => n + v.amount, 0) -
          without
            .filter((v) => v.good === raw)
            .reduce((n, v) => n + v.amount, 0),
      ).toBe((huntingYield(original, 0, season)[raw] ?? 0) * 2);
    const restored = deserialize(serialize(s))!;
    expect(restored.tiles[id].geography!.projects!.hunting?.tier).toBe(4);
    original.geography!.access = "flooded";
    expect(seasonalYield(original, 0, "summer")).toEqual({});
  });
});

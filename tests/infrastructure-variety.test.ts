import { describe, it, expect } from "vitest";
import {
  BIOMES,
  CLIMATES,
  BIOME_INFO,
  CLIMATE_INFO,
  type Biome,
  type Climate,
} from "../src/game/climate-content";
import {
  RIPARIAN_TERRAIN,
  habitatKind,
  WILDLIFE_GOODS,
} from "../src/game/geography";
import {
  TECHNIQUES,
  localTechnique,
} from "../src/game/infrastructure-techniques";
import {
  SPECIALIZATIONS,
  type SpecializedTechnique,
} from "../src/game/infrastructure-specializations";
import {
  annualInfrastructureBonus,
  infrastructureCost,
  infrastructureSuitable,
  improvedGoods,
  huntingYield,
} from "../src/game/infrastructure";
import { seasonalProfile, seasonalYield, SEASONS } from "../src/game/seasons";
import { generateHex } from "../src/game/world";
import { developmentLevel } from "../src/ui/development-level";
import fr from "../src/i18n/fr.json";
import type { Hex, Stock } from "../src/game/types";
const sum = (s: Stock) => Object.values(s).reduce((a, b) => a + b!, 0);
const annual = (t: Hex, owner = 0) =>
  SEASONS.reduce((n, s) => n + sum(seasonalProfile(t, owner)[s]), 0);
function fixture(biome: Biome, climate: Climate): Hex {
  return {
    ...generateHex("specific-production", "0,0"),
    biome,
    climate,
    resource: BIOME_INFO[biome].resource,
    geography: {
      elevation: 0.45,
      region: "test",
      projects: {},
      fauna: {},
      animals: [],
      access: "normal",
    },
  };
}
function examples(rule: SpecializedTechnique, nativeOnly = true): Hex[] {
  const out: Hex[] = [];
  for (const climate of rule.site.climates ?? CLIMATES) {
    const native = new Set(
      [...CLIMATE_INFO[climate].terrain, ...RIPARIAN_TERRAIN[climate]].map(
        ([b]) => b,
      ),
    );
    if (
      ["tropical", "tropical-maritime", "subtropical", "monsoon"].includes(
        climate,
      )
    )
      native.add("delta-gardens");
    const biomes = rule.site.biomes ?? BIOMES;
    for (const biome of biomes) {
      if (
        nativeOnly &&
        BIOME_INFO[biome].resource !== "water" &&
        !native.has(biome)
      )
        continue;
      // Match generation's coastal landmark assignment: salt in a warm
      // natural harbor is possible; an invented polar salt/spring is not.
      if (
        nativeOnly &&
        rule.site.landmark === "natural-harbor" &&
        ["cold", "arctic", "glacial", "alpine", "tundra"].includes(climate)
      )
        continue;
      if (
        nativeOnly &&
        rule.site.landmark === "thermal-spring" &&
        !["cold", "arctic", "glacial", "alpine", "tundra"].includes(climate)
      )
        continue;
      const t = fixture(biome, climate),
        g = t.geography!;
      Object.assign(g, {
        elevation:
          rule.site.minElevation ?? (rule.kind === "terraces" ? 0.65 : 0.4),
        coastal: rule.site.coastal ?? false,
        delta: rule.site.delta ?? false,
        floodplain: rule.site.floodplain ?? rule.kind === "drainage",
        landmark: rule.site.landmark,
      });
      if (t.resource === "water")
        g.waterway = rule.site.waterways?.[0] ?? "coast";
      if (
        infrastructureSuitable(t, rule.kind) &&
        localTechnique(t, rule.kind).id === rule.method.id
      )
        out.push(t);
    }
  }
  return out;
}
describe("geographically specialized production catalogue", () => {
  it("contains at least three times the original methods, with unique IDs and complete localization", () => {
    const methods = Object.values(TECHNIQUES);
    expect(methods.length).toBeGreaterThanOrEqual(43 * 3);
    expect(new Set(methods.map((m) => m.id)).size).toBe(methods.length);
    for (const m of methods) {
      for (const text of [m.name, m.description, ...m.stages])
        expect(fr, `${m.id}: ${text}`).toHaveProperty(text);
      expect(m.stages).toHaveLength(4);
      for (const n of m.annual)
        expect(Number.isInteger(n) && n >= 0 && n <= 9).toBe(true);
    }
  });
  it("gives every specialization a reachable suitable site, without shadowed dead definitions", () => {
    const missing = SPECIALIZATIONS.filter((r) => !examples(r).length).map(
      (r) => ({
        id: r.method.id,
        legacyReachable: examples(r, false).length > 0,
      }),
    );
    expect(missing).toEqual([]);
  });
  it("preserves costs, ownership, native seasons and diminishing returns across every new method", () => {
    for (const rule of SPECIALIZATIONS) {
      for (const good of Object.keys(rule.method.materials ?? {}))
        expect(
          [1, 2, 3, 4].some(
            (tier) => infrastructureCost(rule.kind, tier)[good as keyof Stock],
          ),
          `${rule.method.id}: material adjustment must affect an actual ingredient ${good}`,
        ).toBe(true);
      const t = examples(rule)[0];
      if (!t) continue;
      const g = t.geography!,
        kind = rule.kind;
      const animal = habitatKind(t);
      if (animal) {
        g.animals = [animal];
        g.fauna = { ...WILDLIFE_GOODS[animal] };
      }
      if (kind === "whaling") {
        g.animals = ["whale"];
        g.fauna = { ...WILDLIFE_GOODS.whale };
      }
      const base = seasonalProfile(t, 0),
        baseline = annual(t);
      let prev = base,
        prevCost = 0,
        prevCoal = 0,
        efficiency = Infinity,
        lastBonus = 0;
      for (const tier of [1, 2, 3, 4]) {
        g.projects = { [kind]: { owner: 0, born: 1, tier } };
        const cost = infrastructureCost(kind, tier, t),
          bonus = annualInfrastructureBonus(t, kind, tier),
          profile = seasonalProfile(t, 0);
        expect(sum(cost), rule.method.id).toBeGreaterThan(prevCost);
        if (tier >= 2) expect(cost.coal).toBeGreaterThan(prevCoal);
        expect(cost.gold ?? 0).toBe(0);
        expect(cost.goldbars ?? 0).toBe(0);
        expect(
          (bonus - lastBonus) / sum(cost),
          rule.method.id,
        ).toBeLessThanOrEqual(efficiency);
        expect(annual(t) - baseline, rule.method.id).toBe(bonus);
        expect(seasonalProfile(t, 1)).toEqual(base);
        for (const season of SEASONS)
          for (const raw of improvedGoods(t, kind)) {
            expect(
              profile[season][raw] ?? 0,
              `${rule.method.id}/${tier}/${season}/${raw}`,
            ).toBeGreaterThanOrEqual(prev[season][raw] ?? 0);
            if (!base[season][raw]) expect(profile[season][raw] ?? 0).toBe(0);
          }
        prev = profile;
        prevCost = sum(cost);
        prevCoal = cost.coal ?? 0;
        efficiency = (bonus - lastBonus) / sum(cost);
        lastBonus = bonus;
      }
      const method = localTechnique(t, kind).id,
        cost = infrastructureCost(kind, 4, t);
      g.weather = "wet";
      g.fauna = {};
      g.animals = [];
      expect(localTechnique(t, kind).id).toBe(method);
      expect(infrastructureCost(kind, 4, t)).toEqual(cost);
    }
  });
  it("keeps whale recovery conditional, owner-only, oil-focused and blocked by frozen access", () => {
    const t = fixture("water", "cold");
    Object.assign(t.geography!, {
      waterway: "coast",
      projects: { whaling: { owner: 0, born: 1, tier: 4 } },
    });
    expect(annual(t)).toBe(0);
    t.geography!.fauna = { ...WILDLIFE_GOODS.whale };
    t.geography!.animals = ["whale"];
    expect(annual(t) - annual(t, 1)).toBe(5);
    const own = seasonalProfile(t, 0),
      other = seasonalProfile(t, 1);
    expect(
      SEASONS.reduce((n, s) => n + (own[s].oil ?? 0) - (other[s].oil ?? 0), 0),
    ).toBeGreaterThan(
      SEASONS.reduce(
        (n, s) => n + (own[s].hides ?? 0) - (other[s].hides ?? 0),
        0,
      ),
    );
    t.geography!.weather = "cold";
    expect(seasonalYield(t, 0, "summer")).toEqual(huntingYield(t, 0, "summer"));
    t.surface = "frozen";
    t.iceWeather = { season: "winter", round: 1, half: "early" };
    expect(seasonalYield(t, 0, "winter")).toEqual({});
    t.geography!.fauna = { fish: 3 };
    t.geography!.animals = ["fish"];
    expect(annual(t)).toBe(annual(t, 1));
    expect(developmentLevel(t)).toBe(0);
  });
  it("improves berries only within their native season, without turning other empty terrain into farms", () => {
    const t = fixture("tundra-heath", "tundra"),
      base = seasonalProfile(t);
    t.geography!.projects = { foraging: { owner: 0, born: 1, tier: 4 } };
    expect(infrastructureSuitable(t, "foraging")).toBe(true);
    expect(annual(t) - annual(t, 1)).toBe(4);
    for (const s of SEASONS)
      if (!base[s].grain) expect(seasonalProfile(t)[s].grain ?? 0).toBe(0);
    expect(
      infrastructureSuitable(fixture("snow-plain", "arctic"), "foraging"),
    ).toBe(false);
    expect(developmentLevel(t)).toBe(0);
  });
});

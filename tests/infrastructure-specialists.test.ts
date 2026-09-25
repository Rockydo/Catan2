import { NICHE_BRANCHES } from "../src/game/infrastructure-niches";
import { weatherYieldFactor } from "../src/game/weather-yields";
import { newGame } from "../src/game/engine";
import { describe, it, expect } from "vitest";
import {
  SPECIALIST_BRANCHES,
  SPECIALIST_PROJECTS,
  specialistId,
  type SpecialistBranch,
} from "../src/game/infrastructure-specialists";
import { ROTATION_BRANCHES } from "../src/game/infrastructure-rotations";
import {
  specialistBranches,
  specialistExtras,
  specialistSuitable,
  specialistTier,
  specialistCost,
  infrastructureCost,
  infrastructureProtection,
  huntingYield,
  rotationPrerequisites,
} from "../src/game/infrastructure";
import {
  seasonalProfile,
  seasonalYield,
  ordinarySeasonalProfile,
  SEASONS,
} from "../src/game/seasons";
import {
  CLIMATES,
  CLIMATE_INFO,
  BIOME_INFO,
  type Biome,
  type Climate,
} from "../src/game/climate-content";
import { RIPARIAN_TERRAIN, type Project } from "../src/game/geography";
import {
  projectSite,
  projectCost,
  geographyCommand,
  candidateProjects,
} from "../src/game/geography-actions";
import { ravageOccupiedInfrastructure } from "../src/game/infrastructure-runtime";
import { generateHex, neighbors } from "../src/game/world";
import { funded, piece } from "./helpers";
import { ownTowns } from "../src/game/selectors";
import { GOODS, type Game, type Hex, type Stock } from "../src/game/types";
import {
  serializePacked,
  deserialize,
  assertInvariants,
} from "../src/game/save";
import { developmentLevel } from "../src/ui/development-level";
import fr from "../src/i18n/fr.json";
const sum = (s: Stock) => Object.values(s).reduce((a, b) => a + b!, 0);
const total = (t: Hex, owner = 0) =>
  SEASONS.reduce((n, s) => n + sum(seasonalProfile(t, owner)[s]), 0);
function tile(
  biome: Biome = "golden-fields",
  climate: Climate = "temperate",
): Hex {
  return {
    ...generateHex("specialists", "0,0"),
    biome,
    climate,
    resource: BIOME_INFO[biome].resource,
    surface: "open",
    geography: {
      region: "test",
      elevation: 0.4,
      access: "normal",
      fauna: {},
      animals: [],
      projects: {},
    },
  };
}
const branch = (id: string) =>
  [...SPECIALIST_BRANCHES, ...ROTATION_BRANCHES].find((b) => b.id === id)!;
function install(t: Hex, b: SpecialistBranch, tier = 1, owner = 0) {
  for (let n = 1; n <= tier; n++)
    (t.geography!.projects ??= {})[specialistId(b, n)] = {
      owner,
      born: 1,
      tier: 1,
    };
}
let fixtures: Hex[];
function habitats() {
  if (fixtures) return fixtures;
  fixtures = [];
  for (const climate of CLIMATES) {
    const biomes = new Set(
      [...CLIMATE_INFO[climate].terrain, ...RIPARIAN_TERRAIN[climate]].map(
        ([b]) => b,
      ),
    );
    for (const b of biomes)
      for (const elevation of [0.4, 0.8])
        for (const floodplain of [false, true]) {
          const t = tile(b, climate);
          Object.assign(t.geography!, {
            elevation,
            coastal: true,
            floodplain,
            fauna: { meat: 2, hides: 1, wool: 1, oil: 1 },
            animals: [],
          });
          fixtures.push(t);
        }
    for (const waterway of [
      "river",
      "lake",
      "coast",
      "shoal",
      "reef",
      "deep",
    ] as const) {
      const t = tile("water", climate);
      Object.assign(t.geography!, {
        waterway,
        coastal: true,
        fauna: { fish: 3, oil: 3, hides: 3 },
      });
      fixtures.push(t);
    }
  }
  return fixtures;
}
function site(b: Biome = "golden-fields", c: Climate = "temperate") {
  const s = funded("specialist-command"),
    town = ownTowns(s, 0)[0],
    id = s.vertices[town.vertex].tiles[0];
  s.active = 0;
  s.phase = "economy";
  s.pieces = {};
  town.level = town.turnLevel = 4;
  for (const good of GOODS) town.stock[good] = 5000;
  const t = s.tiles[id];
  Object.assign(t, tile(b, c), { id, edges: t.edges, vertices: t.vertices });
  const n = neighbors(id).find((n) => s.tiles[n])!;
  s.tiles[n].resource = "water";
  s.tiles[n].geography = {
    region: "test",
    elevation: 0.2,
    waterway: "river",
    fauna: {},
    animals: [],
  };
  return { s, t, town };
}
describe("independent specialist investments", () => {
  it("adds 396 purchases in 99 branches, plus 16 separate rotation choices", () => {
    expect(SPECIALIST_BRANCHES).toHaveLength(99);
    expect(ROTATION_BRANCHES).toHaveLength(16);
    expect(
      Object.values(SPECIALIST_PROJECTS).filter((p) => !p.branch.rotation),
    ).toHaveLength(396);
    expect(
      new Set([...SPECIALIST_BRANCHES, ...ROTATION_BRANCHES].map((b) => b.id))
        .size,
    ).toBe(115);
    for (const p of Object.values(SPECIALIST_PROJECTS)) {
      expect(p.branch.stages).toHaveLength(4);
      expect(p.branch.stagesFr).toHaveLength(4);
      expect(p.name).toBeTruthy();
      expect(p.branch.descriptionFr).toBeTruthy();
    }
  });
  it("makes all 99 branches reachable on native resource habitats, with several simultaneous choices", () => {
    for (const b of SPECIALIST_BRANCHES)
      expect(
        habitats().some((t) => specialistSuitable(t, b)),
        b.id,
      ).toBe(true);
    for (const [b, c] of [
      ["golden-fields", "temperate"],
      ["iron", "temperate"],
      ["stone", "temperate"],
      ["forest", "temperate"],
      ["salt-flats", "mediterranean"],
      ["tundra-heath", "tundra"],
    ] as const)
      expect(
        specialistBranches(tile(b, c)).filter((b) => !b.rotation).length,
        `${b}/${c}`,
      ).toBeGreaterThanOrEqual(2);
  });
  it("charges at least 2.25 times each main material, with coal from II and no precious-metal bills", () => {
    for (const b of SPECIALIST_BRANCHES) {
      const t = habitats().find((t) => specialistSuitable(t, b))!;
      for (let tier = 1; tier <= 4; tier++) {
        const cost = specialistCost(t, specialistId(b, tier)),
          main = infrastructureCost(b.track, tier, t);
        for (const [good, n] of Object.entries(main))
          expect(
            cost[good as keyof Stock],
            `${b.id}/${tier}/${good}`,
          ).toBeGreaterThanOrEqual(Math.ceil(n! * 2.25));
        expect(cost.gold ?? 0).toBe(0);
        expect(cost.goldbars ?? 0).toBe(0);
        if (tier > 1) expect(cost.coal).toBeGreaterThan(0);
      }
    }
  });
  it("adds exactly one shared annual card per yield stage without new products, seasons or compounded gains", () => {
    for (const b of SPECIALIST_BRANCHES.filter((b) => b.effect === "yield")) {
      const t = structuredClone(
        habitats().find((t) => specialistSuitable(t, b))!,
      );
      const native = seasonalProfile(t, 0),
        baseline = total(t);
      let prior = native;
      for (let stage = 1; stage <= 4; stage++) {
        install(t, b, stage);
        const profile = seasonalProfile(t, 0);
        expect(total(t) - baseline, b.id).toBe(stage);
        for (const season of SEASONS)
          for (const [raw, n] of Object.entries(profile[season])) {
            expect(n!, `${b.id}/${season}/${raw}`).toBeGreaterThanOrEqual(
              prior[season][raw as keyof Stock] ?? 0,
            );
            if (n! > (native[season][raw as keyof Stock] ?? 0))
              expect(native[season][raw as keyof Stock]).toBeGreaterThan(0);
          }
        expect(total(t, 1)).toBe(baseline);
        prior = profile;
      }
    }
  });
  it("builds coexisting branches through the real command, preserves main upgrades and gates tier order", () => {
    const { s, t, town } = site("iron");
    t.geography!.projects!.mining = { owner: 0, born: 1, tier: 1 };
    const a = branch("ore-sorting"),
      b = branch("mine-survey");
    const baseline = total(t);
    expect(projectSite(s, t, specialistId(a, 2))).toBe(false);
    town.level = town.turnLevel = 1;
    expect(projectSite(s, t, specialistId(a, 1))).toBe(true);
    geographyCommand(s, {
      type: "project",
      tile: t.id,
      kind: specialistId(a, 1),
    });
    geographyCommand(s, {
      type: "project",
      tile: t.id,
      kind: specialistId(b, 1),
    });
    expect(total(t)).toBe(baseline + 2);
    expect(t.geography!.projects!.mining!.tier).toBe(1);
    expect(projectSite(s, t, specialistId(a, 1))).toBe(false);
    expect(projectSite(s, t, specialistId(a, 2))).toBe(false);
    town.level = town.turnLevel = 2;
    expect(projectSite(s, t, specialistId(a, 2))).toBe(true);
    expect(projectCost(t, specialistId(a, 2))).toEqual(
      specialistCost(t, specialistId(a, 2)),
    );
  });
  it("caps combined resilience and only protects matching goods and owners", () => {
    const t = tile("iron");
    t.geography!.projects!.mining = { owner: 0, born: 1, tier: 4 };
    const before = infrastructureProtection(t, "ore", "wet", 0);
    install(t, branch("mine-runoff"), 4);
    install(t, branch("pit-sediment"), 4);
    const after = infrastructureProtection(t, "ore", "wet", 0);
    expect(after).toBeGreaterThan(before);
    expect(after).toBeLessThanOrEqual(0.9);
    expect(infrastructureProtection(t, "ore", "wet", 1)).toBe(0);
    expect(infrastructureProtection(t, "grain", "wet", 0)).toBe(0);
    expect(infrastructureProtection(t, "ore", "dry", 0)).toBe(0);
  });
  it("does not retain game, change artwork or grant animal products to an empty habitat", () => {
    const t = tile("forest");
    const base = total(t),
      art = developmentLevel(t);
    install(t, branch("game-curing"), 4);
    install(t, branch("wild-hide-frames"), 4);
    expect(total(t)).toBe(base);
    expect(developmentLevel(t)).toBe(art);
    t.geography!.fauna = { meat: 2, hides: 1 };
    const without = structuredClone(t);
    without.geography!.projects = {};
    expect(total(t) - total(without)).toBe(8);
    for (const season of SEASONS) {
      const yield_ = huntingYield(t, 0, season);
      expect(yield_.meat).toBe(seasonalProfile(t, 0)[season].meat);
      expect(yield_.hides).toBe(seasonalProfile(t, 0)[season].hides);
    }
    t.geography!.fauna = {};
    expect(huntingYield(t, 0, "summer")).toEqual({});
    expect(total(t)).toBe(base);
  });
  it("ignores incomplete and mixed-owner upgrade chains", () => {
    const t = tile("iron"),
      b = branch("ore-sorting"),
      before = total(t);
    t.geography!.projects![specialistId(b, 4)] = { owner: 0, born: 1 };
    expect(total(t)).toBe(before);
    install(t, b, 1);
    t.geography!.projects![specialistId(b, 2)] = { owner: 1, born: 1 };
    expect(specialistTier(t, b, 0)).toBe(1);
    expect(total(t) - before).toBe(1);
  });
  it("offers AI only the next matching stage, and removes fully built branches", () => {
    const t = tile("iron"),
      b = branch("ore-sorting");
    let candidates = candidateProjects(t, 0);
    expect(candidates).toContain(specialistId(b, 1));
    expect(candidates).not.toContain(specialistId(b, 2));
    expect(candidates.length).toBeLessThan(40);
    install(t, b, 4);
    candidates = candidateProjects(t, 0);
    expect(
      candidates.some((id) => id.startsWith("specialist-ore-sorting-")),
    ).toBe(false);
  });
  it("ravages optional projects on enemy occupation while preserving the original transaction tile", () => {
    const { s, t } = site("iron");
    install(t, branch("ore-sorting"), 4);
    install(t, branch("mine-runoff"), 4);
    piece(s, t.id, 1);
    ravageOccupiedInfrastructure(s);
    expect(s.tiles[t.id].geography!.projects).toEqual({});
    expect(Object.keys(t.geography!.projects!)).toHaveLength(8);
  });
  it("round-trips new projects through the compact save format", () => {
    const s = newGame("specialist-save"),
      t = Object.values(s.tiles).find((t) => specialistBranches(t).length)!;
    const b = specialistBranches(t).find((b) => !b.rotation)!;
    install(t, b, 4);
    assertInvariants(s);
    const loaded = deserialize(serializePacked(s));
    expect(loaded.tiles[t.id].geography!.projects).toEqual(
      t.geography!.projects,
    );
    expect(total(loaded.tiles[t.id])).toBe(total(t));
  });
});
describe("small secondary-crop rotations", () => {
  it("keeps secondary food smaller than the main cereal harvest, with alternating main-crop soil benefits", () => {
    const t = tile(),
      b = branch("rotation-stubble-turnips"),
      native = seasonalProfile(t, 0);
    for (let tier = 1; tier <= 4; tier++) {
      install(t, b, tier);
      const p = seasonalProfile(t, 0);
      expect(p.autumn.grain).toBe(Math.ceil(tier / 2));
      expect(p.summer.grain).toBe(native.summer.grain! + Math.floor(tier / 2));
      expect(p.winter.grain ?? 0).toBe(0);
      expect(total(t, 1)).toBe(8);
    }
  });
  it("has a viable seasonal window for every authored rotation", () => {
    for (const b of ROTATION_BRANCHES) {
      const r = b.rotation!;
      const t = tile(r.biomes[0] as Biome, r.climates[0]);
      Object.assign(t.geography!, { floodplain: !!r.fertile, elevation: 0.4 });
      if (r.water)
        t.geography!.projects!.irrigation = { owner: 0, born: 1, tier: 1 };
      if (r.drainage)
        t.geography!.projects!.drainage = { owner: 0, born: 1, tier: 1 };
      expect(specialistSuitable(t, b), b.id).toBe(true);
      expect(rotationPrerequisites(t, b, 0), b.id).toBe(true);
      const native = total(t);
      install(t, b, 4);
      expect(total(t) - native, b.id).toBe(4);
    }
  });
  it("requires owned irrigation and drainage on demanding rice rotations", () => {
    const { s, t } = site("rice-field", "tropical"),
      b = branch("rotation-rice-mungbeans");
    expect(projectSite(s, t, specialistId(b, 1))).toBe(false);
    t.geography!.projects!.irrigation = { owner: 0, born: 1, tier: 1 };
    expect(projectSite(s, t, specialistId(b, 1))).toBe(false);
    t.geography!.projects!.drainage = { owner: 0, born: 1, tier: 1 };
    expect(projectSite(s, t, specialistId(b, 1))).toBe(true);
    install(t, b);
    expect(seasonalProfile(t, 0).winter.grain).toBe(1);
    expect(seasonalProfile(t, 1).winter.grain ?? 0).toBe(0);
  });
  it("allows one rotation per field and respects climate, soil and elevation", () => {
    const { s, t } = site("golden-fields", "mediterranean"),
      a = branch("rotation-stubble-turnips"),
      b = branch("rotation-mediterranean-chickpeas");
    t.geography!.projects!.irrigation = { owner: 0, born: 1, tier: 1 };
    expect(projectSite(s, t, specialistId(b, 1))).toBe(true);
    install(t, a);
    expect(projectSite(s, t, specialistId(b, 1))).toBe(false);
    const high = tile("potato-fields", "andean"),
      quinoa = branch("rotation-valley-potato-quinoa");
    expect(specialistSuitable(high, quinoa)).toBe(false);
    high.geography!.floodplain = true;
    expect(specialistSuitable(high, quinoa)).toBe(true);
    high.geography!.elevation = 0.8;
    expect(specialistSuitable(high, quinoa)).toBe(false);
    expect(specialistSuitable(tile("barley-fields", "arctic"), a)).toBe(false);
  });
  it("does not stack a secondary harvest into a full irrigation calendar", () => {
    const t = tile("rice-field", "tropical"),
      b = branch("rotation-rice-mungbeans");
    t.geography!.projects!.irrigation = { owner: 0, born: 1, tier: 1 };
    t.geography!.projects!.drainage = { owner: 0, born: 1, tier: 1 };
    install(t, b, 4);
    expect(seasonalProfile(t, 0).winter.grain).toBe(2);
    t.geography!.harvestMode = "spread";
    expect(seasonalProfile(t, 0)).toEqual(ordinarySeasonalProfile(t, 0));
  });
  it("gives secondary crops their own weather sensitivity and preserves flooding and frozen-access closures", () => {
    const t = tile("olive-grove", "mediterranean"),
      b = branch("rotation-olive-broadbeans");
    install(t, b, 4);
    t.geography!.weather = "cold";
    t.geography!.weatherSeason = "spring";
    expect(seasonalProfile(t, 0).spring.grain).toBe(2);
    expect(seasonalYield(t, 0, "spring").grain).toBeLessThanOrEqual(2);
    t.geography!.access = "flooded";
    expect(seasonalYield(t, 0, "spring")).toEqual({});
    t.geography!.access = "normal";
    t.surface = "frozen";
    t.iceWeather = { season: "spring", half: "early", round: 1 };
    expect(seasonalYield(t, 0, "spring")).toEqual({});
  });
  it("requires actual freshwater for washing works, rather than a nearby sea", () => {
    for (const id of [
      "ore-jigging",
      "coal-washing",
      "gold-riffle-boxes",
      "clay-levigation",
      "wool-washing",
      "sago-washing",
    ]) {
      const b = branch(id),
        sample = habitats().find((t) => specialistSuitable(t, b))!;
      const { s, t } = site(sample.biome!, sample.climate!);
      Object.assign(t.geography!, { elevation: sample.geography!.elevation });
      const project = specialistId(b, 1);
      expect(projectSite(s, t, project, 0), id).toBe(true);
      for (const n of neighbors(t.id)) {
        const g = s.tiles[n]?.geography;
        if (g) {
          g.waterway = "deep";
          g.landmark = undefined;
        }
      }
      expect(projectSite(s, t, project, 0), id).toBe(false);
      const n = neighbors(t.id).find((n) => s.tiles[n])!;
      s.tiles[n].geography!.waterway = "lake";
      expect(projectSite(s, t, project, 0), id).toBe(true);
    }
  });
  it("keeps niche crop, climate, coast, fertility and slope limits independent of weather", () => {
    const olive = tile("olive-grove", "mediterranean");
    expect(specialistSuitable(olive, branch("olive-catching-nets"))).toBe(true);
    expect(
      specialistSuitable(
        tile("sunflower-fields", "prairie"),
        branch("olive-catching-nets"),
      ),
    ).toBe(false);
    const salt = tile("salt-flats", "mediterranean");
    expect(specialistSuitable(salt, branch("coastal-brine-feeders"))).toBe(
      false,
    );
    salt.geography!.coastal = true;
    expect(specialistSuitable(salt, branch("coastal-brine-feeders"))).toBe(
      true,
    );
    salt.climate = "arctic";
    expect(specialistSuitable(salt, branch("coastal-brine-feeders"))).toBe(
      false,
    );
    const garden = tile("chinampa-gardens", "mesoamerican");
    expect(specialistSuitable(garden, branch("chinampa-silt-nurseries"))).toBe(
      false,
    );
    garden.geography!.delta = true;
    expect(specialistSuitable(garden, branch("chinampa-silt-nurseries"))).toBe(
      true,
    );
    const forest = tile("forest", "alpine");
    forest.geography!.elevation = 0.64;
    expect(specialistSuitable(forest, branch("slope-log-chutes"))).toBe(false);
    forest.geography!.elevation = 0.65;
    forest.geography!.weather = "dry";
    expect(specialistSuitable(forest, branch("slope-log-chutes"))).toBe(true);
  });
  it("emphasizes seasonal work without growing the shared budget or rewarding absent wildlife", () => {
    const t = tile("snow-plain", "arctic"),
      b = branch("snow-game-sledges");
    t.geography!.fauna = { meat: 3 };
    install(t, b, 4);
    const native = {
      spring: { meat: 3 },
      summer: { meat: 3 },
      autumn: { meat: 3 },
      winter: { meat: 3 },
    };
    const output = specialistExtras(t, native, 0);
    expect(SEASONS.reduce((n, season) => n + sum(output[season]), 0)).toBe(4);
    expect(output.winter.meat).toBeGreaterThan(output.summer.meat ?? 0);
    expect(
      SEASONS.reduce(
        (n, season) => n + sum(specialistExtras(t, native, 1)[season]),
        0,
      ),
    ).toBe(0);
    t.geography!.fauna = {};
    expect(
      SEASONS.reduce(
        (n, season) => n + sum(specialistExtras(t, native, 0)[season]),
        0,
      ),
    ).toBe(0);
  });
  it("gives every new weather-protection branch an actual weather loss to mitigate", () => {
    for (const b of NICHE_BRANCHES.filter((b) => b.effect !== "yield")) {
      let checked = 0;
      for (const original of habitats().filter((t) =>
        specialistSuitable(t, b),
      )) {
        const t = structuredClone(original),
          weather = b.effect as "dry" | "wet" | "cold";
        for (const raw of b.goods) {
          const profile = ordinarySeasonalProfile(t, 0);
          const season = SEASONS.find((s) => (profile[s][raw] ?? 0) > 0);
          if (!season) continue;
          const before = weatherYieldFactor(t, raw, season, weather, 0);
          expect(before, `${b.id}/${t.biome}/${t.climate}/${raw}`).toBeLessThan(
            1,
          );
          install(t, b, 4);
          expect(
            weatherYieldFactor(t, raw, season, weather, 0),
          ).toBeGreaterThan(before);
          t.geography!.projects = {};
          checked++;
        }
      }
      expect(checked, b.id).toBeGreaterThan(0);
    }
  });
  it("localizes every new project name and description", () => {
    for (const p of Object.values(SPECIALIST_PROJECTS))
      for (const text of [p.name, p.description])
        expect(fr, text).toHaveProperty(text);
  });
});

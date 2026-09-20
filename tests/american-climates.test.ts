import { describe, expect, it } from "vitest";
import {
  AMERICAN_CLIMATES,
  BIOME_INFO,
  CLIMATES,
  CLIMATE_INFO,
  biomeYield,
  climateInitialWeight,
  climateTransitionWeight,
  compatibleClimate,
  type Biome,
  type Climate,
} from "../src/game/climate-content";
import { climateTerrain } from "../src/game/climate";
import { applyCommand, newGame } from "../src/game/engine";
import { chooseAIAction, economyProjects } from "../src/game/ai";
import { campCost, extensionCost, unitCost } from "../src/game/content";
import { inventory, recipePayment } from "../src/game/selectors";
import { run } from "./helpers";
import { expeditionProspects } from "../src/game/ai-exploration";
import { projectedIncome } from "../src/game/ai-seasonal";
import { production } from "../src/game/economy";
import { assertInvariants, deserialize, serialize } from "../src/game/save";
import {
  frozenInSeason,
  seasonalProfile,
  SEASONS,
  syncSeasonSurfaces,
} from "../src/game/seasons";
import { generateHex, randomAt } from "../src/game/world";
import { tileYield } from "../src/game/maritime";
import { maritimeFixture } from "./maritime-fixture";
import type { Game, Raw } from "../src/game/types";

function tile(climate: Climate, biome: Biome) {
  return {
    ...generateHex("american-profile", "0,0"),
    climate,
    biome,
    resource: BIOME_INFO[biome].resource,
  };
}

const expected = {
  andean: {
    land: 0.75,
    terrain: [
      ["potato-fields", 18],
      ["alpaca-pasture", 14],
      ["mountain-quarry", 16],
      ["iron", 10],
      ["gold", 6],
      ["salt-flats", 6],
      ["clay", 5],
      ["river-woods", 5],
      ["bare-peaks", 15],
      ["snow-plain", 5],
    ],
    water: [["fish", 0.12]],
    compatible: ["alpine", "steppe", "desert", "subtropical", "mesoamerican"],
  },
  prairie: {
    land: 0.7,
    terrain: [
      ["steppe-plain", 32],
      ["maize-field", 12],
      ["sunflower-fields", 6],
      ["bison-range", 16],
      ["river-woods", 8],
      ["clay", 8],
      ["stone", 6],
      ["coal", 5],
      ["iron", 4],
      ["gold", 1],
      ["salt-flats", 2],
    ],
    water: [["fish", 0.1]],
    compatible: ["cold", "temperate", "steppe", "desert", "mesoamerican"],
  },
  mesoamerican: {
    land: 0.45,
    terrain: [
      ["maize-field", 18],
      ["chinampa-gardens", 8],
      ["turkey-grounds", 8],
      ["cloud-forest", 16],
      ["tropical-woods", 10],
      ["clay", 12],
      ["volcanic-quarry", 10],
      ["iron", 8],
      ["gold", 4],
      ["salt-flats", 4],
      ["coal", 2],
    ],
    water: [
      ["fish", 0.15],
      ["whale", 0.05],
    ],
    compatible: ["tropical", "subtropical", "savanna", "andean", "prairie"],
  },
} as const;

describe("American climate generation", () => {
  it("adds three normal climates with exact resource shares and reciprocal regional transitions", () => {
    expect(CLIMATES).toHaveLength(17);
    expect(AMERICAN_CLIMATES).toEqual(["andean", "prairie", "mesoamerican"]);
    for (const climate of AMERICAN_CLIMATES) {
      expect(CLIMATE_INFO[climate]).toMatchObject(
        expected[climate as keyof typeof expected],
      );
      expect(
        CLIMATE_INFO[climate].terrain.reduce((n, [, weight]) => n + weight, 0),
      ).toBe(100);
      expect(climateInitialWeight(climate)).toBe(1);
      for (const neighbor of CLIMATE_INFO[climate].compatible) {
        expect(compatibleClimate(climate, neighbor)).toBe(true);
        expect(climateTransitionWeight(neighbor, climate)).toBe(
          AMERICAN_CLIMATES.includes(neighbor) ? 1 : 0.75,
        );
      }
    }
    expect(climateTransitionWeight("andean", "alpine")).toBe(2);
    expect(climateTransitionWeight("prairie", "steppe")).toBe(2);
    expect(climateTransitionWeight("mesoamerican", "subtropical")).toBe(2);
    expect(climateTransitionWeight("andean", "steppe")).toBe(1);
    expect(climateTransitionWeight("andean", "mesoamerican")).toBe(1);
  });

  it("keeps American crops exclusive while retaining the old-world crop shares", () => {
    for (const climate of CLIMATES) {
      const crops = CLIMATE_INFO[climate].terrain.map(([b]) => b);
      expect(crops.includes("potato-fields")).toBe(climate === "andean");
      expect(crops.includes("maize-field")).toBe(
        ["prairie", "mesoamerican"].includes(climate),
      );
      if (!AMERICAN_CLIMATES.includes(climate))
        for (let i = 0; i < 500; i++)
          expect(["potato-fields", "maize-field"]).not.toContain(
            climateTerrain("crop-origin", `${i},0`, climate).biome,
          );
    }
    expect(CLIMATE_INFO.temperate.terrain).toContainEqual(["oat-fields", 4]);
    expect(CLIMATE_INFO.subtropical.terrain).toContainEqual([
      "sorghum-fields",
      5,
    ]);
    expect(CLIMATE_INFO.temperate.terrain).toContainEqual(["turnip-fields", 4]);
  });

  it.each([
    ["andean", "regional-5-1"],
    ["prairie", "regional-5-3"],
    ["mesoamerican", "regional-5-20"],
  ] as const)(
    "completes AI setup and preserves a new %s campaign through save/load",
    (climate, seed) => {
      let s = newGame(seed);
      const start = Object.keys(s.tiles).sort(
        (a, b) =>
          randomAt(seed, a, "climate-start") -
          randomAt(seed, b, "climate-start"),
      )[0];
      expect(s.tiles[start].climate).toBe(climate);
      assertInvariants(s);
      expect(deserialize(serialize(s))).toEqual(s);
      for (let i = 0; i < 20; i++) {
        const result = applyCommand(s, chooseAIAction(s));
        expect(result.ok, result.error).toBe(true);
        s = result.state;
      }
      expect(s.phase).toBe("roll");
      expect(Object.values(s.towns)).toHaveLength(10);
      assertInvariants(s);
      expect(deserialize(serialize(s))).toEqual(s);
      Object.defineProperties(
        s,
        Object.fromEntries(
          ["seed", "rng", "climatePlan"].map((name) => [
            name,
            {
              get() {
                throw Error(`Hidden ${name} access`);
              },
            },
          ]),
        ),
      );
      expect(
        expeditionProspects(s, {}).score(Object.keys(s.vertices)[0]),
      ).toBeGreaterThan(0);
    },
  );
});

describe("American production", () => {
  it.each([
    ["andean", "potato-fields", "grain", [0, 2, 6, 0]],
    ["temperate", "turnip-fields", "grain", [0, 2, 6, 0]],
    ["cold", "turnip-fields", "grain", [0, 1, 3, 0]],
    ["temperate", "oat-fields", "grain", [0, 6, 2, 0]],
    ["subtropical", "sorghum-fields", "grain", [0, 0, 8, 0]],
    ["andean", "alpaca-pasture", "wool", [4, 0, 0, 0]],
    ["andean", "alpaca-pasture", "meat", [1, 0, 2, 1]],
    ["prairie", "sunflower-fields", "oil", [0, 0, 4, 0]],
    ["prairie", "bison-range", "meat", [1, 0, 2, 1]],
    ["prairie", "bison-range", "hides", [1, 0, 2, 1]],
    ["mesoamerican", "maize-field", "grain", [0, 0, 8, 0]],
    ["mesoamerican", "chinampa-gardens", "grain", [4, 4, 4, 0]],
    ["mesoamerican", "turkey-grounds", "meat", [1, 1, 4, 2]],
    ["mesoamerican", "cloud-forest", "lumber", [1, 1, 1, 1]],
    ["mesoamerican", "cloud-forest", "hides", [1, 1, 1, 1]],
    ["mesoamerican", "volcanic-quarry", "stone", [2, 2, 2, 2]],
    ["mesoamerican", "salt-flats", "salt", [1, 0, 1, 2]],
    ["andean", "iron", "ore", [1, 1, 1, 1]],
    ["prairie", "iron", "ore", [1, 2, 1, 0]],
  ] as const)(
    "uses the agreed %s %s %s calendar",
    (climate, biome, raw, profile) => {
      const actual = seasonalProfile(tile(climate, biome));
      expect(SEASONS.map((s) => actual[s][raw] ?? 0)).toEqual(profile);
      expect(profile.reduce<number>((a, b) => a + b, 0)).toBe(
        4 * biomeYield(biome, climate)[raw]!,
      );
    },
  );

  it("conserves every raw resource across all seventeen climate catalogues", () => {
    for (const climate of CLIMATES)
      for (const [biome] of [
        ...CLIMATE_INFO[climate].terrain,
        ...CLIMATE_INFO[climate].water,
      ]) {
        const t = tile(climate, biome),
          profile = seasonalProfile(t);
        for (const [raw, base] of Object.entries(tileYield(t)))
          expect(
            SEASONS.reduce((sum, s) => sum + (profile[s][raw as Raw] ?? 0), 0),
            `${climate}/${biome}/${raw}`,
          ).toBe(4 * base!);
      }
  });

  it("produces and refines land Oil in Autumn and forecasts its next matching-roll opportunity", () => {
    const { s, home } = maritimeFixture();
    for (const t of Object.values(s.tiles))
      Object.assign(t, { resource: "snow", biome: "snow-plain" });
    Object.assign(s.tiles["0,0"], {
      resource: "oil",
      biome: "sunflower-fields",
      climate: "prairie",
    });
    s.calendar = { startRound: 1, startSeason: "spring" };
    s.round = 2;
    s.active = 1;
    s.phase = "economy";
    home.stock = {};
    home.extensions["0,0"] = 2;
    expect(projectedIncome(s, home.owner, 1)).toMatchObject({
      oil: 16 / 6,
      coke: 16 / 6,
    });
    production(s, 7);
    expect(home.stock).toEqual({});
    s.round = 3;
    production(s, 7);
    expect(home.stock).toEqual({ oil: 16, coke: 16 });
    s.phase = "setup-town";
    assertInvariants(s);
    expect(deserialize(serialize(s))).toEqual(s);
  });

  it("uses stable Prairie freeze thresholds and moves frozen fish harvests into Summer", () => {
    for (const [roll, shoulder] of [
      [0.099, true],
      [0.1, false],
      [0.101, false],
    ] as const) {
      const t = { ...tile("prairie", "fish"), freezeRoll: roll };
      expect(frozenInSeason(t, "spring")).toBe(shoulder);
      expect(frozenInSeason(t, "autumn")).toBe(shoulder);
      expect(frozenInSeason(t, "winter")).toBe(true);
      expect(frozenInSeason(t, "summer")).toBe(false);
      const profile = seasonalProfile(t);
      expect(SEASONS.map((s) => profile[s].fish ?? 0)).toEqual(
        shoulder ? [0, 4, 0, 0] : [1, 2, 1, 0],
      );
    }
    const { s } = maritimeFixture();
    s.calendar = { startRound: 1, startSeason: "spring", iceModel: 1 };
    s.round = 1;
    Object.assign(s.tiles["0,0"], {
      resource: "water",
      biome: "fish",
      fish: true,
      climate: "prairie",
    });
    syncSeasonSurfaces(s);
    const roll = s.tiles["0,0"].freezeRoll;
    expect(roll).toBeDefined();
    s.round = 3;
    syncSeasonSurfaces(s);
    expect(s.tiles["0,0"].freezeRoll).toBe(roll);
    for (const season of SEASONS)
      expect(frozenInSeason(tile("andean", "fish"), season)).toBe(false);
  });

  it("builds and upgrades Sunflower camps and workshops offered by the AI", () => {
    const fixture = maritimeFixture();
    let s = fixture.s;
    const homeId = fixture.home.id;
    for (const t of Object.values(s.tiles))
      Object.assign(t, { resource: "snow", biome: "snow-plain" });
    Object.assign(s.tiles["0,0"], {
      resource: "oil",
      biome: "sunflower-fields",
      climate: "prairie",
    });
    s.calendar = { startRound: 1, startSeason: "spring" };
    s.round = 3;
    const edge = s.tiles["0,0"].edges[0];
    s.routes[edge] = {
      id: `r${s.nextId++}`,
      edge,
      owner: 0,
      kind: "road",
      born: 0,
      camps: {},
    };
    for (const tier of [1, 2]) {
      const projects = economyProjects(s);
      expect(
        projects.find(
          (p) => p.action.type === "camp" && p.action.tile === "0,0",
        )?.cost,
      ).toEqual(campCost("oil", tier));
      expect(
        projects.find(
          (p) => p.action.type === "extension" && p.action.tile === "0,0",
        )?.cost,
      ).toEqual(extensionCost("oil", tier));
      s = run(s, { type: "camp", edge, tile: "0,0" });
      s = run(s, { type: "extension", town: homeId, tile: "0,0" });
    }
    expect(s.routes[edge].camps["0,0"]).toBe(2);
    expect(s.towns[homeId].extensionGoods?.["0,0"]).toBe("oil");
    s.towns[homeId].stock = {};
    production(s, 7);
    expect(s.towns[homeId].stock).toEqual({ oil: 24, coke: 16 });
    const artillery = unitCost("artillery", 4);
    Object.assign(s.towns[homeId].stock, { ...artillery, coke: 16 });
    s = run(s, {
      type: "recruit",
      town: homeId,
      kind: "artillery",
      tier: 4,
      tile: "0,0",
    });
    expect(
      Object.values(s.pieces).some(
        (p) => p.kind === "artillery" && p.tier === 4,
      ),
    ).toBe(true);
    expect(s.towns[homeId].stock.coke).toBe(16 - artillery.coke!);
    s.phase = "setup-town";
    assertInvariants(s);
    expect(deserialize(serialize(s))).toEqual(s);
  });

  it("uses harvested Sunflower Oil for Coal costs without treating it as food", () => {
    const { s, home } = maritimeFixture();
    home.stock = { oil: 2 };
    expect(recipePayment(s, { coal: 2 })).toEqual({ coal: 0, oil: 2 });
    expect(recipePayment(s, { grain: 1 })).toEqual({ grain: 1 });
    // A Coal workshop consumes the same substitute through the real build path.
    Object.assign(s.tiles["0,0"], {
      resource: "oil",
      biome: "sunflower-fields",
      climate: "prairie",
    });
    home.stock = { ...extensionCost("oil", 1) };
    const coal = home.stock.coal ?? 0;
    expect(coal).toBeGreaterThan(0);
    delete home.stock.coal;
    home.stock.oil = coal;
    const after = run(s, { type: "extension", town: home.id, tile: "0,0" });
    expect(Object.values(inventory(after)).every((n) => !n)).toBe(true);
  });
});

function priorSave(s: Game, version = 11) {
  const data = JSON.parse(serialize(s));
  data.version = version;
  return JSON.stringify(data);
}
describe("American crop migration", () => {
  it.each([
    ["potato-fields", "temperate", "turnip-fields"],
    ["potato-fields", "cold", "turnip-fields"],
    ["potato-fields", undefined, "turnip-fields"],
    ["maize-field", "temperate", "oat-fields"],
    ["maize-field", "oceanic", "oat-fields"],
    ["maize-field", "cold", "oat-fields"],
    ["maize-field", "alpine", "oat-fields"],
    ["maize-field", undefined, "oat-fields"],
    ["maize-field", "subtropical", "sorghum-fields"],
    ["maize-field", "tropical", "sorghum-fields"],
    ["maize-field", "prairie", "maize-field"],
    ["maize-field", "mesoamerican", "maize-field"],
    ["potato-fields", "andean", "potato-fields"],
  ] as const)(
    "migrates %s in %s to %s without changing saved data",
    (biome, climate, replacement) => {
      const { s, home } = maritimeFixture();
      s.phase = "setup-town";
      for (const t of Object.values(s.tiles)) {
        if (climate === undefined) delete t.climate;
        else t.climate = climate;
      }
      Object.assign(s.tiles["0,0"], { biome, climate });
      home.extensions["0,0"] = 2;
      home.extensionGoods = { "0,0": "grain" };
      const expected = structuredClone(s);
      expected.tiles["0,0"].biome = replacement;
      // JSON does not retain explicit undefined climate fields.
      if (climate === undefined) delete expected.tiles["0,0"].climate;
      for (const version of [11, 12]) {
        const migrated = deserialize(priorSave(s, version));
        expect(migrated).toEqual(expected);
        expect(deserialize(serialize(migrated))).toEqual(migrated);
      }
    },
  );
});

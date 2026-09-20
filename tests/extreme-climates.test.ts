import { describe, expect, it } from "vitest";
import {
  BIOME_INFO,
  CLIMATES,
  CLIMATE_INFO,
  EXTREME_CLIMATES,
  biomeYield,
  climateInitialWeight,
  climateTransitionWeight,
  compatibleClimate,
  type Biome,
  type Climate,
} from "../src/game/climate-content";
import { chooseInitialClimate } from "../src/game/climate";
import { applyCommand, newGame } from "../src/game/engine";
import { chooseAIAction } from "../src/game/ai";
import { expeditionProspects } from "../src/game/ai-exploration";
import {
  seasonalDestinationSafe,
  seasonalEvacuation,
} from "../src/game/ai-seasonal";
import {
  SEASONS,
  frozenInSeason,
  seasonalProfile,
  seasonWeather,
  syncSeasonSurfaces,
} from "../src/game/seasons";
import { assertInvariants, deserialize, serialize } from "../src/game/save";
import {
  addHexes,
  canOccupy,
  expeditionFootprint,
  generateHex,
  neighbors,
  randomAt,
  solidAtVertex,
  unknownAtVertex,
} from "../src/game/world";
import { income, moveTargets } from "../src/game/selectors";
import { production } from "../src/game/economy";
import { tileYield } from "../src/game/maritime";
import type { Raw } from "../src/game/types";
import { maritimeFixture } from "./maritime-fixture";
import { piece } from "./helpers";

function tile(climate: Climate, biome: Biome) {
  return {
    ...generateHex("extreme-profile", "0,0"),
    climate,
    biome,
    resource: BIOME_INFO[biome].resource,
    fish: biome === "fish" || biome === "cod",
    whale: biome === "whale",
  };
}

function glacialFixture(round = 1) {
  const f = maritimeFixture();
  f.s.calendar = { startRound: 1, startSeason: "spring", iceModel: 1 };
  f.s.round = round;
  for (const hex of Object.values(f.s.tiles))
    Object.assign(hex, {
      climate: "glacial",
      biome: "snow-plain",
      resource: "snow",
    });
  Object.assign(f.s.tiles["0,0"], { biome: "ice", resource: "ice" });
  Object.assign(f.s.tiles["1,0"], { biome: "water", resource: "water" });
  syncSeasonSurfaces(f.s);
  return f;
}

describe("extreme climate generation", () => {
  it("makes extreme starting climates rarer without excluding them", () => {
    const counts: Partial<Record<Climate, number>> = {};
    // Relative weights 1 and .35 become 20 and 7 evenly spaced samples.
    for (let i = 0; i < 241; i++) {
      const climate = chooseInitialClimate((i + 0.5) / 241);
      counts[climate] = (counts[climate] ?? 0) + 1;
    }
    for (const climate of CLIMATES) {
      const extreme = EXTREME_CLIMATES.includes(climate);
      expect(climateInitialWeight(climate)).toBe(extreme ? 0.35 : 1);
      expect(counts[climate]).toBe(extreme ? 7 : 20);
    }
  });

  it.each([
    ["glacial", { arctic: 2, alpine: 1 }],
    ["hyperarid", { desert: 2 }],
    ["monsoon", { tropical: 2, subtropical: 1, savanna: 1 }],
  ] as const)(
    "uses explicit reciprocal transitions for %s",
    (climate, exits) => {
      expect(climateTransitionWeight(climate, climate)).toBe(1);
      expect(
        Object.fromEntries(
          CLIMATE_INFO[climate].compatible.map((to) => [
            to,
            climateTransitionWeight(climate, to),
          ]),
        ),
      ).toEqual(exits);
      for (const from of CLIMATE_INFO[climate].compatible) {
        expect(compatibleClimate(from, climate)).toBe(true);
        expect(climateTransitionWeight(from, climate)).toBe(0.5);
      }
    },
  );

  it("retains distinct terrain constraints instead of adding climate hazards", () => {
    expect(CLIMATE_INFO.glacial.land).toBe(0.45);
    expect(CLIMATE_INFO.hyperarid.land).toBe(0.9);
    expect(CLIMATE_INFO.monsoon.land).toBe(0.3);
    for (const climate of EXTREME_CLIMATES) {
      const info = CLIMATE_INFO[climate];
      expect(info.terrain.reduce((sum, [, weight]) => sum + weight, 0)).toBe(
        100,
      );
      expect(info.terrain.some(([biome]) => biome === "bare-peaks")).toBe(true);
    }
    for (const [biome] of CLIMATE_INFO.glacial.terrain) {
      expect(BIOME_INFO[biome].yield.grain).toBeUndefined();
      expect(BIOME_INFO[biome].yield.lumber).toBeUndefined();
    }
    expect(
      CLIMATE_INFO.hyperarid.terrain.find(([biome]) => biome === "oasis")?.[1],
    ).toBe(3);
    expect(CLIMATE_INFO.glacial.water).toEqual([
      ["ice", 0.55],
      ["fish", 0.1],
      ["cod", 0.15],
      ["whale", 0.12],
    ]);
  });

  it.each([
    ["extreme-start-0", 5, "hyperarid"],
    ["extreme-start-14", 5, "glacial"],
    ["extreme-start-29", 5, "monsoon"],
    ["extreme-grand-3", 10, "hyperarid"],
    ["extreme-grand-4", 10, "monsoon"],
    ["extreme-grand-151", 10, "glacial"],
  ] as const)(
    "completes ordinary AI setup for %s with %i factions",
    (seed, size, climate) => {
      let s = newGame(
        seed,
        Array.from({ length: size }, (_, i) => ({
          name: `Faction ${i}`,
          control: "standard" as const,
        })),
      );
      expect(Object.keys(s.tiles)).toHaveLength(size * 25);
      const seedTile = Object.keys(s.tiles).sort(
        (a, b) =>
          randomAt(seed, a, "climate-start") -
          randomAt(seed, b, "climate-start"),
      )[0];
      expect(s.tiles[seedTile].climate).toBe(climate);
      expect(s.tiles[seedTile].climate).toBe(
        chooseInitialClimate(randomAt(seed, seedTile, "climate-initial")),
      );
      assertInvariants(s);
      expect(deserialize(serialize(s))).toEqual(s);
      for (let i = 0; i < size * 4; i++) {
        const result = applyCommand(s, chooseAIAction(s));
        expect(result.ok, result.error).toBe(true);
        s = result.state;
      }
      expect(s.phase).toBe("roll");
      expect(Object.values(s.towns)).toHaveLength(size * 2);
      for (const player of s.players) {
        const towns = Object.values(s.towns).filter(
          (town) => town.owner === player.id,
        );
        expect(Object.values(towns[0].stock)).toHaveLength(0);
        expect(
          Object.values(towns[1].stock).reduce(
            (sum, amount) => sum + amount!,
            0,
          ),
        ).toBeGreaterThan(0);
      }
      assertInvariants(s);
    },
  );

  it.each(EXTREME_CLIMATES)(
    "values visible %s frontiers without reading hidden state",
    (climate) => {
      const s = newGame("extreme-prospects");
      for (const hex of Object.values(s.tiles)) hex.climate = climate;
      Object.defineProperties(
        s,
        Object.fromEntries(
          ["seed", "rng", "climatePlan"].map((name) => [
            name,
            {
              get() {
                throw new Error(`Hidden ${name} access`);
              },
            },
          ]),
        ),
      );
      const prospects = expeditionProspects(s, {});
      const score = prospects.score(Object.keys(s.vertices)[0]);
      expect(Number.isFinite(score)).toBe(true);
      expect(score).toBeGreaterThan(0);
    },
  );

  it("preserves revealed terrain and climate reservations through further exploration", () => {
    let s = newGame("extreme-start-14");
    for (let turn = 0; turn < 3; turn++) {
      const original = structuredClone(s.tiles);
      const reserved = { ...s.climatePlan };
      const vertex = Object.keys(s.vertices).find(
        (id) => unknownAtVertex(s, id).length,
      )!;
      addHexes(s, s.seed, expeditionFootprint(s, vertex, 3, turn));
      syncSeasonSurfaces(s);
      for (const [id, hex] of Object.entries(original))
        expect(s.tiles[id]).toEqual(hex);
      for (const [id, climate] of Object.entries(reserved))
        expect(s.climatePlan![id]).toBe(climate);
      for (const hex of Object.values(s.tiles))
        for (const id of neighbors(hex.id))
          if (s.tiles[id])
            expect(compatibleClimate(hex.climate!, s.tiles[id].climate!)).toBe(
              true,
            );
      s = deserialize(serialize(s));
    }
  });
});

describe("extreme climate production", () => {
  it.each([
    ["tropical", "rice-field", 3, [4, 4, 4, 0]],
    ["subtropical", "rice-field", 2, [0, 4, 4, 0]],
    ["monsoon", "rice-field", 1, [0, 0, 4, 0]],
    ["oceanic", "barley-fields", 2, [0, 8, 0, 0]],
    ["cold", "barley-fields", 1, [0, 0, 4, 0]],
    ["temperate", "rye-fields", 2, [0, 8, 0, 0]],
    ["oceanic", "rye-fields", 2, [0, 8, 0, 0]],
    ["alpine", "rye-fields", 1, [0, 4, 0, 0]],
    ["temperate", "chernozem-wheat", 3, [0, 12, 0, 0]],
    ["steppe", "chernozem-wheat", 3, [0, 12, 0, 0]],
  ] as const)(
    "gives %s %s its local fertility and harvest calendar",
    (climate, biome, base, harvests) => {
      const hex = tile(climate, biome);
      expect(biomeYield(biome, climate)).toEqual({ grain: base });
      expect(tileYield(hex)).toEqual({ grain: base });
      expect(
        SEASONS.map((season) => seasonalProfile(hex)[season].grain ?? 0),
      ).toEqual(harvests);
    },
  );

  it.each([
    ["oceanic", "barley-fields", 2],
    ["temperate", "rye-fields", 2],
    ["monsoon", "rice-field", 3],
    ["steppe", "chernozem-wheat", 2],
  ] as const)(
    "uses %s %s fertility in annual income and city/workshop production",
    (climate, biome, round) => {
      const { s, home } = maritimeFixture();
      s.calendar = { startRound: 1, startSeason: "spring" };
      s.round = round;
      for (const hex of Object.values(s.tiles))
        Object.assign(hex, { biome: "snow-plain", resource: "snow" });
      const crop = s.tiles["0,0"];
      Object.assign(crop, { climate, biome, resource: "grain" });
      home.stock = {};
      home.extensions[crop.id] = 2;
      const base = biomeYield(biome, climate).grain!;
      expect(income(s, home.owner).grain).toBeCloseTo((4 * base) / 6);
      production(s, 7);
      expect(home.stock).toEqual({ grain: 16 * base, provisions: 16 * base });
    },
  );

  it.each(EXTREME_CLIMATES)(
    "conserves every resource's annual baseline in %s",
    (climate) => {
      for (const [biome] of [
        ...CLIMATE_INFO[climate].terrain,
        ...CLIMATE_INFO[climate].water,
      ]) {
        const hex = tile(climate, biome);
        const profile = seasonalProfile(hex);
        for (const [good, baseline] of Object.entries(tileYield(hex)))
          expect(
            SEASONS.reduce(
              (sum, season) => sum + (profile[season][good as Raw] ?? 0),
              0,
            ),
          ).toBe(4 * baseline!);
      }
    },
  );

  it.each([
    "arctic-iron",
    "arctic-stone",
    "arctic-gold",
    "fish",
    "cod",
    "whale",
  ] as const)(
    "limits glacial %s production to the short Summer opening",
    (biome) => {
      const hex = tile("glacial", biome);
      const profile = seasonalProfile(hex);
      expect(profile.spring).toEqual({});
      expect(profile.autumn).toEqual({});
      expect(profile.winter).toEqual({});
      expect(profile.summer).toEqual(
        Object.fromEntries(
          Object.entries(tileYield(hex)).map(([good, count]) => [
            good,
            count! * 4,
          ]),
        ),
      );
    },
  );

  it("keeps glacial seals productive and land snow-covered in every season", () => {
    const hex = tile("glacial", "seal-grounds");
    for (const season of SEASONS) {
      expect(seasonalProfile(hex)[season]).toEqual({ hides: 1, oil: 1 });
      expect(seasonWeather(hex, season)).toBe("Permanent snow");
    }
  });

  it("uses Desert calendars in Hyperarid and distinct wet-season production in Monsoon", () => {
    for (const [biome] of CLIMATE_INFO.hyperarid.terrain)
      expect(seasonalProfile(tile("hyperarid", biome))).toEqual(
        seasonalProfile(tile("desert", biome)),
      );
    expect(
      SEASONS.map(
        (season) =>
          seasonalProfile(tile("monsoon", "alluvial-clay"))[season].brick,
      ),
    ).toEqual([2, 1, 2, 3]);
    for (const biome of [
      "jungle",
      "tropical-woods",
      "river-woods",
      "fish",
      "stone",
    ] as const) {
      const hex = tile("monsoon", biome);
      for (const season of SEASONS)
        expect(seasonalProfile(hex)[season]).toEqual(tileYield(hex));
    }
    const rice = seasonalProfile(tile("monsoon", "rice-field"));
    expect(SEASONS.filter((season) => rice[season].grain)).toEqual(["autumn"]);
  });
});

describe("glacial permanent ice", () => {
  it("distinguishes permanent ice, ordinary summer water, and Arctic seasonal ice", () => {
    const permanent = tile("glacial", "ice");
    const ordinary = tile("glacial", "water");
    expect(SEASONS.map((season) => frozenInSeason(permanent, season))).toEqual([
      true,
      true,
      true,
      true,
    ]);
    expect(SEASONS.map((season) => frozenInSeason(ordinary, season))).toEqual([
      true,
      false,
      true,
      true,
    ]);
    expect(frozenInSeason(tile("arctic", "ice"), "summer")).toBe(false);
    for (const climate of ["monsoon", "hyperarid"] as const)
      for (const season of SEASONS)
        expect(frozenInSeason(tile(climate, "water"), season)).toBe(false);
  });

  it("keeps permanent ice walkable and unbuildable while ordinary glacial seas thaw", () => {
    const { s } = glacialFixture();
    const troop = piece(s, "0,0");
    const ship = piece(s, "1,0", 0, "galley");
    syncSeasonSurfaces(s);
    expect(ship.seasonStatus).toBe("icebound");
    expect(moveTargets(s, [troop.id])["1,0"]).toBeDefined();
    s.round = 2;
    syncSeasonSurfaces(s);
    expect(ship.seasonStatus).toBeUndefined();
    expect(troop.seasonStatus).toBeUndefined();
    expect(moveTargets(s, [troop.id])["1,0"]).toBeUndefined();
    expect(moveTargets(s, [ship.id])["0,0"]).toBeUndefined();
    expect(canOccupy(s.tiles["0,0"])).toBe(true);
    expect(canOccupy(s.tiles["0,0"], true)).toBe(false);
    for (const vertex of s.tiles["0,0"].vertices)
      expect(solidAtVertex(s, vertex)).not.toContain("0,0");
  });

  it("lets AI evacuate from thawing sea onto adjacent permanent ice", () => {
    const { s } = glacialFixture();
    for (const hex of Object.values(s.tiles))
      if (hex.id !== "0,0")
        Object.assign(hex, { biome: "water", resource: "water" });
    const troop = piece(s, "1,0");
    syncSeasonSurfaces(s);
    expect(seasonalDestinationSafe(s, "0,0", false)).toBe(true);
    expect(seasonalDestinationSafe(s, "1,0", false)).toBe(false);
    expect(seasonalEvacuation(s)).toEqual({
      type: "move",
      ids: [troop.id],
      to: "0,0",
    });
  });
});

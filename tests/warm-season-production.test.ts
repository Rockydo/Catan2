import { describe, expect, it } from "vitest";
import {
  BIOME_INFO,
  type Biome,
  type Climate,
} from "../src/game/climate-content";
import { processedFor } from "../src/game/content";
import { production } from "../src/game/economy";
import { tileYield } from "../src/game/maritime";
import { productionSources } from "../src/game/selectors";
import {
  SEASONS,
  seasonalProfile,
  seasonalWorkshopBase,
} from "../src/game/seasons";
import type { Raw, Stock } from "../src/game/types";
import { maritimeFixture } from "./maritime-fixture";

type Example = [Climate, Biome, Raw, [number, number, number, number]];
const examples: Example[] = [
  ["tropical", "jungle", "hides", [1, 1, 1, 1]],
  ["subtropical", "jungle", "hides", [1, 1, 1, 1]],
  ["savanna", "wildlife-grassland", "hides", [2, 1, 3, 2]],
  ["tropical", "tropical-woods", "lumber", [1, 1, 1, 1]],
  ["subtropical", "river-woods", "lumber", [1, 1, 1, 1]],
  ["savanna", "dry-woodland", "lumber", [1, 1, 1, 1]],
  ["desert", "oasis", "lumber", [1, 1, 1, 1]],
  ["tropical", "clay", "brick", [1, 1, 1, 1]],
  ["subtropical", "alluvial-clay", "brick", [2, 1, 2, 3]],
  ["savanna", "clay", "brick", [1, 1, 1, 1]],
  ["tropical", "salt-flats", "salt", [1, 0, 1, 2]],
  ["subtropical", "salt-flats", "salt", [1, 0, 1, 2]],
  ["savanna", "salt-flats", "salt", [1, 0, 1, 2]],
  ["desert", "salt-flats", "salt", [1, 1, 1, 1]],
  ["temperate", "salt-flats", "salt", [1, 2, 1, 0]],
  ["mediterranean", "salt-flats", "salt", [1, 2, 1, 0]],
  // Also cover richer forest variants in saved or manually authored worlds.
  ["tropical", "forest", "lumber", [2, 1, 2, 3]],
  ["desert", "forest", "lumber", [2, 2, 2, 2]],
];

describe("warm-climate industry schedules", () => {
  const baseline = maritimeFixture();

  it.each(examples)(
    "%s %s keeps its %s calendar and annual yield",
    (climate, biome, raw, expected) => {
      const tile = {
        ...baseline.s.tiles["0,0"],
        climate,
        biome,
        resource: BIOME_INFO[biome].resource,
      };
      const profile = seasonalProfile(tile, 0);
      expect(SEASONS.map((season) => profile[season][raw] ?? 0)).toEqual(
        expected,
      );
      for (const [good, base] of Object.entries(tileYield(tile, 0))) {
        const amounts = SEASONS.map(
          (season) => profile[season][good as Raw] ?? 0,
        );
        expect(amounts.reduce((sum, amount) => sum + amount, 0)).toBe(
          4 * base!,
        );
        expect(amounts.every((amount) => Number.isInteger(amount))).toBe(true);
      }
    },
  );

  it.each<Climate>(["tropical", "subtropical", "savanna", "desert"])(
    "keeps both %s Woods choices and fixed workshop goods productive without a switching bonus",
    (climate) => {
      const tile = {
        ...baseline.s.tiles["0,0"],
        biome: "woods" as const,
        resource: "lumber" as const,
        climate,
      };
      const logging = { ...tile, woodsChoices: { 0: "lumber" as const } };
      const hunting = { ...tile, woodsChoices: { 0: "hides" as const } };
      const wood = seasonalProfile(logging, 0);
      const hides = seasonalProfile(hunting, 0);
      for (const season of SEASONS) {
        expect(wood[season]).toEqual({ lumber: 1 });
        expect(hides[season]).toEqual({ hides: 1 });
        expect(seasonalWorkshopBase(logging, 0, "hides", season)).toBe(1);
        expect(seasonalWorkshopBase(hunting, 0, "lumber", season)).toBe(1);
      }
      expect(
        SEASONS.reduce(
          (sum, season) =>
            sum + Math.max(wood[season].lumber!, hides[season].hides!),
          0,
        ),
      ).toBe(4);
    },
  );

  it("retains the mild Woods, livestock and whale calendars", () => {
    const unchanged: Example[] = [
      ["temperate", "woods", "lumber", [1, 1, 2, 0]],
      ["savanna", "cattle-savanna", "meat", [1, 0, 2, 1]],
      ["savanna", "cattle-savanna", "hides", [1, 0, 2, 1]],
      ["steppe", "cattle-savanna", "hides", [1, 0, 2, 1]],
      ["subtropical", "cattle-pasture", "meat", [1, 1, 4, 2]],
    ];
    for (const climate of [
      "tropical",
      "subtropical",
      "savanna",
      "desert",
    ] as const)
      for (const raw of ["hides", "oil"] as const)
        unchanged.push([climate, "whale", raw, [0, 1, 2, 1]]);
    for (const [climate, biome, raw, expected] of unchanged) {
      const profile = seasonalProfile({
        ...baseline.s.tiles["0,0"],
        climate,
        biome,
        resource: BIOME_INFO[biome].resource,
      });
      expect(
        SEASONS.map((season) => profile[season][raw] ?? 0),
        `${climate}/${biome}/${raw}`,
      ).toEqual(expected);
    }
  });

  it.each(examples.filter(([, , , amounts]) => amounts[1] === 1))(
    "pays %s %s %s to towns, camps and workshops on every matching Summer roll",
    (climate, biome, raw) => {
      const s = structuredClone(baseline.s);
      const home = s.towns[baseline.home.id];
      s.calendar = { startRound: 1, startSeason: "spring" };
      s.round = 2;
      for (const tile of Object.values(s.tiles)) {
        tile.resource = "snow";
        delete tile.biome;
      }
      const target = s.tiles["0,0"];
      Object.assign(target, {
        climate,
        biome,
        resource: BIOME_INFO[biome].resource,
      });
      home.stock = {};
      home.level = home.turnLevel = 4;
      home.extensions[target.id] = 3;
      home.extensionGoods = { [target.id]: raw };
      const edge = s.vertices[home.vertex].edges
        .map((id) => s.edges[id])
        .find((candidate) => candidate.tiles.includes(target.id))!;
      s.routes[edge.id] = {
        id: edge.id,
        edge: edge.id,
        owner: 0,
        kind: "road",
        camps: { [target.id]: 2 },
        born: 0,
      };
      const processed = processedFor(raw);
      const totals = (season: "annual" | (typeof SEASONS)[number]) => {
        const result: Stock = {};
        for (const row of productionSources(s, season).filter(
          (source) => source.owner === 0 && source.tile === target.id,
        ))
          result[row.good] = (result[row.good] ?? 0) + row.amount;
        return result;
      };
      // Level-four town + tier-two camp; automatic refinement + tier-three workshop.
      expect(totals("summer")).toEqual({ [raw]: 6, [processed]: 5 });
      const annual = totals("annual");
      for (const good of [raw, processed])
        expect(
          SEASONS.reduce((sum, season) => sum + (totals(season)[good] ?? 0), 0),
        ).toBe(4 * annual[good]!);
      production(s, 6);
      expect(home.stock).toEqual({});
      production(s, 7);
      expect(home.stock).toEqual({ [raw]: 6, [processed]: 5 });
      production(s, 7);
      expect(home.stock).toEqual({ [raw]: 12, [processed]: 10 });
    },
  );
});

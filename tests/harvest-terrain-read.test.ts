import { expect, it, vi } from "vitest";
import * as maritime from "../src/game/maritime";
import * as seasons from "../src/game/seasons";
import {
  forecastProduction,
  probability,
  productionSources,
  withPlanningFrame,
  withProductionTerrainRead,
} from "../src/game/selectors";
import type { Game } from "../src/game/types";
import { fishingFixture } from "./maritime-fixture";
import { piece } from "./helpers";

const modes = ["current", "annual", ...seasons.SEASONS] as const;
function fixture() {
  const f = fishingFixture(),
    { s, home, water } = f;
  s.calendar = {
    startRound: 1,
    startSeason: "spring",
    roundsPerSeason: 2,
    iceModel: 2,
  };
  s.round = 1;
  const woods = s.vertices[home.vertex].tiles.find(
    (id) => s.tiles[id].resource !== "water",
  )!;
  Object.assign(s.tiles[woods], {
    biome: "woods",
    climate: "temperate",
    resource: "lumber",
    woodsChoices: { 0: "hides", 1: "lumber" },
  });
  Object.assign(s.tiles[water], {
    climate: "arctic",
    biome: "whale",
    whale: true,
    fish: false,
    thawGrace: "spring",
    freezeRoll: 0.3,
    iceWeather: { round: 1, season: "spring", half: "early" },
    surface: "open",
  });
  home.extensions[woods] = 2;
  home.extensionGoods = { [woods]: "lumber" };
  s.routes[f.edge.id] = {
    id: "r-harvest",
    edge: f.edge.id,
    kind: "route",
    owner: 0,
    born: 0,
    camps: { [water]: 2 },
  };
  const merchant = piece(s, woods, 0, "merchant", 3);
  const fisher = piece(s, water, 0, "fishing", 4);
  const trader = piece(s, water, 0, "merchantship", 4);
  return { ...f, woods, merchant, fisher, trader };
}
function read(s: Game) {
  return withPlanningFrame(s, () =>
    modes.map((mode) => ({
      mode,
      sources: productionSources(s, mode),
      forecast: forecastProduction(
        s,
        mode,
        (tile, amount) => probability(s.tiles[tile].number) * amount,
      ),
    })),
  );
}
function check(s: Game) {
  // A detached tile dictionary cannot use the protected context. Read it in a
  // separate scope to compare every delivery, warehouse and fractional sum.
  const expected = read({ ...s, tiles: structuredClone(s.tiles) });
  const actual = read({ ...s });
  expect(actual).toEqual(expected);
  for (const { sources } of actual)
    for (const source of sources)
      expect(source.town).toBe(s.towns[source.town.id]);
}

it("retains only terrain terms while towns, workshops, camps, collectors and diplomacy change", () => {
  const { s, home, enemy, water, woods, merchant, fisher, trader } = fixture();
  const mutations = [
    () => {
      home.stock.gold = 123;
    },
    () => {
      home.level = 2;
    },
    () => {
      home.level = 4;
      home.extensions[woods] = 3;
      home.extensionGoods![woods] = "hides";
    },
    () => {
      s.routes[Object.keys(s.routes)[0]].camps[water] = 1;
    },
    () => {
      piece(s, water, 1, "galley", 3);
      piece(s, woods, 1, "heavy", 2);
    },
    () => {
      s.alliances = [{ id: "a1", members: [0, 1], threat: 2, lockedUntil: 9 }];
    },
    () => {
      s.alliances = [];
    },
    () => {
      fisher.tier = 2;
      merchant.tier = 4;
      merchant.coverage = [water, woods, water];
    },
    () => {
      merchant.tile = water;
      trader.tile = "2,0";
    },
    () => {
      merchant.carrier = trader.id;
    },
    () => {
      delete merchant.carrier;
    },
    () => {
      home.vertex = s.tiles["-3,0"].vertices[0];
    },
    () => {
      home.owner = 1;
      enemy.owner = 0;
    },
    () => {
      delete s.towns[home.id];
    },
  ];
  withProductionTerrainRead(s.tiles, () => {
    check(s);
    for (const mutate of mutations) {
      mutate();
      check(s);
    }
  });
});

it("separates current weather, annual output, future thaw grace and calendar-free forecasts", () => {
  const { s } = fixture();
  withProductionTerrainRead(s.tiles, () => {
    for (const startSeason of seasons.SEASONS)
      for (const round of [1, 2, 3, 8, 9]) {
        s.calendar!.startSeason = startSeason;
        s.round = round;
        check(s);
      }
    delete s.calendar;
    check(s);
  });
});

it("avoids re-evaluating unchanged yields and fishing areas and releases them on scope exit", () => {
  const { s } = fixture();
  const yieldSpy = vi.spyOn(seasons, "seasonalYield"),
    harvestSpy = vi.spyOn(maritime, "harvestYield"),
    coverageSpy = vi.spyOn(maritime, "harvestTiles");
  try {
    withProductionTerrainRead(s.tiles, () => {
      read({ ...s });
      const counts = [yieldSpy, harvestSpy, coverageSpy].map(
        (spy) => spy.mock.calls.length,
      );
      expect(counts.every((n) => n > 0)).toBe(true);
      for (let i = 0; i < 20; i++) read({ ...s, actions: i });
      expect(
        [yieldSpy, harvestSpy, coverageSpy].map((spy) => spy.mock.calls.length),
      ).toEqual(counts);
    });
    const before = coverageSpy.mock.calls.length;
    read(s);
    expect(coverageSpy.mock.calls.length).toBeGreaterThan(before);
  } finally {
    yieldSpy.mockRestore();
    harvestSpy.mockRestore();
    coverageSpy.mockRestore();
  }
});

it("rechecks detached or mutable terrain and restores a nested scope after an exception", () => {
  const { s, water, woods } = fixture();
  const original = read(s);
  withProductionTerrainRead(s.tiles, () => {
    expect(read(s)).toEqual(original);
    const draft = { ...s, tiles: structuredClone(s.tiles) };
    draft.tiles[woods].woodsChoices = { 0: "lumber" };
    draft.tiles[water].surface = "frozen";
    expect(read(draft)).not.toEqual(original);
    check(draft);
    expect(() =>
      withProductionTerrainRead(draft.tiles, () => {
        check(draft);
        throw Error("nested forecast");
      }),
    ).toThrow("nested forecast");
    expect(read(s)).toEqual(original);
    draft.tiles[water].surface = "open";
    draft.tiles[woods].biome = "rice-field";
    draft.tiles[woods].climate = "tropical";
    check(draft);
  });
  s.tiles[water].surface = "frozen";
  s.tiles[woods].woodsChoices = { 0: "lumber" };
  expect(read(s)).not.toEqual(original);
  check(s);
});

it("returns independent deliveries and keeps warehouses from the current campaign view", () => {
  const { s } = fixture();
  withProductionTerrainRead(s.tiles, () => {
    const expected = read(s);
    const changed = read(s);
    for (const value of changed) {
      if (value.sources[0]) value.sources[0].amount = -10;
      value.sources.reverse();
      value.forecast[0].grain = -999;
    }
    expect(read(s)).toEqual(expected);
    const clone = structuredClone(s);
    clone.tiles = s.tiles;
    for (const town of Object.values(clone.towns)) town.name += " new";
    check(clone);
  });
});

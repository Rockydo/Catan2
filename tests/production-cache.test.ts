import { describe, expect, it, vi } from "vitest";
import * as maritime from "../src/game/maritime";
import * as seasons from "../src/game/seasons";
import { fishingFixture } from "./maritime-fixture";
import { piece } from "./helpers";
import { production } from "../src/game/economy";
import { dominanceSupport } from "../src/game/ai-support";
import {
  income,
  probability,
  productionSources,
  forEachProduction,
  productionSignature,
  withPlanningFrame,
} from "../src/game/selectors";
import {
  projectedIncome,
  projectedIncomes,
  withSeasonalPlanning,
} from "../src/game/ai-seasonal";
import type { Game, Good, Stock } from "../src/game/types";

function direct(s: Game, owner: number, mode: "annual" | "current") {
  const result: Stock = {};
  for (const source of productionSources(s, mode)) {
    if (source.owner !== owner) continue;
    result[source.good] =
      (result[source.good] ?? 0) +
      probability(s.tiles[source.tile].number) * source.amount;
  }
  return result;
}
function inspect(s: Game) {
  // A new decision frame does not clear the retained position cache.
  withSeasonalPlanning(() =>
    withPlanningFrame(s, () => {
      for (const p of s.players) {
        expect(income(s, p.id)).toEqual(direct(s, p.id, "annual"));
        expect(projectedIncome(s, p.id, 1)).toEqual(direct(s, p.id, "current"));
      }
    }),
  );
}
function fixture() {
  const f = fishingFixture();
  f.s.calendar = {
    startRound: 1,
    roundsPerSeason: 2,
    startSeason: "summer",
    iceModel: 2,
  };
  f.s.round = 1;
  f.s.phase = "roll";
  f.s.active = 0;
  const land = f.s.vertices[f.home.vertex].tiles.find(
    (id) => f.s.tiles[id].resource !== "water",
  )!;
  Object.assign(f.s.tiles[land], {
    biome: "woods",
    climate: "temperate",
    resource: "lumber",
  });
  f.home.extensions[land] = 2;
  f.home.extensionGoods = { [land]: "hides" };
  f.s.routes[f.edge.id] = {
    id: "r-cache",
    born: 0,
    edge: f.edge.id,
    owner: 0,
    kind: "route",
    camps: { [f.water]: 2 },
  };
  const merchant = piece(f.s, land, 0, "merchant", 3);
  const fisher = piece(f.s, f.water, 0, "fishing", 3);
  return { ...f, land, merchant, fisher };
}

describe("retained production forecasts", () => {
  it("streams ordered deliveries without joining fractional outputs or changing the world", () => {
    const { s, merchant, fisher } = fixture();
    for (let i = 0; i < 300; i++) {
      piece(s, merchant.tile, 0, "merchant", 3);
      piece(s, fisher.tile, 0, "fishing", 3);
    }
    const untouched = JSON.stringify(s);
    for (const mode of ["current", "annual", ...seasons.SEASONS] as const) {
      const sources = productionSources(s, mode);
      const ordered: (number | string)[][] = [];
      const sums: Record<string, number> = {};
      forEachProduction(s, mode, (owner, town, tile, good, amount) => {
        expect(town).toBe(s.towns[town.id]);
        expect(amount).toBeGreaterThan(0);
        ordered.push([owner, town.id, tile, good, amount]);
        const key = `${owner}/${good}`;
        sums[key] =
          (sums[key] ?? 0) + probability(s.tiles[tile].number) * amount;
      });
      const expected: Record<string, number> = {};
      for (const source of sources) {
        const key = `${source.owner}/${source.good}`;
        expected[key] =
          (expected[key] ?? 0) +
          probability(s.tiles[source.tile].number) * source.amount;
      }
      expect(ordered).toEqual(
        sources.map((v) => [v.owner, v.town.id, v.tile, v.good, v.amount]),
      );
      expect(sums).toEqual(expected);
    }
    expect(JSON.stringify(s)).toBe(untouched);
  });
  it("checks future ice once per tile and round regardless of how many fishers produce there", () => {
    const { s, fisher } = fixture();
    // A unique position prevents a previous test's retained forecast being used.
    s.round = 61;
    for (let i = 0; i < 400; i++) piece(s, fisher.tile, 0, "fishing", 3);
    const risk = vi.spyOn(seasons, "iceRisk");
    try {
      const forecast = withSeasonalPlanning(() => projectedIncomes(s, 40));
      expect(Object.keys(forecast[0]).length).toBeGreaterThan(0);
      const checks = risk.mock.calls.map(
        ([, tile, round]) => `${tile.id}/${round}`,
      );
      expect(checks.length).toBeGreaterThan(0);
      expect(new Set(checks).size).toBe(checks.length);
    } finally {
      risk.mockRestore();
    }
  });
  it("credits every rolled delivery while preserving nonmatching stocks and current production inputs", () => {
    const original = fixture();
    for (let i = 0; i < 40; i++) {
      piece(original.s, original.merchant.tile, 0, "merchant", 3);
      piece(original.s, original.fisher.tile, 0, "fishing", 3);
    }
    Object.values(original.s.tiles).forEach((tile, i) => {
      tile.number = 2 + (i % 11);
    });
    for (let roll = 2; roll <= 12; roll++) {
      const s = structuredClone(original.s);
      const home = s.towns[original.home.id];
      // Support goes to other factions. This warehouse receives harvest only.
      expect(dominanceSupport(s)?.leader).toBe(0);
      const expected = { ...home.stock };
      const receipt: Stock = {};
      const sources = productionSources(s);
      for (const source of sources) {
        if (source.town.id !== home.id || s.tiles[source.tile].number !== roll)
          continue;
        expected[source.good] = (expected[source.good] ?? 0) + source.amount;
        receipt[source.good] = (receipt[source.good] ?? 0) + source.amount;
      }
      const terrain = JSON.stringify(s.tiles),
        units = JSON.stringify(s.pieces);
      production(s, roll);
      expect(home.stock).toEqual(expected);
      expect(s.production[0]).toEqual(receipt);
      expect(JSON.stringify(s.tiles)).toBe(terrain);
      expect(JSON.stringify(s.pieces)).toBe(units);
      expect(
        productionSources(s).map(({ owner, town, tile, good, amount }) => [
          owner,
          town.id,
          tile,
          good,
          amount,
        ]),
      ).toEqual(
        sources.map(({ owner, town, tile, good, amount }) => [
          owner,
          town.id,
          tile,
          good,
          amount,
        ]),
      );
    }
  });
  it("shares collector coverage without combining or reordering individual deliveries", () => {
    const { s, merchant, fisher } = fixture();
    const buildings = productionSources({ ...s, pieces: {} });
    const merchants = productionSources({
      ...s,
      pieces: { [merchant.id]: merchant },
    }).slice(buildings.length);
    const fishers = productionSources({
      ...s,
      pieces: { [fisher.id]: fisher },
    }).slice(buildings.length);
    const expected = [...buildings, ...merchants, ...fishers];
    for (let i = 0; i < 500; i++) {
      piece(s, merchant.tile, merchant.owner, "merchant", merchant.tier);
      piece(s, fisher.tile, fisher.owner, "fishing", fisher.tier);
      expected.push(...merchants, ...fishers);
    }
    const coverage = vi.spyOn(maritime, "harvestTiles");
    try {
      const result = productionSources(s);
      expect(result).toEqual(expected);
      expect(coverage).toHaveBeenCalledTimes(2);
      const first = result[buildings.length];
      expect(first).not.toBe(
        result[buildings.length + merchants.length + fishers.length],
      );
      expect(first.town).toBe(s.towns[first.town.id]);
      expect(new Set(result).size).toBe(result.length);
    } finally {
      coverage.mockRestore();
    }
  });
  const changes: [string, (f: ReturnType<typeof fixture>) => void][] = [
    [
      "vertex harvest adjacency",
      (f) => {
        f.s.vertices[f.home.vertex].tiles = [f.land];
      },
    ],
    [
      "local freeze probability",
      (f) => {
        f.s.tiles[f.water].freezeRoll = 0.01;
      },
    ],
    [
      "resolved half-season weather",
      (f) => {
        f.s.tiles[f.water].iceWeather = {
          round: 1,
          season: "summer",
          half: "late",
        };
      },
    ],
    [
      "dice number",
      (f) => {
        f.s.tiles[f.land].number = 2;
      },
    ],
    [
      "terrain yield",
      (f) => {
        f.s.tiles[f.land].biome = "rice-field";
      },
    ],
    [
      "faction Woods choice",
      (f) => {
        f.s.tiles[f.land].woodsChoices = { 0: "hides" };
      },
    ],
    [
      "city tier",
      (f) => {
        f.home.level = 2;
      },
    ],
    [
      "workshop tier",
      (f) => {
        f.home.extensions[f.land] = 1;
      },
    ],
    [
      "workshop product",
      (f) => {
        f.home.extensionGoods![f.land] = "lumber";
      },
    ],
    [
      "town ownership",
      (f) => {
        f.home.owner = 1;
      },
    ],
    [
      "town location",
      (f) => {
        f.home.vertex = f.s.tiles["-3,0"].vertices[0];
      },
    ],
    [
      "camp removal",
      (f) => {
        f.s.routes[f.edge.id].camps = {};
      },
    ],
    [
      "camp ownership",
      (f) => {
        f.s.routes[f.edge.id].owner = 1;
      },
    ],
    [
      "merchant tier",
      (f) => {
        f.merchant.tier = 4;
      },
    ],
    [
      "merchant selection",
      (f) => {
        f.merchant.coverage = ["-3,0"];
      },
    ],
    [
      "merchant movement",
      (f) => {
        f.merchant.tile = "-3,0";
      },
    ],
    [
      "embarked merchant",
      (f) => {
        f.merchant.carrier = f.fisher.id;
      },
    ],
    [
      "enemy blockade",
      (f) => {
        piece(f.s, f.land, 1);
        piece(f.s, f.water, 1, "galley");
      },
    ],
    [
      "alliance",
      (f) => {
        piece(f.s, f.land, 1);
        f.s.alliances = [
          { id: "pact", members: [0, 1], threat: 2, lockedUntil: 5 },
        ];
      },
    ],
    [
      "new season",
      (f) => {
        f.s.round = 3;
      },
    ],
    [
      "calendar start",
      (f) => {
        f.s.calendar!.startSeason = "winter";
      },
    ],
    [
      "frozen fisheries",
      (f) => {
        Object.assign(f.s.tiles[f.water], {
          climate: "arctic",
          surface: "frozen",
          iceWeather: { round: 1, season: "summer", half: "early" },
        });
      },
    ],
    [
      "thaw grace",
      (f) => {
        f.s.tiles[f.water].thawGrace = "summer";
      },
    ],
  ];
  it.each(changes)(
    "refreshes after %s, including an in-place transaction draft",
    (_, change) => {
      const f = fixture();
      inspect(f.s);
      const signature = productionSignature(f.s);
      change(f);
      expect(productionSignature(f.s)).not.toBe(signature);
      inspect(f.s);
      inspect(structuredClone(f.s));
    },
  );
  it("reuses unchanged harvest inputs through spending and fortification, without exposing cached stocks", () => {
    const f = fixture();
    inspect(f.s);
    const signature = productionSignature(f.s);
    f.home.stock = { gold: 1 };
    f.home.wall = 4;
    f.merchant.moved = 9;
    f.fisher.acted = true;
    f.s.actions++;
    expect(productionSignature(f.s)).toBe(signature);
    const output = income(f.s);
    for (const g of Object.keys(output) as Good[]) output[g] = -100;
    inspect(f.s);
  });
  it("excludes drawing geometry without changing town, camp or collector forecasts", () => {
    const f = fixture();
    inspect(f.s);
    const signature = productionSignature(f.s);
    for (const vertex of Object.values(f.s.vertices)) {
      vertex.x += 10;
      vertex.y -= 20;
      vertex.edges.reverse();
    }
    for (const tile of Object.values(f.s.tiles)) {
      tile.vertices.reverse();
      tile.edges.reverse();
    }
    expect(productionSignature(f.s)).toBe(signature);
    inspect(f.s);
  });
  it("does not reuse blocked harvests after a pact or disembarkation changes access", () => {
    const f = fixture();
    const foe = piece(f.s, f.land, 1);
    inspect(f.s);
    f.s.alliances = [
      { id: "pact", members: [0, 1], threat: 2, lockedUntil: 5 },
    ];
    inspect(f.s);
    f.s.alliances = [];
    foe.carrier = f.fisher.id;
    inspect(f.s);
    delete foe.carrier;
    inspect(f.s);
  });
});

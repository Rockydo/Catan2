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
  withSharedPiecePlanningFrame,
} from "../src/game/selectors";
import {
  projectedIncome,
  projectedIncomes,
  withSeasonalPlanning,
} from "../src/game/ai-seasonal";
import type { Game, Good, Stock, Piece } from "../src/game/types";
import { distance } from "../src/game/world";

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

describe("production blockade footprint", () => {
  function outsideHarvests(s: Game) {
    const used = new Set([
      ...Object.values(s.towns).flatMap((t) => s.vertices[t.vertex].tiles),
      ...Object.values(s.routes).flatMap((r) => Object.keys(r.camps)),
    ]);
    return Object.values(s.tiles)
      .filter((t) => t.resource !== "water" && !used.has(t.id))
      .map((t) => t.id);
  }

  it("reuses forecasts when troops move away from production, but refreshes on entering a harvest", () => {
    const f = fixture(),
      outside = outsideHarvests(f.s);
    const unit = piece(f.s, outside[0], 1, "heavy", 2);
    inspect(f.s);
    const signature = productionSignature(f.s);
    unit.tile = outside[1];
    unit.moved = 1;
    expect(productionSignature(f.s)).toBe(signature);
    inspect(f.s);
    unit.tile = f.land;
    expect(productionSignature(f.s)).not.toBe(signature);
    inspect(f.s);
  });

  it("retains the same blocked output while blockers change, until the last one leaves", () => {
    const f = fixture();
    const first = piece(f.s, f.land, 1, "heavy", 1);
    const second = piece(f.s, f.land, 1, "light", 4);
    inspect(f.s);
    const signature = productionSignature(f.s);
    delete f.s.pieces[first.id];
    expect(productionSignature(f.s)).toBe(signature);
    second.kind = "artillery";
    second.tier = 2;
    expect(productionSignature(f.s)).toBe(signature);
    inspect(f.s);
    second.carrier = f.fisher.id;
    expect(productionSignature(f.s)).not.toBe(signature);
    inspect(f.s);
  });

  it("ignores friendly guards and wrong-domain occupants while keeping naval blockades", () => {
    const f = fixture(),
      original = productionSignature(f.s);
    piece(f.s, f.land, 0, "heavy", 4);
    piece(f.s, f.water, 0, "galley", 4);
    piece(f.s, f.water, 1, "heavy", 4).seasonStatus = "adrift";
    piece(f.s, f.land, 1, "galley", 4).seasonStatus = "icebound";
    expect(productionSignature(f.s)).toBe(original);
    inspect(f.s);
    const ship = piece(f.s, f.water, 1, "galley", 4);
    expect(productionSignature(f.s)).not.toBe(original);
    inspect(f.s);
    delete f.s.pieces[ship.id];
    piece(f.s, f.water, 1, "settlership", 1);
    expect(productionSignature(f.s)).toBe(original);
    inspect(f.s);
  });

  it("keeps remote frozen fisheries in the footprint for annual and future-season harvests", () => {
    const f = fixture();
    f.home.vertex = f.s.tiles["-3,0"].vertices[0];
    f.home.extensions = {};
    f.home.extensionGoods = {};
    f.s.routes = {};
    delete f.s.pieces[f.merchant.id];
    Object.assign(f.s.tiles[f.water], { climate: "arctic", surface: "frozen" });
    expect(
      Object.values(f.s.towns).every(
        (t) => !f.s.vertices[t.vertex].tiles.includes(f.water),
      ),
    ).toBe(true);
    inspect(f.s);
    const signature = productionSignature(f.s);
    const annual = income(f.s, 0);
    piece(f.s, f.water, 1, "galley", 2);
    expect(productionSignature(f.s)).not.toBe(signature);
    inspect(f.s);
    expect(income(f.s, 0)).not.toEqual(annual);
  });

  it("does not recalculate seasonal yields for unchanged harvests in the next decision", () => {
    const f = fixture();
    f.s.round = 171;
    const outside = outsideHarvests(f.s);
    const unit = piece(f.s, outside[0], 1, "heavy", 3);
    const read = () =>
      withSeasonalPlanning(() =>
        withPlanningFrame(f.s, () => ({
          annual: f.s.players.map((p) => income(f.s, p.id)),
          forecast: projectedIncomes(f.s, 6),
        })),
      );
    const spy = vi.spyOn(seasons, "seasonalYield");
    try {
      const expected = read(),
        count = spy.mock.calls.length;
      expect(count).toBeGreaterThan(0);
      unit.tile = outside[1];
      expect(read()).toEqual(expected);
      expect(spy).toHaveBeenCalledTimes(count);
      unit.tile = f.land;
      expect(read()).not.toEqual(expected);
      expect(spy.mock.calls.length).toBeGreaterThan(count);
    } finally {
      spy.mockRestore();
    }
  });
});

it("keeps fishing interests within ship range without assuming today's ice is permanent", () => {
  const f = fixture();
  f.fisher.tier = 1;
  const used = new Set(
    Object.values(f.s.towns).flatMap((t) => f.s.vertices[t.vertex].tiles),
  );
  const remote = Object.values(f.s.tiles).find(
    (t) => !used.has(t.id) && distance(t.id, f.fisher.tile) === 3,
  )!;
  remote.resource = "water";
  remote.fish = true;
  delete remote.biome;
  inspect(f.s);
  const signature = productionSignature(f.s);
  const enemy = piece(f.s, remote.id, 1, "galley", 3);
  expect(productionSignature(f.s)).toBe(signature);
  inspect(f.s);
  f.fisher.tier = 3;
  inspect(f.s);
  const covered = productionSignature(f.s);
  delete f.s.pieces[enemy.id];
  expect(productionSignature(f.s)).not.toBe(covered);
  inspect(f.s);
});

it("compacts repeated collector inputs without losing multiplicity, selection or producer order", () => {
  const f = fixture();
  f.s.pieces = {};
  const initial = piece(f.s, f.land, 0, "merchant", 3);
  initial.coverage = [f.water];
  const one = productionSignature(f.s);
  for (let i = 0; i < 2000; i++)
    piece(f.s, f.land, 0, "merchant", 3).coverage = [f.water];
  const repeated = productionSignature(f.s);
  expect(repeated).not.toBe(one);
  expect(repeated.length - one.length).toBeLessThan(20);
  inspect(f.s);
  const fish = piece(f.s, f.water, 0, "fishing", 3);
  piece(f.s, f.land, 0, "merchant", 3).coverage = [f.water];
  const mixed = productionSignature(f.s);
  inspect(f.s);
  f.s.pieces = { [fish.id]: fish, ...f.s.pieces };
  expect(productionSignature(f.s)).not.toBe(mixed);
  inspect(f.s);
  initial.coverage = [];
  const selected = productionSignature(f.s);
  inspect(f.s);
  delete initial.coverage;
  expect(productionSignature(f.s)).not.toBe(selected);
  inspect(f.s);
});

it("equal fingerprints imply identical ordered deliveries across varied occupations and all seasons", () => {
  const base = fixture();
  const positions = [base.land, base.water, "-3,0", "3,-1"];
  const seen = new Map<string, string>();
  let reused = 0;
  for (let i = 0; i < 128; i++) {
    const s = structuredClone(base.s);
    s.towns[base.home.id].level = i % 16 < 8 ? 3 : 4;
    s.pieces[base.merchant.id].tier = i % 32 < 16 ? 2 : 3;
    if (i % 4 === 0)
      s.alliances = [
        { id: "pact", members: [0, 1], threat: 2, lockedUntil: 5 },
      ];
    const naval = i % 5 === 0;
    const unit = piece(
      s,
      positions[i % positions.length],
      i % 2,
      naval ? "galley" : "heavy",
      1 + (i % 4),
    );
    if (i % 7 === 0) unit.carrier = base.fisher.id;
    if (i % 3 === 0) {
      const duplicate = piece(s, unit.tile, unit.owner, unit.kind, unit.tier);
      duplicate.carrier = unit.carrier;
    }
    const original = JSON.stringify(s);
    const { signature, deliveries } = withPlanningFrame(s, () => ({
      signature: productionSignature(s),
      deliveries: JSON.stringify(
        ["current", "annual", ...seasons.SEASONS].map((mode) =>
          productionSources(
            s,
            mode as "current" | "annual" | seasons.Season,
          ).map((v) => [v.owner, v.town.id, v.tile, v.good, v.amount]),
        ),
      ),
    }));
    const previous = seen.get(signature);
    if (previous !== undefined) {
      expect(deliveries).toBe(previous);
      reused++;
    } else seen.set(signature, deliveries);
    expect(JSON.stringify(s)).toBe(original);
  }
  expect(reused).toBeGreaterThan(50);
});

function orderedDeliveries(
  s: Game,
  mode: "current" | "annual" | seasons.Season,
) {
  return productionSources(s, mode).map(
    ({ owner, town, tile, good, amount }) => [
      owner,
      town.id,
      tile,
      good,
      amount,
    ],
  );
}

it("repeated collectors retain each individual delivery, custom coverage and exact producer order", () => {
  const f = fixture(),
    s = f.s;
  s.pieces = {};
  // Constant guards make blockades identical in the isolated-producer oracle.
  piece(s, f.land, 1, "heavy");
  const carrier = piece(s, f.water, 0, "convoy", 4);
  const guards = { ...s.pieces },
    units: Piece[] = [];
  for (let group = 0; group < 12; group++) {
    const kind = (["merchant", "fishing", "merchantship"] as const)[group % 3];
    for (let i = 0; i < 7; i++) {
      const u = piece(
        s,
        kind === "merchant" ? f.land : f.water,
        kind === "merchant" && group % 2 ? 1 : 0,
        kind,
        1 + (group % 4),
      );
      if (kind === "merchant" && group % 2 === 0)
        u.coverage = group % 4 === 0 ? [] : [f.water];
      if (i === 3) u.carrier = carrier.id;
      units.push(u);
      // Nonproducers do not change the order of harvested deliveries.
      if (i === 4) piece(s, "-3,0", 0, "heavy");
    }
  }
  const before = JSON.stringify(s);
  for (const mode of ["current", "annual", ...seasons.SEASONS] as const) {
    const prefix = orderedDeliveries({ ...s, pieces: guards }, mode);
    const expected = [...prefix];
    for (const u of units) {
      const single = orderedDeliveries(
        { ...s, pieces: { ...guards, [u.id]: u } },
        mode,
      );
      expect(single.slice(0, prefix.length)).toEqual(prefix);
      expected.push(...single.slice(prefix.length));
    }
    const actual = withPlanningFrame(s, () => orderedDeliveries(s, mode));
    expect(actual).toEqual(expected);
    const sum = (rows: typeof actual) =>
      rows.reduce(
        (n, row) =>
          n + Number(row[4]) * probability(s.tiles[String(row[2])].number),
        0,
      );
    expect(sum(actual)).toBe(sum(expected));
  }
  expect(JSON.stringify(s)).toBe(before);
});

it("shared troop reads still use each view's terrain, alliances, season and warehouses", () => {
  const f = fixture(),
    s = f.s;
  piece(s, f.land, 1, "heavy");
  piece(s, f.land, 0, "galley");
  piece(s, f.water, 1, "galley");
  piece(s, f.water, 0, "heavy");
  const terrain = {
    ...s.tiles,
    [f.land]: {
      ...s.tiles[f.land],
      resource: "water" as const,
      biome: "cod" as const,
      fish: true,
    },
    [f.water]: {
      ...s.tiles[f.water],
      resource: "lumber" as const,
      biome: "woods" as const,
      fish: false,
    },
  };
  const views: Game[] = [
    { ...s, tiles: terrain },
    {
      ...s,
      alliances: [{ id: "pact", members: [0, 1], threat: 2, lockedUntil: 5 }],
    },
    {
      ...s,
      round: 3,
      tiles: {
        ...s.tiles,
        [f.water]: {
          ...s.tiles[f.water],
          climate: "arctic",
          surface: "frozen",
        },
      },
    },
    {
      ...s,
      towns: {
        ...s.towns,
        [f.home.id]: {
          ...f.home,
          vertex: s.tiles["-3,0"].vertices[0],
          extensions: {},
          extensionGoods: {},
        },
      },
    },
    Object.assign(Object.create(s), { round: 4, tiles: terrain }),
  ];
  const modes = ["current", "annual", ...seasons.SEASONS] as const;
  // These copies cannot see the enclosing frame's troop index.
  const expected = views.map((view) =>
    modes.map((mode) =>
      orderedDeliveries(structuredClone({ ...s, ...view }), mode),
    ),
  );
  const before = JSON.stringify(s);
  withPlanningFrame(s, () => {
    productionSignature(s);
    for (let i = 0; i < views.length; i++) {
      expect(modes.map((mode) => orderedDeliveries(views[i], mode))).toEqual(
        expected[i],
      );
      withSharedPiecePlanningFrame(views[i], () => {
        expect(modes.map((mode) => orderedDeliveries(views[i], mode))).toEqual(
          expected[i],
        );
      });
    }
  });
  expect(JSON.stringify(s)).toBe(before);
});

it("indexes repeated producers once across seasons and related read-only views", () => {
  const f = fixture(),
    s = f.s;
  for (let i = 0; i < 2000; i++) piece(s, f.land, 0, "merchant", 3);
  const spy = vi.spyOn(JSON, "stringify");
  let keys: unknown[];
  try {
    withPlanningFrame(s, () => {
      productionSignature(s);
      for (const mode of ["current", "annual", ...seasons.SEASONS] as const)
        forEachProduction(s, mode, () => {});
      const view = { ...s, round: 2 };
      forEachProduction(view, "spring", () => {});
      withSharedPiecePlanningFrame(view, () =>
        forEachProduction(view, "summer", () => {}),
      );
    });
    keys = spy.mock.calls.filter(
      ([value]) =>
        Array.isArray(value) &&
        value.length === 5 &&
        ["merchant", "fishing", "merchantship"].includes(value[1]),
    );
  } finally {
    spy.mockRestore();
  }
  // Merchant, fisher, then the repeated merchant group. No per-season or
  // per-soldier serialization of these production keys.
  expect(keys).toHaveLength(3);
  const repeated = Object.values(s.pieces).at(-1)!;
  const old = orderedDeliveries(s, "annual");
  repeated.tier = 4;
  expect(orderedDeliveries(s, "annual")).not.toEqual(old);
  repeated.carrier = f.fisher.id;
  expect(orderedDeliveries(s, "annual")).not.toEqual(old);
});

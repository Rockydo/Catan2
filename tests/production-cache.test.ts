import { describe, expect, it } from "vitest";
import { fishingFixture } from "./maritime-fixture";
import { piece } from "./helpers";
import {
  income,
  probability,
  productionSources,
  productionSignature,
  withPlanningFrame,
} from "../src/game/selectors";
import { projectedIncome, withSeasonalPlanning } from "../src/game/ai-seasonal";
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
  const changes: [string, (f: ReturnType<typeof fixture>) => void][] = [
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

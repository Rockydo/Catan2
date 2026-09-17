import { describe, it, expect } from "vitest";
import {
  CARDS,
  COSTS,
  RESEARCH_NAMES,
  RESEARCH_GOODS,
  shipCost,
} from "../src/game/content";
import { RAW, PROCESSED } from "../src/game/types";
import { applyCommand } from "../src/game/engine";
import {
  researchAction,
  economyProjects,
  chooseAIAction,
  researchUtility,
} from "../src/game/ai";
import {
  inventory,
  ownTowns,
  fresh,
  effectiveCost,
} from "../src/game/selectors";
import { assertInvariants, serialize, deserialize } from "../src/game/save";
import { hash } from "../src/game/world";
import { fishingFixture, maritimeFixture } from "./maritime-fixture";
import { funded, run, piece, nextOwnerTurn } from "./helpers";
function ready(kind: string) {
  const f = fishingFixture();
  f.s.players[0].hand = [
    {
      id: `c${f.s.nextId++}`,
      kind,
      tier: CARDS[kind].tier,
      bought: f.s.players[0].turns,
    },
  ];
  return f;
}
describe("four-stage research economy", () => {
  it("has eight effects per tier, unchanged base price and one processed type at tier II", () => {
    for (const tier of [1, 2, 3, 4])
      expect(Object.values(CARDS).filter((c) => c.tier === tier)).toHaveLength(
        8,
      );
    expect(COSTS[`Research ${RESEARCH_NAMES[1]}`]).toEqual({
      grain: 1,
      wool: 1,
      ore: 1,
    });
    expect(
      Object.keys(COSTS[`Research ${RESEARCH_NAMES[2]}`]).filter((g) =>
        PROCESSED.includes(g as never),
      ),
    ).toHaveLength(1);
    expect(
      Object.keys(COSTS[`Research ${RESEARCH_NAMES[1]}`]).every((g) =>
        RAW.includes(g as never),
      ),
    ).toBe(true);
  });
  it.each([1, 2, 3, 4])(
    "charges tier %i once, offers two distinct cards and keeps the dice stream unchanged",
    (tier) => {
      const { s, home } = fishingFixture();
      home.stock = { ...COSTS[`Research ${RESEARCH_NAMES[tier]}`] };
      const n = run(s, { type: "buy-research", tier });
      expect(Object.values(inventory(n)).every((n) => n === 0)).toBe(true);
      expect(n.researchChoice).toHaveLength(2);
      expect(new Set(n.researchChoice!.map((c) => c.kind)).size).toBe(2);
      expect(n.rng).toBe(s.rng);
      expect(deserialize(serialize(n))).toEqual(n);
      const kept = run(n, { type: "choose-research", index: 1 });
      expect(kept.players[0].hand[0]).toEqual(n.researchChoice![1]);
      expect(applyCommand(kept, { type: "buy-research", tier }).ok).toBe(false);
    },
  );
  it("respects unlocks, siege restrictions and integer tiers without spending on rejection", () => {
    const { s, home, enemy } = fishingFixture();
    home.level = home.turnLevel = 1;
    for (const tier of [0, 1.5, 2, 3, 4, 5])
      expect(applyCommand(s, { type: "buy-research", tier }).ok).toBe(false);
    home.level = home.turnLevel = 4;
    s.sieges[`1:${home.id}`] = {
      town: home.id,
      owner: enemy.owner,
      progress: 1,
      last: 10,
      raided: null,
    };
    expect(applyCommand(s, { type: "buy-research", tier: 4 }).ok).toBe(false);
  });
  it.each(Object.keys(RESEARCH_GOODS))(
    "%s pays its exact reward and the AI can choose it",
    (kind) => {
      const { s } = ready(kind),
        before = inventory(s),
        action = researchAction(s, s.players[0].hand[0].id)!;
      const n = run(s, action),
        reward = RESEARCH_GOODS[kind];
      expect(
        Object.values(inventory(n)).reduce((a, b) => a + b!, 0) -
          Object.values(before).reduce((a, b) => a + b!, 0),
      ).toBe(reward.total);
      expect(n.players[0].hand).toHaveLength(0);
      assertInvariants(n);
    },
  );
  it.each([
    ["patrol", 2],
    ["naval", 3],
    ["admiralty", 4],
  ] as const)(
    "%s grants an actual matching-tier economic ship, once",
    (kind, tier) => {
      let { s, home, water } = ready(kind);
      const before = inventory(s);
      s = run(s, { type: "play-research", card: s.players[0].hand[0].id });
      s = run(s, {
        type: "ship",
        town: home.id,
        tile: water,
        kind: "merchantship",
        tier,
      });
      expect(inventory(s)).toEqual(before);
      const ship = Object.values(s.pieces)[0];
      expect(ship.tier).toBe(tier);
      expect(fresh(s, ship)).toBe(false);
      s = run(s, {
        type: "ship",
        town: home.id,
        tile: water,
        kind: "merchantship",
        tier,
      });
      for (const [g, n] of Object.entries(shipCost("merchantship", tier)))
        expect(inventory(s)[g as keyof typeof before]).toBe(
          before[g as keyof typeof before]! - n!,
        );
      assertInvariants(deserialize(serialize(s)));
    },
  );
  it.each([
    ["volunteers", 2],
    ["skilled", 3],
    ["muster", 4],
  ] as const)(
    "%s recruits at the correct tier and preserves readiness",
    (kind, tier) => {
      let { s, home } = ready(kind);
      const tile = s.vertices[home.vertex].tiles.find(
        (id) => s.tiles[id].resource !== "water",
      )!;
      s = run(s, { type: "play-research", card: s.players[0].hand[0].id });
      const before = inventory(s);
      s = run(s, {
        type: "recruit",
        town: home.id,
        tile,
        kind: "merchant",
        tier,
      });
      expect(inventory(s)).toEqual(before);
      expect(fresh(s, Object.values(s.pieces)[0])).toBe(false);
    },
  );
  it("workshop and civic discounts subtract material without refunding unused allowance", () => {
    for (const kind of ["workshops", "industry", "civic"]) {
      let { s } = ready(kind);
      s = run(s, { type: "play-research", card: s.players[0].hand[0].id });
      expect(
        effectiveCost(
          s,
          { lumber: 2, steel: 1 },
          kind === "civic" ? "civic" : "industry",
        ),
      ).toEqual({ lumber: 0, steel: 0 });
      expect(effectiveCost(s, { lumber: 2, steel: 1 }, "road")).toEqual({
        lumber: 2,
        steel: 1,
      });
      assertInvariants(deserialize(serialize(s)));
    }
  });
  it("movement research includes fleets and still refuses spent units", () => {
    let { s, water } = ready("logistics");
    const ship = piece(s, water, 0, "fishing", 2);
    s = run(s, {
      type: "play-research",
      card: s.players[0].hand[0].id,
      ids: [ship.id],
    });
    expect(s.pieces[ship.id].bonus).toBe(3);
    const f = ready("march");
    const spent = piece(f.s, f.water, 0, "galley", 2);
    spent.acted = true;
    expect(
      applyCommand(f.s, {
        type: "play-research",
        card: f.s.players[0].hand[0].id,
        ids: [spent.id],
      }).ok,
    ).toBe(false);
  });
  it("migrates original three-tier hands, discards and a pending choice without changing warehouses or dice", () => {
    const { s } = fishingFixture();
    s.players[0].hand = [
      { id: `c${s.nextId++}`, kind: "skilled", tier: 2, bought: 4 },
    ];
    s.researchChoice = [
      { id: `c${s.nextId++}`, kind: "civic", tier: 3, bought: 10 },
    ];
    Object.assign(s, {
      decks: { 1: ["roads"], 2: ["guild"], 3: ["grand"] },
      discards: { 1: [], 2: ["naval"], 3: ["charter"] },
    });
    const text = JSON.stringify({
      format: "catane-frontiers",
      version: 5,
      checksum: hash(JSON.stringify(s)).toString(16),
      game: s,
    });
    const n = deserialize(text);
    expect(n.players[0].hand[0]).toMatchObject({
      kind: "skilled",
      tier: 3,
      bought: 4,
    });
    expect(n.researchChoice![0].tier).toBe(4);
    expect(n).not.toHaveProperty("decks");
    expect(n).not.toHaveProperty("discards");
    expect(n.legacyResearchChoice).toBe(true);
    expect(n.towns).toEqual(s.towns);
    expect(n.tiles).toEqual(s.tiles);
    expect(n.rng).toBe(s.rng);
    expect(deserialize(serialize(n))).toEqual(n);
  });
  it("AI values research surplus, buys useful discoveries, and prefers useful rewards", () => {
    const { s, home } = maritimeFixture();
    home.level = home.turnLevel = 1;
    home.stock = { wool: 1, grain: 1, ore: 1 };
    // Existing guards meet the early defense floor; there are no building materials.
    s.players[0].turns = 4;
    for (let i = 0; i < 4; i++)
      piece(s, s.vertices[home.vertex].tiles[0], 0, "heavy").acted = true;
    const modestValue = economyProjects(s).find(
      (p) => p.action.type === "buy-research",
    )!.score;
    const rich = structuredClone(s);
    rich.towns[home.id].stock = { wool: 20, grain: 20, ore: 20 };
    expect(
      economyProjects(rich).find((p) => p.action.type === "buy-research")!
        .score,
    ).toBeGreaterThan(modestValue);
    expect(chooseAIAction(rich).type).toBe("buy-research");
    s.researchChoice = [
      { id: "c-a", kind: "patrol", tier: 2, bought: 10 },
      { id: "c-b", kind: "craftsmen", tier: 2, bought: 10 },
    ];
    expect(researchUtility(s, "patrol")).toBe(0);
    expect(chooseAIAction(s)).toEqual({ type: "choose-research", index: 1 });
  });
});
describe("alternative watchtower foundations", () => {
  it.each(["lumber", "stone"] as const)(
    "builds using exactly two %s and keeps other resources",
    (material) => {
      let { s, home } = maritimeFixture();
      s = run(s, { type: "road", edge: s.vertices[home.vertex].edges[0] });
      s.towns[home.id].stock = { [material]: 2, salt: 3 };
      s = run(s, { type: "tower", vertex: home.vertex, mode: material });
      expect(s.towns[home.id].stock).toEqual({ salt: 3 });
      expect(s.towers[home.vertex].tier).toBe(1);
    },
  );
  it("does not combine one Wood and one Stone or silently substitute an explicit payment", () => {
    let { s, home } = maritimeFixture();
    s = run(s, { type: "road", edge: s.vertices[home.vertex].edges[0] });
    s.towns[home.id].stock = { lumber: 1, stone: 1 };
    expect(applyCommand(s, { type: "tower", vertex: home.vertex }).ok).toBe(
      false,
    );
    s.towns[home.id].stock = { stone: 2 };
    expect(
      applyCommand(s, { type: "tower", vertex: home.vertex, mode: "lumber" })
        .ok,
    ).toBe(false);
    expect(applyCommand(s, { type: "tower", vertex: home.vertex }).ok).toBe(
      true,
    );
  });
});

it.each(["engineers", "campaign"])(
  "AI uses %s on an eligible unstarted siege rather than waiting a wasted turn",
  (kind) => {
    const { s, home, enemy } = maritimeFixture();
    enemy.level = enemy.turnLevel = 4;
    const besieger = piece(s, s.vertices[enemy.vertex].tiles[0]);
    const marcher = piece(s, s.vertices[home.vertex].tiles[0], 0, "cavalry");
    s.players[0].hand = [
      { id: "c-engineer", kind, tier: CARDS[kind].tier, bought: 0 },
    ];
    const action = researchAction(s, "c-engineer")!;
    const n = run(s, action);
    expect(n.sieges[`0:${enemy.id}`].progress).toBe(
      kind === "engineers" ? 3 : 2,
    );
    expect(n.pieces[besieger.id].bonus).toBe(0);
    if (kind === "campaign") expect(n.pieces[marcher.id].bonus).toBe(5);
    assertInvariants(deserialize(serialize(n)));
  },
);

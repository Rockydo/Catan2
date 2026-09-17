import { it, expect } from "vitest";
import {
  CARDS,
  RESEARCH_RECRUITS,
  RESEARCH_SHIPS,
  RESEARCH_EXPEDITIONS,
  COSTS,
  RESEARCH_NAMES,
} from "../src/game/content";
import { fishingFixture } from "./maritime-fixture";
import { run } from "./helpers";
import { researchAction, researchUtility } from "../src/game/ai";
import { inventory, expeditionSites, routeSites } from "../src/game/selectors";
import { unknownAtVertex } from "../src/game/world";
import { serialize, deserialize, assertInvariants } from "../src/game/save";
import { hash } from "../src/game/world";
import { type Game } from "../src/game/types";
function prepared(kind: string) {
  const f = fishingFixture();
  f.s.players[0].hand = [
    { id: `c${f.s.nextId++}`, kind, tier: CARDS[kind].tier, bought: 0 },
  ];
  return f;
}
it.each([1, 2, 3, 4])(
  "tier %i never depletes, offers distinct cards and samples every pair without history weighting",
  (tier) => {
    let { s, home } = fishingFixture();
    const seen = new Map<string, number>();
    const counts = new Map<string, number>();
    const rng = s.rng;
    for (let i = 0; i < 1400; i++) {
      home = s.towns[home.id];
      home.stock = { ...COSTS[`Research ${RESEARCH_NAMES[tier]}`] };
      s = run(s, { type: "buy-research", tier });
      const kinds = s.researchChoice!.map((c) => c.kind);
      expect(new Set(kinds).size).toBe(2);
      expect(kinds.every((k) => CARDS[k].tier === tier)).toBe(true);
      const pair = kinds.sort().join("/");
      seen.set(pair, (seen.get(pair) ?? 0) + 1);
      kinds.forEach((k) => counts.set(k, (counts.get(k) ?? 0) + 1));
      s = run(s, { type: "choose-research", index: 0 });
    }
    expect(seen.size).toBe(28);
    // Deterministic sample sanity checks, not a claim of proof of randomness.
    expect([...seen.values()].every((n) => n >= 20 && n <= 90)).toBe(true);
    expect([...counts.values()].every((n) => n >= 280 && n <= 420)).toBe(true);
    expect(s.players[0].hand).toHaveLength(1400);
    expect(s.rng).toBe(rng);
    expect(s).not.toHaveProperty("decks");
    expect(s).not.toHaveProperty("discards");
    assertInvariants(deserialize(serialize(s)));
  },
  20000, // 2,800 immutable commands per tier; allow CPU contention in the full suite.
);
it("holdings and previous choices do not alter a future offer at the same random state", () => {
  const { s } = fishingFixture();
  const other = structuredClone(s);
  for (const kind of Object.keys(CARDS))
    other.players[1].hand.push({
      id: `c${other.nextId++}`,
      kind,
      tier: CARDS[kind].tier,
      bought: 0,
    });
  const a = run(s, { type: "buy-research", tier: 4 });
  const b = run(other, { type: "buy-research", tier: 4 });
  expect(a.researchChoice!.map((c) => c.kind)).toEqual(
    b.researchChoice!.map((c) => c.kind),
  );
  expect(deserialize(serialize(a)).researchChoice).toEqual(a.researchChoice);
});
it.each(Object.keys(RESEARCH_RECRUITS))(
  "%s grants and redeems exactly its promised units, including with the AI",
  (kind) => {
    let { s, home } = prepared(kind);
    expect(researchUtility(s, kind)).toBeGreaterThan(0);
    s = run(s, researchAction(s, s.players[0].hand[0].id)!);
    expect(deserialize(serialize(s))).toEqual(s);
    const reward = RESEARCH_RECRUITS[kind],
      before = inventory(s);
    const tile = s.vertices[home.vertex].tiles.find(
      (id) => s.tiles[id].resource !== "water",
    )!;
    s = run(s, {
      type: "recruit",
      town: home.id,
      tile,
      kind: reward.classes[0],
      tier: reward.tier,
      count: reward.count,
    });
    expect(Object.values(s.pieces)).toHaveLength(reward.count);
    expect(inventory(s)).toEqual(before);
    expect(s.players[0].bonuses.recruits).toHaveLength(0);
    assertInvariants(s);
  },
);
it.each(Object.keys(RESEARCH_SHIPS))(
  "%s grants economic hulls at the printed tier",
  (kind) => {
    let { s, home, water } = prepared(kind);
    expect(researchUtility(s, kind)).toBeGreaterThan(0);
    s = run(s, researchAction(s, s.players[0].hand[0].id)!);
    expect(deserialize(serialize(s))).toEqual(s);
    const reward = RESEARCH_SHIPS[kind],
      before = inventory(s);
    s = run(s, {
      type: "ship",
      town: home.id,
      tile: water,
      kind: "fishing",
      tier: reward.tier,
      count: reward.count,
    });
    expect(Object.values(s.pieces)).toHaveLength(reward.count);
    expect(inventory(s)).toEqual(before);
    expect(s.players[0].bonuses.ships).toHaveLength(0);
    expect(s.towns[home.id].launched).toBe(reward.count);
    assertInvariants(s);
  },
);
it.each(["survey", "prospecting", "frontier"])(
  "%s funds its exact expedition and any promised roads",
  (kind) => {
    let { s, home } = prepared(kind);
    home.vertex = Object.keys(s.vertices).find(
      (v) =>
        unknownAtVertex(s, v).length &&
        s.vertices[v].tiles.some((id) => s.tiles[id].resource !== "water"),
    )!;
    home.extensions = {};
    expect(researchUtility(s, kind)).toBeGreaterThan(0);
    s = run(s, researchAction(s, s.players[0].hand[0].id)!);
    expect(deserialize(serialize(s))).toEqual(s);
    const before = inventory(s),
      tiles = Object.keys(s.tiles).length;
    const tier = RESEARCH_EXPEDITIONS[kind];
    s = run(s, {
      type: "expedition",
      kind: "land",
      tier,
      vertex: expeditionSites(s, "land")[0],
      direction: 0,
    });
    expect(Object.keys(s.tiles)).toHaveLength(tiles + [0, 10, 20, 40][tier]);
    expect(inventory(s)).toEqual(before);
    if (kind === "frontier") {
      for (let i = 0; i < 6; i++)
        s = run(s, { type: "road", edge: routeSites(s, "road")[0] });
      expect(s.players[0].bonuses.routes).toBe(0);
      expect(inventory(s)).toEqual(before);
    }
    assertInvariants(s);
  },
);
it("Masonry Grant applies to one upgrade and expires through the usual bonus rules", () => {
  let { s, home } = prepared("masonry");
  home.level = home.turnLevel = 1;
  expect(researchUtility(s, "masonry")).toBeGreaterThan(0);
  s = run(s, researchAction(s, s.players[0].hand[0].id)!);
  expect(deserialize(serialize(s))).toEqual(s);
  expect(s.players[0].bonuses.discount).toEqual({
    kind: "civic",
    raw: 4,
    processed: 2,
  });
  const before = Object.values(inventory(s)).reduce((n, v) => n + v!, 0);
  s = run(s, { type: "city", town: home.id });
  expect(Object.values(inventory(s)).reduce((n, v) => n + v!, 0)).toBe(
    before - 1,
  );
  expect(s.players[0].bonuses.discount).toBeUndefined();
});
it("old paid offers and hands survive migration while all deck/discard records disappear", () => {
  const { s } = fishingFixture();
  s.researchChoice = ["civic", "grand", "muster"].map((kind) => ({
    id: `c${s.nextId++}`,
    tier: 4,
    kind,
    bought: 10,
  }));
  const old = Object.assign(s, {
    decks: { 1: [], 2: [], 3: [], 4: [] },
    discards: { 1: ["roads"], 2: [], 3: [], 4: [] },
  });
  const text = JSON.stringify({
    format: "catane-frontiers",
    version: 6,
    checksum: hash(JSON.stringify(old)).toString(16),
    game: old,
  });
  let n = deserialize(text);
  expect(n.researchChoice).toEqual(old.researchChoice);
  expect(n.deckRng).toBe(old.deckRng);
  expect(n.rng).toBe(old.rng);
  expect(n).not.toHaveProperty("decks");
  expect(n).not.toHaveProperty("discards");
  expect(deserialize(serialize(n))).toEqual(n);
  n = run(n, { type: "choose-research", index: 2 });
  expect(n.players[0].hand[0].kind).toBe("muster");
  expect(n.legacyResearchChoice).toBeUndefined();
  expect(run(n, { type: "buy-research", tier: 4 }).researchChoice).toHaveLength(
    2,
  );
});
it("modern save validation rejects duplicate or three-card offers", () => {
  const { s } = fishingFixture();
  const n = run(s, { type: "buy-research", tier: 1 });
  const duplicate = structuredClone(n);
  duplicate.researchChoice![1].kind = duplicate.researchChoice![0].kind;
  expect(() => assertInvariants(duplicate)).toThrow("Invalid research choice");
  n.researchChoice!.push({
    id: `c${n.nextId++}`,
    kind: "roads",
    tier: 1,
    bought: 10,
  });
  expect(() => assertInvariants(n)).toThrow("Invalid research choice");
});

import { syncEmergencyCoalition } from "../src/game/emergency-coalition";
import { expect, it } from "vitest";
import {
  frontierReturnSites,
  restoreOnFrontier,
  tryFrontierReturns,
} from "../src/game/frontier-returns";
import { rebellionFixture } from "./rebellion-fixture";
import { piece, run } from "./helpers";
import {
  addHexes,
  expeditionFootprint,
  unknownAtVertex,
  nextRandom,
} from "../src/game/world";
import { ownTowns, ownPieces, settlementSites } from "../src/game/selectors";
import { assertInvariants, serialize, deserialize } from "../src/game/save";
import { tryRebellions, startRebellion } from "../src/game/rebellions";
import { factionStrengths } from "../src/game/ai-strategy";
function frontier() {
  const s = rebellionFixture();
  s.active = 0;
  const v = Object.keys(s.vertices).find((v) => unknownAtVertex(s, v).length)!;
  const ids = expeditionFootprint(s, v, 3);
  addHexes(s, s.seed, ids);
  for (const id of ids) {
    delete s.tiles[id].biome;
    s.tiles[id].resource = "grain";
    s.tiles[id].number = 7;
    delete s.tiles[id].fish;
    delete s.tiles[id].whale;
  }
  return { s, ids };
}
it.each([1, 2, 3])(
  "restores %i settlements and troops only on newly revealed legal land",
  (n) => {
    const { s, ids } = frontier(),
      before = structuredClone(s);
    expect(restoreOnFrontier(s, 3, ids, n, n)).toBe(true);
    expect(ownTowns(s, 3)).toHaveLength(n);
    expect(ownPieces(s, 3)).toHaveLength(n);
    for (const t of ownTowns(s, 3)) {
      expect(t.level).toBe(1);
      expect(s.vertices[t.vertex].tiles.some((id) => ids.includes(id))).toBe(
        true,
      );
      const without = structuredClone(s);
      delete without.towns[t.id];
      expect(settlementSites(without, 3, true)).toContain(t.vertex);
    }
    expect(
      ownPieces(s, 3).every(
        (u) => u.tier === 1 && ids.includes(u.tile) && !u.naval,
      ),
    ).toBe(true);
    expect(ownTowns(s, 0)).toEqual(ownTowns(before, 0));
    expect(s.rng).toBe(before.rng);
    expect(s.deckRng).toBe(before.deckRng);
    assertInvariants(deserialize(serialize(s)));
  },
);
it("skips a water-only discovery instead of manufacturing land or returning an empty faction", () => {
  const { s, ids } = frontier();
  for (const id of ids) s.tiles[id].resource = "water";
  s.frontierRng = Array.from({ length: 1000 }, (_, i) => i).find(
    (seed) => nextRandom(seed)[0] < 0.1,
  )!;
  expect(frontierReturnSites(s, 3, ids)).toHaveLength(0);
  tryFrontierReturns(s, ids);
  expect(s.players[3].alive).toBe(false);
  expect(ownTowns(s, 3)).toHaveLength(0);
});
it("is deterministic and samples a ten percent return with all sizes possible", () => {
  const { s: base, ids } = frontier();
  let count = 0;
  const towns = new Set<number>(),
    troops = new Set<number>();
  for (let seed = 0; seed < 1000; seed++) {
    const s = structuredClone(base);
    s.frontierRng = seed;
    tryFrontierReturns(s, ids);
    if (!s.players[3].alive) continue;
    count++;
    towns.add(ownTowns(s, 3).length);
    troops.add(ownPieces(s, 3).length);
  }
  expect(count).toBeGreaterThan(70);
  expect(count).toBeLessThan(130);
  expect(towns).toEqual(new Set([1, 2, 3]));
  expect(troops).toEqual(new Set([1, 2, 3]));
  syncEmergencyCoalition(base);
  const a = structuredClone(base),
    b = deserialize(serialize(base));
  a.frontierRng = b.frontierRng = 0;
  tryFrontierReturns(a, ids);
  tryFrontierReturns(b, ids);
  expect(a).toEqual(b);
});
it("paid expeditions trigger frontier returns and resume the restored faction in turn order", () => {
  let s = rebellionFixture();
  s.active = 0;
  s.phase = "economy";
  s.frontierRng = Array.from({ length: 1000 }, (_, i) => i).find(
    (seed) => nextRandom(seed)[0] < 0.1,
  )!;
  const home = ownTowns(s, 0)[0];
  home.vertex = Object.keys(s.vertices).find(
    (v) =>
      unknownAtVertex(s, v).length &&
      s.vertices[v].tiles.some((id) => s.tiles[id].resource !== "water"),
  )!;
  s = run(s, {
    type: "expedition",
    vertex: home.vertex,
    kind: "land",
    tier: 3,
  });
  expect(s.players[3].alive).toBe(true);
  expect(s.events.some((e) => e.frontierReturn?.faction === 3)).toBe(true);
  assertInvariants(s);
});
function human(rank: number) {
  const s = rebellionFixture();
  s.active = 0;
  s.pieces = {};
  s.towers = {};
  for (const t of Object.values(s.towns)) {
    t.level = t.turnLevel = 1;
    t.extensions = {};
    t.wall = 0;
  }
  const home = ownTowns(s, 0)[0],
    other = ownTowns(s, 1)[0];
  for (let i = 0; i < 10; i++)
    piece(
      s,
      s.vertices[home.vertex].tiles.find(
        (id) => s.tiles[id].resource !== "water",
      )!,
      0,
      "heavy",
      4,
    );
  if (rank === 1)
    for (let i = 0; i < 25; i++)
      piece(
        s,
        s.vertices[other.vertex].tiles.find(
          (id) => s.tiles[id].resource !== "water",
        )!,
        1,
        "heavy",
        4,
      );
  const scores = factionStrengths({ ...s });
  expect(
    s.players
      .filter((p) => p.alive)
      .sort((a, b) => scores[b.id] - scores[a.id])
      .findIndex((p) => p.id === 0),
  ).toBe(rank);
  return s;
}
it.each([
  { rank: 0, chance: 0.08 },
  { rank: 1, chance: 0.04 },
])(
  "human own-turn rebellion chance is $chance, with 15–35% shares",
  ({ rank, chance }) => {
    const base = human(rank);
    let count = 0;
    const shares = new Set<number>();
    for (let seed = 0; seed < 1200; seed++) {
      const s = structuredClone(base);
      s.rebellionRng = seed;
      tryRebellions(s);
      const r = s.events.find((e) => e.rebellion)?.rebellion;
      if (!r) continue;
      expect(r.victim).toBe(0);
      count++;
      shares.add(r.share);
      assertInvariants(deserialize(serialize(s)));
    }
    expect(count).toBeGreaterThan(1200 * chance * 0.65);
    expect(count).toBeLessThan(1200 * chance * 1.35);
    expect(Math.min(...shares)).toBe(15);
    expect(Math.max(...shares)).toBe(35);
  },
);
it("never rolls the human rebellion on an AI turn and retains the one-town exemption", () => {
  const s = human(0);
  s.active = 2;
  s.rebellionRng = 0;
  tryRebellions(s);
  expect(s.events.some((e) => e.rebellion?.victim === 0)).toBe(false);
  const single = human(0);
  for (const t of ownTowns(single, 0).slice(1)) delete single.towns[t.id];
  single.rebellionRng = 0;
  tryRebellions(single);
  expect(single.players[3].alive).toBe(false);
});

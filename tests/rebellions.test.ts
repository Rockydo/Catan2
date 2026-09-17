import { chooseAIAction } from "../src/game/ai";
import { REALM_NAMES } from "../src/game/content";
import { describe, expect, it } from "vitest";
import { run } from "./helpers";
import { rebellionFixture } from "./rebellion-fixture";
import { beginTurn, eliminate, newGame } from "../src/game/engine";
import { startRebellion, tryRebellions } from "../src/game/rebellions";
import { strongestAI } from "../src/game/ai-expansion";
import { ownTowns, ownPieces, inventory } from "../src/game/selectors";
import { GOODS, type Game } from "../src/game/types";
import { nextRandom } from "../src/game/world";
import { assertInvariants, serialize, deserialize } from "../src/game/save";

function seedFor(first: boolean, second = false) {
  for (let seed = 0; seed < 100000; seed++) {
    const [a, next] = nextRandom(seed),
      [b] = nextRandom(next);
    if (a < 0.1 === first && b < 0.05 === second) return seed;
  }
  throw Error("No deterministic seed");
}
function worldGoods(s: Game) {
  return GOODS.map((g) =>
    Object.values(s.towns).reduce((n, t) => n + (t.stock[g] ?? 0), 0),
  );
}

describe("AI regional rebellions", () => {
  it("revives a faction with proportional goods, units, research and intact town attachments, without touching the human", () => {
    const s = rebellionFixture(),
      before = structuredClone(s);
    const stock = inventory(s, 1),
      human = ownTowns(s, 0);
    expect(startRebellion(s, 1, 3, 0.35)).toBe(true);
    expect(s.players[3].alive).toBe(true);
    expect(ownTowns(s, 3)).toHaveLength(1);
    expect(ownTowns(s, 1)).toHaveLength(1);
    expect(ownTowns(s, 0)).toEqual(human);
    for (const good of GOODS)
      expect(inventory(s, 3)[good] ?? 0).toBe(
        Math.round((stock[good] ?? 0) * 0.35),
      );
    expect(worldGoods(s)).toEqual(worldGoods(before));
    expect(s.players[3].hand).toHaveLength(4);
    expect(s.players[1].hand).toHaveLength(6);
    expect(ownPieces(s, 3).filter((u) => u.naval)).toHaveLength(2);
    expect(ownPieces(s, 3).filter((u) => !u.naval)).toHaveLength(6);
    expect(Object.keys(s.pieces)).toEqual(Object.keys(before.pieces));
    const town = ownTowns(s, 3)[0];
    expect(town.extensions).toEqual(before.towns[town.id].extensions);
    expect(town.wall).toBe(before.towns[town.id].wall);
    expect(s.towers[town.vertex].owner).toBe(3);
    expect(s.rng).toBe(before.rng);
    expect(s.deckRng).toBe(before.deckRng);
    assertInvariants(deserialize(serialize(s)));
  });
  it("checks only the active AI, never another leader on its turn", () => {
    const s = rebellionFixture();
    s.active = 2;
    s.rebellionRng = seedFor(true);
    beginTurn(s);
    expect(
      s.events
        .filter((e) => e.rebellion)
        .every((e) => e.rebellion!.victim === 2),
    ).toBe(true);
    expect(s.events.some((e) => e.rebellion?.victim === 1)).toBe(false);
    assertInvariants(s);
  });
  it("can hit the second strongest on its own turn", () => {
    const s = rebellionFixture();
    s.active = 2;
    s.rebellionRng = Array.from({ length: 1000 }, (_, i) => i).find(
      (seed) => nextRandom(seed)[0] < 0.05,
    )!;
    tryRebellions(s);
    expect(s.events.at(-1)?.rebellion?.victim).toBe(2);
    assertInvariants(s);
  });
  it("does nothing without an eliminated AI or after the game ends", () => {
    for (const mode of ["none", "finished"]) {
      const s = rebellionFixture();
      s.rebellionRng = Array.from({ length: 1000 }, (_, i) => i).find(
        (seed) => nextRandom(seed)[0] < 0.05,
      )!;
      if (mode === "none") s.players[3].control = "human";
      else s.phase = "finished";
      const before = structuredClone(s);
      tryRebellions(s);
      expect(s).toEqual(before);
    }
  });
  it("protects one-town factions and rejects shares outside each faction's range", () => {
    const s = rebellionFixture();
    expect(startRebellion(s, 0, 3, 0.4)).toBe(false);
    for (const town of ownTowns(s, 1).slice(1)) delete s.towns[town.id];
    const before = structuredClone(s);
    expect(startRebellion(s, 1, 3, 0.35)).toBe(false);
    expect(s).toEqual(before);
  });
  it("has no cooldown: a revived faction can later suffer its own rebellion", () => {
    const s = rebellionFixture();
    expect(startRebellion(s, 1, 3, 0.4)).toBe(true);
    const town = ownTowns(s, 2)[0];
    town.owner = 3;
    for (const t of ownTowns(s, 2)) delete s.towns[t.id];
    eliminate(s);
    expect(s.players[2].alive).toBe(false);
    expect(startRebellion(s, 3, 2, 0.4)).toBe(true);
    expect(s.players[2].alive).toBe(true);
    expect(s.events.filter((e) => e.rebellion)).toHaveLength(2);
    assertInvariants(s);
  });
  it("restores at most one faction per turn even with multiple eliminated seats", () => {
    let s = newGame(
      "single-rebellion",
      REALM_NAMES.map((name) => ({ name, control: "standard" })),
    );
    while (s.phase.startsWith("setup")) s = run(s, chooseAIAction(s));
    for (const owner of [8, 9])
      for (const town of ownTowns(s, owner)) delete s.towns[town.id];
    eliminate(s);
    s.active = strongestAI({ ...s })[0];
    s.rebellionRng = Array.from({ length: 1000 }, (_, i) => i).find(
      (seed) => nextRandom(seed)[0] < 0.05,
    )!;
    tryRebellions(s);
    expect(s.events.filter((e) => e.rebellion)).toHaveLength(1);
    expect(s.players.filter((p) => !p.alive)).toHaveLength(1);
    assertInvariants(s);
  });

  it("replays deterministically across save/reload and accepts saves without a rebellion RNG", () => {
    const s = rebellionFixture();
    delete s.rebellionRng;
    const loaded = deserialize(serialize(s));
    tryRebellions(s);
    tryRebellions(loaded);
    expect(loaded).toEqual(s);
    const invalid = structuredClone(s);
    invalid.rebellionRng = -1;
    expect(() => assertInvariants(invalid)).toThrow();
  });
  it.each([
    { owner: 1, chance: 0.1 },
    { owner: 2, chance: 0.05 },
  ])("samples each AI's own-turn chance: $chance", ({ owner, chance }) => {
    const base = rebellionFixture();
    base.active = owner;
    let count = 0;
    const shares = new Set<number>();
    for (let seed = 0; seed < 1200; seed++) {
      const s = structuredClone(base);
      s.rebellionRng = seed;
      tryRebellions(s);
      const r = s.events.find((e) => e.rebellion)?.rebellion;
      if (!r) continue;
      expect(r.victim).toBe(owner);
      count++;
      shares.add(r.share);
    }
    expect(count).toBeGreaterThan(1200 * chance * 0.65);
    expect(count).toBeLessThan(1200 * chance * 1.35);
    expect(Math.min(...shares)).toBe(25);
    expect(Math.max(...shares)).toBe(45);
  });
});

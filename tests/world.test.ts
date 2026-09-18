import { climateTerrain } from "../src/game/climate";
import { describe, it, expect } from "vitest";
import {
  randomAt,
  discoveryProbability,
  generateWorld,
  generateHex,
  addHexes,
  expeditionFootprint,
  unknownAtVertex,
  distance,
  neighbors,
} from "../src/game/world";
import { newGame, applyCommand } from "../src/game/engine";
import { assertInvariants, serialize, deserialize } from "../src/game/save";
import { chooseAIAction } from "../src/game/ai";
describe("world and setup", () => {
  it("creates exactly 125 unique climate hexes and consistent shared topology", () => {
    for (let seed = 0; seed < 30; seed++) {
      const s = newGame(`seed-${seed}`);
      expect(Object.keys(s.tiles)).toHaveLength(125);
      assertInvariants(s);
      expect(
        Object.values(s.tiles).every((t) => t.number >= 2 && t.number <= 12),
      ).toBe(true);
      expect(Object.values(s.edges).every((e) => e.tiles.length <= 2)).toBe(
        true,
      );
    }
  });
  it("generates ordinary and Fish ports but never a Gold port", () => {
    const ports = Object.values(generateWorld("port-catalogue", 2000).edges)
      .map((e) => e.harbor)
      .filter(Boolean);
    expect(ports).not.toContain("gold");
    expect(ports).toContain("fish");
    expect(ports).toContain("generic");
  });
  it("converts a saved Gold port to generic without changing its site or world", () => {
    const s = newGame("gold-port-migration");
    const edge = Object.values(s.edges).find((e) => e.harbor)!;
    edge.harbor = "gold";
    const restored = deserialize(serialize(s));
    expect(restored.edges[edge.id]).toEqual({ ...edge, harbor: "generic" });
    expect(restored.tiles).toEqual(s.tiles);
    expect(restored.players).toEqual(s.players);
    expect(restored.rng).toBe(s.rng);
    addHexes(s, s.seed, []);
    expect(s.edges[edge.id].harbor).toBe("generic");
  });
  it("reproduces the same seed and varies between seeds", () => {
    expect(generateWorld("a")).toEqual(generateWorld("a"));
    expect(generateWorld("a")).not.toEqual(generateWorld("b"));
  });
  it("assigns seven and water without reshuffling", () => {
    const tiles = Object.values(generateWorld("probabilities", 1200).tiles);
    expect(tiles.filter((t) => t.number === 7).length).toBeGreaterThan(60);
    expect(tiles.filter((t) => t.resource === "water").length).toBeGreaterThan(
      520,
    );
    expect(tiles.filter((t) => t.resource === "water").length).toBeLessThan(
      680,
    );
  });
  it.each([1, 2, 3])(
    "reveals exactly the expedition count at tier %s without changing old tiles",
    (tier) => {
      const w = generateWorld("expedition"),
        v = Object.keys(w.vertices).find((v) => unknownAtVertex(w, v).length)!;
      const before = JSON.stringify(w.tiles),
        ids = expeditionFootprint(w, v, tier, 2);
      expect(ids).toHaveLength([0, 10, 20, 40][tier]);
      expect(new Set(ids).size).toBe(ids.length);
      addHexes(w, "expedition", ids);
      expect(Object.keys(w.tiles)).toHaveLength(125 + ids.length);
      for (const [id, t] of Object.entries(JSON.parse(before)))
        expect(w.tiles[id]).toEqual(t);
    },
  );
  it("generation does not depend on reveal order", () => {
    const a = generateWorld("order"),
      b = generateWorld("order"),
      ids = ["20,0", "21,0", "20,1"];
    addHexes(a, "order", ids);
    addHexes(b, "order", [...ids].reverse());
    for (const id of ids) expect(a.tiles[id]).toEqual(b.tiles[id]);
  });
  it("uses correct hex distances", () => {
    for (const n of neighbors("0,0")) expect(distance("0,0", n)).toBe(1);
    expect(distance("0,0", "4,-2")).toBe(4);
  });
  it("completes snake setup without cheating and gives only second-town raw goods", () => {
    let s = newGame("setup");
    const order: number[] = [];
    while (s.phase.startsWith("setup")) {
      if (s.phase === "setup-town") order.push(s.active);
      const r = applyCommand(s, chooseAIAction(s));
      expect(r.ok, r.error).toBe(true);
      s = r.state;
    }
    expect(order).toEqual([0, 1, 2, 3, 4, 4, 3, 2, 1, 0]);
    expect(Object.values(s.towns)).toHaveLength(10);
    for (const p of s.players) {
      const ts = Object.values(s.towns).filter((t) => t.owner === p.id);
      expect(Object.values(ts[0].stock)).toHaveLength(0);
      expect(
        Object.values(ts[1].stock).reduce((a, b) => a + (b ?? 0), 0),
      ).toBeGreaterThan(0);
    }
    assertInvariants(s);
  });
  it("rejects overlapping placements atomically", () => {
    let s = newGame("atomic");
    s = applyCommand(s, chooseAIAction(s)).state;
    const before = JSON.stringify(s);
    const r = applyCommand(s, { type: "setup-town", vertex: s.setupVertex });
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r.state)).toBe(before);
  });
});

it("uses climate probabilities for expeditions without altering revealed terrain", () => {
  const seed = "climate-threshold",
    w = generateWorld(seed, 250);
  const previous = structuredClone(w.tiles);
  addHexes(w, seed, ["20,0", "21,0", "22,0", "23,0"]);
  for (const tile of Object.values(w.tiles)) {
    expect(tile).toMatchObject(climateTerrain(seed, tile.id, tile.climate!));
    if (previous[tile.id]) expect(tile).toEqual(previous[tile.id]);
  }
});

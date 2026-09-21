import { describe, it, expect } from "vitest";
import { aiGoldSupport, supportGoldPerTown } from "../src/game/ai-support";
import { production } from "../src/game/economy";
import { canApplyCommand } from "../src/game/engine";
import { factionStrengths } from "../src/game/ai-strategy";
import { serialize, deserialize, assertInvariants } from "../src/game/save";
import { rollReport } from "../src/ui/roll-report";
import { run, piece } from "./helpers";
import { supportFixture } from "./ai-support-fixture";

describe("gold support against a dominant human faction", () => {
  it.each([
    [0, 0],
    [39.99, 0],
    [40, 0],
    [40.000001, 1],
    [44.999999, 1],
    [45, 2],
    [49.999999, 2],
    [50, 3],
    [55, 4],
    [60, 5],
    [65, 6],
    [70, 7],
    [75, 8],
    [80, 9],
    [85, 10],
    [90, 11],
    [95, 12],
    [99.99, 12],
  ])("at %s%% grants %s gold per site", (share, gold) => {
    for (const scale of [1, 1.3, 1000])
      expect(supportGoldPerTown(share * scale, 100 * scale)).toBe(gold);
  });

  it("grants every AI its own per-site payment on every faction's dice roll", () => {
    let { s, towns } = supportFixture();
    expect(aiGoldSupport(s)).toBe(3); // Human: 84 of 168 power.
    const before = structuredClone(s);
    expect(canApplyCommand(s, { type: "roll" })).toBe(true);
    expect(s).toEqual(before);
    for (let actor = 0; actor < s.players.length; actor++) {
      s.active = actor;
      s.phase = "roll";
      s = run(s, { type: "roll" });
      for (const p of s.players) {
        expect(s.production[p.id]).toEqual(p.id === 0 ? {} : { gold: 3 });
        expect(s.towns[towns[p.id].id].stock.gold ?? 0).toBe(
          p.id === 0 ? 0 : 3 * (actor + 1),
        );
      }
      expect(s.productionSupport).toEqual({
        perTown: 3,
        gold: { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3, 7: 3 },
      });
      assertInvariants(s);
    }
  });

  it("counts cities once, pays multiple towns separately, and ignores blockade, season and tile number", () => {
    const { s, towns } = supportFixture(100);
    const extra = {
      ...structuredClone(towns[1]),
      id: `t${s.nextId++}`,
      vertex: s.tiles["0,-2"].vertices[0],
      level: 4,
      turnLevel: 4,
    };
    s.towns[extra.id] = extra;
    piece(s, s.vertices[extra.vertex].tiles[0], 0);
    s.calendar = { startRound: s.round, startSeason: "winter" };
    const rate = aiGoldSupport(s);
    for (const die of [2, 7, 12]) {
      production(s, die);
      expect(s.productionSupport?.gold[1]).toBe(rate * 2);
      expect(s.production[1]).toEqual({ gold: rate * 2 });
    }
    expect(s.towns[towns[1].id].stock).toEqual({ gold: rate * 3 });
    expect(extra.stock).toEqual({ gold: rate * 3 });
  });

  it("stops immediately at 40% and re-evaluates fresh power without granting anything on load", () => {
    const { s } = supportFixture(22);
    expect(aiGoldSupport(s)).toBe(0); // 56/140, exactly 40%.
    factionStrengths(s); // Populate the cache before mutating this scenario.
    const unit = piece(s, "0,2", 0);
    production(s, 7);
    expect(s.productionSupport?.perTown).toBe(1);
    delete s.pieces[unit.id];
    production(s, 7);
    expect(s.productionSupport).toBeUndefined();
    expect(
      Object.values(s.production).every(
        (goods) => Object.keys(goods).length === 0,
      ),
    ).toBe(true);
    expect(deserialize(serialize(s)).towns).toEqual(s.towns);
  });

  it("does not activate for a dominant AI or pool smaller human factions", () => {
    const { s } = supportFixture();
    s.players[0].control = "hard";
    s.players[1].control = "human";
    expect(aiGoldSupport(s)).toBe(0);
    production(s, 7);
    expect(s.productionSupport).toBeUndefined();
    s.players[0].control = "human";
    expect(aiGoldSupport(s, [30, 30, 10, 10, 5, 5, 5, 5])).toBe(0);
    expect(aiGoldSupport(s, [45, 10, 10, 10, 10, 5, 5, 5])).toBe(2);
    // A human over 40% qualifies even if an AI is stronger.
    expect(aiGoldSupport(s, [42, 1, 52, 1, 1, 1, 1, 1])).toBe(1);
  });

  it("never pays human or eliminated factions, regardless of seat or difficulty", () => {
    const { s, towns } = supportFixture();
    s.players[1].control = "human";
    s.players[2].alive = false;
    delete s.towns[towns[2].id];
    s.players[3].control = "easy";
    s.players[4].control = "hard";
    const rate = aiGoldSupport(s);
    production(s, 7);
    for (const id of [0, 1, 2]) expect(s.production[id]).toEqual({});
    for (const id of [3, 4, 5, 6, 7])
      expect(s.production[id]).toEqual({ gold: rate });
    for (const p of s.players) p.control = "standard";
    expect(aiGoldSupport(s)).toBe(0);
  });

  it("keeps support receipts for replay after spending, saves them, and rejects corrupt totals", () => {
    const { s } = supportFixture();
    const next = run(s, { type: "roll" });
    for (const town of Object.values(next.towns)) town.stock = {};
    const loaded = deserialize(serialize(next));
    expect(loaded.productionSupport).toEqual(next.productionSupport);
    const report = rollReport(loaded)!;
    expect(report.players[0].supportGold).toBe(0);
    for (const player of report.players.slice(1)) {
      expect(player.supportGold).toBe(3);
      expect(player.goods.gold).toBe(3);
    }
    expect(report.total).toBe(21);
    loaded.productionSupport!.gold[1] = 6;
    expect(() => deserialize(serialize(loaded))).toThrow(
      "Invalid AI support receipt",
    );
  });
});

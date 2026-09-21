import { describe, it, expect } from "vitest";
import {
  dominanceSupport,
  supportGoldPerTown,
  supportBarsPerCity,
} from "../src/game/ai-support";
import { production } from "../src/game/economy";
import { canApplyCommand } from "../src/game/engine";
import { factionStrengths } from "../src/game/ai-strategy";
import { serialize, deserialize, assertInvariants } from "../src/game/save";
import { rollReport } from "../src/ui/roll-report";
import { run, piece } from "./helpers";
import { supportFixture } from "./ai-support-fixture";

describe("support against any dominant faction", () => {
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
    expect(dominanceSupport(s)?.perTown ?? 0).toBe(3); // Human: 84 of 168 power.
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
        perCity: 0,
        goldbars: {},
        gold: { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3, 7: 3 },
      });
      assertInvariants(s);
    }
  });

  it("counts cities once, pays multiple towns separately, and ignores blockade, season and tile number", () => {
    const { s, towns } = supportFixture(70);
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
    const rate = dominanceSupport(s)?.perTown ?? 0;
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
    expect(dominanceSupport(s)?.perTown ?? 0).toBe(0); // 56/140, exactly 40%.
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

  it("uses the strongest individual faction, never pooled shares or control type", () => {
    const { s } = supportFixture();
    expect(dominanceSupport(s, [30, 30, 10, 10, 5, 5, 5, 5])).toBeNull();
    expect(dominanceSupport(s, [45, 10, 10, 10, 10, 5, 5, 5])).toEqual({
      leader: 0,
      perTown: 2,
      perCity: 0,
    });
    expect(dominanceSupport(s, [42, 1, 52, 1, 1, 1, 1, 1])).toEqual({
      leader: 2,
      perTown: 3,
      perCity: 0,
    });
    expect(dominanceSupport(s, [45, 45, 2, 2, 2, 2, 1, 1])?.leader).toBe(0);
    for (const control of ["human", "easy", "standard", "hard"] as const) {
      for (const p of s.players) p.control = control;
      expect(dominanceSupport(s)?.leader).toBe(0);
      production(s, 7);
      expect(s.production[0]).toEqual({});
      for (const p of s.players.slice(1))
        expect(s.production[p.id]).toEqual({ gold: 3 });
    }
  });

  it("pays human and AI opponents of a dominant AI, excluding eliminated factions", () => {
    const { s, towns } = supportFixture();
    s.players[0].control = "hard";
    s.players[1].control = "human";
    s.players[2].alive = false;
    delete s.towns[towns[2].id];
    const rate = dominanceSupport(s)!.perTown;
    production(s, 7);
    for (const id of [0, 2]) expect(s.production[id]).toEqual({});
    for (const id of [1, 3, 4, 5, 6, 7])
      expect(s.production[id]).toEqual({ gold: rate });
    const scores = [40, 30, 10000, 6, 6, 6, 6, 6];
    expect(dominanceSupport(s, scores)).toBeNull(); // Dead faction contributes no power.
  });

  it.each([
    [0, 0],
    [40, 0],
    [59.999999, 0],
    [60, 0],
    [60.000001, 1],
    [64.999999, 1],
    [65, 2],
    [69.999999, 2],
    [70, 3],
    [75, 4],
    [80, 5],
    [85, 6],
    [90, 7],
    [95, 8],
    [99.99, 8],
  ])("at %s%% grants %s Gold bars per city", (share, bars) => {
    for (const scale of [1, 1.3, 1000])
      expect(supportBarsPerCity(share * scale, 100 * scale)).toBe(bars);
  });

  it("adds bars once per city of any tier, never per settlement, on every roll", () => {
    let { s, towns } = supportFixture(100);
    s.players[0].control = "hard";
    s.players[1].control = "human";
    for (const id of [1, 2, 3]) towns[id].level = towns[id].turnLevel = id + 1;
    expect(dominanceSupport(s)).toEqual({ leader: 0, perTown: 6, perCity: 2 });
    const original = structuredClone(s);
    for (let actor = 0; actor < s.players.length; actor++) {
      s.active = actor;
      s.phase = "roll";
      s = run(s, { type: "roll" });
      for (const p of s.players) {
        const expected =
          p.id === 0 ? {} : p.id <= 3 ? { gold: 6, goldbars: 2 } : { gold: 6 };
        expect(s.production[p.id]).toEqual(expected);
        expect(s.towns[towns[p.id].id].stock.goldbars ?? 0).toBe(
          p.id >= 1 && p.id <= 3 ? 2 * (actor + 1) : 0,
        );
      }
      assertInvariants(s);
    }
    expect(original.towns[towns[1].id].stock).toEqual({});
    const loaded = deserialize(serialize(s));
    expect(loaded.productionSupport).toEqual(s.productionSupport);
    expect(rollReport(loaded)!.players[1]).toMatchObject({
      supportGold: 6,
      supportBars: 2,
    });
    loaded.productionSupport!.goldbars![1] = 3;
    expect(() => deserialize(serialize(loaded))).toThrow(
      "Invalid support receipt",
    );
  });

  it("recomputes both rates and recipients when the leader changes", () => {
    const { s, towns } = supportFixture(100);
    towns[1].level = towns[1].turnLevel = 2;
    production(s, 7);
    expect(s.productionSupport?.perCity).toBe(3);
    for (const unit of Object.values(s.pieces)) unit.owner = 1;
    production(s, 7);
    expect(s.production[1]).toEqual({});
    expect(s.production[0].gold).toBe(7);
    expect(s.production[0].goldbars).toBeUndefined();
    s.pieces = {};
    production(s, 7);
    expect(s.productionSupport).toBeUndefined();
    expect(towns[1].stock.goldbars).toBe(3); // Existing stores are retained.
  });

  it("loads old gold-only receipts without paying again and grants bars on the next roll", () => {
    const { s, towns } = supportFixture(100);
    towns[1].level = towns[1].turnLevel = 2;
    s.dice = [3, 4];
    s.production = { 1: { gold: 7 } };
    s.productionSupport = { perTown: 7, gold: { 1: 7 } };
    const loaded = deserialize(serialize(s));
    expect(loaded.towns).toEqual(s.towns);
    expect(rollReport(loaded)!.players[1].supportBars).toBe(0);
    production(loaded, 7);
    expect(loaded.towns[towns[1].id].stock).toEqual({ gold: 7, goldbars: 3 });
  });

  it("does not pay in setup or after the game ends", () => {
    const { s } = supportFixture(100);
    s.phase = "setup-town";
    expect(dominanceSupport(s)).toBeNull();
    s.phase = "finished";
    expect(dominanceSupport(s)).toBeNull();
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
      "Invalid support receipt",
    );
  });
});

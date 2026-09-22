import { describe, it, expect } from "vitest";
import { harvestFixture } from "./roll-fixture";
import { run } from "./helpers";
import { rollReport } from "../src/ui/roll-report";
import { inventory, ownTowns, blockAt } from "../src/game/selectors";
import { landAtVertex } from "../src/game/world";
import { GOODS, PROCESSED } from "../src/game/types";

describe("production receipt snapshots", () => {
  it("matches real deliveries for every faction, including processed goods and an empty harvest", () => {
    const before = harvestFixture(),
      after = run(before, { type: "roll" }),
      report = rollReport(after, true)!;
    for (const player of report.players) {
      for (const good of GOODS)
        expect(player.goods[good] ?? 0).toBe(
          (inventory(after, player.id)[good] ?? 0) -
            (inventory(before, player.id)[good] ?? 0),
        );
      expect(player.total).toBe(
        Object.values(player.goods).reduce((n, v) => n + (v ?? 0), 0),
      );
    }
    expect(report.players[3].total).toBe(0);
    expect(PROCESSED.some((g) => (report.players[0].goods[g] ?? 0) > 0)).toBe(
      true,
    );
    const blocked = landAtVertex(before, ownTowns(before, 1)[0].vertex)[0];
    expect(blockAt(before, blocked, 1)).toBe(true);
    expect(report.tiles).not.toContain(blocked);
    expect(report.total).toBe(report.players.reduce((n, p) => n + p.total, 0));
  });
  it("keeps immutable receipts when goods are spent and does not invent historical source locations", () => {
    const s = run(harvestFixture(), { type: "roll" }),
      report = rollReport(s, true)!,
      snapshot = structuredClone(report);
    for (const town of Object.values(s.towns)) town.stock = {};
    s.production[0] = {};
    s.dice![0] = 1;
    expect(report).toEqual(snapshot);
    expect(rollReport(s)!.tiles).toBeNull();
  });
  it("handles rolls with no production and has no report before a roll", () => {
    const s = harvestFixture();
    expect(rollReport(s)).toBeNull();
    const roll = run(s, { type: "roll" }),
      number = roll.dice![0] + roll.dice![1];
    for (const t of Object.values(s.tiles)) t.number = number === 7 ? 8 : 7;
    const report = rollReport(run(s, { type: "roll" }), true)!;
    expect(report.total).toBe(0);
    expect(report.tiles).toEqual([]);
  });
});

it("restores recorded receipts without inspecting troops or recalculating production", () => {
  const s = run(harvestFixture(), { type: "roll" });
  const recorded = structuredClone(s.production);
  s.pieces = new Proxy(s.pieces, {
    ownKeys() {
      throw new Error("Historical receipt scanned troops");
    },
  });
  const report = rollReport(s)!;
  for (const player of report.players)
    expect(player.goods).toEqual(recorded[player.id]);
  expect(report.tiles).toBeNull();
});

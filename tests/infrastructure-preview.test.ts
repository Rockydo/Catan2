import { describe, expect, it } from "vitest";
import { generateHex } from "../src/game/world";
import type { Hex } from "../src/game/types";
import {
  SPECIALIST_BRANCHES,
  specialistId,
} from "../src/game/infrastructure-specialists";
import { seasonalProfile, SEASONS } from "../src/game/seasons";
import {
  weatherComparison,
  withoutInvestment,
} from "../src/ui/infrastructure-preview";
function forest(big = false): Hex {
  return {
    ...generateHex("preview", "0,0"),
    biome: big ? "old-growth-forest" : "woods",
    climate: "temperate-rainforest",
    resource: "lumber",
    geography: {
      elevation: 0.4,
      region: "test",
      access: "normal",
      projects: {},
      fauna: {},
    },
  };
}
function shelter(t: Hex, tier = 1) {
  const b = SPECIALIST_BRANCHES.find((b) => b.id === "covered-timber")!;
  for (let i = 1; i <= tier; i++)
    t.geography!.projects![specialistId(b, i)] = { owner: 0, born: 1, tier: 1 };
  return specialistId(b, tier);
}
describe("honest infrastructure previews", () => {
  it("shows the exact remaining loss and no rounded gain for a small forest", () => {
    const before = forest(),
      after = structuredClone(before);
    shelter(after);
    const c = weatherComparison(before, after, 0, "wet");
    expect(c.loss[0].before).toBeCloseTo(25);
    expect(c.loss[0].after).toBeCloseTo(22.5);
    expect(c.recoveryBefore).toBe(0);
    expect(c.recoveryAfter).toBe(1);
    expect(c.improved).toBe(false);
    for (const s of c.seasons) expect(s.from).toEqual(s.to);
  });
  it("shows real wet-spell recovery but unchanged normal production", () => {
    const before = forest(true),
      after = structuredClone(before);
    shelter(after);
    expect(seasonalProfile(after, 0)).toEqual(seasonalProfile(before, 0));
    const c = weatherComparison(before, after, 0, "wet");
    expect(c.improved).toBe(true);
    expect(c.seasons.some((s) => s.to.lumber! > s.from.lumber!)).toBe(true);
    expect(weatherComparison(before, after, 1, "wet").improved).toBe(false);
  });
  it("explains completed branches against their absence and preserves unrelated works", () => {
    const t = forest(true),
      id = shelter(t, 4);
    t.geography!.projects!.forestry = { owner: 0, born: 1, tier: 2 };
    const baseline = withoutInvestment(t, id);
    expect(Object.keys(baseline.geography!.projects!)).toEqual(["forestry"]);
    expect(Object.keys(t.geography!.projects!)).toHaveLength(5);
    expect(weatherComparison(baseline, t, 0, "wet").recoveryAfter).toBe(2);
    const withoutMain = withoutInvestment(t, "forestry");
    expect(Object.keys(withoutMain.geography!.projects!)).toHaveLength(4);
    for (const season of SEASONS)
      expect(seasonalProfile(t, 0)[season].lumber).toBeGreaterThanOrEqual(
        seasonalProfile(withoutMain, 0)[season].lumber ?? 0,
      );
  });
});

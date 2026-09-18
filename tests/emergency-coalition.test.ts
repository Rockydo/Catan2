import { describe, it, expect } from "vitest";
import { grandAllianceFixture } from "./alliance-fixture";
import { piece, run } from "./helpers";
import { syncEmergencyCoalition } from "../src/game/emergency-coalition";
import { emergencyTarget, allianceLock, friendly } from "../src/game/relations";
import {
  factionStrengths,
  warTarget,
  leavesTownExposed,
} from "../src/game/ai-strategy";
import { assertInvariants, deserialize, serialize } from "../src/game/save";
import { applyCommand, canApplyCommand } from "../src/game/engine";
import { aiExpeditionAllowed } from "../src/game/ai-expansion";
import {
  chooseAIAction,
  shouldAcceptTrade,
  playerTradeToward,
} from "../src/game/ai";
import { landAtVertex, distance } from "../src/game/world";

function world(leader = 3, troops = 22) {
  const { s, towns } = grandAllianceFixture();
  s.pieces = {};
  for (const tile of Object.values(s.tiles)) {
    tile.resource = "snow";
    tile.biome = "snow-plain";
  }
  for (const town of towns) {
    town.level = town.turnLevel = 1;
    town.wall = 0;
    town.stock = {};
  }
  for (let i = 0; i < troops; i++) piece(s, "0,2", leader, "heavy");
  return { s, towns };
}

describe("mandatory global survival coalition", () => {
  it("does not trigger at exactly 40%, triggers above it, and includes every distant survivor", () => {
    const { s } = world();
    const scores = factionStrengths(s);
    expect(scores[3] / scores.reduce((a, b) => a + b, 0)).toBe(0.4);
    syncEmergencyCoalition(s);
    expect(s.alliances?.length ?? 0).toBe(0);
    piece(s, "0,2", 3, "heavy");
    syncEmergencyCoalition(s);
    expect(s.alliances).toHaveLength(1);
    expect(s.alliances![0]).toMatchObject({
      emergency: "locked",
      threat: 3,
      members: [0, 1, 2, 4, 5, 6, 7],
    });
    assertInvariants(s);
  });
  it.each([0, 3])(
    "replaces locked pacts and invitations when faction %i dominates, human or AI",
    (leader) => {
      const { s } = world(leader, 80);
      s.alliances = [
        { id: "a9000", members: [0, 1], threat: 3, lockedUntil: 100 },
        { id: "a9001", members: [2, 4], threat: 3, lockedUntil: 100 },
      ];
      s.allianceOffer = { from: 5, to: 6, threat: leader };
      syncEmergencyCoalition(s);
      expect(s.alliances).toHaveLength(1);
      expect(s.alliances![0].threat).toBe(leader);
      expect(s.allianceOffer).toBeUndefined();
      for (const p of s.players.filter((p) => p.id !== leader)) {
        s.active = p.id;
        expect(allianceLock(s, p.id)).toBe(Infinity);
        expect(applyCommand(s, { type: "leave-alliance" }).error).toMatch(
          /20%/,
        );
        for (const other of s.players)
          expect(warTarget(s, other.id)).toBe(other.id === leader);
      }
    },
  );
  it("holds at 21%, releases at exactly 20%, and does not relock below 40%", () => {
    const { s } = world(3, 80);
    syncEmergencyCoalition(s);
    s.pieces = {};
    for (let i = 0; i < 7; i++) piece(s, "0,2", 3, "heavy");
    for (let i = 0; i < 6; i++) piece(s, "-5,0", 0, "heavy");
    syncEmergencyCoalition(s);
    expect(emergencyTarget(s, 0)).toBe(3);
    delete s.pieces[Object.values(s.pieces).find((u) => u.owner === 3)!.id];
    const scores = factionStrengths({ ...s });
    expect(scores[3] / scores.reduce((a, b) => a + b, 0)).toBe(0.2);
    syncEmergencyCoalition(s);
    expect(emergencyTarget(s, 0)).toBeUndefined();
    expect(allianceLock(s, 0)).toBe(0);
    const next = run(s, { type: "leave-alliance" });
    expect(friendly(next, 0, 1)).toBe(false);
    expect(friendly(next, 1, 2)).toBe(true);
    assertInvariants(deserialize(serialize(next)));
  });
  it("migrates an existing save immediately and is idempotent without touching assets or RNG", () => {
    const { s } = world(3, 80);
    const loaded = deserialize(serialize(s));
    expect(emergencyTarget(loaded, 0)).toBe(3);
    for (const key of [
      "towns",
      "pieces",
      "routes",
      "rng",
      "round",
      "active",
      "actions",
    ] as const)
      expect(loaded[key]).toEqual(s[key]);
    expect(deserialize(serialize(loaded))).toEqual(loaded);
    assertInvariants(loaded);
  });
  it("activates after a committed action without spending time or mutating command previews", () => {
    const { s } = world(3, 80);
    s.phase = "roll";
    const before = JSON.stringify(s);
    expect(canApplyCommand(s, { type: "roll" })).toBe(true);
    expect(JSON.stringify(s)).toBe(before);
    const next = run(s, { type: "roll" });
    expect(emergencyTarget(next, 0)).toBe(3);
  });
  it("gives former allies of the leader withdrawal rights when they share a tile", () => {
    const { s } = world(3, 80);
    s.alliances = [
      { id: "a9000", members: [0, 3], threat: 1, lockedUntil: 99 },
    ];
    piece(s, "0,2", 0, "heavy");
    syncEmergencyCoalition(s);
    expect(s.withdrawals).toContainEqual({ tile: "0,2", owners: [3, 0] });
    assertInvariants(deserialize(serialize(s)));
  });
  it("adds returned factions and prunes eliminated partners without unlocking", () => {
    const { s, towns } = world(3, 80);
    s.players[7].alive = false;
    delete s.towns[towns[7].id];
    syncEmergencyCoalition(s);
    expect(s.alliances![0].members).not.toContain(7);
    s.players[7].alive = true;
    s.towns[towns[7].id] = towns[7];
    syncEmergencyCoalition(s);
    expect(s.alliances![0].members).toContain(7);
    expect(emergencyTarget(s, 7)).toBe(3);
    assertInvariants(s);
  });
  it("lets even the strongest AI fund a bypass during the emergency", () => {
    const { s } = world(0, 80);
    piece(s, "1,0", 1, "heavy", 4);
    syncEmergencyCoalition(s);
    expect(aiExpeditionAllowed(s, 1)).toBe(true);
    expect(aiExpeditionAllowed(s, 0)).toBe(true); // Human rules unchanged.
  });
  it("does not fund or accept trades with the coalition's sole enemy", () => {
    const { s, towns } = world(3, 80);
    syncEmergencyCoalition(s);
    towns[0].stock = { lumber: 10 };
    towns[3].stock = { ore: 50 };
    s.trade = { from: 3, to: 0, give: { ore: 50 }, take: { lumber: 1 } };
    expect(shouldAcceptTrade(s)).toBe(false);
    delete s.trade;
    expect(playerTradeToward(s, { ore: 2 })?.partner).not.toBe(3);
  });
  it("mobilizes rear armies and leaves only a small delaying guard at a threatened border", () => {
    const { s, towns } = world(3, 80);
    const origin = landAtVertex(s, towns[0].vertex)[0];
    const guards = Array.from({ length: 10 }, () =>
      piece(s, origin, 0, "heavy"),
    );
    syncEmergencyCoalition(s);
    expect(leavesTownExposed(s, guards)).toBe(false);
    const threat = landAtVertex(s, towns[0].vertex).find(
      (id) => id !== origin,
    )!;
    piece(s, threat, 3, "heavy", 4);
    const fresh = { ...s };
    expect(leavesTownExposed(fresh, guards)).toBe(true);
    expect(leavesTownExposed(fresh, guards.slice(2))).toBe(false);
  });
  it("moves a rear army towards the dominant faction instead of leaving it in reserve", () => {
    const { s, towns } = world(3, 80);
    const vulnerable = {
      ...structuredClone(towns[3]),
      id: `t${s.nextId++}`,
      vertex: s.tiles["3,-2"].vertices[0],
    };
    s.towns[vulnerable.id] = vulnerable;
    const origin = "-4,0";
    const unit = piece(s, origin, 0, "cavalry", 4);
    s.players[0].control = "standard";
    syncEmergencyCoalition(s);
    const action = chooseAIAction({ ...s });
    expect(action.type).toBe("move");
    expect(action.ids).toContain(unit.id);
    const d = (tile: string) =>
      Math.min(
        ...landAtVertex(s, vulnerable.vertex).map((id) => distance(tile, id)),
      );
    expect(d(action.to!)).toBeLessThan(d(origin));
  });
});

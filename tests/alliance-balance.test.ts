import { describe, expect, it } from "vitest";
import {
  allianceFixture,
  grandAllianceFixture,
  pact,
} from "./alliance-fixture";
import { piece, run } from "./helpers";
import { acceptsAlliance, sharedThreat } from "../src/game/diplomacy";
import { allianceOf, friendly } from "../src/game/relations";
import { factionStrengths } from "../src/game/ai-strategy";
import { deserialize, serialize, assertInvariants } from "../src/game/save";
import { addHexes } from "../src/game/world";
import type { Game } from "../src/game/types";

function forces(s: Game, counts: number[]) {
  s.pieces = {};
  for (const town of Object.values(s.towns)) town.level = town.turnLevel = 1;
  const locations = [
    "-2,0",
    "0,0",
    "2,0",
    "0,2",
    "4,-1",
    "2,-3",
    "-2,-3",
    "-4,1",
  ];
  counts.forEach((n, owner) => {
    for (let i = 0; i < n; i++) piece(s, locations[owner], owner, "heavy", 4);
  });
}
function review(s: Game, owner: number) {
  s.active = owner;
  s.players[owner].diplomacyDone = false;
  return run(s, { type: "manage-alliance" });
}

describe("survival alliances return to individual competition", () => {
  it("breaks an oversized two-member pact even while both fear the outside leader", () => {
    let { s } = allianceFixture();
    forces(s, [11, 11, 0, 15]);
    const scores = factionStrengths(s);
    expect(sharedThreat(s, [0, 1])).toBe(3);
    expect(scores[0] + scores[1]).toBeGreaterThan(scores[3] * 1.5);
    pact(s);
    s.round += 5;
    s = review(s, 1);
    expect(s.alliances).toHaveLength(0);
    expect(s.events.at(-1)?.text).toContain("150%");
    assertInvariants(deserialize(serialize(s)));
  });
  it("retains a useful pact with a modest combined advantage", () => {
    let { s } = allianceFixture();
    forces(s, [8, 8, 0, 12]);
    const scores = factionStrengths(s);
    expect(scores[0] + scores[1]).toBeGreaterThan(scores[3]);
    expect(scores[0] + scores[1]).toBeLessThan(scores[3] * 1.5);
    expect(acceptsAlliance(s, { from: 1, to: 0, threat: 3 })).toBe(true);
    pact(s);
    s.round += 5;
    s = review(s, 1);
    expect(friendly(s, 0, 1)).toBe(true);
  });
  it("honors the original five rounds even when combined power is excessive", () => {
    let { s } = allianceFixture();
    forces(s, [11, 11, 0, 15]);
    pact(s);
    s.round += 4;
    s = review(s, 1);
    expect(friendly(s, 0, 1)).toBe(true);
    s.round++;
    s = review(s, 1);
    expect(friendly(s, 0, 1)).toBe(false);
  });
  it("shrinks a dominant three-member pact and keeps the useful remaining pair", () => {
    let { s } = allianceFixture();
    forces(s, [8, 8, 8, 12]);
    pact(s, [0, 1, 2]);
    s.round += 5;
    s = review(s, 2);
    expect(allianceOf(s, 2)).toBeUndefined();
    expect(allianceOf(s, 1)?.members).toEqual([0, 1]);
    s = review(s, 1);
    expect(friendly(s, 0, 1)).toBe(true);
    expect(s.allianceOffer).toBeUndefined();
  });
  it("does not create an oversized pact or invite the human into one", () => {
    let { s } = allianceFixture();
    forces(s, [11, 11, 0, 15]);
    expect(acceptsAlliance(s, { from: 1, to: 0, threat: 3 })).toBe(false);
    s = review(s, 1);
    expect(s.allianceOffer).toBeUndefined();
    expect(friendly(s, 0, 1)).toBe(false);
  });
  it("stops adding partners when existing protection already has a 20% margin", () => {
    const { s } = allianceFixture();
    forces(s, [8, 8, 0, 12]);
    pact(s);
    const scores = factionStrengths(s);
    expect(scores[0] + scores[1]).toBeGreaterThan(scores[3] * 1.2);
    expect(sharedThreat(s, [0, 1, 2])).toBe(3);
    expect(acceptsAlliance(s, { from: 1, to: 2, threat: 3 })).toBe(false);
  });
  it("still adds needed partners while the pact is outmatched", () => {
    const { s } = allianceFixture();
    forces(s, [4, 4, 4, 20]);
    pact(s);
    expect(acceptsAlliance(s, { from: 1, to: 2, threat: 3 })).toBe(true);
  });
  it("does not let a distant superpower justify an oversized local pact", () => {
    let { s, towns } = grandAllianceFixture();
    forces(s, [11, 11, 0, 15, 40, 0, 0, 0]);
    addHexes(s, s.seed, ["20,0"]);
    towns[4].vertex = s.tiles["20,0"].vertices[0];
    towns[0].vertex = s.tiles["-5,0"].vertices[0];
    pact(s);
    s.round += 5;
    s = review(s, 1);
    expect(allianceOf(s, 1)).toBeUndefined();
  });
  it("prevents either former partner from immediately proposing the same pact again", () => {
    let { s } = allianceFixture();
    s.players[0].control = "standard";
    pact(s);
    s.round += 5;
    s.active = 1;
    s = run(s, { type: "leave-alliance" });
    expect(s.players[0].allianceContacts?.[1]).toBe(s.players[0].turns);
    expect(s.players[1].allianceContacts?.[0]).toBe(s.players[1].turns);
    s = review(s, 0);
    expect(friendly(s, 0, 1)).toBe(false);
    s = review(s, 1);
    expect(friendly(s, 0, 1)).toBe(false);
  });
  it("leaves when its partner is safe even if it personally still fears an enemy", () => {
    let { s } = allianceFixture();
    forces(s, [12, 2, 0, 13]);
    pact(s);
    s.round += 5;
    s = review(s, 1);
    expect(allianceOf(s, 1)).toBeUndefined();
    expect(s.events.at(-1)?.text).toContain("every member");
  });
});

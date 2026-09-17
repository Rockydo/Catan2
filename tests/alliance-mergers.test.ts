import { describe, it, expect } from "vitest";
import { mergerFixture } from "./alliance-fixture";
import { piece, run } from "./helpers";
import {
  acceptAlliance,
  acceptsAlliance,
  allianceOfferError,
} from "../src/game/diplomacy";
import {
  allianceLock,
  allianceOf,
  allianceResponder,
  friendly,
} from "../src/game/relations";
import { assertInvariants, deserialize, serialize } from "../src/game/save";
import { applyCommand } from "../src/game/engine";
import { chooseAIAction } from "../src/game/ai";
import { addHexes } from "../src/game/world";
import { moveTargets } from "../src/game/selectors";

describe("merging survival alliances", () => {
  it("AI prefers a useful merger over a nearby lone recruit, preserving all four owners", () => {
    let s = mergerFixture();
    expect(acceptsAlliance(s, { from: 1, to: 2, threat: 3 })).toBe(true);
    s = run(s, { type: "manage-alliance" });
    expect(s.alliances).toHaveLength(1);
    expect(allianceOf(s, 1)?.members.slice().sort()).toEqual([0, 1, 2, 4]);
    expect(s.allianceOffer).toBeUndefined();
    expect(s.events.at(-1)?.text).toContain("merged their alliances");
    assertInvariants(deserialize(serialize(s)));
  });
  it("keeps the later original deadline without a fresh five-round lock", () => {
    const s = mergerFixture();
    s.alliances![0].lockedUntil = 12;
    s.alliances![1].lockedUntil = 14;
    acceptAlliance(s, { from: 1, to: 2, threat: 3 });
    expect(allianceLock(s, 1)).toBe(4);
    expect(s.alliances![0].lockedUntil).toBe(14);
  });
  it("does not relock two already-expired pacts", () => {
    const s = mergerFixture();
    s.round = 16;
    acceptAlliance(s, { from: 1, to: 2, threat: 3 });
    expect(allianceLock(s, 4)).toBe(0);
  });
  it("rejects five members, inclusion of the strongest faction, and distant pacts", () => {
    const big = mergerFixture();
    acceptAlliance(big, { from: 0, to: 5, threat: 3 });
    expect(allianceOfferError(big, 1, 2)).toMatch(/four/);
    const strongest = mergerFixture();
    for (let i = 0; i < 40; i++) piece(strongest, "4,-1", 4, "heavy", 4);
    expect(allianceOfferError(strongest, 1, 2)).toMatch(/strongest/);
    const distant = mergerFixture();
    addHexes(distant, distant.seed, ["20,0", "22,0"]);
    for (const t of Object.values(distant.towns)) {
      if (t.owner === 2) t.vertex = distant.tiles["20,0"].vertices[0];
      if (t.owner === 4) t.vertex = distant.tiles["22,0"].vertices[0];
    }
    expect(allianceOfferError(distant, 1, 2)).toMatch(/nearby/);
  });
  it("refuses a merged superpower and a merger without a meaningful shared enemy", () => {
    const s = mergerFixture();
    for (const owner of [0, 1, 2, 4])
      for (let i = 0; i < 10; i++)
        piece(s, ["-2,0", "0,0", "2,0", "", "4,-1"][owner], owner, "heavy", 4);
    expect(acceptsAlliance(s, { from: 1, to: 2, threat: 3 })).toBe(false);
    const weak = mergerFixture();
    weak.pieces = {};
    for (const t of Object.values(weak.towns)) t.level = t.turnLevel = 1;
    expect(acceptsAlliance(weak, { from: 1, to: 2, threat: 3 })).toBe(false);
  });
  it("cannot use a merger to reunite recently separated partners", () => {
    const s = mergerFixture();
    s.players[0].allianceContacts = { 2: s.players[0].turns };
    s.players[2].allianceContacts = { 0: s.players[2].turns };
    expect(acceptsAlliance(s, { from: 1, to: 4, threat: 3 })).toBe(false);
  });
  it.each([0, 4])(
    "asks human member %s even when an AI negotiates for that pact",
    (human) => {
      let s = mergerFixture([human]);
      s = run(s, { type: "manage-alliance" });
      expect(s.alliances).toHaveLength(2);
      expect(s.allianceOffer?.approvals).toEqual([human]);
      expect(allianceResponder(s.allianceOffer!)).toBe(human);
      expect(
        applyCommand(s, { type: "respond-alliance", actor: 1, mode: "accept" })
          .ok,
      ).toBe(false);
      expect(applyCommand(s, { type: "end-turn" }).ok).toBe(false);
      s = deserialize(serialize(s));
      s = run(s, { type: "respond-alliance", actor: human, mode: "accept" });
      expect(s.alliances).toHaveLength(1);
      expect(friendly(s, 0, 4)).toBe(true);
    },
  );
  it("every human approves in turn; a later decline preserves both original pacts", () => {
    let s = mergerFixture([0, 4]);
    const old = structuredClone(s.alliances);
    s = run(s, { type: "manage-alliance" });
    expect(s.allianceOffer?.approvals).toEqual([0, 4]);
    s = run(s, { type: "respond-alliance", actor: 0, mode: "accept" });
    expect(s.alliances).toEqual(old);
    expect(s.allianceOffer?.approvals).toEqual([4]);
    s = deserialize(serialize(s));
    expect(chooseAIAction(s)).toMatchObject({
      type: "respond-alliance",
      actor: 4,
      mode: "accept",
    });
    const accepted = run(s, {
      type: "respond-alliance",
      actor: 4,
      mode: "accept",
    });
    expect(accepted.alliances).toHaveLength(1);
    s = run(s, { type: "respond-alliance", actor: 4, mode: "decline" });
    expect(s.allianceOffer).toBeUndefined();
    expect(s.alliances).toEqual(old);
    assertInvariants(s);
  });
  it.each([[], [0, 0], [3], [5]].map((approvals) => ({ approvals })))(
    "rejects malformed or unrelated approval queues %j",
    ({ approvals }) => {
      let s = mergerFixture([0, 5]);
      s = run(s, { type: "manage-alliance" });
      s.allianceOffer!.approvals = approvals;
      expect(() => assertInvariants(s)).toThrow(/approv/);
    },
  );
  it("new partners immediately gain passage and shared tiles without changing unit ownership", () => {
    let s = mergerFixture();
    const a = piece(s, "-2,0", 0, "cavalry", 2);
    const b = piece(s, "-1,0", 4, "heavy", 1);
    s = run(s, { type: "manage-alliance" });
    s.active = 0;
    expect(moveTargets(s, [a.id])[b.tile]).toBeDefined();
    s = run(s, { type: "move", ids: [a.id], to: b.tile });
    expect(s.battle).toBeUndefined();
    expect(s.pieces[a.id].owner).toBe(0);
    expect(s.pieces[b.id].owner).toBe(4);
    assertInvariants(deserialize(serialize(s)));
  });
});

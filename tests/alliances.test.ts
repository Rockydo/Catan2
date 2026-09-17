import { describe, it, expect } from "vitest";
import { applyCommand, beginTurn, eliminate } from "../src/game/engine";
import {
  acceptsAlliance,
  acceptAlliance,
  allianceOfferError,
  manageAlliance,
  realmDistance,
} from "../src/game/diplomacy";
import { allianceLock, allianceOf, friendly } from "../src/game/relations";
import { chooseAIAction } from "../src/game/ai";
import {
  factionStrengths,
  townThreats,
  warTarget,
  leavesTownExposed,
} from "../src/game/ai-strategy";
import {
  blockAt,
  hostileAt,
  moveTargets,
  protects,
  power,
  income,
  casualtySelection,
  retreatOptions,
} from "../src/game/selectors";
import { serialize, deserialize, assertInvariants } from "../src/game/save";
import {
  allianceFixture,
  grandAllianceFixture,
  pact,
} from "./alliance-fixture";
import { piece, run } from "./helpers";

describe("formal alliances", () => {
  it("AI offers the human a nearby survival pact, and only the recipient can accept", () => {
    let { s } = allianceFixture();
    s.active = 1;
    s.phase = "roll";
    s = run(s, { type: "roll" });
    expect(s.allianceOffer).toMatchObject({ from: 1, to: 0, threat: 3 });
    expect(
      applyCommand(s, { type: "respond-alliance", actor: 2, mode: "accept" })
        .ok,
    ).toBe(false);
    s = run(s, { type: "respond-alliance", actor: 0, mode: "accept" });
    expect(friendly(s, 0, 1)).toBe(true);
    expect(allianceLock(s, 0)).toBe(5);
    expect(s.allianceOffer).toBeUndefined();
    assertInvariants(s);
  });
  it("lets the human decline without payment and throttles repeated invitations", () => {
    let { s } = allianceFixture();
    s.active = 1;
    s = run(s, { type: "manage-alliance" });
    const stocks = structuredClone(s.towns);
    s = run(s, { type: "respond-alliance", actor: 0, mode: "decline" });
    expect(s.towns).toEqual(stocks);
    expect(s.alliances ?? []).toHaveLength(0);
    s.players[1].diplomacyDone = false;
    s.players[1].turns++;
    s = run(s, { type: "manage-alliance" });
    expect(s.allianceOffer?.to).not.toBe(0);
  });
  it("forms AI-to-AI pacts and never lets a human initiate one", () => {
    let { s } = allianceFixture();
    s.players[0].control = "standard";
    s.active = 1;
    s = run(s, { type: "manage-alliance" });
    expect(friendly(s, 0, 1)).toBe(true);
    const human = allianceFixture().s;
    expect(applyCommand(human, { type: "manage-alliance" }).ok).toBe(false);
    expect(applyCommand(human, { type: "offer-alliance", partner: 1 }).ok).toBe(
      false,
    );
  });
  it("does not ally over a minor power difference, or with the strongest faction", () => {
    const { s } = allianceFixture();
    s.pieces = {};
    for (const t of Object.values(s.towns)) t.level = t.turnLevel = 1;
    expect(acceptsAlliance(s, { from: 1, to: 2, threat: 3 })).toBe(false);
    const large = allianceFixture().s;
    expect(allianceOfferError(large, 0, 3)).toMatch(/strongest/);
    large.active = 3;
    manageAlliance(large);
    expect(large.alliances ?? []).toHaveLength(0);
  });
  it("rejects distant partners even when both are weak", () => {
    const { s, towns } = allianceFixture();
    towns[0].vertex = s.tiles["-5,0"].vertices[0];
    towns[1].vertex = s.tiles["5,0"].vertices[0];
    expect(realmDistance(s, 0, 1)).toBeGreaterThan(6);
    expect(allianceOfferError(s, 0, 1)).toMatch(/nearby/);
  });
  it("accepts a coalition whose combined score exceeds the strongest individual", () => {
    const { s } = allianceFixture();
    s.pieces = {};
    for (let i = 0; i < 9; i++) piece(s, "0,2", 3, "heavy", 4);
    for (let owner = 0; owner < 3; owner++)
      for (let i = 0; i < 5; i++) piece(s, `${owner - 2},0`, owner, "heavy", 4);
    const scores = factionStrengths(s);
    expect(scores[0] + scores[1]).toBeGreaterThan(scores[3]);
    expect(acceptsAlliance(s, { from: 0, to: 1, threat: 3 })).toBe(true);
    pact(s, [0, 1, 2]);
    expect(allianceOf(s, 0)?.members).toHaveLength(3);
  });
  it("locks for five rounds, then removes only the departing member", () => {
    let { s } = allianceFixture();
    pact(s, [0, 1, 2]);
    expect(applyCommand(s, { type: "leave-alliance" }).ok).toBe(false);
    s.round += 4;
    expect(applyCommand(s, { type: "leave-alliance" }).ok).toBe(false);
    s.round++;
    s = run(s, { type: "leave-alliance" });
    expect(friendly(s, 1, 2)).toBe(true);
    expect(friendly(s, 0, 1)).toBe(false);
    expect(allianceOf(s, 0)).toBeUndefined();
    assertInvariants(s);
  });
  it("adding a member does not trap the founders in a renewed commitment", () => {
    let { s } = allianceFixture();
    pact(s);
    s.round += 4;
    acceptAlliance(s, { from: 0, to: 2, threat: 3 });
    expect(allianceLock(s, 0)).toBe(1);
    s.round++;
    s = run(s, { type: "leave-alliance" });
    expect(friendly(s, 1, 2)).toBe(true);
  });
  it("honors the lock after a member becomes strongest, then AI leaves the dangerous pact", () => {
    let { s } = allianceFixture();
    pact(s, [0, 1, 2]);
    s.pieces = {};
    for (let i = 0; i < 40; i++) piece(s, "-2,0", 0, "heavy", 4);
    s.active = 1;
    s = run(s, { type: "manage-alliance" });
    expect(friendly(s, 0, 1)).toBe(true);
    s.round += 5;
    s.players[1].diplomacyDone = false;
    s = run(s, { type: "manage-alliance" });
    expect(friendly(s, 0, 1)).toBe(false);
  });
  it("AI dissolves an expired pact when it no longer needs protection", () => {
    let { s } = allianceFixture();
    pact(s);
    s.round += 5;
    s.active = 1;
    s.pieces = {};
    for (const t of Object.values(s.towns)) t.level = t.turnLevel = 1;
    s = run(s, { type: "manage-alliance" });
    expect(allianceOf(s, 1)).toBeUndefined();
  });
  it.each([false, true])(
    "allies can pass and share tiles (naval=%s) without combat",
    (naval) => {
      let { s } = allianceFixture();
      pact(s);
      if (naval)
        for (const id of ["-2,0", "-1,0", "0,0"])
          s.tiles[id].resource = "water";
      const a = piece(s, "-2,0", 0, naval ? "galley" : "cavalry", 2),
        b = piece(s, "-1,0", 1, naval ? "galley" : "heavy", 1);
      expect(hostileAt(s, b.tile, 0, naval)).toBe(false);
      expect(moveTargets(s, [a.id])["0,0"]).toBeDefined();
      s = run(s, { type: "move", ids: [a.id], to: b.tile });
      expect(s.battle).toBeUndefined();
      expect(s.pieces[a.id].tile).toBe(s.pieces[b.id].tile);
      s = run(s, { type: "move", ids: [a.id], to: "0,0" });
      expect(s.pieces[a.id].tile).toBe("0,0");
    },
  );
  it("allied occupation preserves production and allied guards protect towns", () => {
    const { s, towns } = allianceFixture();
    pact(s);
    const before = income(s, 0).grain!;
    piece(s, s.vertices[towns[0].vertex].tiles[0], 1, "heavy", 2);
    expect(blockAt(s, s.vertices[towns[0].vertex].tiles[0], 0)).toBe(false);
    expect(income(s, 0).grain).toBe(before);
    expect(protects(s, towns[0])).toBe(true);
    expect(townThreats(s, towns[0]).every((u) => u.owner !== 1)).toBe(true);
    expect(warTarget(s, 1, 0)).toBe(false);
  });
  it("forbids raiding, destroying towns, roads, towers and bombarding allied ships", () => {
    const { s, towns } = allianceFixture();
    pact(s);
    const tile = s.vertices[towns[1].vertex].tiles[0];
    const u = piece(s, tile, 0, "artillery", 4);
    const edge = s.tiles[tile].edges[0],
      vertex = s.tiles[tile].vertices[1];
    s.routes[edge] = {
      id: `r${s.nextId++}`,
      edge,
      owner: 1,
      kind: "road",
      camps: {},
      born: 0,
    };
    s.towers[vertex] = { id: `w${s.nextId++}`, vertex, owner: 1, tier: 1 };
    for (const c of [
      { type: "siege", town: towns[1].id },
      { type: "destroy-town", town: towns[1].id },
      { type: "destroy-route", edge },
      { type: "destroy-tower", vertex },
    ])
      expect(applyCommand(s, { ...c, ids: [u.id] }).ok).toBe(false);
    s.tiles["0,-1"].resource = "water";
    piece(s, "0,-1", 1, "galley", 1);
    expect(
      applyCommand(s, { type: "bombard", ids: [u.id], to: "0,-1" }).ok,
    ).toBe(false);
  });
  it.each([false, true])(
    "co-located allies defend together, preserve ownership and save pending combat (naval=%s)",
    (naval) => {
      let { s } = allianceFixture();
      pact(s, [0, 1]);
      s.active = 2;
      if (naval)
        for (const id of ["1,0", "0,0", "-1,0"]) s.tiles[id].resource = "water";
      const attacker = piece(s, "1,0", 2, naval ? "galley" : "heavy", 4);
      const a = piece(s, "0,0", 0, naval ? "galley" : "heavy", 1),
        b = piece(s, "0,0", 1, naval ? "galley" : "heavy", 1);
      s = run(s, { type: "move", ids: [attacker.id], to: "0,0" });
      expect(s.battle!.defenders).toEqual([a.id, b.id]);
      expect(s.battle!.defenderPower).toBe(
        power(s, [s.pieces[a.id], s.pieces[b.id]], "0,0"),
      );
      expect(s.battle!.loser).toBe(0);
      expect(deserialize(serialize(s)).battle).toEqual(s.battle);
      s = run(s, chooseAIAction(s));
      expect(s.battle).toBeUndefined();
      assertInvariants(s);
    },
  );
  it("shared former allies can fight in place after leaving, without teleporting", () => {
    let { s } = allianceFixture();
    pact(s);
    s.round += 5;
    const a = piece(s, "-1,0", 0, "heavy", 4),
      b = piece(s, "-1,0", 1, "heavy", 1);
    s = run(s, { type: "leave-alliance" });
    expect(s.pieces[a.id].tile).toBe(s.pieces[b.id].tile);
    expect(deserialize(serialize(s)).withdrawals).toEqual(s.withdrawals);
    expect(moveTargets(s, [a.id])[a.tile]).toEqual([a.tile]);
    s = run(s, { type: "move", ids: [a.id], to: a.tile });
    expect(s.battle).toBeDefined();
    s = run(s, chooseAIAction(s));
    expect(s.pieces[b.id]).toBeUndefined();
    expect(s.pieces[a.id].moved).toBe(1);
  });
  it("survives save/load and prunes eliminated members before a rebellion can restore them", () => {
    const { s, towns } = allianceFixture();
    pact(s, [0, 1, 2]);
    expect(deserialize(serialize(s)).alliances).toEqual(s.alliances);
    delete s.towns[towns[1].id];
    eliminate(s);
    expect(allianceOf(s, 1)).toBeUndefined();
    expect(friendly(s, 0, 2)).toBe(true);
    s.players[1].alive = true;
    expect(friendly(s, 0, 1)).toBe(false);
  });
  it("supports four nearby members on the grand map and rejects a fifth", () => {
    const { s } = grandAllianceFixture();
    pact(s, [0, 1, 2, 4]);
    expect(allianceOf(s, 0)?.members).toHaveLength(4);
    expect(allianceOfferError(s, 1, 5)).toMatch(/four/);
    assertInvariants(s);
  });
  it("merges separate pacts into one alliance without duplicate memberships", () => {
    const { s } = grandAllianceFixture();
    pact(s, [0, 1]);
    pact(s, [2, 4]);
    expect(allianceOfferError(s, 0, 2)).toBeUndefined();
    acceptAlliance(s, { from: 0, to: 2, threat: 3 });
    expect(s.alliances).toHaveLength(1);
    expect(allianceOf(s, 0)?.members).toEqual([0, 1, 2, 4]);
    assertInvariants(s);
  });
  it("allied guards let a mobile army leave its town without opening it to a raid", () => {
    const { s, towns } = allianceFixture();
    s.pieces = {};
    pact(s);
    const guardTile = s.vertices[towns[0].vertex].tiles[0];
    const mobile = piece(s, guardTile, 0, "cavalry", 1);
    piece(s, guardTile, 1, "heavy", 4);
    piece(s, "-3,0", 3, "light", 1);
    expect(townThreats(s, towns[0])).toHaveLength(1);
    expect(leavesTownExposed(s, [mobile], "1,0")).toBe(false);
    const solo = structuredClone(s);
    solo.alliances = [];
    expect(leavesTownExposed(solo, [solo.pieces[mobile.id]], "1,0")).toBe(true);
  });
  it("forming an alliance immediately cancels sieges between the new partners", () => {
    let { s, towns } = allianceFixture();
    s.active = 1;
    piece(s, s.vertices[towns[0].vertex].tiles[0], 1, "heavy", 1);
    s.sieges[`1:${towns[0].id}`] = {
      owner: 1,
      town: towns[0].id,
      last: 9,
      progress: 1,
      raided: null,
    };
    s.allianceOffer = { from: 1, to: 0, threat: 3 };
    s = run(s, { type: "respond-alliance", actor: 0, mode: "accept" });
    expect(s.sieges).toEqual({});
  });
  it("rejects malformed membership instead of loading overlapping alliances", () => {
    const { s } = allianceFixture();
    pact(s);
    s.alliances!.push({
      id: "bad",
      members: [1, 2],
      threat: 3,
      lockedUntil: 10,
    });
    expect(() => assertInvariants(s)).toThrow(/duplicate alliance member/);
  });
});

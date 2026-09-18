import { describe, expect, it } from "vitest";
import { funded, piece, run } from "./helpers";
import { applyCommand, newGame, random } from "../src/game/engine";
import { chooseAIAction } from "../src/game/ai";
import {
  campaignPowerTarget,
  threatPower,
  townThreats,
} from "../src/game/ai-strategy";
import { UNIT_INFO, unitCost } from "../src/game/content";
import { PROCESSED, type UnitClass } from "../src/game/types";
import {
  ownTowns,
  inventory,
  power,
  minCasualties,
  moveTargets,
  casualtySelection,
} from "../src/game/selectors";
import { hash, landAtVertex, neighbors } from "../src/game/world";
import { serialize, deserialize, assertInvariants } from "../src/game/save";

function field() {
  const s = funded();
  s.players[0].turns = 30;
  s.players[0].control = "standard";
  s.phase = "military";
  for (const tile of Object.values(s.tiles)) {
    tile.resource = "grain";
    delete tile.fish;
  }
  const home = ownTowns(s)[0],
    rival = ownTowns(s, 1)[0];
  home.vertex = s.tiles["0,0"].vertices[0];
  rival.vertex = s.tiles["3,0"].vertices[0];
  s.towns = { [home.id]: home, [rival.id]: rival };
  s.routes = {};
  return { s, home, rival };
}
function legacy(s: ReturnType<typeof funded>) {
  const game = JSON.parse(JSON.stringify(s));
  game.version = 2;
  return JSON.stringify({
    format: "catane-frontiers",
    version: 2,
    game,
    checksum: hash(JSON.stringify(game)).toString(16),
  });
}

describe("four troop tiers and unlimited recruitment", () => {
  it.each(
    (Object.keys(UNIT_INFO) as UnitClass[]).filter((k) => k !== "settler"),
  )("%s has a one-processed-good middle tier and four legal ranks", (kind) => {
    expect(UNIT_INFO[kind].names).toHaveLength(4);
    expect(
      Object.keys(unitCost(kind, 2)).filter((g) =>
        (PROCESSED as readonly string[]).includes(g),
      ),
    ).toHaveLength(1);
    for (const tier of [1, 2, 3, 4]) {
      let s = funded();
      const town = ownTowns(s)[0];
      town.level = town.turnLevel = tier;
      const tile = landAtVertex(s, town.vertex)[0],
        before = inventory(s);
      s = run(s, { type: "recruit", town: town.id, tile, kind, tier });
      const u = Object.values(s.pieces)[0];
      expect(u.tier).toBe(tier);
      for (const [good, n] of Object.entries(unitCost(kind, tier)))
        expect(inventory(s)[good as keyof typeof before]).toBe(
          before[good as keyof typeof before]! - n!,
        );
      expect(moveTargets(s, [u.id])).toEqual({});
      assertInvariants(deserialize(serialize(s)));
    }
  });
  it("recruits ten units at one settlement, charges every purchase and still rejects unaffordable units", () => {
    let s = funded();
    const town = ownTowns(s)[0],
      tile = landAtVertex(s, town.vertex)[0],
      before = inventory(s);
    town.level = town.turnLevel = 1;
    for (let i = 0; i < 10; i++)
      s = run(s, {
        type: "recruit",
        town: town.id,
        tile,
        kind: "heavy",
        tier: 1,
      });
    expect(s.towns[town.id].recruited).toBe(10);
    expect(inventory(s).ore).toBe(before.ore! - 20);
    expect(inventory(s).grain).toBe(before.grain! - 10);
    assertInvariants(deserialize(serialize(s)));
    for (const t of ownTowns(s)) t.stock = {};
    expect(
      applyCommand(s, {
        type: "recruit",
        town: town.id,
        tile,
        kind: "heavy",
        tier: 1,
      }).ok,
    ).toBe(false);
  });
  it("AI can directly recruit tier IV when eligible and in need of troops", () => {
    const s = funded();
    s.players[0].turns = 4;
    s.players[0].control = "standard";
    for (const t of ownTowns(s)) t.level = t.turnLevel = 4;
    const action = chooseAIAction(s);
    expect(action).toMatchObject({ type: "recruit", tier: 4 });
    expect(Object.values(run(s, action).pieces)[0].tier).toBe(4);
  });
  it("free recruitment remains usable after many purchases in one turn", () => {
    let s = funded();
    s.players[0].turns = 3;
    const town = ownTowns(s)[0],
      tile = landAtVertex(s, town.vertex)[0];
    town.level = town.turnLevel = 2;
    town.recruited = 20;
    s.players[0].hand = [
      { id: `card${s.nextId++}`, kind: "volunteers", tier: 2, bought: 1 },
    ];
    s = run(s, { type: "play-research", card: s.players[0].hand[0].id });
    const before = inventory(s);
    s = run(s, {
      type: "recruit",
      town: town.id,
      tile,
      kind: "heavy",
      tier: 2,
    });
    expect(inventory(s)).toEqual(before);
    expect(s.towns[town.id].recruited).toBe(21);
    assertInvariants(s);
  });
  it("tier IV requires a level-four town at turn start; invalid and fractional tiers are rejected", () => {
    const s = funded(),
      town = ownTowns(s)[0],
      tile = landAtVertex(s, town.vertex)[0];
    town.level = 4;
    town.turnLevel = 3;
    for (const tier of [4, 5, 1.5])
      expect(
        applyCommand(s, {
          type: "recruit",
          town: town.id,
          tile,
          kind: "heavy",
          tier,
        }).ok,
      ).toBe(false);
  });
  it("four-point units get terrain bonuses and round casualties to whole pieces", () => {
    const { s } = field();
    s.tiles["0,0"].resource = "ore";
    const u = piece(s, "0,0", 0, "heavy", 4);
    expect(power(s, [u], u.tile)).toBe(8);
    expect(minCasualties([u], 1)).toBe(4);
    expect(casualtySelection([u], 4)).toEqual([u.id]);
  });
  it("migrates old ranks and granted units once, preserving identities and ships", () => {
    const s = funded(),
      town = ownTowns(s)[0],
      tile = landAtVertex(s, town.vertex)[0];
    const ids = [1, 2, 3].map((tier) => piece(s, tile, 0, "heavy", tier).id);
    s.players[0].bonuses.recruits = [
      { tier: 2, classes: ["heavy"] },
      { tier: 3, classes: ["light"] },
    ];
    const water = Object.values(s.tiles).find((t) => t.resource === "water")!;
    const ship = piece(s, water.id, 0, "transport");
    const migrated = deserialize(legacy(s));
    expect(ids.map((id) => migrated.pieces[id].tier)).toEqual([1, 3, 4]);
    expect(migrated.players[0].bonuses.recruits.map((r) => r.tier)).toEqual([
      3, 4,
    ]);
    expect(migrated.pieces[ship.id].tier).toBe(1);
    expect(deserialize(serialize(migrated)).pieces).toEqual(migrated.pieces);
    expect(migrated.tiles).toEqual(s.tiles);
  });
  it("recalculates attainable casualties for a saved battle after remapping ranks", () => {
    let { s } = field();
    const attackers = [
      piece(s, "0,0", 0, "heavy", 2),
      piece(s, "0,0", 0, "heavy", 1),
    ];
    piece(s, "1,0", 1, "heavy", 2);
    s = run(s, { type: "move", ids: attackers.map((u) => u.id), to: "1,0" });
    const migrated = deserialize(legacy(s));
    expect(migrated.battle?.attackerPower).toBe(4);
    expect(migrated.battle?.required).toBe(3);
    const resolved = run(migrated, chooseAIAction(migrated));
    expect(resolved.battle).toBeUndefined();
    assertInvariants(resolved);
  });
});

describe("AI breaks buildup stalemates", () => {
  it("sorties with a small winning advantage without requiring total annihilation", () => {
    const { s, home } = field(),
      origin = landAtVertex(s, home.vertex)[0];
    const enemy = neighbors(origin).find(
      (id) => s.tiles[id] && !landAtVertex(s, home.vertex).includes(id),
    )!;
    for (let i = 0; i < 6; i++) piece(s, origin, 0, "heavy");
    for (let i = 0; i < 5; i++) piece(s, enemy, 1, "heavy");
    const action = chooseAIAction(s);
    expect(action).toMatchObject({ type: "move", to: enemy });
    const battle = run(s, action);
    expect(battle.battle?.required).toBe(1);
    const result = run(battle, chooseAIAction(battle));
    expect(
      Object.values(result.pieces).filter((u) => u.owner === 0),
    ).toHaveLength(6);
    expect(
      Object.values(result.pieces).filter((u) => u.owner === 1),
    ).toHaveLength(4);
  });
  it("marches toward a beatable army blocking the only path to a rival town", () => {
    const { s, home, rival } = field();
    for (const t of Object.values(s.tiles)) t.resource = "water";
    for (const id of ["0,0", "1,0", "2,0", "3,0", "4,0"])
      s.tiles[id].resource = "grain";
    home.vertex = s.tiles["0,0"].vertices[0];
    rival.vertex = s.tiles["4,0"].vertices[2];
    piece(s, "0,0", 0, "heavy", 4);
    piece(s, "2,0", 1, "heavy", 1);
    expect(chooseAIAction(s)).toMatchObject({ type: "move", to: "1,0" });
  });
  it("does not combine separate enemy stacks or freeze guards against distant slow infantry", () => {
    const { s, home } = field();
    const a = piece(s, "2,0", 1, "heavy", 4),
      b = piece(s, "3,0", 1, "heavy", 4);
    expect(threatPower(s, [a, b], ["0,0"])).toBe(4);
    expect(townThreats(s, home)).not.toContain(b);
  });
  it.each([2, 3])("invests in the next city unlock from level %i", (level) => {
    let s = funded();
    s.players[0].turns = 35;
    s.players[0].control = "standard";
    for (const t of ownTowns(s)) {
      t.level = t.turnLevel = level;
      for (const id of landAtVertex(s, t.vertex)) t.extensions[id] = level - 1;
    }
    const home = ownTowns(s)[0];
    for (let i = 0; i < 8; i++)
      piece(s, landAtVertex(s, home.vertex)[0], 0, "heavy", 4);
    let action = chooseAIAction(s);
    // Movement and building now share the turn; marching first must not lose the upgrade.
    for (let i = 0; i < 12 && action.type === "move"; i++) {
      s = run(s, action);
      action = chooseAIAction(s);
    }
    expect(action.type).toBe("city");
    expect(run(s, action).towns[action.town!].level).toBe(level + 1);
  });
  it("bounds speculative recruitment by our economy rather than multiplying a remote stack", () => {
    const { s } = field();
    for (let i = 0; i < 100; i++) piece(s, "4,0", 1, "heavy", 4);
    // Late-game survival spending scales with our economy and offensive drive,
    // but never chases this 400-point remote stack without a bound.
    expect(campaignPowerTarget(s)).toBeLessThanOrEqual(70);
    for (let i = 0; i < 30; i++) piece(s, "-3,0", 0, "heavy", 4);
    s.phase = "economy";
    expect(chooseAIAction(s).type).not.toBe("recruit");
  });
});

describe("dice stream integrity", () => {
  it("uses two actual engine draws and keeps research randomness separate", () => {
    let s = funded();
    s.phase = "roll";
    const expected = structuredClone(s),
      other = structuredClone(s);
    const dice = [
      1 + Math.floor(random(expected) * 6),
      1 + Math.floor(random(expected) * 6),
    ];
    for (let i = 0; i < 100; i++) random(other, true);
    expect(run(other, { type: "roll" }).dice).toEqual(dice);
    s = run(s, { type: "roll" });
    expect(s.dice).toEqual(dice);
    expect(s.rng).toBe(expected.rng);
    expect(applyCommand(s, { type: "roll" }).ok).toBe(false);
  });
  it("saving and reloading continues the stream without reseeding or rerolling", () => {
    let s = newGame("dice-continuity");
    for (let i = 0; i < 37; i++) random(s);
    const restored = deserialize(serialize(s));
    expect(Array.from({ length: 100 }, () => random(restored))).toEqual(
      Array.from({ length: 100 }, () => random(s)),
    );
  });
});

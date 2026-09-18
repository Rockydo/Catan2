import { describe, it, expect } from "vitest";
import { applyCommand, beginTurn } from "../src/game/engine";
import { production, spend } from "../src/game/economy";
import {
  ownTowns,
  inventory,
  points,
  casualtySelection,
  minCasualties,
  canRoute,
  routeSites,
  siegeRequirement,
  bankRate,
  moveTargets,
} from "../src/game/selectors";
import { COSTS, extensionCost, processedFor } from "../src/game/content";
import {
  neighbors,
  landAtVertex,
  waterAtVertex,
  generateHex,
  addHexes,
} from "../src/game/world";
import { assertInvariants, serialize, deserialize } from "../src/game/save";
import { chooseAIAction } from "../src/game/ai";
import { funded, started, piece, run, nextOwnerTurn } from "./helpers";
import { type Game, type Raw } from "../src/game/types";
describe("economy", () => {
  it("preserves vanilla costs", () => {
    expect(COSTS.Road).toEqual({ lumber: 1, brick: 1 });
    expect(COSTS.Settlement).toEqual({
      lumber: 1,
      brick: 1,
      wool: 1,
      grain: 1,
    });
    expect(COSTS["City I / level 2"]).toEqual({ ore: 3, grain: 2 });
    expect(COSTS["Seafarers route ship"]).toEqual({ lumber: 1, wool: 1 });
  });
  it("spends proportionally without arbitrary warehouse evacuation", () => {
    const s = funded(),
      ts = ownTowns(s);
    ts[0].stock = { grain: 8 };
    ts[1].stock = { grain: 2 };
    spend(s, { grain: 5 });
    expect(ts.map((t) => t.stock.grain)).toEqual([4, 1]);
  });
  it("a seven produces full level-4 raw and tier-3 processed output", () => {
    const s = funded(),
      t = ownTowns(s)[0],
      id = landAtVertex(s, t.vertex)[0];
    for (const tile of Object.values(s.tiles)) tile.number = 2;
    s.tiles[id].number = 7;
    s.tiles[id].resource = "ore";
    t.level = 4;
    t.extensions = { [id]: 3 };
    t.stock = {};
    production(s, 7);
    expect(t.stock).toEqual({ ore: 4, steel: 5 });
    piece(s, id, 1);
    production(s, 7);
    expect(t.stock).toEqual({ ore: 4, steel: 5 });
  });
  it("a seven never steals cards or discards a large inventory", () => {
    const s = funded(),
      before = inventory(s);
    production(s, 7);
    for (const g of Object.keys(before))
      expect(inventory(s)[g as keyof typeof before]).toBeGreaterThanOrEqual(
        before[g as keyof typeof before]!,
      );
  });
  it("city upgrades preserve stores and unlock sequential extension tiers", () => {
    let s = funded();
    const t = ownTowns(s)[0],
      id = landAtVertex(s, t.vertex)[0];
    expect(
      applyCommand(s, { type: "extension", town: t.id, tile: id }).ok,
    ).toBe(false);
    s = run(s, { type: "city", town: t.id });
    s = run(s, { type: "extension", town: t.id, tile: id });
    expect(s.towns[t.id].extensions[id]).toBe(1);
    expect(
      applyCommand(s, { type: "extension", town: t.id, tile: id }).ok,
    ).toBe(false);
    s = run(s, { type: "city", town: t.id });
    s = run(s, { type: "extension", town: t.id, tile: id });
    expect(s.towns[t.id].extensions[id]).toBe(2);
  });
  it("freshly upgraded towns cannot use new recruitment eligibility", () => {
    let s = funded(),
      t = ownTowns(s)[0],
      tile = landAtVertex(s, t.vertex)[0];
    s = run(s, { type: "city", town: t.id });
    expect(
      applyCommand(s, {
        type: "recruit",
        town: t.id,
        tile,
        kind: "heavy",
        tier: 2,
      }).ok,
    ).toBe(false);
    s = run(s, { type: "recruit", town: t.id, tile, kind: "heavy", tier: 1 });
    expect(
      applyCommand(s, {
        type: "recruit",
        town: t.id,
        tile,
        kind: "heavy",
        tier: 1,
      }).ok,
    ).toBe(true);
  });
  it("missing raw and processed goods remain importable", () => {
    let s = funded();
    for (const t of Object.values(s.tiles))
      if (t.resource === "ore") t.resource = "stone";
    const before = inventory(s).ore!;
    const rate = bankRate(s, "lumber", "ore");
    s = run(s, { type: "bank", give: { lumber: rate }, take: { ore: 1 } });
    expect(inventory(s).ore).toBe(before + 1);
    s = run(s, { type: "bank", give: { lumber: 6 }, take: { steel: 1 } });
    expect(inventory(s).steel).toBe(201);
  });
  it("rejects negative trades and duplicate or foreign spending atomically", () => {
    const s = funded(),
      before = serialize(s);
    for (const c of [
      { type: "bank", give: { lumber: -4 }, take: { ore: 1 } },
      { type: "city", town: ownTowns(s, 1)[0].id },
      {
        type: "offer-trade",
        partner: 1,
        give: { grain: 1 },
        take: { grain: 2 },
      },
    ])
      expect(applyCommand(s, c).ok).toBe(false);
    expect(serialize(s).replace(/savedAt[^,]+/, "")).toBe(
      before.replace(/savedAt[^,]+/, ""),
    );
  });
  it("camp destruction follows the parent road", () => {
    let s = funded();
    const edge = Object.values(s.routes).find(
        (r) => r.owner === 0 && r.kind === "road",
      )!.edge,
      tile = s.edges[edge].tiles.find(
        (id) => s.tiles[id].resource !== "water",
      )!;
    s = run(s, { type: "camp", edge, tile });
    const u = piece(s, tile, 0);
    s.phase = "military";
    s = run(s, { type: "destroy-route", edge, ids: [u.id] });
    expect(s.routes[edge]).toBeUndefined();
  });
});
describe("whole-unit combat", () => {
  it.each([
    [[3], 1, 3],
    [[1, 3], 2, 3],
    [[1, 2, 3], 3, 3],
    [[2, 2, 2], 3, 4],
  ])("rounds %j at %i to %i", (tiers, loss, total) => {
    const s = funded(),
      tile = landAtVertex(s, ownTowns(s)[0].vertex)[0];
    const units = (tiers as number[]).map((t) => piece(s, tile, 0, "heavy", t));
    expect(minCasualties(units, loss as number)).toBe(total);
    expect(
      casualtySelection(units, total as number).reduce(
        (n, id) => n + points(s.pieces[id]),
        0,
      ),
    ).toBe(total);
  });
  it("uses defender terrain, removes whole casualties, and leaves winners untouched", () => {
    let s = funded();
    const pair = Object.values(s.tiles).flatMap((t) =>
      t.resource !== "water"
        ? neighbors(t.id)
            .filter((n) => s.tiles[n] && s.tiles[n].resource !== "water")
            .map((n) => [t.id, n])
        : [],
    )[0];
    s.tiles[pair[1]].resource = "ore";
    const a = piece(s, pair[0], 0, "heavy", 3),
      b = piece(s, pair[1], 1, "cavalry", 3);
    s.phase = "military";
    s = run(s, { type: "move", ids: [a.id], to: pair[1] });
    expect(s.battle?.attackerPower).toBe(6);
    expect(s.battle?.defenderPower).toBe(3);
    s = run(s, chooseAIAction(s));
    expect(s.pieces[b.id]).toBeUndefined();
    expect(s.pieces[a.id].tier).toBe(3);
    expect(s.pieces[a.id].tile).toBe(pair[1]);
  });
  it("new recruits cannot attack, and splitting never resets movement", () => {
    let s = funded();
    const t = ownTowns(s)[0],
      tile = landAtVertex(s, t.vertex)[0];
    s = run(s, { type: "recruit", town: t.id, tile, kind: "cavalry", tier: 1 });
    s.phase = "military";
    const recruit = Object.values(s.pieces)[0];
    expect(moveTargets(s, [recruit.id])).toEqual({});
    beginTurn(s);
    s.phase = "military";
    const targets = moveTargets(s, [recruit.id]),
      to = Object.keys(targets).find((id) => targets[id].length === 3);
    if (to) {
      s = run(s, { type: "move", ids: [recruit.id], to });
      expect(moveTargets(s, [recruit.id])).toEqual({});
    }
  });
});
describe("siege and victory", () => {
  function situation(level = 1, wall = 0, artillery = 0) {
    const s = funded(),
      target = ownTowns(s, 1)[0],
      tile = landAtVertex(s, target.vertex)[0];
    target.level = level;
    target.wall = wall;
    const u = piece(
      s,
      tile,
      0,
      artillery ? "artillery" : "heavy",
      artillery || 1,
    );
    s.phase = "military";
    return { s, target: target.id, u: u.id };
  }
  it.each([1, 2, 3, 4])(
    "matches town-level %i siege, raid, destroy timing",
    (level) => {
      let { s, target, u } = situation(level);
      for (let n = 0; n < level - 1; n++) {
        s = run(s, { type: "siege", ids: [u], town: target });
        expect(s.sieges[`0:${target}`].raided).toBeNull();
        nextOwnerTurn(s);
      }
      s = run(s, {
        type: "siege",
        ids: [u],
        town: target,
        goods: { grain: 1 },
      });
      expect(s.sieges[`0:${target}`].raided).not.toBeNull();
      expect(
        applyCommand(s, { type: "destroy-town", ids: [u], town: target }).ok,
      ).toBe(false);
      nextOwnerTurn(s);
      s = run(s, { type: "destroy-town", ids: [u], town: target });
      expect(s.towns[target]).toBeUndefined();
    },
  );
  it("adds wall tier once and artillery tier once", () => {
    const { s, target, u } = situation(4, 4, 3);
    expect(siegeRequirement(s, s.towns[target], [s.pieces[u]])).toBe(4);
  });
  it("a defender on any adjacent land hex blocks siege", () => {
    const { s, target, u } = situation();
    const tiles = landAtVertex(s, s.towns[target].vertex);
    const other = tiles.find((t) => t !== s.pieces[u].tile);
    if (!other) throw new Error("Fixture needs a second land hex.");
    piece(s, other, 1);
    expect(applyCommand(s, { type: "siege", ids: [u], town: target }).ok).toBe(
      false,
    );
  });
  it("splitting into more armies cannot raid then destroy in one turn", () => {
    let { s, target, u } = situation();
    const second = piece(s, s.pieces[u].tile);
    s = run(s, { type: "siege", ids: [u], town: target });
    expect(
      applyCommand(s, { type: "destroy-town", ids: [second.id], town: target })
        .ok,
    ).toBe(false);
  });
  it("eliminates rivals and finishes the game without victory points", () => {
    let s = funded();
    for (let i = 0; i < 3; i++) {
      s = run(s, { type: "surrender" });
      if (s.phase !== "finished") s.phase = "economy";
    }
    expect(s.phase).toBe("finished");
    expect(s.winner).toBe(3);
    assertInvariants(s);
  });
});
describe("save integrity", () => {
  it("round-trips a midgame and preserves deterministic continuation", () => {
    const s = funded(),
      copy = deserialize(serialize(s));
    expect(copy).toEqual(s);
    const action = { type: "end-turn" };
    expect(applyCommand(copy, action)).toEqual(applyCommand(s, action));
  });
  it("rejects damaged, foreign, and inconsistent files", () => {
    expect(() => deserialize("{}")).toThrow();
    const s = funded(),
      json = JSON.parse(serialize(s));
    json.game.active = 999;
    expect(() => deserialize(JSON.stringify(json))).toThrow();
    s.pieces.fake = { id: "fake" } as never;
    expect(() => deserialize(serialize(s))).toThrow();
  });
});

import { describe, expect, it } from "vitest";
import { applyCommand } from "../src/game/engine";
import { chooseAIAction, economyProjects } from "../src/game/ai";
import { expeditionCost } from "../src/game/content";
import {
  bombardmentTargets,
  expeditionSites,
  inventory,
  points,
} from "../src/game/selectors";
import { neighbors, unknownAtVertex } from "../src/game/world";
import { serialize, deserialize } from "../src/game/save";
import { piece, run } from "./helpers";
import { coastalFixture, frontierUnitFixture } from "./coastal-fixture";

describe("mobile expedition launch points", () => {
  it.each([false, true])(
    "launches all tiers from a disconnected border force (sea=%s)",
    (sea) => {
      for (const tier of [1, 2, 3]) {
        const { s, tile, unit } = frontierUnitFixture(sea),
          kind = sea ? "sea" : "land";
        unit.moved = 1; // A force may reach the border and launch in the same turn.
        const sites = expeditionSites(s, kind),
          vertex = tile.vertices.find((v) => sites.includes(v))!;
        expect(vertex).toBeTruthy();
        expect(expeditionSites(s, sea ? "land" : "sea")).not.toContain(vertex);
        const before = inventory(s),
          cost = expeditionCost(kind, tier);
        const next = run(s, { type: "expedition", vertex, kind, tier });
        expect(Object.keys(next.tiles).length).toBe(
          100 + [0, 10, 20, 40][tier],
        );
        for (const [good, amount] of Object.entries(cost))
          expect(inventory(next)[good as keyof typeof cost]).toBe(
            before[good as keyof typeof cost]! - amount!,
          );
        expect(next.pieces[unit.id]).toEqual(unit);
        expect(next.players[0].expeditionUsed).toBe(true);
        expect(deserialize(serialize(next))).toEqual(next);
        expect(
          applyCommand(next, { type: "expedition", vertex, kind, tier }).ok,
        ).toBe(false);
      }
    },
  );
  it("rejects enemy, new, embarked and non-frontier forces without spending", () => {
    const { s, tile, unit } = frontierUnitFixture();
    const vertex = tile.vertices.find((v) => unknownAtVertex(s, v).length)!;
    for (const patch of [
      { owner: 1 },
      { born: s.players[0].turns },
      { carrier: "dummy" },
      { tile: "0,0" },
    ]) {
      const copy = structuredClone(s);
      Object.assign(copy.pieces[unit.id], patch);
      const result = applyCommand(copy, {
        type: "expedition",
        kind: "land",
        tier: 1,
        vertex,
      });
      expect(result.ok).toBe(false);
      expect(result.state).toBe(copy);
    }
  });
  it("blocks an occupied launch and exposes mobile launches to the AI planner and free grants", () => {
    const { s, tile } = frontierUnitFixture(true);
    const vertex = expeditionSites(s, "sea")[0];
    const hostile = piece(s, tile.id, 1, "galley");
    expect(expeditionSites(s, "sea")).not.toContain(vertex);
    delete s.pieces[hostile.id];
    s.players[0].bonuses.expedition = true;
    s.players[0].bonuses.expeditionTier = 2;
    const project = economyProjects(s).find(
      (p) => p.action.type === "expedition" && p.action.kind === "sea",
    )!;
    expect(project).toBeTruthy();
    expect(project.cost).toEqual({});
    const next = run(s, project.action);
    expect(inventory(next)).toEqual(inventory(s));
    expect(next.players[0].bonuses.expedition).toBe(false);
  });
});

it("mobile launch points do not bypass the strongest-AI expedition restriction", () => {
  const { s } = frontierUnitFixture();
  s.players[0].control = "standard";
  const vertex = expeditionSites(s, "land")[0];
  expect(vertex).toBeTruthy();
  const result = applyCommand(s, {
    type: "expedition",
    kind: "land",
    vertex,
    tier: 1,
  });
  expect(result.ok).toBe(false);
  expect(result.error).toMatch(/strongest AI/);
  expect(result.state).toBe(s);
});

describe("shore bombardment", () => {
  it("sinks a ship in a one-tile lake without moving artillery into water", () => {
    const { s, gun, ship, water, shore } = coastalFixture();
    expect(
      neighbors(water).every((id) => s.tiles[id].resource !== "water"),
    ).toBe(true);
    const fighting = run(s, { type: "bombard", ids: [gun.id], to: water });
    expect(fighting.battle).toMatchObject({
      bombardment: true,
      attackerPower: 4,
      defenderPower: 2,
      required: 2,
    });
    const next = run(
      deserialize(serialize(fighting)),
      chooseAIAction(fighting),
    );
    expect(next.pieces[ship.id]).toBeUndefined();
    expect(next.pieces[gun.id]).toMatchObject({
      tile: shore,
      moved: 1,
      acted: false,
    });
  });
  it("rounds casualties to whole ships and leaves trapped survivors in place", () => {
    const { s, gun, ship, water, shore } = coastalFixture();
    gun.tier = 3;
    ship.kind = "carrack";
    const second = piece(s, water, 1, "transport", 2);
    const firing = run(s, { type: "bombard", ids: [gun.id], to: water });
    expect(firing.battle).toMatchObject({
      attackerPower: 6,
      defenderPower: 5,
      loss: 1,
      required: 2,
    });
    const next = run(firing, {
      type: "resolve-battle",
      actor: 1,
      ids: [second.id],
    });
    expect(next.pieces[ship.id].tile).toBe(water);
    expect(points(next.pieces[ship.id])).toBe(3);
    expect(next.pieces[gun.id].tile).toBe(shore);
    next.players[0].turns++;
    next.pieces[gun.id].moved = 0;
    next.pieces[gun.id].acted = false;
    const again = run(next, { type: "bombard", ids: [gun.id], to: water });
    expect(run(again, chooseAIAction(again)).pieces[ship.id]).toBeUndefined();
  });
  it("retreats surviving ships through water and keeps the battery ashore", () => {
    const { s, gun, ship, water, shore } = coastalFixture();
    gun.tier = 3;
    ship.kind = "carrack";
    const casualty = piece(s, water, 1, "transport", 2);
    s.tiles["0,1"].resource = "water";
    s.tiles["0,1"].number = 7;
    const firing = run(s, { type: "bombard", ids: [gun.id], to: water });
    expect(
      applyCommand(firing, {
        type: "resolve-battle",
        actor: 1,
        ids: [casualty.id],
      }).ok,
    ).toBe(false);
    const next = run(firing, {
      type: "resolve-battle",
      actor: 1,
      ids: [casualty.id],
      retreat: "0,1",
    });
    expect(next.pieces[ship.id].tile).toBe("0,1");
    expect(next.pieces[gun.id].tile).toBe(shore);
  });
  it("lets a stronger fleet retaliate against artillery alone, with correctly labeled losses", () => {
    const { s, gun, ship, shore, water } = coastalFixture();
    gun.tier = 1;
    ship.kind = "carrack";
    const civilian = piece(s, shore, 0, "merchant"),
      guard = piece(s, shore);
    const firing = run(s, { type: "bombard", ids: [gun.id], to: water });
    expect(firing.battle).toMatchObject({ loser: 0, required: 1 });
    const next = run(firing, chooseAIAction(firing));
    expect(next.pieces[gun.id]).toBeUndefined();
    expect(next.pieces[civilian.id]).toEqual(civilian);
    expect(next.pieces[guard.id]).toEqual(guard);
    expect(next.pieces[ship.id].tile).toBe(water);
    expect(next.events.some((e) => /lost 1 unit/.test(e.text))).toBe(true);
  });
  it("ties consume one movement point but cause no casualties", () => {
    const { s, gun, ship, water } = coastalFixture();
    gun.tier = 1;
    const next = run(s, { type: "bombard", ids: [gun.id], to: water });
    expect(next.battle).toBeUndefined();
    expect(next.pieces[ship.id]).toBeTruthy();
    expect(next.pieces[gun.id].acted).toBe(false);
    expect(next.pieces[gun.id].moved).toBe(1);
    expect(
      applyCommand(next, { type: "bombard", ids: [gun.id], to: water }).ok,
    ).toBe(false);
  });
  it("removes unarmed ships and handles passengers when their transport sinks", () => {
    const { s, gun, ship, water } = coastalFixture();
    ship.kind = "fishing";
    expect(
      run(s, { type: "bombard", ids: [gun.id], to: water }).pieces[ship.id],
    ).toBeUndefined();
    ship.kind = "transport";
    const passenger = piece(s, water, 1);
    passenger.carrier = ship.id;
    const firing = run(s, { type: "bombard", ids: [gun.id], to: water });
    const next = run(firing, chooseAIAction(firing));
    expect(next.pieces[ship.id]).toBeUndefined();
    expect(next.pieces[passenger.id]).toBeUndefined();
  });
  it("adds watchtower support once at each force's actual location", () => {
    const { s, gun, water, shore } = coastalFixture();
    const av = s.tiles[shore].vertices[0],
      dv = s.tiles[water].vertices.find((v) => v !== av)!;
    s.towers[av] = { id: "w10000", vertex: av, owner: 0, tier: 2 };
    s.towers[dv] = { id: "w10001", vertex: dv, owner: 1, tier: 1 };
    expect(
      run(s, { type: "bombard", ids: [gun.id], to: water }).battle,
    ).toMatchObject({ attackerPower: 6, defenderPower: 3 });
  });
  it("rejects invalid batteries, targets and exhausted units, but allows moving then firing with a movement buff", () => {
    const { s, gun, water } = coastalFixture();
    for (const patch of [
      { kind: "heavy" },
      { owner: 1 },
      { moved: 1 },
      { acted: true },
      { born: 10 },
      { carrier: "x" },
      { tile: "3,0" },
    ]) {
      const copy = structuredClone(s);
      Object.assign(copy.pieces[gun.id], patch);
      const result = applyCommand(copy, {
        type: "bombard",
        ids: [gun.id],
        to: water,
      });
      expect(result.ok).toBe(false);
      expect(result.state).toBe(copy);
    }
    expect(bombardmentTargets(s, ["missing"])).toEqual([]);
    gun.tile = "2,0";
    gun.bonus = 1;
    const moved = run(s, { type: "move", ids: [gun.id], to: "1,0" });
    expect(
      run(moved, { type: "bombard", ids: [gun.id], to: water }).pieces[gun.id]
        .moved,
    ).toBe(2);
  });
  it("AI fires winning shots, approaches coastal targets, and finances artillery", () => {
    const { s, gun, water, home } = coastalFixture();
    expect(chooseAIAction(s)).toMatchObject({
      type: "bombard",
      ids: [gun.id],
      to: water,
    });
    gun.tile = "2,0";
    expect(chooseAIAction(s)).toMatchObject({ type: "move", ids: [gun.id] });
    delete s.pieces[gun.id];
    home.level = home.turnLevel = 1;
    expect(
      economyProjects(s).some(
        (p) => p.action.type === "recruit" && p.action.kind === "artillery",
      ),
    ).toBe(true);
  });
});

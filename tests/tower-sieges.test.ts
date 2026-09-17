import type { Route } from "../src/game/types";
import { expect, it } from "vitest";
import { maritimeFixture } from "./maritime-fixture";
import { piece, run, nextOwnerTurn } from "./helpers";
import { applyCommand, eliminate } from "../src/game/engine";
import { breakSieges } from "../src/game/military";
import {
  siegeRequirement,
  towerSiegeRequirement,
  sumStock,
} from "../src/game/selectors";
import { towerDefense, towerPower } from "../src/game/maritime";
import { serialize, deserialize, assertInvariants } from "../src/game/save";
import { chooseAIAction } from "../src/game/ai";

function fixture(tier = 4) {
  const f = maritimeFixture();
  const tower = {
    id: `w${f.s.nextId++}`,
    vertex: f.enemy.vertex,
    owner: 1,
    tier,
  };
  f.s.towers[tower.vertex] = tower;
  const u = piece(f.s, "3,0", 0, "cavalry", 4);
  return { ...f, tower, u };
}
it.each([1, 2, 3, 4])(
  "tier %i tower has half defense rounded down and falls after the proper siege",
  (tier) => {
    let { s, tower, u } = fixture(tier);
    const required = Math.floor(tier / 2),
      key = `0:${tower.id}`;
    expect(towerSiegeRequirement(tower, [])).toBe(required);
    const command = {
      type: "destroy-tower",
      vertex: tower.vertex,
      ids: [u.id],
    };
    for (let n = 1; n <= required; n++) {
      s = run(s, command);
      expect(s.towers[tower.vertex]).toEqual(tower);
      expect(s.towerSieges![key]).toMatchObject({
        progress: n,
        last: s.players[0].turns,
        units: [u.id],
      });
      expect(towerDefense(s, 1, tower.vertex)).toBe(tier);
      expect(applyCommand(s, command).ok).toBe(false);
      assertInvariants(deserialize(serialize(s)));
      nextOwnerTurn(s);
    }
    const beforeStock = structuredClone(s.towns);
    s = run(s, command);
    expect(s.towers[tower.vertex]).toBeUndefined();
    expect(s.towerSieges?.[key]).toBeUndefined();
    expect(s.pieces[u.id]).toMatchObject({ moved: 1, acted: false });
    expect(towerDefense(s, 1, tower.vertex)).toBe(0);
    expect(towerPower(s, 1, u.tile)).toBe(0);
    expect(s.towns).toEqual(beforeStock);
    // Demolition leaves two cavalry points available.
    s = run(s, { type: "move", ids: [u.id], to: "2,0" });
    expect(s.pieces[u.id].moved).toBe(2);
  },
);
it.each([1, 2, 3, 4])(
  "artillery can immediately remove tier %i towers, without starting a siege",
  (tier) => {
    let { s, tower, u } = fixture(tier);
    u.kind = "artillery";
    u.tier = 4;
    s = run(s, { type: "destroy-tower", vertex: tower.vertex, ids: [u.id] });
    expect(s.towers[tower.vertex]).toBeUndefined();
    expect(Object.keys(s.towerSieges ?? {})).toHaveLength(0);
    expect(s.events.at(-1)?.text).toContain("Watchtower destroyed");
  },
);
it("tower siege counts only the selected army's artillery and keeps operations once per turn", () => {
  let { s, tower, u } = fixture(4);
  const sides = s.vertices[tower.vertex].tiles;
  piece(
    s,
    sides.find((t) => t !== u.tile)!,
    0,
    "artillery",
    4,
  );
  s = run(s, { type: "destroy-tower", vertex: tower.vertex, ids: [u.id] });
  expect(s.towerSieges![`0:${tower.id}`].progress).toBe(1);
  const gun = piece(s, u.tile, 0, "artillery", 2);
  expect(
    applyCommand(s, {
      type: "destroy-tower",
      vertex: tower.vertex,
      ids: [gun.id],
    }).ok,
  ).toBe(false);
  nextOwnerTurn(s);
  s = run(s, { type: "destroy-tower", vertex: tower.vertex, ids: [gun.id] });
  expect(s.towers[tower.vertex]).toBeUndefined();
});
it("withdrawal, defending reinforcements and skipping the next operation break a tower siege", () => {
  const { s, tower, u } = fixture(4);
  const first = run(s, {
    type: "destroy-tower",
    vertex: tower.vertex,
    ids: [u.id],
  });
  const withdrawn = structuredClone(first);
  withdrawn.pieces[u.id].tile = "-3,0";
  breakSieges(withdrawn);
  expect(Object.keys(withdrawn.towerSieges!)).toHaveLength(0);
  const reinforced = structuredClone(first);
  const side = s.vertices[tower.vertex].tiles.find((t) => t !== u.tile)!;
  piece(reinforced, side, 1, "heavy");
  breakSieges(reinforced);
  expect(Object.keys(reinforced.towerSieges!)).toHaveLength(0);
  nextOwnerTurn(first);
  const skipped = run(first, { type: "end-turn" });
  expect(Object.keys(skipped.towerSieges!)).toHaveLength(0);
});
it("rejects guards, merchants, new and exhausted units atomically", () => {
  const { s, tower, u } = fixture(1);
  const command = { type: "destroy-tower", vertex: tower.vertex, ids: [u.id] };
  for (const patch of [
    { moved: 3 },
    { born: 10 },
    { acted: true },
    { kind: "merchant" as const },
  ]) {
    const copy = structuredClone(s);
    Object.assign(copy.pieces[u.id], patch);
    const result = applyCommand(copy, command);
    expect(result.ok).toBe(false);
    expect(result.state).toBe(copy);
    expect(result.state.towers[tower.vertex]).toBeDefined();
  }
  piece(
    s,
    s.vertices[tower.vertex].tiles.find((t) => t !== u.tile)!,
    1,
    "heavy",
  );
  expect(applyCommand(s, command).ok).toBe(false);
});
it("save validation supports legacy saves and rejects malformed tower siege records; elimination cleans them", () => {
  const { s, tower, u } = fixture(4);
  expect(deserialize(serialize(s)).towerSieges).toBeUndefined();
  const first = run(s, {
    type: "destroy-tower",
    vertex: tower.vertex,
    ids: [u.id],
  });
  expect(deserialize(serialize(first))).toEqual(first);
  for (const patch of [
    { progress: -1 },
    { owner: 1 },
    { tower: "missing" },
    { vertex: "missing" },
    { units: [3] },
  ]) {
    const copy = structuredClone(first);
    Object.assign(copy.towerSieges![`0:${tower.id}`], patch);
    expect(() => deserialize(serialize(copy))).toThrow();
  }
  for (const [id, town] of Object.entries(first.towns))
    if (town.owner === 1) delete first.towns[id];
  eliminate(first);
  expect(Object.keys(first.towerSieges!)).toHaveLength(0);
});
it("AI continues a tower siege and destroys the exposed tower instead of marching away", () => {
  let { s, tower, u } = fixture(2);
  s = run(s, { type: "destroy-tower", vertex: tower.vertex, ids: [u.id] });
  nextOwnerTurn(s);
  const action = chooseAIAction(s);
  expect(action).toMatchObject({ type: "destroy-tower", vertex: tower.vertex });
  s = run(s, action);
  expect(s.towers[tower.vertex]).toBeUndefined();
});
it.each([0, 1])(
  "sufficient city siege power immediately raids with %i surplus and no preliminary siege step",
  (surplus) => {
    let { s, home, enemy } = maritimeFixture();
    enemy.level = enemy.turnLevel = 3;
    enemy.wall = 2;
    home.stock = {};
    enemy.stock = { steel: 3, gold: 2 };
    const gun = piece(s, "3,0", 0, "artillery", 4);
    const ids = [gun.id];
    if (surplus) ids.push(piece(s, "3,0", 0, "artillery", 1).id);
    expect(
      siegeRequirement(
        s,
        enemy,
        ids.map((id) => s.pieces[id]),
      ),
    ).toBe(0);
    s = run(s, { type: "siege", town: enemy.id, ids });
    expect(s.sieges[`0:${enemy.id}`]).toMatchObject({
      progress: 0,
      raided: 10,
    });
    expect(sumStock(s.towns[home.id].stock)).toBe(5);
    expect(s.events.at(-1)?.townAttack?.kind).toBe("raid");
    expect(
      applyCommand(s, { type: "destroy-town", town: enemy.id, ids }).ok,
    ).toBe(false);
  },
);
it.each([false, true])(
  "road/route demolition consumes one point after movement, including all camps (naval=%s)",
  (naval) => {
    let { s } = maritimeFixture();
    if (naval) for (const t of Object.values(s.tiles)) t.resource = "water";
    const edge = s.tiles["1,0"].edges[0];
    const r: Route = {
      id: `r${s.nextId++}`,
      edge,
      owner: 1,
      kind: naval ? ("route" as const) : ("road" as const),
      born: 0,
      camps: naval ? {} : { "1,0": 1 },
    };
    s.routes[edge] = r;
    const u = piece(s, "0,0", 0, naval ? "galley" : "cavalry");
    s = run(s, { type: "move", ids: [u.id], to: "1,0" });
    s = run(s, { type: "destroy-route", ids: [u.id], edge });
    expect(s.routes[edge]).toBeUndefined();
    expect(s.pieces[u.id]).toMatchObject({ moved: 2, acted: false });
    s = run(s, { type: "move", ids: [u.id], to: "0,0" });
    expect(s.pieces[u.id].moved).toBe(3);
    s.routes[edge] = r;
    s.pieces[u.id].tile = "1,0";
    expect(
      applyCommand(s, { type: "destroy-route", ids: [u.id], edge }).ok,
    ).toBe(false);
  },
);

it("AI targets a supporting tower before starting the longer city siege", () => {
  const { s, tower, enemy } = fixture(4);
  enemy.level = enemy.turnLevel = 4;
  expect(chooseAIAction(s)).toMatchObject({
    type: "destroy-tower",
    vertex: tower.vertex,
  });
});

import { describe, expect, it } from "vitest";
import { maritimeFixture, fishingFixture } from "./maritime-fixture";
import { piece, run } from "./helpers";
import { applyCommand } from "../src/game/engine";
import { COSTS, unitCost, shipCost, shipStats } from "../src/game/content";
import {
  colonizationSites,
  settlementSites,
  points,
  inventory,
  blockAt,
  protects,
  income,
  navalBlockAt,
  withPlanningFrame,
  prepareGameView,
} from "../src/game/selectors";
import { deserialize, serialize } from "../src/game/save";
import { colonistAction, colonistProjects } from "../src/game/ai-colonization";
import { neighbors } from "../src/game/world";

function frontier(naval = false) {
  const f = maritimeFixture();
  const tile = "-3,0";
  if (naval) f.s.tiles[tile].resource = "water";
  const u = piece(f.s, tile, 0, naval ? "settlership" : "settler");
  const vertex = colonizationSites(f.s, u)[0];
  expect(vertex).toBeTruthy();
  return { ...f, u, vertex };
}

it.each([false, true])(
  "indexed colony queries retain map order and readiness, naval=%s",
  (naval) => {
    const { s, u, home } = frontier(naval);
    s.vertices = Object.fromEntries(Object.entries(s.vertices).reverse());
    const expected = colonizationSites(s, u);
    expect(expected.length).toBeGreaterThan(0);
    withPlanningFrame(s, () => {
      expect(colonizationSites(s, u)).toEqual(expected);
      colonizationSites(s, u).reverse().pop();
      expect(colonizationSites(s, u)).toEqual(expected);
      expect(colonizationSites(s, { ...u, acted: true })).toEqual([]);
      expect(colonizationSites(s, { ...u, carrier: "ship" })).toEqual([]);
      expect(colonizationSites(s, { ...u, owner: 1 })).toEqual([]);
      expect(colonizationSites(s, { ...u, moved: 100 })).toEqual(expected);
      const draft = {
        ...s,
        towns: { ...s.towns, [home.id]: { ...home, vertex: expected[0] } },
      };
      expect(colonizationSites(draft, u)).not.toContain(expected[0]);
      expect(colonizationSites(s, u)).toEqual(expected);
    });
    prepareGameView(s);
    expect(colonizationSites(s, u)).toEqual(expected);
    const next = structuredClone(s);
    next.towers[expected[0]] = {
      id: "foe",
      owner: 1,
      tier: 1,
      vertex: expected[0],
    };
    withPlanningFrame(next, () =>
      expect(colonizationSites(next, next.pieces[u.id])).not.toContain(
        expected[0],
      ),
    );
    expect(colonizationSites(s, u)).toEqual(expected);
  },
);

describe("settlers", () => {
  it.each([false, true])(
    "charges exactly the base merchant plus settlement, naval=%s",
    (naval) => {
      const { s, home, water } = fishingFixture();
      const kind = naval ? "settlership" : "settler";
      const cost = naval
        ? shipCost(kind as "settlership")
        : unitCost("settler", 1);
      const merchant = naval
        ? shipCost("merchantship")
        : unitCost("merchant", 1);
      const expected = { ...COSTS.Settlement };
      for (const [g, n] of Object.entries(merchant))
        expected[g as keyof typeof expected] =
          (expected[g as keyof typeof expected] ?? 0) + n!;
      expect(cost).toEqual(expected);
      const tile = naval
        ? water
        : s.vertices[home.vertex].tiles.find(
            (id) => s.tiles[id].resource !== "water",
          )!;
      const before = inventory(s);
      const built = run(s, {
        type: naval ? "ship" : "recruit",
        town: home.id,
        tile,
        kind,
        tier: 1,
      });
      const u = Object.values(built.pieces)[0];
      expect(points(u)).toBe(0);
      expect(colonizationSites(built, u)).toEqual([]);
      for (const [g, n] of Object.entries(cost))
        expect(inventory(built)[g as keyof typeof before]).toBe(
          before[g as keyof typeof before]! - n!,
        );
      expect(
        applyCommand(s, {
          type: naval ? "ship" : "recruit",
          town: home.id,
          tile,
          kind,
          tier: 2,
        }).ok,
      ).toBe(false);
      expect(deserialize(serialize(built)).pieces[u.id].kind).toBe(kind);
    },
  );
  it.each([false, true])(
    "founds immediately without roads or another payment and consumes one unit, naval=%s",
    (naval) => {
      const { s, u, vertex } = frontier(naval);
      const second = piece(s, u.tile, 0, u.kind);
      u.moved = naval ? 2 : 1;
      expect(settlementSites(s)).not.toContain(vertex);
      const before = inventory(s);
      const next = run(s, { type: "colonize", ids: [u.id], vertex });
      expect(next.pieces[u.id]).toBeUndefined();
      expect(next.pieces[second.id]).toBeTruthy();
      const town = Object.values(next.towns).find((t) => t.vertex === vertex)!;
      expect(town).toMatchObject({
        level: 1,
        wall: 0,
        stock: {},
        turnLevel: 0,
        owner: 0,
      });
      expect(inventory(next)).toEqual(before);
      expect(deserialize(serialize(next)).towns[town.id]).toEqual(town);
      expect(
        applyCommand(next, { type: "colonize", ids: [second.id], vertex }).ok,
      ).toBe(false);
    },
  );
  it("rejects remote sites, foreign/non-settler/multiple units and embarked settlers atomically", () => {
    const { s, u, vertex } = frontier();
    const foe = piece(s, u.tile, 1, "settler"),
      guard = piece(s, u.tile, 0, "heavy");
    for (const ids of [[foe.id], [guard.id], [u.id, guard.id]])
      expect(applyCommand(s, { type: "colonize", ids, vertex }).ok).toBe(false);
    delete s.pieces[foe.id];
    const remote = settlementSites(s, 0, true).find(
      (v) => !s.tiles[u.tile].vertices.includes(v),
    )!;
    expect(
      applyCommand(s, { type: "colonize", ids: [u.id], vertex: remote }).ok,
    ).toBe(false);
    u.carrier = "missing";
    expect(applyCommand(s, { type: "colonize", ids: [u.id], vertex }).ok).toBe(
      false,
    );
    expect(Object.values(s.towns)).toHaveLength(2);
  });
  it("obeys spacing and refuses ice/peaks-only corners, enemy troops and enemy towers", () => {
    const { s, u, vertex, home } = frontier();
    for (const resource of ["ice", "peaks", "water"] as const) {
      const copy = structuredClone(s);
      for (const t of copy.vertices[vertex].tiles)
        copy.tiles[t].resource = resource;
      expect(
        applyCommand(copy, { type: "colonize", ids: [u.id], vertex }).ok,
      ).toBe(false);
    }
    const foe = piece(s, s.vertices[vertex].tiles[0], 1, "heavy");
    expect(colonizationSites(s, u)).not.toContain(vertex);
    delete s.pieces[foe.id];
    s.towers[vertex] = {
      id: "enemy-tower",
      owner: 1,
      vertex,
      tier: 1,
    };
    expect(colonizationSites(s, u)).not.toContain(vertex);
    delete s.towers[vertex];
    home.vertex = vertex;
    expect(colonizationSites(s, u)).not.toContain(vertex);
  });
  it("does not harvest, block production or protect a town", () => {
    const { s, home } = maritimeFixture();
    const tile = s.vertices[home.vertex].tiles[0];
    const before = income(s);
    piece(s, tile, 0, "settler");
    piece(s, tile, 1, "settler");
    expect(blockAt(s, tile)).toBe(false);
    expect(protects(s, home)).toBe(false);
    expect(income(s)).toEqual(before);
    s.tiles[tile].resource = "water";
    s.pieces = {};
    piece(s, tile, 1, "settlership");
    expect(navalBlockAt(s, tile)).toBe(false);
    expect(shipStats("settlership").capacity).toBe(0);
  });
  it.each([false, true])(
    "unescorted zero-power colonists die when attacked, naval=%s",
    (naval) => {
      const { s, u } = frontier(naval);
      u.owner = 1;
      const adjacent = neighbors(u.tile).find((t) => s.tiles[t])!;
      if (naval) s.tiles[adjacent].resource = "water";
      const guard = piece(s, adjacent, 0, naval ? "galley" : "heavy");
      const next = run(s, { type: "move", ids: [guard.id], to: u.tile });
      expect(next.pieces[u.id]).toBeUndefined();
      expect(next.pieces[guard.id].tile).toBe(u.tile);
      expect(next.battle).toBeUndefined();
    },
  );
  it("settler ships are removable by shore bombardment", () => {
    const { s, u } = frontier(true);
    u.owner = 1;
    const tile = neighbors(u.tile).find(
      (t) => s.tiles[t] && s.tiles[t].resource !== "water",
    )!;
    const artillery = piece(s, tile, 0, "artillery");
    const next = run(s, { type: "bombard", ids: [artillery.id], to: u.tile });
    expect(next.pieces[u.id]).toBeUndefined();
  });
  it("AI funds reachable colonies and founds them without repeated recruitment", () => {
    const { s, u } = frontier();
    const act = colonistAction(s);
    expect(act).toBeTruthy();
    expect(applyCommand(s, act!).ok).toBe(true);
    expect(
      colonistProjects(s).filter((p) => p.action.kind === "settler"),
    ).toEqual([]);
    delete s.pieces[u.id];
    const projects = colonistProjects(s);
    expect(projects.some((p) => p.action.kind === "settler")).toBe(true);
    for (const p of projects) expect(applyCommand(s, p.action).ok).toBe(true);
  });
});

it("land settlers can embark, disembark and found after their landing turn", () => {
  const { s, u, vertex } = frontier();
  const sea = neighbors(u.tile).find((t) => s.tiles[t])!;
  s.tiles[sea].resource = "water";
  const carrier = piece(s, sea, 0, "transport");
  let next = run(s, { type: "load", ids: [u.id], ships: [carrier.id] });
  expect(colonizationSites(next, next.pieces[u.id])).toEqual([]);
  next.players[0].turns++;
  for (const v of Object.values(next.pieces)) {
    v.acted = false;
    v.moved = 0;
  }
  next = run(next, {
    type: "unload",
    ids: [u.id],
    ships: [carrier.id],
    to: u.tile,
  });
  expect(colonizationSites(next, next.pieces[u.id])).toEqual([]);
  next.players[0].turns++;
  next.pieces[u.id].acted = false;
  next = run(next, { type: "colonize", ids: [u.id], vertex });
  expect(Object.values(next.towns).some((t) => t.vertex === vertex)).toBe(true);
  expect(next.pieces[carrier.id]).toBeTruthy();
});
it("AI sails to productive coastlines and actually establishes a colony", () => {
  const { s, home, enemy } = maritimeFixture();
  for (const t of Object.values(s.tiles)) t.resource = "water";
  s.tiles["0,0"].resource = "grain";
  s.tiles["3,0"].resource = "grain";
  s.tiles["-3,0"].resource = "gold";
  home.vertex = s.tiles["0,0"].vertices[0];
  enemy.vertex = s.tiles["3,0"].vertices[0];
  piece(s, "-1,0", 0, "settlership");
  let next = s,
    founded = false;
  for (let step = 0; step < 16; step++) {
    const action = colonistAction(next);
    if (action) {
      next = run(next, action);
      if (action.type === "colonize") {
        founded = true;
        break;
      }
    } else {
      next.players[0].turns++;
      for (const u of Object.values(next.pieces)) {
        u.acted = false;
        u.moved = 0;
      }
    }
  }
  expect(founded).toBe(true);
  expect(
    Object.values(next.towns).some((t) =>
      s.tiles["-3,0"].vertices.includes(t.vertex),
    ),
  ).toBe(true);
});

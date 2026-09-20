import { describe, it, expect } from "vitest";
import { funded, piece, run, nextOwnerTurn } from "./helpers";
import { applyCommand } from "../src/game/engine";
import { production } from "../src/game/economy";
import { inventory, ownTowns, nearestTown, power } from "../src/game/selectors";
import { landAtVertex, hash } from "../src/game/world";
import { COSTS, campCost } from "../src/game/content";
import { RAW, GOODS, type Stock } from "../src/game/types";
import { serialize, deserialize, assertInvariants } from "../src/game/save";

describe("second edition economy", () => {
  it("has no upkeep step or passive military payment", () => {
    let s = funded();
    const tile = landAtVertex(s, ownTowns(s)[0].vertex)[0];
    for (let i = 0; i < 60; i++) piece(s, tile, 0, "heavy", 3);
    for (const t of ownTowns(s)) t.stock = {};
    nextOwnerTurn(s);
    expect(Object.keys(s.pieces)).toHaveLength(60);
    expect(Object.values(inventory(s)).every((n) => n === 0)).toBe(true);
    s.phase = "roll";
    s = run(s, { type: "roll" });
    expect(s.phase).toBe("economy");
    expect(Object.keys(s.pieces)).toHaveLength(60);
    expect(applyCommand(s, { type: "supply" }).ok).toBe(false);
  });
  it("lets one road build and upgrade a camp on each land side", () => {
    let s = funded();
    const e = Object.values(s.edges).find(
      (e) =>
        e.tiles.length === 2 &&
        e.tiles.every((id) => s.tiles[id].resource !== "water"),
    )!;
    s.routes[e.id] = {
      id: `r${s.nextId++}`,
      edge: e.id,
      owner: 0,
      kind: "road",
      born: 0,
      camps: {},
    };
    for (const tile of e.tiles) {
      s = run(s, { type: "camp", edge: e.id, tile });
      s = run(s, { type: "camp", edge: e.id, tile });
    }
    expect(s.routes[e.id].camps).toEqual(
      Object.fromEntries(e.tiles.map((t) => [t, 2])),
    );
    expect(
      applyCommand(s, { type: "camp", edge: e.id, tile: e.tiles[0] }).ok,
    ).toBe(false);
    assertInvariants(s);
  });
  it("allows all six roads around a tile to have camps across owners", () => {
    let s = funded();
    const tile = Object.values(s.tiles).find((t) => t.resource !== "water")!;
    for (let i = 0; i < tile.edges.length; i++) {
      const edge = tile.edges[i];
      s.active = i % 4;
      s.routes[edge] = {
        id: `r${s.nextId++}`,
        edge,
        owner: s.active,
        kind: "road",
        born: 0,
        camps: {},
      };
      s = run(s, { type: "camp", edge, tile: tile.id });
    }
    expect(
      Object.values(s.routes).filter((r) => r.camps[tile.id]),
    ).toHaveLength(6);
    assertInvariants(s);
  });
  it("tier II produces two raw cards, stores them locally, and hostile occupation blocks it", () => {
    const s = funded();
    const tile = Object.values(s.tiles).find((t) => t.resource === "coal")!,
      edge = tile.edges[0];
    for (const t of Object.values(s.tiles)) t.number = 2;
    tile.number = 7;
    for (const t of Object.values(s.towns)) t.stock = {};
    s.routes[edge] = {
      id: `r${s.nextId++}`,
      edge,
      owner: 0,
      kind: "road",
      born: 0,
      camps: { [tile.id]: 2 },
    };
    const destination = nearestTown(s, tile.id, 0)!;
    const baseline = structuredClone(s);
    production(baseline, 7);
    production(s, 7);
    expect(destination.stock.coal).toBe(
      (s.vertices[destination.vertex].tiles.includes(tile.id)
        ? destination.level
        : 0) + 2,
    );
    const before = structuredClone(inventory(s));
    piece(s, tile.id, 1);
    production(s, 7);
    expect(inventory(s)).toEqual(before);
  });
  it("road destruction removes both camps together", () => {
    let s = funded();
    s.phase = "military";
    const e = Object.values(s.edges).find(
      (e) =>
        e.tiles.length === 2 &&
        e.tiles.every((id) => s.tiles[id].resource !== "water"),
    )!;
    s.routes[e.id] = {
      id: `r${s.nextId++}`,
      edge: e.id,
      owner: 1,
      kind: "road",
      born: 0,
      camps: Object.fromEntries(e.tiles.map((id) => [id, 2])),
    };
    const u = piece(s, e.tiles[0]);
    s = run(s, { type: "destroy-route", ids: [u.id], edge: e.id });
    expect(s.routes[e.id]).toBeUndefined();
  });
  it("basic camps cost one card of each of two raw types, excluding their output", () => {
    for (const raw of RAW) {
      expect(campCost(raw)[raw] ?? 0).toBe(0);
      expect(Object.keys(campCost(raw))).toHaveLength(2);
      for (const good of Object.keys(campCost(raw)))
        expect(RAW).toContain(good);
      expect(Object.values(campCost(raw)).reduce((a, b) => a! + b!, 0)).toBe(2);
      expect(campCost(raw, 2)).toBeDefined();
    }
  });
  it("limits every recipe to five types with five types reserved for the city capstone and prepaid settlers", () => {
    const recipes = Object.entries(COSTS);
    expect(
      recipes
        .filter(([, c]) => Object.keys(c).length === 5)
        .map(([name]) => name)
        .sort(),
    ).toEqual(["City III / level 4", "Settler Ship", "Settlers"]);
    for (const [, c] of recipes) {
      expect(Object.keys(c).length).toBeLessThanOrEqual(5);
      for (const [g, n] of Object.entries(c)) {
        expect(GOODS).toContain(g);
        expect(Number.isInteger(n) && n! > 0).toBe(true);
      }
    }
    for (const g of GOODS.filter(
      (g) => !["fish", "meat", "oil", "gold", "goldbars"].includes(g),
    ))
      expect(recipes.filter(([, c]) => c[g]).length).toBeGreaterThanOrEqual(3);
  });
});

describe("field combat and complete warehouse raids", () => {
  it("transfers an unlimited whole warehouse directly to the nearest raider town", () => {
    let s = funded();
    s.phase = "military";
    const target = ownTowns(s, 1)[0],
      tile = landAtVertex(s, target.vertex)[0];
    target.stock = { grain: 999, steel: 111, leather: 87 };
    const goods = { ...target.stock };
    const u = piece(s, tile, 0, "heavy", 1),
      home = nearestTown(s, tile, 0)!;
    const before = { ...home.stock };
    s = run(s, { type: "siege", town: target.id, ids: [u.id] });
    expect(s.towns[target.id].stock).toEqual({});
    for (const [g, n] of Object.entries(goods))
      expect(s.towns[home.id].stock[g as keyof Stock]).toBe(
        (before[g as keyof Stock] ?? 0) + n,
      );
    expect(s.pieces[u.id]).not.toHaveProperty("cargo");
    expect(
      applyCommand(s, { type: "destroy-town", town: target.id, ids: [u.id] })
        .ok,
    ).toBe(false);
    nextOwnerTurn(s);
    s = run(s, { type: "destroy-town", town: target.id, ids: [u.id] });
    expect(s.towns[target.id]).toBeUndefined();
  });
  it("walls and nearby towns do not multiply artillery field power", () => {
    const s = funded();
    const town = ownTowns(s, 1)[0],
      tile = landAtVertex(s, town.vertex)[0];
    town.level = 4;
    town.wall = 4;
    const artillery = piece(s, tile, 0, "artillery", 3);
    expect(power(s, [artillery], tile)).toBe(3);
    town.wall = 0;
    expect(power(s, [artillery], tile)).toBe(3);
  });
  it("a defender on another adjacent land hex prevents siege regardless of artillery", () => {
    const s = funded();
    s.phase = "military";
    const town = ownTowns(s, 1).find(
      (t) => landAtVertex(s, t.vertex).length > 1,
    )!;
    const tiles = landAtVertex(s, town.vertex);
    const a = piece(s, tiles[0], 0, "artillery", 3);
    piece(s, tiles[1], 1, "light", 1);
    expect(
      applyCommand(s, { type: "siege", town: town.id, ids: [a.id] }).error,
    ).toMatch(/every defending army/);
  });
});

describe("first edition save migration", () => {
  it("preserves the map, stores old loot, removes supply, and converts the camp", () => {
    const s = funded();
    const tile = landAtVertex(s, ownTowns(s)[0].vertex)[0],
      u = piece(s, tile),
      home = nearestTown(s, tile, 0)!;
    const edge = s.tiles[tile].edges[0];
    s.routes[edge] = {
      id: `r${s.nextId++}`,
      edge,
      owner: 0,
      kind: "road",
      born: 0,
      camps: { [tile]: 1 },
    };
    const old = JSON.parse(serialize(s)).game;
    old.version = 1;
    old.generation = 1;
    old.phase = "supply";
    old.pieces[u.id].cargo = { steel: 5 };
    for (const r of Object.values(old.routes) as any[]) {
      r.camp = Object.keys(r.camps)[0];
      delete r.camps;
    }
    const before = s.towns[home.id].stock.steel!;
    const restored = deserialize(
      JSON.stringify({
        format: "catane-frontiers",
        version: 1,
        checksum: hash(JSON.stringify(old)).toString(16),
        game: old,
      }),
    );
    expect(restored.version).toBe(5);
    expect(restored.phase).toBe("economy");
    expect(restored.tiles).toEqual(s.tiles);
    expect(restored.routes[edge].camps).toEqual({ [tile]: 1 });
    expect(restored.pieces[u.id]).not.toHaveProperty("cargo");
    expect(restored.towns[home.id].stock.steel).toBe(before + 5);
    assertInvariants(restored);
  });
});

it.each([2, 3])(
  "recalculates pending old fortified combat against a tier-%i defender",
  (tier) => {
    let s = funded();
    s.phase = "military";
    s.tiles["0,0"].resource = "grain";
    s.tiles["1,0"].resource = "grain";
    const a = piece(s, "0,0", 0, "artillery", 2),
      d = piece(s, "1,0", 1, "heavy", tier);
    s = run(s, { type: "move", ids: [a.id], to: d.tile });
    // Simulate an unresolved first-edition battle where the old ×2 artillery bonus applied.
    const old = JSON.parse(serialize(s)).game;
    old.version = old.generation = 1;
    for (const tile of Object.values(old.tiles) as any[])
      if (tile.resource !== "water") delete tile.fish;
    old.battle = {
      attacker: 0,
      defender: 1,
      attackers: [a.id],
      defenders: [d.id],
      origin: "0,0",
      target: "1,0",
      naval: false,
      attackerPower: 4,
      defenderPower: tier,
      loser: 1,
      loss: 4 - tier,
      required: tier,
      fort: ownTowns(s, 1)[0].id,
    };
    for (const r of Object.values(old.routes) as any[]) {
      delete r.camps;
    }
    const migrated = deserialize(
      JSON.stringify({
        format: "catane-frontiers",
        version: 1,
        game: old,
        checksum: hash(JSON.stringify(old)).toString(16),
      }),
    );
    if (tier === 2) expect(migrated.battle).toBeUndefined();
    else {
      expect(migrated.battle?.attackerPower).toBe(3);
      expect(migrated.battle?.loser).toBe(0);
      expect(migrated.battle?.required).toBe(3);
    }
  },
);

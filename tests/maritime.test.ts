import { describe, it, expect } from "vitest";
import { newGame, applyCommand } from "../src/game/engine";
import { generateHex, addHexes, neighbors, randomAt } from "../src/game/world";
import { GOODS, RAW, PROCESSED, type ShipClass } from "../src/game/types";
import {
  COSTS,
  shipCost,
  shipStats,
  SHIP_NAMES,
  TOWER_COSTS,
} from "../src/game/content";
import {
  inventory,
  ownTowns,
  power,
  points,
  speed,
  income,
  bankRate,
  siegeRequirement,
  productionSources,
  protects,
  minCasualties,
} from "../src/game/selectors";
import {
  defaultCoverage,
  harvestTiles,
  towerDefense,
  towerPower,
  towerSites,
  tileGood,
} from "../src/game/maritime";
import { setTile, removePieces } from "../src/game/military";
import { production } from "../src/game/economy";
import { serialize, deserialize, assertInvariants } from "../src/game/save";
import { hash } from "../src/game/world";
import { chooseAIAction, marginalValues } from "../src/game/ai";
import { tradeValuation, marketValues } from "../src/game/ai-market";
import { rollReport } from "../src/ui/roll-report";
import { piece, run, nextOwnerTurn } from "./helpers";
import { maritimeFixture, fishingFixture } from "./maritime-fixture";

describe("coastal fisheries and weighted Gold", () => {
  it("generates 50/50 terrain, half-weight Gold and a 15% independent coastal fish chance", () => {
    let sea = 0,
      coast = 0,
      fish = 0,
      gold = 0;
    const raw: Record<string, number> = {};
    for (let i = 0; i < 20000; i++) {
      const t = generateHex("maritime-random", `${i},0`);
      expect(t.resource === "water").toBe(
        randomAt("maritime-random", t.id, "terrain") < 0.5,
      );
      if (t.resource === "water") {
        sea++;
        const coastal = neighbors(t.id).some(
          (id) => generateHex("maritime-random", id).resource !== "water",
        );
        if (coastal) coast++;
        expect(!!t.fish).toBe(
          randomAt("maritime-random", t.id, "fish") < (coastal ? 0.15 : 0.1),
        );
        if (t.fish && coastal) fish++;
      } else if (t.resource === "gold") gold++;
      else raw[t.resource] = (raw[t.resource] ?? 0) + 1;
      expect(t.resource).not.toBe("fish");
      expect(t.number).toBeGreaterThanOrEqual(2);
      expect(t.number).toBeLessThanOrEqual(12);
    }
    expect(sea / 20000).toBeGreaterThan(0.48);
    expect(sea / 20000).toBeLessThan(0.52);
    expect(fish / coast).toBeGreaterThan(0.135);
    expect(fish / coast).toBeLessThan(0.165);
    for (const count of Object.values(raw)) {
      expect(gold / count).toBeGreaterThan(0.4);
      expect(gold / count).toBeLessThan(0.6);
    }
  });
  it("uses preserved legacy coastlines when expeditions add numbered fishing water", () => {
    const seed = "legacy-coast";
    const id = Array.from({ length: 1000 }, (_, i) => `${i},0`).find(
      (id) => generateHex(seed, id).fish && randomAt(seed, id, "fish") >= 0.1,
    )!;
    const world = {
      tiles: {},
      vertices: {},
      edges: {},
    } as import("../src/game/types").World;
    addHexes(world, seed, neighbors(id));
    for (const tile of Object.values(world.tiles)) {
      tile.resource = "water";
      delete tile.fish;
      delete tile.whale;
    }
    addHexes(world, seed, [id]);
    expect(world.tiles[id].fish).toBeUndefined();
    expect(
      neighbors(id).every((n) => world.tiles[n].resource === "water"),
    ).toBe(true);
  });
  it("pays any Grain recipe from Grain first then Fish, without substituting in trades", () => {
    let { s, home } = maritimeFixture();
    home.level = home.turnLevel = 1;
    home.stock = { ore: 3, grain: 1, fish: 4 };
    s = run(s, { type: "city", town: home.id });
    expect(s.towns[home.id].stock).toEqual({ fish: 3 });
    expect(COSTS["City I / level 2"]).toEqual({ ore: 3, grain: 2 });
    expect(
      applyCommand(s, { type: "bank", give: { grain: 4 }, take: { lumber: 1 } })
        .ok,
    ).toBe(false);
  });
  it("collects city Fish, route fisheries and Smokehouse output without consuming Fish", () => {
    let { s, home, edge, water } = fishingFixture();
    s = run(s, { type: "route", edge: edge.id });
    s = run(s, { type: "camp", edge: edge.id, tile: water });
    s = run(s, { type: "camp", edge: edge.id, tile: water });
    s = run(s, { type: "extension", town: home.id, tile: water });
    const before = inventory(s);
    production(s, 7);
    expect(inventory(s).fish! - before.fish!).toBe(6);
    expect(inventory(s).provisions! - before.provisions!).toBe(5);
    expect(s.towns[home.id].extensions[water]).toBe(1);
    expect(tileGood(s.tiles[water])).toBe("fish");
    assertInvariants(s);
  });
  it("blocks town and fishery production with an enemy fleet", () => {
    const { s, water } = fishingFixture();
    piece(s, water, 1, "galley");
    production(s, 7);
    expect(s.production[0].fish ?? 0).toBe(0);
  });
  it("produces Gold and bars additively and builds a two-card Gold camp", () => {
    let { s, home } = maritimeFixture();
    s.tiles["0,0"].resource = "gold";
    const edge = s.tiles["0,0"].edges.find((id) =>
      s.edges[id].vertices.includes(home.vertex),
    )!;
    s = run(s, { type: "road", edge });
    const before = inventory(s);
    s = run(s, { type: "camp", edge, tile: "0,0" });
    expect(inventory(s).ore).toBe(before.ore! - 1);
    expect(inventory(s).hides).toBe(before.hides! - 1);
    s = run(s, { type: "extension", town: home.id, tile: "0,0" });
    const stock = inventory(s);
    production(s, 7);
    expect(inventory(s).gold! - stock.gold!).toBe(5);
    expect(inventory(s).goldbars! - stock.goldbars!).toBe(3);
    expect(power(s, [piece(s, "0,0", 0, "heavy", 2)], "0,0")).toBe(4);
  });
  it.each(RAW)(
    "exchanges Gold and bars for %s at exact whole-card rates",
    (raw) => {
      let { s, home } = maritimeFixture();
      home.stock = { gold: 20, goldbars: 10 };
      if (raw !== "gold")
        s = run(s, { type: "bank", give: { gold: 1 }, take: { [raw]: 1 } });
      const before = inventory(s)[raw] ?? 0;
      s = run(s, { type: "bank", give: { goldbars: 1 }, take: { [raw]: 2 } });
      expect(inventory(s)[raw]).toBe(before + 2);
      expect(bankRate(s, "goldbars", raw)).toBe(0.5);
    },
  );
  it.each(PROCESSED.filter((g) => g !== "goldbars"))(
    "exchanges precious metals for processed %s",
    (good) => {
      let { s, home } = maritimeFixture();
      home.stock = { gold: 2, goldbars: 1 };
      s = run(s, { type: "bank", give: { gold: 2 }, take: { [good]: 1 } });
      s = run(s, { type: "bank", give: { goldbars: 1 }, take: { [good]: 1 } });
      expect(inventory(s)[good]).toBe(2);
    },
  );
  it("rejects fractional bars and underpaid Gold conversions without changing stores", () => {
    const { s } = maritimeFixture();
    for (const c of [
      { type: "bank", give: { goldbars: 0.5 }, take: { grain: 1 } },
      { type: "bank", give: { gold: 1 }, take: { steel: 1 } },
    ])
      expect(applyCommand(s, c).ok).toBe(false);
  });
});

describe("watchtower support", () => {
  it("builds successive tiers on roads with exact costs, without settlement spacing", () => {
    let { s, home } = maritimeFixture();
    const edge = s.vertices[home.vertex].edges[0];
    s = run(s, { type: "road", edge });
    for (let tier = 1; tier <= 4; tier++) {
      const before = inventory(s);
      s = run(s, { type: "tower", vertex: home.vertex });
      expect(s.towers[home.vertex].tier).toBe(tier);
      for (const g of GOODS)
        expect((before[g] ?? 0) - (inventory(s)[g] ?? 0)).toBe(
          TOWER_COSTS[tier][g] ?? 0,
        );
    }
    expect(applyCommand(s, { type: "tower", vertex: home.vertex }).ok).toBe(
      false,
    );
    const other = s.edges[edge].vertices.find((v) => v !== home.vertex)!;
    s = run(s, { type: "tower", vertex: other });
    expect(s.towers[other].tier).toBe(1);
    assertInvariants(s);
  });
  it("adds tower tiers once per army after terrain bonuses, to sea battles and to siege defense", () => {
    const { s, home, water } = fishingFixture();
    s.towers[home.vertex] = {
      id: "w900",
      vertex: home.vertex,
      owner: 0,
      tier: 3,
    };
    const land = s.vertices[home.vertex].tiles.find(
      (id) => s.tiles[id].resource !== "water",
    )!;
    s.tiles[land].resource = "gold";
    const army = [piece(s, land, 0, "heavy", 2), piece(s, land, 0, "heavy", 1)];
    expect(power(s, army, land)).toBe(9);
    expect(power(s, [piece(s, water, 0, "galley", 2)], water)).toBe(6);
    expect(power(s, [piece(s, water, 0, "fishing", 1)], water)).toBe(3);
    expect(power(s, [piece(s, water, 0, "merchantship", 1)], water)).toBe(3);
    expect(towerDefense(s, 0, home.vertex)).toBe(3);
    expect(siegeRequirement(s, home, [])).toBe(6);
    expect(siegeRequirement(s, home, [piece(s, land, 1, "artillery", 4)])).toBe(
      2,
    );
    expect(power(s, [piece(s, land, 0, "merchant", 4)], land)).toBe(0);
  });
  it("requires a road and lets an armed enemy destroy an unguarded tower", () => {
    let { s, home } = maritimeFixture();
    expect(towerSites(s)).not.toContain(home.vertex);
    s.towers[home.vertex] = {
      id: "w901",
      vertex: home.vertex,
      owner: 0,
      tier: 1,
    };
    const raider = piece(s, "0,0", 1, "heavy");
    s.active = 1;
    s = run(s, {
      type: "destroy-tower",
      vertex: home.vertex,
      ids: [raider.id],
    });
    expect(s.towers[home.vertex]).toBeUndefined();
    expect(s.pieces[raider.id].acted).toBe(false);
    expect(s.pieces[raider.id].moved).toBe(1);
  });
  it("palisades cost exactly one Wood", () => {
    let { s, home } = maritimeFixture();
    home.stock = { lumber: 1 };
    s = run(s, { type: "wall", town: home.id });
    expect(s.towns[home.id].wall).toBe(1);
    expect(inventory(s).lumber ?? 0).toBe(0);
  });
});

describe("tiered fleets and merchants", () => {
  for (const kind of Object.keys(SHIP_NAMES) as ShipClass[])
    it.each([1, 2, 3, 4])(
      `builds ${kind} tier %s with the right price and stats`,
      (tier) => {
        let { s, home, water } = fishingFixture();
        const before = inventory(s);
        s = run(s, { type: "ship", town: home.id, tile: water, kind, tier });
        const u = Object.values(s.pieces)[0];
        expect(u.tier).toBe(tier);
        expect(points(u)).toBe(shipStats(kind, tier).power);
        expect(speed(u)).toBe(shipStats(kind, tier).speed);
        for (const [g, n] of Object.entries(shipCost(kind, tier)))
          expect(
            before[g as keyof typeof before]! -
              inventory(s)[g as keyof typeof before]!,
          ).toBe(n);
        const recipe = shipCost(kind, tier);
        expect(Object.keys(recipe).length).toBeLessThanOrEqual(4);
        if (tier === 1)
          expect(Object.keys(recipe).every((g) => RAW.includes(g as any))).toBe(
            true,
          );
        if (tier === 2) {
          expect(recipe.lumber).toBeGreaterThan(0);
          expect(
            Object.keys(recipe).filter((g) => PROCESSED.includes(g as any)),
          ).toHaveLength(1);
        }
        if (tier >= 3) expect(recipe.planks).toBeGreaterThan(0);
        assertInvariants(s);
      },
    );
  it("fishing ships collect only Fish from themselves and neighboring water", () => {
    const { s, water } = fishingFixture();
    const adjacent = neighbors(water).find(
      (id) => s.tiles[id] && id !== "0,0",
    )!;
    s.tiles[adjacent].resource = "water";
    s.tiles[adjacent].fish = true;
    const ship = piece(s, water, 0, "fishing", 3);
    const covered = harvestTiles(s, ship);
    expect(covered).toContain(water);
    expect(covered).toContain(adjacent);
    production(s, 7);
    expect(s.production[0].fish).toBe(
      productionSources(s)
        .filter((x) => x.owner === 0 && x.good === "fish")
        .reduce((n, x) => n + x.amount, 0),
    );
    expect(covered.every((id) => s.tiles[id].fish)).toBe(true);
  });
  it("merchant ships collect adjoining land even under enemy occupation, not Fish", () => {
    const { s, water } = fishingFixture();
    const land = neighbors(water).find(
      (id) => s.tiles[id]?.resource === "grain",
    )!;
    s.tiles[land].resource = "gold";
    piece(s, land, 1, "heavy");
    const ship = piece(s, water, 0, "merchantship", 2);
    expect(harvestTiles(s, ship)).toContain(land);
    expect(harvestTiles(s, ship)).not.toContain(water);
    production(s, 7);
    expect(s.production[0].gold).toBe(2);
  });
  it("land merchants choose Gold, then likely rolls, permit manual Fish coverage and reset after moving", () => {
    let { s } = maritimeFixture();
    const u = piece(s, "0,0", 0, "merchant", 2);
    const adj = neighbors(u.tile);
    s.tiles[adj[0]].resource = "gold";
    s.tiles[adj[0]].number = 2;
    s.tiles[adj[1]].resource = "water";
    s.tiles[adj[1]].fish = true;
    s.tiles[adj[1]].number = 7;
    expect(defaultCoverage(s, u)[0]).toBe(adj[0]);
    expect(defaultCoverage(s, u)).toHaveLength(2);
    s = run(s, { type: "coverage", target: u.id, ids: [adj[1]] });
    expect(harvestTiles(s, s.pieces[u.id])).toEqual(["0,0", adj[1]]);
    expect(
      applyCommand(s, { type: "coverage", target: u.id, ids: adj.slice(0, 3) })
        .ok,
    ).toBe(false);
    expect(
      applyCommand(s, { type: "coverage", target: u.id, ids: ["3,0"] }).ok,
    ).toBe(false);
    s = run(s, { type: "move", ids: [u.id], to: adj[2] });
    expect(s.pieces[u.id].coverage).toBeUndefined();
    expect(s.pieces[u.id].moved).toBe(1);
  });
  it("merchants ignore occupation for harvest but cannot guard, siege or cut roads", () => {
    let { s, home, enemy } = maritimeFixture();
    const u = piece(s, "0,0", 0, "merchant", 3);
    s.tiles["1,0"].resource = "gold";
    piece(s, "1,0", 1, "heavy");
    u.coverage = ["1,0"];
    expect(protects(s, home)).toBe(false);
    expect(points(u)).toBe(0);
    production(s, 7);
    expect(s.production[0].gold).toBe(3);
    enemy.vertex = s.tiles["0,0"].vertices[2];
    expect(
      applyCommand(s, { type: "siege", town: enemy.id, ids: [u.id] }).ok,
    ).toBe(false);
  });
  it("destroys land merchants on both sides even in a tied battle", () => {
    let { s } = maritimeFixture();
    const army = piece(s, "0,0", 0, "heavy"),
      merchant = piece(s, "0,0", 0, "merchant", 4);
    piece(s, "1,0", 1, "heavy");
    const enemy = piece(s, "1,0", 1, "merchant", 2);
    s = run(s, { type: "move", ids: [army.id, merchant.id], to: "1,0" });
    expect(s.battle).toBeUndefined();
    expect(s.pieces[merchant.id]).toBeUndefined();
    expect(s.pieces[enemy.id]).toBeUndefined();
    expect(s.pieces[army.id]).toBeDefined();
  });
  it("automatically sinks a zero-power fishing ship and uses whole-unit losses for higher merchant ships", () => {
    let { s, water } = fishingFixture();
    const to = neighbors(water).find((id) => s.tiles[id])!;
    s.tiles[to].resource = "water";
    const war = piece(s, water, 0, "galley", 2),
      fishing = piece(s, to, 1, "fishing", 1);
    s = run(s, { type: "move", ids: [war.id], to });
    expect(s.battle).toBeUndefined();
    expect(s.pieces[fishing.id]).toBeUndefined();
    expect(s.pieces[war.id].tile).toBe(to);
    const merchant = piece(s, water, 1, "merchantship", 4);
    expect(points(merchant)).toBe(3);
    expect(minCasualties([merchant], 2)).toBe(3);
  });
  it("tiered convoys carry their actual capacity and rescue passengers into surviving berths", () => {
    let { s, water } = fishingFixture();
    const land = neighbors(water).find(
      (id) => s.tiles[id]?.resource === "grain",
    )!;
    const ship = piece(s, water, 0, "convoy", 4),
      units = Array.from({ length: 8 }, () => piece(s, land, 0, "heavy"));
    s = run(s, { type: "load", ids: units.map((u) => u.id), ships: [ship.id] });
    expect(
      Object.values(s.pieces).filter((u) => u.carrier === ship.id),
    ).toHaveLength(8);
    const survivor = piece(s, water, 0, "convoy", 4);
    removePieces(s, [ship.id], [ship, survivor]);
    expect(units.every((u) => s.pieces[u.id].carrier === survivor.id)).toBe(
      true,
    );
    assertInvariants(s);
  });
  it("clears merchant coverage when embarking, carrying and landing", () => {
    let { s, water } = fishingFixture();
    const land = neighbors(water).find(
      (id) => s.tiles[id]?.resource === "grain",
    )!;
    const merchant = piece(s, land, 0, "merchant", 2);
    const ship = piece(s, water, 0, "convoy", 4);
    merchant.coverage = defaultCoverage(s, merchant);
    s = run(s, { type: "load", ids: [merchant.id], ships: [ship.id] });
    expect(s.pieces[merchant.id].coverage).toBeUndefined();
    expect(harvestTiles(s, s.pieces[merchant.id])).toEqual([]);
    s.pieces[merchant.id].coverage = [land];
    setTile(s, s.pieces[ship.id], water);
    expect(s.pieces[merchant.id].coverage).toBeUndefined();
    nextOwnerTurn(s);
    s = run(s, {
      type: "unload",
      ids: [merchant.id],
      ships: [ship.id],
      to: land,
    });
    expect(s.pieces[merchant.id].coverage).toBeUndefined();
    expect(harvestTiles(s, s.pieces[merchant.id])).toContain(land);
    assertInvariants(s);
  });
  it("includes mobile production and fish sources in receipts and income estimates", () => {
    const { s, water } = fishingFixture();
    piece(s, water, 0, "fishing", 2);
    s.dice = [3, 4];
    const expected = income(s);
    production(s, 7);
    for (const g of GOODS)
      expect((expected[g] ?? 0) * 6).toBeCloseTo(s.production[0][g] ?? 0);
    expect(rollReport(s, true)!.tiles).toContain(water);
  });
});

describe("AI and save compatibility", () => {
  it("values Fish like Grain and metals at least as highly as their exchange value", () => {
    const { s } = maritimeFixture();
    for (const values of [marketValues(s), marginalValues(s)]) {
      expect(values.fish).toBe(values.grain);
      expect(values.gold).toBeGreaterThanOrEqual(values.ore);
      expect(values.goldbars).toBeGreaterThanOrEqual(values.steel);
      expect(values.goldbars).toBeGreaterThanOrEqual(values.grain * 2);
    }
  });
  it("counts Fish stockpiles as food reserves in market and personal trade values", () => {
    const { s, home } = maritimeFixture();
    home.stock = {};
    const scarceMarket = marketValues(s).grain,
      scarcePersonal = marginalValues(s).grain;
    home.stock = { fish: 1000 };
    expect(marketValues(s).grain).toBeLessThan(scarceMarket);
    expect(marginalValues(s).grain).toBeLessThan(scarcePersonal);
    const prices = marketValues(s),
      value = tradeValuation(s, 0, {}, prices);
    expect(value({ grain: 2 }, {}).gain).toBeCloseTo(
      value({ fish: 2 }, {}).gain,
    );
    const mixed = value({}, { fish: 4 }).loss;
    home.stock = { grain: 1000 };
    expect(tradeValuation(s, 0, {}, prices)({}, { grain: 4 }).loss).toBeCloseTo(
      mixed,
    );
  });
  it("AI spends whole Gold bars to fund a needed resource", () => {
    const { s, home } = maritimeFixture();
    home.level = home.turnLevel = 1;
    home.stock = { goldbars: 20 };
    s.players[0].control = "standard";
    const c = chooseAIAction(s);
    expect(c.type).toBe("bank");
    expect(c.give).toEqual({ goldbars: 1 });
    expect(Object.values(c.take!)[0]).toBe(2);
    expect(applyCommand(s, c).ok).toBe(true);
  });
  it("AI moves a merchant toward a more productive safe location", () => {
    const { s } = maritimeFixture();
    for (const t of Object.values(s.tiles)) t.number = 2;
    const u = piece(s, "0,0", 0, "merchant", 1);
    s.tiles["2,0"].resource = "gold";
    s.tiles["2,0"].number = 7;
    const c = chooseAIAction(s);
    expect(c).toMatchObject({ type: "move", ids: [u.id], to: "1,0" });
  });
  it("round-trips towers, fishing camps, Gold stores, ship tiers and chosen coverage", () => {
    let { s, home, water, edge } = fishingFixture();
    s = run(s, { type: "route", edge: edge.id });
    s = run(s, { type: "camp", edge: edge.id, tile: water });
    piece(s, water, 0, "convoy", 4);
    s.towers[home.vertex] = {
      id: "w777",
      owner: 0,
      vertex: home.vertex,
      tier: 4,
    };
    const land = s.vertices[home.vertex].tiles.find(
      (id) => s.tiles[id].resource !== "water",
    )!;
    const u = piece(s, land, 0, "merchant", 4);
    u.coverage = defaultCoverage(s, u);
    expect(deserialize(serialize(s))).toEqual(s);
  });
  it("recalculates a saved naval battle after applying the new hull powers", () => {
    let { s, water, edge } = fishingFixture();
    const other = edge.tiles.find((id) => id !== water)!;
    const attackers = [
      piece(s, water, 0, "galley"),
      piece(s, water, 0, "galley"),
    ];
    for (let i = 0; i < 3; i++) piece(s, other, 1, "convoy");
    s = run(s, { type: "move", ids: attackers.map((u) => u.id), to: other });
    const old: any = structuredClone(s);
    old.version = 4;
    old.generation = 3;
    delete old.towers;
    Object.assign(old.battle, {
      attackerPower: 6,
      defenderPower: 3,
      loss: 3,
      required: 3,
    });
    const restored = deserialize(
      JSON.stringify({
        format: "catane-frontiers",
        version: 4,
        game: old,
        checksum: hash(JSON.stringify(old)).toString(16),
      }),
    );
    expect(restored.battle).toMatchObject({
      attackerPower: 4,
      defenderPower: 3,
      loss: 1,
      required: 1,
    });
    expect(applyCommand(restored, chooseAIAction(restored)).ok).toBe(true);
  });
  it("migrates format-4 campaigns without changing land, roads, stocks or dice", () => {
    const { s } = maritimeFixture();
    const old: any = structuredClone(s);
    old.version = 4;
    old.generation = 3;
    delete old.towers;
    for (const town of Object.values(old.towns) as any[]) {
      delete town.stock.gold;
      delete town.stock.goldbars;
      delete town.stock.fish;
    }
    const text = JSON.stringify({
      format: "catane-frontiers",
      version: 4,
      checksum: hash(JSON.stringify(old)).toString(16),
      game: old,
    });
    const restored = deserialize(text);
    expect(restored.version).toBe(5);
    expect(restored.towers).toEqual({});
    expect(restored.tiles).toEqual(old.tiles);
    expect(restored.towns).toEqual(old.towns);
    expect(restored.rng).toBe(old.rng);
    expect(deserialize(serialize(restored))).toEqual(restored);
  });
});

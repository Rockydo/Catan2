import { describe, expect, it } from "vitest";
import { maritimeFixture, fishingFixture } from "./maritime-fixture";
import { piece, run } from "./helpers";
import {
  bankRate,
  expeditionSites,
  inventory,
  ownTowns,
  productionSources,
  colonizationSites,
  ready,
} from "../src/game/selectors";
import { canApplyCommand, commandError, newGame } from "../src/game/engine";
import { chooseAIAction } from "../src/game/ai";
import {
  SEASONS,
  frozenInSeason,
  seasonAt,
  syncSeasonSurfaces,
} from "../src/game/seasons";
import {
  BIOME_INFO,
  type Biome,
  type Climate,
} from "../src/game/climate-content";
import { processedFor } from "../src/game/content";
import { canOccupy, neighbors } from "../src/game/world";
import { production } from "../src/game/economy";
import { assertInvariants, deserialize, serialize } from "../src/game/save";
import { GOODS, type Good, type Stock } from "../src/game/types";
import { planningPath } from "../src/game/ai-paths";

describe("season transaction and production integrity", () => {
  it("wraps only once over eliminated factions and does not advance the calendar after victory", () => {
    const { s, enemy, water } = fishingFixture();
    s.calendar = { startRound: 1 };
    s.round = 3;
    s.tiles[water].climate = "cold";
    enemy.owner = 2;
    s.players[1].alive = false;
    s.players[2].alive = true;
    s.active = 2;
    syncSeasonSurfaces(s);
    const next = run(s, { type: "end-turn" });
    expect(next.active).toBe(0);
    expect(next.round).toBe(4);
    expect(next.tiles[water].surface).toBe("frozen");
    assertInvariants(next);

    const won = run(s, { type: "surrender" });
    expect(won.winner).toBe(0);
    expect(won.phase).toBe("finished");
    expect(won.round).toBe(3);
    expect(won.tiles[water].surface).toBe("open");
    assertInvariants(deserialize(serialize(won)));
  });

  it("keeps embarked troops safe through freeze and thaw without giving a frozen carrier actions", () => {
    let { s, water } = fishingFixture();
    s.calendar = { startRound: 1 };
    s.round = 3;
    s.active = 1;
    s.tiles[water].climate = "cold";
    const ship = piece(s, water, 0, "convoy", 2),
      troop = piece(s, water, 0, "heavy", 2),
      stranded = piece(s, water, 0, "light", 1);
    troop.carrier = ship.id;
    syncSeasonSurfaces(s);
    expect(stranded.seasonStatus).toBe("adrift");
    const shore = neighbors(water).find((id) => canOccupy(s.tiles[id]))!;
    s = run(s, { type: "end-turn" });
    expect(s.pieces[ship.id].seasonStatus).toBe("icebound");
    expect(s.pieces[troop.id].seasonStatus).toBeUndefined();
    expect(s.pieces[stranded.id].seasonStatus).toBeUndefined();
    expect(s.pieces[troop.id].carrier).toBe(ship.id);
    s.phase = "economy";
    expect(
      canApplyCommand(s, {
        type: "unload",
        ships: [ship.id],
        ids: [troop.id],
        to: shore,
      }),
    ).toBe(false);
    assertInvariants(deserialize(serialize(s)));

    s = run(s, { type: "end-turn" });
    s.phase = "economy";
    s = run(s, { type: "end-turn" });
    expect(s.round).toBe(5);
    expect(s.pieces[ship.id].seasonStatus).toBeUndefined();
    expect(s.pieces[stranded.id].seasonStatus).toBeUndefined();
    expect(s.pieces[stranded.id].tile).toBe(shore);
    expect(ready(s, s.pieces[ship.id])).toBe(true);
    s.phase = "economy";
    s = run(s, {
      type: "unload",
      ships: [ship.id],
      ids: [troop.id],
      to: shore,
    });
    expect(s.pieces[troop.id].carrier).toBeUndefined();
    expect(s.pieces[troop.id].tile).toBe(shore);
    expect(s.pieces[stranded.id].tile).toBe(shore);
    assertInvariants(deserialize(serialize(s)));
  });

  it("opens original sea ice to summer shipbuilding but never makes it permanent settlement ground", () => {
    let { s, home, water } = fishingFixture();
    s.calendar = { startRound: 1 };
    s.round = 2;
    for (const tile of Object.values(s.tiles)) tile.climate = "cold";
    Object.assign(s.tiles[water], {
      resource: "ice",
      biome: "ice",
      climate: "arctic",
    });
    delete s.tiles[water].fish;
    syncSeasonSurfaces(s);
    const order = {
      type: "ship",
      town: home.id,
      tile: water,
      kind: "settlership",
      tier: 1,
    };
    expect(canApplyCommand(s, order)).toBe(true);
    expect(
      canApplyCommand(s, { ...order, type: "recruit", kind: "settler" }),
    ).toBe(false);
    s = run(s, order);
    const ship = Object.values(s.pieces)[0];
    expect(colonizationSites(s, ship)).toEqual([]);
    expect(ship.seasonStatus).toBeUndefined();
    assertInvariants(deserialize(serialize(s)));

    const frontier = s.tiles["-3,0"];
    Object.assign(frontier, {
      resource: "ice",
      biome: "ice",
      climate: "arctic",
    });
    ship.tile = frontier.id;
    ship.born = 0;
    ship.acted = false;
    syncSeasonSurfaces(s);
    const site = colonizationSites(s, ship)[0];
    expect(site).toBeDefined();
    const colony = run(s, { type: "colonize", ids: [ship.id], vertex: site });
    expect(Object.values(colony.towns).some((t) => t.vertex === site)).toBe(
      true,
    );
    const seaOnly = structuredClone(s);
    for (const tile of seaOnly.vertices[site].tiles)
      Object.assign(seaOnly.tiles[tile], {
        resource: "ice",
        biome: "ice",
        climate: "arctic",
      });
    syncSeasonSurfaces(seaOnly);
    expect(colonizationSites(seaOnly, seaOnly.pieces[ship.id])).not.toContain(
      site,
    );
    s.round = 3;
    syncSeasonSurfaces(s);
    expect(s.pieces[ship.id].seasonStatus).toBe("icebound");
    expect(colonizationSites(s, s.pieces[ship.id])).toEqual([]);
  });

  it("invalidates cached sea and land planning paths after an actual season boundary", () => {
    let { s } = maritimeFixture();
    s.calendar = { startRound: 1 };
    s.round = 2;
    s.active = 1;
    for (const id of ["-3,0", "-2,0", "-1,0"])
      Object.assign(s.tiles[id], {
        resource: "ice",
        biome: "ice",
        climate: "arctic",
      });
    syncSeasonSurfaces(s);
    expect(planningPath(s, "-3,0", "-1,0", true, 0)).toEqual(["-2,0", "-1,0"]);
    expect(planningPath(s, "-3,0", "-1,0", false, 0)).toBeNull();
    s = run(s, { type: "end-turn" });
    expect(seasonAt(s)).toBe("autumn");
    expect(planningPath(s, "-3,0", "-1,0", true, 0)).toBeNull();
    expect(planningPath(s, "-3,0", "-1,0", false, 0)).toEqual(["-2,0", "-1,0"]);
  });

  it.each(["end-turn", "surrender"])(
    "never changes live sea surfaces when previewing %s across a winter boundary",
    (type) => {
      const { s, home, water } = fishingFixture();
      s.calendar = { startRound: 1 };
      s.round = 3;
      s.active = 2;
      s.players[2].alive = true;
      const id = `t${s.nextId++}`;
      s.towns[id] = {
        ...structuredClone(home),
        id,
        owner: 2,
        vertex: s.tiles["-3,0"].vertices[0],
      };
      s.tiles[water].climate = "cold";
      piece(s, water, 1, "galley", 1);
      syncSeasonSurfaces(s);
      const before = structuredClone(s);
      expect(canApplyCommand(s, { type })).toBe(true);
      expect(s).toEqual(before);
      expect(commandError(s, { type })).toBeUndefined();
      expect(s).toEqual(before);
      const after = run(s, { type });
      expect(after.round).toBe(4);
      expect(after.tiles[water].surface).toBe("frozen");
      expect(s.tiles[water].surface).toBe("open");
    },
  );

  it("closes a frozen harbor, reopens it on thaw, and keeps default/currency exchange available", () => {
    const { s, home, water, edge } = fishingFixture();
    s.calendar = { startRound: 1 };
    for (const id of edge.tiles) s.tiles[id].climate = "cold";
    s.edges[edge.id].harbor = "grain";
    expect(s.vertices[home.vertex].edges).toContain(edge.id);
    s.round = 3;
    syncSeasonSurfaces(s);
    expect(bankRate(s, "grain", "ore")).toBe(2);
    s.round = 4;
    syncSeasonSurfaces(s);
    expect(s.tiles[water].surface).toBe("frozen");
    expect(bankRate(s, "grain", "ore")).toBe(4);
    expect(bankRate(s, "gold", "ore")).toBe(1);
    expect(bankRate(s, "goldbars", "steel")).toBe(1);
    // A harbor with a second usable sea side remains connected to open water.
    const open = edge.tiles.find((id) => id !== water)!;
    s.tiles[open].climate = "temperate";
    syncSeasonSurfaces(s);
    expect(bankRate(s, "grain", "ore")).toBe(2);
    s.tiles[open].climate = "cold";
    s.round = 5;
    syncSeasonSurfaces(s);
    expect(bankRate(s, "grain", "ore")).toBe(2);
  });

  it("conserves raw and processed annual output across cities, workshops, camps and mobile collectors", () => {
    const baseline = maritimeFixture();
    const examples: [Biome, Climate][] = [
      ["forest", "cold"],
      ["rice-field", "tropical"],
      ["rice-field", "subtropical"],
      ["cattle-pasture", "temperate"],
      ["reindeer-range", "arctic"],
      ["seal-grounds", "arctic"],
      ["whale", "cold"],
      ["cod", "cold"],
      ["woods", "temperate"],
      ["olive-grove", "mediterranean"],
    ];
    for (const [biome, climate] of examples)
      for (const tier of [1, 2, 3, 4]) {
        const s = structuredClone(baseline.s),
          home = s.towns[baseline.home.id];
        s.calendar = { startRound: 1 };
        s.round = 1;
        for (const tile of Object.values(s.tiles)) {
          tile.resource = "snow";
          delete tile.biome;
          delete tile.fish;
          delete tile.whale;
        }
        const target = s.tiles["0,0"],
          info = BIOME_INFO[biome];
        Object.assign(target, { biome, climate, resource: info.resource });
        if (["fish", "cod"].includes(biome)) target.fish = true;
        if (biome === "whale") target.whale = true;
        const raw = Object.keys(info.yield)[0] as keyof typeof info.yield;
        home.level = home.turnLevel = tier;
        if (tier > 1) {
          home.extensions[target.id] = tier - 1;
          home.extensionGoods = { [target.id]: raw };
        }
        if (biome === "woods" && tier > 1)
          home.extensionGoods = { [target.id]: "hides" };
        const edge = s.vertices[home.vertex].edges
          .map((id) => s.edges[id])
          .find((e) => e.tiles.includes(target.id))!;
        const marine = target.resource === "water";
        if (marine)
          for (const id of edge.tiles.filter((id) => id !== target.id))
            s.tiles[id].resource = "water";
        s.routes[edge.id] = {
          id: edge.id,
          edge: edge.id,
          owner: 0,
          kind: marine ? "route" : "road",
          camps: { [target.id]: Math.min(2, tier) },
          born: 0,
        };
        if (marine) {
          const merchant = piece(
            s,
            neighbors(target.id).find(
              (id) => s.tiles[id]?.resource === "snow",
            )!,
            0,
            "merchant",
            tier,
          );
          merchant.coverage = [target.id];
          piece(s, target.id, 0, "fishing", tier);
        } else {
          piece(s, target.id, 0, "merchant", tier).coverage = [];
          const water = neighbors(target.id).find(
            (id) => s.tiles[id]?.resource === "snow",
          )!;
          s.tiles[water].resource = "water";
          piece(s, water, 0, "merchantship", tier);
        }
        const totals = (mode: "annual" | (typeof SEASONS)[number]) => {
          const out: Stock = {};
          for (const row of productionSources(s, mode).filter(
            (p) => p.owner === 0 && p.tile === target.id,
          ))
            out[row.good] = (out[row.good] ?? 0) + row.amount;
          return out;
        };
        const annual = totals("annual"),
          year: Stock = {};
        for (const season of SEASONS)
          for (const [good, amount] of Object.entries(totals(season)))
            year[good as Good] = (year[good as Good] ?? 0) + amount!;
        for (const [good, amount] of Object.entries(annual))
          expect(
            year[good as Good],
            `${climate}/${biome}/tier${tier}/${good}`,
          ).toBe(amount! * 4);
        expect(Object.keys(year).sort()).toEqual(Object.keys(annual).sort());
        if (tier >= 3)
          for (const raw of Object.keys(info.yield))
            expect(
              annual[processedFor(raw as keyof typeof info.yield)],
            ).toBeGreaterThan(0);
      }
  });

  it("current-season reports pay exactly production sources and never spend stored raw ingredients", () => {
    const { s, home } = maritimeFixture();
    s.calendar = { startRound: 1 };
    s.round = 2;
    for (const tile of Object.values(s.tiles)) tile.number = 7;
    home.stock = { meat: 4, grain: 3, fish: 2, oil: 1 };
    const before = inventory(s),
      expected: Stock = {};
    for (const row of productionSources(s).filter((p) => p.owner === 0))
      expected[row.good] = (expected[row.good] ?? 0) + row.amount;
    production(s, 7);
    expect(s.production[0]).toEqual(expected);
    for (const [good, amount] of Object.entries(before))
      expect(inventory(s)[good as Good]).toBe(
        amount! + (expected[good as Good] ?? 0),
      );
  });

  it("rejects forged seasonal surfaces and stranded status on the wrong movement surface", () => {
    const { s, water } = fishingFixture();
    s.calendar = { startRound: 1 };
    s.round = 4;
    s.tiles[water].climate = "cold";
    const ship = piece(s, water, 0, "galley", 1);
    syncSeasonSurfaces(s);
    expect(() => assertInvariants(s)).not.toThrow();
    const wrongSea = structuredClone(s);
    wrongSea.tiles[water].surface = "open";
    expect(() => assertInvariants(wrongSea)).toThrow(/seasonal sea surface/);
    const wrongLand = structuredClone(s);
    wrongLand.tiles["-3,0"].surface = "frozen";
    expect(() => assertInvariants(wrongLand)).toThrow(/seasonal sea surface/);
    const wrongStatus = structuredClone(s);
    wrongStatus.pieces[ship.id].seasonStatus = "adrift";
    expect(() => assertInvariants(wrongStatus)).toThrow(/stranded unit/);
  });

  it("uses the current season on new expedition seas and keeps both preview and save roundtrip isolated", () => {
    let baseline = newGame("season-validation-0");
    while (baseline.phase.startsWith("setup"))
      baseline = run(baseline, chooseAIAction(baseline));
    for (const round of [2, 4])
      for (const naval of [false, true]) {
        let s = structuredClone(baseline);
        s.round = round;
        s.phase = "economy";
        for (const town of ownTowns(s))
          for (const good of GOODS) town.stock[good] = 30;
        syncSeasonSurfaces(s);
        const tile = Object.values(s.tiles).find(
          (t) =>
            canOccupy(t, naval) && neighbors(t.id).some((id) => !s.tiles[id]),
        )!;
        piece(s, tile.id, 0, naval ? "transport" : "light", 1);
        const kind = naval ? ("sea" as const) : ("land" as const);
        const vertex = expeditionSites(s, kind).find((v) =>
          tile.vertices.includes(v),
        )!;
        expect(vertex).toBeDefined();
        const command = { type: "expedition", kind, vertex, tier: 1 };
        const before = structuredClone(s),
          previous = new Set(Object.keys(s.tiles));
        expect(canApplyCommand(s, command)).toBe(true);
        expect(s).toEqual(before);
        s = run(s, command);
        const added = Object.values(s.tiles).filter((t) => !previous.has(t.id));
        expect(added).toHaveLength(10);
        for (const hex of added)
          if (["water", "ice"].includes(hex.resource))
            expect(hex.surface).toBe(
              frozenInSeason(hex, seasonAt(s)) ? "frozen" : "open",
            );
        assertInvariants(deserialize(serialize(s)));
      }
  });
});

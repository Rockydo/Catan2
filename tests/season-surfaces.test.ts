import { describe, expect, it } from "vitest";
import { coastalFixture, frontierUnitFixture } from "./coastal-fixture";
import { fishingFixture, maritimeFixture } from "./maritime-fixture";
import { nextOwnerTurn, piece, run } from "./helpers";
import { canApplyCommand } from "../src/game/engine";
import {
  chooseAIAction,
  researchAction,
  researchUtility,
} from "../src/game/ai";
import {
  bombardmentTargets,
  canRoute,
  moveTargets,
  expeditionSites,
} from "../src/game/selectors";
import { assertInvariants, deserialize, serialize } from "../src/game/save";
import { syncSeasonSurfaces } from "../src/game/seasons";
import { CARDS } from "../src/game/content";
import { neighbors } from "../src/game/world";
import { guildPlacementError } from "../src/game/guilds";

describe("seasonal surfaces in coastal actions", () => {
  it("keeps permanent coastal Navigator guilds valid when their harbor freezes", () => {
    let { s, home, edge } = fishingFixture();
    s.calendar = { startRound: 1 };
    s.round = 3;
    s.active = 0;
    for (const id of edge.tiles) s.tiles[id].climate = "cold";
    syncSeasonSurfaces(s);
    s = run(s, { type: "guild", town: home.id, kind: "navigators" });
    s = run(s, { type: "end-turn" });
    s.phase = "economy";
    s = run(s, { type: "end-turn" });
    expect(s.round).toBe(4);
    s.phase = "economy";
    expect(
      guildPlacementError(s, s.towns[home.id], "navigators"),
    ).toBeUndefined();
    expect(
      canApplyCommand(s, { type: "guild", town: home.id, kind: "navigators" }),
    ).toBe(true);
    assertInvariants(deserialize(serialize(s)));
  });

  it("allows a land expedition from an army on border sea ice, but not from its thawed stranded state", () => {
    const { s, tile, unit } = frontierUnitFixture();
    s.calendar = { startRound: 1 };
    s.round = 4;
    const incident = new Set(tile.vertices.flatMap((v) => s.vertices[v].tiles));
    for (const id of incident) {
      s.tiles[id].resource = "water";
      s.tiles[id].climate = "cold";
    }
    syncSeasonSurfaces(s);
    expect(unit.seasonStatus).toBeUndefined();
    const vertex = expeditionSites(s, "land").find((v) =>
      tile.vertices.includes(v),
    );
    expect(vertex).toBeDefined();
    expect(
      canApplyCommand(s, { type: "expedition", kind: "land", tier: 1, vertex }),
    ).toBe(true);
    s.round = 5;
    syncSeasonSurfaces(s);
    expect(unit.seasonStatus).toBe("adrift");
    expect(expeditionSites(s, "land")).not.toContain(vertex);
    expect(expeditionSites(s, "sea")).not.toContain(vertex);
  });

  it.each(["summer-target", "winter-origin", "winter-target"])(
    "supports bombardment and pending-battle saves on %s",
    (scenario) => {
      const { s, gun, water, shore, ship } = coastalFixture();
      s.calendar = { startRound: 1 };
      s.round = scenario === "summer-target" ? 2 : 4;
      for (const tile of Object.values(s.tiles)) tile.climate = "cold";
      if (scenario === "summer-target") s.tiles[water].resource = "ice";
      if (scenario === "winter-origin") {
        s.tiles[shore].resource = "water";
        s.tiles[water].climate = "temperate";
      }
      syncSeasonSurfaces(s);
      expect(bombardmentTargets(s, [gun.id])).toContain(water);
      const battle = run(s, { type: "bombard", ids: [gun.id], to: water });
      expect(battle.battle?.defenders).toEqual([ship.id]);
      const loaded = deserialize(serialize(battle));
      assertInvariants(loaded);
      const finished = run(loaded, chooseAIAction(loaded));
      expect(finished.pieces[ship.id]).toBeUndefined();
      expect(finished.pieces[gun.id].tile).toBe(shore);
      assertInvariants(deserialize(serialize(finished)));
    },
  );

  it("never offers a phantom fleet or lets floating stranded artillery bombard", () => {
    const { s, gun, water, shore, ship } = coastalFixture();
    s.calendar = { startRound: 1 };
    s.round = 4;
    s.tiles[water].climate = "cold";
    delete s.pieces[ship.id];
    piece(s, water, 1, "heavy", 2);
    syncSeasonSurfaces(s);
    expect(bombardmentTargets(s, [gun.id])).toEqual([]);
    piece(s, water, 1, "galley", 1);
    s.tiles[shore].resource = "water";
    s.tiles[shore].climate = "temperate";
    syncSeasonSurfaces(s);
    expect(gun.seasonStatus).toBe("adrift");
    expect(bombardmentTargets(s, [gun.id])).toEqual([]);
  });

  it.each(["fishingcharter", "coastal", "patrol", "naval", "admiralty"])(
    "requires currently usable shipyard water for %s, including melted original ice",
    (kind) => {
      const { s, home, edge } = fishingFixture();
      s.calendar = { startRound: 1 };
      s.round = 2;
      for (const tile of Object.values(s.tiles)) tile.climate = "cold";
      for (const id of edge.tiles) {
        s.tiles[id].resource = "ice";
        delete s.tiles[id].fish;
      }
      const card = {
        id: "seasonal-ship-card",
        kind,
        tier: CARDS[kind].tier,
        bought: 0,
      };
      s.players[0].hand = [card];
      syncSeasonSurfaces(s);
      const command = { type: "play-research", card: card.id };
      expect(canApplyCommand(s, command)).toBe(true);
      expect(researchAction(s, card.id)).toEqual(command);
      const chartered = run(s, command);
      expect(chartered.players[0].bonuses.ships.length).toBeGreaterThan(0);
      expect(
        canApplyCommand(chartered, {
          type: "ship",
          kind: "galley",
          tier: 1,
          town: home.id,
          tile: edge.tiles[0],
        }),
      ).toBe(true);
      s.round = 4;
      syncSeasonSurfaces(s);
      expect(canApplyCommand(s, command)).toBe(false);
      expect(researchUtility(s, kind)).toBe(0);
    },
  );

  it("blocks sea-route and fishing-camp construction under armies on winter sea ice", () => {
    const { s, water, edge } = fishingFixture();
    s.calendar = { startRound: 1 };
    s.round = 4;
    for (const tile of Object.values(s.tiles)) tile.climate = "cold";
    syncSeasonSurfaces(s);
    expect(canRoute(s, edge.id, "route")).toBe(true);
    piece(s, water, 1, "heavy", 1);
    expect(canRoute(s, edge.id, "route")).toBe(false);
    s.routes[edge.id] = {
      id: edge.id,
      edge: edge.id,
      owner: 0,
      kind: "route",
      camps: {},
      born: 0,
    };
    expect(
      canApplyCommand(s, { type: "camp", edge: edge.id, tile: water }),
    ).toBe(false);
  });

  it("blocks sea-route construction beside a hostile ship on melted original ice", () => {
    const { s, water, edge } = fishingFixture();
    s.calendar = { startRound: 1 };
    s.round = 2;
    s.tiles[water].resource = "ice";
    delete s.tiles[water].fish;
    syncSeasonSurfaces(s);
    expect(canRoute(s, edge.id, "route")).toBe(true);
    piece(s, water, 1, "galley", 1);
    expect(canRoute(s, edge.id, "route")).toBe(false);
  });

  it("lets AI transports cross a summer melt channel and complete an island invasion", () => {
    let { s, home, enemy } = maritimeFixture();
    s.calendar = { startRound: 1 };
    s.round = 2;
    for (const tile of Object.values(s.tiles)) {
      tile.resource = "water";
      delete tile.fish;
      delete tile.whale;
    }
    for (const id of ["0,0", "3,0", "4,0", "4,-1", "5,-1"])
      s.tiles[id].resource = "grain";
    home.vertex = s.tiles["0,0"].vertices[0];
    enemy.vertex = s.tiles["4,0"].vertices[1];
    for (const id of s.vertices[enemy.vertex].tiles)
      s.tiles[id].resource = "grain";
    home.stock = enemy.stock = {};
    home.level = enemy.level = 1;
    home.wall = enemy.wall = 0;
    // A narrow thawed waterway separates permanent, usable staging waters.
    for (const id of neighbors("1,0"))
      if (s.tiles[id]?.resource === "water" && id !== "1,-1")
        s.tiles[id].resource = "ice";
    piece(s, "0,0", 0, "heavy", 3);
    const transport = piece(s, "1,-1", 0, "convoy", 1);
    syncSeasonSurfaces(s);
    const history: string[] = [];
    let crossedMelt = false;
    for (let turn = 0; turn < 22 && s.phase !== "finished"; turn++) {
      nextOwnerTurn(s);
      s.active = 0;
      s.phase = "military";
      for (let action = 0; action < 20; action++) {
        const c = chooseAIAction(s);
        if (c.type === "end-turn") break;
        history.push(c.type);
        if (
          c.type === "move" &&
          c.ids?.includes(transport.id) &&
          c.to &&
          moveTargets(s, c.ids)[c.to]?.some(
            (id) => s.tiles[id].resource === "ice",
          )
        )
          crossedMelt = true;
        s = run(s, c);
        if (s.phase === "finished") break;
      }
    }
    expect(crossedMelt).toBe(true);
    expect(history).toContain("load");
    expect(history).toContain("unload");
    expect(s.winner).toBe(0);
    assertInvariants(deserialize(serialize(s)));
  });
});

import { describe, expect, it } from "vitest";
import { applyCommand } from "../src/game/engine";
import {
  canOccupy,
  landAtVertex,
  walkableAtVertex,
  solidAtVertex,
} from "../src/game/world";
import {
  moveTargets,
  pathTo,
  retreatOptions,
  canRoute,
  settlementSites,
} from "../src/game/selectors";
import { planningPath } from "../src/game/ai-paths";
import { tileYield, terrainFamily, towerSites } from "../src/game/maritime";
import { assertInvariants, deserialize, serialize } from "../src/game/save";
import {
  frontierReturnSites,
  restoreOnFrontier,
} from "../src/game/frontier-returns";
import { maritimeFixture } from "./maritime-fixture";
import { piece, run } from "./helpers";
import type { Game, UnitClass } from "../src/game/types";

function peaks(s: Game, id: string) {
  Object.assign(s.tiles[id], {
    biome: "bare-peaks",
    resource: "peaks",
    climate: "alpine",
  });
}
function corridor(detour = false) {
  const { s } = maritimeFixture();
  for (const tile of Object.values(s.tiles)) tile.resource = "water";
  for (const id of ["0,0", "2,0", ...(detour ? ["0,1", "1,1"] : [])])
    s.tiles[id].resource = "grain";
  peaks(s, "1,0");
  return s;
}

describe("Bare Peaks", () => {
  it.each([
    "heavy",
    "light",
    "cavalry",
    "artillery",
    "merchant",
  ] as UnitClass[])(
    "blocks %s movement, transit and direct commands even with extra movement",
    (kind) => {
      const s = corridor(),
        u = piece(s, "0,0", 0, kind);
      u.bonus = 20;
      expect(canOccupy(s.tiles["1,0"])).toBe(false);
      expect(canOccupy(s.tiles["1,0"], true)).toBe(false);
      expect(tileYield(s.tiles["1,0"])).toEqual({});
      expect(terrainFamily(s.tiles["1,0"])).toBe("rugged");
      expect(moveTargets(s, [u.id])["1,0"]).toBeUndefined();
      expect(moveTargets(s, [u.id])["2,0"]).toBeUndefined();
      for (const destination of ["1,0", "2,0"]) {
        expect(pathTo(s, "0,0", destination, false, 0)).toBeNull();
        expect(planningPath(s, "0,0", destination, false, 0)).toBeNull();
        const result = applyCommand(s, {
          type: "move",
          ids: [u.id],
          to: destination,
        });
        expect(result.ok).toBe(false);
        expect(result.state).toBe(s);
      }
    },
  );
  it("uses a legal three-step detour, with AI and player pathfinding in agreement", () => {
    const s = corridor(true),
      u = piece(s, "0,0", 0, "cavalry");
    const path = ["0,1", "1,1", "2,0"];
    expect(moveTargets(s, [u.id])["2,0"]).toEqual(path);
    expect(pathTo(s, "0,0", "2,0", false, 0)).toEqual(path);
    expect(planningPath(s, "0,0", "2,0", false, 0)).toEqual(path);
    expect(pathTo(s, "0,0", "2,0", false, 0, 2)).toBeNull();
    const moved = run(s, { type: "move", ids: [u.id], to: "2,0" });
    expect(moved.pieces[u.id].moved).toBe(3);
  });
  it("cannot recruit any unit or ship on peaks, and hides peaks from recruitment choices", () => {
    const { s, home } = maritimeFixture();
    peaks(s, "0,0");
    expect(landAtVertex(s, home.vertex)).toContain("0,0");
    expect(walkableAtVertex(s, home.vertex)).not.toContain("0,0");
    for (const [type, kind] of [
      ["recruit", "heavy"],
      ["recruit", "merchant"],
      ["ship", "galley"],
    ]) {
      const result = applyCommand(s, {
        type,
        kind,
        tier: 1,
        town: home.id,
        tile: "0,0",
      });
      expect(result.ok).toBe(false);
      expect(result.state).toBe(s);
      expect(Object.values(s.pieces)).toHaveLength(0);
    }
  });
  it("allows connected roads around peaks, but no camp, workshop or peak-only town", () => {
    const { s, home } = maritimeFixture();
    peaks(s, "0,0");
    const edge = s.vertices[home.vertex].edges.find((e) =>
      s.edges[e].tiles.includes("0,0"),
    )!;
    expect(canRoute(s, edge, "road")).toBe(true);
    const next = run(s, { type: "road", edge });
    expect(next.routes[edge].kind).toBe("road");
    expect(applyCommand(next, { type: "camp", edge, tile: "0,0" }).ok).toBe(
      false,
    );
    expect(
      applyCommand(next, { type: "extension", town: home.id, tile: "0,0" }).ok,
    ).toBe(false);
    const isolated = s.tiles["-3,0"].vertices[0];
    for (const id of s.vertices[isolated].tiles) peaks(s, id);
    expect(solidAtVertex(s, isolated)).toEqual([]);
    expect(settlementSites(s, 0, true)).not.toContain(isolated);
    expect(solidAtVertex(s, home.vertex).length).toBeGreaterThan(0);
  });
  it("never offers peaks as a battle retreat", () => {
    const { s } = maritimeFixture();
    peaks(s, "1,0");
    expect(retreatOptions(s, "0,0", 0, false)).not.toContain("1,0");
    expect(retreatOptions(s, "0,0", 0, true)).not.toContain("1,0");
    expect(retreatOptions(s, "0,0", 0, false)).toContain("0,1");
  });
  it("cannot create an unreachable tower surrounded by peaks or peaks and sea", () => {
    const { s, home } = maritimeFixture();
    const vertex = s.tiles["-3,0"].vertices[0];
    const edge = s.vertices[vertex].edges[0];
    s.routes[edge] = {
      id: `r${s.nextId++}`,
      edge,
      owner: 0,
      kind: "road",
      camps: {},
      born: 0,
    };
    for (const id of s.vertices[vertex].tiles) peaks(s, id);
    expect(towerSites(s)).not.toContain(vertex);
    expect(applyCommand(s, { type: "tower", vertex }).ok).toBe(false);
    const id = s.vertices[vertex].tiles[0];
    Object.assign(s.tiles[id], { resource: "water", biome: "water" });
    expect(towerSites(s)).not.toContain(vertex);
    expect(applyCommand(s, { type: "tower", vertex }).ok).toBe(false);
    Object.assign(s.tiles[id], { resource: "grain", biome: "rough-fields" });
    expect(towerSites(s)).toContain(vertex);
    expect(applyCommand(s, { type: "tower", vertex }).ok).toBe(true);
  });
  it("rejects a forced retreat onto peaks without applying battle casualties", () => {
    let { s } = maritimeFixture();
    peaks(s, "1,0");
    const attacker = piece(s, "-1,0", 0, "heavy", 3);
    piece(s, "0,0", 1, "heavy", 1);
    piece(s, "0,0", 1, "heavy", 1);
    s = run(s, { type: "move", ids: [attacker.id], to: "0,0" });
    expect(s.battle!.required).toBe(1);
    const result = applyCommand(s, {
      type: "resolve-battle",
      actor: 1,
      ids: [s.battle!.defenders[0]],
      retreat: "1,0",
    });
    expect(result.ok).toBe(false);
    expect(result.state).toBe(s);
    expect(Object.values(s.pieces)).toHaveLength(3);
  });
  it("rejects passenger landings on peaks and leaves fleet and cargo unchanged", () => {
    const { s } = maritimeFixture();
    s.tiles["0,0"].resource = "water";
    peaks(s, "1,0");
    const ship = piece(s, "0,0", 0, "transport"),
      troop = piece(s, "0,0");
    troop.carrier = ship.id;
    const result = applyCommand(s, {
      type: "unload",
      ships: [ship.id],
      ids: [troop.id],
      to: "1,0",
    });
    expect(result.ok).toBe(false);
    expect(result.state).toBe(s);
    expect(s.pieces[troop.id].carrier).toBe(ship.id);
  });
  it("does not revive a faction with towns or troops on a peak-only frontier", () => {
    const { s } = maritimeFixture();
    peaks(s, "-3,0");
    expect(frontierReturnSites(s, 2, ["-3,0"])).toEqual([]);
    expect(restoreOnFrontier(s, 2, ["-3,0"], 3, 3)).toBe(false);
    expect(s.players[2].alive).toBe(false);
    expect(Object.values(s.pieces)).toHaveLength(0);
  });
  it("preserves peaks on save/load and rejects a saved unit stationed there", () => {
    const { s } = maritimeFixture();
    peaks(s, "0,0");
    expect(deserialize(serialize(s)).tiles["0,0"].biome).toBe("bare-peaks");
    piece(s, "0,0");
    expect(() => assertInvariants(s)).toThrow("impassable terrain");
  });
});

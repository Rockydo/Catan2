import { expect, it } from "vitest";
import { applyCommand } from "../src/game/engine";
import { expansionPaths } from "../src/game/ai";
import {
  canRoute,
  inventory,
  movableRoutes,
  relocationSites,
  routeKind,
  townAt,
} from "../src/game/selectors";
import { serialize, deserialize } from "../src/game/save";
import { piece, run } from "./helpers";
import { mixedRoutesFixture } from "./mixed-routes-fixture";

it("builds road to sea to road without coastal towns and keeps the exact prices", () => {
  const f = mixedRoutesFixture();
  let s = f.s;
  const before = inventory(s);
  s = run(s, { type: "road", edge: f.road });
  expect(townAt(s, f.start)).toBeUndefined();
  expect(canRoute(s, f.sea, "route")).toBe(true);
  s = run(s, { type: "route", edge: f.sea });
  expect(townAt(s, f.landing)).toBeUndefined();
  expect(canRoute(s, f.beachRoad, "road")).toBe(true);
  expect(canRoute(s, f.beachRoad, "route")).toBe(false);
  s = run(s, { type: "road", edge: f.beachRoad });
  expect(inventory(s).lumber).toBe(before.lumber! - 3);
  expect(inventory(s).brick).toBe(before.brick! - 2);
  expect(inventory(s).wool).toBe(before.wool! - 1);
  expect(deserialize(serialize(s)).routes).toEqual(s.routes);
});

it("still requires an owned network and respects enemy towns and towers at junctions", () => {
  const f = mixedRoutesFixture();
  expect(canRoute(f.s, f.sea, "route")).toBe(false);
  const s = run(f.s, { type: "road", edge: f.road });
  s.routes[f.road].owner = 1;
  expect(canRoute(s, f.sea, "route")).toBe(false);
  s.routes[f.road].owner = 0;
  s.towns[f.enemy.id].vertex = f.start;
  expect(canRoute(s, f.sea, "route")).toBe(false);
  s.towns[f.enemy.id].vertex = f.enemy.vertex;
  s.towers[f.start] = { id: "test-tower", owner: 1, vertex: f.start, tier: 1 };
  expect(canRoute(s, f.sea, "route")).toBe(false);
  s.towers[f.start].owner = 0;
  expect(canRoute(s, f.sea, "route")).toBe(true);
});

it("enemy fleets still block sea extensions and armies block landing roads", () => {
  const f = mixedRoutesFixture();
  let s = run(f.s, { type: "road", edge: f.road });
  const fleet = piece(s, s.edges[f.sea].tiles[0], 1, "galley");
  expect(applyCommand(s, { type: "route", edge: f.sea }).ok).toBe(false);
  delete s.pieces[fleet.id];
  s = run(s, { type: "route", edge: f.sea });
  const land = s.edges[f.beachRoad].tiles.find(
    (t) => s.tiles[t].resource !== "water",
  )!;
  piece(s, land, 1);
  expect(applyCommand(s, { type: "road", edge: f.beachRoad }).ok).toBe(false);
});

it("AI plans across both transitions and chooses legal first construction steps", () => {
  const f = mixedRoutesFixture();
  let s = run(f.s, { type: "road", edge: f.road });
  const landing = expansionPaths(s).get(f.landing)!;
  expect(landing).toEqual({ cost: 1, first: f.sea, kind: "route" });
  s = run(s, { type: "route", edge: f.sea });
  const inland = s.edges[f.beachRoad].vertices.find((v) => v !== f.landing)!;
  expect(expansionPaths(s).get(inland)).toEqual({
    cost: 1,
    first: f.beachRoad,
    kind: "road",
  });
  for (const path of expansionPaths(s).values())
    if (path.first) {
      expect(canRoute(s, path.first, path.kind)).toBe(true);
      expect(path.kind).toBe(routeKind(s, path.first));
    }
});

it("a sea route joining roads at both ends is no longer an open end", () => {
  const f = mixedRoutesFixture();
  let s = run(f.s, { type: "road", edge: f.road });
  s = run(s, { type: "route", edge: f.sea });
  expect(movableRoutes(s)).not.toContain(f.sea); // Built this turn.
  s.routes[f.sea].born = 0;
  expect(movableRoutes(s)).toContain(f.sea);
  s = run(s, { type: "road", edge: f.beachRoad });
  expect(movableRoutes(s)).not.toContain(f.sea);
  expect(relocationSites(s, f.sea)).toEqual([]);
  expect(
    applyCommand(s, { type: "move-route", from: f.sea, edge: f.road }).ok,
  ).toBe(false);
});

it("an old open sea route can relocate onto a road endpoint", () => {
  const f = mixedRoutesFixture();
  const s = run(f.s, { type: "road", edge: f.road });
  const old = Object.values(s.edges).find(
    (e) =>
      e.id !== f.sea &&
      !e.vertices.includes(f.start) &&
      !e.vertices.includes(f.home.vertex),
  )!;
  for (const t of old.tiles) s.tiles[t].resource = "water";
  s.routes[old.id] = {
    id: "test-route",
    edge: old.id,
    owner: 0,
    kind: "route",
    born: 0,
    camps: {},
  };
  expect(relocationSites(s, old.id)).toContain(f.sea);
  const moved = run(s, { type: "move-route", from: old.id, edge: f.sea });
  expect(moved.routes[f.sea].id).toBe("test-route");
  expect(moved.routes[old.id]).toBeUndefined();
});

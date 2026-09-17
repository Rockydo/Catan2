import { expect, it } from "vitest";
import { applyCommand } from "../src/game/engine";
import {
  canRoute,
  inventory,
  ownTowns,
  routeKind,
  restoreCoastalRoads,
} from "../src/game/selectors";
import { deserialize, serialize } from "../src/game/save";
import { expansionPaths } from "../src/game/ai";
import { funded, run } from "./helpers";

export function coastalFixture() {
  const s = funded("coastal-road-regression");
  s.routes = {};
  const town = ownTowns(s)[0];
  const edge = s.vertices[town.vertex].edges
    .map((id) => s.edges[id])
    .find((e) => e.tiles.length === 2)!;
  s.tiles[edge.tiles[0]].resource = "lumber";
  s.tiles[edge.tiles[1]].resource = "water";
  delete edge.harbor;
  return { s, edge, town };
}

it("builds coastal roads at the road price and rejects coastal shipping lanes", () => {
  const { s, edge } = coastalFixture();
  expect(canRoute(s, edge.id, "road")).toBe(true);
  expect(canRoute(s, edge.id, "route")).toBe(false);
  expect(applyCommand(s, { type: "route", edge: edge.id }).ok).toBe(false);
  const before = inventory(s);
  const built = run(s, { type: "road", edge: edge.id });
  expect(built.routes[edge.id].kind).toBe("road");
  expect(inventory(built).lumber).toBe(before.lumber! - 1);
  expect(inventory(built).brick).toBe(before.brick! - 1);
  expect(inventory(built).wool).toBe(before.wool);
  expect(deserialize(serialize(built)).routes[edge.id].kind).toBe("road");
  const camp = run(built, { type: "camp", edge: edge.id, tile: edge.tiles[0] });
  expect(camp.routes[edge.id].camps[edge.tiles[0]]).toBe(1);
});

it("allows shipping lanes only on sea edges, including the revealed sea frontier", () => {
  const { s, edge } = coastalFixture();
  for (const t of edge.tiles) s.tiles[t].resource = "water";
  expect(canRoute(s, edge.id, "road")).toBe(false);
  expect(canRoute(s, edge.id, "route")).toBe(true);
  expect(run(s, { type: "route", edge: edge.id }).routes[edge.id].kind).toBe(
    "route",
  );
  edge.tiles.pop();
  expect(routeKind(s, edge.id)).toBe("route");
});

it("rejects a starting ship lane on a coastal edge instead of substituting it for a road", () => {
  const { s, edge, town } = coastalFixture();
  s.phase = "setup-route";
  s.setupVertex = town.vertex;
  s.setupIndex = 0;
  expect(
    applyCommand(s, { type: "setup-route", edge: edge.id, kind: "route" }).ok,
  ).toBe(false);
  expect(
    run(s, { type: "setup-route", edge: edge.id, kind: "road" }).routes[edge.id]
      .kind,
  ).toBe("road");
});

it("repairs existing coastal shipping lanes without changing ownership, stock or piece IDs", () => {
  const { s, edge } = coastalFixture();
  const built = run(s, { type: "road", edge: edge.id });
  const original = structuredClone(built.routes[edge.id]);
  built.routes[edge.id].kind = "route";
  const restored = deserialize(serialize(built));
  expect(restored.routes[edge.id]).toEqual(original);
  expect(restored.towns).toEqual(built.towns);
  expect(restored.rng).toEqual(built.rng);
});

it("corrects frontier sea routes when new land appears and AI plans matching route types", () => {
  const { s, edge } = coastalFixture();
  s.tiles[edge.tiles[0]].resource = "water";
  const built = run(s, { type: "route", edge: edge.id });
  built.tiles[edge.tiles[0]].resource = "lumber";
  restoreCoastalRoads(built);
  expect(built.routes[edge.id].kind).toBe("road");
  for (const path of expansionPaths(built).values())
    if (path.first) expect(path.kind).toBe(routeKind(built, path.first));
});

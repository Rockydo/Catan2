import { expect, it } from "vitest";
import { coastalFixture } from "./coastal-roads.test";
import { canRoute, roadBlockedByMountains } from "../src/game/selectors";
import { applyCommand } from "../src/game/engine";
for (const pair of [
  ["bare-peaks", "bare-peaks"],
  ["bare-peaks", "mountain-pass"],
  ["mountain-pass", "mountain-pass"],
] as const)
  it(`blocks roads between ${pair.join(" and ")}, including setup and free builds`, () => {
    const { s, edge, town } = coastalFixture();
    edge.tiles.forEach((id, i) => {
      s.tiles[id].resource = pair[i] === "bare-peaks" ? "peaks" : "stone";
      s.tiles[id].biome = pair[i];
    });
    expect(roadBlockedByMountains(s, edge.id)).toBe(true);
    expect(canRoute(s, edge.id, "road")).toBe(false);
    expect(applyCommand(s, { type: "road", edge: edge.id }).ok).toBe(false);
    s.players[s.active].bonuses.routes = 2;
    expect(applyCommand(s, { type: "road", edge: edge.id }).ok).toBe(false);
    s.phase = "setup-route";
    s.setupVertex = town.vertex;
    expect(
      applyCommand(s, { type: "setup-route", edge: edge.id, kind: "road" }).ok,
    ).toBe(false);
    s.tiles[edge.tiles[1]].biome = "woods";
    s.tiles[edge.tiles[1]].resource = "lumber";
    expect(canRoute(s, edge.id, "road")).toBe(true);
    s.tiles[edge.tiles[1]].biome = "water";
    s.tiles[edge.tiles[1]].resource = "water";
    expect(canRoute(s, edge.id, "road")).toBe(true);
  });

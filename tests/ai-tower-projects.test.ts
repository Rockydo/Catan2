import { expect, it } from "vitest";
import { economyProjects } from "../src/game/ai";
import { townThreats } from "../src/game/ai-strategy";
import { towerSites } from "../src/game/maritime";
import {
  ownTowns,
  piecesAt,
  points,
  withPlanningFrame,
} from "../src/game/selectors";
import { funded, piece } from "./helpers";

it("tower projects retain exhaustive town support, threat priorities and site order", () => {
  const s = funded("tower-project-neighbors");
  s.players[0].control = "standard";
  s.players[0].turns = 5;
  for (const tile of Object.values(s.tiles)) {
    tile.resource = "grain";
    delete tile.biome;
    delete tile.fish;
    delete tile.whale;
  }
  const home = ownTowns(s)[0],
    other = ownTowns(s)[1],
    rival = ownTowns(s, 1)[0];
  home.vertex = s.tiles["0,0"].vertices[0];
  other.vertex = s.tiles["0,0"].vertices[2];
  rival.vertex = s.tiles["3,0"].vertices[0];
  s.towns = { [home.id]: home, [other.id]: other, [rival.id]: rival };
  s.routes = Object.fromEntries(
    Object.values(s.edges).map((edge) => [
      edge.id,
      {
        id: edge.id,
        edge: edge.id,
        owner: 0,
        kind: "road" as const,
        born: 0,
        camps: {},
      },
    ]),
  );
  const towerVertex = s.tiles["0,0"].vertices[1];
  s.towers[towerVertex] = {
    id: "tower",
    vertex: towerVertex,
    owner: 0,
    tier: 2,
  };
  piece(s, "2,0", 1, "light", 3);
  piece(s, "-3,0", 0, "heavy", 2);
  const before = JSON.stringify(s);
  withPlanningFrame(s, () => {
    const towns = ownTowns(s);
    const expected = towerSites(s).flatMap((vertex) => {
      // Exhaustive reference deliberately does not use the reverse adjacency.
      const nearby = towns.filter(
        (town) =>
          town.vertex === vertex ||
          s.vertices[town.vertex].edges.some((edge) =>
            s.edges[edge].vertices.includes(vertex),
          ),
      );
      const threatened = nearby.some((town) => townThreats(s, town).length > 0);
      const stationed = s.vertices[vertex].tiles.some((id) =>
        piecesAt(s, id).some((u) => u.owner === s.active && points(u) > 0),
      );
      return nearby.length || stationed
        ? [
            {
              vertex,
              score:
                (threatened ? 16 : stationed ? 6 : 1) /
                (1 + (s.towers[vertex]?.tier ?? 0) * 0.35),
            },
          ]
        : [];
    });
    expected.sort((a, b) => b.score - a.score);
    const actual = economyProjects(s)
      .filter((project) => project.action.type === "tower")
      .map((project) => ({
        vertex: project.action.vertex,
        score: project.score,
      }));
    expect(expected.length).toBeGreaterThan(5);
    expect(actual).toEqual(expected);
    expect(actual.some((project) => project.vertex === towerVertex)).toBe(true);
    expect(actual.some((project) => project.score === 6)).toBe(true);
    expect(actual.some((project) => project.score === 16)).toBe(true);
  });
  expect(JSON.stringify(s)).toBe(before);
});

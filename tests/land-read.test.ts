import { expect, it } from "vitest";
import { newGame } from "../src/game/engine";
import { prepareGameView, withPlanningFrame } from "../src/game/selectors";
import { addHexes, landAtVertex, unknownAtVertex } from "../src/game/world";
import type { World } from "../src/game/types";

function reference(world: World, vertex: string) {
  return (
    world.vertices[vertex]?.tiles.filter(
      (id) => world.tiles[id].resource !== "water",
    ) ?? []
  );
}

it("land adjacency preserves vertex order and returns independent arrays in read scopes and published views", () => {
  const s = newGame("land-read-order");
  const check = () => {
    for (const vertex of [...Object.keys(s.vertices), "missing"]) {
      const expected = reference(s, vertex);
      const result = landAtVertex(s, vertex);
      expect(result).toEqual(expected);
      result.reverse().push("outside");
      expect(landAtVertex(s, vertex)).toEqual(expected);
    }
  };
  check();
  withPlanningFrame(s, check);
  prepareGameView(s);
  check();
});

it("repeated immutable reads inspect tile resources once and nested scopes restore their parent", () => {
  const s = newGame("land-read-count");
  const vertex = Object.values(s.vertices).find((v) => v.tiles.length === 3)!;
  const expected = reference(s, vertex.id);
  let reads = 0;
  s.tiles = new Proxy(s.tiles, {
    get(target, key: string) {
      reads++;
      return target[key];
    },
  });
  withPlanningFrame(s, () => {
    for (let i = 0; i < 20; i++)
      expect(landAtVertex(s, vertex.id)).toEqual(expected);
    expect(reads).toBe(3);
    const related = { ...s, active: 1 };
    expect(landAtVertex(related, vertex.id)).toEqual(expected);
    expect(reads).toBe(3);
    expect(() =>
      withPlanningFrame(related, () => {
        expect(landAtVertex(related, vertex.id)).toEqual(expected);
        expect(reads).toBe(6);
        throw Error("stop child scope");
      }),
    ).toThrow("stop child scope");
    expect(landAtVertex(s, vertex.id)).toEqual(expected);
    expect(reads).toBe(6);
  });
  expect(landAtVertex(s, vertex.id)).toEqual(expected);
  expect(reads).toBe(9);
});

it("terrain and geometry drafts bypass another view's cached adjacency", () => {
  const s = newGame("land-read-drafts");
  const vertex = Object.values(s.vertices).find((v) => v.tiles.length === 3)!;
  const old = reference(s, vertex.id);
  withPlanningFrame(s, () => {
    expect(landAtVertex(s, vertex.id)).toEqual(old);
    const terrain = { ...s, tiles: structuredClone(s.tiles) };
    for (const id of vertex.tiles) terrain.tiles[id].resource = "water";
    expect(landAtVertex(terrain, vertex.id)).toEqual([]);
    terrain.tiles[vertex.tiles[0]].resource = "ice";
    expect(landAtVertex(terrain, vertex.id)).toEqual([vertex.tiles[0]]);
    const geometry = { ...s, vertices: structuredClone(s.vertices) };
    geometry.vertices[vertex.id].tiles.reverse();
    expect(landAtVertex(geometry, vertex.id)).toEqual([...old].reverse());
    expect(landAtVertex(s, vertex.id)).toEqual(old);
  });
  for (const id of vertex.tiles) s.tiles[id].resource = "water";
  expect(landAtVertex(s, vertex.id)).toEqual([]);
  s.tiles[vertex.tiles[1]].resource = "snow";
  withPlanningFrame(s, () =>
    expect(landAtVertex(s, vertex.id)).toEqual([vertex.tiles[1]]),
  );
});

it("new frontier land appears on later reads without changing earlier published maps", () => {
  const s = newGame("land-read-frontier");
  const vertex = Object.values(s.vertices).find(
    (v) => unknownAtVertex(s, v.id).length,
  )!;
  const old = reference(s, vertex.id);
  prepareGameView(s);
  expect(landAtVertex(s, vertex.id)).toEqual(old);
  const next = structuredClone(s);
  const additions = unknownAtVertex(next, vertex.id);
  addHexes(next, next.seed, additions);
  for (const id of additions) next.tiles[id].resource = "grain";
  const expected = reference(next, vertex.id);
  expect(expected.length).toBeGreaterThan(old.length);
  expect(landAtVertex(next, vertex.id)).toEqual(expected);
  withPlanningFrame(next, () =>
    expect(landAtVertex(next, vertex.id)).toEqual(expected),
  );
  prepareGameView(next);
  expect(landAtVertex(next, vertex.id)).toEqual(expected);
  expect(landAtVertex(s, vertex.id)).toEqual(old);
});

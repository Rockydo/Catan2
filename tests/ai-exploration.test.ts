import { describe, expect, it } from "vitest";
import {
  expeditionProspects,
  expeditionApproach,
} from "../src/game/ai-exploration";
import { distance, expeditionFootprint } from "../src/game/world";
import { RAW, type Stock } from "../src/game/types";
import { maritimeFixture } from "./maritime-fixture";

describe("expedition climate prospects", () => {
  it("turns a border expedition toward the enemy instead of always revealing east", () => {
    const { s } = maritimeFixture();
    const vertex = "1:-17",
      target = "-5,0";
    const approach = expeditionApproach(s, vertex, 1, [target])!;
    const closest = (direction: number) =>
      Math.min(
        ...expeditionFootprint(s, vertex, 1, direction).map((id) =>
          distance(id, target),
        ),
      );
    expect(approach.direction).not.toBe(0);
    expect(closest(approach.direction)).toBeLessThan(closest(0));
    expect(expeditionFootprint(s, vertex, 1, approach.direction)).toHaveLength(
      10,
    );
  });
  it("prefers cold forests for missing wood, but desert frontiers for missing salt", () => {
    const { s } = maritimeFixture();
    const cold = s.tiles["-3,0"].vertices[0],
      desert = s.tiles["3,2"].vertices[0];
    for (const id of s.vertices[cold].tiles) s.tiles[id].climate = "cold";
    for (const id of s.vertices[desert].tiles) s.tiles[id].climate = "desert";
    const income: Stock = Object.fromEntries(RAW.map((good) => [good, 10]));
    income.lumber = 0;
    let prospects = expeditionProspects(s, income);
    expect(prospects.score(cold)).toBeGreaterThan(prospects.score(desert));
    income.lumber = 10;
    income.salt = 0;
    prospects = expeditionProspects(s, income);
    expect(prospects.score(desert)).toBeGreaterThan(prospects.score(cold));
  });
  it("counts fish and oil production as grain and coal supplies", () => {
    const { s } = maritimeFixture();
    const normal = expeditionProspects(s, { grain: 1, coal: 1 });
    const substitutes = expeditionProspects(s, { fish: 1, oil: 1 });
    expect(substitutes.missing).toBe(normal.missing);
    for (const vertex of Object.keys(s.vertices))
      expect(substitutes.score(vertex)).toBe(normal.score(vertex));
  });
  it("values Subtropical clay and Savanna hides when those supplies are missing", () => {
    const { s } = maritimeFixture();
    const humid = s.tiles["-3,0"].vertices[0],
      dry = s.tiles["3,2"].vertices[0];
    for (const id of s.vertices[humid].tiles)
      s.tiles[id].climate = "subtropical";
    for (const id of s.vertices[dry].tiles) s.tiles[id].climate = "savanna";
    const income: Stock = Object.fromEntries(RAW.map((good) => [good, 10]));
    income.brick = 0;
    let prospects = expeditionProspects(s, income);
    expect(prospects.score(humid)).toBeGreaterThan(prospects.score(dry));
    income.brick = 10;
    income.hides = 0;
    prospects = expeditionProspects(s, income);
    expect(prospects.score(dry)).toBeGreaterThan(prospects.score(humid));
  });
  it("never consults the seed or hidden climate reservations", () => {
    const { s } = maritimeFixture();
    const before = expeditionProspects(s, {});
    const hidden = structuredClone(s);
    Object.defineProperty(hidden, "climatePlan", {
      get() {
        throw Error("Hidden climate read");
      },
    });
    Object.defineProperty(hidden, "seed", {
      get() {
        throw Error("Hidden seed read");
      },
    });
    const after = expeditionProspects(hidden, {});
    for (const vertex of Object.keys(s.vertices))
      expect(after.score(vertex)).toBe(before.score(vertex));
  });
});

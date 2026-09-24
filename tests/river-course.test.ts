import { expect, it } from "vitest";
import { convergeRiverCourse } from "../src/game/river-course";
import { neighbors } from "../src/game/world";

it("shortens side-by-side hairpins into a single downhill channel", () => {
  const ids = ["0,0", "1,0", "1,1", "0,1", "-1,2", "-2,2"];
  const heights = new Map(ids.map((id, i) => [id, 1 - i * 0.1]));
  const course = new Map(ids.slice(0, -1).map((id, i) => [id, ids[i + 1]]));
  const r = convergeRiverCourse(
    course,
    new Map(),
    (id) => heights.get(id) ?? 2,
  );
  expect(r.joined).toBe(false);
  expect(r.course.size).toBeLessThan(course.size);
  expect(r.course.get("0,0")).toBe("0,1");
  for (const [id, next] of r.course) {
    expect(neighbors(id)).toContain(next);
    expect(heights.get(next)).toBeLessThan(heights.get(id)!);
    const others = [...r.course.keys()].filter(
      (n) => n !== id && neighbors(id).includes(n),
    );
    expect(others.length).toBeLessThanOrEqual(2);
  }
});
it("joins a lower existing river before tracing another parallel reach", () => {
  const course = new Map([
    ["0,0", "0,1"],
    ["0,1", "0,2"],
    ["0,2", "0,3"],
  ]);
  const existing = new Map([
    ["1,0", "1,1"],
    ["1,1", "1,2"],
  ]);
  const r = convergeRiverCourse(course, existing, (id) =>
    id === "1,0" ? 0.2 : id === "0,0" ? 0.8 : 0.5,
  );
  expect([...r.course]).toEqual([["0,0", "1,0"]]);
  expect(r.joined).toBe(true);
  expect(existing.size).toBe(2);
});
it("never joins an uphill channel or modifies the source course", () => {
  const course = new Map([
    ["0,0", "0,1"],
    ["0,1", "0,2"],
  ]);
  const r = convergeRiverCourse(course, new Map([["1,0", "1,1"]]), (id) =>
    id === "1,0" ? 1 : id === "0,0" ? 0.8 : 0.5,
  );
  expect([...r.course]).toEqual([...course]);
  expect(r.joined).toBe(false);
});

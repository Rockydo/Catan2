import { expect, it } from "vitest";
import { selectHalfForce, selectReadyForce } from "../src/ui/ArmyComposition";
import { maritimeFixture } from "./maritime-fixture";
import { piece } from "./helpers";
it("selects half by type and tier without taking new, spent, exhausted or embarked troops", () => {
  const { s } = maritimeFixture();
  const units = [
    ...Array.from({ length: 7 }, () => piece(s, "2,0", 0, "heavy", 1)),
    ...Array.from({ length: 3 }, () => piece(s, "2,0", 0, "heavy", 4)),
    ...Array.from({ length: 2 }, () => piece(s, "2,0", 0, "merchant", 2)),
  ];
  for (const patch of [
    { acted: true },
    { born: 10 },
    { moved: 1 },
    { carrier: "carrier" },
  ]) {
    const u = piece(s, "2,0");
    Object.assign(u, patch);
    units.push(u);
  }
  const ids = selectHalfForce(s, units);
  expect(ids).toHaveLength(6);
  expect(new Set(ids).size).toBe(6);
  const selected = ids.map((id) => s.pieces[id]);
  expect(selected.filter((u) => u.kind === "merchant")).toHaveLength(1);
  expect(
    selected.filter((u) => u.kind === "heavy" && u.tier === 1).length,
  ).toBeGreaterThanOrEqual(3);
  expect(
    selected.filter((u) => u.kind === "heavy" && u.tier === 4).length,
  ).toBeGreaterThanOrEqual(1);
  expect(ids.every((id) => units.slice(0, 12).some((u) => u.id === id))).toBe(
    true,
  );
  expect(selectReadyForce(s, units)).toEqual(
    units.slice(0, 12).map((u) => u.id),
  );
  const exhausted = units.find((u) => u.moved === 1)!;
  exhausted.bonus = 1;
  expect(selectReadyForce(s, units)).toContain(exhausted.id);
});
it("rounds odd fleets up and handles empty and single-piece selections", () => {
  const { s } = maritimeFixture();
  s.tiles["2,0"].resource = "water";
  const ships = Array.from({ length: 5 }, () =>
    piece(s, "2,0", 0, "convoy", 2),
  );
  expect(selectHalfForce(s, ships)).toHaveLength(3);
  expect(selectHalfForce(s, [])).toEqual([]);
  expect(selectHalfForce(s, [ships[0]])).toEqual([ships[0].id]);
});

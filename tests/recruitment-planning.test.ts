import { expect, it, vi } from "vitest";
import { economyProjects } from "../src/game/ai";
import * as transport from "../src/game/ai-transport";
import { ownTowns, hostileAt, withPlanningFrame } from "../src/game/selectors";
import { waterAtVertex } from "../src/game/world";
import { crossing } from "./transport-fixture";
import { piece } from "./helpers";
import { GOODS } from "../src/game/types";

function ports() {
  const { s, home } = crossing(false);
  s.phase = "economy";
  home.level = home.turnLevel = 4;
  for (const good of GOODS) home.stock[good] = 100;
  for (const [i, vertex] of s.tiles["-3,0"].vertices.entries()) {
    if (i % 2 || Object.values(s.towns).some((t) => t.vertex === vertex))
      continue;
    const id = `t${s.nextId++}`;
    s.towns[id] = {
      ...structuredClone(home),
      id,
      name: `Port ${i}`,
      vertex,
      level: 1 + (i % 4),
      turnLevel: 1 + (i % 4),
    };
  }
  for (let i = 0; i < 32; i++) piece(s, "-4,0", 0, "heavy", 2);
  piece(s, "-3,0", 0, "convoy", 1);
  return s;
}

it("assesses transport demand once per launch tile while retaining every port and eligible hull tier", () => {
  const s = ports();
  const launches = ownTowns(s).flatMap((town) =>
    waterAtVertex(s, town.vertex).filter((tile) => !hostileAt(s, tile)),
  );
  expect(launches.length).toBeGreaterThan(new Set(launches).size);
  const spy = vi.spyOn(transport, "campaignTransportDemand");
  try {
    const before = JSON.stringify(s);
    const projects = withPlanningFrame(s, () => economyProjects(s));
    expect(spy.mock.calls.map(([, tile]) => tile)).toEqual([
      ...new Set(launches),
    ]);
    for (const town of ownTowns(s)) {
      const hulls = projects.filter(
        (p) =>
          p.action.type === "ship" &&
          p.action.town === town.id &&
          p.action.kind === "convoy",
      );
      expect(hulls.length).toBeGreaterThan(0);
      expect(hulls.every((p) => (p.action.tier ?? 1) <= town.turnLevel)).toBe(
        true,
      );
    }
    expect(JSON.stringify(s)).toBe(before);
  } finally {
    spy.mockRestore();
  }
});

it("refreshes fleet capacity and free hull plans after a changed campaign snapshot", () => {
  const s = ports();
  const previous = withPlanningFrame(s, () => economyProjects(s));
  const changed = structuredClone(s);
  for (let i = 0; i < 40; i++) piece(changed, "-3,0", 0, "convoy", 4);
  const enough = withPlanningFrame(changed, () => economyProjects(changed));
  const convoy = (p: (typeof previous)[number]) =>
    p.action.type === "ship" && p.action.kind === "convoy";
  expect(previous.filter(convoy).length).toBeGreaterThan(0);
  expect(enough.filter(convoy)).toEqual([]);
  const grant = structuredClone(changed);
  grant.players[grant.active].bonuses.ships = [["convoy"]];
  grant.players[grant.active].bonuses.shipTiers = [2];
  const free = withPlanningFrame(grant, () => economyProjects(grant)).filter(
    convoy,
  );
  expect(free.length).toBeGreaterThan(0);
  expect(
    free.every(
      (p) =>
        p.action.tier === 2 &&
        Object.keys(p.cost).length === 0 &&
        (p.quantity ?? 0) >= 1,
    ),
  ).toBe(true);
  expect(JSON.stringify(withPlanningFrame(s, () => economyProjects(s)))).toBe(
    JSON.stringify(previous),
  );
});

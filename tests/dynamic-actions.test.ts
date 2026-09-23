import { describe, expect, it } from "vitest";
import { funded, piece, run, nextOwnerTurn } from "./helpers";
import { applyCommand } from "../src/game/engine";
import { chooseAIAction } from "../src/game/ai";
import { ownTowns, pathTo, speed } from "../src/game/selectors";
import { landAtVertex } from "../src/game/world";
import { siegeParticipants } from "../src/game/siege-status";
import type { UnitClass } from "../src/game/types";

function field(kind: UnitClass, steps: number, city = false) {
  const s = funded();
  s.phase = "economy";
  const home = ownTowns(s)[0],
    town = ownTowns(s, 1)[0];
  for (const t of Object.values(s.tiles)) t.resource = "grain";
  home.vertex = s.tiles["-3,0"].vertices[0];
  town.vertex = s.tiles["3,0"].vertices[0];
  town.level = town.turnLevel = city ? 2 : 1;
  town.stock = { ore: 3, grain: 2 };
  home.stock = {};
  s.towns = { [home.id]: home, [town.id]: town };
  s.routes = {};
  const adjacent = landAtVertex(s, town.vertex);
  const origin = Object.keys(s.tiles).find(
    (id) =>
      Math.min(...adjacent.map((to) => pathTo(s, id, to, false, 0)!.length)) ===
      steps,
  )!;
  const destination = adjacent.find(
    (to) => pathTo(s, origin, to, false, 0)!.length === steps,
  )!;
  const unit = piece(s, origin, 0, kind, 1);
  return { s, home, town, unit, destination };
}

it("restores large siege links in army order and retains the legacy nearby fallback", () => {
  const { s, town, unit } = field("heavy", 0);
  const force = [unit];
  for (let i = 0; i < 5000; i++) force.push(piece(s, unit.tile, 0, "heavy"));
  const linked = force.filter((_, i) => i % 2 === 0);
  const siege = (s.sieges[`0:${town.id}`] = {
    owner: 0,
    town: town.id,
    progress: 1,
    last: 0,
    raided: null,
    units: [...linked].reverse().map((u) => u.id),
  });
  expect(siegeParticipants(s, town, 0)).toEqual(linked);
  siege.units = ["a former participant"];
  expect(siegeParticipants(s, town, 0)).toEqual(force);
  delete s.sieges[`0:${town.id}`].units;
  expect(siegeParticipants(s, town, 0)).toEqual(force);
});

describe("one action phase and one-point siege operations", () => {
  it.each([
    ["heavy", 0],
    ["light", 1],
    ["cavalry", 2],
    ["artillery", 0],
  ] as [UnitClass, number][])(
    "%s can approach then raid using its remaining movement",
    (kind, steps) => {
      let { s, home, town, unit, destination } = field(kind, steps);
      if (steps) s = run(s, { type: "move", ids: [unit.id], to: destination });
      s = run(s, { type: "siege", ids: [unit.id], town: town.id });
      expect(s.phase).toBe("economy");
      expect(s.pieces[unit.id].moved).toBe(steps + 1);
      expect(s.pieces[unit.id].acted).toBe(false);
      expect(s.pieces[unit.id].tile).toBe(destination);
      expect(
        siegeParticipants(s, s.towns[town.id], 0).map((u) => u.id),
      ).toEqual([unit.id]);
      expect(s.towns[home.id].stock).toEqual({ ore: 3, grain: 2 });
      s = run(s, { type: "city", town: home.id });
      expect(s.towns[home.id].level).toBe(2);
      expect(
        applyCommand(s, { type: "destroy-town", ids: [unit.id], town: town.id })
          .ok,
      ).toBe(false);
    },
  );
  it("siege steps also allow movement first, cost one point, and remain once per town per turn", () => {
    let { s, town, unit, destination } = field("cavalry", 1, true);
    s = run(s, { type: "move", ids: [unit.id], to: destination });
    s = run(s, { type: "siege", ids: [unit.id], town: town.id });
    expect(s.pieces[unit.id].moved).toBe(2);
    expect(s.sieges[`0:${town.id}`].progress).toBe(1);
    expect(
      applyCommand(s, { type: "siege", ids: [unit.id], town: town.id }).ok,
    ).toBe(false);
    nextOwnerTurn(s);
    s = run(s, { type: "siege", ids: [unit.id], town: town.id });
    expect(s.sieges[`0:${town.id}`].raided).not.toBeNull();
  });
  it("rejects exhausted, newly recruited or activation-ended troops and protected towns", () => {
    const { s, town, unit } = field("heavy", 0);
    unit.moved = speed(unit);
    expect(
      applyCommand(s, { type: "siege", ids: [unit.id], town: town.id }).ok,
    ).toBe(false);
    unit.moved = 0;
    unit.acted = true;
    expect(
      applyCommand(s, { type: "siege", ids: [unit.id], town: town.id }).ok,
    ).toBe(false);
    unit.acted = false;
    unit.born = s.players[0].turns;
    expect(
      applyCommand(s, { type: "siege", ids: [unit.id], town: town.id }).ok,
    ).toBe(false);
    unit.born = 0;
    piece(
      s,
      landAtVertex(s, town.vertex).find((id) => id !== unit.tile)!,
      1,
    );
    expect(
      applyCommand(s, { type: "siege", ids: [unit.id], town: town.id }).ok,
    ).toBe(false);
  });
  it("AI follows a march with a siege and then uses the shared phase for construction", () => {
    let { s, town, unit, destination } = field("light", 1);
    s = run(s, { type: "move", ids: [unit.id], to: destination });
    expect(chooseAIAction(s)).toMatchObject({ type: "siege", town: town.id });
    s = run(s, chooseAIAction(s));
    const action = chooseAIAction(s);
    expect(["city", "recruit", "camp", "road", "bank"]).toContain(action.type);
    expect(applyCommand(s, action).ok).toBe(true);
  });
});

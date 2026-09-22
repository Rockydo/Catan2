import { expect, it } from "vitest";
import { piece, run, nextOwnerTurn } from "./helpers";
import { pathTo } from "../src/game/selectors";
import { crossing } from "./transport-fixture";
import { chooseAIAction, economyProjects } from "../src/game/ai";
import {
  campaignPassage,
  campaignTransportDemand,
  campaignTransportAction,
} from "../src/game/ai-transport";
import { assertInvariants, serialize, deserialize } from "../src/game/save";
import type { Command } from "../src/game/types";

it("funding proves a crossing exists without replacing the best transport itinerary", () => {
  const { s } = crossing(false);
  for (let i = 0; i < 6; i++) piece(s, "-4,0", 0, "heavy");
  // This nearby force has a short direct march and needs no ferry.
  piece(s, "3,-1", 0, "heavy");
  piece(s, "4,0", 1, "heavy", 4);
  expect(campaignTransportDemand(s, "-3,0")).toBe(6);
  expect(campaignPassage(s, "-4,0", "-3,0")).toEqual({
    army: "-4,0",
    pickup: "-4,0",
    embark: "-3,0",
    landing: "3,-1",
    sea: "2,0",
    target: "4,0",
    turns: 6,
    saving: 20,
    units: 6,
  });
  expect(campaignTransportDemand(s, "-3,0")).toBe(6);
  expect(campaignPassage(s, "-4,0", "-3,0", 3, 4)?.landing).toBe("3,0");
  expect(campaignPassage(s, "-4,0", "-3,0", 3, 1)?.landing).toBe("3,-1");
});

it("landing assessments change when a new position adds fast threats or friendly guards", () => {
  const { s } = crossing(false);
  for (let i = 0; i < 6; i++) piece(s, "-4,0", 0, "heavy");
  piece(s, "4,0", 1, "heavy", 4);
  expect(campaignPassage(s, "-4,0", "-3,0")?.landing).toBe("3,-1");
  const reinforced = structuredClone(s);
  piece(reinforced, "3,0", 0, "heavy", 2);
  expect(campaignPassage(reinforced, "-4,0", "-3,0")?.landing).toBe("3,0");
  const threatened = structuredClone(s);
  piece(threatened, "4,0", 1, "cavalry", 4);
  expect(campaignPassage(threatened, "-4,0", "-3,0")).toBeNull();
  expect(campaignTransportDemand(threatened, "-3,0")).toBe(0);
  // Old immutable snapshots retain their own plan.
  expect(campaignPassage(s, "-4,0", "-3,0")?.landing).toBe("3,-1");
});

it("counts a landing tower once for passengers and friendly shore guards together", () => {
  const { s } = crossing(false);
  for (let i = 0; i < 8; i++) piece(s, "-4,0", 0, "heavy");
  piece(s, "3,0", 0, "heavy", 2);
  piece(s, "4,0", 1, "heavy", 4);
  piece(s, "4,0", 1, "heavy", 3);
  s.towers.tower = {
    id: "tower",
    owner: 0,
    tier: 2,
    vertex: s.tiles["3,0"].vertices[0],
  };
  // Two passengers + two guards + one tower = six against seven.
  expect(campaignPassage(s, "-4,0", "-3,0", 3, 2)?.landing).not.toBe("3,0");
  expect(campaignPassage(s, "-4,0", "-3,0", 3, 3)?.landing).toBe("3,0");
});

it("keeps passenger order across several ships when planning a combined landing", () => {
  const { s } = crossing(false);
  const first = piece(s, "2,0", 0, "convoy", 1);
  const second = piece(s, "2,0", 0, "convoy", 1);
  const passengers = [second, first, second, first].map((ship) => {
    const unit = piece(s, "2,0", 0, "heavy", 3);
    unit.carrier = ship.id;
    return unit;
  });
  piece(s, "4,0", 1, "heavy", 4);
  const command = campaignTransportAction(s);
  expect(command?.type).toBe("unload");
  expect(command?.ids).toEqual(passengers.map((unit) => unit.id));
  expect(command?.ships).toEqual([first.id, second.id]);
});

it("takes a faster sea crossing even though a long land route exists on the same continent", () => {
  const { s } = crossing();
  const army = piece(s, "-4,0", 0, "heavy", 3);
  piece(s, "-3,0", 0, "convoy", 1);
  const route = pathTo(s, "-4,0", "4,0", false, 0)!;
  expect(route.length).toBeGreaterThan(12);
  const passage = campaignPassage(s, army.tile, "-3,0");
  expect(passage).not.toBeNull();
  expect(passage!.saving).toBeGreaterThanOrEqual(2);
  const c = chooseAIAction({ ...s });
  expect(c.type).toBe("load");
  expect(c.ids).toContain(army.id);
  expect(run(s, c).pieces[army.id].carrier).toBeDefined();
});

it("funds shortcut transports while a safe but slow land route still exists", () => {
  const { s, home } = crossing();
  home.stock = { lumber: 20, wool: 20, salt: 10 };
  s.phase = "economy";
  for (let i = 0; i < 8; i++) piece(s, "-4,0");
  const projects = economyProjects(s).filter(
    (p) =>
      p.action.type === "ship" &&
      ["transport", "convoy"].includes(p.action.kind!),
  );
  expect(projects.some((p) => p.urgent)).toBe(true);
});

it("does not board for a short direct land march or send a transport through enemy ships", () => {
  const { s } = crossing();
  piece(s, "3,-1", 0, "heavy", 3);
  piece(s, "2,-1", 0, "convoy");
  expect(campaignPassage(s, "3,-1", "2,-1")).toBeNull();
  const isolated = crossing();
  piece(isolated.s, "-4,0", 0, "heavy", 3);
  for (const t of Object.values(isolated.s.tiles))
    if (t.resource === "water") t.resource = "peaks";
  for (let q = -3; q <= 2; q++) isolated.s.tiles[`${q},0`].resource = "water";
  expect(campaignPassage(isolated.s, "-4,0", "-3,0")).not.toBeNull();
  piece(isolated.s, "0,0", 1, "galley", 4);
  expect(campaignPassage({ ...isolated.s }, "-4,0", "-3,0")).toBeNull();
});

it("ferries repeated waves to a safe beachhead and builds enough strength to raid", () => {
  let { s } = crossing(false);
  for (let i = 0; i < 8; i++) piece(s, "-4,0", 0, "heavy", 1);
  piece(s, "-3,0", 0, "convoy", 1);
  piece(s, "4,0", 1, "heavy", 4);
  const history: Command[] = [];
  for (
    let turn = 0;
    turn < 30 && !s.events.some((e) => e.townAttack?.kind === "raid");
    turn++
  ) {
    s = deserialize(serialize(s));
    nextOwnerTurn(s);
    s.phase = "military";
    for (let step = 0; step < 60; step++) {
      const c = chooseAIAction(s);
      if (c.type === "end-turn") break;
      history.push(c);
      s = run(s, c);
      if (s.phase === "finished") break;
    }
  }
  expect(
    history.filter((c) => c.type === "unload").length,
  ).toBeGreaterThanOrEqual(3);
  expect(history.some((c) => c.type === "resolve-battle")).toBe(true);
  expect(s.events.some((e) => e.townAttack?.kind === "raid")).toBe(true);
  assertInvariants(s);
});

import { expect, it } from "vitest";
import { piece, run, nextOwnerTurn } from "./helpers";
import { pathTo } from "../src/game/selectors";
import { crossing } from "./transport-fixture";
import { chooseAIAction, economyProjects } from "../src/game/ai";
import { campaignPassage } from "../src/game/ai-transport";
import { assertInvariants, serialize, deserialize } from "../src/game/save";
import type { Command } from "../src/game/types";

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

import { afterEach, describe, expect, it, vi } from "vitest";
import * as ai from "../src/game/ai";
import { createAIOrderPlanner } from "../src/game/ai-orders";
afterEach(() => vi.restoreAllMocks());
import {
  planEconomicWork,
  economicWorkOrder,
  type WorkProject,
} from "../src/game/ai-work-queue";
import { marginalValues } from "../src/game/ai";
import { applyCommand, canApplyCommand } from "../src/game/engine";
import { guildCost, guildOrderQuote, townGuilds } from "../src/game/guilds";
import { campCost } from "../src/game/content";
import { syncEmergencyCoalition } from "../src/game/emergency-coalition";
import {
  inventory,
  ownTowns,
  recipePayment,
  withPlanningFrame,
} from "../src/game/selectors";
import type { Command, Game, Good } from "../src/game/types";
import { guildFixture } from "./guild-fixture";
import { run } from "./helpers";

function mature() {
  const { s, home } = guildFixture("artisans", 3);
  s.players[s.active].control = "standard";
  for (const vertex of Object.keys(s.vertices)) {
    if (ownTowns(s).length >= 12) break;
    if (Object.values(s.towns).some((t) => t.vertex === vertex)) continue;
    const id = `t${s.nextId++}`;
    s.towns[id] = { ...structuredClone(home), id, vertex, name: id, stock: {} };
  }
  home.stock = {
    grain: 500,
    coal: 300,
    coke: 200,
    stone: 200,
    lumber: 200,
    ore: 200,
    masonry: 200,
    steel: 200,
    planks: 200,
    hides: 200,
  };
  syncEmergencyCoalition(s);
  return s;
}
function plans(s: Game, type: "guild-order" | "guild" | "camp"): WorkProject[] {
  return ownTowns(s).map((town, i) => {
    let action: Command, cost;
    if (type === "guild-order") {
      action = {
        type,
        town: town.id,
        guild: "artisans",
        tier: 3,
        kind: "grain",
      };
      cost = guildOrderQuote(s, town, { tier: 3, raw: "grain" }).cost;
    } else if (type === "guild") {
      town.guild!.tier = 1;
      action = { type, town: town.id, kind: "artisans" };
      cost = guildCost("artisans", 2);
    } else {
      const edge = Object.values(s.edges)[i];
      s.routes[edge.id] = {
        id: `r${i}`,
        edge: edge.id,
        owner: s.active,
        kind: "road",
        born: 0,
        camps: {},
      };
      for (const tile of edge.tiles) s.tiles[tile].resource = "grain";
      action = { type, edge: edge.id, tile: edge.tiles[0] };
      cost = campCost("grain", 1);
    }
    return { action, cost: recipePayment(s, cost), score: 100 - i };
  });
}
const next = (
  s: Game,
  work: NonNullable<ReturnType<typeof planEconomicWork>>,
) => withPlanningFrame(s, () => economicWorkOrder(s, work, marginalValues(s)));

describe("budgeted AI economic work", () => {
  it.each(["guild-order", "guild", "camp"] as const)(
    "commissions several %s jobs while paying each exact recipe",
    (type) => {
      let s = mature();
      const projects = plans(s, type),
        selected = projects[0];
      const original = structuredClone(s),
        initial = inventory(s);
      const work = planEconomicWork(s, selected, projects)!;
      expect(work.orders.length).toBe(5);
      s = run(s, selected.action);
      let done = 1;
      for (;;) {
        const command = next(s, work);
        if (!command) break;
        const before = JSON.stringify(s);
        expect(canApplyCommand(s, command)).toBe(true);
        expect(JSON.stringify(s)).toBe(before);
        s = run(s, command);
        done++;
      }
      expect(done).toBe(6);
      expect(original.actions + done).toBe(s.actions);
      for (const [good, amount] of Object.entries(initial))
        expect(inventory(s)[good as Good] ?? 0).toBeGreaterThanOrEqual(
          amount! * 0.8,
        );
      if (type === "guild-order") expect(inventory(s).provisions).toBe(48);
      if (type === "guild")
        expect(
          ownTowns(s).filter((t) => townGuilds(t)[0].tier === 2),
        ).toHaveLength(6);
      if (type === "camp")
        expect(
          Object.values(s.routes).filter((r) => Object.keys(r.camps).length),
        ).toHaveLength(6);
    },
  );
  it("keeps early games, human autoplay and unrelated orders on the full planner", () => {
    const s = mature(),
      projects = plans(s, "guild-order");
    s.players[s.active].control = "human";
    expect(planEconomicWork(s, projects[0], projects)).toBeUndefined();
    s.players[s.active].control = "standard";
    const other = { ...projects[0], action: { type: "buy-research", tier: 1 } };
    expect(planEconomicWork(s, other, [other])).toBeUndefined();
    for (const town of ownTowns(s).slice(2)) delete s.towns[town.id];
    expect(planEconomicWork(s, projects[0], projects)).toBeUndefined();
  });
  it("stops when the material budget is spent instead of borrowing from expected production", () => {
    let s = mature();
    ownTowns(s)[0].stock = { grain: 40, coke: 10 };
    const projects = plans(s, "guild-order"),
      work = planEconomicWork(s, projects[0], projects)!;
    s = run(s, projects[0].action);
    const command = next(s, work)!;
    expect(command).toBeDefined();
    s = run(s, command);
    expect(next(s, work)).toBeNull();
    expect(inventory(s)).toMatchObject({ grain: 36, coke: 8, provisions: 16 });
  });
  it("skips an invalid or newly unprofitable job without corrupting the campaign", () => {
    let s = mature();
    const projects = plans(s, "guild-order"),
      work = planEconomicWork(s, projects[0], projects)!;
    s = run(s, projects[0].action);
    delete s.towns[work.orders[0].town!];
    const before = JSON.stringify(s);
    expect(next(s, work)?.town).toBe(projects[2].action.town);
    expect(JSON.stringify(s)).toBe(before);
    const abundant = Object.fromEntries(
      Object.keys(marginalValues(s)).map((g) => [
        g,
        g === "provisions" ? 0 : 1,
      ]),
    ) as ReturnType<typeof marginalValues>;
    expect(economicWorkOrder(s, work, abundant)).toBeNull();
  });
  it.each([
    "turn",
    "active",
    "human",
    "battle",
    "trade",
    "alliance",
    "research",
  ])("abandons a queue after a %s boundary", (boundary) => {
    let s = mature();
    const projects = plans(s, "guild-order"),
      work = planEconomicWork(s, projects[0], projects)!;
    s = run(s, projects[0].action);
    if (boundary === "turn") s.players[s.active].turns++;
    if (boundary === "active") s.active = 1;
    if (boundary === "human") s.players[s.active].control = "human";
    if (boundary === "battle") s.battle = {} as NonNullable<Game["battle"]>;
    if (boundary === "trade") s.trade = {} as NonNullable<Game["trade"]>;
    if (boundary === "alliance")
      (s.alliances ??= []).push({
        id: "changed",
        members: [0, 1],
        threat: 2,
        lockedUntil: 100,
      });
    if (boundary === "research") s.researchChoice = [];
    expect(next(s, work)).toBeNull();
  });
});

it("uses one strategic decision for a funded work queue and replays identical engine results", () => {
  const s = mature(),
    projects = plans(s, "guild-order");
  const spy = vi
    .spyOn(ai, "chooseAIAction")
    .mockImplementation((view, _recruit, work) => {
      if (view.actions === s.actions) {
        work?.(planEconomicWork(view, projects[0], projects)!);
        return projects[0].action;
      }
      return { type: "end-turn" };
    });
  const before = JSON.stringify(s);
  const result = createAIOrderPlanner(true)(s, () => 0);
  expect(result.commands).toHaveLength(6);
  expect(spy).toHaveBeenCalledTimes(2);
  let reference = s;
  for (const command of result.commands) reference = run(reference, command);
  expect(result.state).toEqual(reference);
  expect(JSON.stringify(s)).toBe(before);
});

it.each([false, true])(
  "continues a bounded queue across worker slices (owned snapshots: %s)",
  (owned) => {
    const s = mature(),
      projects = plans(s, "camp"),
      plan = createAIOrderPlanner(owned);
    const spy = vi
      .spyOn(ai, "chooseAIAction")
      .mockImplementation((view, _recruit, work) => {
        work?.(planEconomicWork(view, projects[0], projects)!);
        return projects[0].action;
      });
    let time = 0;
    const first = plan(s, () => (time += 200));
    expect(first.commands).toEqual([projects[0].action]);
    const second = plan(first.state, () => (time += 200));
    expect(second.commands).toEqual([projects[1].action]);
    expect(spy).toHaveBeenCalledTimes(1);
    // A replaced input must force a new strategic decision rather than spend the
    // private work budget planned for a different campaign state.
    const changed = structuredClone(second.state);
    ownTowns(changed)[0].stock.lumber = 0;
    spy.mockImplementation(() => ({ type: "end-turn" }));
    expect(plan(changed, () => (time += 200)).commands).toEqual([
      { type: "end-turn" },
    ]);
    expect(spy).toHaveBeenCalledTimes(2);
  },
);

it("protects priority funds and returns to the planner when a reserve becomes buildable", () => {
  let s = mature();
  const towns = ownTowns(s);
  const projects = plans(s, "guild-order").filter(
    (p) => p.action.town !== towns[1].id,
  );
  towns[1].guild!.tier = 1;
  towns[0].stock.planks = 0;
  projects[0].action.kind = "lumber";
  projects[0].cost = { lumber: 2, coke: 1 };
  const priority = {
    action: { type: "guild", kind: "artisans", town: towns[1].id },
    cost: guildCost("artisans", 2),
    score: 200,
  };
  expect(canApplyCommand(s, priority.action)).toBe(false);
  const work = planEconomicWork(s, projects[0], projects, priority)!;
  s = run(s, projects[0].action);
  expect(canApplyCommand(s, priority.action)).toBe(true);
  expect(next(s, work)).toBeNull();
});

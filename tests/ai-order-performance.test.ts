import { expect, it, vi } from "vitest";
import { applyCommandPlan } from "../src/game/engine";
import { planAIOrders } from "../src/game/ai-orders";
import { cachedMilitaryWait } from "../src/game/ai-maneuvers";
import { planningPath } from "../src/game/ai-paths";
import { pathTo, ownTowns } from "../src/game/selectors";
import { assertInvariants, serialize, deserialize } from "../src/game/save";
import { guildEconomyProjects } from "../src/game/guild-ai";
import { marginalValues } from "../src/game/ai";
import * as guilds from "../src/game/guilds";
import { guildFixture } from "./guild-fixture";
import { funded, piece, run } from "./helpers";
import type { Command } from "../src/game/types";

it("a planned transaction sequence matches separate engine actions exactly", () => {
  const { s, home } = guildFixture("artisans", 3);
  const before = JSON.stringify(s);
  const commands: Command[] = [
    { type: "guild-order", town: home.id, tier: 1, kind: "grain" },
    { type: "bank", give: { lumber: 12 }, take: { ore: 3 } },
    { type: "guild-order", town: home.id, tier: 2, kind: "coal" },
    { type: "guild-order", town: home.id, tier: 3, kind: "gold" },
  ];
  let expected = s;
  for (const c of commands) expected = run(expected, c);
  const actual = applyCommandPlan(s, (_, done) => commands[done.length]);
  expect(actual.ok).toBe(true);
  expect(actual.commands).toEqual(commands);
  expect(actual.state).toEqual(expected);
  expect(JSON.stringify(s)).toBe(before);
  assertInvariants(deserialize(serialize(actual.state)));
});

it("a failed later order rolls back the private batch without touching the input", () => {
  const { s, home } = guildFixture("artisans", 3);
  const before = JSON.stringify(s);
  const command: Command = {
    type: "guild-order",
    town: home.id,
    tier: 1,
    kind: "grain",
  };
  const result = applyCommandPlan(s, (_, done) =>
    done.length < 2 ? command : undefined,
  );
  expect(result.ok).toBe(false);
  expect(result.error).toContain("completed");
  expect(result.commands).toEqual([]);
  expect(result.state).toBe(s);
  expect(JSON.stringify(s)).toBe(before);
});

it("worker plans match replayed orders and stop at research prompts", () => {
  const s = funded();
  s.players[0].control = "standard";
  s.players[0].turns = 4;
  s.players[0].researchPurchases = 6;
  const plan = planAIOrders(s, () => 0);
  expect(plan.commands.length).toBeGreaterThan(1);
  let replay = s;
  for (const c of plan.commands) replay = run(replay, c);
  expect(plan.state).toEqual(replay);
  const { s: research, home } = guildFixture("scholars", 3);
  const command: Command = { type: "guild-order", town: home.id, tier: 1 };
  const started = run(research, command);
  started.players[0].control = "standard";
  const choice = planAIOrders(started, () => 0);
  expect(choice.commands).toHaveLength(1);
  expect(choice.commands[0].type).toBe("choose-research");
});

it("guilds share identical quotes, keep the correct city, and skip spent tiers", () => {
  const s = funded();
  for (const town of ownTowns(s)) {
    town.level = town.turnLevel = 4;
    town.guilds = [
      {
        kind: "artisans",
        tier: 3,
        born: 0,
        used: false,
        usedTiers: [1],
        auto: false,
      },
      {
        kind: "merchants",
        tier: 3,
        born: 0,
        used: false,
        usedTiers: [1],
        auto: false,
      },
      {
        kind: "scholars",
        tier: 3,
        born: 0,
        used: true,
        usedTiers: [1, 2, 3],
        auto: false,
      },
    ];
  }
  s.players[0].turns = 10;
  const spy = vi.spyOn(guilds, "guildOrderQuote");
  try {
    const values = marginalValues(s);
    const projects = guildEconomyProjects(s, values);
    const sharedCalls = spy.mock.calls.length;
    expect(projects).toHaveLength(ownTowns(s).length * 2);
    for (const town of ownTowns(s)) {
      expect(projects.filter((p) => p.action.town === town.id)).toHaveLength(2);
    }
    expect(projects.every((p) => p.action.tier! > 1)).toBe(true);
    spy.mockClear();
    const only = structuredClone(s);
    only.towns = { [ownTowns(only)[0].id]: ownTowns(only)[0] };
    guildEconomyProjects(only, values);
    expect(spy.mock.calls.length).toBe(sharedCalls);
  } finally {
    spy.mockRestore();
  }
});

it("military wait reuse invalidates on enemy stores, movement, or local tower support", () => {
  const s = funded("military-wait-cache");
  const evaluate = vi.fn((): Command => ({ type: "end-turn" }));
  cachedMilitaryWait(s, evaluate);
  const bank = structuredClone(s);
  ownTowns(bank)[0].stock.lumber = 99;
  bank.actions++;
  cachedMilitaryWait(bank, evaluate);
  expect(evaluate).toHaveBeenCalledTimes(1);
  ownTowns(bank, 1)[0].stock.lumber = 77;
  cachedMilitaryWait(bank, evaluate);
  expect(evaluate).toHaveBeenCalledTimes(2);
  const unit = piece(bank, "0,0");
  cachedMilitaryWait(bank, evaluate);
  expect(evaluate).toHaveBeenCalledTimes(3);
  const vertex = bank.tiles[unit.tile].vertices[0];
  bank.towers[vertex] = { id: "w-cache", owner: bank.active, vertex, tier: 1 };
  cachedMilitaryWait(bank, evaluate);
  expect(evaluate).toHaveBeenCalledTimes(4);
});

it("shared path searches respect changed occupation, alliances, and thawed ice", () => {
  let s = funded("cached-path-network");
  for (const tile of Object.values(s.tiles)) tile.resource = "water";
  for (const id of ["0,0", "1,0", "2,0"]) s.tiles[id].resource = "grain";
  const compare = () => {
    const expected = pathTo(s, "0,0", "2,0", false, 0);
    expect(planningPath(s, "0,0", "2,0", false, 0)).toEqual(expected);
    return expected;
  };
  expect(compare()).toEqual(["1,0", "2,0"]);
  s = structuredClone(s);
  piece(s, "1,0", 1);
  expect(compare()).toBeNull();
  s = structuredClone(s);
  s.alliances = [
    { id: "test-alliance", members: [0, 1], threat: 2, lockedUntil: 10 },
  ];
  expect(compare()).toEqual(["1,0", "2,0"]);
  s = structuredClone(s);
  s.tiles["1,0"].surface = "open";
  expect(compare()).toBeNull();
});

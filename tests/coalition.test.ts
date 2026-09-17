import { expect, it } from "vitest";
import {
  chooseAIAction,
  coalitionTrade,
  economyProjects,
  shouldAcceptTrade,
} from "../src/game/ai";
import {
  dominance,
  coalitionSupport,
  warTarget,
  leaderPressure,
} from "../src/game/ai-strategy";
import { ownTowns, inventory, expeditionSites } from "../src/game/selectors";
import { funded, piece, run } from "./helpers";
import { landAtVertex } from "../src/game/world";

export function coalitionFixture(leaderUnits = 100) {
  const s = funded("coalition-fixture");
  for (const tile of Object.values(s.tiles)) {
    tile.resource = "grain";
    tile.number = 7;
    delete tile.fish;
    delete tile.whale;
  }
  const positions = ["-3,0", "3,0", "1,2", "-1,3"];
  const towns = s.players.map((p) => ownTowns(s, p.id)[0]);
  s.towns = {};
  s.routes = {};
  s.pieces = {};
  s.towers = {};
  s.sieges = {};
  for (const [i, t] of towns.entries()) {
    t.vertex = s.tiles[positions[i]].vertices[0];
    t.level = t.turnLevel = 1;
    t.wall = 0;
    t.extensions = {};
    s.towns[t.id] = t;
  }
  s.players.forEach((p) => {
    p.turns = 15;
    p.control = "standard";
  });
  for (let i = 0; i < leaderUnits; i++) piece(s, "4,0", 1, "heavy", 1);
  return s;
}

it("ignores small leads, scales sharply with dominance, and treats human and AI leaders equally", () => {
  const even = coalitionFixture(0),
    slight = coalitionFixture(2),
    strong = coalitionFixture(6),
    runaway = coalitionFixture(100);
  expect(dominance(even).severity).toBe(0);
  expect(dominance(slight).severity).toBe(0);
  expect(dominance(strong).severity).toBeGreaterThan(0);
  expect(dominance(runaway).severity).toBeGreaterThan(
    dominance(strong).severity,
  );
  expect(leaderPressure(runaway, 1)).toBeGreaterThan(4);
  const human = structuredClone(runaway);
  human.players[1].control = "human";
  expect(dominance(human)).toEqual(dominance(runaway));
});

it("suspends minor wars during a crisis and resumes self-interest when power changes", () => {
  const s = coalitionFixture();
  expect(warTarget(s, 1)).toBe(true);
  expect(warTarget(s, 2)).toBe(false);
  expect(coalitionSupport(s, 2)).toBeGreaterThan(0.2);
  expect(coalitionSupport(s, 1)).toBe(0);
  const shifted = structuredClone(s);
  shifted.pieces = {};
  expect(warTarget(shifted, 2)).toBe(true);
  expect(coalitionSupport(shifted, 2)).toBe(0);
  const changed = structuredClone(shifted);
  for (let i = 0; i < 100; i++) piece(changed, "0,4", 2, "heavy", 1);
  expect(dominance(changed).leader).toBe(2);
  expect(warTarget(changed, 2)).toBe(true);
  expect(warTarget(changed, 1)).toBe(false);
});

it("still defends itself against a smaller faction's nearby army", () => {
  const s = coalitionFixture();
  piece(s, landAtVertex(s, ownTowns(s)[0].vertex)[0], 2, "heavy", 1);
  expect(warTarget(s, 2)).toBe(true);
  expect(coalitionSupport(s, 2)).toBe(0);
});

it("offers bounded favorable supplies for a weak frontline faction's military needs", () => {
  const s = coalitionFixture();
  for (const t of Object.values(s.towns)) t.stock = {};
  ownTowns(s, 0)[0].stock = {
    wool: 15,
    grain: 20,
    hides: 20,
    ore: 20,
    lumber: 20,
    salt: 20,
    stone: 20,
  };
  ownTowns(s, 2)[0].stock = { grain: 1, ore: 1, stone: 10 };
  for (let i = 0; i < 8; i++) piece(s, "-3,0", 0, "heavy", 1);
  for (const unit of Object.values(s.pieces))
    if (unit.owner === 0) unit.acted = true;
  const aid = coalitionTrade(s);
  expect(aid).not.toBeNull();
  expect(aid!.partner).toBe(2);
  expect(chooseAIAction(s)).toMatchObject({ type: "offer-trade", partner: 2 });
  const offered = run(s, aid!);
  expect(shouldAcceptTrade(offered)).toBe(true);
  expect(coalitionTrade(offered)).toBeNull();
  const accepted = run(offered, {
    type: "respond-trade",
    actor: 2,
    mode: "accept",
  });
  expect(coalitionTrade(accepted)).toBeNull();
  expect(inventory(accepted, 0)).not.toEqual(inventory(s, 0));
});

it("avoids raiding a weak neighbor when the dominant faction is the survival threat", () => {
  const s = coalitionFixture();
  s.phase = "military";
  const weak = ownTowns(s, 2)[0];
  piece(s, landAtVertex(s, weak.vertex)[0], 0, "cavalry", 2);
  const action = chooseAIAction(s);
  expect(action.type === "siege" && action.town === weak.id).toBe(false);
  expect(action.type === "destroy-town" && action.town === weak.id).toBe(false);
});

it("considers all paid expedition tiers and their true costs when frontier exploration is due", () => {
  const s = coalitionFixture(10);
  const town = ownTowns(s)[0];
  town.vertex = Object.values(s.vertices).find((v) => v.tiles.length === 1)!.id;
  s.players[0].turns = 18;
  expect(expeditionSites(s, "land")).toContain(town.vertex);
  const projects = economyProjects(s).filter(
    (p) => p.action.type === "expedition",
  );
  expect(new Set(projects.map((p) => p.action.tier))).toEqual(
    new Set([1, 2, 3]),
  );
  for (const project of projects) {
    expect(
      Object.values(project.cost).reduce((a, b) => a + b!, 0),
    ).toBeGreaterThan(0);
    expect(run(s, project.action).tiles).not.toEqual(s.tiles);
  }
});

it("uses a cheap detachment to disrupt a dominant town instead of attacking its unbeatable army", () => {
  const s = coalitionFixture();
  s.phase = "military";
  const target = ownTowns(s, 1)[0];
  target.vertex = s.tiles["2,0"].vertices[0];
  for (const u of Object.values(s.pieces)) u.tile = "2,1";
  const scout = piece(s, "0,0", 0, "cavalry", 1);
  const action = chooseAIAction(s);
  expect(action.type).toBe("move");
  expect(action.ids).toContain(scout.id);
  expect(action.to).not.toBe("2,1");
  expect(landAtVertex(s, target.vertex)).toContain(action.to);
});

it("destroys a dominant faction's resource camp despite a stronger army on a different tile", () => {
  const s = coalitionFixture();
  s.phase = "military";
  const tile = "2,0";
  const edge = s.tiles[tile].edges[0];
  s.routes[edge] = {
    id: "test-road",
    edge,
    kind: "road",
    owner: 1,
    born: 0,
    camps: { [tile]: 2 },
  };
  piece(s, tile, 0, "light", 1);
  const action = chooseAIAction(s);
  expect(action).toMatchObject({ type: "destroy-route", edge });
  expect(run(s, action).routes[edge]).toBeUndefined();
});

it("will not let a favorable incoming offer drain a coalition donor", () => {
  const s = coalitionFixture();
  for (const t of Object.values(s.towns)) t.stock = {};
  ownTowns(s, 0)[0].stock = { wool: 10 };
  ownTowns(s, 2)[0].stock = { stone: 10 };
  s.active = 2;
  s.trade = { from: 2, to: 0, give: { stone: 2 }, take: { wool: 6 } };
  expect(shouldAcceptTrade(s)).toBe(false);
});

it("routine exploration waits longer, while already funded expeditions remain usable immediately", () => {
  const s = coalitionFixture(10);
  const town = ownTowns(s)[0];
  town.vertex = Object.values(s.vertices).find((v) => v.tiles.length === 1)!.id;
  s.players[0].turns = 10;
  expect(
    economyProjects(s).filter((p) => p.action.type === "expedition"),
  ).toHaveLength(0);
  s.players[0].bonuses.expedition = true;
  s.players[0].bonuses.expeditionTier = 1;
  const free = economyProjects(s).find((p) => p.action.type === "expedition")!;
  expect(free.cost).toEqual({});
  expect(run(s, free.action).tiles).not.toEqual(s.tiles);
});
it("repeat research purchases are less attractive but remain legal and available to the planner", () => {
  const s = coalitionFixture(0);
  const before = economyProjects(s);
  s.players[0].researchBought = true;
  const after = economyProjects(s);
  for (const project of before.filter(
    (p) => p.action.type === "buy-research",
  )) {
    const next = after.find(
      (p) =>
        p.action.type === "buy-research" &&
        p.action.tier === project.action.tier,
    )!;
    expect(next.score).toBeGreaterThan(0);
    expect(next.score).toBeLessThan(project.score);
    expect(run(s, next.action).researchChoice).toHaveLength(2);
  }
  const construction = before.find((p) => p.action.type === "city")!;
  expect(
    after.find(
      (p) => JSON.stringify(p.action) === JSON.stringify(construction.action),
    )!.score,
  ).toBe(construction.score);
});

import { describe, it, expect } from "vitest";
import { funded, piece, run } from "./helpers";
import { chooseAIAction, shouldAcceptTrade } from "../src/game/ai";
import {
  factionStrengths,
  leaderPressure,
  townThreats,
  threatPower,
  leavesTownExposed,
} from "../src/game/ai-strategy";
import {
  ownTowns,
  inventory,
  power,
  researchCount,
} from "../src/game/selectors";
import { landAtVertex, neighbors } from "../src/game/world";
import type { Game } from "../src/game/types";

function strategyFixture() {
  const s = funded();
  s.players[0].turns = 4;
  s.players[0].control = "standard";
  return s;
}
function battlefield() {
  const s = strategyFixture();
  s.phase = "military";
  for (const t of Object.values(s.tiles)) {
    t.resource = "grain";
    delete t.fish;
  }
  const home = ownTowns(s)[0];
  home.vertex = s.tiles["0,0"].vertices[0];
  return { s, home, tiles: landAtVertex(s, home.vertex) };
}
describe("proactive and selfish AI strategy", () => {
  it("recruits in peace by turn four instead of spending everything on cities", () => {
    const s = strategyFixture();
    expect(chooseAIAction(s).type).toBe("recruit");
    expect(Object.keys(s.pieces)).toHaveLength(0);
    expect(run(s, chooseAIAction(s)).pieces).not.toEqual({});
  });
  it("buys a missing recruitment input before unrelated economic development", () => {
    const s = strategyFixture();
    for (const t of Object.values(s.towns)) t.stock = {};
    ownTowns(s)[0].stock = { lumber: 20, wool: 1, hides: 1 };
    const action = chooseAIAction(s);
    expect(action.type).toBe("bank");
    expect(action.take).toEqual({ grain: 1 });
    expect(chooseAIAction(run(s, action)).type).toBe("recruit");
  });
  it("can develop the economy once the minimum guard is funded", () => {
    let s = strategyFixture();
    for (const t of ownTowns(s)) t.level = t.turnLevel = 1;
    s = run(s, chooseAIAction(s));
    s = run(s, chooseAIAction(s));
    s = run(s, chooseAIAction(s));
    expect(Object.values(s.pieces)).toHaveLength(3);
    expect(chooseAIAction(s).type).not.toBe("military");
    expect(chooseAIAction(s).type).not.toBe("recruit");
  });
  it("does not invent a land threat across water", () => {
    const { s, home, tiles } = battlefield();
    for (const t of Object.values(s.tiles)) t.resource = "water";
    for (const id of tiles) s.tiles[id].resource = "grain";
    const island = Object.keys(s.tiles).find(
      (id) =>
        !tiles.includes(id) && !tiles.some((t) => neighbors(t).includes(id)),
    )!;
    s.tiles[island].resource = "grain";
    piece(s, island, 1, "heavy", 3);
    expect(townThreats(s, home)).toEqual([]);
  });
  it("holds a threatened town but allows a sortie that eliminates the threat", () => {
    const { s, home, tiles } = battlefield();
    const origin = tiles[0],
      enemyTile = neighbors(origin).find(
        (id) => s.tiles[id] && !tiles.includes(id),
      )!;
    const guard = piece(s, origin, 0, "heavy", 3),
      enemy = piece(s, enemyTile, 1, "light", 1);
    expect(townThreats(s, home)).toContain(enemy);
    expect(leavesTownExposed(s, [guard], enemyTile)).toBe(true);
    expect(leavesTownExposed(s, [guard], enemyTile, [enemy.id])).toBe(false);
    const action = chooseAIAction(s);
    expect(action).toMatchObject({ type: "move", to: enemyTile });
  });
  it("applies terrain bonuses and never combines different rival factions into one threat", () => {
    const { s, tiles } = battlefield();
    const a = piece(s, tiles[0], 1, "cavalry", 2),
      b = piece(s, tiles[1], 2, "heavy", 3);
    expect(threatPower(s, [a, b], [tiles[0]])).toBe(4);
    expect(power(s, [a, b], tiles[0])).toBe(7);
  });
  it("pressures only a clear leader, changes sides as the board changes, and ignores hidden cards", () => {
    const s = strategyFixture();
    // Equal public boards do not create an arbitrary anti-human coalition.
    for (const t of Object.values(s.towns)) {
      t.level = 1;
      t.extensions = {};
      t.wall = 0;
    }
    for (const t of ownTowns(s, 1)) {
      t.level = 4;
      for (const id of landAtVertex(s, t.vertex)) t.extensions[id] = 3;
    }
    expect(leaderPressure(s, 1)).toBeGreaterThan(1);
    expect(leaderPressure(s, 0)).toBe(1);
    expect(leaderPressure(s, 2)).toBe(1);
    const hidden = structuredClone(s);
    ownTowns(hidden, 2)[0].stock = { steel: 10000 };
    hidden.players[2].hand = Array(20).fill({
      id: "private",
      kind: "muster",
      tier: 3,
      bought: 1,
    });
    expect(factionStrengths(hidden)).toEqual(factionStrengths(s));
    const reversed = structuredClone(s);
    for (const t of ownTowns(reversed, 1)) {
      t.level = 1;
      t.extensions = {};
    }
    for (let i = 0; i < 50; i++)
      piece(
        reversed,
        landAtVertex(reversed, ownTowns(reversed, 2)[0].vertex)[0],
        2,
        "heavy",
        3,
      );
    expect(leaderPressure(reversed, 1)).toBe(1);
    expect(leaderPressure(reversed, 2)).toBeGreaterThan(1);
  });
  it("requires a better offer from a runaway leader, but still accepts a worthwhile deal", () => {
    const s = strategyFixture();
    // This offer tests Grain demand without an interchangeable Fish surplus.
    for (const town of Object.values(s.towns)) delete town.stock.fish;
    for (const t of ownTowns(s, 1)) {
      t.level = 4;
      for (const id of landAtVertex(s, t.vertex)) t.extensions[id] = 3;
    }
    s.trade = { from: 2, to: 0, give: { grain: 5 }, take: { wool: 4 } };
    expect(shouldAcceptTrade(s)).toBe(true);
    s.trade.from = 1;
    expect(shouldAcceptTrade(s)).toBe(false);
    s.trade.give = { grain: 10 };
    expect(shouldAcceptTrade(s)).toBe(true);
    s.trade.give = { grain: 1 };
    expect(shouldAcceptTrade(s)).toBe(false);
  });
});
it("counts a research purchase once while choosing and after keeping a card", () => {
  let s = funded();
  expect(researchCount(s, 0)).toBe(0);
  s = run(s, { type: "buy-research", tier: 1 });
  expect(s.researchChoice).toHaveLength(2);
  expect(researchCount(s, 0)).toBe(1);
  s = run(s, { type: "choose-research", index: 0 });
  expect(researchCount(s, 0)).toBe(1);
});

it("redirects a feasible attack when a different rival becomes the clear leader", () => {
  const base = battlefield().s;
  const home = ownTowns(base, 0)[0],
    east = ownTowns(base, 1)[0],
    south = ownTowns(base, 2)[0];
  home.vertex = base.tiles["-3,0"].vertices[0];
  east.vertex = base.tiles["3,0"].vertices[0];
  south.vertex = base.tiles["0,3"].vertices[0];
  base.towns = { [home.id]: home, [east.id]: east, [south.id]: south };
  base.routes = {};
  base.players[3].alive = false;
  piece(base, "0,0", 0, "cavalry", 3);
  for (const leader of [1, 2]) {
    const s = structuredClone(base),
      target = ownTowns(s, leader)[0];
    target.level = 4;
    for (const id of landAtVertex(s, target.vertex)) target.extensions[id] = 3;
    const action = chooseAIAction(s);
    expect(action.type).toBe("move");
    expect(landAtVertex(s, target.vertex)).toContain(action.to);
  }
});

it("sends surplus troops out while retaining enough town guards", () => {
  const { s, tiles } = battlefield();
  const origin = tiles[0],
    enemyTile = neighbors(origin).find(
      (id) => s.tiles[id] && !tiles.includes(id),
    )!;
  for (let i = 0; i < 8; i++) piece(s, origin, 0, "heavy", 1);
  piece(s, enemyTile, 1, "heavy", 1);
  const group = Object.values(s.pieces).filter((u) => u.owner === 0);
  expect(leavesTownExposed(s, group)).toBe(true);
  expect(leavesTownExposed(s, group.slice(0, 7))).toBe(false);
  const action = chooseAIAction(s);
  expect(action.type).toBe("move");
  // A full-force sortie is also correct when it destroys the sole nearby threat.
  expect(action.to).toBe(enemyTile);
});

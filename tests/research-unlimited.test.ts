import { it, expect } from "vitest";
import { CARDS, COSTS, RESEARCH_NAMES } from "../src/game/content";
import { applyCommand } from "../src/game/engine";
import {
  chooseAIAction,
  economyProjects,
  researchAction,
} from "../src/game/ai";
import { inventory, ownTowns, routeSites } from "../src/game/selectors";
import { assertInvariants, deserialize, serialize } from "../src/game/save";
import type { Game, Stock } from "../src/game/types";
import { fishingFixture, maritimeFixture } from "./maritime-fixture";
import { run, piece } from "./helpers";
function cards(s: Game, kinds: string[]) {
  s.players[s.active].hand = kinds.map((kind) => ({
    id: `c${s.nextId++}`,
    kind,
    tier: CARDS[kind].tier,
    bought: 0,
  }));
}
function play(s: Game, goods?: Stock) {
  return run(s, {
    type: "play-research",
    card: s.players[s.active].hand[0].id,
    goods,
  });
}
it("buys twelve discoveries across all tiers in one turn, paying every time and allowing immediate play", () => {
  let { s } = fishingFixture();
  const before = inventory(s),
    costs: Stock = {};
  for (let i = 0; i < 12; i++) {
    const tier = (i % 4) + 1;
    s = run(s, { type: "buy-research", tier });
    expect(s.researchChoice).toHaveLength(2);
    expect(s.researchChoice![0].kind).not.toBe(s.researchChoice![1].kind);
    expect(applyCommand(s, { type: "buy-research", tier }).ok).toBe(false);
    s = run(s, { type: "choose-research", index: 0 });
    expect(s.players[0].hand).toHaveLength(i + 1);
    for (const [g, n] of Object.entries(
      COSTS[`Research ${RESEARCH_NAMES[tier]}`],
    ))
      costs[g as keyof Stock] = (costs[g as keyof Stock] ?? 0) + n!;
  }
  for (const g of Object.keys(before) as (keyof Stock)[])
    expect(inventory(s)[g]).toBe(before[g]! - (costs[g] ?? 0));
  const immediate = s.players[0].hand
    .map((card) => researchAction(s, card.id))
    .find((action) => action && applyCommand(s, action).ok);
  expect(immediate).toBeTruthy();
  s = run(s, immediate!);
  expect(s.players[0].hand).toHaveLength(11);
  expect(deserialize(serialize(s))).toEqual(s);
});
it("plays multiple eligible cards before and after rolling, including from a save marked already played", () => {
  let { s } = fishingFixture();
  s.phase = "roll";
  s.players[0].researchPlayed = true;
  cards(s, ["palisade", "palisade", "palisade", "palisade"]);
  const before = inventory(s);
  s = play(s);
  s = play(s);
  expect(inventory(s).lumber).toBe(before.lumber! + 4);
  s = run(s, { type: "roll" });
  const afterRoll = inventory(s);
  s = play(s);
  s = play(s);
  expect(inventory(s).lumber).toBe(afterRoll.lumber! + 4);
  expect(s.players[0].hand).toHaveLength(0);
  assertInvariants(s);
});
it("accumulates route and recruitment rewards, saves them, and expires leftovers at turn end", () => {
  let { s } = fishingFixture();
  cards(s, ["roads", "roads", "roads", "levy", "mobilization"]);
  for (let i = 0; i < 5; i++) s = play(s);
  expect(s.players[0].bonuses.routes).toBe(9);
  expect(s.players[0].bonuses.recruits).toHaveLength(6);
  s = deserialize(serialize(s));
  assertInvariants(s);
  const edge = routeSites(s, "road")[0];
  const before = inventory(s);
  s = run(s, { type: "road", edge });
  expect(inventory(s)).toEqual(before);
  expect(s.players[0].bonuses.routes).toBe(8);
  s = run(s, { type: "end-turn" });
  // Bonuses are reset when the owner begins their next turn.
  while (s.active !== 0) {
    if (s.phase === "roll") s = run(s, { type: "roll" });
    s = run(s, { type: "end-turn" });
  }
  expect(s.players[0].bonuses.routes).toBe(0);
  expect(s.players[0].bonuses.recruits).toHaveLength(0);
});
it("keeps mixed-tier ship commissions separate, including existing legacy grants", () => {
  let { s, home, water } = fishingFixture();
  s.players[0].bonuses.ships = [["merchantship"]];
  s.players[0].bonuses.shipTier = 1;
  cards(s, ["patrol"]);
  s = play(s);
  s = deserialize(serialize(s));
  expect(s.players[0].bonuses.shipTiers).toEqual([1, 2]);
  const before = inventory(s);
  s = run(s, {
    type: "ship",
    town: home.id,
    tile: water,
    kind: "merchantship",
    tier: 2,
  });
  expect(s.players[0].bonuses.shipTiers).toEqual([1]);
  s = run(s, {
    type: "ship",
    town: home.id,
    tile: water,
    kind: "merchantship",
    tier: 1,
  });
  expect(inventory(s)).toEqual(before);
  expect(s.players[0].bonuses.ships).toHaveLength(0);
  expect(s.players[0].bonuses.shipTiers).toHaveLength(0);
  assertInvariants(s);
});
it("queues independent discounts and consumes the first matching grant without losing other kinds", () => {
  let { s, home, water } = fishingFixture();
  home.wall = 1;
  cards(s, ["workshops", "civic", "industry"]);
  s = play(s);
  s = play(s);
  s = play(s);
  s = deserialize(serialize(s));
  expect(s.players[0].bonuses.discounts).toHaveLength(2);
  s = run(s, { type: "wall", town: home.id });
  expect(s.players[0].bonuses.discount?.kind).toBe("industry");
  expect(s.players[0].bonuses.discounts).toHaveLength(1);
  s = run(s, { type: "extension", town: home.id, tile: water });
  expect(s.players[0].bonuses.discount?.raw).toBe(6);
  s = run(s, { type: "extension", town: home.id, tile: water });
  expect(s.players[0].bonuses.discount).toBeUndefined();
  expect(s.players[0].bonuses.discounts).toHaveLength(0);
  assertInvariants(s);
});
it("AI can play successive cards and plan another purchase after buying", () => {
  let { s } = fishingFixture();
  cards(s, ["palisade", "palisade"]);
  s.players[0].researchBought = true;
  s.players[0].researchPlayed = true;
  for (let i = 0; i < 2; i++) {
    const command = chooseAIAction(s);
    expect(command.type).toBe("play-research");
    s = run(s, command);
  }
  expect(economyProjects(s).some((p) => p.action.type === "buy-research")).toBe(
    true,
  );
});
it("retains expedition limits without silently replacing an already funded expedition", () => {
  let { s } = fishingFixture();
  const frontier = Object.values(s.vertices).find(
    (v) =>
      v.tiles.length < 3 &&
      v.tiles.some((id) => s.tiles[id].resource !== "water"),
  )!;
  ownTowns(s)[0].vertex = frontier.id;
  cards(s, ["survey", "survey"]);
  s = play(s);
  const result = applyCommand(s, {
    type: "play-research",
    card: s.players[0].hand[0].id,
  });
  expect(result.ok).toBe(false);
  expect(result.state).toEqual(s);
  expect(s.players[0].hand).toHaveLength(1);
});

it("stacked movement cards and long movement survive saving without old one-card caps", () => {
  let { s } = maritimeFixture();
  const unit = piece(s, "0,0", 0, "cavalry");
  cards(s, ["march", "march", "march", "march"]);
  for (let i = 0; i < 4; i++)
    s = run(s, {
      type: "play-research",
      card: s.players[0].hand[0].id,
      ids: [unit.id],
    });
  expect(s.pieces[unit.id].bonus).toBe(12);
  s = deserialize(serialize(s));
  for (let i = 0; i < 12; i++)
    s = run(s, { type: "move", ids: [unit.id], to: i % 2 ? "0,0" : "1,0" });
  expect(s.pieces[unit.id].moved).toBe(12);
  expect(deserialize(serialize(s))).toEqual(s);
});

it("AI finishes its research investment while further purchases remain legal", () => {
  let { s } = fishingFixture();
  s.players[0].researchPurchases = 6;
  expect(economyProjects(s).some((p) => p.action.type === "buy-research")).toBe(
    false,
  );
  s = run(s, { type: "buy-research", tier: 1 });
  expect(s.players[0].researchPurchases).toBe(7);
  expect(s.researchChoice).toHaveLength(2);
});

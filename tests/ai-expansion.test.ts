import { legacyGame } from "./helpers";
import { describe, expect, it } from "vitest";
import {
  aiExpeditionAllowed,
  isCornered,
  strongestAI,
} from "../src/game/ai-expansion";
import {
  economyProjects,
  researchUtility,
  chooseAIAction,
} from "../src/game/ai";
import { applyCommand } from "../src/game/engine";
import { CARDS, REALM_NAMES, RESEARCH_EXPEDITIONS } from "../src/game/content";
import {
  expeditionSites,
  ownTowns,
  routeKind,
  settlementSites,
} from "../src/game/selectors";
import { distance, landAtVertex } from "../src/game/world";
import { funded, piece, run } from "./helpers";
import type { Game } from "../src/game/types";

function frontier() {
  const s = funded("expedition-restriction");
  for (const tile of Object.values(s.tiles)) {
    tile.resource = "grain";
    tile.number = 7;
    delete tile.fish;
  }
  s.players[0].control = "standard";
  s.players[0].turns = 18;
  const home = ownTowns(s)[0];
  home.level = home.turnLevel = 4;
  home.vertex = Object.values(s.vertices).find((v) => v.tiles.length === 1)!.id;
  for (let n = 0; n < 3; n++)
    piece(s, s.vertices[home.vertex].tiles[0], 0, "heavy", 4);
  return { s, home };
}
function sealNetwork(s: Game) {
  const home = ownTowns(s)[0];
  for (const town of ownTowns(s).slice(1)) delete s.towns[town.id];
  s.routes = {};
  for (const edge of s.vertices[home.vertex].edges)
    s.routes[edge] = {
      id: `r${s.nextId++}`,
      born: 0,
      edge,
      owner: 1,
      kind: routeKind(s, edge),
      camps: {},
    };
}

describe("expeditions for the strongest AI factions", () => {
  it("funds resource exploration between the former scheduled turns and actually reveals land", () => {
    let { s } = frontier();
    // Give another AI the lead, away from our frontier so there is no emergency.
    for (let i = 0; i < 30; i++) piece(s, "0,0", 1, "heavy", 4);
    s.players[0].turns = 7;
    expect(aiExpeditionAllowed(s)).toBe(true);
    expect(economyProjects(s).some((p) => p.action.type === "expedition")).toBe(
      true,
    );
    const before = Object.keys(s.tiles).length;
    const actions: string[] = [];
    for (let step = 0; step < 40; step++) {
      const action = chooseAIAction(s);
      actions.push(action.type);
      if (action.type === "end-turn") break;
      s = run(s, action);
      if (action.type === "expedition") break;
    }
    expect(actions).toContain("expedition");
    expect(Object.keys(s.tiles).length).toBeGreaterThan(before);
    expect(s.players[0].expeditionUsed).toBe(true);
    expect(economyProjects(s).some((p) => p.action.type === "expedition")).toBe(
      false,
    );
  });
  it("excludes humans and eliminated factions, resolves ties consistently, and restricts only the leading AI seat", () => {
    const s = legacyGame(
      "rank-expedition",
      REALM_NAMES.map((name, id) => ({
        name,
        control: id === 0 ? "human" : "standard",
      })),
    );
    // During setup all public scores tie, so seat IDs are the stable tie-breaker.
    expect(strongestAI(s)).toEqual([1, 2]);
    const next = structuredClone(s);
    next.players[1].alive = false;
    expect(strongestAI(next)).toEqual([2, 3]);
    piece(next, "0,0", 0, "heavy", 4); // A strong human does not take an AI slot.
    piece(next, "0,0", 7, "heavy", 4);
    expect(strongestAI(structuredClone(next))).toEqual([7, 2]);
    expect(aiExpeditionAllowed(structuredClone(next), 2)).toBe(true);
    expect(aiExpeditionAllowed(structuredClone(next), 7)).toBe(false);
    expect(aiExpeditionAllowed(next, 6)).toBe(true);
    expect(aiExpeditionAllowed(next, 0)).toBe(true);
  });

  it.each([1, 2, 3])(
    "rejects paid tier %i expeditions from an uncornered top AI without spending goods",
    (tier) => {
      const { s, home } = frontier();
      expect(strongestAI(s)).toContain(0);
      expect(isCornered(s)).toBe(false);
      expect(expeditionSites(s, "land")).toContain(home.vertex);
      const before = structuredClone(s);
      const result = applyCommand(s, {
        type: "expedition",
        kind: "land",
        vertex: home.vertex,
        tier,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/strongest AI/);
      expect(result.state).toBe(s);
      expect(s).toEqual(before);
      expect(
        economyProjects(s).some((p) => p.action.type === "expedition"),
      ).toBe(false);
      expect(
        economyProjects(s).some((p) => /productive settlement/.test(p.label)),
      ).toBe(true);
    },
  );

  it("applies the same ban to sea launches while preserving human sea exploration", () => {
    const { s, home } = frontier();
    home.vertex = Object.values(s.vertices).find(
      (v) => v.tiles.length === 2,
    )!.id;
    s.tiles[s.vertices[home.vertex].tiles[0]].resource = "water";
    expect(expeditionSites(s, "sea")).toContain(home.vertex);
    expect(isCornered(s)).toBe(false);
    expect(strongestAI(s)).toContain(0);
    const command = {
      type: "expedition",
      kind: "sea",
      vertex: home.vertex,
      tier: 1,
    } as const;
    expect(applyCommand(s, command).ok).toBe(false);
    const human = structuredClone(s);
    human.players[0].control = "human";
    expect(Object.keys(run(human, command).tiles)).toHaveLength(
      Object.keys(s.tiles).length + 10,
    );
  });
  it("does not permit free grants or expedition cards to bypass the restriction", () => {
    const { s, home } = frontier();
    s.players[0].bonuses.expedition = true;
    s.players[0].bonuses.expeditionTier = 3;
    expect(economyProjects(s).some((p) => p.action.type === "expedition")).toBe(
      false,
    );
    expect(
      applyCommand(s, {
        type: "expedition",
        kind: "land",
        vertex: home.vertex,
        tier: 3,
      }).ok,
    ).toBe(false);
    for (const kind of Object.keys(RESEARCH_EXPEDITIONS)) {
      const cardState = structuredClone(s);
      cardState.players[0].bonuses.expedition = false;
      const card = {
        id: `c${cardState.nextId++}`,
        kind,
        tier: CARDS[kind].tier,
        bought: 0,
      };
      cardState.players[0].hand = [card];
      expect(researchUtility(cardState, kind)).toBe(0);
      const result = applyCommand(cardState, {
        type: "play-research",
        card: card.id,
      });
      expect(result.ok).toBe(false);
      expect(result.state.players[0].hand).toHaveLength(1);
    }
  });

  it("keeps expeditions legal for a human and for an AI below the leader", () => {
    const { s, home } = frontier();
    const human = structuredClone(s);
    human.players[0].control = "human";
    expect(
      run(human, {
        type: "expedition",
        kind: "land",
        vertex: home.vertex,
        tier: 1,
      }).tiles,
    ).not.toEqual(s.tiles);
    for (let owner = 1; owner < 4; owner++)
      for (let n = 0; n < 20; n++)
        piece(
          s,
          landAtVertex(s, ownTowns(s, owner)[0].vertex)[0],
          owner,
          "heavy",
          4,
        );
    expect(strongestAI(s)).not.toContain(0);
    expect(
      economyProjects(s).filter((p) => p.action.type === "expedition"),
    ).toHaveLength(3);
    expect(
      run(s, { type: "expedition", kind: "land", vertex: home.vertex, tier: 1 })
        .tiles,
    ).not.toEqual(s.tiles);
  });

  it("never lets the strongest AI bypass its expedition embargo by being cornered", () => {
    const { s, home } = frontier();
    sealNetwork(s);
    expect(isCornered(s)).toBe(true);
    expect(aiExpeditionAllowed(s)).toBe(false);
    expect(economyProjects(s).some((p) => p.action.type === "expedition")).toBe(
      false,
    );
    expect(
      applyCommand(s, {
        type: "expedition",
        kind: "land",
        vertex: home.vertex,
        tier: 1,
      }).ok,
    ).toBe(false);
  });

  it("allows a cornered AI to play and redeem an expedition card", () => {
    let { s, home } = frontier();
    sealNetwork(s);
    for (let i = 0; i < 30; i++) piece(s, "0,0", 1, "heavy", 4);
    const card = { id: `c${s.nextId++}`, kind: "survey", tier: 1, bought: 0 };
    s.players[0].hand = [card];
    expect(researchUtility(s, card.kind)).toBeGreaterThan(0);
    s = run(s, { type: "play-research", card: card.id });
    expect(
      economyProjects(s).find((p) => p.action.type === "expedition")?.cost,
    ).toEqual({});
    expect(
      run(s, { type: "expedition", kind: "land", vertex: home.vertex, tier: 1 })
        .players[0].bonuses.expedition,
    ).toBe(false);
  });

  it("prioritizes a cornered faction's escape from turn three, even without an army", () => {
    const { s } = frontier();
    sealNetwork(s);
    s.pieces = {};
    s.players[0].turns = 3;
    expect(isCornered(s)).toBe(true);
    const projects = economyProjects(s).filter(
      (p) => p.action.type === "expedition",
    );
    expect(projects).toHaveLength(3);
    expect(projects.find((p) => p.action.tier === 1)!.score).toBeGreaterThan(
      30,
    );
  });
  it("makes expeditions available earlier to smaller factions with resource shortages", () => {
    const { s } = frontier();
    for (let owner = 1; owner <= 2; owner++)
      for (let n = 0; n < 30; n++)
        piece(
          s,
          landAtVertex(s, ownTowns(s, owner)[0].vertex)[0],
          owner,
          "heavy",
          4,
        );
    s.players[0].turns = 6;
    expect(isCornered(s)).toBe(false);
    expect(strongestAI(s)).toEqual([1, 2]);
    expect(aiExpeditionAllowed(s)).toBe(true);
    const projects = economyProjects(s).filter(
      (p) => p.action.type === "expedition",
    );
    expect(projects).toHaveLength(3);
    expect(projects[0].score).toBeGreaterThan(15);
  });

  it("does not mistake a distant island or empty stockpile for being cornered", () => {
    const { s, home } = frontier();
    for (const t of Object.values(s.tiles)) t.resource = "water";
    s.routes = {};
    s.towns = { [home.id]: home };
    const origin = s.vertices[home.vertex].tiles[0];
    s.tiles[origin].resource = "grain";
    // Occupy every vertex on the starting island with a hostile tower except home.
    for (const v of s.tiles[origin].vertices)
      if (v !== home.vertex)
        s.towers[v] = { id: `w${s.nextId++}`, vertex: v, owner: 1, tier: 1 };
    const far = Object.keys(s.tiles).sort(
      (a, b) => distance(b, origin) - distance(a, origin),
    )[0];
    s.tiles[far].resource = "grain";
    home.stock = {};
    expect(distance(origin, far)).toBeGreaterThan(5);
    // The tower ring really seals the island.
    expect(isCornered(s)).toBe(true);
    const opened = structuredClone(s);
    opened.towers = {};
    // Two opposite settlements occupy all legal sites on the one-hex home
    // island by the spacing rule; only the distant island remains available.
    const vertices = opened.tiles[origin].vertices;
    const opposite = vertices[(vertices.indexOf(home.vertex) + 3) % 6];
    const mate = {
      ...structuredClone(home),
      id: `t${opened.nextId++}`,
      vertex: opposite,
    };
    opened.towns[mate.id] = mate;
    expect(
      settlementSites(opened, 0, true).every((v) =>
        opened.vertices[v].tiles.includes(far),
      ),
    ).toBe(true);
    expect(isCornered(opened)).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import { chooseAIAction, economyProjects } from "../src/game/ai";
import {
  dominanceSeverity,
  dominance,
  warTarget,
  leaderPressure,
  conquestDrive,
} from "../src/game/ai-strategy";
import { ownTowns, pathTo, power, inventory } from "../src/game/selectors";
import { landAtVertex } from "../src/game/world";
import { funded, piece, run, nextOwnerTurn } from "./helpers";
import type { Game, Command } from "../src/game/types";
import { assertInvariants } from "../src/game/save";

function front() {
  const s = funded("leader-pressure");
  s.phase = "military";
  s.routes = {};
  s.pieces = {};
  s.towers = {};
  s.sieges = {};
  s.towerSieges = {};
  for (const tile of Object.values(s.tiles)) {
    tile.resource = "water";
    tile.number = 7;
    delete tile.fish;
    delete tile.whale;
  }
  for (let q = -3; q <= 4; q++) s.tiles[`${q},0`].resource = "grain";
  s.tiles["-3,3"].resource = s.tiles["-1,4"].resource = "grain";
  const towns = s.players.map((p) => ownTowns(s, p.id)[0]);
  s.towns = {};
  const positions = ["-3,0", "1,0", "-3,3", "-1,4"];
  for (const [i, t] of towns.entries()) {
    t.vertex = s.tiles[positions[i]].vertices[0];
    t.stock = {};
    t.level = t.turnLevel = 1;
    t.extensions = {};
    t.wall = 0;
    delete t.guild;
    s.towns[t.id] = t;
    s.players[i].control = "standard";
    s.players[i].turns = 15;
    s.players[i].hand = [];
  }
  const rear = {
    ...structuredClone(towns[1]),
    id: `t${s.nextId++}`,
    name: "Rear port",
    vertex: s.tiles["4,0"].vertices[0],
    stock: { hides: 12 },
  };
  s.towns[rear.id] = rear;
  for (let i = 0; i < 12; i++) piece(s, "1,0", 1, "heavy", 4);
  return { s, home: towns[0], fortress: towns[1], rear };
}
function campaign(state: Game, turns = 15) {
  let s = state;
  const history: Command[] = [];
  for (let turn = 0; turn < turns; turn++) {
    if (turn) {
      nextOwnerTurn(s);
      s.phase = "military";
    }
    for (let i = 0; i < 35; i++) {
      const c = chooseAIAction(s);
      if (c.type === "end-turn") break;
      history.push(c);
      const stored = c.town ? (s.towns[c.town]?.stock.hides ?? 0) : 0;
      s = run(s, c);
      if (
        c.type === "siege" &&
        stored === 12 &&
        s.sieges[`${s.active}:${c.town}`]?.raided != null
      )
        return { s, history };
      if (s.phase === "finished") return { s, history };
      if (i === 34) throw new Error("AI did not finish its military turn");
    }
  }
  assertInvariants(s);
  return { s, history };
}

describe("decisive, faction-neutral opposition to a leader", () => {
  it("increases offensive commitment through mid and late game without changing resources", () => {
    const { s } = front();
    const stocks = structuredClone(s.towns);
    const early = structuredClone(s),
      late = structuredClone(s);
    early.players[0].turns = 5;
    late.players[0].turns = 40;
    expect(conquestDrive(s)).toBeGreaterThan(conquestDrive(early));
    expect(conquestDrive(late)).toBeGreaterThan(conquestDrive(s));
    expect(s.towns).toEqual(stocks);
  });
  it.each(["human", "standard"] as const)(
    "abandons a stalled blockade, boards a distant ship and raids the %s leader's rear",
    (control) => {
      const { s, fortress, rear } = front();
      s.players[1].control = control;
      s.tiles["1,-1"].resource = "grain";
      fortress.vertex = s.tiles["0,0"].vertices[1];
      fortress.level = fortress.turnLevel = 4;
      for (const u of Object.values(s.pieces)) u.tile = "1,-1";
      // Two guarded bottlenecks and two lucrative blockade tiles, but an
      // exposed rear port. The raider must first walk back to embark.
      for (let i = 0; i < 12; i++) piece(s, "1,0", 1, "heavy", 4);
      const raider = piece(s, "0,0", 0, "cavalry", 2);
      piece(s, "-2,1", 0, "transport", 1);
      const { s: after, history } = campaign(s, 20);
      expect(
        history.some((c) => c.type === "load" && c.ids?.includes(raider.id)),
      ).toBe(true);
      expect(history.some((c) => c.type === "unload")).toBe(true);
      expect(
        history.some((c) => c.type === "siege" && c.town === rear.id),
      ).toBe(true);
      expect(inventory(after, 0).hides).toBe(12);
    },
  );
  it("funds warships to hunt distant valuable collectors even without a threatened home coast", () => {
    const { s, home } = front();
    s.phase = "economy";
    home.stock = { lumber: 20, wool: 20, ore: 20, coal: 20 };
    piece(s, "3,2", 1, "fishing", 4);
    const projects = economyProjects(s).filter(
      (p) =>
        p.action.type === "ship" &&
        ["galley", "carrack"].includes(p.action.kind!),
    );
    expect(projects.some((p) => p.urgent)).toBe(true);
  });
  it("treats 409 vs 248 as urgent, nearly double as critical, and small leads as ordinary rivalry", () => {
    expect(dominanceSeverity(409, 248)).toBeGreaterThan(0.75);
    expect(dominanceSeverity(409, 248)).toBeLessThan(0.85);
    expect(dominanceSeverity(480, 248)).toBe(1);
    expect(dominanceSeverity(270, 248)).toBe(0);
    expect(dominanceSeverity(30, 25)).toBe(0);
    expect(dominanceSeverity(320, 248)).toBeLessThan(
      dominanceSeverity(360, 248),
    );
  });
  it.each(["human", "standard"] as const)(
    "seeks a land detour and raids a %s leader's rear port instead of fixating on its fortress",
    (control) => {
      const { s, rear } = front();
      s.players[1].control = control;
      for (const id of ["0,1", "1,1", "2,1"]) s.tiles[id].resource = "grain";
      const raider = piece(s, "0,0", 0, "cavalry", 1);
      expect(dominance(s).leader).toBe(1);
      expect(warTarget(s, 2)).toBe(false);
      expect(leaderPressure(s, 1)).toBe(6);
      const { s: after, history } = campaign(s, 8);
      expect(
        history.some((c) => c.type === "siege" && c.town === rear.id),
      ).toBe(true);
      expect(inventory(after, 0).hides).toBe(12);
      expect(history.some((c) => c.type === "move" && c.to === "1,0")).toBe(
        false,
      );
      expect(history.some((c) => c.ids?.includes(raider.id))).toBe(true);
    },
  );
  it("embarks, sails around a choke point on the SAME island and raids behind it", () => {
    const { s, rear } = front();
    const raider = piece(s, "0,0", 0, "cavalry", 2);
    piece(s, "0,1", 0, "transport", 1);
    expect(pathTo(s, "0,0", "4,0", false, 0)).toBeNull();
    const { s: after, history } = campaign(s, 18);
    expect(history.map((c) => c.type)).toContain("load");
    expect(history.map((c) => c.type)).toContain("unload");
    expect(history.some((c) => c.type === "siege" && c.town === rear.id)).toBe(
      true,
    );
    expect(inventory(after, 0).hides).toBe(12);
    expect(
      history.some(
        (c) =>
          c.type === "move" && c.to === "1,0" && c.ids?.includes(raider.id),
      ),
    ).toBe(false);
  });
  it("bypasses the main army to defeat a smaller rear garrison on the same island", () => {
    const { s, rear } = front();
    piece(s, "4,0", 1, "heavy", 1);
    piece(s, "0,0", 0, "cavalry", 2);
    piece(s, "0,1", 0, "transport", 1);
    const { s: after, history } = campaign(s, 18);
    expect(history.some((c) => c.type === "load")).toBe(true);
    expect(history.some((c) => c.type === "unload")).toBe(true);
    expect(history.some((c) => c.type === "resolve-battle")).toBe(true);
    expect(history.some((c) => c.type === "siege" && c.town === rear.id)).toBe(
      true,
    );
    expect(inventory(after, 0).hides).toBe(12);
  });
  it("funds transport for an otherwise blocked same-island attack", () => {
    const { s, home } = front();
    s.phase = "economy";
    home.stock = { lumber: 20, wool: 10, hides: 10 };
    piece(s, "0,0", 0, "cavalry", 2);
    piece(s, "-1,0", 0, "light", 2);
    const projects = economyProjects(s).filter(
      (p) =>
        p.action.type === "ship" &&
        ["transport", "convoy"].includes(p.action.kind!),
    );
    expect(projects.some((p) => p.urgent)).toBe(true);
    let current = s;
    let built = false;
    for (let i = 0; i < 20; i++) {
      const c = chooseAIAction(current);
      current = run(current, c);
      if (c.type === "ship" && ["transport", "convoy"].includes(c.kind!)) {
        built = true;
        break;
      }
      if (c.type === "end-turn") break;
    }
    expect(built).toBe(true);
  });
  it("uses a warship to blockade a productive sea tile even without an enemy fleet", () => {
    const { s, rear } = front();
    const fish = s.vertices[rear.vertex].tiles.find(
      (id) => s.tiles[id].resource === "water",
    )!;
    s.tiles[fish].fish = true;
    const ship = piece(s, "2,1", 0, "galley", 1);
    const before = power(s, [ship], ship.tile);
    const c = chooseAIAction(s);
    expect(c.type).toBe("move");
    expect(c.ids).toContain(ship.id);
    expect(before).toBeGreaterThan(0);
    const after = run(s, c);
    nextOwnerTurn(after);
    after.phase = "military";
    const next = chooseAIAction(after);
    expect(next).toMatchObject({ type: "move", to: fish });
    expect(run(after, next).pieces[ship.id].tile).toBe(fish);
  });
  it("commissions a bounded blockade fleet when the leader has vulnerable sea production", () => {
    const { s, home, rear } = front();
    s.tiles[
      s.vertices[rear.vertex].tiles.find(
        (id) => s.tiles[id].resource === "water",
      )!
    ].fish = true;
    home.stock = { lumber: 20, ore: 20, wool: 20, coal: 20 };
    s.phase = "economy";
    const ships = economyProjects(s).filter(
      (p) =>
        p.action.type === "ship" &&
        ["galley", "carrack"].includes(p.action.kind!),
    );
    expect(ships.length).toBeGreaterThan(0);
    for (let i = 0; i < 4; i++) piece(s, "-2,1", 0, "galley", 1);
    const enough = structuredClone(s);
    expect(
      economyProjects(enough).filter(
        (p) =>
          p.action.type === "ship" &&
          ["galley", "carrack"].includes(p.action.kind!),
      ),
    ).toHaveLength(0);
  });
});

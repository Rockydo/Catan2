import { describe, expect, it } from "vitest";
import { chooseAIAction, economyProjects } from "../src/game/ai";
import { applyCommand } from "../src/game/engine";
import { maritimeFixture } from "./maritime-fixture";
import { piece, run } from "./helpers";
import { distance, landAtVertex } from "../src/game/world";
import { ownPieces } from "../src/game/selectors";

function front() {
  const f = maritimeFixture();
  f.s.phase = "military";
  f.s.players[0].control = "standard";
  f.home.vertex = f.s.tiles["-4,0"].vertices[0];
  f.home.level = f.home.turnLevel = 1;
  f.home.stock = {};
  f.enemy.vertex = f.s.tiles["3,0"].vertices[0];
  f.enemy.stock = { grain: 40 };
  return f;
}

describe("active economic warfare", () => {
  it("does not let merchants masquerade as required reinforcements and block a city unlock", () => {
    const { s, home } = maritimeFixture();
    home.level = home.turnLevel = 2;
    s.players[0].control = "standard";
    s.players[0].turns = 25;
    for (let i = 0; i < 35; i++) piece(s, "3,0", 1, "heavy", 4);
    for (let i = 0; i < 2; i++) piece(s, "0,0", 0, "heavy", 1).acted = true;
    expect(
      economyProjects(s)
        .filter((p) => p.action.type === "recruit")
        .every((p) => ["merchant", "settler"].includes(p.action.kind!)),
    ).toBe(true);
    expect(chooseAIAction(s)).toMatchObject({ type: "city", town: home.id });
  });
  it("fills a military shortfall with combat troops even when elite merchants promise richer production", () => {
    const { s, home } = maritimeFixture();
    s.players[0].control = "standard";
    s.players[0].turns = 25;
    for (const tile of Object.values(s.tiles)) tile.resource = "gold";
    for (let i = 0; i < 35; i++) piece(s, "3,0", 1, "heavy", 4);
    expect(home.turnLevel).toBe(4);
    const projects = economyProjects(s);
    expect(
      projects.some((p) => p.action.kind === "merchant" && p.action.tier === 4),
    ).toBe(true);
    const action = chooseAIAction(s);
    expect(action.type).toBe("recruit");
    expect(["heavy", "light", "cavalry"]).toContain(action.kind);
    expect(applyCommand(s, action).ok).toBe(true);
  });
  it("leaves a siege operator in place and sends the rest toward another town", () => {
    const { s, enemy } = front();
    const besieged = {
      ...structuredClone(enemy),
      id: "t900",
      vertex: s.tiles["0,0"].vertices[0],
    };
    s.towns[besieged.id] = besieged;
    const keeper = piece(s, "0,0", 0, "heavy");
    keeper.moved = 1;
    const cavalry = Array.from({ length: 5 }, () =>
      piece(s, "0,0", 0, "cavalry"),
    );
    s.sieges[`0:${besieged.id}`] = {
      owner: 0,
      town: besieged.id,
      progress: 0,
      last: s.players[0].turns,
      raided: s.players[0].turns,
      units: [keeper.id],
    };
    const action = chooseAIAction(s);
    expect(action.type).toBe("move");
    expect(action.ids?.some((id) => cavalry.some((u) => u.id === id))).toBe(
      true,
    );
    expect(action.ids).not.toContain(keeper.id);
    const next = run(s, action);
    expect(next.sieges[`0:${besieged.id}`]).toBeDefined();
  });
  it("does not spend an entire army's movement to raid an undefended settlement", () => {
    const { s, enemy } = front();
    const tile = landAtVertex(s, enemy.vertex)[0];
    for (let i = 0; i < 8; i++) piece(s, tile, 0, "cavalry");
    const action = chooseAIAction(s);
    expect(action).toMatchObject({ type: "siege", town: enemy.id });
    expect(action.ids).toHaveLength(1);
    const next = run(s, action);
    expect(ownPieces(next).filter((u) => u.moved === 0)).toHaveLength(7);
  });
  it("does not let a remote defense emergency recall troops from an exposed enemy town", () => {
    const { s, home, enemy } = front();
    const intruder = landAtVertex(s, home.vertex)[0];
    for (let i = 0; i < 12; i++) piece(s, intruder, 1, "heavy");
    piece(s, "0,0", 0, "cavalry", 2);
    const action = chooseAIAction(s);
    expect(action.type).toBe("move");
    const townDistance = (tile: string) =>
      Math.min(...landAtVertex(s, enemy.vertex).map((t) => distance(tile, t)));
    expect(townDistance(action.to!)).toBeLessThan(townDistance("0,0"));
    expect(applyCommand(s, action).ok).toBe(true);
  });
  it("looks beyond its current blockade for an exposed town of the dominant faction", () => {
    const { s, enemy } = front();
    const guarded = {
      ...structuredClone(enemy),
      id: "t901",
      vertex: s.tiles["0,0"].vertices[0],
    };
    s.towns[guarded.id] = guarded;
    const guardTile = landAtVertex(s, guarded.vertex).find((t) => t !== "0,0")!;
    for (let i = 0; i < 25; i++) piece(s, guardTile, 1, "heavy", 4);
    for (let i = 0; i < 6; i++) piece(s, "0,0", 0, "cavalry");
    const action = chooseAIAction(s);
    expect(action.type).toBe("move");
    expect(action.to).not.toBe(guardTile);
    expect(
      Math.min(
        ...landAtVertex(s, enemy.vertex).map((t) => distance(action.to!, t)),
      ),
    ).toBeLessThan(3);
  });
  it("budgets enough transport capacity for a large stranded force instead of stopping at eight berths", () => {
    const { s, home, enemy } = front();
    s.phase = "economy";
    for (const t of Object.values(s.tiles)) t.resource = "water";
    s.tiles["0,0"].resource = s.tiles["4,0"].resource = "grain";
    home.vertex = s.tiles["0,0"].vertices[0];
    home.level = home.turnLevel = 2;
    enemy.vertex = s.tiles["4,0"].vertices[0];
    for (let i = 0; i < 24; i++) piece(s, "0,0", 0, "heavy");
    for (let i = 0; i < 4; i++) piece(s, "2,0", 0, "convoy");
    expect(
      economyProjects(s).some(
        (p) =>
          p.action.type === "ship" &&
          ["transport", "convoy"].includes(p.action.kind!),
      ),
    ).toBe(true);
  });
});

it("uses a sea crossing around an overwhelming land choke instead of hoarding an unwinnable garrison", () => {
  let { s, home, enemy } = front();
  for (const t of Object.values(s.tiles)) t.resource = "water";
  for (const tile of ["0,0", "1,0", "2,0", "3,0", "4,0", "2,1"])
    s.tiles[tile].resource = "grain";
  home.vertex = s.tiles["0,0"].vertices[0];
  enemy.vertex = s.tiles["3,0"].vertices[0];
  enemy.level = enemy.turnLevel = 1;
  for (let i = 0; i < 20; i++) piece(s, "1,0", 1, "heavy", 4);
  for (let i = 0; i < 4; i++) piece(s, "0,0", 0, "heavy", 2);
  piece(s, "0,1", 0, "convoy");
  const command = chooseAIAction(s);
  expect(command.type).toBe("load");
  expect(command.ids).toHaveLength(2);
  s = run(s, command);
  expect(ownPieces(s).filter((u) => !u.naval && !u.carrier)).toHaveLength(2);
  const history: string[] = [command.type];
  for (let turn = 0; turn < 16 && s.phase !== "finished"; turn++) {
    for (const u of ownPieces(s)) {
      u.acted = false;
      u.moved = 0;
    }
    s.players[0].turns++;
    s = structuredClone(s);
    for (let step = 0; step < 15; step++) {
      const c = chooseAIAction(s);
      if (c.type === "end-turn") break;
      history.push(c.type);
      s = run(s, c);
      if (s.phase === "finished") break;
    }
  }
  expect(history).toContain("unload");
  expect(history).toContain("siege");
  expect(history).toContain("destroy-town");
  expect(s.winner).toBe(0);
});

it("funds a border bypass outside the ordinary exploration schedule against a dominant rival", () => {
  const { s, home, enemy } = front();
  s.phase = "economy";
  s.players[0].turns = 7;
  s.players[1].control = "standard";
  for (const t of Object.values(s.tiles)) t.resource = "water";
  const border = Object.values(s.tiles).find((t) =>
    t.vertices.some((v) => s.vertices[v].tiles.length < 3),
  )!;
  const target = Object.values(s.tiles).find(
    (t) => distance(t.id, border.id) >= 2 && distance(t.id, border.id) <= 3,
  )!;
  s.tiles[border.id].resource = s.tiles[target.id].resource = "grain";
  home.vertex = border.vertices.find((v) => s.vertices[v].tiles.length < 3)!;
  enemy.vertex = target.vertices[0];
  for (let i = 0; i < 30; i++) piece(s, target.id, 1, "heavy", 4);
  piece(s, border.id, 0, "heavy", 2);
  const projects = economyProjects(s).filter(
    (p) => p.action.type === "expedition",
  );
  expect(projects.length).toBeGreaterThan(0);
  expect(
    projects.every((p) =>
      s.vertices[p.action.vertex!].tiles.includes(border.id),
    ),
  ).toBe(true);
});

it("funds a crossing rather than endlessly matching an overwhelming home-front army", () => {
  const { s, home, enemy } = front();
  s.phase = "economy";
  for (const t of Object.values(s.tiles)) t.resource = "water";
  for (const tile of ["0,0", "1,0", "2,0", "3,0", "4,0", "2,1"])
    s.tiles[tile].resource = "grain";
  home.vertex = s.tiles["0,0"].vertices[0];
  home.level = home.turnLevel = 2;
  home.stock = { lumber: 20, wool: 20, ore: 20, salt: 20, hides: 20 };
  enemy.vertex = s.tiles["3,0"].vertices[0];
  for (let i = 0; i < 100; i++) piece(s, "1,0", 1, "heavy", 4);
  for (let i = 0; i < 8; i++) {
    const u = piece(s, "0,0", 0, "heavy");
    u.acted = true;
  }
  const action = chooseAIAction(s);
  expect(action.type).toBe("ship");
  expect(["transport", "convoy"]).toContain(action.kind);
  expect(applyCommand(s, action).ok).toBe(true);
});

it("answers a naval-only island threat with artillery or ships, not stranded infantry", () => {
  const { s, home, enemy } = front();
  s.phase = "economy";
  for (const t of Object.values(s.tiles)) t.resource = "water";
  s.tiles["0,0"].resource = s.tiles["4,0"].resource = "grain";
  home.vertex = s.tiles["0,0"].vertices[0];
  home.level = home.turnLevel = 2;
  enemy.vertex = s.tiles["4,0"].vertices[0];
  piece(s, "0,0", 0, "heavy");
  piece(s, "0,0", 0, "heavy");
  piece(s, "1,0", 1, "carrack", 4);
  const recruits = economyProjects(s).filter(
    (p) =>
      p.action.type === "recruit" &&
      !["merchant", "settler"].includes(p.action.kind!),
  );
  expect(recruits.length).toBeGreaterThan(0);
  expect(recruits.every((p) => p.action.kind === "artillery")).toBe(true);
});

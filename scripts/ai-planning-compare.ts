import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { crossing } from "../tests/transport-fixture";
import { piece } from "../tests/helpers";
import { GOODS, type Game } from "../src/game/types";

// Compare all proposed projects, not only the winning order. No browser or save
// is modified. SOURCE_ROOT is a previous checkout with the same gameplay rules.
if (!process.env.SOURCE_ROOT)
  throw Error("Set SOURCE_ROOT to the reference checkout.");
async function planner(root: string) {
  const module = (file: string) =>
    pathToFileURL(resolve(root, "src/game", `${file}.ts`)).href;
  const ai = await import(module("ai"));
  const guilds = await import(module("guild-ai"));
  const { withPlanningFrame } = await import(module("selectors"));
  return (position: Game) => {
    const s = structuredClone(position),
      before = JSON.stringify(s);
    const result = withPlanningFrame(s, () => ({
      projects: ai.economyProjects(s),
      guilds: guilds.guildEconomyProjects(s, ai.marginalValues(s)),
      supply: guilds.guildMilitaryOrder(s),
      engineering: guilds.guildMilitaryOrder(s, true),
    }));
    const military = { ...s, phase: "military" as const },
      militaryBefore = JSON.stringify(military),
      maneuver = ai.chooseAIAction(military);
    if (JSON.stringify(s) !== before)
      throw Error("Planning mutated its input.");
    if (JSON.stringify(military) !== militaryBefore)
      throw Error("Military planning mutated its input.");
    return JSON.stringify({ ...result, maneuver });
  };
}
const current = await planner("."),
  previous = await planner(process.env.SOURCE_ROOT);
let projects = 0;
const hash = createHash("sha256");
const scenarios = 128;
for (let scenario = 0; scenario < scenarios; scenario++) {
  const { s, home, enemy } = crossing(scenario % 2 === 0);
  if (scenario % 8 === 7) s.active = 1;
  s.phase = "economy";
  s.players[0].control = (["easy", "standard", "hard"] as const)[scenario % 3];
  home.level = home.turnLevel = 4;
  for (const good of GOODS) home.stock[good] = 20;
  const kind = (["commanders", "navigators", "engineers"] as const)[
    Math.floor(scenario / 2) % 3
  ];
  home.guild = {
    kind,
    tier: 1 + (scenario % 3),
    born: 0,
    used: false,
    auto: false,
  };
  for (let i = 0; i < 8 + (scenario % 5); i++)
    piece(s, "-4,0", 0, i % 3 === 0 ? "cavalry" : "heavy", 1 + (scenario % 4));
  // Connected origins must share local objective results, while blocked or
  // disconnected origins and embarked troops retain their own eligibility.
  if (scenario % 2 === 0) {
    piece(s, "-4,-1", 0, "heavy", 2);
    piece(s, "0,-4", 0, "light", 3);
  }
  if (scenario % 3 === 0) piece(s, "3,-1", 0, "heavy", 2);
  const ship = piece(s, "-3,0", 0, "convoy", 1);
  piece(s, "-3,0", 0, "galley", 1 + (scenario % 4));
  if (scenario % 4 === 0) {
    const passenger = piece(s, ship.tile, 0, "heavy", 3);
    passenger.carrier = ship.id;
  }
  if (scenario % 3) piece(s, "4,0", 1, "heavy", 1 + (scenario % 4));
  if (scenario % 5 === 0 && scenario % 2 === 0)
    for (let i = 0; i < 10; i++) piece(s, "-4,-1", 1, "heavy", 4);
  if (scenario % 4 === 1) {
    s.tiles["0,0"].surface = "frozen";
    s.tiles["0,0"].resource = "ice";
  }
  for (const tile of ["3,-2", "3,0"]) {
    const id = `t${s.nextId++}`;
    s.towns[id] = {
      ...structuredClone(enemy),
      id,
      name: `Target ${id}`,
      vertex: s.tiles[tile].vertices[0],
      level: 1 + (scenario % 4),
      turnLevel: 1 + (scenario % 4),
      wall: scenario % 4,
    };
  }
  if (scenario % 6 === 0)
    s.alliances = [
      { id: "peace", members: [0, 1], threat: 2, lockedUntil: 99 },
    ];
  else if (scenario % 6 === 1) delete s.alliances;
  if (scenario >= 48) {
    // Shared guild calculations must retain town/army tie order, current
    // watchtower support and eligibility for construction versus ready orders.
    if (scenario % 4 === 0) s.players[0].control = "human";
    enemy.wall = scenario % 4;
    for (const town of [home, enemy])
      s.towers[town.vertex] = {
        id: `watch-${town.id}`,
        vertex: town.vertex,
        owner: town.owner,
        tier: 1 + (scenario % 4),
      };
    const artillery = piece(s, "-4,0", 0, "artillery", 4);
    if (scenario % 2 === 0) artillery.guildSiege = 2;
    piece(s, "-4,-1", 0, "merchant", 3);
    piece(s, "-4,-1", 0, "settler");
    for (const [i, u] of Object.values(s.pieces).entries()) {
      if (i % 5 === 0) u.moved = 1;
      if (i % 7 === 0) u.acted = true;
      if (i % 11 === 0) u.born = s.players[u.owner].turns;
      if (u.naval && i % 3 === 0) u.seasonStatus = "icebound";
    }
    const id = `t${s.nextId++}`;
    s.towns[id] = {
      ...structuredClone(home),
      id,
      name: `Neighbor ${id}`,
      vertex: s.tiles["-4,0"].vertices[1],
    };
  }
  if (scenario >= 96) {
    // Several ports can share a launch hex but draw on different land armies,
    // city tiers and free hull grants. Repeated geographic facts must not merge
    // their origin-specific invasion demand or reorder the resulting projects.
    for (const [i, vertex] of s.tiles["-3,0"].vertices.entries()) {
      if (Object.values(s.towns).some((t) => t.vertex === vertex)) continue;
      const id = `t${s.nextId++}`;
      s.towns[id] = {
        ...structuredClone(home),
        id,
        name: `Shared port ${i}`,
        vertex,
        level: 1 + ((scenario + i) % 4),
        turnLevel: 1 + ((scenario + i) % 4),
      };
      delete s.towns[id].guild;
    }
    s.players[0].bonuses.ships = [["convoy", "galley"], ["carrack"]];
    s.players[0].bonuses.shipTiers = [2, 4];
    const carriers = [
      piece(s, ship.tile, 0, "convoy", 4),
      piece(s, ship.tile, 0, "convoy", 4),
    ];
    for (let i = 0; i < 48; i++) {
      const soldier = piece(
        s,
        i % 3 ? "-4,0" : "3,-1",
        0,
        i % 5 ? "heavy" : "artillery",
        1 + (i % 4),
      );
      if (i % 4 === 0) {
        soldier.tile = ship.tile;
        soldier.carrier = carriers[Math.floor(i / 4) % 2].id;
      }
    }
    piece(s, "-3,0", 0, "carrack", 4);
    piece(s, "-3,0", 0, "fishing", 4);
    piece(s, "-3,0", 0, "merchantship", 3);
    piece(s, "-4,0", 0, "merchant", 4);
    piece(s, "2,0", 1, "merchantship", 3);
    if (scenario % 3 === 0) piece(s, "2,0", 1, "carrack", 4);
    if (scenario % 4 === 0) {
      s.tiles["-3,0"].surface = "frozen";
      s.tiles["-3,0"].resource = "ice";
      for (const unit of Object.values(s.pieces))
        if (unit.naval && unit.tile === "-3,0") unit.seasonStatus = "icebound";
    }
  }
  const expected = previous(s),
    actual = current(s);
  if (actual !== expected) {
    mkdirSync("test-artifacts", { recursive: true });
    writeFileSync("test-artifacts/planning-reference.json", expected);
    writeFileSync("test-artifacts/planning-current.json", actual);
    throw Error(
      `Scenario ${scenario} changed projects, scores, target order or guild decisions.`,
    );
  }
  projects += JSON.parse(actual).projects.length;
  hash.update(actual);
}
console.log(
  JSON.stringify({
    scenarios,
    projects,
    exact: true,
    hash: hash.digest("hex"),
  }),
);

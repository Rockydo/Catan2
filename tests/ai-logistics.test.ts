import { syncEmergencyCoalition } from "../src/game/emergency-coalition";
import { emergencyTarget } from "../src/game/relations";
import { it, expect } from "vitest";
import { funded, piece, run, nextOwnerTurn } from "./helpers";
import { chooseAIAction } from "../src/game/ai";
import { ownTowns } from "../src/game/selectors";
import { waterAtVertex } from "../src/game/world";
import { assertInvariants } from "../src/game/save";

it("transports an army to a beach, marches inland and eliminates the final opponent", () => {
  let s = funded();
  s.phase = "military";
  for (const tile of Object.values(s.tiles)) tile.resource = "water";
  for (const id of ["0,0", "3,0", "4,0", "4,-1", "5,-1"])
    s.tiles[id].resource = "grain";
  const home = ownTowns(s, 0)[0],
    enemy = ownTowns(s, 1)[0];
  home.vertex = s.tiles["0,0"].vertices[0];
  enemy.vertex = s.tiles["4,0"].vertices[1];
  // Make the target's three neighboring tiles all land: a genuinely inland town.
  for (const id of s.vertices[enemy.vertex].tiles)
    s.tiles[id].resource = "grain";
  expect(waterAtVertex(s, enemy.vertex)).toEqual([]);
  home.stock = {};
  enemy.stock = {};
  home.level = enemy.level = 1;
  home.wall = enemy.wall = 0;
  home.extensions = enemy.extensions = {};
  s.towns = { [home.id]: home, [enemy.id]: enemy };
  s.routes = {};
  s.pieces = {};
  s.sieges = {};
  s.players[2].alive = false;
  s.players[3].alive = false;
  const army = piece(s, "0,0", 0, "heavy", 3);
  piece(s, "1,0", 0, "convoy");
  const history: string[] = [];
  for (let turn = 0; turn < 22 && s.phase !== "finished"; turn++) {
    nextOwnerTurn(s);
    s.active = 0;
    s.phase = "military";
    for (let action = 0; action < 20; action++) {
      const c = chooseAIAction(s);
      if (c.type === "end-turn") break;
      history.push(c.type);
      s = run(s, c);
      if (s.phase === "finished") break;
    }
  }
  expect(history).toContain("load");
  expect(history).toContain("unload");
  expect(history).toContain("siege");
  expect(history).toContain("destroy-town");
  expect(s.winner).toBe(0);
  expect(s.pieces[army.id]).toBeDefined();
  assertInvariants(s);
}, 30000);

it("does not embark and unload in a loop when a land objective is already reachable", () => {
  const s = funded();
  s.phase = "military";
  for (const tile of Object.values(s.tiles)) tile.resource = "water";
  for (const id of ["0,0", "1,0", "2,0", "4,0"]) s.tiles[id].resource = "grain";
  const home = ownTowns(s, 0)[0],
    local = ownTowns(s, 1)[0],
    overseas = ownTowns(s, 2)[0];
  home.vertex = s.tiles["0,0"].vertices[0];
  local.vertex = s.tiles["2,0"].vertices[0];
  overseas.vertex = s.tiles["4,0"].vertices[0];
  s.towns = { [home.id]: home, [local.id]: local, [overseas.id]: overseas };
  s.routes = {};
  s.pieces = {};
  piece(s, "0,0", 0, "heavy", 3);
  piece(s, "0,1", 0, "convoy");
  const action = chooseAIAction(s);
  expect(action.type).toBe("move");
  expect(action.to).toBe("1,0");
});

it("counts existing transports elsewhere on the same sea before funding more hulls", () => {
  const s = funded();
  for (const tile of Object.values(s.tiles)) tile.resource = "water";
  s.tiles["0,0"].resource = s.tiles["4,0"].resource = "grain";
  const home = ownTowns(s, 0)[0],
    enemy = ownTowns(s, 1)[0];
  home.vertex = s.tiles["0,0"].vertices[0];
  enemy.vertex = s.tiles["4,0"].vertices[0];
  home.level = home.turnLevel = 2;
  home.extensions = {};
  home.stock = { lumber: 100, wool: 100, salt: 100, ore: 100 };
  s.towns = { [home.id]: home, [enemy.id]: enemy };
  s.routes = {};
  s.pieces = {};
  for (let i = 0; i < 8; i++) piece(s, "0,0", 0, "heavy", 1);
  for (let i = 0; i < 4; i++) piece(s, "2,0", 0, "convoy");
  piece(s, "2,0", 0, "galley");
  expect(chooseAIAction(s).type).not.toBe("ship");
});

function seaCampaign() {
  const s = funded();
  s.players[0].control = "standard";
  for (const tile of Object.values(s.tiles)) tile.resource = "water";
  s.tiles["0,0"].resource = s.tiles["4,0"].resource = "grain";
  const home = ownTowns(s, 0)[0],
    enemy = ownTowns(s, 1)[0];
  home.vertex = s.tiles["0,0"].vertices[0];
  enemy.vertex = s.tiles["4,0"].vertices[0];
  home.level = home.turnLevel = 2;
  s.towns = { [home.id]: home, [enemy.id]: enemy };
  s.routes = {};
  s.pieces = {};
  s.sieges = {};
  s.players[2].alive = s.players[3].alive = false;
  // This isolated invasion scenario has no destroyed AI seats to resurrect.
  s.players[2].control = s.players[3].control = "human";
  return { s, home, enemy };
}

it.each(["human", "standard"] as const)(
  "brings its actual embarked force to a defended distant island held by a %s faction",
  (control) => {
    let { s, home, enemy } = seaCampaign();
    home.stock = enemy.stock = {};
    home.level = home.turnLevel = enemy.level = enemy.turnLevel = 1;
    enemy.wall = 0;
    s.players[1].control = control;
    s.tiles["3,0"].resource = "grain"; // Clear landing beside the garrison.
    piece(s, "4,0", 1, "heavy", 1);
    const invader = piece(s, "0,0", 0, "heavy", 3);
    piece(s, "1,0", 0, "convoy", 1);
    const history: string[] = [];
    for (let turn = 0; turn < 18 && s.phase !== "finished"; turn++) {
      s = structuredClone(s);
      nextOwnerTurn(s);
      s.phase = "military";
      for (let step = 0; step < 20; step++) {
        const action = chooseAIAction(s);
        if (action.type === "end-turn") break;
        history.push(action.type);
        s = run(s, action);
        if (s.phase === "finished") break;
      }
    }
    for (const action of [
      "load",
      "unload",
      "resolve-battle",
      "siege",
      "destroy-town",
    ])
      expect(history).toContain(action);
    expect(s.pieces[invader.id]).toBeDefined();
    expect(s.winner).toBe(0);
    assertInvariants(s);
  },
);

it("funds transports for stranded troops before unrelated city development", () => {
  const { s } = seaCampaign();
  for (let i = 0; i < 8; i++) piece(s, "0,0");
  const action = chooseAIAction(s);
  expect(action.type).toBe("ship");
  expect(["transport", "convoy"]).toContain(action.kind);
  expect(run(s, action).pieces).not.toEqual(s.pieces);
});

it("imports missing transport materials instead of leaving its army stranded", () => {
  const { s, home, enemy } = seaCampaign();
  for (let i = 0; i < 8; i++) piece(s, "0,0");
  home.stock = { ore: 60, wool: 1 };
  enemy.stock = {};
  const action = chooseAIAction(s);
  expect(action.type).toBe("bank");
  expect(action.take).toEqual({ lumber: 1 });
  let next = run(s, action);
  for (let step = 0; step < 8; step++) {
    const c = chooseAIAction(next);
    if (c.type === "ship") {
      expect(["transport", "convoy"]).toContain(c.kind);
      return;
    }
    expect(c.type).toBe("bank");
    next = run(next, c);
  }
  throw new Error("AI did not finish funding its transport");
});

it("builds warships against a coastal naval threat even with no waiting land army", () => {
  const { s } = seaCampaign();
  piece(s, "1,0", 1, "galley");
  const action = chooseAIAction(s);
  expect(action.type).toBe("ship");
  expect(["galley", "carrack"]).toContain(action.kind);
});

it("does not fund a fleet for an empty disconnected lake", () => {
  const { s } = seaCampaign();
  for (const tile of Object.values(s.tiles)) {
    tile.resource = "grain";
    delete tile.fish;
  }
  s.tiles["0,-1"].resource = "water";
  for (let i = 0; i < 8; i++) piece(s, "0,0");
  expect(chooseAIAction(s).type).not.toBe("ship");
});

it("builds its own fleet, carries troops across the sea and conquers an island", () => {
  let { s } = seaCampaign();
  for (let i = 0; i < 8; i++) piece(s, "0,0");
  const history: string[] = [];
  for (let turn = 0; turn < 30 && s.phase !== "finished"; turn++) {
    nextOwnerTurn(s);
    s.active = 0;
    s.phase = "economy";
    for (let action = 0; action < 60; action++) {
      const c = chooseAIAction(s);
      if (c.type === "end-turn") break;
      history.push(c.type);
      s = run(s, c);
      if (s.phase === "finished") break;
    }
  }
  for (const operation of [
    "ship",
    "load",
    "move",
    "unload",
    "siege",
    "destroy-town",
  ])
    expect(history).toContain(operation);
  expect(s.winner).toBe(0);
  assertInvariants(s);
}, 30000);

it("uses scarce transport berths for stronger troops first", () => {
  const { s } = seaCampaign();
  for (let i = 0; i < 5; i++) piece(s, "0,0", 0, "heavy", 1);
  const elite = piece(s, "0,0", 0, "heavy", 4);
  piece(s, "1,0", 0, "convoy", 1);
  const action = chooseAIAction(s);
  expect(action.type).toBe("load");
  expect(action.ids).toHaveLength(2);
  expect(action.ids).toContain(elite.id);
  expect(run(s, action).pieces[elite.id].carrier).toBeDefined();
});

it("an emergency coalition ferries its army to raid the dominant island power", () => {
  let { s, home, enemy } = seaCampaign();
  home.stock = enemy.stock = {};
  home.level = home.turnLevel = enemy.level = enemy.turnLevel = 1;
  enemy.wall = 0;
  s.tiles["3,0"].resource = "grain";
  // A powerful distant fleet gives the rival a decisive global lead, while its
  // eastern town remains vulnerable to a transport landing.
  for (let i = 0; i < 30; i++) piece(s, "-4,0", 1, "galley", 4);
  piece(s, "0,0", 0, "heavy", 3);
  piece(s, "1,0", 0, "convoy");
  syncEmergencyCoalition(s);
  expect(emergencyTarget(s)).toBe(1);
  const history: string[] = [];
  for (
    let turn = 0;
    turn < 16 && !s.events.some((e) => e.townAttack?.kind === "raid");
    turn++
  ) {
    s = structuredClone(s);
    nextOwnerTurn(s);
    s.phase = "military";
    for (let step = 0; step < 20; step++) {
      const action = chooseAIAction(s);
      if (action.type === "end-turn") break;
      history.push(action.type);
      s = run(s, action);
      if (s.events.some((e) => e.townAttack?.kind === "raid")) break;
    }
  }
  expect(history).toContain("load");
  expect(history).toContain("unload");
  expect(
    s.events.some((e) => e.townAttack?.kind === "raid" && e.owner === 0),
  ).toBe(true);
  assertInvariants(s);
}, 30000);
